async function check() {
    const url = 'https://videos.saavncdn.com/preview/282/5a51f7baf3a376bc552c045b3a7b88c1be319eebf1d9a04948e2134a8df64381/20230825204207_v_540p_p.mp4';
    try {
        const res = await fetch(url, { method: 'HEAD' });
        console.log("Status:", res.status);
        console.log("Content-Type:", res.headers.get('content-type'));
    } catch(e) {
        console.log("Error:", e.message);
    }
}
check();
