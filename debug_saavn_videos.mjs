const SAAVN_BASE = 'https://www.jiosaavn.com/api.php';
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36';

async function testSaavnVideos() {
  const query = 'Tum Hi Ho';
  const url = `${SAAVN_BASE}?__call=search.getVideoResults&q=${encodeURIComponent(query)}&n=10&p=1&_format=json&_marker=0&ctx=android`;
  
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const data = await res.json();
      console.log("Saavn Video Search Results:", JSON.stringify(data, null, 2));
    } else {
      console.log("Saavn Video Search Failed:", res.status);
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}

testSaavnVideos();
