// Grace Flow — Stage & Projection Output Logic

let currentState = {
  mode: 'digital',
  status: 'stopped',
  durationSeconds: 1800,
  remainingSeconds: 1800,
  title: 'Opening Prayer',
  stageMessage: '',
  stageMessageVisible: false,
  stageMessageFlash: false,
  blackout: false
};

// Check URL Params
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('transparent') === 'true' || urlParams.get('alpha') === '1') {
  document.body.classList.add('transparent-mode');
}
if (urlParams.get('preview') === 'true') {
  document.body.classList.add('preview-mode');
}

// DOM Elements
const perimeterBorder = document.getElementById('perimeterBorder');
const stageHeader = document.getElementById('stageHeader');
const stageItemTitle = document.getElementById('stageItemTitle');

const digitalView = document.getElementById('digitalView');
const analogView = document.getElementById('analogView');
const clockTimeView = document.getElementById('clockTimeView');

const digitalDigits = document.getElementById('digitalDigits');
const ringProgress = document.getElementById('ringProgress');
const analogDigits = document.getElementById('analogDigits');
const analogItemTitle = document.getElementById('analogItemTitle');

const wallClockTime = document.getElementById('wallClockTime');
const wallClockAmPm = document.getElementById('wallClockAmPm');
const wallClockDate = document.getElementById('wallClockDate');

const timesUpBanner = document.getElementById('timesUpBanner');
const stageMessageOverlay = document.getElementById('stageMessageOverlay');
const stageMessageText = document.getElementById('stageMessageText');
const btnToggleFullscreen = document.getElementById('btnToggleFullscreen');

// Ring circumference for r=215: 2 * Math.PI * 215 = ~1350.88
const RING_CIRCUMFERENCE = 2 * Math.PI * 215;
if (ringProgress) {
  ringProgress.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
  ringProgress.style.strokeDashoffset = '0';
}

// Time Formatter
function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Real-Time Clock Loop (for Normal Clock View ONLY)
function updateClockTick() {
  if (currentState.mode === 'clock') {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    if (wallClockTime) {
      wallClockTime.textContent = `${displayHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    if (wallClockAmPm) {
      wallClockAmPm.textContent = ampm;
    }
    if (wallClockDate) {
      const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
      wallClockDate.textContent = now.toLocaleDateString(undefined, options);
    }
  }
  requestAnimationFrame(updateClockTick);
}
requestAnimationFrame(updateClockTick);

// Update Stage Display with State
function renderStage(state) {
  currentState = { ...currentState, ...state };

  // Set mode classes on body for precise CSS layout control
  document.body.classList.toggle('mode-analog', state.mode === 'analog');
  document.body.classList.toggle('mode-digital', state.mode === 'digital');
  document.body.classList.toggle('mode-clock', state.mode === 'clock');

  // 1. Title (Empty title stays empty)
  const titleText = (state.title || '').trim();
  stageItemTitle.textContent = titleText;
  if (analogItemTitle) {
    if (titleText) {
      analogItemTitle.textContent = titleText.toUpperCase();
      analogItemTitle.style.display = 'block';
    } else {
      analogItemTitle.textContent = '';
      analogItemTitle.style.display = 'none';
    }
  }

  // 2. Mode Views
  digitalView.classList.toggle('active', state.mode === 'digital');
  analogView.classList.toggle('active', state.mode === 'analog');
  clockTimeView.classList.toggle('active', state.mode === 'clock');

  // Hide header in analog mode or if no title
  if (stageHeader) {
    if (state.mode === 'analog' || !titleText) {
      stageHeader.classList.add('hidden-header');
    } else {
      stageHeader.classList.remove('hidden-header');
    }
  }

  // 3. Time Digits
  const formatted = formatTime(state.remainingSeconds);
  digitalDigits.textContent = formatted;
  if (analogDigits) {
    analogDigits.textContent = formatted;
    analogDigits.classList.toggle('digits-long', formatted.length > 5);
  }

  // 4. Progress & Ring Calculation
  const total = Math.max(1, state.durationSeconds);
  const remaining = state.remainingSeconds;
  const pct = Math.min(1, Math.max(0, remaining / total));

  if (ringProgress) {
    const offset = RING_CIRCUMFERENCE * (1 - pct);
    ringProgress.style.strokeDashoffset = `${offset}`;
  }

  // Check if expired / TIME'S UP
  const isTimesUp = state.status === 'ended' || (remaining <= 0 && state.status === 'running');

  if (isTimesUp) {
    timesUpBanner.classList.remove('hidden');
    perimeterBorder.className = 'perimeter-border border-times-up';
    if (ringProgress) {
      ringProgress.className.baseVal = 'ring-progress ring-red';
    }
    digitalDigits.className = 'digital-digits digits-red';
  } else {
    timesUpBanner.classList.add('hidden');

    const isRed = remaining <= (state.criticalThresholdSec || 60) || pct <= 0.05;
    const isAmber = remaining <= (state.warningThresholdSec || 300) || pct <= 0.20;

    if (isRed) {
      perimeterBorder.className = 'perimeter-border border-red';
      if (ringProgress) ringProgress.className.baseVal = 'ring-progress ring-red';
      digitalDigits.className = 'digital-digits digits-red';
    } else if (isAmber) {
      perimeterBorder.className = 'perimeter-border border-amber';
      if (ringProgress) ringProgress.className.baseVal = 'ring-progress ring-amber';
      digitalDigits.className = 'digital-digits digits-amber';
    } else {
      perimeterBorder.className = 'perimeter-border border-green';
      if (ringProgress) ringProgress.className.baseVal = 'ring-progress ring-purple';
      digitalDigits.className = 'digital-digits digits-green';
    }
  }

  // 5. Stage Message / Alert Overlay
  if (state.stageMessageVisible && state.stageMessage && state.stageMessage.trim() !== '') {
    stageMessageText.textContent = state.stageMessage;
    stageMessageOverlay.classList.remove('hidden');
    stageMessageOverlay.classList.toggle('flash-pulse', !!state.stageMessageFlash);
  } else {
    stageMessageOverlay.classList.add('hidden');
  }

  // 6. Blackout
  document.body.classList.toggle('blackout', !!state.blackout);
}

// Connect to Server-Sent Events (SSE)
function setupStageSSE() {
  const eventSource = new EventSource('/api/events');

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'TIMER_STATE') {
        renderStage(data.payload);
      }
    } catch (e) {
      console.error('SSE error:', e);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    setTimeout(setupStageSSE, 2000);
  };
}

// BroadcastChannel sync
if (typeof BroadcastChannel !== 'undefined') {
  const bc = new BroadcastChannel('grace_flow_channel');
  bc.onmessage = (e) => {
    if (e.data && e.data.type === 'TIMER_STATE') {
      renderStage(e.data.payload);
    }
  };
}

// Fullscreen Toggle
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn('Fullscreen request failed:', err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

window.addEventListener('dblclick', toggleFullscreen);

if (btnToggleFullscreen) {
  btnToggleFullscreen.addEventListener('click', toggleFullscreen);
}

// Initial state fetch
async function initStage() {
  try {
    const res = await fetch('/api/state');
    const state = await res.json();
    renderStage(state);
  } catch (e) {
    console.error('Failed to fetch initial state:', e);
  }
  setupStageSSE();
}

initStage();
