import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36';
const SAAVN_BASE = 'https://www.jiosaavn.com/api.php';
const DES_KEY    = '38346591';

// JioSaavn + Apple iTunes APIs only

async function fetchJSON(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(t);
    return null;
  }
}

function decryptMediaUrl(enc) {
  try {
    const key = CryptoJS.enc.Utf8.parse(DES_KEY);
    const dec = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(enc) },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 },
    );
    let url = dec.toString(CryptoJS.enc.Utf8);
    url = url.replace(/_96\.mp4/, '_320.mp4').replace(/_160\.mp4/, '_320.mp4');
    if (url && url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }
    return url || null;
  } catch {
    return null;
  }
}

function fmtSecs(s) {
  const n = parseInt(s, 10) || 0;
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}

function fixArt(url) {
  if (!url) return 'https://api.dicebear.com/7.x/initials/svg?seed=K-ECHO';
  let finalUrl = '';
  if (Array.isArray(url)) {
    finalUrl = url[url.length - 1]?.link || url[url.length - 1] || '';
  } else if (typeof url === 'object') {
    finalUrl = url.link || url['500x500'] || url['150x150'] || '';
  } else {
    finalUrl = url;
  }
  
  if (typeof finalUrl !== 'string') return 'https://api.dicebear.com/7.x/initials/svg?seed=K-ECHO';

  return finalUrl
    .replace('150x150', '500x500')
    .replace('50x50',   '500x500')
    .replace('http://', 'https://');
}

function parseSong(s) {
  if (!s || !s.encrypted_media_url) return null;
  const url = decryptMediaUrl(s.encrypted_media_url);
  if (!url) return null;
  const song = {
    id:           String(s.id),
    title:        s.song  || s.title  || 'Unknown',
    artist:       s.primary_artists || s.singers || 'Unknown',
    artistId:     s.artistMap?.primary_artists?.[0]?.id || s.artistMap?.artists?.[0]?.id || '',
    album:        s.album || '',
    albumId:      s.album_id || '',
    artwork:      fixArt(s.image),
    image:        fixArt(s.image),
    url,
    duration:     fmtSecs(s.duration),
    durationSecs: parseInt(s.duration, 10) || 0,
    isSaavn:      true,
    language:     s.language || '',
    isSnippet:    (parseInt(s.duration, 10) || 0) < 60, // Mark as snippet if < 60s
  };
  
  // Mandatory field validation
  if (!song.id || !song.title || !song.url) return null;
  return song;
}

async function fetchSongDetails(pids) {
  if (!pids.length) return [];
  const url = `${SAAVN_BASE}?__call=song.getDetails&cc=in&_marker=0&_format=json&pids=${pids.join(',')}`;
  const data = await fetchJSON(url);
  if (!data) return [];
  return pids.map(id => {
    if (!data[id]) return null;
    return parseSong(data[id]);
  }).filter(Boolean);
}

export async function searchSaavn(query, limit = 20) {
  try {
    const url = `${SAAVN_BASE}?__call=search.getResults&q=${encodeURIComponent(query.trim())}&n=${limit}&p=1&_format=json&_marker=0&ctx=android`;
    const data = await fetchJSON(url);
    if (!data?.results) return [];
    return data.results.slice(0, limit).map(parseSong).filter(Boolean);
  } catch (err) {
    console.error('Saavn Search Error:', err);
    return [];
  }
}

export async function getSearchSuggestions(query) {
  try {
    const url = `${SAAVN_BASE}?__call=autocomplete.get&query=${encodeURIComponent(query.trim())}&_format=json&_marker=0&ctx=android`;
    const data = await fetchJSON(url);
    if (!data?.albums?.data && !data?.songs?.data && !data?.artists?.data) return [];
    
    const res = [];
    if (data.songs?.data) res.push(...data.songs.data.map(i => i.title));
    if (data.artists?.data) res.push(...data.artists.data.map(i => i.title));
    if (data.albums?.data) res.push(...data.albums.data.map(i => i.title));
    
    return [...new Set(res)].slice(0, 10);
  } catch (err) {
    return [];
  }
}

