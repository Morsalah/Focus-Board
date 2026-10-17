// Entry point: loads saved data, creates the stores and wires them to the UI.
import { load, save } from './storage.js';
import { createTimer } from './timer.js';
import { createTaskStore } from './tasks.js';
import * as ui from './ui.js';

const DEFAULT_SETTINGS = { work: 25, short: 5, long: 15, longEvery: 4, sound: true, notify: false };

let settings = { ...DEFAULT_SETTINGS, ...load('settings', {}) };
let stats = load('stats', { date: '', count: 0 });
let filter = 'all';

// ---- Daily stats ----

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayCount() {
  return stats.date === today() ? stats.count : 0;
}

function recordPomodoro() {
  stats = { date: today(), count: todayCount() + 1 };
  save('stats', stats);
}

// ---- Stores ----

const tasks = createTaskStore({
  saved: load('tasks', null),
  onChange(state) {
    save('tasks', state);
    renderTasks();
    renderTimer();
  },
});

const timer = createTimer({
  getSettings: () => settings,
  saved: load('timer', null),
  onTick: ui.renderTime,
  onChange(state) {
    save('timer', state);
    renderTimer(state);
  },
  onComplete(finished, { natural, silent }) {
    if (!natural) return;
    if (finished === 'work') {
      recordPomodoro();
      const current = tasks.getCurrent();
      if (current) tasks.addPomodoro(current.id);
    }
    if (silent) return;
    if (settings.sound) ui.playBeep();
    if (settings.notify) {
      ui.notify(
        finished === 'work' ? 'Focus session complete' : 'Break is over',
        finished === 'work' ? 'Nice work — time for a break.' : 'Ready to focus again?',
      );
    }
  },
});

function renderTimer(state = timer.getState()) {
  ui.renderTimer({
    state,
    settings,
    todayCount: todayCount(),
    currentTask: tasks.getCurrent(),
    fullMs: timer.duration(state.mode),
  });
}

function renderTasks() {
  ui.renderTasks({ ...tasks.getState(), filter });
}

// ---- Timer controls ----

ui.els.startBtn.addEventListener('click', () => {
  ui.unlockAudio();
  timer.toggle();
});
ui.els.resetBtn.addEventListener('click', () => timer.reset());
ui.els.skipBtn.addEventListener('click', () => timer.skip());
for (const tab of ui.els.modeTabs) {
  tab.addEventListener('click', () => timer.setMode(tab.dataset.mode));
}

// ---- Task controls ----

ui.els.taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  tasks.add(ui.els.taskInput.value);
  ui.els.taskInput.value = '';
  ui.els.taskInput.focus();
});

for (const btn of ui.els.filterBtns) {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    renderTasks();
  });
}

ui.els.taskList.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  const li = e.target.closest('.task');
  if (!target || !li) return;
  const id = li.dataset.id;
  switch (target.dataset.action) {
    case 'toggle': tasks.toggle(id); break;
    case 'focus': tasks.setCurrent(id); break;
    case 'edit': ui.beginEdit(li, (title) => tasks.rename(id, title)); break;
    case 'delete': tasks.remove(id); break;
  }
});

ui.els.taskList.addEventListener('dblclick', (e) => {
  const li = e.target.closest('.task');
  if (li && e.target.classList.contains('task-title')) {
    ui.beginEdit(li, (title) => tasks.rename(li.dataset.id, title));
  }
});

// ---- Theme ----

const prefersDark = matchMedia('(prefers-color-scheme: dark)');
const savedTheme = () => load('theme', null);

ui.applyTheme(savedTheme() ?? (prefersDark.matches ? 'dark' : 'light'));

ui.els.themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  save('theme', next);
  ui.applyTheme(next);
});

// Follow the OS setting until the user picks a theme explicitly.
prefersDark.addEventListener('change', (e) => {
  if (!savedTheme()) ui.applyTheme(e.matches ? 'dark' : 'light');
});

// ---- Settings ----

ui.els.settingsBtn.addEventListener('click', () => ui.openSettings(settings));

ui.els.settingsForm.elements.notify.addEventListener('change', async (e) => {
  if (e.target.checked && !(await ui.requestNotificationPermission())) {
    e.target.checked = false;
  }
});

ui.els.settingsDialog.addEventListener('close', () => {
  if (ui.els.settingsDialog.returnValue !== 'save') return;
  settings = ui.readSettings(DEFAULT_SETTINGS);
  save('settings', settings);
  timer.applySettings();
  renderTimer();
});

// ---- Start ----

renderTasks();
renderTimer();
timer.resume();
