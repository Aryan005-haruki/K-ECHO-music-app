export const COLORS = {
  bg: '#0a0a0f',
  surface: '#111118',
  surfaceHigh: '#1a1a24',
  surfaceBright: '#242433',
  onSurface: '#ffffff',
  onSurfaceVariant: '#b3b3cc',
  outline: '#666680',
  outlineVariant: '#2a2a3d',
  primary: '#1DB954',
  neonRed: '#FF0055',
  neonPurple: '#7B2FBE',
  accent: '#1DB954',
};

const ART = {
  starboy: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=400',
  arijit:  'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=400',
  theweeknd: 'https://images.unsplash.com/photo-1514525253361-b83f859b73c0?auto=format&fit=crop&q=80&w=400',
  edsheeran: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=400',
  dualipa: 'https://images.unsplash.com/photo-1459749411177-042180ceea72?auto=format&fit=crop&q=80&w=400',
};

export const featuredTrack = {
  id: 'feat_1',
  title: 'Starboy',
  artist: 'The Weeknd',
  album:  'Starboy',
  artwork: ART.starboy,
  duration: '3:50',
  url: '', 
  isYouTube: true,
  color: '#7B2FBE',
};

export const recentlyPlayed = [
  { id: 'r1', title: 'Blinding Lights', artist: 'The Weeknd', artwork: ART.theweeknd, duration: '3:20', url: '', isYouTube: true },
  { id: 'r2', title: 'Kesariya', artist: 'Arijit Singh', artwork: ART.arijit, duration: '4:10', url: '', isYouTube: true },
  { id: 'r3', title: 'Shape of You', artist: 'Ed Sheeran', artwork: ART.edsheeran, duration: '3:53', url: '', isYouTube: true },
  { id: 'r4', title: 'Night Changes', artist: 'One Direction', artwork: ART.dualipa, duration: '3:46', url: '', isYouTube: true },
  { id: 'r5', title: 'Levitating', artist: 'Dua Lipa', artwork: ART.dualipa, duration: '3:23', url: '', isYouTube: true },
  { id: 'r6', title: 'Stay', artist: 'Justin Bieber', artwork: ART.starboy, duration: '2:21', url: '', isYouTube: true },
];

export const trendingTracks = [
  { id: 't1', title: 'Heeriye', artist: 'Arijit Singh', artwork: ART.arijit, duration: '3:14', url: '', isYouTube: true },
  { id: 't2', title: 'Die For You', artist: 'The Weeknd', artwork: ART.theweeknd, duration: '4:20', url: '', isYouTube: true },
  { id: 't3', title: 'Peaches', artist: 'Justin Bieber', artwork: ART.starboy, duration: '3:18', url: '', isYouTube: true },
  { id: 't4', title: 'Flowers', artist: 'Miley Cyrus', artwork: ART.dualipa, duration: '3:20', url: '', isYouTube: true },
  { id: 't5', title: 'As It Was', artist: 'Harry Styles', artwork: ART.edsheeran, duration: '2:47', url: '', isYouTube: true },
  { id: 't6', title: 'Under Influence', artist: 'Chris Brown', artwork: ART.theweeknd, duration: '3:04', url: '', isYouTube: true },
];

export const playlistTracks = trendingTracks;

export const recommendedArtists = [
  { id: 20, name: 'The Weeknd',   emoji: '⭐', color: '#250d35' },
  { id: 21, name: 'Arijit Singh', emoji: '🎙️', color: '#0d2540' },
  { id: 22, name: 'Dua Lipa',     emoji: '💃', color: '#0d3520' },
  { id: 23, name: 'Justin Bieber', emoji: '🕺', color: '#2a1d0d' },
  { id: 24, name: 'Ed Sheeran',   emoji: '🎸', color: '#1a0d35' },
];

export const browseMoods = [
  { label: 'Chill', dotColor: '#5c5cff', bgColor: '#1a1a2e' },
  { label: 'Commute', dotColor: '#00bcd4', bgColor: '#0d222b' },
  { label: 'Energize', dotColor: '#9c27b0', bgColor: '#261230' },
  { label: 'Feel good', dotColor: '#00e676', bgColor: '#0d2b1d' },
  { label: 'Focus', dotColor: '#1de9b6', bgColor: '#0e2b26' },
  { label: 'Gaming', dotColor: '#ff5722', bgColor: '#33160e' },
  { label: 'Party', dotColor: '#03a9f4', bgColor: '#0d2633' },
  { label: 'Romance', dotColor: '#e91e63', bgColor: '#330e1a' },
  { label: 'Sad', dotColor: '#29b6f6', bgColor: '#0b202e' },
  { label: 'Sleep', dotColor: '#00e5ff', bgColor: '#08282e' },
  { label: 'Workout', dotColor: '#7c4dff', bgColor: '#190f33' },
];

