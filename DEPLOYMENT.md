# RMIT Adflow — Deployment Guide (local edition)

This branch of Adflow is a **static web application with no backend**. There are no
accounts, no database, no uploads and no third-party requests at runtime: every
library and font is in the repository, and everything a user makes stays in their
browser unless they save or export a file.

Deploying it therefore means one thing: serve the repository's files over HTTP
with the right MIME types and cache headers. Two ready-made targets are included.

| Target | Files | Use when |
|---|---|---|
| **Docker** (recommended for ITS) | `Dockerfile`, `docker-compose.yml`, `docker/nginx.conf`, `.dockerignore` | Hosting inside RMIT's own infrastructure or an intranet |
| **Vercel** | `vercel.json`, `.vercelignore` | A managed static host for a public or team URL |

Any other static host works too — see [Other static hosts](#other-static-hosts).

---

## 1. Docker

### First time with Docker? Read this first

Docker packages an application **and** the web server it needs into one file
called an *image*. Running an image gives you a *container*: an isolated,
throw-away process that behaves the same on every machine. For Adflow that
means ITS never has to install Node, nginx or anything else — they run one
command and get a web server on a port.

The three words you will meet:

| Word | Meaning here |
|---|---|
| **Image** | The built, read-only package (`rmit-adflow`). Made by `docker build` from the `Dockerfile`. |
| **Container** | A running instance of the image. Made by `docker run` or `docker compose up`. Delete it freely; nothing is stored inside. |
| **Compose** | `docker-compose.yml` records the `run` options (port, restart policy, hardening) so nobody has to remember flags. |

**No terminal needed on Windows.** Install Docker Desktop, then double-click
`run-docker.bat` in the repository folder. It starts Docker Desktop if it is
not running, builds the image, starts the container and opens the browser.
`stop-docker.bat` stops it. From then on use the Docker Desktop window:
**Containers** tab → `rmit-adflow` row → the Play / Stop buttons, the
`8080:8080` link to open the app, and the **Logs** tab to see requests.

Otherwise: on Windows or macOS install **Docker Desktop** and start it (the
whale icon in the tray must be steady, not animating). On Linux servers install
Docker Engine and the Compose plugin. Then, in a terminal **inside the
repository folder**:

```bash
docker compose up -d --build
```

The first run downloads two small base images and takes a minute or two; after
that it is seconds. Open <http://localhost:8080/>. Useful follow-ups:

```bash
docker compose ps          # is it running, is it healthy
docker compose logs -f     # live nginx log (Ctrl+C to stop following)
docker compose down        # stop and remove the container (the image stays)
docker compose up -d --build   # rebuild after pulling new code
```

Everything users make stays in **their browsers**, not in the container, so
stopping, rebuilding or deleting the container never loses anyone's work.

### Prerequisites

- Docker Engine 24+ (or Docker Desktop) with Compose v2.
- Internet access **only at build time**, to pull the two public base images
  (`node:20-alpine`, `nginxinc/nginx-unprivileged:1.27-alpine`). Nothing is
  downloaded from npm or any CDN.

### Quick start

```bash
docker compose up -d --build
```

Then open <http://localhost:8080/>. Stop with `docker compose down`.

Without Compose:

```bash
docker build -t rmit-adflow .
docker run -d --name rmit-adflow -p 8080:8080 --restart unless-stopped rmit-adflow
```

### What the image contains

- **Build stage** (`node:20-alpine`) copies the repository, runs the two generator
  scripts the app reads at boot (`scripts/build-asset-manifest.js` writes
  `data/assets/manifest.json`; `scripts/build-startup-registry.js` writes
  `Startup/registry.json`), then deletes the generators.
- **Runtime stage** (`nginxinc/nginx-unprivileged`) serves the result. It runs as
  the `nginx` user (uid 101), listens on **8080**, and has a `HEALTHCHECK` that
  requests `/healthz`. The image has no shell entry point for the app itself and
  no writable application state.
- `.dockerignore` keeps `.git`, dev tooling, repo docs and the deploy configs
  for other targets out of the image.

### Changing the port

The container always listens on 8080. Change the **host** side of the mapping:

```yaml
ports:
  - "80:8080"      # docker-compose.yml
```

or `docker run -p 80:8080 …`. Binding a host port below 1024 needs the usual
privileges on the host; the container itself stays unprivileged.

### Reverse proxy and TLS

Put the container behind whatever RMIT uses for TLS termination (Traefik, nginx,
IIS ARR, a cloud load balancer). Adflow uses only relative URLs, so it works at
any hostname and under `https://` with no configuration. If it must live under a
sub-path (e.g. `https://tools.example/adflow/`), proxy that path to the
container's `/` **and** strip the prefix; the pages reference `scripts/…`,
`styles.css` and `data/…` relative to the page, so a same-path proxy is enough.

Do not enable proxy-level caching of `index.html`, `preview.html`, `batch.html`
or `data/version.txt` (the container already sends `no-store` for them). The app
polls `data/version.txt` to notice a new deploy and every script tag is pinned
to the app version, so cached HTML would pair old pages with new code.

### Hardening applied in `docker-compose.yml`

`read_only: true` with a `tmpfs` at `/tmp`, `cap_drop: ALL`, and
`no-new-privileges`. Remove these if your platform rejects them; the image runs
fine without them.

A Content-Security-Policy is deliberately **not** set by the container. The app
renders ad previews in sandboxed `srcdoc` iframes, builds export ZIPs in a
`blob:` Web Worker and lazy-loads two ES modules; a strict CSP breaks those. If
ITS policy requires a CSP, start from
`default-src 'self' blob: data:; script-src 'self' blob: 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; worker-src 'self' blob:; frame-src 'self' blob: data:`
and test Export, the Preview Portal and video export before rolling it out.

### Health and monitoring

- `GET /healthz` → `200 ok` (served by nginx, no file access).
- `GET /data/version.txt` → the deployed app version, e.g. `v0.60.0`.
- `docker inspect --format '{{.State.Health.Status}}' rmit-adflow` → `healthy`.

### Updating

```bash
git pull
docker compose up -d --build
```

The container holds no state, so recreating it loses nothing. Users' work lives
in **their** browsers (IndexedDB + localStorage for that origin) and in the
`.flow` files they save; a new deploy never touches it. Users see an
"RMIT Adflow Updated" dialog on their next load.

---

## 2. Vercel

1. Create a **new** Vercel project from this repository and branch. Do not reuse
   the project that serves the cloud-connected edition.
2. Framework preset: **Other**. `vercel.json` already sets the build command
   (the two generator scripts), the output directory (`.`), an empty install
   command (there is no `package.json` and nothing to install), and the same
   cache/security headers the Docker image sends.
3. Deploy. No environment variables are needed.

If the dashboard rejects `.` as the output directory, clear the Output Directory
field in the project settings (the repository root is Vercel's default for a
static project) and keep the build command.

`.vercelignore` excludes the Docker files, dev server and repo docs from the
upload.

---

## 3. Other static hosts

Serve the repository root (after running the two generator scripts) and make
sure of three things:

1. `.wasm` is served as `application/wasm` (HarfBuzz font subsetting on export).
2. `.mjs` is served as JavaScript (`text/javascript`): the video/GIF encoders are
   lazy-loaded ES modules.
3. `index.html`, `preview.html`, `batch.html` and `data/version.txt` are **not**
   cached by the host or a CDN.

Serving over `file://` is not supported: the sandboxed preview iframes require
an HTTP origin.

---

## 4. Browser requirements

- Chromium-based browsers (Chrome / Edge 90+) for the full feature set,
  including the native save dialog and WebCodecs video export.
- Firefox and Safari work with fallbacks (downloads instead of a save dialog;
  GIF export everywhere, video export where WebCodecs is available).
- Minimum viewport 1366 × 768; the app shows a "larger screen" notice below that.

---

## 5. Data, privacy and backups

- **Where work is stored:** in the user's browser profile for the site's origin
  — autosave and recents in IndexedDB, preferences, remembered placements and
  the base project alongside them. Nothing is sent anywhere.
- **Consequence:** clearing site data for the Adflow origin, switching browser
  profile, or moving to another machine means starting from an empty board.
  Encourage users to keep `.flow` backups (`Ctrl+S`) of anything that matters;
  a `.flow` reopens on any machine and any deployment.
- **What the server sees:** ordinary static-file access logs (nginx or Vercel).
  No application data is ever posted.

---

## 6. Local development

```bash
node dev-server.js 8123
```

Zero-dependency Node server with `no-store` headers and live reload. On Windows,
`run-server.bat` also regenerates the two indexes and opens a browser. Any static
server works (`python -m http.server 8080`), but remember to rerun the generators
after adding assets or startup templates.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Export fails with a WebAssembly / MIME error | `.wasm` served as `application/octet-stream` or `text/plain` | Fix the host's MIME map (the Docker image already does) |
| Video / GIF export "module" error | `.mjs` not served as JavaScript | Same as above for `.mjs` |
| App looks unchanged after a deploy | `index.html` cached upstream | Disable caching of HTML and `version.txt` at the proxy/CDN |
| Blank previews, console shows CORS errors | Opened via `file://` | Serve over HTTP |
| Container `unhealthy` | nginx not up or site files missing | `docker logs rmit-adflow`; rebuild the image |
