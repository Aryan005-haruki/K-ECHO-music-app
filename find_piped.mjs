async function run() {
    try {
        const res = await fetch('https://raw.githubusercontent.com/TeamPiped/Piped-Instances/main/instances.json');
        const data = await res.json();
        const urls = data.map(d => d.api_url);
        console.log("Total APIs:", urls.length);
        
        // Find 5 working APIs
        const working = [];
        for (const url of urls) {
            if (working.length >= 5) break;
            try {
                const s = await fetch(`${url}/search?q=test&filter=videos`, { signal: AbortSignal.timeout(2000) });
                if (s.ok) {
                    const text = await s.text();
                    if (!text.startsWith('<')) {
                        working.push(url);
                        console.log("Working:", url);
                    }
                }
            } catch(e) {}
        }
        console.log("Found working APIs:", working);
    } catch(e) {
        console.log(e);
    }
}
run();
