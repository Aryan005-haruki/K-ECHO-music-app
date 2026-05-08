/**
 * MusicService.js
 * react-native-track-player background service.
 * Handles remote control events from lock screen / notification.
 */
import TrackPlayer, { Event } from 'react-native-track-player';

export default async function () {
  // Remote play
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());

  // Remote pause
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());

  // Remote stop
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());

  // Next and Previous are handled by PlayerContext.js to manage the React queue state

  // Remote seek (e.g. from lock screen scrubber)
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) =>
    TrackPlayer.seekTo(position)
  );

  // Duck / unduck for notifications / calls
  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ permanent, paused }) => {
    if (permanent) {
      await TrackPlayer.stop();
    } else if (paused) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  });
};
