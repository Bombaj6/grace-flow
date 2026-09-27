// Grace Flow — Multi-Deck Operator Control Panel Logic

// Global state cache
let currentState = {
  mode: 'digital',
  status: 'stopped',
  durationSeconds: 1800,
  remainingSeconds: 1800,
  title: 'Pre-Service Prayer',
  activeItemId: null,
  stageMessage: '',
  stageMessageVisible: false,
  stageMessageFlash: false,
  blackout: false,
  warningThresholdSec: 300,
  criticalThresholdSec: 60,
  theme: 'dark'
};

let activeSchedule = [];
let savedTemplates = [];
let broadcastChannel = null;

if (typeof BroadcastChannel !== 'undefined') {
  broadcastChannel = new BroadcastChannel('grace_flow_channel');
  broadcastChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'TIMER_STATE') {
      updateUIWithState(event.data.payload);
    }
  };
}

// Top Bar Elements
const headerWallClock = document.getElementById('headerWallClock');
const liveStatusBadge = document.getElementById('liveStatusBadge');
const liveStatusText = document.getElementById('liveStatusText');
const btnBlackout = document.getElementById('btnBlackout');
const btnSecondScreen = document.getElementById('btnSecondScreen');
const btnMirrorSecondScreen = document.getElementById('btnMirrorSecondScreen');
const btnOpenStageTab = document.getElementById('btnOpenStageTab');

// Deck Navigation
const navTabs = document.querySelectorAll('.nav-tab');
const deckViews = document.querySelectorAll('.deck-view');
const btnGoToSchedule = document.getElementById('btnGoToSchedule');

// Live Deck Elements
const currentActiveTitle = document.getElementById('currentActiveTitle');
const btnEditTitleQuick = document.getElementById('btnEditTitleQuick');
const inputEditTitle = document.getElementById('inputEditTitle');
const masterTimerDisplay = document.getElementById('masterTimerDisplay');
const timesUpBadge = document.getElementById('timesUpBadge');
const masterProgressBar = document.getElementById('masterProgressBar');
const quickCustomMins = document.getElementById('quickCustomMins');
const quickCustomSecs = document.getElementById('quickCustomSecs');
const btnSetCustomTimer = document.getElementById('btnSetCustomTimer');
const btnSetAndStartCustomTimer = document.getElementById('btnSetAndStartCustomTimer');
const timerPresetChips = document.querySelectorAll('.timer-preset-chip');

// Target Clock Time (End-by-Time) Elements
const targetHourInput = document.getElementById('targetHourInput');
const targetMinuteInput = document.getElementById('targetMinuteInput');
const targetAmPmSelect = document.getElementById('targetAmPmSelect');
const targetCalcBadge = document.getElementById('targetCalcBadge');
const btnSetTargetCountdown = document.getElementById('btnSetTargetCountdown');
const btnSetAndStartTargetCountdown = document.getElementById('btnSetAndStartTargetCountdown');
const targetOffsetChips = document.querySelectorAll('.target-offset-chip');

// Next Up Banner Elements
const nextUpBanner = document.getElementById('nextUpBanner');
const nextUpTitle = document.getElementById('nextUpTitle');
const btnCueNextItem = document.getElementById('btnCueNextItem');

// Audio Chime Elements
const btnAudioChimeToggle = document.getElementById('btnAudioChimeToggle');
const soundIcon = document.getElementById('soundIcon');
const chkChimeTimesUp = document.getElementById('chkChimeTimesUp');
const chkChimeAlertNote = document.getElementById('chkChimeAlertNote');
const btnTestChime = document.getElementById('btnTestChime');

let audioChimeEnabled = true;
let previousStatus = 'stopped';
const btnStartPause = document.getElementById('btnStartPause');
const btnStartPauseText = document.getElementById('btnStartPauseText');
const btnStopReset = document.getElementById('btnStopReset');
const btnSub1Min = document.getElementById('btnSub1Min');
const btnAdd1Min = document.getElementById('btnAdd1Min');
const btnAdd5Min = document.getElementById('btnAdd5Min');
const modePills = document.querySelectorAll('.mode-pill');
const stageMessageInput = document.getElementById('stageMessageInput');
const btnSendAlert = document.getElementById('btnSendAlert');
const btnClearAlert = document.getElementById('btnClearAlert');
const chkFlashAlert = document.getElementById('chkFlashAlert');
const presetChips = document.querySelectorAll('.preset-chip');
const quickScheduleSnapshot = document.getElementById('quickScheduleSnapshot');

// Program & Drafts Deck Elements
const addItemForm = document.getElementById('addItemForm');
const newItemTitle = document.getElementById('newItemTitle');
const newItemMins = document.getElementById('newItemMins');
const scheduleList = document.getElementById('scheduleList');
const scheduleSummary = document.getElementById('scheduleSummary');
const saveDraftForm = document.getElementById('saveDraftForm');
const draftTemplateName = document.getElementById('draftTemplateName');
const templateSelect = document.getElementById('templateSelect');
const btnLoadTemplate = document.getElementById('btnLoadTemplate');
const btnDeleteTemplate = document.getElementById('btnDeleteTemplate');

// Settings Deck Elements
const themeOptionCards = document.querySelectorAll('.theme-option-card');
const lanStageUrlInput = document.getElementById('lanStageUrlInput');
const lanStageOpenLink = document.getElementById('lanStageOpenLink');
const obsStageUrlInput = document.getElementById('obsStageUrlInput');
const settingWarningMins = document.getElementById('settingWarningMins');
const settingCriticalMins = document.getElementById('settingCriticalMins');
const btnSaveThresholds = document.getElementById('btnSaveThresholds');

