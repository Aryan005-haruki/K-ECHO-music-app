import { resolveYouTubeVideo, searchYouTube } from './src/services/ApiService.js';

async function debug() {
  console.log("Searching for reels...");
  const reels = await searchYouTube('hindi music songs', 5);
  if (reels.length === 0) {
    console.log("No reels found in search");
    return;
  }

  const video = reels[0];
  console.log(`Found video: ${video.title} (ID: ${video.id})`);
  
  console.log("Resolving video stream...");
  const streamUrl = await resolveYouTubeVideo(video.id);
  if (streamUrl) {
    console.log("Stream URL found:", streamUrl.substring(0, 100) + "...");
  } else {
    console.log("FAILED to resolve video stream");
  }
}

debug();
