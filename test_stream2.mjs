import { getYouTubeStream, validateStream } from './src/services/ApiService.js';

async function test() {
  console.log("Testing stream extraction...");
  const streamUrl = await getYouTubeStream('Tum Hi Ho');
  if (streamUrl) {
    console.log("SUCCESS! Stream URL found:", streamUrl);
  } else {
    console.log("FAILED to find stream URL.");
  }
}

test();