// ================= 1. DECK NAVIGATION =================
function switchDeck(deckId) {
  navTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.deck === deckId);
  });
  deckViews.forEach(view => {
    view.classList.toggle('active', view.id === deckId);
  });

  if (deckId === 'settings-deck') {
    fetchNetworkInfo();
  }
}

navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    switchDeck(tab.dataset.deck);
  });
});

if (btnGoToSchedule) {
  btnGoToSchedule.addEventListener('click', () => {
    switchDeck('schedule-deck');
  });
}

// ================= 2. WALL CLOCK =================
function updateWallClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  headerWallClock.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;

  if (typeof updateTargetCalcDisplay === 'function') {
    updateTargetCalcDisplay();
  }
}
setInterval(updateWallClock, 1000);
updateWallClock();

// ================= 3. TIME FORMATTER =================
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

// ================= 4. SERVER-SENT EVENTS (SSE) =================
function setupSSE() {
  const eventSource = new EventSource('/api/events');

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'TIMER_STATE') {
        updateUIWithState(data.payload);
      } else if (data.type === 'SCHEDULE_UPDATED') {
        activeSchedule = data.payload.activeSchedule || [];
        renderScheduleList();
        renderQuickSnapshot();
      }
    } catch (e) {
      console.error('SSE parse error:', e);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    setTimeout(setupSSE, 3000);
  };
}

// ================= 5. STATE SYNC & UI UPDATES =================
function updateUIWithState(state) {
  currentState = { ...currentState, ...state };

  // Current active item title (empty title stays empty)
  const hasTitle = state.title && state.title.trim() !== '';
  if (hasTitle) {
    currentActiveTitle.textContent = state.title;
    currentActiveTitle.classList.remove('no-title-placeholder');
  } else {
    currentActiveTitle.textContent = 'Click to add title...';
    currentActiveTitle.classList.add('no-title-placeholder');
  }

  // Mode buttons
  modePills.forEach(pill => {
    pill.classList.toggle('active', pill.dataset.mode === state.mode);
  });

  // Master digits
  masterTimerDisplay.textContent = formatTime(state.remainingSeconds);

  // Status Badge
  liveStatusBadge.className = `status-badge status-${state.status}`;
  liveStatusText.textContent = state.status.toUpperCase();

  // Play/Pause button
  if (state.status === 'running') {
    btnStartPause.classList.add('btn-pause');
    btnStartPause.querySelector('.ctrl-icon').textContent = '⏸';
    btnStartPauseText.textContent = 'Pause';
  } else {
    btnStartPause.classList.remove('btn-pause');
    btnStartPause.querySelector('.ctrl-icon').textContent = '▶';
    btnStartPauseText.textContent = state.status === 'paused' ? 'Resume' : 'Start';
  }

  // Progress Bar & Warning Color
  const total = Math.max(1, state.durationSeconds);
  const remaining = state.remainingSeconds;
  const pct = Math.min(100, Math.max(0, (remaining / total) * 100));
  masterProgressBar.style.width = `${pct}%`;

  if (state.status === 'ended') {
    timesUpBadge.classList.remove('hidden');
    masterProgressBar.className = 'progress-bar-fill progress-red';
  } else {
    timesUpBadge.classList.add('hidden');
    if (remaining <= (state.criticalThresholdSec || 60) || pct <= 5) {
      masterProgressBar.className = 'progress-bar-fill progress-red';
    } else if (remaining <= (state.warningThresholdSec || 300) || pct <= 20) {
      masterProgressBar.className = 'progress-bar-fill progress-amber';
    } else {
      masterProgressBar.className = 'progress-bar-fill progress-green';
    }
  }

  // Blackout
  btnBlackout.classList.toggle('active', !!state.blackout);

  // Stage message sync
  if (state.stageMessage) {
    stageMessageInput.value = state.stageMessage;
  }
  chkFlashAlert.checked = !!state.stageMessageFlash;

  // Active item in list
  highlightActiveScheduleItem();

  // Theme sync
  if (state.theme) {
    applyTheme(state.theme, false);
  }

  // Thresholds inputs
  if (settingWarningMins && state.warningThresholdSec) {
    settingWarningMins.value = Math.round(state.warningThresholdSec / 60);
  }
  if (settingCriticalMins && state.criticalThresholdSec) {
    settingCriticalMins.value = Math.round(state.criticalThresholdSec / 60);
  }

  // Audio Chime on TIME'S UP
  if (state.status === 'ended' && previousStatus === 'running') {
    if (audioChimeEnabled && chkChimeTimesUp?.checked) {
      playSoftChurchChime();
    }
  }
  previousStatus = state.status;

  // Next Up queue preview
  updateNextUpPreview();
}

async function sendStateUpdate(patch) {
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    const data = await res.json();
    if (data.state) {
      updateUIWithState(data.state);
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'TIMER_STATE', payload: data.state });
      }
    }
  } catch (err) {
    console.error('Failed to update state:', err);
  }
}

// ================= 6. LIVE CONTROLS & DIRECT CUSTOM TIMER =================

// Inline Title Editing directly on Live Deck
function startTitleEdit() {
  inputEditTitle.value = currentState.title || '';
  currentActiveTitle.classList.add('hidden');
  inputEditTitle.classList.remove('hidden');
  inputEditTitle.focus();
  inputEditTitle.select();
}

function finishTitleEdit() {
  const newTitle = inputEditTitle.value.trim();
  if (newTitle) {
    currentActiveTitle.textContent = newTitle;
    currentActiveTitle.classList.remove('no-title-placeholder');
  } else {
    currentActiveTitle.textContent = 'Click to add title...';
    currentActiveTitle.classList.add('no-title-placeholder');
  }
  inputEditTitle.classList.add('hidden');
  currentActiveTitle.classList.remove('hidden');
  sendStateUpdate({ title: newTitle });
}

