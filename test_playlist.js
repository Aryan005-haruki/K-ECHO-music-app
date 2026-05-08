const fetch = require('node-fetch');

async function test() {
  const url = 'https://www.jiosaavn.com/api.php?__call=webapi.get&token=8O-6_bfvd1M_&type=playlist&p=1&n=20&includeMetaTags=0&ctx=web6dot0&api_version=4&_format=json&_marker=0';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  console.log(data.title);
  if (data.list && data.list.length > 0) {
    console.log("Songs:", data.list.map(s => s.title));
  }
}
test();
