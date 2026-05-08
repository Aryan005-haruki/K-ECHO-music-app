import fs from 'fs';

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://api-piped.mha.fi',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.rivo.cc',
  'https://pipedapi.smaragdina.club',
  'https://piped-api.lunar.icu',
  'https://api.piped.privacydev.net',
  'https://pipedapi.drgns.space',
  'https://api.piped.projectsegfau.lt'
];

const fetchJSON = async (url) => {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) { return null; }
    const text = await res.text();
    if (text.startsWith('<')) return null;
    return JSON.parse(text);
  } catch(e) {
    return null;
  }
}

async function debugPiped() {
  const query = "Tum Hi Ho";
  console.log("Searching for:", query);
  
  for (const instance of PIPED_INSTANCES) {
      console.log(`Trying ${instance}...`);
      const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`;
      const searchData = await fetchJSON(searchUrl);
      
      if (searchData && searchData.items && searchData.items.length) {
        const item = searchData.items[0];
        const videoId = item.url.split('v=')[1] || item.url.split('/').pop();
        console.log(`✓ Search worked on ${instance}, Video ID: ${videoId}`);
        
        const streamUrl = `${instance}/streams/${videoId}`;
        const streamData = await fetchJSON(streamUrl);
        
        if (streamData && streamData.audioStreams) {
            console.log(`✓ Streams found on ${instance}`);
            return;
        } else {
            console.log(`✗ Streams failed on ${instance}`);
        }
      } else {
        console.log(`✗ Search failed on ${instance}`);
      }
  }
}

debugPiped();
