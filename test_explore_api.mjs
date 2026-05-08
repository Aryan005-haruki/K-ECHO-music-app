import { getTrendingIndia, searchYouTube } from './src/services/ApiService.js';

async function test() {
  console.log("Testing getTrendingIndia...");
  const indiaTrending = await getTrendingIndia(10);
  console.log("India Trending count:", indiaTrending.length);
  if(indiaTrending.length > 0) {
    console.log("First item:", indiaTrending[0].title);
  } else {
    console.log("No items returned from getTrendingIndia");
  }

  console.log("\nTesting searchYouTube for Reels...");
  const reels = await searchYouTube('trending music videos reels india', 5);
  console.log("Reels count:", reels.length);
  if(reels.length > 0) {
    console.log("First reel:", reels[0].title);
  } else {
    console.log("No reels returned");
  }
}

test();
