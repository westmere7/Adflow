# RMIT Adflow — Technical App Breakdown (Updated v0.16.73, Engine v2.16)

This document is the official context dump for agents picking up the codebase. It covers the current architecture, state schemas, core engines (Auto-Resize, Masking, Link Sync, Dynamic Data), cloud backend, and workflow rules. **Read this in full before making non-trivial changes.**

---

## 1. Core Architecture & Tech Stack

Adflow is a vanilla-JS single-page application — no framework, no bundler, no build step. Edit the files directly, refresh the browser. The whole app is:

- **Structure**: `index.html` (~620 lines).
- **Styling**: `styles.css` (~4100 lines, CSS variables drive 5 named themes).
- **Logic**: Seven JS files loaded in sequential order via classic `<script>` tags sharing the global lexical scope (so declarations in earlier files are visible to later files at execution time):
  1. `auto-resize-engine.js` (~1750 lines) — rule-based placement engine
  2. `docs-content.js`       (~1430 lines) — in-app docs + changelog data/UI
  3. `auth-ui.js`            (~950 lines)  — Supabase auth + Cloud Projects + Spaces
  4. `data-merge.js`         (~825 lines)  — Live Data / Versions (CSV → ads)
  5. `export-pipeline.js`    (~890 lines)  — HTML5 ZIP / PNG / GIF export
  6. `color-picker.js`       (~510 lines)  — iro.js wrapper, gradient editor
  7. `script.js`             (~11,480 lines) — state, rendering loop, selection/layer panels, element transforms, history, and workspace interactions.
- **Embedded Fonts**: [font_assets.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/font_assets.js) loaded inline at the top containing brand font base64 blobs.
- **Persistence**: IndexedDB (`adflow-autosave` DB) for autosaves; `.flow` ZIP archives (JSZip) for project export/import.
- **Cloud Backend**: Supabase for authentication, storage, and shared workspaces.

---

## 2. File-Routing Table

When looking for specific features or bugs, refer to this table:

| Feature Area | File | Notable Globals / APIs |
| :--- | :--- | :--- |
| **Auto-resize engine** (rules, placement, settings, picker) | [auto-resize-engine.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/auto-resize-engine.js) | `ENGINE_VERSION`, `ROLE_IDS`, `runRuleBasedAutoResize`, `autoAssignRole`, `openAutoResizeModal` |
| **In-app documentation** (Help modal) | [docs-content.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/docs-content.js) | `DOCS_SECTIONS`, `openDocumentation`, `renderDocsPanel` |
| **Changelog data & modal** | [docs-content.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/docs-content.js) | `CHANGELOG_DATA`, `openChangelogModal` |
| **Supabase client & session** | [auth-ui.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/auth-ui.js) | `sb`, `authState`, `spacesState` |
| **Auth UI / Cloud Projects** | [auth-ui.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/auth-ui.js) | `openAuthModal`, `openCloudProjectsModal`, `pushCurrentProjectToCloud` |
| **Team Spaces & Invitations** | [auth-ui.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/auth-ui.js) | `openSpaceManagementModal`, `openMembersModal`, `openInviteModal` |
| **Live Data slots & CSV** | [data-merge.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/data-merge.js) | `dm*` helpers, `openDataPanel`, `dmRenderPanel` |
| **ZIP/PNG Export & Validation** | [export-pipeline.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/export-pipeline.js) | `exportCanvasAsZip`, `exportCanvasAsPng`, `generateExportHTML` |
| **Color & Gradient Picker** | [color-picker.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/color-picker.js) | `openColorPicker`, `syncColorPickerWithSelection` |
| **Core Boot, Render, Event Loop** | [script.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/script.js) | `state`, `initApp`, `render`, `pushHistory`, `undo`/`redo`, `openModal` |

---

## 3. Data Model & State Schema

The active project configuration is managed inside a single mutable global object named `state` (declared in `script.js`).

