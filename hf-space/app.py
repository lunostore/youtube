"""
YouTube Audio Download API
- yt-dlp + FastAPI
- CORS مفتوح لأي origin
- جاهز للرفع على: HuggingFace, Render, Railway, Fly.io
"""

import subprocess, os, uuid, asyncio, glob
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="YouTube Audio API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_DIR = "/tmp/ytaudio"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Auto-clean files older than 10 minutes on each request
def auto_clean():
    import time
    now = time.time()
    for f in glob.glob(f"{DOWNLOAD_DIR}/*"):
        try:
            if os.path.getmtime(f) < now - 600:
                os.remove(f)
        except:
            pass

@app.get("/")
def root():
    return {
        "status": "online",
        "name": "YouTube Audio API",
        "endpoints": {
            "GET /audio?url=YOUTUBE_URL": "Download YouTube audio as MP3",
            "GET /info?url=YOUTUBE_URL": "Get video info (title, duration, channel)",
            "GET /health": "Health check"
        }
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/info")
def get_info(url: str = Query(..., description="YouTube video URL")):
    """Get video metadata without downloading"""
    try:
        result = subprocess.run(
            [
                "yt-dlp",
                "--print", "%(title)s",
                "--print", "%(duration)s",
                "--print", "%(uploader)s",
                "--no-playlist",
                "--no-warnings",
                url
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            return JSONResponse(status_code=400, content={
                "error": "Could not fetch video info",
                "detail": result.stderr[:200]
            })

        lines = result.stdout.strip().split("\n")
        return {
            "title": lines[0] if len(lines) > 0 else "Unknown",
            "duration": int(lines[1]) if len(lines) > 1 and lines[1].isdigit() else 0,
            "uploader": lines[2] if len(lines) > 2 else "Unknown",
            "url": url
        }
    except subprocess.TimeoutExpired:
        return JSONResponse(status_code=408, content={"error": "Request timeout"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/audio")
def download_audio(url: str = Query(..., description="YouTube video URL")):
    """Download YouTube audio as MP3 file"""
    auto_clean()

    file_id = str(uuid.uuid4())[:8]
    out_template = f"{DOWNLOAD_DIR}/{file_id}.%(ext)s"
    final_mp3 = f"{DOWNLOAD_DIR}/{file_id}.mp3"

    try:
        result = subprocess.run(
            [
                "yt-dlp",
                "--extract-audio",
                "--audio-format", "mp3",
                "--audio-quality", "128K",
                "--no-playlist",
                "--no-warnings",
                "--output", out_template,
                url
            ],
            capture_output=True,
            text=True,
            timeout=180,
        )

        if result.returncode != 0:
            return JSONResponse(status_code=400, content={
                "error": "Download failed",
                "detail": result.stderr[:300]
            })

        # Find the output file
        output_file = final_mp3
        if not os.path.exists(output_file):
            files = glob.glob(f"{DOWNLOAD_DIR}/{file_id}.*")
            if files:
                output_file = files[0]
            else:
                return JSONResponse(status_code=500, content={"error": "Output file not found"})

        return FileResponse(
            path=output_file,
            media_type="audio/mpeg",
            filename="audio.mp3",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Content-Disposition": "attachment; filename=audio.mp3"
            }
        )

    except subprocess.TimeoutExpired:
        return JSONResponse(status_code=408, content={"error": "Download timeout (video too long)"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
