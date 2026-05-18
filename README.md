# 🍳 RMIT Ad Cooker

[![Live Demo](https://img.shields.io/badge/Live%20Demo-adcooker.netlify.app-brightgreen?style=for-the-badge&logo=netlify)](https://adcooker.netlify.app/)

A browser-based visual design tool for building **animated HTML display ads** — no installation, no build step, just open and create.

Built for RMIT University's marketing and digital teams, Ad Cooker lets you compose multi-frame, multi-canvas banner ads and export them as self-contained HTML packages ready for ad networks.

---

## ✨ Features

### 🎨 Canvas & Elements
- **Multi-canvas support** — design multiple ad sizes (e.g. 300×250, 728×90) within a single project
- **Element types** — Text, Image, Rectangle, Circle, and Button (clickable area)
- **Drag, resize, and rotate** elements directly on the canvas
- **Snapping** — snap to other elements, canvas bounds, and custom guides
- **Rulers & guides** — toggle a ruler overlay and place pixel-perfect guides

### 🎬 Animation & Frames
- **Multi-frame timeline** — build animated ads with any number of frames
- **Per-frame duration** — set how long each frame displays (in seconds)
- **Transitions** — Fade, Slide Left, Slide Right, Slide Up, Slide Down
- **Per-frame transition duration** — fine-tune the speed of each transition
- **Loop toggle** — configure whether the ad loops continuously

### 🖊️ Properties & Styling
- **Right-side properties panel** — contextual controls for the selected element
- **Color picker** — supports solid colors and two-stop linear gradients, with a saved swatch palette
- **Eyedropper tool** — sample any color from the screen
- **Layer panel** — reorder, hide, lock, and delete layers

### 📦 Export & Project Management
- **Export HTML** — packages the ad as a self-contained `.zip` via JSZip
- **Multi-Save to Folder** — batch-export all canvases at once
- **Save / Open Project** — persist and reload work as a `.adcooker` JSON file
- **Undo / Redo** — full history stack (`Ctrl+Z` / `Ctrl+Y`)

### 🎨 Themes
Switch between UI color schemes from the hamburger menu:

| Theme | Description |
|---|---|
| **Dark** (default) | Deep dark workspace |
| **RMIT** | RMIT brand red palette |
| **Ocean** | Teal/blue tones |
| **Navy** | Dark navy blue |
| **Light** | Light/white workspace |
| **High Contrast** | Accessibility-focused high contrast |

---

## 🗂️ Project Structure

```
Adcooker/
├── index.html          # App shell & UI markup
├── script.js           # All application logic (~200 KB)
├── styles.css          # UI styles & theme definitions
└── data/
    ├── Elements/       # App assets (logos, favicon)
    │   ├── AdCookerLogo.svg
    │   ├── RMIT_white.svg
    │   ├── Pixel.svg
    │   ├── favicon.ico
    │   └── favicon-32x32.png
    └── fonts/          # Bundled typefaces
        ├── Museo300-Regular.otf
        ├── Museo500-Regular.otf
        ├── Museo700-Regular.otf
        ├── helveticaneueltpro.otf
        ├── helveticaneueltpro_lt.otf
        └── helveticaneueltpro_roman.otf
```

---

## 🚀 Getting Started

No build tools or dependencies required.

### 🌐 Use the hosted version

No setup needed — just visit **[adcooker.netlify.app](https://adcooker.netlify.app/)** in your browser.

### 💻 Run locally

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd Adcooker
   ```

2. **Open in a browser**

   Simply open `index.html` in any modern browser:
   ```bash
   # macOS / Linux
   open index.html

   # Windows
   start index.html
   ```

   > **Note:** For full functionality (especially file export), it is recommended to serve the files via a local HTTP server rather than opening directly as a `file://` URL.
   >
   > ```bash
   > # Using Python
   > python -m http.server 8080
   >
   > # Using Node.js (npx)
   > npx serve .
   > ```
   > Then navigate to `http://localhost:8080`.

3. **Minimum screen size:** 1024 × 768. A warning overlay is shown on smaller viewports.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + S` | Save project |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Space + Drag` | Pan the canvas |
| `Delete` / `Backspace` | Delete selected element |
| `Ctrl + D` | Duplicate selected element |
| `Ctrl + G` | Group selected elements |
| `Ctrl + Shift + G` | Ungroup selected elements |
| `Ctrl + ]` | Bring layer forward |
| `Ctrl + [` | Send layer backward |
| `Escape` | Deselect / close menus |

---

## 🛠️ Tech Stack

| Library | Purpose |
|---|---|
| Vanilla HTML / CSS / JS | Core application — zero framework dependencies |
| [JSZip 3.10](https://stuk.github.io/jszip/) | Packaging exported ad files into a `.zip` |
| [Iro.js 5](https://iro.js.org/) | Color picker widget with gradient support |

All dependencies are loaded from CDN — no `npm install` needed.

---

## 📋 Requirements

- A **modern browser** (Chrome 90+, Edge 90+, Firefox 88+)
- Screen resolution of at least **1024 × 768**
- Internet connection (for CDN-loaded libraries on first use)

---

## 📄 License

This project is internal tooling for RMIT University. Please refer to your organisation's policies regarding usage and distribution.
