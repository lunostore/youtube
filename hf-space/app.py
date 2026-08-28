"""
YouTube Audio API - Self-Healing Dynamic Engine
- Discovers live healthy Invidious & Piped instances dynamically
- Extracts direct Google Video audio streams without cookie/bot blocks
- Converts streams on-the-fly to MP3 via FFmpeg
"""

import subprocess, os, uuid, glob, re, json, time
import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="Noir Audio Self-Healing API", version="4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

DOWNLOAD_DIR = "/tmp/ytaudio"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def auto_clean():
    now = time.time()
    for f in glob.glob(f"{DOWNLOAD_DIR}/*"):
        try:
            if os.path.getmtime(f) < now - 300:
                os.remove(f)
        except:
            pass

def extract_video_id(url: str) -> str:
    m = re.search(r"(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})", url)
    return m.group(1) if m else url

# Cache for healthy instances
cached_invidious = []
last_cache_time = 0

def get_healthy_invidious_instances():
    global cached_invidious, last_cache_time
    if cached_invidious and (time.time() - last_cache_time < 600):
        return cached_invidious

    healthy = []
    try:
        with httpx.Client(timeout=5.0) as client:
            res = client.get("https://api.invidious.io/instances.json?sort_by=health")
            if res.status_code == 200:
                data = res.json()
                for item in data:
                    domain, info = item[0], item[1]
                    if info.get("api") and info.get("type") == "https" and info.get("health", 0) > 0:
                        uri = info.get("uri") or f"https://{domain}"
                        healthy.append(uri.rstrip("/"))
    except Exception as e:
        print(f"[!] Could not fetch instance list: {e}", flush=True)

    # Fallback reliable defaults if list fetch fails
    if not healthy:
        healthy = [
            "https://inv.nadeko.net",
            "https://invidious.nerdvpn.de",
            "https://invidious.private.coffee",
            "https://invidious.asir.dev"
        ]

    cached_invidious = healthy
    last_cache_time = time.time()
    return healthy

@app.get("/")
def root():
    return {"status": "online", "name": "Noir Audio Dynamic Engine", "version": "4.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/audio")
def download_audio(url: str = Query(..., description="YouTube video URL")):
    auto_clean()
    video_id = extract_video_id(url)
    file_id = str(uuid.uuid4())[:8]
    final_mp3 = f"{DOWNLOAD_DIR}/{file_id}.mp3"

    print(f"[*] Starting download process for video: {video_id}", flush=True)

    # 1. Fetch healthy Invidious instances dynamically
    instances = get_healthy_invidious_instances()
    print(f"[*] Found {len(instances)} healthy Invidious instances", flush=True)

    stream_found = None

    for inst in instances[:8]:
        try:
            print(f"[*] Querying instance: {inst}...", flush=True)
            with httpx.Client(timeout=8.0, follow_redirects=True) as client:
                res = client.get(f"{inst}/api/v1/videos/{video_id}")
                if res.status_code == 200:
                    vdata = res.json()
                    formats = vdata.get("adaptiveFormats", []) or vdata.get("formatStreams", [])
                    
                    # Sort audio formats by bitrate (highest first)
                    audio_formats = [f for f in formats if "audio" in f.get("type", "")]
                    audio_formats.sort(key=lambda x: int(x.get("bitrate", 0) or 0), reverse=True)

                    if audio_formats:
                        stream_found = audio_formats[0].get("url")
                        print(f"[+] Found audio stream via {inst}!", flush=True)
                        break
        except Exception as e:
            print(f"[-] Instance {inst} failed: {e}", flush=True)

    # 2. If stream found, convert directly with FFmpeg
    if stream_found:
        print("[*] Converting direct stream to MP3 via FFmpeg...", flush=True)
        try:
            cmd = [
                "ffmpeg",
                "-y",
                "-headers", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n",
                "-i", stream_found,
                "-vn",
                "-acodec", "libmp3lame",
                "-b:a", "192k",
                final_mp3
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
            if res.returncode == 0 and os.path.exists(final_mp3) and os.path.getsize(final_mp3) > 10000:
                print(f"[+] Audio converted successfully! Size: {os.path.getsize(final_mp3)} bytes", flush=True)
                return send_mp3(final_mp3, file_id)
            else:
                print(f"[-] FFmpeg conversion failed: {res.stderr[:250]}", flush=True)
        except Exception as e:
            print(f"[-] FFmpeg error: {e}", flush=True)

    # 3. Fallback: Try Piped API
    print("[*] Trying Piped API fallback...", flush=True)
    piped_instances = ["https://pipedapi.kavin.rocks", "https://piped-api.lunar.icu", "https://cf.piped.video/api/v1"]
    for pinst in piped_instances:
        try:
            with httpx.Client(timeout=8.0, follow_redirects=True) as client:
                pres = client.get(f"{pinst}/streams/{video_id}")
                if pres.status_code == 200:
                    pdata = pres.json()
                    astreams = pdata.get("audioStreams", [])
                    if astreams:
                        purl = astreams[0].get("url")
                        cmd = ["ffmpeg", "-y", "-i", purl, "-vn", "-acodec", "libmp3lame", "-b:a", "192k", final_mp3]
                        res = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
                        if res.returncode == 0 and os.path.exists(final_mp3):
                            print(f"[+] Piped conversion succeeded via {pinst}!", flush=True)
                            return send_mp3(final_mp3, file_id)
        except Exception as e:
            print(f"[-] Piped instance {pinst} failed: {e}", flush=True)

    print("[!] All dynamic stream sources failed.", flush=True)
    return JSONResponse(
        status_code=400,
        content={"error": "تعذر استخراج الصوت من هذا المقطع حالياً. يرجى تجربة مقطع آخر."}
    )


def send_mp3(file_path: str, file_id: str):
    filename = f"Noir_Audio_{file_id}.mp3"
    return FileResponse(
        path=file_path,
        media_type="audio/mpeg",
        filename=filename,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