if (btnEditTitleQuick) btnEditTitleQuick.addEventListener('click', startTitleEdit);
if (currentActiveTitle) currentActiveTitle.addEventListener('click', startTitleEdit);

if (inputEditTitle) {
  inputEditTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finishTitleEdit();
    if (e.key === 'Escape') {
      inputEditTitle.classList.add('hidden');
      currentActiveTitle.classList.remove('hidden');
    }
  });
  inputEditTitle.addEventListener('blur', finishTitleEdit);
}

// Quick Custom Countdown Setting (without needing Service Program)
function applyCustomTimer(shouldStart = false) {
  const mins = parseInt(quickCustomMins.value, 10) || 0;
  const secs = parseInt(quickCustomSecs.value, 10) || 0;
  const totalSeconds = (mins * 60) + secs;
  if (totalSeconds <= 0) {
    alert('Please enter a duration greater than 0 seconds.');
    return;
  }

  sendStateUpdate({
    durationSeconds: totalSeconds,
    remainingSeconds: totalSeconds,
    status: shouldStart ? 'running' : 'stopped'
  });
}

if (btnSetCustomTimer) {
  btnSetCustomTimer.addEventListener('click', () => applyCustomTimer(false));
}

if (btnSetAndStartCustomTimer) {
  btnSetAndStartCustomTimer.addEventListener('click', () => applyCustomTimer(true));
}

// Quick preset chips (1m, 2m, 3m, 5m, 10m, 15m, 20m, 30m, 45m, 60m)
timerPresetChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const mins = parseInt(chip.dataset.mins, 10);
    if (quickCustomMins) quickCustomMins.value = mins;
    if (quickCustomSecs) quickCustomSecs.value = 0;
    const totalSeconds = mins * 60;
    sendStateUpdate({
      durationSeconds: totalSeconds,
      remainingSeconds: totalSeconds,
      status: 'stopped'
    });
  });
});

// Click directly on giant timer digits to type custom time
if (masterTimerDisplay) {
  masterTimerDisplay.addEventListener('click', () => {
    const currentFormatted = formatTime(currentState.remainingSeconds);
    const promptVal = prompt('Enter custom countdown duration (e.g. "10" for 10 mins, or "09:50"):', currentFormatted);
    if (promptVal && promptVal.trim() !== '') {
      let totalSeconds = 0;
      if (promptVal.includes(':')) {
        const parts = promptVal.split(':').map(p => parseInt(p, 10) || 0);
        if (parts.length === 3) {
          totalSeconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
        } else if (parts.length === 2) {
          totalSeconds = (parts[0] * 60) + parts[1];
        }
      } else {
        totalSeconds = (parseInt(promptVal, 10) || 0) * 60;
      }

      if (totalSeconds > 0) {
        if (quickCustomMins) quickCustomMins.value = Math.floor(totalSeconds / 60);
        if (quickCustomSecs) quickCustomSecs.value = totalSeconds % 60;
        sendStateUpdate({
          durationSeconds: totalSeconds,
          remainingSeconds: totalSeconds,
          status: 'stopped'
        });
      }
    }
  });
}

// ================= TARGET END TIME (END-BY-CLOCK) LOGIC =================
function getTargetDiffSeconds() {
  const now = new Date();
  let hour = parseInt(targetHourInput?.value, 10) || 12;
  const minute = parseInt(targetMinuteInput?.value, 10) || 0;
  const ampm = targetAmPmSelect?.value || 'AM';

  let hour24 = hour % 12;
  if (ampm === 'PM') hour24 += 12;

  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour24, minute, 0);
  let diffSec = Math.floor((targetDate.getTime() - now.getTime()) / 1000);

  // If time is in the past (more than 30s past), assume user means next occurrence (e.g. tomorrow)
  if (diffSec <= -30) {
    targetDate.setDate(targetDate.getDate() + 1);
    diffSec = Math.floor((targetDate.getTime() - now.getTime()) / 1000);
  }
  return { diffSec, hour, minute, ampm };
}

function updateTargetCalcDisplay() {
  if (!targetCalcBadge) return;
  const { diffSec, hour, minute, ampm } = getTargetDiffSeconds();
  const timeFormatted = `${hour}:${String(minute).padStart(2, '0')} ${ampm}`;

  if (diffSec <= 0) {
    targetCalcBadge.textContent = 'Target time is right now or past';
    targetCalcBadge.classList.add('badge-past');
  } else {
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    targetCalcBadge.textContent = `⏱️ ${mins}m ${secs}s left to reach ${timeFormatted}`;
    targetCalcBadge.classList.remove('badge-past');
  }
}

function setTargetOffset(minutesToAdd) {
  const now = new Date();
  let targetTime;

  if (minutesToAdd === 'next-hour') {
    targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
  } else {
    targetTime = new Date(now.getTime() + (parseInt(minutesToAdd, 10) * 60 * 1000));
  }

  let h = targetTime.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;

  if (targetHourInput) targetHourInput.value = h;
  if (targetMinuteInput) targetMinuteInput.value = targetTime.getMinutes();
  if (targetAmPmSelect) targetAmPmSelect.value = ampm;

  updateTargetCalcDisplay();
}

if (targetHourInput) targetHourInput.addEventListener('input', updateTargetCalcDisplay);
if (targetMinuteInput) targetMinuteInput.addEventListener('input', updateTargetCalcDisplay);
if (targetAmPmSelect) targetAmPmSelect.addEventListener('change', updateTargetCalcDisplay);

targetOffsetChips.forEach(chip => {
  chip.addEventListener('click', () => {
    setTargetOffset(chip.dataset.offset);
  });
});

