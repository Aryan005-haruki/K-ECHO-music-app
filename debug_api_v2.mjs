import { getIndianTrendingVideos } from './src/services/ApiService.js';

async function debug() {
  console.log('Testing getIndianTrendingVideos...');
  try {
    const videos = await getIndianTrendingVideos(15);
    console.log(`Received ${videos.length} videos`);
    if (videos.length > 0) {
      console.log('First video sample:', JSON.stringify(videos[0], null, 2));
    } else {
      console.log('Error: Received 0 videos');
    }
  } catch (err) {
    console.error('API Error:', err);
  }
}

debug();
