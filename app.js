/**
 * NOIR AUDIO & YOUTUBE NO ADS - Complete Application Logic
 * 100% Client-Side • Real Live YouTube Search • Pure Ad-Free Playback
 * v2.1 — Cobalt Download + Dynamic Invidious Search
 */

// App State
const state = {
  activeView: 'player', // 'player' | 'explore'
  currentVideoId: null,
  currentVideoUrl: '',
  videoTitle: '',
  videoAuthor: '',
  isPlaying: false,
  isMuted: false,
  volume: 100,
  duration: 0,
  currentTime: 0,
  playbackRate: 1.0,
  isLooping: false,
  activeMode: 'audio', // 'audio' | 'video'
  history: [],
  progressInterval: null,
  isDraggingProgress: false,
  lastSearchQuery: '',
};

// DOM Elements
const elements = {
  // Navigation
  headerBrandBtn: document.getElementById('header-brand-btn'),
  btnGotoPlayer: document.getElementById('btn-goto-player'),
  btnGotoExplore: document.getElementById('btn-goto-explore'),
  btnReturnPlayer: document.getElementById('btn-return-player'),
  pagePlayer: document.getElementById('page-player'),
  pageExplore: document.getElementById('page-explore'),

  // Player Page
  urlPlayerForm: document.getElementById('url-player-form'),
  playerUrlInput: document.getElementById('player-url-input'),
  pasteUrlBtn: document.getElementById('paste-url-btn'),
  clearUrlBtn: document.getElementById('clear-url-btn'),
  loadVideoBtn: document.getElementById('load-video-btn'),
  playerMasterCard: document.getElementById('player-master-card'),
  playerVideoTitle: document.getElementById('player-video-title'),
  playerVideoChannel: document.getElementById('player-video-channel'),
  playerVideoDuration: document.getElementById('player-video-duration'),
  playerThumbImg: document.getElementById('player-thumb-img'),
  tabModeAudio: document.getElementById('tab-mode-audio'),
  tabModeVideo: document.getElementById('tab-mode-video'),
  audioStageBox: document.getElementById('audio-stage-box'),
  videoStageBox: document.getElementById('video-stage-box'),
  vinylDiscWrap: document.getElementById('vinyl-disc-wrap'),
  waveformCanvas: document.getElementById('waveform-canvas'),
  ytPlayerSlot: document.getElementById('yt-player-slot'),

  // Controls
  currentTimeTxt: document.getElementById('current-time-txt'),
  totalDurationTxt: document.getElementById('total-duration-txt'),
  scrubberRail: document.getElementById('scrubber-rail'),
  scrubberFill: document.getElementById('scrubber-fill'),
  scrubberKnob: document.getElementById('scrubber-knob'),
  playToggleBtn: document.getElementById('play-toggle-btn'),
  rewindBtn: document.getElementById('rewind-btn'),
  forwardBtn: document.getElementById('forward-btn'),
  loopBtn: document.getElementById('loop-btn'),
  speedBtn: document.getElementById('speed-btn'),
  speedTxt: document.getElementById('speed-txt'),
  speedDropdown: document.getElementById('speed-dropdown'),
  muteBtn: document.getElementById('mute-btn'),
  volumeIcon: document.getElementById('volume-icon'),
  volumeSlider: document.getElementById('volume-slider'),

  // Download
  downloadMp3Btn: document.getElementById('download-mp3-btn'),
  downloadStatus: document.getElementById('download-status'),
  statusTitle: document.getElementById('status-title'),
  statusDesc: document.getElementById('status-desc'),

  // History
  historyGrid: document.getElementById('history-grid'),
  emptyHistoryMsg: document.getElementById('empty-history-msg'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),

  // Explore Page
  exploreSearchForm: document.getElementById('explore-search-form'),
  exploreSearchInput: document.getElementById('explore-search-input'),
  exploreFeedTitle: document.getElementById('explore-feed-title'),
  exploreLoadingIndicator: document.getElementById('explore-loading-indicator'),
  exploreCardsGrid: document.getElementById('explore-cards-grid'),
  catPills: document.querySelectorAll('.cat-pill'),
};