if (btnSetTargetCountdown) {
  btnSetTargetCountdown.addEventListener('click', () => {
    const { diffSec } = getTargetDiffSeconds();
    if (diffSec > 0) {
      sendStateUpdate({
        durationSeconds: diffSec,
        remainingSeconds: diffSec,
        status: 'stopped'
      });
    } else {
      alert('Target time is in the past. Please choose a future time.');
    }
  });
}

if (btnSetAndStartTargetCountdown) {
  btnSetAndStartTargetCountdown.addEventListener('click', () => {
    const { diffSec } = getTargetDiffSeconds();
    if (diffSec > 0) {
      sendStateUpdate({
        durationSeconds: diffSec,
        remainingSeconds: diffSec,
        status: 'running'
      });
    } else {
      alert('Target time is in the past. Please choose a future time.');
    }
  });
}

// Initial default calculation
setTargetOffset(30);

btnStartPause.addEventListener('click', () => {
  if (currentState.status === 'running') {
    sendStateUpdate({ status: 'paused' });
  } else {
    if (currentState.remainingSeconds <= 0) {
      sendStateUpdate({ remainingSeconds: currentState.durationSeconds, status: 'running' });
    } else {
      sendStateUpdate({ status: 'running' });
    }
  }
});

btnStopReset.addEventListener('click', () => {
  sendStateUpdate({
    status: 'stopped',
    remainingSeconds: currentState.durationSeconds
  });
});

btnSub1Min.addEventListener('click', () => {
  const newSec = Math.max(0, currentState.remainingSeconds - 60);
  sendStateUpdate({ remainingSeconds: newSec });
});

btnAdd1Min.addEventListener('click', () => {
  const newSec = currentState.remainingSeconds + 60;
  sendStateUpdate({ remainingSeconds: newSec, durationSeconds: Math.max(currentState.durationSeconds, newSec) });
});

btnAdd5Min.addEventListener('click', () => {
  const newSec = currentState.remainingSeconds + 300;
  sendStateUpdate({ remainingSeconds: newSec, durationSeconds: Math.max(currentState.durationSeconds, newSec) });
});

modePills.forEach(pill => {
  pill.addEventListener('click', () => {
    sendStateUpdate({ mode: pill.dataset.mode });
  });
});

btnBlackout.addEventListener('click', () => {
  sendStateUpdate({ blackout: !currentState.blackout });
});

// Stage Alert Note
btnSendAlert.addEventListener('click', () => {
  const msg = stageMessageInput.value.trim();
  if (msg) {
    sendStateUpdate({
      stageMessage: msg,
      stageMessageVisible: true,
      stageMessageFlash: chkFlashAlert.checked
    });
    if (audioChimeEnabled && chkChimeAlertNote?.checked) {
      playSoftChurchChime();
    }
  }
});

btnClearAlert.addEventListener('click', () => {
  stageMessageInput.value = '';
  sendStateUpdate({
    stageMessage: '',
    stageMessageVisible: false,
    stageMessageFlash: false
  });
});

chkFlashAlert.addEventListener('change', () => {
  if (currentState.stageMessageVisible) {
    sendStateUpdate({ stageMessageFlash: chkFlashAlert.checked });
  }
});

presetChips.forEach(chip => {
  chip.addEventListener('click', () => {
    stageMessageInput.value = chip.dataset.msg;
    sendStateUpdate({
      stageMessage: chip.dataset.msg,
      stageMessageVisible: true,
      stageMessageFlash: chkFlashAlert.checked
    });
  });
});

// Stage Mirror Buttons
btnOpenStageTab.addEventListener('click', () => {
  window.open('/stage', '_blank');
});

function launchSecondScreen() {
  const dualWidth = 1920;
  const dualHeight = 1080;
  const leftPos = window.screen.availWidth || 1440;
  const stageWin = window.open(
    '/stage',
    'GraceFlowStageWindow',
    `left=${leftPos},top=0,width=${dualWidth},height=${dualHeight},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`
  );
  if (stageWin) stageWin.focus();
}

btnSecondScreen.addEventListener('click', launchSecondScreen);
btnMirrorSecondScreen.addEventListener('click', launchSecondScreen);

// ================= 7. QUICK SCHEDULE SNAPSHOT (LIVE DECK) =================
function renderQuickSnapshot() {
  if (!quickScheduleSnapshot) return;
  quickScheduleSnapshot.innerHTML = '';

  activeSchedule.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'quick-ro-item';
    if (item.id === currentState.activeItemId) {
      row.classList.add('active');
    }

    row.innerHTML = `
      <div>
        <strong>${item.title}</strong>
        <span style="color: #f59e0b; margin-left: 6px;">(${item.durationMinutes}m)</span>
      </div>
      <button class="quick-cue-btn" data-id="${item.id}">Cue</button>
    `;

    row.querySelector('.quick-cue-btn').addEventListener('click', () => {
      const secs = item.durationMinutes * 60;
      sendStateUpdate({
        activeItemId: item.id,
        title: item.title,
        durationSeconds: secs,
        remainingSeconds: secs,
        status: 'running'
      });
    });

    quickScheduleSnapshot.appendChild(row);
  });
}

// ================= 8. PROGRAM & DRAFTS DECK =================
async function loadSchedule() {
  try {
    const res = await fetch('/api/schedule');
    const data = await res.json();
    activeSchedule = data.activeSchedule || [];
    renderScheduleList();
    renderQuickSnapshot();
  } catch (err) {
    console.error('Failed to load schedule:', err);
  }
}

async function saveScheduleToServer() {
  try {
    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeSchedule })
    });
    renderQuickSnapshot();
  } catch (err) {
    console.error('Failed to save schedule:', err);
  }
}

