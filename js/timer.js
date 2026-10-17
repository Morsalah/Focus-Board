// Pomodoro state machine. No DOM access: callers render via the callbacks.
//
// Time is tracked as an absolute end timestamp rather than by counting ticks,
// so the countdown stays accurate when the tab is throttled in the background.

export const MODES = {
  work: 'Focus',
  short: 'Short Break',
  long: 'Long Break',
};

export function createTimer({ getSettings, saved, onTick, onChange, onComplete }) {
  const duration = (mode) => getSettings()[mode] * 60_000;

  let state = saved && saved.mode in MODES
    ? { ...saved }
    : { mode: 'work', running: false, endTime: null, remainingMs: duration('work'), cycle: 0 };

  let intervalId = null;
  let endTimeoutId = null;

  function remaining() {
    return state.running ? Math.max(0, state.endTime - Date.now()) : state.remainingMs;
  }

  function getState() {
    return { ...state, remainingMs: remaining() };
  }

  function changed() {
    onChange(getState());
  }

  function tick() {
    if (state.running && Date.now() >= state.endTime) {
      finish({ natural: true, silent: false });
    } else {
      onTick(getState());
    }
  }

  function startTicking() {
    stopTicking();
    intervalId = setInterval(tick, 250);
    // A single unchained timeout isn't subject to the heavy throttling browsers
    // apply to long-running intervals in hidden tabs, so the alert fires on time.
    endTimeoutId = setTimeout(tick, remaining() + 20);
  }

  function stopTicking() {
    clearInterval(intervalId);
    clearTimeout(endTimeoutId);
    intervalId = endTimeoutId = null;
  }

  function enterMode(mode) {
    stopTicking();
    state = { ...state, mode, running: false, endTime: null, remainingMs: duration(mode) };
  }

  function start() {
    if (state.running) return;
    state = { ...state, running: true, endTime: Date.now() + state.remainingMs };
    startTicking();
    changed();
  }

  function pause() {
    if (!state.running) return;
    state = { ...state, running: false, endTime: null, remainingMs: remaining() };
    stopTicking();
    changed();
  }

  function toggle() {
    state.running ? pause() : start();
  }

  function reset() {
    enterMode(state.mode);
    changed();
  }

  function setMode(mode) {
    enterMode(mode);
    changed();
  }

  function skip() {
    finish({ natural: false, silent: true });
  }

  // natural: the countdown reached zero (vs. skipped).
  // silent: suppress sound/notification (e.g. a session that expired while the page was closed).
  function finish({ natural, silent }) {
    const finished = state.mode;
    let next;
    if (finished === 'work') {
      if (natural) state.cycle += 1;
      next = state.cycle >= getSettings().longEvery ? 'long' : 'short';
    } else {
      if (finished === 'long') state.cycle = 0;
      next = 'work';
    }
    enterMode(next);
    onComplete(finished, { natural, silent });
    changed();
  }

  // Call once after wiring up: resumes a session that was running before reload.
  function resume() {
    if (!state.running) return;
    if (Date.now() >= state.endTime) {
      finish({ natural: true, silent: true });
    } else {
      startTicking();
    }
  }

  // New durations apply immediately to an idle timer; a running one finishes as planned.
  function applySettings() {
    if (!state.running) reset();
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });

  return { getState, start, pause, toggle, reset, setMode, skip, resume, applySettings, duration };
}
