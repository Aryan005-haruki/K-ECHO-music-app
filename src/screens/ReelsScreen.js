import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, Dimensions, FlatList,
  TouchableOpacity, Image, ActivityIndicator, StatusBar, Animated,
  RefreshControl, Share
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { usePlayer } from '../context/PlayerContext';
import { getAppleTrendingVideos, searchSaavn } from '../services/ApiService';
import Skeleton from '../components/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height: windowHeight } = Dimensions.get('window');
const screenHeight = Dimensions.get('screen').height;

function ReelItem({ video, isActive, isMuted, toggleMute, containerHeight }) {
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState(null);
  const [error, setError] = useState(false);
  const [paused, setPaused] = useState(false);
  const [localLiked, setLocalLiked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const heartAnim = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);

  const { playTrack, setIsFullPlayerVisible, toggleLike, liked } = usePlayer();

  useEffect(() => {
    if (isActive) {
      setError(false);
      setPaused(false);
      if (video.streamUrl) {
        setStreamUrl(video.streamUrl);
      } else {
        setError(true);
      }
    } else {
      setStreamUrl(null);
      setLoading(true);
      setError(false);
      setPaused(false);
    }
  }, [isActive, video.streamUrl]);

  const handlePlayFull = async () => {
    // Search Saavn for the full song and play it
    try {
      const query = `${video.title} ${video.artist}`;
      const results = await searchSaavn(query, 1);
      if (results.length > 0) {
        playTrack(results[0], results, 0);
      } else {
        // Fallback: play the preview as a snippet
        const taggedVideo = { ...video, isSnippet: false };
        playTrack(taggedVideo);
      }
    } catch (e) {
      const taggedVideo = { ...video, isSnippet: false };
      playTrack(taggedVideo);
    }
    setIsFullPlayerVisible(true);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap - like the song
      toggleLike(video);
      setShowHeart(true);
      Animated.sequence([
        Animated.spring(heartAnim, { toValue: 1.2, useNativeDriver: true, friction: 3 }),
        Animated.timing(heartAnim, { toValue: 0, duration: 500, useNativeDriver: true, delay: 400 })
      ]).start(() => setShowHeart(false));
    } else {
      // Single tap - toggle pause
      setPaused(!paused);
    }
    lastTap.current = now;
  };

  return (
    <View style={[styles.reelContainer, { height: containerHeight }]}>
      <TouchableOpacity 
        activeOpacity={1} 
        style={StyleSheet.absoluteFill} 
        onPress={handleDoubleTap}
      >
        {isActive && streamUrl && !error ? (
          <Video
            source={{ uri: streamUrl }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isActive && !paused}
            isLooping={false} // Disable looping to support auto-scroll
            isMuted={isMuted}
            onLoadStart={() => setLoading(true)}
            onLoad={() => setLoading(false)}
            onPlaybackStatusUpdate={(status) => {
              if (status.didJustFinish) {
                // Trigger auto-scroll to next reel
                video.onFinish?.();
              }
            }}
            onError={(e) => {
              console.log('Video Playback Error:', e);
              setError(true);
              setLoading(false);
            }}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Image source={{ uri: video.artwork || 'https://api.dicebear.com/7.x/initials/svg?seed=' + (video.title || 'Video') }} style={styles.video} blurRadius={20} />
            {error && isActive && (
              <View style={styles.errorOverlay}>
                <Ionicons name="alert-circle" size={50} color="rgba(255,255,255,0.5)" />
                <Text style={styles.errorText}>Video unavailable. Try another one.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => video.onFinish?.()}>
                  <Text style={styles.retryText}>Next Video</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {loading && isActive && !error && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="white" />
          </View>
        )}

        {paused && isActive && !loading && !error && (
          <View style={styles.loader}>
            <Ionicons name="play" size={60} color="rgba(255,255,255,0.5)" />
          </View>
        )}

        {showHeart && (
          <Animated.View style={[styles.heartOverlay, { transform: [{ scale: heartAnim }] }]}>
            <Ionicons name="heart" size={100} color="white" />
          </Animated.View>
        )}
      </TouchableOpacity>

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.overlay}>
        <View style={styles.bottomInfo}>
          <View style={styles.textRow}>
            <Image source={{ uri: video.artwork || 'https://api.dicebear.com/7.x/initials/svg?seed=' + (video.title || 'Video') }} style={styles.miniArt} />
            <View style={{ flex: 1 }}>
              <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
              <Text style={styles.videoArtist} numberOfLines={1}>{video.artist}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.playFullBtn} onPress={handlePlayFull}>
            <Ionicons name="musical-notes" size={20} color="black" />
            <Text style={styles.playFullText}>Play Full Song</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleMute}>
          <View style={styles.actionCircle}>
            <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(video)}>
          <Ionicons name={liked.has(String(video.id)) ? "heart" : "heart-outline"} size={36} color={liked.has(String(video.id)) ? "#FF2D55" : "white"} />
          <Text style={styles.actionText}>{liked.has(String(video.id)) ? 'Liked' : 'Like'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Share.share({ message: `${video.title} by ${video.artist} - Discovered on K-ECHO!` })}>
          <Ionicons name="share-social" size={36} color="white" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Global cache to prevent repeats during a session
