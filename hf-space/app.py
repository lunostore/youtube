"""
YouTube Audio Download API
- yt-dlp + FastAPI
- Multi-client fallback (android, ios, web)
- Direct audio stream extraction
"""

import subprocess, os, uuid, glob, sys
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="YouTube Audio API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

DOWNLOAD_DIR = os.path.join(os.path.expanduser("~"), "ytaudio")
if not os.path.exists(DOWNLOAD_DIR):
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

@app.get("/")
def root():
    return {"status": "online", "name": "Noir Audio API", "version": "2.1"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/audio")
def download_audio(url: str = Query(..., description="YouTube video URL")):
    """Download YouTube audio as MP3 directly with multiple fallback strategies"""
    auto_clean()

    file_id = str(uuid.uuid4())[:8]
    out_template = f"{DOWNLOAD_DIR}/{file_id}.%(ext)s"
    final_mp3 = f"{DOWNLOAD_DIR}/{file_id}.mp3"

    print(f"[*] Processing audio download request for: {url}", flush=True)

    # Strategies to bypass YouTube limitations on cloud servers
    strategies = [
        # Strategy 1: Android Client with bestaudio format
        [
            "yt-dlp",
            "--no-check-certificates",
            "--force-ipv4",
            "--geo-bypass",
            "--extractor-args", "youtube:player_client=android",
            "-f", "ba/b",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "128K",
            "--no-playlist",
            "--socket-timeout", "30",
            "--output", out_template,
            url
        ],
        # Strategy 2: iOS Client
        [
            "yt-dlp",
            "--no-check-certificates",
            "--force-ipv4",
            "--geo-bypass",
            "--extractor-args", "youtube:player_client=ios",
            "-f", "ba/b",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "128K",
            "--no-playlist",
            "--socket-timeout", "30",
            "--output", out_template,
            url
        ],
        # Strategy 3: Web / Standard with desktop user agent
        [
            "yt-dlp",
            "--no-check-certificates",
            "--force-ipv4",
            "--geo-bypass",
            "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "-f", "bestaudio/best",
            "--extract-audio",
            "--audio-format", "mp3",
            "--no-playlist",
            "--socket-timeout", "30",
            "--output", out_template,
            url
        ]
    ]

    last_error = ""

    for i, cmd in enumerate(strategies, 1):
        print(f"[*] Trying strategy {i}...", flush=True)
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if res.returncode == 0:
                print(f"[+] Strategy {i} succeeded!", flush=True)
                break
            else:
                last_error = res.stderr or res.stdout
                print(f"[-] Strategy {i} failed: {last_error[:250]}", flush=True)
        except Exception as e:
            last_error = str(e)
            print(f"[-] Strategy {i} exception: {last_error}", flush=True)

    # Check if MP3 or any output file was generated
    target_file = None
    if os.path.exists(final_mp3):
        target_file = final_mp3
    else:
        # Search for any file matching file_id
        matched = glob.glob(f"{DOWNLOAD_DIR}/{file_id}.*")
        if matched:
            target_file = matched[0]

    if not target_file or not os.path.exists(target_file):
        print(f"[!] All download strategies failed. Last error: {last_error}", flush=True)
        return JSONResponse(
            status_code=400,
            content={"error": "Download failed", "detail": last_error[:500]}
        )

    filename = f"audio_{file_id}.mp3"
    print(f"[+] Sending file: {target_file} as {filename}", flush=True)

    return FileResponse(
        path=target_file,
        media_type="audio/mpeg",
        filename=filename,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
