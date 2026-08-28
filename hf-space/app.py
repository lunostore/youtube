"""
YouTube Audio Download API
- yt-dlp + FastAPI
- Optimized for HuggingFace / Cloud instances with YouTube SSL & Bot bypass
"""

import subprocess, os, uuid, glob
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="YouTube Audio API", version="1.0")

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

# Auto-clean files older than 5 minutes
def auto_clean():
    import time
    now = time.time()
    for f in glob.glob(f"{DOWNLOAD_DIR}/*"):
        try:
            if os.path.getmtime(f) < now - 300:
                os.remove(f)
        except:
            pass

COMMON_YTDLP_ARGS = [
    "--no-check-certificates",
    "--force-ipv4",
    "--geo-bypass",
    "--extractor-args", "youtube:player_client=android,web",
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "--no-warnings",
    "--no-playlist",
    "--socket-timeout", "30",
]

@app.get("/")
def root():
    return {
        "status": "online",
        "name": "Noir Audio API",
        "version": "2.0"
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/info")
def get_info(url: str = Query(..., description="YouTube video URL")):
    """Get video metadata without downloading"""
    try:
        cmd = [
            "yt-dlp",
            *COMMON_YTDLP_ARGS,
            "--print", "%(title)s",
            "--print", "%(duration)s",
            "--print", "%(uploader)s",
            url
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        if result.returncode != 0:
            return JSONResponse(status_code=400, content={
                "error": "Could not fetch video info",
                "detail": result.stderr[:300]
            })

        lines = [l.strip() for l in result.stdout.strip().split("\n") if l.strip()]
        return {
            "title": lines[0] if len(lines) > 0 else "Unknown",
            "duration": int(lines[1]) if len(lines) > 1 and lines[1].isdigit() else 0,
            "uploader": lines[2] if len(lines) > 2 else "Unknown",
            "url": url
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/audio")
def download_audio(url: str = Query(..., description="YouTube video URL")):
    """Download YouTube audio as MP3 directly"""
    auto_clean()

    file_id = str(uuid.uuid4())[:8]
    out_template = f"{DOWNLOAD_DIR}/{file_id}.%(ext)s"
    final_mp3 = f"{DOWNLOAD_DIR}/{file_id}.mp3"

    try:
        cmd = [
            "yt-dlp",
            *COMMON_YTDLP_ARGS,
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "128K",
            "--output", out_template,
            url
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)

        if result.returncode != 0:
            return JSONResponse(status_code=400, content={
                "error": "Download failed",
                "detail": result.stderr[:400]
            })

        output_file = final_mp3
        if not os.path.exists(output_file):
            files = glob.glob(f"{DOWNLOAD_DIR}/{file_id}.*")
            if files:
                output_file = files[0]
            else:
                return JSONResponse(status_code=500, content={"error": "Output file not found"})

        filename = os.path.basename(output_file)
        return FileResponse(
            path=output_file,
            media_type="audio/mpeg",
            filename=filename,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Content-Disposition",
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except subprocess.TimeoutExpired:
        return JSONResponse(status_code=408, content={"error": "Download timeout"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
