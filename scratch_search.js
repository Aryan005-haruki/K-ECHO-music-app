import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, StatusBar, ActivityIndicator,
  Image, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import { usePlayer } from '../context/PlayerContext';
import { COLORS } from '../data/musicData';
import { getSearchSuggestions } from '../services/ApiService';

const HISTORY_KEY = '@search_history';

// Helper component for Skeleton loading
const Skeleton = ({ width, height, borderRadius, style }) => (
  <View style={[{ width, height, borderRadius, backgroundColor: '#2a2a2a' }, style]} />
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
  const { playTrack, currentTrack, isPlaying, liked, toggleLike, searchYouTube } = usePlayer();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch (e) {
      console.log('Error loading history');
    }
  };

  const saveToHistory = async (term) => {
    try {
      let newHist = [term, ...history.filter(t => t !== term)].slice(0, 15);
      setHistory(newHist);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHist));
    } catch (e) { }
  };

  const fetchSuggestions = async (val) => {
    if (val.length < 2) {
      setSuggestions([]);
      return;
    }
    const sugs = await getSearchSuggestions(val);
    setSuggestions(sugs);
  };

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!isTyping) return;

    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounce.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 400);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
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
      // Using existing searchYouTube from context, which wraps searchGlobal
      const res = await searchYouTube(searchTerm.trim());
      setResults(res || []);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = (track) => {
    const idx = results.findIndex(t => t.id === track.id);
    playTrack(track, results, idx);
  };

  // UI Components
  
  const renderHistoryItem = (term, index) => (
    <TouchableOpacity 
      key={index} 
      style={styles.suggestionRow}
      onPress={() => handleSearchSubmit(term)}
    >
      <Ionicons name="time-outline" size={24} color={COLORS.outline} />
      <Text style={styles.suggestionText}>{term}</Text>
      <Feather name="arrow-up-left" size={24} color={COLORS.outline} />
    </TouchableOpacity>
  );

  const renderSuggestionItem = (term, index) => (
    <TouchableOpacity 
      key={index} 
      style={styles.suggestionRow}
      onPress={() => handleSearchSubmit(term)}
    >
      <Ionicons name="search" size={24} color={COLORS.outline} />
      <Text style={styles.suggestionText}>{term}</Text>
      <Feather name="arrow-up-left" size={24} color={COLORS.outline} />
    </TouchableOpacity>
  );

  const renderSkeletons = () => (
    <View style={{ padding: 16 }}>
      <Skeleton width={120} height={20} borderRadius={4} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
        <Skeleton width={80} height={80} borderRadius={8} />
        <View style={{ marginLeft: 16 }}>
          <Skeleton width={200} height={20} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton width={120} height={16} borderRadius={4} />
        </View>
      </View>
      <Skeleton width={100} height={20} borderRadius={4} style={{ marginBottom: 12 }} />
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Skeleton width={50} height={50} borderRadius={4} />
          <View style={{ marginLeft: 16 }}>
            <Skeleton width={180} height={18} borderRadius={4} style={{ marginBottom: 8 }} />
            <Skeleton width={100} height={14} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderResults = () => {
    if (isLoading) return renderSkeletons();
    if (results.length === 0) return (
      <View style={{ alignItems: 'center', marginTop: 50 }}>
        <Text style={{ color: COLORS.onSurface, fontSize: 18 }}>No results found</Text>
      </View>
    );

    // Filter results based on category
    let filteredResults = results;
    if (activeCategory === 'Songs') filteredResults = results.filter(r => !r.isYouTube && !r.isAlbum && !r.isPlaylist);
    if (activeCategory === 'Videos') filteredResults = results.filter(r => r.isYouTube);
    if (activeCategory === 'Albums') filteredResults = results.filter(r => r.isAlbum);
    
    // Fallback to all if category is empty
    if (filteredResults.length === 0) filteredResults = results;

    const topResult = filteredResults[0];
    const otherResults = filteredResults.slice(1);

    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <Text style={styles.sectionTitle}>Top result</Text>
        {topResult && (
          <TouchableOpacity style={styles.topResultCard} onPress={() => handlePlay(topResult)}>
            <Image source={{ uri: topResult.artwork }} style={styles.topResultArt} />
            <View style={styles.topResultInfo}>
              <Text style={styles.topResultTitle} numberOfLines={2}>{topResult.title}</Text>
              <Text style={styles.topResultArtist} numberOfLines={1}>
                {topResult.isYouTube ? 'Video' : 'Song'} • {topResult.artist} • {topResult.duration}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {otherResults.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Other</Text>
            {otherResults.map((track) => (
              <TouchableOpacity
                key={track.id}
                style={styles.trackRow}
                onPress={() => handlePlay(track)}
                activeOpacity={0.7}
              >
                <View style={styles.artContainer}>
                  {track.artwork ? (
                    <Image source={{ uri: track.artwork }} style={styles.trackArt} />
                  ) : (
                    <View style={[styles.trackArt, styles.fallbackArt]}><Text>🎵</Text></View>
                  )}
                  {currentTrack?.id === track.id && (
                    <View style={styles.activeOverlay}><Text style={{fontSize: 16}}>🎵</Text></View>
                  )}
                </View>
                
                <View style={styles.trackInfo}>
                  <Text style={[styles.trackTitle, currentTrack?.id === track.id && { color: 'white' }]} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {track.isYouTube ? 'Video' : 'Song'} • {track.artist}
                  </Text>
                </View>
                
                <TouchableOpacity onPress={() => toggleLike(track.id)} style={styles.actionBtn} hitSlop={{top:15,bottom:15,left:15,right:15}}>
                  <Ionicons name={liked.has(track.id) ? "heart" : "heart-outline"} size={22} color={liked.has(track.id) ? "#ff2a2a" : COLORS.outline} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} hitSlop={{top:15,bottom:15,left:15,right:15}}>
                  <Ionicons name="ellipsis-vertical" size={20} color={COLORS.outline} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Top Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="Search songs, artists, po..."
            placeholderTextColor={COLORS.outline}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setIsTyping(true);
              setSearched(false);
            }}
            onSubmitEditing={() => handleSearchSubmit()}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={true}
          />
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="mic-outline" size={24} color="white" />
        </TouchableOpacity>
        {query.length > 0 && (
          <TouchableOpacity style={styles.iconBtn} onPress={() => {
            setQuery('');
            setIsTyping(false);
            setSearched(false);
            setSuggestions([]);
          }}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {searched && (
        <View style={styles.categoryChipsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
            {['All', 'Songs', 'Videos', 'Albums', 'Artists'].map(cat => (
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
        {!searched && !isTyping && query.length === 0 && (
          <View style={styles.listContainer}>
            {history.map((term, i) => renderHistoryItem(term, i))}
          </View>
        )}

        {isTyping && query.length > 0 && (
          <View style={styles.listContainer}>
            <Text style={styles.suggestionHeader}>Suggestions</Text>
            {suggestions.map((term, i) => renderSuggestionItem(term, i))}
          </View>
        )}

        {searched && renderResults()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#030303' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a'
  },
  backBtn: { padding: 8, marginRight: 4 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#212121', borderRadius: 20,
    paddingHorizontal: 16, height: 40,
  },
  input: { flex: 1, color: 'white', fontSize: 16 },
  iconBtn: { padding: 8, marginLeft: 4 },
  
  categoryChipsContainer: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a', paddingVertical: 12 },
  categoryChips: { paddingHorizontal: 16, gap: 10 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#212121',
  },
  chipActive: { backgroundColor: 'white' },
  chipText: { color: 'white', fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: 'black' },

  listContainer: { paddingVertical: 10 },
  suggestionHeader: { color: 'white', fontSize: 16, fontWeight: 'bold', marginHorizontal: 16, marginBottom: 12, marginTop: 4 },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  suggestionText: {
    flex: 1, color: 'white', fontSize: 16,
    marginLeft: 16, marginRight: 16,
    fontFamily: 'cursive', // Matching the user screenshot
  },

  scroll: { flex: 1 },
  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  
  topResultCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#141414', borderRadius: 8, padding: 12,
  },
  topResultArt: { width: 80, height: 80, borderRadius: 8 },
  topResultInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  topResultTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  topResultArtist: { color: '#aaaaaa', fontSize: 14 },

  trackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 14 },
  artContainer: { position: 'relative' },
  trackArt: { width: 50, height: 50, borderRadius: 4 },
  fallbackArt: { backgroundColor: '#212121', alignItems: 'center', justifyContent: 'center' },
  activeOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4,
    alignItems: 'center', justifyContent: 'center'
  },
  trackInfo: { flex: 1, justifyContent: 'center' },
  trackTitle: { color: 'white', fontSize: 16, fontWeight: '500', marginBottom: 3 },
  trackArtist: { color: '#aaaaaa', fontSize: 14, fontWeight: '400' },
  actionBtn: { padding: 4 },
});