function renderScheduleList() {
  if (!scheduleList) return;
  scheduleList.innerHTML = '';
  let totalMinutes = 0;

  activeSchedule.forEach((item, index) => {
    totalMinutes += item.durationMinutes;

    const li = document.createElement('li');
    li.className = 'schedule-item';
    li.dataset.id = item.id;
    li.dataset.index = index;
    li.draggable = true;

    li.innerHTML = `
      <div class="item-left">
        <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
        <div class="item-details">
          <span class="item-title">${item.title}</span>
          <span class="item-duration">${item.durationMinutes} Mins</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="cue-start-btn">▶ Cue & Start</button>
        <button class="cue-standby-btn">Cue Standby</button>
        <button class="delete-item-btn" title="Remove Item">✕</button>
      </div>
    `;

    // Cue & Start
    li.querySelector('.cue-start-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const secs = item.durationMinutes * 60;
      sendStateUpdate({
        activeItemId: item.id,
        title: item.title,
        durationSeconds: secs,
        remainingSeconds: secs,
        status: 'running'
      });
    });

    // Cue Standby
    li.querySelector('.cue-standby-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const secs = item.durationMinutes * 60;
      sendStateUpdate({
        activeItemId: item.id,
        title: item.title,
        durationSeconds: secs,
        remainingSeconds: secs,
        status: 'stopped'
      });
    });

    // Delete
    li.querySelector('.delete-item-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      activeSchedule.splice(index, 1);
      renderScheduleList();
      saveScheduleToServer();
    });

    // Drag and Drop
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragend', handleDragEnd);

    scheduleList.appendChild(li);
  });

  const hours = Math.floor(totalMinutes / 60);
  const remMin = totalMinutes % 60;
  if (scheduleSummary) {
    scheduleSummary.textContent = `Total: ${hours > 0 ? hours + 'h ' : ''}${remMin}m (${activeSchedule.length} items)`;
  }
  highlightActiveScheduleItem();
}

function highlightActiveScheduleItem() {
  const items = document.querySelectorAll('.schedule-item');
  items.forEach(el => {
    el.classList.toggle('is-active', el.dataset.id === currentState.activeItemId);
  });
  renderQuickSnapshot();
  updateNextUpPreview();
}

// Drag & Drop
let draggedItem = null;
function handleDragStart(e) {
  draggedItem = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}
function handleDrop(e) {
  e.preventDefault();
  if (draggedItem && draggedItem !== this) {
    const fromIndex = parseInt(draggedItem.dataset.index, 10);
    const toIndex = parseInt(this.dataset.index, 10);
    const moved = activeSchedule.splice(fromIndex, 1)[0];
    activeSchedule.splice(toIndex, 0, moved);
    renderScheduleList();
    saveScheduleToServer();
  }
}
function handleDragEnd() {
  this.classList.remove('dragging');
}

// Add Item Form
addItemForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = newItemTitle.value.trim();
  const mins = parseInt(newItemMins.value, 10);
  if (title && mins > 0) {
    activeSchedule.push({ id: 'item-' + Date.now(), title, durationMinutes: mins });
    renderScheduleList();
    saveScheduleToServer();
    newItemTitle.value = '';
    newItemMins.value = '';
    newItemTitle.focus();
  }
});

// Draft Templates
async function loadTemplates() {
  try {
    const res = await fetch('/api/templates');
    savedTemplates = await res.json();
    populateTemplatesDropdown();
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
}

function populateTemplatesDropdown() {
  if (!templateSelect) return;
  templateSelect.innerHTML = '<option value="">-- Choose a Saved Template --</option>';
  savedTemplates.forEach(tpl => {
    const opt = document.createElement('option');
    opt.value = tpl.id;
    opt.textContent = `${tpl.name} (${tpl.items.length} items)`;
    templateSelect.appendChild(opt);
  });
}

saveDraftForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = draftTemplateName.value.trim();
  if (!name) return;

  const newTemplate = {
    id: 'tpl-' + Date.now(),
    name,
    items: JSON.parse(JSON.stringify(activeSchedule))
  };

  try {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTemplate)
    });
    const data = await res.json();
    savedTemplates = data.templates;
    populateTemplatesDropdown();
    templateSelect.value = newTemplate.id;
    draftTemplateName.value = '';
    alert(`Draft template "${name}" saved!`);
  } catch (err) {
    console.error('Failed to save draft:', err);
  }
});

btnLoadTemplate.addEventListener('click', () => {
  const selectedId = templateSelect.value;
  if (!selectedId) return alert('Please select a template to load.');
  const tpl = savedTemplates.find(t => t.id === selectedId);
  if (tpl && confirm(`Load "${tpl.name}"? This replaces the active schedule.`)) {
    activeSchedule = JSON.parse(JSON.stringify(tpl.items));
    renderScheduleList();
    saveScheduleToServer();
  }
});

btnDeleteTemplate.addEventListener('click', async () => {
  const selectedId = templateSelect.value;
  if (!selectedId) return alert('Please select a template to delete.');
  const tpl = savedTemplates.find(t => t.id === selectedId);
  if (tpl && confirm(`Delete "${tpl.name}"?`)) {
    try {
      const res = await fetch('/api/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId })
      });
      const data = await res.json();
      savedTemplates = data.templates;
      populateTemplatesDropdown();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  }
});

// ================= 9. SETTINGS & NDI DECK =================
// Theme Suite
function applyTheme(theme, syncWithServer = true) {
  document.documentElement.setAttribute('data-theme', theme);
  themeOptionCards.forEach(card => {
    card.classList.toggle('active', card.dataset.theme === theme);
  });
  if (syncWithServer && currentState.theme !== theme) {
    sendStateUpdate({ theme });
  }
}

themeOptionCards.forEach(card => {
  card.addEventListener('click', () => {
    applyTheme(card.dataset.theme);
  });
});

