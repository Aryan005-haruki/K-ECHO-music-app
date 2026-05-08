const SAAVN_SOURCES = [
  'https://saavn.dev/api/search/songs?query=',
  'https://saavn.dev/search/songs?query=',
  'https://saavn-api-sigma.vercel.app/search/songs?query='
];

const fetchJSON = async (url) => {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) { return null; }
    return await res.json();
  } catch(e) {
    return null;
  }
}

async function debugSaavn() {
  const query = "Tum Hi Ho";
  
  for (const base of SAAVN_SOURCES) {
      console.log(`Trying ${base}...`);
      const searchUrl = `${base}${encodeURIComponent(query)}&limit=5`;
      const searchData = await fetchJSON(searchUrl);
      
      const results = searchData?.data?.results || searchData?.results || searchData?.data || [];
      if (results && results.length) {
          console.log(`✓ Search worked on ${base}`);
          const first = results[0];
          const download = first.downloadUrl || first.download_links || [];
          if (download.length) {
              console.log("Found download link:", download[0].link || download[0].url || download[0]);
              return;
          } else {
              console.log("No download links found in response.");
              console.log(first);
          }
      } else {
          console.log(`✗ Search failed or empty on ${base}`);
      }
  }
}

debugSaavn();
