<p align="center">
  <img src="data/Elements/Adflow_logo.svg" alt="RMIT Adflow Logo" width="240" />
</p>

# RMIT Adflow

[![Live Demo](https://img.shields.io/badge/Live%20Demo-rmit--adflow.netlify.app-brightgreen?style=for-the-badge&logo=netlify)](https://rmit-adflow.netlify.app/)

A professional, browser-based visual design tool engineered specifically for building animated HTML5 display ads. RMIT Adflow eliminates the need for complex build pipelines and third-party software installations, providing a streamlined environment tailored for high-volume banner production.

Designed to replace bloated legacy tools like Google Web Designer, this application allows creative teams to compose multi-frame, multi-size banner campaigns on an infinite canvas and instantly export them as Google Ads-compliant HTML5 packages.

---

## 🚀 Core Concept: Multi-Canvas Workflow & Link Groups

The standout feature of RMIT Adflow is its **Multi-Canvas Orchestration**. Instead of creating and managing separate files for each banner size (e.g. 300×250, 728×90, 160×600), you lay out all sizes side-by-side on an infinite panning workspace.

To avoid duplicate, manual updates across different canvases, you use **Link Groups**:

- **Auto-Link Matching Elements**: Pressing **Auto-Link** automatically scans all canvases and groups elements with the same layer name and category/type. Toggle **Selected only** to scan and group matches targeting only the currently selected layer.
- **Granular Sync Properties**: Choose exactly which properties should sync for a group. Text content and styling are separated cleanly — `Colors` covers text colour; a dedicated `Background` property manages text backgrounds (background colour, visibility, animation padding, coverage); `Font size` is split from `Font settings` so the typeface can sync across canvases while sizes remain per-canvas.
- **Live-Link Mode (Real-Time Sync)**: Enable the lightning bolt toggle on any group, and any modification you make to an element (dragging, resizing, editing text inline, or changing properties in the sidebar panel) will immediately propagate to all sibling elements on other canvases in real time.
- **Contextual Actions**: Right-click elements to manage link settings, showing dynamic `Linked to: [GroupName]` and `Link to: [GroupName]` labels based on membership status. Or use **Push changes to group** in the main context menu to broadcast updates manually when Live-link is off.

---

## ✨ Headline Feature: Auto-Resize (Rule-Based Engine v2.7)

Design **one** banner, generate the **whole size set** in a single click. The Auto-Resize button (anchored at the bottom of the left panel column, also available at the top of the canvas right-click menu) rebuilds every other canvas to fit its own proportions using a deterministic rule-based placement engine — not a generative model, not an LLM, not a black box.

### Role taxonomy
Every element on the source canvas is classified into one of **10 roles**: `background-image`, `rmit-logo`, `cta-button`, `heading`, `subheading`, `cricos`, `main-image`, `rfwn`, `extra-info`, or `misc` (unassigned fallback).

- **5-step detection heuristic** — layer name → text content (CRICOS/RTO, "Ready for…next") → font ranking → image aspect (≥2.0 + small area → logo) → type fallback.
- **Idempotent refresh** — the detector re-runs every render on auto-assigned roles, so detector improvements take effect on existing projects without manual reset.
- **Manual override** — every layer has a role-tag icon in the Layers panel: grey when auto-detected, accent purple when manually locked. Click to open the picker.

### Parametric placement rules
Each rule is a pure function returning geometry as a parametric formula of `canvas.w`, `canvas.h`, `sqrt(area)`, and `aspect` — generalises to canvas sizes the engine has never seen. Highlights:

- **`heading`** — top-left of safezone, full safezone width on stack mode (`h ≥ 300`), narrower column on wide banners. Font scales with canvas; wrap budget 2–4 lines depending on format.
- **`cta-button`** — bot-centre of safezone on tall canvases, mid-right at `canvas.w × 0.84` on wide banners.
- **`rmit-logo`** — always top-right of safezone; height shrinks 25% on tall formats to share the top row comfortably with RFWN.
- **`rfwn`** — top-left for `aspect ≤ 2.0`, bot-right otherwise. Text always justifies toward the closest canvas edge.
- **`main-image`** — slot-search strategy. Computes the largest empty rectangle remaining after text + CTA + logo place. Contain by source aspect, falling back to cover (with optional canvas-edge clipping) when contain leaves the image too small.
- **`cricos`** — bot-left of canvas (not safezone). Font auto-scales with `min(canvas.w, canvas.h)`, floor of 4 pt.

### Cross-role relations & post-placement passes
After per-role placement, four passes refine the result:

1. **R1** — Logo ↔ RFWN edge alignment (snap to share top edge or right edge depending on canvas aspect).
2. **Mask post-pass** — remap mask shapes' `maskTargetId` to the cloned image and align mask geometry, so masked images survive the resize intact.
3. **No-touch collision resolution** — the five no-touch roles (logo / CTA / heading / subheading / RFWN) never overlap each other; lower-priority shrinks to clear with a 4-px gap.
4. **Canvas-bounds clamp** — every role except main-image and background-image is forced fully inside the canvas.

### Engine settings & live linking
A dedicated settings modal (gear icon next to the Auto-resize button) exposes:

- **Cross-role relations** — toggle R1 on/off.
- **Behaviour** — show canvas-selection dialogue (off → instant resize), include unassigned by default, allow cover fallback, show technical progress overlay.
- **Live linking** — master toggle + 5 property toggles (text content, font, colour, opacity, animations). When on, every target element joins the source's link group with real-time propagation. Position, size, and font size are always independent per canvas — that's the entire point of the resize.

### Engine versioning
The engine carries its own version (`ENGINE_VERSION` constant) independent of the Adflow app version — bumps on substantive rule changes so output is reproducible for a given engine generation. The version is surfaced as a glowing pulsing pill in the Settings modal header and in the technical progress overlay.

### Workflow polish
- **One Undo step** — the whole resize collapses into a single history entry. `Ctrl+Z` restores every canvas at once.
- **Source canvas inviolate** — never mutated, only its roles are re-detected.
- **No-drop policy** — every element with a known role lands somewhere on every target; never silently lost.
- **Instant mode** — turn off the canvas-selection dialogue + progress overlay, and clicking Auto-resize rebuilds every target with no intermediate UI at all. Useful for iterative tuning loops.

---

## 🗂️ Headline Feature: Data & Versions (Dynamic Creative)

Design **one** template, then data-merge a spreadsheet into it to produce a finished ad set **per row** — ideal for running the same banner set across dozens of RMIT courses. Open it from **File → Data & Versions** or the **Data** button in the top bar.

- **Per-element dynamic opt-in** — select any element and tick which fields should vary per version in the **Dynamic Data** panel: *Text* and *Color* on text; plus *Background* on buttons, *Image* on images, or fill *Color* on shapes. Unmarked elements are never touched by the merge; a small dot marks dynamic elements on the canvas.
- **Slots compose with Link Groups** — a dynamic field becomes a *slot*. If the element is in a Link Group, the slot covers the **whole group**, so one binding fills that element on every size at once. Toggling a field on a linked element applies it to all siblings automatically — and your link-group sync settings are never altered.
- **Bind columns → slots** — import a CSV (or build the sheet inline), map each column to a slot's field, pick the **★ key column** that names exported folders, and optionally bind a column to the **ClickTag** exit URL. The sheet is stored inside the `.flow` project (auto-saves and travels with it) and can be exported back to CSV for the team to edit.
- **Live, non-destructive version switching** — pick a row from the top-bar **Version** dropdown to preview it on the canvas in both editing and preview modes. Your template defaults are never overwritten; "No version" returns to them.
- **Edit-in-place + Data lock** — while a version is active and the Data Lock is OFF, editing a dynamic slot writes back directly to **that row's cell** in the version record. Toggling the **Data lock** to ON makes dynamic inputs read-only, preventing accidental changes during review.
- **Drag-reorder + inline rename + sort** — double-click a column header to rename, drag the header to reorder columns, drag the ⋮⋮ grip on each row to reorder rows, click the sort icon for asc/desc/none.
- **Batch export** — **Export All Versions** produces one folder per row (named from the key column), each holding the full Google Ads-compliant ZIP set, through the standard export pipeline.

Frames need no special handling — a frame-1 and frame-2 headline are simply two differently-named slots, so multi-frame ads merge correctly out of the box.

---

## ☁️ Headline Feature: Cloud Projects & Team Spaces

Optional Supabase-backed cloud sync, layered on top of the local-first model. Anonymous local use is fully supported and unchanged — the cloud only activates when you sign in.

- **Email + password auth** — sign in / sign up from the splash screen on first load, or from the top-bar chip later. Remember-me checkbox (default on) persists sessions across tabs; uncheck to scope the session to the current tab only. "Use locally without signing in" escape hatch keeps the splash from being a hard gate.
- **Cloud Projects** — push the current project to the cloud with one click; open any of your saved projects back; delete from the cloud. Same `.flow` ZIP format as local saves, so nothing needs re-importing. Same-name push triggers a Replace / Rename toast so you don't accidentally overwrite a teammate's work.
- **Team Spaces** — shared pools for collaborating across a creative team. The chip dropdown lists all spaces you belong to plus "Personal". Each space has owners + members, per-space members panel, invitation flow (Adflow generates a one-time join URL and copies it to your clipboard — paste into Slack or email), and Duplicate / Rename / Delete / Leave actions per role.
- **Folders inside spaces** — organise space projects into a tree. Per-row dropdown to move projects between folders.

`Ctrl+S` pushes the current project to the cloud (falling back to local save when offline or signed out); `Ctrl+Shift+S` always saves a local `.flow` ZIP.

---

## Key Features

### Workspace & Architecture
- **Infinite Multi-Canvas Workspace** — design every banner size side-by-side in one project. Pan with `Space + drag`, zoom with the scroll wheel.
- **Seamless Auto-Save** — every change is continuously persisted to the browser (IndexedDB) and restored on reload, including zoom & scroll position. Live "All changes saved / Saving… / Unsaved" indicator in the top bar.
- **Portable `.flow` Projects** — self-contained ZIPs holding project + embedded assets, with an Open Recent list for one-click restore.
- **New Project Wizard** — pick canvas sizes, name, ClickTag, default background colour, configurable maximum ad weight (KB).
- **Theming System** — 5 named themes (Dark default, RMIT Brand, Ocean, Navy, Light). Light theme swaps to a dedicated light-variant Adflow wordmark automatically.
- **History Management** — full Undo/Redo stack supporting complex nested operations including the whole auto-resize as one step.

### Element & Asset Management
- **Supported Entities** — Text, Images, SVGs, Rectangles, Circles, Pixel shapes, Lines, and Buttons.
- **Typography Integration** — Embedded RMIT brand fonts (Museo, Helvetica Neue) and precise text controls (line-height, letter-spacing, leading, tracking, autoSize cap).
- **Brand Element Library** — Built-in repository of pre-approved SVG assets (logos, Cricos text, brand pixel) that bypass manual file management and dynamically bundle on export.
- **WebP Compression Tool** — Built-in visual image compressor for converting and compressing PNG/JPEG to WebP. Custom quality (10–100%) with real-time output-size preview to fit ad weight constraints.
- **Layer Persistence** — every element belongs to one of three layer sections: **Always Top** (persistent above every frame — typical for logos), **Main Layers (Frame N)** (only on the active frame), or **Always Bottom** (persistent below — typical for backgrounds). Drag-and-drop between sections.
- **Role-Tag Icon Column** — every layer row carries a role indicator next to the lock + visibility eyes. Grey when the role was auto-detected, accent purple when manually locked. Click to open the picker covering all 10 auto-resize roles + reset-to-auto.
- **Layer-Based Image Masking** — right-click a shape layer (rectangle, circle, pixel) and pick "Use as mask" to clip the image directly beneath it. Mask carries its own independent animation, survives auto-resize via the mask post-pass, and exports identically to the editor preview.

### Animation & Timeline
- **Frame-Based Sequencing** — define sequences with per-frame durations (seconds).
- **Frame Transitions** — per-frame entering transitions: Fade, Slide (Up/Down/Left/Right), Swipe (a directional reveal), Zoom-in / Zoom-out. Optional "Add Fade" toggle and adjustable duration per frame.
- **Frame Skip** — toggle frame.skip to remove a frame from the export pipeline (still editable in the timeline). Mutually exclusive — only one frame skipped at a time.
- **Element Entrance Animations** — Fade In, Slide Up/Down/Left/Right, Swipe, Pop In, Zoom Out, Typing, Fade Typing.
- **Continuous Effects** — Pulse, Float, Flash, Wiggle, Spin, Heartbeat, Pan, Zoom. Loop infinitely or perform once.

### Advanced Styling & Color
- **Advanced Color Engine** — Dual-mode color picker supporting solid HEX values, native Eyedropper sampling (Chromium), and dynamic linear gradients with multi-stop mapping.
- **Custom Properties Panel** — Contextual right-side panel that exposes deep styling controls for active selections.
- **Collapsible Panel Sections** — Collapse / expand any panel section (Add Element, Layers, Link Groups, Assets, Canvas Settings, Properties, Animation, Dynamic Data) via interactive headers; state persists per project.

### Alignment & Precision
- **Snapping Engine** — Magnetic snapping to canvas boundaries, element centres, and custom alignment guides.
- **Rulers & Guides** — Draggable viewport rulers for creating pixel-perfect layout guides.
- **Safezone Overlay** — Toggle a centred safezone guide on every canvas to verify content stays within the format-appropriate inset. Available from the canvas / workspace context menu and the canvas Properties panel.
- **Keyboard Precision** — Nudge elements via arrow keys (1px / 10px increments). Aspect ratio locking and constrained dragging via keyboard modifiers.
- **Alt-Key Override** — Intercepts default browser ALT menu navigation to prevent layout interruption when using ALT key modifiers.

### Export & Validation Pipeline
- **Google Ads Compliance** — automatically generates self-contained `.zip` files validated against Google's HTML5 ad network requirements.
- **Pre-flight Validation** — real-time checks for missing ClickTags, external asset references, and a configurable maximum ad weight (default 150 KB — the Google Ads standard).
- **Automated Bundling** — fetches and embeds external SVGs directly into the final ZIP structure for total portability.
- **Static Fallbacks** — one-click PNG snapshot generation for any frame.

---

## Technical Specifications

### Architecture
- **Core Technology** — 100% Vanilla JavaScript, HTML5, and CSS3. Zero framework overhead (No React/Vue/Angular).
- **Total Application Size** — ~700 KB combined JS footprint across seven focused files. Classic `<script>` tags, no bundler, no build step.
- **DOM Rendering Strategy** — Direct DOM manipulation with dynamic `<iframe>` sandboxing for live ad previews.
- **Asset Bundling** — Real-time client-side zipping via [JSZip 3.10](https://stuk.github.io/jszip/).
- **Color Processing** — Native color integration via [Iro.js 5](https://iro.js.org/).
- **Cloud Backend (optional)** — [Supabase](https://supabase.com/) for auth, project storage, and team spaces. RLS-protected; anon key safe to embed.

### Project Structure
```text
RMIT-Adflow/
├── index.html                 # Application shell, splash screen, top-bar, panels
├── styles.css                 # UI styles, 5 named themes, responsive rules
│
│   # JS files (loaded in this order; classic <script> tags share global scope):
├── auto-resize-engine.js      # Rule-based 9-role resize engine
├── docs-content.js            # In-app docs (DOCS_SECTIONS) + changelog (CHANGELOG_DATA)
├── auth-ui.js                 # Supabase auth + Cloud Projects + Team Spaces
├── data-merge.js              # Live Data / Versions (CSV → ads)
├── export-pipeline.js         # HTML5 ZIP + PNG export
├── color-picker.js            # iro.js wrapper, gradient editor
├── script.js                  # State, render, elements, link groups, masking,
│                              #   frames, project save/load, splash boot, menus,
│                              #   undo/redo, autosave, asset library, etc.
├── font_assets.js             # Brand font base64 blobs (Museo / Bilo / Akkurat)
│
└── data/
    ├── version.txt            # Current app version (single line)
    ├── changelog.txt          # Human-readable changelog
    ├── Elements/              # Application assets and SVG brand elements
    │   ├── Adflow_logo.svg            # Dark-theme wordmark
    │   ├── Adflow_lighttheme.svg      # Light-theme wordmark
    │   ├── RMIT_*.svg, Pixel.svg      # Brand assets used in canvas content
    │   └── favicon.*
    └── assets/                # Pre-loaded brand creative (scanned at startup)
```

See `app_breakdown.md` §2 for the full file-routing table — which feature
lives in which file, and the load-order rules for cross-file references.

### System Requirements
- **Browser Compatibility** — Chromium-based browsers (Chrome 90+, Edge 90+) highly recommended for full API support (e.g., native Eyedropper). Firefox 88+ and Safari supported with feature fallbacks.
- **Viewport** — Minimum resolution of 1366 × 768.

---

## Getting Started

No build tools, `npm install`, or server configuration required.

### Hosted Environment
Access the application immediately via the live deployment:
**[rmit-adflow.netlify.app](https://rmit-adflow.netlify.app/)**

### Local Environment
1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd RMIT-Adflow
   ```

2. **Serve locally**
   Due to strict browser CORS policies regarding `file://` protocols and `<iframe>` rendering, it is highly recommended to serve the directory via a local HTTP server.

   ```bash
   # Python
   python -m http.server 8080

   # Node.js
   npx serve .
   ```
   Navigate to `http://localhost:8080`. A `run-server.bat` helper script is also included on Windows.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + S` / `Cmd + S` | Push current project to the cloud (falls back to local `.flow` save when offline / signed out) |
| `Ctrl + Shift + S` / `Cmd + Shift + S` | Always save a local `.flow` ZIP |
| `Ctrl + C` / `Cmd + C` | Copy selected elements |
| `Ctrl + X` / `Cmd + X` | Cut selected elements |
| `Ctrl + V` / `Cmd + V` | Paste copied elements |
| `Ctrl + D` / `Cmd + D` | Duplicate selected element(s) |
| `Ctrl + Z` / `Cmd + Z` | Undo |
| `Ctrl + Y` / `Cmd + Shift + Z` | Redo |
| `Space + Drag` | Pan the workspace |
| `Delete` / `Backspace` | Delete selected element(s) |
| `Ctrl + G` / `Cmd + G` | Group selected elements |
| `Ctrl + Shift + G` | Ungroup selected elements |
| `Ctrl + ]` / `Cmd + ]` | Bring layer forward |
| `Ctrl + [` / `Cmd + [` | Send layer backward |
| `Alt + Drag Element` | Duplicate element on drag |
| `Alt + Resize Handle` | Scale font size proportionally |
| `Shift + Drag Element` | Constrain drag axis horizontally/vertically |
| `Shift + Resize Corner` | Maintain aspect ratio while resizing |
| `Ctrl + Resize Handle` | Snap resize dimensions to nearest 10px |
| `Arrow Keys` | Nudge element by 1 pixel |
| `Shift + Arrow Keys` | Nudge element by 10 pixels |
| `Escape` | Deselect elements / close modals |
| `Tab` | Toggle Fullscreen Mode |
| `Double-click Text` | Edit text inline |
| `Double-click Group` | Isolate and select inside group |
| `Right-click Canvas` | Open canvas context menu (Preview / Auto-Resize / Clear all / etc.) |
| `Right-click Workspace` | Open workspace settings (Snapping, Rulers, Safezones) |

---

## License

This project is internal tooling developed for RMIT University. Please refer to your organisation's policies regarding usage, modification, and distribution.
