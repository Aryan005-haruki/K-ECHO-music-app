import { getYouTubeStream, searchSaavn } from './src/services/ApiService.js';

async function test() {
    console.log("Testing searchSaavn...");
    const songs = await searchSaavn("Tum Hi Ho");
    console.log(`Found ${songs.length} songs from Saavn. First song:`, songs[0]?.title);

    console.log("\nTesting getYouTubeStream (Piped Fallback) for 'Tum Hi Ho Arijit Singh'...");
    const url = await getYouTubeStream("Tum Hi Ho Arijit Singh");
    console.log("YouTube/Piped MP4 Stream URL:", url ? "FOUND ✅: " + url : "NOT FOUND ❌");
    
    console.log("\nTesting getYouTubeStream again for another song 'Shape of You'...");
    const url2 = await getYouTubeStream("Shape of You Ed Sheeran");
    console.log("YouTube/Piped MP4 Stream URL:", url2 ? "FOUND ✅: " + url2 : "NOT FOUND ❌");
    
    console.log("\nTesting getYouTubeStream again for 'Despacito'...");
    const url3 = await getYouTubeStream("Despacito");
    console.log("YouTube/Piped MP4 Stream URL:", url3 ? "FOUND ✅: " + url3 : "NOT FOUND ❌");
}

test();
