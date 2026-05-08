const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://api-piped.mha.fi',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.rivo.cc',
  'https://pipedapi.smaragdina.club',
  'https://piped-api.lunar.icu',
  'https://api.piped.privacydev.net'
];

async function checkPiped() {
    const fetch = globalThis.fetch;
    for (const url of PIPED_INSTANCES) {
        try {
            const res = await fetch(`${url}/search?q=test&filter=videos`);
            if (res.ok) {
                console.log(url, "is OK");
            } else {
                console.log(url, "Failed with status", res.status);
            }
        } catch(e) {
            console.log(url, "Failed with error");
        }
    }
}
checkPiped();
