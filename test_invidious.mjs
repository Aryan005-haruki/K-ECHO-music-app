const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://iv.ggtyler.dev',
  'https://invidious.flokinet.to',
  'https://invidious.jing.rocks',
  'https://invidious.lunar.icu',
  'https://yt.artemislena.eu',
  'https://invidious.projectsegfau.lt'
];

async function run() {
    console.log("Checking Invidious instances...");
    let workingId = null;
    let workingInstance = null;
    
    // Step 1: Find a working instance and get a video ID
    for (const url of INVIDIOUS) {
        try {
            const res = await fetch(`${url}/api/v1/search?q=test&type=video&fields=videoId`, { signal: AbortSignal.timeout(3000) });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    workingId = data[0].videoId;
                    workingInstance = url;
                    console.log(`Working search on ${url}, videoId: ${workingId}`);
                    break;
                }
            }
        } catch(e) {}
    }
    
    if (!workingId) {
        console.log("No working Invidious instances for search.");
        return;
    }
    
    // Step 2: Try to get a stream link
    try {
        const streamRes = await fetch(`${workingInstance}/api/v1/videos/${workingId}?fields=adaptiveFormats`, { signal: AbortSignal.timeout(3000) });
        if (streamRes.ok) {
            const streamData = await streamRes.json();
            const audios = (streamData.adaptiveFormats || []).filter(f => f.type && f.type.includes('audio/mp4'));
            if (audios.length > 0) {
                console.log(`Working stream URL:`, audios[0].url.substring(0, 100));
                
                // Check if the stream actually plays (HEAD request to see if 403)
                const headRes = await fetch(audios[0].url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                console.log("Stream HEAD status:", headRes.status);
            } else {
                console.log("No audio formats found.");
            }
        } else {
            console.log("Failed to fetch stream details:", streamRes.status);
        }
    } catch(e) {
        console.log("Error fetching stream:", e.message);
    }
}
run();
