# RMIT Adflow — Technical App Breakdown (Updated v0.23.0, Engine v2.19)

This document is the official context dump for agents (Claude, Codex, etc.) picking up the codebase cold. It covers the current architecture, state schema, core engines (Auto-Resize, Masking, Link Sync, Dynamic Data), the share/preview portal, the cloud backend, and workflow rules. **Read this in full before making non-trivial changes.**

> Audit note (June 2026): the app currently uses a **frame-based** animation model (discrete `frames[]` + per-element IN/OUT/FX presets + frame transitions). There is **no continuous timeline/scrubber** in the codebase — a prototype timeline system was abandoned and never landed. The word "timeline" appears only as conceptual/legacy labels in docs and the changelog. Resume from this stable frame-based baseline.

---

## 1. Core Architecture & Tech Stack

Adflow is a vanilla-JS single-page application — no framework, no bundler, no build step for the app. Edit the files directly, refresh the browser. The whole app is:

- **Structure**: `index.html` (~780 lines) — shell markup + sequential `<script>` loading.
- **Styling**: `styles.css` (~6000 lines, CSS variables drive 5 named themes).
- **Logic**: **23 app JS files** in `scripts/`, loaded in sequential order via classic `<script>` tags that share one global lexical scope (declarations in earlier files are visible to later files at execution time). Two **Node build scripts** also live in `scripts/` but are not loaded by the browser (`build-asset-manifest.js`, `build-startup-registry.js`).
- **Embedded Fonts**: brand `.woff2` files in `data/fonts/` (12 files), subset and embedded at export time by `scripts/font-subset.js` via HarfBuzz (`lib/hb-subset.wasm`).
- **Persistence**: IndexedDB (`adflow-autosave` DB) for autosaves; `.flow` ZIP archives (JSZip) for project export/import.
- **Cloud Backend**: Supabase for authentication, project storage, shared workspaces, and share-link snapshots.
- **External CDN deps** (in `index.html`): JSZip 3.10.1, `@jaames/iro@5` (color picker), `@supabase/supabase-js@2`.
- **Share portal**: `preview.html` (~1980 lines) is a standalone view-only review page that loads the same `scripts/` engine files (version-pinned) plus its own inline portal code.
- **Deployment**: Netlify (`netlify.toml`), publish root `.`, build command runs the two Node build scripts.

### Script load order (from `index.html`, all version-pinned `?v=`)

CDN libs first, then:

```
render-runtime.js  →  auto-resize-engine.js  →  auto-arrange-config.js  →
docs-content.js    →  auth-ui.js             →  data-merge.js           →
font-subset.js     →  export-pipeline.js     →  color-picker.js         →
core-state.js      →  autosave.js            →  link-system.js          →
canvas-render.js   →  interactions.js        →  canvases-panel.js       →
layers-assets.js   →  props-panel.js         →  toolbar-import.js       →
project-io.js      →  project-dialogs.js     →  modals.js               →
share-preview.js   →  app-boot.js
```

Approximate sizes (LOC): `props-panel.js` 4190 · `export-pipeline.js` 3956 · `canvas-render.js` 2991 · `project-dialogs.js` 2598 · `docs-content.js` 2516 · `auto-resize-engine.js` 2373 · `app-boot.js` 2061 · `interactions.js` 1803 · `toolbar-import.js` 1566 · `data-merge.js` 1408 · `modals.js` 1404 · `layers-assets.js` 1315 · `auth-ui.js` 1001 · `project-io.js` 972 · `canvases-panel.js` 968 · `link-system.js` 741 · `color-picker.js` 689 · `core-state.js` 593 · `render-runtime.js` 568 · `autosave.js` 423 · `share-preview.js` 349 · `auto-arrange-config.js` 294 · `font-subset.js` 215.

---

## 2. File-Routing Table

When looking for specific features or bugs, refer to this table:

