// Everything the user sees or hears: DOM rendering, theme, sound and notifications.
import { MODES } from './timer.js';

const $ = (selector) => document.querySelector(selector);

export const els = {
  themeToggle: $('#theme-toggle'),
  settingsBtn: $('#settings-btn'),
  timerCard: $('#timer-card'),
  modeTabs: [...document.querySelectorAll('.mode-tabs [data-mode]')],
  time: $('#time'),
  cycleDots: $('#cycle-dots'),
  currentTask: $('#current-task'),
  startBtn: $('#start-btn'),
  resetBtn: $('#reset-btn'),
  skipBtn: $('#skip-btn'),
  todayCount: $('#today-count'),
  taskForm: $('#task-form'),
  taskInput: $('#task-input'),
  filterBtns: [...document.querySelectorAll('.filters [data-filter]')],
  taskList: $('#task-list'),
  taskEmpty: $('#task-empty'),
  taskCount: $('#task-count'),
  settingsDialog: $('#settings-dialog'),
  settingsForm: $('#settings-form'),
  notifyHint: $('#notify-hint'),
};

// ---- Timer ----

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Cheap per-tick update: only the countdown text and the tab title.
export function renderTime(state) {
  const text = formatTime(state.remainingMs);
  els.time.textContent = text;
  document.title = state.running ? `${text} · ${MODES[state.mode]} — Focus Board` : 'Focus Board';
}

export function renderTimer({ state, settings, todayCount, currentTask, fullMs }) {
  renderTime(state);

  els.timerCard.dataset.mode = state.mode;
  for (const tab of els.modeTabs) {
    tab.setAttribute('aria-selected', String(tab.dataset.mode === state.mode));
  }

  const inProgress = state.remainingMs < fullMs;
  els.startBtn.textContent = state.running ? 'Pause' : inProgress ? 'Resume' : 'Start';

  // During a long break the whole set is complete, so show every dot filled.
  const filled = state.mode === 'long' ? settings.longEvery : Math.min(state.cycle, settings.longEvery);
  els.cycleDots.replaceChildren(
    ...Array.from({ length: settings.longEvery }, (_, i) => {
      const dot = document.createElement('span');
      dot.className = i < filled ? 'dot filled' : 'dot';
      return dot;
    }),
  );
  els.cycleDots.setAttribute('aria-label', `${filled} of ${settings.longEvery} focus sessions done in this set`);

  els.todayCount.textContent = todayCount;
  els.currentTask.textContent = currentTask
    ? `Working on: ${currentTask.title}`
    : 'No task selected — pick one with ◎';
  els.currentTask.classList.toggle('muted', !currentTask);
}

// ---- Tasks ----

const EMPTY_MESSAGES = {
  all: 'No tasks yet — add one above.',
  active: 'No active tasks.',
  done: 'No completed tasks yet.',
};

function iconButton(action, icon, label, extraClass = '') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `icon-btn small ${extraClass}`.trim();
  btn.dataset.action = action;
  btn.textContent = icon;
  btn.setAttribute('aria-label', label);
  btn.title = label;
  return btn;
}

function taskItem(task, isCurrent) {
  const li = document.createElement('li');
  li.className = 'task';
  li.classList.toggle('done', task.done);
  li.classList.toggle('current', isCurrent);
  li.dataset.id = task.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.dataset.action = 'toggle';
  checkbox.setAttribute('aria-label', task.done ? 'Mark as not done' : 'Mark as done');

  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;
  title.title = 'Double-click to edit';

  li.append(checkbox, title);

  if (task.pomodoros > 0) {
    const pomos = document.createElement('span');
    pomos.className = 'task-pomos';
    pomos.textContent = `🍅 ${task.pomodoros}`;
    pomos.title = `${task.pomodoros} pomodoro${task.pomodoros === 1 ? '' : 's'}`;
    li.append(pomos);
  }

  if (!task.done) {
    const focus = iconButton('focus', '◎', isCurrent ? 'Stop working on this task' : 'Work on this task', 'focus-btn');
    focus.setAttribute('aria-pressed', String(isCurrent));
    li.append(focus);
  }
  li.append(iconButton('edit', '✎', 'Edit task'), iconButton('delete', '✕', 'Delete task', 'danger'));
  return li;
}

export function renderTasks({ tasks, currentId, filter }) {
  const visible = tasks.filter((t) => (filter === 'active' ? !t.done : filter === 'done' ? t.done : true));
  els.taskList.replaceChildren(...visible.map((t) => taskItem(t, t.id === currentId)));

  els.taskEmpty.textContent = visible.length ? '' : EMPTY_MESSAGES[filter];
  els.taskEmpty.hidden = visible.length > 0;

  for (const btn of els.filterBtns) {
    btn.setAttribute('aria-pressed', String(btn.dataset.filter === filter));
  }

  const done = tasks.filter((t) => t.done).length;
  els.taskCount.textContent = tasks.length ? `${tasks.length - done} active · ${done} done` : '';
}

// Swap a task's title for an inline input. Enter or blur saves, Escape cancels.
export function beginEdit(li, onSave) {
  const titleEl = li.querySelector('.task-title');
  if (!titleEl) return;
  const original = titleEl.textContent;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-edit';
  input.value = original;
  input.maxLength = 200;
  input.setAttribute('aria-label', 'Edit task');
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  let finished = false;
  const finish = (keep) => {
    if (finished) return;
    finished = true;
    const value = input.value.trim();
    if (keep && value && value !== original) {
      onSave(value); // the store re-renders the list, replacing the input
    } else {
      input.replaceWith(titleEl);
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

// ---- Theme ----

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === 'dark';
  els.themeToggle.textContent = isDark ? '☀️' : '🌙';
  els.themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  els.themeToggle.title = els.themeToggle.getAttribute('aria-label');
}

// ---- Settings dialog ----

const notificationsSupported = 'Notification' in window;

export function openSettings(settings) {
  const form = els.settingsForm.elements;
  for (const key of ['work', 'short', 'long', 'longEvery']) form[key].value = settings[key];
  form.sound.checked = settings.sound;

  const denied = notificationsSupported && Notification.permission === 'denied';
  form.notify.disabled = !notificationsSupported || denied;
  form.notify.checked = settings.notify && notificationsSupported && Notification.permission === 'granted';
  els.notifyHint.textContent = !notificationsSupported
    ? 'This browser does not support notifications.'
    : denied
      ? 'Notifications are blocked for this site in your browser settings.'
      : '';

  els.settingsDialog.returnValue = '';
  els.settingsDialog.showModal();
}

export function readSettings(defaults) {
  const form = els.settingsForm.elements;
  const number = (key) => {
    const input = form[key];
    const value = Math.round(Number(input.value));
    return Number.isFinite(value) && value >= Number(input.min)
      ? Math.min(value, Number(input.max))
      : defaults[key];
  };
  return {
    work: number('work'),
    short: number('short'),
    long: number('long'),
    longEvery: number('longEvery'),
    sound: form.sound.checked,
    notify: form.notify.checked,
  };
}

// Ask for permission when the box is ticked (needs a user gesture); untick if refused.
export async function requestNotificationPermission() {
  if (!notificationsSupported) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

export function notify(title, body) {
  if (!notificationsSupported || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body });
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
}

// ---- Sound ----

let audioCtx = null;

// Browsers only allow audio after a user gesture, so call this from a click handler.
export function unlockAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  audioCtx ??= new AudioContextClass();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Three short sine-wave beeps, generated on the fly.
export function playBeep() {
  unlockAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  for (const offset of [0, 0.35, 0.7]) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.32);
  }
}
