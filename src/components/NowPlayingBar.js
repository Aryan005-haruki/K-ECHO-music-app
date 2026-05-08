import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, PanResponder, Animated, Dimensions } from 'react-native';
import { useProgress } from 'react-native-track-player';
import { usePlayer } from '../context/PlayerContext';
import { COLORS } from '../data/musicData';
import { useState, useRef, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function NowPlayingBar() {
  const { 
    currentTrack, isPlaying, liked, togglePlay, toggleLike, 
    isLoading, error, playNext, playPrev,
    isFullPlayerVisible, setIsFullPlayerVisible,
    isMiniPlayerVisible
  } = usePlayer();
  const { position, duration } = useProgress(500);

  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 10 || Math.abs(gestureState.dx) > 15;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy < 0) {
        // Dragging up to open full player
        translateY.setValue(gestureState.dy * 0.5);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy < -60 || gestureState.vy < -0.5) {
        setIsFullPlayerVisible(true);
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      } else if (gestureState.dx > 60) {
        playPrev();
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      } else if (gestureState.dx < -60) {
        playNext();
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  }), [setIsFullPlayerVisible, playNext, playPrev]);

  if (!currentTrack || !isMiniPlayerVisible) return null;

  const pct = duration > 0 ? Math.min(Math.max((position / duration) * 100, 0), 100) : 0;

  return (
    <Animated.View 
      style={[styles.container, { transform: [{ translateY }] }]} 
      {...panResponder.panHandlers}
    >
      <TouchableOpacity 
        style={styles.touchArea} 
        activeOpacity={0.9} 
        onPress={() => setIsFullPlayerVisible(true)}
      >
        <LinearGradient 
          colors={['#1a1a2e', '#111118']} 
          style={styles.background} 
          start={{x: 0, y: 0}} 
          end={{x: 1, y: 0}} 
        />
        
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
        </View>

        <View style={styles.contentRow}>
          <View style={styles.artworkContainer}>
            {currentTrack.artwork ? (
              <Image source={{ uri: currentTrack.artwork }} style={styles.artwork} />
            ) : (
              <View style={styles.artworkPlaceholder}>
                <Ionicons name="musical-note" size={20} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="white" />
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={[styles.artist, error && { color: '#ff2d55' }]} numberOfLines={1}>
              {error || currentTrack.artist}
            </Text>
          </View>

          <View style={styles.controlsContainer}>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); toggleLike(currentTrack); }} style={styles.controlBtn}>
              <Ionicons 
                name={liked.has(String(currentTrack.id)) ? "heart" : "heart-outline"} 
                size={24} 
                color={liked.has(String(currentTrack.id)) ? "#ff2d55" : "rgba(255,255,255,0.6)"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); togglePlay(); }} style={styles.playBtn} disabled={isLoading && !isPlaying}>
              {isLoading && !isPlaying ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { 
    position: 'absolute', 
    bottom: 60, 
    left: 8, 
    right: 8, 
    zIndex: 1000,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  touchArea: { 
    flex: 1, 
    height: 64,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  progressBarContainer: { 
    height: 2, 
    width: '100%', 
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressBarFill: { 
    height: '100%', 
    backgroundColor: '#1DB954',
  },
  contentRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 10,
    flex: 1,
  },
  artworkContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: 6, 
    overflow: 'hidden',
  },
  artwork: { 
    width: 44, 
    height: 44,
  },
  artworkPlaceholder: { 
    width: 44, 
    height: 44, 
    backgroundColor: '#222', 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  loadingOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  infoContainer: { 
    flex: 1, 
    marginLeft: 12,
  },
  title: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: '700',
  },
  artist: { 
    color: 'rgba(255,255,255,0.5)', 
    fontSize: 12, 
    marginTop: 2,
  },
  controlsContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 12,
  },
  controlBtn: { 
    padding: 4,
  },
  playBtn: { 
    width: 32, 
    height: 32, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
});