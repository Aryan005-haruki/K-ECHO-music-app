const fetch = globalThis.fetch;

const PIPED_INSTANCES = [
  'https://pipedapi.tokhmi.xyz',
  'https://api.piped.privacydev.net',
  'https://api-piped.mha.fi'
];

async function testVideo() {
  const query = 'hindi music video';
  console.log(`Searching for "${query}"...`);
  
  for (const url of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${url}/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        console.log(`Found ${items.length} items from ${url}`);
        
        for (const item of items.slice(0, 3)) {
          const videoId = item.url.split('v=')[1] || item.url.split('/shorts/')[1] || item.url.split('/').pop();
          console.log(`  - Video ID: ${videoId}, Title: ${item.title}`);
          
          const streamRes = await fetch(`${url}/streams/${videoId}`);
          if (streamRes.ok) {
            const streamData = await streamRes.json();
            const videos = streamData.videoStreams || [];
            const mp4 = videos.find(v => v.mimeType.includes('video/mp4'));
            if (mp4) {
              console.log(`    ✅ Found MP4 stream: ${mp4.url.substring(0, 50)}...`);
              return;
            } else {
              console.log(`    ❌ No MP4 stream found`);
            }
          } else {
            console.log(`    ❌ Stream request failed: ${streamRes.status}`);
          }
        }
      }
    } catch (e) {
      console.log(`    ❌ Error with ${url}: ${e.message}`);
    }
  }
}

testVideo();
