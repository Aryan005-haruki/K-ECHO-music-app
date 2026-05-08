async function test() {
  const url = 'https://www.jiosaavn.com/api.php?__call=webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=web6dot0';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  if (data.new_trending && data.new_trending.length > 0) {
     console.log("Trending #1 keys:", Object.keys(data.new_trending[0]));
     console.log("has media url?", !!data.new_trending[0].more_info?.encrypted_media_url);
  }
}
test();
