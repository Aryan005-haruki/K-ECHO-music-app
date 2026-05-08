const PIPED = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.drgns.space',
  'https://pipedapi.smaragdina.club',
  'https://api-piped.mha.fi',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.rivo.cc',
  'https://piped-api.lunar.icu',
  'https://api.piped.privacydev.net',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.us.projectsegfau.lt',
  'https://pipedapi.koreus.com',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.astn.me',
  'https://pipedapi.chauvet.pro'
];

async function run() {
    console.log("Checking piped instances...");
    for (const url of PIPED) {
        try {
            const s = await fetch(`${url}/search?q=test&filter=videos`, { signal: AbortSignal.timeout(3000) });
            if (s.ok) {
                const text = await s.text();
                if (!text.startsWith('<')) {
                    const data = JSON.parse(text);
                    if (data.items) {
                        console.log("WORKING:", url);
                        return;
                    }
                }
            }
        } catch(e) {}
    }
    console.log("None worked.");
}
run();
