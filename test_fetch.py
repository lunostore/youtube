import httpx, json

def test():
    print("Testing Invidious dynamic...")
    try:
        r = httpx.get("https://api.invidious.io/instances.json?sort_by=health", timeout=10.0)
        data = r.json()
        api_instances = []
        for item in data:
            domain, info = item[0], item[1]
            if info.get("api") is True and info.get("type") == "https":
                uri = info.get("uri") or f"https://{domain}"
                api_instances.append(uri)
        print("API instances count:", len(api_instances))
        print("First 5:", api_instances[:5])

        for inst in api_instances[:5]:
            try:
                vr = httpx.get(f"{inst}/api/v1/videos/FtpeINV0QO4", timeout=6.0)
                print(inst, vr.status_code)
                if vr.status_code == 200:
                    formats = vr.json().get("adaptiveFormats", [])
                    audio_f = [f for f in formats if "audio" in f.get("type", "")]
                    print("Found audio formats:", len(audio_f))
                    if audio_f:
                        print("Audio stream URL sample:", audio_f[0].get("url")[:80])
                        return
            except Exception as e:
                print(inst, "err:", e)
    except Exception as e:
        print("Main err:", e)

test()
