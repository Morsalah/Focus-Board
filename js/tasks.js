// Task list state. No DOM access: every mutation reports the new state via onChange.

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createTaskStore({ saved, onChange }) {
  let tasks = Array.isArray(saved?.tasks) ? saved.tasks : [];
  let currentId = tasks.some((t) => t.id === saved?.currentId) ? saved.currentId : null;

  const find = (id) => tasks.find((t) => t.id === id);

  function getState() {
    return { tasks, currentId };
  }

  function getCurrent() {
    return find(currentId) ?? null;
  }

  function commit() {
    onChange(getState());
  }

  function update(id, changes) {
    tasks = tasks.map((t) => (t.id === id ? { ...t, ...changes } : t));
  }

  function add(title) {
    const clean = title.trim();
    if (!clean) return;
    tasks = [...tasks, { id: newId(), title: clean, done: false, pomodoros: 0, createdAt: Date.now() }];
    commit();
  }

  function rename(id, title) {
    const clean = title.trim();
    if (!clean || !find(id)) return;
    update(id, { title: clean });
    commit();
  }

  function toggle(id) {
    const task = find(id);
    if (!task) return;
    update(id, { done: !task.done });
    if (!task.done && currentId === id) currentId = null;
    commit();
  }

  function remove(id) {
    tasks = tasks.filter((t) => t.id !== id);
    if (currentId === id) currentId = null;
    commit();
  }

  // Selecting the current task again clears the selection.
  function setCurrent(id) {
    const task = find(id);
    if (!task || task.done) return;
    currentId = currentId === id ? null : id;
    commit();
  }

  function addPomodoro(id) {
    const task = find(id);
    if (!task) return;
    update(id, { pomodoros: task.pomodoros + 1 });
    commit();
  }

  return { getState, getCurrent, add, rename, toggle, remove, setCurrent, addPomodoro };
}
