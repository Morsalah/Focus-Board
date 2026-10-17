# Focus Board

A productivity dashboard with a Pomodoro timer and a task manager. Built with
plain HTML, CSS and JavaScript. No frameworks, no build step. All data stays in
your browser's localStorage.

## Features

**Pomodoro timer**
- Focus / short break / long break sessions (25 / 5 / 15 min by default, adjustable)
- Long break after every N focus sessions (default 4)
- Start, pause, reset and skip
- Live countdown in the browser tab title
- Sound alert (generated with the Web Audio API) and optional browser notification
- Count of pomodoros completed today
- Keeps accurate time in background tabs and resumes after a page reload

**Tasks**
- Add, edit (double-click or ✎), complete and delete tasks
- Filter: All / Active / Done
- Mark a task as "current" (◎) to link it to the timer: each completed focus
  session adds a 🍅 to that task

**General**
- Light and dark mode (follows your OS until you pick one)
- Everything is saved automatically in localStorage

## Running it

The app uses ES modules, which browsers won't load from `file://`. Serve the
folder over HTTP instead:

```sh
npx serve .
```

Then open the URL it prints (usually http://localhost:3000).

Alternatives: the **Live Server** extension in VS Code, or
`python -m http.server 8000`.

## Project structure

```
index.html        Page markup
css/styles.css    Styles, light/dark theme variables
js/main.js        Entry point: wires everything together
js/storage.js     localStorage wrapper (namespaced, versioned keys)
js/timer.js       Pomodoro state machine (no DOM)
js/tasks.js       Task list state (no DOM)
js/ui.js          Rendering, theme, sound, notifications
```

## Data

Stored under `focusboard:v1:*` keys: `tasks`, `timer`, `settings`, `stats`,
`theme`. To start fresh, clear this site's data in your browser's dev tools.