export async function getLyrics(trackId) {
  try {
    const url = `${SAAVN_BASE}?__call=lyrics.getLyrics&ctx=web6dot0&_format=json&_marker=0%3F_marker%3D0&lyrics_id=${trackId}`;
    const data = await fetchJSON(url);
    if (!data?.lyrics) return null;
    
    // Clean lyrics text (remove HTML entities/tags if any)
    let text = data.lyrics;
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&amp;/g, '&');
    
    return text;
  } catch (err) {
    console.error('Lyrics Fetch Error:', err);
    return null;
  }
}

export async function searchSaavnVideos(query, limit = 15) {
  try {
    const url = `${SAAVN_BASE}?__call=search.getVideoResults&q=${encodeURIComponent(query)}&n=${limit}&p=1&_format=json&_marker=0&ctx=android`;
    const data = await fetchJSON(url);
    if (!data?.results) return [];
    return data.results.map(v => ({
      id: v.id,
      title: v.title,
      artist: v.artistMap ? Object.keys(v.artistMap)[0] : 'Unknown',
      artwork: v.image?.replace('150x150', '500x500') || '',
      streamUrl: v.preview_url, // Direct MP4 link
      type: 'video'
    })).filter(v => v.streamUrl);
  } catch {
    return [];
  }
}


// Global Memory Cache for Instant Turbo Speed
const MEM_CACHE = new Map();

// Caching utility for low-data speed optimization
const CACHE_PREFIX = '@kecho_v3_cache_';
async function getCache(key) {
  // 1. Check Memory Cache first (Instant)
  if (MEM_CACHE.has(key)) return MEM_CACHE.get(key);
  
  try {
    const data = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (data) {
      const parsed = JSON.parse(data);
      MEM_CACHE.set(key, parsed);
      return parsed;
    }
    return null;
  } catch { return null; }
}

async function setCache(key, data) {
  try {
    MEM_CACHE.set(key, data);
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch {}
}

// Background Turbo Pre-fetcher
export async function turboPreFetch() {
  console.log('🚀 Turbo Pre-fetch Started...');
  Promise.allSettled([
    getAppleTrendingVideos(15),
    getTrendingIndia(20),
  ]);
}

export async function searchiTunesVideos(query, limit = 10) {
  const cacheKey = `itunes_${query}_${limit}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicVideo&limit=${limit}`;
    const res = await fetch(url);
    const data = await res.json();
    const results = (data.results || []).map(v => ({
      id: 'itunes_v_' + v.trackId,
      title: v.trackName,
      artist: v.artistName,
      artwork: v.artworkUrl100.replace('100x100', '500x500'),
      image: v.artworkUrl100.replace('100x100', '500x500'),
      streamUrl: v.previewUrl,
      type: 'video',
      isiTunes: true
    })).filter(v => v.streamUrl);
    
    if (results.length > 0) setCache(cacheKey, results);
    return results;
  } catch {
    return [];
  }
}

export async function getAppleTrendingVideos(limit = 20) {
  try {
    // Rotating Indian music categories for Apple Music Videos
    const categories = [
      'Hindi Top Hits 2024',
      'Punjabi Viral 2024',
      'Bollywood Trending 2024',
      'Indian Pop Hits',
      'Arijit Singh Hits',
      'Sidhu Moose Wala',
      'New Haryanvi Songs',
      'Bhojpuri Top 50',
      'Tamil Trending',
      'Telugu Hits'
    ];
    
    // Pick 2 random categories to mix
    const cat1 = categories[Math.floor(Math.random() * categories.length)];
    const cat2 = categories[Math.floor(Math.random() * (categories.length - 1))];
    
    const cacheKey = `apple_trending_${cat1}_${cat2}_${limit}`;
    const cached = await getCache(cacheKey);
    // Low cache chance for fresh reels on every entry
    if (cached && Math.random() > 0.8) return cached;

    // Fetch from iTunes (High speed, direct MP4 links, low data)
    const [res1, res2] = await Promise.allSettled([
      searchiTunesVideos(cat1, 25),
      searchiTunesVideos(cat2, 25)
    ]);

    let pool = [];
    if (res1.status === 'fulfilled') pool = [...pool, ...res1.value];
    if (res2.status === 'fulfilled') pool = [...pool, ...res2.value];

    // Filter to ensure only Indian-related content if possible (iTunes doesn't always have region tags in search)
    // But since our queries are India-specific, it's mostly correct.

    // Shuffle for variety
    pool = pool.sort(() => 0.5 - Math.random());
    
    if (pool.length > 0) {
      const finalPool = pool.slice(0, limit);
      setCache(cacheKey, finalPool);
      return finalPool;
    }

    // Ultimate Fallback
    return searchiTunesVideos('Indian Music Videos 2024', limit);
  } catch (err) {
    console.error('Apple Trending Fetch Error:', err);
    return [];
  }
}




