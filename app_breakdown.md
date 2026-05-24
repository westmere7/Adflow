# RMIT Adflow — Technical App Breakdown

<p align="center">
  <img src="file:///g:/My Drive/RMIT_WORKS/Apps/Adflow/data/Elements/Adflow_logo.svg" alt="RMIT Adflow Logo" width="300" />
</p>

This document provides a highly extensive technical breakdown of **RMIT Adflow**, detailing its core architecture, state models, UI layouts, and core systems. Other agents can read this to quickly gain full context and continue developer tasks.

## Table of Contents
- [1. Core Architecture & Tech Stack](#1-core-architecture--tech-stack)
- [2. File Directory Structure](#2-file-directory-structure)
- [3. Data Model & State Schema](#3-data-model--state-schema)
  - [Canvases and Layers](#canvases-and-layers)
  - [Timeline & Animation Frames](#timeline--animation-frames)
  - [Link Groups & Synchronization](#link-groups--synchronization)
  - [Assets and Directories](#assets-and-directories)
- [4. Key Systems & Feature Breakdown](#4-key-systems--feature-breakdown)
  - [A. Rulers, Guides, and Hotkeys](#a-rulers-guides-and-hotkeys)
  - [B. Frame Skipping (Play & Exporter)](#b-frame-skipping-play--exporter)
  - [C. Live-Link Mode & Group Sync](#c-live-link-mode--group-sync)
  - [D. Image Masking Engine (DOM & Exporter)](#d-image-masking-engine-dom--exporter)
  - [E. Sidebar Navigation & UI Layouts](#e-sidebar-navigation--ui-layouts)
  - [F. Brand Assets Scanner](#f-brand-assets-scanner)

---

## 1. Core Architecture & Tech Stack
RMIT Adflow is a rich, premium single-page application built entirely on vanilla web technologies without any heavy frameworks. This guarantees extreme performance and low overhead:
- **Structure**: Vanilla HTML5 ([`index.html`](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/index.html)) utilizing semantic layout wrappers.
- **Styling**: Vanilla CSS3 ([`styles.css`](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/styles.css)) heavily utilizing CSS variables (design tokens), advanced animations, native dark mode support, and custom scrollbars.
- **Logic**: Vanilla Javascript ([`script.js`](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/script.js)). All state, calculations, dragging logic, UI re-rendering, asset payload generation, and zip-archiving are bundled directly in the client.
- **Storage**: Project configuration and history are persisted locally in browser `localStorage` (with dynamic history limits) and can be exported/imported natively as `.flow` JSZip archives.

---

## 2. File Directory Structure
- [`/index.html`](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/index.html): The workspace and editor's skeletal UI.
- [`/styles.css`](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/styles.css): Core stylesheet containing layout guidelines, hover state transitions, and custom editor animations.
- [`/script.js`](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/script.js): The monolithic entry logic handling state objects, canvas DOM updates, inputs, dragging logic, dynamic-data merging, and exporter logic.
- `/data/Elements/`: Application SVG icons and standard branding imagery (including `Adflow_logo.svg`).
- `/data/assets/`: The preloaded brand asset folder containing stock photography, SVGs, JPEGs, and PNGs dynamically scanned by the app at startup via `fetchAssetFilenames()`.

---

## 3. Data Model & State Schema
The core source-of-truth for Adflow is the globally scoped `state` object. 

### Canvases and Layers
- **`state.canvases`**: An array of `Canvas` objects representing distinct ad display formats (e.g. `300x250`, `728x90`).
  ```typescript
  interface Canvas {
    id: string;
    name: string; // The display dimension label
    width: number;
    height: number;
    elements: Element[]; // The child layers associated with this canvas
    workspaceX?: number; // Pan positions
    workspaceY?: number;
  }
  ```
- **`state.canvases[].elements`**: Array of individual elements sorted by z-order. Elements can be of type `text`, `image`, `button`, `rect`, `circle`, or `line`. For a breakdown of relationships, see [Image Masking Engine](#d-image-masking-engine-dom--exporter).
  ```typescript
  interface Element {
    id: string;
    type: 'text' | 'image' | 'button' | 'rect' | 'circle' | 'line';
    name: string; // Base layer type name
    customName?: string; // Appears when the user renames the layer
    x: number; y: number; width: number; height: number;
    persistent: 'top' | 'bottom' | false; // Persistent brand tiers
    frameId: number; // The frame ID where this layer is meant to be shown
    linkGroupId?: string; // Links this element to elements on other canvases
    isMask?: boolean; // Toggles image masking abilities
    // Type-specific values:
    color?: string; fontSize?: number; radius?: number;
    assetId?: string; // Reference mapping to state.assets
  }
  ```

### Timeline & Animation Frames
- **`state.frames`**: The master sequenced timeline structure.
  ```typescript
  interface Frame {
    id: number;
    duration: number; // Lifetime in seconds
    transition: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom-in' | 'zoom-out';
    transitionDuration: number;
    skip?: boolean; // Determines if the exporter should skip this frame
  }
  ```

### Link Groups & Synchronization
- **`state.linkGroups`**: A dictionary linking elements across various banners so changes made to one instantly propagate to others. See [Live-Link Mode](#c-live-link-mode--group-sync).
  ```typescript
  interface LinkGroup {
    id: string;
    name: string;
    category: 'text' | 'image' | 'button' | 'shape' | 'line';
    liveLink: boolean; // Triggers instant sync when true
    syncProperties: Record<string, boolean>; // e.g. { text: true, color: true }
  }
  ```

### Assets and Directories
- **`state.assets`**: A key-value lookup holding the actual `base64` data URL payloads for images (to avoid external linking).
- **`state.assetLibrary`**: Contains collections of user-saved custom groups and shapes that can be dragged directly onto the canvas.

---

## 4. Key Systems & Feature Breakdown

### A. Rulers, Guides, and Hotkeys
- **Canvas Rulers**: Rulers are drawn using two `HTMLCanvasElement`s (`#ruler-h` and `#ruler-v`). They automatically track mouse drag events to place alignment guides (`state.guides`).
- **Hotkeys**: The `Ctrl+R` / `⌘+R` shortcut is intercepted (bypassing native browser refresh logic) to toggle the visibility of rulers instantly, invoking a workspace re-render.

### B. Frame Skipping (Play & Exporter)
- **Constraint logic**: Users can assign `skip: true` to a timeline frame. The system enforces that only *one* frame can be skipped at a time (toggling one frame to skipped forces all others to false).
- **Behavior in Editor**: A skipped frame remains fully selectable and editable inside the timeline interface.
- **Behavior in Exporter**: In `_generateExportHTMLRaw`, `state.frames.filter(f => !f.skip)` executes, stripping the frame from the final generated code. Standard transition definitions correctly loop around the missing frames.

### C. Live-Link Mode & Group Sync
- **Marching Ants Selection**: Linked siblings utilize custom `@keyframes marching-ants` animations to show they are bound together. Standard rectangles use linear gradient offset loops, while circular elements utilize rotation matrices on dashed `::after` borders.
- **Unified Settings**: Selecting an element inside a Link Group displays a dedicated "Live-link mode" toggle card in the sidebar properties list, styled with a prominent purple accent border.

### D. Image Masking Engine (DOM & Exporter)
The Image Masking system is arguably the most advanced feature in the rendering pipeline, supporting live masking, nested hover animations, and auto-sanitization.

- **Creating a Mask**: By right-clicking a shape layer (rectangle, circle, or pixel) and selecting *Use as Mask*, the shape is flagged as `isMask = true`. 
- **Validation Protocol (`sanitizeMasks`)**: An active mask layer *must* be positioned in z-order immediately above an element of `type === 'image'` ([Data Model](#canvases-and-layers)). The `render()` loop calls `sanitizeMasks()`, which sweeps all canvases. If the masked image is deleted, or a non-image layer is dragged underneath the mask, the `isMask` flag is deleted, and the layer safely reverts to a normal shape.
- **DOM SVG Generation**: The mask shape is rendered natively inside an `<svg><defs><mask id="...">` block. The target image is wrapped in a dedicated `div` bearing `-webkit-mask: url(#mask-id)`. This logic is fully mirrored within the HTML code Exporter.
- **Masked Animation Hover Previews**: 
  - Hovering over a transition/effect button for a mask layer applies the temporary animation directly to inner `<g class="mask-g-entry">` and `<g class="mask-g-eff">` nested groups inside the SVG. 
  - Hovering over presets for the *target image* specifically targets the internal `<img>` node rather than the outer wrapper. This ensures the target image animates beautifully *underneath* a completely stationary mask frame viewport.
- **UI & Prefix Auto-Styling**:
  - In the Layers sidebar, mask layers are labeled with a colorized `[mask]` prefix (`var(--accent-light)`), and target images receive `[masked] ` (with 0.7 opacity). 
  - Standard outline eye icons are preserved consistently across all masking levels.
  - When double-clicking to rename the layer, the `[mask]` prefix is seamlessly hidden, preventing users from duplicating or typing over the auto-prefix tag.
  - **Dynamic Data/Link Group Disabled Status**: Mask shapes are purely presentation-level features. If a mask layer is selected, the Dynamic Data and Link Group panels render a shortened, clean warning notice ("Disabled while layer is a mask") informing the user that masks cannot be linked globally.

### E. Sidebar Navigation & UI Layouts
- **Compact Density**: The Layers panel and Link Groups lists share identical dense padding structures (`5px 6px`), tighter vertical gaps, and small font sizing to allow more elements to fit vertically without scrolling.
- **Tier Distinctions**: The layer structure groups elements into `PERSISTENT TIER (TOP)`, `TIMELINE (FRAME X)`, and `PERSISTENT TIER (BOTTOM)` with distinct dotted separator lines.

### F. Brand Assets Scanner
- **Dynamic Retrieval (`fetchAssetFilenames`)**: At application startup, Adflow attempts to scan the `/data/assets/` directory (where pre-loaded creative content resides).
- **Flexible Regex Parser**: The scanner identifies imagery by parsing raw HTML strings fetched from the directory interface using regex `href=["']?([^"'>]+?\.(?:jpg|jpeg|png|gif|svg|webp))["']?`. This accounts for encoded special characters, spaces, and brackets.
- **Cache-Busting Integration**: The request automatically appends `?_t=${Date.now()}` query strings to directory requests, guaranteeing immediate local asset refresh when files are updated externally.

---
_Documentation automatically generated by RMIT Adflow Architecture Engine._
