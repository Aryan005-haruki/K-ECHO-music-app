import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, StatusBar,
  Image, Keyboard, ActivityIndicator, Animated, Dimensions, BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../context/PlayerContext';
import { COLORS, browseMoods, browseGenres } from '../data/musicData';
import { getSearchSuggestions, searchGlobal } from '../services/ApiService';

const { width } = Dimensions.get('window');
const HISTORY_KEY = '@search_history';

// Icon mapping for premium browse cards
const BROWSE_ICONS = {
  'Chill': 'leaf-outline', 'Commute': 'car-outline', 'Energize': 'flash-outline', 
  'Feel good': 'sunny-outline', 'Focus': 'eye-outline', 'Gaming': 'game-controller-outline',
  'Party': 'musical-notes-outline', 'Romance': 'heart-outline', 'Sad': 'cloud-outline',
  'Sleep': 'moon-outline', 'Workout': 'fitness-outline', 'Hindi': 'language-outline',
  'Punjabi': 'musical-note-outline', 'Bollywood': 'film-outline', 'Pop': 'star-outline',
  'Hip-hop': 'mic-outline', 'Lo-fi': 'cafe-outline', 'Rock': 'guitar-outline'
};

const Skeleton = ({ width, height, borderRadius, style }) => (
  <View style={[{ width, height, borderRadius, backgroundColor: '#1a1a1a' }, style]} />
);

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  
  const debounce = useRef(null);
  const { 
    playTrack, currentTrack, liked, toggleLike, toggleLikePlaylist, likedPlaylists 
  } = usePlayer();

  // Handle hardware back button for search states
  useEffect(() => {
    const backAction = () => {
      if (searched) {
        setSearched(false);
        setIsTyping(false);
        return true;
      }
      if (isTyping) {
        setIsTyping(false);
        setQuery('');
        setSuggestions([]);
        Keyboard.dismiss();
        return true; // prevent default (stay on screen)
      }
      return false; // let navigation handle it (go back to Home)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isTyping, searched]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch (e) {}
  };

  const saveToHistory = async (term) => {
    try {
      let newHist = [term, ...history.filter(t => t !== term)].slice(0, 15);
      setHistory(newHist);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHist));
    } catch (e) {}
  };

  const clearHistory = async () => {
    try {
      setHistory([]);
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (e) {}
  };

  const removeHistoryItem = async (term) => {
    try {
      const newHist = history.filter(t => t !== term);
      setHistory(newHist);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHist));
    } catch (e) {}
  };

  const fetchSuggestions = async (val) => {
    if (val.length < 2) {
      setSuggestions([]);
      return;
    }
    const sugs = await getSearchSuggestions(val);
    const completeSugs = [val, ...sugs.filter(s => s.toLowerCase() !== val.toLowerCase())].slice(0, 8);
    setSuggestions(completeSugs);
  };

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!isTyping) return;
    if (query.trim().length < 2) { setSuggestions([]); return; }

    debounce.current = setTimeout(() => { fetchSuggestions(query); }, 400);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, isTyping]);

  const handleSearchSubmit = async (term) => {
    const searchTerm = term || query;
    if (searchTerm.trim().length === 0) return;
    
    Keyboard.dismiss();
    setQuery(searchTerm);
    setIsTyping(false);
    setSearched(true);
    setIsLoading(true);
    saveToHistory(searchTerm);
    
    try {
      const res = await searchGlobal(searchTerm.trim(), 40);
      // Remove all videos/youtube items as requested
      const filtered = (res || []).filter(item => !item.isYouTube);
      setResults(filtered);
    } catch (e) {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderResults = () => {
    if (isLoading) return renderSkeletons();
    if (!results || results.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={80} color="#222" />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySub}>Try searching for something else</Text>
        </View>
      );
    }

    const getSubtitle = (track) => {
      if (track.isArtist) return 'Artist';
      if (track.isAlbum) return `Album • ${track.artist}`;
      if (track.isPlaylist) return `Playlist`;
      return `Song • ${track.artist}`;
    };

    const renderTrackRow = (track) => {
      const isPlaylistOrAlbum = track.isAlbum || track.isPlaylist;
      const isLiked = isPlaylistOrAlbum 
        ? likedPlaylists.some(p => p.id === track.id)
        : liked.has(track.id);

      return (
        <TouchableOpacity
          key={track.id}
          style={styles.trackRow}
          onPress={() => {
            if (track.isAlbum || track.isArtist || track.isPlaylist) {
              navigation.navigate('PlaylistDetail', { playlist: track });
            } else if (track && track.id && track.title) {
              playTrack(track, [track], 0);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.artContainer}>
            <Image 
              source={{ uri: track.artwork || 'https://api.dicebear.com/7.x/initials/svg?seed=' + track.title }} 
              style={[styles.trackArt, track.isArtist && { borderRadius: 30 }]} 
            />
            {currentTrack?.id === track.id && (
              <View style={[styles.activeOverlay, track.isArtist && { borderRadius: 30 }]}>
                <Ionicons name="stats-chart" size={18} color="#1DB954" />
              </View>
            )}
          </View>
          
          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, currentTrack?.id === track.id && { color: '#1DB954' }]} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {getSubtitle(track)}
            </Text>
          </View>
          
          <View style={styles.actionGroup}>
            {!track.isArtist && (
              <TouchableOpacity onPress={() => isPlaylistOrAlbum ? toggleLikePlaylist(track) : toggleLike(track)}>
                <Ionicons 
                  name={isLiked ? "heart" : "heart-outline"} 
                  size={22} 
                  color={isLiked ? "#ff2a2a" : "#666"} 
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{ marginLeft: 15 }}>
              <Ionicons name="ellipsis-vertical" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    };

    if (activeCategory === 'All') {
      const topResult = results[0];
      const otherResults = results.slice(1);
      
      const songs = otherResults.filter(r => !r.isAlbum && !r.isPlaylist && !r.isArtist).slice(0, 5);
      const artists = otherResults.filter(r => r.isArtist).slice(0, 3);
      const albums = otherResults.filter(r => r.isAlbum || r.isPlaylist).slice(0, 5);

      return (
        <View style={{ paddingHorizontal: 20, paddingBottom: 120 }}>
          <Text style={styles.sectionTitle}>Top result</Text>
          {topResult && (
            <TouchableOpacity 
              style={styles.topResultCard} 
              onPress={() => {
                if (topResult.isAlbum || topResult.isArtist || topResult.isPlaylist) {
                  navigation.navigate('PlaylistDetail', { playlist: topResult });
                } else if (topResult && topResult.id && topResult.title) {
                  playTrack(topResult, [topResult], 0);
                }
              }}
              activeOpacity={0.9}
            >
              <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.4)']} style={styles.topResultGrad}>
                <Image 
                  source={{ uri: topResult.artwork }} 
                  style={[styles.topResultArt, topResult.isArtist && { borderRadius: 60 }]} 
                />
                <View style={styles.topResultInfo}>
                  <Text style={styles.topResultTitle} numberOfLines={1}>{topResult.title}</Text>
                  <Text style={styles.topResultArtist}>{getSubtitle(topResult)}</Text>
                </View>
                <View style={styles.topResultPlay}>
                  <Ionicons name="play" size={24} color="black" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {songs.length > 0 && (
            <>
              <View style={styles.rowHeader}><Text style={styles.sectionTitle}>Songs</Text></View>
              {songs.map(renderTrackRow)}
            </>
          )}

          {artists.length > 0 && (
            <>
              <View style={styles.rowHeader}><Text style={styles.sectionTitle}>Artists</Text></View>
              {artists.map(renderTrackRow)}
            </>
          )}

          {albums.length > 0 && (
            <>
              <View style={styles.rowHeader}><Text style={styles.sectionTitle}>Albums & Playlists</Text></View>
              {albums.map(renderTrackRow)}
            </>
          )}
        </View>
      );
    }

    let filteredResults = [];
    if (activeCategory === 'Songs') filteredResults = results.filter(r => !r.isAlbum && !r.isPlaylist && !r.isArtist);
    else if (activeCategory === 'Albums') filteredResults = results.filter(r => r.isAlbum || r.isPlaylist);
    else if (activeCategory === 'Artists') filteredResults = results.filter(r => r.isArtist);
    
    return (
      <View style={{ paddingHorizontal: 20, paddingBottom: 120 }}>
        {filteredResults.map(renderTrackRow)}
      </View>
    );
  };

  const renderBrowseCard = (item) => (
    <TouchableOpacity
      key={item.label}
      style={styles.browseCard}
      onPress={() => navigation.navigate('GenreDetail', { genre: item.label })}
      activeOpacity={0.85}
    >
      <LinearGradient 
        colors={item.bgColor === '#000' ? ['#1a1a1a', '#000'] : [item.bgColor, 'rgba(0,0,0,0.8)']} 
        style={styles.browseGrad}
        start={{x:0, y:0}} end={{x:1, y:1}}
      >
        <Ionicons 
          name={BROWSE_ICONS[item.label] || 'musical-note-outline'} 
          size={24} 
          color="white" 
          style={styles.browseIcon} 
        />
        <Text style={styles.browseLabel}>{item.label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderSkeletons = () => (
    <View style={{ padding: 20 }}>
      <Skeleton width={120} height={24} borderRadius={6} style={{ marginBottom: 16 }} />
      <Skeleton width={width - 40} height={180} borderRadius={24} style={{ marginBottom: 24 }} />
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Skeleton width={60} height={60} borderRadius={12} />
          <View style={{ marginLeft: 16 }}>
            <Skeleton width={200} height={20} borderRadius={4} style={{ marginBottom: 8 }} />
            <Skeleton width={120} height={16} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f0f0f', '#000']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <View style={styles.topBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput
              style={styles.input}
              placeholder="Songs, artists, albums…"
              placeholderTextColor="#555"
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (text.trim().length > 0) setIsTyping(true);
                setSearched(false);
              }}
              onFocus={() => setIsTyping(true)}
              onSubmitEditing={() => handleSearchSubmit()}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {(query.length > 0 || isTyping) && (
              <TouchableOpacity onPress={() => { 
                setQuery(''); 
                setIsTyping(false); 
                setSearched(false); 
                setSuggestions([]); 
                Keyboard.dismiss(); 
              }}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {searched && (
          <View style={styles.chipBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
              {['All', 'Songs', 'Albums', 'Artists'].map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.chip, activeCategory === cat && styles.chipActive]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!searched && (query.length === 0) && (
            <View style={styles.browseContainer}>
              {/* Search History */}
              {history.length > 0 && (
                <View style={{ marginBottom: 28 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <Text style={styles.sectionTitleRed}>Recent Searches</Text>
                    <TouchableOpacity onPress={clearHistory}>
                      <Text style={{ color: '#888', fontSize: 13, fontWeight: '700' }}>Clear All</Text>
                    </TouchableOpacity>
                  </View>
                  {history.slice(0, 6).map((term, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={[styles.suggestionRow, { borderBottomWidth: 1, borderBottomColor: '#111', paddingVertical: 14 }]} 
                      onPress={() => handleSearchSubmit(term)}
                    >
                      <Ionicons name="time-outline" size={20} color="#555" />
                      <Text style={[styles.suggestionText, { flex: 1, marginLeft: 16 }]}>{term}</Text>
                      <TouchableOpacity onPress={() => removeHistoryItem(term)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close" size={18} color="#444" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.sectionTitleRed}>Moods & moments</Text>
              <View style={styles.browseGrid}>
                {browseMoods.map(renderBrowseCard)}
              </View>

              <Text style={[styles.sectionTitleRed, { marginTop: 32 }]}>Genres</Text>
              <View style={styles.browseGrid}>
                {browseGenres.map(renderBrowseCard)}
              </View>
            </View>
          )}

          {isTyping && query.length > 0 && (
            <View style={styles.listContainer}>
              {suggestions.map((term, i) => (
                <TouchableOpacity key={i} style={styles.suggestionRow} onPress={() => handleSearchSubmit(term)}>
                  <Ionicons name="search-outline" size={20} color="#555" />
                  <Text style={styles.suggestionText}>{term}</Text>
                  <Ionicons name="arrow-back" size={18} color="#444" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {searched && renderResults()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, paddingHorizontal: 16, height: 54,
  },
  input:  { flex: 1, color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 12 },
  
  chipBar: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  chipScroll: { paddingHorizontal: 20, gap: 10 },
  chip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#222' },
  chipActive: { backgroundColor: 'white', borderColor: 'white' },
  chipText: { color: '#888', fontSize: 14, fontWeight: '800' },
  chipTextActive: { color: 'black' },

  browseContainer: { paddingHorizontal: 20, marginTop: 24, paddingBottom: 120 },
  sectionTitleRed: { color: 'white', fontSize: 24, fontWeight: '900', marginBottom: 20, letterSpacing: -0.5 },
  browseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  browseCard: { width: (width - 52) / 2, height: 75, borderRadius: 16, overflow: 'hidden', elevation: 5 },
  browseGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  browseIcon: { opacity: 0.9 },
  browseLabel: { color: 'white', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },

  listContainer: { paddingHorizontal: 20, marginTop: 10 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#111' },
  suggestionText: { flex: 1, color: 'white', fontSize: 16, fontWeight: '500', marginLeft: 16 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 120 },
  emptyTitle: { color: 'white', fontSize: 20, fontWeight: '800', marginTop: 20 },
  emptySub: { color: '#555', fontSize: 14, marginTop: 8 },

  sectionTitle: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 16, letterSpacing: -0.5 },
  rowHeader: { marginTop: 32, marginBottom: 4 },

  topResultCard: { borderRadius: 28, overflow: 'hidden', backgroundColor: '#0a0a0a', elevation: 10, marginBottom: 10 },
  topResultGrad: { padding: 24, flexDirection: 'row', alignItems: 'center' },
  topResultArt: { width: 120, height: 120, borderRadius: 16 },
  topResultInfo: { flex: 1, marginLeft: 20 },
  topResultTitle: { color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  topResultArtist: { color: '#888', fontSize: 15, fontWeight: '600', marginTop: 4 },
  topResultPlay: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 5 },

  trackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 16 },
  artContainer: { position: 'relative' },
  trackArt: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#111' },
  activeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trackInfo: { flex: 1 },
  trackTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  trackArtist: { color: '#666', fontSize: 13, marginTop: 4, fontWeight: '500' },
  actionGroup: { flexDirection: 'row', alignItems: 'center' },

  scroll: { flex: 1 },
});
