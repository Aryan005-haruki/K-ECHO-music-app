import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  Dimensions, Animated, PanResponder, Modal, 
  ActivityIndicator, ScrollView, Platform, 
  ToastAndroid, Share, TouchableWithoutFeedback, StatusBar
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePlayer } from '../context/PlayerContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { getLyrics, getRadioSuggestions } from '../services/ApiService';

const { width, height: screenHeight } = Dimensions.get('screen');
const height = screenHeight + (Platform.OS === 'android' ? 50 : 0); // Over-extend to cover nav bar

export default function FullScreenPlayer({ visible, onClose }) {
  const navigation = useNavigation();
  const { 
    currentTrack, isPlaying, togglePlay, playNext, playPrev, 
    progress, seekToRatio, liked, toggleLike, isLoading,
    queue, queueIndex, setQueue, repeatMode, cycleRepeat, 
    isShuffle, toggleShuffle, playTrack, userPlaylists, addToUserPlaylist, createPlaylist,
    downloadTrack, downloadedTracks, removeDownload, downloadingIds
  } = usePlayer();

  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [isQueueVisible, setIsQueueVisible] = useState(false);
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);
  const [isAddToPlaylistVisible, setIsAddToPlaylistVisible] = useState(false);
  const [lyrics, setLyrics] = useState(null);
  const [fetchingLyrics, setFetchingLyrics] = useState(false);

  const translateY = useRef(new Animated.Value(height)).current;
  const queueTranslateY = useRef(new Animated.Value(height)).current;
  const lyricsTranslateY = useRef(new Animated.Value(height)).current;
  const lyricsScrollRef = useRef(null);
  const [activeLine, setActiveLine] = useState(0);

  // Reset lyrics when track changes
  useEffect(() => {
    setLyrics(null);
    setIsLyricsVisible(false);
  }, [currentTrack?.id]);

  const fetchLyrics = async () => {
    if (!currentTrack || lyrics) return;
    setFetchingLyrics(true);
    const text = await getLyrics(currentTrack.id);
    setLyrics(text);
    setFetchingLyrics(false);
  };

  useEffect(() => {
    if (isLyricsVisible) {
      fetchLyrics();
      Animated.spring(lyricsTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 8
      }).start();
    } else {
      Animated.timing(lyricsTranslateY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [isLyricsVisible]);

  useEffect(() => {
    if (visible) {
      StatusBar.setHidden(true, 'fade');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();
    } else {
      StatusBar.setHidden(false, 'fade');
      Animated.timing(translateY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (isQueueVisible) {
      Animated.spring(queueTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 8
      }).start();
    } else {
      Animated.timing(queueTranslateY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [isQueueVisible]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only capture vertical swipes if they are significant enough and not already in queue view
      return !isQueueVisible && Math.abs(gestureState.dy) > 20 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > 120 || gestureState.vy > 0.5) {
        onClose();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 7
        }).start();
      }
    }
  }), [onClose, isQueueVisible]);

  // ── ALL HOOKS MUST BE ABOVE ANY EARLY RETURN (React Rules of Hooks) ──────
  // Use the progress object safely (declared here so hook below can use them)
  const position = progress?.position || 0;
  const duration = progress?.duration || 1;

  // ESTIMATED LYRIC SYNC - MUST be before early return
  useEffect(() => {
    if (isLyricsVisible && lyrics && duration > 0) {
      const lines = lyrics.split('\n').filter(l => l.trim().length > 0);
      if (lines.length > 0) {
        const lineDuration = duration / lines.length;
        const currentLine = Math.floor(position / lineDuration);
        setActiveLine(currentLine);
        
        // Auto-scroll to active line
        if (lyricsScrollRef.current) {
          lyricsScrollRef.current.scrollTo({
            y: Math.max(0, currentLine * 50 - 100),
            animated: true
          });
        }
      }
    }
  }, [position, isLyricsVisible, lyrics, duration]);

  // ── EARLY RETURN (after ALL hooks) ───────────────────────────────────────
  if (!currentTrack) return null;

  const pct = position / duration;

  const handleSeek = (evt) => {
    const newPct = evt.nativeEvent.locationX / (width - 64);
    seekToRatio(newPct);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAction = (type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOptionsVisible(false);
    
    switch(type) {
      case 'like':
        toggleLike(currentTrack);
        if (Platform.OS === 'android') {
          ToastAndroid.show(liked.has(String(currentTrack.id)) ? 'Removed from Liked' : 'Added to Liked Songs', ToastAndroid.SHORT);
        }
        break;
      case 'playlist':
        setIsOptionsVisible(false);
        setTimeout(() => setIsAddToPlaylistVisible(true), 300);
        break;
      case 'download':
        const isDownloaded = downloadedTracks?.some(t => t.id === currentTrack?.id);
        if (isDownloaded) {
          if (Platform.OS === 'android') ToastAndroid.show(`Already Downloaded`, ToastAndroid.SHORT);
        } else {
          if (Platform.OS === 'android') ToastAndroid.show(`Downloading ${currentTrack?.title || 'Song'}...`, ToastAndroid.SHORT);
          downloadTrack(currentTrack);
        }
        break;
      case 'share':
        Share.share({
          message: `Check out ${currentTrack.title} by ${currentTrack.artist} on K-ECHO!`,
          url: currentTrack.url || `https://www.jiosaavn.com/song/${currentTrack.id}`
        });
        break;
      case 'artist':
        if (Platform.OS === 'android') ToastAndroid.show(`Opening ${currentTrack.artist}`, ToastAndroid.SHORT);
        onClose();
        setTimeout(() => {
          navigation.navigate('PlaylistDetail', { 
            playlist: { 
              id: currentTrack.artistId || currentTrack.artist, 
              title: currentTrack.artist,
              isArtist: true,
              artwork: currentTrack.artwork
            } 
          });
        }, 300);
        break;
      case 'album':
        if (Platform.OS === 'android') ToastAndroid.show(`Opening ${currentTrack.album}`, ToastAndroid.SHORT);
        onClose();
        setTimeout(() => {
          navigation.navigate('PlaylistDetail', { 
            playlist: { 
              id: currentTrack.albumId || currentTrack.album, 
              title: currentTrack.album,
              isAlbum: true,
              artwork: currentTrack.artwork
            } 
          });
        }, 300);
        break;
    }
  };

  const jumpToTrack = (track, index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playTrack(track, queue, index);
    setIsQueueVisible(false);
  };

  const handleAddToPlaylist = async (playlistId) => {
    await addToUserPlaylist(playlistId, currentTrack);
    setIsAddToPlaylistVisible(false);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Added to playlist`, ToastAndroid.SHORT);
    }
  };

  const openRelated = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsQueueVisible(true);
    // If queue is small, force fetch more related songs
    if (queue.length < 5) {
       const suggestions = await getRadioSuggestions(currentTrack);
       if (suggestions.length) {
         setQueue(prev => [...prev, ...suggestions]);
       }
    }
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="none" 
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <Animated.View 
        style={[styles.container, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        {/* DYNAMIC BACKGROUND */}
        <Image 
          source={{ uri: currentTrack.artwork }} 
          style={StyleSheet.absoluteFill} 
          blurRadius={Platform.OS === 'ios' ? 80 : 40}
        />
        <LinearGradient 
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', '#000']} 
          style={StyleSheet.absoluteFill} 
        />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="chevron-down" size={32} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTopTitle}>NOW PLAYING</Text>
            <Text style={styles.headerQueueInfo} numberOfLines={1}>FROM QUEUE • {queueIndex + 1} OF {queue.length}</Text>
          </View>

          <TouchableOpacity style={styles.headerBtn} onPress={() => setIsOptionsVisible(true)}>
            <Ionicons name="ellipsis-horizontal" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          {/* ALBUM ART */}
          <View style={styles.artContainer}>
            <View style={styles.artShadow}>
              <Image source={{ uri: currentTrack.artwork }} style={styles.art} />
            </View>
          </View>

          {/* INFO & LIKE */}
          <View style={styles.trackMeta}>
            <View style={styles.titleInfo}>
              <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
            </View>
            <View style={styles.metaActions}>
              <TouchableOpacity onPress={() => handleAction('playlist')} style={styles.metaBtn}>
                <MaterialCommunityIcons name="playlist-plus" size={28} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAction('download')} style={styles.metaBtn} disabled={!!(currentTrack?.id && downloadingIds?.has?.(currentTrack.id))}>
                {currentTrack?.id && downloadingIds?.has?.(currentTrack.id) ? (
                  <ActivityIndicator size="small" color="white" />
                ) : downloadedTracks?.some(t => String(t.id) === String(currentTrack?.id)) ? (
                  <Ionicons name="cloud-done" size={24} color="#1DB954" />
                ) : (
                  <Feather name="download" size={24} color="white" />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAction('like')} style={styles.likeBtn}>
                <Ionicons 
                  name={liked.has(String(currentTrack.id)) ? "heart" : "heart-outline"} 
                  size={32} 
                  color={liked.has(String(currentTrack.id)) ? "#ff2d55" : "white"} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* PROGRESS BAR */}
          <View style={styles.progressSection}>
            <TouchableOpacity 
              style={styles.sliderTrack} 
              activeOpacity={1}
              onPress={handleSeek}
            >
              <View style={styles.sliderBg} />
              <View style={[styles.sliderFill, { width: `${pct * 100}%` }]} />
              <View style={[styles.sliderKnob, { left: `${pct * 100}%` }]} />
            </TouchableOpacity>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* CONTROLS */}
          <View style={styles.controls}>
            <TouchableOpacity onPress={toggleShuffle} style={styles.secondaryBtn}>
              <Ionicons name="shuffle" size={26} color={isShuffle ? "#1DB954" : "rgba(255,255,255,0.6)"} />
            </TouchableOpacity>

            <TouchableOpacity onPress={playPrev} style={styles.navBtn}>
              <Ionicons name="play-back" size={42} color="white" />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
              <View style={styles.playBtnInner}>
                {isLoading ? (
                  <ActivityIndicator size="large" color="black" />
                ) : (
                  <Ionicons name={isPlaying ? "pause" : "play"} size={48} color="black" style={{ marginLeft: isPlaying ? 0 : 4 }} />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={playNext} style={styles.navBtn}>
              <Ionicons name="play-forward" size={42} color="white" />
            </TouchableOpacity>

            <TouchableOpacity onPress={cycleRepeat} style={styles.secondaryBtn}>
              <MaterialCommunityIcons 
                name={repeatMode === 'one' ? "repeat-once" : "repeat"} 
                size={26} 
                color={repeatMode !== 'off' ? "#1DB954" : "rgba(255,255,255,0.6)"} 
              />
            </TouchableOpacity>
          </View>

          {/* FOOTER ACTIONS - YT MUSIC STYLE */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.footerItem, isQueueVisible && styles.footerItemActive]} 
              onPress={() => setIsQueueVisible(true)}
            >
                <Text style={[styles.footerText, isQueueVisible && styles.footerTextActive]}>UP NEXT</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.footerItem, isLyricsVisible && styles.footerItemActive]} 
              onPress={() => setIsLyricsVisible(true)}
            >
                <Text style={[styles.footerText, isLyricsVisible && styles.footerTextActive]}>LYRICS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerItem} onPress={openRelated}>
                <Text style={styles.footerText}>RELATED</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* LYRICS DRAWER */}
        <Animated.View style={[styles.queueDrawer, { transform: [{ translateY: lyricsTranslateY }] }]}>
          <View style={styles.queueHeader}>
            <View style={styles.queueIndicator} />
            <View style={styles.queueHeaderRow}>
               <Text style={styles.queueTitle}>Lyrics</Text>
               <TouchableOpacity onPress={() => setIsLyricsVisible(false)}>
                 <Text style={styles.queueCloseText}>Close</Text>
               </TouchableOpacity>
            </View>
          </View>
          <ScrollView 
            ref={lyricsScrollRef}
            contentContainerStyle={styles.lyricsScroll}
            showsVerticalScrollIndicator={false}
          >
             {fetchingLyrics ? (
               <View style={styles.lyricsLoading}>
                 <ActivityIndicator size="large" color="#1DB954" />
                 <Text style={styles.lyricsLoadingText}>Fetching lyrics...</Text>
               </View>
              ) : lyrics ? (
                <View style={styles.lyricsContainer}>
                  {lyrics.split('\n').filter(l => l.trim().length > 0).map((line, i) => (
                    <Text 
                      key={i} 
                      style={[
                        styles.lyricsText, 
                        activeLine === i && styles.lyricsTextActive
                      ]}
                    >
                      {line}
                    </Text>
                  ))}
                </View>
              ) : (
               <View style={styles.lyricsLoading}>
                 <Ionicons name="alert-circle-outline" size={48} color="#444" />
                 <Text style={styles.lyricsLoadingText}>Lyrics not available for this track</Text>
               </View>
             )}
          </ScrollView>
        </Animated.View>
        <Animated.View style={[styles.queueDrawer, { transform: [{ translateY: queueTranslateY }] }]}>
          <View style={styles.queueHeader}>
            <View style={styles.queueIndicator} />
            <View style={styles.queueHeaderRow}>
               <Text style={styles.queueTitle}>Up Next</Text>
               <TouchableOpacity onPress={() => setIsQueueVisible(false)}>
                 <Text style={styles.queueCloseText}>Close</Text>
               </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.queueList}>
             {queue.map((item, idx) => {
               const isCurrent = idx === queueIndex;
               return (
                 <TouchableOpacity 
                   key={`${item.id}_${idx}`} 
                   style={[styles.queueItem, isCurrent && styles.queueItemActive]} 
                   onPress={() => jumpToTrack(item, idx)}
                 >
                   <Image source={{ uri: item.artwork }} style={styles.queueArt} />
                   <View style={styles.queueInfo}>
                     <Text style={[styles.queueTrackTitle, isCurrent && { color: '#1DB954' }]} numberOfLines={1}>{item.title}</Text>
                     <Text style={styles.queueTrackArtist} numberOfLines={1}>{item.artist}</Text>
                   </View>
                   {isCurrent && <Ionicons name="volume-medium" size={20} color="#1DB954" />}
                 </TouchableOpacity>
               );
             })}
          </ScrollView>
        </Animated.View>

        {/* OPTIONS BOTTOM SHEET */}
        <Modal visible={isOptionsVisible} transparent animationType="slide" onRequestClose={() => setIsOptionsVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setIsOptionsVisible(false)}>
            <View style={styles.sheetOverlay}>
              <View style={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                   <Image source={{ uri: currentTrack.artwork }} style={styles.sheetArt} />
                   <View style={styles.sheetHeaderInfo}>
                      <Text style={styles.sheetTitle} numberOfLines={1}>{currentTrack.title}</Text>
                      <Text style={styles.sheetArtist} numberOfLines={1}>{currentTrack.artist}</Text>
                   </View>
                </View>

                <View style={styles.sheetActions}>
                  {[
                    { icon: liked.has(String(currentTrack.id)) ? 'heart' : 'heart-outline', text: liked.has(String(currentTrack.id)) ? 'Liked' : 'Like', color: liked.has(String(currentTrack.id)) ? '#ff2d55' : 'white', action: () => handleAction('like') },
                    { icon: 'playlist-plus', text: 'Add to Playlist', color: 'white', action: () => handleAction('playlist'), isMCI: true },
                    { icon: 'share-outline', text: 'Share Song', color: 'white', action: () => handleAction('share') },
                    { icon: 'person-outline', text: 'View Artist', color: 'white', action: () => handleAction('artist') },
                    { icon: 'album', text: 'View Album', color: 'white', action: () => handleAction('album'), isMCI: true },
                  ].map((item, idx) => (
                    <TouchableOpacity key={idx} style={styles.actionRow} onPress={item.action}>
                      <View style={styles.actionIcon}>
                        {item.isMCI ? (
                          <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                        ) : (
                          <Ionicons name={item.icon} size={24} color={item.color} />
                        )}
                      </View>
                      <Text style={[styles.actionText, { color: item.color }]}>{item.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* ADD TO PLAYLIST MODAL */}
        <Modal visible={isAddToPlaylistVisible} transparent animationType="slide" onRequestClose={() => setIsAddToPlaylistVisible(false)}>
           <View style={styles.sheetOverlay}>
             <View style={styles.sheetContent}>
                <Text style={styles.sheetTitleBig}>Add to Playlist</Text>
                <Text style={styles.sheetSub}>Choose a playlist to add this song</Text>
                
                <ScrollView style={{maxHeight: 300}} showsVerticalScrollIndicator={false}>
                  {userPlaylists && userPlaylists.length > 0 ? (
                    userPlaylists.map(playlist => (
                      <TouchableOpacity 
                        key={playlist.id} 
                        style={styles.actionRow} 
                        onPress={() => handleAddToPlaylist(playlist.id)}
                      >
                         <Ionicons name="musical-notes-outline" size={24} color="#1DB954" />
                         <Text style={styles.actionText}>{playlist.title}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={{color: '#666', textAlign: 'center', marginVertical: 20}}>No playlists yet</Text>
                  )}
                </ScrollView>

                <TouchableOpacity 
                  style={[styles.actionRow, {marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 20}]} 
                  onPress={() => {
                    setIsAddToPlaylistVisible(false);
                    navigation.navigate('Library');
                  }}
                >
                   <Ionicons name="add-circle" size={24} color="#1DB954" />
                   <Text style={styles.actionText}>Create New Playlist</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionRow, {marginTop: 10}]} onPress={() => setIsAddToPlaylistVisible(false)}>
                   <Ionicons name="close-circle" size={24} color="#666" />
                   <Text style={styles.actionText}>Cancel</Text>
                </TouchableOpacity>
             </View>
           </View>
        </Modal>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    width: width,
    height: height,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 40 : 30, // Reduced top padding
    paddingHorizontal: 20,
    height: 100, // Reduced height
    zIndex: 10,
  },
  headerBtn: { padding: 8 },
  headerInfo: { alignItems: 'center' },
  headerTopTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  headerQueueInfo: { color: 'white', fontSize: 12, fontWeight: '700', marginTop: 2, maxWidth: width * 0.5 },

  artContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 10,
    marginBottom: 20, // Reduced to give more space for buttons
  },
  artShadow: {
    width: width - 64,
    aspectRatio: 1,
    borderRadius: 24,
    backgroundColor: '#111',
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  art: { width: '100%', height: '100%', borderRadius: 24 },

  trackMeta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  titleInfo: { flex: 1 },
  title: { color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  artist: { color: 'rgba(255,255,255,0.6)', fontSize: 18, marginTop: 2, fontWeight: '600' },
  likeBtn: { padding: 8 },

  progressSection: { paddingHorizontal: 32, marginBottom: 30 },
  sliderTrack: { height: 40, justifyContent: 'center', position: 'relative' },
  sliderBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
  sliderFill: { height: 4, backgroundColor: 'white', borderRadius: 2, position: 'absolute' },
  sliderKnob: { 
    width: 14, height: 14, borderRadius: 7, backgroundColor: 'white', 
    position: 'absolute', marginLeft: -7,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 4,
    elevation: 5
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
  timeText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },

  controls: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    marginBottom: 30,
  },
  playBtn: { 
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center', elevation: 10
  },
  playBtnInner: { alignItems: 'center', justifyContent: 'center' },
  navBtn: { padding: 10 },
  secondaryBtn: { padding: 10 },

  footer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingBottom: Platform.OS === 'android' ? 100 : 120, // Moved up even more for visibility
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 15,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  footerItem: { 
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  footerItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  footerText: { 
    color: 'rgba(255,255,255,0.5)', 
    fontSize: 13, 
    fontWeight: '900',
    letterSpacing: 1
  },
  footerTextActive: {
    color: 'white'
  },

  queueDrawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.7,
    backgroundColor: '#0f0f0f',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    zIndex: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  queueHeader: {
    padding: 20,
    alignItems: 'center',
  },
  queueIndicator: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginBottom: 15,
  },
  queueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  queueTitle: { color: 'white', fontSize: 20, fontWeight: '800' },
  queueCloseText: { color: '#1DB954', fontSize: 14, fontWeight: '700' },
  queueList: { padding: 20, paddingBottom: 40 },
  queueItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16,
    padding: 8,
    borderRadius: 12,
  },
  queueItemActive: { backgroundColor: 'rgba(29, 185, 84, 0.1)' },
  queueArt: { width: 48, height: 48, borderRadius: 6 },
  queueInfo: { flex: 1, marginLeft: 16 },
  queueTrackTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  queueTrackArtist: { color: '#888', fontSize: 13, marginTop: 2 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetContent: { 
    backgroundColor: '#161616', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24,
    paddingBottom: 40,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  sheetArt: { width: 60, height: 60, borderRadius: 12 },
  sheetHeaderInfo: { marginLeft: 16, flex: 1 },
  sheetTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  sheetArtist: { color: '#888', fontSize: 14, marginTop: 4 },
  sheetActions: { gap: 10 },
  actionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  actionIcon: { width: 32, alignItems: 'center' },
  actionText: { color: 'white', fontSize: 16, fontWeight: '700', marginLeft: 16 },
  lyricsScroll: { paddingHorizontal: 24, paddingVertical: 40, paddingBottom: 250 },
  lyricsContainer: { width: '100%' },
  lyricsText: { 
    color: 'rgba(255,255,255,0.3)', 
    fontSize: 26, 
    lineHeight: 42, 
    fontWeight: '800', 
    textAlign: 'left',
    marginVertical: 12,
    letterSpacing: -0.5
  },
  lyricsTextActive: {
    color: 'white',
    fontSize: 28,
  },
  lyricsLoading: { flex: 1, height: height * 0.5, alignItems: 'center', justifyContent: 'center' },
  lyricsLoadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '700', marginTop: 16 },
  
  metaActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaBtn: { padding: 6 },
  sheetTitleBig: { color: 'white', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  sheetSub: { color: '#888', fontSize: 14, fontWeight: '600', marginBottom: 20 },
});