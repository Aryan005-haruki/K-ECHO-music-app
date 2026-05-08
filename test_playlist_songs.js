import { getPlaylistTracks } from './src/services/ApiService.js';

async function test() {
  console.log("Testing a known playlist ID...");
  // Use a common playlist ID, e.g. one from the browse list or a typical search result
  // We can search first to get a playlist ID
  const { searchPlaylists } = await import('./src/services/ApiService.js');
  const playlists = await searchPlaylists('hindi', 1);
  if (playlists.length > 0) {
    const pl = playlists[0];
    console.log("Found playlist:", pl.title, "ID:", pl.id);
    const tracks = await getPlaylistTracks(pl.id, false);
    console.log("Tracks returned:", tracks.length);
    if (tracks.length > 0) {
      console.log("First track:", tracks[0].title, tracks[0].id);
    } else {
      console.log("No tracks returned! Let's debug further.");
    }
  } else {
    console.log("No playlists found in search.");
  }
}

test();
