let currentMode = 'lift';
let liftPlayer = null;
let cardioPlayer = null;
let progressInterval = null;
let liftQueue = [];
let liftIndex = -1;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateHint();

  document.getElementById('progress-bar').addEventListener('click', function(e) {
    if (!liftPlayer || !liftPlayer.getDuration) return;
    const rect = this.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    liftPlayer.seekTo(pct * liftPlayer.getDuration(), true);
  });
});

function onYouTubeIframeAPIReady() {}

// ── Mode switching ────────────────────────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  document.getElementById('btn-lift').classList.toggle('active', mode === 'lift');
  document.getElementById('btn-cardio').classList.toggle('active', mode === 'cardio');
  document.getElementById('lift-player').classList.toggle('hidden', mode === 'cardio');
  document.getElementById('cardio-player').classList.toggle('hidden', mode === 'lift');
  document.getElementById('results-grid').classList.add('hidden');

  document.getElementById('search-input').placeholder = mode === 'cardio'
    ? 'Search YouTube for cardio motivation...'
    : 'Search music...';

  updateHint();

  if (mode === 'cardio' && liftPlayer && liftPlayer.pauseVideo) {
    liftPlayer.pauseVideo();
    stopProgress();
  }
  if (mode === 'lift' && cardioPlayer && cardioPlayer.pauseVideo) cardioPlayer.pauseVideo();
}

function updateHint() {
  document.getElementById('search-hint').textContent = currentMode === 'cardio'
    ? 'Search any video on YouTube'
    : 'Search music on YouTube';
}

// ── Search ────────────────────────────────────────────────────────────────────
function triggerSearch() {
  const raw = document.getElementById('search-input').value.trim();
  if (!raw) return;
  const query = currentMode === 'lift' ? `${raw} music` : raw;
  fetchResults(query);
}

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') triggerSearch();
});

async function fetchResults(query) {
  const grid = document.getElementById('results-grid');
  grid.innerHTML = '<p style="color:var(--muted);padding:16px;grid-column:1/-1">Searching...</p>';
  grid.classList.remove('hidden');
  try {
    const resp = await fetch(`/api/search-youtube?q=${encodeURIComponent(query)}`);
    const data = await resp.json();
    if (data.error) {
      grid.innerHTML = `<p style="color:var(--muted);padding:16px;grid-column:1/-1">Error: ${data.error}</p>`;
      return;
    }
    currentMode === 'lift' ? renderLiftResults(data.results) : renderCardioResults(data.results);
  } catch {
    grid.innerHTML = `<p style="color:var(--muted);padding:16px;grid-column:1/-1">Something went wrong.</p>`;
  }
}

// ── Lift: music list ──────────────────────────────────────────────────────────
function renderLiftResults(results) {
  const grid = document.getElementById('results-grid');
  if (!results.length) { grid.innerHTML = '<p style="color:var(--muted);padding:16px;grid-column:1/-1">No results.</p>'; return; }
  liftQueue = results;
  grid.className = 'results-list';
  grid.innerHTML = results.map((r, i) => `
    <div class="music-row" id="music-row-${i}" onclick="playLiftIndex(${i})">
      <img class="music-thumb" src="${r.thumbnail}" alt=""/>
      <div class="music-info">
        <div class="music-title">${r.title}</div>
        <div class="music-channel">${r.channel}</div>
      </div>
      <div class="music-play">▶</div>
    </div>`).join('');
}

function playLiftIndex(i) {
  if (i < 0 || i >= liftQueue.length) return;
  liftIndex = i;

  // Highlight active row
  document.querySelectorAll('.music-row').forEach((el, idx) => {
    el.classList.toggle('active', idx === i);
  });

  const r = liftQueue[i];
  document.getElementById('lift-idle').classList.add('hidden');
  document.getElementById('lift-now-playing').classList.remove('hidden');
  document.getElementById('lift-title').textContent = r.title;
  document.getElementById('lift-channel').textContent = r.channel;
  document.getElementById('lift-album-art').style.backgroundImage = `url(${r.thumbnail})`;
  updatePlayPauseBtn(true);
  resetProgress();

  if (!liftPlayer) {
    liftPlayer = new YT.Player('lift-yt-player', {
      height: '1', width: '1',
      videoId: r.videoId,
      playerVars: { autoplay: 1 },
      events: {
        onReady: (e) => { e.target.playVideo(); startProgress(); },
        onStateChange: onLiftStateChange,
      }
    });
  } else {
    liftPlayer.loadVideoById(r.videoId);
    startProgress();
  }
}

function onLiftStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    updatePlayPauseBtn(true);
    startProgress();
  } else if (e.data === YT.PlayerState.PAUSED) {
    updatePlayPauseBtn(false);
    stopProgress();
  } else if (e.data === YT.PlayerState.ENDED) {
    playNext();
  }
}

// ── Controls ──────────────────────────────────────────────────────────────────
function togglePlayPause() {
  if (!liftPlayer) return;
  const state = liftPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    liftPlayer.pauseVideo();
  } else {
    liftPlayer.playVideo();
  }
}

function playPrev() {
  if (liftIndex > 0) playLiftIndex(liftIndex - 1);
}

function playNext() {
  if (liftIndex < liftQueue.length - 1) playLiftIndex(liftIndex + 1);
}

function updatePlayPauseBtn(playing) {
  document.getElementById('play-pause-btn').textContent = playing ? '⏸' : '▶';
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function startProgress() {
  stopProgress();
  progressInterval = setInterval(() => {
    if (!liftPlayer || !liftPlayer.getDuration) return;
    const current = liftPlayer.getCurrentTime() || 0;
    const total   = liftPlayer.getDuration() || 1;
    const pct = (current / total) * 100;
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('time-current').textContent = formatTime(current);
    document.getElementById('time-total').textContent   = formatTime(total);
  }, 500);
}

function stopProgress() {
  clearInterval(progressInterval);
  progressInterval = null;
}

function resetProgress() {
  document.getElementById('progress-fill').style.width = '0%';
  document.getElementById('time-current').textContent = '0:00';
  document.getElementById('time-total').textContent   = '0:00';
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ── Cardio: video grid ────────────────────────────────────────────────────────
function renderCardioResults(results) {
  const grid = document.getElementById('results-grid');
  if (!results.length) { grid.innerHTML = '<p style="color:var(--muted);padding:16px;grid-column:1/-1">No results.</p>'; return; }
  window._cardioResults = results;
  grid.className = 'results-grid';
  grid.innerHTML = results.map((r, i) => `
    <div class="result-card" onclick="playCardio(_cardioResults[${i}])">
      <div class="thumb-wrap">
        <img src="${r.thumbnail}" alt="" loading="lazy"/>
        <div class="play-overlay"><div class="play-btn">▶</div></div>
      </div>
      <div class="card-info">
        <div class="card-title">${r.title}</div>
        <div class="card-channel">${r.channel}</div>
      </div>
    </div>`).join('');
}

function playCardio(r) {
  window._cardioCurrentId = r.videoId;

  // Highlight active card
  document.querySelectorAll('.result-card').forEach((el, idx) => {
    el.classList.toggle('active', window._cardioResults[idx]?.videoId === r.videoId);
  });

  if (!cardioPlayer) {
    cardioPlayer = new YT.Player('yt-player', {
      height: '400', width: '100%',
      videoId: r.videoId,
      playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
      events: { onStateChange: onCardioStateChange }
    });
  } else {
    cardioPlayer.loadVideoById(r.videoId);
  }
  document.getElementById('now-playing-yt').innerHTML =
    `<span class="now-playing-dot"></span>▶ ${r.title} — ${r.channel}`;
}

function onCardioStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    updateCardioPlayPauseBtn(true);
  } else if (e.data === YT.PlayerState.PAUSED) {
    updateCardioPlayPauseBtn(false);
  } else if (e.data === YT.PlayerState.ENDED) {
    cardioNext();
  }
}

function toggleCardioPlayPause() {
  if (!cardioPlayer) return;
  const state = cardioPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    cardioPlayer.pauseVideo();
  } else {
    cardioPlayer.playVideo();
  }
}

function updateCardioPlayPauseBtn(playing) {
  document.getElementById('cardio-play-pause-btn').textContent = playing ? '⏸' : '▶';
}

function cardioPrev() {
  if (!window._cardioResults) return;
  const idx = window._cardioResults.findIndex(r => r.videoId === window._cardioCurrentId);
  if (idx > 0) playCardio(window._cardioResults[idx - 1]);
}

function cardioNext() {
  if (!window._cardioResults) return;
  const current = window._cardioResults.findIndex(r => r.videoId === window._cardioCurrentId);
  const next = current + 1;
  if (next < window._cardioResults.length) playCardio(window._cardioResults[next]);
}