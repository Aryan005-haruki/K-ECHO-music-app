async function test() {
    const fetch = globalThis.fetch;
    try {
        const res = await fetch('https://saavn.me/search/songs?query=Tum+Hi+Ho');
        const data = await res.json();
        console.log("saavn.me:", data?.data?.results?.[0]?.downloadUrl);
        if (data?.data?.results?.[0]?.downloadUrl) {
            const streamRes = await fetch(data.data.results[0].downloadUrl[data.data.results[0].downloadUrl.length-1].link, { method: 'HEAD' });
            console.log("saavn.me stream status:", streamRes.status);
        }
    } catch(e) { console.log("saavn.me failed", e.message); }
}
test();