// Network info
async function fetchNetworkInfo() {
  try {
    const res = await fetch('/api/network-info');
    const data = await res.json();
    const lanUrl = data.stageUrls && data.stageUrls.length > 0 ? data.stageUrls[0] : data.localStageUrl;
    const obsUrl = `${lanUrl}?transparent=true`;

    lanStageUrlInput.value = lanUrl;
    lanStageOpenLink.href = lanUrl;
    obsStageUrlInput.value = obsUrl;
  } catch (e) {
    console.error('Network info fetch error:', e);
  }
}

// Copy button handlers
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (input) {
      input.select();
      navigator.clipboard.writeText(input.value);
      const origText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = origText; }, 2000);
    }
  });
});

// Save Thresholds
btnSaveThresholds.addEventListener('click', () => {
  const warnMins = parseInt(settingWarningMins.value, 10) || 5;
  const critMins = parseInt(settingCriticalMins.value, 10) || 1;

  sendStateUpdate({
    warningThresholdSec: warnMins * 60,
    criticalThresholdSec: critMins * 60
  });
  alert('Warning thresholds updated successfully!');
});

// ================= NEXT UP QUEUE LOGIC =================
function updateNextUpPreview() {
  if (!nextUpBanner || !nextUpTitle) return;
  if (!activeSchedule || activeSchedule.length === 0) {
    nextUpBanner.classList.add('hidden');
    return;
  }

  const currentIndex = activeSchedule.findIndex(item => item.id === currentState.activeItemId);
  if (currentIndex >= 0 && currentIndex < activeSchedule.length - 1) {
    const nextItem = activeSchedule[currentIndex + 1];
    nextUpTitle.textContent = `${nextItem.title} (${nextItem.durationMinutes}m)`;
    nextUpBanner.classList.remove('hidden');

    btnCueNextItem.onclick = () => {
      const secs = nextItem.durationMinutes * 60;
      sendStateUpdate({
        activeItemId: nextItem.id,
        title: nextItem.title,
        durationSeconds: secs,
        remainingSeconds: secs,
        status: 'running'
      });
    };
  } else {
    nextUpBanner.classList.add('hidden');
  }
}

// ================= SOFT SYNTHESIZED CHURCH CHIME (WEB AUDIO API) =================
function playSoftChurchChime() {
  if (!audioChimeEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // 1st Bell Tone: High clarity bell (C6 - 1046.5Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, ctx.currentTime);
    gain1.gain.setValueAtTime(0.18, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 1.2);

    // 2nd Warm Tone: Lower resonance (G5 - 783.99Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.22, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 1.8);

    // 3rd Rich Harmonic (E5 - 659.25Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(659.25, ctx.currentTime + 0.22);
    gain3.gain.setValueAtTime(0.18, ctx.currentTime + 0.22);
    gain3.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.0);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(ctx.currentTime + 0.22);
    osc3.stop(ctx.currentTime + 2.0);
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

// Sound toggle button in Live Controls
if (btnAudioChimeToggle) {
  btnAudioChimeToggle.addEventListener('click', () => {
    audioChimeEnabled = !audioChimeEnabled;
    btnAudioChimeToggle.classList.toggle('muted', !audioChimeEnabled);
    if (soundIcon) {
      soundIcon.textContent = audioChimeEnabled ? '🔔' : '🔕';
    }
  });
}

// Test Audio Chime button in Settings Deck
if (btnTestChime) {
  btnTestChime.addEventListener('click', () => {
    playSoftChurchChime();
  });
}

// ================= OPERATOR HOTKEYS & STREAM DECK REMAPPING =================
const DEFAULT_HOTKEYS = {
  enabled: true,
  bindings: {
    startPause: { code: 'Space', key: ' ', display: 'Space' },
    reset: { code: 'KeyR', key: 'r', display: 'R' },
    nextItem: { code: 'KeyN', key: 'n', display: 'N' },
    blackout: { code: 'KeyB', key: 'b', display: 'B' },
    add1Min: { code: 'Equal', key: '+', display: '+' },
    sub1Min: { code: 'Minus', key: '-', display: '-' }
  }
};

let hotkeysConfig = JSON.parse(JSON.stringify(DEFAULT_HOTKEYS));
let currentlyRebindingAction = null;

const chkHotkeysEnabled = document.getElementById('chkHotkeysEnabled');
const hotkeysStatusBadge = document.getElementById('hotkeysStatusBadge');
const hotkeysConfigContainer = document.getElementById('hotkeysConfigContainer');
const hotkeyListeningNotice = document.getElementById('hotkeyListeningNotice');
const btnResetDefaultHotkeys = document.getElementById('btnResetDefaultHotkeys');

// Live Deck Hint Elements
const kbdHintStartPause = document.getElementById('kbdHintStartPause');
const kbdHintReset = document.getElementById('kbdHintReset');
const kbdHintNext = document.getElementById('kbdHintNext');
const kbdHintBlackout = document.getElementById('kbdHintBlackout');
const kbdHintAdd1Min = document.getElementById('kbdHintAdd1Min');
const kbdHintSub1Min = document.getElementById('kbdHintSub1Min');

function formatKeyDisplay(code, key) {
  if (code === 'Space') return 'Space';
  if (code && code.startsWith('Key')) return code.slice(3).toUpperCase();
  if (code && code.startsWith('Digit')) return code.slice(5);
  if (code && code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  if (code && code.startsWith('Arrow')) return code.slice(5);
  if (code === 'Minus' || key === '-') return '-';
  if (code === 'Equal' || key === '+') return '+';
  if (code === 'Backquote') return '~';
  if (key && key.length === 1) return key.toUpperCase();
  return code || key || '?';
}

function loadSavedHotkeys() {
  try {
    const saved = localStorage.getItem('grace_flow_hotkeys_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      hotkeysConfig = {
        enabled: parsed.enabled !== undefined ? parsed.enabled : true,
        bindings: Object.assign({}, DEFAULT_HOTKEYS.bindings, parsed.bindings || {})
      };
    }
  } catch (e) {
    console.warn('Could not parse saved hotkeys config, using defaults:', e);
    hotkeysConfig = JSON.parse(JSON.stringify(DEFAULT_HOTKEYS));
  }
  updateHotkeysUI();
}

function saveHotkeysConfig() {
  localStorage.setItem('grace_flow_hotkeys_config', JSON.stringify(hotkeysConfig));
}

function updateHotkeysUI() {
  // Update toggle state
  if (chkHotkeysEnabled) {
    chkHotkeysEnabled.checked = !!hotkeysConfig.enabled;
  }
  if (hotkeysStatusBadge) {
    if (hotkeysConfig.enabled) {
      hotkeysStatusBadge.textContent = 'Hotkeys Enabled';
      hotkeysStatusBadge.classList.add('active');
      hotkeysStatusBadge.classList.remove('disabled');
    } else {
      hotkeysStatusBadge.textContent = 'Hotkeys Disabled';
      hotkeysStatusBadge.classList.remove('active');
      hotkeysStatusBadge.classList.add('disabled');
    }
  }
  if (hotkeysConfigContainer) {
    hotkeysConfigContainer.classList.toggle('is-disabled', !hotkeysConfig.enabled);
  }

  // Update Settings Rebind button badges
  for (const [action, binding] of Object.entries(hotkeysConfig.bindings)) {
    const badgeEl = document.getElementById(`hkDisplay_${action}`);
    if (badgeEl) {
      badgeEl.textContent = binding.display || formatKeyDisplay(binding.code, binding.key);
    }
  }

  // Update Live Deck Hints
  const b = hotkeysConfig.bindings;
  if (kbdHintStartPause) kbdHintStartPause.textContent = b.startPause ? b.startPause.display : 'Space';
  if (kbdHintReset) kbdHintReset.textContent = b.reset ? b.reset.display : 'R';
  if (kbdHintNext) kbdHintNext.textContent = b.nextItem ? b.nextItem.display : 'N';
  if (kbdHintBlackout) kbdHintBlackout.textContent = b.blackout ? b.blackout.display : 'B';
  if (kbdHintAdd1Min) kbdHintAdd1Min.textContent = b.add1Min ? b.add1Min.display : '+';
  if (kbdHintSub1Min) kbdHintSub1Min.textContent = b.sub1Min ? b.sub1Min.display : '-';

  // Toggle .disabled class on all kbd hints
  const allKbdHints = document.querySelectorAll('.kbd-hint');
  allKbdHints.forEach(k => {
    k.classList.toggle('disabled', !hotkeysConfig.enabled);
  });
}

// Master Toggle Listener
if (chkHotkeysEnabled) {
  chkHotkeysEnabled.addEventListener('change', () => {
    hotkeysConfig.enabled = chkHotkeysEnabled.checked;
    saveHotkeysConfig();
    updateHotkeysUI();
  });
}

// Rebind Buttons Listeners
document.querySelectorAll('.hotkey-rebind-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const action = btn.dataset.action;
    startRebinding(action, btn);
  });
});

