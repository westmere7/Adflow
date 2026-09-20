# RMIT Adflow — desktop app (Electron)

A prototype desktop wrapper around the **same web app**, for Windows and macOS.
Nothing in `scripts/`, `styles.css` or the three HTML pages was changed to make
this work: the desktop build and the hosted build run identical code, so they
cannot drift apart.

For hosting the web version (Docker, Vercel), see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Why Electron and not Tauri

Tauri produces much smaller apps, but it renders in the operating system's own
webview: Chromium on Windows, **Safari's engine on macOS**. Adflow depends on two
Chromium-only APIs:

| Feature | API | File |
|---|---|---|
| MP4 / WebM export | WebCodecs `VideoEncoder` | `scripts/video-export.js` |
| Native save dialog | `showSaveFilePicker` | `scripts/project-io.js`, `scripts/export-pipeline.js` |

A system-webview wrapper would therefore ship a Mac build quietly missing video
export and the native save dialog — the exact Windows/Mac split the desktop app
is supposed to remove. Electron bundles its own Chromium, so both platforms get
the full feature set, and Mac users stop losing features to Safari.

The cost is installer size: roughly 150–200 MB against Tauri's ~10 MB. For an
internal design tool that is not a meaningful trade.

---

## How it works

Three files, about 300 lines total:

| File | Role |
|---|---|
| `electron/main.js` | Window, menu policy, link handling, single-instance lock |
| `electron/static-server.js` | Read-only HTTP server on loopback, serving the app folder |
| `electron/preload.js` | A read-only `window.adflowDesktop` marker and nothing else |

**Why there is a server inside the app.** Electron could load `index.html` over
`file://`, but Adflow cannot run that way. Every ad preview is an `<iframe
srcdoc>` sandbox, and export spawns a `blob:` Worker that `importScripts()` the
vendored JSZip. Under `file://` those get opaque origins and the browser blocks
them — which is why `export-pipeline.js` already refuses to export PNGs on
`file://`. Serving over `http://127.0.0.1` gives the renderer exactly the
environment the app was written against. Chromium also treats loopback as a
secure context, which is what keeps `showSaveFilePicker` and WebCodecs working.

**Why the port is fixed (47823).** Browser storage is keyed to the origin, and
the origin includes the port. A random port each launch would show the user an
empty workspace every time: autosave, recents, the base project and remembered
placements all live in IndexedDB and localStorage. If the port is genuinely
taken by something else, the app falls back and **says so in a dialog** rather
than silently appearing to have lost the user's work.

**Menu policy.** Adflow already owns almost every modifier shortcut, including
`Ctrl+R` for rulers and `Ctrl+Y` for outline mode, so a standard Electron menu
would steal them. Windows and Linux therefore get **no application menu at all**.
macOS gets the minimum the platform requires, because macOS routes clipboard
shortcuts for text fields through the menu — without an Edit menu, `Cmd+C` and
`Cmd+V` stop working inside input fields entirely. That is safe here because the
app's own key handler defers whenever focus is in an `INPUT`, `TEXTAREA` or
`contentEditable`.

---

## Running it

**Windows:** double-click `run-electron.bat`.
**macOS / Linux:** double-click `run-electron.command`.

Either one installs Electron on first run (a couple of minutes, once) and then
launches the app. By hand:

```bash
npm install
npm start
```

Node.js is required for development only. It is **not** required by the built
installer — Electron carries its own runtime.

---

## Building installers

**Nothing rebuilds automatically.** Changing the app changes nothing in `dist/`
until one of these is run, and each produces a different thing:

| Command | Produces | Use it for |
|---|---|---|
| `npm start` | nothing on disk | Development. Picks up edits on restart |
| `npm run dist:dir` | `dist/win-unpacked/` only | Fast check that packaging works, and a portable copy to run |
| `npm run dist:win` | the **installer**, plus a fresh `win-unpacked/` | Anything you are about to send to someone |
| `npm run dist:mac` | the `.dmg` (needs a Mac) | Same, for macOS |

> **The trap:** `dist:dir` refreshes the portable folder but leaves the installer
> untouched, so `dist/` can hold a current portable build next to a stale
> installer. Worse, installers are named after their version, so a new build adds
> `Setup 0.60.1.exe` beside the old `Setup 0.60.0.exe` rather than replacing it.
> It is genuinely easy to send someone the wrong file.

To remove the guesswork, build anything you intend to distribute with:

```bash
npm run release:win
```

That empties `dist/` first, so whatever is left in the folder afterwards is the
build you just made and nothing else. `npm run clean` does the emptying on its
own. Nothing outside `dist/` depends on it and the folder is git-ignored, so
deleting it is always safe.

Close the app before building. Windows will not let the build overwrite files
that a running copy has open.

Close the app before building. Windows will not let the build overwrite files
that a running copy has open.

`electron-builder` runs the two generator scripts first, so the asset manifest
and startup registry are current in the package.

**A Mac build needs a Mac.** A signed, notarized `.dmg` cannot be produced from
Windows. Use a Mac, or a `macos-latest` runner on GitHub Actions.

`asar` is deliberately **disabled** in `package.json` so the packaged app keeps
its files on disk exactly as the repository has them, which keeps the internal
server's behaviour identical to development. Re-enable it once a packaged build
has been exercised end to end.

---

## Before this goes to staff

Three things stand between this prototype and something you can hand out. None
of them is code.

1. **Code signing.** Unsigned apps are blocked by Gatekeeper on macOS ("cannot be
   opened because the developer cannot be verified") and warned about by
   SmartScreen on Windows. macOS additionally requires notarization. Ask ITS
   first — a university this size very likely already holds both certificates,
   and procurement is the long pole if it does not.
2. **Updates.** The hosted version updates for everyone the moment it is
   rebuilt. A desktop app does not. Either add `electron-updater` with a hosted
   feed, or accept manual reinstalls and a fleet that drifts. This is the
   ongoing cost teams underestimate.
3. **Distribution.** Straightforward if ITS manages devices with Intune or Jamf.

---

## Things to know

- **Work does not migrate automatically.** The desktop app has its own storage,
  separate from the browser's. Anyone moving across should save their projects
  as `.flow` files first and open them in the app.
- **It still needs no network.** Everything is local: no accounts, no uploads,
  no third-party requests. Same as the hosted local edition.
- **It can run alongside Docker.** The desktop app uses port 47823, the
  container uses 8080.
- **The icon is a placeholder** — `build/icon.png`, generated from the square
  RMIT pixel. Replace it with a properly designed 512×512 icon before release.
- **This introduces the repository's first npm dependency.** The web app itself
  still has none and still needs no build step; `node_modules/` and `dist/` are
  git-ignored, and the Electron files are excluded from both the Docker image
  and the Vercel upload.

---

## Verified so far

Tested on Windows: app launches, all three pages load over the internal server,
no console errors, the portals open as their own windows, and external links go
to the system browser.

**Not yet tested on macOS** — no Mac available here. The macOS-specific paths are
the Edit menu's interaction with the app's own `Cmd+C` / `Cmd+V` element
handling, Gatekeeper behaviour, and the `.command` launcher's executable bit.