export async function getTrendingTracks(limit = 20) {
  try {
    const url  = `${SAAVN_BASE}?__call=webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=web6dot0`;
    const data = await fetchJSON(url);
    if (!data?.new_trending) return [];
    const ids = data.new_trending.filter(i => i.type === 'song').slice(0, limit).map(i => i.id);
    return fetchSongDetails(ids);
  } catch {
    return [];
  }
}

export async function getTrendingIndia(limit = 20) {
  try {
    const songs = await searchSaavn('hindi top trending', limit);
    if (songs && songs.length > 0) return songs;
    return getTrendingTracks(limit);
  } catch {
    return getTrendingTracks(limit);
  }
}

export async function getStateTrending(stateLabel, limit = 15) {
  try {
    // Pure Apple (iTunes) Implementation - 2026 Trending
    const queryMap = {
      'Mumbai': 'Top 15 Mumbai Bollywood 2026',
      'UP/Bihar': 'Bhojpuri Hits 2026 Trending',
      'Punjab': 'Punjabi Top 50 2026',
      'Haryana': 'Haryanvi Trending 2026 Hits',
      'Rajasthan': 'Rajasthani Top 2026 Pop',
      'Gujarat': 'Gujarati Trending 2026 Hits',
      'Delhi': 'Delhi Top 15 Bollywood 2026'
    };

    const query = queryMap[stateLabel] || `${stateLabel} Songs 2026`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}&country=in`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.results && data.results.length > 0) {
      return data.results.map(s => ({
        id: 'apple_state_' + s.trackId,
        title: s.trackName,
        artist: s.artistName,
        artwork: s.artworkUrl100.replace('100x100', '600x600'),
        image: s.artworkUrl100.replace('100x100', '600x600'),
        url: s.previewUrl,
        duration: fmtSecs(s.trackTimeMillis / 1000),
        durationSecs: s.trackTimeMillis / 1000,
        isiTunes: true
      }));
    }
    return [];
  } catch (err) {
    console.error('Pure Apple Fetch Error:', err);
    return [];
  }
}

export async function getGlobalTopHits(limit = 10) {
  try {
    // Using a more reliable query for Global hits
    const results = await searchSaavn('Top Global Hits 2024', limit);
    if (results && results.length > 0) return results;
    return await searchSaavn('Trending Global Music', limit);
  } catch { return []; }
}

export async function getNewReleases(limit = 10) {
  try {
    // Fetching latest Bollywood/Punjabi releases
    const results = await searchSaavn('New Bollywood Songs 2024', limit);
    if (results && results.length > 0) return results;
    return await searchSaavn('Latest Punjabi Songs', limit);
  } catch { return []; }
}

export async function getArtistSpotlight() {
  const SPOTLIGHT_KEY = 'spotlight_data';
  const REFRESH_INTERVAL = 4 * 60 * 60 * 1000; // 4 Hours

  try {
    const cachedStr = await AsyncStorage.getItem(SPOTLIGHT_KEY);
    const now = Date.now();
    
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (now - cached.timestamp < REFRESH_INTERVAL) {
        console.log('💎 Loading Spotlight from Cache...');
        return cached.data;
      }
    }

    console.log('🔄 4h Elapsed: Refreshing Artist Spotlight...');
    const artists = [
      'Arijit Singh', 'Sidhu Moose Wala', 'Diljit Dosanjh', 'Neha Kakkar', 
      'Badshah', 'King', 'Jubin Nautiyal', 'Shreya Ghoshal', 'Armaan Malik',
      'Yo Yo Honey Singh', 'Divine', 'Karan Aujla', 'Atif Aslam'
    ];
    
    // Pick random artist
    const artist = artists[Math.floor(Math.random() * artists.length)];
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=song&limit=25&country=in`;
    const res = await fetch(url);
    const data = await res.json();
    
    const tracks = (data.results || []).map(s => ({
      id: 'apple_spot_' + s.trackId,
      title: s.trackName,
      artist: s.artistName,
      artwork: s.artworkUrl100.replace('100x100', '600x600'),
      image: s.artworkUrl100.replace('100x100', '600x600'),
      url: s.previewUrl,
      duration: fmtSecs(s.trackTimeMillis / 1000),
      isiTunes: true
    }));

    if (tracks.length === 0) return null;

    const spotlightData = {
      artist,
      tracks,
      banner: tracks[0]?.artwork || ''
    };

    // Save to cache
    await AsyncStorage.setItem(SPOTLIGHT_KEY, JSON.stringify({
      timestamp: now,
      data: spotlightData
    }));

    return spotlightData;
  } catch (err) {
    console.error('Spotlight Refresh Error:', err);
    return null;
  }
}