export const browseGenres = [
  { label: 'African', dotColor: '#5c5cff', bgColor: '#18182b' },
  { label: 'Arabic', dotColor: '#ffea00', bgColor: '#2e2a09' },
  { label: 'Bengali', dotColor: '#e040fb', bgColor: '#2a0c33' },
  { label: 'Bhojpuri', dotColor: '#ffb300', bgColor: '#33230a' },
  { label: 'Carnatic classical', dotColor: '#ffff00', bgColor: '#2a2a0a' },
  { label: 'Classical', dotColor: '#ffc107', bgColor: '#2e220a' },
  { label: 'Country & Americana', dotColor: '#ffb300', bgColor: '#2a1e08' },
  { label: 'Dance & electronic', dotColor: '#7c4dff', bgColor: '#190e33' },
  { label: 'Decades', dotColor: '#ffca28', bgColor: '#2b2209' },
  { label: 'Desi hip-hop', dotColor: '#ff9800', bgColor: '#2b1908' },
  { label: 'Devotional', dotColor: '#69f0ae', bgColor: '#112b1c' },
  { label: 'Family', dotColor: '#536dfe', bgColor: '#121633' },
  { label: 'Folk & acoustic', dotColor: '#448aff', bgColor: '#0f1c33' },
  { label: 'Ghazal/sufi', dotColor: '#ff4081', bgColor: '#2e0b17' },
  { label: 'Gujarati', dotColor: '#18ffff', bgColor: '#0b2e2e' },
  { label: 'Haryanvi', dotColor: '#ff5252', bgColor: '#331212' },
  { label: 'Hindi', dotColor: '#e040fb', bgColor: '#2a0c33' },
  { label: 'Hindustani classical', dotColor: '#40c4ff', bgColor: '#0e2333' },
  { label: 'Hip-hop', dotColor: '#2979ff', bgColor: '#0b162e' },
  { label: 'Indian indie', dotColor: '#ff9100', bgColor: '#2e1909' },
  { label: 'Indian pop', dotColor: '#64ffda', bgColor: '#0e2e25' },
  { label: 'Indie & alternative', dotColor: '#ffab40', bgColor: '#2e1e0a' },
  { label: 'J-Pop', dotColor: '#ff9800', bgColor: '#331c0a' },
  { label: 'Jazz', dotColor: '#00e5ff', bgColor: '#0a2e2e' },
  { label: 'K-Pop', dotColor: '#ff5722', bgColor: '#2e110a' },
  { label: 'Kannada', dotColor: '#1de9b6', bgColor: '#0e2b26' },
  { label: 'Latin', dotColor: '#536dfe', bgColor: '#111533' },
  { label: 'Malayalam', dotColor: '#69f0ae', bgColor: '#112e1f' },
  { label: 'Marathi', dotColor: '#ffab40', bgColor: '#33210b' },
  { label: 'Metal', dotColor: '#00bcd4', bgColor: '#0b2b33' },
  { label: 'Monsoon', dotColor: '#69f0ae', bgColor: '#123321' },
  { label: 'Pakistani', dotColor: '#00a86b', bgColor: '#06261a' },
  { label: 'Pop', dotColor: '#ff4081', bgColor: '#2e0a15' },
];

export const libraryItems = [
  { id: 45, title: 'Liked Songs', type: 'Playlist', tracks: 156, emoji: '❤️', color: '#350d1a' },
];

export const genres = [
  { label: 'Pop', emoji: '🎤', color: '#ff4081' },
  { label: 'Hip-Hop', emoji: '🔥', color: '#2979ff' },
  { label: 'Electronic', emoji: '⚡', color: '#7c4dff' },
  { label: 'Indie', emoji: '🎸', color: '#ffab40' },
  { label: 'Pakistani', emoji: '🇵🇰', color: '#00a86b' },
  { label: 'Bhojpuri', emoji: '🎶', color: '#ffb300' },
];

export const moods = [
  { id: 'm1', title: 'Chill', icon: '🍃', colors: ['#1a1a2e', '#16213e'] },
  { id: 'm2', title: 'Workout', icon: '💪', colors: ['#190f33', '#2d1b69'] },
  { id: 'm3', title: 'Romance', icon: '💖', colors: ['#330e1a', '#691b31'] },
  { id: 'm4', title: 'Focus', icon: '🧠', colors: ['#0e2b26', '#1b695e'] },
];
