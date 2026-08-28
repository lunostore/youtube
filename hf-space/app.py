"""
Noir Audio - High Performance YouTube Audio Downloader
Powered by FastAPI, yt-dlp & FFmpeg
"""

import subprocess, os, uuid, glob, re, time
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="Noir Audio API", version="5.0")

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

@app.get("/")
def root():
    return {"status": "online", "name": "Noir Audio API", "version": "5.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/audio")
def download_audio(url: str = Query(..., description="YouTube video URL")):
    auto_clean()
    video_id = extract_video_id(url)
    clean_url = f"https://www.youtube.com/watch?v={video_id}"
    file_id = str(uuid.uuid4())[:8]
    out_template = f"{DOWNLOAD_DIR}/{file_id}.%(ext)s"
    final_mp3 = f"{DOWNLOAD_DIR}/{file_id}.mp3"

    print(f"[*] Starting download process for URL: {clean_url}", flush=True)

    # Strategy 1: iOS client (Bypasses bot check without cookies)
    cmd_ios = [
        "yt-dlp",
        "--no-check-certificates",
        "--geo-bypass",
        "--extractor-args", "youtube:player_client=ios",
        "-f", "bestaudio/best",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "128K",
        "--no-playlist",
        "--socket-timeout", "30",
        "--output", out_template,
        clean_url
    ]

    # Strategy 2: Android client
    cmd_android = [
        "yt-dlp",
        "--no-check-certificates",
        "--geo-bypass",
        "--extractor-args", "youtube:player_client=android",
        "-f", "bestaudio/best",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "128K",
        "--no-playlist",
        "--socket-timeout", "30",
        "--output", out_template,
        clean_url
    ]

    # Strategy 3: Standard Web client with generic agent
    cmd_web = [
        "yt-dlp",
        "--no-check-certificates",
        "--geo-bypass",
        "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "-f", "bestaudio/best",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "128K",
        "--no-playlist",
        "--socket-timeout", "30",
        "--output", out_template,
        clean_url
    ]

    strategies = [
        ("iOS Client", cmd_ios),
        ("Android Client", cmd_android),
        ("Web Client", cmd_web)
    ]

    last_err = ""

    for name, cmd in strategies:
        print(f"[*] Trying {name}...", flush=True)
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
            if res.returncode == 0 and os.path.exists(final_mp3):
                print(f"[+] {name} succeeded! File size: {os.path.getsize(final_mp3)} bytes", flush=True)
                return send_mp3(final_mp3, file_id)
            else:
                last_err = (res.stderr or res.stdout)
                print(f"[-] {name} failed: {last_err[:200]}", flush=True)
        except Exception as e:
            last_err = str(e)
            print(f"[-] {name} error: {e}", flush=True)

    # If any file was produced even if extension is different
    matched = glob.glob(f"{DOWNLOAD_DIR}/{file_id}.*")
    if matched and os.path.exists(matched[0]):
        return send_mp3(matched[0], file_id)

    print(f"[!] All download strategies failed for {clean_url}. Error: {last_err[:300]}", flush=True)
    return JSONResponse(
        status_code=400,
        content={"error": "Download failed", "detail": last_err[:300]}
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
