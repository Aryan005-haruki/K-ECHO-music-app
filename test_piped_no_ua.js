const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://api-piped.mha.fi',
  'https://piped-api.lunar.icu',
  'https://api.piped.privacydev.net'
];

async function test() {
    console.log("Testing without fake User-Agent...");
    for (const url of PIPED_INSTANCES) {
        try {
            console.log(`Trying: ${url}`);
            const res = await fetch(`${url}/search?q=Tum%20Hi%20Ho&filter=videos`);
            if (res.ok) {
                const data = await res.json();
                if (data.items && data.items.length) {
                    console.log("✓ SUCCESS!", url, "Video ID:", data.items[0].url);
                    
                    const vid = data.items[0].url.split('v=')[1];
                    const streamRes = await fetch(`${url}/streams/${vid}`);
                    const streamData = await streamRes.json();
                    
                    const audios = streamData.audioStreams || [];
                    if (audios.length > 0) {
                        console.log("✓ STREAMS FOUND!", audios[0].url.substring(0, 100));
                        return; // Stop on first success
                    }
                }
            } else {
                console.log(`✗ Failed: ${res.status}`);
            }
        } catch(e) {
            console.log(`✗ Error: ${e.message}`);
        }
    }
}

test();
