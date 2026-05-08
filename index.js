import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import MusicService from './src/services/MusicService';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);

// Register the playback service
TrackPlayer.registerPlaybackService(() => MusicService);
