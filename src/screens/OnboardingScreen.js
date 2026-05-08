import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Image, TextInput, FlatList, Dimensions, Animated, 
  StatusBar, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { LinearGradient } from 'expo-linear-gradient';
import { searchArtists } from '../services/ApiService';

const { width, height } = Dimensions.get('window');

const ARTISTS = [
  { id: '1', name: 'Arijit Singh', image: 'https://c.saavncdn.com/artists/Arijit_Singh_002_20230323062147_500x500.jpg' },
  { id: '2', name: 'Atif Aslam', image: 'https://c.saavncdn.com/artists/Atif_Aslam_500x500.jpg' },
  { id: '3', name: 'Sidhu Moose Wala', image: 'https://c.saavncdn.com/artists/Sidhu_Moose_Wala_500x500.jpg' },
  { id: '4', name: 'The Weeknd', image: 'https://c.saavncdn.com/artists/The_Weeknd_500x500.jpg' },
  { id: '5', name: 'Diljit Dosanjh', image: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_500x500.jpg' },
  { id: '6', name: 'KK', image: 'https://c.saavncdn.com/artists/KK_500x500.jpg' },
  { id: '7', name: 'Badshah', image: 'https://c.saavncdn.com/artists/Badshah_500x500.jpg' },
  { id: '8', name: 'Justin Bieber', image: 'https://c.saavncdn.com/artists/Justin_Bieber_500x500.jpg' },
  { id: '9', name: 'Drake', image: 'https://c.saavncdn.com/artists/Drake_500x500.jpg' },
  { id: '10', name: 'Taylor Swift', image: 'https://c.saavncdn.com/artists/Taylor_Swift_500x500.jpg' },
  { id: '11', name: 'Neha Kakkar', image: 'https://c.saavncdn.com/artists/Neha_Kakkar_500x500.jpg' },
  { id: '12', name: 'Ed Sheeran', image: 'https://c.saavncdn.com/artists/Ed_Sheeran_500x500.jpg' },
  { id: '13', name: 'Anuv Jain', image: 'https://c.saavncdn.com/artists/Anuv_Jain_500x500.jpg' },
  { id: '14', name: 'AP Dhillon', image: 'https://c.saavncdn.com/artists/AP_Dhillon_500x500.jpg' },
  { id: '15', name: 'Post Malone', image: 'https://c.saavncdn.com/artists/Post_Malone_500x500.jpg' },
  { id: '16', name: 'Dua Lipa', image: 'https://c.saavncdn.com/artists/Dua_Lipa_500x500.jpg' },
  { id: '17', name: 'Bruno Mars', image: 'https://c.saavncdn.com/artists/Bruno_Mars_500x500.jpg' },
  { id: '18', name: 'Yo Yo Honey Singh', image: 'https://c.saavncdn.com/artists/Yo_Yo_Honey_Singh_500x500.jpg' },
  { id: '19', name: 'Shreya Ghoshal', image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_500x500.jpg' },
  { id: '20', name: 'Sunidhi Chauhan', image: 'https://c.saavncdn.com/artists/Sunidhi_Chauhan_500x500.jpg' },
  { id: '21', name: 'Darshan Raval', image: 'https://c.saavncdn.com/artists/Darshan_Raval_500x500.jpg' },
  { id: '22', name: 'Prateek Kuhad', image: 'https://c.saavncdn.com/artists/Prateek_Kuhad_500x500.jpg' },
  { id: '23', name: 'Karan Aujla', image: 'https://c.saavncdn.com/artists/Karan_Aujla_500x500.jpg' },
  { id: '24', name: 'Talwiinder', image: 'https://c.saavncdn.com/artists/Talwiinder_500x500.jpg' },
];

const GENRES = [
  { id: '1', name: 'Bollywood', image: 'https://images.unsplash.com/photo-1605001011156-cbf0b0f67a51?w=400', color: '#FF416C' },
  { id: '2', name: 'Pop', image: 'https://images.unsplash.com/photo-1526218626217-dc65a29bb444?w=400', color: '#1DB954' },
  { id: '3', name: 'Hip-Hop', image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400', color: '#FFD700' },
  { id: '4', name: 'Lo-fi', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400', color: '#8A2BE2' },
  { id: '5', name: 'Rock', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400', color: '#FF4500' },
  { id: '6', name: 'Electronic', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', color: '#00D2FF' },
  { id: '7', name: 'Classical', image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400', color: '#A52A2A' },
  { id: '8', name: 'Jazz', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400', color: '#DAA520' },
];

const MOODS = [
  { id: 'chill', name: 'Chill Out', icon: 'leaf-outline', color: '#4CAF50', image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400' },
  { id: 'party', name: 'Party Hard', icon: 'musical-notes-outline', color: '#E91E63', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400' },
  { id: 'sad', name: 'Deep Sad', icon: 'cloud-outline', color: '#2196F3', image: 'https://images.unsplash.com/photo-1516589174184-c685266e430c?w=400' },
  { id: 'focus', name: 'Pure Focus', icon: 'eye-outline', color: '#9C27B0', image: 'https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=400' },
  { id: 'energy', name: 'High Energy', icon: 'flash-outline', color: '#FF9800', image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400' },
  { id: 'romance', name: 'Romance', icon: 'heart-outline', color: '#FF2D55', image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400' },
];

const SelectionItem = ({ item, isSelected, onPress, type = 'artist' }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSelected) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.05, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glow, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(glow, { toValue: 0.5, duration: 1000, useNativeDriver: true })
          ])
        ).start()
      ]).start();
    } else {
      glow.stopAnimation();
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start();
    }
  }, [isSelected]);

  if (type === 'artist') {
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        style={styles.artistCard} 
        onPress={onPress}
      >
        <Animated.View style={[
          styles.artistImgContainer, 
          { transform: [{ scale }] },
          isSelected && { shadowColor: '#1DB954', shadowOpacity: 0.8, shadowRadius: 15, elevation: 10 }
        ]}>
          <Image 
            source={{ uri: item.image || 'https://api.dicebear.com/7.x/initials/svg?seed=' + item.name }} 
            style={styles.artistImg} 
          />
          {isSelected && (
            <LinearGradient
              colors={['#1DB954', 'transparent']}
              style={[StyleSheet.absoluteFill, { borderRadius: 44, opacity: 0.4 }]}
            />
          )}
          {isSelected && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={12} color="black" />
            </View>
          )}
        </Animated.View>
        <Text style={[styles.artistName, isSelected && styles.selectedArtistText]} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }], width: (width - 52) / 2 }}>
      <TouchableOpacity 
        activeOpacity={0.9}
        style={styles.genreCard} 
        onPress={onPress}
      >
        <Image source={{ uri: item.image }} style={styles.genreImg} />
        <LinearGradient 
          colors={isSelected ? [item.color + 'ee', item.color + 'cc'] : ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']} 
          style={styles.genreOverlay}
        >
          {item.icon && <Ionicons name={item.icon} size={32} color="white" style={{ marginBottom: 8 }} />}
          <Text style={styles.genreName}>{item.name}</Text>
          {isSelected && (
            <Animated.View style={{ opacity: glow, marginTop: 5 }}>
              <Ionicons name="checkmark-circle" size={24} color="white" />
            </Animated.View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function OnboardingScreen({ navigation }) {
  const { saveOnboarding } = usePlayer();
  const [step, setStep] = useState(1);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [search, setSearch] = useState('');
  const [apiArtists, setApiArtists] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Search logic for ANY singer using dedicated searchArtists API
  useEffect(() => {
    if (search.trim().length > 2) {
      const delay = setTimeout(async () => {
        setLoadingSearch(true);
        const results = await searchArtists(search, 12);
        if (results) {
          const formatted = results.map(a => ({
            id: a.id,
            name: a.title,
            image: a.artwork,
            isApi: true
          }));
          setApiArtists(formatted);
        }
        setLoadingSearch(false);
      }, 500);
      return () => clearTimeout(delay);
    } else {
      setApiArtists([]);
    }
  }, [search]);

  const transitionTo = (nextStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 250, useNativeDriver: true })
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true })
      ]).start();
    });
  };

  const handleFinish = async () => {
    await saveOnboarding({
      artists: selectedArtists.map(a => a.name),
      genres: selectedGenres,
      moods: selectedMoods,
    });
    navigation.replace('MainTabs');
  };

  const toggleArtist = (artist) => {
    if (selectedArtists.find(a => a.name === artist.name)) {
      setSelectedArtists(selectedArtists.filter(a => a.name !== artist.name));
    } else if (selectedArtists.length < 10) {
      setSelectedArtists([...selectedArtists, artist]);
    }
  };

  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else if (selectedGenres.length < 5) {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const toggleMood = (mood) => {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(selectedMoods.filter(m => m !== mood));
    } else if (selectedMoods.length < 3) {
      setSelectedMoods([...selectedMoods, mood]);
    }
  };

  const renderArtistStep = () => {
    const localMatches = ARTISTS.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    const displayData = search.trim().length > 2 ? [...apiArtists, ...localMatches] : ARTISTS;
    
    // Deduplicate by name
    const finalData = [];
    const seen = new Set();
    displayData.forEach(d => {
      if (!seen.has(d.name)) {
        seen.add(d.name);
        finalData.push(d);
      }
    });

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.title}>Pick your artists</Text>
        <Text style={styles.subtitle}>Select at least 3 favorites to tune your feed.</Text>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#555" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search for any singer..." 
            placeholderTextColor="#555"
            value={search}
            onChangeText={setSearch}
          />
          {loadingSearch && <ActivityIndicator size="small" color="#1DB954" />}
        </View>

        <FlatList 
          data={finalData}
          numColumns={3}
          keyExtractor={(item, index) => item.id + index}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.artistGrid}
          renderItem={({ item }) => (
            <SelectionItem 
              item={item} 
              isSelected={!!selectedArtists.find(a => a.name === item.name)} 
              onPress={() => toggleArtist(item)} 
            />
          )}
        />

        <LinearGradient colors={['transparent', 'black']} style={styles.bottomFade} />
        
        <TouchableOpacity 
          style={[styles.nextBtn, selectedArtists.length < 3 && styles.disabledBtn]} 
          onPress={() => selectedArtists.length >= 3 && transitionTo(2)}
          disabled={selectedArtists.length < 3}
        >
          <Text style={styles.nextBtnText}>{selectedArtists.length < 3 ? `Select ${3 - selectedArtists.length} more` : 'Next Step'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderGenreStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Select Genres</Text>
      <Text style={styles.subtitle}>Choose up to 5 genres you enjoy listening to.</Text>

      <FlatList 
        data={GENRES}
        numColumns={2}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.genreGrid}
        renderItem={({ item }) => (
          <SelectionItem 
            item={item} 
            type="genre"
            isSelected={selectedGenres.includes(item.name)} 
            onPress={() => toggleGenre(item.name)} 
          />
        )}
      />

      <TouchableOpacity 
        style={[styles.nextBtn, selectedGenres.length === 0 && styles.disabledBtn]} 
        onPress={() => selectedGenres.length > 0 && transitionTo(3)}
        disabled={selectedGenres.length === 0}
      >
        <Text style={styles.nextBtnText}>Next Step</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMoodStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Daily Vibe</Text>
      <Text style={styles.subtitle}>What mood defines your music today?</Text>

      <FlatList 
        data={MOODS}
        numColumns={2}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.genreGrid}
        renderItem={({ item }) => (
          <SelectionItem 
            item={item} 
            type="mood"
            isSelected={selectedMoods.includes(item.id)} 
            onPress={() => toggleMood(item.id)} 
          />
        )}
      />

      <TouchableOpacity 
        style={[styles.nextBtn, selectedMoods.length === 0 && styles.disabledBtn]} 
        onPress={() => selectedMoods.length > 0 && handleFinish()}
        disabled={selectedMoods.length === 0}
      >
        <Text style={styles.nextBtnText}>Finish & Play</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
        <TouchableOpacity style={styles.skipBtnContainer} onPress={handleFinish}>
          <Text style={styles.skipBtn}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {step === 1 && renderArtistStep()}
        {step === 2 && renderGenreStep()}
        {step === 3 && renderMoodStep()}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 15, marginBottom: 25 },
  progressContainer: { flex: 1, height: 4, backgroundColor: '#222', borderRadius: 2, marginRight: 20, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#1DB954' },
  skipBtnContainer: { paddingVertical: 5, paddingHorizontal: 10 },
  skipBtn: { color: '#888', fontSize: 13, fontWeight: '700' },

  stepContainer: { flex: 1 },
  title: { color: 'white', fontSize: 32, fontWeight: '900', marginBottom: 8, letterSpacing: -1 },
  subtitle: { color: '#888', fontSize: 15, marginBottom: 25, fontWeight: '500' },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 16, height: 54, marginBottom: 20 },
  searchInput: { flex: 1, color: 'white', marginLeft: 12, fontSize: 15, fontWeight: '600' },

  artistGrid: { paddingBottom: 120, gap: 10 },
  artistCard: { width: (width - 60) / 3, alignItems: 'center', marginBottom: 15 },
  artistImgContainer: { width: 88, height: 88, borderRadius: 44, padding: 3, position: 'relative', backgroundColor: '#111' },
  artistImg: { width: '100%', height: '100%', borderRadius: 44 },
  selectedArtistBorder: { borderWidth: 2, borderColor: '#1DB954' },
  artistName: { color: '#888', fontSize: 12, marginTop: 10, fontWeight: '700', textAlign: 'center' },
  selectedArtistText: { color: 'white' },
  checkBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1DB954', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000' },

  genreGrid: { paddingBottom: 120, gap: 12 },
  genreCard: { height: 160, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' },
  genreImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.8 },
  genreOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 15 },
  genreName: { color: 'white', fontSize: 18, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },

  bottomFade: { position: 'absolute', bottom: 100, left: -20, right: -20, height: 60, zIndex: 1 },
  nextBtn: { position: 'absolute', bottom: 30, left: 0, right: 0, height: 60, backgroundColor: '#1DB954', borderRadius: 30, justifyContent: 'center', alignItems: 'center', zIndex: 10, elevation: 8, shadowColor: '#1DB954', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  disabledBtn: { backgroundColor: '#333', shadowOpacity: 0 },
  nextBtnText: { color: 'white', fontSize: 17, fontWeight: '800' },
});

