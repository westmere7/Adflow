# RMIT Adflow — Technical App Breakdown

This document provides a technical breakdown of **RMIT Adflow**, detailing its core architecture, state models, UI layouts, and core systems. Other agents can read this to quickly gain full context and continue developer tasks.

---

## 1. Core Architecture & Tech Stack
RMIT Adflow is a rich, premium single-page application built entirely on vanilla web technologies:
- **Structure**: Vanilla HTML5 (`index.html`) using semantic layout wrappers.
- **Styling**: Vanilla CSS3 (`styles.css`) specifying customized CSS variables (design tokens), animations, dark mode theme support, custom inputs, and scrollbars.
- **Logic**: Vanilla Javascript (`script.js`) maintaining state, handling layout recalculations, processing mouse and keyboard events, rendering rulers/guides, and generating zip exports.
- **Storage**: Project configuration and history are persisted locally in browser localStorage (with a history limit settings option) and exportable as custom `.flow` JSZip archives.

---

## 2. File Directory structure
- [/index.html](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/index.html): The workspace skeletal UI.
- [/styles.css](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/styles.css): Core stylesheet, layout guidelines, hover state transitions, and special canvas animations.
- [/script.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/script.js): Single entry logic file handling state, canvas DOM updates, inputs, dragging logic, data-merge logic, and asset parsing.
- `/data/assets/`: Preloaded brand asset folder (read-only) containing SVGs, JPEGs, and PNGs scanned by the app at startup.

---

## 3. Data Model & State Schema (`state` object)
The state of Adflow is held globally in the `state` object. Key structures include:

### Canvases and Layers
- **`state.canvases`**: Array of Canvas configurations. Each canvas represents a distinct display banner format (e.g. `300x250`, `728x90`):
  ```typescript
  interface Canvas {
    id: string;
    name: string;
    width: number;
    height: number;
    elements: Element[];
    workspaceX?: number; // Zoom/Pan canvas positions
    workspaceY?: number;
  }
  ```
- **`state.canvases[].elements`**: Array of element layers (Text, Image, Button, Shape, Line):
  ```typescript
  interface Element {
    id: string;
    type: 'text' | 'image' | 'button' | 'rect' | 'circle' | 'line';
    name: string;
    customName?: string; // Set when renamed in layer list
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    opacity?: number;
    locked?: boolean;
    hidden?: boolean;
    persistent: 'top' | 'bottom' | false; // Top/Bottom persistent brand tiers
    frameId: number; // Linked frame association for frame-dependent mid layers
    linkGroupId?: string; // Group ID if linked across sizes
    // Type-specific values:
    color?: string; // Text/Shape fill
    fontSize?: number;
    fontFamily?: string;
    radius?: number; // Corner radius (button/shape)
    strokeColor?: string;
    strokeWidth?: number;
    assetId?: string; // References image payload key in state.assets
  }
  ```

### Timeline & Animation Frames
- **`state.frames`**: Sequenced timing timeline:
  ```typescript
  interface Frame {
    id: number;
    duration: number; // In seconds
    transition: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom-in' | 'zoom-out';
    transitionDuration: number;
    transitionFade?: boolean;
    skip?: boolean; // New Skip Frame feature
  }
  ```
- **`state.activeFrameId`**: The active frame identifier focused in the workspace.

### Link Groups & Synchronization
- **`state.linkGroups`**: Mapping of element properties linked across canvas sizes:
  ```typescript
  interface LinkGroup {
    id: string;
    name: string;
    category: 'text' | 'image' | 'button' | 'shape' | 'line';
    liveLink: boolean; // Instant synchronization during edit
    syncProperties: Record<string, boolean>; // e.g. { text: true, color: true, radius: true }
  }
  ```

### Assets and Directories
- **`state.assets`**: Key-value store maps image IDs (e.g. `img_rmit_logo.png`) to base64 Data URLs.
- **`state.assetFolders`**: Subdirectories in the Assets panel:
  ```typescript
  interface AssetFolder {
    id: string;
    name: string;
    collapsed: boolean;
    readOnly?: boolean; // Brand preloaded RMIT folder protection
  }
  ```

---

## 4. Key Systems & Feature Breakdown

### A. Rulers, Guides, and Hotkeys
- **Rulers**: Rendered as HTML `<canvas>` elements (`#ruler-h` and `#ruler-v`) that track mouse drags to create alignment guides (`state.guides`).
- **Hotkey `Ctrl+R` / `⌘+R`**: Bypasses browser native reload via `e.preventDefault()`, toggles `state.showRulers` visibility state, and triggers an instant canvas workspace re-render.

### B. Frame Skipping (Play & Exporter integration)
- **Constraint**: Only **one** frame in the timeline is allowed to have `skip: true`. Setting any frame to skipped automatically sets other frames to `false`.
- **Workspace Canvas**: A skipped frame remains fully visible, selectable, and editable inside the designer workspace when its frame tab is active.
- **Preview & HTML Export**:
  - Filtered loop: In `_generateExportHTMLRaw`, `state.frames.filter(f => !f.skip)` builds `framesHTML` and `frameData` script objects.
  - Transition continuity: Standard transition definitions loop between surviving active frames seamlessly (e.g., if Frame 2 is skipped, Frame 1 transitions straight to Frame 3 utilizing Frame 3's specified transition).

### C. Live-Link Mode & Marching Ants
- **Marching Ants Selection Outline**: Sibling elements in live-link groups receive a moving selection border:
  - **Rectangles**: Standard elements use linear gradient background-position shifts in `styles.css` (`@keyframes marching-ants`).
  - **Circles**: Circular shapes (`.el.shape-circle`) use CSS rotation of the `::after` dashed border (`@keyframes marching-ants-circle` translating `rotate(0deg)` to `rotate(360deg)` over 20 seconds).
- **Redesigned Sidebar Toggle**: The sidebar "Live-link mode" toggle row does not look like a button anymore. It is styled as a settings card containing a prominent purple border (`var(--accent-base)`), custom dark background tint, and an active purple toggle switch.
- **Link Properties Sync**: The "Select all / Unselect all" toggle lists have been corrected to correctly include the Corner radius (`radius`) checkbox inside the action keys array.

### D. Sidebar Navigation & Layouts
- **Density Alignment**: The **Layers** panel is styled identically to the **Link Groups** panel, sharing a tighter layout gap (`6px`), padding (`5px 6px`), smaller font-sizes (`10.5px`), and smaller icon indicators (`13px`).
- **Section Headers**: Structured as `PERSISTENT TIER (TOP)`, `TIMELINE (FRAME X)`, and `PERSISTENT TIER (BOTTOM)` with dotted border lines, uppercase styling, and bolder typography, distinguishing them from standard layer nodes.
- **Unlink Button**: Located on each Link Group row; changed from a bright red warning to grey by default (lights up in soft red on hover) to reduce visual clutter in the sidebar.
- **Rename Input Styling**: Link group names share the same contenteditable styling as layers (inset border outline, background body overlay).

### E. Brand Assets Scanner (`fetchAssetFilenames`)
- **Folder Location**: Scans `/data/assets/` on the server.
- **Regex Parsing**: Uses a flexible anchor link parser `href=["']?([^"'>]+?\.(?:jpg|jpeg|png|gif|svg|webp))["']?` that matches filenames containing special characters, plus symbols, brackets, and spaces.
- **Cache-Busting**: Appends `?_t=${Date.now()}` query tags to directory fetches to force browsers to bypass stale local cache and reload fresh files.
