import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Image, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { searchPlaylists } from '../services/ApiService';
import { COLORS } from '../data/musicData';

function SkeletonCard({ isLarge }) {
  const shimmerValue = new Animated.Value(0.3);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerValue, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.card, isLarge ? styles.cardLarge : styles.cardSmall]}>
      <Animated.View style={[styles.skeletonImage, isLarge ? styles.cardImageLarge : styles.cardImageSmall, { opacity: shimmerValue }]} />
      <Animated.View style={[styles.skeletonText, { width: '80%', opacity: shimmerValue }]} />
      <Animated.View style={[styles.skeletonText, { width: '50%', marginTop: 4, opacity: shimmerValue }]} />
    </View>
  );
}

function PlaylistCard({ playlist, onPress, isLarge }) {
  return (
    <TouchableOpacity
      style={[styles.card, isLarge ? styles.cardLarge : styles.cardSmall]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {playlist.artwork ? (
        <Image
          source={{ uri: playlist.artwork }}
          style={[styles.cardImage, isLarge ? styles.cardImageLarge : styles.cardImageSmall]}
        />
      ) : (
        <View style={[styles.cardImage, isLarge ? styles.cardImageLarge : styles.cardImageSmall, { backgroundColor: '#212121', justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 40 }}>🎵</Text>
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={1}>
        {playlist.title}
      </Text>
      <Text style={styles.cardSubtitle} numberOfLines={1}>
        {playlist.artist}
      </Text>
    </TouchableOpacity>
  );
}

export default function GenreDetailScreen({ route, navigation }) {
  const { genre } = route.params;

  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState([]);
  const [community, setCommunity] = useState([]);
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        let q1 = `${genre} hitlist`;
        let q2 = `${genre} music`;
        let q3 = `${genre} album`;

        if (genre === 'Pakistani') {
          q1 = 'Pakistani top songs';
          q2 = 'Pakistani pop hits';
          q3 = 'Best of Pakistani artists';
        }

        // Fetch 3 categories in parallel
        const [f, c, a] = await Promise.all([
          searchPlaylists(q1, 8),
          searchPlaylists(q2, 8),
          searchPlaylists(q3, 8)
        ]);
        setFeatured(f);
        setCommunity(c);
        setAlbums(a);
      } catch (err) {
        console.error('Error fetching genre details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [genre]);

  const handlePlaylistPress = (playlist) => {
    navigation.navigate('PlaylistDetail', { playlist });
  };

  const renderSection = (title, data, isLarge) => {
    if (data.length === 0 && !loading) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {loading ? (
          <View style={styles.listContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[1, 2, 3, 4].map((item) => (
                <SkeletonCard key={item} isLarge={isLarge} />
              ))}
            </ScrollView>
          </View>
        ) : (
          <FlatList
            horizontal
            data={data}
            keyExtractor={(item, index) => item.id || String(index)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <PlaylistCard
                playlist={item}
                isLarge={isLarge}
                onPress={() => handlePlaylistPress(item)}
              />
            )}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{genre}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderSection('Featured playlists', featured, true)}
        {renderSection('Community playlists', community, false)}
        {renderSection('Albums', albums, false)}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#030303' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4, marginRight: 16 },
  backIcon: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '600' },
  scroll: { flex: 1 },
  section: { marginTop: 24 },
  sectionTitle: {
    color: '#ff2a2a', // Using the same red from SearchScreen to match the screenshots
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
    fontFamily: 'sans-serif-medium'
  },
  listContainer: { paddingHorizontal: 16, gap: 16, flexDirection: 'row' },
  
  card: { marginRight: 16 },
  cardLarge: { width: 160 },
  cardSmall: { width: 130 },
  
  cardImage: { borderRadius: 8, backgroundColor: '#212121', marginBottom: 8 },
  cardImageLarge: { width: 160, height: 160 },
  cardImageSmall: { width: 130, height: 130 },
  
  cardTitle: { color: 'white', fontSize: 14, fontWeight: '500', marginBottom: 2 },
  cardSubtitle: { color: '#aaaaaa', fontSize: 12 },

  skeletonImage: { borderRadius: 8, backgroundColor: '#333', marginBottom: 8 },
  skeletonText: { height: 12, borderRadius: 4, backgroundColor: '#333' }
});
