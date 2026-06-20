/**
 * PlayerContext.js  –  K-ECHO Complete Music Engine
 *
 * Features:
 *  ✅ Infinite queue – next/prev with no limit
 *  ✅ Auto-radio     – similar songs auto-fetched when queue near end
 *  ✅ Shuffle        – toggle, reshuffles remaining queue
 *  ✅ Repeat         – off / one / all
 *  ✅ Silent recovery – on error, re-resolve URL
 *  ✅ Recently Played – persisted via AsyncStorage (last 50)
 *  ✅ Liked Songs    – persisted via AsyncStorage
 *  ✅ Lock-screen controls
 *  ✅ Seekable progress
 */
import {
  createContext, useContext, useState, useRef, useEffect, useCallback,
} from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';
import TrackPlayer, {
  Event, State, Capability, RepeatMode,
  AppKilledPlaybackBehavior,
  usePlaybackState, useProgress,
} from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { 
  searchGlobal, 
  getRadioSuggestions, 
  searchSaavn 
} from '../services/ApiService';
import RecommendationService from '../services/RecommendationService';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_LIKED           = '@kecho_liked';
const STORAGE_RECENT          = '@kecho_recent';
const STORAGE_PLAYLISTS       = '@kecho_playlists';
const STORAGE_LIKED_PLAYLISTS = '@kecho_liked_playlists';
const STORAGE_LIKED_TRACKS    = '@kecho_liked_tracks';
const STORAGE_FEEDBACK        = '@kecho_feedback';
const STORAGE_ONBOARDING      = '@kecho_onboarding';
const STORAGE_DOWNLOADS       = '@kecho_downloads';
const MAX_RECENT              = 50;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
  'Referer': 'https://www.jiosaavn.com/',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function buildRnTrack(track, resolvedUrl) {
  if (!track || !track.id) return null;
  try {
    const url = resolvedUrl || track.url;
    if (!url) return null;

    return {
      id: String(track.id),
      url: String(url),
      title: String(track.title || 'Unknown Title'),
      artist: String(track.artist || 'Unknown Artist'),
      artwork: String(track.artwork || track.image || 'https://api.dicebear.com/7.x/initials/svg?seed=K-ECHO'),
      duration: Number(track.durationSecs || 0), // Fix: use seconds, avoid NaN from "M:SS" string
      headers: HEADERS
    };
  } catch (e) {
    console.error('[Player] buildRnTrack error:', e);
    return null;
  }
}