const seenVideoIds = new Set();

export default function ReelsScreen({ navigation, route }) {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [listHeight, setListHeight] = useState(screenHeight); 
  const flatListRef = useRef(null);
  const reelsRef = useRef([]); // Track reels for filtering without triggering dependency re-runs
  const { setIsMiniPlayerVisible, pauseTrack } = usePlayer();
  const isFocused = useIsFocused();

  const initialVideo = route.params?.video;
  const initialList = route.params?.list;

  const fetchReels = useCallback(async (isRefresh = false, isAppend = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!isAppend && reelsRef.current.length === 0) setLoading(true);
    
    try {
      // Handle initial video if passed from Explore
      if (!isAppend && initialVideo && reelsRef.current.length === 0) {
        let combined = [initialVideo];
        if (initialList && initialList.length > 0) {
          const others = initialList.filter(v => v.id !== initialVideo.id);
          combined = [initialVideo, ...others];
        }
        reelsRef.current = combined;
        setReels(combined);
        setLoading(false);
        return;
      }

      // 1. Instant Load from Local Cache (for zero-wait)
      if (!isAppend && reelsRef.current.length === 0) {
        const cached = await AsyncStorage.getItem('@reels_apple_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.length > 0) {
            reelsRef.current = parsed;
            setReels(parsed);
            setLoading(false);
          }
        }
      }

      // 2. Fetch Apple-Only Content (High variety, Low data)
      let pool = [];
      let retries = 0;
      const batchSize = 30;

      while (pool.length < 15 && retries < 4) {
        const rawPool = await getAppleTrendingVideos(batchSize);
        if (!rawPool || rawPool.length === 0) break;

        const currentIds = new Set(reelsRef.current.map(r => r.id));
        const fresh = rawPool.filter(v => !seenVideoIds.has(v.id) && !currentIds.has(v.id));
        
        if (fresh.length > 0) {
          pool = [...pool, ...fresh];
        }
        retries++;
        if (pool.length >= 15) break;
      }

      if (pool.length === 0) {
        // Fallback to general Apple trending
        pool = await getAppleTrendingVideos(batchSize);
      }

      if (pool.length === 0) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const finalBatch = pool.map(value => {
        seenVideoIds.add(value.id);
        return value;
      });
          
      if (isAppend) {
        reelsRef.current = [...reelsRef.current, ...finalBatch];
        setReels(prev => [...prev, ...finalBatch]);
      } else {
        reelsRef.current = finalBatch;
        setReels(finalBatch);
        AsyncStorage.setItem('@reels_apple_cache', JSON.stringify(finalBatch.slice(0, 20)));
        
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
          setActiveIndex(0);
        }, 100);
      }
    } catch (e) {
      console.error('Fetch Reels Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [initialVideo, initialList]);

  useEffect(() => {
    if (isFocused) {
      setIsMiniPlayerVisible(false);
      pauseTrack(); 
      
      // If we are coming back to the screen without a specific initial video,
      // and we have no reels yet, fetch fresh ones.
      if (!initialVideo && reelsRef.current.length === 0) {
        seenVideoIds.clear(); 
        fetchReels();
      } else if (!initialVideo) {
        // Already have reels, but maybe we want to refresh in background?
        // Let's just fetch if we are low on reels
        if (reelsRef.current.length < 5) fetchReels();
      } else {
        // Initial video passed
        fetchReels();
      }
    }
    return () => setIsMiniPlayerVisible(true);
  }, [isFocused, fetchReels, setIsMiniPlayerVisible, pauseTrack, initialVideo]);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      setActiveIndex(index);
      
      // Early pre-fetch: If we are in the last 4 items, fetch more
      if (index >= reels.length - 4 && reels.length > 0 && !loading && !refreshing) {
        fetchReels(false, true);
      }
    }
  }).current;

  const scrollToNext = useCallback(() => {
    if (activeIndex < reels.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    }
  }, [activeIndex, reels.length]);

  if (loading && !refreshing && reels.length === 0) {
    return (
      <View style={styles.container}>
        <Skeleton width={width} height={screenHeight} />
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={(e) => {
      const { height: layoutHeight } = e.nativeEvent.layout;
      if (layoutHeight > 0) {
        setListHeight(layoutHeight);
      }
    }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <FlatList
        ref={flatListRef}
        data={reels}
        pagingEnabled
        vertical
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => `reel_${item.id}_${index}`}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        snapToInterval={listHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        removeClippedSubviews={true}
        // Triple-Redundancy for Infinite Scroll
        onEndReached={() => fetchReels(false, true)}
        onEndReachedThreshold={4}
        onMomentumScrollEnd={(e) => {
          // Manual scroll end detection as a third backup
          const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
          const isNearEnd = contentOffset.y + layoutMeasurement.height >= contentSize.height - (listHeight * 3);
          if (isNearEnd && !loading && !refreshing) {
            fetchReels(false, true);
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchReels(true)}
            tintColor="white"
            colors={['white']}
            progressViewOffset={50}
          />
        }
        getItemLayout={(data, index) => ({
          length: listHeight,
          offset: listHeight * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <ReelItem 
            video={{ ...item, onFinish: scrollToNext }} 
            isActive={index === activeIndex} 
            isMuted={isMuted}
            toggleMute={() => setIsMuted(!isMuted)}
            containerHeight={listHeight}
          />
        )}
      />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={32} color="white" />
      </TouchableOpacity>

      <View style={styles.headerTitle}>
        <Text style={styles.headerText}>Visual Hub</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  reelContainer: { width, overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  placeholderContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#050505' },
  errorOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  errorText: { color: 'white', marginTop: 15, fontSize: 14, opacity: 0.7, fontWeight: '600' },
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  overlay: { ...StyleSheet.absoluteFillObject, padding: 20, justifyContent: 'flex-end' },
  bottomInfo: { marginBottom: 100, gap: 15 }, // Raised significantly
  textRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniArt: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: 'white' },
  videoTitle: { color: 'white', fontSize: 20, fontWeight: '900', textShadowColor: 'black', textShadowRadius: 10 },
  videoArtist: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '700' },
  playFullBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 8, 
    backgroundColor: 'white', alignSelf: 'flex-start',
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 30
  },
  playFullText: { color: 'black', fontWeight: '800', fontSize: 15 },
  rightActions: { position: 'absolute', right: 15, bottom: 160, alignItems: 'center', gap: 24 },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  actionText: { color: 'white', fontSize: 13, fontWeight: '800', textShadowColor: 'black', textShadowRadius: 4 },
  backBtn: { position: 'absolute', top: 50, left: 16, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25 },
  headerTitle: { position: 'absolute', top: 58, width: '100%', alignItems: 'center', pointerEvents: 'none' },
  headerText: { color: 'white', fontSize: 17, fontWeight: '900', opacity: 0.8, letterSpacing: 1 },
  heartOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  retryBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, borderWidth: 1, borderColor: 'white' },
  retryText: { color: 'white', fontWeight: 'bold' },
});
