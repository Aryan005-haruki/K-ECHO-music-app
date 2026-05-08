async function test() {
  const url = 'https://api.lyrics.ovh/v1/Coldplay/Yellow';
  const res = await fetch(url);
  const data = await res.json();
  console.log(data.lyrics ? data.lyrics.substring(0, 50) + "..." : data);
}
test();