// Initialize Lucide Icons
function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Extract YouTube Video ID
function extractYouTubeId(url) {
  if (!url) return null;
  url = url.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

// Format Seconds to MM:SS or HH:MM:SS
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const paddedMins = String(mins).padStart(2, '0');
  const paddedSecs = String(secs).padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${paddedMins}:${paddedSecs}`;
}

// Format Relative Time
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'مؤخراً';
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'اليوم';
  if (days === 1) return 'أمس';
  if (days < 30) return `قبل ${days} أيام`;
  return `قبل شهر`;
}

// Switch Page View (Player vs Explorer)
function switchPageView(viewName) {
  state.activeView = viewName;

  if (viewName === 'player') {
    elements.btnGotoPlayer.classList.add('active');
    elements.btnGotoExplore.classList.remove('active');
    elements.pagePlayer.classList.remove('hidden');
    elements.pageExplore.classList.add('hidden');
  } else {
    elements.btnGotoExplore.classList.add('active');
    elements.btnGotoPlayer.classList.remove('active');
    elements.pageExplore.classList.remove('hidden');
    elements.pagePlayer.classList.add('hidden');

    if (!state.lastSearchQuery) {
      renderSearchPlaceholder();
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Render Initial Search Prompt (Zero Static Videos)
function renderSearchPlaceholder() {
  elements.exploreCardsGrid.innerHTML = `
    <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4.5rem 1.5rem; text-align: center; background-color: var(--bg-subtle); border: 2px dashed var(--border-medium); border-radius: var(--radius-xl); gap: 1rem; color: var(--text-secondary);">
      <div style="width: 58px; height: 58px; background-color: var(--accent-black); color: var(--accent-white); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="search" style="width: 26px; height: 26px;"></i>
      </div>
      <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">ابحث في يوتيوب مباشرة (بدون إعلانات)</h3>
      <p style="font-size: 0.9rem; max-width: 460px; line-height: 1.6;">اكتب اسم الفيديو أو الأغنية أو التلاوة في شريط البحث أعلاه لجلب نتائج البحث الحية من خوادم يوتيوب وتشغيلها بدون أي إعلانات.</p>
    </div>
  `;
  elements.exploreFeedTitle.textContent = 'تصفح يوتيوب المباشر (بدون إعلانات)';
  initIcons();
}

// PostMessage to IFrame
function postToIframe(command, args = []) {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    if (iframe.contentWindow) {
      const message = JSON.stringify({
        event: 'command',
        func: command,
        args: args,
      });
      iframe.contentWindow.postMessage(message, '*');
    }
  });
}

// Fetch Video Details
async function fetchVideoDetails(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;

  try {
    const res = await fetch(oembedUrl);
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    return {
      title: data.title || 'مقطع يوتيوب',
      author: data.author_name || 'قناة يوتيوب',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch (err) {
    return {
      title: `مقطع يوتيوب (${videoId})`,
      author: 'YouTube Video',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

// Setup Player Master IFrame
function setupPlayerIframe(videoId) {
  elements.ytPlayerSlot.innerHTML = '';

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&autoplay=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`;

  const masterIframe = document.createElement('iframe');
  masterIframe.id = 'yt-master-iframe';
  masterIframe.src = embedUrl;
  masterIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  masterIframe.allowFullscreen = true;
  
  elements.ytPlayerSlot.appendChild(masterIframe);

  state.isPlaying = false;
  updatePlayPauseUI(false);
  startProgressTimer();
  startVisualizer();
}

// Progress Timer
function startProgressTimer() {
  if (state.progressInterval) clearInterval(state.progressInterval);

  state.progressInterval = setInterval(() => {
    postToIframe('listening');

    if (state.isPlaying && !state.isDraggingProgress) {
      state.currentTime += 1 * state.playbackRate;
      if (state.duration > 0 && state.currentTime >= state.duration) {
        if (state.isLooping) {
          seekToTime(0);
        } else {
          state.isPlaying = false;
          updatePlayPauseUI(false);
        }
      }

      elements.currentTimeTxt.textContent = formatTime(state.currentTime);
      if (state.duration > 0) {
        const percent = Math.min(100, (state.currentTime / state.duration) * 100);
        elements.scrubberFill.style.width = `${percent}%`;
        elements.scrubberKnob.style.right = `${percent}%`;
      }
    }
  }, 1000);
}