function startRebinding(action, btnElement) {
  if (currentlyRebindingAction) {
    stopRebinding();
  }
  currentlyRebindingAction = action;
  btnElement.classList.add('recording');
  const actionText = btnElement.querySelector('.hk-bind-action-text');
  if (actionText) actionText.textContent = 'Press any key...';
  if (hotkeyListeningNotice) hotkeyListeningNotice.classList.remove('hidden');
}

function stopRebinding() {
  if (!currentlyRebindingAction) return;
  const currentBtn = document.getElementById(`hkBtn_${currentlyRebindingAction}`);
  if (currentBtn) {
    currentBtn.classList.remove('recording');
    const actionText = currentBtn.querySelector('.hk-bind-action-text');
    if (actionText) actionText.textContent = 'Click to Rebind';
  }
  if (hotkeyListeningNotice) hotkeyListeningNotice.classList.add('hidden');
  currentlyRebindingAction = null;
}

// Reset Default Hotkeys
if (btnResetDefaultHotkeys) {
  btnResetDefaultHotkeys.addEventListener('click', () => {
    hotkeysConfig = JSON.parse(JSON.stringify(DEFAULT_HOTKEYS));
    saveHotkeysConfig();
    updateHotkeysUI();
    stopRebinding();
  });
}

// Global Keydown Handler (Dispatches hotkeys & captures rebinding)
window.addEventListener('keydown', (e) => {
  // 1. If currently in Rebinding Mode, capture this key
  if (currentlyRebindingAction) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      stopRebinding();
      return;
    }

    const code = e.code;
    const key = e.key;
    const display = formatKeyDisplay(code, key);

    hotkeysConfig.bindings[currentlyRebindingAction] = {
      code,
      key: key.length === 1 ? key.toLowerCase() : key,
      display
    };

    saveHotkeysConfig();
    updateHotkeysUI();
    stopRebinding();
    return;
  }

  // 2. Ignore if hotkeys are disabled globally
  if (!hotkeysConfig.enabled) return;

  // 3. Ignore if user is currently typing in an input / textarea / select
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    return;
  }

  // Helper matching function
  const matches = (binding) => {
    if (!binding) return false;
    if (binding.code && e.code === binding.code) return true;
    if (binding.key && (e.key === binding.key || e.key.toLowerCase() === binding.key.toLowerCase())) return true;
    return false;
  };

  const b = hotkeysConfig.bindings;

  // Start / Pause
  if (matches(b.startPause)) {
    e.preventDefault();
    if (btnStartPause) btnStartPause.click();
    return;
  }

  // Reset
  if (matches(b.reset)) {
    e.preventDefault();
    if (btnStopReset) btnStopReset.click();
    return;
  }

  // Next Item
  if (matches(b.nextItem)) {
    e.preventDefault();
    if (btnCueNextItem && nextUpBanner && !nextUpBanner.classList.contains('hidden')) {
      btnCueNextItem.click();
    }
    return;
  }

  // Blackout
  if (matches(b.blackout)) {
    e.preventDefault();
    if (btnBlackout) btnBlackout.click();
    return;
  }

  // Add 1 Min
  if (matches(b.add1Min)) {
    e.preventDefault();
    if (btnAdd1Min) btnAdd1Min.click();
    return;
  }

  // Subtract 1 Min
  if (matches(b.sub1Min)) {
    e.preventDefault();
    if (btnSub1Min) btnSub1Min.click();
    return;
  }
});