| Feature Area | File | Notable Globals / APIs |
| :--- | :--- | :--- |
| **Shared render helpers** (used by both editor and preview portal) | `scripts/render-runtime.js` | render/animation helpers shared to avoid editor↔portal drift |
| **Auto-resize engine** (rules, placement, settings, picker) | `scripts/auto-resize-engine.js` | `ENGINE_VERSION`, `ROLE_IDS`, `runRuleBasedAutoResize`, `autoAssignRole`, `openAutoResizeModal` |
| **Auto-arrange configurations** (coordinates, safezones, font sizes per format) | `scripts/auto-arrange-config.js` | `AUTO_ARRANGE_CONFIG` |
| **In-app documentation** (Help modal) | `scripts/docs-content.js` | `DOCS_SECTIONS`, `openDocumentation`, `renderDocsPanel` |
| **Changelog data & modal** | `scripts/docs-content.js` | `CHANGELOG_DATA`, `openChangelogModal` |
| **Supabase client & session** | `scripts/auth-ui.js` | `sb`, `authState`, `spacesState` |
| **Auth UI / Cloud Projects** | `scripts/auth-ui.js` | `openAuthModal`, `openCloudProjectsModal`, `pushCurrentProjectToCloud` |
| **Team Spaces & Invitations** | `scripts/auth-ui.js` | `openSpaceManagementModal`, `openMembersModal`, `openInviteModal` |
| **Live Data slots & CSV** | `scripts/data-merge.js` | `dm*` helpers, `openDataPanel`, `dmRenderPanel` |
| **ZIP/PNG/GIF Export & Validation** | `scripts/export-pipeline.js` | `exportCanvasAsZip`, `exportCanvasAsPng`, `generateExportHTML` |
| **Font subsetting/embedding** | `scripts/font-subset.js` | HarfBuzz wasm subsetting on export |
| **Color & Gradient Picker** | `scripts/color-picker.js` | `openColorPicker`, `syncColorPickerWithSelection` |
| **Shareable Preview links / snapshots** | `scripts/share-preview.js`, `preview.html` | `previewShare*` state, share dialog, snapshot upload/revoke |
| **Core state / history** | `scripts/core-state.js` | `state`, `history`, `pushHistory`/`undo`/`redo` |
| **Render loop** | `scripts/canvas-render.js` | `render` |
| **Workspace interactions** (drag, marquee, pan, nudge) | `scripts/interactions.js` | pointer/keyboard handlers |
| **Element property editor** | `scripts/props-panel.js` | properties panel (largest module) |
| **Layers & Assets panels** | `scripts/layers-assets.js` | layer tree, asset library |
| **Project IO** (`.flow` import/export, autosave glue) | `scripts/project-io.js`, `scripts/autosave.js` | |
| **Project/Settings dialogs, version check** | `scripts/project-dialogs.js` | `checkVersionUpdate()`, Settings modal |
| **Modals & boot/splash** | `scripts/modals.js`, `scripts/app-boot.js` | `openModal`, splash version badge (`verEl.textContent`) |

---

## 3. Data Model & State Schema

The active project configuration is a single mutable global object named `state` (declared in `core-state.js`). It is JSON-serializable; the parts that persist to `.flow`/cloud vs. the parts that are local preferences are partitioned in the project-IO save path (see `project-io.js`).