// Handle YouTube State Messages
window.addEventListener('message', (event) => {
  try {
    let data = event.data;
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    if (data && data.event === 'onStateChange') {
      if (data.info === 1) {
        state.isPlaying = true;
        updatePlayPauseUI(true);
      } else if (data.info === 2) {
        state.isPlaying = false;
        updatePlayPauseUI(false);
      } else if (data.info === 0) {
        if (state.isLooping) {
          seekToTime(0);
        } else {
          state.isPlaying = false;
          updatePlayPauseUI(false);
        }
      }
    }

    if (data && data.info) {
      if (typeof data.info.duration === 'number' && data.info.duration > 0) {
        state.duration = data.info.duration;
        elements.totalDurationTxt.textContent = formatTime(state.duration);
        elements.playerVideoDuration.innerHTML = `<i data-lucide="clock"></i> ${formatTime(state.duration)}`;
        initIcons();
      }
      if (typeof data.info.currentTime === 'number' && !state.isDraggingProgress) {
        state.currentTime = data.info.currentTime;
        elements.currentTimeTxt.textContent = formatTime(state.currentTime);
        if (state.duration > 0) {
          const percent = (state.currentTime / state.duration) * 100;
          elements.scrubberFill.style.width = `${percent}%`;
          elements.scrubberKnob.style.right = `${percent}%`;
        }
      }
    }
  } catch (e) {}
});

// Update Play/Pause UI Button
function updatePlayPauseUI(isPlaying) {
  const btn = elements.playToggleBtn;
  if (!btn) return;

  if (isPlaying) {
    btn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
        <rect x="6" y="4" width="4" height="16" rx="1"></rect>
        <rect x="14" y="4" width="4" height="16" rx="1"></rect>
      </svg>
    `;
    btn.setAttribute('title', 'إيقاف مؤقت (مسافة)');
    elements.audioStageBox.classList.add('playing');
    document.body.classList.add('playing');
  } else {
    btn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" style="margin-left: 2px;">
        <polygon points="6 3 20 12 6 21 6 3"></polygon>
      </svg>
    `;
    btn.setAttribute('title', 'تشغيل (مسافة)');
    elements.audioStageBox.classList.remove('playing');
    document.body.classList.remove('playing');
  }
}

// Seek Function
function seekToTime(seconds) {
  state.currentTime = Math.max(0, Math.min(state.duration || 99999, seconds));
  postToIframe('seekTo', [state.currentTime, true]);
  elements.currentTimeTxt.textContent = formatTime(state.currentTime);

  if (state.duration > 0) {
    const percent = (state.currentTime / state.duration) * 100;
    elements.scrubberFill.style.width = `${percent}%`;
    elements.scrubberKnob.style.right = `${percent}%`;
  }
}

function seekRelative(deltaSeconds) {
  seekToTime(state.currentTime + deltaSeconds);
}

// Play / Pause Toggle
function togglePlayPause() {
  if (state.isPlaying) {
    postToIframe('pauseVideo');
    state.isPlaying = false;
    updatePlayPauseUI(false);
  } else {
    postToIframe('playVideo');
    state.isPlaying = true;
    updatePlayPauseUI(true);
  }
}

// Switch Mode (Audio vs Video Cinema)
function switchPlayerMode(mode) {
  state.activeMode = mode;

  if (mode === 'audio') {
    elements.tabModeAudio.classList.add('active');
    elements.tabModeVideo.classList.remove('active');
    elements.audioStageBox.classList.remove('hidden');
    elements.videoStageBox.classList.add('in-audio-mode');
  } else {
    elements.tabModeVideo.classList.add('active');
    elements.tabModeAudio.classList.remove('active');
    elements.audioStageBox.classList.add('hidden');
    elements.videoStageBox.classList.remove('in-audio-mode');
  }
}

// Canvas Waveform Visualizer
function startVisualizer() {
  const canvas = elements.waveformCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const barCount = 44;
  let phase = 0;

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / barCount) - 3;
    const centerY = canvas.height / 2;

    for (let i = 0; i < barCount; i++) {
      let height = 6;
      if (state.isPlaying) {
        const wave1 = Math.sin(phase + i * 0.28) * 0.5 + 0.5;
        const wave2 = Math.cos(phase * 0.85 + i * 0.18) * 0.5 + 0.5;
        height = (wave1 * wave2 * (canvas.height - 10)) + 6;
      }

      const x = i * (barWidth + 3);
      const y = centerY - height / 2;

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, height, 3);
      ctx.fill();
    }

    if (state.isPlaying) {
      phase += 0.08 * state.playbackRate;
    }
    requestAnimationFrame(render);
  }

  render();
}

