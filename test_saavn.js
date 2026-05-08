import { searchSaavn } from './src/services/ApiService.js';

async function testSaavn() {
    console.log("Searching for 'Regional Pop Lakhwinder Wadali'...");
    const songs = await searchSaavn("Regional Pop Lakhwinder Wadali");
    
    if (!songs || songs.length === 0) {
        console.log("No songs found.");
        return;
    }
    
    const track = songs[0];
    console.log("Found track:", track.title);
    console.log("URL:", track.url);
    
    console.log("\nTesting HTTP GET on Saavn URL...");
    try {
        const res = await fetch(track.url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.jiosaavn.com/',
                'Range': 'bytes=0-1000'
            }
        });
        console.log("GET Response Status:", res.status);
        console.log("GET Response Headers:", Object.fromEntries(res.headers.entries()));
        if (res.status === 403 || res.status === 401) {
            const text = await res.text();
            console.log("GET Response Text:", text.substring(0, 200));
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

testSaavn();
