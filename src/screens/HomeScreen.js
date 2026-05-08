import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Animated, Dimensions, StatusBar,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { 
  getTrendingIndia, 
  getGlobalTopHits, 
  getNewReleases, 
  getRadioSuggestions,
  searchSaavn
} from '../services/ApiService';
import { COLORS } from '../data/musicData';
import Skeleton from '../components/Skeleton';

const { width } = Dimensions.get('window');

const CATEGORIES = ['All', 'Music', 'Podcasts', 'Romance', 'Relax', 'Feel good', 'Party'];

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const SpeedDialCarousel = ({ data, loading, onPlay }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (loading || data.length === 0) {
    return (
      <View style={{height: 350, paddingHorizontal: 16}}>
        <Skeleton height={320} borderRadius={16} />
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={data}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item: slide }) => (
          <View style={{ width: width, paddingHorizontal: 16 }}>
            <View style={styles.sdGrid}>
              {(slide || []).filter(Boolean).map(track => (
                <TouchableOpacity key={track.id} style={styles.sdTile} onPress={() => onPlay(track)} activeOpacity={0.7}>
                  <Image 
                    source={{ uri: track.artwork || track.image || 'https://api.dicebear.com/7.x/initials/svg?seed=' + track.title }} 
                    style={styles.sdArt} 
                  />
                  <Text style={styles.sdLabel} numberOfLines={1}>{track.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      />
      <View style={styles.dotsContainer}>
        {data.map((_, i) => (
          <View key={i} style={[styles.dot, activeIndex === i && styles.activeDot]} />
        ))}
      </View>
    </View>
  );
};

const QuickPicksCarousel = ({ data, loading, onPlay }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (loading || data.length === 0) {
    return <View style={{paddingHorizontal: 16}}><Skeleton height={200} borderRadius={16} /></View>;
  }

  return (
    <View>
      <FlatList
        data={data}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item: slide }) => (
          <View style={{ width: width, paddingHorizontal: 16 }}>
            {(slide || []).filter(Boolean).map(track => (
              <TouchableOpacity key={track.id} style={styles.qpRow} onPress={() => onPlay(track)} activeOpacity={0.7}>
                <Image 
                  source={{ uri: track.artwork || track.image || 'https://api.dicebear.com/7.x/initials/svg?seed=' + track.title }} 
                  style={styles.qpArt} 
                />
                <View style={styles.qpInfo}>
                  <Text style={styles.qpTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.qpArtist} numberOfLines={1}>{track.artist} • Pulse Mix</Text>
                </View>
                <TouchableOpacity style={styles.moreBtn}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#777" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
      <View style={styles.dotsContainer}>
        {data.map((_, i) => (
          <View key={i} style={[styles.dot, activeIndex === i && styles.activeDot]} />
        ))}
      </View>
    </View>
  );
};

export default function HomeScreen({ navigation }) {
  const { 
    playTrack, 
    currentTrack, 
    isPlaying, 
    liked, 
    recentlyPlayed, 
    setQueue, 
    feedback, 
    likedTracks, 
    onboardingData, 
    resetUserExperience 
  } = usePlayer();
  
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [speedDial, setSpeedDial] = useState([]);
  const [quickPicks, setQuickPicks] = useState([]);
  const [popularRadio, setPopularRadio] = useState([]);
  const [moreLikeThis, setMoreLikeThis] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  
  const scrollY = useRef(new Animated.Value(0)).current;


  useEffect(() => {
    if (activeCategory === 'All') {
      loadAllData();
    } else {
      loadCategoryData(activeCategory);
    }
  }, [activeCategory]);

  const loadCategoryData = async (category) => {
    setLoading(true);
    try {
      const categoryQueries = {
        'Music': 'hindi top songs 2024 hits',
        'Podcasts': 'popular podcasts hindi english 2024',
        'Romance': 'romantic bollywood love hits',
        'Relax': 'chill lofi hindi study relax',
        'Feel good': 'upbeat hindi happy songs',
        'Party': 'bollywood dance party hits 2024'
      };
      const query = categoryQueries[category] || `${category} songs hits`;
      const allResults = await searchSaavn(query, 50);
      const results = allResults.filter(t => !t.isSnippet);
      
      // Update Speed Dial
      const sdSlides = [];
      const pool = results.slice(0, 27);
      for (let i = 0; i < pool.length; i += 9) sdSlides.push(pool.slice(i, i + 9));
      setSpeedDial(sdSlides);

      // Update Quick Picks
      const qpSlides = [];
      const qpPool = results.slice(10, 26);
      for (let i = 0; i < qpPool.length; i += 4) qpSlides.push(qpPool.slice(i, i + 4));
      setQuickPicks(qpSlides);

      setMoreLikeThis(results.slice(0, 15));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── RANKING ALGORITHM ─────────────────────────────────────────────────────
  const rankSongs = (pool, feedbackData, likedSet) => {
    return (pool || []).filter(Boolean).map(track => {
      let score = 0;
      const tid = String(track.id);

      // 1. Onboarding Signals (Strongest for New Users)
      if (onboardingData.artists.some(a => track.artist?.includes(a))) score += 15;
      if (onboardingData.genres.some(g => track.genre?.includes(g))) score += 8;
      // Mood mapping (simplified)
      if (onboardingData.moods.length > 0) score += 2; 

      // 2. Positive Signals (History)
      if (likedSet.has(tid)) score += 12;
      if (feedbackData.plays[tid]) score += feedbackData.plays[tid] * 3;
      if (feedbackData.repeats[tid]) score += feedbackData.repeats[tid] * 6;

      // 3. Negative Signals
      if (feedbackData.skips[tid]) score -= feedbackData.skips[tid] * 10;

      // 4. Contextual Similarity
      const recentArtists = (recentlyPlayed || []).filter(Boolean).slice(0, 5).map(t => t.artist);
      if (recentArtists.includes(track.artist)) score += 7;
      
      const lastPlayed = (recentlyPlayed || []).filter(Boolean)[0];
      if (lastPlayed) {
        if (track.genre === lastPlayed.genre) score += 4;
      }

      // 5. Freshness & Popularity
      if (track.releaseDate && new Date(track.releaseDate) > new Date('2024-01-01')) {
        score += 3;
      }

      return { ...track, score };
    }).sort((a, b) => b.score - a.score);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const isNewUser = recentlyPlayed.length === 0;

      const [trendingRaw, globalRaw, releasesRaw] = await Promise.all([
        getTrendingIndia(50),
        getGlobalTopHits(40),
        getNewReleases(40)
      ]);

      // Filter to ensure NO snippets/explore data
      const trending = trendingRaw.filter(t => !t.isSnippet);
      const global = globalRaw.filter(t => !t.isSnippet);
      const releases = releasesRaw.filter(t => !t.isSnippet);
      const cleanHistory = recentlyPlayed.filter(t => !t.isSnippet);

      // 1. SPEED DIAL (3 Slides = 27 Tracks)
      let sdPool = [];
      if (isNewUser) {
        // Mode: Cold Start - Mix onboarding artists with trending
        const onboardingArtists = onboardingData.artists.slice(0, 5);
        if (onboardingArtists.length) {
          const artistSearch = await Promise.all(onboardingArtists.map(a => searchSaavn(a, 6)));
          sdPool = rankSongs([...artistSearch.flat(), ...trending], feedback, liked).slice(0, 27);
        } else {
          sdPool = trending.slice(0, 27);
        }
      } else {
        // Mode: Personalized - Recents, Repeats, and Liked
        sdPool = rankSongs([...cleanHistory, ...trending, ...global], feedback, liked).slice(0, 27);
      }
      
      // Filter invalid, then pad if needed (dedupe via id tracking)
      sdPool = sdPool.filter(t => t && t.id && t.title);
      if (trending.length > 0) {
        const usedIds = new Set(sdPool.map(t => t.id));
        const padding = trending.filter(t => t && t.id && !usedIds.has(t.id));
        let pi = 0;
        while (sdPool.length < 27 && pi < padding.length) {
          sdPool.push(padding[pi++]);
        }
        // If still short, allow repeats
        while (sdPool.length < 27 && trending.length > 0) {
          sdPool.push(trending[Math.floor(Math.random() * trending.length)]);
        }
      }
      
      const sdSlides = [];
      for (let i = 0; i < sdPool.length; i += 9) sdSlides.push(sdPool.slice(i, i + 9));
      setSpeedDial(sdSlides);

      // 2. QUICK PLAY (4 Slides = 16 Tracks)
      let qpPool = [];
      if (isNewUser) {
        // Curated based on genres selected
        if (onboardingData.genres.length) {
          const genreSearch = await searchSaavn(onboardingData.genres[0], 20);
          qpPool = rankSongs([...genreSearch, ...global], feedback, liked).slice(0, 16);
        } else {
          qpPool = global.slice(0, 16);
        }
      } else {
        qpPool = rankSongs([...trending, ...global, ...cleanHistory], feedback, liked).slice(10, 26);
      }
      
      // Filter invalid, then pad if needed
      qpPool = qpPool.filter(t => t && t.id && t.title);
      if (global.length > 0) {
        const usedIds = new Set(qpPool.map(t => t.id));
        const padding = global.filter(t => t && t.id && !usedIds.has(t.id));
        let pi = 0;
        while (qpPool.length < 16 && pi < padding.length) {
          qpPool.push(padding[pi++]);
        }
        while (qpPool.length < 16 && global.length > 0) {
          qpPool.push(global[Math.floor(Math.random() * global.length)]);
        }
      }

      const qpSlides = [];
      for (let i = 0; i < qpPool.length; i += 4) qpSlides.push(qpPool.slice(i, i + 4));
      setQuickPicks(qpSlides);

      // 3. MORE LIKE THIS / BECAUSE YOU SELECTED
      if (isNewUser && onboardingData.genres.length) {
        const genreSearch = await searchSaavn(onboardingData.genres[0], 15);
        setMoreLikeThis(genreSearch);
      } else {
        setMoreLikeThis(rankSongs([...global, ...trending], feedback, liked).slice(0, 15));
      }

      // 4. ALBUMS
      setNewReleases(releases.slice(0, 15));

      // 5. POPULAR RADIO
      const topArtists = [
        'Arijit Singh', 'Sidhu Moose Wala', 'Diljit Dosanjh', 'The Weeknd', 
        'KK', 'Atif Aslam', 'Badshah', 'Drake', 'Taylor Swift', 'Justin Bieber',
        'Anuv Jain', 'AP Dhillon', 'Neha Kakkar', 'Yo Yo Honey Singh'
      ];
      const radioData = await Promise.all(topArtists.map(async (name, i) => {
        try {
          const results = await searchSaavn(name, 1);
          return {
            id: String(i),
            name,
            image: results[0]?.artwork || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
            seedTrack: results[0]
          };
        } catch {
          return { id: String(i), name, image: `https://api.dicebear.com/7.x/initials/svg?seed=${name}` };
        }
      }));
      setPopularRadio(radioData);

    } catch (e) {
      console.error('Home Data Load Error:', e);
    } finally {
      setLoading(false);
    }
  };



  const startArtistRadio = async (artist) => {
    if (!artist.seedTrack) {
      const results = await searchSaavn(artist.name, 1);
      if (results.length) artist.seedTrack = results[0];
    }
    if (artist.seedTrack) {
      handlePlay(artist.seedTrack, [artist.seedTrack]);
    }
  };


  const handlePlay = async (track, list) => {
    if (!track || !list) return;
    const cleanList = (list || []).filter(t => t && t.id);
    const idx = cleanList.findIndex(t => t.id === track.id);
    // Let PlayerContext handle the dynamic AI queue injection
    playTrack(track, cleanList, idx >= 0 ? idx : 0);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const isNewUser = recentlyPlayed.length === 0;

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />
      
      {/* BACKGROUND GRADIENT */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460', '#000']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.headerContent}>
          <Text style={styles.stickyTitle}>NeonPulse</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={resetUserExperience} style={{marginRight: 15}}>
               <Ionicons name="refresh-circle" size={24} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Search')} activeOpacity={0.7}>
              <Ionicons name="search" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* TOP HEADER & CHIPS */}
        <View style={styles.topSection}>
          <View style={styles.headerRow}>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
               <TouchableOpacity style={styles.userAvatarHeader} onPress={() => navigation.navigate('Library')}>
                  <Text style={styles.avatarText}>A</Text>
               </TouchableOpacity>
               <Text style={[styles.mainGreeting, {marginLeft: 12}]}>NeonPulse</Text>
             </View>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
               <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                 <Ionicons name="search" size={26} color="white" />
               </TouchableOpacity>
             </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
            {CATEGORIES.map((cat, i) => (
              <TouchableOpacity 
                key={i} 
                style={[styles.chip, activeCategory === cat && styles.activeChip]} 
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, activeCategory === cat && styles.activeChipText]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* SPEED DIAL SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.row}>
              <View style={[styles.userAvatar, {width: 24, height: 24, marginRight: 8, backgroundColor: '#ff2d55'}]}>
                <Text style={[styles.avatarText, {fontSize: 12}]}>A</Text>
              </View>
              <View>
                <Text style={styles.sectionSub}>{isNewUser ? 'WELCOME' : 'CONTINUE LISTENING'}</Text>
                <Text style={styles.speedDialTitle}>Speed dial</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#555" />
          </View>

          <SpeedDialCarousel 
            data={speedDial} 
            loading={loading} 
            onPlay={(track) => handlePlay(track, speedDial.flat())} 
          />
        </View>

        {/* QUICK PICKS SECTION */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, {marginBottom: 10}]}>
            <View>
              <Text style={styles.sectionSub}>START RADIO</Text>
              <Text style={styles.speedDialTitle}>{isNewUser ? 'Quick Play' : 'Quick picks'}</Text>
            </View>
            <TouchableOpacity style={styles.playAllBtn} activeOpacity={0.7}>
              <Text style={styles.playAllText}>Play all</Text>
            </TouchableOpacity>
          </View>

          <QuickPicksCarousel 
            data={quickPicks} 
            loading={loading} 
            onPlay={(track) => handlePlay(track, quickPicks.flat())} 
          />
        </View>

        {/* POPULAR RADIO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular radio</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 16, gap: 16}}>
            {(popularRadio || []).filter(Boolean).map(item => (
              <TouchableOpacity key={item.id} style={styles.radioCard} onPress={() => startArtistRadio(item)} activeOpacity={0.8}>
                <View style={styles.radioArtContainer}>
                  <Image source={{ uri: item.image }} style={styles.radioArt} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.radioOverlay} />
                  <View style={styles.radioBadge}>
                    <Ionicons name="radio" size={10} color="black" />
                    <Text style={styles.radioBadgeText}>RADIO</Text>
                  </View>
                </View>
                <Text style={styles.radioName}>{item.name}</Text>
                <Text style={styles.radioSub}>Based on {item.name}</Text>
              </TouchableOpacity>
            ))}

          </ScrollView>
        </View>

        {/* MORE OF WHAT YOU LIKE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isNewUser && onboardingData.artists.length ? `Based on your artists` : 'More of what you like'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 16, gap: 16}}>
            {(moreLikeThis || []).filter(Boolean).map(track => (
              <TouchableOpacity key={track.id} style={styles.squareCard} onPress={() => handlePlay(track, moreLikeThis)} activeOpacity={0.8}>
                <Image 
                  source={{ uri: track.artwork || track.image || 'https://api.dicebear.com/7.x/initials/svg?seed=' + track.title }} 
                  style={styles.squareArt} 
                />
                <View style={styles.badgeContainer}>
                   <View style={styles.pulseMixBadge}><Text style={styles.mixText}>MIX</Text></View>
                </View>
                <Text style={styles.squareTitle} numberOfLines={1}>{track.title}</Text>
                <Text style={styles.squareSub} numberOfLines={1}>Playlist • NeonPulse</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ALBUMS FEATURING SONGS YOU LIKE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isNewUser ? 'Popular Albums' : 'Albums for you'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 16, gap: 16}}>
            {newReleases.filter(Boolean).map(track => (
              <TouchableOpacity key={track.id} style={styles.squareCard} onPress={() => handlePlay(track, newReleases)} activeOpacity={0.8}>
                <Image 
                  source={{ uri: track.artwork || track.image || 'https://api.dicebear.com/7.x/initials/svg?seed=' + track.title }} 
                  style={styles.squareArt} 
                />
                <Text style={styles.squareTitle} numberOfLines={1}>{track.title}</Text>
                <Text style={styles.squareSub} numberOfLines={1}>Album • {track.artist}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* RECOMMENDED FOR TODAY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isNewUser ? "Top Picks" : 'Recommended'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 16, gap: 20}}>
            {moreLikeThis.filter(Boolean).slice(5, 10).map(track => (
              <TouchableOpacity key={track.id} style={styles.largeCard} onPress={() => handlePlay(track, moreLikeThis)} activeOpacity={0.9}>
                <Image 
                  source={{ uri: track.artwork || track.image || 'https://api.dicebear.com/7.x/initials/svg?seed=' + track.title }} 
                  style={styles.largeArt} 
                />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.largeOverlay} />
                <View style={styles.largeInfo}>
                   <Text style={styles.largeTitle} numberOfLines={1}>{track.title}</Text>
                   <Text style={styles.largeSub} numberOfLines={1}>{track.artist}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{height: 140}} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: 'rgba(10,10,20,0.95)', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20,
    borderBottomWidth: 0.5, borderBottomColor: '#222'
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  stickyTitle: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -1 },

  topSection: { marginTop: 60, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 15 },
  mainGreeting: { color: 'white', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  premiumBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#ffd700' },
  premiumText: { color: 'black', fontSize: 10, fontWeight: '900' },

  chipContainer: { paddingHorizontal: 16, gap: 10, alignItems: 'center' },
  userAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#00bcd4', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 16, fontWeight: '900' },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  activeChip: { backgroundColor: 'white' },
  chipText: { color: '#eee', fontSize: 13, fontWeight: '700' },
  activeChipText: { color: 'black' },
  userAvatarHeader: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#00bcd4', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)'
  },

  section: { marginTop: 35 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 15 },
  sectionSub: { color: '#888', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  speedDialTitle: { color: 'white', fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  sectionTitle: { color: 'white', fontSize: 24, fontWeight: '900', paddingHorizontal: 16, marginBottom: 18, letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center' },

  sdGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sdTile: { width: (width - 52) / 3, marginBottom: 12 },
  sdArt: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#111' },
  sdLabel: { color: '#aaa', fontSize: 11, marginTop: 8, fontWeight: '600', textAlign: 'center' },
  
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 15 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  activeDot: { width: 20, backgroundColor: 'white' },

  qpRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 12 },
  qpArt: { width: 52, height: 52, borderRadius: 6 },
  qpInfo: { flex: 1, marginLeft: 14 },
  qpTitle: { color: 'white', fontSize: 15, fontWeight: '700' },
  qpArtist: { color: '#888', fontSize: 13, marginTop: 3 },
  playAllBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  playAllText: { color: 'white', fontSize: 12, fontWeight: '700' },

  squareCard: { width: 160, marginRight: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 8 },
  squareArt: { width: 144, height: 144, borderRadius: 12, backgroundColor: '#111' },
  squareTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 10, width: 140 },
  squareSub: { color: '#888', fontSize: 11, marginTop: 4, width: 140 },

  largeCard: { width: 280, height: 180, borderRadius: 20, overflow: 'hidden', position: 'relative', backgroundColor: '#111' },
  largeArt: { width: '100%', height: '100%', backgroundColor: '#111' },
  largeOverlay: { ...StyleSheet.absoluteFillObject },
  largeInfo: { position: 'absolute', bottom: 15, left: 15, right: 15 },
  largeTitle: { color: 'white', fontSize: 18, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 4 },
  largeSub: { color: '#ccc', fontSize: 13, marginTop: 4, fontWeight: '600' },

  badgeContainer: { position: 'absolute', top: 12, right: 12 },
  pulseMixBadge: { backgroundColor: '#1DB954', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  mixText: { color: 'black', fontSize: 9, fontWeight: '900' },

  radioCard: { width: 140, marginRight: 16 },
  radioArtContainer: { width: 140, height: 140, borderRadius: 70, overflow: 'hidden', position: 'relative', backgroundColor: '#111' },
  radioArt: { width: '100%', height: '100%' },
  radioOverlay: { ...StyleSheet.absoluteFillObject },
  radioName: { color: 'white', fontSize: 14, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  radioSub: { color: '#888', fontSize: 12, marginTop: 4, textAlign: 'center' },
  radioBadge: { position: 'absolute', bottom: 10, left: '50%', marginLeft: -25, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  radioBadgeText: { color: 'black', fontSize: 8, fontWeight: '900', marginLeft: 4 },
});