// Load Video Flow
async function handleLoadVideo(urlOrId) {
  const videoId = extractYouTubeId(urlOrId);

  if (!videoId) {
    alert('يرجى إدخال رابط فيديو يوتيوب أو Shorts صحيح!');
    return;
  }

  // Switch to Player View
  switchPageView('player');

  state.currentVideoId = videoId;
  state.currentVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  state.currentTime = 0;

  try {
    const details = await fetchVideoDetails(videoId);
    state.videoTitle = details.title;
    state.videoAuthor = details.author;

    // Update Player UI
    elements.playerVideoTitle.textContent = details.title;
    elements.playerVideoChannel.innerHTML = `<i data-lucide="user"></i> ${details.author}`;
    elements.playerThumbImg.src = details.thumbnail;
    elements.playerMasterCard.classList.remove('hidden');

    // Save to History
    addToHistory({
      id: videoId,
      url: state.currentVideoUrl,
      title: details.title,
      author: details.author,
      thumbnail: details.thumbnail,
      timestamp: Date.now(),
    });

    // Mount player in paused state
    setupPlayerIframe(videoId);
    switchPlayerMode('audio');

    // Scroll to player
    elements.playerMasterCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error('Error loading:', err);
  } finally {
    initIcons();
  }
}

// Scrubber Interaction Setup
function setupScrubber() {
  const container = elements.scrubberRail;

  function seekFromEvent(e) {
    if (!state.duration) return;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = 1 - Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = percent * state.duration;

    seekToTime(targetSeconds);
  }

  container.addEventListener('mousedown', (e) => {
    state.isDraggingProgress = true;
    seekFromEvent(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (state.isDraggingProgress) seekFromEvent(e);
  });

  window.addEventListener('mouseup', () => {
    state.isDraggingProgress = false;
  });
}

// ─── YOUR YT-DLP API SERVER ─────────────────────────
// ضع رابط السيرفر بتاعك هنا بعد الرفع على HuggingFace/Render/Railway
const YTDLP_API = 'https://yousef891238-088098.hf.space';

async function tryDownloadViaCobalt(videoId) {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    const audioEndpoint = `${YTDLP_API}/audio?url=${encodeURIComponent(ytUrl)}`;
    const res = await fetch(audioEndpoint, { method: 'HEAD', signal: controller.signal });
    clearTimeout(tid);
    if (res.ok) return audioEndpoint;
  } catch (e) {}
  return null;
}


function setupDownloadHandlers() {
  const btn = elements.downloadMp3Btn;
  const statusBox = elements.downloadStatus;
  const statusTitle = elements.statusTitle;
  const statusDesc = elements.statusDesc;

  btn.addEventListener('click', async () => {
    if (!state.currentVideoId) {
      alert('يرجى تشغيل فيديو أولاً للتمكن من تحميل الصوت!');
      return;
    }

    const videoId = state.currentVideoId;
    const safeTitle = (state.videoTitle || 'youtube_audio').replace(/[\/\\?%*:|"<>]/g, '_');

    statusBox.classList.remove('hidden');
    statusTitle.textContent = '⚡ جاري استخراج الصوت...';
    statusDesc.textContent = 'يتم البحث عن أفضل خادم متاح للتحميل المباشر...';
    btn.disabled = true;

    const audioUrl = await tryDownloadViaCobalt(videoId);

    if (audioUrl) {
      statusTitle.textContent = '🎉 بدأ التنزيل المباشر على جهازك!';
      statusDesc.textContent = 'تجد المقطع الصوتي في مجلد التنزيلات (Downloads) بجهازك.';

      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = audioUrl;
      a.setAttribute('download', `${safeTitle}.mp3`);
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 1000);
    } else {
      statusTitle.textContent = '⚠️ تعذّر التحميل حالياً';
      statusDesc.textContent = 'الخوادم المتاحة لا تستجيب حالياً. المشغل يعمل بشكل كامل بدون إعلانات — يمكنك الاستماع مباشرة.';
    }

    setTimeout(() => {
      btn.disabled = false;
      statusBox.classList.add('hidden');
    }, 5000);
  });
}

// =========================================================================
// REAL LIVE YOUTUBE SEARCH — Multi-Proxy (Invidious via CORS)
// Strategy: fetch healthiest Invidious instances dynamically, then search
// =========================================================================
// Verified working CORS proxies (checked 2026-08-28)
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?url=',
  'https://cors.sh/?',
];