```typescript
interface State {
  // ----- Project Identity -----
  projectId?: string;            // UUID; promoted from short uid on first cloud push
  projectName: string;
  adSizeLimit: number;           // KB cap for the ad-weight validator (default: 150)
  spaceId?: string | null;       // Current space context (null = Personal)
  currentVersion?: string;       // Bound row key from dataMerge rows, if any

  // ----- Canvas Content -----
  canvases: Canvas[];
  activeCanvasId: string;
  activeFrameId: number;
  selectedElementId: string | null;
  layerSelection: string[];

  // ----- Frames (discrete, NOT a continuous timeline) -----
  frames: Frame[];

  // ----- Linking -----
  linkGroups: Record<string, LinkGroup>;

  // ----- Assets -----
  assets: Record<string, string>;    // assetId → base64 data URL
  assetNames: Record<string, string>;// assetId → original filename (data-merge image lookup)
  assetLibrary: AssetLibraryItem[];
  assetFolders: AssetFolder[];

  // ----- Dynamic Data / Versions -----
  dataMerge: {
    enabled: boolean;
    columns: string[];                 // header names, in order
    rows: Array<Record<string, string>>;
    keyColumn: string | null;          // column used to name exported zips
    activeVersion: number | null;      // index into rows, or null = template defaults
    locked: boolean;                   // dynamic slots become read-only in editor
    mappings: Record<string, string>;  // 'slotKey::field' -> columnName
    skipHeaders: boolean;
  };

  // ----- Shareable Preview (set when a share link exists) -----
  previewSharePath?: string;     // storage path of the snapshot serving the link
  previewUrl?: string;           // public preview.html link
  previewSharedBy?: string;      // email of sharer
  previewSharedAt?: number;      // epoch ms
  previewExpiry?: number;        // optional expiry epoch ms
  // NOTE: cleared when creating/opening a different project (v0.22.7 fix)

  // ----- View & Customizations -----
  theme?: 'default' | 'rmit' | 'ocean' | 'light' | 'navy';
  showRulers?: boolean;
  showSafezones?: boolean;
  snapEnabled?: boolean; snapToElements?: boolean; snapToCanvas?: boolean; snapToGuides?: boolean;
  snapDistance?: number;
  guides?: any[];
  zoom?: number; zoomStep?: number;
  viewScrollLeft?: number; viewScrollTop?: number;
  loopAd?: boolean; previewCurrentOnly?: boolean;
  outlineMode?: boolean;
  bgApplyAll?: boolean; defaultBg?: string;

  // ----- Preferences -----
  savedHistoryLimit?: number;    // undo depth (default 50)
  autosaveInterval?: number;     // seconds (5-60)
  exportFormat?: 'png' | 'jpeg' | 'webp';
  exportQuality?: number;        // %
  compressFormat?: 'jpeg' | 'webp';  // auto-compression output (jpeg = PNG-for-alpha, ad-server safe)
  defaultCricosCode?: string;        // RMIT compliance code (default '00122A')
  subheadingAutoHide?: boolean;
  favoriteAnimations?: string[];     // persisted to localStorage; filterFavorites toggles the star filter
  filterFavorites?: boolean;

  // ----- Validation & Audit toggles -----
  validationSettings: {
    textSize: boolean; contrast: boolean; transitionTiming: boolean;
    infiniteMotion: boolean; cricos: boolean; logo: boolean;
    brandColors: boolean; brandFonts: boolean;
  };

  // ----- Auto-resize Engine Settings -----
  autoResizeSettings?: {
    rulesEnabled: Record<RoleId, boolean>;
    relations: { r1: boolean };
    behaviour: {
      allowCoverFallback: boolean;
      includeUnassigned:  boolean;
      liveLink: { enabled; syncText; syncFont; syncColor; syncOpacity; syncAnimations: boolean };
    };
  };

  // ----- Auth (transient) -----
  user?: { id: string; email: string } | null;
}

interface Canvas {
  id: string; name: string;
  width: number; height: number;
  elements: Element[];           // z-ordered, last = top
  bgColor?: string;
  fullClickArea?: boolean;       // bypasses CTA click checks if true
}

interface Element {
  id: string;
  type: 'text' | 'image' | 'button' | 'rect' | 'circle' | 'line' | 'pixel';
  customName?: string;
  x: number; y: number; width: number; height: number;
  rotation?: number;
  persistent: 'top' | 'bottom' | false;  // layer-panel section placement
  frameId?: number;              // visible frame index (when persistent === false)
  linkGroupId?: string;

  // Auto-resize Roles
  role?: 'background-image' | 'rmit-logo' | 'cta-button'
       | 'heading' | 'subheading' | 'cricos'
       | 'main-image' | 'rfwn' | 'extra-info' | 'misc';
  roleAuto?: boolean;            // true = auto-detected, false = user-locked

  // Masking
  isMask?: boolean;
  maskTargetId?: string;

  // Type-Specific Attributes
  text?: string; fontFamily?: string; weight?: number;
  fontSize?: number; maxFontSize?: number; autoSize?: boolean; wrapText?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  lineHeight?: number | string; lineHeightAuto?: boolean;
  color?: string; bg?: string; background?: boolean;
  paddingLR?: number; paddingTB?: number; bgPadL?: number; bgPadV?: number;
  bgCoverage?: number; bgOpacity?: number;
  radius?: number;
  fill?: string; stroke?: string; strokeWidth?: number; textColor?: string;
  assetId?: string; src?: string;
  fit?: 'contain' | 'cover' | 'fill';
  autoHug?: boolean;             // dynamic button widths
  opacity?: number;

  // Animation — four independent categories (IN / OUT / FX / TRANS)
  inEnabled?: boolean;   animType?: string;    animDuration?: number; animDelay?: number;
  exitEnabled?: boolean; exitType?: string;    exitStart?: number;    exitDuration?: number;
  fxEnabled?: boolean;   effectType?: string;  effDuration?: number;

  // Dynamic Data Opt-ins
  dmText?: boolean; dmColor?: boolean; dmBg?: boolean; dmImage?: boolean;

  // States
  hidden?: boolean; locked?: boolean;
}

interface Frame {
  id: number;
  duration: number;              // seconds
  transition: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom-in' | 'zoom-out' | 'push' | 'iris' | 'split';
  transitionDuration: number;
  skip?: boolean;                // excluded from HTML5 exports when flagged (default)
}

interface LinkGroup {
  id: string; name: string;
  category: 'text' | 'image' | 'button' | 'shape' | 'line';
  syncProperties: Record<string, boolean>;  // includes 'OUT Animation' option
  liveLink?: boolean;
}
```