export async function getRadioSuggestions(seedTrack, excludeIds = new Set(), count = 15) {
  try {
    const pids = encodeURIComponent(String(seedTrack.id || ''));
    const lang = encodeURIComponent(String(seedTrack.language || 'hindi,english'));
    const url = `${SAAVN_BASE}?__call=reco.getRadioSongs&pids=${pids}&language=${lang}&n=${count}&_format=json&_marker=0&ctx=android`;
    const data = await fetchJSON(url);
    
    let songs = [];
    if (data && Array.isArray(data)) {
      songs = data.map(parseSong).filter(s => s && !excludeIds.has(s.id));
    }
    
    // If we didn't get enough, fallback to artist-based search
    if (songs.length < 5 && seedTrack.artist) {
      const artistQuery = seedTrack.artist.split(',')[0].trim();
      const fallback = await searchSaavn(artistQuery, count);
      const fallbackFiltered = fallback.filter(s => s && !excludeIds.has(s.id));
      songs = [...songs, ...fallbackFiltered].slice(0, count);
    }
    
    return songs;
  } catch {
    return [];
  }
}

export async function getTrendingByGenre(genre, limit = 20) {
  try {
    // Map genre label to Saavn language/search query
    const genreMap = {
      'Hindi': 'hindi',
      'Punjabi': 'punjabi',
      'Tamil': 'tamil',
      'Telugu': 'telugu',
      'Bengali': 'bengali',
      'Kannada': 'kannada',
      'Malayalam': 'malayalam',
      'Marathi': 'marathi',
      'Gujarati': 'gujarati',
      'Pakistani': 'punjabi,hindi',
    };
    
    const lang = genreMap[genre] || null;
    
    if (lang) {
      // Use Saavn trending with language filter
      const url = `${SAAVN_BASE}?__call=content.getCharts&api_version=4&_format=json&_marker=0&ctx=android&language=${lang}`;
      const data = await fetchJSON(url);
      if (data && Array.isArray(data) && data.length > 0) {
        const ids = data.slice(0, limit).map(i => i.id).filter(Boolean);
        if (ids.length > 0) return fetchSongDetails(ids);
      }
    }
    
    // Fallback: search for genre-specific songs
    const searchQuery = `${genre} hits top songs`;
    return searchSaavn(searchQuery, limit);
  } catch {
    return [];
  }
}



export async function searchPlaylists(query, limit = 5) {
  try {
    const url = `${SAAVN_BASE}?__call=search.getPlaylistResults&q=${encodeURIComponent(query)}&n=${limit}&p=1&_format=json&_marker=0&ctx=android`;
    const data = await fetchJSON(url);
    if (!data?.results) return [];
    return data.results.map(p => ({
      id: p.id || p.listid,
      title: p.title || p.listname,
      artist: 'Playlist',
      artwork: fixArt(p.image),
      isPlaylist: true,
      songCount: p.more_info?.song_count || p.count || '50+'
    }));
  } catch { return []; }
}

export async function searchAlbums(query, limit = 10) {
  try {
    const url = `${SAAVN_BASE}?__call=search.getAlbumResults&q=${encodeURIComponent(query)}&n=${limit}&p=1&_format=json&_marker=0&ctx=android`;
    const data = await fetchJSON(url);
    if (!data?.results) return [];
    return data.results.map(a => ({
      id: a.id || a.albumid,
      title: a.title || a.album,
      artist: a.music || a.primary_artists || 'Album',
      artwork: fixArt(a.image),
      isAlbum: true,
      songCount: a.more_info?.song_count || a.count || '12'
    }));
  } catch { return []; }
}

