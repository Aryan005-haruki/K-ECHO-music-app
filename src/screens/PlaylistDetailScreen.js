import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, FlatList, Animated, Modal, TouchableWithoutFeedback, Dimensions, ScrollView, ToastAndroid, Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { getPlaylistTracks, getArtistTracks, searchYouTube, getiTunesArtistTracks, searchiTunesArtistTracksByName } from '../services/ApiService';
import { usePlayer } from '../context/PlayerContext';
import { COLORS } from '../data/musicData';

const { width, height } = Dimensions.get('window');

export default function PlaylistDetailScreen({ route, navigation }) {
  const { playlist } = route.params;
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTrack, setActiveTrack] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPlaylistModalVisible, setIsPlaylistModalVisible] = useState(false);
  
  const { 
    playTrack, currentTrack, liked, toggleLike, addToQueue, insertNext, 
    toggleShuffle, isShuffle, recentlyPlayed, userPlaylists, addToUserPlaylist,
    likedPlaylists, toggleLikePlaylist, likedTracks
  } = usePlayer();
  const scrollY = new Animated.Value(0);

  const [isAddToPlaylistModalVisible, setIsAddToPlaylistModalVisible] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null);

  const isPlaylistLiked = likedPlaylists.some(p => p.id === playlist.id);

  useEffect(() => {
    async function loadTracks() {
      setLoading(true);
      try {
        let res = [];
        if (playlist.id === 'liked') {
          // Use real liked tracks metadata
          res = likedTracks;
        } else if (playlist.isUserPlaylist) {
          // Load from user playlist
          res = playlist.tracks || [];
        } else if (playlist.isArtist) {
          res = await getArtistTracks(playlist.id, playlist.title);
        } else {
          res = await getPlaylistTracks(playlist.id, playlist.isAlbum);
        }
        setTracks(res || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    loadTracks();
  }, [playlist, likedTracks]);

  const openBottomSheet = (track) => {
    setActiveTrack(track);
    setIsModalVisible(true);
  };

  const handleLike = () => {
    toggleLikePlaylist(playlist);
    ToastAndroid.show(isPlaylistLiked ? 'Removed from Library' : 'Added to Library', ToastAndroid.SHORT);
  };

  const handleLikeTrack = (track) => {
    toggleLike(track.id);
    ToastAndroid.show(liked.has(track.id) ? 'Removed from Liked' : 'Added to Liked', ToastAndroid.SHORT);
  };

  const handleAddPlaylistToQueue = () => {
    if (tracks.length === 0) {
      ToastAndroid.show('No tracks to add', ToastAndroid.SHORT);
      return;
    }
    // Efficiently add all tracks to queue
    tracks.forEach(t => addToQueue(t));
    ToastAndroid.show('Playlist added to queue', ToastAndroid.SHORT);
    setIsPlaylistModalVisible(false);
  };

  const handlePlayNextPlaylist = () => {
    if (tracks.length === 0) {
      ToastAndroid.show('No tracks to add', ToastAndroid.SHORT);
      return;
    }
    // To play them in order, we insert them in reverse order at the same "next" position
    [...tracks].reverse().forEach(t => insertNext(t));
    ToastAndroid.show('Playlist will play next', ToastAndroid.SHORT);
    setIsPlaylistModalVisible(false);
  };

  const handleShare = async (item, isPlaylist = false) => {
    try {
      const message = isPlaylist 
        ? `Check out this playlist "${item.title}" on K-ECHO!`
        : `Listening to "${item.title}" by ${item.artist} on K-ECHO!`;
      await Share.share({ message });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDownload = (item) => {
    ToastAndroid.show(`Starting download: ${item.title}`, ToastAndroid.SHORT);
  };

  const handleAddToPlaylist = (item) => {
    setSelectedTrackForPlaylist(item);
    setIsAddToPlaylistModalVisible(true);
  };

  const handleShufflePlay = () => {
    if (tracks.length === 0) return;
    const cleanTracks = tracks.filter(t => t && t.id && t.title);
    if (cleanTracks.length === 0) return;
    const shuffled = [...cleanTracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playTrack(shuffled[0], shuffled, 0);
  };

  const renderTrack = ({ item, index }) => {
    if (!item) return null;
    return (
      <TouchableOpacity 
        style={styles.trackRow} 
        activeOpacity={0.7}
        onPress={() => {
          if (!item || !item.id) return;
          const cleanTracks = tracks.filter(t => t && t.id && t.title);
          const idx = cleanTracks.findIndex(t => t.id === item.id);
          playTrack(item, cleanTracks, idx >= 0 ? idx : 0);
        }}
      >
        <Image source={{ uri: item.artwork }} style={styles.trackImage} />
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title || 'Unknown'}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artist || 'Unknown Artist'} {item.duration ? `• ${item.duration}` : ''}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.moreBtn} 
          onPress={() => openBottomSheet(item)}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.outline} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => {
    const headerArtwork = playlist.id === 'liked' 
      ? 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=500&q=80'
      : playlist.artwork;

    return (
      <View style={styles.headerContainer}>
        <View style={styles.infoRow}>
          <Image 
            source={{ uri: headerArtwork || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500' }} 
            style={styles.coverImage} 
          />
          
          <View style={styles.textContainer}>
            <Text style={styles.playlistTitle} numberOfLines={2}>{playlist.title}</Text>
            <Text style={styles.playlistCreator}>{tracks.length} songs</Text>
            
            <View style={styles.iconRow}>
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={handleLike}
                hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
              >
                <Ionicons 
                  name={isPlaylistLiked ? "heart" : "heart-outline"} 
                  size={24} 
                  color={isPlaylistLiked ? COLORS.primary : "white"} 
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="download-outline" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setIsPlaylistModalVisible(true)}>
                <Ionicons name="ellipsis-vertical" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.playAllBtn}
            onPress={() => {
              const cleanTracks = tracks.filter(t => t && t.id && t.title);
              if (cleanTracks.length > 0) playTrack(cleanTracks[0], cleanTracks, 0);
            }}
          >
            <Ionicons name="play" size={24} color="black" />
            <Text style={styles.playAllText}>Play All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shuffleBtn} onPress={handleShufflePlay}>
            <Ionicons name="shuffle" size={24} color={isShuffle ? COLORS.primary : 'white'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item, index) => item.id + index}
          renderItem={renderTrack}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Sheet Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.bottomSheet}>
              {activeTrack && (
                <>
                  <View style={styles.sheetHeader}>
                    <Image source={{ uri: activeTrack.artwork }} style={styles.sheetArt} />
                    <View style={styles.sheetInfo}>
                      <Text style={styles.sheetTitle} numberOfLines={1}>{activeTrack.title}</Text>
                      <Text style={styles.sheetArtist} numberOfLines={1}>{activeTrack.artist}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.sheetOptions}>
                    <TouchableOpacity style={styles.optionItem} onPress={() => {
                      insertNext(activeTrack);
                      setIsModalVisible(false);
                    }}>
                      <MaterialIcons name="playlist-play" size={26} color="white" />
                      <Text style={styles.optionText}>Play Next</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.optionItem} onPress={() => {
                      addToQueue(activeTrack);
                      setIsModalVisible(false);
                    }}>
                      <MaterialIcons name="playlist-add" size={26} color="white" />
                      <Text style={styles.optionText}>Add to Queue</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionItem} onPress={() => {
                      handleLikeTrack(activeTrack);
                      setIsModalVisible(false);
                    }}>
                      <Ionicons name={liked.has(activeTrack?.id) ? 'heart' : 'heart-outline'} size={24} color={liked.has(activeTrack?.id) ? '#ff2a2a' : 'white'} />
                      <Text style={styles.optionText}>{liked.has(activeTrack?.id) ? 'Remove from Liked' : 'Add to Liked Songs'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionItem} onPress={() => {
                      handleAddToPlaylist(activeTrack);
                      setIsModalVisible(false);
                    }}>
                      <MaterialIcons name="playlist-add" size={26} color="white" />
                      <Text style={styles.optionText}>Add to Playlist</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.optionItem} onPress={() => {
                      handleDownload(activeTrack);
                      setIsModalVisible(false);
                    }}>
                      <Feather name="download" size={24} color="white" />
                      <Text style={styles.optionText}>Download</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionItem} onPress={() => {
                      handleShare(activeTrack);
                      setIsModalVisible(false);
                    }}>
                      <Ionicons name="share-outline" size={24} color="white" />
                      <Text style={styles.optionText}>Share Song</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Playlist Options Bottom Sheet */}
      <Modal
        visible={isPlaylistModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPlaylistModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsPlaylistModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHeader}>
                <Image source={{ uri: playlist.artwork }} style={styles.sheetArt} />
                <View style={styles.sheetInfo}>
                  <Text style={styles.sheetTitle} numberOfLines={1}>{playlist.title}</Text>
                  <Text style={styles.sheetArtist} numberOfLines={1}>{playlist.artist || 'Playlist'}</Text>
                </View>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.optionItem} onPress={() => { handleLike(); setIsPlaylistModalVisible(false); }}>
                  <Ionicons name={isPlaylistLiked ? "heart" : "heart-outline"} size={22} color={isPlaylistLiked ? COLORS.primary : "white"} />
                  <Text style={styles.optionText}>{isPlaylistLiked ? 'Remove from Library' : 'Add to Library'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionItem} onPress={handleAddPlaylistToQueue}>
                  <Ionicons name="list-outline" size={22} color="white" />
                  <Text style={styles.optionText}>Add all to Queue</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionItem} onPress={handlePlayNextPlaylist}>
                  <Ionicons name="play-forward-outline" size={22} color="white" />
                  <Text style={styles.optionText}>Play all Next</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionItem} onPress={() => { handleAddToPlaylist(playlist); setIsPlaylistModalVisible(false); }}>
                  <Ionicons name="add-circle-outline" size={22} color="white" />
                  <Text style={styles.optionText}>Add to Playlist</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionItem} onPress={() => { handleDownload(playlist); setIsPlaylistModalVisible(false); }}>
                  <Ionicons name="download-outline" size={22} color="white" />
                  <Text style={styles.optionText}>Download</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionItem} onPress={() => { handleShare(playlist, true); setIsPlaylistModalVisible(false); }}>
                  <Ionicons name="share-social-outline" size={22} color="white" />
                  <Text style={styles.optionText}>Share</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Add to Playlist Selection Modal */}
      <Modal
        visible={isAddToPlaylistModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAddToPlaylistModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#1a1a1a', padding: 20, borderRadius: 20, width: '90%' }]}>
            <Text style={[styles.modalTitle, { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }]}>Add to Playlist</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {userPlaylists.length === 0 ? (
                <Text style={{ color: '#666', textAlign: 'center', marginVertical: 20 }}>No playlists found. Create one in Library!</Text>
              ) : (
                userPlaylists.map(pl => (
                  <TouchableOpacity 
                    key={pl.id} 
                    style={[styles.optionItem, { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#333' }]}
                    onPress={() => {
                      addToUserPlaylist(pl.id, selectedTrackForPlaylist);
                      setIsAddToPlaylistModalVisible(false);
                      ToastAndroid.show(`Added to ${pl.title}`, ToastAndroid.SHORT);
                    }}
                  >
                    <Ionicons name="list" size={22} color={COLORS.primary} />
                    <Text style={[styles.optionText, { marginLeft: 15, color: 'white', fontSize: 16 }]}>{pl.title}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity 
              style={{ marginTop: 20, padding: 15, alignItems: 'center', backgroundColor: '#333', borderRadius: 12 }}
              onPress={() => setIsAddToPlaylistModalVisible(false)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, zIndex: 10 },
  backBtn: { padding: 5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerContainer: { padding: 20 },
  infoRow: { flexDirection: 'row', gap: 20 },
  coverImage: { width: 140, height: 140, borderRadius: 12 },
  textContainer: { flex: 1, justifyContent: 'space-between' },
  playlistTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  playlistCreator: { color: COLORS.outline, fontSize: 14, marginTop: 4 },
  iconRow: { flexDirection: 'row', gap: 15, marginTop: 15 },
  iconBtn: { padding: 5 },
  
  actionRow: { flexDirection: 'row', marginTop: 25, gap: 12, alignItems: 'center' },
  playAllBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: COLORS.primary, 
    height: 50, 
    borderRadius: 25, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8 
  },
  playAllText: { color: 'black', fontSize: 16, fontWeight: 'bold' },
  shuffleBtn: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: COLORS.surfaceHigh, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },

  trackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, gap: 15 },
  trackImage: { width: 50, height: 50, borderRadius: 6 },
  trackInfo: { flex: 1 },
  trackTitle: { color: 'white', fontSize: 16, fontWeight: '500' },
  trackArtist: { color: COLORS.outline, fontSize: 13, marginTop: 2 },
  moreBtn: { padding: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1c1c1c', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, minHeight: 300 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 20, marginBottom: 10 },
  sheetArt: { width: 60, height: 60, borderRadius: 8 },
  sheetInfo: { marginLeft: 15, flex: 1 },
  sheetTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  sheetArtist: { color: COLORS.outline, fontSize: 14, marginTop: 4 },
  sheetOptions: { marginTop: 10 },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 15 },
  optionText: { color: 'white', fontSize: 16, fontWeight: '500' },
});
