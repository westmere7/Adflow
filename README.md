# RMIT Display Studio

[![Live Demo](https://img.shields.io/badge/Live%20Demo-adcooker.netlify.app-brightgreen?style=for-the-badge&logo=netlify)](https://adcooker.netlify.app/)

A professional, browser-based visual design tool engineered specifically for building animated HTML5 display ads. RMIT Display Studio eliminates the need for complex build pipelines and third-party software installations, providing a streamlined environment tailored for high-volume banner production.

Designed to replace bloated legacy tools like Google Web Designer, this application allows creative teams to compose multi-frame, multi-size banner campaigns on an infinite canvas and instantly export them as Google Ads-compliant HTML5 packages.

---

## Key Features

### Workspace & Architecture
- **Infinite Multi-Canvas Workspace**: Design and edit multiple ad sizes (e.g., 300x250, 728x90) simultaneously side-by-side within a single project.
- **Save & Load Architecture**: Persist work locally as lightweight `.adcooker` JSON project files.
- **Theming System**: Switch between 6 distinct UI color schemas (Dark, RMIT Brand, Ocean, Navy, Light, High Contrast).
- **History Management**: Full Undo/Redo stack supporting complex nested operations.

### Element & Asset Management
- **Supported Entities**: Text, Images, SVGs, Rectangles, Circles, and Buttons.
- **Typography Integration**: Embedded RMIT brand fonts (Museo, Helvetica Neue) and precise text controls (line-height, letter-spacing).
- **Brand Element Library**: Built-in repository of pre-approved SVG assets (logos, Cricos text) that bypass manual file management and dynamically bundle on export.
- **Layer System**: Illustrator-style layer reordering, grouping, isolation modes, and lock/hide toggles.
- **Layer Persistence**: Designate elements to the "Top" or "Bottom" layer to persist them across all animation frames (ideal for static CTA buttons or backgrounds).

### Animation & Timeline
- **Frame-Based Sequencing**: Define sequences with per-frame durations (in seconds).
- **Frame Transitions**: Apply global entering transitions (Fade, Slide Up/Down/Left/Right).
- **Element Entrance Animations**: Stagger elements with individual entrance animations (Pop-in, Swipe, Fade, etc.).
- **Continuous Effects**: Apply non-destructive, persistent effects such as Pan, Zoom, Wiggle, and Float. Effects can loop infinitely or perform once.

### Advanced Styling & Color
- **Advanced Color Engine**: Dual-mode color picker supporting solid HEX values, native Eyedropper sampling (Chromium), and dynamic linear gradients with multi-stop mapping.
- **Custom Properties Panel**: Contextual right-side panel that exposes deep styling controls for active selections.
- **Hover States**: Built-in CSS hover configurations for interactive elements.

### Alignment & Precision
- **Snapping Engine**: Magnetic snapping to canvas boundaries, element centers, and custom alignment guides.
- **Rulers & Guides**: Draggable viewport rulers for creating pixel-perfect layout guides.
- **Keyboard Precision**: Nudge elements via arrow keys (1px/10px increments). Aspect ratio locking and constrained dragging via keyboard modifiers.

### Export & Validation Pipeline
- **Google Ads Compliance**: Automatically generates self-contained `.zip` files validated against Google's HTML5 ad network requirements.
- **Pre-flight Validation**: Real-time validation checks for missing ClickTags, external asset references, and 150KB maximum file size limits.
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
**[adcooker.netlify.app](https://adcooker.netlify.app/)**

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