export async function searchArtists(query, limit = 10) {
  try {
    const url = `${SAAVN_BASE}?__call=search.getArtistResults&q=${encodeURIComponent(query)}&n=${limit}&p=1&_format=json&_marker=0&ctx=android`;
    const data = await fetchJSON(url);
    if (!data?.results) return [];
    return data.results.map(a => ({
      id: a.id,
      title: a.name || a.title,
      artist: 'Artist',
      artwork: fixArt(a.image),
      isArtist: true
    }));
  } catch { return []; }
}

export async function searchiTunesArtists(query, limit = 5) {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=${limit}`);
    const data = await res.json();
    return (data.results || []).map(a => ({
      id: 'itunes_' + a.artistId,
      title: a.artistName,
      artist: 'Artist',
      artwork: '', 
      isArtist: true,
      itunesId: a.artistId
    }));
  } catch { return []; }
}

export async function searchDeezerArtists(query, limit = 5) {
  try {
    const res = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`);
    const data = await res.json();
    return (data.data || []).map(a => ({
      id: 'deezer_' + a.id,
      title: a.name,
      artist: 'Artist',
      artwork: a.picture_medium || a.picture_xl,
      isArtist: true,
      deezerId: a.id
    }));
  } catch { return []; }
}

export async function getiTunesArtistTracks(artistId) {
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${artistId}&entity=song&limit=50`);
    const data = await res.json();
    const songs = data.results.filter(r => r.wrapperType === 'track');
    return songs.map(s => ({
      id: 'itunes_s_' + s.trackId,
      title: s.trackName,
      artist: s.artistName,
      artwork: s.artworkUrl100.replace('100x100', '600x600'),
      duration: fmtSecs(s.trackTimeMillis / 1000),
      url: s.previewUrl,
      isYouTube: false,
      searchTerm: `${s.trackName} ${s.artistName}`
    }));
  } catch { return []; }
}

export async function searchiTunesArtistTracksByName(artistName, limit = 50) {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=${limit}`);
    const data = await res.json();
    return (data.results || []).map(s => ({
      id: 'itunes_s_' + s.trackId,
      title: s.trackName,
      artist: s.artistName,
      artwork: s.artworkUrl100.replace('100x100', '600x600'),
      duration: fmtSecs(s.trackTimeMillis / 1000),
      url: s.previewUrl,
      isYouTube: false,
      searchTerm: `${s.trackName} ${s.artistName}`
    }));
  } catch { return []; }
}

export async function getArtistTracks(artistId, artistName = '') {
  // iTunes artist
  if (typeof artistId === 'string' && artistId.startsWith('itunes_')) {
    const id = artistId.replace('itunes_', '');
    return getiTunesArtistTracks(id);
  }

  // Deezer artist → resolve by name search on Saavn
  if (typeof artistId === 'string' && artistId.startsWith('deezer_')) {
    const name = artistName || artistId.replace('deezer_', '');
    return searchSaavn(name, 30);
  }

  // Plain string that looks like an artist name (not a numeric Saavn ID)
  if (typeof artistId === 'string' && !/^\d+$/.test(artistId)) {
    const name = artistName || artistId;
    // Try Saavn artist search first to get a proper artist ID
    try {
      const searchUrl = `${SAAVN_BASE}?__call=search.getArtistResults&q=${encodeURIComponent(name)}&n=1&p=1&_format=json&_marker=0&ctx=android`;
      const searchData = await fetchJSON(searchUrl);
      if (searchData?.results?.[0]?.id) {
        const saavnId = searchData.results[0].id;
        const tracks = await getArtistTracks(saavnId, name);
        if (tracks.length > 0) return tracks;
      }
    } catch {}
    // Fallback: direct Saavn song search
    return searchSaavn(name, 30);
  }

  // Numeric Saavn artist ID
  try {
    const url = `${SAAVN_BASE}?__call=artist.getArtistPageDetails&artistId=${artistId}&_format=json&_marker=0&ctx=android`;
    const data = await fetchJSON(url);
    if (!data) return searchSaavn(artistName || String(artistId), 20);
    
    const allSongs = [];
    const dataArr = Array.isArray(data) ? data : [data];
    for (const d of dataArr) {
      if (d?.topSongs?.songs) allSongs.push(...d.topSongs.songs);
    }

    const uniqueSongs = [];
    const seen = new Set();
    for (const s of allSongs) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        const parsed = parseSong(s);
        if (parsed) uniqueSongs.push(parsed);
      }
    }

    // If Saavn artist page gives 0 results, fallback to search
    if (uniqueSongs.length === 0 && artistName) return searchSaavn(artistName, 25);
    return uniqueSongs;
  } catch (err) {
    console.error('Saavn Artist Fetch Error:', err);
    if (artistName) return searchSaavn(artistName, 20);
  }
  return [];
}

