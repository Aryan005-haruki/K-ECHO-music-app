async function test() {
    try {
        const fetch = globalThis.fetch;
        const res = await fetch('https://saavn.dev/api/search/songs?query=Tum+Hi+Ho');
        const data = await res.json();
        console.log("Songs:", data?.data?.results?.[0]?.downloadUrl);
        
        console.log("\nTesting Piped search...");
        const res2 = await fetch('https://pipedapi.kavin.rocks/search?q=Tum+Hi+Ho&filter=videos');
        const data2 = await res2.json();
        console.log("Piped items:", data2?.items?.[0]);
    } catch (e) {
        console.error(e);
    }
}
test();