// Click outside cancels rebinding
window.addEventListener('click', (e) => {
  if (currentlyRebindingAction && !e.target.closest('.hotkey-rebind-btn')) {
    stopRebinding();
  }
});

// Creator Attribution & Church Customization
const creditChurchInput = document.getElementById('creditChurchInput');
const btnSaveChurchName = document.getElementById('btnSaveChurchName');
const churchSavedFeedback = document.getElementById('churchSavedFeedback');

function loadSavedChurchName() {
  if (creditChurchInput) {
    const church = localStorage.getItem('grace_flow_church_name');
    if (church) creditChurchInput.value = church;
  }
}

if (btnSaveChurchName) {
  btnSaveChurchName.addEventListener('click', () => {
    if (creditChurchInput) {
      localStorage.setItem('grace_flow_church_name', creditChurchInput.value.trim());
    }
    if (churchSavedFeedback) {
      churchSavedFeedback.classList.remove('hidden');
      setTimeout(() => {
        churchSavedFeedback.classList.add('hidden');
      }, 3000);
    }
  });
}

// Software Update Checker (for Desktop App and Web on Render)
const CURRENT_VERSION = '1.0.0';
const btnCheckUpdates = document.getElementById('btnCheckUpdates');
const versionStatusPill = document.getElementById('versionStatusPill');
const updateStatusBanner = document.getElementById('updateStatusBanner');

function compareVersions(v1, v2) {
  const p1 = (v1 || '').replace(/^v/, '').split('.').map(Number);
  const p2 = (v2 || '').replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

async function checkForUpdates(isUserClick = false) {
  if (isUserClick && btnCheckUpdates) {
    btnCheckUpdates.textContent = 'Checking...';
    btnCheckUpdates.disabled = true;
  }

  try {
    const res = await fetch('/api/version');
    const data = await res.json();
    const latestVersion = data.latestVersion || CURRENT_VERSION;
    const isNewer = compareVersions(latestVersion, CURRENT_VERSION) > 0;

    if (isNewer) {
      if (versionStatusPill) {
        versionStatusPill.textContent = `🚀 v${latestVersion} Available!`;
        versionStatusPill.style.background = 'rgba(245, 158, 11, 0.2)';
        versionStatusPill.style.color = '#f59e0b';
      }
      if (updateStatusBanner) {
        updateStatusBanner.className = 'update-status-banner has-update';
        updateStatusBanner.innerHTML = `
          <div>
            <strong>Update Available: Grace Flow v${latestVersion}</strong>
            <p style="margin: 4px 0 0; font-size: 12px;">A new version is ready. Pull the latest code on GitHub or redeploy on Render!</p>
          </div>
          <a href="https://github.com/mayowapeter/grace-flow/releases" target="_blank" class="outline-btn small-btn">Get v${latestVersion} ➔</a>
        `;
        updateStatusBanner.classList.remove('hidden');
      }
    } else {
      if (versionStatusPill) {
        versionStatusPill.textContent = `● v${CURRENT_VERSION} Up to Date`;
        versionStatusPill.style.background = 'rgba(16, 185, 129, 0.12)';
        versionStatusPill.style.color = '#10b981';
      }
      if (isUserClick && updateStatusBanner) {
        updateStatusBanner.className = 'update-status-banner';
        updateStatusBanner.innerHTML = `
          <div>
            <strong>✓ You are running the latest version of Grace Flow (v${CURRENT_VERSION})!</strong>
            <p style="margin: 4px 0 0; font-size: 12px;">Built by Peter Olatunji (@__mayowapeter).</p>
          </div>
        `;
        updateStatusBanner.classList.remove('hidden');
        setTimeout(() => {
          updateStatusBanner.classList.add('hidden');
        }, 5000);
      }
    }
  } catch (err) {
    console.warn('Update check error:', err);
    if (isUserClick && updateStatusBanner) {
      updateStatusBanner.className = 'update-status-banner';
      updateStatusBanner.textContent = `Grace Flow v${CURRENT_VERSION} is running smoothly offline.`;
      updateStatusBanner.classList.remove('hidden');
      setTimeout(() => updateStatusBanner.classList.add('hidden'), 4000);
    }
  } finally {
    if (btnCheckUpdates) {
      btnCheckUpdates.textContent = '🔄 Check for Updates';
      btnCheckUpdates.disabled = false;
    }
  }
}

if (btnCheckUpdates) {
  btnCheckUpdates.addEventListener('click', () => checkForUpdates(true));
}

// Init on load
setupSSE();
loadSchedule();
loadTemplates();
fetchNetworkInfo();
loadSavedChurchName();
loadSavedHotkeys();
checkForUpdates(false);
