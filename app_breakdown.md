# RMIT Adflow — Technical App Breakdown

<p align="center">
  <img src="file:///g:/My Drive/RMIT_WORKS/Apps/Adflow/data/Elements/Adflow_logo.svg" alt="RMIT Adflow Logo" width="300" />
</p>

This document is a context dump for agents picking up the codebase. It covers the
current architecture (Adflow **v0.16.7**, Auto-Resize **engine v2.7**) — file
layout, state model, the auto-resize engine in depth, cloud / auth / spaces,
theme system, masking, link groups, and the rest. Read this in full before
making non-trivial changes.

## Table of Contents
- [1. Core Architecture & Tech Stack](#1-core-architecture--tech-stack)
- [2. File Directory Structure](#2-file-directory-structure)
- [3. Data Model & State Schema](#3-data-model--state-schema)
- [4. Auto-Resize Engine (v2.7)](#4-auto-resize-engine-v27)
- [5. Layer Panel & Role Assignment](#5-layer-panel--role-assignment)
- [6. Link Groups & Live-Link Mode](#6-link-groups--live-link-mode)
- [7. Image Masking Engine](#7-image-masking-engine)
- [8. Frames, Timeline & Animation](#8-frames-timeline--animation)
- [9. Data & Versions (Dynamic Data)](#9-data--versions-dynamic-data)
- [10. Cloud, Supabase & Spaces](#10-cloud-supabase--spaces)
- [11. Splash Screen & Auth Gate](#11-splash-screen--auth-gate)
- [12. Theme System](#12-theme-system)
- [13. Persistence & Autosave](#13-persistence--autosave)
- [14. Documentation Modal](#14-documentation-modal)
- [15. Recent UI Shifts (v0.16.x)](#15-recent-ui-shifts-v016x)
- [16. Workflow Conventions](#16-workflow-conventions)

---

## 1. Core Architecture & Tech Stack

Adflow is a vanilla-JS single-page application — no framework, no bundler, no
build step. Edit the files directly, refresh the browser. The whole app is:

- **Structure** — `index.html` (one big skeleton, ~620 lines).
- **Styling** — `styles.css` (~4050 lines, CSS variables drive 5 named themes).
- **Logic** — `script.js` (~16,000 lines, single monolith) + `auto-resize-engine.js` (~1300 lines, the rule-based placement engine — loaded BEFORE `script.js` so its globals are available everywhere).
- **Persistence** — IndexedDB (`adflow-autosave` DB) for autosave; `.flow` ZIP archives (JSZip) for project export/import.
- **Cloud (optional)** — Supabase auth + Storage. Users can sign in or use locally; data sync is explicit (push/pull) rather than continuous.

JSZip and Supabase SDK are loaded from CDN tags in `index.html`. Everything else
runs from the local files.

---

## 2. File Directory Structure

```
/
├── index.html                ← UI skeleton + inline splash CSS
├── styles.css                ← All non-splash styles (themes, panels, modals)
├── script.js                 ← Main app logic (state, render, modals, persistence, …)
├── auto-resize-engine.js     ← Rule-based resize engine (loaded before script.js)
├── data/
│   ├── version.txt           ← Plain text, single line: vX.Y.Z
│   ├── changelog.txt         ← Human-readable changelog
│   ├── Elements/
│   │   ├── Adflow_logo.svg            ← Dark-theme wordmark
│   │   ├── Adflow_lighttheme.svg      ← Light-theme wordmark (used when state.theme === 'light')
│   │   ├── RMIT_*.svg / Pixel.svg     ← Brand assets used in canvas content
│   │   └── favicon.*
│   └── assets/               ← Pre-loaded brand creative (jpg/png/svg) — scanned at startup
└── app_breakdown.md          ← This file
```

A "Resize ref" sibling folder (outside the app dir) holds the rules document
the auto-resize engine is tuned against — `auto-resize-rules.md`. Not
shipped with the app, used during engine development.

---

## 3. Data Model & State Schema

Single global `state` object (declared around `script.js` line 402). Persisted
verbatim to IndexedDB via `buildStateSnapshot` and rehydrated by `restoreAutosave`.

```typescript
interface State {
  // ----- Project identity -----
  projectId?: string;            // UUID; promoted from short uid on first cloud push
  projectName: string;
  adSizeLimit: number;           // KB cap for the ad-weight validator
  spaceId?: string | null;       // Current space context (null = Personal)
  currentVersion?: string;       // Bound row from dataMerge.rows, if any

  // ----- Canvas content -----
  canvases: Canvas[];            // Every banner size in the project
  activeCanvasId: string;        // Currently selected canvas
  activeFrameId: number;         // Currently active timeline frame
  selectedElementId: string | null;
  layerSelection: string[];      // Multi-select layer IDs

  // ----- Timeline -----
  frames: Frame[];               // Sequenced animation frames
  // Per-frame skip behaviour is on each Frame, not at state level

  // ----- Linking -----
  linkGroups: Record<string, LinkGroup>;

  // ----- Assets -----
  assets: Record<string, string>;    // assetId → base64 data URL
  assetLibrary: AssetLibraryItem[];  // User-saved custom items
  assetFolders: AssetFolder[];

  // ----- Dynamic Data / Versions -----
  dataMerge?: {
    rows: Array<Record<string, string>>;
    columns: string[];
    versionNameKey?: string;     // Which column names the export folders
    clickTagKey?: string;        // Optional CSV → ClickTag binding
    locked?: boolean;            // Edit-in-place lock
    sort?: { key: string; dir: 'asc' | 'desc' };
  };

  // ----- View / preferences -----
  theme?: 'default' | 'rmit' | 'ocean' | 'light' | 'navy';
  showRulers?: boolean;
  showSafezones?: boolean;
  snapEnabled?: boolean;
  zoom?: number;
  viewScrollLeft?: number; viewScrollTop?: number;  // Persisted viewport
  bgApplyAll?: boolean;          // Canvas BG colour applies to all sizes

  // ----- Auto-resize engine settings (persisted per-project) -----
  autoResizeSettings?: {
    rulesEnabled: Record<RoleId, boolean>;     // Per-rule enable flags
    relations: { r1: boolean };
    behaviour: {
      allowCoverFallback:  boolean;
      showProgress:        boolean;
      showCanvasSelection: boolean;
      includeUnassigned:   boolean;
      liveLink: {
        enabled:        boolean;
        syncText:       boolean;
        syncFont:       boolean;
        syncColor:      boolean;
        syncOpacity:    boolean;
        syncAnimations: boolean;
      };
    };
    showProgress: boolean;       // Mirrored top-level
  };

  // ----- Auth (transient) -----
  user?: { id: string; email: string } | null;
}

interface Canvas {
  id: string;
  name: string;
  width: number; height: number;
  elements: Element[];           // z-ordered, last = on top
  bgColor?: string;              // Per-canvas override
  fullClickArea?: boolean;
}

interface Element {
  id: string;
  type: 'text' | 'image' | 'button' | 'rect' | 'circle' | 'line' | 'pixel';
  customName?: string;           // User-renamed label
  x: number; y: number; width: number; height: number;
  rotation?: number;
  persistent: 'top' | 'bottom' | false;  // Layer-panel section
  frameId?: number;              // Set when persistent === false
  linkGroupId?: string;          // Cross-canvas sync group

  // Auto-resize role assignment (v0.13.0+)
  role?: 'background-image' | 'rmit-logo' | 'cta-button'
       | 'heading' | 'subheading' | 'cricos'
       | 'main-image' | 'rfwn' | 'extra-info' | 'misc';
  roleAuto?: boolean;            // true = auto-detected, false = user-locked

  // Masking
  isMask?: boolean;
  maskTargetId?: string;         // Source element id; remapped during auto-resize

  // Type-specific fields
  text?: string; fontFamily?: string; weight?: number;
  fontSize?: number; maxFontSize?: number; autoSize?: boolean; wrapText?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  color?: string; bg?: string; background?: boolean;
  paddingLR?: number; paddingTB?: number;
  bgPadL?: number; bgPadV?: number;
  bgCoverage?: number; bgOpacity?: number;
  radius?: number;
  fill?: string; stroke?: string; strokeWidth?: number;
  textColor?: string;
  assetId?: string; src?: string; // Image source
  fit?: 'contain' | 'cover' | 'fill';
  autoHug?: boolean;             // Button: width hugs text
  opacity?: number;
  inTransition?: string; inDuration?: number;
  continuousEffect?: string;     // pulse / wiggle / spin / pan / zoom / etc.
  effectDuration?: number;

  // Dynamic data slot flags
  dmText?: boolean; dmColor?: boolean; dmBg?: boolean; dmImage?: boolean;

  // Misc state
  hidden?: boolean; locked?: boolean;
}

interface Frame {
  id: number;
  duration: number;              // seconds
  transition: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom-in' | 'zoom-out';
  transitionDuration: number;
  skip?: boolean;                // Exporter strips skipped frames
}

interface LinkGroup {
  id: string;
  name: string;
  category: 'text' | 'image' | 'button' | 'shape' | 'line';
  syncProperties: Record<string, boolean>;
    // Keys: text, font, fontSize, color, textColor, fill, stroke, radius,
    //       background, opacity, transform, rotation, image, thickness,
    //       inAnim (in-transition), effect (continuous effect)
  liveLink?: boolean;            // true = propagate edits in real time
}
```

---

## 4. Auto-Resize Engine (v2.7)

The single biggest feature added in 2026. Lives in its own file
`auto-resize-engine.js`, loaded before `script.js`. All functions are global
since there's no module system. The engine is **deterministic**, **rule-based**,
and **per-target-independent** — not generative, not an LLM.

### Engine versioning

Tracked via the `ENGINE_VERSION` constant. Bumps independently of the Adflow
app version on substantive rule/behaviour changes. Surfaced as a pulsing
purple pill in the Auto-Resize Settings modal header and in the fake progress
overlay. History:

| Engine | Highlights |
|---|---|
| v2.0 | Initial 9-role rule engine + R1 cross-role relation |
| v2.1 | Mask post-pass, contain→cover fallback, link-group wiring |
| v2.2 | Collision resolution + canvas-clamp passes, no-drop policy |
| v2.3 | Logo always top-right, RFWN skyscraper top-left, role-refresh sweep, instant-resize bypass |
| v2.4 | Full-width stack-mode heading, expanded wrap budget, CRICOS dual-source font |
| v2.5 | Tall-format logo + RFWN shrink, subhead overlap, tighter RFWN width |
| v2.6 | Heading wrap-budget tightening, subhead font bump |
| v2.7 | Wide-banner heading vertically centred, RFWN width fits "what's next", live-linking control surface |

### 9 + 1 role taxonomy

Defined via three top-level constants in `auto-resize-engine.js`:

```js
ROLE_IDS         // Array of all 10 role identifiers
ROLE_LABELS      // Map of role id → display name (used by layer-panel chip + picker)
ROLE_PICKER_ORDER  // Order shown in the role-picker dropdown
ROLE_PRIORITIES  // Sort order for placement (lower = placed first)
```

| Role | Priority | Required | Strategy |
|---|---|---|---|
| `background-image` | 1 | no | source-mirror (proportional) |
| `rmit-logo`       | 3 | yes | anchor — top-right of safezone |
| `cta-button`      | 4 | no | anchor — tall (bot-centre) / wide (mid-right) |
| `heading`         | 5 | yes | anchor — top-left of safezone |
| `subheading`      | 6 | yes | anchor — heading.bottom-left (or right of heading on banners) |
| `cricos`          | 7 | yes | anchor — bot-left of canvas (not safezone) |
| `main-image`      | 7 | no  | slot-search (remainder after text + CTA + logo) |
| `rfwn`            | 8 | no  | anchor — top-left (aspect ≤ 2) / bot-right (aspect > 2) + R1 snap to logo |
| `extra-info`      | 9 | no  | slot-search (residual gaps) |
| `misc`            | 99 | —  | centred (if includeUnassigned on) or dropped |

### Role detection — `autoAssignRole(el, canvas)`

5-step heuristic ladder; first match wins:

1. **Layer name** — `name.includes('logo')` → rmit-logo, `name === 'background'` → background-image, etc.
2. **Text content** — `'cricos'` or `/\brto\b/` → cricos. `'ready for' + 'next'` → rfwn.
3. **Text ranking** — Largest fontSize → heading. Second largest → subheading.
4. **Image aspect** — `aspect ≥ 2.0` AND `area < 0.18` → rmit-logo. `area ≥ 0.7` OR `persistent === 'bottom'` → background-image.
5. **Type fallback** — buttons → cta-button, images → main-image, shapes → misc, loose text → extra-info.

**Idempotent and refreshing.** `ensureRolesAssignedAll()` (called from `render()`)
re-runs the detector on every element where `el.roleAuto !== false`. Manually
set roles (`roleAuto: false`) are preserved.

### Placement rules — pure functions

Each rule has signature `placer(srcEl, target, ctx) → geom | null`. The executor
clones the source element and applies the returned geometry. Implementation
details for every rule are documented in the in-app **Documentation → Auto-Resize ✨**
section (which has 7 deep subsections covering anchor formulas, size formulas,
font formulas, and mode case-analysis for each role).

Key shared concepts:

```js
function computeSafezone(c) {
  const minDim = Math.min(c.width, c.height);
  const aspect = Math.max(c.width, c.height) / minDim;
  const factor = (minDim < 200 && aspect > 3) ? 0.08 : 0.05;
  const inset = Math.max(4, Math.round(minDim * factor));
  return { x: inset, y: inset, w: c.width - 2*inset, h: c.height - 2*inset, ... };
}
```

### Post-placement passes (in order)

1. **R1 — logo ↔ RFWN edge alignment.** `aspect ≤ 2` → share top edge; `aspect > 2` → share right edge.
2. **Mask post-pass.** Remaps `maskTargetId` from source id → cloned image id via a `sourceToTargetId` map built during placement; aligns mask geometry to the cloned image.
3. **`resolveNoTouchCollisions`.** Pairs in `[rmit-logo, cta-button, heading, subheading, rfwn]` priority order — if two overlap, the lower-priority shrinks along the dominant centre-offset axis by the overlap + 4px gap. Higher-priority never moves.
4. **`clampToCanvas`.** Every role except `main-image` and `background-image` is clipped to canvas bounds. Cover-mode images deliberately bleed.

### Entry points

Two UI surfaces, both wired through `auto-resize-engine.js`:

- **Panel button** — anchored at the bottom of the left panel column (outside `.panel-scroll`). Dispatches via `handleAutoResizeClick()` which honours `behaviour.showCanvasSelection` — opens the run modal or runs immediately.
- **Canvas right-click menu** — "Auto-Resize" at the top of the menu, styled like Preview. Always calls `openAutoResizeModal()` directly, regardless of settings.

### The run modal — `openAutoResizeModal()`

Source canvas summary + multi-select target canvas list + "Include unassigned"
checkbox + red destructive-clear warning. Run button calls
`runRuleBasedAutoResize({ sourceId, targetIds, includeUnassigned })`.

### The fake progress overlay — `showFakeAutoResizeProgress()`

Pure theatre. Terminal-styled centred panel with a pulsing spinner, fake pid +
UTC timestamp header, 10 scripted pipeline-step status lines staggered over
**2.0–3.0 s (randomised per run)**. Step delays are random-weighted so the
progression stutters realistically. The actual placement work has already
completed when the overlay appears — it just gates the `render()` call so the
user sees the engine "doing work."

### Settings modal — `openAutoResizeSettingsModal()`

Gear button next to the panel auto-resize button opens this. Three sections:

- **Cross-role relations** — R1 toggle.
- **Behaviour** — `showCanvasSelection`, `includeUnassigned`, `allowCoverFallback`, `showProgress`.
- **Live linking** — master toggle + 5 property toggles (`syncText`, `syncFont`, `syncColor`, `syncOpacity`, `syncAnimations`). Position, size, and font size are always independent per canvas; not user-toggleable.

Engine version pill in the modal header has a 2.6 s `ar-engine-pulse` animation
(purple box-shadow breathing).

### Executor — `runRuleBasedAutoResize(settings)`

Pseudo-code:

```js
for each target in settings.targetIds:
  target.elements = []                 // wipe
  ctx = { sourceCanvas, target, safezone, placedElements: {}, engineSettings }
  sourceToTargetId = {}                // for mask remap

  for each srcEl in sorted-by-role-priority:
    role = srcEl.role || 'misc'
    if role === 'misc':
      ... place centred or drop ...
    else:
      geom = PLACEMENT_RULES[role](srcEl, target, ctx)
      clone = cloneSourceElement(srcEl)
      apply(geom)                       // x, y, w, h, fontSize, maxFontSize, textAlign
      wireLinkGroup(...)                // attaches to source's link group
      target.elements.push(clone)
      ctx.placedElements[role] = clone
      sourceToTargetId[srcEl.id] = clone.id

  applyRelationR1(ctx)                  // if relations.r1
  maskPostPass(ctx, sourceToTargetId)
  resolveNoTouchCollisions(ctx)
  clampToCanvas(ctx)

cleanupLinkGroups()
showFakeAutoResizeProgress(stats, () => { pushHistory(); render(); toast(); })
```

Single history entry — `pushHistory()` runs once at the end so the whole resize
is one undo step.

---

## 5. Layer Panel & Role Assignment

The Layers panel (`renderLayers()` in `script.js`) groups elements into three
sections:

- **Always Top** — `persistent: 'top'`. Shown on every frame above everything else. Typical: logo, CRICOS.
- **Main Layers (Frame N)** — `persistent: false`, `frameId: state.activeFrameId`. Only visible on the active timeline frame.
- **Always Bottom** — `persistent: 'bottom'`. Shown below everything on every frame. Typical: background.

Drag-and-drop between sections is supported and mutates `el.persistent` accordingly.

Each layer row has three icon buttons in the actions column:

1. **Role icon** (introduced in v0.13.0) — a rounded resize/expand glyph. Grey when role is `misc` (unassigned); accent purple when assigned to any of the 9 named roles. Click opens `openRolePicker(el, anchorBtn)` — a body-anchored dropdown listing all 10 roles + a "Reset to auto-detect" entry. Selecting a role sets `el.role` + `el.roleAuto = false`.
2. **Lock icon** — toggles `el.locked`.
3. **Eye icon** — toggles `el.hidden`. For mask layers, the eye is a solid disc instead of an outline.

Mask layers in the layer panel are prefixed `[mask]` (accent-light colour);
target images get a `[masked]` prefix (0.7 opacity). The prefixes auto-hide
during inline rename so users don't duplicate them.

---

## 6. Link Groups & Live-Link Mode

Link groups bind elements across canvases for synchronised editing.

### How groups are created

- **Auto-resize** creates / refreshes groups automatically via `wireLinkGroup(srcEl, target, role, cat)` — see Section 4.
- **Manual linking** via the Link Groups panel (right-click → context menu → "Link with…") or the `Auto-Link` button which matches by layer name across canvases.

### `syncProperties` mapping

Each group's `syncProperties` is a `Record<string, boolean>`. Keys map to
specific element attributes:

```
text         → element.text
font         → fontFamily, weight, leading, tracking, textAlign, verticalAlign
fontSize     → fontSize, maxFontSize, autoSize, paddingLR, paddingTB, wrapText
color        → color (text)
textColor    → textColor (button)
fill         → fill (shape, button)
stroke       → stroke, strokeWidth
background   → bg, background, bgPadL, bgPadV, bgCoverage, bgOpacity
radius       → radius
image        → assetId, src, fit
rotation     → rotation
opacity      → opacity
transform    → x, y, width, height       (default off — usually per-canvas)
inAnim       → inTransition, inDuration
effect       → continuousEffect, effectDuration
thickness    → line strokeWidth
```

`applyLinkSync(sourceEl, targetEl, group)` walks the source element, copies the
selected properties to the target. Used both at link-creation time and during
live-link propagation.

### Live-link mode (`group.liveLink`)

When `liveLink: true`, edits on a selected element propagate to every other
element in the group immediately. This is wired in `render()`:

```js
if (state.layerSelection?.length) {
  state.layerSelection.forEach(id => {
    const el = activeCanvas.elements.find(x => x.id === id);
    if (el?.linkGroupId) {
      const group = state.linkGroups[el.linkGroupId];
      if (group?.liveLink) {
        state.canvases.forEach(c => c.elements.forEach(target => {
          if (target.linkGroupId === el.linkGroupId && target.id !== el.id) {
            applyLinkSync(el, target, group);
          }
        }));
      }
    }
  });
}
```

Auto-resized elements default to `liveLink: true` when the user's Live linking
master toggle is on (see Auto-Resize Settings).

---

## 7. Image Masking Engine

Layer-based masking — a shape layer (rectangle, circle, pixel — NOT line) with
`isMask: true` clips the image immediately beneath it in z-order.

### Creating

Right-click a shape on a non-persistent frame → "Use as mask". The shape:
- Gets `isMask = true`.
- Gets `maskTargetId = <id of the image directly below it>`.
- Loses its visible stroke / fill — it's now a clip path.
- Cannot be in a link group OR a dynamic data slot. Both panels show a "disabled while this layer is a mask" notice.

### Sanitisation — `sanitizeMasks(canvas)`

Called at the top of `render()` for every canvas. Sweeps elements and:
- If a mask shape's `maskTargetId` element doesn't exist anymore → strips `isMask`.
- If a mask shape is dragged onto a persistent layer slot → strips `isMask`.
- If a mask shape isn't directly above an image in z-order → strips `isMask`.

### Rendering

Native SVG `<mask>` element with `mask` CSS applied to the image wrapper. The
mask's animation properties apply to the mask `<g>` independently of the
underlying image, so the mask can move with one animation while the image moves
with another.

### Export pipeline

`_generateExportHTMLRaw` emits the same SVG-mask construction so masked images
export pixel-for-pixel as they render in the editor.

### Auto-resize handling

When `cloneSourceElement` clones a mask shape, it preserves `isMask` and
`maskTargetId`. The executor's **mask post-pass** then:

1. Looks up `sourceToTargetId[maskTargetId]` (built during placement).
2. If found — sets `clone.maskTargetId = <target image id>` and aligns
   the mask's `x/y/w/h` to the target image's geometry. Mask follows
   the photo to its new placement.
3. If not found (e.g. source image was deleted, or main-image rule disabled) —
   strips `isMask` and `maskTargetId` so the shape renders as a normal shape.

---

## 8. Frames, Timeline & Animation

`state.frames` is the master sequence. Each frame has a duration and a transition
that plays from the previous frame.

- **Frame skip** — toggle `frame.skip = true` to remove the frame from the
  export pipeline. Mutually exclusive: setting one frame's skip forces all
  other `frame.skip` to false. Editor still renders skipped frames normally
  so they can be edited.
- **Persistent layers** (`persistent: 'top' | 'bottom'`) show on every frame.
  Non-persistent elements have `frameId` matching the frame they belong to.
- **Per-element animation** — `inTransition` (Fade in / Slide up / etc.) plays
  when the frame starts. `continuousEffect` (Pulse, Wiggle, Spin, Pan, Zoom,
  etc.) plays continuously while the frame is active.

---

## 9. Data & Versions (Dynamic Data)

A spreadsheet-style editor for mail-merging dozens of ad variants from a
single template.

- **Dynamic slots** — mark fields (`dmText`, `dmColor`, `dmBg`, `dmImage` on the element) to make them bindable. A small dot indicator appears on the canvas for dynamic elements.
- **Sheet** — `state.dataMerge.columns + rows`. Stored in the `.flow` project, autosaved with it.
- **Slot × Link Group** — If a dynamic element is in a link group, the slot covers the whole group — one binding fills the field on every size.
- **Live preview** — pick a row from the top-bar Version dropdown to preview that row on canvas (non-destructive; template defaults never overwritten).
- **Edit-in-place** — with `dataMerge.locked: false`, editing a dynamic slot on canvas writes back to the active row's cell.
- **Export All Versions** — produces one folder per row, named from the version-name column, each containing the full Google-Ads-compliant ZIP set.

The Data & Versions panel is opened from the top-bar "Data" button or
`File → Data & Versions`. Two-column layout: controls on the left, sheet on
the right with inline column rename + drag-reorder + sort cycle.

---

## 10. Cloud, Supabase & Spaces

Optional cloud sync. Anonymous local-only use is fully supported — the cloud
features become inert when the user isn't signed in.

### Auth (`authState` controller)

Wraps `@supabase/supabase-js` v2. Email + password only. RLS policies protect
data server-side, so the anon key is safe to embed.

### Cloud projects

`projects` table in Supabase:

```sql
projects (id uuid PK, user_id, name, ad_size_limit_kb, size_bytes,
          storage_path, updated_at, created_at)
```

Push current project: builds the `.flow` blob via `buildFlowBlob()` (the
existing local-save code refactored to return a Blob instead of triggering a
download), uploads to `projects/{user_id}/{projectId}.flow` in Storage, upserts
the metadata row. Pull: reverses the flow — `loadProjectFromBlob(downloadedBlob)`.

### Spaces (team workspaces)

Shared pools. `space_members` table. Each space has owners + members. UI in the
top-bar auth chip dropdown:

- Personal (default).
- Spaces you belong to.
- Create new space.
- Manage Spaces (members / invite / rename / duplicate / delete / leave).

### Invitations

`space_invites` table with one-time tokens. URL contains the token; recipient
opens it, signs in with the same email, joins automatically.

### RLS notes

Self-referential SELECT policies on `space_members` would recurse — broken via
`SECURITY DEFINER` helper functions (`user_is_space_member(p_space_id)`,
`current_user_email()`).

---

## 11. Splash Screen & Auth Gate

Inline-CSS splash (`#app-splash` in `index.html`) shown during boot. Replaces
the older static logo + status text with:

- Animated logo (subtle pulse).
- Progress bar with cycling humorous Sims-style status text ("Polishing the
  canvases…", "Loading the visual model…", "Calibrating safezones…", etc.) from
  `SPLASH_QUIPS`.
- **Auth gate** — sign-in / sign-up tabs, remember-me checkbox (default on),
  "Use locally without signing in" escape hatch.

Splash dismisses via `app-splash-out` class (opacity fade + scale). Stays in
the DOM at z-index 999999 — this is why other floating UI elements need
z-index 999998 to surface above it.

---

## 12. Theme System

5 named themes defined as `body.theme-X { --css-vars }` rules in `styles.css`:

- **default** (dark, no body class) — Adflow's main aesthetic.
- **theme-rmit** — accent recoloured to RMIT brand red.
- **theme-ocean** — teal accent.
- **theme-light** — light background, dark text, blue accent.
- **theme-navy** — deep navy variant.

Switching via Settings modal → Themes section. `state.theme` is set, `render()`
applies it via `body.className`.

### Light-theme logo swap

The Adflow wordmark has a dedicated light-theme variant
(`data/Elements/Adflow_lighttheme.svg`). The `syncAdflowLogos()` helper walks
every `<img data-adflow-logo>` in the DOM and sets the right src based on
`state.theme === 'light'`. Called from `render()` after the body class is set,
and again from `renderDocsPanel()` after the docs HTML is inserted (the docs
welcome page contains one of the four logo locations).

Four marked locations: boot splash, topbar, size-overlay (tiny-viewport
warning), docs "Welcome to Adflow" hero.

---

## 13. Persistence & Autosave

### IndexedDB autosave

`adflow-autosave` DB, key `'project'`. Stores:

```js
{ state: { ...deep clone of state... }, history: [...], historyIndex: N }
```

Triggered by `scheduleAutosave()` which is called from `render()` (debounced).
Suspended during initial boot to avoid spurious writes.

`restoreAutosave()` runs in `initApp()` before the first render. If a snapshot
exists, hydrates `state`, `history`, `historyIndex`.

### `.flow` ZIP export / import

`buildFlowBlob()` constructs a JSZip archive with:
- `project.json` — the full state snapshot
- `meta.json` — version, dimensions list, timestamps
- `images/` — extracted asset payloads (base64 → binary)

`loadProjectFromBlob(blob)` unpacks and re-attaches. Used by both manual save
(Ctrl+Shift+S downloads the file) and cloud push/pull (uploads/downloads the
Blob to Supabase Storage).

### History

`pushHistory()` snapshots `state.canvases + activeCanvasId + selectedElementId
+ layerSelection + guides + linkGroups + dataMerge` and pushes onto the
`history` array. `historyIndex` tracks current position. Undo/redo restore the
snapshot via `restoreSnapshot()`.

---

## 14. Documentation Modal

Hierarchical sidebar+content modal opened via the `?` icon. Defined in
`DOCS_SECTIONS` — 11 top-level sections × ~45 subsections covering Getting
Started, Workspace, Designing, Animation, Link Groups, Auto-Resize (7 deep
sections — the biggest), Data & Versions, Cloud & Spaces, Saving & Projects,
Export & Validation, Reference (keyboard shortcuts).

Layout: 240px sidebar with collapsible sections, flex-1 content panel that
renders the selected subsection's HTML `body`.

The Auto-Resize section in particular is the long-form documentation of
everything in Section 4 of this file — anchor formulas, mode case-analyses,
post-pass ordering, settings semantics, engine version history. Worth reading
in full when working on the engine.

---

## 15. Recent UI Shifts (v0.16.x)

Documenting the v0.16.x reorganisation so it doesn't surprise future agents:

- **Tools panel removed** (v0.16.0). The right-panel `panel-section-tools` block
  is gone from `index.html`. Auto-resize and Clear-all moved elsewhere.
- **Auto-resize button anchored at panel bottom** (v0.16.2 onwards). HTML lives
  in the left `.panel`, outside `.panel-scroll`, in a `.panel-anchor-bottom`
  container. Slightly darker background (`--bg-body`), border-top separator,
  prominent purple-gradient button (`.ar-btn-main`) + smaller settings button
  (`.ar-btn-settings`). Hover-only animation; no resting pulse.
- **Clear all moved to context menu + Properties panel** (v0.16.0). Two helpers:
  - `clearCurrentCanvasContents()` — wipes the active canvas only.
  - `clearAllCanvasesContents()` — wipes every canvas and resets linkGroups.
  Both confirm + push history.
- **Auto-resize in context menu** (v0.16.1+). Top of the canvas right-click
  menu, directly under Preview, styled with the same `ctx-item highlight`
  class. Always opens the canvas-selection dialogue regardless of settings.

---

## 16. Workflow Conventions

These are the user's standing instructions (from `MEMORY.md` notes):

### Commit workflow

- **Just write files to the parent checkout.** Never run `git add` / `git commit`. The user manages commits themselves in GitHub Desktop.
- Don't create branches. Don't run pushes.

### Changelog workflow

After each user-visible edit, **bump version + add changelog entry across 5 files**:

1. `data/version.txt` — single-line `vX.Y.Z`.
2. `data/changelog.txt` — prose at the top, newest first.
3. `script.js` `CHANGELOG_DATA` array — first object, `version` + `date` + `items` array.
4. `script.js` `currentVersion = 'vX.Y.Z'` constant (in the changelog modal rendering function).
5. `index.html` footer `#app-version-display` button label.

Use `replace_all: true` on the `<span style="...">vX.Y.Z</span>` line in
`script.js` because that style is repeated in two places.

Engine changes (rules / behaviour) also bump `ENGINE_VERSION` in
`auto-resize-engine.js` and that version sticks at the end of the changelog
entry date as `— Engine vX.Y`.

### Severity guide

- **Patch (Z+1)** — bug fix, small polish, tuning iteration.
- **Minor (Y+1)** — new user-facing feature, panel reorganisation, major UX shift.
- **Major (X+1)** — not yet used. Reserved for breaking changes / 1.0 release.

### Skip if trivial

Genuinely trivial internal refactors (e.g. variable renames with no behaviour
change) can skip the bump. Use judgement.

---

_Last updated: v0.16.7 — Adflow app version, Engine v2.7._