---

## 4. Subsystems Detail

### Auto-Resize Engine (v2.19) & Auto-Arrange Configurations
Deterministic, rule-based layout generator. Takes a source canvas and targets, recalculates relative sizes, crops, and wrapping.
- **Geometries & Parameters**: per-size placement specs, safezones, max font-sizes, and brand-element (Logo, Tagline, CRICOS) quadrant coordinates live in `auto-arrange-config.js` (`AUTO_ARRANGE_CONFIG`).
- **Roles**: priority order (`rmit-logo` → `cta-button` → `heading` → …).
- **Crop Preservation**: the `main-image` ("Fixed shape") role keeps exact aspect ratio, computing normalized crop offsets for small targets.
- **R1 Alignments**: pairs the logo with the "Ready for what's next" tagline dynamically.
- **Adjacency Post-Pass**: `enforceHeadingSubheadAdjacency` clears overlap between side-by-side headings/subheadings.

### Animation System — IN / OUT / FX / TRANS toggles
Four independent header toggles in the Animation panel (replaced the old Static/In/In+Out mode dropdown). Turning a category off **remembers** its settings; turning it back on restores them. New elements start with IN, FX, TRANS on and OUT off.
- **IN (Entrance)** — `inEnabled` + `animType` (fade/slide/swipe/zoom/blur, with direction/fade where relevant). `animDuration`, `animDelay`. A `None` preset hides the duration/delay fields and emits nothing.
- **OUT (Exit)** — `exitEnabled` + `exitType`. Requires IN to be enabled (OUT toggle is disabled with no entrance). Single "In → Out" time (`exitStart`) = how long the element stays after appearing before leaving; runs independently of frame duration. Not applied to persistent layers. Has its own `None` preset. Synced across linked elements via the link group's "OUT Animation" option, and included in the favorites star filter.
  - **Exit timing**: CSS exit start delay = `(animDelay || 0) + (exitStart || 1.5)`, so the "after X seconds" counts from when the element actually appears, not the frame start.
- **FX (Animation FX)** — `fxEnabled` + `effectType` (float, pulse, pan/Move, type, etc.). Named "Animation FX" everywhere (panel heading, tooltip, dropdown, link-sync option, docs).
- **TRANS (Frame Transition)** — `transition !== 'none'` on the active frame. Available whenever a transition can actually play: a forward frame (`activeIdx > 0`), or **any** frame when Loop is on — including a **single frame** (v0.23.0). Greyed out only for a lone static frame with Loop off. The gate is unified as `state.loopAd || (state.frames.length > 1 && idx > 0)` across the panel (`props-panel.js`) and the export data path.

**Single-frame self-restart loop (v0.23.0):** with exactly one frame and Loop on, `nextFrame()` still bails (it needs ≥2 frames), so the export runtime instead schedules `restartSingleFrame()` (in `export-pipeline.js`, emitted into every export). Each cycle it hides → forces reflow → re-shows the frame (the same `display:none→block` trigger that restarts every child IN animation, mirroring `adflowPlayFrom`), replays the frame's transition-in if one is set, then re-schedules itself after the frame's `duration`. This makes looping single-frame ads (e.g. animated email signatures) re-animate. An unset transition still resolves to `'none'` on frame 0 (same as multi-frame loop-back), so IN-animation replay works with no transition; pick a transition explicitly to layer one on each restart.

### Shareable Preview System & Standalone Review Portal
- **Share links** (`share-preview.js` + `preview.html`): generates secure, public view-only links serving a **dedicated snapshot** in Supabase storage (`previewSharePath`), not the live cloud file.
- **Live links**: every cloud save updates what reviewers see at the same link; local-only edits stay private until saved to cloud. "Delete Link" revokes access immediately; generating a new link invalidates the previous one.
- **New-project hygiene** (v0.22.7): creating/opening a different project clears prior `previewShare*` metadata so the Share dialog opens to "create link", not a stale link.
- **Name-clash flow** (v0.22.6): on a cloud name collision the Replace/Rename prompt lets sharing continue.
- **Portal features**: sidebar size checklist, version switching (data-merge rows), "Static only" frame-by-frame isolation, Play / frame jump-and-play / Replay all / Download all (zip), per-banner restart, runtime readout (total + per-frame, ↻ when looping), checkered grid, clickTag region highlight, compliance/ad-weight audits.
- **No drift**: shared render helpers live in `render-runtime.js` (consumed by both editor and portal); `preview.html` engine scripts are version-pinned `?v=` so reviewers never pair stale engine code with new portal code.

