const fetchJSON = async (url) => {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    return await res.json();
  } catch(e) {
    console.log(e);
    return null;
  }
}

async function debugDirect() {
  const query = "Tum Hi Ho";
  console.log("Searching JioSaavn directly...");
  const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(query)}&n=5&p=1&_format=json&_marker=0&ctx=android`;
  const data = await fetchJSON(url);
  console.log("Direct API response keys:", data ? Object.keys(data) : "null");
  if (data && data.results) {
      console.log(`Found ${data.results.length} results.`);
      const first = data.results[0];
      console.log("Media URL raw:", first.media_preview_url);
      
      // Decrypt or reconstruct the actual download URL if we can.
      // Often replacing 'preview.saavncdn.com' with 'aac.saavncdn.com' and '_96_p.mp4' to '_320.mp4' works.
      if (first.media_preview_url) {
          let directUrl = first.media_preview_url.replace('preview.saavncdn.com', 'aac.saavncdn.com').replace('_96_p.mp4', '_320.mp4');
          console.log("Reconstructed URL:", directUrl);
          
          const validate = await fetch(directUrl, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' }});
          console.log("Validation status:", validate.status);
      }
  }
}

debugDirect();