```typescript
interface State {
  // ----- Project Identity -----
  projectId?: string;            // UUID; promoted from short uid on first cloud push
  projectName: string;
  adSizeLimit: number;           // KB cap for the ad-weight validator (default: 150)
  spaceId?: string | null;       // Current space context (null = Personal)
  currentVersion?: string;       // Bound row key from dataMerge rows, if any

  // ----- Canvas Content -----
  canvases: Canvas[];            // Every banner size in the project
  activeCanvasId: string;        // Currently selected canvas
  activeFrameId: number;         // Currently active timeline frame
  selectedElementId: string | null;
  layerSelection: string[];      // Multi-selected layer IDs

  // ----- Timeline -----
  frames: Frame[];               // Sequenced animation frames

  // ----- Linking -----
  linkGroups: Record<string, LinkGroup>;

  // ----- Assets -----
  assets: Record<string, string>;    // assetId → base64 data URL
  assetLibrary: AssetLibraryItem[];  // User-saved custom elements/configurations
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

  // ----- View & Customizations -----
  theme?: 'default' | 'rmit' | 'ocean' | 'light' | 'navy';
  showRulers?: boolean;
  showSafezones?: boolean;
  snapEnabled?: boolean;
  zoom?: number;
  viewScrollLeft?: number; viewScrollTop?: number;
  bgApplyAll?: boolean;

  // ----- Auto-resize Engine Settings -----
  autoResizeSettings?: {
    rulesEnabled: Record<RoleId, boolean>;
    relations: { r1: boolean };
    behaviour: {
      allowCoverFallback:  boolean;
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
  };

  // ----- Auth (transient) -----
  user?: { id: string; email: string } | null;
}

interface Canvas {
  id: string;
  name: string;
  width: number; height: number;
  elements: Element[];           // z-ordered, last = top
  bgColor?: string;              // Per-canvas background color override
  fullClickArea?: boolean;       // Bypasses CTA click checks if true
}

interface Element {
  id: string;
  type: 'text' | 'image' | 'button' | 'rect' | 'circle' | 'line' | 'pixel';
  customName?: string;           // User-renamed label
  x: number; y: number; width: number; height: number;
  rotation?: number;
  persistent: 'top' | 'bottom' | false;  // Layer-panel section placement
  frameId?: number;              // Visible frame index (when persistent === false)
  linkGroupId?: string;          // Cross-canvas sync group

  // Auto-resize Roles
  role?: 'background-image' | 'rmit-logo' | 'cta-button'
       | 'heading' | 'subheading' | 'cricos'
       | 'main-image' | 'rfwn' | 'extra-info' | 'misc';
  roleAuto?: boolean;            // true = auto-detected, false = user-locked

  // Masking
  isMask?: boolean;
  maskTargetId?: string;         // Target image element ID

  // Type-Specific Attributes
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
  assetId?: string; src?: string;
  fit?: 'contain' | 'cover' | 'fill';
  autoHug?: boolean;             // Dynamic button widths
  opacity?: number;
  inTransition?: string; inDuration?: number;
  continuousEffect?: string;     // pulse / wiggle / spin / pan / zoom
  effectDuration?: number;

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
  skip?: boolean;                // Bypassed during exports
}

interface LinkGroup {
  id: string;
  name: string;
  category: 'text' | 'image' | 'button' | 'shape' | 'line';
  syncProperties: Record<string, boolean>;
  liveLink?: boolean;            // propagates updates in real-time
}
```

---

## 4. Subsystems Detail

### Auto-Resize Engine (v2.16)
Deterministic, rule-based layout generator. Takes a source canvas and targets, recalculates relative sizes, crops, and wrapping.
- **Roles**: Positions are determined by priority (`rmit-logo` -> `cta-button` -> `heading` etc.).
- **Crop Preservation**: For the `main-image` ("Fixed shape") role, the engine calculates normalized source cropping offsets and applies them to small target canvases, while keeping its exact aspect ratio.
- **R1 Alignments**: Pairs the logo and the "Ready for what's next" taglines dynamically.
- **Adjacency Post-Pass**: Employs `enforceHeadingSubheadAdjacency` to clear overlap zones between side-by-side headings and subheadings.

### CSS `clip-path` Vector Masking
Mask shapes (rectangles, circles, and custom brand SVGs) use inline CSS `clip-path` boundaries instead of brittle SVG def references.
- **Connector lines**: A visual accent bridge connects the mask layer and target image row in the Layers panel.
- **Inverse Animation**: Continuous effects apply to the mask wrapper while the child image receives inverse animation properties, keeping the background photo stationary.

### Spreadsheet Data Merge
Maps columns to dynamic element slots to batch generate banners.
- **Edit-in-place**: Direct canvas edits write back to the active version row cell unless Data Lock is on.
- **Worker Exporter**: Compresses and streams ZIP files using a background thread via direct File System streaming, bypassing main-thread lockups.

---

## 5. Workflow Conventions

### Commit Workflow
- **Never run `git add` or `git commit`**. Save files directly to the local checkout path. The user manages commits and branches using GitHub Desktop.
- Do not create branches or trigger pushes.

### Changelog Workflow
After making user-visible modifications, **bump the version and add a changelog entry in these 5 locations**:

1. [data/version.txt](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/data/version.txt) — Update the single-line string (e.g. `v0.16.73`).
2. [data/changelog.txt](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/data/changelog.txt) — Add description at the top of the file.
3. [docs-content.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/docs-content.js) — Insert the new entry details in the `CHANGELOG_DATA` array.
4. [script.js](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/script.js) — Update `currentVersion` inside `checkVersionUpdate()`, and update the version strings in the About and Settings modal templates.
5. [index.html](file:///g:/My%20Drive/RMIT_WORKS/Apps/Adflow/index.html) — Update the footer element `#app-version-display` text label.

### Severity Guide
- **Patch (Z + 1)**: For bug fixes, UI polish, or algorithm tuning (e.g. `v0.16.72` -> `v0.16.73`).
- **Minor (Y + 1)**: For new features, interface reorganizations, or major workflow changes.
- **Major (X + 1)**: Reserved for breaking revisions.
