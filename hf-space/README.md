---
title: YouTube Audio API
emoji: 🎵
colorFrom: red
colorTo: black
sdk: docker
pinned: false
license: mit
short_description: yt-dlp API for MP3 download with full CORS
---

# YouTube Audio Download API

Free, open-source API powered by `yt-dlp` + FastAPI. No API key needed.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info |
| GET | `/health` | Health check |
| GET | `/info?url=...` | Get video title, duration, channel |
| GET | `/audio?url=...` | Download audio as MP3 |

## Usage Example

```javascript
// In your browser JavaScript:
const videoUrl = 'https://www.youtube.com/watch?v=VIDEO_ID';
const apiBase = 'https://YOUR-SPACE.hf.space';

// Get video info
const info = await fetch(`${apiBase}/info?url=${encodeURIComponent(videoUrl)}`).then(r => r.json());
console.log(info.title); // Video title

// Download MP3
const a = document.createElement('a');
a.href = `${apiBase}/audio?url=${encodeURIComponent(videoUrl)}`;
a.download = `${info.title}.mp3`;
a.click();
```

## Deploy on HuggingFace

1. Create new Space → Docker
2. Upload these files: `app.py`, `requirements.txt`, `Dockerfile`
3. Done!