export async function getPlaylistTracks(playlistId, isAlbum = false) {
  try {
    const endpoint = isAlbum ? 'content.getAlbumDetails' : 'playlist.getDetails';
    const idParam = isAlbum ? `albumid=${playlistId}` : `listid=${playlistId}`;
    
    const url = `${SAAVN_BASE}?__call=${endpoint}&${idParam}&_format=json&_marker=0&ctx=android`;
    const data = await fetchJSON(url);
    
    if (!data) return [];

    let rawList = [];
    if (isAlbum && data.songs) {
      rawList = data.songs;
    } else if (data.list) {
      rawList = data.list;
    } else if (typeof data === 'object') {
      rawList = Object.values(data).filter(v => typeof v === 'object' && v.id);
    }
    
    if (!rawList || rawList.length === 0) return [];

    // First try to parse directly from the raw list (some responses include encrypted_media_url)
    const directParsed = rawList.map(s => parseSong(s)).filter(Boolean);
    if (directParsed.length > 0) return directParsed;

    // Otherwise extract IDs and fetch full song details (which include encrypted_media_url)
    const ids = rawList
      .map(s => s.id)
      .filter(Boolean)
      .slice(0, 50); // Saavn API supports up to ~50 IDs per request

    if (ids.length === 0) return [];

    // Batch fetch in chunks of 20
    const chunks = [];
    for (let i = 0; i < ids.length; i += 20) {
      chunks.push(ids.slice(i, i + 20));
    }
    const results = await Promise.all(chunks.map(chunk => fetchSongDetails(chunk)));
    return results.flat();
  } catch (err) {
    console.error('Saavn Playlist Fetch Error:', err);
  }
  return [];
}

export async function searchGlobal(query, limit = 20) {
  try {
    // Phase 1: Fast Saavn-based searches (all same CDN, very fast)
    const [saavnRes, albumRes, artistRes, playlistRes] = await Promise.allSettled([
      searchSaavn(query, limit),
      searchAlbums(query, 5),
      searchArtists(query, 5),
      searchPlaylists(query, 5),
    ]);

    const saavn    = saavnRes.status === 'fulfilled'    ? saavnRes.value    : [];
    const albums   = albumRes.status === 'fulfilled'    ? albumRes.value    : [];
    let saavnArtists = artistRes.status === 'fulfilled' ? artistRes.value   : [];
    const playlists = playlistRes.status === 'fulfilled' ? playlistRes.value : [];

    // Phase 2: Slower external sources with a tight timeout (3s)
    const withTimeout = (promise, ms) => Promise.race([
      promise,
      new Promise(resolve => setTimeout(() => resolve([]), ms))
    ]);

    const [deezerArtists, itunesArtists] = await Promise.all([
      withTimeout(searchDeezerArtists(query, 3), 3000),
      withTimeout(searchiTunesArtists(query, 2), 3000),
    ]);

    // Merge and deduplicate artists
    let artists = [...deezerArtists, ...itunesArtists, ...saavnArtists];
    const seenTitles = new Set();
    artists = artists.filter(a => {
      const lower = (a.title || '').toLowerCase();
      if (!lower || seenTitles.has(lower)) return false;
      seenTitles.add(lower);
      return true;
    });

    // Determine top result (prefer an exact-match artist)
    const merged = [];
    let topResult = null;
    const queryLow = query.toLowerCase();
    const exactArtist = artists.find(a =>
      a.title.toLowerCase().includes(queryLow) || queryLow.includes(a.title.toLowerCase())
    );
    if (exactArtist) {
      topResult = exactArtist;
      artists = artists.filter(a => a !== exactArtist);
    } else if (saavn.length > 0) {
      topResult = saavn[0];
      saavn.shift();
    }

    if (topResult) merged.push(topResult);
    merged.push(...saavn);
    merged.push(...artists);
    merged.push(...albums);
    merged.push(...playlists);

    return merged;
  } catch (err) {
    return [];
  }
}
