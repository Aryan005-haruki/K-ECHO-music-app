import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Image, ActivityIndicator, Animated, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { COLORS } from '../data/musicData';
import { usePlayer } from '../context/PlayerContext';
import { 
  getTrendingTracks, searchPlaylists, searchSaavn, searchYouTube, getTrendingIndia, 
  getGlobalTopHits, getNewReleases, getArtistSpotlight 
} from '../services/ApiService';
import Skeleton from '../components/Skeleton';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const FEATURED_PLAYLISTS = [
  { query: 'chill lofi hindi', label: 'Lo-Fi Chill', gradient: ['#1a1a2e', '#16213e', '#0f3460'], icon: '☕' },
  { query: 'workout gym hits', label: 'Workout Beast', gradient: ['#2d1b4e', '#4a1942', '#8b0000'], icon: '💪' },
  { query: 'romantic bollywood', label: 'Love Vibes', gradient: ['#2e0a1e', '#5c1033', '#8b0038'], icon: '💕' },
  { query: 'party dance hits', label: 'Party Mode', gradient: ['#0d2233', '#0a3d62', '#006994'], icon: '🎉' },
];

const ERA_NOSTALGIA = [
  { query: '90s bollywood hits', label: '90s Gold', icon: '📻', gradient: ['#434343', '#000000'] },
  { query: '2000s bollywood pop', label: '2000s Hits', icon: '📺', gradient: ['#2193b0', '#6dd5ed'] },
  { query: 'indie pop 90s', label: 'Indie Retro', icon: '🎸', gradient: ['#ee9ca7', '#ffdde1'] },
];

