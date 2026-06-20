import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  SafeAreaView, 
  StatusBar,
  Modal,
  TextInput,
  ToastAndroid,
  Animated,
  Dimensions,
  Platform,
  BackHandler
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../context/PlayerContext';
import { COLORS } from '../data/musicData';

const { width } = Dimensions.get('window');

export default function LibraryScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  const { 
    liked, 
    userPlaylists, 
    createPlaylist, 
    recentlyPlayed, 
    likedPlaylists,
    likedTracks,
    playTrack,
    downloadedTracks,
    removeDownload
  } = usePlayer();

  // Derive unique artists from history + liked tracks
  const uniqueArtists = useMemo(() => {
    const artistMap = new Map();
    [...recentlyPlayed, ...likedTracks].filter(Boolean).forEach(track => {
      if (track.artist && !artistMap.has(track.artist)) {
        artistMap.set(track.artist, { name: track.artist, artwork: track.artwork, id: track.artistId || track.artist });
      }
    });
    return Array.from(artistMap.values()).slice(0, 30);
  }, [recentlyPlayed, likedTracks]);

  // Derive liked albums
  const likedAlbums = useMemo(() => likedPlaylists.filter(p => p.isAlbum), [likedPlaylists]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const filters = ['All', 'Playlists', 'Artists', 'Albums'];

  // Handle hardware back button for modal
  useEffect(() => {
    const backAction = () => {
      if (isCreateModalVisible) {
        setIsCreateModalVisible(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isCreateModalVisible]);

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName);
    setNewPlaylistName('');
    setIsCreateModalVisible(false);
    ToastAndroid.show('Playlist created successfully!', ToastAndroid.SHORT);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const titleScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.1, 1, 0.9],
    extrapolate: 'clamp'
  });

  const renderFilterChips = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContent}
    >
      {filters.map(filter => (
        <TouchableOpacity 
          key={filter} 
          style={[styles.filterChip, activeFilter === filter && styles.activeFilterChip]}
          onPress={() => setActiveFilter(filter)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
            {filter}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderLikedCard = () => (
    <TouchableOpacity 
      style={styles.likedHeroCard}
      activeOpacity={0.9}
      onPress={() => {
        navigation.navigate('PlaylistDetail', { 
          playlist: { 
            id: 'liked', 
            title: 'Liked Songs', 
            artist: 'Your Collection', 
            artwork: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=500&q=80' 
          } 
        });
      }}
    >
      <LinearGradient
        colors={['#8B5CF6', '#4C1D95', '#1E1B4B']}
        style={styles.likedHeroGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.likedHeroContent}>
          <View style={styles.likedIconContainer}>
            <Ionicons name="heart" size={38} color="white" />
          </View>
          <View style={styles.likedHeroInfo}>
            <Text style={styles.likedHeroTitle}>Liked Songs</Text>
            <Text style={styles.likedHeroSub}>{likedTracks.length} tracks • Updated recently</Text>
          </View>
          <View style={styles.premiumPlayBtn}>
            <Ionicons name="play" size={28} color="black" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderRecentlyPlayed = () => {
    const cleanHistory = (recentlyPlayed || []).filter(t => t && !t.isSnippet);
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          {cleanHistory.length > 0 && (
            <TouchableOpacity onPress={() => {
              navigation.navigate('PlaylistDetail', { 
                playlist: { 
                  id: 'recent', title: 'Recently Played', 
                  artist: 'Your History',
                  artwork: cleanHistory[0]?.artwork || '',
                  isUserPlaylist: true, 
                  tracks: cleanHistory 
                } 
              });
            }}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
        {cleanHistory.length === 0 ? (
          <TouchableOpacity 
            style={[styles.playlistRow, { opacity: 0.6 }]}
            activeOpacity={1}
          >
            <View style={[styles.playlistArt, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }]}>
              <Ionicons name="time-outline" size={24} color="white" />
            </View>
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistTitle}>No history yet</Text>
              <Text style={styles.playlistMeta}>Songs you play will appear here</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.recentScrollContent}
          >
            {cleanHistory.slice(0, 15).map((item, idx) => (
              <TouchableOpacity 
                key={`${item.id}-${idx}`} 
                style={styles.recentCard}
                onPress={() => playTrack(item, cleanHistory)}
                activeOpacity={0.8}
              >
                <View style={styles.recentArtContainer}>
                  <Image 
                    source={{ uri: item.artwork || 'https://api.dicebear.com/7.x/initials/svg?seed=' + item.title }} 
                    style={styles.recentArt} 
                  />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={styles.recentArtOverlay} />
                </View>
                <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.recentArtist} numberOfLines={1}>{item.artist}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderDownloads = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Downloads</Text>
          {downloadedTracks && downloadedTracks.length > 0 && (
            <TouchableOpacity onPress={() => {
              navigation.navigate('PlaylistDetail', { 
                playlist: { 
                  id: 'downloads', 
                  title: 'Downloads', 
                  artist: 'Offline Songs',
                  artwork: downloadedTracks[0]?.artwork || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
                  isUserPlaylist: true, 
                  tracks: downloadedTracks 
                } 
              });
            }}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
        {!downloadedTracks || downloadedTracks.length === 0 ? (
          <TouchableOpacity 
            style={[styles.playlistRow, { opacity: 0.6 }]}
            activeOpacity={1}
          >
            <View style={[styles.playlistArt, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }]}>
              <Ionicons name="cloud-offline-outline" size={24} color="white" />
            </View>
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistTitle}>No downloads yet</Text>
              <Text style={styles.playlistMeta}>Songs you download will appear here</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.recentScrollContent}
          >
            {downloadedTracks.slice(0, 15).map((item, idx) => (
              <TouchableOpacity 
                key={`${item.id}-${idx}`} 
                style={styles.recentCard}
                onPress={() => playTrack(item, downloadedTracks)}
                activeOpacity={0.8}
              >
                <View style={styles.recentArtContainer}>
                  <Image 
                    source={{ uri: item.artwork || 'https://api.dicebear.com/7.x/initials/svg?seed=' + item.title }} 
                    style={styles.recentArt} 
                  />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={styles.recentArtOverlay} />
                </View>
                <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.recentArtist} numberOfLines={1}>{item.artist}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderPlaylists = () => {
    const allPlaylists = [...(userPlaylists || []), ...(likedPlaylists || [])];
    
    return (
      <View style={[styles.section, { paddingBottom: 100 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Playlists</Text>
          <TouchableOpacity 
            style={styles.createBtnHeader}
            onPress={() => setIsCreateModalVisible(true)}
          >
            <Ionicons name="add" size={20} color={COLORS.primary} />
            <Text style={styles.createBtnHeaderText}>Create</Text>
          </TouchableOpacity>
        </View>
        
        {allPlaylists.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="playlist-music-outline" size={64} color="rgba(255,255,255,0.1)" />
            </View>
            <Text style={styles.emptyStateTitle}>No playlists yet</Text>
            <Text style={styles.emptyStateSub}>Your custom collections will appear here</Text>
            <TouchableOpacity 
              style={styles.emptyCreateBtn}
              onPress={() => setIsCreateModalVisible(true)}
            >
              <Text style={styles.emptyCreateBtnText}>Create New Playlist</Text>
            </TouchableOpacity>
          </View>
        ) : (
          allPlaylists.map((item, idx) => (
            <TouchableOpacity 
              key={`${item.id}-${idx}`} 
              style={styles.playlistRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PlaylistDetail', { playlist: item })}
            >
              <Image source={{ uri: item.artwork || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200' }} style={styles.playlistArt} />
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistTitle}>{item.title}</Text>
                <Text style={styles.playlistMeta}>
                  {item.isUserPlaylist ? 'Created by You' : item.artist || 'Playlist'} • {item.isUserPlaylist ? (item.tracks?.length || 0) : (item.songCount || item.count || item.more_info?.song_count || '50+')} songs
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#1a1a2e', '#111118', '#000']}
        style={StyleSheet.absoluteFill}
      />

      {/* Sticky Header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.stickyHeaderContent}>
          <Text style={styles.stickyTitle}>Your Library</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconCircle}>
              <Ionicons name="search" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle} onPress={() => setIsCreateModalVisible(true)}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Animated.Text style={[styles.headerTitle, { transform: [{ scale: titleScale }] }]}>
              Your Library
            </Animated.Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.getParent()?.navigate('Search')}>
                <Ionicons name="search" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.iconCircle, { backgroundColor: COLORS.primary }]} 
                onPress={() => setIsCreateModalVisible(true)}
              >
                <Ionicons name="add" size={26} color="black" />
              </TouchableOpacity>
            </View>
          </View>

          {renderFilterChips()}

          {activeFilter === 'All' && (
            <>
              {renderLikedCard()}
              {renderRecentlyPlayed()}
              {renderDownloads()}
              {renderPlaylists()}
            </>
          )}

          {activeFilter === 'Playlists' && renderPlaylists()}

          {activeFilter === 'Artists' && (
            <View style={[styles.section, { paddingBottom: 100 }]}>
              {uniqueArtists.length === 0 ? (
                <View style={styles.centerSection}>
                  <MaterialCommunityIcons name="account-music" size={80} color="rgba(255,255,255,0.05)" />
                  <Text style={styles.emptyText}>Play songs to discover artists here</Text>
                </View>
              ) : (
                uniqueArtists.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.playlistRow}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('PlaylistDetail', { 
                      playlist: { id: item.id, title: item.name, isArtist: true, artwork: item.artwork } 
                    })}
                  >
                    <Image 
                      source={{ uri: item.artwork || 'https://api.dicebear.com/7.x/initials/svg?seed=' + item.name }} 
                      style={[styles.playlistArt, { borderRadius: 32 }]} 
                    />
                    <View style={styles.playlistInfo}>
                      <Text style={styles.playlistTitle}>{item.name}</Text>
                      <Text style={styles.playlistMeta}>Artist</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
          
          {activeFilter === 'Albums' && (
            <View style={[styles.section, { paddingBottom: 100 }]}>
              {likedAlbums.length === 0 ? (
                <View style={styles.centerSection}>
                  <Ionicons name="disc-outline" size={80} color="rgba(255,255,255,0.05)" />
                  <Text style={styles.emptyText}>Like albums to see them here</Text>
                </View>
              ) : (
                likedAlbums.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.playlistRow}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('PlaylistDetail', { playlist: item })}
                  >
                    <Image source={{ uri: item.artwork || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200' }} style={styles.playlistArt} />
                    <View style={styles.playlistInfo}>
                      <Text style={styles.playlistTitle}>{item.title}</Text>
                      <Text style={styles.playlistMeta}>Album • {item.artist || 'Unknown'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeFilter === 'Downloads' && (
            <View style={[styles.section, { paddingBottom: 100 }]}>
              {!downloadedTracks || downloadedTracks.length === 0 ? (
                <View style={styles.centerSection}>
                  <Ionicons name="cloud-offline-outline" size={80} color="rgba(255,255,255,0.05)" />
                  <Text style={styles.emptyText}>Downloaded songs will appear here</Text>
                </View>
              ) : (
                downloadedTracks.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.playlistRow}
                    activeOpacity={0.7}
                    onPress={() => playTrack(item, downloadedTracks)}
                  >
                    <Image source={{ uri: item.artwork || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200' }} style={styles.playlistArt} />
                    <View style={styles.playlistInfo}>
                      <Text style={styles.playlistTitle}>{item.title}</Text>
                      <Text style={styles.playlistMeta}>{item.artist || 'Unknown'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeDownload(item.id)} hitSlop={{top:15,bottom:15,left:15,right:15}}>
                      <Ionicons name="trash-outline" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </SafeAreaView>
      </Animated.ScrollView>

      {/* Create Playlist Modal */}
      <Modal
        visible={isCreateModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setIsCreateModalVisible(false)} 
          />
          <View style={styles.createModal}>
            <LinearGradient
              colors={['#2a2a3d', '#1a1a24']}
              style={styles.modalGrad}
            >
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>New Playlist</Text>
              <Text style={styles.modalSub}>Give your collection a premium name</Text>
              
              <View style={styles.inputContainer}>
                <Ionicons name="musical-notes" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="My Awesome Mix"
                  placeholderTextColor="#666"
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  autoFocus
                  selectionColor={COLORS.primary}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelBtn}
                  onPress={() => { setIsCreateModalVisible(false); setNewPlaylistName(''); }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.createBtn, !newPlaylistName.trim() && styles.disabledBtn]}
                  onPress={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                >
                  <Text style={styles.createText}>Create Playlist</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1 },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 50,
    paddingBottom: 20
  },
  headerTitle: { color: 'white', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },

  // Sticky Header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    paddingTop: Platform.OS === 'ios' ? 50 : 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  stickyHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  stickyTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  
  // Filters
  filterScroll: { maxHeight: 50, marginBottom: 10 },
  filterContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  filterChip: { 
    paddingHorizontal: 20, 
    height: 38,
    justifyContent: 'center',
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  activeFilterChip: { backgroundColor: 'white', borderColor: 'white' },
  filterText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },
  activeFilterText: { color: 'black' },
  
  // Liked Hero Card
  likedHeroCard: { margin: 24, borderRadius: 24, overflow: 'hidden', elevation: 15 },
  likedHeroGrad: { padding: 24 },
  likedHeroContent: { flexDirection: 'row', alignItems: 'center' },
  likedIconContainer: { 
    width: 68, 
    height: 68, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  likedHeroInfo: { flex: 1, marginLeft: 20 },
  likedHeroTitle: { color: 'white', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  likedHeroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, fontWeight: '600' },
  premiumPlayBtn: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: 'white', 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5
  },
  
  // Sections
  section: { marginTop: 10 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24,
    marginBottom: 16
  },
  sectionTitle: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  seeAllText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  
  // Recent Played
  recentScrollContent: { paddingHorizontal: 20, gap: 16 },
  recentCard: { width: 140 },
  recentArtContainer: { 
    width: 140, 
    height: 140, 
    borderRadius: 20, 
    overflow: 'hidden', 
    marginBottom: 10,
    elevation: 8,
    backgroundColor: '#111'
  },
  recentArt: { width: '100%', height: '100%' },
  recentArtOverlay: { ...StyleSheet.absoluteFillObject },
  recentTitle: { color: 'white', fontSize: 14, fontWeight: '800', width: '100%' },
  recentArtist: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2, fontWeight: '600' },
  
  // Playlists
  createBtnHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(29, 185, 84, 0.1)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.2)'
  },
  createBtnHeaderText: { color: COLORS.primary, fontSize: 12, fontWeight: '800', marginLeft: 4 },
  playlistRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    gap: 16 
  },
  playlistArt: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#111' },
  playlistInfo: { flex: 1 },
  playlistTitle: { color: 'white', fontSize: 16, fontWeight: '800' },
  playlistMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4, fontWeight: '600' },
  
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconBox: { marginBottom: 20 },
  emptyStateTitle: { color: 'white', fontSize: 20, fontWeight: '900' },
  emptyStateSub: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8, fontSize: 14, lineHeight: 20 },
  emptyCreateBtn: { 
    marginTop: 24, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  emptyCreateBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },
  
  centerSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 120 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 15, fontWeight: '700', marginTop: 24 },

  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'flex-end', 
  },
  createModal: { 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  modalGrad: { padding: 32, paddingBottom: Platform.OS === 'ios' ? 50 : 32 },
  modalHandle: { 
    width: 40, 
    height: 4, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 2, 
    alignSelf: 'center',
    marginBottom: 24
  },
  modalTitle: { color: 'white', fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: -1 },
  modalSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', marginTop: 8, fontWeight: '600' },
  inputContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 20, 
    paddingHorizontal: 20,
    marginTop: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  inputIcon: { marginRight: 12 },
  input: { 
    flex: 1,
    padding: 18, 
    color: 'white', 
    fontSize: 18,
    fontWeight: '700'
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 32 },
  cancelBtn: { flex: 1, padding: 18, alignItems: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)' },
  createBtn: { flex: 1, padding: 18, alignItems: 'center', borderRadius: 18, backgroundColor: COLORS.primary },
  disabledBtn: { opacity: 0.5 },
  cancelText: { color: 'rgba(255,255,255,0.6)', fontWeight: '800', fontSize: 16 },
  createText: { color: 'black', fontWeight: '900', fontSize: 16 }
});