// Dynamically get a live Invidious instance with CORS enabled
async function getWorkingInvidiousInstance() {
  // Request the official instance list and filter for API+CORS enabled
  for (const proxy of CORS_PROXIES) {
    try {
      const instancesUrl = 'https://api.invidious.io/instances.json?sort_by=health';
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(proxy + encodeURIComponent(instancesUrl), { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data)) continue;
      // Find first instance that has api=true AND cors=true
      for (const [domain, info] of data) {
        if (info && info.api === true && info.cors === true && info.type === 'https') {
          return info.uri || `https://${domain}`;
        }
      }
    } catch (e) {}
  }
  return null;
}

async function searchLiveYouTube(query) {
  if (!query || query === 'الكل') {
    renderSearchPlaceholder();
    return;
  }

  state.lastSearchQuery = query;
  elements.exploreLoadingIndicator.classList.remove('hidden');
  elements.exploreCardsGrid.innerHTML = '';
  elements.exploreFeedTitle.textContent = `نتائج البحث المباشر عن: "${query}"`;

  let videos = [];

  // STEP 1: Try fetching healthiest CORS-enabled Invidious instance dynamically
  const instance = await getWorkingInvidiousInstance();
  if (instance) {
    try {
      const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(searchUrl, { signal: controller.signal });
      clearTimeout(tid);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          videos = data.filter(item => item.videoId && item.title).map(item => ({
            id: item.videoId,
            title: item.title,
            author: item.author || 'قناة يوتيوب',
            durationText: formatTime(item.lengthSeconds || 0),
            viewsText: item.viewCountText || (item.viewCount ? `${(item.viewCount / 1000).toFixed(0)}K مشاهدة` : 'مشاهدات'),
            publishedText: item.publishedText || 'مؤخراً',
            thumbnail: (item.videoThumbnails && item.videoThumbnails[0])
              ? item.videoThumbnails[0].url
              : `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
          }));
        }
      }
    } catch (e) {}
  }

  // STEP 2: Fallback — try scraping YouTube HTML via any available CORS proxy
  if (videos.length === 0) {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=ar`;
    for (const proxy of CORS_PROXIES) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(proxy + encodeURIComponent(ytUrl), { signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok) continue;

        const html = await res.text();
        // Extract ytInitialData from raw HTML
        const jsonMatch = html.match(/ytInitialData\s*=\s*(\{.+?\});(?:\s*<\/script>|\s*window\[)/s) ||
                          html.match(/var ytInitialData\s*=\s*(\{.+?\});/s);
        if (!jsonMatch) continue;

        const ytData = JSON.parse(jsonMatch[1]);
        const sections = ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        if (!sections) continue;

        for (const section of sections) {
          const items = section?.itemSectionRenderer?.contents;
          if (!items) continue;
          for (const item of items) {
            const vr = item?.videoRenderer;
            if (!vr?.videoId || !vr.title) continue;
            const titleText = vr.title?.runs?.map(r => r.text).join('') || vr.title?.simpleText || 'مقطع يوتيوب';
            const authorText = vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || 'قناة يوتيوب';
            const durationText = vr.lengthText?.simpleText || '00:00';
            const viewsText = vr.shortViewCountText?.simpleText || vr.viewCountText?.simpleText || 'مشاهدات';
            const publishedText = vr.publishedTimeText?.simpleText || 'مؤخراً';
            const thumbs = vr.thumbnail?.thumbnails || [];
            const thumbUrl = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;

            videos.push({
              id: vr.videoId,
              title: titleText,
              author: authorText,
              durationText,
              viewsText,
              publishedText,
              thumbnail: thumbUrl.startsWith('//') ? 'https:' + thumbUrl : thumbUrl,
            });
          }
        }
        if (videos.length > 0) break;
      } catch (e) {}
    }
  }

  // Show results or error state
  if (videos.length === 0) {
    elements.exploreCardsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 1.5rem; text-align: center; background-color: var(--bg-subtle); border: 2px dashed var(--border-medium); border-radius: var(--radius-xl); gap: 0.85rem; color: var(--text-secondary);">
        <i data-lucide="info" style="width: 32px; height: 32px;"></i>
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">لم نتمكن من جلب نتائج لكلمة "${query}"</h3>
        <p style="font-size: 0.85rem;">يرجى تجربة كلمة بحث أخرى أو لصق رابط الفيديو مباشرة في المشغل.</p>
      </div>
    `;
  } else {
    renderExploreCards(videos);
  }

  elements.exploreLoadingIndicator.classList.add('hidden');
  initIcons();
}

function renderExploreCards(videos) {
  elements.exploreCardsGrid.innerHTML = '';

  videos.forEach(video => {
    const card = document.createElement('div');
    card.className = 'yt-card';

    const firstLetter = (video.author || 'Y').charAt(0).toUpperCase();

    card.innerHTML = `
      <div class="yt-thumb-box">
        <img src="${video.thumbnail}" alt="${video.title}" class="yt-thumb-img" loading="lazy">
        <span class="yt-card-duration">${video.durationText || '00:00'}</span>
        <div class="yt-hover-overlay">
          <div class="yt-play-btn-circle"><i data-lucide="play"></i></div>
        </div>
      </div>
      <div class="yt-card-details">
        <div class="yt-channel-avatar">${firstLetter}</div>
        <div class="yt-card-text">
          <h4 class="yt-video-name" title="${video.title}">${video.title}</h4>
          <span class="yt-channel-name">${video.author}</span>
          <span class="yt-card-submeta">${video.viewsText} • ${video.publishedText}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      elements.playerUrlInput.value = `https://www.youtube.com/watch?v=${video.id}`;
      elements.clearUrlBtn.classList.remove('hidden');
      handleLoadVideo(video.id);
    });

    elements.exploreCardsGrid.appendChild(card);
  });

  initIcons();
}

// History Manager
function loadHistory() {
  try {
    const saved = localStorage.getItem('noir_audio_history');
    state.history = saved ? JSON.parse(saved) : [];
  } catch (e) {
    state.history = [];
  }
  renderHistoryGrid();
}

function addToHistory(item) {
  state.history = state.history.filter(h => h.id !== item.id);
  state.history.unshift(item);
  if (state.history.length > 20) state.history.pop();

  try {
    localStorage.setItem('noir_audio_history', JSON.stringify(state.history));
  } catch (e) {}
  renderHistoryGrid();
}

function clearHistory() {
  state.history = [];
  try {
    localStorage.removeItem('noir_audio_history');
  } catch (e) {}
  renderHistoryGrid();
}

function renderHistoryGrid() {
  elements.historyGrid.innerHTML = '';

  if (state.history.length === 0) {
    elements.emptyHistoryMsg.classList.remove('hidden');
    elements.historyGrid.appendChild(elements.emptyHistoryMsg);
    return;
  }

  elements.emptyHistoryMsg.classList.add('hidden');

  state.history.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-card-item';

    card.innerHTML = `
      <div class="hist-thumb-wrap">
        <img src="${item.thumbnail}" alt="${item.title}" class="hist-thumb" loading="lazy">
      </div>
      <div class="hist-texts">
        <h4 class="hist-title" title="${item.title}">${item.title}</h4>
        <span class="hist-channel">${item.author}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      elements.playerUrlInput.value = item.url;
      elements.clearUrlBtn.classList.remove('hidden');
      handleLoadVideo(item.id);
    });

    elements.historyGrid.appendChild(card);
  });

  initIcons();
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      seekRelative(10);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      seekRelative(-10);
    } else if (e.code === 'ArrowUp') {
      e.preventDefault();
      setVolume(state.volume + 5);
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      setVolume(state.volume - 5);
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      toggleMute();
    } else if (e.code === 'KeyL') {
      e.preventDefault();
      toggleLoop();
    }
  });
}

function toggleLoop() {
  state.isLooping = !state.isLooping;
  if (state.isLooping) {
    elements.loopBtn.classList.add('active');
  } else {
    elements.loopBtn.classList.remove('active');
  }
}

// Volume Controls
function setVolume(vol) {
  state.volume = Math.max(0, Math.min(100, vol));
  elements.volumeSlider.value = state.volume;

  if (state.isMuted || state.volume === 0) {
    postToIframe('mute');
    elements.volumeIcon.setAttribute('data-lucide', 'volume-x');
  } else {
    postToIframe('unMute');
    postToIframe('setVolume', [state.volume]);
    if (state.volume > 50) {
      elements.volumeIcon.setAttribute('data-lucide', 'volume-2');
    } else {
      elements.volumeIcon.setAttribute('data-lucide', 'volume-1');
    }
  }
  initIcons();
}

function toggleMute() {
  state.isMuted = !state.isMuted;
  setVolume(state.volume);
  if (state.isMuted) {
    elements.muteBtn.classList.add('active');
  } else {
    elements.muteBtn.classList.remove('active');
  }
}

// Initialize All Event Listeners
function initEvents() {
  // Brand Header Click -> Player View
  elements.headerBrandBtn.addEventListener('click', () => switchPageView('player'));

  // Top Nav Switcher Buttons
  elements.btnGotoPlayer.addEventListener('click', () => switchPageView('player'));
  elements.btnGotoExplore.addEventListener('click', () => switchPageView('explore'));
  elements.btnReturnPlayer.addEventListener('click', () => switchPageView('player'));

  // Player URL Form
  elements.urlPlayerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = elements.playerUrlInput.value.trim();
    if (url) handleLoadVideo(url);
  });

  // Paste from clipboard
  elements.pasteUrlBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        elements.playerUrlInput.value = text;
        elements.clearUrlBtn.classList.remove('hidden');
        handleLoadVideo(text);
      }
    } catch (err) {
      elements.playerUrlInput.focus();
    }
  });

  // Clear URL Input
  elements.playerUrlInput.addEventListener('input', () => {
    if (elements.playerUrlInput.value.length > 0) {
      elements.clearUrlBtn.classList.remove('hidden');
    } else {
      elements.clearUrlBtn.classList.add('hidden');
    }
  });

  elements.clearUrlBtn.addEventListener('click', () => {
    elements.playerUrlInput.value = '';
    elements.clearUrlBtn.classList.add('hidden');
    elements.playerUrlInput.focus();
  });

  // Explore Search Form (Pure Dynamic Search)
  elements.exploreSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = elements.exploreSearchInput.value.trim();
    if (query) {
      const id = extractYouTubeId(query);
      if (id) {
        handleLoadVideo(query);
      } else {
        searchLiveYouTube(query);
      }
    }
  });

  // Category Pills (Trigger Dynamic Live Search)
  elements.catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      elements.catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const q = pill.getAttribute('data-query');
      if (q === 'الكل') {
        renderSearchPlaceholder();
      } else {
        elements.exploreSearchInput.value = q;
        searchLiveYouTube(q);
      }
    });
  });

  // Player Mode Tabs (Audio vs Cinema Video)
  elements.tabModeAudio.addEventListener('click', () => switchPlayerMode('audio'));
  elements.tabModeVideo.addEventListener('click', () => switchPlayerMode('video'));

  // Playback Controls
  elements.playToggleBtn.addEventListener('click', togglePlayPause);
  
  if (elements.vinylDiscWrap) {
    elements.vinylDiscWrap.addEventListener('click', togglePlayPause);
  }

  elements.rewindBtn.addEventListener('click', () => seekRelative(-10));
  elements.forwardBtn.addEventListener('click', () => seekRelative(10));
  elements.loopBtn.addEventListener('click', toggleLoop);

  // Speed Selector
  elements.speedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.speedDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    elements.speedDropdown.classList.add('hidden');
  });

  elements.speedDropdown.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const rate = parseFloat(btn.getAttribute('data-speed'));
      state.playbackRate = rate;
      postToIframe('setPlaybackRate', [rate]);
      elements.speedTxt.textContent = `${rate}x`;
      elements.speedDropdown.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Volume
  elements.muteBtn.addEventListener('click', toggleMute);
  elements.volumeSlider.addEventListener('input', (e) => {
    state.isMuted = false;
    elements.muteBtn.classList.remove('active');
    setVolume(parseInt(e.target.value, 10));
  });

  // Clear History
  elements.clearHistoryBtn.addEventListener('click', clearHistory);

  // Initialize Submodules
  setupScrubber();
  setupDownloadHandlers();
  setupKeyboardShortcuts();
}

// App Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initEvents();
  loadHistory();
  switchPageView('player');
});