### Full Preview Controls (editor)
The editor's full-preview bar has a frame selector (jump-and-play across all sizes), "Replay all", "Download all" (each size as an HTML5 zip), and the total/per-frame runtime readout. These controls live only in the editor — exported files are unchanged.

### Export, Font Subsetting & Validation
- **Formats**: HTML5 ZIP, PNG, GIF. Per-version export folders for data-merge. ZIP is compressed/streamed via a background worker to avoid main-thread lockups.
- **Font subsetting/embedding** (`font-subset.js` + `lib/hb-subset.wasm`): exported ads contain **no font files** — each required brand font is subset to the glyphs actually used and embedded as base64 in `index.html` (ad-server safe for Google Ads / Adobe DSP, keeps text editable/animatable). Graceful fallback to packing full `.woff2` if subsetting is unavailable. All live size readouts measure the subsetted output.
- **Auto-compression** (`compressFormat`): default `jpeg` resolves to PNG when the image has an alpha channel, otherwise JPEG (avoids WebP rejection by CM360 / Google Ads / Adobe DSP). `webp` is opt-in.
- **Validation & Audit** (`validationSettings`): text size, contrast, transition timing, infinite motion, CRICOS, logo, brand colors, brand fonts, ad-weight (KB) limit, and per-active-version clickTag URL validation. Canvas badges update live; clickTag/ad-weight changes participate in undo/redo and re-run validation.

### CSS `clip-path` Vector Masking
Mask shapes (rect/circle/custom brand SVG) use inline CSS `clip-path` instead of SVG def references. A connector line bridges the mask layer and target image row in the Layers panel. Animation FX apply to the mask wrapper while the child image receives inverse animation, keeping the background photo stationary.

### Spreadsheet Data Merge
Maps columns to dynamic element slots to batch-generate banners. Edit-in-place writes back to the active version row cell unless Data Lock (`locked`) is on. Link-group sync-lock forces `text`/`textColor`/`color`/`image` sync `true` for elements bound to active dynamic slots (checkboxes replaced by a locked bolt icon in the Link Groups panel; enforced in `applyLinkSync` and `dmToggleField`).

### Undo / History
`savedHistoryLimit` (default 50) bounds the stack. Frames (durations/transitions/skip), `activeFrameId`, `projectName`, and arrow-key nudges are undoable (a held nudge = one undo step per burst). **Settings/preferences are intentionally excluded** from undo (theme, auto-resize behaviour, view prefs, zoom/scroll, ad-weight limit, validation toggles) — though changing the ad-weight limit / clickTag still re-runs live validation.

---

## 5. Workflow Conventions

### Commit Workflow
- **Never run `git add` / `git commit` / branch / push.** Save files directly to the local checkout. The user manages commits and branches in GitHub Desktop.

### Changelog Workflow
After user-visible changes, **bump the version and update these 6 locations**. Reliable method: `grep -rn "<old version>"` across `*.js *.html *.txt` and bump every live hit.

1. `data/version.txt` — single-line version string (e.g. `v0.22.7`).
2. `data/changelog.txt` — add entry at the **top** of the file.
3. `scripts/docs-content.js` — insert into the `CHANGELOG_DATA` array.
4. `scripts/project-dialogs.js` — `currentVersion` in `checkVersionUpdate()` + the Settings-modal version label. (Splash-badge version lives in `scripts/app-boot.js`, `verEl.textContent`.)
5. `index.html` — `#app-version-display` footer label, the `.app-splash-version` span, **and every local `<script src="...?v=...">` query string**.
6. `preview.html` — the `?v=` query strings on its engine `<script>` tags (portal loads the same `scripts/` files; never pair stale engine code with new portal code).

Skip the bump for trivial/internal-only changes (see the project memory on changelog workflow).

### Severity Guide
- **Patch (Z+1)**: bug fixes, UI polish, tuning.
- **Minor (Y+1)**: new features, interface reorganizations, workflow changes.
- **Major (X+1)**: breaking revisions.

---

## 6. Repo Hygiene Notes (June 2026)
Loose/debug artifacts currently tracked in the repo that are **not** part of the runtime and are safe to ignore or remove: `diff_props.txt` (UTF-16 git-diff dump), `error_logs.txt` (empty), `workflow-test.txt` (write-workflow probe), `_temp/Mask animations.mp4` (~5 MB), `data/image.jpg` (loose). `Startup/registry.json` and `data/assets/manifest.json` are **build outputs** regenerated by the Node build scripts. An MP4-export tool was prototyped and reverted (see project memory) — only the `_temp` MP4 remains as a trace.
