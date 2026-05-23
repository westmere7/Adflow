# RMIT Display Studio

[![Live Demo](https://img.shields.io/badge/Live%20Demo-adflow.netlify.app-brightgreen?style=for-the-badge&logo=netlify)](https://adflow.netlify.app/)

A professional, browser-based visual design tool engineered specifically for building animated HTML5 display ads. RMIT Display Studio eliminates the need for complex build pipelines and third-party software installations, providing a streamlined environment tailored for high-volume banner production.

Designed to replace bloated legacy tools like Google Web Designer, this application allows creative teams to compose multi-frame, multi-size banner campaigns on an infinite canvas and instantly export them as Google Ads-compliant HTML5 packages.

---

## 🚀 Core Concept: Multi-Canvas Workflow & Link Groups

The standout feature of RMIT Display Studio is its **Multi-Canvas Orchestration**. Instead of creating and managing separate files for each banner size (e.g. 300x250, 728x90, 160x600), you lay out all sizes side-by-side on an infinite panning workspace.

To avoid duplicate, manual updates across different canvases, you use **Link Groups**:
- **Auto-Link Matching Elements**: Pressing **Auto-Link** automatically scans all canvases and groups elements with the same layer name and category/type. Toggle **Selected only** to scan and group matches targeting only the currently selected layer.
- **Granular Sync Properties**: Choose exactly which properties should sync for a group. Text content and styling are separated cleanly: the `"Colors"` sync property focuses strictly on text color, while a dedicated `"Background"` sync property manages text backgrounds (background color, visibility, animation padding, and coverage settings), allowing you to sync font settings while keeping different text backgrounds per layout.
- **Live-Link Mode (Real-Time Sync)**: Enable the lightning bolt toggle on any group, and any modification you make to an element (dragging, resizing, editing text inline, or changing properties in the sidebar panel) will immediately propagate to all sibling elements on other canvases in real time.
- **Contextual Actions**: Right-click elements to manage link settings, showing dynamic `Linked to: [GroupName]` and `Link to: [GroupName]` labels based on membership status. Or use **Push changes to group** in the main context menu to broadcast updates manually when Live-link is off.

---

## ✨ Headline Feature: Auto-Resize from Selected (AI)

Design **one** banner, generate the **whole size set** in a single click. With a source canvas selected, the **Auto-resize from selected** button in the Tools panel rebuilds every other canvas to fit its own proportions:

- **Hybrid role detection** — each element on the source canvas is classified first by layer name, then by heuristics, into a role: *heading*, *subheading*, *button*, *logo*, *shape*, *background image* (anything filling the canvas), or a generic fallback for unrecognised layers.
- **Format-aware placement & sizing** — every target canvas is matched to a format class (*skyscraper, rectangle, leaderboard, billboard, mobile*) and each role is positioned/scaled with presets tuned to that shape: CTAs anchor bottom-centre on tall/rectangle units and right-centre on wide/mobile strips; headings stack top-left and reserve room for the button on wide formats; logos pin top-right; full-bleed images fill the frame.
- **Clean slate, fully undoable** — target canvases are cleared first (after a confirm) so only source-derived elements remain; the entire rebuild is a single Undo step.
- **Automatic linking with smart defaults** — every propagated element is dropped into its own Link Group. Content and appearance (text, typeface, colours, stroke, animation) sync across canvases, while **position, dimensions and font-size stay independent per format** — so editing the headline or CTA colour later ripples everywhere without disturbing each size's tuned layout.

Results are a strong starting point you can refine freely; manual size/position tweaks are never overwritten by content syncs.

---

## 🗂️ Headline Feature: Data & Versions (Dynamic Creative)

Design **one** template, then data-merge a spreadsheet into it to produce a finished ad set **per row** — ideal for running the same banner set across dozens of RMIT courses. Open it from **File → Data & Versions** or the **Data** button in the top bar.

- **Per-element dynamic opt-in** — select any element and tick which fields should vary per version in the new **Dynamic Data** panel: *Text* and *Color* on text; plus *Background* on buttons, *Image* on images, or fill *Color* on shapes. Unmarked elements are never touched by the merge; a small dot marks dynamic elements on the canvas.
- **Slots compose with Link Groups** — a dynamic field becomes a *slot*. If the element is in a Link Group, the slot covers the **whole group**, so one binding fills that element on every size at once. Toggling a field on a linked element applies it to all siblings automatically — and your link-group sync settings are never altered.
- **Bind columns → slots** — import a CSV (or build the sheet inline), map each column to a slot's field, pick the **★ key column** that names exported folders, and optionally bind a column to the **ClickTag** exit URL. The sheet is stored inside the `.flow` project (auto-saves and travels with it) and can be exported back to CSV for the team to edit.
- **Live, non-destructive version switching** — pick a row from the top-bar **Version** dropdown to preview it on the canvas in both editing and preview modes. Your template defaults are never overwritten; "Template (no version)" returns to them.
- **Edit-in-place + Data lock** — while a version is active and the Data Lock is OFF, editing a dynamic slot (either inline on the canvas or via the properties panel) writes back directly to **that row's cell** in the version record. Toggling the **Data lock** to ON makes all dynamic inputs and textareas read-only, preventing accidental changes to version data.
- **Batch export** — **Export All Versions** produces one folder per row (named from the key column), each holding the full Google Ads-compliant ZIP set, through the standard export pipeline.

Frames need no special handling — a frame-1 and frame-2 headline are simply two differently-named slots, so multi-frame ads merge correctly out of the box.

---

## Key Features

### Workspace & Architecture
- **Infinite Multi-Canvas Workspace**: Design and edit multiple ad sizes simultaneously side-by-side within a single project window.
- **Seamless Auto-Save**: Every change is continuously persisted to the browser (IndexedDB) and restored on reload — including zoom & scroll position — with a live save-status indicator in the top bar. No "unsaved changes" nagging.
- **Portable `.flow` Projects**: Manually save/open self-contained `.flow` files (project + embedded assets), with an **Open Recent** list of your last saved projects for one-click restore.
- **New Project Wizard**: Spin up a project by picking which canvas sizes to include, the name, ClickTag, default background colour, and a configurable maximum ad weight (KB).
- **Theming System**: Switch between distinct UI color schemas (Dark, RMIT Brand, Ocean, Navy, Light).
- **History Management**: Full Undo/Redo stack supporting complex nested operations.

### Data-Driven Production
- **Data & Versions Engine**: Bind named element *slots* to spreadsheet columns and generate one finished ad set per row — see the headline feature above.
- **Per-Element Dynamic Flags**: Opt individual fields (text, colour, background, image) into the merge from the Properties panel; flags propagate across Link Groups so a slot stays consistent on every size.
- **Top-Bar Version Switcher**: Live, non-destructive preview of any version in both editing and preview, with edit-in-place write-back and a Data lock for read-only review.
- **CSV Import / Export & Batch Export**: Round-trip the data sheet as CSV (stored inside the `.flow` project) and export every version as its own folder of Google Ads-compliant ZIPs.

### Element & Asset Management
- **Supported Entities**: Text, Images, SVGs, Rectangles, Circles, and Buttons.
- **Typography Integration**: Embedded RMIT brand fonts (Museo, Helvetica Neue) and precise text controls (line-height, letter-spacing).
- **Brand Element Library**: Built-in repository of pre-approved SVG assets (logos, Cricos text) that bypass manual file management and dynamically bundle on export.
- **WebP Compression Tool**: Built-in visual image compressor that allows converting and compressing uploaded PNG/JPEG images directly into WebP. Offers custom quality adjustments (10% - 100%) and a real-time output size preview (KB) to fit ad package weight constraints.
- **Layer System**: Illustrator-style layer reordering, grouping, isolation modes, and lock/hide toggles.
- **Layer Persistence**: Designate elements to the "Top" or "Bottom" layer to persist them across all animation frames (ideal for static CTA buttons or backgrounds).

### Animation & Timeline
- **Frame-Based Sequencing**: Define sequences with per-frame durations (in seconds).
- **Frame Transitions**: Apply per-frame entering transitions — Fade, Slide (Up/Down/Left/Right), and Swipe (Up/Down/Left/Right, a directional wipe that reveals the next frame) — each with an optional **Add Fade** toggle and adjustable duration.
- **Element Entrance Animations**: Stagger elements with individual entrance animations (Pop-in, Swipe, Fade, etc.).
- **Continuous Effects**: Apply non-destructive, persistent effects such as Pan, Zoom, Wiggle, and Float. Effects can loop infinitely or perform once.

### Advanced Styling & Color
- **Advanced Color Engine**: Dual-mode color picker supporting solid HEX values, native Eyedropper sampling (Chromium), and dynamic linear gradients with multi-stop mapping.
- **Custom Properties Panel**: Contextual right-side panel that exposes deep styling controls for active selections.
- **Collapsible Panel Sections**: Simplify your workspace by collapsing or expanding the left panels (Add Element, Layers) and right properties sidebar sections (Canvas Settings, Properties, Animation, Dynamic Data) via their interactive headers, preserving states in `localStorage` across page reloads.
- **Hover States**: Built-in CSS hover configurations for interactive elements.

### Alignment & Precision
- **Snapping Engine**: Magnetic snapping to canvas boundaries, element centers, and custom alignment guides.
- **Rulers & Guides**: Draggable viewport rulers for creating pixel-perfect layout guides.
- **Keyboard Precision**: Nudge elements via arrow keys (1px/10px increments). Aspect ratio locking and constrained dragging via keyboard modifiers.
- **Alt-Key Override**: Intercepts default browser ALT menu navigation to prevent layout interruption when using ALT key modifiers (e.g. ALT+drag to clone elements, ALT+resize for proportional font resizing).

### Export & Validation Pipeline
- **Google Ads Compliance**: Automatically generates self-contained `.zip` files validated against Google's HTML5 ad network requirements.
- **Pre-flight Validation**: Real-time validation checks for missing ClickTags, external asset references, and a configurable maximum ad weight (default 150 KB — the Google Ads standard), set per project.
- **Automated Bundling**: Fetches and embeds external SVGs directly into the final ZIP structure to ensure total portability.
- **Static Fallbacks**: One-click generation of static PNG snapshot fallbacks for any frame.

---

## Technical Specifications

### Architecture
- **Core Technology**: 100% Vanilla JavaScript, HTML5, and CSS3. Zero framework overhead (No React/Vue/Angular).
- **Total Application Size**: ~200 KB logic footprint.
- **DOM Rendering Strategy**: Direct DOM manipulation with dynamic `<iframe>` sandboxing for live ad previews.
- **Asset Bundling**: Real-time client-side zipping via [JSZip 3.10](https://stuk.github.io/jszip/).
- **Color Processing**: Native color integration via [Iro.js 5](https://iro.js.org/).

### Project Structure
```text
RMIT-Display-Studio/
├── index.html          # Application shell & UI DOM structure
├── script.js           # Core application logic, event delegation, and export pipeline
├── styles.css          # UI styles, responsive rules, and theme definitions
└── data/
    ├── Elements/       # Pre-registered application assets and SVG brand elements
    └── fonts/          # Bundled web typefaces for local rendering
```

### System Requirements
- **Browser Compatibility**: Chromium-based browsers (Chrome 90+, Edge 90+) highly recommended for full API support (e.g., native Eyedropper). Firefox 88+ and Safari supported with feature fallbacks.
- **Viewport**: Minimum resolution of 1024 x 768.

---

## Getting Started

No build tools, `npm install`, or server configuration required.

### Hosted Environment
Access the application immediately via the live deployment:
**[adflow.netlify.app](https://adflow.netlify.app/)**

### Local Environment
1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd RMIT-Display-Studio
   ```

2. **Serve locally**
   Due to strict browser CORS policies regarding `file://` protocols and `<iframe>` rendering, it is highly recommended to serve the directory via a local HTTP server.

   ```bash
   # Python
   python -m http.server 8080

   # Node.js
   npx serve .
   ```
   Navigate to `http://localhost:8080`.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + S` / `Cmd + S` | Save project |
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
| `Right-click Canvas` | Open canvas context menu |
| `Right-click Workspace` | Open workspace settings (Snapping, Rulers) |

---

## License

This project is internal tooling developed for RMIT University. Please refer to your organisation's policies regarding usage, modification, and distribution.
