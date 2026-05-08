async function check() {
    const fetch = globalThis.fetch;
    const res = await fetch('https://aac.saavncdn.com/430/41FfnHZ2I2JOiiLt8enCDE4roLsYiypRfb_320.mp4', {
        method: 'HEAD',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
    });
    console.log("Status:", res.status);
}
check();