async function resolveUrl(track) {
  if (!track) return { url: null, track: null };
  try {
    if (track.url) return { url: track.url, track };
    
    // Search Saavn by title + artist
    let q = track.searchTerm || `${track.title} ${track.artist}`;
    q = q.replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const results = await searchSaavn(q, 1);
    if (results.length && results[0].url) {
      return { url: results[0].url, track: { ...track, ...results[0], id: track.id } };
    }
  } catch (err) {
    console.error('resolveUrl error:', err);
  }
  
  return { url: null, track };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER SETUP
// ─────────────────────────────────────────────────────────────────────────────
let _playerReady = false;

async function setupPlayer() {
  if (_playerReady) return;
  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
      waitForBuffer: true,
    });
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play, Capability.Pause,
        Capability.SkipToNext, Capability.SkipToPrevious,
        Capability.Stop, Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    });
    _playerReady = true;
  } catch (e) {
    _playerReady = false;
    console.error('[Player] setupPlayer critical failure:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  // ── state ──────────────────────────────────────────────────────────────────
  const [currentTrack,   setCurrentTrack]   = useState(null);
  const [queue,          setQueue]          = useState([]);
  const [queueIndex,     setQueueIndex]     = useState(-1);
  const [liked,          setLiked]          = useState(new Set());
  const [likedTracks,    setLikedTracks]    = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [userPlaylists,  setUserPlaylists]  = useState([]);
  const [likedPlaylists, setLikedPlaylists] = useState([]);
  const [downloadedTracks, setDownloadedTracks] = useState([]);
  const [downloadingIds, setDownloadingIds] = useState(new Set());
  const [isLoading,      setIsLoading]      = useState(false);
  const [error,          setError]          = useState(null);
  const [feedback,       setFeedback]       = useState({ skips: {}, plays: {}, repeats: {} });
  const [onboardingData, setOnboardingData] = useState({ artists: [], genres: [], moods: [], completed: false });
  const [isShuffle,      setIsShuffle]      = useState(false);
  const [repeatMode,     setRepeatMode]     = useState('off');
  const [isRadioMode,    setIsRadioMode]    = useState(false);
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false);
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // ── RNTP hooks ─────────────────────────────────────────────────────────────
  const playbackState = usePlaybackState();
  const progress      = useProgress(250);
  const isPlaying     = playbackState?.state === State.Playing;

  // ── refs ───────────────────────────────────────────────────────────────────
  const queueRef        = useRef([]);
  const idxRef          = useRef(-1);
  const loadingRef      = useRef(false);
  const recoveryRef     = useRef(null);
  const repeatRef       = useRef('off');
  const shuffleRef      = useRef(false);
  const playedIds       = useRef(new Set());
  const currentTrackRef = useRef(null);
  const recoLockRef     = useRef(false);
  const playNextRef     = useRef(null);
  const playPrevRef     = useRef(null);
  const radioFetching   = useRef(false);
  const snippetTimerRef = useRef(null);

  // keep refs in sync
  useEffect(() => { queueRef.current   = queue;      }, [queue]);
  useEffect(() => { idxRef.current     = queueIndex; }, [queueIndex]);
  useEffect(() => { shuffleRef.current = isShuffle;  }, [isShuffle]);
  useEffect(() => { repeatRef.current  = repeatMode; }, [repeatMode]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // ── Load persisted data on mount ───────────────────────────────────────────
  useEffect(() => {
    async function loadPersisted() {
      try {
        const [likedRaw, recentRaw, playlistsRaw, likedPlaylistsRaw, likedTracksRaw, downloadsRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_LIKED),
          AsyncStorage.getItem(STORAGE_RECENT),
          AsyncStorage.getItem(STORAGE_PLAYLISTS),
          AsyncStorage.getItem(STORAGE_LIKED_PLAYLISTS),
          AsyncStorage.getItem(STORAGE_LIKED_TRACKS),
          AsyncStorage.getItem(STORAGE_DOWNLOADS),
        ]);
        const safeParse = (str, fallback = []) => {
          try {
            if (!str) return fallback;
            const parsed = JSON.parse(str);
            if (parsed === null) return fallback;
            if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
            return parsed;
          } catch {
            return fallback;
          }
        };

        setLiked(new Set(safeParse(likedRaw, [])));
        setRecentlyPlayed(safeParse(recentRaw, []));
        setUserPlaylists(safeParse(playlistsRaw, []));
        setLikedPlaylists(safeParse(likedPlaylistsRaw, []));
        setLikedTracks(safeParse(likedTracksRaw, []));
        setDownloadedTracks(safeParse(downloadsRaw, []));
        
        const [feedbackRaw, onboardingRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_FEEDBACK),
          AsyncStorage.getItem(STORAGE_ONBOARDING),
        ]);
        
        setFeedback(safeParse(feedbackRaw, { skips: {}, plays: {}, repeats: {} }));
        setOnboardingData(safeParse(onboardingRaw, { artists: [], genres: [], moods: [], completed: false }));
      } catch (err) {
        console.error('[Player] loadPersisted error:', err);
      } finally {
        setIsDataLoaded(true);
      }
    }
    loadPersisted();
  }, []);

  // ── Setup RNTP on mount ────────────────────────────────────────────────────
  useEffect(() => {
    setupPlayer().catch(e => console.error('[Player] setup error:', e));

    const onTrackChange = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async ({ index }) => {
        // We manage our own queue, so we don't need to sync queueIndex with RNTP's internal index.
      },
    );

    const onError = TrackPlayer.addEventListener(Event.PlaybackError, async () => {
      const q   = queueRef.current;
      const idx = idxRef.current;
      if (idx < 0 || !q[idx]) { setError('Playback failed.'); return; }
      if (recoveryRef.current === q[idx].id) {
        setError('Stream unavailable. Skipping…');
        setTimeout(() => { if (playNextRef.current) playNextRef.current(); }, 1500);
        return;
      }
      recoveryRef.current = q[idx].id;
      try {
        const { url, track: resolved } = await resolveUrl(q[idx]);
        if (url && resolved) {
          const rnTrack = buildRnTrack(resolved, url);
          if (rnTrack) {
            await TrackPlayer.reset();
            await TrackPlayer.add([rnTrack]);
            await TrackPlayer.play();
          }
        } else {
          setError('Stream not found. Skipping…');
          setTimeout(() => { if (playNextRef.current) playNextRef.current(); }, 1500);
        }
      } catch {
        setError('Playback failed.');
      }
    });

    const onState = TrackPlayer.addEventListener(Event.PlaybackState, (ev) => {
      if (ev.state === State.Ended) {
        // Track complete play for AI learning
        if (currentTrackRef.current) trackFeedback(currentTrackRef.current.id, 'plays');
        if (playNextRef.current) playNextRef.current();
      }
    });

    const onRemoteNext = TrackPlayer.addEventListener(Event.RemoteNext, () => {
      if (playNextRef.current) playNextRef.current();
    });
    const onRemotePrev = TrackPlayer.addEventListener(Event.RemotePrevious, () => {
      if (playPrevRef.current) playPrevRef.current();
    });

    return () => {
      onTrackChange.remove();
      onError.remove();
      onState.remove();
      onRemoteNext.remove();
      onRemotePrev.remove();
    };
  }, []);

  // ── BACK HANDLER ───────────────────────────────────────────────────────────
  useEffect(() => {
    const backAction = () => {
      if (isFullPlayerVisible) {
        setIsFullPlayerVisible(false);
        return true; // handled
      }
      return false; // let react-navigation handle it
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [isFullPlayerVisible]);

  // ── AUTO-RADIO (Disabled - Handled by AI Engine) ──────────────────────────
  /*
  useEffect(() => {
    ...
  }, [queueIndex]);
  */

  // ── ADD TO RECENTLY PLAYED ─────────────────────────────────────────────────
  const addToRecent = useCallback(async (track) => {
    // Isolation: Never add snippets or explore-page data to history
    if (track.isSnippet) return;
    
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      const updated  = [track, ...filtered].slice(0, MAX_RECENT);
      AsyncStorage.setItem(STORAGE_RECENT, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const trackFeedback = useCallback(async (trackId, type) => {
    if (!trackId || !type) return;
    setFeedback(prev => {
      const currentSection = prev[type] || {};
      const next = { 
        ...prev,
        [type]: { 
          ...currentSection,
          [trackId]: (currentSection[trackId] || 0) + 1 
        }
      };
      AsyncStorage.setItem(STORAGE_FEEDBACK, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetUserExperience = useCallback(async () => {
    await AsyncStorage.multiRemove([
      STORAGE_LIKED, STORAGE_RECENT, STORAGE_PLAYLISTS, 
      STORAGE_LIKED_PLAYLISTS, STORAGE_LIKED_TRACKS, STORAGE_FEEDBACK
    ]);
    setLiked(new Set());
    setRecentlyPlayed([]);
    setLikedTracks([]);
    setFeedback({ skips: {}, plays: {}, repeats: {} });
    // Keep onboarding to simulate "Just Onboarded" user
  }, []);

  const saveOnboarding = useCallback(async (data) => {
    const fullData = { ...data, completed: true };
    setOnboardingData(fullData);
    await AsyncStorage.setItem(STORAGE_ONBOARDING, JSON.stringify(fullData));
  }, []);


  const clearSnippetTimer = () => {
    if (snippetTimerRef.current) {
      clearTimeout(snippetTimerRef.current);
      snippetTimerRef.current = null;
    }
  };

  const playSnippet = useCallback(async (track, trackQueue = [], startIdx = -1) => {
    if (!track || loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    clearSnippetTimer();

    try {
      await setupPlayer();
      const { url, track: resolved } = await resolveUrl(track);
      if (!url || !resolved) {
        setError('Stream not found.');
        setIsLoading(false);
        loadingRef.current = false;
        return;
      }

      const resolvedSnippet = { ...resolved, isSnippet: true };
      setCurrentTrack(resolvedSnippet);
      
      const safeQueue = (trackQueue || []).filter(t => t && t.id);
      let newQueue = safeQueue.length ? [...safeQueue] : [resolvedSnippet];
      
      let newIdx = newQueue.findIndex(t => t && t.id === resolvedSnippet.id);
      if (newIdx === -1) {
        if (startIdx >= 0 && startIdx < newQueue.length) newIdx = startIdx;
        else newIdx = 0;
      }

      setQueue(newQueue);
      setQueueIndex(newIdx);
      queueRef.current = newQueue;
      idxRef.current = newIdx;

      await TrackPlayer.reset();
      const rnTrack = buildRnTrack(resolvedSnippet, url);
      if (rnTrack) {
        await TrackPlayer.add([rnTrack]);
        await TrackPlayer.play();

        // Seek to "famous part" (~30% of duration if available, or 30s)
        const duration = resolved.durationSecs || 180;
        const startTime = Math.floor(duration * 0.3);
        try { await TrackPlayer.seekTo(startTime); } catch (_) {}
      }

      setIsLoading(false);
      loadingRef.current = false;

      // Set timer to play next snippet after 35 seconds
      snippetTimerRef.current = setTimeout(async () => {
        const currentQ = queueRef.current;
        const currentIdx = idxRef.current;
        if (currentQ.length > 0) {
          const nextIdx = (currentIdx + 1) % currentQ.length;
          playSnippet(currentQ[nextIdx], currentQ, nextIdx);
        } else {
          await TrackPlayer.pause();
        }
        snippetTimerRef.current = null;
      }, 35000);

    } catch (err) {
      console.error('[Player] playSnippet error:', err);
      setError('Snippet playback failed.');
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [clearSnippetTimer]);

  // ── PLAY A TRACK ───────────────────────────────────────────────────────────
  const playTrack = useCallback(async (track, trackQueue = [], startIdx = -1) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    recoveryRef.current = null;
    setCurrentTrack(track);
    clearSnippetTimer();
    try {
      await setupPlayer();
      const { url, track: resolved } = await resolveUrl(track);

      if (!url || !resolved) {
        setError('Stream not found.');
        setIsLoading(false);
        loadingRef.current = false;
        return;
      }

      setCurrentTrack(resolved);

      const safeQueue = (trackQueue || []).filter(t => t && t.id);
      let newQueue = safeQueue.length ? [...safeQueue] : [resolved];
      
      // Correct index mapping for filtered list
      let newIdx = newQueue.findIndex(t => t && t.id === resolved.id);
      if (newIdx === -1) {
        // If not found in filtered list, try fallback to startIdx if safe
        if (startIdx >= 0 && startIdx < newQueue.length) newIdx = startIdx;
        else newIdx = 0;
      }

      // Shuffle remaining if shuffle is on
      if (shuffleRef.current) {
        const before = newQueue.slice(0, newIdx + 1);
        const after  = newQueue.slice(newIdx + 1);
        for (let i = after.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [after[i], after[j]] = [after[j], after[i]];
        }
        newQueue = [...before, ...after];
      }

      setQueue(newQueue);
      setQueueIndex(newIdx);
      queueRef.current = newQueue;
      idxRef.current   = newIdx;
      playedIds.current.add(String(track.id));

      // AI RECOMMENDATION ENGINE (Spotify Autoplay style)
      // Every manual play acts as a seed ONLY (Requirement #9 & #10)
      const isUserPlaylist = (trackQueue || [])[0]?.isUserPlaylist;
      if (!isUserPlaylist && !resolved.isSnippet) {
        setIsRadioMode(true);
        if (!recoLockRef.current) {
          recoLockRef.current = true;
          
          // Use current values from refs or state (since we are in an async block)
          const context = {
            playedIds: playedIds.current || new Set(),
            history: recentlyPlayed || [],
            likedIds: liked || new Set(),
            feedback: feedback || { skips: {}, plays: {}, repeats: {} }
          };

          RecommendationService.generateSmartQueue(resolved, context, 25).then(suggestions => {
            recoLockRef.current = false;
            if (suggestions && suggestions.length) {
              const validSuggestions = suggestions.filter(s => s && s.id);
              if (validSuggestions.length > 0) {
                // Ensure the seed track is still the current one when suggestions arrive
                if (currentTrackRef.current && currentTrackRef.current.id === resolved.id) {
                  const updated = [resolved, ...validSuggestions];
                  queueRef.current = updated;
                  setQueue(updated);
                  // We don't reset index here because we are already playing resolved at index 0 (or whatever it was)
                  // Actually, since it's a seed, it becomes the first item of the new dynamic queue.
                  setQueueIndex(0);
                  idxRef.current = 0;
                }
              }
            }
          }).catch(err => {
            recoLockRef.current = false;
            console.error('AI Recommendation Error:', err);
          });
        }
      }

      console.log('[Player] Resetting player for new track...');
      await TrackPlayer.reset();
      const rnTrack = buildRnTrack(resolved, url);
      
      if (rnTrack) {
        console.log('[Player] Adding track to native layer:', rnTrack.title);
        try {
          await TrackPlayer.add([rnTrack]);
          await TrackPlayer.play();
        } catch (nativeErr) {
          console.error('[Player] Native playback error:', nativeErr);
          throw nativeErr;
        }
      } else {
        throw new Error('Could not build valid RN track');
      }

      setIsLoading(false);
      loadingRef.current = false;
      addToRecent(resolved);

    } catch (err) {
      console.error('[Player] playTrack error:', err);
      setError('Playback failed. Please try again.');
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [addToRecent]); // Removed recentlyPlayed, liked, feedback to stop re-render loop

  // ── NEXT ───────────────────────────────────────────────────────────────────
  const playNext = useCallback(() => {
    const q   = queueRef.current;
    const idx = idxRef.current;
    if (!q.length) return;

    if (repeatRef.current === 'one') {
      playTrack(q[idx], q, idx);
      return;
    }

    const nextIdx = idx + 1;
    if (nextIdx >= q.length) {
      if (repeatRef.current === 'all') {
        playTrack(q[0], q, 0);
      } else if (isRadioMode) {
        // Endless Radio: Fetch more if reached end (Requirement #8)
        const context = {
           playedIds: playedIds.current,
           history: recentlyPlayed,
           likedIds: liked,
           feedback
        };
        RecommendationService.generateSmartQueue(q[idx], context, 15).then(more => {
           const validMore = (more || []).filter(t => t && t.id);
           if (validMore.length) {
             const newQ = [...q, ...validMore];
             queueRef.current = newQ;
             setQueue(newQ);
             playTrack(validMore[0], newQ, q.length);
           }
        });
      }
      return;
    }

    // Feedback: If skipped before 10% of song, count as skip
    if (progress.position > 0 && progress.position < (progress.duration * 0.1)) {
       if (currentTrack) trackFeedback(currentTrack.id, 'skips');
    }

    playTrack(q[nextIdx], q, nextIdx);
  }, [playTrack, progress.position, progress.duration, currentTrack, trackFeedback, isRadioMode]); // Removed recentlyPlayed, liked, feedback

  // ── PREV ───────────────────────────────────────────────────────────────────
  const playPrev = useCallback(() => {
    const q   = queueRef.current;
    const idx = idxRef.current;
    if (!q.length) return;

    // If > 3s played, restart current
    if (progress.position > 3) {
      TrackPlayer.seekTo(0);
      return;
    }

    const prevIdx = idx - 1;
    if (prevIdx < 0) {
      TrackPlayer.seekTo(0);
      return;
    }
    playTrack(q[prevIdx], q, prevIdx);
  }, [playTrack, progress.position]);

  useEffect(() => {
    playNextRef.current = playNext;
    playPrevRef.current = playPrev;
  }, [playNext, playPrev]);

  // ── CONTROLS ───────────────────────────────────────────────────────────────
  const togglePlay = useCallback(async () => {
    const s = await TrackPlayer.getPlaybackState();
    if (s.state === State.Playing) await TrackPlayer.pause();
    else await TrackPlayer.play();
  }, []);

  const pauseTrack = useCallback(async () => {
    await TrackPlayer.pause();
  }, []);

  const seekTo = useCallback(async (seconds) => {
    await TrackPlayer.seekTo(seconds);
  }, []);

  const seekToRatio = useCallback(async (ratio) => {
    const dur = progress.duration || 0;
    if (dur > 0) await TrackPlayer.seekTo(ratio * dur);
  }, [progress.duration]);

  const toggleLike = useCallback(async (trackOrId) => {
    let id, trackMetadata;
    if (typeof trackOrId === 'object' && trackOrId !== null) {
      id = String(trackOrId.id);
      trackMetadata = trackOrId;
    } else {
      id = String(trackOrId);
      // Try to find metadata in recentlyPlayed if not provided
      trackMetadata = recentlyPlayed.find(t => String(t.id) === id);
    }

    setLiked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      AsyncStorage.setItem(STORAGE_LIKED, JSON.stringify([...next])).catch(() => {});
      return next;
    });

    if (trackMetadata) {
      setLikedTracks(prev => {
        let next;
        if (prev.some(t => String(t.id) === id)) {
          next = prev.filter(t => String(t.id) !== id);
        } else {
          next = [trackMetadata, ...prev];
        }
        AsyncStorage.setItem(STORAGE_LIKED_TRACKS, JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
  }, [recentlyPlayed]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => {
      const next = !prev;
      shuffleRef.current = next;
      if (next) {
        const q   = queueRef.current;
        const idx = idxRef.current;
        if (q.length > 1 && idx >= 0) {
          const before = q.slice(0, idx + 1);
          const after  = q.slice(idx + 1);
          for (let i = after.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [after[i], after[j]] = [after[j], after[i]];
          }
          const shuffled = [...before, ...after];
          setQueue(shuffled);
          queueRef.current = shuffled;
        }
      }
      return next;
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      const next = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      repeatRef.current = next;
      return next;
    });
  }, []);

  const addToQueue = useCallback((track) => {
    setQueue(prev => {
      const newQueue = [...prev, track];
      queueRef.current = newQueue;
      return newQueue;
    });
  }, []);

  const insertNext = useCallback((track) => {
    setQueue(prev => {
      const idx = idxRef.current;
      const newQueue = [...prev];
      if (idx >= 0) {
        newQueue.splice(idx + 1, 0, track);
      } else {
        newQueue.push(track);
      }
      queueRef.current = newQueue;
      return newQueue;
    });
  }, []);

  const createPlaylist = useCallback(async (name) => {
    const newPlaylist = {
      id: `up_${Date.now()}`,
      title: name,
      artist: 'You',
      artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
      tracks: [],
      isUserPlaylist: true,
    };
    setUserPlaylists(prev => {
      const next = [newPlaylist, ...prev];
      AsyncStorage.setItem(STORAGE_PLAYLISTS, JSON.stringify(next)).catch(() => {});
      return next;
    });
    return newPlaylist;
  }, []);

  const addToUserPlaylist = useCallback(async (playlistId, track) => {
    setUserPlaylists(prev => {
      const next = prev.map(p => {
        if (p.id === playlistId) {
          // Check if already in playlist
          if (p.tracks.some(t => t.id === track.id)) return p;
          return { ...p, tracks: [track, ...p.tracks] };
        }
        return p;
      });
      AsyncStorage.setItem(STORAGE_PLAYLISTS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleLikePlaylist = useCallback(async (playlist) => {
    setLikedPlaylists(prev => {
      let next;
      const isLiked = prev.some(p => p.id === playlist.id);
      if (isLiked) {
        next = prev.filter(p => p.id !== playlist.id);
      } else {
        next = [playlist, ...prev];
      }
      AsyncStorage.setItem(STORAGE_LIKED_PLAYLISTS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const searchYouTube = useCallback((query) => searchGlobal(query), []);

  // ── DOWNLOADS ──────────────────────────────────────────────────────────────
  const downloadTrack = useCallback(async (track) => {
    if (!track || !track.id) return;
    
    // Add to downloadingIds state to show loader in UI
    setDownloadingIds(prev => {
      const next = new Set(prev);
      next.add(track.id);
      return next;
    });

    try {
      // 1. Guard FileSystem availability
      if (!FileSystem || !FileSystem.documentDirectory) {
        throw new Error('Local file system storage is not available on this device');
      }

      // 2. Resolve stream url
      const { url: streamUrl, track: resolvedTrack } = await resolveUrl(track);
      if (!streamUrl) {
        throw new Error('Could not resolve stream URL for download');
      }

      // 3. Prepare paths & sanitize filename to avoid folder path injection or special char issues
      const fileExtension = 'mp3';
      const safeId = String(track.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      const localFilename = `track_${safeId}.${fileExtension}`;
      const localUri = `${FileSystem.documentDirectory}${localFilename}`;

      // 4. Download the file
      console.log(`[Download] Downloading track ${track.id} from ${streamUrl} to ${localUri}...`);
      const downloadResult = await FileSystem.downloadAsync(streamUrl, localUri, { headers: HEADERS });
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      console.log(`[Download] Successfully downloaded to ${downloadResult.uri}`);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Downloaded "${track.title || 'Song'}" successfully!`, ToastAndroid.SHORT);
      }

      // 5. Update downloaded tracks list
      const offlineTrack = {
        ...resolvedTrack,
        id: track.id,
        url: downloadResult.uri, // Use the local file path!
        isOffline: true,
      };

      setDownloadedTracks(prev => {
        const filtered = prev.filter(t => t.id !== track.id);
        const updated = [...filtered, offlineTrack];
        AsyncStorage.setItem(STORAGE_DOWNLOADS, JSON.stringify(updated)).catch(() => {});
        return updated;
      });

    } catch (err) {
      console.error(`[Download] Error downloading track ${track.id}:`, err);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Download failed: ${err.message || 'Unknown Error'}`, ToastAndroid.LONG);
      }
    } finally {
      // Remove from downloadingIds
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }
  }, []);

  const removeDownload = useCallback(async (trackId) => {
    if (!trackId) return;
    try {
      if (!FileSystem || !FileSystem.documentDirectory) {
        throw new Error('Local file system storage is not available on this device');
      }
      const safeId = String(trackId).replace(/[^a-zA-Z0-9_-]/g, '_');
      const localFilename = `track_${safeId}.mp3`;
      const localUri = `${FileSystem.documentDirectory}${localFilename}`;

      // Check if file exists and delete it
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
        console.log(`[Download] Deleted local file: ${localUri}`);
      }

      // Update state
      setDownloadedTracks(prev => {
        const updated = prev.filter(t => t.id !== trackId);
        AsyncStorage.setItem(STORAGE_DOWNLOADS, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    } catch (err) {
      console.error(`[Download] Error removing track ${trackId}:`, err);
    }
  }, []);

  // ── DERIVED ────────────────────────────────────────────────────────────────
  const progressRatio = progress.duration > 0
    ? progress.position / progress.duration : 0;

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      isLoading,
      error,
      liked,
      likedTracks,
      recentlyPlayed,
      userPlaylists,
      likedPlaylists,
      queue,
      queueIndex,
      isShuffle,
      repeatMode,
      isRadioMode,
      feedback,
      onboardingData,
      isFullPlayerVisible,
      isMiniPlayerVisible,
      setIsFullPlayerVisible,
      setIsMiniPlayerVisible,
      isDataLoaded,
      progress:    progress, // Pass the full object (position, duration, buffered)
      progressRatio: progressRatio,
      position:    progress.position,
      duration:    progress.duration,
      durationSec: progress.duration,
      playTrack,
      playSnippet,
      trackFeedback,
      resetUserExperience,
      saveOnboarding,
      togglePlay,
      pauseTrack,
      toggleLike,
      toggleLikePlaylist,
      seekTo,
      seekToRatio,
      playNext,
      playPrev,
      toggleShuffle,
      cycleRepeat,
      searchYouTube,
      addToQueue,
      insertNext,
      setQueue,
      createPlaylist,
      addToUserPlaylist,
      downloadedTracks,
      downloadingIds,
      downloadTrack,
      removeDownload,
    }}>

      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);