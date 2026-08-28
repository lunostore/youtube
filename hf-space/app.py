"""
YouTube Audio Download API - Enterprise Multi-Engine Engine
Tier 1: yt-dlp with Chrome TLS Impersonation (curl-cffi)
Tier 2: Invidious API audio extraction + ffmpeg conversion
Tier 3: Piped API audio extraction + ffmpeg conversion
Tier 4: Cobalt backend stream extraction
"""

import subprocess, os, uuid, glob, sys, re, json
import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="Noir Audio Downloader", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

DOWNLOAD_DIR = os.path.join(os.path.expanduser("~"), "ytaudio")
try:
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
except:
    DOWNLOAD_DIR = "/tmp/ytaudio"
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def auto_clean():
    import time
    now = time.time()
    for f in glob.glob(f"{DOWNLOAD_DIR}/*"):
        try:
            if os.path.getmtime(f) < now - 300:
                os.remove(f)
        except:
            pass

def extract_video_id(url: str) -> str:
    m = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11})", url)
    return m.group(1) if m else url

INVIDIOUS_INSTANCES = [
    "https://inv.tux.pizza",
    "https://invidious.jing.rocks",
    "https://invidious.projectsegfau.lt",
    "https://yt.drgnz.club",
    "https://invidious.drgns.space",
    "https://inv.nadeko.net"
]

PIPED_INSTANCES = [
    "https://pipedapi.kavin.rocks",
    "https://api.piped.privacydev.net",
    "https://piped-api.lunar.icu"
]

COBALT_INSTANCES = [
    "https://kityune.imput.net",
    "https://nachos.imput.net",
    "https://sunny.imput.net",
    "https://blossom.imput.net",
    "https://capi.3kh0.net"
]

@app.get("/")
def root():
    return {"status": "online", "name": "Noir Audio API", "engine": "Multi-Tier v3.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/audio")
def download_audio(url: str = Query(..., description="YouTube video URL")):
    auto_clean()
    video_id = extract_video_id(url)
    file_id = str(uuid.uuid4())[:8]
    raw_audio_path = f"{DOWNLOAD_DIR}/{file_id}.raw"
    final_mp3 = f"{DOWNLOAD_DIR}/{file_id}.mp3"

    print(f"[*] Processing audio request for video ID: {video_id}", flush=True)

    # -------------------------------------------------------------
    # TIER 1: yt-dlp with Chrome Impersonate (Bypasses Datacenter SSL block)
    # -------------------------------------------------------------
    print("[*] Tier 1: Trying yt-dlp with Chrome TLS Impersonate...", flush=True)
    try:
        out_template = f"{DOWNLOAD_DIR}/{file_id}.%(ext)s"
        cmd = [
            "yt-dlp",
            "--impersonate", "chrome",
            "--no-check-certificates",
            "--force-ipv4",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "128K",
            "--no-playlist",
            "--socket-timeout", "30",
            "--output", out_template,
            f"https://www.youtube.com/watch?v=s_{video_id}" if len(video_id) == 11 else url
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        if res.returncode == 0 and os.path.exists(final_mp3):
            print("[+] Tier 1 succeeded!", flush=True)
            return send_mp3(final_mp3, file_id)
        else:
            print(f"[-] Tier 1 failed: {(res.stderr or res.stdout)[:150]}", flush=True)
    except Exception as e:
        print(f"[-] Tier 1 exception: {e}", flush=True)

    # -------------------------------------------------------------
    # TIER 2: Invidious Audio Stream Extraction + Direct FFmpeg
    # -------------------------------------------------------------
    print("[*] Tier 2: Trying Invidious instances stream extraction...", flush=True)
    for inv_base in INVIDIOUS_INSTANCES:
        try:
            api_url = f"{inv_base}/api/v1/videos/{video_id}"
            with httpx.Client(timeout=10.0, follow_redirects=True) as client:
                resp = client.get(api_url)
                if resp.status_code == 200:
                    vdata = resp.json()
                    formats = vdata.get("adaptiveFormats", []) or vdata.get("formatStreams", [])
                    audio_stream = None
                    for f in formats:
                        if "audio" in f.get("type", ""):
                            audio_stream = f.get("url")
                            break
                    if audio_stream:
                        print(f"[+] Found audio stream via {inv_base}. Downloading & converting...", flush=True)
                        if convert_url_to_mp3(audio_stream, final_mp3):
                            return send_mp3(final_mp3, file_id)
        except Exception as e:
            print(f"[-] Invidious {inv_base} error: {e}", flush=True)

    # -------------------------------------------------------------
    # TIER 3: Piped API Audio Stream Extraction
    # -------------------------------------------------------------
    print("[*] Tier 3: Trying Piped API stream extraction...", flush=True)
    for piped_base in PIPED_INSTANCES:
        try:
            api_url = f"{piped_base}/streams/{video_id}"
            with httpx.Client(timeout=10.0, follow_redirects=True) as client:
                resp = client.get(api_url)
                if resp.status_code == 200:
                    pdata = resp.json()
                    audio_streams = pdata.get("audioStreams", [])
                    if audio_streams:
                        stream_url = audio_streams[0].get("url")
                        if stream_url and convert_url_to_mp3(stream_url, final_mp3):
                            print(f"[+] Piped {piped_base} succeeded!", flush=True)
                            return send_mp3(final_mp3, file_id)
        except Exception as e:
            print(f"[-] Piped {piped_base} error: {e}", flush=True)

    # -------------------------------------------------------------
    # TIER 4: Cobalt Multi-Instance API Extraction
    # -------------------------------------------------------------
    print("[*] Tier 4: Trying Cobalt instances...", flush=True)
    for cob in COBALT_INSTANCES:
        try:
            with httpx.Client(timeout=12.0, follow_redirects=True) as client:
                cresp = client.post(
                    f"{cob}/api/json",
                    json={"url": f"https://www.youtube.com/watch?v={video_id}", "downloadMode": "audio", "audioFormat": "mp3"},
                    headers={"Accept": "application/json", "Content-Type": "application/json"}
                )
                if cresp.status_code == 200:
                    cdata = cresp.json()
                    durl = cdata.get("url")
                    if durl and convert_url_to_mp3(durl, final_mp3):
                        print(f"[+] Cobalt {cob} succeeded!", flush=True)
                        return send_mp3(final_mp3, file_id)
        except Exception as e:
            print(f"[-] Cobalt {cob} error: {e}", flush=True)

    print("[!] All 4 tiers exhausted.", flush=True)
    return JSONResponse(status_code=400, content={"error": "All download engines exhausted for this video."})


def convert_url_to_mp3(stream_url: str, output_path: str) -> bool:
    """Uses ffmpeg to stream directly from audio URL and convert to MP3"""
    try:
        cmd = [
            "ffmpeg",
            "-y",
            "-i", stream_url,
            "-vn",
            "-acodec", "libmp3lame",
            "-b:a", "128k",
            output_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        return res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 10000
    except Exception as e:
        print(f"[-] FFmpeg conversion error: {e}", flush=True)
        return False


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