function TrackRow({ track, index, onPress, currentTrack, isPlaying }) {
  const isActive = currentTrack?.id === track.id;
  return (
    <TouchableOpacity style={[styles.chartRow, isActive && styles.chartRowActive]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.chartNumBox}>
        <Text style={[styles.chartNum, index < 3 && styles.chartNumTop]}>{index + 1}</Text>
      </View>
      <Image source={{ uri: track.artwork }} style={styles.chartArt} />
      <View style={styles.chartInfo}>
        <Text style={[styles.chartTitle, isActive && { color: COLORS.primary }]} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.chartArtist} numberOfLines={1}>{track.artist}</Text>
      </View>
      {isActive && isPlaying && <Ionicons name="stats-chart" size={16} color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

const seenSampleIds = new Set();

export default function ExploreScreen({ navigation }) {
  const [samples, setSamples] = useState([]);
  const [featuredData, setFeaturedData] = useState([]);
  const [globalHits, setGlobalHits] = useState([]);
  const [newRadar, setNewRadar] = useState([]);
  const [spotlight, setSpotlight] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { playTrack, playSnippet, currentTrack, isPlaying } = usePlayer();
  const scrollY = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  const refreshSamples = useCallback(async () => {
    try {
      const trendingRes = await getTrendingIndia(50);
      if (trendingRes && trendingRes.length > 0) {
        const freshSamples = trendingRes.filter(s => !seenSampleIds.has(s.id));
        const pool = freshSamples.length >= 10 ? freshSamples : trendingRes;
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const finalSamples = shuffled.slice(0, 10);
        finalSamples.forEach(s => seenSampleIds.add(s.id));
        setSamples(finalSamples);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (isFocused) refreshSamples();
  }, [isFocused, refreshSamples]);

  useEffect(() => {
    async function loadInitial() {
      setIsLoading(true);
      try {
        const [globalRes, newRes, spotlightRes] = await Promise.allSettled([
          getGlobalTopHits(6),
          getNewReleases(6),
          getArtistSpotlight()
        ]);

        if (globalRes.status === 'fulfilled') setGlobalHits(globalRes.value);
        if (newRes.status === 'fulfilled') setNewRadar(newRes.value);
        if (spotlightRes.status === 'fulfilled') setSpotlight(spotlightRes.value);

        const featPromises = FEATURED_PLAYLISTS.map(fp => searchPlaylists(fp.query, 1));
        const featResults = await Promise.allSettled(featPromises);
        setFeaturedData(featResults.map((r, i) => ({
          ...FEATURED_PLAYLISTS[i],
          playlist: r.status === 'fulfilled' && r.value[0] ? r.value[0] : null,
        })));
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }
    loadInitial();
  }, []);

  const handlePlay = (track, list) => {
    if (!track || !list || list.length === 0) return;
    const cleanList = (list || []).filter(t => t && t.id && t.title);
    if (cleanList.length === 0) return;
    const idx = cleanList.findIndex(t => t.id === track.id);
    const taggedTrack = { ...track, isSnippet: true };
    playTrack(taggedTrack, cleanList.map(t => ({ ...t, isSnippet: true })), idx >= 0 ? idx : 0);
  };

  const handleFeaturedPress = (item) => {
    if (item && item.playlist) {
      navigation.navigate('PlaylistDetail', { playlist: item.playlist });
    } else if (item.query) {
      navigation.navigate('GenreDetail', { genre: item.label, query: item.query });
    }
  };

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#0f0f0f', '#000000']} 
        style={StyleSheet.absoluteFill} 
        start={{x: 0.5, y: 0}} 
        end={{x: 0.5, y: 1}} 
      />
      
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
          <Text style={styles.stickyTitle}>Explore</Text>
        </Animated.View>

        <Animated.ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Explore</Text>
              <Text style={styles.sub}>Discover what's trending 🌟</Text>
            </View>
            <TouchableOpacity style={styles.castBtn}>
              <Ionicons name="radio-outline" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          {/* ── ARTIST SPOTLIGHT ── */}
          {!isLoading && spotlight && (
            <TouchableOpacity 
              style={styles.spotlightCard} 
              onPress={() => {
                if (spotlight?.tracks?.length > 0) {
                  handlePlay(spotlight.tracks[0], spotlight.tracks);
                }
              }}
              activeOpacity={0.9}
            >
              <Image source={{ uri: spotlight.banner }} style={styles.spotlightImage} />
              <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)']} style={styles.spotlightOverlay}>
                <View style={styles.spotlightTopRow}>
                  <View style={styles.spotlightBadge}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.spotlightBadgeText}>TRENDING SPOTLIGHT</Text>
                  </View>
                  <View style={styles.spotlightStat}>
                    <Ionicons name="stats-chart" size={12} color="#1DB954" />
                    <Text style={styles.spotlightStatText}>TOP 1%</Text>
                  </View>
                </View>
                
                <View style={styles.spotlightInfo}>
                  <Text style={styles.spotlightName}>{spotlight.artist}</Text>
                  <Text style={styles.spotlightSub}>{spotlight.tracks.length}+ Trending hits available now</Text>
                </View>

                <View style={styles.spotlightActionRow}>
                  <View style={styles.spotlightPlayBtn}>
                    <Ionicons name="play" size={20} color="black" />
                    <Text style={styles.spotlightPlayText}>Play Hits</Text>
                  </View>
                  <View style={styles.spotlightFollow}>
                    <Ionicons name="add" size={20} color="white" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ── QUICK SAMPLES ── */}
          <View style={[styles.sectionHeader, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View>
              <Text style={styles.sectionTitle}>🎥 Quick Samples</Text>
              <Text style={styles.sectionSub}>Swipe to discover snippets</Text>
            </View>
            <TouchableOpacity 
              style={styles.visualReelsBtn} 
              onPress={() => navigation.navigate('Reels')}
              activeOpacity={0.7}
            >
              <LinearGradient colors={['#FF0080', '#FF8C00']} style={styles.visualReelsGrad}>
                <Ionicons name="videocam" size={18} color="white" />
                <Text style={styles.visualReelsText}>Visual Hub</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sampleScroll}>
            {isLoading ? (
              [1, 2, 3].map(i => <Skeleton key={i} width={160} height={230} borderRadius={24} />)
            ) : samples.map((track, i) => (
              <TouchableOpacity key={track.id} style={styles.sampleCard} onPress={() => playSnippet(track, samples, i)} activeOpacity={0.9}>
                <Image source={{ uri: track.artwork }} style={styles.sampleArt} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.sampleOverlay}>
                  <View style={styles.samplePlayBtn}>
                    <Ionicons name={currentTrack?.id === track.id && isPlaying ? "pause" : "play"} size={28} color="white" />
                  </View>
                  <View style={styles.sampleInfo}>
                    <Text style={styles.sampleTitle} numberOfLines={1}>{track.title}</Text>
                    <Text style={styles.sampleArtist} numberOfLines={1}>{track.artist}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── GLOBAL TRENDING ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🌍 Global Trending</Text>
            <Text style={styles.sectionSub}>What's playing around the world</Text>
          </View>
          <View style={styles.globalList}>
            {isLoading ? [1,2,3].map(i => <Skeleton key={i} height={64} borderRadius={16} style={{ marginBottom: 12 }} />) :
              globalHits.map((track, i) => (
                <TrackRow key={track.id} track={track} index={i} onPress={() => handlePlay(track, globalHits)} currentTrack={currentTrack} isPlaying={isPlaying} />
              ))
            }
          </View>

          {/* ── ERA NOSTALGIA ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⏳ Time Machine</Text>
            <Text style={styles.sectionSub}>Relive the golden eras</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eraScroll}>
            {ERA_NOSTALGIA.map((era, i) => (
              <TouchableOpacity key={i} style={styles.eraCard} onPress={() => handleFeaturedPress(era)} activeOpacity={0.8}>
                <LinearGradient colors={era.gradient} style={styles.eraGrad}>
                  <Text style={styles.eraIcon}>{era.icon}</Text>
                  <Text style={styles.eraLabel}>{era.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── RELEASE RADAR ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🚀 Release Radar</Text>
            <Text style={styles.sectionSub}>Absolute latest hits of 2026</Text>
          </View>
          <View style={styles.radarGrid}>
            {isLoading ? [1,2,3,4].map(i => <Skeleton key={i} width={width/2 - 22} height={width/2 - 22} borderRadius={18} />) :
              newRadar.map(track => (
                <TouchableOpacity key={track.id} style={styles.radarCard} onPress={() => handlePlay(track, newRadar)}>
                  <Image source={{ uri: track.artwork }} style={styles.radarArt} />
                  <Text style={styles.radarTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.radarArtist} numberOfLines={1}>{track.artist}</Text>
                </TouchableOpacity>
              ))
            }
          </View>

          {/* ── CURATED FOR YOU ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎧 Curated For You</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featScroll}>
            {FEATURED_PLAYLISTS.map((fp, i) => (
              <TouchableOpacity key={i} style={styles.featCard} onPress={() => handleFeaturedPress(featuredData[i] || fp)} activeOpacity={0.85}>
                <LinearGradient colors={fp.gradient} style={styles.featGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.featIcon}>{fp.icon}</Text>
                  <View style={styles.featBottom}>
                    <Text style={styles.featLabel}>{fp.label}</Text>
                    <Text style={styles.featSub}>Premium Playlist</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ height: 140 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 99,
    backgroundColor: 'rgba(10,10,10,0.95)', paddingTop: 54, paddingBottom: 10, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  stickyTitle: { color: 'white', fontSize: 17, fontWeight: '800' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
  },
  title: { color: 'white', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  sub:   { color: '#888', fontSize: 14, marginTop: 4, fontWeight: '500' },
  castBtn: { padding: 4 },

  // Spotlight
  spotlightCard: { marginHorizontal: 20, height: 280, borderRadius: 32, overflow: 'hidden', marginTop: 15, backgroundColor: '#111', elevation: 12 },
  spotlightImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  spotlightOverlay: { ...StyleSheet.absoluteFillObject, padding: 24, justifyContent: 'space-between' },
  spotlightTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spotlightBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, gap: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF0080' },
  spotlightBadgeText: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  spotlightStat: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  spotlightStatText: { color: '#1DB954', fontSize: 11, fontWeight: '800' },
  spotlightInfo: { marginTop: 'auto', marginBottom: 20 },
  spotlightName: { color: 'white', fontSize: 42, fontWeight: '900', letterSpacing: -1.5 },
  spotlightSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600' },
  spotlightActionRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  spotlightPlayBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 32, gap: 10, elevation: 6 },
  spotlightPlayText: { color: 'black', fontWeight: '900', fontSize: 16 },
  spotlightFollow: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },

  sectionHeader: { paddingHorizontal: 24, marginTop: 36, marginBottom: 16 },
  sectionTitle: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  sectionSub: { color: '#888', fontSize: 13, marginTop: 4, fontWeight: '500' },

  // Samples
  sampleScroll: { paddingHorizontal: 20, gap: 16 },
  sampleCard: { width: 160, height: 230, borderRadius: 24, overflow: 'hidden', backgroundColor: '#111', elevation: 8 },
  sampleArt: { ...StyleSheet.absoluteFillObject, width: 160, height: 230 },
  sampleOverlay: { ...StyleSheet.absoluteFillObject, padding: 18, justifyContent: 'flex-end' },
  samplePlayBtn: { 
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.3)', 
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 'auto', marginTop: '30%',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)'
  },
  sampleInfo: { marginTop: 12 },
  sampleTitle: { color: 'white', fontSize: 15, fontWeight: '800' },
  sampleArtist: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 3 },

  visualReelsBtn: { borderRadius: 14, overflow: 'hidden' },
  visualReelsGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  visualReelsText: { color: 'white', fontSize: 14, fontWeight: '800' },

  // Global List
  globalList: { paddingHorizontal: 20 },
  chartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 16, gap: 14 },
  chartRowActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  chartNumBox: { width: 28, alignItems: 'center' },
  chartNum: { color: '#666', fontSize: 15, fontWeight: '800' },
  chartNumTop: { color: '#1DB954' },
  chartArt: { width: 48, height: 48, borderRadius: 8 },
  chartInfo: { flex: 1 },
  chartTitle: { color: 'white', fontSize: 15, fontWeight: '700' },
  chartArtist: { color: '#888', fontSize: 13, marginTop: 3 },

  // Era Scroll
  eraScroll: { paddingHorizontal: 20, gap: 16 },
  eraCard: { width: 140, height: 140, borderRadius: 20, overflow: 'hidden', elevation: 10 },
  eraGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  eraIcon: { fontSize: 36, marginBottom: 12 },
  eraLabel: { color: 'white', fontSize: 15, fontWeight: '900' },

  // Radar Grid
  radarGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 18, gap: 14 },
  radarCard: { width: width / 2 - 25, marginBottom: 18 },
  radarArt: { width: '100%', height: width / 2 - 25, borderRadius: 18, backgroundColor: '#111', elevation: 5 },
  radarTitle: { color: 'white', fontSize: 14, fontWeight: '800', marginTop: 10 },
  radarArtist: { color: '#888', fontSize: 12, marginTop: 4 },

  featScroll: { paddingHorizontal: 20, gap: 16 },
  featCard: { width: 170, height: 210, borderRadius: 22, overflow: 'hidden', elevation: 10 },
  featGrad: { flex: 1, padding: 20, justifyContent: 'space-between' },
  featIcon: { fontSize: 44 },
  featBottom: {},
  featLabel: { color: 'white', fontSize: 18, fontWeight: '900' },
  featSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 },
});
