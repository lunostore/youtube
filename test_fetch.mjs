async function testStreams() {
  const domains = [
    "https://invidious.nerdvpn.de",
    "https://invidious.f5.si",
    "https://inv.nadeko.net",
    "https://invidious.tiekoetter.com",
    "https://yt.chocolatemoo53.com",
    "https://invidious.private.coffee",
    "https://invidious.projectsegfau.lt",
    "https://pipedapi.kavin.rocks",
    "https://api.piped.privacydev.net"
  ];

  for (const d of domains) {
    try {
      const isPiped = d.includes('piped');
      const url = isPiped ? `${d}/streams/FtpeINV0QO4` : `${d}/api/v1/videos/FtpeINV0QO4`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      console.log(d, "Status:", res.status);
      if (res.ok) {
        const json = await res.json();
        const audios = isPiped ? json.audioStreams : (json.adaptiveFormats || []).filter(f => (f.type || '').includes('audio'));
        console.log(`>>> ${d} SUCCESS! Found ${audios?.length} audio streams!`);
        if (audios && audios[0]) {
          console.log("Stream URL prefix:", (audios[0].url || '').substring(0, 100));
        }
      }
    } catch (e) {
      console.log(d, "Failed:", e.message);
    }
  }
}
testStreams();
