// ============================================================================
// State — multi-canvas model, all serializable to JSON.
// ============================================================================
// Random overlay joke selector
(function() {
  const jokes = [
    "Get a real work equipment",
    "What is this, a screen for ants?",
    "Are you designing on a smart fridge?",
    "Your browser is too small, just like my patience.",
    "Enhance! ...No seriously, we need more pixels.",
    "We're going to need a bigger monitor.",
    "This screen is tighter than our display budget.",
    "Banner production requires actual screen real estate.",
    "Your viewport is currently in 'pocket' mode.",
    "A wild mobile device appeared! Studio used Block.",
    "This app does not fit in your pocket. Yet.",
    "Are you trying to build HTML5 banners on a pager?",
    "Please maximize your window or buy a larger screen.",
    "Warning: Viewport is below minimum design-grade limits.",
    "Your screen is smaller than my motivation on a Friday afternoon.",
    "Are you building HTML5 ads on a microwave?",
    "Error 404: Screen real estate not found.",
    "Is this a custom viewport for smartwatches?",
    "If I wanted to design on this size, I'd build app icons.",
    "Responsive design doesn't mean *this* responsive.",
    "My eyes are squinting harder than a CSS compiler.",
    "This resolution belongs in 1995.",
    "Did the client ask you to fit the logo, copy, disclaimer, and CTA on *this*?",
    "Please expand your screen. The CSS grid is claustrophobic.",
    "This viewport is tighter than a zip file on a budget.",
    "Go find a desktop. Canvas production is not a mobile game.",
    "Where did the rest of your pixels go?",
    "Too small. Even the media queries are protesting.",
    "I've seen larger screen viewports on a calculator.",
    "Is that a screen or a stamp?",
    "Your screen resolution has been demoted to thumbnail."
  ];
  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  const setJoke = () => {
    const el = document.querySelector('#size-overlay h2');
    if (el) el.textContent = joke;
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setJoke);
  } else {
    setJoke();
  }
})();

const urlSizeCache = {};


// Auto-resize engine (rule-based v2) lives in `auto-resize-engine.js`. That
// file is loaded BEFORE this one in index.html, so its constants and
// functions (ROLE_IDS, ROLE_LABELS, ROLE_PICKER_ORDER, autoAssignRole,
// ensureRolesAssignedAll, runRuleBasedAutoResize, etc.) are available
// globally by the time anything in this file runs.


const uid = (prefix = '') => prefix + Math.random().toString(36).slice(2, 8);

const isLineHeightAuto = (el) => {
  if (el.lineHeightAuto !== undefined) return !!el.lineHeightAuto;
  return el.lineHeight === undefined;
};

const getResolvedLineHeight = (el) => {
  if (isLineHeightAuto(el)) return 'normal';
  const val = el.lineHeight;
  if (val === undefined || val === null || val === '') return '1.2';
  const str = String(val);
  if (str.includes('px') || str.includes('em') || str.includes('%')) return str;
  const num = Number(val);
  if (Number.isNaN(num)) return '1.2';
  if (num <= 3.5) return String(num);
  return num + 'px';
};

let isSpaceDown = false;
let isPanning = false;
let panStartX = 0, panStartY = 0;
let scrollStartX = 0, scrollStartY = 0;

const PRESET_SIZES = [
  { name: 'Wide Skyscraper', width: 160, height: 600 },
  { name: 'Medium Rectangle', width: 300, height: 250 },
  { name: 'Half Page', width: 300, height: 600 },
  { name: 'Leaderboard', width: 728, height: 90 },
  { name: 'Mobile Leaderboard', width: 320, height: 50 },
  { name: 'Billboard', width: 970, height: 250 }
];

// The pannable board is BOARD_SIZE×BOARD_SIZE px (kept in sync with the
// `.workspace-canvas` width/height in styles.css). Canvases are placed at
// absolute workspaceX/workspaceY coords on it. We anchor content near the
// top-left (BOARD_MARGIN) rather than the old centre (~2050) so the board can
// be small without users panning into empty void, while still leaving margin
// on every side for temporarily parking elements.
const BOARD_SIZE = 3000;
const BOARD_MARGIN = 500;

// Initial layout positions in the all-sizes workspace (anchored at BOARD_MARGIN)
const INITIAL_LAYOUT = [
  { x: 500, y: 500 },
  { x: 700, y: 500 },
  { x: 1040, y: 500 },
  { x: 1380, y: 500 },
  { x: 1380, y: 670 },
  { x: 1380, y: 800 },
];

function seedCanvas(preset, layoutIdx) {
  const id = uid();
  return {
    id,
    name: preset.name,
    width: preset.width,
    height: preset.height,
    bgColor: '#0f172a',
    workspaceX: INITIAL_LAYOUT[layoutIdx]?.x ?? (BOARD_MARGIN + (layoutIdx || 0) * 30),
    workspaceY: INITIAL_LAYOUT[layoutIdx]?.y ?? (BOARD_MARGIN + (layoutIdx || 0) * 30),
    elements: defaultElements(preset),
  };
}

function defaultElements(preset) {
  // Adapt seed content to canvas proportions
  const w = preset.width, h = preset.height;
  const isTall = h > w * 1.5;
  const isWide = w > h * 3;
  const fs = Math.max(14, Math.min(40, Math.round(Math.min(w, h) * 0.12)));
  const pad = Math.max(10, Math.round(Math.min(w, h) * 0.06));
  const out = [];
  out.push(Object.assign(makeElement('text'),
    {
      x: pad, y: pad, text: 'Summer sale',
      fontSize: fs, color: '#ffffff', weight: '700', fontFamily: 'Museo',
      width: Math.max(120, w - pad * 2 - (w * 0.25)), height: Math.round(fs * 1.2)
    }));
  if (!isWide || w > 600) {
    out.push(Object.assign(makeElement('text'),
      {
        x: pad, y: pad + Math.round(fs * 1.2) + 8, text: 'Up to 50% off',
        fontSize: Math.max(11, Math.round(fs * 0.55)),
        color: '#c7ccdb', weight: '400', fontFamily: 'Helvetica Neue LT Pro',
        width: w - pad * 2, height: Math.round(Math.max(11, Math.round(fs * 0.55)) * 1.2)
      }));
  }
  const btnW = Math.min(140, Math.round(w * 0.35));
  const btnH = Math.min(40, Math.round(h * 0.15));
  out.push(Object.assign(makeElement('button'),
    {
      x: pad,
      y: isTall ? h - btnH - pad : h - btnH - pad,
      text: 'Shop now', bg: '#7c5cff', color: '#fff',
      fontSize: Math.max(11, Math.round(btnH * 0.42)),
      radius: 6, width: btnW, height: btnH, isClickArea: true,
      fontFamily: 'Helvetica Neue LT Pro', weight: '500'
    }));

  const logoW = Math.max(60, Math.min(100, Math.round(w * 0.2)));
  const logoH = Math.round(logoW * 0.35); // rough aspect ratio for RMIT logo
  out.push(Object.assign(makeElement('image'),
    { customName: 'RMIT Logo', assetId: 'data/Elements/RMIT_White.svg', x: w - logoW - pad, y: pad, width: logoW, height: logoH, persistent: 'top' }));

  out.push(Object.assign(makeElement('text'),
    {
      customName: 'Compliance Text', text: 'CRICOS: 00122A | RTO: 3046',
      fontSize: 8, color: '#9aa1b6', weight: '400',
      width: 140, height: 12,
      x: 6, y: h - 14, textAlign: 'left', persistent: 'top'
    }));

  return out;
}

function makeElement(type) {
  let fId = 1;
  try { fId = state.activeFrameId || 1; } catch (e) { }
  const base = { id: uid(), x: 20, y: 20, width: 120, height: 40, animType: 'none', animDuration: 1.0, animDelay: 0.0, effectType: 'none', frameId: fId, persistent: false };
  switch (type) {
    case 'text': return { ...base, type, text: 'Your headline', fontSize: 22, color: '#ffffff', weight: '400', fontFamily: 'Helvetica Neue LT Pro', width: 220, height: 32 };
    case 'rect': return { ...base, type, color: '#7c5cff', width: 120, height: 80, radius: 8 };
    case 'circle': return { ...base, type, color: '#22d3ee', width: 80, height: 80 };
    case 'line': return { ...base, type, color: '#ffffff', width: 160, height: 3, opacity: 100 };
    case 'pixel': return { ...base, type, color: '#e61e2a', width: 100, height: 100 };
    case 'button': {
      let buttonBg = '#000054';
      try {
        const c = getActiveCanvas();
        if (c) {
          const bgVal = (getCanvasBg(c, fId) || '').trim().toLowerCase();
          const cleanBg = bgVal.startsWith('#') ? bgVal : '#' + bgVal;
          if (cleanBg === '#000054') {
            buttonBg = '#e61e2a';
          } else if (cleanBg === '#e61e2a') {
            buttonBg = '#000054';
          }
        }
      } catch (err) {}
      return { ...base, type, text: 'Learn more', fontSize: 14, color: '#ffffff', bg: buttonBg, radius: 6, fontFamily: 'Museo', weight: '700', width: 130, height: 40, isClickArea: true, autoSize: true, maxFontSize: 40, wrapText: true };
    }
    case 'image': return { ...base, type, assetId: null, width: 140, height: 90, objectFit: 'contain' };
  }
}

// Initial state: all 5 preset canvases pre-seeded
const state = {
  projectName: 'RMIT_ad',
  clickTag: 'https://www.rmit.edu.au/',
  compressedAssetsMap: {},
  frames: [{ id: 1, duration: 2 }],
  activeFrameId: 1,
  canvases: PRESET_SIZES.map((p, i) => seedCanvas(p, i)),
  activeCanvasId: null,
  selectedElementId: null,
  layerSelection: [],
  assetSelection: [],
  zoom: 1.0,
  activeTool: 'select',
  editingElementId: null,      // inline-edit (text) mode
  isolatedGroupId: null,
  assets: {
    'rmit_logo': 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMiIgZGF0YS1uYW1lPSJMYXllciAyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMTkuNjcgNzYuMjMiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICNmZmY7CiAgICAgIH0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDxnIGlkPSJMYXllcl8xLTIiIGRhdGEtbmFtZT0iTGF5ZXIgMSI+CiAgICA8ZyBpZD0iUk1JVF93aGl0ZSI+CiAgICAgIDxnPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI2LjIxLDBoLTYuNjh2NS40M2gtMTEuMTV2MTEuMzRIMHYxNi42NWg4LjM3djExLjM0aDExLjEzdjUuNDNoNS45MWMxMy43OCwwLDI1LjkzLTExLjEzLDI1LjkzLTI1LjAyUzQwLjAzLDAsMjYuMjEsMCIvPgogICAgICAgIDxwb2x5Z29uIGNsYXNzPSJjbHMtMSIgcG9pbnRzPSIxNjAuNDEgNC43OSAxNjYuMjMgNC43OSAxNjYuMjMgNDUuMzcgMTYwLjQxIDQ1LjM3IDE2MC40MSA0Ny40NiAxODAuNTggNDcuNDYgMTgwLjU4IDQ1LjM3IDE3NC43OCA0NS4zNyAxNzQuNzggNC43OSAxODAuNTggNC43OSAxODAuNTggMi42NyAxNjAuNDEgMi42NyAxNjAuNDEgNC43OSIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTIxOC45NCwyLjY1aC0zNS44OGwtLjczLDExLjgxaDIuMTJjMS4yMy04LjU4LDIuODEtMTAuNjEsMTIuMjctMTAuMTN2NDEuMDNoLTYuMTh2Mi4xaDIwLjk2di0yLjFoLTYuMThWNC4zM2M5LjQ0LS40OCwxMS4wNiwxLjU1LDEyLjI3LDEwLjEzaDIuMDhsLS43My0xMS44MVoiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xNDIuMjMsNS40N3YzOS44OWgtNS43N3YyLjFoMjAuMTR2LTIuMWgtNS43N1Y0Ljc3aDUuNzV2LTIuMTRoLTE2LjU0bC05LjcyLDMwLjY1LTkuMzctMzAuNjVoLTE2LjQ3djIuMTJoNS43OXY0MC42aC02LjI1Yy01LjgyLjE0LTUuOTEtNC44MS01Ljg4LTUuODQuMDktMTAuOTMtMi4zNy0xNC44OS0xMi44NC0xNi41MXYtLjE0YzYuMjUtLjY2LDE0LjIzLTIuNDQsMTQuMjMtMTAuMDEsMC05LjMzLTguNjktMTAuMi0xNi4wMy0xMC4yaC0yMS42djIuMTJoNS43OXY0MC42aC01Ljc5djIuMTJoMjAuMTZ2LTIuMTJoLTUuNzl2LTIxLjM5YzMuNzItLjE0LDcuOTEuOCw5Ljc4LDIuNDIsMS43NiwxLjQ4LDIuNjksNi4wOSwyLjY5LDExLjYzLDAsNi44NCwzLjU0LDkuNDQsMTAuMzMsOS40NGgxOS40M3YtMi4xaC01LjY2VjUuNDdoLjE0bDEzLjM0LDQyLjAxaDIuMjZsMTMuNDMtNDIuMDFoLjIxWk03Ni4yNywyMS44NWwtLjAyLjAyVjQuNzdoNS44NGM1Ljk4LDAsOC4xOSwxLjUxLDguMTksOS4wMywwLDYtMi40OSw4LjA1LTguNTEsOC4wNSwwLDAtNS41LDAtNS41LDBaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNzguNTUsNTkuOTR2OS42OWMwLDIuNjctMS42Nyw0LjI0LTQuMiw0LjI0cy00LjItMS41NS00LjItNC4ydi05Ljc0YzAtMS4xMi0uNDgtMS42LTEuNi0xLjZoLTIuNTF2Mi4xNGgxLjA3Yy4zNCwwLC41NS4xOC41NS41NWgtLjAyejAsOC43NCwwLDguNzRjMCwzLjgzLDIuNzQsNi40NSw2LjczLDYuNDVzNi42Ni0yLjYyLDYuNjYtNi40NXYtOC43NGMwLS4zNi4yMS0uNTUuNTUtLjU1aDEuMDd2LTIuMTRoLTIuNDljLTEuMTIsMC0xLjYyLjQ4LTEuNjIsMS42Ii8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNOTcuMzksNTkuOTR2OS41M2MwLDEsLjE4LDIuMzkuMTgsMi4zOWgtLjA1cy0uODItMS40Ni0xLjQ2LTIuMzlsLTcuODItMTEuMTNoLTIuMjZ2MTQuODdjMCwuMzQtLjIxLjU1LS41NS41NWgtMS4wN3YyLjE0aDIuNTFjMS4xMiwwLDEuNi0uNDgsMS42LTEuNnYtOS41M2MwLS45OC0uMTYtMi4zOS0uMTYtMi4zOWguMDVzLjgsMS40NiwxLjQ0LDIuMzlsNy44NSwxMS4xM2gyLjI0di0xNC44N2MwLS4zNi4yMS0uNTUuNTUtLjU1aDEuMDd2LTIuMTRoLTIuNDljLTEuMTQsMC0xLjYyLjQ4LTEuNjIsMS42Ii8+CiAgICAgICAgPHBvbHlnb24gY2xhc3M9ImNscy0xIiBwb2ludHM9IjEwNC4yMSA2MC40OSAxMDUuOTIgNjAuNDkgMTA1LjkyIDczLjc2IDEwNC4yMSA3My43NiAxMDQuMjEgNzUuOTEgMTEwLjAxIDc1LjkxIDExMC4wMSA3My43NiAxMDguMyA3My43NiAxMDguMyA2MC40OSAxMTAuMDEgNjAuNDkgMTEwLjAxIDU4LjM0IDEwNC4yMSA1OC4zNCAxMDQuMjEgNjAuNDkiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xMjQuMSw1OS43OGwtMy44NSwxMC44M2MtLjM0Ljk2LS42NiwyLjQyLS42NiwyLjQyaC0uMDVzLS4zNC0xLjQ4LS42Ni0yLjQybC0zLjg1LTEwLjgzYy0uNDEtMS4xNi0uODQtMS40NC0yLjA4LTEuNDRoLTEuMzl2Mi4xNGguMzRjLjQzLDAsLjY2LjA5LjgyLjU1aC0uMDJsNS41MiwxNC44N2gyLjY1bDUuNTItMTQuODdjLjE2LS40Ni4zNi0uNTUuODItLjU1aC4zNHYtMi4xNGgtMS4zOWMtMS4yMywwLTEuNjQuMjctMi4wNSwxLjQ0Ii8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTM5LjM2LDczLjI0YzAsLjM0LS4yMS41NS0uNTUuNTVoLTUuMTNjLS4zNCwwLS41NS0uMjEtLjU1LS41NXYtNS4xMWg2LjE0di0yLjE0aC02LjE0di01LjVoNWMuMzQsMCwuNTUuMTguNTUuNTV2MS4xMmgyLjI2di0yLjIxYzAtMS4xMi0uNDgtMS42LTEuNi0xLjZoLTEwLjMzdjIuMTRoMS42MnYxMy44NGMwLDEuMTIuNDgsMS42LDEuNiwxLjZoNy44MmMxLjEyLDAsMS42LS40OCwxLjYtMS42di0yLjIxaC0yLjh2MS4xMloiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xNTYuMTMsNzMuMTlsLTIuMTItNC4yYy0uMy0uNTctLjc1LS44LS43NS0uOHYtLjA1YzEuMjUtLjI3LDMuMTctMS43MSwzLjE3LTQuNjUsMC0zLjIyLTIuMTctNS4xNS01LjI1LTUuMTVoLTcuNjZ2Mi4xNGgxLjYydjE1LjQyaDIuNDl2LTdoMi4yOGMuOTYsMCwxLjI4LjE0LDEuNzMuOTZsMi4zOSw0LjcyYy41NywxLjE0LDEuMDcsMS4zMiwyLjQ0LDEuMzJoMS4yM3YtMi4xNGgtLjMyYy0uNjIsMC0xLS4wNS0xLjI1LS41N00xNTAuODYsNjYuNzhoLTMuMjR2LTYuM2gzLjI4YzEuODUsMCwyLjk3LDEuMTQsMi45NywzLjFzLTEuMTIsMy4xOS0zLjAxLDMuMTkiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xNjIuMzUsNjIuNjhjMC0xLjMyLDEuMTktMi4zNywzLjA4LTIuMzcsMS4zOSwwLDIuNzEuNjgsMi43MSwxLjZ2LjgyaDIuMjh2LTEuNDRjMC0yLjM5LTMuMTItMy4yNC01LTMuMjQtMy4zMywwLTUuNjMsMi4wNS01LjYzLDQuNywwLDUuNDcsOC40OCw0LjksOC40OCw4LjU4LDAsMS42Mi0xLjM3LDIuNjItMy4wMSwyLjYyLTIuNTEsMC00LjI3LTEuOTctNC4zOS0yLjExbC0xLjQ1LDEuNzRzMi4wOCwyLjYyLDUuODIsMi42MmMzLjQ3LDAsNS41Ny0yLjMsNS41Ny01LDAtNS43Ny04LjQ2LTQuOTctOC40Ni04LjUzIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTYwLjg3LDcxLjgyczAsMCwuMDEuMDFoLjAxcy0uMDItLjAxLS4wMi0uMDFaIi8+CiAgICAgICAgPHBvbHlnb24gY2xhc3M9ImNscy0xIiBwb2ludHM9IjE3My40MSA2MC40OSAxNzUuMTIgNjAuNDkgMTc1LjEyIDczLjc2IDE3My40MSA3My43NiAxNzMuNDEgNzUuOTEgMTc5LjIxIDc1LjkxIDE3OS4yMSA3My43NiAxNzcuNSA3My43NiAxNzcuNSA2MC40OSAxNzkuMjEgNjAuNDkgMTc5LjIxIDU4LjM0IDE3My40MSA1OC4zNCAxNzMuNDEgNjAuNDkiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xOTQuNCw1OC4zN2gtMTIuMDljLTEuMTIsMC0xLjQ4LjM3LTEuNDgsMS40OHYyLjNoMi4yMXYtMS4xMmMwLS4zNy4yMS0uNTUuNTUtLjU1aDMuNTF2MTUuNDJoMi40OXYtMTUuNDJoMy41NGMuMzQsMCwuNTUuMTguNTUuNTV2MS4xMmgyLjIxdi0yLjNjMC0xLjEyLS4zNi0xLjQ4LTEuNDgtMS40OCIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTIwOC4wMSw1OS42OWwtMi42NSw0LjQyYy0uNTkuOTYtMS4wNywxLjk2LTEuMDcsMS45NmgtLjA1cy0uNS0uOTgtMS4wNy0xLjk2bC0yLjY3LTQuNDJjLS43MS0xLjE2LTEuMTktMS4zNS0yLjM3LTEuMzVoLTEuMTR2Mi4xNGguNWMuNTIsMCwuNzUuMDksMS4wNy42Mmw0LjQ1LDcuMTRoLjAydjcuNjZoMi40OXYtNy42NmwtLjQyLTcuMTRjLjMyLS41Mi41Ny0uNjIsMS4wOS0uNjJoLjQ4di0yLjE0aC0xLjE0Yy0xLjE5LDAtMS42OS4xOC0yLjM3LDEuMzUiLz4KICAgICAgPC9nPgogICAgPC9nPgogIDwvZz4KPC9zdmc+'
  },
  showRulers: true,
  snapEnabled: true,
  snapToElements: true,
  snapToCanvas: true,
  snapToGuides: true,
  cropToCanvas: false,
  tempTopDuringDrag: false,
  loopAd: false,
  previewCurrentOnly: false,
  guides: [],
  activeSmartGuides: null,
  showSafezones: false,
  adSizeLimit: 150,      // max exported ad weight in KB (IAB display-ad standard)
  snapDistance: 5,       // snapping distance tolerance in pixels
  defaultBg: '#0f172a',  // default background for newly created canvases
  savedHistoryLimit: 50,    // undo-stack depth — bumped from 10 in v0.16.8
  autosaveInterval: 10,     // local IndexedDB auto-save interval in seconds (5-60)
  zoomStep: 0.1,            // mouse scroll zoom step percentage (e.g. 0.1 = 10%)
  showCanvasSizes: true,    // renders dimension labels inside canvas frame headers
  canvasSpacing: 60,        // vertical/horizontal grid gap spacing between canvases
  safezoneStandard: 5,      // standard aspect layouts safezone padding %
  safezoneNarrow: 8,        // skinny aspect layouts safezone padding %
  nudgeDefault: 1,          // standard arrow key nudge delta in pixels
  nudgeShift: 10,           // Shift + arrow key nudge delta in pixels
  exportFormat: 'png',      // export image format preference: png, jpeg, webp
  exportQuality: 80,        // image quality compression factor % (for jpeg/webp)
  compressFormat: 'jpeg',   // auto-compression output: 'jpeg' (PNG for transparency — ad-server safe) or 'webp'
  subheadingAutoHide: true, // allow Auto-Hide Subheading setting override
  defaultCricosCode: '00122A', // RMIT default compliance CRICOS code
  clipboard: null,
  outlineMode: false,
  linkGroups: {},
  assetNames: {},        // assetId -> original filename (for data-merge image lookup)
  assetLibrary: [],      // saved reusable elements/groups (Assets panel)
  assetFolders: [],      // folders organizing the Assets panel (1 level deep)
  favoriteAnimations: JSON.parse(localStorage.getItem('favoriteAnimations') || '[]'),
  filterFavorites: false,
  validationSettings: {
    textSize: true,
    contrast: true,
    transitionTiming: true,
    infiniteMotion: true,
    cricos: true,
    logo: true,
    brandColors: true,
    brandFonts: true
  },
  // Data-merge / versioning: bind named element "slots" to spreadsheet columns so a
  // single template produces one finished ad set per row (e.g. one per RMIT course).
  dataMerge: {
    enabled: false,
    columns: [],         // header names, in order
    rows: [],            // array of { columnName: value }
    keyColumn: null,     // column used to name exported zips
    activeVersion: null, // index into rows, or null = template defaults
    locked: false,       // when true, dynamic slots are read-only in the editor
    mappings: {},        // 'slotKey::field' -> columnName  (slotKey = 'g:'+gid | 'el:'+id | 'clicktag')
    skipHeaders: false   // if true, CSV imports skip the first row as headers and generate auto-headers
  }
};
state.activeCanvasId = state.canvases[0].id;

const history = [];
let historyIndex = -1;
var sizeUpdateTimeout = null;
let startupTemplates = [];

function measureButtonWidth(el) {
  const canvas = measureButtonWidth.canvas || (measureButtonWidth.canvas = document.createElement('canvas'));
  const ctx = canvas.getContext('2d');
  ctx.font = `${el.weight || '600'} ${el.fontSize || 14}px ${el.fontFamily || 'Arial'}`;
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = (el.letterSpacing || 0) + 'px';
  }
  const textW = ctx.measureText(el.text).width;
  // Add 2px safety padding to prevent layout engine rounding/kerning shifts from causing premature wraps
  return Math.ceil(textW) + (el.paddingLR || 16) * 2 + 2;
}

let measureDiv = null;
function getMeasureDiv() {
  if (!measureDiv) {
    measureDiv = document.createElement('div');
    measureDiv.style.position = 'absolute';
    measureDiv.style.visibility = 'hidden';
    measureDiv.style.top = '-9999px';
    measureDiv.style.left = '-9999px';
    measureDiv.style.whiteSpace = 'pre-wrap';
    measureDiv.style.wordBreak = 'normal';
    measureDiv.style.overflowWrap = 'normal';
    measureDiv.style.boxSizing = 'border-box';
    document.body.appendChild(measureDiv);
  }
  return measureDiv;
}

// Smallest one-line font (px) an auto-sized button will use before it wraps to a
// (larger) multi-line layout instead. Overridable per button via el.wrapMinSize.
const DEFAULT_WRAP_MIN = 14;

// buttonMode: 'wrap' measures the label wrapped (to test a multi-line fit);
// anything else ('oneline'/undefined) measures it unwrapped (single-line fit).
function measureTextFits(el, text, fontSize, buttonMode) {
  const m = getMeasureDiv();
  m.innerHTML = '';
  
  let targetWidth = el.width;
  let targetHeight = el.height;
  if (el.type === 'button') {
    const padLR = el.paddingLR !== undefined ? el.paddingLR : 16;
    const padTB = el.paddingTB !== undefined ? el.paddingTB : 0;
    targetWidth = Math.max(0, el.width - padLR * 2);
    targetHeight = Math.max(0, el.height - padTB * 2);
  }
  m.style.width = targetWidth + 'px';
  
  const isButton = el.type === 'button';
  const ta = el.textAlign || (isButton ? 'center' : 'left');
  const lh = isButton ? '1.2' : getResolvedLineHeight(el);
  const fw = el.weight || (isButton ? '600' : '400');
  
  const textBlock = document.createElement('div');
  textBlock.style.textAlign = 'left';
  textBlock.style.width = '100%';
  textBlock.style.fontSize = fontSize + 'px';
  textBlock.style.lineHeight = lh;
  
  const span = document.createElement(isButton ? 'span' : (el.htmlTag || 'span'));
  span.innerText = text;
  span.style.fontSize = fontSize + 'px';
  span.style.fontWeight = fw;
  span.style.fontFamily = el.fontFamily || 'Arial';
  span.style.lineHeight = lh;
  span.style.letterSpacing = (el.letterSpacing || 0) + 'px';
  if (isButton) {
    // 'wrap' mode lets the label wrap (multi-line fit test); 'oneline' (default)
    // measures it unwrapped so it can be auto-sized to a single line. Mirrors
    // adjustAutoSizes() in export-pipeline.js.
    span.style.whiteSpace = (buttonMode === 'wrap') ? 'normal' : 'nowrap';
    span.style.wordBreak = 'normal';
  } else {
    span.style.wordBreak = 'normal';
    span.style.overflowWrap = 'normal';
  }
  
  if (!isButton && el.hasBg) {
    const lr = el.bgPadL !== undefined ? el.bgPadL : 8;
    const tb = el.bgPadV !== undefined ? el.bgPadV : 4;
    span.style.display = 'inline';
    span.style.padding = `${tb}px ${lr}px`;
    span.style.setProperty('box-decoration-break', 'clone');
    span.style.setProperty('-webkit-box-decoration-break', 'clone');
  }
  
  textBlock.appendChild(span);
  m.appendChild(textBlock);
  
  const rect = textBlock.getBoundingClientRect();
  // One-line button fit needs a 2px width safety margin (negative tolerance) so
  // sub-pixel / display-scaling (DPR) differences between the editor and the
  // export preview can't tip a single line into wrapping — and it measures the
  // unwrapped span's OWN width (textBlock.scrollWidth floors at the block width,
  // so it couldn't see a narrower fit). Wrap-mode buttons and text use the
  // wrapped block width with the usual +1.5 leniency. (Mirrors adjustAutoSizes()
  // in export-pipeline.js so both sizers pick the same font.)
  const fitsHeight = rect.height <= (targetHeight + 1.5);
  const fitsWidth = (isButton && buttonMode !== 'wrap')
    ? (span.getBoundingClientRect().width <= (targetWidth - 2))
    : (textBlock.scrollWidth <= (targetWidth + 1.5));

  return fitsHeight && fitsWidth;
}

function calculateAutoSize(el, text) {
  if (!text) return 4;
  const hi0 = Math.max(4, el.maxFontSize !== undefined ? el.maxFontSize : (el.fontSize || 72));
  const search = (mode) => {
    let low = 4, high = hi0, best = 4;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (measureTextFits(el, text, mid, mode)) { best = mid; low = mid + 1; }
      else high = mid - 1;
    }
    return best;
  };
  
  // Buttons with Wrap on: keep the label on ONE line as long as it can be sized
  // at/above the per-button threshold (wrapMinSize); if a single line would need
  // a smaller font than that, wrap instead (usually larger multi-line text).
  // Mirrors adjustAutoSizes() in export-pipeline.js so editor and preview agree.
  if (el.type === 'button' && el.wrapText) {
    const oneLine = search('oneline');
    const threshold = el.wrapMinSize !== undefined ? el.wrapMinSize : DEFAULT_WRAP_MIN;
    return (oneLine >= threshold) ? oneLine : Math.max(oneLine, search('wrap'));
  }
  return search('oneline');
}



// Re-entrancy guard: any pushHistory() call that fires DURING a restore
// (e.g. via render() → some downstream side-effect) gets short-circuited.
// Prevents the restore itself from polluting history with a duplicate of
// the snapshot we just popped.
let _restoringHistory = false;

function pushHistory() {
  if (_restoringHistory) return;
  const snapshot = JSON.stringify({
    canvases:          state.canvases,
    frames:            state.frames,
    activeCanvasId:    state.activeCanvasId,
    activeFrameId:     state.activeFrameId,
    selectedElementId: state.selectedElementId,
    layerSelection:    state.layerSelection,
    guides:            state.guides,
    linkGroups:        state.linkGroups,
    dataMerge:         state.dataMerge,
    projectName:       state.projectName,
    validationSettings: state.validationSettings
  });
  // Skip exact duplicates (e.g. a no-op drag).
  if (historyIndex >= 0 && history[historyIndex] === snapshot) return;
  // Drop any forward (redo) branch — making a new change invalidates redo.
  history.splice(historyIndex + 1);
  history.push(snapshot);
  historyIndex = history.length - 1;
  // Trim from the oldest end until we're at/below the configured limit.
  // The default jumped from 10 to 50 in v0.16.8; max 100 from Settings.
  const limit = Math.max(5, Math.min(100, state.savedHistoryLimit || 50));
  while (history.length > limit) {
    history.shift();
    historyIndex--;
  }
  queueSizeUpdate();
  scheduleAutosave();
}

function getCappedHistory(limit) {
  const l = limit !== undefined ? limit : (state.savedHistoryLimit || 50);
  if (history.length <= l) {
    return {
      history: [...history],
      historyIndex: historyIndex
    };
  }

  // Choose a sliding window of size `l` around historyIndex
  let start = historyIndex - Math.floor(l / 2);
  if (start < 0) {
    start = 0;
  }
  let end = start + l - 1;
  if (end >= history.length) {
    end = history.length - 1;
    start = end - l + 1;
    if (start < 0) start = 0;
  }

  const slicedHistory = history.slice(start, end + 1);
  const newIndex = historyIndex - start;
  return {
    history: slicedHistory,
    historyIndex: newIndex
  };
}

// ============================================================================
// Auto-save (IndexedDB) + save-status indicator
// ============================================================================
// IndexedDB (not localStorage) so large projects with embedded image data URLs
// don't hit the ~5MB localStorage ceiling. A single record holds the latest
// working state; it's overwritten on a debounce after every change.
const AUTOSAVE_DB = 'adflow-autosave';
const AUTOSAVE_STORE = 'state';
const AUTOSAVE_KEY = 'current';

function _idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUTOSAVE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(AUTOSAVE_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function _idbPut(key, val) {
  const db = await _idbOpen();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(AUTOSAVE_STORE, 'readwrite');
      tx.objectStore(AUTOSAVE_STORE).put(val, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
async function _idbGet(key) {
  const db = await _idbOpen();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(AUTOSAVE_STORE, 'readonly');
      const r = tx.objectStore(AUTOSAVE_STORE).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally { db.close(); }
}

// Serializable snapshot of the working state — drops transient/edit-only fields and
// records the current scroll so a reload restores the user's exact view.
function buildStateSnapshot() {
  const snap = JSON.parse(JSON.stringify(state));
  // Strip transient/view-mode state so a reload always opens in normal editor mode.
  snap.editingElementId = null;
  snap.activeSmartGuides = null;
  snap.isDragging = false;
  snap.isPreviewMode = false;
  snap.singlePreviewId = null;
  snap.isolatedGroupId = null;
  snap.clipboard = null;
  delete snap.prePreviewZoom;
  delete snap.prePreviewScrollLeft;
  delete snap.prePreviewScrollTop;
  const ca = document.getElementById('canvas-area');
  if (ca) { snap.viewScrollLeft = ca.scrollLeft; snap.viewScrollTop = ca.scrollTop; }
  return snap;
}

const _LOCAL_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const _isLocalUuid = (s) => typeof s === 'string' && _LOCAL_UUID_RE.test(s);

let _localSaveStatus = 'saved'; // 'saved' | 'unsaved' | 'saving' | 'error'
let _cloudSaveStatus = 'none';  // 'none' | 'saved' | 'saving' | 'error'
let _fileSaveStatus = 'none';   // 'none' | 'saved' | 'unsaved'
let _lastLocalSaveTime = new Date();
let _lastCloudSaveTime = null;
let _lastFileSaveTime = null;
let _autosaveTimer = null;
let _autosaveSuspended = true;  // suppressed until the initial restore/render finishes

const localMap = {
  saved: {
    text: 'Saved',
    title: 'Changes saved locally to browser storage',
    class: 'status-saved',
    icon: `<svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
             <path d="m9 13 2 2 4-4"></path>
           </svg>`
  },
  unsaved: {
    text: 'Unsaved',
    title: 'You have unsaved changes',
    class: 'status-unsaved',
    icon: `<svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
             <circle cx="12" cy="13" r="1.5"></circle>
           </svg>`
  },
  saving: {
    text: 'Saving...',
    title: 'Saving changes to local browser storage...',
    class: 'status-saving',
    icon: `<svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <line x1="12" y1="2" x2="12" y2="6"></line>
             <line x1="12" y1="18" x2="12" y2="22"></line>
             <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
             <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
             <line x1="2" y1="12" x2="6" y2="12"></line>
             <line x1="18" y1="12" x2="22" y2="12"></line>
             <line x1="6.83" y1="17.17" x2="4" y2="20"></line>
             <line x1="20" y1="4" x2="17.17" y2="6.83"></line>
           </svg>`
  },
  error: {
    text: 'Save Error',
    title: 'Failed to auto-save locally',
    class: 'status-error',
    icon: `<svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
             <line x1="12" y1="9" x2="12" y2="13"></line>
             <line x1="12" y1="17" x2="12.01" y2="17"></line>
           </svg>`
  }
};

const cloudMap = {
  none: {
    text: 'Local Only',
    title: 'Project is local-only (not synced to cloud)',
    class: 'status-none',
    icon: `<svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
           </svg>`
  },
  saved: {
    text: 'Synced',
    title: 'Project backups are fully synced to cloud',
    class: 'status-saved',
    icon: `<svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
             <path d="m9 13 2 2 4-4"></path>
           </svg>`
  },
  saving: {
    text: 'Syncing...',
    title: 'Syncing backup to cloud database...',
    class: 'status-saving',
    icon: `<svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <path d="M16 16l-4-4-4 4"></path>
             <path d="M12 12v9"></path>
             <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
           </svg>`
  },
  error: {
    text: 'Sync Error',
    title: 'Failed to back up to cloud database',
    class: 'status-error',
    icon: `<svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
             <line x1="12" y1="12" x2="12" y2="15"></line>
             <line x1="12" y1="17" x2="12.01" y2="17"></line>
           </svg>`
  }
};

function _formatSaveTime(date) {
  if (!date) return 'Never';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function updateSaveStatusUI() {
  const barEl = document.getElementById('save-progress-bar');
  if (!barEl) return;

  // Determine ambient saving/progress state
  let currentCloudStatus = _cloudSaveStatus;
  if (typeof authState !== 'undefined' && authState.enabled && !authState.currentUser()) {
    currentCloudStatus = 'none';
  }

  // 1. Error state (takes priority)
  if (_localSaveStatus === 'error' || currentCloudStatus === 'error') {
    barEl.className = 'status-error';
  }
  // 2. Saving/Syncing state
  else if (_localSaveStatus === 'saving' || currentCloudStatus === 'saving') {
    barEl.className = 'status-saving';
  }
  // 3. Saved transition state
  else if (_localSaveStatus === 'saved' && (currentCloudStatus === 'saved' || currentCloudStatus === 'none')) {
    if (barEl.classList.contains('status-saving')) {
      barEl.className = 'status-saved';
    } else {
      barEl.className = '';
    }
  }
  // 4. Default / Idle / Unsaved state
  else {
    barEl.className = '';
  }

  // Update the status dot next to the project name
  const dotEl = document.getElementById('project-save-status-dot');
  if (dotEl) {
    if (_localSaveStatus === 'error' || currentCloudStatus === 'error') {
      dotEl.className = 'status-error';
      dotEl.setAttribute('title', 'Save error');
    } else if (_localSaveStatus === 'saving' || currentCloudStatus === 'saving') {
      dotEl.className = 'status-saving';
      dotEl.setAttribute('title', 'Saving changes...');
    } else if (_localSaveStatus === 'unsaved' || currentCloudStatus === 'unsaved' || _fileSaveStatus === 'unsaved') {
      dotEl.className = 'status-unsaved';
      dotEl.setAttribute('title', 'Unsaved changes');
    } else {
      dotEl.className = '';
      dotEl.setAttribute('title', 'All changes saved');
    }
  }

  // Update the tooltip on the project-meta-container so the user can inspect detailed status on hover
  const containerEl = document.getElementById('project-meta-container');
  if (containerEl) {
    const localTime = _formatSaveTime(_lastLocalSaveTime);
    const cloudTime = _lastCloudSaveTime ? _formatSaveTime(_lastCloudSaveTime) : 'Never';
    const fileTime = _lastFileSaveTime ? _formatSaveTime(_lastFileSaveTime) : 'Never';
    const localConfText = localMap[_localSaveStatus]?.text || 'Saved';
    const cloudConfText = cloudMap[currentCloudStatus]?.text || 'Local Only';
    const fileConfText = _fileSaveStatus === 'saved' ? 'Saved' : (_fileSaveStatus === 'unsaved' ? 'Out of Sync' : 'Not Saved');

    const title = `[Save & Sync Status]\n` +
                  `• Browser Auto-save: ${localConfText} (Last: ${localTime})\n` +
                  `• Cloud Sync: ${cloudConfText} (Last: ${cloudTime})\n` +
                  `• File Export: ${fileConfText} (Last: ${fileTime})\n\n` +
                  `Click to open project settings / Double-click to rename`;
    containerEl.setAttribute('title', title);
  }
}

function setLocalSaveStatus(status) {
  _localSaveStatus = status;
  if (status === 'saved') {
    _lastLocalSaveTime = new Date();
  }
  updateSaveStatusUI();
}

function setCloudSaveStatus(status) {
  _cloudSaveStatus = status;
  if (status === 'saved') {
    _lastCloudSaveTime = new Date();
  }
  updateSaveStatusUI();
}

function setSaveStatus(status) {
  setLocalSaveStatus(status);
}

function initializeCloudSaveStatus() {
  if (state.projectId && _isLocalUuid(state.projectId)) {
    setCloudSaveStatus('saved');
  } else {
    setCloudSaveStatus('none');
  }
}


async function writeAutosave() {
  try {
    setLocalSaveStatus('saving');
    const limit = state.savedHistoryLimit !== undefined ? state.savedHistoryLimit : 50;
    const capped = getCappedHistory(limit);
    await _idbPut(AUTOSAVE_KEY, {
      savedAt: Date.now(),
      state: buildStateSnapshot(),
      history: capped.history,
      historyIndex: capped.historyIndex
    });
    setLocalSaveStatus('saved');
  } catch (e) {
    console.warn('Auto-save failed:', e);
    setLocalSaveStatus('error');
  }
}

function scheduleAutosave() {
  if (_autosaveSuspended) return;
  if (_localSaveStatus !== 'saving') setLocalSaveStatus('unsaved');

  let currentCloudStatus = _cloudSaveStatus;
  if (typeof authState !== 'undefined' && authState.enabled && !authState.currentUser()) {
    currentCloudStatus = 'none';
  }
  if (currentCloudStatus !== 'none' && currentCloudStatus !== 'saving') {
    setCloudSaveStatus('unsaved');
  }

  if (_fileSaveStatus === 'saved') {
    _fileSaveStatus = 'unsaved';
    updateSaveStatusUI();
  }

  if (_autosaveTimer) clearTimeout(_autosaveTimer);
  const intervalSecs = state.autosaveInterval !== undefined ? state.autosaveInterval : 10;
  _autosaveTimer = setTimeout(writeAutosave, intervalSecs * 1000);
}

async function restoreAutosave() {
  try {
    const rec = await _idbGet(AUTOSAVE_KEY);
    if (rec && rec.state && Array.isArray(rec.state.canvases) && rec.state.canvases.length) {
      Object.assign(state, rec.state);
      if (!state.projectId) state.projectId = uid('proj_');
      // v0.16.8 migration — default jumped from 10 → 50. Bump projects
      // that were stuck on the old default (or never had the field).
      // User-customised values above 10 are preserved.
      if (state.savedHistoryLimit === undefined || state.savedHistoryLimit <= 10) {
        state.savedHistoryLimit = 50;
      }
      if (state.autosaveInterval === undefined) {
        state.autosaveInterval = 10;
      }
      if (state.zoomStep === undefined) {
        state.zoomStep = 0.1;
      }
      if (state.snapDistance === undefined) {
        state.snapDistance = 5;
      }
      if (state.showCanvasSizes === undefined) {
        state.showCanvasSizes = true;
      }
      if (state.canvasSpacing === undefined) {
        state.canvasSpacing = 60;
      }
      if (state.safezoneStandard === undefined) {
        state.safezoneStandard = 5;
      }
      if (state.safezoneNarrow === undefined) {
        state.safezoneNarrow = 8;
      }
      if (state.nudgeDefault === undefined) {
        state.nudgeDefault = 1;
      }
      if (state.nudgeShift === undefined) {
        state.nudgeShift = 10;
      }
      if (state.exportFormat === undefined) {
        state.exportFormat = 'png';
      }
      if (state.exportQuality === undefined) {
        state.exportQuality = 80;
      }
      if (state.subheadingAutoHide === undefined) {
        state.subheadingAutoHide = true;
      }
      if (state.defaultCricosCode === undefined) {
        state.defaultCricosCode = '00122A';
      }
      // Re-home legacy centre-anchored layouts onto the smaller board. If this
      // moved anything, the autosaved history snapshots still hold the old
      // off-board coords — drop them and re-baseline so undo can't jump back
      // into the void.
      const positionsMigrated = normalizeCanvasPositions();
      if (!positionsMigrated && rec.history && Array.isArray(rec.history) && rec.history.length > 0) {
        history.length = 0;
        history.push(...rec.history);
        historyIndex = rec.historyIndex !== undefined ? rec.historyIndex : history.length - 1;
      } else {
        history.length = 0;
        historyIndex = -1;
        pushHistory();
      }
      return true;
    }
  } catch (e) { console.warn('Auto-save restore failed:', e); }
  return false;
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    restoreSnapshot(history[historyIndex]);
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    restoreSnapshot(history[historyIndex]);
  }
}

function restoreSnapshot(snapStr) {
  _restoringHistory = true;
  try {
    const snap = JSON.parse(snapStr);
    state.canvases          = snap.canvases;
    state.activeCanvasId    = snap.activeCanvasId;
    state.selectedElementId = snap.selectedElementId;
    state.layerSelection    = snap.layerSelection || [];
    state.guides            = snap.guides         || [];
    state.linkGroups        = snap.linkGroups     || {};
    // Fields added in v0.16.8 — guard with `undefined` checks so older
    // snapshots (still in autosave from v0.16.7 and earlier) don't blank
    // out the live values.
    if (snap.frames        !== undefined) state.frames        = snap.frames;
    if (snap.activeFrameId !== undefined) state.activeFrameId = snap.activeFrameId;
    if (snap.dataMerge     !== undefined) state.dataMerge     = snap.dataMerge;
    if (snap.projectName   !== undefined) state.projectName   = snap.projectName;
    if (snap.validationSettings !== undefined) state.validationSettings = snap.validationSettings;
    state.editingElementId = null;
    render();
  } finally {
    _restoringHistory = false;
  }
}

pushHistory();

// ============================================================================
// Element Linking System Helpers & Operations
// ============================================================================

function areStylesAndNamesEqual(el1, el2) {
  if (el1.type !== el2.type) return false;
  return baseLayerLabel(el1) === baseLayerLabel(el2);
}

function getDefaultSync(el) {
  const cat = getElementCategory(el);
  const defaultSync = {};
  if (!cat) return defaultSync;

  defaultSync.customName = true;

  const isRoleAssigned = el.role && el.role !== 'misc';

  if (cat === 'text') {
    defaultSync.text = true;
    defaultSync.font = !isRoleAssigned;      // Unchecked by default for role-assigned (syncs justification/textAlign)
    defaultSync.fontSize = !isRoleAssigned;  // Unchecked by default for role-assigned
    defaultSync.color = true;
    defaultSync.background = true;
    defaultSync.opacity = true;
    defaultSync.inAnim = true;
    defaultSync.effect = true;
    defaultSync.visibility = true;
  } else if (cat === 'button') {
    defaultSync.text = true;
    defaultSync.textColor = true;
    defaultSync.font = !isRoleAssigned;      // Unchecked by default for role-assigned (syncs fontSize, textAlign, wrapText)
    defaultSync.fill = true;
    defaultSync.stroke = true;
    defaultSync.radius = true;
    defaultSync.transform = !isRoleAssigned; // Unchecked by default for role-assigned (syncs width, height)
    defaultSync.opacity = true;
    defaultSync.inAnim = true;
    defaultSync.effect = true;
    defaultSync.visibility = true;
  } else if (cat === 'image') {
    defaultSync.image = true;
    const isRmitLogo = el.role === 'rmit-logo' || (el.customName && el.customName.toLowerCase().includes('rmit') && el.customName.toLowerCase().includes('logo'));
    if (isRmitLogo) {
      defaultSync.variant = true;
    }
    defaultSync.transform = !isRoleAssigned; // Unchecked by default for role-assigned
    defaultSync.opacity = true;
    defaultSync.rotation = true;
    defaultSync.inAnim = true;
    defaultSync.effect = true;
    defaultSync.visibility = true;
  } else if (cat === 'shape') {
    defaultSync.fill = true;
    defaultSync.stroke = true;
    defaultSync.radius = true;
    defaultSync.transform = !isRoleAssigned;
    defaultSync.opacity = true;
    defaultSync.inAnim = true;
    defaultSync.effect = true;
    defaultSync.visibility = true;
  } else if (cat === 'line') {
    defaultSync.color = true;
    defaultSync.thickness = true;
    defaultSync.opacity = true;
    defaultSync.inAnim = true;
    defaultSync.effect = true;
    defaultSync.visibility = true;
  }
  return defaultSync;
}

async function autoLinkElements(forceSelectedOnly = false) {
  const chkSelectedOnly = document.getElementById('lnk-opt-selected-only');
  const selectedOnly = forceSelectedOnly || (chkSelectedOnly ? chkSelectedOnly.checked : false);

  let allowedTargets = null;
  if (selectedOnly) {
    const selectedCanvas = getActiveCanvas();
    if (!selectedCanvas || !state.layerSelection?.length) {
      await showAdflowAlert("No elements are currently selected. Select one or more elements to use 'Selected only' auto-linking.");
      return;
    }
    allowedTargets = state.layerSelection.map(id => {
      const el = selectedCanvas.elements.find(x => x.id === id);
      return el;
    }).filter(Boolean);
  }

  const allElements = [];
  state.canvases.forEach(canvas => {
    canvas.elements.forEach(el => {
      if (allowedTargets) {
        const matchesAllowed = allowedTargets.some(target => areStylesAndNamesEqual(el, target));
        if (matchesAllowed) {
          allElements.push(el);
        }
      } else {
        allElements.push(el);
      }
    });
  });

  const processedElementIds = new Set();
  let countLinked = 0;
  let countGroupsCreated = 0;

  for (let i = 0; i < allElements.length; i++) {
    const el1 = allElements[i];
    if (processedElementIds.has(el1.id)) continue;

    const set = [el1];
    for (let j = i + 1; j < allElements.length; j++) {
      const el2 = allElements[j];
      if (areStylesAndNamesEqual(el1, el2)) {
        set.push(el2);
      }
    }

    if (set.length > 1) {
      set.forEach(el => processedElementIds.add(el.id));

      let existingGid = null;
      for (let el of set) {
        if (el.linkGroupId && state.linkGroups?.[el.linkGroupId]) {
          existingGid = el.linkGroupId;
          break;
        }
      }

      let gid = existingGid;
      if (!gid) {
        const baseName = baseLayerLabel(el1);
        const name = baseName + " Group";
        const cat = getElementCategory(el1);
        gid = 'lg_' + uid();

        const defaultSync = getDefaultSync(el1);

        if (!state.linkGroups) state.linkGroups = {};
        state.linkGroups[gid] = {
          id: gid,
          name: name,
          category: cat,
          syncProperties: defaultSync
        };
        countGroupsCreated++;
      }

      set.forEach(el => {
        if (el.linkGroupId !== gid) {
          if (typeof dmMigrateSlotKey === 'function') {
            dmMigrateSlotKey(el, gid);
          }
          el.linkGroupId = gid;
          countLinked++;
        }
      });
    }
  }

  if (countLinked > 0) {
    pushHistory();
    render();
  } else {
    if (selectedOnly) {
      const selectedCanvas = getActiveCanvas();
      const selectedEls = selectedCanvas && state.layerSelection?.length
        ? state.layerSelection.map(id => selectedCanvas.elements.find(x => x.id === id)).filter(Boolean)
        : [];
      const allSelectedLinked = selectedEls.length > 0 && selectedEls.every(el => el.linkGroupId && state.linkGroups?.[el.linkGroupId]);
      if (allSelectedLinked) {
        await showAdflowAlert("The selected element is already linked, and no other matching elements were found to link.");
        return;
      }
    }

    const anyLinked = allElements.some(el => el.linkGroupId && state.linkGroups?.[el.linkGroupId]);
    if (anyLinked) {
      await showAdflowAlert("Matching elements are already linked, and no new matching elements were found.");
    } else {
      await showAdflowAlert("No matching elements with the same layer name and style were found.");
    }
  }
}

function getElementCategory(el) {
  if (!el) return null;
  if (el.type === 'text') return 'text';
  if (el.type === 'button') return 'button';
  if (el.type === 'image') return 'image';
  if (['rect', 'circle', 'pixel'].includes(el.type)) return 'shape';
  return el.type;
}

function applyLinkSync(sourceEl, targetEl, group) {
  const cat = group.category;
  const sync = group.syncProperties || {};

  if (sync.customName) {
    if (sourceEl.customName !== undefined) {
      const targetCanvas = state.canvases.find(c => c.elements.includes(targetEl));
      const existingNames = targetCanvas
        ? targetCanvas.elements
            .filter(e => e.id !== targetEl.id)
            .map(e => e.customName || baseLayerLabel(e))
        : [];
      targetEl.customName = uniqueName(sourceEl.customName, existingNames);
    } else {
      delete targetEl.customName;
    }
  }

  if (cat === 'text') {
    if (sync.text) targetEl.text = sourceEl.text;
    if (sync.font) {
      // Font family/weight/spacing/alignment — NOT fontSize (handled separately so a
      // group can sync typeface but keep per-canvas sizes, as auto-resize needs).
      const fontProps = ['fontFamily', 'weight', 'lineHeight', 'lineHeightAuto', 'letterSpacing', 'textAlign', 'verticalAlign'];
      const isBrand = (targetEl.role === 'rmit-logo' || targetEl.role === 'rfwn' || targetEl.role === 'cricos');
      fontProps.forEach(p => {
        if (isBrand && (p === 'textAlign' || p === 'verticalAlign')) {
          return;
        }
        if (sourceEl[p] !== undefined) targetEl[p] = sourceEl[p];
        else delete targetEl[p];
      });
    }
    // Backward-compat: groups created before fontSize was split have no fontSize key,
    // so it follows the font toggle (preserving old "font syncs size too" behavior).
    const syncFontSize = sync.fontSize !== undefined ? sync.fontSize : sync.font;
    if (syncFontSize) {
      if (sourceEl.fontSize !== undefined) targetEl.fontSize = sourceEl.fontSize;
      if (sourceEl.autoSize !== undefined) targetEl.autoSize = sourceEl.autoSize;
      else delete targetEl.autoSize;
      if (sourceEl.maxFontSize !== undefined) targetEl.maxFontSize = sourceEl.maxFontSize;
      else delete targetEl.maxFontSize;
    }
    if (sync.color) {
      if (sourceEl.color !== undefined) targetEl.color = sourceEl.color;
      else delete targetEl.color;
    }
    const syncBackground = sync.background !== undefined ? sync.background : sync.color;
    if (syncBackground) {
      const bgProps = ['bg', 'hasBg', 'animateBg', 'bgPadL', 'bgPadV', 'bgCoverage', 'bgOpacity'];
      bgProps.forEach(p => {
        if (sourceEl[p] !== undefined) targetEl[p] = sourceEl[p];
        else delete targetEl[p];
      });
    }
  } else if (cat === 'button') {
    if (sync.text) targetEl.text = sourceEl.text;
    if (sync.textColor) {
      if (sourceEl.color !== undefined) targetEl.color = sourceEl.color;
      else delete targetEl.color;
    }
    if (sync.font) {
      const fontProps = ['fontFamily', 'weight', 'fontSize', 'autoSize', 'maxFontSize', 'letterSpacing', 'paddingLR', 'paddingTB', 'textAlign', 'verticalAlign', 'wrapText', 'wrapMinSize'];
      fontProps.forEach(p => {
        if (sourceEl[p] !== undefined) targetEl[p] = sourceEl[p];
        else delete targetEl[p];
      });
      if (targetEl.autoSize) {
        targetEl.autoHug = false;
      }
    }
    if (sync.fill) {
      if (sourceEl.bg !== undefined) targetEl.bg = sourceEl.bg;
      else delete targetEl.bg;
    }
    if (sync.stroke) {
      const strokeProps = ['strokeColor', 'strokeWidth', 'strokeOpacity', 'strokeDash', 'strokeGap'];
      strokeProps.forEach(p => {
        if (sourceEl[p] !== undefined) targetEl[p] = sourceEl[p];
        else delete targetEl[p];
      });
    }
    if (sync.radius) {
      if (sourceEl.radius !== undefined) targetEl.radius = sourceEl.radius;
      else delete targetEl.radius;
    }
    if (sync.transform) {
      targetEl.width = sourceEl.width;
      targetEl.height = sourceEl.height;
      if (sourceEl.lockRatio !== undefined) targetEl.lockRatio = sourceEl.lockRatio;
      else delete targetEl.lockRatio;
      if (sourceEl.aspectRatio !== undefined) targetEl.aspectRatio = sourceEl.aspectRatio;
      else delete targetEl.aspectRatio;
      if (sourceEl.autoHug !== undefined) targetEl.autoHug = sourceEl.autoHug;
      else delete targetEl.autoHug;
    }
    if (targetEl.type === 'button' && targetEl.autoHug) {
      targetEl.width = measureButtonWidth(targetEl);
    }
  } else if (cat === 'image') {
    if (sync.image) {
      targetEl.assetId = sourceEl.assetId;
      if (sourceEl.objectFit !== undefined) targetEl.objectFit = sourceEl.objectFit;
      else delete targetEl.objectFit;
    }
    if (sync.variant) {
      targetEl.assetId = sourceEl.assetId;
      targetEl.customName = sourceEl.customName;
      if (sourceEl.name !== undefined) targetEl.name = sourceEl.name;
    }
    if (sync.radius) {
      if (sourceEl.radius !== undefined) targetEl.radius = sourceEl.radius;
      else delete targetEl.radius;
    }
    if (sync.transform) {
      targetEl.width = sourceEl.width;
      targetEl.height = sourceEl.height;
      if (sourceEl.lockRatio !== undefined) targetEl.lockRatio = sourceEl.lockRatio;
      else delete targetEl.lockRatio;
      if (sourceEl.aspectRatio !== undefined) targetEl.aspectRatio = sourceEl.aspectRatio;
      else delete targetEl.aspectRatio;
    }
    if (sync.rotation) {
      if (sourceEl.rotation !== undefined) targetEl.rotation = sourceEl.rotation;
      else delete targetEl.rotation;
    }
  } else if (cat === 'shape') {
    if (sync.fill) {
      if (sourceEl.color !== undefined) targetEl.color = sourceEl.color;
      else delete targetEl.color;
    }
    if (sync.stroke) {
      const strokeProps = ['strokeColor', 'strokeWidth', 'strokeOpacity', 'strokeDash', 'strokeGap'];
      strokeProps.forEach(p => {
        if (sourceEl[p] !== undefined) targetEl[p] = sourceEl[p];
        else delete targetEl[p];
      });
    }
    if (sync.radius) {
      if (sourceEl.radius !== undefined) targetEl.radius = sourceEl.radius;
      else delete targetEl.radius;
    }
    if (sync.transform) {
      targetEl.width = sourceEl.width;
      targetEl.height = sourceEl.height;
      if (sourceEl.lockRatio !== undefined) targetEl.lockRatio = sourceEl.lockRatio;
      else delete targetEl.lockRatio;
      if (sourceEl.aspectRatio !== undefined) targetEl.aspectRatio = sourceEl.aspectRatio;
      else delete targetEl.aspectRatio;
    }
  } else if (cat === 'line') {
    if (sync.color) {
      if (sourceEl.color !== undefined) targetEl.color = sourceEl.color;
      else delete targetEl.color;
    }
    if (sync.thickness) {
      if (sourceEl.height !== undefined) targetEl.height = sourceEl.height;
    }
  }

  if (sync.opacity) {
    if (sourceEl.opacity !== undefined) targetEl.opacity = sourceEl.opacity;
    else delete targetEl.opacity;
  }
  if (sync.visibility) {
    if (sourceEl.hidden !== undefined) targetEl.hidden = sourceEl.hidden;
    else delete targetEl.hidden;
  }
  if (sync.inAnim) {
    const inAnimProps = ['animType', 'animDuration', 'animDelay', 'animFade', 'animFadeLetters', 'animFadeBg', 'zoomFrom', 'animBounce', 'animDirection', 'animDistance', 'animRotateOffset', 'animAngle', 'animateBg', 'bgOffset', 'zoomAnchor', 'animStaggerText'];
    inAnimProps.forEach(p => {
      if (sourceEl[p] !== undefined) targetEl[p] = sourceEl[p];
      else delete targetEl[p];
    });
  }
  if (sync.effect) {
    const effectProps = ['effectType', 'effDuration', 'effDelay', 'panDist', 'panDir', 'effEase', 'effOnce', 'effSpeed', 'zoomTarget', 'spinTarget', 'spinRepeat', 'panFromX', 'panFromY', 'panRotate', 'panFade', 'panMidX', 'panMidY', 'pulseScale', 'heartbeatScale', 'floatRange', 'floatDirection'];
    effectProps.forEach(p => {
      if (sourceEl[p] !== undefined) targetEl[p] = sourceEl[p];
      else delete targetEl[p];
    });
  }
}

function cleanupLinkGroups() {
  if (!state.linkGroups) return;
  const activeIds = new Set();
  state.canvases.forEach(c => {
    c.elements.forEach(el => {
      if (el.linkGroupId) activeIds.add(el.linkGroupId);
    });
  });
  Object.keys(state.linkGroups).forEach(gid => {
    if (!activeIds.has(gid)) {
      delete state.linkGroups[gid];
    }
  });
}

// Canvas bg, optionally scoped per-frame.
//  • If `c.bgByFrame[frameId]` exists, use it (per-frame mode).
//  • Otherwise fall back to `c.bgColor` (the canvas-level value).
// `state.bgPerFrame` / `state.bgPerCanvas` are UI flags that control
// the *write* scope only; reads always honour any override present.
function getCanvasBg(c, frameId) {
  if (!c) return '#000';
  if (frameId != null && c.bgByFrame && c.bgByFrame[frameId] !== undefined) {
    return c.bgByFrame[frameId];
  }
  return c.bgColor;
}

function createAndLinkGroup(name) {
  const c = getActiveCanvas();
  if (!c || !state.layerSelection?.length) return;
  const activeEl = getSelectedElement() || (state.layerSelection?.length > 0 ? c.elements.find(x => x.id === state.layerSelection[0]) : null);
  const cat = getElementCategory(activeEl);
  if (!cat) return;

  const gid = 'lg_' + uid();
  const defaultSync = getDefaultSync(activeEl);

  if (!state.linkGroups) state.linkGroups = {};
  state.linkGroups[gid] = {
    id: gid,
    name: name,
    category: cat,
    syncProperties: defaultSync
  };

  // Assign selected elements to this group
  c.elements.forEach(el => {
    if (state.layerSelection.includes(el.id)) {
      if (typeof dmMigrateSlotKey === 'function') {
        dmMigrateSlotKey(el, gid);
      }
      el.linkGroupId = gid;
    }
  });

  pushHistory();
  render();
}

function linkSelectionToGroup(gid) {
  const c = getActiveCanvas();
  if (!c || !state.layerSelection?.length) return;

  c.elements.forEach(el => {
    if (state.layerSelection.includes(el.id)) {
      if (typeof dmMigrateSlotKey === 'function') {
        dmMigrateSlotKey(el, gid);
      }
      el.linkGroupId = gid;
    }
  });

  pushHistory();
  render();
}

function removeSelectionFromGroup() {
  const c = getActiveCanvas();
  if (!c || !state.layerSelection?.length) return;

  c.elements.forEach(el => {
    if (state.layerSelection.includes(el.id)) {
      delete el.linkGroupId;
    }
  });

  cleanupLinkGroups();
  pushHistory();
  render();
}

function removeGroupEntirely(gid) {
  state.canvases.forEach(c => {
    c.elements.forEach(el => {
      if (el.linkGroupId === gid) {
        delete el.linkGroupId;
      }
    });
  });

  if (state.linkGroups && state.linkGroups[gid]) {
    delete state.linkGroups[gid];
  }

  pushHistory();
  render();
}

function autoAddAndLink(srcEl, skipNotify = false) {
  if (!srcEl) return;
  const name = baseLayerLabel(srcEl);
  const cat = getElementCategory(srcEl);
  if (!cat) return;

  let gid = srcEl.linkGroupId;
  let isNewGroup = false;

  if (!gid) {
    gid = 'lg_' + uid();
    isNewGroup = true;
    
    const defaultSync = getDefaultSync(srcEl);

    if (!state.linkGroups) state.linkGroups = {};
    state.linkGroups[gid] = {
      id: gid,
      name: name + " Group",
      category: cat,
      syncProperties: defaultSync
    };
    
    if (typeof dmMigrateSlotKey === 'function') {
      dmMigrateSlotKey(srcEl, gid);
    }
    srcEl.linkGroupId = gid;
  }

  let countCloned = 0;
  let countLinkedExisting = 0;

  state.canvases.forEach(c => {
    // Find matching element on canvas c
    const match = c.elements.find(el => el.type === srcEl.type && baseLayerLabel(el) === name);
    if (match) {
      if (match.linkGroupId !== gid) {
        match.linkGroupId = gid;
        countLinkedExisting++;
      }
    } else {
      // Clone the element to this canvas
      const clone = JSON.parse(JSON.stringify(srcEl));
      clone.id = uid();
      if (clone.persistent === false) {
        clone.frameId = state.activeFrameId;
      }
      clone.linkGroupId = gid;
      
      // Check Canvas Sync options to decide what settings to maintain on duplication
      const syncVisibility = localStorage.getItem('sync-layers-visibility') !== 'false';
      const syncLock = localStorage.getItem('sync-layers-lock') !== 'false';
      const syncPersistent = localStorage.getItem('sync-layers-persistent') !== 'false';
      
      if (!syncLock) {
        clone.locked = false;
      }
      if (!syncVisibility) {
        clone.hidden = false;
      }
      if (!syncPersistent) {
        delete clone.role;
      }
      
      // Center the element no matter where the original element is
      const cloneW = clone.width || 0;
      const cloneH = clone.height || 0;
      clone.x = Math.round((c.width - cloneW) / 2);
      clone.y = Math.round((c.height - cloneH) / 2);

      insertAtGroupEnd(c.elements, clone);
      countCloned++;
    }
  });

  // Now push changes to propagate the source properties to all members of the group
  pushGroupChangesForId(gid, skipNotify);
}

function pushGroupChanges() {
  const sourceEl = getSelectedElement() || (state.layerSelection?.length > 0 ? getActiveCanvas()?.elements.find(x => x.id === state.layerSelection[0]) : null);
  if (!sourceEl || !sourceEl.linkGroupId) return;
  const gid = sourceEl.linkGroupId;
  const group = state.linkGroups[gid];
  if (!group) return;

  state.canvases.forEach(c => {
    c.elements.forEach(targetEl => {
      if (targetEl.linkGroupId === gid && targetEl.id !== sourceEl.id) {
        applyLinkSync(sourceEl, targetEl, group);
      }
    });
  });

  pushHistory();
  render();
  showCanvasNotification(`Changes pushed to group "${group.name}"`);
}


function deleteGroupAndElements(gid) {
  if (!gid || !state.linkGroups[gid]) return;
  const gName = state.linkGroups[gid].name;
  if (!confirm(`Are you sure you want to delete the link group "${gName}" AND delete all elements belonging to it across all canvases?`)) {
    return;
  }
  delete state.linkGroups[gid];
  state.canvases.forEach(cv => {
    cv.elements = cv.elements.filter(el => el.linkGroupId !== gid);
  });
  state.layerSelection = [];
  state.selectedElementId = null;
  pushHistory();
  render();
}


function pushGroupChangesForId(gid, skipNotify = false) {
  const group = state.linkGroups[gid];
  if (!group) return;
  let elementsInGroup = [];
  state.canvases.forEach(c => {
    c.elements.forEach(el => {
      if (el.linkGroupId === gid) {
        elementsInGroup.push(el);
      }
    });
  });
  if (elementsInGroup.length < 2) return;

  // Find a source element in the active canvas if possible, otherwise default to elementsInGroup[0]
  const activeCanvas = getActiveCanvas();
  let sourceEl = null;
  if (activeCanvas) {
    sourceEl = elementsInGroup.find(el => {
      const isSelected = state.layerSelection && state.layerSelection.includes(el.id);
      return isSelected && activeCanvas.elements.includes(el);
    });
    if (!sourceEl) {
      sourceEl = elementsInGroup.find(el => activeCanvas.elements.includes(el));
    }
  }
  if (!sourceEl) {
    sourceEl = elementsInGroup[0];
  }

  state.canvases.forEach(c => {
    c.elements.forEach(targetEl => {
      if (targetEl.linkGroupId === gid && targetEl.id !== sourceEl.id) {
        applyLinkSync(sourceEl, targetEl, group);
      }
    });
  });
  if (!skipNotify) {
    pushHistory();
    render();
    showCanvasNotification(`Changes pushed to group "${group.name}"`);
  }
}

function toggleGroupVisibility(gid) {
  let allHidden = true;
  let hasElements = false;
  state.canvases.forEach(cv => {
    cv.elements.forEach(el => {
      if (el.linkGroupId === gid) {
        hasElements = true;
        if (!el.hidden) allHidden = false;
      }
    });
  });

  if (!hasElements) return;

  const targetHiddenState = !allHidden;
  state.canvases.forEach(cv => {
    cv.elements.forEach(el => {
      if (el.linkGroupId === gid) {
        el.hidden = targetHiddenState;
      }
    });
  });

  pushHistory();
  render();
}

function selectGroupElements(gid) {
  const activeCanvas = getActiveCanvas();
  let members = activeCanvas ? activeCanvas.elements.filter(el => el.linkGroupId === gid) : [];

  if (members.length === 0) {
    for (let c of state.canvases) {
      const cvMembers = c.elements.filter(el => el.linkGroupId === gid);
      if (cvMembers.length > 0) {
        state.activeCanvasId = c.id;
        members = cvMembers;
        break;
      }
    }
  }

  if (members.length > 0) {
    state.layerSelection = members.map(el => el.id);
    state.selectedElementId = members.length === 1 ? members[0].id : null;
    render();
  }
}

// ============================================================================
// Accessors
// ============================================================================
const getActiveCanvas = () => state.canvases.find(c => c.id === state.activeCanvasId);
const getSelectedElement = () => {
  const c = getActiveCanvas();
  return c ? c.elements.find(e => e.id === state.selectedElementId) : null;
};

// The link group whose members should be highlighted (visual only). Active when the
// current selection is entirely within one link group — e.g. a single linked child
// element, or all members on one canvas after clicking a group row. Recomputed once
// per render and cached so elementNode() can read it cheaply.
let _highlightGid = null;
function computeHighlightLinkGroupId() {
  if (!state.linkGroups) return null;
  const c = getActiveCanvas();
  if (!c || !state.layerSelection || !state.layerSelection.length) return null;
  const sel = c.elements.filter(e => state.layerSelection.includes(e.id));
  const gids = new Set(sel.map(e => e.linkGroupId).filter(Boolean));
  if (gids.size !== 1) return null;
  const gid = [...gids][0];
  return state.linkGroups[gid] ? gid : null;
}

// ============================================================================
// Render
// ============================================================================
const workspaceEl = document.getElementById('workspace-canvas');
const canvasArea = document.getElementById('canvas-area');
const layersEl = document.getElementById('layers');
const linkControlEl = document.getElementById('link-control');
const propsEl = document.getElementById('props');
const canvasesListEl = document.getElementById('canvases-list');


// Runtime per-line BG measurement: reads the per-char spans inside `wrapper`,
// groups them by offsetTop into "lines", and inserts an absolute-positioned bg
// overlay per line with a staggered scaleX animation that tracks each line's
// share of the total typing duration. Used by both the editor's hover preview
// and the exported HTML (serialized via .toString() in the export template).
function setupTextLineBgs(wrapper) {
  if (wrapper.dataset.bgInited) return;
  if (wrapper.offsetWidth === 0) return;
  wrapper.dataset.bgInited = '1';
  var charSpans = Array.prototype.filter.call(wrapper.children, function (c) { return c.tagName === 'SPAN'; });
  if (!charSpans.length) return;
  var bgColor = wrapper.dataset.bgColor;
  var lr = parseFloat(wrapper.dataset.bgPadL) || 0;
  var tb = parseFloat(wrapper.dataset.bgPadV) || 0;
  var cov = (parseFloat(wrapper.dataset.bgCov) || 100) / 100;
  var baseDelay = parseFloat(wrapper.dataset.bgDelay) || 0;
  var totalDuration = parseFloat(wrapper.dataset.bgDuration) || 1;
  var totalChars = charSpans.length;
  var lines = [];
  var cur = null;
  charSpans.forEach(function (s, i) {
    var t = Math.round(s.offsetTop);
    if (!cur || Math.abs(cur.top - t) > 1) {
      cur = { top: t, spans: [], firstIdx: i, lastIdx: i };
      lines.push(cur);
    } else {
      cur.lastIdx = i;
    }
    cur.spans.push(s);
  });
  lines.forEach(function (line) {
    var first = line.spans[0];
    var last = line.spans[line.spans.length - 1];
    var lineLeft = first.offsetLeft;
    var lineTop = first.offsetTop;
    var lineWidth = (last.offsetLeft + last.offsetWidth) - lineLeft;
    var lineHeight = first.offsetHeight;
    var startFrac = line.firstIdx / totalChars;
    var endFrac = (line.lastIdx + 1) / totalChars;
    var lineDur = totalDuration * (endFrac - startFrac);
    var lineDelay = baseDelay + totalDuration * startFrac;
    var bg = document.createElement('div');
    bg.className = 'line-bg-overlay';
    bg.style.cssText = 'position:absolute;left:' + (lineLeft - lr) + 'px;top:' + (lineTop - tb) + 'px;width:' + ((lineWidth + 2 * lr) * cov) + 'px;height:' + (lineHeight + 2 * tb) + 'px;background:' + bgColor + ';transform-origin:left center;transform:scaleX(0);z-index:-1;pointer-events:none;animation:anim-bg-grow ' + lineDur + 's linear ' + lineDelay + 's both;';
    wrapper.insertBefore(bg, wrapper.firstChild);
  });
}

// #RRGGBB[AA] → "rgba(r,g,b,a)". Used by the text BG to bake bgOpacity into a single
// color so we can apply it via background-image: linear-gradient (the only way to get
// an animatable background-size with box-decoration-break: clone).
function hexToRgba(hex, alpha) {
  let h = String(hex || '#000000').replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(h.substr(0, 2), 16);
  const g = parseInt(h.substr(2, 2), 16);
  const b = parseInt(h.substr(4, 2), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function parseColorToRGB(colorStr) {
  if (!colorStr) return null;
  let str = String(colorStr).trim().toLowerCase();
  if (str.startsWith('#')) {
    let h = str.substring(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return [r, g, b];
    }
  } else if (str.startsWith('rgb')) {
    const m = str.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) {
      return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
    }
  }
  return null;
}

function getColorDistance(rgb1, rgb2) {
  if (!rgb1 || !rgb2) return Infinity;
  const dr = rgb1[0] - rgb2[0];
  const dg = rgb1[1] - rgb2[1];
  const db = rgb1[2] - rgb2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getLuminance(r, g, b) {
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(rgb1, rgb2) {
  const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const getWarningIcon = (color, size = 12) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; display: inline-block;">
  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
  <line x1="12" y1="9" x2="12" y2="13"/>
  <line x1="12" y1="17" x2="12.01" y2="17"/>
</svg>`;

const getCheckIcon = (color, size = 12) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; display: inline-block;">
  <polyline points="20 6 9 17 4 12"/>
</svg>`;

function runAuditChecks(c) {
  if (!c) return;
  const a11yWarnings = [];
  const brandWarnings = [];
  const settings = state.validationSettings || {};

  // 1. Accessibility Checks
  // A. Tiny Text Legibility (textSize)
  if (settings.textSize !== false) {
    c.elements.forEach(el => {
      if (el.type === 'text') {
        const computedSize = el.autoSize && typeof calculateAutoSize === 'function'
          ? calculateAutoSize(el, el.text)
          : (el.fontSize || 14);
        if (computedSize < 5) {
          a11yWarnings.push({
            type: 'text-size',
            layerId: el.id,
            message: `Text layer '${el.customName || el.text}' is too small (${computedSize}px). Minimum readable font size is 5px.`
          });
        }
      }
    });
  }

  // B. Color Contrast (contrast)
  if (settings.contrast !== false) {
    c.elements.forEach(el => {
      if (el.type === 'text') {
        const textRGB = parseColorToRGB(el.color || '#ffffff');
        const bgRGB = parseColorToRGB(el.hasBg ? (el.bg || '#000000') : (c.bgColor || state.defaultBg || '#0f172a'));
        if (textRGB && bgRGB) {
          const ratio = getContrastRatio(textRGB, bgRGB);
          const computedSize = el.autoSize && typeof calculateAutoSize === 'function'
            ? calculateAutoSize(el, el.text)
            : (el.fontSize || 14);
          const requiredRatio = computedSize >= 18 ? 3.0 : 4.5;
          if (ratio < requiredRatio) {
            a11yWarnings.push({
              type: 'contrast',
              layerId: el.id,
              message: `Text layer '${el.customName || el.text}' has low contrast (${ratio.toFixed(1)}:1). WCAG AA requires ${requiredRatio.toFixed(1)}:1 (${computedSize >= 18 ? 'large' : 'normal'} text).`
            });
          }
        }
      } else if (el.type === 'button') {
        const textRGB = parseColorToRGB(el.color || '#ffffff');
        const bgRGB = parseColorToRGB(el.bg || '#7c5cff');
        if (textRGB && bgRGB) {
          const ratio = getContrastRatio(textRGB, bgRGB);
          const requiredRatio = (el.fontSize || 14) >= 18 ? 3.0 : 4.5;
          if (ratio < requiredRatio) {
            a11yWarnings.push({
              type: 'contrast',
              layerId: el.id,
              message: `Button '${el.customName || el.text}' has low contrast (${ratio.toFixed(1)}:1). WCAG AA requires ${requiredRatio.toFixed(1)}:1.`
            });
          }
        }
      }
    });
  }

  // C. Timing & Animation (transitionTiming)
  if (settings.transitionTiming !== false) {
    state.frames.forEach((f, idx) => {
      const trans = f.transition || 'none';
      const dur = f.transitionDuration !== undefined ? f.transitionDuration : 0.5;
      if (trans !== 'none' && dur < 0.2) {
        a11yWarnings.push({
          type: 'transition-duration',
          message: `Frame ${idx + 1} transition duration is too fast (${dur}s). Smooth transitions should be at least 0.2s.`
        });
      }
      const frameDur = f.duration !== undefined ? f.duration : 2.0;
      if (frameDur < 1.0) {
        a11yWarnings.push({
          type: 'frame-duration',
          message: `Frame ${idx + 1} duration is very short (${frameDur}s). Fast-cycling screens can cause reading difficulties and flashing risks.`
        });
      }
    });
  }

  // Infinite looping motion (infiniteMotion)
  if (settings.infiniteMotion !== false) {
    c.elements.forEach(el => {
      if (el.effectType && el.effectType !== 'none' && el.effOnce === false) {
        a11yWarnings.push({
          type: 'infinite-motion',
          layerId: el.id,
          message: `Layer '${el.customName || el.text || baseLayerLabel(el)}' has an infinite loop animation. Consider selecting 'Perform once' to avoid distracting motion.`
        });
      }
    });
  }

  // Touch Target Size and Missing Alt Text checks removed

  // 2. Branding Compliance Checks
  // A. CRICOS Compliance (cricos)
  if (settings.cricos !== false) {
    let hasCricosCode = false;
    c.elements.forEach(el => {
      if (el.type === 'text') {
        const text = (el.text || '').toLowerCase();
        if (text.includes('00122a')) {
          hasCricosCode = true;
        }
      }
    });
    if (!hasCricosCode) {
      brandWarnings.push({
        type: 'cricos',
        message: `RMIT CRICOS provider code '00122A' is missing from the canvas text. All RMIT University marketing materials must display the CRICOS code.`
      });
    }
  }

  // B. RMIT Logo (logo)
  if (settings.logo !== false) {
    let hasLogo = false;
    c.elements.forEach(el => {
      if (el.role === 'rmit-logo') {
        hasLogo = true;
      }
    });
    if (!hasLogo) {
      brandWarnings.push({
        type: 'logo',
        message: `RMIT Logo layer is missing from the canvas. Brand guidelines require the RMIT logo to be present.`
      });
    }
  }

  // C. Brand Colors check (brandColors)
  if (settings.brandColors !== false) {
    const brandRedRGB = [230, 30, 42]; // #E61E2A
    const brandNavyRGB = [0, 0, 84];  // #000054
    const threshold = 20;

    const checkColorField = (rgbVal, hexStr, fieldName, layerName, layerId) => {
      if (!rgbVal) return;
      const dRed = getColorDistance(rgbVal, brandRedRGB);
      const dNavy = getColorDistance(rgbVal, brandNavyRGB);

      if (dRed > 0 && dRed <= threshold) {
        brandWarnings.push({
          type: 'color',
          layerId: layerId,
          message: `Color ${hexStr} in '${layerName}' (${fieldName}) is in proximity of RMIT Red, please use exact brand color (#E61E2A).`
        });
      } else if (dNavy > 0 && dNavy <= threshold) {
        brandWarnings.push({
          type: 'color',
          layerId: layerId,
          message: `Color ${hexStr} in '${layerName}' (${fieldName}) is in proximity of RMIT Navy, please use exact brand color (#000054).`
        });
      }
    };

    // Canvas bg
    const canvasBgRGB = parseColorToRGB(c.bgColor || state.defaultBg || '#0f172a');
    checkColorField(canvasBgRGB, c.bgColor || state.defaultBg || '#0f172a', 'Canvas Background', 'Canvas', null);

    // Elements colors
    c.elements.forEach(el => {
      const name = el.customName || el.text || baseLayerLabel(el);
      if (el.color) {
        const rgb = parseColorToRGB(el.color);
        checkColorField(rgb, el.color, el.type === 'button' ? 'Text Color' : 'Fill Color', name, el.id);
      }
      if (el.bg) {
        if (el.type === 'button' || (el.type === 'text' && el.hasBg)) {
          const rgb = parseColorToRGB(el.bg);
          checkColorField(rgb, el.bg, 'Background Color', name, el.id);
        }
      }
      if (el.strokeWidth > 0 && el.strokeColor) {
        const rgb = parseColorToRGB(el.strokeColor);
        checkColorField(rgb, el.strokeColor, 'Stroke Color', name, el.id);
      }
    });
  }

  // D. Brand Fonts check (brandFonts)
  if (settings.brandFonts !== false) {
    c.elements.forEach(el => {
      if (el.type === 'text' || el.type === 'button') {
        const font = el.fontFamily || 'Arial';
        const isMuseo = font.toLowerCase() === 'museo';
        const isHelvetica = font.toLowerCase().includes('helvetica') || font.toLowerCase().includes('helvatica');

        if (!isMuseo && !isHelvetica) {
          brandWarnings.push({
            type: 'font',
            layerId: el.id,
            message: `Layer '${el.customName || el.text || baseLayerLabel(el)}' uses font '${font}'. Brand guidelines restrict typography to Museo and Helvetica.`
          });
        }
      }
    });
  }

  c._valA11y = a11yWarnings;
  c._valBrand = brandWarnings;
}

// Stroke for rect/circle/button. Drawn as an SVG overlay sized to the element box.
// Path is inset by stroke-width/2 so the stroke sits fully inside the element bounds
// (SVG strokes paint centered on the path by default). Returns either an SVGElement
// (for editor DOM) or an HTML string (for the exported markup).
function strokeOverlayHTML(el) {
  const sw = el.strokeWidth !== undefined ? el.strokeWidth : 0;
  if (sw <= 0) return '';
  const W = el.width;
  const H = el.height;
  const opa = (el.strokeOpacity !== undefined ? el.strokeOpacity : 100) / 100;
  const color = hexToRgba(el.strokeColor || '#ffffff', opa);
  const dash = Number(el.strokeDash) || 0;
  const gap = Number(el.strokeGap) || 0;
  const dashAttr = (dash > 0 && gap > 0) ? ` stroke-dasharray="${dash},${gap}"` : '';
  let shape;
  if (el.type === 'circle') {
    shape = `<ellipse cx="${W / 2}" cy="${H / 2}" rx="${Math.max(0, W / 2 - sw / 2)}" ry="${Math.max(0, H / 2 - sw / 2)}" fill="none" stroke="${color}" stroke-width="${sw}"${dashAttr} />`;
  } else if (el.type === 'pixel') {
    return `<svg width="${W}" height="${H}" viewBox="0 0 578.52 556.76" preserveAspectRatio="none" style="position:absolute;inset:0;pointer-events:none;overflow:visible;"><path d="M290.78,0h-74.15v60.23h-123.75v125.78H0v184.74h92.88v125.78h123.5v60.23h65.55c152.85,0,287.74-123.5,287.74-277.62S444.14,0,290.78,0" fill="none" stroke="${color}" stroke-width="${sw}"${dashAttr} vector-effect="non-scaling-stroke"/></svg>`;
  } else {
    const r = Math.max(0, (el.radius || 0) - sw / 2);
    shape = `<rect x="${sw / 2}" y="${sw / 2}" width="${Math.max(0, W - sw)}" height="${Math.max(0, H - sw)}" rx="${r}" ry="${r}" fill="none" stroke="${color}" stroke-width="${sw}"${dashAttr} />`;
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0;pointer-events:none;overflow:visible;">${shape}</svg>`;
}

function strokeOverlayNode(el) {
  const html = strokeOverlayHTML(el);
  if (!html) return null;
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  return wrap.firstChild;
}

function applyColorToText(node, colorVal) {
  if (!colorVal) return;
  if (colorVal.includes('gradient')) {
    node.style.background = colorVal;
    node.style.webkitBackgroundClip = 'text';
    node.style.webkitTextFillColor = 'transparent';
    node.style.color = 'transparent';
  } else {
    node.style.background = 'none';
    node.style.webkitBackgroundClip = 'initial';
    node.style.webkitTextFillColor = 'initial';
    node.style.color = colorVal;
  }
}

// Swap the Adflow wordmark SVG based on theme. Light-background themes
// use the dedicated `Adflow_lighttheme.svg` so the wordmark reads against
// a light background; dark themes use `Adflow_logo.svg`. Walks every
// `<img data-adflow-logo>` in the DOM — the splash logo, the top-bar
// logo, the size-overlay logo, and the docs-modal welcome image all have
// this attribute. Add a new light theme by extending LIGHT_BG_THEMES below.
const LIGHT_BG_THEMES = new Set(['light', 'rmit', 'nordic-light', 'amber-light', 'sage-light']);
function syncAdflowLogos() {
  const isLight = LIGHT_BG_THEMES.has(state.theme);
  const src = isLight
    ? 'data/Elements/Adflow_lighttheme.svg'
    : 'data/Elements/Adflow_logo.svg';
  document.querySelectorAll('img[data-adflow-logo]').forEach(img => {
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
  });
}

function render(skipProps = false) {
  if (state.isPreviewMode || state.singlePreviewId) {
    if (state.activeTool !== 'select') {
      setActiveTool('select');
    }
    if (state.outlineMode) {
      state.outlineMode = false;
    }
  }
  if (state.canvases) {
    state.canvases.forEach(sanitizeMasks);
    state.canvases.forEach(runAuditChecks);
  }
  // Lazy role auto-assignment — fills el.role on any element missing it.
  // Short-circuits per-element when role is already set, so the cost is
  // a single ID-existence check after the first run.
  ensureRolesAssignedAll();
  if (state.commitRenderTimer) {
    clearTimeout(state.commitRenderTimer);
    state.commitRenderTimer = null;
  }
  _highlightGid = computeHighlightLinkGroupId();
  // Live-link mode propagation
  if (state.layerSelection && state.layerSelection.length > 0) {
    const activeCanvas = getActiveCanvas();
    if (activeCanvas) {
      state.layerSelection.forEach(id => {
        const el = activeCanvas.elements.find(x => x.id === id);
        if (el && el.linkGroupId) {
          const group = state.linkGroups?.[el.linkGroupId];
          if (group && group.liveLink) {
            state.canvases.forEach(c => {
              c.elements.forEach(targetEl => {
                if (targetEl.linkGroupId === el.linkGroupId && targetEl.id !== el.id) {
                  applyLinkSync(el, targetEl, group);
                }
              });
            });
          }
        }
      });
    }
  }

  document.querySelector('.app').classList.toggle('preview-lock', !!(state.isPreviewMode || state.singlePreviewId));

  const isolationOutline = document.getElementById('workspace-isolation-outline');
  if (isolationOutline) {
    isolationOutline.style.display = state.isolatedGroupId ? 'block' : 'none';
  }

  // Inject split and zoom animation keyframes for active canvas elements
  const activeCanvas = getActiveCanvas();
  if (activeCanvas) {
    let dynamicStyles = '';
    activeCanvas.elements.forEach(el => {
      const animType = el.animType || 'none';
      if (animType === 'split') {
        const fromPoly = getSplitClipPath(el.animAngle || 0);
        const fadeFrom = el.animFade !== false ? 'opacity: 0;' : '';
        const fadeTo = el.animFade !== false ? 'opacity: 1;' : '';
        dynamicStyles += `
@keyframes anim-split-${el.id} {
  from { clip-path: ${fromPoly}; ${fadeFrom} }
  to { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); ${fadeTo} }
}`;
      } else if (animType === 'zoom' || animType === 'zoom-in' || animType === 'pop-in') {
        const tempEl = { ...el };
        if (animType === 'pop-in') {
          tempEl.zoomFrom = 80;
          tempEl.animFade = true;
        } else if (animType === 'zoom-in') {
          tempEl.zoomFrom = 110;
          tempEl.animFade = true;
        }
        dynamicStyles += '\n' + getZoomKeyframes(tempEl);
      } else if (animType === 'slide' || animType === 'slide-up' || animType === 'slide-down' || animType === 'slide-left' || animType === 'slide-right') {
        const tempEl = { ...el };
        if (animType === 'slide-up') { tempEl.animDirection = 'up'; tempEl.animDistance = 20; }
        else if (animType === 'slide-down') { tempEl.animDirection = 'down'; tempEl.animDistance = 20; }
        else if (animType === 'slide-left') { tempEl.animDirection = 'left'; tempEl.animDistance = 20; }
        else if (animType === 'slide-right') { tempEl.animDirection = 'right'; tempEl.animDistance = 20; }
        dynamicStyles += '\n' + getSlideKeyframes(tempEl);
      }
      if (el.effectType === 'pan' && el.panMidX !== undefined && el.panMidY !== undefined) {
        dynamicStyles += '\n' + getPanCurveKeyframes(el);
      }
    });
    
    let styleTag = document.getElementById('dynamic-anim-styles');
    if (dynamicStyles) {
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-anim-styles';
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = dynamicStyles;
    } else if (styleTag) {
      styleTag.remove();
    }
  }
  // workspace sizing
  const z = state.zoom || 0.6;
  workspaceEl.style.zoom = z;
  workspaceEl.style.setProperty('--z', z);

  const zoomDisp = document.getElementById('zoom-level-display');
  if (zoomDisp) zoomDisp.innerText = 'Zoom ' + Math.round(z * 100) + '%';

  workspaceEl.style.width = BOARD_SIZE + 'px';
  workspaceEl.style.height = BOARD_SIZE + 'px';
  workspaceEl.style.margin = '';

  // which canvases to render
  workspaceEl.innerHTML = '';
  const active = getActiveCanvas();

  if (state.isPreviewMode) {
    state.canvases.forEach(c => workspaceEl.appendChild(previewFrameNode(c)));
  } else {
    state.canvases.forEach(c => workspaceEl.appendChild(canvasFrameNode(c)));
  }


  const projectNameDisp = document.getElementById('project-name-display');
  if (projectNameDisp && document.activeElement !== projectNameDisp && projectNameDisp.contentEditable !== 'true') {
    projectNameDisp.innerText = state.projectName || 'RMIT_ad';
  }
  // Keep the browser tab title in sync with the project name. Driven from
  // render() so every project-rename / load / new / undo path picks it up
  // automatically — no need to thread updates through each call site.
  const desiredTitle = (state.projectName || 'RMIT_ad') + ' - RMIT Adflow';
  if (document.title !== desiredTitle) document.title = desiredTitle;
  const clicktagEl = document.getElementById('clicktag');
  if (clicktagEl && document.activeElement !== clicktagEl) {
    clicktagEl.value = state.clickTag || 'https://www.rmit.edu.au/';
  }

  renderRulers();
  renderCanvasesList();
  renderLayers();
  renderLinkControl();
  renderAssets();
  renderFrameControls();
  if (typeof renderVersionSwitcher === 'function') renderVersionSwitcher();
  if (typeof renderPreviewVersionBar === 'function') renderPreviewVersionBar();
  updatePreviewZoomNotice();
  const szBtn = document.getElementById('btn-toggle-safezones');
  if (szBtn) szBtn.classList.toggle('active', !!state.showSafezones);
  if (!skipProps) renderProps();

  if (state.isPreviewMode) {
    document.body.classList.add('preview-active');
  } else {
    document.body.classList.remove('preview-active');
  }

  // (View/Snap/Theme menu items moved into the Settings panel — no menu ticks here.)
  const isFs = document.body.classList.contains('fullscreen-mode');
  const isPreview = document.body.classList.contains('preview-active');
  document.body.className = state.theme && state.theme !== 'default' ? 'theme-' + state.theme : '';
  if (isFs) document.body.classList.add('fullscreen-mode');
  if (isPreview) document.body.classList.add('preview-active');
  if (state.outlineMode) document.body.classList.add('outline-mode');
  // Theme-swap the Adflow wordmark — light theme gets a different SVG.
  syncAdflowLogos();

  // Catch-all autosave trigger: render() runs after virtually every state change
  // (element edits, project settings, theme, etc.). Debounced + suspended during the
  // initial restore, so this is cheap and won't fire spuriously on boot.
  scheduleAutosave();
}

// One-time-per-load migration for the shrunken board. Older projects (and the
// bundled startup templates) anchored canvases near the old ~2050 centre of a
// 5000×5000 board; on the smaller BOARD_SIZE board that content would sit in
// the bottom-right or hang off the edge. This slides the whole cluster so its
// top-left corner lands at BOARD_MARGIN, preserving relative layout. It's
// idempotent — once a project is anchored near the margin it no longer trips
// the trigger — so it's safe to call on every load. Returns true if it moved
// anything (callers drop stale history snapshots when so).
function normalizeCanvasPositions() {
  const cs = state.canvases;
  if (!Array.isArray(cs) || cs.length === 0) return false;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  cs.forEach(c => {
    const x = c.workspaceX || 0, y = c.workspaceY || 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + c.width > maxX) maxX = x + c.width;
    if (y + c.height > maxY) maxY = y + c.height;
  });
  // Only re-home content that's actually off the smaller board — legacy
  // projects authored on the old 5000 board can extend past 3000. Content
  // that already fits (including deliberately centred new projects) is left
  // alone, so this stays idempotent and never fights the new-project centring.
  const needs = minX < 0 || minY < 0 || maxX > BOARD_SIZE || maxY > BOARD_SIZE;
  if (!needs) return false;
  const dx = BOARD_MARGIN - minX;
  const dy = BOARD_MARGIN - minY;
  if (dx === 0 && dy === 0) return false;
  cs.forEach(c => {
    c.workspaceX = Math.round((c.workspaceX || 0) + dx);
    c.workspaceY = Math.round((c.workspaceY || 0) + dy);
  });
  return true;
}

function centerWorkspace(behavior = 'smooth') {
  const area = document.getElementById('canvas-area');
  if (!area) return;
  if (!state.canvases || state.canvases.length === 0) {
    area.scrollTo({ left: BOARD_MARGIN, top: BOARD_MARGIN, behavior });
    return;
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  state.canvases.forEach(c => {
    if (c.workspaceX < minX) minX = c.workspaceX;
    if (c.workspaceY < minY) minY = c.workspaceY;
    if (c.workspaceX + c.width > maxX) maxX = c.workspaceX + c.width;
    if (c.workspaceY + c.height > maxY) maxY = c.workspaceY + c.height;
  });
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const z = state.zoom || 0.6;
  const targetScrollLeft = centerX * z - area.clientWidth / 2;
  const targetScrollTop = centerY * z - area.clientHeight / 2;

  area.scrollTo({ left: Math.max(0, targetScrollLeft), top: Math.max(0, targetScrollTop), behavior });
}

function checkCanvasesInView() {
  if (state.isPreviewMode || document.body.classList.contains('fullscreen-mode')) return;
  if (!state.canvases || state.canvases.length === 0) return;

  const area = document.getElementById('canvas-area');
  if (!area || area.clientWidth === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  state.canvases.forEach(c => {
    if (c.workspaceX < minX) minX = c.workspaceX;
    if (c.workspaceY < minY) minY = c.workspaceY;
    if (c.workspaceX + c.width > maxX) maxX = c.workspaceX + c.width;
    if (c.workspaceY + c.height > maxY) maxY = c.workspaceY + c.height;
  });

  const zoom = state.zoom || 0.6;
  const viewportLeft = area.scrollLeft;
  const viewportTop = area.scrollTop;
  const viewportRight = viewportLeft + area.clientWidth;
  const viewportBottom = viewportTop + area.clientHeight;

  const canvasesLeft = minX * zoom;
  const canvasesTop = minY * zoom;
  const canvasesRight = maxX * zoom;
  const canvasesBottom = maxY * zoom;

  // Margin threshold of 50px: if less than 50px of the canvas area overlaps, user is considered lost
  const margin = 50;
  const isOutOfBounds = (canvasesRight - margin < viewportLeft) ||
                        (canvasesLeft + margin > viewportRight) ||
                        (canvasesBottom - margin < viewportTop) ||
                        (canvasesTop + margin > viewportBottom);

  if (isOutOfBounds) {
    const now = Date.now();
    if (state.lastOutOfBoundsToastTime && (now - state.lastOutOfBoundsToastTime < 5000)) {
      return;
    }
    state.lastOutOfBoundsToastTime = now;

    showCanvasNotification("Lost your canvases? Bring them back into view.", {
      type: 'info',
      duration: 10000,
      button: {
        text: 'Center & Zoom to 100%',
        onClick: () => {
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          animateViewTo(1.0, centerX, centerY);
        }
      }
    });
  }
}

// Show a toast offering to jump back to the user's last saved scroll position.
// Called on startup and on Open Project, after we've already centered the view.
function offerResumeView(savedScrollLeft, savedScrollTop, savedZoom) {
  if (savedScrollLeft === undefined || savedScrollTop === undefined) return;
  if (savedScrollLeft === 0 && savedScrollTop === 0) return;
  const area = document.getElementById('canvas-area');
  if (!area) return;
  
  if (Math.abs(area.scrollLeft - savedScrollLeft) < 5 && Math.abs(area.scrollTop - savedScrollTop) < 5) return;

  showCanvasNotification('Jump back to where you left off in this project?', {
    type: 'info',
    button: {
      text: 'Resume View',
      onClick: () => {
        const targetZoom = savedZoom !== undefined ? savedZoom : (state.zoom || 1.0);
        const focusX = (savedScrollLeft + area.clientWidth / 2) / targetZoom;
        const focusY = (savedScrollTop + area.clientHeight / 2) / targetZoom;
        animateViewTo(targetZoom, focusX, focusY);
      }
    }
  });
}

// Smooth view transition: animate zoom + scroll together with rAF, no intermediate
// render() calls. The existing DOM scales via workspaceEl.style.zoom and --z, which is
// cheap; a single render() at the end converges state.zoom and rebuilds (mostly a no-op
// visually since we already arrived there). Use this instead of `state.zoom = x; render();
// setTimeout(scrollTo({behavior:'smooth'}))` — that pattern shows a blackout because the
// DOM jumps to the new zoom *before* the scroll catches up.
let _viewAnimToken = 0;
function animateViewTo(targetZoom, focusX, focusY, duration = 350, onComplete) {
  const area = document.getElementById('canvas-area');
  const startZoom = state.zoom || 0.6;
  const startScrollLeft = area.scrollLeft;
  const startScrollTop = area.scrollTop;
  const targetScrollLeft = Math.max(0, focusX * targetZoom - area.clientWidth / 2);
  const targetScrollTop = Math.max(0, focusY * targetZoom - area.clientHeight / 2);
  const startTime = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
  const token = ++_viewAnimToken;

  const step = (now) => {
    if (token !== _viewAnimToken) return; // superseded by a later animation
    const t = Math.min(1, (now - startTime) / duration);
    const k = ease(t);
    const z = startZoom + (targetZoom - startZoom) * k;
    workspaceEl.style.zoom = z;
    workspaceEl.style.setProperty('--z', z);
    area.scrollLeft = startScrollLeft + (targetScrollLeft - startScrollLeft) * k;
    area.scrollTop = startScrollTop + (targetScrollTop - startScrollTop) * k;
    if (t < 1) requestAnimationFrame(step);
    else {
      state.zoom = targetZoom;
      render();
      if (onComplete) onComplete();
    }
  };
  requestAnimationFrame(step);
}

function zoomToCanvas(c) {
  const area = document.getElementById('canvas-area');
  const padding = 120; // 60px padding on each side
  const fitZoomX = (area.clientWidth - padding) / c.width;
  const fitZoomY = (area.clientHeight - padding) / c.height;
  const newZoom = Math.min(fitZoomX, fitZoomY, 2.5);

  state.zoom = Math.max(0.6, newZoom);
  render();

  const centerX = c.workspaceX + c.width / 2;
  const centerY = c.workspaceY + c.height / 2;
  const targetScrollLeft = centerX * state.zoom - area.clientWidth / 2;
  const targetScrollTop = centerY * state.zoom - area.clientHeight / 2;

  area.scrollTo({ left: Math.max(0, targetScrollLeft), top: Math.max(0, targetScrollTop), behavior: 'smooth' });
}

function createCanvasActions(c) {
  const actionsDiv = document.createElement('div');
  actionsDiv.style.display = 'flex';
  actionsDiv.style.gap = '4px';

  const btnReload = document.createElement('button');
  btnReload.style.cssText = 'background:transparent;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;justify-content:center;padding:2px;border-radius:3px;opacity:0.8;transition:color 0.1s;';
  btnReload.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
  btnReload.title = 'Reload';
  btnReload.onmouseover = () => btnReload.style.color = '#fff';
  btnReload.onmouseout = () => btnReload.style.color = '#5a6178';
  btnReload.onclick = (e) => {
    e.stopPropagation();
    const frame = document.querySelector(`.canvas-frame[data-canvas-id="${c.id}"]`);
    if (frame) {
      const iframe = frame.querySelector('iframe');
      if (iframe) iframe.srcdoc = iframe.srcdoc;
    }
  };

  const btnDownload = document.createElement('button');
  btnDownload.style.cssText = 'background:transparent;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;justify-content:center;padding:2px;border-radius:3px;opacity:0.8;transition:color 0.1s;';
  btnDownload.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  btnDownload.title = 'Download HTML5';
  btnDownload.onmouseover = () => btnDownload.style.color = '#fff';
  btnDownload.onmouseout = () => btnDownload.style.color = '#5a6178';
  btnDownload.onclick = async (e) => {
    e.stopPropagation();
    if (typeof JSZip === 'undefined') { await showAdflowAlert('JSZip is not loaded.'); return; }
    const zip = new JSZip();
    const projName = state.projectName || 'Ad';
    const safeName = projName.replace(/[^a-zA-Z0-9_-]/g, '_');
    await dmRunExport(dmActiveRowForOutput(), async () => {
      await addCanvasAssetsToZip(c, zip);
      zip.file('index.html', generateExportHTML(c, zip));
    });
    const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `${safeName}_${c.width}x${c.height}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  actionsDiv.appendChild(btnReload);
  actionsDiv.appendChild(btnDownload);
  return actionsDiv;
}

function previewFrameNode(c) {
  const frame = document.createElement('div');
  frame.className = 'canvas-frame';
  frame.dataset.canvasId = c.id;

  frame.style.left = c.workspaceX + 'px';
  frame.style.top = c.workspaceY + 'px';

  const html = generateExportHTML(c);
  const kb = (new Blob([html]).size / 1024).toFixed(1);

  const header = document.createElement('div');
  header.className = 'canvas-header';

  const titleSpan = document.createElement('div');
  titleSpan.style.display = 'flex';
  titleSpan.style.alignItems = 'center';
  titleSpan.style.gap = '8px';
  titleSpan.innerHTML = `<span class="dim" style="font-weight:600; color:var(--text-bright);">${c.width} &times; ${c.height}</span><span class="dim" style="margin-left:8px;">&bull; <span style="color:var(--accent-base); font-size:12px; font-weight:700;">${kb} KB</span></span>`;

  header.appendChild(titleSpan);
  frame.appendChild(header);

  const canvas = document.createElement('div');
  canvas.className = 'canvas';
  canvas.style.width = c.width + 'px';
  canvas.style.height = c.height + 'px';
  // Canvas-bg leaks (v0.16.39): make the canvas div TRANSPARENT in
  // full preview. The iframe inside already paints c.bgColor on its
  // html/body in the export, and the canvas div's bg used to leak a
  // 1–2px hairline around the iframe at non-100% zoom (browser
  // sub-pixel rounding under the workspace's layout maths). With
  // canvas transparent, the only thing painting the bg is the iframe
  // itself — no double layer means no possible mismatch line.
  canvas.style.background = 'transparent';
  canvas.style.borderTopLeftRadius = '0';
  canvas.style.borderTopRightRadius = '0';
  canvas.style.overflow = 'hidden';
  canvas.style.boxShadow = 'none';
  // Force the canvas onto its own GPU compositing layer + use
  // clip-path:inset(0) for stricter sub-pixel clipping than plain
  // overflow:hidden gives. Both belt-and-braces against the leak.
  canvas.style.transform = 'translateZ(0)';
  canvas.style.clipPath = 'inset(0)';

  const iframe = document.createElement('iframe'); iframe.className = 'preview-iframe';
  // Explicit pixel dims (not %): some browsers compute % iframe
  // dimensions differently from the parent's rendered size under
  // zoom, leaving a sub-pixel gap. Pixel-equal dims to the canvas
  // div remove that source of mismatch.
  iframe.style.width = c.width + 'px';
  iframe.style.height = c.height + 'px';
  iframe.style.border = 'none';
  iframe.style.position = 'absolute';
  iframe.style.left = '0';
  iframe.style.top = '0';
  // Full-preview iframe lands on the first non-skipped frame initially;
  // paint that frame's bg so the first frame doesn't flash the wrong
  // colour before frame-level CSS kicks in.
  {
    const firstF = (state.frames || []).find(f => !f.skip) || (state.frames || [])[0];
    iframe.style.background = getCanvasBg(c, firstF && firstF.id);
  }
  iframe.style.display = 'block';
  iframe.scrolling = 'no';
  iframe.srcdoc = html;

  canvas.appendChild(iframe);
  frame.appendChild(canvas);

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'flex-start';
  footer.style.marginTop = '6px';
  footer.appendChild(createCanvasActions(c));
  frame.appendChild(footer);

  return frame;
}

function renderFrameControls() {
  const sel = document.getElementById('frame-select');
  if (!sel) return;
  sel.innerHTML = state.frames.map((f, i) => `<option value="${f.id}" ${f.id === state.activeFrameId ? 'selected' : ''} style="${f.skip ? 'color: var(--text-muted); font-style: italic;' : ''}">Frame ${i + 1}</option>`).join('');

  const currentFrame = state.frames.find(f => f.id === state.activeFrameId);
  const durInput = document.getElementById('frame-duration');

  const btnPrev = document.getElementById('btn-prev-frame');
  const btnNext = document.getElementById('btn-next-frame');
  const fIdx = state.frames.findIndex(f => f.id === state.activeFrameId);
  if (btnPrev) btnPrev.disabled = fIdx <= 0;
  if (btnNext) btnNext.disabled = fIdx >= state.frames.length - 1;

  const btnSkip = document.getElementById('btn-skip-frame');
  if (btnSkip && currentFrame) {
    btnSkip.disabled = state.frames.length <= 1;
    if (currentFrame.skip) {
      btnSkip.classList.add('active');
    } else {
      btnSkip.classList.remove('active');
    }
  }

  const loopChk = document.getElementById('project-loop-ad');
  if (loopChk) {
    if (document.activeElement !== loopChk) loopChk.checked = state.loopAd === true;
    loopChk.onchange = (e) => {
      state.loopAd = e.target.checked;
      pushHistory();
      render();
    };
  }

  const previewCurrentOnlyChk = document.getElementById('project-preview-current-only');
  if (previewCurrentOnlyChk) {
    // "Preview current only" is meaningless with a single playable frame —
    // disable it when 0–1 non-skipped frames exist (covers both a 1-frame
    // project and a 2-frame project with one frame marked Skip). Also clear
    // the flag itself: otherwise skipping a frame while it's on would leave
    // it active (e.g. previewing the skipped frame) with no way to uncheck.
    const singlePlayable = state.frames.filter(f => !f.skip).length <= 1;
    if (singlePlayable && state.previewCurrentOnly) state.previewCurrentOnly = false;
    previewCurrentOnlyChk.disabled = singlePlayable;
    const pcoRow = previewCurrentOnlyChk.closest('.checkbox-row');
    if (pcoRow) {
      pcoRow.style.opacity = singlePlayable ? '0.4' : '1';
      pcoRow.style.pointerEvents = singlePlayable ? 'none' : '';
    }
    if (document.activeElement !== previewCurrentOnlyChk) previewCurrentOnlyChk.checked = state.previewCurrentOnly === true;
    previewCurrentOnlyChk.onchange = (e) => {
      state.previewCurrentOnly = e.target.checked;
      pushHistory();
      render();
    };
  }

  const activeFrames = state.frames.filter(f => !f.skip);
  const isLastFrame = activeFrames.length > 0 && activeFrames[activeFrames.length - 1].id === state.activeFrameId;

  if (durInput && currentFrame && document.activeElement !== durInput) {
    durInput.value = currentFrame.duration || 2;
    if (!state.loopAd && isLastFrame) {
      durInput.disabled = true;
      durInput.style.opacity = '0.4';
    } else {
      durInput.disabled = false;
      durInput.style.opacity = '1';
    }
  }
}

function renderRulers() {
  document.getElementById('ruler-h')?.remove();
  document.getElementById('ruler-v')?.remove();
  document.getElementById('ruler-corner')?.remove();
  document.querySelectorAll('.guide-h, .guide-v').forEach(e => e.remove());

  if (!state.showRulers || state.isPreviewMode || state.singlePreviewId) return;

  const rh = document.createElement('canvas'); rh.id = 'ruler-h';
  const rv = document.createElement('canvas'); rv.id = 'ruler-v';
  const rc = document.createElement('div'); rc.id = 'ruler-corner';

  rh.addEventListener('mousedown', (e) => startGuideDrag(e, 'h'));
  rv.addEventListener('mousedown', (e) => startGuideDrag(e, 'v'));

  canvasArea.insertBefore(rc, workspaceEl);
  canvasArea.insertBefore(rv, workspaceEl);
  canvasArea.insertBefore(rh, workspaceEl);

  const z = state.zoom || 1;
  const w = BOARD_SIZE * z, h = BOARD_SIZE * z;
  rh.width = w; rh.height = 16;
  rh.style.width = w + 'px';
  rv.width = 16; rv.height = h;
  rv.style.height = h + 'px';

  const ctxH = rh.getContext('2d');
  ctxH.font = '9px sans-serif'; ctxH.fillStyle = '#9aa1b6'; ctxH.strokeStyle = '#5a6178';
  for (let x = 0; x <= BOARD_SIZE; x += 100) {
    const px = x * z;
    ctxH.fillText(x.toString(), px + 4, 9);
    ctxH.beginPath(); ctxH.moveTo(px, 12); ctxH.lineTo(px, 16); ctxH.stroke();
    for (let i = 10; i < 100; i += 10) { const p = (x + i) * z; ctxH.beginPath(); ctxH.moveTo(p, 14); ctxH.lineTo(p, 16); ctxH.stroke(); }
  }

  const ctxV = rv.getContext('2d');
  ctxV.font = '9px sans-serif'; ctxV.fillStyle = '#9aa1b6'; ctxV.strokeStyle = '#5a6178';
  for (let y = 0; y <= BOARD_SIZE; y += 100) {
    const py = y * z;
    ctxV.save(); ctxV.translate(8, py + 4); ctxV.rotate(-Math.PI / 2); ctxV.fillText(y.toString(), 0, 0); ctxV.restore();
    ctxV.beginPath(); ctxV.moveTo(12, py); ctxV.lineTo(16, py); ctxV.stroke();
    for (let i = 10; i < 100; i += 10) { const p = (y + i) * z; ctxV.beginPath(); ctxV.moveTo(14, p); ctxV.lineTo(16, p); ctxV.stroke(); }
  }

  (state.guides || []).forEach(g => {
    const d = document.createElement('div');
    d.className = `guide-${g.type}`;
    if (g.type === 'h') {
      d.style.top = g.pos + 'px';
      d.style.height = (1 / z) + 'px';
    } else {
      d.style.left = g.pos + 'px';
      d.style.width = (1 / z) + 'px';
    }
    d.addEventListener('mousedown', (e) => { e.stopPropagation(); startGuideDrag(e, g.type, g.id); });
    workspaceEl.appendChild(d);
  });
}

function startGuideDrag(e, type, existingGuideId = null) {
  const isNew = !existingGuideId;
  const guideId = existingGuideId || uid();
  if (isNew) {
    if (!state.guides) state.guides = [];
    state.guides.push({ id: guideId, type, pos: 0 });
  }
  const guide = state.guides.find(g => g.id === guideId);
  const z = state.zoom || 1;

  // Build snap targets in WORKSPACE coords (guides live in workspace space, not
  // canvas-local). Vertical guides snap along x, horizontal along y.
  const snapTargets = [];
  const snapMaster = state.snapEnabled !== false;
  if (snapMaster) {
    state.canvases.forEach(c => {
      if (state.snapToCanvas !== false) {
        if (type === 'v') {
          snapTargets.push(c.workspaceX, c.workspaceX + c.width / 2, c.workspaceX + c.width);
        } else {
          snapTargets.push(c.workspaceY, c.workspaceY + c.height / 2, c.workspaceY + c.height);
        }
      }
      if (state.snapToElements !== false) {
        c.elements.forEach(el => {
          if (type === 'v') {
            snapTargets.push(c.workspaceX + el.x, c.workspaceX + el.x + el.width / 2, c.workspaceX + el.x + el.width);
          } else {
            snapTargets.push(c.workspaceY + el.y, c.workspaceY + el.y + el.height / 2, c.workspaceY + el.y + el.height);
          }
        });
      }
    });
    if (state.snapToGuides !== false) {
      (state.guides || []).forEach(g => {
        if (g.id === guideId) return;
        if (g.type === type) snapTargets.push(g.pos);
      });
    }
  }

  const onMove = (ev) => {
    const rect = workspaceEl.getBoundingClientRect();
    let pos = (type === 'h' ? (ev.clientY - rect.top) : (ev.clientX - rect.left)) / z;
    if (!ev.ctrlKey && !ev.metaKey && snapTargets.length) {
      let bestDelta = (state.snapDistance !== undefined ? state.snapDistance : 5) / z, snapPos = null;
      snapTargets.forEach(t => {
        const d = Math.abs(pos - t);
        if (d < bestDelta) { bestDelta = d; snapPos = t; }
      });
      if (snapPos !== null) pos = snapPos;
    }
    guide.pos = pos;
    render(true);
  };
  const onUp = (ev) => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    const cr = canvasArea.getBoundingClientRect();
    if ((type === 'h' && ev.clientY - cr.top < 20) || (type === 'v' && ev.clientX - cr.left < 20)) {
      state.guides = state.guides.filter(g => g.id !== guideId);
    }
    pushHistory();
    render();
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  onMove(e);
}

function canvasFrameNode(c) {
  const frame = document.createElement('div');
  let frameClass = 'canvas-frame';
  if (c.id === state.activeCanvasId) {
    frameClass += ' active';
  }
  frame.className = frameClass;
  frame.dataset.canvasId = c.id;

  frame.style.left = c.workspaceX + 'px';
  frame.style.top = c.workspaceY + 'px';

  // header
  const isSinglePreview = state.singlePreviewId === c.id;
  const header = document.createElement('div');
  header.className = 'canvas-header';
  header.innerHTML = `
    <span class="dim" style="font-weight:600; color:var(--text-bright); display:${state.showCanvasSizes !== false ? 'inline' : 'none'};">${c.width} × ${c.height}</span>
  `;
  if (!isSinglePreview) {
    const autoAlignBtn = document.createElement('button');
    autoAlignBtn.className = "canvas-auto-align-btn";
    autoAlignBtn.style.cssText = "background:none; border:none; cursor:pointer; color:var(--text-muted); display:flex; align-items:center; justify-content:center; transition:color 0.15s; padding:2px; margin:0; margin-left:auto;";
    autoAlignBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    `;
    autoAlignBtn.title = 'Auto-arrange elements';
    autoAlignBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      runAutoArrange(c.id);
    });
    autoAlignBtn.onmouseover = () => autoAlignBtn.style.color = '#fff';
    autoAlignBtn.onmouseout = () => autoAlignBtn.style.color = '#5a6178';
    header.appendChild(autoAlignBtn);
  }
  header.addEventListener('mousedown', (e) => {
    if (state.activeTool === 'zoom') return;
    if (e.target.closest('.canvas-auto-align-btn')) return;
    onCanvasHeaderDrag(e, c);
  });
  frame.appendChild(header);

  if (state.singlePreviewId && !isSinglePreview) {
    frame.style.opacity = '0.3';
    frame.style.pointerEvents = 'none';
    frame.classList.add('locked');
  }

  // canvas surface
  const canvas = document.createElement('div');
  canvas.className = 'canvas' + (state.dropTargetCanvasId === c.id ? ' drop-target' : '');
  canvas.style.width = c.width + 'px';
  canvas.style.height = c.height + 'px';
  // Editor canvas shows the active frame's bg so per-frame overrides
  // are visible during editing.
  canvas.style.background = getCanvasBg(c, state.activeFrameId);

  // In single-preview the canvas should read like the deployed ad — no
  // editor outline. The active-canvas accent box-shadow at
  // `.canvas-frame.active .canvas` would otherwise show as a thin
  // accent-coloured ring around the ad (very visible on solid blue/dark
  // backgrounds in RMIT theme where accent is red).
  if (isSinglePreview) {
    canvas.style.boxShadow = 'none';
    // Canvas-bg leak defence (v0.16.39): transparent canvas + GPU
    // composite + clip-path:inset(0) — see previewFrameNode for the
    // rationale. The iframe paints c.bgColor on its own html/body,
    // so leaving the canvas div transparent removes the double-layer
    // that was producing the 1–2px hairline at non-100% zoom.
    canvas.style.background = 'transparent';
    canvas.style.transform = 'translateZ(0)';
    canvas.style.clipPath = 'inset(0)';
  }

  if (isSinglePreview) {
    const iframe = document.createElement('iframe');
    iframe.srcdoc = generateExportHTML(c);
    // Explicit pixel dims so the iframe can't compute a different
    // sub-pixel rounded size than the canvas div under zoom.
    iframe.style.width = c.width + 'px';
    iframe.style.height = c.height + 'px';
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    // Single-preview iframe lands on the first non-skipped frame —
    // paint that frame's bg so the first paint matches.
    {
      const firstF = (state.frames || []).find(f => !f.skip) || (state.frames || [])[0];
      iframe.style.background = getCanvasBg(c, firstF && firstF.id);
    }
    iframe.style.position = 'absolute';
    iframe.style.left = '0';
    iframe.style.top = '0';
    canvas.appendChild(iframe);
  } else {
    const canvasInner = document.createElement('div');
    canvasInner.className = 'canvas-inner';
    canvasInner.style.width = '100%';
    canvasInner.style.height = '100%';
    // The active canvas normally allows overflow so users can drag elements out of
    // bounds while editing. Crop-to-Canvas (a Settings toggle) forces overflow:hidden
    // on every canvas — the editor preview of the trimmed export.
    canvasInner.style.overflow = (c.id === state.activeCanvasId && !state.cropToCanvas) ? 'visible' : 'hidden';
    canvasInner.style.position = 'absolute';
    canvasInner.style.top = '0';
    canvasInner.style.left = '0';

    const layerBot = document.createElement('div'); layerBot.style.position = 'absolute'; layerBot.style.inset = '0'; layerBot.style.pointerEvents = 'none'; layerBot.style.zIndex = '1'; layerBot.className = 'layer-bot';
    const layerMid = document.createElement('div'); layerMid.style.position = 'absolute'; layerMid.style.inset = '0'; layerMid.style.pointerEvents = 'none'; layerMid.style.zIndex = '2'; layerMid.className = 'layer-mid';
    const layerTop = document.createElement('div'); layerTop.style.position = 'absolute'; layerTop.style.inset = '0'; layerTop.style.pointerEvents = 'none'; layerTop.style.zIndex = '3'; layerTop.className = 'layer-top';
    canvasInner.appendChild(layerBot);
    canvasInner.appendChild(layerMid);
    canvasInner.appendChild(layerTop);

    // elements
    c.elements.forEach(el => {
      const node = elementNode(el, c);
      let targetLayer = null;
      if (el.persistent === 'bottom') targetLayer = layerBot;
      else if (el.persistent === 'top') targetLayer = layerTop;
      else if (el.frameId === state.activeFrameId) targetLayer = layerMid;
      
      if (targetLayer) {
        targetLayer.appendChild(node);

        // Sibling highlight overlay for clipped elements (masked images)
        if (el.linkGroupId && el.linkGroupId === _highlightGid && !(state.layerSelection && state.layerSelection.includes(el.id))) {
          const lg = state.linkGroups && state.linkGroups[el.linkGroupId];
          const overlay = document.createElement('div');
          overlay.className = 'link-group-highlight-overlay el ' + (lg && lg.liveLink ? 'link-highlight-live' : 'link-highlight');
          overlay.style.position = 'absolute';
          overlay.style.left = node.style.left;
          overlay.style.top = node.style.top;
          overlay.style.width = node.style.width;
          overlay.style.height = node.style.height;
          overlay.style.transform = node.style.transform;
          overlay.style.transformOrigin = node.style.transformOrigin;
          overlay.style.pointerEvents = 'none';
          overlay.style.zIndex = '9999';
          targetLayer.appendChild(overlay);
        }
      }
    });
    // If cropping mode is off, draw a black boundary line overlay
    if (!state.cropToCanvas) {
      const boundsOverlay = document.createElement('div');
      boundsOverlay.style.position = 'absolute';
      boundsOverlay.style.inset = '0';
      boundsOverlay.style.border = '1px solid #000000';
      boundsOverlay.style.pointerEvents = 'none';
      boundsOverlay.style.zIndex = '10'; // Above elements layer-top (z-index 3)
      boundsOverlay.style.boxSizing = 'border-box';
      boundsOverlay.className = 'canvas-bounds-overlay';
      canvasInner.appendChild(boundsOverlay);
    }
    canvas.appendChild(canvasInner);

    if (state.showSafezones) canvas.appendChild(safezoneOverlay(c));

    // drag over placeholder highlight overlay
    if (state.dragOverPlaceholderId) {
      const placeholderEl = c.elements.find(e => e.id === state.dragOverPlaceholderId && !e.hidden);
      if (placeholderEl) {
        canvas.appendChild(placeholderOverlay(placeholderEl));
      }
    }



    // selection overlay (only if this canvas is active and an element is selected)
    if (c.id === state.activeCanvasId) {
      if (state.isolatedGroupId) {
        const groupElements = c.elements.filter(e => e.groupId === state.isolatedGroupId && !e.hidden);
        if (groupElements.length > 0) {
          canvas.appendChild(isolatedGroupOverlay(groupElements));
        }
      }

      if (state.layerSelection && state.layerSelection.length > 1) {
        const sels = c.elements.filter(e => state.layerSelection.includes(e.id) && !e.hidden);
        const isGroup = sels.length > 1 && sels[0].groupId && sels.every(e => e.groupId === sels[0].groupId);
        if (sels.length > 1) canvas.appendChild(multiSelectionOverlay(sels, isGroup));
        else if (sels.length === 1) canvas.appendChild(selectionOverlay(sels[0]));
      } else if (state.selectedElementId) {
        const sel = c.elements.find(e => e.id === state.selectedElementId);
        if (sel && !sel.hidden) {
          canvas.appendChild(selectionOverlay(sel));
          if (sel.effectType === 'pan') {
            canvas.appendChild(moveGuideOverlay(sel, c));
          }
        }
      }
    }

    // Draw smart guides
    if (state.activeSmartGuides && c.id === state.activeCanvasId) {
      if (state.activeSmartGuides.x !== null) {
        const gx = document.createElement('div');
        gx.className = 'smart-guide x';
        gx.style.left = state.activeSmartGuides.x + 'px';
        canvas.appendChild(gx);
      }
      if (state.activeSmartGuides.y !== null) {
        const gy = document.createElement('div');
        gy.className = 'smart-guide y';
        gy.style.top = state.activeSmartGuides.y + 'px';
        canvas.appendChild(gy);
      }
    }

    // click empty canvas: make this canvas active, deselect element or start marquee selection
    canvas.addEventListener('mousedown', (e) => {
      if (state.activeTool === 'zoom') return;
      if (isSpaceDown || e.button === 1) return;

      if (state.activeTool === 'text') {
        if (state.editingElementId) {
          const ed = workspaceEl.querySelector(`.el[data-id="${state.editingElementId}"] .editable`);
          if (ed) ed.blur();
          e.stopPropagation();
          e.preventDefault();
          return;
        }

        e.stopPropagation();
        state.activeCanvasId = c.id;
        if (!e.shiftKey) {
          state.selectedElementId = null;
          state.editingElementId = null;
          state.layerSelection = [];
          if (state.isolatedGroupId) state.isolatedGroupId = null;
        }
        render();

        const newCanvasInner = document.querySelector(`.canvas-frame[data-canvas-id="${c.id}"] .canvas-inner`);
        if (!newCanvasInner) return;
        const newCanvas = newCanvasInner.parentElement;
        const rect = newCanvas.getBoundingClientRect();
        const z = state.zoom || 1;
        const startX = (e.clientX - rect.left) / z;
        const startY = (e.clientY - rect.top) / z;

        const selBox = document.createElement('div');
        selBox.style.position = 'absolute';
        selBox.style.border = '1px dashed var(--accent-base, #7c5cff)';
        selBox.style.backgroundColor = 'rgba(124, 92, 255, 0.05)';
        selBox.style.pointerEvents = 'none';
        selBox.style.zIndex = '999999';
        selBox.style.left = startX + 'px';
        selBox.style.top = startY + 'px';
        selBox.style.width = '0px';
        selBox.style.height = '0px';
        newCanvasInner.appendChild(selBox);

        let isDraggingSelection = false;

        const onMove = (ev) => {
          isDraggingSelection = true;
          const curX = (ev.clientX - rect.left) / z;
          const curY = (ev.clientY - rect.top) / z;

          const x = Math.min(startX, curX);
          const y = Math.min(startY, curY);
          const w = Math.abs(curX - startX);
          const h = Math.abs(curY - startY);

          selBox.style.left = x + 'px';
          selBox.style.top = y + 'px';
          selBox.style.width = w + 'px';
          selBox.style.height = h + 'px';
        };
        const onUp = (ev) => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          selBox.remove();

          if (!isDraggingSelection) {
            showCanvasNotification('Drag and draw a box to add text', { type: 'info' });
            return;
          }

          const curX = (ev.clientX - rect.left) / z;
          const curY = (ev.clientY - rect.top) / z;

          const rx = Math.min(startX, curX);
          const ry = Math.min(startY, curY);
          const rw = Math.abs(curX - startX);
          const rh = Math.abs(curY - startY);

          if (rw <= 5 || rh <= 5) {
            showCanvasNotification('Drag and draw a box to add text', { type: 'info' });
            return;
          }

          const el = makeElement('text');
          el.x = rx;
          el.y = ry;
          el.width = rw;
          el.height = rh;
          c.elements.push(el);

          state.selectedElementId = el.id;
          state.layerSelection = [el.id];
          state.editingElementId = el.id;
          
          pushHistory();
          render();

          setTimeout(() => {
            const ed = workspaceEl.querySelector(`.el[data-id="${el.id}"] .editable`);
            if (ed) {
              ed.focus();
              const range = document.createRange();
              range.selectNodeContents(ed);
              const sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }, 0);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return;
      }

      if (e.target === canvas || e.target === canvasInner) {
        if (state.isolatedGroupId) {
          const groupElements = c.elements.filter(el => el.groupId === state.isolatedGroupId);
          const rect = canvasInner.getBoundingClientRect();
          const z = state.zoom || 1;
          const clickX = (e.clientX - rect.left) / z;
          const clickY = (e.clientY - rect.top) / z;

          const hitElement = [...groupElements].reverse().find(el => {
            if (el.hidden) return false;
            const cx = el.x + el.width / 2;
            const cy = el.y + el.height / 2;
            const dx = clickX - cx;
            const dy = clickY - cy;
            const rad = -(el.rotation || 0) * Math.PI / 180;
            const rx = dx * Math.cos(rad) - dy * Math.sin(rad) + cx;
            const ry = dx * Math.sin(rad) + dy * Math.cos(rad) + cy;
            return rx >= el.x && rx <= el.x + el.width && ry >= el.y && ry <= el.y + el.height;
          });

          if (hitElement) {
            onElementMouseDown(e, hitElement, c);
            return;
          }
        }
        state.activeCanvasId = c.id;
        if (!e.shiftKey) {
          state.selectedElementId = null;
          state.editingElementId = null;
          state.layerSelection = [];
          if (state.isolatedGroupId) state.isolatedGroupId = null;
        }
        render();

        const newCanvasInner = document.querySelector(`.canvas-frame[data-canvas-id="${c.id}"] .canvas-inner`);
        if (!newCanvasInner) return;
        const newCanvas = newCanvasInner.parentElement;
        const rect = newCanvas.getBoundingClientRect();
        const z = state.zoom || 1;
        const startX = (e.clientX - rect.left) / z;
        const startY = (e.clientY - rect.top) / z;

        const selBox = document.createElement('div');
        selBox.style.position = 'absolute';
        selBox.style.border = '1px solid #7c5cff';
        selBox.style.backgroundColor = 'rgba(124, 92, 255, 0.1)';
        selBox.style.pointerEvents = 'none';
        selBox.style.zIndex = '999999';
        selBox.style.left = startX + 'px';
        selBox.style.top = startY + 'px';
        selBox.style.width = '0px';
        selBox.style.height = '0px';
        newCanvasInner.appendChild(selBox);

        let isDraggingSelection = false;

        const onMove = (ev) => {
          isDraggingSelection = true;
          const curX = (ev.clientX - rect.left) / z;
          const curY = (ev.clientY - rect.top) / z;

          const x = Math.min(startX, curX);
          const y = Math.min(startY, curY);
          const w = Math.abs(curX - startX);
          const h = Math.abs(curY - startY);

          selBox.style.left = x + 'px';
          selBox.style.top = y + 'px';
          selBox.style.width = w + 'px';
          selBox.style.height = h + 'px';
        };

        const onUp = (ev) => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          selBox.remove();

          if (isDraggingSelection) {
            const curX = (ev.clientX - rect.left) / z;
            const curY = (ev.clientY - rect.top) / z;

            const rx = Math.min(startX, curX);
            const ry = Math.min(startY, curY);
            const rw = Math.abs(curX - startX);
            const rh = Math.abs(curY - startY);

            const selectedIds = new Set();
            c.elements.forEach(el => {
              if (el.hidden || el.locked) return;
              if (el.persistent === false && el.frameId !== state.activeFrameId) return;
              if (state.isolatedGroupId && el.groupId !== state.isolatedGroupId) return;

              const intersect = !(
                el.x > rx + rw ||
                el.x + el.width < rx ||
                el.y > ry + rh ||
                el.y + el.height < ry
              );

              if (intersect) {
                if (el.groupId && !state.isolatedGroupId) {
                  c.elements.filter(x => x.groupId === el.groupId).forEach(x => selectedIds.add(x.id));
                } else {
                  selectedIds.add(el.id);
                }
              }
            });

            if (selectedIds.size > 0) {
              if (e.shiftKey) {
                selectedIds.forEach(id => {
                  if (!state.layerSelection.includes(id)) state.layerSelection.push(id);
                });
              } else {
                state.layerSelection = Array.from(selectedIds);
              }
              state.selectedElementId = state.layerSelection[state.layerSelection.length - 1];
              render();
            }
          }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      }
    });
  } // <-- End of else block for normal element overlay logic

  frame.appendChild(canvas);

  // Single preview footer
  const footer = document.createElement('div');
  footer.style.marginTop = '6px';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.alignItems = 'center';

  let leftSide = document.createElement('div');
  leftSide.style.display = 'flex';
  leftSide.style.alignItems = 'center';

  if (state.activeCanvasId === c.id && !isSinglePreview) {
    const opts = state.frames.map((f, i) => `<option value="${f.id}" ${f.id === state.activeFrameId ? 'selected' : ''} style="${f.skip ? 'color: var(--text-muted); font-style: italic;' : ''}">Frame ${i + 1}</option>`).join('');
    leftSide.innerHTML = `
      <div style="display:flex; align-items:center; gap:3px;">
        <button class="btn-prev-inline" title="Previous frame" style="background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); cursor:pointer; padding:0 4px; border-radius:3px; font-size:10px; height:18px; display:flex; align-items:center; justify-content:center;">&lsaquo;</button>
        <select class="frame-select-inline" title="Select active frame" style="background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:3px; padding:0 2px; font-size:9px; height:18px; outline:none; cursor:pointer;">
          ${opts}
        </select>
        <button class="btn-next-inline" title="Next frame" style="background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); cursor:pointer; padding:0 4px; border-radius:3px; font-size:10px; height:18px; display:flex; align-items:center; justify-content:center;">&rsaquo;</button>
        <div style="width:2px"></div>
        <button class="btn-add-frame-inline" title="Add Frame" style="background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); cursor:pointer; padding:0 4px; border-radius:3px; font-size:10px; height:18px; display:flex; align-items:center; justify-content:center;">+</button>
        <button class="btn-remove-frame-inline" title="Remove Frame" style="background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); cursor:pointer; padding:0 4px; border-radius:3px; font-size:10px; height:18px; display:flex; align-items:center; justify-content:center;">-</button>
      </div>
    `;
  } else if (isSinglePreview) {
    leftSide.appendChild(createCanvasActions(c));
  }

  footer.appendChild(leftSide);

  const rightSideBtn = document.createElement('button');
  rightSideBtn.className = "single-preview-btn";
  rightSideBtn.style.cssText = "background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:9px; text-decoration:underline; font-weight:500; transition:color 0.15s; padding:0;";
  rightSideBtn.innerHTML = isSinglePreview ? 'Back' : 'Preview';
  rightSideBtn.title = isSinglePreview ? 'Go back to edit mode' : 'Preview interactive animation for this canvas';
  rightSideBtn.onmouseover = () => rightSideBtn.style.color = '#9aa1b6';
  rightSideBtn.onmouseout = () => rightSideBtn.style.color = '#5a6178';
  footer.appendChild(rightSideBtn);

  if (state.activeCanvasId === c.id && !isSinglePreview) {
    const prevBtn = footer.querySelector('.btn-prev-inline');
    const nextBtn = footer.querySelector('.btn-next-inline');
    const sel = footer.querySelector('.frame-select-inline');
    if (prevBtn) prevBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const idx = state.frames.findIndex(f => f.id === state.activeFrameId);
      if (idx > 0) {
        state.activeFrameId = state.frames[idx - 1].id;
        deselectNonPersistentLayers();
        render();
      }
    });
    if (nextBtn) nextBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const idx = state.frames.findIndex(f => f.id === state.activeFrameId);
      if (idx < state.frames.length - 1) {
        state.activeFrameId = state.frames[idx + 1].id;
        deselectNonPersistentLayers();
        render();
      }
    });
    if (sel) {
      sel.addEventListener('mousedown', e => e.stopPropagation());
      sel.addEventListener('change', (e) => {
        state.activeFrameId = parseInt(e.target.value, 10);
        deselectNonPersistentLayers();
        render();
      });
    }
    const addBtn = footer.querySelector('.btn-add-frame-inline');
    if (addBtn) addBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const newId = Math.max(...state.frames.map(f => f.id), 0) + 1;
      state.frames.push({ id: newId, duration: 2 });
      state.activeFrameId = newId;
      deselectNonPersistentLayers();
      pushHistory();
      render();
    });
    const remBtn = footer.querySelector('.btn-remove-frame-inline');
    if (remBtn) remBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (state.frames.length <= 1) return;
      const idx = state.frames.findIndex(f => f.id === state.activeFrameId);
      state.frames.splice(idx, 1);
      state.activeFrameId = state.frames[Math.max(0, idx - 1)].id;
      if (state.frames.length === 1) {
        state.frames[0].skip = false;
      }
      state.canvases.forEach(cv => {
        cv.elements = cv.elements.filter(el => el.persistent !== false || state.frames.some(f => f.id === el.frameId));
      });
      deselectNonPersistentLayers();
      pushHistory();
      render();
    });
  }

  const footerBtn = footer.querySelector('.single-preview-btn');
  footerBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    state.singlePreviewId = isSinglePreview ? null : c.id;
    render();
  });
  frame.appendChild(footer);

  return frame;
}

// Global zoom-accuracy notice for single preview mode. Re-evaluated on every render,
// so it appears whenever single preview is active and zoom !== 1, and disappears as
// soon as zoom returns to 100% (or the user exits single preview).
function updatePreviewZoomNotice() {
  let notice = document.getElementById('preview-zoom-notice');
  const show = !!state.singlePreviewId && (state.zoom || 1) !== 1;
  if (!show) { if (notice) notice.remove(); return; }
  if (notice) return; // already shown

  notice = document.createElement('div');
  notice.id = 'preview-zoom-notice';
  notice.style.cssText = 'position:fixed; bottom:32px; left:50%; transform:translateX(-50%); padding:14px 22px; display:flex; align-items:center; gap:18px; font-size:14px; color:var(--accent-base); background:var(--bg-input); border:1px solid var(--accent-base); border-radius:8px; z-index:100; box-shadow:0 6px 28px rgba(0,0,0,0.45);';

  const msg = document.createElement('span');
  msg.innerText = "Preview isn't accurate unless zoom level is set to 100%";

  const setBtn = document.createElement('button');
  setBtn.innerText = 'Set';
  setBtn.style.cssText = 'background:var(--accent-base); border:none; color:var(--text-on-accent, var(--text-bright)); cursor:pointer; padding:6px 18px; border-radius:4px; font-size:13px; font-weight:600;';
  setBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const c = state.canvases.find(x => x.id === state.singlePreviewId);
    if (!c) return;
    animateViewTo(1, c.workspaceX + c.width / 2, c.workspaceY + c.height / 2);
  });

  notice.appendChild(msg);
  notice.appendChild(setBtn);
  document.body.appendChild(notice);
}

// Layer-based mask helpers — only rect/circle/pixel shapes can act as masks,
// and only when they're not pinned to a persistent layer. The mask always
// targets the IMAGE directly beneath it in z-order (previous index in the
// canvas's elements array; later indices = higher in stack).
const MASKABLE_SHAPE_TYPES = new Set(['rect', 'circle', 'pixel']);
function canShapeBeMask(el) {
  return !!el && MASKABLE_SHAPE_TYPES.has(el.type) && !el.persistent;
}
function isActiveMask(el) {
  return !!(el && el.isMask && !el.persistent && !el.hidden);
}
function findImageBeneath(c, maskEl) {
  if (!c || !maskEl) return null;
  const idx = c.elements.indexOf(maskEl);
  if (idx <= 0) return null;
  const below = c.elements[idx - 1];
  return (below && below.type === 'image') ? below : null;
}
function findMaskAbove(c, imageEl) {
  if (!c || !imageEl || imageEl.type !== 'image') return null;
  const idx = c.elements.indexOf(imageEl);
  if (idx < 0 || idx >= c.elements.length - 1) return null;
  const above = c.elements[idx + 1];
  return isActiveMask(above) ? above : null;
}
function sanitizeMasks(c) {
  if (!c || !c.elements) return;
  c.elements.forEach(el => {
    if (el.isMask) {
      const img = findImageBeneath(c, el);
      if (!img) {
        delete el.isMask;
      }
    }
  });
}
function startEffectPreview(el, tempVal) {
  if (!el) return;
  const val = tempVal !== undefined ? tempVal : (el.effectType || 'none');
  if (val === 'none') return;

  const node = document.querySelector(`.el[data-id="${el.id}"]`);
  if (!node) return;

  const activeC = getActiveCanvas();
  const isMaskedImg = activeC && findMaskAbove(activeC, el);
  const targetNode = isMaskedImg ? node.querySelector('img') : node;

  const applyEffAnim = (tNode) => {
    const effDur = el.effDuration !== undefined ? el.effDuration : 2;
    if (val === 'pan') {
      let px = el.panFromX !== undefined ? el.panFromX : 0;
      let py = el.panFromY !== undefined ? el.panFromY : 0;
      if (el.panFromX === undefined && el.panFromY === undefined) {
        const dist = el.panDist !== undefined ? el.panDist : 50;
        if (el.panDir === 'L') px = dist;
        else if (el.panDir === 'R') px = -dist;
        else if (el.panDir === 'U') py = dist;
        else if (el.panDir === 'D') py = -dist;
        else px = dist;
      }
      let animName = 'eff-pan';
      if (el.panMidX !== undefined && el.panMidY !== undefined) {
        animName = `eff-pan-${el.id}`;
        let styleTag = document.getElementById('dynamic-anim-styles');
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'dynamic-anim-styles';
          document.head.appendChild(styleTag);
        }
        const regex = new RegExp(`@keyframes\\s+eff-pan-${el.id}\\s*\\{[\\s\\S]*?\\n\\s*\\}`, 'g');
        styleTag.textContent = styleTag.textContent.replace(regex, '') + '\n' + getPanCurveKeyframes(el);
      }
      const angle = (el.rotation || 0) * Math.PI / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const pxLocal = px * cos + py * sin;
      const pyLocal = -px * sin + py * cos;

      tNode.style.setProperty('--pan-x', pxLocal.toFixed(1) + 'px');
      tNode.style.setProperty('--pan-y', pyLocal.toFixed(1) + 'px');
      const rot = el.panRotate !== undefined ? el.panRotate : 0;
      const opStart = el.panFade ? 0 : 1;
      tNode.style.setProperty('--pan-rotate', rot + 'deg');
      tNode.style.setProperty('--pan-opacity-start', opStart);
      let ease = el.effEase !== false ? 'ease-in-out' : 'linear';
      if (el.panMidX !== undefined && el.panMidY !== undefined) {
        ease = 'linear';
      }
      const fill = el.effOnce ? 'forwards' : 'infinite';
      tNode.style.animation = `${animName} ${effDur}s ${ease} 0s ${fill}`;
    } else if (val === 'zoom') {
      const zt = el.zoomTarget !== undefined ? el.zoomTarget / 100 : 1.5;
      tNode.style.setProperty('--zoom-target', zt);
      const ease = el.effEase !== false ? 'ease-in-out' : 'linear';
      const fill = el.effOnce ? 'forwards' : 'infinite';
      tNode.style.animation = `eff-zoom ${effDur}s ${ease} 0s ${fill}`;
    } else if (val === 'spin') {
      const spinT = el.spinTarget !== undefined ? el.spinTarget : 360;
      tNode.style.setProperty('--spin-target', spinT + 'deg');
      const ease = el.effEase !== false ? 'ease-in-out' : 'linear';
      const repeat = el.spinRepeat !== undefined ? el.spinRepeat : 1;
      const fill = Math.max(1, repeat);
      tNode.style.animation = `eff-spin ${effDur}s ${ease} 0s ${fill} both`;
    } else if (val === 'pulse') {
      const scaleVal = el.pulseScale !== undefined ? el.pulseScale / 100 : 1.05;
      tNode.style.setProperty('--pulse-scale', scaleVal);
      tNode.style.setProperty('--pulse-scale-inverse', (1 / scaleVal).toFixed(4));
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      tNode.style.animation = `eff-pulse ${duration}s ease-in-out 0s infinite`;
    } else if (val === 'heartbeat') {
      const scaleVal = el.heartbeatScale !== undefined ? el.heartbeatScale / 100 : 1.3;
      tNode.style.setProperty('--heartbeat-scale', scaleVal);
      tNode.style.setProperty('--heartbeat-scale-inverse', (1 / scaleVal).toFixed(4));
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      tNode.style.animation = `eff-heartbeat ${duration}s ease-in-out 0s infinite`;
    } else if (val === 'float') {
      const range = el.floatRange !== undefined ? el.floatRange : 10;
      const dir = el.floatDirection || 'up';
      let fx = 0, fy = 0;
      if (dir === 'up') fy = -range;
      else if (dir === 'down') fy = range;
      else if (dir === 'left') fx = -range;
      else if (dir === 'right') fx = range;
      tNode.style.setProperty('--float-x', fx + 'px');
      tNode.style.setProperty('--float-y', fy + 'px');
      tNode.style.setProperty('--float-x-inverse', -fx + 'px');
      tNode.style.setProperty('--float-y-inverse', -fy + 'px');
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      tNode.style.animation = `eff-float ${duration}s ease-in-out 0s infinite`;
    } else {
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      tNode.style.animation = `eff-${val} ${duration}s ease-in-out 0s infinite`;
    }
  };

  const applyInverseEffAnim = (tNode, imgEl) => {
    const effDur = el.effDuration !== undefined ? el.effDuration : 2;
    if (val === 'pan') {
      let px = el.panFromX !== undefined ? el.panFromX : 0;
      let py = el.panFromY !== undefined ? el.panFromY : 0;
      if (el.panFromX === undefined && el.panFromY === undefined) {
        const dist = el.panDist !== undefined ? el.panDist : 50;
        if (el.panDir === 'L') px = dist;
        else if (el.panDir === 'R') px = -dist;
        else if (el.panDir === 'U') py = dist;
        else if (el.panDir === 'D') py = -dist;
        else px = dist;
      }
      let rx = -px;
      let ry = -py;
      if (imgEl) {
        const imgRot = imgEl.rotation || 0;
        const rad = imgRot * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        rx = -px * cos - py * sin;
        ry = px * sin - py * cos;
      }
      tNode.style.setProperty('--pan-x', rx + 'px');
      tNode.style.setProperty('--pan-y', ry + 'px');
      const rot = el.panRotate !== undefined ? el.panRotate : 0;
      tNode.style.setProperty('--pan-rotate', (-rot) + 'deg');
      tNode.style.setProperty('--pan-opacity-start', 1);
      const ease = el.effEase !== false ? 'ease-in-out' : 'linear';
      const fill = el.effOnce ? 'forwards' : 'infinite';
      tNode.style.animation = `eff-pan-inverse ${effDur}s ${ease} 0s ${fill}`;
    } else if (val === 'zoom') {
      const zt = el.zoomTarget !== undefined ? el.zoomTarget / 100 : 1.5;
      tNode.style.setProperty('--zoom-target-inverse', 1 / zt);
      const ease = el.effEase !== false ? 'ease-in-out' : 'linear';
      const fill = el.effOnce ? 'forwards' : 'infinite';
      tNode.style.animation = `eff-zoom-inverse ${effDur}s ${ease} 0s ${fill}`;
    } else if (val === 'spin') {
      const spinT = el.spinTarget !== undefined ? el.spinTarget : 360;
      tNode.style.setProperty('--spin-target-inverse', (-spinT) + 'deg');
      const ease = el.effEase !== false ? 'ease-in-out' : 'linear';
      const repeat = el.spinRepeat !== undefined ? el.spinRepeat : 1;
      const fill = Math.max(1, repeat);
      tNode.style.animation = `eff-spin-inverse ${effDur}s ${ease} 0s ${fill} both`;
    } else if (val === 'pulse') {
      const scaleVal = el.pulseScale !== undefined ? el.pulseScale / 100 : 1.05;
      tNode.style.setProperty('--pulse-scale-inverse', (1 / scaleVal).toFixed(4));
      tNode.style.setProperty('--pulse-scale', scaleVal);
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      tNode.style.animation = `eff-pulse-inverse ${duration}s ease-in-out 0s infinite`;
    } else if (val === 'heartbeat') {
      const scaleVal = el.heartbeatScale !== undefined ? el.heartbeatScale / 100 : 1.3;
      tNode.style.setProperty('--heartbeat-scale-inverse', (1 / scaleVal).toFixed(4));
      tNode.style.setProperty('--heartbeat-scale', scaleVal);
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      tNode.style.animation = `eff-heartbeat-inverse ${duration}s ease-in-out 0s infinite`;
    } else if (val === 'float') {
      const range = el.floatRange !== undefined ? el.floatRange : 10;
      const dir = el.floatDirection || 'up';
      let fx = 0, fy = 0;
      if (dir === 'up') fy = -range;
      else if (dir === 'down') fy = range;
      else if (dir === 'left') fx = -range;
      else if (dir === 'right') fx = range;
      tNode.style.setProperty('--float-x-inverse', -fx + 'px');
      tNode.style.setProperty('--float-y-inverse', -fy + 'px');
      tNode.style.setProperty('--float-x', fx + 'px');
      tNode.style.setProperty('--float-y', fy + 'px');
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      tNode.style.animation = `eff-float-inverse ${duration}s ease-in-out 0s infinite`;
    } else {
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      tNode.style.animation = `eff-${val}-inverse ${duration}s ease-in-out 0s infinite`;
    }
  };

  applyEffAnim(targetNode);

  if (el.isMask && activeC) {
    const imgEl = activeC.elements.find(x => findMaskAbove(activeC, x) === el);
    if (imgEl) {
      const imgDom = document.querySelector(`.el[data-id="${imgEl.id}"]`);
      if (imgDom) {
        const maskCenterX = el.x + el.width / 2 - imgEl.x;
        const maskCenterY = el.y + el.height / 2 - imgEl.y;
        imgDom.style.transformOrigin = `${maskCenterX}px ${maskCenterY}px`;
        applyEffAnim(imgDom);
        const innerImg = imgDom.querySelector('img');
        if (innerImg) {
          innerImg.style.transformOrigin = `${maskCenterX}px ${maskCenterY}px`;
          applyInverseEffAnim(innerImg, imgEl);
        }
      }
    }
  }
}

function getElementAnimationCSS(el, isImageExport) {
  const animType = el.animType || 'none';
  const effType = el.effectType || 'none';

  let entryAnims = [];
  let entryVars = '';
  const isZoomLike = animType === 'zoom' || animType === 'zoom-in' || animType === 'pop-in';
  if (animType !== 'none' && !isImageExport) {
    if (animType === 'split') {
      entryAnims.push(`anim-split-${el.id} ${el.animDuration || 1}s ease-out ${el.animDelay || 0}s both`);
    } else if (animType === 'zoom' || animType === 'pop-in' || animType === 'zoom-in') {
      if (el.type === 'button' && el.animStaggerText) {
        // Skip wrapper zoom animation to avoid double-scaling
      } else {
        const timing = el.animBounce ? 'linear' : 'ease-out';
        entryAnims.push(`anim-zoom-${el.id} ${el.animDuration || 1}s ${timing} ${el.animDelay || 0}s both`);
      }
    } else if (animType === 'slide' || animType === 'slide-up' || animType === 'slide-down' || animType === 'slide-left' || animType === 'slide-right') {
      const timing = el.animBounce ? 'linear' : 'ease-out';
      entryAnims.push(`anim-slide-${el.id} ${el.animDuration || 1}s ${timing} ${el.animDelay || 0}s both`);
    } else {
      const isSwipe = ['swipe-up', 'swipe-down', 'swipe-left', 'swipe-right'].includes(animType);
      const isSlideLike = ['slide-up', 'slide-down', 'slide-left', 'slide-right', 'pop-in', 'zoom-in'].includes(animType);
      const fadeOn = el.animFade !== false;
      const suffix = isSwipe ? (fadeOn ? '-fade' : '') : (isSlideLike && !fadeOn ? '-nofade' : '');
      if ((el.type !== 'text' && el.type !== 'button') || (animType !== 'typing' && animType !== 'fade-typing' && animType !== 'word-fade')) {
        entryAnims.push(`anim-${animType}${suffix} ${el.animDuration || 1}s ${animType === 'typing' ? 'steps(30, end)' : 'ease-out'} ${el.animDelay || 0}s both`);
      }
    }
  }

  let effAnims = [];
  let effVars = '';
  if (effType !== 'none') {
    const effDur = el.effDuration !== undefined ? el.effDuration : 2;
    const effDelay = el.effDelay !== undefined ? el.effDelay : 0;
    if (effType === 'pan') {
      let px = el.panFromX !== undefined ? el.panFromX : 0;
      let py = el.panFromY !== undefined ? el.panFromY : 0;

      // Fallback migration for legacy projects:
      if (el.panFromX === undefined && el.panFromY === undefined) {
        const dist = el.panDist !== undefined ? el.panDist : 50;
        if (el.panDir === 'L') px = dist;
        else if (el.panDir === 'R') px = -dist;
        else if (el.panDir === 'U') py = dist;
        else if (el.panDir === 'D') py = -dist;
        else px = dist;
      }
      let animName = 'eff-pan';
      let ease = el.effEase !== false ? 'ease-in-out' : 'linear';
      if (el.panMidX !== undefined && el.panMidY !== undefined) {
        animName = `eff-pan-${el.id}`;
        ease = 'linear';
      }
      const fill = el.effOnce ? 'forwards' : 'infinite';
      if (!isImageExport) effAnims.push(`${animName} ${effDur}s ${ease} ${effDelay}s ${fill}`);
      const rot = el.panRotate !== undefined ? el.panRotate : 0;
      const opStart = el.panFade ? 0 : 1;

      const angle = (el.rotation || 0) * Math.PI / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const pxLocal = px * cos + py * sin;
      const pyLocal = -px * sin + py * cos;

      effVars = `--pan-x:${pxLocal.toFixed(1)}px; --pan-y:${pyLocal.toFixed(1)}px; --pan-rotate:${rot}deg; --pan-opacity-start:${opStart};`;
    } else if (effType === 'zoom') {
      const zt = el.zoomTarget !== undefined ? el.zoomTarget / 100 : 1.5;
      const ease = el.effEase !== false ? 'ease-in-out' : 'linear';
      const fill = el.effOnce ? 'forwards' : 'infinite';
      if (!isImageExport) effAnims.push(`eff-zoom ${effDur}s ${ease} ${effDelay}s ${fill}`);
      effVars = `--zoom-target:${zt};`;
    } else if (effType === 'spin') {
      const spinT = el.spinTarget !== undefined ? el.spinTarget : 360;
      const ease = el.effEase !== false ? 'ease-in-out' : 'linear';
      const repeat = el.spinRepeat !== undefined ? el.spinRepeat : 1;
      const fill = Math.max(1, repeat);
      if (!isImageExport) effAnims.push(`eff-spin ${effDur}s ${ease} ${effDelay}s ${fill} both`);
      effVars = `--spin-target:${spinT}deg;`;
    } else if (effType === 'pulse') {
      const scaleVal = el.pulseScale !== undefined ? el.pulseScale / 100 : 1.05;
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      if (!isImageExport) effAnims.push(`eff-pulse ${duration}s ease-in-out ${effDelay}s infinite`);
      effVars = `--pulse-scale:${scaleVal}; --pulse-scale-inverse:${(1 / scaleVal).toFixed(4)};`;
    } else if (effType === 'heartbeat') {
      const scaleVal = el.heartbeatScale !== undefined ? el.heartbeatScale / 100 : 1.3;
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      if (!isImageExport) effAnims.push(`eff-heartbeat ${duration}s ease-in-out ${effDelay}s infinite`);
      effVars = `--heartbeat-scale:${scaleVal}; --heartbeat-scale-inverse:${(1 / scaleVal).toFixed(4)};`;
    } else if (effType === 'float') {
      const range = el.floatRange !== undefined ? el.floatRange : 10;
      const dir = el.floatDirection || 'up';
      let fx = 0, fy = 0;
      if (dir === 'up') fy = -range;
      else if (dir === 'down') fy = range;
      else if (dir === 'left') fx = -range;
      else if (dir === 'right') fx = range;
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      if (!isImageExport) effAnims.push(`eff-float ${duration}s ease-in-out ${effDelay}s infinite`);
      effVars = `--float-x:${fx}px; --float-y:${fy}px; --float-x-inverse:${-fx}px; --float-y-inverse:${-fy}px;`;
    } else {
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      if (!isImageExport) effAnims.push(`eff-${effType} ${duration}s ease-in-out ${effDelay}s infinite`);
    }
  }

  let entryConfig = entryAnims.length > 0 ? `animation: ${entryAnims.join(', ')};` : '';
  if (isZoomLike && !isImageExport) {
    entryConfig += ` transform-origin: ${getTransformOriginValue(el.zoomAnchor || 'center')};`;
  }
  const effConfig = effAnims.length > 0 ? `animation: ${effAnims.join(', ')};` : '';
  return { entryConfig, entryVars, effConfig, effVars };
}

function getInverseElementAnimationCSS(el, isImageExport, imageEl) {
  const effType = el.effectType || 'none';
  let effAnims = [];
  let effVars = '';
  if (effType !== 'none' && !isImageExport) {
    const effDur = el.effDuration !== undefined ? el.effDuration : 2;
    const effDelay = el.effDelay !== undefined ? el.effDelay : 0;
    if (effType === 'pan') {
      let px = el.panFromX !== undefined ? el.panFromX : 0;
      let py = el.panFromY !== undefined ? el.panFromY : 0;
      if (el.panFromX === undefined && el.panFromY === undefined) {
        const dist = el.panDist !== undefined ? el.panDist : 50;
        if (el.panDir === 'L') px = dist;
        else if (el.panDir === 'R') px = -dist;
        else if (el.panDir === 'U') py = dist;
        else if (el.panDir === 'D') py = -dist;
        else px = dist;
      }
      let rx = -px;
      let ry = -py;
      if (imageEl) {
        const imgRot = imageEl.rotation || 0;
        const rad = imgRot * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        rx = -px * cos - py * sin;
        ry = px * sin - py * cos;
      }
      const ease = el.effEase !== false ? 'ease-in-out' : 'linear';
      const fill = el.effOnce ? 'forwards' : 'infinite';
      effAnims.push(`eff-pan-inverse ${effDur}s ${ease} ${effDelay}s ${fill}`);
      const rot = el.panRotate !== undefined ? el.panRotate : 0;
      effVars = `--pan-x:${rx}px; --pan-y:${ry}px; --pan-rotate:${-rot}deg;`;
    } else if (effType === 'zoom') {
      const zt = el.zoomTarget !== undefined ? el.zoomTarget / 100 : 1.5;
      const ease = el.effEase !== false ? 'ease-in-out' : 'linear';
      const fill = el.effOnce ? 'forwards' : 'infinite';
      effAnims.push(`eff-zoom-inverse ${effDur}s ${ease} ${effDelay}s ${fill}`);
      effVars = `--zoom-target-inverse:${1 / zt};`;
    } else if (effType === 'spin') {
      const spinT = el.spinTarget !== undefined ? el.spinTarget : 360;
      const ease = el.effEase !== false ? 'ease-in-out' : 'linear';
      const repeat = el.spinRepeat !== undefined ? el.spinRepeat : 1;
      const fill = Math.max(1, repeat);
      effAnims.push(`eff-spin-inverse ${effDur}s ${ease} ${effDelay}s ${fill} both`);
      effVars = `--spin-target-inverse:${-spinT}deg;`;
    } else if (effType === 'pulse') {
      const scaleVal = el.pulseScale !== undefined ? el.pulseScale / 100 : 1.05;
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      effAnims.push(`eff-pulse-inverse ${duration}s ease-in-out ${effDelay}s infinite`);
      effVars = `--pulse-scale-inverse:${(1 / scaleVal).toFixed(4)}; --pulse-scale:${scaleVal};`;
    } else if (effType === 'heartbeat') {
      const scaleVal = el.heartbeatScale !== undefined ? el.heartbeatScale / 100 : 1.3;
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      effAnims.push(`eff-heartbeat-inverse ${duration}s ease-in-out ${effDelay}s infinite`);
      effVars = `--heartbeat-scale-inverse:${(1 / scaleVal).toFixed(4)}; --heartbeat-scale:${scaleVal};`;
    } else if (effType === 'float') {
      const range = el.floatRange !== undefined ? el.floatRange : 10;
      const dir = el.floatDirection || 'up';
      let fx = 0, fy = 0;
      if (dir === 'up') fy = -range;
      else if (dir === 'down') fy = range;
      else if (dir === 'left') fx = -range;
      else if (dir === 'right') fx = range;
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      effAnims.push(`eff-float-inverse ${duration}s ease-in-out ${effDelay}s infinite`);
      effVars = `--float-x-inverse:${-fx}px; --float-y-inverse:${-fy}px; --float-x:${fx}px; --float-y:${fy}px;`;
    } else {
      const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
      const speed = Math.max(1, Number(speedStr));
      const duration = 2 / (speed / 100);
      effAnims.push(`eff-${effType}-inverse ${duration}s ease-in-out ${effDelay}s infinite`);
    }
  }
  return {
    effConfig: effAnims.length ? `animation: ${effAnims.join(', ')};` : '',
    effVars
  };
}

// SVG fill helper for elements rendered via inline SVG (pixel shapes).
// SVG's `fill` attribute does NOT accept CSS linear-gradient strings — a
// gradient value silently falls back to default black. To support
// gradients on SVG-rendered elements, we materialise the CSS gradient as
// an SVG <linearGradient> def and reference it via fill="url(#id)".
// Returns { defs, fillAttr } when input is a CSS gradient, null otherwise.
// `idSeed` should be unique per element (the el.id works) so multiple
// pixels with different gradients don't collide on the same <defs> id.
function svgFillForCssColor(value, idSeed) {
  if (typeof value !== 'string' || !value.includes('gradient')) return null;
  if (typeof cpParseGradient !== 'function') return null;
  const parsed = cpParseGradient(value);
  if (!parsed || !parsed.stops || parsed.stops.length < 2) return null;

  // CSS angle → SVG endpoints. CSS 0° = upwards, 90° = rightwards.
  // Direction vector: (sin θ, -cos θ). Endpoints sit symmetrically
  // around the bounding-box centre at (0.5, 0.5).
  const rad = (parsed.angle || 0) * Math.PI / 180;
  const dx = Math.sin(rad), dy = -Math.cos(rad);
  const x1 = (0.5 - dx / 2).toFixed(4);
  const y1 = (0.5 - dy / 2).toFixed(4);
  const x2 = (0.5 + dx / 2).toFixed(4);
  const y2 = (0.5 + dy / 2).toFixed(4);

  // SVG doesn't natively support CSS color hints. To approximate a
  // midpoint-biased transition we insert a synthetic stop at the hint
  // position whose colour is the 50/50 mix of its two neighbours.
  const stops = parsed.stops.slice().sort((a, b) => a.pos - b.pos);
  const toRgb = (hex) => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const stopXml = [];
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    const op = (s.opacity !== undefined ? s.opacity : 100) / 100;
    stopXml.push(`<stop offset="${s.pos}%" stop-color="${s.color}" stop-opacity="${op}"/>`);
    if (i < stops.length - 1) {
      const mid = (typeof s.mid === 'number') ? s.mid : 0.5;
      if (Math.abs(mid - 0.5) > 0.005) {
        const a = toRgb(s.color), b = toRgb(stops[i + 1].color);
        const mix = a.map((v, j) => Math.round(v + (b[j] - v) * 0.5));
        const midColor = '#' + mix.map(v => v.toString(16).padStart(2, '0')).join('');
        const midOp = (op + ((stops[i + 1].opacity !== undefined ? stops[i + 1].opacity : 100) / 100)) / 2;
        const hintPos = s.pos + mid * (stops[i + 1].pos - s.pos);
        stopXml.push(`<stop offset="${hintPos}%" stop-color="${midColor}" stop-opacity="${midOp}"/>`);
      }
    }
  }
  const id = 'svgrad_' + idSeed;
  const defs = `<defs><linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopXml.join('')}</linearGradient></defs>`;
  return { defs, fillAttr: `url(#${id})` };
}

// ----- Mask clip-path helpers (v0.16.50) -------------------------------------
// Adflow used to mask an image via inline SVG `<mask>` + CSS `mask: url(#…)`.
// That works on the browser that saved the project but is browser-flaky for
// every other reader because CSS fragment-URL resolution against an SVG mask
// is the most brittle paint operation a browser has (Chromium nested-defs
// scope, Safari zero-size-SVG paint context, Firefox shorthand-not-
// propagating-to-mask-image, etc — all reproducible in the wild). The new
// system clips the image with CSS `clip-path` using INLINE shape functions
// (`inset()`, `ellipse()`, `polygon()`, `path()`) — no fragment URL, no SVG
// defs, no per-browser quirks. Same data model (`isMask: true` + shape
// geometry + image-below pairing), same visual result for the binary
// hard-edged clips Adflow actually uses.
function _maskRotPt(x, y, cx, cy, rotDeg) {
  if (!rotDeg) return [x, y];
  const rad = rotDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx = x - cx, dy = y - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}
function _fmtMask(v) {
  // Trim near-zero, otherwise round to 3 decimals — keeps the clip-path
  // string short while staying sub-pixel precise.
  if (Math.abs(v) < 0.001) return 0;
  return Math.round(v * 1000) / 1000;
}
// Compute the CSS clip-path string that clips the image element `image` to
// the mask shape `mask`. Coordinates are in the image's local CSS-pixel
// box (origin at the image's top-left).
function buildMaskClipPath(mask, image) {
  const relX = (mask.x + mask.width / 2) - (image.x + image.width / 2);
  const relY = (mask.y + mask.height / 2) - (image.y + image.height / 2);
  const mw = Math.max(1, mask.width);
  const mh = Math.max(1, mask.height);
  const tx = relX + image.width / 2 - mw / 2;
  const ty = relY + image.height / 2 - mh / 2;
  const rot = mask.rotation || 0;
  const cx = tx + mw / 2;
  const cy = ty + mh / 2;
  const f = _fmtMask;

  if (mask.type === 'rect') {
    const r = mask.radius || 0;
    if (rot === 0) {
      // Native rounded rect — inset() supports the rx/ry round modifier.
      const right = image.width - tx - mw;
      const bottom = image.height - ty - mh;
      return `inset(${f(ty)}px ${f(right)}px ${f(bottom)}px ${f(tx)}px round ${f(r)}px)`;
    }
    // Rotated rect → polygon with 4 rotated corners. Rounded corners are
    // dropped in this fallback (polygon() can't express arcs); a rotated
    // rect with non-zero radius is an unusual mask anyway.
    const c = [
      _maskRotPt(tx, ty, cx, cy, rot),
      _maskRotPt(tx + mw, ty, cx, cy, rot),
      _maskRotPt(tx + mw, ty + mh, cx, cy, rot),
      _maskRotPt(tx, ty + mh, cx, cy, rot)
    ];
    return `polygon(${c.map(p => `${f(p[0])}px ${f(p[1])}px`).join(', ')})`;
  }

  if (mask.type === 'circle') {
    if (rot === 0 || mw === mh) {
      // Rotated circle (mw === mh) looks identical to unrotated, so skip
      // the polygon path for that case.
      return `ellipse(${f(mw/2)}px ${f(mh/2)}px at ${f(cx)}px ${f(cy)}px)`;
    }
    // Rotated non-circular ellipse → 36-point polygon approximation.
    const N = 36;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * 2 * Math.PI;
      const px = cx + (mw/2) * Math.cos(t);
      const py = cy + (mh/2) * Math.sin(t);
      pts.push(_maskRotPt(px, py, cx, cy, rot));
    }
    return `polygon(${pts.map(p => `${f(p[0])}px ${f(p[1])}px`).join(', ')})`;
  }

  if (mask.type === 'pixel') {
    const sx = mw / 578.52;
    const sy = mh / 556.76;
    // SINGLE quotes around the path data so the value is embeddable
    // inside an HTML `style="…"` attribute without escaping. Double
    // quotes would close the attribute prematurely on the first `"`
    // after `path(`, leaving the clip-path silently inactive.
    return `path('${_buildPixelClipPath(sx, sy, tx, ty, rot, cx, cy)}')`;
  }

  return 'none';
}

function generateMaskClipPathKeyframes(mask, image, presetOverride) {
  const animType = presetOverride || mask.animType || 'none';
  if (animType === 'none') return null;

  const isSlideLike = ['slide', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'pop-in', 'zoom-in', 'zoom'].includes(animType);
  if (!isSlideLike) return null;

  const fromMask = JSON.parse(JSON.stringify(mask));
  
  let zf = 0.8;
  if (animType === 'pop-in') {
    zf = 0.8;
  } else if (animType === 'zoom-in') {
    zf = 1.1;
  } else if (animType === 'zoom') {
    zf = mask.zoomFrom !== undefined ? mask.zoomFrom / 100 : 0.8;
  }

  const isSlide = animType === 'slide' || animType === 'slide-up' || animType === 'slide-down' || animType === 'slide-left' || animType === 'slide-right';
  let slideDir = 'up';
  if (isSlide) {
    slideDir = mask.animDirection || 'up';
    if (slideDir === 'closest') {
      let parentCanvas = null;
      if (typeof state !== 'undefined' && state.canvases) {
        parentCanvas = state.canvases.find(c => c.elements && c.elements.some(e => e.id === mask.id));
      }
      if (parentCanvas) {
        const w = mask.width || 0;
        const h = mask.height || 0;
        const cx = mask.x + w / 2;
        const cy = mask.y + h / 2;
        const distLeft = cx;
        const distRight = parentCanvas.width - cx;
        const distTop = cy;
        const distBottom = parentCanvas.height - cy;
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);
        if (minDist === distLeft) slideDir = 'right';
        else if (minDist === distRight) slideDir = 'left';
        else if (minDist === distTop) slideDir = 'down';
        else slideDir = 'up';
      } else {
        slideDir = 'up';
      }
    }
  }

  if (isSlide) {
    const dir = slideDir;
    const dist = mask.animDistance !== undefined ? mask.animDistance : (animType.startsWith('slide-') ? 20 : 100);
    const rOffset = mask.animRotateOffset !== undefined ? mask.animRotateOffset : 0;
    if (dir === 'up') fromMask.y += dist;
    else if (dir === 'down') fromMask.y -= dist;
    else if (dir === 'left') fromMask.x += dist;
    else if (dir === 'right') fromMask.x -= dist;
    fromMask.rotation = (fromMask.rotation || 0) + rOffset;
  } else if (animType === 'zoom' || animType === 'pop-in' || animType === 'zoom-in') {
    const cx = mask.x + mask.width / 2;
    const cy = mask.y + mask.height / 2;
    fromMask.width = Math.max(1, fromMask.width * zf);
    fromMask.height = Math.max(1, fromMask.height * zf);
    fromMask.x = cx - fromMask.width / 2;
    fromMask.y = cy - fromMask.height / 2;
    if (fromMask.radius) fromMask.radius *= zf;
  }

  const animName = `mask-anim-${mask.id}-${animType}`;
  const dur = mask.animDuration || 1;
  const del = mask.animDelay || 0;
  const timing = mask.animBounce ? 'linear' : 'ease-out';

  if (isSlide && mask.animBounce) {
    const dir = slideDir;
    const dist = mask.animDistance !== undefined ? mask.animDistance : (animType.startsWith('slide-') ? 20 : 100);
    const rOffset = mask.animRotateOffset !== undefined ? mask.animRotateOffset : 0;
    const d = 4.0; // damping
    const f = 2.0; // frequency
    let keyframeSteps = [];
    
    for (let pct = 0; pct <= 100; pct += 5) {
      const t = pct / 100;
      const x = Math.exp(-d * t) * Math.cos(2 * Math.PI * f * t);
      const currentDist = dist * x;
      const currentRot = rOffset * x;
      
      const stepMask = JSON.parse(JSON.stringify(mask));
      if (dir === 'up') stepMask.y += currentDist;
      else if (dir === 'down') stepMask.y -= currentDist;
      else if (dir === 'left') stepMask.x += currentDist;
      else if (dir === 'right') stepMask.x -= currentDist;
      stepMask.rotation = (stepMask.rotation || 0) + currentRot;
      
      const cp = buildMaskClipPath(stepMask, image);
      keyframeSteps.push(`      ${pct}% { clip-path: ${cp}; -webkit-clip-path: ${cp}; }`);
    }

    return {
      name: animName,
      keyframes: `@keyframes ${animName} {\n${keyframeSteps.join('\n')}\n    }`,
      animationCss: `${animName} ${dur}s ${timing} ${del}s both`
    };
  }

  if ((animType === 'zoom' || animType === 'pop-in' || animType === 'zoom-in') && mask.animBounce) {
    const d = 4.0; // damping
    const f = 2.0; // frequency
    let keyframeSteps = [];
    
    for (let pct = 0; pct <= 100; pct += 5) {
      const t = pct / 100;
      const x = Math.exp(-d * t) * Math.cos(2 * Math.PI * f * t);
      const s = (1.0 + (zf - 1.0) * x);
      
      const stepMask = JSON.parse(JSON.stringify(mask));
      const cx = mask.x + mask.width / 2;
      const cy = mask.y + mask.height / 2;
      stepMask.width = Math.max(1, stepMask.width * s);
      stepMask.height = Math.max(1, stepMask.height * s);
      stepMask.x = cx - stepMask.width / 2;
      stepMask.y = cy - stepMask.height / 2;
      if (stepMask.radius) stepMask.radius *= s;
      const cp = buildMaskClipPath(stepMask, image);
      keyframeSteps.push(`      ${pct}% { clip-path: ${cp}; -webkit-clip-path: ${cp}; }`);
    }

    return {
      name: animName,
      keyframes: `@keyframes ${animName} {\n${keyframeSteps.join('\n')}\n    }`,
      animationCss: `${animName} ${dur}s ${timing} ${del}s both`
    };
  } else {
    const cpFrom = buildMaskClipPath(fromMask, image);
    const cpTo = buildMaskClipPath(mask, image);
    return {
      name: animName,
      keyframes: `@keyframes ${animName} { from { clip-path: ${cpFrom}; -webkit-clip-path: ${cpFrom}; } to { clip-path: ${cpTo}; -webkit-clip-path: ${cpTo}; } }`,
      animationCss: `${animName} ${dur}s ${timing} ${del}s both`
    };
  }
}
// Source pixel path (in 578.52×556.76 viewBox):
//   M290.78,0 h-74.15 v60.23 h-123.75 v125.78 H0 v184.74 h92.88 v125.78
//   h123.5 v60.23 h65.55 c152.85,0,287.74-123.5,287.74-277.62
//   S444.14,0,290.78,0 (implicit Z)
// The non-rotated case keeps the original command structure and just bakes
// scale + translate into each coord — shorter output. The rotated case
// walks the path in absolute coords, rotates each, and emits absolute L/C
// commands (relative deltas don't survive rotation).
function _buildPixelClipPath(sx, sy, tx, ty, rot, cx, cy) {
  const f = _fmtMask;
  if (!rot) {
    return [
      `M${f(290.78 * sx + tx)},${f(0 * sy + ty)}`,
      `h${f(-74.15 * sx)}`,
      `v${f(60.23 * sy)}`,
      `h${f(-123.75 * sx)}`,
      `v${f(125.78 * sy)}`,
      `H${f(0 * sx + tx)}`,
      `v${f(184.74 * sy)}`,
      `h${f(92.88 * sx)}`,
      `v${f(125.78 * sy)}`,
      `h${f(123.5 * sx)}`,
      `v${f(60.23 * sy)}`,
      `h${f(65.55 * sx)}`,
      `c${f(152.85 * sx)},${f(0)},${f(287.74 * sx)},${f(-123.5 * sy)},${f(287.74 * sx)},${f(-277.62 * sy)}`,
      `S${f(444.14 * sx + tx)},${f(0 * sy + ty)},${f(290.78 * sx + tx)},${f(0 * sy + ty)}`,
      'Z'
    ].join(' ');
  }
  // Rotation path — walk the source in absolute coords, rotate each
  // emitted point, and produce absolute L / C commands (relative h/v/c
  // don't survive rotation since deltas would need a per-segment
  // rotation matrix).
  let x = 290.78 * sx + tx, y = 0 * sy + ty;
  const out = [];
  const rot1 = (px, py) => _maskRotPt(px, py, cx, cy, rot);
  const emitL = (nx, ny) => {
    x = nx; y = ny;
    const [rx, ry] = rot1(x, y);
    out.push(`L${f(rx)},${f(ry)}`);
  };
  const [m0x, m0y] = rot1(x, y);
  out.push(`M${f(m0x)},${f(m0y)}`);
  emitL(x + -74.15 * sx, y);
  emitL(x, y + 60.23 * sy);
  emitL(x + -123.75 * sx, y);
  emitL(x, y + 125.78 * sy);
  emitL(0 * sx + tx, y);
  emitL(x, y + 184.74 * sy);
  emitL(x + 92.88 * sx, y);
  emitL(x, y + 125.78 * sy);
  emitL(x + 123.5 * sx, y);
  emitL(x, y + 60.23 * sy);
  emitL(x + 65.55 * sx, y);
  // Relative cubic: c 152.85,0, 287.74,-123.5, 287.74,-277.62
  const cp1 = rot1(x + 152.85 * sx, y + 0 * sy);
  const cp2 = rot1(x + 287.74 * sx, y + -123.5 * sy);
  const endC = rot1(x + 287.74 * sx, y + -277.62 * sy);
  x += 287.74 * sx; y += -277.62 * sy;
  out.push(`C${f(cp1[0])},${f(cp1[1])},${f(cp2[0])},${f(cp2[1])},${f(endC[0])},${f(endC[1])}`);
  // Absolute smooth cubic: S 444.14,0, 290.78,0.
  // S's first control point is the reflection of the previous cubic's
  // cp2 about the current point: cp1S = 2*current - prevCp2. Rotation is
  // linear about (cx, cy) so the identity holds in rotated abs coords:
  // 2*rot(p) - rot(q) === rot(2p - q). So we can compute cp1S directly
  // in rotated space.
  const cp1S = [2 * endC[0] - cp2[0], 2 * endC[1] - cp2[1]];
  const cp2S = rot1(444.14 * sx + tx, 0 * sy + ty);
  const endS = rot1(290.78 * sx + tx, 0 * sy + ty);
  out.push(`C${f(cp1S[0])},${f(cp1S[1])},${f(cp2S[0])},${f(cp2S[1])},${f(endS[0])},${f(endS[1])}`);
  out.push('Z');
  return out.join(' ');
}

function elementNode(el, canvasCtx) {
  const d = document.createElement('div');
  d.className = 'el';

  // Identify properties to color-code in outline mode
  let isDynamic = false;
  if (typeof dmFieldActive === 'function' && typeof dmFieldsForType === 'function') {
    isDynamic = dmFieldsForType(el.type).some(f => dmFieldActive(el, f));
  }
  const isAnimated = (el.animType && el.animType !== 'none') || (el.effectType && el.effectType !== 'none');

  if (isDynamic) d.classList.add('dynamic-el');
  if (isAnimated) d.classList.add('animated-el');

  if (el.hidden) d.style.display = 'none';
  // Mask layers are functionally invisible — their geometry only drives the
  // mask SVG below — but stay selectable in the editor so the user can move /
  // resize / animate them. In preview / export the wrapper is dropped entirely.
  const _isActiveMask = isActiveMask(el);
  if (_isActiveMask) {
    d.classList.add('el-mask');
    d.dataset.isMask = '1';
  }
  d.dataset.id = el.id;
  // Tag link-group membership so hovering a group row can highlight siblings directly.
  if (el.linkGroupId) d.dataset.linkGroup = el.linkGroupId;
  // Highlight (visual only) the linked siblings of the current selection — but not the
  // selected elements themselves, which already show a selection outline.
  if (el.linkGroupId && el.linkGroupId === _highlightGid && !(state.layerSelection && state.layerSelection.includes(el.id))) {
    d.classList.add('link-highlight');
    const lg = state.linkGroups && state.linkGroups[el.linkGroupId];
    if (lg && lg.liveLink) {
      d.classList.add('link-highlight-live');
    }
  }
  d.style.left = el.x + 'px';
  d.style.top = el.y + 'px';
  d.style.width = el.width + 'px';
  d.style.height = el.height + 'px';
  d.style.transform = `rotate(${el.rotation || 0}deg)`;
  // For shapes (rect/circle) and buttons, `opacity` is a *fill* opacity and gets
  // baked into a dedicated fill layer below — so the wrapper stays at full opacity
  // and stroke/text aren't dragged down with it. Other element types use the
  // wrapper-level opacity as a general dim.
  const isFillTypeWithStroke = el.type === 'rect' || el.type === 'circle' || el.type === 'button';
  if (!isFillTypeWithStroke) {
    d.style.opacity = el.opacity !== undefined ? el.opacity / 100 : 1;
  }
  if (state.tempTopDuringDrag && state.isDragging && state.layerSelection && state.layerSelection.includes(el.id)) {
    d.style.zIndex = '99999';
  }
  if (el.locked) d.style.pointerEvents = 'none';

  // Data-merge overlay: when a version is active, dynamic-flagged fields display the
  // active row's value (non-destructively — the element keeps its template default).
  const _dm = (typeof dmDisplay === 'function') ? dmDisplay(el) : {};
  const dText = _dm.text !== undefined ? _dm.text : el.text;
  const dColor = _dm.color !== undefined ? _dm.color : el.color;
  const dBg = _dm.bg !== undefined ? _dm.bg : el.bg;
  const dAssetId = _dm.assetId !== undefined ? _dm.assetId : el.assetId;

  const editing = state.editingElementId === el.id;
  if (editing) d.classList.add('editing');

  if (el.type === 'text') {
    d.classList.add('text');
    d.style.display = 'flex';
    d.style.flexDirection = 'column';
    const vAlignMap = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
    d.style.justifyContent = vAlignMap[el.verticalAlign || 'top'];
    
    const computedFontSize = el.autoSize ? calculateAutoSize(el, dText) : (el.fontSize || 14);

    if (editing) {
      const ed = document.createElement('div');
      ed.className = 'editable';
      ed.contentEditable = 'true';
      applyColorToText(ed, dColor);
      ed.style.fontSize = computedFontSize + 'px';
      ed.style.fontWeight = el.weight;
      ed.style.fontFamily = el.fontFamily || 'Arial';
      ed.style.lineHeight = getResolvedLineHeight(el);
      ed.style.letterSpacing = (el.letterSpacing || 0) + 'px';
      ed.style.textAlign = el.textAlign || 'left';
      ed.style.width = '100%';
      ed.style.outline = 'none';
      ed.style.whiteSpace = 'pre-wrap';
      ed.style.wordBreak = 'normal';
      ed.style.overflowWrap = 'normal';
      ed.innerText = dText;
      wireInlineEdit(ed, el, 'text');
      d.appendChild(ed);
    } else {
      // Multi-line static BG: inline span + `box-decoration-break: clone` and a
      // linear-gradient background so each wrapped line gets its own background
      // rectangle that hugs that line's content + padding. background-size
      // encodes horizontal coverage. The animated path (when animateBg + a typing
      // anim) takes over at hover-preview time via setupTextLineBgs(), which
      // measures the laid-out lines and stages per-line overlays.
      const textBlock = document.createElement('div');
      textBlock.style.textAlign = el.textAlign || 'left';
      textBlock.style.width = '100%';
      // Prevent the div's strut (inherited body font-size ~16px) from being taller
      // than the actual text content and pushing it downward. Match the span's values.
      textBlock.style.fontSize = computedFontSize + 'px';
      textBlock.style.lineHeight = getResolvedLineHeight(el);

      const span = document.createElement(el.htmlTag || 'span');
      span.innerText = dText;
      applyColorToText(span, dColor);
      span.style.fontSize = computedFontSize + 'px';
      span.style.fontWeight = el.weight;
      span.style.fontFamily = el.fontFamily || 'Arial';
      span.style.lineHeight = getResolvedLineHeight(el);
      span.style.letterSpacing = (el.letterSpacing || 0) + 'px';
      span.style.wordBreak = 'normal';
      span.style.overflowWrap = 'normal';

      if (el.hasBg) {
        const lr = el.bgPadL !== undefined ? el.bgPadL : 8;
        const tb = el.bgPadV !== undefined ? el.bgPadV : 4;
        const cov = el.bgCoverage !== undefined ? el.bgCoverage : 100;
        const opa = (el.bgOpacity !== undefined ? el.bgOpacity : 100) / 100;
        const bgRgba = hexToRgba(el.bg || '#000000', opa);
        span.style.display = 'inline';
        span.style.backgroundImage = `linear-gradient(${bgRgba}, ${bgRgba})`;
        span.style.backgroundRepeat = 'no-repeat';
        span.style.backgroundPosition = 'left center';
        span.style.backgroundSize = `${cov}% 100%`;
        span.style.padding = `${tb}px ${lr}px`;
        span.style.setProperty('box-decoration-break', 'clone');
        span.style.setProperty('-webkit-box-decoration-break', 'clone');
      }

      textBlock.appendChild(span);
      d.appendChild(textBlock);
    }
  } else if (el.type === 'rect') {
    d.classList.add('shape-rect');
    d.style.borderRadius = (el.radius || 0) + 'px';
    const fill = document.createElement('div');
    fill.style.cssText = `position:absolute;inset:0;background:${dColor};border-radius:${el.radius || 0}px;opacity:${(el.opacity !== undefined ? el.opacity : 100) / 100};pointer-events:none;`;
    d.appendChild(fill);
    const stroke = strokeOverlayNode(el);
    if (stroke) d.appendChild(stroke);
  } else if (el.type === 'circle') {
    d.classList.add('shape-circle');
    d.style.borderRadius = '50%';
    const fill = document.createElement('div');
    fill.style.cssText = `position:absolute;inset:0;background:${dColor};border-radius:50%;opacity:${(el.opacity !== undefined ? el.opacity : 100) / 100};pointer-events:none;`;
    d.appendChild(fill);
    const stroke = strokeOverlayNode(el);
    if (stroke) d.appendChild(stroke);
  } else if (el.type === 'pixel') {
    d.classList.add('shape-pixel');
    const fillOpacity = (el.opacity !== undefined ? el.opacity : 100) / 100;
    const fill = document.createElement('div');
    fill.style.cssText = `position:absolute;inset:0;opacity:${fillOpacity};pointer-events:none;`;
    // Gradient support for pixel shapes: SVG fill="" can't accept CSS
    // linear-gradient strings, so we materialise the gradient as an
    // inline <linearGradient> def and reference it via url(#id).
    const svgGrad = svgFillForCssColor(dColor, el.id);
    const pathFillAttr = svgGrad ? svgGrad.fillAttr : dColor;
    const defs = svgGrad ? svgGrad.defs : '';
    fill.innerHTML = `<svg viewBox="0 0 578.52 556.76" width="100%" height="100%" preserveAspectRatio="none">${defs}<path fill="${pathFillAttr}" d="M290.78,0h-74.15v60.23h-123.75v125.78H0v184.74h92.88v125.78h123.5v60.23h65.55c152.85,0,287.74-123.5,287.74-277.62S444.14,0,290.78,0"/></svg>`;
    d.appendChild(fill);
    const stroke = strokeOverlayNode(el);
    if (stroke) d.appendChild(stroke);
  } else if (el.type === 'line') {
    d.classList.add('shape-line');
    d.style.background = dColor;
  } else if (el.type === 'button') {
    d.classList.add('button');
    d.style.color = dColor;
    const computedFontSize = el.autoSize ? calculateAutoSize(el, dText) : (el.fontSize || 14);
    d.style.fontSize = computedFontSize + 'px';
    d.style.fontFamily = el.fontFamily || 'Arial';
    d.style.borderRadius = (el.radius || 0) + 'px';
    const paddingTB = el.paddingTB !== undefined ? el.paddingTB : 0;
    const paddingLR = el.paddingLR !== undefined ? el.paddingLR : 16;
    d.style.padding = `${paddingTB}px ${paddingLR}px`;
    d.style.display = 'flex';
    const vAlignMap = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
    d.style.alignItems = vAlignMap[el.verticalAlign || 'middle'];
    const alignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
    d.style.justifyContent = alignMap[el.textAlign || 'center'];
    d.style.textAlign = el.textAlign || 'center';
    // Fill goes on a dedicated absolute layer so its opacity is independent of
    // the text and the stroke overlay.
    const fill = document.createElement('div');
    fill.style.cssText = `position:absolute;inset:0;background:${dBg};border-radius:${el.radius || 0}px;opacity:${(el.opacity !== undefined ? el.opacity : 100) / 100};pointer-events:none;`;
    d.appendChild(fill);
    if (editing) {
      const ed = document.createElement('span');
      ed.className = 'editable';
      ed.contentEditable = 'true';
      applyColorToText(ed, dColor);
      ed.style.fontSize = computedFontSize + 'px';
      ed.style.fontFamily = el.fontFamily || 'Arial';
      ed.style.fontWeight = el.weight || '600';
      ed.style.letterSpacing = (el.letterSpacing || 0) + 'px';
      ed.style.outline = 'none';
      // override .editable defaults so we match the non-edit <span> layout —
      // the editable also needs an inline display so its content sizes to
      // the text rather than stretching to the wrapper's full width.
      ed.style.display = 'inline';
      ed.style.width = 'auto';
      ed.style.wordBreak = 'normal';
      if (el.wrapText) {
        ed.style.whiteSpace = 'normal';
        ed.style.maxWidth = '100%';
      }
      // position:relative makes the text stack above the absolute fill child,
      // since positioned elements paint after non-positioned ones by default.
      ed.style.position = 'relative';
      ed.innerText = dText;
      wireInlineEdit(ed, el, 'text');
      d.appendChild(ed);
    } else {
      const span = document.createElement('span');
      span.innerText = dText;
      applyColorToText(span, dColor);
      span.style.fontWeight = el.weight || '600';
      span.style.letterSpacing = (el.letterSpacing || 0) + 'px';
      span.style.position = 'relative';
      if (el.wrapText) {
        span.style.wordBreak = 'normal';
        span.style.whiteSpace = 'normal';
        span.style.maxWidth = '100%';
      } else {
        span.style.whiteSpace = 'nowrap';
      }
      d.appendChild(span);
    }
    const stroke = strokeOverlayNode(el);
    if (stroke) d.appendChild(stroke);
  } else if (el.type === 'image') {
    d.classList.add('image');
    const holder = document.createElement('div');
    holder.style.width = '100%';
    holder.style.height = '100%';
    holder.style.borderRadius = (el.radius || 0) + 'px';
    holder.style.overflow = 'hidden';
    holder.style.position = 'relative';

    if (dAssetId) {
      const img = document.createElement('img');
      img.src = state.assets[dAssetId] || dAssetId;
      img.style.objectFit = el.objectFit || 'contain';
      img.style.width = '100%';
      img.style.height = '100%';
      holder.appendChild(img);
    } else {
      holder.style.background = 'repeating-linear-gradient(45deg, #1f2330, #1f2330 6px, #272c3a 6px, #272c3a 12px)';
      holder.style.display = 'flex';
      holder.style.alignItems = 'center';
      holder.style.justifyContent = 'center';
      holder.style.color = '#9aa1b6';
      holder.style.fontSize = '11px';
      holder.textContent = 'Drag image here';
    }
    d.appendChild(holder);
  }


  // Dimming elements not in isolated group
  if (state.isolatedGroupId) {
    if (el.groupId !== state.isolatedGroupId) {
      d.style.opacity = '0.3';
      d.style.pointerEvents = 'none';
    } else {
      d.style.zIndex = '1000'; // pop it to front visually
    }
  }

  // mouse interactions (drag, select)
  d.addEventListener('mousedown', (e) => onElementMouseDown(e, el, canvasCtx));

  d.addEventListener('dblclick', (e) => {
    e.stopPropagation();

    // Enter Isolation Mode if it's a group
    if (el.groupId && state.isolatedGroupId !== el.groupId) {
      state.isolatedGroupId = el.groupId;
      // Mask + image groups: when the dbl-click hits the IMAGE side of
      // the pair (which happens whenever the user clicks the visible
      // masked area — the mask shape's own children are visibility:
      // hidden, so hits often land on the image wrapper), re-route the
      // selection to the mask SHAPE. The shape's silhouette IS the
      // visible content the user is targeting, so selecting the image
      // and surfacing image props was confusing. The earlier symptom
      // was: outline shows the mask, properties panel shows the image.
      let targetEl = el;
      if (el.type === 'image' && typeof findMaskAbove === 'function') {
        const maskAbove = findMaskAbove(canvasCtx, el);
        if (maskAbove && maskAbove.isMask) targetEl = maskAbove;
      }
      state.layerSelection = [targetEl.id];
      state.selectedElementId = targetEl.id;
      render();
      return;
    }

    // Enter inline edit for text/button
    if (el.type === 'text' || el.type === 'button') {
      // Data lock: a dynamic text slot is read-only while locked — select but don't edit.
      if (state.dataMerge && state.dataMerge.locked && typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, 'text')) {
        state.activeCanvasId = canvasCtx.id;
        state.selectedElementId = el.id;
        state.layerSelection = [el.id];
        render(true);
        showCanvasNotification('This element is a dynamic slot and editing is locked.', {
          type: 'warning',
          button: {
            text: 'Unlock data edit',
            onClick: () => {
              state.dataMerge.locked = false;
              pushHistory();
              renderVersionSwitcher();
              render();
              showCanvasNotification('Data editing unlocked');
            }
          }
        });
        return;
      }
      state.activeCanvasId = canvasCtx.id;
      state.selectedElementId = el.id;
      state.editingElementId = el.id;
      render();
      // focus and select content
      setTimeout(() => {
        const ed = workspaceEl.querySelector(`.el[data-id="${el.id}"] .editable`);
        if (ed) {
          ed.focus();
          const r = document.createRange();
          r.selectNodeContents(ed);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
        }
      }, 0);
    }
  });
  if (el.hidden) d.style.setProperty('display', 'none', 'important');

  // Mask layer: the shape's visible body is suppressed (fills, strokes etc.
  // already rendered above are hidden). The wrapper stays in the DOM so the
  // user can still select / move / resize the mask via the Layers panel —
  // when selected, the normal selection outline + handles appear.
  if (_isActiveMask) {
    Array.from(d.children).forEach(child => {
      if (child.style) child.style.visibility = 'hidden';
    });
  }

  // Image masking (v0.16.50 revamp): clip the image with CSS `clip-path`
  // using inline shape functions (`inset`, `ellipse`, `polygon`, `path`).
  // Replaces the old inline-SVG `<mask>` + `mask: url(#…)` approach which
  // was browser-flaky any time the file was opened on a browser other
  // than the one that saved it. See `buildMaskClipPath` for the full
  // rationale. Same data model, same visual result — every shape Adflow
  // supports (rect, circle, pixel) maps cleanly to a clip-path inline
  // shape, including non-zero rotation.
  if (el.type === 'image' && canvasCtx) {
    const maskAbove = findMaskAbove(canvasCtx, el);
    if (maskAbove) {
      const cp = buildMaskClipPath(maskAbove, el);
      d.style.setProperty('clip-path', cp);
      d.style.setProperty('-webkit-clip-path', cp);
    }
  }

  return d;
}

function wireInlineEdit(ed, el, key) {
  const isDyn = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, key);
  const originalVal = isDyn ? (state.dataMerge.rows[state.dataMerge.activeVersion]?.[state.dataMerge.mappings[dmSlotKey(el) + '::' + key]] || '') : el[key];
  const originalWidth = el.width;

  const commit = () => {
    ed.removeEventListener('blur', commit);
    const isDynNow = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, key);
    const newVal = ed.innerText;
    if (originalVal !== newVal) {
      if (isDynNow) {
        if (!state.dataMerge.locked) dmWriteCell(el, key, newVal);
      } else {
        el[key] = newVal;
      }
      if (el.linkGroupId) {
        const group = state.linkGroups?.[el.linkGroupId];
        if (group && group.liveLink) {
          state.canvases.forEach(c => {
            c.elements.forEach(targetEl => {
              if (targetEl.linkGroupId === el.linkGroupId && targetEl.id !== el.id) {
                applyLinkSync(el, targetEl, group);
              }
            });
          });
        }
      }
      pushHistory();
      if (typeof checkButtonFontSizeWarning === 'function') checkButtonFontSizeWarning(el);
    }
    state.editingElementId = null;
    state.commitRenderTimer = setTimeout(() => {
      state.commitRenderTimer = null;
      render(true);
    }, 0);
  };
  const cancel = () => {
    ed.removeEventListener('blur', commit);
    const isDynNow = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, key);
    if (!isDynNow) {
      el[key] = originalVal;
      if (el.type === 'button' && el.autoHug) {
        el.width = originalWidth;
      }
    }
    state.editingElementId = null;
    render();
  };
  ed.addEventListener('blur', commit);
  ed.addEventListener('keydown', (e) => {
    e.stopPropagation(); // don't fire global shortcuts while typing
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  ed.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.originalEvent || e).clipboardData.getData('text/plain');
    if (document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, text);
    } else {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      selection.deleteFromDocument();
      const range = selection.getRangeAt(0);
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });
  ed.addEventListener('input', () => {
    // A field that is a dynamic slot must never write the template here: when unlocked
    // the cell write happens on commit; when locked it's read-only (write nothing).
    const isDyn = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, key);
    if (!isDyn) el[key] = ed.innerText;
    if (el.type === 'button' && el.autoHug) {
      const probe = isDyn ? Object.assign({}, el, { text: ed.innerText }) : el;
      el.width = measureButtonWidth(probe);
      const wrapper = ed.closest('.el');
      if (wrapper) wrapper.style.width = el.width + 'px';
    }
    if (el.type === 'text' && el.autoSize) {
      const probe = isDyn ? Object.assign({}, el, { text: ed.innerText }) : el;
      const size = calculateAutoSize(probe, ed.innerText);
      ed.style.fontSize = size + 'px';
      const sizeInput = propsEl.querySelector('[data-k="fontSize"]');
      if (sizeInput) sizeInput.value = size;
    }
    if (el.type === 'button' && el.autoSize) {
      const probe = isDyn ? Object.assign({}, el, { text: ed.innerText }) : el;
      const size = calculateAutoSize(probe, ed.innerText);
      ed.style.fontSize = size + 'px';
      const sizeInput = propsEl.querySelector('[data-k="fontSize"]');
      if (sizeInput) sizeInput.value = size;
      if (size < 6) {
        showCanvasNotification('Text size will be unreadable', { type: 'warning' });
      }
    }
  });
  // don't let mouse-drag inside the editor move the element
  ed.addEventListener('mousedown', (e) => e.stopPropagation());
}

function createBadge(el) {
  const _isDynSlot = !!(el.dynamic && Object.keys(el.dynamic).some(k => el.dynamic[k])) ||
    (typeof dmFieldActive === 'function' && dmFieldsForType(el.type).some(f => dmFieldActive(el, f)));
  if (_isDynSlot || el.linkGroupId) {
    const badge = document.createElement('div');
    badge.className = 'dm-badge';
    let icons = '';
    if (el.linkGroupId) {
      // Filled chain glyph so it matches the bolt's solid silhouette (same visual weight).
      icons += '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>';
    }
    if (_isDynSlot) {
      icons += '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    }
    badge.innerHTML = icons;
    return badge;
  }
  return null;
}

function multiSelectionOverlay(elements, isGroup = false) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  elements.forEach(el => {
    if (el.x < minX) minX = el.x;
    if (el.y < minY) minY = el.y;
    if (el.x + el.width > maxX) maxX = el.x + el.width;
    if (el.y + el.height > maxY) maxY = el.y + el.height;
  });

  const w = document.createElement('div');
  w.className = 'selection-outline multi';
  if (isGroup) w.classList.add('group');
  w.style.left = (minX - 1.5) + 'px';
  w.style.top = (minY - 1.5) + 'px';
  w.style.width = (maxX - minX + 3) + 'px';
  w.style.height = (maxY - minY + 3) + 'px';
  if (isGroup) w.style.borderColor = '#ffab00';

  if (isGroup) {
    elements.forEach(el => {
      const childBox = document.createElement('div');
      childBox.style.position = 'absolute';
      childBox.style.left = (el.x - minX) + 'px';
      childBox.style.top = (el.y - minY) + 'px';
      childBox.style.width = el.width + 'px';
      childBox.style.height = el.height + 'px';
      childBox.style.border = 'calc(1px / var(--z, 1)) solid rgba(255, 171, 0, 0.3)';
      childBox.style.pointerEvents = 'none';
      w.appendChild(childBox);
    });
  }

  // Draw badges for elements inside the multi-selection outline.
  // Using static badge wrappers positioned relative to the outer bounding box.
  elements.forEach(el => {
    const badge = createBadge(el);
    if (badge) {
      const badgeWrapper = document.createElement('div');
      badgeWrapper.style.position = 'absolute';
      badgeWrapper.style.left = (el.x - minX) + 'px';
      badgeWrapper.style.top = (el.y - minY) + 'px';
      badgeWrapper.style.width = el.width + 'px';
      badgeWrapper.style.height = el.height + 'px';
      badgeWrapper.style.transform = `rotate(${el.rotation || 0}deg)`;
      badgeWrapper.style.pointerEvents = 'none';
      badgeWrapper.appendChild(badge);
      w.appendChild(badgeWrapper);
    }
  });

  ['top', 'right', 'bottom', 'left'].forEach(edge => {
    const eDiv = document.createElement('div');
    eDiv.className = 'selection-edge ' + edge;
    eDiv.style.position = 'absolute';
    eDiv.style.pointerEvents = 'all';
    eDiv.style.cursor = 'move';
    eDiv.style.backgroundColor = 'rgba(0,0,0,0)';
    if (edge === 'top') {
      eDiv.style.top = 'calc(-4px / var(--z, 1))';
      eDiv.style.left = '0';
      eDiv.style.width = '100%';
      eDiv.style.height = 'calc(8px / var(--z, 1))';
    } else if (edge === 'bottom') {
      eDiv.style.bottom = 'calc(-4px / var(--z, 1))';
      eDiv.style.left = '0';
      eDiv.style.width = '100%';
      eDiv.style.height = 'calc(8px / var(--z, 1))';
    } else if (edge === 'left') {
      eDiv.style.top = '0';
      eDiv.style.left = 'calc(-4px / var(--z, 1))';
      eDiv.style.width = 'calc(8px / var(--z, 1))';
      eDiv.style.height = '100%';
    } else if (edge === 'right') {
      eDiv.style.top = '0';
      eDiv.style.right = 'calc(-4px / var(--z, 1))';
      eDiv.style.width = 'calc(8px / var(--z, 1))';
      eDiv.style.height = '100%';
    }
    eDiv.addEventListener('mousedown', (e) => {
      onElementMouseDown(e, elements[0], getActiveCanvas());
    });
    w.appendChild(eDiv);
  });

  ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(corner => {
    const h = document.createElement('div');
    h.className = 'handle ' + corner;
    h.addEventListener('mousedown', (e) => onMultiResizeMouseDown(e, elements, { x: minX, y: minY, w: maxX - minX, h: maxY - minY }, corner));
    w.appendChild(h);
  });
  const rot = document.createElement('div');
  rot.className = 'handle rot';
  rot.addEventListener('mousedown', (e) => onMultiRotateMouseDown(e, elements, { x: minX, y: minY, w: maxX - minX, h: maxY - minY }));
  w.appendChild(rot);
  return w;
}

// Safezone overlay: a faint cyan rect inset from the canvas edges + a centerpoint
// crosshair. Inset is a percentage of the smaller canvas dimension. Skinny smaller
// banners (160×600, 728×90) get a slightly larger factor — at 5% they end up with
// barely-visible margins, but bumping them to 8% keeps the safezone readable without
// affecting larger formats like 970×250.
function safezoneOverlay(c) {
  const w = document.createElement('div');
  w.className = 'safezone-overlay';
  const minDim = Math.min(c.width, c.height);
  const aspect = Math.max(c.width, c.height) / minDim;
  const standardFactor = (state.safezoneStandard !== undefined ? state.safezoneStandard : 5) / 100;
  const narrowFactor = (state.safezoneNarrow !== undefined ? state.safezoneNarrow : 8) / 100;
  const factor = (minDim < 200 && aspect > 3) ? narrowFactor : standardFactor;
  const inset = Math.max(4, Math.round(minDim * factor));
  w.style.left = inset + 'px';
  w.style.top = inset + 'px';
  w.style.width = (c.width - inset * 2) + 'px';
  w.style.height = (c.height - inset * 2) + 'px';
  const cross = document.createElement('div');
  cross.className = 'safezone-cross';
  w.appendChild(cross);
  return w;
}

function isolatedGroupOverlay(elements) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  elements.forEach(el => {
    if (el.x < minX) minX = el.x;
    if (el.y < minY) minY = el.y;
    if (el.x + el.width > maxX) maxX = el.x + el.width;
    if (el.y + el.height > maxY) maxY = el.y + el.height;
  });

  const w = document.createElement('div');
  w.className = 'selection-outline isolated';
  w.style.left = (minX - 1.5) + 'px';
  w.style.top = (minY - 1.5) + 'px';
  w.style.width = (maxX - minX + 3) + 'px';
  w.style.height = (maxY - minY + 3) + 'px';
  w.style.border = 'calc(1.5px / var(--z, 1)) solid rgba(255, 171, 0, 0.4)';
  w.style.pointerEvents = 'none';
  return w;
}

function moveGuideOverlay(el, c) {
  const container = document.createElement('div');
  container.className = 'move-guide-overlay';
  container.style.position = 'absolute';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9998';

  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;

  // Initialize or fallback to old panDist/panDir if undefined:
  if (el.panFromX === undefined && el.panFromY === undefined) {
    const dist = el.panDist !== undefined ? el.panDist : 50;
    if (el.panDir === 'L') { el.panFromX = dist; el.panFromY = 0; }
    else if (el.panDir === 'R') { el.panFromX = -dist; el.panFromY = 0; }
    else if (el.panDir === 'U') { el.panFromX = 0; el.panFromY = dist; }
    else if (el.panDir === 'D') { el.panFromX = 0; el.panFromY = -dist; }
    else { el.panFromX = 0; el.panFromY = -50; }
  }

  const dx = el.panFromX;
  const dy = el.panFromY;
  const px = cx + dx;
  const py = cy + dy;

  const mx = el.panMidX !== undefined ? el.panMidX : dx / 2;
  const my = el.panMidY !== undefined ? el.panMidY : dy / 2;
  const mpx = cx + mx;
  const mpy = cy + my;

  // 1. Create SVG curved path
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.position = 'absolute';
  svg.style.inset = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', `M ${px} ${py} Q ${mpx} ${mpy} ${cx} ${cy}`);
  path.setAttribute('stroke', 'var(--accent-base)');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-dasharray', '4,4');
  path.setAttribute('fill', 'none');

  svg.appendChild(path);
  container.appendChild(svg);

  // 2. Create start circle handle
  const handle = document.createElement('div');
  handle.className = 'move-guide-handle';
  handle.style.position = 'absolute';
  handle.style.left = px + 'px';
  handle.style.top = py + 'px';
  handle.style.width = '12px';
  handle.style.height = '12px';
  handle.style.borderRadius = '50%';
  handle.style.background = 'var(--accent-base)';
  handle.style.border = '2px solid var(--text-bright)';
  handle.style.transform = 'translate(-50%, -50%)';
  handle.style.cursor = 'move';
  handle.style.pointerEvents = 'all';
  handle.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5)';
  handle.title = 'Drag to change starting location for Move effect';

  // 3. Create midpoint circle handle
  const midHandle = document.createElement('div');
  midHandle.className = 'move-guide-mid-handle';
  midHandle.style.position = 'absolute';
  midHandle.style.left = mpx + 'px';
  midHandle.style.top = mpy + 'px';
  midHandle.style.width = '9px';
  midHandle.style.height = '9px';
  midHandle.style.borderRadius = '50%';
  midHandle.style.background = 'var(--accent-light)';
  midHandle.style.border = '1.5px solid var(--text-bright)';
  midHandle.style.transform = 'translate(-50%, -50%)';
  midHandle.style.cursor = 'move';
  midHandle.style.pointerEvents = 'all';
  midHandle.style.boxShadow = '0 1px 4px rgba(0,0,0,0.5)';
  midHandle.title = 'Drag to curve the Move motion path';

  // 4. Add drag listeners for start handle
  handle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const z = state.zoom || 1;
    const canvasDom = e.target.closest('.canvas');
    const canvasRect = canvasDom.getBoundingClientRect();
    const startDx = el.panFromX;
    const startDy = el.panFromY;

    const onMove = (ev) => {
      const mouseCanvasX = (ev.clientX - canvasRect.left) / z;
      const mouseCanvasY = (ev.clientY - canvasRect.top) / z;
      let newDx = Math.round(mouseCanvasX - cx);
      let newDy = Math.round(mouseCanvasY - cy);

      if (ev.shiftKey) {
        const dist = Math.hypot(newDx, newDy);
        let ang = Math.atan2(newDy, newDx);
        const snapStep = Math.PI / 4; // 45 degrees
        ang = Math.round(ang / snapStep) * snapStep;
        newDx = Math.round(dist * Math.cos(ang));
        newDy = Math.round(dist * Math.sin(ang));
      }

      el.panFromX = newDx;
      el.panFromY = newDy;

      const px = cx + newDx;
      const py = cy + newDy;

      // Update midpoint if it tracks the start handle automatically
      const mx = el.panMidX !== undefined ? el.panMidX : newDx / 2;
      const my = el.panMidY !== undefined ? el.panMidY : newDy / 2;
      const mpx = cx + mx;
      const mpy = cy + my;

      midHandle.style.left = mpx + 'px';
      midHandle.style.top = mpy + 'px';

      // Update SVG path
      path.setAttribute('d', `M ${px} ${py} Q ${mpx} ${mpy} ${cx} ${cy}`);

      // Update handle position
      handle.style.left = px + 'px';
      handle.style.top = py + 'px';

      // Update input elements in Sidebar if they are visible
      const fromXInput = document.getElementById('prop-pan-from-x');
      const fromYInput = document.getElementById('prop-pan-from-y');
      if (fromXInput) fromXInput.value = newDx;
      if (fromYInput) fromYInput.value = newDy;

      const midXInput = document.getElementById('prop-pan-mid-x');
      const midYInput = document.getElementById('prop-pan-mid-y');
      if (midXInput && el.panMidX === undefined) midXInput.value = Math.round(newDx / 2);
      if (midYInput && el.panMidY === undefined) midYInput.value = Math.round(newDy / 2);

      // Trigger temporary preview update during drag
      startEffectPreview(el);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (el.panFromX !== startDx || el.panFromY !== startDy) {
        pushHistory();
        renderProps();
      }
      render(true);
      startEffectPreview(el);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });

  // 5. Add drag listeners for midpoint handle
  midHandle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const z = state.zoom || 1;
    const canvasDom = e.target.closest('.canvas');
    const canvasRect = canvasDom.getBoundingClientRect();
    const startMx = el.panMidX !== undefined ? el.panMidX : el.panFromX / 2;
    const startMy = el.panMidY !== undefined ? el.panMidY : el.panFromY / 2;

    const onMoveMid = (ev) => {
      const mouseCanvasX = (ev.clientX - canvasRect.left) / z;
      const mouseCanvasY = (ev.clientY - canvasRect.top) / z;
      let newMx = Math.round(mouseCanvasX - cx);
      let newMy = Math.round(mouseCanvasY - cy);

      if (ev.shiftKey) {
        const dist = Math.hypot(newMx, newMy);
        let ang = Math.atan2(newMy, newMx);
        const snapStep = Math.PI / 4; // 45 degrees
        ang = Math.round(ang / snapStep) * snapStep;
        newMx = Math.round(dist * Math.cos(ang));
        newMy = Math.round(dist * Math.sin(ang));
      }

      el.panMidX = newMx;
      el.panMidY = newMy;

      const mpx = cx + newMx;
      const mpy = cy + newMy;

      const px = cx + el.panFromX;
      const py = cy + el.panFromY;

      // Update SVG path
      path.setAttribute('d', `M ${px} ${py} Q ${mpx} ${mpy} ${cx} ${cy}`);

      // Update midHandle position
      midHandle.style.left = mpx + 'px';
      midHandle.style.top = mpy + 'px';

      // Update inputs in sidebar if visible
      const midXInput = document.getElementById('prop-pan-mid-x');
      const midYInput = document.getElementById('prop-pan-mid-y');
      if (midXInput) midXInput.value = newMx;
      if (midYInput) midYInput.value = newMy;

      // Trigger temporary preview update during drag
      startEffectPreview(el);
    };

    const onUpMid = () => {
      window.removeEventListener('mousemove', onMoveMid);
      window.removeEventListener('mouseup', onUpMid);
      if (el.panMidX !== startMx || el.panMidY !== startMy) {
        pushHistory();
        renderProps();
      }
      render(true);
      startEffectPreview(el);
    };

    window.addEventListener('mousemove', onMoveMid);
    window.addEventListener('mouseup', onUpMid);
  });

  container.appendChild(handle);
  container.appendChild(midHandle);
  return container;
}

function findElementById(id) {
  for (const c of state.canvases) {
    const found = c.elements.find(e => e.id === id);
    if (found) return { element: found, canvas: c };
  }
  return null;
}

function placeholderOverlay(el) {
  const w = document.createElement('div');
  w.className = 'placeholder-highlight-overlay';
  w.style.position = 'absolute';
  w.style.left = (el.x - 2) + 'px';
  w.style.top = (el.y - 2) + 'px';
  w.style.width = (el.width + 4) + 'px';
  w.style.height = (el.height + 4) + 'px';
  w.style.transform = `rotate(${el.rotation || 0}deg)`;
  w.style.pointerEvents = 'none';
  w.style.zIndex = '99999';

  const hint = document.createElement('div');
  hint.className = 'placeholder-hint-text';
  hint.textContent = 'Drop to replace image';
  w.appendChild(hint);

  return w;
}

function createAssetDragImage(asset) {
  const src = asset.elements || [];
  if (src.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  src.forEach(e => {
    minX = Math.min(minX, e.x); minY = Math.min(minY, e.y);
    maxX = Math.max(maxX, e.x + e.width); maxY = Math.max(maxY, e.y + e.height);
  });
  const bw = maxX - minX, bh = maxY - minY;

  const padding = 4;
  const canvas = document.createElement('canvas');
  canvas.width = bw + padding * 2;
  canvas.height = bh + padding * 2;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let accentColor = '#7c5cff';
  const computedStyle = getComputedStyle(document.documentElement);
  const accentVal = computedStyle.getPropertyValue('--accent-base').trim();
  if (accentVal) accentColor = accentVal;

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  const offX = padding - minX;
  const offY = padding - minY;

  src.forEach(e => {
    ctx.save();
    const cx = e.x + offX + e.width / 2;
    const cy = e.y + offY + e.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(((e.rotation || 0) * Math.PI) / 180);
    ctx.beginPath();
    const w = e.width;
    const h = e.height;
    if (e.type === 'circle') {
      const r = Math.min(w, h) / 2;
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    } else {
      const rad = e.radius || 0;
      if (rad > 0 && typeof ctx.roundRect === 'function') {
        ctx.roundRect(-w / 2, -h / 2, w, h, rad);
      } else {
        ctx.rect(-w / 2, -h / 2, w, h);
      }
    }
    ctx.stroke();
    ctx.restore();
  });

  return {
    canvas,
    offsetX: bw / 2 + padding,
    offsetY: bh / 2 + padding
  };
}

function selectionOverlay(el) {
  const w = document.createElement('div');
  w.className = 'selection-outline';
  w.style.left = (el.x - 1.5) + 'px';
  w.style.top = (el.y - 1.5) + 'px';
  w.style.width = (el.width + 3) + 'px';
  w.style.height = (el.height + 3) + 'px';
  w.style.transform = `rotate(${el.rotation || 0}deg)`;

  // A line is a stroke, not a box: 2 endpoint handles (drag to change length/angle),
  // the standard rotation handle, and a distinct thickness handle opposite it.
  if (el.type === 'line') {
    ['w', 'e'].forEach(end => {
      const h = document.createElement('div');
      h.className = 'handle ' + end;
      h.style.cursor = 'move';
      h.addEventListener('mousedown', (e) => onLineEndpointMouseDown(e, el, end));
      w.appendChild(h);
    });
    const rotL = document.createElement('div');
    rotL.className = 'handle rot';
    rotL.addEventListener('mousedown', (e) => onRotateMouseDown(e, el));
    w.appendChild(rotL);
    const thick = document.createElement('div');
    thick.className = 'handle thickness';
    thick.title = 'Drag to change line thickness';
    thick.style.cssText = 'bottom:calc(-20px / var(--z, 1));left:50%;transform:translateX(-50%);border-radius:50%;background:#10b981;cursor:ns-resize;';
    thick.addEventListener('mousedown', (e) => onLineThicknessMouseDown(e, el));
    w.appendChild(thick);
    const lineBadge = createBadge(el);
    if (lineBadge) w.appendChild(lineBadge);
    return w;
  }

  ['top', 'right', 'bottom', 'left'].forEach(edge => {
    const eDiv = document.createElement('div');
    eDiv.className = 'selection-edge ' + edge;
    eDiv.style.position = 'absolute';
    eDiv.style.pointerEvents = 'all';
    eDiv.style.cursor = 'move';
    eDiv.style.backgroundColor = 'rgba(0,0,0,0)';
    if (edge === 'top') {
      eDiv.style.top = 'calc(-4px / var(--z, 1))';
      eDiv.style.left = '0';
      eDiv.style.width = '100%';
      eDiv.style.height = 'calc(8px / var(--z, 1))';
    } else if (edge === 'bottom') {
      eDiv.style.bottom = 'calc(-4px / var(--z, 1))';
      eDiv.style.left = '0';
      eDiv.style.width = '100%';
      eDiv.style.height = 'calc(8px / var(--z, 1))';
    } else if (edge === 'left') {
      eDiv.style.top = '0';
      eDiv.style.left = 'calc(-4px / var(--z, 1))';
      eDiv.style.width = 'calc(8px / var(--z, 1))';
      eDiv.style.height = '100%';
    } else if (edge === 'right') {
      eDiv.style.top = '0';
      eDiv.style.right = 'calc(-4px / var(--z, 1))';
      eDiv.style.width = 'calc(8px / var(--z, 1))';
      eDiv.style.height = '100%';
    }
    eDiv.addEventListener('mousedown', (e) => {
      onElementMouseDown(e, el, getActiveCanvas());
    });
    w.appendChild(eDiv);
  });

  const baseAngles = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };
  const cursors = ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize'];

  ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(corner => {
    const h = document.createElement('div');
    h.className = 'handle ' + corner;
    
    // Calculate rotated cursor style
    const rotation = el.rotation || 0;
    const baseAngle = baseAngles[corner];
    const finalAngle = (baseAngle + rotation) % 360;
    const normalizedAngle = (finalAngle + 360) % 180;
    const index = Math.round(normalizedAngle / 45) % 4;
    h.style.cursor = cursors[index];

    h.addEventListener('mousedown', (e) => onResizeMouseDown(e, el, corner));
    w.appendChild(h);
  });
  const rot = document.createElement('div');
  rot.className = 'handle rot';
  rot.addEventListener('mousedown', (e) => onRotateMouseDown(e, el));
  w.appendChild(rot);

  if (['rect', 'button', 'image'].includes(el.type)) {
    const radHandle = document.createElement('div');
    radHandle.className = 'handle radius';
    radHandle.title = 'Corner Radius';
    const r = Math.min(el.radius || 0, el.width / 2, el.height / 2);
    radHandle.style.left = `calc(${r}px + 4px / var(--z, 1))`;
    radHandle.style.top = `calc(${r}px + 4px / var(--z, 1))`;
    radHandle.addEventListener('mousedown', (e) => onRadiusMouseDown(e, el));
    w.appendChild(radHandle);
  }

  // Draw badge for single element selection outline
  const badge = createBadge(el);
  if (badge) {
    w.appendChild(badge);
  }

  return w;
}

function onRadiusMouseDown(e, el) {
  e.preventDefault();
  e.stopPropagation();
  const startX = e.clientX;
  const startY = e.clientY;
  const startRadius = el.radius || 0;
  const z = state.zoom || 1;
  const maxR = Math.min(el.width, el.height) / 2;

  function move(me) {
    const dx = (me.clientX - startX) / z;
    const dy = (me.clientY - startY) / z;
    const delta = (dx + dy) / 2;
    let newR = Math.round(startRadius + delta);
    newR = Math.max(0, Math.min(maxR, newR));
    el.radius = newR;
    render();
  }
  function up() {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    pushHistory();
  }
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

// Line endpoint drag — the grabbed end follows the cursor while the opposite end
// stays pinned, so length (width) and angle (rotation) both update from the two
// points. Dragging mostly sideways changes length; up/down rotates the line.
function onLineEndpointMouseDown(e, el, end) {
  if (isSpaceDown) return;
  e.stopPropagation();
  e.preventDefault();
  const z = state.zoom || 1;
  const canvasRect = e.target.closest('.canvas').getBoundingClientRect();
  const o = { x: el.x, y: el.y, w: el.width, h: el.height, rot: el.rotation || 0 };
  const rad = o.rot * Math.PI / 180;
  const dir = { x: Math.cos(rad), y: Math.sin(rad) };
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  // The endpoint that stays put while the other follows the cursor.
  const anchor = (end === 'e')
    ? { x: cx - (o.w / 2) * dir.x, y: cy - (o.w / 2) * dir.y }
    : { x: cx + (o.w / 2) * dir.x, y: cy + (o.w / 2) * dir.y };

  const onMove = (ev) => {
    const px = (ev.clientX - canvasRect.left) / z;
    const py = (ev.clientY - canvasRect.top) / z;
    let len = Math.hypot(px - anchor.x, py - anchor.y);
    if (len < 4) len = 4;
    // Axis angle is always measured left-end -> right-end.
    let ang = Math.atan2(py - anchor.y, px - anchor.x);
    if (end === 'w') ang += Math.PI;
    if (ev.shiftKey) ang = Math.round(ang * 180 / Math.PI / 15) * 15 * Math.PI / 180;
    const nd = { x: Math.cos(ang), y: Math.sin(ang) };
    const sign = (end === 'e') ? 1 : -1;
    const ncx = anchor.x + sign * (len / 2) * nd.x;
    const ncy = anchor.y + sign * (len / 2) * nd.y;
    el.width = Math.round(len);
    el.rotation = ((Math.round(ang * 180 / Math.PI) % 360) + 360) % 360;
    el.x = Math.round(ncx - el.width / 2);
    el.y = Math.round(ncy - o.h / 2);
    render();
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if (el.width !== o.w || el.rotation !== o.rot || el.x !== o.x || el.y !== o.y) pushHistory();
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// Line thickness drag — the bottom handle grows/shrinks `height` symmetrically
// around the line's center, so the stroke thickens in place.
function onLineThicknessMouseDown(e, el) {
  if (isSpaceDown) return;
  e.stopPropagation();
  e.preventDefault();
  const z = state.zoom || 1;
  const startX = e.clientX, startY = e.clientY;
  const o = { h: el.height };
  const cyFixed = el.y + el.height / 2;
  const rad = (el.rotation || 0) * Math.PI / 180;
  const cos = Math.cos(-rad), sin = Math.sin(-rad);

  const onMove = (ev) => {
    const dx = (ev.clientX - startX) / z;
    const dy = (ev.clientY - startY) / z;
    const ldy = dx * sin + dy * cos;            // perpendicular (local-y) drag
    const nh = Math.max(1, Math.round(o.h + 2 * ldy));
    el.height = nh;
    el.y = Math.round(cyFixed - nh / 2);
    render();
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if (el.height !== o.h) pushHistory();
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// ============================================================================
// Element drag / resize
// ============================================================================
function onElementMouseDown(e, el, canvasCtx) {
  if (state.activeTool === 'zoom') return;
  if (state.activeTool === 'text') {
    if ((el.type === 'text' || el.type === 'button') && !e.target.classList.contains('selection-edge')) {
      e.stopPropagation();
      if (state.dataMerge && state.dataMerge.locked && typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, 'text')) {
        state.activeCanvasId = canvasCtx.id;
        state.selectedElementId = el.id;
        state.layerSelection = [el.id];
        render(true);
        showCanvasNotification('This element is a dynamic slot and editing is locked.', {
          type: 'warning',
          button: {
            text: 'Unlock data edit',
            onClick: () => {
              state.dataMerge.locked = false;
              pushHistory();
              renderVersionSwitcher();
              render();
              showCanvasNotification('Data editing unlocked');
            }
          }
        });
        return;
      }
      state.activeCanvasId = canvasCtx.id;
      state.selectedElementId = el.id;
      state.layerSelection = [el.id];
      state.editingElementId = el.id;
      render();
      setTimeout(() => {
        const ed = workspaceEl.querySelector(`.el[data-id="${el.id}"] .editable`);
        if (ed) {
          ed.focus();
          const r = document.createRange();
          r.selectNodeContents(ed);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
        }
      }, 0);
      return;
    } else {
      // Non-text element clicked under Text Tool: bubble up to canvas mousedown listener to draw/place a text box
      return;
    }
  }
  if (isSpaceDown || e.button === 1) {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    scrollStartX = canvasArea.scrollLeft;
    scrollStartY = canvasArea.scrollTop;
    canvasArea.style.cursor = 'var(--cur-grabbing, grabbing)';
    e.stopPropagation();
    e.preventDefault(); // Prevents middle mouse autoscroll
    return;
  }
  if (state.editingElementId === el.id) return; // editing: don't drag
  e.stopPropagation();

  let isMulti = state.layerSelection?.includes(el.id) && state.layerSelection.length > 1;
  const wasSelected = state.activeCanvasId === canvasCtx.id && (state.selectedElementId === el.id || isMulti) && state.editingElementId === null;

  state.activeCanvasId = canvasCtx.id;
  state.editingElementId = null;

  const isIsolated = state.isolatedGroupId && state.isolatedGroupId === el.groupId;

  if (e.shiftKey) {
    if (!state.layerSelection) state.layerSelection = [];
    const idsToToggle = (el.groupId && !isIsolated) ? canvasCtx.elements.filter(x => x.groupId === el.groupId).map(x => x.id) : [el.id];

    if (state.layerSelection.includes(el.id)) {
      state.layerSelection = state.layerSelection.filter(id => !idsToToggle.includes(id));
    } else {
      idsToToggle.forEach(id => { if (!state.layerSelection.includes(id)) state.layerSelection.push(id); });
    }
    state.selectedElementId = state.layerSelection.length === 1 ? state.layerSelection[0] : null;
    isMulti = state.layerSelection.length > 1;
  } else if (!isMulti) {
    if (el.groupId && !isIsolated) {
      state.layerSelection = canvasCtx.elements.filter(x => x.groupId === el.groupId).map(x => x.id);
      state.selectedElementId = null;
      isMulti = true;
    } else {
      state.selectedElementId = el.id;
      state.layerSelection = [el.id];
      isMulti = false;
    }
  }

  if (!wasSelected || e.shiftKey) render();

  const startX = e.clientX, startY = e.clientY;
  const z = state.zoom || 1;
  const targets = (state.layerSelection && state.layerSelection.length > 1)
    ? canvasCtx.elements.filter(x => state.layerSelection.includes(x.id))
    : (state.layerSelection?.includes(el.id) ? [el] : []);

  if (targets.length === 0) return;
  const origPos = targets.map(t => ({ x: t.x, y: t.y }));
  let crossCanvasCtx = null;
  let tempClones = null;

  const snapTargetsX = [];
  const snapTargetsY = [];
  const snapMaster = state.snapEnabled !== false;

  if (snapMaster && state.snapToElements !== false) {
    canvasCtx.elements.forEach(other => {
      if (targets.some(t => t.id === other.id)) return;
      snapTargetsX.push(other.x, other.x + other.width / 2, other.x + other.width);
      snapTargetsY.push(other.y, other.y + other.height / 2, other.y + other.height);
    });
  }

  if (snapMaster && state.snapToCanvas !== false) {
    snapTargetsX.push(0, canvasCtx.width / 2, canvasCtx.width);
    snapTargetsY.push(0, canvasCtx.height / 2, canvasCtx.height);
  }

  if (snapMaster && state.snapToGuides !== false && state.showRulers) {
    (state.guides || []).forEach(g => {
      if (g.type === 'v') snapTargetsX.push(g.pos - canvasCtx.workspaceX);
      if (g.type === 'h') snapTargetsY.push(g.pos - canvasCtx.workspaceY);
    });
  }

  const onMove = (ev) => {
    state.isDragging = true;

    if (ev.altKey && !tempClones) {
      tempClones = targets.map((t, i) => {
        const copy = JSON.parse(JSON.stringify(t));
        copy.id = uid() + '_temp';
        copy.x = origPos[i].x;
        copy.y = origPos[i].y;
        copy.locked = true;
        return copy;
      });
      canvasCtx.elements.push(...tempClones);
    } else if (!ev.altKey && tempClones) {
      canvasCtx.elements = canvasCtx.elements.filter(e => !tempClones.includes(e));
      tempClones = null;
    }

    let cvsId = null;
    const elsFromPoint = document.elementsFromPoint(ev.clientX, ev.clientY);

    // Check if dragging a single image element that has an assetId
    let targetPlaceholderId = null;
    if (targets.length === 1 && targets[0].type === 'image' && targets[0].assetId) {
      const targetElNode = elsFromPoint
        .map(node => node.closest && node.closest('.el'))
        .find(elNode => elNode && !targets.some(t => t.id === elNode.dataset.id));
      if (targetElNode) {
        const found = findElementById(targetElNode.dataset.id);
        if (found && found.element.type === 'image' && found.element.id !== targets[0].id) {
          targetPlaceholderId = found.element.id;
        }
      }
    }
    state.dragOverPlaceholderId = targetPlaceholderId;

    const canvasNode = elsFromPoint.find(n => n.classList && n.classList.contains('canvas'));
    if (canvasNode) {
      const frameNode = canvasNode.closest('.canvas-frame');
      if (frameNode) cvsId = frameNode.dataset.canvasId;
    }

    if (cvsId && cvsId !== canvasCtx.id && !targetPlaceholderId) {
      crossCanvasCtx = state.canvases.find(c => c.id === cvsId);
      state.dropTargetCanvasId = cvsId;
    } else {
      crossCanvasCtx = null;
      state.dropTargetCanvasId = null;
    }

    let dx = (ev.clientX - startX) / z;
    let dy = (ev.clientY - startY) / z;

    if (ev.shiftKey) {
      if (Math.abs(dx) > Math.abs(dy)) dy = 0;
      else dx = 0;
    }

    let snapX = null, snapY = null;
    if (!ev.ctrlKey && !ev.metaKey) {
      const primary = el;
      const orig = origPos[targets.indexOf(el)];
      let minDx = (state.snapDistance !== undefined ? state.snapDistance : 5) / z, minDy = (state.snapDistance !== undefined ? state.snapDistance : 5) / z;

      // Horizontal snapping
      if (!ev.shiftKey || dx !== 0) {
        const pxs = [orig.x + dx, orig.x + dx + primary.width / 2, orig.x + dx + primary.width];
        pxs.forEach(px => {
          snapTargetsX.forEach(tx => {
            if (Math.abs(px - tx) < minDx) { minDx = Math.abs(px - tx); dx += tx - px; snapX = tx; }
          });
        });
      }

      // Vertical snapping
      if (!ev.shiftKey || dy !== 0) {
        const pys = [orig.y + dy, orig.y + dy + primary.height / 2, orig.y + dy + primary.height];
        pys.forEach(py => {
          snapTargetsY.forEach(ty => {
            if (Math.abs(py - ty) < minDy) { minDy = Math.abs(py - ty); dy += ty - py; snapY = ty; }
          });
        });
      }
    }

    if (ev.shiftKey && (!ev.ctrlKey && !ev.metaKey)) {
      const orig = origPos[targets.indexOf(el)];
      if (Math.abs(dx) > 0 && dy === 0) snapY = orig.y + el.height / 2;
      if (Math.abs(dy) > 0 && dx === 0) snapX = orig.x + el.width / 2;
    }

    targets.forEach((t, i) => {
      let nx = origPos[i].x + dx;
      let ny = origPos[i].y + dy;
      if (ev.ctrlKey || ev.metaKey) {
        nx = Math.round(nx / 10) * 10;
        ny = Math.round(ny / 10) * 10;
      }
      const mx = Math.round(nx);
      const my = Math.round(ny);
      if (mx !== t.x || my !== t.y) {
        if (t.autoArranged) delete t.autoArranged;
      }
      t.x = mx;
      t.y = my;
    });

    const ap = document.getElementById('panel-section-assets');
    document.querySelectorAll('#asset-list [data-folder-id]').forEach(f => f.style.background = '');
    if (ap) {
      const rect = ap.getBoundingClientRect();
      const overAp = (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom);
      if (overAp) {
        ap.style.background = 'var(--accent-dark)';
        const isLeftDrag = (ev.clientX - rect.left < 45);
        if (!isLeftDrag) {
          const hoveredEls = document.elementsFromPoint(ev.clientX, ev.clientY);
          const folderRow = hoveredEls.map(el => el.closest && el.closest('[data-folder-id]')).find(Boolean);
          if (folderRow) {
            folderRow.style.background = 'var(--accent-base)';
          } else {
            const assetRow = hoveredEls.map(el => el.closest && el.closest('[data-asset-id]')).find(Boolean);
            if (assetRow) {
              const targetAsset = (state.assetLibrary || []).find(a => a.id === assetRow.dataset.assetId);
              if (targetAsset && targetAsset.folderId) {
                const targetFolderRow = document.querySelector(`#asset-list [data-folder-id="${targetAsset.folderId}"]`);
                if (targetFolderRow) {
                  targetFolderRow.style.background = 'var(--accent-base)';
                }
              }
            }
          }
        }
      } else {
        ap.style.background = '';
      }
    }

    state.activeSmartGuides = { x: snapX, y: snapY };
    render(true);
  };
  const onUp = async (ev) => {
    state.isDragging = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    state.activeSmartGuides = null;
    state.dropTargetCanvasId = null;

    if (state.dragOverPlaceholderId) {
      const placeholderId = state.dragOverPlaceholderId;
      state.dragOverPlaceholderId = null;

      const target = targets[0];
      if (target && target.type === 'image' && target.assetId) {
        const found = findElementById(placeholderId);
        if (found) {
          found.element.assetId = target.assetId;
          found.element.name = target.name || found.element.name;

          if (!ev.altKey) {
            // Remove the source element from its canvas
            canvasCtx.elements = canvasCtx.elements.filter(e => e.id !== target.id);
          } else {
            // Revert position of the dragged element
            targets.forEach((t, i) => {
              t.x = origPos[i].x;
              t.y = origPos[i].y;
            });
          }

          // Clean up temp clones if any
          if (tempClones) {
            canvasCtx.elements = canvasCtx.elements.filter(e => !tempClones.includes(e));
            tempClones = null;
          }

          // Select the updated placeholder
          state.selectedElementId = found.element.id;
          state.layerSelection = [found.element.id];

          pushHistory();
          render();
          return;
        }
      }
    }

    const ap = document.getElementById('panel-section-assets');
    let droppedOnAssets = false;
    let targetFolderId = null;
    if (ap) {
      const rect = ap.getBoundingClientRect();
      droppedOnAssets = (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom);
      ap.style.background = '';
      if (droppedOnAssets) {
        const isLeftDrag = (ev.clientX - rect.left < 45);
        if (!isLeftDrag) {
          const hoveredEls = document.elementsFromPoint(ev.clientX, ev.clientY);
          const folderRow = hoveredEls.map(el => el.closest && el.closest('[data-folder-id]')).find(Boolean);
          if (folderRow) {
            targetFolderId = folderRow.dataset.folderId;
          } else {
            const assetRow = hoveredEls.map(el => el.closest && el.closest('[data-asset-id]')).find(Boolean);
            if (assetRow) {
              const targetAsset = (state.assetLibrary || []).find(a => a.id === assetRow.dataset.assetId);
              if (targetAsset) {
                targetFolderId = targetAsset.folderId || null;
              }
            }
          }
        }
      }
    }
    document.querySelectorAll('#asset-list [data-folder-id]').forEach(f => f.style.background = '');

    if (droppedOnAssets) {
      targets.forEach((t, i) => {
        t.x = origPos[i].x;
        t.y = origPos[i].y;
      });
      if (tempClones) {
        canvasCtx.elements = canvasCtx.elements.filter(e => !tempClones.includes(e));
        tempClones = null;
      }
      const targetFolder = targetFolderId ? (state.assetFolders || []).find(f => f.id === targetFolderId) : null;
      if (targetFolder && targetFolder.readOnly) {
        await showAdflowAlert("Cannot add assets to a read-only folder.");
        render();
        return;
      }
      await saveSelectionAsAsset(targetFolderId);
      return;
    }

    if (tempClones) {
      canvasCtx.elements = canvasCtx.elements.filter(e => !tempClones.includes(e));
      tempClones = null;
    }

    const moved = targets.some((t, i) => t.x !== origPos[i].x || t.y !== origPos[i].y);

    if (ev.altKey && moved) {
      const groupMap = {};
      const copies = targets.map((t) => {
        const copy = JSON.parse(JSON.stringify(t));
        copy.id = uid();
        if (copy.groupId) {
          if (!groupMap[copy.groupId]) groupMap[copy.groupId] = uid();
          copy.groupId = groupMap[copy.groupId];
        }
        return copy;
      });

      targets.forEach((t, i) => {
        t.x = origPos[i].x;
        t.y = origPos[i].y;
      });

      if (crossCanvasCtx && crossCanvasCtx.id !== canvasCtx.id) {
        copies.forEach(c => {
          c.x = c.x + canvasCtx.workspaceX - crossCanvasCtx.workspaceX;
          c.y = c.y + canvasCtx.workspaceY - crossCanvasCtx.workspaceY;
          crossCanvasCtx.elements.push(c);
        });
        state.activeCanvasId = crossCanvasCtx.id;
      } else {
        copies.forEach(c => insertAtGroupEnd(canvasCtx.elements, c));
      }
      state.layerSelection = copies.map(x => x.id);
      state.selectedElementId = copies[copies.length - 1].id;
      pushHistory();
      render();
    } else {
      if (crossCanvasCtx && crossCanvasCtx.id !== canvasCtx.id) {
        targets.forEach(t => {
          canvasCtx.elements = canvasCtx.elements.filter(e => e.id !== t.id);
          t.x = t.x + canvasCtx.workspaceX - crossCanvasCtx.workspaceX;
          t.y = t.y + canvasCtx.workspaceY - crossCanvasCtx.workspaceY;
          crossCanvasCtx.elements.push(t);
        });
        state.activeCanvasId = crossCanvasCtx.id;
        pushHistory();
        render();
      } else {
        if (moved) {
          pushHistory();
          render();
        } else {
          const activeCanvas = document.querySelector(`.canvas-frame[data-canvas-id="${canvasCtx.id}"] .canvas`);
          if (activeCanvas) {
            activeCanvas.querySelectorAll('.smart-guide').forEach(n => n.remove());
          }
        }
      }
    }
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function onResizeMouseDown(e, el, corner) {
  if (isSpaceDown) return;
  e.stopPropagation();
  e.preventDefault();
  const z = state.zoom || 1;
  const startX = e.clientX, startY = e.clientY;
  const o = { x: el.x, y: el.y, w: el.width, h: el.height, fs: el.fontSize };
  const rad = (el.rotation || 0) * Math.PI / 180;
  const cos = Math.cos(-rad), sin = Math.sin(-rad);

  const cos_cw = Math.cos(rad);
  const sin_cw = Math.sin(rad);

  // Find local coordinates of the pinned point (which doesn't move during resize)
  let lx_pinned, ly_pinned;
  switch (corner) {
    case 'se': lx_pinned = 0;   ly_pinned = 0;   break; // NW is pinned
    case 'sw': lx_pinned = o.w; ly_pinned = 0;   break; // NE is pinned
    case 'ne': lx_pinned = 0;   ly_pinned = o.h; break; // SW is pinned
    case 'nw': lx_pinned = o.w; ly_pinned = o.h; break; // SE is pinned
    case 'n':  lx_pinned = o.w / 2; ly_pinned = o.h; break; // S is pinned
    case 's':  lx_pinned = o.w / 2; ly_pinned = 0;   break; // N is pinned
    case 'w':  lx_pinned = o.w; ly_pinned = o.h / 2; break; // E is pinned
    case 'e':  lx_pinned = 0;   ly_pinned = o.h / 2; break; // W is pinned
  }

  // Calculate the global coordinates of the pinned point
  const o_cx = o.x + o.w / 2;
  const o_cy = o.y + o.h / 2;
  const lx_rel_init = lx_pinned - o.w / 2;
  const ly_rel_init = ly_pinned - o.h / 2;
  const px = o_cx + lx_rel_init * cos_cw - ly_rel_init * sin_cw;
  const py = o_cy + lx_rel_init * sin_cw + ly_rel_init * cos_cw;

  const onMove = (ev) => {
    const dx = (ev.clientX - startX) / z;
    const dy = (ev.clientY - startY) / z;
    
    const isAlt = ev.altKey;
    const factor = isAlt ? 2 : 1;
    let ldx = (dx * cos - dy * sin) * factor;
    let ldy = (dx * sin + dy * cos) * factor;

    // Shift or lockRatio = lock aspect ratio. For corners, sync the smaller delta to the
    // dominant one along the original aspect.
    const aspect = o.h / o.w;
    const isLocked = ev.shiftKey || el.lockRatio;
    if (isLocked && ['nw', 'ne', 'sw', 'se'].includes(corner) && o.w > 0 && o.h > 0) {
      const signSame = (corner === 'se' || corner === 'nw') ? 1 : -1;
      if (Math.abs(ldx / o.w) > Math.abs(ldy / o.h)) {
        ldy = signSame * ldx * aspect;
      } else {
        ldx = signSame * ldy / aspect;
      }
    }

    let newW = o.w;
    let newH = o.h;

    if (corner === 'se') { newW = o.w + ldx; newH = o.h + ldy; }
    else if (corner === 'sw') { newW = o.w - ldx; newH = o.h + ldy; }
    else if (corner === 'ne') { newW = o.w + ldx; newH = o.h - ldy; }
    else if (corner === 'nw') { newW = o.w - ldx; newH = o.h - ldy; }
    else if (corner === 'n') { newH = o.h - ldy; }
    else if (corner === 's') { newH = o.h + ldy; }
    else if (corner === 'w') { newW = o.w - ldx; }
    else if (corner === 'e') { newW = o.w + ldx; }

    newW = Math.max(10, newW);
    newH = Math.max(10, newH);

    // Shift or lockRatio on an edge handle: scale the perpendicular axis proportionally,
    // anchored at the center of that axis so the box grows symmetrically.
    if (isLocked && o.w > 0 && o.h > 0) {
      if (corner === 'e' || corner === 'w') {
        newH = Math.max(10, newW * aspect);
      } else if (corner === 'n' || corner === 's') {
        newW = Math.max(10, newH / aspect);
      }
    }

    if (el.type === 'button' && el.autoHug && (Math.abs(ldx) > 2 || Math.abs(ldy) > 2)) {
      el.autoHug = false;
    }

    if (ev.ctrlKey && (el.type === 'text' || el.type === 'button') && o.fs) {
      const isHorizontalOnly = (corner === 'e' || corner === 'w');
      const scale = isHorizontalOnly ? (newW / o.w) : (newH / o.h);
      el.fontSize = Math.max(4, Math.round(o.fs * scale));
    } else if ((el.type === 'text' || el.type === 'button') && o.fs) {
      el.fontSize = o.fs;
    }

    el.width = Math.round(newW);
    el.height = Math.round(newH);

    let cur_lx_pinned = lx_pinned;
    let cur_ly_pinned = ly_pinned;
    if (isAlt) {
      cur_lx_pinned = o.w / 2;
      cur_ly_pinned = o.h / 2;
    }
    const lx_rel_init = cur_lx_pinned - o.w / 2;
    const ly_rel_init = cur_ly_pinned - o.h / 2;
    const px_curr = o_cx + lx_rel_init * cos_cw - ly_rel_init * sin_cw;
    const py_curr = o_cy + lx_rel_init * sin_cw + ly_rel_init * cos_cw;

    let lx_pinned_new = (cur_lx_pinned === 0) ? 0 : (cur_lx_pinned === o.w ? el.width : el.width / 2);
    let ly_pinned_new = (cur_ly_pinned === 0) ? 0 : (cur_ly_pinned === o.h ? el.height : el.height / 2);
    const lx_rel_new = lx_pinned_new - el.width / 2;
    const ly_rel_new = ly_pinned_new - el.height / 2;
    const cx_new = px_curr - (lx_rel_new * cos_cw - ly_rel_new * sin_cw);
    const cy_new = py_curr - (lx_rel_new * sin_cw + ly_rel_new * cos_cw);
    el.x = Math.round(cx_new - el.width / 2);
    el.y = Math.round(cy_new - el.height / 2);
    if (el.x !== o.x || el.y !== o.y || el.width !== o.w || el.height !== o.h || el.fontSize !== o.fs) {
      if (el.autoArranged) delete el.autoArranged;
    }

    render();
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if (el.width !== o.w || el.height !== o.h || el.x !== o.x || el.y !== o.y) {
      pushHistory();
      if (typeof checkButtonFontSizeWarning === 'function') checkButtonFontSizeWarning(el);
    }
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function onMultiResizeMouseDown(e, elements, bb, corner) {
  if (isSpaceDown) return;
  e.stopPropagation();
  e.preventDefault();
  const z = state.zoom || 1;
  const startX = e.clientX, startY = e.clientY;
  const origElements = elements.map(el => ({ x: el.x, y: el.y, w: el.width, h: el.height, fs: el.fontSize }));
  const obb = { ...bb };

  const onMove = (ev) => {
    let dx = (ev.clientX - startX) / z;
    let dy = (ev.clientY - startY) / z;
    let nbb = { ...obb };

    const aspect = obb.h / obb.w;
    const isLocked = ev.shiftKey || elements.some(el => el.lockRatio);
    if (isLocked && ['nw', 'ne', 'sw', 'se'].includes(corner) && obb.w > 0 && obb.h > 0) {
      const signSame = (corner === 'se' || corner === 'nw') ? 1 : -1;
      if (Math.abs(dx / obb.w) > Math.abs(dy / obb.h)) {
        dy = signSame * dx * aspect;
      } else {
        dx = signSame * dy / aspect;
      }
    }

    if (corner === 'se') { nbb.w = Math.max(10, obb.w + dx); nbb.h = Math.max(10, obb.h + dy); }
    if (corner === 'sw') { nbb.x = obb.x + dx; nbb.w = Math.max(10, obb.w - dx); nbb.h = Math.max(10, obb.h + dy); }
    if (corner === 'ne') { nbb.y = obb.y + dy; nbb.w = Math.max(10, obb.w + dx); nbb.h = Math.max(10, obb.h - dy); }
    if (corner === 'nw') { nbb.x = obb.x + dx; nbb.y = obb.y + dy; nbb.w = Math.max(10, obb.w - dx); nbb.h = Math.max(10, obb.h - dy); }
    if (corner === 'n') { nbb.y = obb.y + dy; nbb.h = Math.max(10, obb.h - dy); }
    if (corner === 's') { nbb.h = Math.max(10, obb.h + dy); }
    if (corner === 'w') { nbb.x = obb.x + dx; nbb.w = Math.max(10, obb.w - dx); }
    if (corner === 'e') { nbb.w = Math.max(10, obb.w + dx); }

    if (isLocked && obb.w > 0 && obb.h > 0) {
      if (corner === 'e' || corner === 'w') {
        const newH = Math.max(10, nbb.w * aspect);
        nbb.y = obb.y + (obb.h - newH) / 2;
        nbb.h = newH;
      } else if (corner === 'n' || corner === 's') {
        const newW = Math.max(10, nbb.h / aspect);
        nbb.x = obb.x + (obb.w - newW) / 2;
        nbb.w = newW;
      }
    }

    const scaleX = nbb.w / obb.w;
    const scaleY = nbb.h / obb.h;

    elements.forEach((el, i) => {
      const o = origElements[i];
      const nx = Math.round(nbb.x + (o.x - obb.x) * scaleX);
      const ny = Math.round(nbb.y + (o.y - obb.y) * scaleY);
      const nw = Math.round(Math.max(2, o.w * scaleX));
      const nh = Math.round(Math.max(2, o.h * scaleY));
      let nfs = el.fontSize;
      if (o.fs) nfs = Math.max(8, Math.round(o.fs * Math.min(scaleX, scaleY)));
      if (nx !== el.x || ny !== el.y || nw !== el.width || nh !== el.height || nfs !== el.fontSize) {
        if (el.autoArranged) delete el.autoArranged;
      }
      el.x = nx;
      el.y = ny;
      el.width = nw;
      el.height = nh;
      if (o.fs) el.fontSize = nfs;
      if (el.type === 'button' && el.autoHug && (Math.abs(el.width - o.w) > 2 || Math.abs(el.height - o.h) > 2)) {
        el.autoHug = false;
      }
    });
    render(true);
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if (elements[0].width !== origElements[0].w || elements[0].height !== origElements[0].h) {
      pushHistory();
      render();
    }
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function onRotateMouseDown(e, el) {
  if (isSpaceDown) return;
  e.stopPropagation();
  e.preventDefault();
  const z = state.zoom || 1;
  const canvasRect = e.target.closest('.canvas').getBoundingClientRect();
  const cx = canvasRect.left + (el.x + el.width / 2) * z;
  const cy = canvasRect.top + (el.y + el.height / 2) * z;
  const initAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
  const initRot = el.rotation || 0;

  const onMove = (ev) => {
    const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
    let deg = initRot + (angle - initAngle) * (180 / Math.PI);
    if (ev.shiftKey) {
      deg = Math.round(deg / 15) * 15;
    }
    el.rotation = Math.round(deg) % 360;
    render();
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if (el.rotation !== initRot) {
      pushHistory();
      render();
    }
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function onMultiRotateMouseDown(e, elements, bb) {
  if (isSpaceDown) return;
  e.stopPropagation();
  e.preventDefault();
  const z = state.zoom || 1;
  const canvasRect = e.target.closest('.canvas').getBoundingClientRect();
  const cx = canvasRect.left + (bb.x + bb.w / 2) * z;
  const cy = canvasRect.top + (bb.y + bb.h / 2) * z;
  const initAngle = Math.atan2(e.clientY - cy, e.clientX - cx);

  const origElements = elements.map(el => ({
    x: el.x, y: el.y, w: el.width, h: el.height, rot: el.rotation || 0,
    cx: el.x + el.width / 2, cy: el.y + el.height / 2
  }));
  const bbCx = bb.x + bb.w / 2;
  const bbCy = bb.y + bb.h / 2;

  const onMove = (ev) => {
    const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
    let delta = (angle - initAngle) * (180 / Math.PI);
    if (ev.shiftKey) delta = Math.round(delta / 15) * 15;

    const rad = delta * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    elements.forEach((el, i) => {
      const o = origElements[i];
      const dx = o.cx - bbCx;
      const dy = o.cy - bbCy;
      const ncx = bbCx + dx * cos - dy * sin;
      const ncy = bbCy + dx * sin + dy * cos;
      el.x = Math.round(ncx - o.w / 2);
      el.y = Math.round(ncy - o.h / 2);
      el.rotation = Math.round(o.rot + delta) % 360;
    });
    render(true);
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    pushHistory();
    render();
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// ============================================================================
// Canvas-level drag (re-position a canvas in the workspace)
// ============================================================================
function onCanvasHeaderDrag(e, c) {
  if (isSpaceDown || e.button === 1) return;
  e.stopPropagation();
  state.activeCanvasId = c.id;
  state.selectedElementId = null;
  state.editingElementId = null;
  const z = state.zoom || 1;
  const startX = e.clientX, startY = e.clientY;
  const origX = c.workspaceX, origY = c.workspaceY;
  const onMove = (ev) => {
    let nx = origX + (ev.clientX - startX) / z;
    let ny = origY + (ev.clientY - startY) / z;
    if (ev.ctrlKey || ev.metaKey) {
      nx = Math.round(nx / 20) * 20;
      ny = Math.round(ny / 20) * 20;
    }
    c.workspaceX = Math.max(0, Math.round(nx));
    c.workspaceY = Math.max(0, Math.round(ny));
    render();
  };
  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  render();
}

// Click empty workspace area: deselect (on plain click) OR start a marquee
// selection in workspace coords (on drag). The marquee selects intersecting
// elements on the currently active canvas, even when the drag starts well
// outside that canvas's bounds.
canvasArea.addEventListener('mousedown', (e) => {
  if (state.activeTool === 'text' && state.editingElementId) {
    const ed = workspaceEl.querySelector(`.el[data-id="${state.editingElementId}"] .editable`);
    if (ed) ed.blur();
    e.stopPropagation();
    e.preventDefault();
    return;
  }

  if (isSpaceDown || e.button === 1) {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    scrollStartX = canvasArea.scrollLeft;
    scrollStartY = canvasArea.scrollTop;
    canvasArea.style.cursor = 'var(--cur-grabbing, grabbing)';
    e.stopPropagation();
    e.preventDefault();
    return;
  }

  // Zoom tool behavior
  if (state.activeTool === 'zoom' && e.button === 0) {
    const rect = canvasArea.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Avoid scrollbar clicks
    if (mouseX > canvasArea.clientWidth || mouseY > canvasArea.clientHeight) {
      return;
    }
    // Avoid ruler and guide clicks
    if (e.target.closest('#ruler-h, #ruler-v, #ruler-corner, .guide-h, .guide-v, .canvas-auto-align-btn')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startZoom = state.zoom || 0.6;

    // Determine target focus coordinates relative to canvasArea bounds
    const focusX = (canvasArea.scrollLeft + mouseX) / startZoom;
    const focusY = (canvasArea.scrollTop + mouseY) / startZoom;

    let dragDistanceX = 0;
    let dragDistanceY = 0;
    let hasDragged = false;

    const onMove = (ev) => {
      dragDistanceX = ev.clientX - startX;
      dragDistanceY = ev.clientY - startY;

      if (Math.abs(dragDistanceX) > 4 || Math.abs(dragDistanceY) > 4) {
        hasDragged = true;
      }

      if (hasDragged) {
        const dx = dragDistanceX;
        let targetZoom = startZoom * Math.pow(2, dx / 150);
        targetZoom = Math.max(0.6, Math.min(targetZoom, 5.0));

        state.zoom = targetZoom;
        render();

        canvasArea.scrollLeft = focusX * targetZoom - mouseX;
        canvasArea.scrollTop = focusY * targetZoom - mouseY;
      }
    };

    const onUp = (ev) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      if (!hasDragged) {
        const isZoomOut = ev.altKey;
        const targetZoom = isZoomOut
          ? Math.max(0.6, startZoom / 1.5)
          : Math.min(5.0, startZoom * 1.5);

        state.zoom = targetZoom;
        render();

        canvasArea.scrollLeft = focusX * targetZoom - mouseX;
        canvasArea.scrollTop = focusY * targetZoom - mouseY;
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return;
  }

  if (e.target !== canvasArea && e.target !== workspaceEl) return;
  if (e.button !== 0) return;

  // In isolation mode, perform canvas hit-testing to select elements that lie outside the canvas bounds
  if (state.isolatedGroupId) {
    const c = getActiveCanvas();
    const activeCanvasInner = c && document.querySelector(`.canvas-frame[data-canvas-id="${c.id}"] .canvas-inner`);
    if (c && activeCanvasInner) {
      const rect = activeCanvasInner.getBoundingClientRect();
      const z = state.zoom || 1;
      const clickX = (e.clientX - rect.left) / z;
      const clickY = (e.clientY - rect.top) / z;

      const groupElements = c.elements.filter(el => el.groupId === state.isolatedGroupId);
      const hitElement = [...groupElements].reverse().find(el => {
        if (el.hidden) return false;
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const dx = clickX - cx;
        const dy = clickY - cy;
        const rad = -(el.rotation || 0) * Math.PI / 180;
        const rx = dx * Math.cos(rad) - dy * Math.sin(rad) + cx;
        const ry = dx * Math.sin(rad) + dy * Math.cos(rad) + cy;
        return rx >= el.x && rx <= el.x + el.width && ry >= el.y && ry <= el.y + el.height;
      });

      if (hitElement) {
        onElementMouseDown(e, hitElement, c);
        return; // Select the element and do not click through or exit isolation
      }
    }
  }

  if (state.singlePreviewId) state.singlePreviewId = null;
  if (!e.shiftKey) {
    state.selectedElementId = null;
    state.editingElementId = null;
    state.layerSelection = [];
    if (state.isolatedGroupId) state.isolatedGroupId = null;
    render();
  }

  // Marquee in workspace coordinates — workspaceEl is the absolute container
  // every canvas frame is positioned inside.
  const wsRect = workspaceEl.getBoundingClientRect();
  const z = state.zoom || 1;
  const startX = (e.clientX - wsRect.left) / z;
  const startY = (e.clientY - wsRect.top) / z;

  const selBox = document.createElement('div');
  selBox.className = 'workspace-marquee';
  selBox.style.cssText = `position:absolute; border:1px solid #7c5cff; background:rgba(124,92,255,0.1); pointer-events:none; z-index:999999; left:${startX}px; top:${startY}px; width:0; height:0;`;
  workspaceEl.appendChild(selBox);

  let isDraggingSelection = false;

  const onMove = (ev) => {
    const curX = (ev.clientX - wsRect.left) / z;
    const curY = (ev.clientY - wsRect.top) / z;
    if (!isDraggingSelection && (Math.abs(curX - startX) > 2 || Math.abs(curY - startY) > 2)) {
      isDraggingSelection = true;
    }
    if (!isDraggingSelection) return;
    const x = Math.min(startX, curX);
    const y = Math.min(startY, curY);
    const w = Math.abs(curX - startX);
    const h = Math.abs(curY - startY);
    selBox.style.left = x + 'px';
    selBox.style.top = y + 'px';
    selBox.style.width = w + 'px';
    selBox.style.height = h + 'px';
  };

  const onUp = (ev) => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    selBox.remove();
    if (!isDraggingSelection) return;

    const curX = (ev.clientX - wsRect.left) / z;
    const curY = (ev.clientY - wsRect.top) / z;
    const rx = Math.min(startX, curX);
    const ry = Math.min(startY, curY);
    const rw = Math.abs(curX - startX);
    const rh = Math.abs(curY - startY);

    // If the marquee touches a canvas that isn't currently active, focus it
    // first so the user's selection lands on the canvas they're aiming at.
    let touchedCanvas = state.canvases.find(c => c.id === state.activeCanvasId);
    for (const cv of state.canvases) {
      const overlaps = !(rx > cv.workspaceX + cv.width || rx + rw < cv.workspaceX || ry > cv.workspaceY + cv.height || ry + rh < cv.workspaceY);
      if (overlaps) { touchedCanvas = cv; if (cv.id === state.activeCanvasId) break; }
    }
    if (touchedCanvas && touchedCanvas.id !== state.activeCanvasId) {
      state.activeCanvasId = touchedCanvas.id;
    }
    const c = touchedCanvas;
    if (!c) { render(); return; }

    // Marquee in canvas-local coords.
    const localX = rx - c.workspaceX;
    const localY = ry - c.workspaceY;

    const selectedIds = new Set();
    c.elements.forEach(el => {
      if (el.hidden || el.locked) return;
      if (el.persistent === false && el.frameId !== state.activeFrameId) return;
      if (state.isolatedGroupId && el.groupId !== state.isolatedGroupId) return;
      const intersect = !(
        el.x > localX + rw ||
        el.x + el.width < localX ||
        el.y > localY + rh ||
        el.y + el.height < localY
      );
      if (!intersect) return;
      if (el.groupId && !state.isolatedGroupId) {
        c.elements.filter(x => x.groupId === el.groupId).forEach(x => selectedIds.add(x.id));
      } else {
        selectedIds.add(el.id);
      }
    });

    if (selectedIds.size > 0) {
      if (e.shiftKey) {
        selectedIds.forEach(id => { if (!state.layerSelection.includes(id)) state.layerSelection.push(id); });
      } else {
        state.layerSelection = Array.from(selectedIds);
      }
      state.selectedElementId = state.layerSelection[state.layerSelection.length - 1];
    }
    render();
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
});

window.addEventListener('mousemove', (e) => {
  if (isPanning) {
    canvasArea.scrollLeft = scrollStartX - (e.clientX - panStartX);
    canvasArea.scrollTop = scrollStartY - (e.clientY - panStartY);
    e.preventDefault();
  }
});

window.addEventListener('mouseup', () => {
  if (isPanning) {
    isPanning = false;
    canvasArea.style.cursor = isSpaceDown ? 'var(--cur-grab, grab)' : '';
    checkCanvasesInView();
  }
});

canvasArea.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (state.isPreviewMode) return;

  const oldZoom = state.zoom || 0.6;
  const zoomStep = state.zoomStep !== undefined ? state.zoomStep : 0.1;
  const direction = Math.sign(e.deltaY);
  let newZoom = oldZoom - direction * zoomStep;
  newZoom = Math.max(0.6, Math.min(newZoom, 5));

  if (newZoom === oldZoom) return;

  state.zoom = newZoom;

  const rect = canvasArea.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const workspaceX = (canvasArea.scrollLeft + mouseX) / oldZoom;
  const workspaceY = (canvasArea.scrollTop + mouseY) / oldZoom;

  render();

  canvasArea.scrollLeft = workspaceX * newZoom - mouseX;
  canvasArea.scrollTop = workspaceY * newZoom - mouseY;
}, { passive: false });

let outOfBoundsTimeout = null;
canvasArea.addEventListener('scroll', () => {
  if (outOfBoundsTimeout) clearTimeout(outOfBoundsTimeout);
  outOfBoundsTimeout = setTimeout(checkCanvasesInView, 200);
});

// ============================================================================
async function openValidatorDetails(initialCanvas, initialTab = 'specs') {
  // Re-calculate size of the selected canvas dynamically before rendering
  await updateCanvasSizeSync(initialCanvas);

  const modalId = `val-modal-${Date.now()}`;
  let activeDetailsId = initialCanvas.id;
  let activeTab = initialTab; // 'specs' | 'a11y' | 'brand'

  const generateModalContent = (focusedCanvasId, currentTab) => {
    activeDetailsId = focusedCanvasId;
    activeTab = currentTab || activeTab;

    let sidebarHtml = '';
    state.canvases.forEach((c, index) => {
      const isFocused = c.id === focusedCanvasId;
      const hasErrors = c._valErrors && c._valErrors.length > 0;
      const hasA11y = c._valA11y && c._valA11y.length > 0;
      const hasBrand = c._valBrand && c._valBrand.length > 0;

      let statusIcon = getCheckIcon('#10b981', 13);
      let statusColor = '#10b981';
      if (hasErrors) {
        statusIcon = getWarningIcon('#ef4444', 13);
        statusColor = '#ef4444';
      } else if (hasA11y || hasBrand) {
        statusIcon = getWarningIcon('#f97316', 13);
        statusColor = '#f97316';
      }
      
      let itemBg = 'transparent';
      let itemColor = 'var(--text-main)';
      let itemFontWeight = 'normal';
      let itemBorder = '1px solid transparent';
      
      if (isFocused) {
        itemBg = 'var(--accent-dark)';
        itemColor = 'var(--text-bright)';
        itemFontWeight = 'bold';
        itemBorder = '1px solid var(--accent-base)';
      }
      
      const kbText = c._valKb ? `${c._valKb}KB` : 'calc...';
      
      sidebarHtml += `
        <button class="val-sidebar-item" data-canvas-id="${c.id}" title="View validation results for canvas ${c.width}×${c.height}" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 6px;
          border: ${itemBorder};
          background: ${itemBg};
          color: ${itemColor};
          cursor: pointer;
          font-size: 12px;
          width: 100%;
          text-align: left;
          font-weight: ${itemFontWeight};
          transition: all 0.2s ease;
          margin-bottom: 4px;
        " onmouseover="if(!this.classList.contains('active')) this.style.background='var(--bg-input)'" onmouseout="if(!this.classList.contains('active')) this.style.background='${itemBg}'">
          <span>${index + 1}. ${c.width}×${c.height}</span>
          <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
            <span style="opacity: 0.85;">${kbText}</span>
            <span style="color:${statusColor}; font-weight: bold;">${statusIcon}</span>
          </div>
        </button>
      `;
    });

    const settings = state.validationSettings || {};
    const settingsHtml = `
      <div style="margin-top: 16px; border-top: 1px solid var(--border-light); padding-top: 12px; display:flex; flex-direction:column; gap:10px;">
        <div style="font-size:10px; font-weight:600; color:var(--text-label); text-transform:uppercase; letter-spacing:0.05em; padding-left:4px;">Audit Settings</div>
        
        <div style="display:flex; flex-direction:column; gap:5px; padding-left:4px;">
          <div style="font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:2px;">Accessibility</div>
          <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-main); cursor:pointer;">
            <input type="checkbox" class="val-setting-chk" data-setting="textSize" ${settings.textSize !== false ? 'checked' : ''} />
            <span>Text size</span>
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-main); cursor:pointer;">
            <input type="checkbox" class="val-setting-chk" data-setting="contrast" ${settings.contrast !== false ? 'checked' : ''} />
            <span>Contrast ratio</span>
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-main); cursor:pointer;">
            <input type="checkbox" class="val-setting-chk" data-setting="transitionTiming" ${settings.transitionTiming !== false ? 'checked' : ''} />
            <span>Timing & transitions</span>
          </label>

          <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-main); cursor:pointer;">
            <input type="checkbox" class="val-setting-chk" data-setting="infiniteMotion" ${settings.infiniteMotion !== false ? 'checked' : ''} />
            <span>Infinite motion</span>
          </label>
        </div>

        <div style="display:flex; flex-direction:column; gap:5px; padding-left:4px; margin-top:4px;">
          <div style="font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:2px;">Branding Compliance</div>
          <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-main); cursor:pointer;">
            <input type="checkbox" class="val-setting-chk" data-setting="cricos" ${settings.cricos !== false ? 'checked' : ''} />
            <span>CRICOS text</span>
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-main); cursor:pointer;">
            <input type="checkbox" class="val-setting-chk" data-setting="logo" ${settings.logo !== false ? 'checked' : ''} />
            <span>RMIT Logo presence</span>
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-main); cursor:pointer;">
            <input type="checkbox" class="val-setting-chk" data-setting="brandColors" ${settings.brandColors !== false ? 'checked' : ''} />
            <span>Brand colors</span>
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-main); cursor:pointer;">
            <input type="checkbox" class="val-setting-chk" data-setting="brandFonts" ${settings.brandFonts !== false ? 'checked' : ''} />
            <span>Brand fonts</span>
          </label>
        </div>
      </div>
    `;
    
    const focusedCanvas = state.canvases.find(c => c.id === focusedCanvasId) || initialCanvas;
    const errors = focusedCanvas._valErrors || [];
    const limitKb = state.adSizeLimit || 150;
    
    const sizeExceeded = focusedCanvas._valKb && parseFloat(focusedCanvas._valKb) > limitKb;
    const clickTagValue = state.clickTag ? state.clickTag.trim() : '';
    let clickTagValid = false;
    let clickTagMsg = 'Missing clickTag URL';
    if (clickTagValue) {
      try {
        const url = new URL(clickTagValue);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          clickTagMsg = 'Must start with http:// or https://';
        } else if (!url.hostname.includes('.') || url.hostname.split('.').pop().length < 2) {
          clickTagMsg = 'Must have a valid domain extension';
        } else {
          clickTagValid = true;
          clickTagMsg = clickTagValue;
        }
      } catch (e) {
        clickTagMsg = 'Invalid URL format';
      }
    }
    
    let imageElements = focusedCanvas.elements.filter(el => el.type === 'image');
    let missingAssets = [];
    let externalAssets = [];
    
    imageElements.forEach(el => {
      const overrides = (typeof dmDisplay === 'function') ? dmDisplay(el) : {};
      const activeAssetId = overrides.assetId !== undefined ? overrides.assetId : el.assetId;
      let src = state.assets[activeAssetId] || activeAssetId;
      if (!src) {
        missingAssets.push(el.name || `Image Layer (${el.id})`);
      } else if (src.startsWith('http://') || src.startsWith('https://')) {
        externalAssets.push(el.name || `Image Layer (${el.id})`);
      } else if (!state.assets[activeAssetId] && !src.startsWith('data/Elements/')) {
        missingAssets.push(el.name || `Image Layer (${el.id})`);
      }
    });

    const isSizePassed = !sizeExceeded && focusedCanvas._valKb;
    const isClickTagPassed = clickTagValid;
    const isAssetsPassed = externalAssets.length === 0;
    const isMissingPassed = missingAssets.length === 0;
    
    const criteriaHTML = `
      <div style="font-size:13.5px; color:var(--text-label); background:var(--bg-input); padding:20px; border-radius:8px; border:1px solid var(--border-light); display:flex; flex-direction:column; gap:18px; flex:1;">
        <strong style="color:var(--text-bright); font-size:14.5px; border-bottom:1px solid var(--border-light); padding-bottom:8px; margin-bottom:2px; display:block;">Validation Criteria:</strong>
        
        <div style="display:flex; align-items:start; justify-content:space-between; gap:16px;">
          <div style="flex:1; min-width:0;">
            <span style="font-weight:600; color:var(--text-main); display:block; font-size:13px;">ZIP File Size Limit</span>
            <span style="font-size:12px; opacity:0.8;">The compressed package must be under ${limitKb}KB. Current: ${focusedCanvas._valKb ? focusedCanvas._valKb + 'KB' : 'Calculating...'}</span>
            ${sizeExceeded && imageElements.length > 0 ? `
              <div style="margin-top: 8px;">
                <button id="val-criteria-auto-compress" class="btn primary" style="background:#10b981; color:#fff; border:none; padding:5px 12px; font-size:11px; font-weight:600; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; height:24px; line-height:1;" title="Automatically compress all images on this canvas to fit size limit">
                  Auto Compress Images to Fit Limit
                </button>
              </div>
            ` : ''}
          </div>
          <span style="color:${isSizePassed ? '#10b981' : '#ef4444'}; font-weight:bold; font-size:14px; flex-shrink:0; white-space:nowrap;">${isSizePassed ? '✓ Pass' : '✗ Fail'}</span>
        </div>

        <div style="display:flex; align-items:start; justify-content:space-between; gap:16px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
          <div style="flex:1; min-width:0;">
            <span style="font-weight:600; color:var(--text-main); display:block; font-size:13px;">clickTag URL Validation</span>
            <span style="font-size:12px; opacity:0.8; word-break:break-all;">URL: <span style="font-family:monospace; color:${clickTagValid ? 'var(--text-accent)' : '#ef4444'};">${clickTagMsg}</span></span>
          </div>
          <span style="color:${isClickTagPassed ? '#10b981' : '#ef4444'}; font-weight:bold; font-size:14px; flex-shrink:0; white-space:nowrap;">${isClickTagPassed ? '✓ Pass' : '✗ Fail'}</span>
        </div>

        <div style="display:flex; align-items:start; justify-content:space-between; gap:16px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
          <div style="flex:1; min-width:0;">
            <span style="font-weight:600; color:var(--text-main); display:block; font-size:13px;">Local Asset Requirements</span>
            <span style="font-size:12px; opacity:0.8;">All asset files must be bundled locally inside the zip. External assets are forbidden.</span>
            ${externalAssets.length > 0 ? `<span style="display:block; color:#ef4444; font-size:12px; margin-top:4px;">External files: ${externalAssets.join(', ')}</span>` : ''}
          </div>
          <span style="color:${isAssetsPassed ? '#10b981' : '#ef4444'}; font-weight:bold; font-size:14px; flex-shrink:0; white-space:nowrap;">${isAssetsPassed ? '✓ Pass' : '✗ Fail'}</span>
        </div>

        <div style="display:flex; align-items:start; justify-content:space-between; gap:16px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
          <div style="flex:1; min-width:0;">
            <span style="font-weight:600; color:var(--text-main); display:block; font-size:13px;">Broken Asset Check</span>
            <span style="font-size:12px; opacity:0.8;">All image layers must have valid source files.</span>
            ${missingAssets.length > 0 ? `<span style="display:block; color:#ef4444; font-size:12px; margin-top:4px;">Missing source: ${missingAssets.join(', ')}</span>` : ''}
          </div>
          <span style="color:${isMissingPassed ? '#10b981' : '#ef4444'}; font-weight:bold; font-size:14px; flex-shrink:0; white-space:nowrap;">${isMissingPassed ? '✓ Pass' : '✗ Fail'}</span>
        </div>

      </div>
    `;
    
    const errorsHTML = errors.length > 0 ? `
      <div style="font-size:13px; color:#ef4444; background:rgba(239, 68, 68, 0.08); padding:16px; border-radius:8px; border:1px solid rgba(239, 68, 68, 0.2); display:flex; flex-direction:column; gap:6px;">
        <strong style="display:flex; align-items:center; gap:6px; font-size:14px;">
          <span>${getWarningIcon('#ef4444', 14)}</span> Issues Found (${errors.length})
        </strong>
        <ul style="margin:0; padding-left:18px; line-height:1.5; display:flex; flex-direction:column; gap:4px;">
          ${errors.map(err => `<li>${err}</li>`).join('')}
        </ul>
      </div>
    ` : `
      <div style="font-size:13px; color:#10b981; background:rgba(16, 185, 129, 0.08); padding:16px; border-radius:8px; border:1px solid rgba(16, 185, 129, 0.2); display:flex; flex-direction:column; gap:6px;">
        <strong style="display:flex; align-items:center; gap:6px; font-size:14px;">
          <span>${getCheckIcon('#10b981', 14)}</span> All validation checks passed!
        </strong>
        <p style="margin:0; color:var(--text-label); line-height:1.4;">This canvas conforms to all technical compliance rules and file size limits.</p>
      </div>
    `;

    const a11yWarnings = focusedCanvas._valA11y || [];
    const brandWarnings = focusedCanvas._valBrand || [];
    const specsCount = errors.length;
    const a11yCount = a11yWarnings.length;
    const brandCount = brandWarnings.length;

    let tabSelectorHtml = `
      <div class="val-tabs" style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px; margin-bottom: 12px; flex-shrink: 0;">
        <button class="val-tab-btn ${activeTab === 'specs' ? 'active' : ''}" data-tab="specs" style="
          background: ${activeTab === 'specs' ? 'var(--accent-base)' : 'transparent'};
          color: ${activeTab === 'specs' ? 'var(--text-on-accent, var(--text-bright))' : 'var(--text-muted)'};
          border: 1px solid ${activeTab === 'specs' ? 'var(--accent-base)' : 'var(--border-light)'};
          padding: 6px 14px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; outline: none;
        ">Ad Compliance (${specsCount})</button>
        <button class="val-tab-btn ${activeTab === 'a11y' ? 'active' : ''}" data-tab="a11y" style="
          background: ${activeTab === 'a11y' ? 'var(--accent-base)' : 'transparent'};
          color: ${activeTab === 'a11y' ? 'var(--text-on-accent, var(--text-bright))' : 'var(--text-muted)'};
          border: 1px solid ${activeTab === 'a11y' ? 'var(--accent-base)' : 'var(--border-light)'};
          padding: 6px 14px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; outline: none;
        ">Accessibility Audit (${a11yCount})</button>
        <button class="val-tab-btn ${activeTab === 'brand' ? 'active' : ''}" data-tab="brand" style="
          background: ${activeTab === 'brand' ? 'var(--accent-base)' : 'transparent'};
          color: ${activeTab === 'brand' ? 'var(--text-on-accent, var(--text-bright))' : 'var(--text-muted)'};
          border: 1px solid ${activeTab === 'brand' ? 'var(--accent-base)' : 'var(--border-light)'};
          padding: 6px 14px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; outline: none;
        ">Branding Compliance (${brandCount})</button>
      </div>
    `;

    let activeContentHtml = '';
    if (activeTab === 'specs') {
      activeContentHtml = `<div style="display:flex; flex-direction:column; gap:16px; flex:1;">${errorsHTML}${criteriaHTML}</div>`;
    } else if (activeTab === 'a11y') {
      if (a11yCount > 0) {
        activeContentHtml = `
          <div style="font-size:13px; color:#f97316; background:rgba(249, 115, 22, 0.08); padding:16px; border-radius:8px; border:1px solid rgba(249, 115, 22, 0.2); display:flex; flex-direction:column; gap:6px;">
            <strong style="display:flex; align-items:center; gap:6px; font-size:14px;">
              <span>${getWarningIcon('#f97316', 14)}</span> Accessibility Warnings (${a11yCount})
            </strong>
            <ul style="margin:0; padding-left:18px; line-height:1.5; display:flex; flex-direction:column; gap:8px;">
              ${a11yWarnings.map(w => {
                const locateBtn = w.layerId ? `<button class="val-locate-btn" data-layer-id="${w.layerId}" style="background:none; border:none; color:var(--text-accent); cursor:pointer; text-decoration:underline; font-size:11px; padding:0; margin-left:8px; display:inline-block;">Locate Layer</button>` : '';
                return `<li>${w.message}${locateBtn}</li>`;
              }).join('')}
            </ul>
          </div>
        `;
      } else {
        activeContentHtml = `
          <div style="font-size:13px; color:#10b981; background:rgba(16, 185, 129, 0.08); padding:16px; border-radius:8px; border:1px solid rgba(16, 185, 129, 0.2); display:flex; flex-direction:column; gap:6px;">
            <strong style="display:flex; align-items:center; gap:6px; font-size:14px;">
              <span>${getCheckIcon('#10b981', 14)}</span> All accessibility checks passed!
            </strong>
            <p style="margin:0; color:var(--text-label); line-height:1.4;">This canvas conforms to the active accessibility settings.</p>
          </div>
        `;
      }
    } else if (activeTab === 'brand') {
      if (brandCount > 0) {
        activeContentHtml = `
          <div style="font-size:13px; color:#f97316; background:rgba(249, 115, 22, 0.08); padding:16px; border-radius:8px; border:1px solid rgba(249, 115, 22, 0.2); display:flex; flex-direction:column; gap:6px;">
            <strong style="display:flex; align-items:center; gap:6px; font-size:14px;">
              <span>${getWarningIcon('#f97316', 14)}</span> Branding Warnings (${brandCount})
            </strong>
            <ul style="margin:0; padding-left:18px; line-height:1.5; display:flex; flex-direction:column; gap:8px;">
              ${brandWarnings.map(w => {
                const locateBtn = w.layerId ? `<button class="val-locate-btn" data-layer-id="${w.layerId}" style="background:none; border:none; color:var(--text-accent); cursor:pointer; text-decoration:underline; font-size:11px; padding:0; margin-left:8px; display:inline-block;">Locate Layer</button>` : '';
                return `<li>${w.message}${locateBtn}</li>`;
              }).join('')}
            </ul>
          </div>
        `;
      } else {
        activeContentHtml = `
          <div style="font-size:13px; color:#10b981; background:rgba(16, 185, 129, 0.08); padding:16px; border-radius:8px; border:1px solid rgba(16, 185, 129, 0.2); display:flex; flex-direction:column; gap:6px;">
            <strong style="display:flex; align-items:center; gap:6px; font-size:14px;">
              <span>${getCheckIcon('#10b981', 14)}</span> All branding compliance checks passed!
            </strong>
            <p style="margin:0; color:var(--text-label); line-height:1.4;">This canvas conforms to the active RMIT branding settings.</p>
          </div>
        `;
      }
    }
    
    // Calculate elements stats
    const totalCount = focusedCanvas.elements.length;
    const textCount = focusedCanvas.elements.filter(e => e.type === 'text').length;
    const imgCount = focusedCanvas.elements.filter(e => e.type === 'image').length;
    const shapeCount = focusedCanvas.elements.filter(e => ['rect', 'circle', 'triangle', 'star', 'polygon', 'line', 'path'].includes(e.type)).length;
    const btnCount = focusedCanvas.elements.filter(e => e.type === 'button').length;
    
    // Calculate fonts
    const req = getRequiredFonts(focusedCanvas);
    const fontDetails = [];
    let fontKbSum = 0;
    if (req.museo.has(300)) { fontDetails.push({ name: 'Museo 300', size: 32 }); fontKbSum += 32; }
    if (req.museo.has(500)) { fontDetails.push({ name: 'Museo 500', size: 33 }); fontKbSum += 33; }
    if (req.museo.has(700)) { fontDetails.push({ name: 'Museo 700', size: 33 }); fontKbSum += 33; }
    if (req.helvetica.has(300)) { fontDetails.push({ name: 'Helvetica Neue Lt Pro 300', size: 38 }); fontKbSum += 38; }
    if (req.helvetica.has(400)) { fontDetails.push({ name: 'Helvetica Neue Lt Pro 400', size: 39 }); fontKbSum += 39; }
    if (req.helvetica.has(500)) { fontDetails.push({ name: 'Helvetica Neue Lt Pro 500', size: 38 }); fontKbSum += 38; }

    // Calculate images
    const imageDetails = [];
    let imgKbSum = 0;
    focusedCanvas.elements.forEach(el => {
      if (el.type === 'image') {
        let src = state.assets[el.assetId] || el.assetId;
        let kbVal = 0;
        let isLocal = true;
        if (src && src.startsWith('data:')) {
          kbVal = Math.round(src.length * 0.75 / 1024 * 10) / 10;
          isLocal = false;
        } else if (src && urlSizeCache[src]) {
          kbVal = Math.round(urlSizeCache[src] * 10) / 10;
        }
        imgKbSum += kbVal;
        imageDetails.push({
          name: el.name || 'Image Layer',
          size: kbVal,
          isLocal: isLocal,
          dimensions: `${el.width}×${el.height}px`
        });
      }
    });

    // Calculate dynamic data bindings
    const dynamicDetails = [];
    focusedCanvas.elements.forEach(el => {
      if (el.dynamic) {
        Object.keys(el.dynamic).forEach(field => {
          if (el.dynamic[field]) {
            const key = dmSlotKey(el) + '::' + field;
            const mappedColumn = (state.dataMerge && state.dataMerge.mappings) ? state.dataMerge.mappings[key] : null;
            dynamicDetails.push({
              layerName: el.name || baseLayerLabel(el),
              field: field,
              mapping: mappedColumn || '— none —'
            });
          }
        });
      }
    });

    // Construct the breakdown HTML column
    const fontSectionHTML = fontDetails.length > 0 ? fontDetails.map(f => `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-bottom:4px;">
        <span style="color:var(--text-main); font-family:monospace; font-size:11px;">${f.name}</span>
        <span style="color:var(--text-muted); font-size:10px;">~${f.size} KB</span>
      </div>
    `).join('') : '<div style="font-size:11px; color:var(--text-muted); font-style:italic; padding-left:4px;">No custom fonts embedded</div>';

    const imageSectionHTML = imageDetails.length > 0 ? imageDetails.map(img => `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.02); padding-bottom:4px;">
        <div style="display:flex; flex-direction:column; min-width:0; flex:1; padding-right:8px;">
          <span style="color:var(--text-main); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-weight:500; font-size:11px;">${img.name}</span>
          <span style="font-size:10px; color:var(--text-muted);">${img.dimensions} • ${img.isLocal ? 'Template' : 'Upload'}</span>
        </div>
        <span style="color:var(--text-muted); font-size:10.5px; flex-shrink:0;">${img.size ? img.size.toFixed(1) + ' KB' : '0 KB'}</span>
      </div>
    `).join('') : '<div style="font-size:11px; color:var(--text-muted); font-style:italic; padding-left:4px;">No image layers used</div>';

    const dynamicSectionHTML = dynamicDetails.length > 0 ? dynamicDetails.map(d => `
      <div style="display:flex; flex-direction:column; font-size:11px; margin-bottom:6px; background:rgba(255,255,255,0.02); padding:6px 8px; border-radius:4px; border:1px solid rgba(255,255,255,0.04);">
        <span style="color:var(--text-main); font-weight:500;">${d.layerName} <span style="font-weight:normal; color:var(--text-muted); font-size:10.5px;">(${d.field})</span></span>
        <span style="font-size:10px; color:var(--text-accent); font-family:monospace; margin-top:1px;">↳ mapped to {${d.mapping}}</span>
      </div>
    `).join('') : '<div style="font-size:11px; color:var(--text-muted); font-style:italic; padding-left:4px;">No dynamic fields configured</div>';

    const codeKb = 2.5;
    const estimatedTotal = codeKb + fontKbSum + imgKbSum;

    const breakdownHTML = `
      <div style="width:320px; flex-shrink:0; border-left:1px solid var(--border-light); padding-left:14px; display:flex; flex-direction:column; gap:14px; height:100%; overflow-y:auto; padding-right:4px;">
        <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border-light); padding-bottom:8px; flex-shrink:0;">
          <h3 style="margin:0; font-size:15px; font-weight:600; color:var(--text-bright);">Ad size breakdown</h3>
        </div>

        <!-- Element counts -->
        <div style="background:rgba(255,255,255,0.01); padding:10px; border-radius:6px; border:1px solid var(--border-light);">
          <strong style="display:block; font-size:10.5px; text-transform:uppercase; color:var(--text-label); letter-spacing:0.05em; margin-bottom:8px;">Layers &amp; Elements</strong>
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:6px; font-size:11.5px;">
            <div style="display:flex; justify-content:space-between; background:var(--bg-input); padding:4px 6px; border-radius:4px;">
              <span style="color:var(--text-muted); font-size:10.5px;">Total Layers</span>
              <span style="font-weight:600; color:var(--text-bright); font-size:11.5px;">${totalCount}</span>
            </div>
            <div style="display:flex; justify-content:space-between; background:var(--bg-input); padding:4px 6px; border-radius:4px;">
              <span style="color:var(--text-muted); font-size:10.5px;">Text Fields</span>
              <span style="font-weight:600; color:var(--text-bright); font-size:11.5px;">${textCount}</span>
            </div>
            <div style="display:flex; justify-content:space-between; background:var(--bg-input); padding:4px 6px; border-radius:4px;">
              <span style="color:var(--text-muted); font-size:10.5px;">Images</span>
              <span style="font-weight:600; color:var(--text-bright); font-size:11.5px;">${imgCount}</span>
            </div>
            <div style="display:flex; justify-content:space-between; background:var(--bg-input); padding:4px 6px; border-radius:4px;">
              <span style="color:var(--text-muted); font-size:10.5px;">Shapes &amp; BTNs</span>
              <span style="font-weight:600; color:var(--text-bright); font-size:11.5px;">${shapeCount + btnCount}</span>
            </div>
          </div>
        </div>

        <!-- Weight breakdown chart -->
        <div style="background:rgba(255,255,255,0.01); padding:10px; border-radius:6px; border:1px solid var(--border-light);">
          <strong style="display:block; font-size:10.5px; text-transform:uppercase; color:var(--text-label); letter-spacing:0.05em; margin-bottom:8px;">Weight Contribution (Est.)</strong>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <!-- Code progress bar -->
            <div>
              <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
                <span style="color:var(--text-main);">Structure &amp; Libs</span>
                <span style="color:var(--text-muted); font-family:monospace; font-size:10px;">${codeKb.toFixed(1)} KB</span>
              </div>
              <div style="height:4px; background:var(--bg-input); border-radius:2px; overflow:hidden;">
                <div style="width:${Math.min(100, (codeKb / estimatedTotal) * 100)}%; height:100%; background:#3b82f6; border-radius:2px;"></div>
              </div>
            </div>
            <!-- Fonts progress bar -->
            <div>
              <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
                <span style="color:var(--text-main);">Embedded Fonts</span>
                <span style="color:var(--text-muted); font-family:monospace; font-size:10px;">${fontKbSum.toFixed(1)} KB</span>
              </div>
              <div style="height:4px; background:var(--bg-input); border-radius:2px; overflow:hidden;">
                <div style="width:${Math.min(100, (fontKbSum / estimatedTotal) * 100)}%; height:100%; background:#8b5cf6; border-radius:2px;"></div>
              </div>
            </div>
            <!-- Images progress bar -->
            <div>
              <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
                <span style="color:var(--text-main);">Image Assets</span>
                <span style="color:var(--text-muted); font-family:monospace; font-size:10px;">${imgKbSum.toFixed(1)} KB</span>
              </div>
              <div style="height:4px; background:var(--bg-input); border-radius:2px; overflow:hidden;">
                <div style="width:${Math.min(100, (imgKbSum / estimatedTotal) * 100)}%; height:100%; background:#10b981; border-radius:2px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Embedded Fonts list -->
        <div>
          <strong style="display:block; font-size:10.5px; text-transform:uppercase; color:var(--text-label); letter-spacing:0.05em; margin-bottom:6px;">Embedded Fonts</strong>
          ${fontSectionHTML}
        </div>

        <!-- Images list -->
        <div>
          <strong style="display:block; font-size:10.5px; text-transform:uppercase; color:var(--text-label); letter-spacing:0.05em; margin-bottom:6px;">Image Assets (Uncompressed)</strong>
          <div style="max-height:180px; overflow-y:auto; padding-right:2px;">
            ${imageSectionHTML}
          </div>
        </div>

        <!-- Dynamic Slot Variables -->
        <div>
          <strong style="display:block; font-size:10.5px; text-transform:uppercase; color:var(--text-label); letter-spacing:0.05em; margin-bottom:6px;">Dynamic Mappings</strong>
          <div style="max-height:150px; overflow-y:auto; padding-right:2px;">
            ${dynamicSectionHTML}
          </div>
        </div>
      </div>
    `;
    
    return `
      <div id="${modalId}" style="display:flex; gap:24px; min-height:600px; height: 100%;">
        <div style="width:200px; flex-shrink:0; border-right:1px solid var(--border-light); padding-right:16px; display:flex; flex-direction:column; gap:4px; height:100%; overflow-y:auto;">
          <div style="font-size:11.5px; font-weight:600; color:var(--text-label); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px; padding-left:4px;">Canvases</div>
          ${sidebarHtml}
          ${settingsHtml}
        </div>
        <div style="flex:1; display:flex; flex-direction:column; gap:12px; height:100%; overflow:hidden;">
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border-light); padding-bottom:10px; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1; padding-right:12px;">
              <h3 style="margin:0; font-size:16px; font-weight:600; color:var(--text-bright); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${focusedCanvas.width} × ${focusedCanvas.height} Details</h3>
              ${state.dataMerge && state.dataMerge.enabled && state.dataMerge.rows && state.dataMerge.rows.length ? `
                <div style="display:flex; align-items:center; gap:6px; background:var(--bg-input); border:1px solid var(--border-light); border-radius:4px; padding:3px 8px; flex-shrink:0;">
                  <span style="font-size:11px; color:var(--text-muted); font-weight:600;">Version:</span>
                  <select id="val-version-select" style="background:transparent; border:none; color:var(--text-bright); font-size:11.5px; font-weight:600; outline:none; cursor:pointer; font-family:inherit; max-width:180px;">
                    ${state.dataMerge.rows.map((row, i) => {
                       const keyCol = (state.dataMerge.keyColumn && state.dataMerge.columns.includes(state.dataMerge.keyColumn)) ? state.dataMerge.keyColumn : state.dataMerge.columns[0];
                       const name = row[keyCol] || `Version ${i + 1}`;
                       const selected = state.dataMerge.activeVersion === i ? 'selected' : '';
                       return `<option value="${i}" ${selected} style="background:var(--bg-panel); color:var(--text-main);">${i + 1}. ${name}</option>`;
                    }).join('')}
                  </select>
                </div>
              ` : ''}
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-size:12.5px; font-weight:bold; color:var(--text-label);">ZIP Size: <span style="color:${errors.some(e => e.includes('limit')) ? '#f97316' : '#10b981'}; font-size:14px;">${focusedCanvas._valKb ? focusedCanvas._valKb + 'KB' : 'calc...'}</span></span>
            </div>
          </div>
          <div style="flex-shrink:0;">
            ${tabSelectorHtml}
          </div>
          <div style="flex:1; overflow-y:auto; padding-right:4px; display:flex; flex-direction:column; gap:12px;">
            ${activeContentHtml}
          </div>
        </div>
        ${breakdownHTML}
      </div>
    `;
  };

  openModal(`Validation and Audit`, generateModalContent(initialCanvas.id, activeTab), false);
  
  const modalEl = document.querySelector('.modal-bg:last-child .modal');
  if (modalEl) {
    modalEl.style.width = '1240px';
    modalEl.style.maxWidth = '98vw';
    modalEl.style.height = '720px';
    const bodyEl = modalEl.querySelector('.modal-body');
    if (bodyEl) {
      bodyEl.style.height = '100%';
      bodyEl.style.display = 'flex';
      bodyEl.style.flexDirection = 'column';
      bodyEl.style.padding = '20px 24px';
      const wrapper = bodyEl.firstElementChild;
      if (wrapper) {
        wrapper.style.height = '100%';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.flex = '1';
      }
    }

    const modalHead = modalEl.querySelector('.modal-head');
    const closeBtn = modalEl.querySelector('#modal-close');
    if (modalHead && closeBtn) {
      const previewBtn = document.createElement('button');
      previewBtn.className = 'btn';
      previewBtn.id = 'val-modal-preview';
      previewBtn.title = 'Preview this canvas layout';
      previewBtn.textContent = 'Preview';
      previewBtn.style.marginRight = '8px';
      previewBtn.onclick = () => {
        const currentCanvas = state.canvases.find(c => c.id === activeDetailsId);
        if (!currentCanvas) return;
        
        const modalBg = modalEl.closest('.modal-bg');
        if (modalBg) modalBg.remove();
        
        state.activeCanvasId = currentCanvas.id;
        render();
        
        const area = document.getElementById('canvas-area');
        state.prePreviewScrollLeft = area.scrollLeft;
        state.prePreviewScrollTop = area.scrollTop;
        state.prePreviewZoom = state.zoom || 0.6;
        document.body.classList.add('preview-active');
        const { x, y } = allCanvasesCenter();
        animateViewTo(1, x, y, 350, () => {
          state.isPreviewMode = true;
          render();
        });
      };
      
      const exportBtn = document.createElement('button');
      exportBtn.className = 'btn primary';
      exportBtn.id = 'val-modal-export';
      exportBtn.title = 'Export this canvas as ZIP package';
      exportBtn.textContent = 'Export ZIP';
      exportBtn.style.marginRight = '8px';
      exportBtn.onclick = () => {
        const currentCanvas = state.canvases.find(c => c.id === activeDetailsId);
        if (currentCanvas) {
          exportCanvasAsZip(currentCanvas);
        }
      };
      
      modalHead.insertBefore(exportBtn, closeBtn);
      modalHead.insertBefore(previewBtn, exportBtn);
    }
  }

  const setupModalListeners = (modalEl, currentId, currentTab) => {
    activeDetailsId = currentId;
    activeTab = currentTab;

    // Version switcher inside Validator details
    const versionSelect = modalEl.querySelector('#val-version-select');
    if (versionSelect) {
      versionSelect.onchange = async (e) => {
        const val = e.target.value;
        const vidx = val === '' ? null : Number(val);
        
        if (typeof dmSetActiveVersion === 'function') {
          dmSetActiveVersion(vidx);
        } else {
          state.dataMerge.activeVersion = vidx;
          pushHistory();
          render();
        }

        const currentCanvas = state.canvases.find(c => c.id === activeDetailsId);
        if (currentCanvas) {
          await updateCanvasSizeSync(currentCanvas);
        }
        
        state.canvases.forEach(c => {
          if (c.id !== activeDetailsId) {
            updateCanvasSizeSync(c);
          }
        });

        const modalContainer = document.getElementById(modalId);
        if (modalContainer) {
          const parent = modalContainer.parentElement;
          parent.innerHTML = generateModalContent(activeDetailsId, activeTab);
          const newContainer = parent.querySelector(`#${modalId}`);
          setupModalListeners(newContainer, activeDetailsId, activeTab);
        }
      };
    }
    
    // Canvas sidebar items selection
    const buttons = modalEl.querySelectorAll('.val-sidebar-item');
    buttons.forEach(btn => {
      const canvasId = btn.dataset.canvasId;
      if (canvasId === currentId) {
        btn.classList.add('active');
      }
      btn.onclick = async () => {
        const modalContainer = document.getElementById(modalId);
        if (modalContainer) {
          const parent = modalContainer.parentElement;
          const canvas = state.canvases.find(c => c.id === canvasId);
          if (canvas) {
            await updateCanvasSizeSync(canvas);
          }
          parent.innerHTML = generateModalContent(canvasId, activeTab);
          const newContainer = parent.querySelector(`#${modalId}`);
          setupModalListeners(newContainer, canvasId, activeTab);
        }
      };
    });

    // Tab buttons
    modalEl.querySelectorAll('.val-tab-btn').forEach(btn => {
      btn.onclick = () => {
        const tab = btn.dataset.tab;
        activeTab = tab;
        const modalContainer = document.getElementById(modalId);
        if (modalContainer) {
          const parent = modalContainer.parentElement;
          parent.innerHTML = generateModalContent(activeDetailsId, activeTab);
          const newContainer = parent.querySelector(`#${modalId}`);
          setupModalListeners(newContainer, activeDetailsId, activeTab);
        }
      };
    });

    // Locate Layer buttons
    modalEl.querySelectorAll('.val-locate-btn').forEach(btn => {
      btn.onclick = () => {
        const layerId = btn.dataset.layerId;
        const modalBg = modalEl.closest('.modal-bg');
        if (modalBg) modalBg.remove();
        
        state.selectedElementId = layerId;
        state.layerSelection = [layerId];
        render();
        showCanvasNotification('Layer selected for troubleshooting.', { type: 'info' });
      };
    });

    const triggerAutoCompress = async (btn) => {
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Compressing...';
      btn.style.opacity = '0.7';
      btn.style.cursor = 'not-allowed';
      
      try {
        await autoCompressCanvasImages(currentId);
        
        const modalContainer = document.getElementById(modalId);
        if (modalContainer) {
          const parent = modalContainer.parentElement;
          parent.innerHTML = generateModalContent(activeDetailsId, activeTab);
          const newContainer = parent.querySelector(`#${modalId}`);
          setupModalListeners(newContainer, activeDetailsId, activeTab);
        }
      } catch (err) {
        console.error(err);
        showCanvasNotification('Auto-compression failed: ' + err.message, { type: 'error' });
        btn.disabled = false;
        btn.textContent = originalText;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    };

    const criteriaCompressBtn = modalEl.querySelector('#val-criteria-auto-compress');
    if (criteriaCompressBtn) {
      criteriaCompressBtn.onclick = () => triggerAutoCompress(criteriaCompressBtn);
    }

    // Settings checkboxes
    modalEl.querySelectorAll('.val-setting-chk').forEach(chk => {
      chk.onchange = (e) => {
        const key = chk.dataset.setting;
        if (!state.validationSettings) state.validationSettings = {};
        state.validationSettings[key] = chk.checked;
        
        // Sync audit check immediately for the active canvas
        const currentCanvas = state.canvases.find(c => c.id === activeDetailsId);
        if (currentCanvas) {
          runAuditChecks(currentCanvas);
        }
        
        // Queue size and audits update
        queueSizeUpdate();
        
        // Instantly re-render
        const modalContainer = document.getElementById(modalId);
        if (modalContainer) {
          const parent = modalContainer.parentElement;
          parent.innerHTML = generateModalContent(activeDetailsId, activeTab);
          const newContainer = parent.querySelector(`#${modalId}`);
          setupModalListeners(newContainer, activeDetailsId, activeTab);
        }
      };
    });

  };

  const modalContainer = document.getElementById(modalId);
  if (modalContainer) {
    setupModalListeners(modalContainer.parentElement, initialCanvas.id, activeTab);
  }
}

// Left panel — Canvases list
// ============================================================================
function renderCanvasesList() {
  const esc = (s) => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  canvasesListEl.innerHTML = '';
  state.canvases.forEach((c, index) => {
    const div = document.createElement('div');
    div.className = 'canvas-item' + (c.id === state.activeCanvasId ? ' active' : '');
    div.dataset.canvasId = c.id;

    let sizeHtml = '';
    let warnHtml = '';
    
    const hasSelection = c.id === state.activeCanvasId && state.layerSelection && state.layerSelection.length > 0;

    if (c._valKb) {
      const color = (c._valErrors && c._valErrors.length > 0) ? '#ef4444' : '#10b981';
      if (hasSelection) {
        let combinedSize = 0;
        c.elements.forEach(el => {
          if (state.layerSelection.includes(el.id)) {
            combinedSize += getElementSizeKB(el);
          }
        });
        sizeHtml = `
          <span id="val-size-${c.id}" style="font-size:10px; font-weight:bold; display:inline-flex; align-items:center; transition: color 0.2s;">
            <span style="color:var(--text-label); display:inline-flex; align-items:center;">
              <span>${combinedSize.toFixed(1)}</span>
              <span style="margin: 0 6px;">/</span>
            </span>
            <span style="color:${color};">${c._valKb}KB</span>
          </span>
        `;
      } else {
        sizeHtml = `<span id="val-size-${c.id}" style="color:${color}; font-size:10px; font-weight:bold; transition: color 0.2s;">${c._valKb}KB</span>`;
      }
    } else {
      if (hasSelection) {
        let combinedSize = 0;
        c.elements.forEach(el => {
          if (state.layerSelection.includes(el.id)) {
            combinedSize += getElementSizeKB(el);
          }
        });
        sizeHtml = `
          <span id="val-size-${c.id}" style="font-size:10px; font-weight:bold; display:inline-flex; align-items:center; opacity: 0.5;">
            <span style="color:var(--text-label); display:inline-flex; align-items:center;">
              <span>${combinedSize.toFixed(1)}</span>
              <span style="margin: 0 6px;">/</span>
            </span>
            <span style="color:var(--text-muted);">calc...</span>
          </span>
        `;
      } else {
        sizeHtml = `<span id="val-size-${c.id}" style="color:var(--text-muted); font-size:10px; font-weight:bold; opacity: 0.5;">calc...</span>`;
      }
      if (!window._valInitRun) {
        window._valInitRun = true;
        setTimeout(() => queueSizeUpdate(), 200);
      }
    }

    let btnBg = 'rgba(90, 97, 120, 0.15)';
    let btnColor = 'var(--text-muted)';
    let btnBgHover = 'rgba(90, 97, 120, 0.3)';
    let btnText = '✓';
    let btnTitle = 'Calculating validation status...';

    if (c._valKb) {
      const hasErrors = c._valErrors && c._valErrors.length > 0;
      const hasA11y = c._valA11y && c._valA11y.length > 0;
      const hasBrand = c._valBrand && c._valBrand.length > 0;

      if (hasErrors) {
        btnBg = 'rgba(239, 68, 68, 0.15)';
        btnColor = '#ef4444';
        btnBgHover = 'rgba(239, 68, 68, 0.3)';
        btnText = getWarningIcon('#ef4444', 11);
        btnTitle = 'Ad compliance errors found. Click to open Validation and Audit.';
      } else if (hasA11y || hasBrand) {
        btnBg = 'rgba(249, 115, 22, 0.15)';
        btnColor = '#f97316';
        btnBgHover = 'rgba(249, 115, 22, 0.3)';
        btnText = getWarningIcon('#f97316', 11);
        btnTitle = 'Validation warnings found. Click to open Validation and Audit.';
      } else {
        btnBg = 'rgba(16, 185, 129, 0.15)';
        btnColor = '#10b981';
        btnBgHover = 'rgba(16, 185, 129, 0.3)';
        btnText = getCheckIcon('#10b981', 11);
        btnTitle = 'All validation checks passed. Click to open Validation and Audit.';
      }
    }

    warnHtml = `
      <span id="val-warn-${c.id}">
        <button class="val-status-btn" style="
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 18px;
          border: none;
          border-radius: 4px;
          background: ${btnBg};
          color: ${btnColor};
          cursor: pointer;
          font-size: 10px;
          font-weight: bold;
          padding: 0;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='${btnBgHover}'" onmouseout="this.style.background='${btnBg}'" title="${btnTitle}">
          ${btnText}
        </button>
      </span>
    `;

    div.innerHTML = `
      <div style="flex:1; display:flex; flex-direction:row; align-items:center; gap:8px; overflow:hidden;">
        <span class="ci-name" style="font-family:'JetBrains Mono', ui-monospace, monospace; font-size:12px;">${index + 1}. ${c.width}×${c.height}</span>
        <div style="display:flex; align-items:center; gap:4px; margin-left:auto;">
          ${sizeHtml}
          ${warnHtml}
        </div>
      </div>
    `;

    const statusBtn = div.querySelector('.val-status-btn');
    if (statusBtn) {
      statusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openValidatorDetails(c);
      });
    }

    div.addEventListener('click', (e) => {
      state.activeCanvasId = c.id;
      state.selectedElementId = null;
      state.editingElementId = null;
      zoomToCanvas(c);
    });
    canvasesListEl.appendChild(div);
  });
  updateCanvasesHeaderStatus();
}

function updateCanvasesHeaderStatus() {
  const headerStatusEl = document.getElementById('canvases-header-status');
  if (!headerStatusEl) return;

  let passed = 0;
  let warnings = 0;
  let errors = 0;
  let pending = 0;

  state.canvases.forEach(c => {
    if (!c._valKb) {
      pending++;
    } else {
      const hasErrors = c._valErrors && c._valErrors.length > 0;
      const hasA11y = c._valA11y && c._valA11y.length > 0;
      const hasBrand = c._valBrand && c._valBrand.length > 0;

      if (hasErrors) {
        errors++;
      } else if (hasA11y || hasBrand) {
        warnings++;
      } else {
        passed++;
      }
    }
  });

  let html = '';
  if (errors > 0) {
    html += `<span class="canvas-status-tag error" title="Ad compliance errors">${getWarningIcon('#ef4444', 12)} ${errors}</span>`;
  }
  if (warnings > 0) {
    html += `<span class="canvas-status-tag warning" title="Validation warnings">${getWarningIcon('#f97316', 12)} ${warnings}</span>`;
  }
  if (passed > 0) {
    html += `<span class="canvas-status-tag pass" title="All checks passed">${getCheckIcon('#10b981', 12)} ${passed}</span>`;
  }
  if (pending > 0) {
    html += `<span class="canvas-status-tag pending" title="Calculating validation status...">... ${pending}</span>`;
  }

  headerStatusEl.innerHTML = html;

  // Make the tags clickable to open Validation & Audit, stopping propagation to avoid toggling the collapse state of the panel
  headerStatusEl.querySelectorAll('.canvas-status-tag').forEach(tag => {
    tag.onclick = (e) => {
      e.stopPropagation();
      const activeCanvas = getActiveCanvas() || (state.canvases && state.canvases[0]);
      if (activeCanvas) {
        openValidatorDetails(activeCanvas);
      }
    };
  });

  const summaryParts = [];
  if (errors > 0) summaryParts.push(`${errors} Error${errors > 1 ? 's' : ''}`);
  if (warnings > 0) summaryParts.push(`${warnings} Warning${warnings > 1 ? 's' : ''}`);
  if (passed > 0) summaryParts.push(`${passed} Passed`);
  if (pending > 0) summaryParts.push(`${pending} Pending`);

  headerStatusEl.title = `Canvases validation summary: ` + (summaryParts.join(', ') || 'No canvases');
}

document.getElementById('btn-validator-dashboard-trigger').addEventListener('click', () => {
  const activeCanvas = getActiveCanvas();
  if (activeCanvas) {
    openValidatorDetails(activeCanvas);
  }
});

document.getElementById('btn-add-canvas').addEventListener('click', (e) => {
  let popup = document.getElementById('canvas-size-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'canvas-size-popup';
    popup.style.position = 'absolute';
    popup.style.background = 'var(--bg-panel)';
    popup.style.border = '1px solid var(--border-light)';
    popup.style.borderRadius = '6px';
    popup.style.padding = '4px 0';
    popup.style.zIndex = '2000';
    popup.style.boxShadow = '0 8px 24px var(--shadow-medium)';

    PRESET_SIZES.forEach(sz => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.innerText = `${sz.name} (${sz.width}x${sz.height})`;
      item.addEventListener('click', () => {
        const idx = state.canvases.length;
        const c = seedCanvas(sz, idx % PRESET_SIZES.length);
        if (state.defaultBg) c.bgColor = state.defaultBg;
        if (idx >= PRESET_SIZES.length) {
          c.workspaceX = BOARD_MARGIN + idx * 30;
          c.workspaceY = BOARD_MARGIN + idx * 30;
        }
        state.canvases.push(c);
        state.activeCanvasId = c.id;
        pushHistory();
        render();
        popup.style.display = 'none';
      });
      popup.appendChild(item);
    });

    document.addEventListener('mousedown', (ev) => {
      if (!popup.contains(ev.target) && ev.target.id !== 'btn-add-canvas') {
        popup.style.display = 'none';
      }
    });
    document.body.appendChild(popup);
  }

  popup.style.display = 'block';
  const rect = e.target.getBoundingClientRect();
  popup.style.left = rect.left + 'px';
  popup.style.top = (rect.bottom + 5) + 'px';
});

// ============================================================================
// Link Control panel
// ============================================================================
function renderLinkControl() {
  const panel = document.getElementById('link-control');
  if (!panel) return;

  if (!state.linkGroups) state.linkGroups = {};
  
  cleanupLinkGroups();

  const c = getActiveCanvas();
  let selectedElements = [];
  if (c && state.layerSelection?.length) {
    selectedElements = c.elements.filter(el => state.layerSelection.includes(el.id));
  }
  const groups = Object.values(state.linkGroups);
  let html = '';
  let isRmitLogo = false;

  // 1. ACTIVE LINK GROUPS LIST AT THE TOP
  if (groups.length > 0) {
    groups.forEach(g => {
      let count = 0;
      let allHidden = true;
      let hasElements = false;
      state.canvases.forEach(cv => {
        cv.elements.forEach(el => {
          if (el.linkGroupId === g.id) {
            count++;
            hasElements = true;
            if (!el.hidden) allHidden = false;
          }
        });
      });

      let exactType = null;
      for (const canv of state.canvases) {
        const found = canv.elements.find(el => el.linkGroupId === g.id);
        if (found) {
          exactType = found.type;
          break;
        }
      }
      if (!exactType) {
        exactType = g.category === 'shape' ? 'rect' : g.category;
      }
      const iconPath = layerIcon(exactType);
      const iconHtml = `<svg class="layer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); width: 13px; height: 13px; flex-shrink: 0;">${iconPath}</svg>`;

      const isGroupSelected = selectedElements.some(el => el.linkGroupId === g.id);

      html += `
        <div class="link-group-row ${isGroupSelected ? 'selected' : ''}" data-group-id="${g.id}">
          <div style="display:flex; align-items:center; gap:5px; flex:1; min-width:0;">
            ${iconHtml}
            <span class="layer-name" style="font-size:10.5px; font-weight:500; color:var(--text-main); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${g.name}</span>
          </div>
          <div style="display:flex; align-items:center; gap:2px; flex-shrink:0;">
            <span style="font-size:9.5px; font-weight:600; color:var(--text-main); background:rgba(255,255,255,0.06); padding:2px 4px; border-radius:8px; margin-right:2px; display:inline-block; line-height:1;">${count}</span>
            <button class="icon-btn ${g.liveLink ? 'active' : ''} lg-live-btn" data-group-id="${g.id}" title="Toggle Live-Link Mode (Instant Sync)" style="background:none; border:none; cursor:pointer; padding:2px; display:flex; align-items:center; color:${g.liveLink ? 'var(--text-accent)' : 'var(--text-muted)'};">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
            <button class="icon-btn ${hasElements && !allHidden ? 'active' : ''} lg-eye-btn" data-group-id="${g.id}" title="Toggle group visibility" style="background:none; border:none; cursor:pointer; padding:2px; display:flex; align-items:center; color:${hasElements && !allHidden ? 'var(--text-bright)' : 'var(--text-muted)'};">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button class="icon-btn active lg-delete-btn" data-group-id="${g.id}" title="Unlink group" style="background:none; border:none; cursor:pointer; padding:2px; display:flex; align-items:center; color:var(--text-muted);">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"></path>
                <line x1="2" y1="2" x2="22" y2="22"></line>
              </svg>
            </button>
          </div>
        </div>
      `;
    });
  } else {
    html += `
      <div style="font-size:10px; font-style:italic; color:var(--text-muted); text-align:center; padding:12px 0;">No active link groups.</div>
    `;
  }

  // 2. AUTO-LINK & LINK CONTROL SECTIONS UNDERNEATH
  const activeEl = getSelectedElement();
  html += `
    <div style="margin-bottom: 12px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--bg-input);">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; width:100%; box-sizing:border-box;">
        <button id="lnk-btn-autolink" class="btn" title="Automatically link matching layers across canvases by name and type" style="flex:1; font-size:11px; padding:6px 12px; display:flex; align-items:center; justify-content:center; gap:6px; border: 1px solid var(--accent-base); background: var(--accent-dark); color: var(--text-main); box-sizing:border-box;">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          Auto-Link
        </button>
        <div style="display:flex; align-items:center; gap:4px; flex-shrink:0; white-space:nowrap;" title="Only auto-link elements that are currently selected">
          <input type="checkbox" id="lnk-opt-selected-only" style="margin:0; cursor:pointer;" ${state.autoLinkSelectedOnly ? 'checked' : ''} title="Only auto-link elements that are currently selected" />
          <label for="lnk-opt-selected-only" style="font-size:11px; color:var(--text-muted); cursor:pointer; user-select:none;" title="Only auto-link elements that are currently selected">Selected only</label>
        </div>
      </div>
  `;

  if (activeEl) {
    html += `
      <button id="lnk-btn-autoadd" class="btn" title="Distribute this element to other canvases and link them together" style="width:100%; font-size:11px; padding:6px 12px; display:flex; align-items:center; justify-content:center; gap:6px; border: 1px solid var(--accent-base); background: var(--accent-dark); color: var(--text-main); margin-bottom: 8px; box-sizing:border-box;">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
        Distribute & Link
      </button>
    `;
  }

  html += `</div>`;

  if (selectedElements.length > 0) {
    const firstEl = selectedElements[0];
    const cat = getElementCategory(firstEl);
    const sameCat = selectedElements.every(el => getElementCategory(el) === cat);
    isRmitLogo = selectedElements.some(el => el.role === 'rmit-logo' || (el.customName && el.customName.toLowerCase().includes('rmit') && el.customName.toLowerCase().includes('logo')));

    if (sameCat && cat) {
      const groupIds = [...new Set(selectedElements.map(el => el.linkGroupId).filter(Boolean))];

      html += `<div style="padding: 10px; border: 1px dashed var(--bg-input); border-radius: 4px; display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.02); align-items:stretch;">`;

      if (groupIds.length === 0) {
        html += `<div style="font-size: 11px; color:var(--text-muted);">Not linked to any group.</div>`;
        
        const existingGroups = Object.values(state.linkGroups).filter(g => g.category === cat);
        if (existingGroups.length > 0) {
          html += `<div style="display:flex; flex-direction:column; gap:4px; margin-top:4px;">
            <select id="lnk-select-group" title="Select an existing link group to join" style="width:100%; background:var(--bg-panel); border:1px solid var(--bg-input); color:var(--text-main); font-size:11px; padding:6px; border-radius:4px; outline:none; box-sizing:border-box;">
              ${existingGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
            </select>
            <button id="lnk-btn-join" class="btn" title="Add selected elements to the selected link group" style="width:100%; font-size:11px; padding:6px 12px; margin-top:2px; box-sizing:border-box;">Link to Selected Group</button>
          </div>`;
        }

        html += `<div style="display:flex; gap:6px; align-items:center; margin-top:8px;">
          <input type="text" id="lnk-new-name" placeholder="New group name..." title="Name for the new link group" style="flex:1; min-width:0; background:var(--bg-panel); border:1px solid var(--bg-input); color:var(--text-main); font-size:11px; padding:6px; border-radius:4px; outline:none; box-sizing:border-box;" />
          <button id="lnk-btn-create" class="btn primary" title="Create a new link group for the selected elements" style="font-size:11px; padding:6px 12px; white-space:nowrap; box-sizing:border-box;">Create Link</button>
        </div>`;

      } else if (groupIds.length === 1) {
        const gid = groupIds[0];
        const group = state.linkGroups[gid];
        if (group) {
          const sync = group.syncProperties || {};
          let keys = [];
          if (cat === 'text') keys = ['customName', 'visibility', 'text', 'font', 'fontSize', 'color', 'background', 'opacity', 'inAnim', 'effect'];
          else if (cat === 'button') keys = ['customName', 'visibility', 'text', 'textColor', 'font', 'fill', 'stroke', 'radius', 'transform', 'opacity', 'inAnim', 'effect'];
          else if (cat === 'image') {
            keys = ['customName', 'visibility', 'image', 'radius', 'transform', 'opacity', 'rotation', 'inAnim', 'effect'];
            if (isRmitLogo) keys.push('variant');
          }
          else if (cat === 'shape') keys = ['customName', 'visibility', 'fill', 'stroke', 'radius', 'transform', 'opacity', 'inAnim', 'effect'];
          else if (cat === 'line') keys = ['customName', 'visibility', 'color', 'thickness', 'opacity', 'inAnim', 'effect'];

          const anyChecked = keys.some(k => {
            if (k === 'fontSize') return !!(sync.fontSize !== undefined ? sync.fontSize : sync.font);
            if (k === 'background') return !!(sync.background !== undefined ? sync.background : sync.color);
            return !!sync[k];
          });

          html += `<div style="padding-top:4px;">`;
          html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="font-size:10px; font-weight:600; color:var(--text-label); text-transform:uppercase; letter-spacing:0.05em;">Link Properties</div>
            <button id="lnk-toggle-all-props" title="Select or deselect all sync properties" style="background:none; border:none; color:var(--text-accent); font-size:10px; cursor:pointer; padding:0; text-decoration:underline;">${anyChecked ? 'Unselect all' : 'Select all'}</button>
          </div>`;
          
          if (cat === 'text') {
            html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:5px 6px; width:100%;">
              <label title="Sync custom layer name across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="customName" ${sync.customName ? 'checked' : ''} /> Layer name</label>
              <label title="Sync layer visibility across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="visibility" ${sync.visibility ? 'checked' : ''} /> Layer visibility</label>
              <label title="Sync text content across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="text" ${sync.text ? 'checked' : ''} /> Text content</label>
              <label title="Sync font family and weight settings across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="font" ${sync.font ? 'checked' : ''} /> Font settings</label>
              <label title="Sync font size across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="fontSize" ${(sync.fontSize !== undefined ? sync.fontSize : sync.font) ? 'checked' : ''} /> Font size</label>
              <label title="Sync text color across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="color" ${sync.color ? 'checked' : ''} /> Colors</label>
              <label title="Sync text background properties across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="background" ${(sync.background !== undefined ? sync.background : sync.color) ? 'checked' : ''} /> Background</label>
              <label title="Sync opacity across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="opacity" ${sync.opacity ? 'checked' : ''} /> Opacity</label>
              <label title="Sync entry transition animation across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="inAnim" ${sync.inAnim ? 'checked' : ''} /> IN Animation</label>
              <label title="Sync continuous effect across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="effect" ${sync.effect ? 'checked' : ''} /> Effects</label>
            </div>`;
          } else if (cat === 'button') {
            html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:5px 6px; width:100%;">
              <label title="Sync custom layer name across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="customName" ${sync.customName ? 'checked' : ''} /> Layer name</label>
              <label title="Sync layer visibility across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="visibility" ${sync.visibility ? 'checked' : ''} /> Layer visibility</label>
              <label title="Sync button label text across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="text" ${sync.text ? 'checked' : ''} /> Button text</label>
              <label title="Sync button text color across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="textColor" ${sync.textColor ? 'checked' : ''} /> Text color</label>
              <label title="Sync button font family, weight, alignment, and auto-scaling settings across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="font" ${sync.font ? 'checked' : ''} /> Font settings</label>
              <label title="Sync button background fill across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="fill" ${sync.fill ? 'checked' : ''} /> Fill</label>
              <label title="Sync button stroke properties across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="stroke" ${sync.stroke ? 'checked' : ''} /> Stroke</label>
              <label title="Sync button corner radius across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="radius" ${sync.radius ? 'checked' : ''} /> Corner radius</label>
              <label title="Sync button width and height across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="transform" ${sync.transform ? 'checked' : ''} /> Size (W+H)</label>
              <label title="Sync button opacity across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="opacity" ${sync.opacity ? 'checked' : ''} /> Opacity</label>
              <label title="Sync button entry transition animation across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="inAnim" ${sync.inAnim ? 'checked' : ''} /> IN Animation</label>
              <label title="Sync button continuous effect across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="effect" ${sync.effect ? 'checked' : ''} /> Effects</label>
            </div>`;
          } else if (cat === 'image') {
            html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:5px 6px; width:100%;">
              <label title="Sync custom layer name across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="customName" ${sync.customName ? 'checked' : ''} /> Layer name</label>
              <label title="Sync layer visibility across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="visibility" ${sync.visibility ? 'checked' : ''} /> Layer visibility</label>
              <label title="Sync image asset across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="image" ${sync.image ? 'checked' : ''} /> Image asset</label>
              ${isRmitLogo ? `<label title="Sync logo variant across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="variant" ${sync.variant ? 'checked' : ''} /> Variant</label>` : ''}
              <label title="Sync image corner radius across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="radius" ${sync.radius ? 'checked' : ''} /> Corner radius</label>
              <label title="Sync image width and height across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="transform" ${sync.transform ? 'checked' : ''} /> Size (W+H)</label>
              <label title="Sync image opacity across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="opacity" ${sync.opacity ? 'checked' : ''} /> Opacity</label>
              <label title="Sync image rotation angle across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="rotation" ${sync.rotation ? 'checked' : ''} /> Rotation</label>
              <label title="Sync image entry transition animation across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="inAnim" ${sync.inAnim ? 'checked' : ''} /> IN Animation</label>
              <label title="Sync image continuous effect across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="effect" ${sync.effect ? 'checked' : ''} /> Effects</label>
            </div>`;
          } else if (cat === 'shape') {
            html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:5px 6px; width:100%;">
              <label title="Sync custom layer name across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="customName" ${sync.customName ? 'checked' : ''} /> Layer name</label>
              <label title="Sync layer visibility across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="visibility" ${sync.visibility ? 'checked' : ''} /> Layer visibility</label>
              <label title="Sync shape fill color across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="fill" ${sync.fill ? 'checked' : ''} /> Color</label>
              <label title="Sync shape stroke properties across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="stroke" ${sync.stroke ? 'checked' : ''} /> Stroke</label>
              <label title="Sync shape corner radius across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="radius" ${sync.radius ? 'checked' : ''} /> Corner radius</label>
              <label title="Sync shape width and height across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="transform" ${sync.transform ? 'checked' : ''} /> Size (W+H)</label>
              <label title="Sync shape opacity across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="opacity" ${sync.opacity ? 'checked' : ''} /> Opacity</label>
              <label title="Sync shape entry transition animation across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="inAnim" ${sync.inAnim ? 'checked' : ''} /> IN Animation</label>
              <label title="Sync shape continuous effect across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="effect" ${sync.effect ? 'checked' : ''} /> Effects</label>
            </div>`;
          } else if (cat === 'line') {
            html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:5px 6px; width:100%;">
              <label title="Sync custom layer name across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="customName" ${sync.customName ? 'checked' : ''} /> Layer name</label>
              <label title="Sync layer visibility across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="visibility" ${sync.visibility ? 'checked' : ''} /> Layer visibility</label>
              <label title="Sync line color across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="color" ${sync.color ? 'checked' : ''} /> Color</label>
              <label title="Sync line thickness across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="thickness" ${sync.thickness ? 'checked' : ''} /> Thickness</label>
              <label title="Sync line opacity across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="opacity" ${sync.opacity ? 'checked' : ''} /> Opacity</label>
              <label title="Sync line entry transition animation across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="inAnim" ${sync.inAnim ? 'checked' : ''} /> IN Animation</label>
              <label title="Sync line continuous effect across linked elements" style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:500; color:var(--text-muted); cursor:pointer; user-select:none; white-space:nowrap;"><input type="checkbox" class="lnk-sync-prop" data-prop="effect" ${sync.effect ? 'checked' : ''} /> Effects</label>
            </div>`;
          }
          html += `</div>`;
          
          html += `<div style="padding-top:8px; border-top:1px solid var(--bg-input);">
            <label class="live-link-toggle-btn ${group.liveLink ? 'active' : ''}" title="Sync changes instantly across all canvases as you edit">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:11px; font-weight:600;">Live-link mode</span>
              </div>
              <div class="toggle-slider">
                <div class="toggle-knob"></div>
              </div>
              <input type="checkbox" id="lnk-live-toggle" style="display: none !important;" ${group.liveLink ? 'checked' : ''} />
            </label>
          </div>`;

          html += `<button id="lnk-btn-push" class="btn primary" title="Force push properties from selection to all other members in the group" style="width:100%; font-size:11px; padding:6px 12px; font-weight:600; box-sizing:border-box;">Push Changes to Group</button>`;
          html += `<button id="lnk-btn-unlink" class="btn" title="Remove selected element(s) from link groups" style="width:100%; font-size:11px; padding:6px 12px; box-sizing:border-box;">Unlink Selected</button>`;
        }
      } else {
        html += `<div style="font-size: 11px; color:#ef4444; width:100%; box-sizing:border-box;">Selection contains multiple link groups.</div>`;
        html += `<button id="lnk-btn-unlink-all" class="btn" title="Remove selected element(s) from link groups" style="width:100%; font-size:11px; padding:6px 12px; box-sizing:border-box;">Unlink All</button>`;
      }
    } else {
      html += `<div style="padding: 8px; border: 1px dashed var(--bg-input); border-radius: 4px; margin-bottom: 12px; font-size: 11px; color:#ef4444; background:rgba(239, 68, 68, 0.05); text-align:center;">Cannot link different types of elements.</div>`;
    }
    html += `</div>`;
  } else {
    html += `<div style="padding: 10px; border: 1px dashed var(--bg-input); border-radius: 4px; font-size: 11px; color:var(--text-muted); background:rgba(255,255,255,0.01); text-align:center;">Select elements to manage links.</div>`;
  }

  panel.innerHTML = html;

  const btnAutolink = document.getElementById('lnk-btn-autolink');
  if (btnAutolink) {
    btnAutolink.onclick = async () => {
      await autoLinkElements();
    };
  }

  const btnCreate = document.getElementById('lnk-btn-create');
  if (btnCreate) {
    btnCreate.onclick = () => {
      const inp = document.getElementById('lnk-new-name');
      if (inp && inp.value.trim()) {
        createAndLinkGroup(inp.value.trim());
      }
    };
  }

  const btnJoin = document.getElementById('lnk-btn-join');
  if (btnJoin) {
    btnJoin.onclick = () => {
      const select = document.getElementById('lnk-select-group');
      if (select && select.value) {
        linkSelectionToGroup(select.value);
      }
    };
  }

  const btnUnlink = document.getElementById('lnk-btn-unlink');
  if (btnUnlink) {
    btnUnlink.onclick = () => {
      removeSelectionFromGroup();
    };
  }

  const btnUnlinkAll = document.getElementById('lnk-btn-unlink-all');
  if (btnUnlinkAll) {
    btnUnlinkAll.onclick = () => {
      removeSelectionFromGroup();
    };
  }

  const btnPush = document.getElementById('lnk-btn-push');
  if (btnPush) {
    btnPush.onclick = () => {
      pushGroupChanges();
    };
  }

  const btnToggleAll = document.getElementById('lnk-toggle-all-props');
  if (btnToggleAll) {
    btnToggleAll.onclick = () => {
      const groupIds = [...new Set(selectedElements.map(el => el.linkGroupId).filter(Boolean))];
      if (groupIds.length === 1) {
        const gid = groupIds[0];
        const group = state.linkGroups[gid];
        if (group) {
          if (!group.syncProperties) group.syncProperties = {};
          const sync = group.syncProperties;
          const cat = group.category;
          
          let keys = [];
          if (cat === 'text') keys = ['customName', 'visibility', 'text', 'font', 'fontSize', 'color', 'background', 'opacity', 'inAnim', 'effect'];
          else if (cat === 'button') keys = ['customName', 'visibility', 'text', 'textColor', 'font', 'fill', 'stroke', 'radius', 'transform', 'opacity', 'inAnim', 'effect'];
          else if (cat === 'image') {
            keys = ['customName', 'visibility', 'image', 'radius', 'transform', 'opacity', 'rotation', 'inAnim', 'effect'];
            if (isRmitLogo) keys.push('variant');
          }
          else if (cat === 'shape') keys = ['customName', 'visibility', 'fill', 'stroke', 'radius', 'transform', 'opacity', 'inAnim', 'effect'];
          else if (cat === 'line') keys = ['customName', 'visibility', 'color', 'thickness', 'opacity', 'inAnim', 'effect'];

          const anyChecked = keys.some(k => {
            if (k === 'fontSize') return !!(sync.fontSize !== undefined ? sync.fontSize : sync.font);
            if (k === 'background') return !!(sync.background !== undefined ? sync.background : sync.color);
            return !!sync[k];
          });
          const targetVal = !anyChecked;
          
          keys.forEach(k => {
            sync[k] = targetVal;
            if (!targetVal) {
              if (k === 'fontSize') sync.fontSize = false;
              if (k === 'background') sync.background = false;
            }
          });
          
          pushHistory();
          render();
        }
      }
    };
  }

  const btnAutoAdd = document.getElementById('lnk-btn-autoadd');
  if (btnAutoAdd) {
    btnAutoAdd.onclick = () => {
      if (selectedElements.length > 0) {
        autoAddAndLink(selectedElements[0]);
      }
    };
  }

  const chkSelectedOnly = document.getElementById('lnk-opt-selected-only');
  if (chkSelectedOnly) {
    chkSelectedOnly.onchange = (e) => {
      state.autoLinkSelectedOnly = e.target.checked;
    };
  }
  panel.querySelectorAll('.lnk-sync-prop').forEach(cb => {
    cb.onchange = () => {
      const prop = cb.dataset.prop;
      const groupIds = [...new Set(selectedElements.map(el => el.linkGroupId).filter(Boolean))];
      if (groupIds.length === 1) {
        const group = state.linkGroups[groupIds[0]];
        if (group && group.syncProperties) {
          group.syncProperties[prop] = cb.checked;
          if (group.liveLink && cb.checked) {
            pushGroupChangesForId(groupIds[0]);
          } else {
            pushHistory();
            render();
          }
        }
      }
    };
  });

  const chkLive = document.getElementById('lnk-live-toggle');
  if (chkLive) {
    chkLive.onchange = (e) => {
      const groupIds = [...new Set(selectedElements.map(el => el.linkGroupId).filter(Boolean))];
      if (groupIds.length === 1) {
        const group = state.linkGroups[groupIds[0]];
        if (group) {
          group.liveLink = e.target.checked;
          if (group.liveLink) {
            pushGroupChangesForId(groupIds[0]);
          } else {
            pushHistory();
            render();
          }
        }
      }
    };
  }

  panel.querySelectorAll('.lg-live-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const gid = btn.dataset.groupId;
      const group = state.linkGroups[gid];
      if (group) {
        group.liveLink = !group.liveLink;
        if (group.liveLink) {
          pushGroupChangesForId(gid);
        } else {
          pushHistory();
          render();
        }
      }
    };
  });

  panel.querySelectorAll('.lg-eye-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const gid = btn.dataset.groupId;
      toggleGroupVisibility(gid);
    };
  });

  panel.querySelectorAll('.lg-delete-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const gid = btn.dataset.groupId;
      if (confirm(`Are you sure you want to unlink all elements in the group "${state.linkGroups[gid]?.name || ''}"?`)) {
        removeGroupEntirely(gid);
      }
    };
  });

  panel.querySelectorAll('.link-group-row').forEach(row => {
    // Hovering a group row highlights its members across all canvases (visual only).
    row.addEventListener('mouseenter', () => {
      const gid = row.dataset.groupId;
      const lg = state.linkGroups && state.linkGroups[gid];
      
      // Clean up any remaining overlays first
      document.querySelectorAll('.link-group-highlight-overlay').forEach(n => n.remove());

      document.querySelectorAll(`.el[data-link-group="${gid}"]`).forEach(elNode => {
        elNode.classList.add('link-highlight-hover');
        if (lg && lg.liveLink) {
          elNode.classList.add('link-highlight-hover-live');
        }

        // Add a non-clipped sibling overlay to render the dashed outline cleanly (especially for masked elements)
        const overlay = document.createElement('div');
        overlay.className = 'link-group-highlight-overlay el ' + (lg && lg.liveLink ? 'link-highlight-hover-live' : 'link-highlight-hover');
        overlay.style.position = 'absolute';
        overlay.style.left = elNode.style.left;
        overlay.style.top = elNode.style.top;
        overlay.style.width = elNode.style.width;
        overlay.style.height = elNode.style.height;
        overlay.style.transform = elNode.style.transform;
        overlay.style.transformOrigin = elNode.style.transformOrigin;
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '9999';
        
        if (elNode.parentElement) {
          elNode.parentElement.appendChild(overlay);
        }
      });
    });
    row.addEventListener('mouseleave', () => {
      document.querySelectorAll('.el.link-highlight-hover').forEach(el => el.classList.remove('link-highlight-hover'));
      document.querySelectorAll('.el.link-highlight-hover-live').forEach(el => el.classList.remove('link-highlight-hover-live'));
      document.querySelectorAll('.link-group-highlight-overlay').forEach(n => n.remove());
    });
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const nameSpan = row.querySelector('.layer-name');
      if (nameSpan.contentEditable === 'true') return;

      const clickCount = e.detail;
      if (clickCount === 1) {
        row.clickTimeoutId = setTimeout(() => {
          const gid = row.dataset.groupId;
          selectGroupElements(gid);
        }, 220);
      } else if (clickCount >= 2) {
        if (row.clickTimeoutId) {
          clearTimeout(row.clickTimeoutId);
        }
      }
    });

    row.addEventListener('dblclick', (e) => {
      if (e.target.closest('button')) return;
      e.stopPropagation();
      const gid = row.dataset.groupId;
      const group = state.linkGroups[gid];
      if (!group) return;

      const nameSpan = row.querySelector('.layer-name');
      if (nameSpan.dataset.scrollInterval) {
        clearInterval(parseInt(nameSpan.dataset.scrollInterval, 10));
        nameSpan.dataset.scrollInterval = '';
        nameSpan.scrollLeft = 0;
      }

      nameSpan.contentEditable = 'true';
      nameSpan.focus();
      const sel = window.getSelection();
      sel.selectAllChildren(nameSpan);

      const finishEdit = () => {
        nameSpan.contentEditable = 'false';
        const newName = nameSpan.innerText.trim();
        if (newName) {
          group.name = newName;
          pushHistory();
        }
        render();
      };

      nameSpan.addEventListener('blur', finishEdit, { once: true });
      nameSpan.addEventListener('keydown', (ek) => {
        if (ek.key === 'Enter') {
          ek.preventDefault();
          nameSpan.blur();
        }
        if (ek.key === 'Escape') {
          ek.preventDefault();
          nameSpan.innerText = group.name;
          nameSpan.blur();
        }
      });
    });

    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const gid = row.dataset.groupId;
      const group = state.linkGroups[gid];
      if (!group) return;

      selectGroupElements(gid);

      const menu = document.getElementById('ctx-menu');
      if (!menu) return;

      menu.innerHTML = `
        <div class="ctx-item" id="ctx-lg-select">Select Elements</div>
        <div class="ctx-item" id="ctx-lg-push">Push Changes to Group</div>
        <div class="ctx-divider"></div>
        <div class="ctx-item" id="ctx-lg-unlink" style="color:#ef4444;">Unlink Group</div>
        <div class="ctx-item" id="ctx-lg-delete-all" style="color:#ef4444; font-weight:600;">Delete Group & Elements</div>
      `;

      menu.style.display = 'flex';
      const mw = menu.offsetWidth || 180;
      const mh = menu.offsetHeight || 120;
      let left = e.clientX, top = e.clientY;
      if (left + mw > window.innerWidth) left -= mw;
      if (top + mh > window.innerHeight) top -= mh;
      menu.style.left = left + 'px';
      menu.style.top = top + 'px';

      const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (ev) => { fn(ev); menu.style.display = 'none'; };
      };

      bind('ctx-lg-select', () => {
        selectGroupElements(gid);
      });
      bind('ctx-lg-push', () => {
        pushGroupChangesForId(gid);
      });
      bind('ctx-lg-unlink', () => {
        if (confirm(`Are you sure you want to remove link group "${group.name}"? This will unlink all its elements.`)) {
          removeGroupEntirely(gid);
        }
      });
      bind('ctx-lg-delete-all', () => {
        deleteGroupAndElements(gid);
      });
    });

    row.addEventListener('mouseenter', () => {
      const nameSpan = row.querySelector('.layer-name');
      if (nameSpan.contentEditable === 'true') return;
      if (nameSpan.scrollWidth > nameSpan.clientWidth) {
        let pos = 0;
        nameSpan.dataset.scrollInterval = setInterval(() => {
          pos += 1;
          if (pos > nameSpan.scrollWidth - nameSpan.clientWidth + 20) {
            pos = 0;
            nameSpan.scrollLeft = 0;
          } else {
            nameSpan.scrollLeft = pos;
          }
        }, 30);
      }
    });

    row.addEventListener('mouseleave', () => {
      const nameSpan = row.querySelector('.layer-name');
      if (nameSpan.dataset.scrollInterval) {
        clearInterval(nameSpan.dataset.scrollInterval);
        nameSpan.dataset.scrollInterval = '';
        nameSpan.scrollLeft = 0;
      }
    });
  });
}

// ============================================================================
// Layers panel
// ============================================================================
// ============================================================================
// Assets — a per-project library of reusable elements and groups
// ============================================================================
function ensureAssetsPanelExpanded() {
  const assetsSection = document.getElementById('panel-section-assets');
  if (assetsSection && assetsSection.classList.contains('collapsed')) {
    assetsSection.classList.remove('collapsed');
    localStorage.setItem('panel-collapsed-header-assets', 'false');
  }
}

// Snapshot the current selection into the asset library. A single grouped
// element pulls in its whole group. Link-group membership is dropped; per-element
// dynamic-data flags are kept.
async function saveSelectionAsAsset(folderId) {
  ensureAssetsPanelExpanded();
  const c = getActiveCanvas();
  if (!c) return;
  const ids = (state.layerSelection && state.layerSelection.length)
    ? state.layerSelection
    : (state.selectedElementId ? [state.selectedElementId] : []);
  let els = c.elements.filter(e => ids.includes(e.id));
  if (!els.length) { await showAdflowAlert('Select an element or group first, then save it to Assets.'); return; }
  if (els.length === 1 && els[0].groupId) {
    els = c.elements.filter(e => e.groupId === els[0].groupId);
  }
  const mp = (state.dataMerge && state.dataMerge.mappings) || {};
  const snapshot = JSON.parse(JSON.stringify(els)).map((e, i) => {
    delete e.linkGroupId;
    // Capture this element's dynamic-data slot bindings — the column mappings live
    // in state.dataMerge keyed by slot id, not on the element, so they'd be lost.
    const sk = dmSlotKey(els[i]) + '::';
    const dmMap = {};
    Object.keys(mp).forEach(k => { if (k.startsWith(sk)) dmMap[k.slice(sk.length)] = mp[k]; });
    // Images can't carry dynamic versioning into an asset — an image slot resolves
    // against the Assets panel, so a dynamic image asset would load recursively.
    if (e.type === 'image') {
      if (e.dynamic) delete e.dynamic.image;
      delete dmMap.image;
    }
    if (Object.keys(dmMap).length) e._assetDmMap = dmMap;
    return e;
  });
  const isGroup = snapshot.length > 1;
  if (!state.assetLibrary) state.assetLibrary = [];
  state.assetLibrary.push({
    id: 'as_' + uid(),
    name: uniqueName(isGroup ? 'Group' : baseLayerLabel(snapshot[0]), (state.assetLibrary || []).map(a => a.name)),
    kind: isGroup ? 'group' : 'element',
    iconType: isGroup ? 'group' : snapshot[0].type,
    elements: snapshot,
    folderId: folderId || null,
  });
  pushHistory();
  render();
}

// Clone an asset's elements onto a canvas — fresh ids, a fresh group id, no link
// membership. Dropped at (dropX, dropY) when dragged, else centered on the canvas.
function placeAsset(assetId, canvasId, dropX, dropY) {
  const asset = (state.assetLibrary || []).find(a => a.id === assetId);
  if (!asset) return;
  const c = state.canvases.find(cv => cv.id === canvasId) || getActiveCanvas();
  if (!c) return;
  const src = JSON.parse(JSON.stringify(asset.elements));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  src.forEach(e => {
    minX = Math.min(minX, e.x); minY = Math.min(minY, e.y);
    maxX = Math.max(maxX, e.x + e.width); maxY = Math.max(maxY, e.y + e.height);
  });
  const bw = maxX - minX, bh = maxY - minY;
  const tx = (dropX != null) ? dropX - bw / 2 : (c.width - bw) / 2;
  const ty = (dropY != null) ? dropY - bh / 2 : (c.height - bh) / 2;
  const offX = tx - minX, offY = ty - minY;
  const groupMap = {};
  const newIds = [];
  src.forEach(e => {
    e.id = uid();
    e.x = Math.round(e.x + offX);
    e.y = Math.round(e.y + offY);
    if (e.groupId) {
      if (!groupMap[e.groupId]) groupMap[e.groupId] = uid();
      e.groupId = groupMap[e.groupId];
    }
    delete e.linkGroupId;
    // Reconnect the dynamic-data slot bindings captured when the asset was saved,
    // re-keyed to this freshly-placed element's slot id.
    if (e._assetDmMap) {
      if (state.dataMerge) {
        if (!state.dataMerge.mappings) state.dataMerge.mappings = {};
        const sk = dmSlotKey(e) + '::';
        Object.keys(e._assetDmMap).forEach(field => {
          state.dataMerge.mappings[sk + field] = e._assetDmMap[field];
        });
      }
      delete e._assetDmMap;
    }
    if (e.type === 'image' && !e.name) {
      e.name = e.customName || asset.name || 'image.png';
    }
    if (e.persistent !== 'top' && e.persistent !== 'bottom') {
      e.persistent = false;
      e.frameId = state.activeFrameId;
    }
    c.elements.push(e);
    newIds.push(e.id);
  });
  // Placed elements carry the asset name (or the saved element customName for
  // groups), auto-incremented when a layer of that name already exists on the
  // canvas — so the Layers panel never shows duplicates.
  const existingNames = c.elements
    .filter(e => !newIds.includes(e.id))
    .map(e => baseLayerLabel(e))
    .filter(Boolean);
  if (asset.kind === 'element' && src[0]) {
    src[0].customName = uniqueName(asset.name, existingNames);
  } else if (asset.kind === 'group') {
    src.forEach(e => {
      if (e.customName) {
        e.customName = uniqueName(e.customName, existingNames);
        existingNames.push(e.customName);
      }
    });
  }
  state.activeCanvasId = c.id;
  state.layerSelection = newIds;
  state.selectedElementId = newIds[newIds.length - 1];
  state.editingElementId = null;
  pushHistory();
  render();
}

// Auto-numbered unique name — "Name", "Name 2", "Name 3"... so two never collide.
function uniqueName(base, names) {
  base = String(base == null ? '' : base).trim() || 'Untitled';
  const taken = new Set(names.map(n => String(n).toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has((base + ' ' + n).toLowerCase())) n++;
  return base + ' ' + n;
}

function createAssetFolder() {
  ensureAssetsPanelExpanded();
  if (!state.assetFolders) state.assetFolders = [];
  const folderId = 'af_' + uid();
  state.assetFolders.push({
    id: folderId,
    name: uniqueName('New Folder', state.assetFolders.map(f => f.name)),
    collapsed: false,
  });
  state.editingFolderId = folderId;
  pushHistory();
  render();
}

// Hover-preview popup for asset rows: a small floating thumbnail that
// appears next to the row after a short delay. Flips to the row's other
// side if it would overflow the viewport; hides on scroll or drag.
const assetHoverPreview = (() => {
  let popup = null;
  let imgEl = null;
  let showTimer = null;
  let currentRow = null;
  let scrollHooked = false;

  const ensure = () => {
    if (popup) return popup;
    popup = document.createElement('div');
    popup.id = 'asset-hover-preview';
    popup.style.cssText = 'position:fixed;z-index:1000050;pointer-events:none;background:var(--bg-panel);border:1px solid var(--border-light);border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.35);padding:4px;opacity:0;transform:translateY(-2px);transition:opacity .12s ease,transform .12s ease;display:none';
    imgEl = document.createElement('img');
    imgEl.style.cssText = 'display:block;max-width:160px;max-height:160px;min-width:32px;min-height:32px;width:auto;height:auto;object-fit:contain;background:rgba(255,255,255,.04);border-radius:3px';
    imgEl.alt = '';
    imgEl.draggable = false;
    popup.appendChild(imgEl);
    document.body.appendChild(popup);
    if (!scrollHooked) {
      document.addEventListener('scroll', () => hide(), true);
      window.addEventListener('blur', () => hide());
      scrollHooked = true;
    }
    return popup;
  };

  const position = (rowEl) => {
    const r = rowEl.getBoundingClientRect();
    const p = popup.getBoundingClientRect();
    const m = 8;
    let left = r.right + m;
    if (left + p.width > window.innerWidth - m) left = r.left - m - p.width;
    if (left < m) left = m;
    let top = r.top + r.height / 2 - p.height / 2;
    if (top < m) top = m;
    if (top + p.height > window.innerHeight - m) top = window.innerHeight - m - p.height;
    popup.style.left = Math.round(left) + 'px';
    popup.style.top = Math.round(top) + 'px';
  };

  const hide = () => {
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    currentRow = null;
    if (!popup) return;
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(-2px)';
    setTimeout(() => { if (popup && popup.style.opacity === '0') popup.style.display = 'none'; }, 120);
  };

  const show = (rowEl, dataUrl) => {
    if (!dataUrl) return;
    ensure();
    currentRow = rowEl;
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => {
      if (currentRow !== rowEl) return;
      imgEl.src = dataUrl;
      popup.style.display = 'block';
      const apply = () => {
        if (currentRow !== rowEl) return;
        position(rowEl);
        popup.style.opacity = '1';
        popup.style.transform = 'translateY(0)';
      };
      if (imgEl.complete && imgEl.naturalWidth) apply();
      else imgEl.onload = apply;
    }, 220);
  };

  return { show, hide };
})();

// Asset library panel — a 1-level folder tree of saved elements/groups. Rows
// rename inline (double-click); drag an asset onto a canvas to place it, or onto
// a folder row to move it in (drop on empty space sends it back to top level).
function renderAssets() {
  const listEl = document.getElementById('asset-list');
  if (!listEl) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const lib = state.assetLibrary || [];
  const folders = state.assetFolders || [];
  listEl.innerHTML = '';
  if (!lib.length && !folders.length) {
    listEl.innerHTML = '<div style="font-size:10px;color:var(--text-muted);padding:6px 2px;font-style:italic;line-height:1.5;">No saved assets yet. Select an element or group and press + to save it.</div>';
    return;
  }

  const GROUP_ICON = '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>';
  const TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>';

  // Reusable inline rename logic.
  const enterEditMode = (row, nameSpan, draggableRow, getName, commit) => {
    if (nameSpan.dataset.scrollInterval) {
      clearInterval(parseInt(nameSpan.dataset.scrollInterval, 10));
      nameSpan.dataset.scrollInterval = '';
      nameSpan.scrollLeft = 0;
    }
    nameSpan.contentEditable = 'true';
    if (draggableRow) row.draggable = false;
    nameSpan.focus();
    window.getSelection().selectAllChildren(nameSpan);
    const finish = () => {
      nameSpan.contentEditable = 'false';
      if (draggableRow) row.draggable = true;
      const v = nameSpan.innerText.trim();
      if (v) { commit(v); pushHistory(); }
      render();
    };
    nameSpan.addEventListener('blur', finish, { once: true });
    nameSpan.addEventListener('keydown', (ek) => {
      if (ek.key === 'Enter') { ek.preventDefault(); nameSpan.blur(); }
      if (ek.key === 'Escape') { ek.preventDefault(); nameSpan.innerText = getName(); nameSpan.blur(); }
    });
  };

  const wireRename = (row, nameSpan, draggableRow, getName, commit) => {
    row.addEventListener('dblclick', (e) => {
      if (e.target.closest('button') || e.target.closest('.folder-caret')) return;
      e.stopPropagation();
      if (window._assetClickRenderTimeout) {
        clearTimeout(window._assetClickRenderTimeout);
        window._assetClickRenderTimeout = null;
      }
      enterEditMode(row, nameSpan, draggableRow, getName, commit);
    });
  };

  const makeAssetRow = (asset, indented) => {
    const div = document.createElement('div');
    const isAssetSelected = (state.assetSelection || []).includes(asset.id);
    const parentFolder = asset.folderId ? (state.assetFolders || []).find(f => f.id === asset.folderId) : null;
    const isAssetReadOnly = parentFolder && parentFolder.readOnly;

    div.className = 'layer' + (isAssetSelected ? ' selected' : '') + (isAssetReadOnly ? ' read-only-asset' : '');
    div.draggable = true;
    div.dataset.assetId = asset.id;
    if (indented) div.style.paddingLeft = '22px';

    const hasDynamic = (asset.elements || []).some(el =>
      el._assetDmMap || (el.dynamic && Object.keys(el.dynamic).some(k => el.dynamic[k])));
    const hasAnimation = (asset.elements || []).some(el =>
      (el.animType && el.animType !== 'none') || (el.effectType && el.effectType !== 'none')
    );

    let tooltipParts = [];
    if (isAssetReadOnly) {
      tooltipParts.push('RMIT Pre-loaded asset (Read-only).');
    } else {
      tooltipParts.push('Double-click to rename. Drag onto a canvas to place, or onto a folder to move.');
    }
    if (hasDynamic && hasAnimation) {
      tooltipParts.push('Contains animations and dynamic data.');
    } else if (hasDynamic) {
      tooltipParts.push('Contains dynamic data.');
    } else if (hasAnimation) {
      tooltipParts.push('Contains animations.');
    }
    div.title = tooltipParts.join(' ');

    const icon = asset.kind === 'group' ? GROUP_ICON : (layerIcon(asset.iconType) || GROUP_ICON);
    
    const animIndicator = hasAnimation
      ? `<svg viewBox="0 0 24 24" width="12" height="12" style="flex-shrink:0;fill:var(--accent-base);" title="Contains animations/effects"><title>Contains animations/effects</title><polygon points="6 3 20 12 6 21 6 3"/></svg>`
      : '';
    const dynamicIndicator = hasDynamic
      ? `<svg viewBox="0 0 24 24" width="12" height="12" style="flex-shrink:0;fill:var(--accent-base);" title="Contains dynamic data"><title>Contains dynamic data</title><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
      : '';

    const deleteBtn = isAssetReadOnly ? '' : `<button class="icon-btn active" data-act="del" title="Delete asset">${TRASH}</button>`;
    div.innerHTML = `
      <svg class="layer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg>
      <span class="layer-name">${esc(asset.name)}</span>
      <span class="asset-indicators" style="display:flex; align-items:center; gap:4px; margin-left:8px; margin-right:6px; flex-shrink:0;">
        ${animIndicator}
        ${dynamicIndicator}
      </span>
      <div class="layer-actions">
        ${deleteBtn}
      </div>`;
    
    div.addEventListener('click', (e) => {
      if (e.target.closest('button') || div.querySelector('.layer-name').contentEditable === 'true') return;
      e.stopPropagation();
      
      if (!state.assetSelection) state.assetSelection = [];
      
      const hadCanvasSelection = (state.layerSelection && state.layerSelection.length > 0) || state.selectedElementId !== null;
      state.layerSelection = [];
      state.selectedElementId = null;
      
      const assetId = asset.id;
      
      if (e.ctrlKey || e.metaKey) {
        if (state.assetSelection.includes(assetId)) {
          state.assetSelection = state.assetSelection.filter(id => id !== assetId);
        } else {
          state.assetSelection.push(assetId);
        }
      } else if (e.shiftKey) {
        const allVisibleRowEls = Array.from(document.querySelectorAll('#asset-list .layer[data-asset-id]'));
        const allIds = allVisibleRowEls.map(el => el.dataset.assetId);
        const clickedIdx = allIds.indexOf(assetId);
        const lastSelectedId = state.assetSelection[state.assetSelection.length - 1];
        const lastIdx = lastSelectedId ? allIds.indexOf(lastSelectedId) : -1;
        
        if (lastIdx !== -1) {
          const start = Math.min(clickedIdx, lastIdx);
          const end = Math.max(clickedIdx, lastIdx);
          const rangeIds = allIds.slice(start, end + 1);
          rangeIds.forEach(id => {
            if (!state.assetSelection.includes(id)) {
              state.assetSelection.push(id);
            }
          });
        } else {
          state.assetSelection = [assetId];
        }
      } else {
        state.assetSelection = [assetId];
      }
      
      document.querySelectorAll('#asset-list .layer[data-asset-id]').forEach(row => {
        const rowId = row.dataset.assetId;
        if (state.assetSelection.includes(rowId)) {
          row.classList.add('selected');
        } else {
          row.classList.remove('selected');
        }
      });

      if (window._assetClickRenderTimeout) clearTimeout(window._assetClickRenderTimeout);
      window._assetClickRenderTimeout = setTimeout(() => {
        render();
      }, 200);
    });

    if (!isAssetReadOnly) {
      div.querySelector('[data-act="del"]').addEventListener('click', (e) => {
        e.stopPropagation();
        const isSelected = (state.assetSelection || []).includes(asset.id);
        if (isSelected) {
          state.assetLibrary = (state.assetLibrary || []).filter(a => !state.assetSelection.includes(a.id));
          state.assetSelection = [];
        } else {
          state.assetLibrary = (state.assetLibrary || []).filter(a => a.id !== asset.id);
          if (state.assetSelection) {
            state.assetSelection = state.assetSelection.filter(id => id !== asset.id);
          }
        }
        pushHistory();
        render();
      });

      wireRename(div, div.querySelector('.layer-name'), true,
        () => asset.name,
        (v) => {
          asset.name = uniqueName(v, (state.assetLibrary || []).filter(a => a.id !== asset.id).map(a => a.name));
          asset.renamed = true;
        });
    }

    div.addEventListener('dragstart', (e) => {
      const isSelected = (state.assetSelection || []).includes(asset.id);
      const idsToDrag = isSelected ? state.assetSelection.join(',') : asset.id;
      e.dataTransfer.setData('application/x-asset', idsToDrag);
      state.draggingAssetId = asset.id;
      const dragImageInfo = createAssetDragImage(asset);
      if (dragImageInfo && e.dataTransfer.setDragImage) {
        e.dataTransfer.setDragImage(dragImageInfo.canvas, dragImageInfo.offsetX, dragImageInfo.offsetY);
      }
      e.dataTransfer.effectAllowed = 'copyMove';
      assetHoverPreview.hide();
    });
    div.addEventListener('dragend', () => {
      state.draggingAssetId = null;
      if (state.dragOverPlaceholderId) {
        state.dragOverPlaceholderId = null;
        render(true);
      }
    });

    if (asset.iconType === 'image') {
      const imgEl = (asset.elements || []).find(el => el.type === 'image' && el.assetId);
      const dataUrl = imgEl ? state.assets[imgEl.assetId] : null;
      if (dataUrl) {
        div.addEventListener('mouseenter', () => assetHoverPreview.show(div, dataUrl));
        div.addEventListener('mouseleave', () => assetHoverPreview.hide());
        div.addEventListener('mousedown', () => assetHoverPreview.hide());
      }
    }
    return div;
  };

  const makeFolderRow = (folder) => {
    const div = document.createElement('div');
    div.className = 'layer' + (folder.readOnly ? ' read-only-folder' : '');
    div.dataset.folderId = folder.id;
    const caretRot = folder.collapsed ? 'transform:rotate(-90deg);' : '';
    const deleteBtn = folder.readOnly ? '' : `<button class="icon-btn active" data-act="del-folder" title="Delete folder (contents move out; Shift+Click to delete folder and all contents)">${TRASH}</button>`;
    div.innerHTML = `
      <svg class="folder-caret" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;cursor:pointer;${caretRot}transition:transform .15s;"><polyline points="6 9 12 15 18 9"/></svg>
      <svg class="layer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h5l2 3h9v11H4z"/></svg>
      <span class="layer-name" style="font-weight:600;">${esc(folder.name)}</span>
      <div class="layer-actions">
        ${deleteBtn}
      </div>`;
    div.querySelector('.folder-caret').addEventListener('click', (e) => {
      e.stopPropagation();
      folder.collapsed = !folder.collapsed;
      render();
    });
    if (!folder.readOnly) {
      div.querySelector('[data-act="del-folder"]').addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.shiftKey) {
          state.assetLibrary = (state.assetLibrary || []).filter(a => a.folderId !== folder.id);
        } else {
          (state.assetLibrary || []).forEach(a => { if (a.folderId === folder.id) a.folderId = null; });
        }
        state.assetFolders = (state.assetFolders || []).filter(f => f.id !== folder.id);
        pushHistory();
        render();
      });
    }
    const nameSpan = div.querySelector('.layer-name');
    const getName = () => folder.name;
    const commit = (v) => { folder.name = uniqueName(v, (state.assetFolders || []).filter(f => f.id !== folder.id).map(f => f.name)); };

    if (!folder.readOnly) {
      wireRename(div, nameSpan, false, getName, commit);
    }

    if (state.editingFolderId === folder.id) {
      delete state.editingFolderId;
      setTimeout(() => {
        enterEditMode(div, nameSpan, false, getName, commit);
      }, 50);
    }
    return div;
  };

  folders.forEach(folder => {
    listEl.appendChild(makeFolderRow(folder));
    if (!folder.collapsed) {
      lib.filter(a => a.folderId === folder.id).forEach(a => listEl.appendChild(makeAssetRow(a, true)));
    }
  });
  lib.filter(a => !a.folderId || !folders.some(f => f.id === a.folderId))
     .forEach(a => listEl.appendChild(makeAssetRow(a, false)));

  // Empty list space click handler
  listEl.addEventListener('click', (e) => {
    if (e.target === listEl) {
      state.assetSelection = [];
      render();
    }
  });
}

function showAddAssetDropdown(e) {
  ensureAssetsPanelExpanded();
  let popup = document.getElementById('asset-add-popup');
  if (popup) { popup.remove(); return; }

  popup = document.createElement('div');
  popup.id = 'asset-add-popup';
  popup.style.position = 'absolute';
  popup.style.background = 'var(--bg-panel)';
  popup.style.border = '1px solid var(--border-light)';
  popup.style.borderRadius = '6px';
  popup.style.padding = '4px 0';
  popup.style.zIndex = '1000000';
  popup.style.width = '200px';
  popup.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';

  const items = [
    {
      label: 'Add current selection',
      action: async () => {
        await saveSelectionAsAsset();
      }
    },
    {
      label: 'Upload new image file',
      action: () => {
        let fileInput = document.getElementById('asset-upload-file-input');
        if (!fileInput) {
          fileInput = document.createElement('input');
          fileInput.id = 'asset-upload-file-input';
          fileInput.type = 'file';
          fileInput.accept = '.png,.jpg,.jpeg,.svg';
          fileInput.multiple = true;
          fileInput.style.display = 'none';
          document.body.appendChild(fileInput);
          fileInput.addEventListener('change', async (ev) => {
            const files = Array.from(ev.target.files).filter(f => 
              /^image\/(png|jpeg|svg\+xml)$/i.test(f.type) || /\.(png|jpg|jpeg|svg)$/i.test(f.name)
            );
            if (files.length === 0) return;
            for (const file of files) {
              try {
                const { assetId, naturalW, naturalH } = await readFileAsAsset(file);
                if (!state.assetLibrary) state.assetLibrary = [];
                state.assetLibrary.push({
                  id: 'as_' + uid(),
                  name: uniqueName(file.name, (state.assetLibrary || []).map(a => a.name)),
                  kind: 'element',
                  iconType: 'image',
                  elements: [
                    {
                      id: uid(),
                      type: 'image',
                      name: file.name,
                      assetId,
                      width: naturalW,
                      height: naturalH,
                      x: 0,
                      y: 0
                    }
                  ]
                });
              } catch (err) {
                console.error(err);
              }
            }
            pushHistory();
            render();
          });
        }
        fileInput.click();
      }
    }
  ];

  items.forEach(item => {
    const btn = document.createElement('div');
    btn.textContent = item.label;
    btn.style.padding = '8px 16px';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '12px';
    btn.style.color = 'var(--text-main)';
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'var(--accent-base)';
      btn.style.color = 'var(--text-on-accent, var(--text-bright))';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text-main)';
    });
    btn.addEventListener('click', () => {
      item.action();
      popup.remove();
    });
    popup.appendChild(btn);
  });

  document.body.appendChild(popup);

  const triggerEl = e.currentTarget || e.target || e;
  const rect = triggerEl.getBoundingClientRect();
  popup.style.left = rect.left + 'px';
  popup.style.top = (rect.bottom + window.scrollY + 4) + 'px';

  const popupRect = popup.getBoundingClientRect();
  if (popupRect.right > window.innerWidth) {
    popup.style.left = (window.innerWidth - popupRect.width - 8) + 'px';
  }
  if (popupRect.bottom > window.innerHeight) {
    popup.style.top = (rect.top - popupRect.height - 4) + 'px';
  }

  const closer = (ev) => {
    if (!popup.contains(ev.target) && ev.target !== triggerEl && !triggerEl.contains(ev.target)) {
      popup.remove();
      document.removeEventListener('mousedown', closer);
    }
  };
  document.addEventListener('mousedown', closer);
}

document.getElementById('btn-asset-add')?.addEventListener('click', (e) => { e.stopPropagation(); showAddAssetDropdown(e); });
document.getElementById('btn-asset-folder')?.addEventListener('click', (e) => { e.stopPropagation(); createAssetFolder(); });

// Handle dragging files directly from computer or layers to the assets panel
(function initAssetsPanelDropTarget() {
  // Use a delegation listener on document to ensure it works even if elements are updated
  document.addEventListener('dragover', (e) => {
    const ap = document.getElementById('panel-section-assets');
    if (!ap) return;
    const rect = ap.getBoundingClientRect();
    const overAp = (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom);
    const t = e.dataTransfer.types;
    if (overAp && (t.includes('Files') || t.includes('text/plain') || t.includes('application/x-asset'))) {
      e.preventDefault();
      ap.style.background = 'var(--accent-dark)';
      
      // Clear all folder row highlights first
      document.querySelectorAll('#asset-list [data-folder-id]').forEach(f => f.style.background = '');
      
      // Highlight specific folder row if hovered and NOT dragging to the left
      const isLeftDrag = (e.clientX - rect.left < 45);
      if (!isLeftDrag) {
        const folderRow = e.target.closest('[data-folder-id]');
        if (folderRow) {
          folderRow.style.background = 'var(--accent-base)';
        } else {
          const assetRow = e.target.closest('[data-asset-id]');
          if (assetRow) {
            const targetAsset = (state.assetLibrary || []).find(a => a.id === assetRow.dataset.assetId);
            if (targetAsset && targetAsset.folderId) {
              const targetFolderRow = document.querySelector(`#asset-list [data-folder-id="${targetAsset.folderId}"]`);
              if (targetFolderRow) {
                targetFolderRow.style.background = 'var(--accent-base)';
              }
            }
          }
        }
      }
    } else {
      ap.style.background = '';
      document.querySelectorAll('#asset-list [data-folder-id]').forEach(f => f.style.background = '');
    }
  });

  document.addEventListener('drop', async (e) => {
    const ap = document.getElementById('panel-section-assets');
    if (!ap) return;
    const rect = ap.getBoundingClientRect();
    const overAp = (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom);
    if (!overAp) return;
    
    ap.style.background = '';
    document.querySelectorAll('#asset-list [data-folder-id]').forEach(f => f.style.background = '');
    
    const isLeftDrag = (e.clientX - rect.left < 45);
    let targetFolderId = null;
    if (!isLeftDrag) {
      const folderRow = e.target.closest('[data-folder-id]');
      if (folderRow) {
        targetFolderId = folderRow.dataset.folderId;
      } else {
        const assetRow = e.target.closest('[data-asset-id]');
        if (assetRow) {
          const targetAsset = (state.assetLibrary || []).find(a => a.id === assetRow.dataset.assetId);
          if (targetAsset) {
            targetFolderId = targetAsset.folderId || null;
          }
        }
      }
    }
    
    const targetFolder = targetFolderId ? (state.assetFolders || []).find(f => f.id === targetFolderId) : null;
    const isTargetReadOnly = targetFolder && targetFolder.readOnly;

    // 1. Files dropped directly from computer
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      ensureAssetsPanelExpanded();
      e.preventDefault();
      e.stopPropagation();
      if (isTargetReadOnly) {
        await showAdflowAlert("Cannot add assets to a read-only folder.");
        return;
      }
      const files = Array.from(e.dataTransfer.files).filter(f => 
        /^image\/(png|jpeg|svg\+xml)$/i.test(f.type) || /\.(png|jpg|jpeg|svg)$/i.test(f.name)
      );
      if (files.length === 0) {
        await showAdflowAlert('Only image files (PNG, JPEG, SVG) are allowed.');
        return;
      }
      for (const file of files) {
        try {
          const { assetId, naturalW, naturalH } = await readFileAsAsset(file);
          if (!state.assetLibrary) state.assetLibrary = [];
          state.assetLibrary.push({
            id: 'as_' + uid(),
            name: uniqueName(file.name, (state.assetLibrary || []).map(a => a.name)),
            kind: 'element',
            iconType: 'image',
            folderId: targetFolderId || null,
            elements: [
              {
                id: uid(),
                type: 'image',
                name: file.name,
                assetId,
                width: naturalW,
                height: naturalH,
                x: 0,
                y: 0
              }
            ]
          });
        } catch (err) {
          console.error(err);
        }
      }
      pushHistory();
      render();
      return;
    }

    // 2. Dragging layers from Layers panel (carries text/plain)
    const rawIds = e.dataTransfer.getData('text/plain');
    if (rawIds) {
      const canvas = getActiveCanvas();
      if (canvas) {
        const ids = rawIds.split(',');
        const els = canvas.elements.filter(el => ids.includes(el.id));
        if (els.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          if (isTargetReadOnly) {
            await showAdflowAlert("Cannot add assets to a read-only folder.");
            return;
          }
          const prevSelection = state.layerSelection;
          const prevSelectedId = state.selectedElementId;
          state.layerSelection = ids;
          state.selectedElementId = ids[ids.length - 1];
          await saveSelectionAsAsset(targetFolderId);
          state.layerSelection = prevSelection;
          state.selectedElementId = prevSelectedId;
          render();
        }
      }
      return;
    }

    // 3. Dragging assets inside panel (carries application/x-asset)
    const rawAids = e.dataTransfer.getData('application/x-asset');
    if (rawAids) {
      e.preventDefault();
      e.stopPropagation();
      const aids = rawAids.split(',');
      const hasReadOnlyAsset = aids.some(aid => {
        const a = (state.assetLibrary || []).find(x => x.id === aid);
        if (a) {
          const pf = a.folderId ? (state.assetFolders || []).find(f => f.id === a.folderId) : null;
          return pf && pf.readOnly;
        }
        return false;
      });
      if (hasReadOnlyAsset) {
        alert("Pre-loaded read-only assets cannot be moved.");
        return;
      }
      if (isTargetReadOnly) {
        alert("Cannot move assets into a read-only folder.");
        return;
      }
      let changed = false;
      aids.forEach(aid => {
        const a = (state.assetLibrary || []).find(x => x.id === aid);
        if (a && a.folderId !== targetFolderId) {
          a.folderId = targetFolderId || null;
          changed = true;
        }
      });
      if (changed) {
        pushHistory();
        render();
      }
      return;
    }
  });
})();

function renderLayers() {
  const c = getActiveCanvas();
  if (!c) { layersEl.innerHTML = ''; return; }

  const frameIdx = state.frames.findIndex(f => f.id === state.activeFrameId);
  layersEl.innerHTML = `
    <div class="layer-section-title" title="Layers that stay on top of every frame — typical for logos and compliance text. Drop a layer here to pin it as a permanent overlay.">Always Top</div>
    <div id="layers-top" class="layer-dropzone" data-persistent="top" style="min-height:16px;margin-bottom:8px"></div>
    <div class="layer-section-title" title="Layers that only appear in the active frame. The animation timeline drives these.">Main Layers (Frame ${frameIdx + 1})</div>
    <div id="layers-mid" class="layer-dropzone" data-persistent="false" style="min-height:16px;margin-bottom:8px"></div>
    <div class="layer-section-title" title="Layers that stay under every frame — typical for backgrounds. Drop a layer here to pin it as a permanent background.">Always Bottom</div>
    <div id="layers-bot" class="layer-dropzone" data-persistent="bottom" style="min-height:16px"></div>
  `;

  const renderGroup = (elements, containerId) => {
    const container = document.getElementById(containerId);
    if (elements.length === 0) {
      container.innerHTML = '<div style="font-size:10px;color:var(--text-muted);padding:4px 0;font-style:italic">Empty</div>';
    }

    [...elements].reverse().forEach((el) => {
      const div = document.createElement('div');
      const isSel = state.selectedElementId === el.id || state.layerSelection?.includes(el.id);
      // Mask group highlighting: if a member of a mask group is selected,
      // show a lighter vertical indicator on the other group member.
      let siblingSelectedClass = '';
      if (!isSel) {
        if (isActiveMask(el)) {
          const imgBeneath = findImageBeneath(c, el);
          if (imgBeneath) {
            const partnerSel = state.selectedElementId === imgBeneath.id || state.layerSelection?.includes(imgBeneath.id);
            if (partnerSel) siblingSelectedClass = ' mask-group-sibling-selected';
          }
        } else if (el.type === 'image') {
          const maskAbove = findMaskAbove(c, el);
          if (maskAbove && isActiveMask(maskAbove)) {
            const partnerSel = state.selectedElementId === maskAbove.id || state.layerSelection?.includes(maskAbove.id);
            if (partnerSel) siblingSelectedClass = ' mask-group-sibling-selected';
          }
        }
      }
      div.className = 'layer' + (isSel ? ' selected' : '') + siblingSelectedClass;
      div.draggable = true;
      div.dataset.id = el.id;
      const isRmitLogo = el.role === 'rmit-logo' || (el.customName && el.customName.toLowerCase().includes('rmit') && el.customName.toLowerCase().includes('logo'));
      const svgInnerHtml = isRmitLogo ? layerIcon('pixel') : layerIcon(el.type);
      const iconStyle = el.autoArranged ? 'style="color: var(--accent-base); opacity: 1;"' : '';
      const iconHtml = `<svg class="layer-icon" ${iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${svgInnerHtml}</svg>`;

      const eyeIconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

      // Role-assignment button (3rd icon, leftmost in actions).
      // - Gray only when the element has no role yet (or role === 'misc').
      // - Accent (purple) for every known role, whether auto-detected or
      //   manually picked. The tooltip differentiates the two so the user
      //   can still tell at a glance.
      const roleId = el.role || 'misc';
      const isAssigned = !!(el.role && el.role !== 'misc');
      const roleAssignedManually = isAssigned && el.roleAuto === false;
      const roleLabel = ROLE_LABELS[roleId] || 'Unassigned';
      const roleTooltip = isAssigned
        ? (roleAssignedManually
            ? `Auto-resize role: ${roleLabel} (click to change)`
            : `Auto-resize role: ${roleLabel} (auto-detected — click to change)`)
        : `Auto-resize role: Unassigned (click to assign)`;
      const roleIconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;

      div.innerHTML = `
        ${iconHtml}
        <span class="layer-name" style="${el.hidden ? 'opacity:0.5;text-decoration:line-through' : ''}">${layerLabel(el)}</span>
        <div class="layer-actions">
          <button class="icon-btn role-btn ${isAssigned ? 'role-assigned' : ''}" data-act="role" title="${roleTooltip}">
            ${roleIconSvg}
          </button>
          <button class="icon-btn ${el.locked ? 'active' : ''}" data-act="lock" title="Toggle lock (Hold Shift to apply to all canvases)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </button>
          <button class="icon-btn ${!el.hidden ? 'active' : ''} ${el.isMask ? 'mask-eye' : ''}" data-act="hide" title="${el.isMask ? (el.hidden ? 'Mask inactive — click to enable (Hold Shift to apply to all canvases)' : 'Mask active — click to disable (Hold Shift to apply to all canvases)') : 'Toggle visibility (Hold Shift to apply to all canvases)'}">
            ${eyeIconHtml}
          </button>
        </div>
      `;

      div.addEventListener('mouseenter', () => {
        const activeCanvasNode = document.querySelector(`.canvas-frame[data-canvas-id="${state.activeCanvasId}"] .canvas`);
        if (activeCanvasNode) {
          activeCanvasNode.querySelectorAll('.layer-hover-outline').forEach(n => n.remove());
          const hoverOutline = document.createElement('div');
          hoverOutline.className = 'layer-hover-outline';
          hoverOutline.style.left = (el.x - 1.5) + 'px';
          hoverOutline.style.top = (el.y - 1.5) + 'px';
          hoverOutline.style.width = (el.width + 3) + 'px';
          hoverOutline.style.height = (el.height + 3) + 'px';
          hoverOutline.style.transform = `rotate(${el.rotation || 0}deg)`;
          hoverOutline.style.transformOrigin = 'center';
          activeCanvasNode.appendChild(hoverOutline);
        }

        const nameSpan = div.querySelector('.layer-name');
        if (nameSpan.contentEditable === 'true') return;
        if (nameSpan.scrollWidth > nameSpan.clientWidth) {
          let pos = 0;
          nameSpan.dataset.scrollInterval = setInterval(() => {
            pos += 1;
            if (pos > nameSpan.scrollWidth - nameSpan.clientWidth + 20) {
              pos = 0;
              nameSpan.scrollLeft = 0;
            } else {
              nameSpan.scrollLeft = pos;
            }
          }, 30);
        }
      });
      div.addEventListener('mouseleave', () => {
        const activeCanvasNode = document.querySelector(`.canvas-frame[data-canvas-id="${state.activeCanvasId}"] .canvas`);
        if (activeCanvasNode) {
          activeCanvasNode.querySelectorAll('.layer-hover-outline').forEach(n => n.remove());
        }

        const nameSpan = div.querySelector('.layer-name');
        if (nameSpan.dataset.scrollInterval) {
          clearInterval(nameSpan.dataset.scrollInterval);
          nameSpan.dataset.scrollInterval = '';
          nameSpan.scrollLeft = 0;
        }
      });

      div.addEventListener('dragstart', (e) => {
        let ids = [el.id];
        if (state.layerSelection && state.layerSelection.includes(el.id)) {
          ids = state.layerSelection;
        }
        e.dataTransfer.setData('text/plain', ids.join(','));
        div.style.opacity = '0.4';
      });
      div.addEventListener('dragend', () => div.style.opacity = '1');
      div.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = div.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          div.style.borderTop = '2px solid #7c5cff';
          div.style.borderBottom = '';
        } else {
          div.style.borderTop = '';
          div.style.borderBottom = '2px solid #7c5cff';
        }
      });
      div.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        div.style.borderTop = '';
        div.style.borderBottom = '';
      });
      div.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = div.getBoundingClientRect();
        const dropBelow = e.clientY >= rect.top + rect.height / 2;
        div.style.borderTop = '';
        div.style.borderBottom = '';
        const data = e.dataTransfer.getData('text/plain');
        if (!data) return;
        const draggedIds = data.split(',');
        if (draggedIds.includes(el.id)) return;

        const elementsToMove = [];
        draggedIds.forEach(id => {
          const idx = c.elements.findIndex(x => x.id === id);
          if (idx !== -1) elementsToMove.push(c.elements[idx]);
        });
        if (elementsToMove.length === 0) return;

        c.elements = c.elements.filter(x => !draggedIds.includes(x.id));

        elementsToMove.forEach(moved => {
          moved.persistent = el.persistent;
          if (el.persistent === false) moved.frameId = el.frameId;
          // Persistent layers (top/bottom) cannot host masks — drop the flag if set.
          if (el.persistent !== false && moved.isMask) delete moved.isMask;
        });

        const newTargetIdx = c.elements.findIndex(x => x.id === el.id);
        if (dropBelow) {
          // Visual Below = Array Before (splice at newTargetIdx)
          c.elements.splice(newTargetIdx, 0, ...elementsToMove);
        } else {
          // Visual Above = Array After (splice at newTargetIdx + 1)
          c.elements.splice(newTargetIdx + 1, 0, ...elementsToMove);
        }
        pushHistory();
        render();
      });

      div.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        e.stopPropagation();
        const nameSpan = div.querySelector('.layer-name');
        if (nameSpan.dataset.scrollInterval) {
          clearInterval(parseInt(nameSpan.dataset.scrollInterval, 10));
          nameSpan.dataset.scrollInterval = '';
          nameSpan.scrollLeft = 0;
        }

        // Get the clean editable text (without prefix HTML)
        const base = baseLayerLabel(el);
        let count = 1;
        for (let i = 0; i < c.elements.length; i++) {
          const otherEl = c.elements[i];
          if (otherEl.id === el.id) break;
          if (baseLayerLabel(otherEl) === base) {
            count++;
          }
        }
        const editableText = count > 1 ? `${base} ${count}` : base;

        nameSpan.innerText = editableText;
        nameSpan.contentEditable = 'true';
        div.draggable = false; // Disable dragging to allow text selection
        nameSpan.focus();
        const sel = window.getSelection();
        sel.selectAllChildren(nameSpan);
        const finishEdit = () => {
          nameSpan.contentEditable = 'false';
          div.draggable = true; // Restore dragging
          let newName = nameSpan.innerText.trim() || '';
          
          // Strip manually typed prefixes to prevent double prefixing
          if (newName.startsWith('[mask] ')) {
            newName = newName.slice(7);
          } else if (newName.startsWith('[masked] ')) {
            newName = newName.slice(9);
          }

          el.customName = newName;
          nameSpan.innerHTML = layerLabel(el);
          pushHistory();
          render();
        };

        nameSpan.addEventListener('blur', finishEdit, { once: true });
        nameSpan.addEventListener('keydown', (ek) => {
          if (ek.key === 'Enter') {
            ek.preventDefault();
            nameSpan.blur();
          }
          if (ek.key === 'Escape') {
            ek.preventDefault();
            nameSpan.innerHTML = layerLabel(el); // Revert back
            nameSpan.blur();
          }
        });
      });

      div.addEventListener('click', (e) => {
        const act = e.target.closest('button')?.dataset.act;
        if (act === 'role') {
          const btn = e.target.closest('button');
          openRolePicker(el, btn);
          return;
        }
        if (act === 'lock') {
          const toToggle = (state.layerSelection?.includes(el.id)) ? state.layerSelection : [el.id];
          const newLocked = !el.locked;
          if (e.shiftKey) {
            const targetNames = toToggle.map(id => {
              const item = c.elements.find(x => x.id === id);
              return item ? baseLayerLabel(item) : null;
            }).filter(Boolean);
            state.canvases.forEach(canvas => {
              canvas.elements.forEach(item => {
                if (targetNames.includes(baseLayerLabel(item))) {
                  item.locked = newLocked;
                }
              });
            });
          } else {
            toToggle.forEach(id => {
              const item = c.elements.find(x => x.id === id);
              if (item) item.locked = newLocked;
            });
          }
          pushHistory();
          render();
          return;
        }
        if (act === 'hide') {
          const toToggle = (state.layerSelection?.includes(el.id)) ? state.layerSelection : [el.id];
          const newHidden = !el.hidden;
          if (e.shiftKey) {
            const targetNames = toToggle.map(id => {
              const item = c.elements.find(x => x.id === id);
              return item ? baseLayerLabel(item) : null;
            }).filter(Boolean);
            state.canvases.forEach(canvas => {
              canvas.elements.forEach(item => {
                if (targetNames.includes(baseLayerLabel(item))) {
                  item.hidden = newHidden;
                }
              });
            });
          } else {
            toToggle.forEach(id => {
              const item = c.elements.find(x => x.id === id);
              if (item) item.hidden = newHidden;
            });
          }
          pushHistory();
          render();
          return;
        }
        if (act === 'del') {
          const toDel = (state.layerSelection?.includes(el.id)) ? state.layerSelection : [el.id];
          c.elements = c.elements.filter(x => !toDel.includes(x.id));
          if (toDel.includes(state.selectedElementId)) state.selectedElementId = null;
          state.layerSelection = [];
          pushHistory();
          render();
          return;
        }

        if (!state.layerSelection) state.layerSelection = [];

        let changed = false;
        if (e.ctrlKey || e.metaKey) {
          if (state.layerSelection.includes(el.id)) state.layerSelection = state.layerSelection.filter(id => id !== el.id);
          else state.layerSelection.push(el.id);
          state.lastSelectedLayerId = el.id;
          changed = true;
        } else if (e.shiftKey && state.lastSelectedLayerId) {
          const revElements = [...c.elements].reverse();
          const start = revElements.findIndex(x => x.id === state.lastSelectedLayerId);
          const end = revElements.findIndex(x => x.id === el.id);
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          state.layerSelection = revElements.slice(min, max + 1).map(x => x.id);
          changed = true;
        } else {
          if (state.layerSelection.length !== 1 || state.layerSelection[0] !== el.id) {
            state.layerSelection = [el.id];
            state.lastSelectedLayerId = el.id;
            changed = true;
          }
        }

        if (changed) {
          state.selectedElementId = state.layerSelection.length === 1 ? state.layerSelection[0] : null;
          render();
        }
      });
      container.appendChild(div);
    });
  };

  const elsTop = c.elements.filter(e => e.persistent === 'top');
  const elsMid = c.elements.filter(e => e.persistent === false && e.frameId === state.activeFrameId);
  const elsBot = c.elements.filter(e => e.persistent === 'bottom');

  renderGroup(elsTop, 'layers-top');
  renderGroup(elsMid, 'layers-mid');
  renderGroup(elsBot, 'layers-bot');

  document.querySelectorAll('.layer-dropzone').forEach(dz => {
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.style.background = 'rgba(124,92,255,0.1)'; });
    dz.addEventListener('dragleave', () => dz.style.background = '');
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.style.background = '';
      if (e.target.closest('.layer')) return; // handled by layer item drop
      const data = e.dataTransfer.getData('text/plain');
      if (!data) return;
      const draggedIds = data.split(',');

      const elementsToMove = [];
      draggedIds.forEach(id => {
        const idx = c.elements.findIndex(x => x.id === id);
        if (idx !== -1) elementsToMove.push(c.elements[idx]);
      });
      if (elementsToMove.length === 0) return;

      c.elements = c.elements.filter(x => !draggedIds.includes(x.id));

      const targetPersistent = dz.dataset.persistent === 'false' ? false : dz.dataset.persistent;
      elementsToMove.forEach(moved => {
        moved.persistent = targetPersistent;
        if (targetPersistent === false) moved.frameId = state.activeFrameId;
      });

      // Dropping into empty zone means we want it at the visual bottom.
      // Visual Bottom = Array Start.
      // Find the first index of an element in this group, or just put it at 0.
      const firstGroupIdx = c.elements.findIndex(x => x.persistent === targetPersistent && (targetPersistent !== false || x.frameId === state.activeFrameId));
      if (firstGroupIdx !== -1) {
        c.elements.splice(firstGroupIdx, 0, ...elementsToMove);
      } else {
        c.elements.push(...elementsToMove);
      }

      pushHistory();
      render();
    });
  });
}

function layerIcon(type) {
  if (type === 'text') return '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>';
  if (type === 'image') return '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5L11 18"/>';
  if (type === 'rect') return '<rect x="4" y="4" width="16" height="16" rx="2"/>';
  if (type === 'circle') return '<circle cx="12" cy="12" r="8"/>';
  if (type === 'pixel') return '<g transform="scale(0.041)"><path d="M290.78,0h-74.15v60.23h-123.75v125.78H0v184.74h92.88v125.78h123.5v60.23h65.55c152.85,0,287.74-123.5,287.74-277.62S444.14,0,290.78,0" fill="currentColor"/></g>';
  if (type === 'button') return '<rect x="3" y="8" width="18" height="8" rx="4"/>';
  if (type === 'line') return '<line x1="5" y1="19" x2="19" y2="5"/>';
  return '';
}

function baseLayerLabel(el) {
  if (el.customName) return el.customName;
  if (el.type === 'text') return (el.text || 'Text').slice(0, 28) || 'Text';
  if (el.type === 'button') return 'Button · ' + ((el.text || '').slice(0, 20));
  if (el.type === 'image') return 'Image';
  if (el.type === 'rect') return 'Rectangle';
  if (el.type === 'circle') return 'Circle';
  if (el.type === 'pixel') return 'RMIT Pixel';
  if (el.type === 'line') return 'Line';
  return el.type;
}

function layerLabel(el) {
  const base = baseLayerLabel(el);
  const canvas = getActiveCanvas();
  if (!canvas) return base;

  let count = 1;
  for (let i = 0; i < canvas.elements.length; i++) {
    const otherEl = canvas.elements[i];
    if (otherEl.id === el.id) break;
    if (baseLayerLabel(otherEl) === base) {
      count++;
    }
  }
  const label = count > 1 ? `${base} ${count}` : base;
  if (el.isMask) {
    return `<span style="color: var(--accent-base, #7c5cff); margin-right: 4px; font-weight: 500;">[mask]</span> ${label}`;
  }
  if (findMaskAbove(canvas, el)) {
    return `<span style="color: var(--accent-base, #7c5cff); margin-right: 4px; font-weight: 500;">[masked]</span> ${label}`;
  }
  return label;
}

function layerLabelText(el) {
  const base = baseLayerLabel(el);
  const canvas = getActiveCanvas();
  if (!canvas) return base;

  let count = 1;
  for (let i = 0; i < canvas.elements.length; i++) {
    const otherEl = canvas.elements[i];
    if (otherEl.id === el.id) break;
    if (baseLayerLabel(otherEl) === base) {
      count++;
    }
  }
  const label = count > 1 ? `${base} ${count}` : base;
  if (el.isMask) {
    return `[mask] ${label}`;
  }
  if (findMaskAbove(canvas, el)) {
    return `[masked] ${label}`;
  }
  return label;
}

function reorder(c, id, dir) {
  const i = c.elements.findIndex(e => e.id === id);
  if (i < 0) return;
  const j = i + dir;
  if (j < 0 || j >= c.elements.length) return;
  [c.elements[i], c.elements[j]] = [c.elements[j], c.elements[i]];
  render();
}

// Insert el at the top of its persistent group (and matching frame for mid).
// Preserves the array invariant that elements within a group stay contiguous,
// which is required for shiftLayerOrder / drag-drop / export to behave.
function insertAtGroupEnd(arr, el) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const x = arr[i];
    if (x.persistent === el.persistent && (el.persistent !== false || x.frameId === el.frameId)) {
      arr.splice(i + 1, 0, el);
      return;
    }
  }
  arr.push(el);
}

// ============================================================================
// Properties panel
// ============================================================================
let activeFramePreviewType = null;
let framePreviewTimeoutId = null;

// Registered by the props-panel wiring each render; lets a global guard stop
// previews even after the panel DOM was rebuilt (which swallows mouseleave).
let stopElementAnimPreviewFn = null;
let stopElementEffectPreviewFn = null;
// startPreviewLoop is a closure inside renderProps(); register it so the
// top-level wireCustomSelects() (animDirection dropdown) can drive the preview.
let startElementAnimPreviewFn = null;
// Set when a hover-driven effect preview starts via the global startEffectPreview
// (panDir custom select), which bypasses the panel closure's activeEffectVal.
let hoverEffectPreviewActive = false;

function stopAllAnimationPreviews() {
  if (stopElementAnimPreviewFn) stopElementAnimPreviewFn();
  if (stopElementEffectPreviewFn) stopElementEffectPreviewFn();
  if (activeFramePreviewType || framePreviewTimeoutId) stopFrameTransitionPreview();
}

// Per-panel mouseleave can be missed when renderProps() rebuilds the panel under
// the cursor, leaving a preview running forever. This document-level guard stops
// every preview as soon as the pointer hovers anything outside the 3 sub-panels.
document.addEventListener('mouseover', (e) => {
  const t = e.target;
  if (t && t.closest && t.closest('#in-transition-preview-area, #effects-preview-area, #frame-transition-preview-area')) return;
  stopAllAnimationPreviews();
});
document.addEventListener('mouseleave', () => stopAllAnimationPreviews());

function startFrameTransitionPreview(type) {
  if (framePreviewTimeoutId) {
    clearTimeout(framePreviewTimeoutId);
    framePreviewTimeoutId = null;
  }
  activeFramePreviewType = type;
  if (type === 'none') {
    stopFrameTransitionPreview();
    return;
  }

  const c = getActiveCanvas();
  if (!c) return;

  const activeIdx = state.frames.findIndex(f => f.id === state.activeFrameId);
  if (activeIdx < 0) return;
  if (activeIdx === 0 && !(state.loopAd && state.frames.length > 1)) return;
  const prevFrameId = activeIdx === 0
    ? state.frames[state.frames.length - 1].id
    : state.frames[activeIdx - 1].id;
  const nextFrameId = state.activeFrameId;

  const canvasDom = document.querySelector(`.canvas-frame[data-canvas-id="${c.id}"] .canvas`);
  if (!canvasDom) return;

  const runCycle = () => {
    if (activeFramePreviewType !== type) return;

    const currentFrame = state.frames.find(f => f.id === state.activeFrameId);
    if (!currentFrame) return;

    const duration = currentFrame.transitionDuration !== undefined ? currentFrame.transitionDuration : 0.5;
    const fade = currentFrame.transitionFade !== false;
    const bounce = !!currentFrame.transitionBounce;
    const zoomFrom = currentFrame.transitionZoomFrom !== undefined ? currentFrame.transitionZoomFrom : 80;
    const angle = currentFrame.transitionAngle !== undefined ? currentFrame.transitionAngle : 0;
    let dir = currentFrame.transitionDirection || (type.startsWith('slide-') ? type.replace('slide-', '') : (type.startsWith('swipe-') ? type.replace('swipe-', '') : 'left'));
    if (dir === 'short' || dir === 'long') {
      const isShort = dir === 'short';
      if (c.width > c.height) {
        dir = isShort ? 'up' : 'left';
      } else if (c.width < c.height) {
        dir = isShort ? 'left' : 'up';
      } else {
        dir = isShort ? 'up' : 'left';
      }
    }
    const irisShape = currentFrame.transitionIrisShape || 'circle';
    const irisOrigin = currentFrame.transitionIrisOrigin || 'center';
    const blurAmount = currentFrame.transitionBlurAmount !== undefined ? currentFrame.transitionBlurAmount : 20;
    const blurScaleVal = currentFrame.transitionBlurScale !== undefined ? currentFrame.transitionBlurScale : 100;
    const blurScale = blurScaleVal / 100;

    let overlay = canvasDom.querySelector('.frame-transition-preview-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.className = 'frame-transition-preview-overlay';
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.zIndex = '1000';
    overlay.style.pointerEvents = 'none';
    overlay.style.overflow = 'hidden';
    overlay.style.perspective = '1200px';

    const excludePers = !!currentFrame.excludePersistent;

    const prevContainer = document.createElement('div');
    prevContainer.style.position = 'absolute';
    prevContainer.style.inset = '0';
    prevContainer.style.background = getCanvasBg(c, prevFrameId);
    prevContainer.style.zIndex = '1';

    const prevBot = document.createElement('div'); prevBot.style.position = 'absolute'; prevBot.style.inset = '0'; prevBot.style.zIndex = '1';
    const prevMid = document.createElement('div'); prevMid.style.position = 'absolute'; prevMid.style.inset = '0'; prevMid.style.zIndex = '2';
    const prevTop = document.createElement('div'); prevTop.style.position = 'absolute'; prevTop.style.inset = '0'; prevTop.style.zIndex = '3';
    prevContainer.appendChild(prevBot);
    prevContainer.appendChild(prevMid);
    prevContainer.appendChild(prevTop);

    c.elements.forEach(el => {
      if (el.persistent === 'bottom') {
        if (!excludePers) prevBot.appendChild(elementNode(el, c));
      }
      else if (el.persistent === 'top') {
        if (!excludePers) prevTop.appendChild(elementNode(el, c));
      }
      else if (el.frameId === prevFrameId) prevMid.appendChild(elementNode(el, c));
    });
    overlay.appendChild(prevContainer);

    const nextContainer = document.createElement('div');
    nextContainer.style.position = 'absolute';
    nextContainer.style.inset = '0';
    nextContainer.style.background = getCanvasBg(c, nextFrameId);
    nextContainer.style.zIndex = '2';

    const nextBot = document.createElement('div'); nextBot.style.position = 'absolute'; nextBot.style.inset = '0'; nextBot.style.zIndex = '1';
    const nextMid = document.createElement('div'); nextMid.style.position = 'absolute'; nextMid.style.inset = '0'; nextMid.style.zIndex = '2';
    const nextTop = document.createElement('div'); nextTop.style.position = 'absolute'; nextTop.style.inset = '0'; nextTop.style.zIndex = '3';
    nextContainer.appendChild(nextBot);
    nextContainer.appendChild(nextMid);
    nextContainer.appendChild(nextTop);

    c.elements.forEach(el => {
      if (el.persistent === 'bottom') {
        if (!excludePers) nextBot.appendChild(elementNode(el, c));
      }
      else if (el.persistent === 'top') {
        if (!excludePers) nextTop.appendChild(elementNode(el, c));
      }
      else if (el.frameId === nextFrameId) nextMid.appendChild(elementNode(el, c));
    });
    overlay.appendChild(nextContainer);

    if (excludePers) {
      const staticBot = document.createElement('div');
      staticBot.style.position = 'absolute';
      staticBot.style.inset = '0';
      staticBot.style.zIndex = '0';
      c.elements.forEach(el => {
        if (el.persistent === 'bottom') staticBot.appendChild(elementNode(el, c));
      });
      overlay.appendChild(staticBot);

      const staticTop = document.createElement('div');
      staticTop.style.position = 'absolute';
      staticTop.style.inset = '0';
      staticTop.style.zIndex = '3';
      c.elements.forEach(el => {
        if (el.persistent === 'top') staticTop.appendChild(elementNode(el, c));
      });
      overlay.appendChild(staticTop);
    }

    canvasDom.appendChild(overlay);
    nextContainer.style.display = 'none';

    framePreviewTimeoutId = setTimeout(() => {
      if (activeFramePreviewType !== type) return;
      nextContainer.style.display = 'block';

      const animName = `preview-frame-trans-${Date.now()}`;
      const animNameOut = `preview-frame-trans-out-${Date.now()}`;
      let keyframes = '';
      let keyframesOut = '';

      if (type === 'fade') {
        keyframes = `@keyframes ${animName} { from { opacity: 0; } to { opacity: 1; } }`;
      } else if (type === 'slide' || type === 'push') {
        let transformFrom = '';
        let transformToOut = '';
        if (dir === 'up') { transformFrom = 'translateY(100%)'; transformToOut = 'translateY(-100%)'; }
        else if (dir === 'down') { transformFrom = 'translateY(-100%)'; transformToOut = 'translateY(100%)'; }
        else if (dir === 'left') { transformFrom = 'translateX(100%)'; transformToOut = 'translateX(-100%)'; }
        else if (dir === 'right') { transformFrom = 'translateX(-100%)'; transformToOut = 'translateX(100%)'; }

        if (bounce) {
          keyframes = `@keyframes ${animName} {\n`;
          const d = 4.0;
          const freq = 2.0;
          for (let pct = 0; pct <= 100; pct += 5) {
            const t = pct / 100;
            const x = Math.exp(-d * t) * Math.cos(2 * Math.PI * freq * t);
            const currentDist = (100 * x).toFixed(2);
            let transformStr = '';
            if (dir === 'up') transformStr = `transform: translateY(${currentDist}%);`;
            else if (dir === 'down') transformStr = `transform: translateY(${-currentDist}%);`;
            else if (dir === 'left') transformStr = `transform: translateX(${currentDist}%);`;
            else if (dir === 'right') transformStr = `transform: translateX(${-currentDist}%);`;
            
            let opacityStr = '';
            if (fade) {
              if (pct === 0) opacityStr = 'opacity: 0; ';
              else if (pct >= 30) opacityStr = 'opacity: 1; ';
              else {
                const opt = (t / 0.3).toFixed(2);
                opacityStr = `opacity: ${opt}; `;
              }
            }
            keyframes += `      ${pct}% { ${transformStr} ${opacityStr}}\n`;
          }
          keyframes += '    }';
        } else {
          keyframes = `@keyframes ${animName} {
            from { transform: ${transformFrom}; ${fade ? 'opacity: 0;' : ''} }
            to { transform: translate(0); ${fade ? 'opacity: 1;' : ''} }
          }`;
        }

        if (type === 'push') {
          keyframesOut = `@keyframes ${animNameOut} {
            from { transform: translate(0); ${fade ? 'opacity: 1;' : ''} }
            to { transform: ${transformToOut}; ${fade ? 'opacity: 0;' : ''} }
          }`;
        }
      } else if (type === 'swipe') {
        const feather = !!currentFrame.transitionFeather;
        if (feather) {
          let maskGrad = '';
          let maskSize = '';
          let posFrom = '';
          let posTo = '';
          
          if (dir === 'up') {
            maskGrad = 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 33%, rgba(0,0,0,0) 66%, rgba(0,0,0,0) 100%)';
            maskSize = '100% 300%';
            posFrom = '0 100%';
            posTo = '0 0';
          } else if (dir === 'down') {
            maskGrad = 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 33%, rgba(0,0,0,0) 66%, rgba(0,0,0,0) 100%)';
            maskSize = '100% 300%';
            posFrom = '0 100%';
            posTo = '0 0';
          } else if (dir === 'left') {
            maskGrad = 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 33%, rgba(0,0,0,0) 66%, rgba(0,0,0,0) 100%)';
            maskSize = '300% 100%';
            posFrom = '100% 0';
            posTo = '0 0';
          } else if (dir === 'right') {
            maskGrad = 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 33%, rgba(0,0,0,0) 66%, rgba(0,0,0,0) 100%)';
            maskSize = '300% 100%';
            posFrom = '100% 0';
            posTo = '0 0';
          }
          
          keyframes = `@keyframes ${animName} {
            from {
              -webkit-mask-image: ${maskGrad};
              mask-image: ${maskGrad};
              -webkit-mask-size: ${maskSize};
              mask-size: ${maskSize};
              -webkit-mask-position: ${posFrom};
              mask-position: ${posFrom};
            }
            to {
              -webkit-mask-image: ${maskGrad};
              mask-image: ${maskGrad};
              -webkit-mask-size: ${maskSize};
              mask-size: ${maskSize};
              -webkit-mask-position: ${posTo};
              mask-position: ${posTo};
            }
          }`;
        } else {
          let clipFrom = '';
          if (dir === 'up') clipFrom = 'inset(100% 0 0 0)';
          else if (dir === 'down') clipFrom = 'inset(0 0 100% 0)';
          else if (dir === 'left') clipFrom = 'inset(0 0 0 100%)';
          else if (dir === 'right') clipFrom = 'inset(0 100% 0 0)';
          
          keyframes = `@keyframes ${animName} {
            from { clip-path: ${clipFrom}; ${fade ? 'opacity: 0;' : ''} }
            to { clip-path: inset(0 0 0 0); ${fade ? 'opacity: 1;' : ''} }
          }`;
        }
      } else if (type === 'zoom') {
        const zf = zoomFrom / 100;
        if (bounce) {
          keyframes = `@keyframes ${animName} {\n`;
          const d = 4.0;
          const freq = 2.0;
          for (let pct = 0; pct <= 100; pct += 5) {
            const t = pct / 100;
            const x = Math.exp(-d * t) * Math.cos(2 * Math.PI * freq * t);
            const scale = (1.0 + (zf - 1.0) * x).toFixed(3);
            
            let opacityStr = '';
            if (fade) {
              if (pct === 0) opacityStr = 'opacity: 0; ';
              else if (pct >= 30) opacityStr = 'opacity: 1; ';
              else {
                const opt = (t / 0.3).toFixed(2);
                opacityStr = `opacity: ${opt}; `;
              }
            }
            keyframes += `      ${pct}% { transform: scale(${scale}); ${opacityStr}}\n`;
          }
          keyframes += '    }';
        } else {
          keyframes = `@keyframes ${animName} {
            from { transform: scale(${zf}); ${fade ? 'opacity: 0;' : ''} }
            to { transform: scale(1); ${fade ? 'opacity: 1;' : ''} }
          }`;
        }
      } else if (type === 'split') {
        const resolvedAngle = (dir === 'left' || dir === 'right') ? 90 : 0;
        const fromPoly = getSplitClipPath(resolvedAngle);
        keyframes = `@keyframes ${animName} {
          from { clip-path: ${fromPoly}; ${fade ? 'opacity: 0;' : ''} }
          to { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); ${fade ? 'opacity: 1;' : ''} }
        }`;
      } else if (type === 'blur') {
        keyframes = `@keyframes ${animName} {
          from { filter: blur(${blurAmount}px); transform: scale(${blurScale}); ${fade ? 'opacity: 0;' : ''} }
          to { filter: blur(0px); transform: scale(1); ${fade ? 'opacity: 1;' : ''} }
        }`;
        keyframesOut = `@keyframes ${animNameOut} {
          from { filter: blur(0px); transform: scale(1); ${fade ? 'opacity: 1;' : ''} }
          to { filter: blur(${blurAmount}px); transform: scale(${2 - blurScale}); ${fade ? 'opacity: 0;' : ''} }
        }`;
      } else if (type === 'iris') {
        let originCoords = '50% 50%';
        if (irisOrigin === 'top-left') originCoords = '0% 0%';
        else if (irisOrigin === 'top-right') originCoords = '100% 0%';
        else if (irisOrigin === 'bottom-left') originCoords = '0% 100%';
        else if (irisOrigin === 'bottom-right') originCoords = '100% 100%';

        let fromClip = '';
        let toClip = '';

        if (irisShape === 'circle') {
          fromClip = `circle(0% at ${originCoords})`;
          toClip = `circle(150% at ${originCoords})`;
        } else if (irisShape === 'square') {
          if (irisOrigin === 'center') {
            fromClip = 'inset(50%)';
            toClip = 'inset(0%)';
          } else if (irisOrigin === 'top-left') {
            fromClip = 'inset(0% 100% 100% 0%)';
            toClip = 'inset(0%)';
          } else if (irisOrigin === 'top-right') {
            fromClip = 'inset(0% 0% 100% 100%)';
            toClip = 'inset(0%)';
          } else if (irisOrigin === 'bottom-left') {
            fromClip = 'inset(100% 100% 0% 0%)';
            toClip = 'inset(0%)';
          } else if (irisOrigin === 'bottom-right') {
            fromClip = 'inset(100% 0% 0% 100%)';
            toClip = 'inset(0%)';
          }
        } else if (irisShape === 'diamond') {
          if (irisOrigin === 'center') {
            fromClip = 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)';
            toClip = 'polygon(50% -100%, 200% 50%, 50% 200%, -100% 50%)';
          } else if (irisOrigin === 'top-left') {
            fromClip = 'polygon(0% 0%, 0% 0%, 0% 0%)';
            toClip = 'polygon(0% 0%, 250% 0%, 0% 250%)';
          } else if (irisOrigin === 'top-right') {
            fromClip = 'polygon(100% 0%, 100% 0%, 100% 0%)';
            toClip = 'polygon(100% 0%, -150% 0%, 100% 250%)';
          } else if (irisOrigin === 'bottom-left') {
            fromClip = 'polygon(0% 100%, 0% 100%, 0% 100%)';
            toClip = 'polygon(0% 100%, 250% 100%, 0% -150%)';
          } else if (irisOrigin === 'bottom-right') {
            fromClip = 'polygon(100% 100%, 100% 100%, 100% 100%)';
            toClip = 'polygon(100% 100%, -150% 100%, 100% -150%)';
          }
        }

        keyframes = `@keyframes ${animName} {
          from { clip-path: ${fromClip}; ${fade ? 'opacity: 0;' : ''} }
          to { clip-path: ${toClip}; ${fade ? 'opacity: 1;' : ''} }
        }`;
      } else if (type === 'corner-fold') {
        const corner = dir || 'bottom-right';
        let origin = '100% 100%';
        let rotateAxis = '1, 1, 0';
        let shadowOffset = '-15px -15px 40px';
        let startClip = 'polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)';

        if (corner === 'bottom-left') {
          origin = '0% 100%';
          rotateAxis = '-1, 1, 0';
          shadowOffset = '15px -15px 40px';
          startClip = 'polygon(0% 100%, 0% 100%, 0% 100%, 0% 100%)';
        } else if (corner === 'top-right') {
          origin = '100% 0%';
          rotateAxis = '1, -1, 0';
          shadowOffset = '-15px 15px 40px';
          startClip = 'polygon(100% 0%, 100% 0%, 100% 0%, 100% 0%)';
        } else if (corner === 'top-left') {
          origin = '0% 0%';
          rotateAxis = '-1, -1, 0';
          shadowOffset = '15px 15px 40px';
          startClip = 'polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)';
        }

        keyframes = `@keyframes ${animName} {
          0% {
            transform-origin: ${origin};
            clip-path: ${startClip};
            transform: rotate3d(${rotateAxis}, 45deg);
            box-shadow: 0 0 0 rgba(0,0,0,0);
            ${fade ? 'opacity: 0;' : ''}
          }
          40% {
            transform-origin: ${origin};
            box-shadow: ${shadowOffset} rgba(0,0,0,0.3);
            ${fade ? 'opacity: 1;' : ''}
          }
          100% {
            transform-origin: ${origin};
            clip-path: polygon(-50% -50%, 150% -50%, 150% 150%, -50% 150%);
            transform: rotate3d(0, 0, 0, 0deg);
            box-shadow: 0 0 0 rgba(0,0,0,0);
            ${fade ? 'opacity: 1;' : ''}
          }
        }`;
      }

      let styleEl = document.getElementById('frame-transition-preview-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'frame-transition-preview-styles';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = keyframes + '\n' + (keyframesOut || '');

      if (keyframesOut) {
        prevContainer.style.animation = `${animNameOut} ${duration}s ease both`;
      }
      nextContainer.style.animation = `${animName} ${duration}s ease both`;

      framePreviewTimeoutId = setTimeout(() => {
        if (activeFramePreviewType === type) {
          runCycle();
        }
      }, (duration + 1.5) * 1000);

    }, 500);
  };

  runCycle();
}

function updateRunningFrameTransitionPreview() {
  if (activeFramePreviewType) {
    startFrameTransitionPreview(activeFramePreviewType);
  }
}

function stopFrameTransitionPreview() {
  activeFramePreviewType = null;
  if (framePreviewTimeoutId) {
    clearTimeout(framePreviewTimeoutId);
    framePreviewTimeoutId = null;
  }
  const c = getActiveCanvas();
  if (c) {
    const canvasDom = document.querySelector(`.canvas-frame[data-canvas-id="${c.id}"] .canvas`);
    if (canvasDom) {
      const overlay = canvasDom.querySelector('.frame-transition-preview-overlay');
      if (overlay) overlay.remove();
    }
  }
  const styleEl = document.getElementById('frame-transition-preview-styles');
  if (styleEl) styleEl.remove();
}

function customSelect(key, options, currentVal, title, isFrameTrans = false, frameTransId = '') {
  const currentOpt = options.find(o => o.val === currentVal) || options[0];
  const dropdownItems = options.map(opt => `
    <div class="custom-select-item" data-value="${opt.val}" style="padding: 5px 8px; font-size: 11px; color: var(--text-main); cursor: pointer; transition: background 0.1s; display: flex; align-items: center; gap: 8px;" title="${opt.label}">
      ${opt.img ? `<img src="${opt.img}" style="max-height: 18px; max-width: 40px; object-fit: contain; flex-shrink: 0; background: #475569; padding: 2px 4px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.15);" />` : ''}
      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1;">${opt.label}</span>
    </div>
  `).join('');

  const containerIdHtml = frameTransId ? `id="${frameTransId}"` : '';
  const dataKeyAttr = isFrameTrans ? `data-frame-k="${key}"` : `data-k="${key}"`;

  return `
    <div class="custom-select-container ${isFrameTrans ? 'frame-trans-select' : ''}" ${dataKeyAttr} ${containerIdHtml} style="position: relative; width: 100%;">
      <button class="custom-select-trigger" title="${title}" style="width: 100%; display: flex; justify-content: space-between; align-items: center; background: var(--bg-input); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 6px; padding: 4px 6px; font-size: 11px; height: 24px; text-align: left; cursor: pointer; outline: none; min-width: 0;">
        <span class="custom-select-label" style="display: flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden; white-space: nowrap; flex: 1;">
          ${currentOpt.img ? `<img src="${currentOpt.img}" style="max-height: 16px; max-width: 36px; object-fit: contain; flex-shrink: 0; background: #475569; padding: 2px 3px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.15);" />` : ''}
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1;">${currentOpt.label}</span>
        </span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-left: 4px; opacity: 0.7; pointer-events: none; flex-shrink: 0;"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      <div class="custom-select-dropdown" style="display: none; position: absolute; top: 26px; left: 0; right: 0; background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 6px; z-index: 10000; box-shadow: 0 8px 24px var(--shadow-medium); max-height: 200px; overflow-y: auto; padding: 4px 0;">
        ${dropdownItems}
      </div>
    </div>
  `;
}

function getFrameTransitionHtml(currentFrame) {
  let tType = currentFrame.transition || 'none';
  let activePreset = 'none';
  if (tType === 'fade') activePreset = 'fade';
  else if (tType === 'slide') activePreset = 'slide';
  else if (tType === 'push') activePreset = 'push';
  else if (tType === 'swipe') activePreset = 'swipe';
  else if (tType === 'zoom') activePreset = 'zoom';
  else if (tType === 'split') activePreset = 'split';
  else if (tType === 'iris') activePreset = 'iris';
  else if (tType === 'blur') activePreset = 'blur';
  else if (tType === 'corner-fold') activePreset = 'corner-fold';

  const presets = [
    { val: 'none', label: 'None' },
    { val: 'fade', label: 'Fade' },
    { val: 'slide', label: 'Slide' },
    { val: 'push', label: 'Push' },
    { val: 'swipe', label: 'Swipe' },
    { val: 'zoom', label: 'Zoom' },
    { val: 'split', label: 'Split' },
    { val: 'iris', label: 'Iris' },
    { val: 'blur', label: 'Blur' },
    { val: 'corner-fold', label: 'Corner Fold' }
  ];

  let filteredPresets = presets;
  let favMessageHtml = '';
  if (state.filterFavorites) {
    filteredPresets = presets.filter(o => o.val === 'none' || state.favoriteAnimations?.includes('frame-' + o.val));
    if (filteredPresets.length <= 1) {
      favMessageHtml = `<div style="grid-column: span 3; font-size: 10px; color: var(--text-muted); line-height: 1.4; padding: 4px 0; text-align: center;">
        No favorite transitions. Right-click presets to add to favorites.
      </div>`;
    }
  }

  const presetButtons = filteredPresets.map(o => {
    const isActive = o.val === activePreset;
    const isFav = state.favoriteAnimations?.includes('frame-' + o.val);
    const favStyle = isFav ? 'outline: 1px solid var(--accent-base); outline-offset: -1px;' : '';
    return `<button class="align-btn frame-trans-btn ${isActive ? 'active' : ''}" data-val="${o.val}" style="font-size:10px; ${favStyle}" title="Transition: ${o.label}">${o.label}</button>`;
  }).join('');

  const durVal = currentFrame.transitionDuration !== undefined ? currentFrame.transitionDuration : 0.5;
  const durHtml = `<div class="prop-row" style="margin:0;"><label>Duration (s)</label><input type="number" step="0.1" id="frame-trans-duration" value="${durVal}" min="0.1" /></div>`;

  const showFade = ['slide', 'push', 'swipe', 'zoom', 'split', 'iris', 'blur', 'corner-fold'].includes(activePreset);
  const showFeather = activePreset === 'swipe';
  let fadeToggleHtml = '';
  let featherToggleHtml = '';

  if (showFade) {
    const isFeathered = showFeather && !!currentFrame.transitionFeather;
    const resolvedFade = isFeathered ? false : (currentFrame.transitionFade !== false);
    const fadeDisabledAttr = isFeathered ? 'disabled' : '';
    const fadeOpacityStyle = isFeathered ? 'opacity: 0.5; pointer-events: none;' : '';

    fadeToggleHtml = `
      <div class="checkbox-row" style="height:24px; align-items:center; margin-top:14px; ${fadeOpacityStyle}">
        <input type="checkbox" id="frame-trans-fade" ${resolvedFade ? 'checked' : ''} ${fadeDisabledAttr} />
        <label for="frame-trans-fade" style="cursor:pointer; font-size:11px; white-space:nowrap;">Fade</label>
      </div>
    `;
  }

  if (showFeather) {
    const resolvedFeather = !!currentFrame.transitionFeather;
    featherToggleHtml = `
      <div class="checkbox-row" style="height:24px; align-items:center; margin-top:14px;">
        <input type="checkbox" id="frame-trans-feather" ${resolvedFeather ? 'checked' : ''} />
        <label for="frame-trans-feather" style="cursor:pointer; font-size:11px; white-space:nowrap;">Feather</label>
      </div>
    `;
  }

  const gridCols = (showFade && showFeather) ? 'grid-template-columns: 1.2fr 0.9fr 0.9fr;' : 'grid-template-columns: 1fr 1fr;';

  const standardProps = `
    <div class="prop-row" style="margin-bottom:8px;">
      <div style="display:grid; ${gridCols} gap:8px;">
        ${durHtml}
        ${fadeToggleHtml}
        ${featherToggleHtml}
      </div>
    </div>
  `;

  const excludePersVal = !!currentFrame.excludePersistent;
  const excludePersHtml = `
    <div class="prop-row" style="margin-bottom:8px;">
      <div class="checkbox-row" style="height:24px; align-items:center;">
        <input type="checkbox" id="frame-trans-exclude-persistent" ${excludePersVal ? 'checked' : ''} />
        <label for="frame-trans-exclude-persistent" style="cursor:pointer; font-size:11px;" title="Exclude persistent layers from frame transitions">Exclude persistent layers</label>
      </div>
    </div>
  `;

  let conditionalControls = '';
  if (activePreset === 'slide' || activePreset === 'push' || activePreset === 'swipe' || activePreset === 'split') {
    const currentDir = currentFrame.transitionDirection || 'left';
    let bounceHtml = '';
    if (activePreset === 'slide' || activePreset === 'push') {
      const hasBounce = !!currentFrame.transitionBounce;
      bounceHtml = `
        <div class="checkbox-row" style="height:24px; align-items:center; margin-top:14px;">
          <input type="checkbox" id="frame-trans-bounce" ${hasBounce ? 'checked' : ''} />
          <label for="frame-trans-bounce" style="cursor:pointer; font-size:11px; white-space:nowrap;">Bounce</label>
        </div>
      `;
    }
    conditionalControls = `
      <div class="prop-row" style="margin-bottom:8px;">
        <div class="prop-grid-2">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label>Direction</label>
            ${customSelect('direction', [
              { val: 'left', label: 'Left' },
              { val: 'right', label: 'Right' },
              { val: 'up', label: 'Up' },
              { val: 'down', label: 'Down' },
              { val: 'short', label: 'Short edge' },
              { val: 'long', label: 'Long edge' }
            ], currentDir, 'Transition direction', true, 'frame-trans-direction')}
          </div>
          ${bounceHtml}
        </div>
      </div>
    `;
  } else if (activePreset === 'zoom') {
    const zfVal = currentFrame.transitionZoomFrom !== undefined ? currentFrame.transitionZoomFrom : 80;
    const hasBounce = !!currentFrame.transitionBounce;
    conditionalControls = `
      <div class="prop-row" style="margin-bottom:8px;">
        <div class="prop-grid-2">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label>Zoom From (%)</label>
            <input type="number" min="0" max="500" id="frame-trans-zoom-from" value="${zfVal}" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; height:24px; outline:none;" />
          </div>
          <div class="checkbox-row" style="height:24px; align-items:center; margin-top:14px;">
            <input type="checkbox" id="frame-trans-bounce" ${hasBounce ? 'checked' : ''} />
            <label for="frame-trans-bounce" style="cursor:pointer; font-size:11px; white-space:nowrap;">Bounce</label>
          </div>
        </div>
      </div>
    `;
  } else if (activePreset === 'iris') {
    const currentShape = currentFrame.transitionIrisShape || 'circle';
    const currentOrigin = currentFrame.transitionIrisOrigin || 'center';
    conditionalControls = `
      <div class="prop-row" style="margin-bottom:8px;">
        <div class="prop-grid-2">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label>Shape</label>
            ${customSelect('irisShape', [
              { val: 'circle', label: 'Circle' },
              { val: 'square', label: 'Square' },
              { val: 'diamond', label: 'Diamond' }
            ], currentShape, 'Iris Shape', true, 'frame-trans-iris-shape')}
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label>Origin</label>
            ${customSelect('irisOrigin', [
              { val: 'center', label: 'Center' },
              { val: 'top-left', label: 'Top-Left' },
              { val: 'top-right', label: 'Top-Right' },
              { val: 'bottom-left', label: 'Bottom-Left' },
              { val: 'bottom-right', label: 'Bottom-Right' }
            ], currentOrigin, 'Iris Origin', true, 'frame-trans-iris-origin')}
          </div>
        </div>
      </div>
    `;
  } else if (activePreset === 'blur') {
    const blurAmount = currentFrame.transitionBlurAmount !== undefined ? currentFrame.transitionBlurAmount : 20;
    const blurScale = currentFrame.transitionBlurScale !== undefined ? currentFrame.transitionBlurScale : 100;
    conditionalControls = `
      <div class="prop-row" style="margin-bottom:8px;">
        <div class="prop-grid-2">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label>Blur Amount (px)</label>
            <input type="number" min="0" max="100" id="frame-trans-blur-amount" value="${blurAmount}" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; height:24px; outline:none;" />
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label>Scale Blend (%)</label>
            <input type="number" min="10" max="500" id="frame-trans-blur-scale" value="${blurScale}" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; height:24px; outline:none;" />
          </div>
        </div>
      </div>
    `;
  } else if (activePreset === 'corner-fold') {
    const currentDir = currentFrame.transitionDirection || 'bottom-right';
    conditionalControls = `
      <div class="prop-row" style="margin-bottom:8px;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <label>Corner</label>
          ${customSelect('direction', [
            { val: 'bottom-right', label: 'Bottom-Right' },
            { val: 'bottom-left', label: 'Bottom-Left' },
            { val: 'top-right', label: 'Top-Right' },
            { val: 'top-left', label: 'Top-Left' }
          ], currentDir, 'Fold Corner', true, 'frame-trans-direction')}
        </div>
      </div>
    `;
  }

  return `
    <div id="frame-transition-preview-area" class="animation-sub-panel">
      <div class="prop-row" style="margin-bottom:6px;"><label class="anim-sub-head"><svg id="fi_11908101" width="12" height="12" viewBox="0 0 48 48" style="color: var(--accent-base); flex-shrink: 0;" fill="currentColor"><g transform="translate(-504 -648)"><g transform="scale(1.5)"><g id="SOLID" transform="scale(.667)"><g><path d="m511.861 693.334c-.902.713-2.133.848-3.168.347s-1.693-1.55-1.693-2.7v-37.963c0-1.15.657-2.199 1.693-2.7 1.035-.501 2.265-.366 3.167.347l24.005 18.976c.719.569 1.139 1.436 1.139 2.353 0 .918-.419 1.785-1.139 2.354z"></path></g><g><path d="m546 694h-3c-1.657 0-3-1.343-3-3v-38c0-1.657 1.343-3 3-3h3c1.657 0 3 1.343 3 3v38c0 1.657-1.343 3-3 3z"></path></g></g></g></g></svg>FRAME TRANSITION</label></div>
      <div class="anim-grid" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:12px;">
        ${presetButtons}
        ${favMessageHtml}
      </div>
      ${activePreset !== 'none' ? excludePersHtml + standardProps + conditionalControls : ''}
    </div>
  `;
}

function wireFrameTransitionEvents() {
  const currentFrame = state.frames.find(f => f.id === state.activeFrameId);
  if (!currentFrame) return;

  propsEl.querySelectorAll('.frame-trans-btn').forEach(btn => {
    const val = btn.dataset.val;
    btn.addEventListener('click', () => {
      currentFrame.transition = val;
      if (val === 'slide' || val === 'push' || val === 'swipe' || val === 'split') {
        if (!currentFrame.transitionDirection) currentFrame.transitionDirection = 'left';
      }
      if (val === 'corner-fold') {
        if (!currentFrame.transitionDirection) currentFrame.transitionDirection = 'bottom-right';
      }
      if (val === 'zoom') {
        if (currentFrame.transitionZoomFrom === undefined) currentFrame.transitionZoomFrom = 80;
      }
      if (val === 'iris') {
        if (!currentFrame.transitionIrisShape) currentFrame.transitionIrisShape = 'circle';
        if (!currentFrame.transitionIrisOrigin) currentFrame.transitionIrisOrigin = 'center';
      }
      if (val === 'blur') {
        if (currentFrame.transitionBlurAmount === undefined) currentFrame.transitionBlurAmount = 20;
        if (currentFrame.transitionBlurScale === undefined) currentFrame.transitionBlurScale = 100;
      }
      pushHistory();
      renderProps();
      render(true);
      
      startFrameTransitionPreview(val);
    });

    btn.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      startFrameTransitionPreview(val);
    });
  });

  const durInp = propsEl.querySelector('#frame-trans-duration');
  if (durInp) {
    durInp.addEventListener('mouseenter', () => {
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
    durInp.addEventListener('input', (e) => {
      currentFrame.transitionDuration = parseFloat(e.target.value) || 0.5;
      startFrameTransitionPreview(currentFrame.transition || 'none');
      render(true);
    });
    durInp.addEventListener('change', () => {
      pushHistory();
    });
  }

  const fadeChk = propsEl.querySelector('#frame-trans-fade');
  if (fadeChk) {
    fadeChk.addEventListener('mouseenter', () => {
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
    fadeChk.addEventListener('change', (e) => {
      currentFrame.transitionFade = e.target.checked;
      pushHistory();
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
  }

  const featherChk = propsEl.querySelector('#frame-trans-feather');
  if (featherChk) {
    featherChk.addEventListener('mouseenter', () => {
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
    featherChk.addEventListener('change', (e) => {
      currentFrame.transitionFeather = e.target.checked;
      if (currentFrame.transitionFeather) {
        currentFrame.transitionFade = false;
      }
      pushHistory();
      renderProps();
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
  }

  const exclPersChk = propsEl.querySelector('#frame-trans-exclude-persistent');
  if (exclPersChk) {
    exclPersChk.addEventListener('mouseenter', () => {
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
    exclPersChk.addEventListener('change', (e) => {
      currentFrame.excludePersistent = e.target.checked;
      pushHistory();
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
  }

  const dirSelect = propsEl.querySelector('#frame-trans-direction');
  if (dirSelect) {
    dirSelect.addEventListener('mouseenter', () => {
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
    dirSelect.addEventListener('change', (e) => {
      currentFrame.transitionDirection = e.target.value;
      pushHistory();
      renderProps();
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
  }

  const bounceChk = propsEl.querySelector('#frame-trans-bounce');
  if (bounceChk) {
    bounceChk.addEventListener('mouseenter', () => {
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
    bounceChk.addEventListener('change', (e) => {
      currentFrame.transitionBounce = e.target.checked;
      pushHistory();
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
  }

  const zfInp = propsEl.querySelector('#frame-trans-zoom-from');
  if (zfInp) {
    zfInp.addEventListener('mouseenter', () => {
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
    zfInp.addEventListener('input', (e) => {
      currentFrame.transitionZoomFrom = parseInt(e.target.value, 10) || 80;
      startFrameTransitionPreview(currentFrame.transition || 'none');
      render(true);
    });
    zfInp.addEventListener('change', () => {
      pushHistory();
    });
  }

  const angleInp = propsEl.querySelector('#frame-trans-angle');
  if (angleInp) {
    angleInp.addEventListener('mouseenter', () => {
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
    angleInp.addEventListener('input', (e) => {
      currentFrame.transitionAngle = parseInt(e.target.value, 10) || 0;
      startFrameTransitionPreview(currentFrame.transition || 'none');
      render(true);
    });
    angleInp.addEventListener('change', () => {
      pushHistory();
    });
  }

  const shapeSelect = propsEl.querySelector('#frame-trans-iris-shape');
  if (shapeSelect) {
    shapeSelect.addEventListener('mouseenter', () => {
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
    shapeSelect.addEventListener('change', (e) => {
      currentFrame.transitionIrisShape = e.target.value;
      pushHistory();
      renderProps();
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
  }

  const originSelect = propsEl.querySelector('#frame-trans-iris-origin');
  if (originSelect) {
    originSelect.addEventListener('mouseenter', () => {
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
    originSelect.addEventListener('change', (e) => {
      currentFrame.transitionIrisOrigin = e.target.value;
      pushHistory();
      renderProps();
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
  }

  const blurAmtInp = propsEl.querySelector('#frame-trans-blur-amount');
  if (blurAmtInp) {
    blurAmtInp.addEventListener('mouseenter', () => {
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
    blurAmtInp.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      currentFrame.transitionBlurAmount = isNaN(val) ? 20 : val;
      startFrameTransitionPreview(currentFrame.transition || 'none');
      render(true);
    });
    blurAmtInp.addEventListener('change', () => {
      pushHistory();
    });
  }

  const blurScaleInp = propsEl.querySelector('#frame-trans-blur-scale');
  if (blurScaleInp) {
    blurScaleInp.addEventListener('mouseenter', () => {
      startFrameTransitionPreview(currentFrame.transition || 'none');
    });
    blurScaleInp.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      currentFrame.transitionBlurScale = isNaN(val) ? 100 : val;
      startFrameTransitionPreview(currentFrame.transition || 'none');
      render(true);
    });
    blurScaleInp.addEventListener('change', () => {
      pushHistory();
    });
  }

  const area = propsEl.querySelector('#frame-transition-preview-area');
  if (area) {
    area.addEventListener('mouseleave', () => {
      stopFrameTransitionPreview();
    });
  }
}

function wireCustomSelects(el, updateProp) {
  // Wire Custom Styled Select Dropdowns & Preview on Hover
  propsEl.querySelectorAll('.custom-select-trigger').forEach(trigger => {
    trigger.onclick = (e) => {
      e.stopPropagation();
      const container = trigger.closest('.custom-select-container');
      const dropdown = container.querySelector('.custom-select-dropdown');
      const isOpen = dropdown.style.display === 'block';
      propsEl.querySelectorAll('.custom-select-dropdown').forEach(d => {
        if (d !== dropdown) d.style.display = 'none';
      });
      dropdown.style.display = isOpen ? 'none' : 'block';
    };

    trigger.onmouseenter = () => {
      const container = trigger.closest('.custom-select-container');
      const isFrame = container.classList.contains('frame-trans-select');
      const key = isFrame ? container.dataset.frameK : container.dataset.k;
      if (isFrame) {
        const activeIdx = state.frames.findIndex(fr => fr.id === state.activeFrameId);
        if (activeIdx > 0 || (activeIdx === 0 && state.loopAd)) {
          startFrameTransitionPreview(state.frames[activeIdx].transition || 'none');
        }
      } else {
        if (el) {
          if (key === 'animDirection') {
            if (startElementAnimPreviewFn) startElementAnimPreviewFn(el.animType || 'none');
          } else if (key === 'panDir') {
            hoverEffectPreviewActive = true;
            startEffectPreview(el);
          }
        }
      }
    };
  });

  propsEl.querySelectorAll('.custom-select-item').forEach(item => {
    const container = item.closest('.custom-select-container');
    const isFrame = container.classList.contains('frame-trans-select');
    const key = isFrame ? container.dataset.frameK : container.dataset.k;
    const val = item.dataset.value;

    item.onclick = (e) => {
      e.stopPropagation();
      container.querySelector('.custom-select-label').textContent = item.textContent.trim();
      container.querySelector('.custom-select-dropdown').style.display = 'none';

      if (isFrame) {
        const activeIdx = state.frames.findIndex(fr => fr.id === state.activeFrameId);
        if (activeIdx > 0 || (activeIdx === 0 && state.loopAd)) {
          const currentFrame = state.frames[activeIdx];
          if (key === 'direction') currentFrame.transitionDirection = val;
          else if (key === 'irisShape') currentFrame.transitionIrisShape = val;
          else if (key === 'irisOrigin') currentFrame.transitionIrisOrigin = val;

          pushHistory();
          renderProps();
          startFrameTransitionPreview(currentFrame.transition || 'none');
        }
      } else {
        if (el) {
          if (key === 'animDirection') {
            if ((el.animType || '').startsWith('swipe-')) {
              updateProp('animType', `swipe-${val}`);
            } else {
              updateProp('animDirection', val);
            }
          } else {
            updateProp(key, val);
          }
          pushHistory();
          renderProps();
          if (key === 'animDirection') {
            if (startElementAnimPreviewFn) startElementAnimPreviewFn(el.animType || 'none');
          } else if (key === 'panDir') {
            hoverEffectPreviewActive = true;
            startEffectPreview(el);
          }
        }
      }
    };

    item.onmouseenter = () => {
      if (isFrame) {
        const activeIdx = state.frames.findIndex(fr => fr.id === state.activeFrameId);
        if (activeIdx > 0 || (activeIdx === 0 && state.loopAd)) {
          const currentFrame = state.frames[activeIdx];
          const origDirection = currentFrame.transitionDirection || 'left';
          const origShape = currentFrame.transitionIrisShape || 'circle';
          const origOrigin = currentFrame.transitionIrisOrigin || 'center';

          if (key === 'direction') currentFrame.transitionDirection = val;
          else if (key === 'irisShape') currentFrame.transitionIrisShape = val;
          else if (key === 'irisOrigin') currentFrame.transitionIrisOrigin = val;

          startFrameTransitionPreview(currentFrame.transition || 'none');

          item.onmouseleave = () => {
            if (key === 'direction') currentFrame.transitionDirection = origDirection;
            else if (key === 'irisShape') currentFrame.transitionIrisShape = origShape;
            else if (key === 'irisOrigin') currentFrame.transitionIrisOrigin = origOrigin;
            startFrameTransitionPreview(currentFrame.transition || 'none');
          };
        }
      } else {
        if (el) {
          const origType = el.animType;
          const origDirection = el.animDirection;
          const origPanDir = el.panDir;

          if (key === 'animDirection') {
            if ((el.animType || '').startsWith('swipe-')) {
              el.animType = `swipe-${val}`;
            } else {
              el.animDirection = val;
            }
            if (startElementAnimPreviewFn) startElementAnimPreviewFn(el.animType || 'none');
          } else if (key === 'panDir') {
            el.panDir = val;
            hoverEffectPreviewActive = true;
            startEffectPreview(el);
          }

          item.onmouseleave = () => {
            el.animType = origType;
            el.animDirection = origDirection;
            el.panDir = origPanDir;
            if (key === 'animDirection') {
              if (startElementAnimPreviewFn) startElementAnimPreviewFn(el.animType || 'none');
            } else if (key === 'panDir') {
              hoverEffectPreviewActive = true;
              startEffectPreview(el);
            }
          };
        }
      }
    };
  });

  if (!window.customSelectGlobalBound) {
    window.customSelectGlobalBound = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-select-dropdown').forEach(d => d.style.display = 'none');
    });
  }
}

function renderProps() {
  const esc = (s) => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  let el = getSelectedElement();
  const c = getActiveCanvas();
  const getBgStyle = (val) => val && val.includes('gradient') ? val : val;

  if (!el && state.layerSelection?.length > 0 && c) {
    const selectedElements = c.elements.filter(e => state.layerSelection.includes(e.id));
    if (selectedElements.length > 0) {
      el = selectedElements.find(e => e.type === 'text') || selectedElements[0];
    }
  }

  // Hex-copy button helpers — used by every hex color input across the app.
  const HEX_COPY_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const hexCopyBtn = (k, disabled = false) => {
    const disabledAttr = disabled ? 'disabled' : '';
    const pointerEvents = disabled ? 'pointer-events:none; opacity:0.4;' : '';
    const style = `position:absolute; right:4px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; padding:2px; color:var(--text-muted); display:flex; align-items:center; ${pointerEvents}`;
    return `<button class="hex-copy" data-target-k="${k}" title="Copy hex" tabindex="-1" ${disabledAttr} style="${style}">${HEX_COPY_SVG}</button>`;
  };
  const hexInputBox = (key, value, inputId = '', disabled = false) => {
    const disabledAttr = disabled ? 'disabled' : '';
    const pointerEvents = disabled ? 'pointer-events:none; opacity:0.5;' : '';
    const containerStyle = `position:relative; flex:1; min-width:0; ${pointerEvents}`;
    const inputStyle = `width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 24px 4px 6px; font-size:11px; outline:none; text-transform:uppercase; ${pointerEvents}`;
    return `<div style="${containerStyle}"><input type="text" data-k="${key}" ${inputId ? `id="${inputId}"` : ''} value="${(value || '').replace(/^#/, '')}" title="Hex color code" ${disabledAttr} style="${inputStyle}" />${hexCopyBtn(key, disabled)}</div>`;
  };

  // ---- Dynamic Data (data-merge / versioning) ----
  let dynamicHtml = '';
  if (typeof dmFieldsForType === 'function') {
    const selectedElements = (state.layerSelection && c) ? c.elements.filter(e => state.layerSelection.includes(e.id)) : [];
    const isMulti = selectedElements.length > 1;
    const isGroup = isMulti && selectedElements[0].groupId && selectedElements.every(e => e.groupId === selectedElements[0].groupId);

    if (isMulti) {
      const headerText = isGroup ? 'Group' : 'Multiple elements';
      dynamicHtml = `<div class="panel-section highlighted" id="panel-section-dynamic-data" data-permanent="true">
        <h3 class="panel-header-collapsible" id="header-dynamic-data" style="cursor: pointer; user-select: none; color: var(--text-label);">
          <span class="dd-marquee" style="flex:1; min-width:0; overflow:hidden; white-space:nowrap;">Dynamic Data<span style="color:var(--text-main);">: ${headerText}</span></span>
          <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="flex-shrink:0; transition: transform 0.2s ease;">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </h3>`;
      
      const checkboxRows = [];
      const dm = state.dataMerge;
      
      selectedElements.forEach(itemEl => {
        if (itemEl.isMask) return; // Skip masks
        const dmFields = dmFieldsForType(itemEl.type);
        if (!dmFields || !dmFields.length) return;
        
        const sk = dmSlotKey(itemEl);
        const itemLabel = layerLabelText(itemEl);
        const fieldRows = [];
        
        dmFields.forEach(field => {
          const on = !!(itemEl.dynamic && itemEl.dynamic[field]);
          const id = `dm-chk-${field}-${itemEl.id}`;
          const key = sk + '::' + field;
          const currentMapping = (dm && dm.mappings) ? (dm.mappings[key] || '') : '';
          const colOptions = ['<option value="">— none —</option>'].concat(
            (dm && dm.columns ? dm.columns : []).map(colName => `<option value="${esc(colName)}" ${colName === currentMapping ? 'selected' : ''}>${esc(colName)}</option>`)
          ).join('');
          
          const displayLabel = `${itemLabel} (${DM_FIELD_LABEL[field] || field})`;

          fieldRows.push(`
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%; padding-left:8px; box-sizing:border-box;">
              <div class="checkbox-row" style="flex:1; min-width:0; display:flex; align-items:center; gap:8px; margin-right:4px;">
                <input type="checkbox" id="${id}" class="dm-control dm-field-chk" data-el-id="${itemEl.id}" data-dm-field="${field}" title="Toggle dynamic data binding for ${esc(displayLabel)}" ${on ? 'checked' : ''}/>
                <label for="${id}" title="Toggle dynamic data binding for ${esc(displayLabel)}" style="cursor:pointer; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-weight:500; color:var(--text-main); font-size:11px;">${esc(DM_FIELD_LABEL[field] || field)}</label>
              </div>
              <select class="dm-control dm-field-select" data-el-id="${itemEl.id}" data-dm-field="${field}" title="Column header map for ${esc(displayLabel)}" style="width:130px; flex-shrink:0; padding:3px 4px; font-size:11px; outline:none; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; font-family:inherit; transition:opacity 0.2s;" ${on ? '' : 'disabled'}>
                ${colOptions}
              </select>
            </div>
          `);
        });
        if (fieldRows.length > 0) {
          checkboxRows.push(`
            <div class="dd-layer-group" data-el-id="${itemEl.id}" style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px; width:100%;">
              <div style="font-size:10px; color:var(--text-muted); font-weight:600; line-height:1.2; text-transform:uppercase; letter-spacing:0.03em; padding-left:4px; word-break:break-word; overflow-wrap:anywhere;" title="${esc(itemLabel)}">${esc(itemLabel)}</div>
              <div style="display:flex; flex-direction:column; gap:6px; width:100%;">
                ${fieldRows.join('')}
              </div>
            </div>
          `);
        }
      });
      
      if (checkboxRows.length > 0) {
        dynamicHtml += `<div class="prop-row" style="display:flex; flex-direction:column; gap:2px; margin-bottom:8px; width:100%;">${checkboxRows.join('')}</div>`;
      } else {
        dynamicHtml += `<div class="prop-row" style="font-size:11px; color:var(--text-muted); line-height:1.4; margin-bottom:10px;">No dynamic fields available for selected layers.</div>`;
      }
      
      const anyLinked = selectedElements.some(e => e.linkGroupId);
      if (anyLinked) {
        dynamicHtml += `<div class="prop-row" style="font-size:10px;color:var(--text-accent);margin-top:4px;line-height:1.4;font-weight:500;">Linked element — these toggles apply to every size in the link group.</div>`;
      }
      dynamicHtml += `<button class="btn primary dm-control" id="dm-open-from-props" title="Open spreadsheet view to edit dynamic data and banner versions" style="margin-top:10px;width:100%;font-size:11px;">Data and Versions...</button>`;
      dynamicHtml += `</div>`;
    } else if (el && el.isMask) {
      // Masks don't participate in dynamic data — show a permanent notice.
      dynamicHtml = `<div class="panel-section highlighted" id="panel-section-dynamic-data" data-permanent="true">
        <h3 class="panel-header-collapsible" id="header-dynamic-data" style="cursor: pointer; user-select: none; color: var(--text-label);">
          <span>Dynamic Data</span>
          <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="transition: transform 0.2s ease;">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </h3>
        <div class="prop-row" style="font-size:11px; color:var(--text-muted); line-height:1.4; margin-bottom:10px;">
          <b style="color:var(--text-accent);">Disabled while layer is a mask.</b><br>
          Right-click to toggle "Use as mask" off to bind data.
        </div>
        <button class="btn primary dm-control" id="dm-open-from-props" title="Open spreadsheet view to edit dynamic data and banner versions" style="width:100%;font-size:11px;">Data and Versions...</button>
      </div>`;
    } else if (el && dmFieldsForType(el.type).length) {
      const dmFields = dmFieldsForType(el.type);
      dynamicHtml = `<div class="panel-section highlighted" id="panel-section-dynamic-data" data-permanent="true">
        <h3 class="panel-header-collapsible" id="header-dynamic-data" style="cursor: pointer; user-select: none; color: var(--text-label);">
          <span class="dd-marquee" style="flex:1; min-width:0; overflow:hidden; white-space:nowrap;">Dynamic Data<span style="color:var(--text-main);">: ${esc(layerLabelText(el))}</span></span>
          <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="flex-shrink:0; transition: transform 0.2s ease;">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </h3>`;
      const checkboxRows = [];
      const dm = state.dataMerge;
      const sk = dmSlotKey(el);
      dmFields.forEach(field => {
        const on = !!(el.dynamic && el.dynamic[field]);
        const id = `dm-chk-${field}-${el.id}`;
        const key = sk + '::' + field;
        const currentMapping = (dm && dm.mappings) ? (dm.mappings[key] || '') : '';
        const colOptions = ['<option value="">— none —</option>'].concat(
          (dm && dm.columns ? dm.columns : []).map(c => `<option value="${esc(c)}" ${c === currentMapping ? 'selected' : ''}>${esc(c)}</option>`)
        ).join('');

        checkboxRows.push(`
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; width:100%;">
            <div class="checkbox-row" style="flex:1; min-width:0; display:flex; align-items:center; gap:8px; margin-right:4px;">
              <input type="checkbox" id="${id}" class="dm-control dm-field-chk" data-el-id="${el.id}" data-dm-field="${field}" title="Toggle dynamic data binding for ${DM_FIELD_LABEL[field] || field}" ${on ? 'checked' : ''}/>
              <label for="${id}" title="Toggle dynamic data binding for ${DM_FIELD_LABEL[field] || field}" style="cursor:pointer; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-weight:500;">${DM_FIELD_LABEL[field] || field}</label>
            </div>
            <select class="dm-control dm-field-select" data-el-id="${el.id}" data-dm-field="${field}" title="Column header map for ${DM_FIELD_LABEL[field] || field}" style="width:130px; flex-shrink:0; padding:3px 4px; font-size:11px; outline:none; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; font-family:inherit; transition:opacity 0.2s;" ${on ? '' : 'disabled'}>
              ${colOptions}
            </select>
          </div>
        `);
      });
      dynamicHtml += `<div class="prop-row" style="display:flex; flex-direction:column; gap:2px; margin-bottom:8px; width:100%;">${checkboxRows.join('')}</div>`;
      if (el.linkGroupId) {
        dynamicHtml += `<div class="prop-row" style="font-size:10px;color:var(--text-accent);margin-top:4px;line-height:1.4;font-weight:500;">Linked element — these toggles apply to every size in the link group.</div>`;
      }
      dynamicHtml += `<button class="btn primary dm-control" id="dm-open-from-props" title="Open spreadsheet view to edit dynamic data and banner versions" style="margin-top:10px;width:100%;font-size:11px;">Data and Versions...</button>`;
      dynamicHtml += `</div>`;
    } else {
      dynamicHtml = `<div class="panel-section highlighted" id="panel-section-dynamic-data" data-permanent="true">
        <h3 class="panel-header-collapsible" id="header-dynamic-data" style="cursor: pointer; user-select: none; color: var(--text-label);">
          <span>Dynamic Data</span>
          <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="transition: transform 0.2s ease;">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </h3>
        <div class="prop-row" style="font-size:11px; color:var(--text-muted); line-height:1.4; margin-bottom:10px;">
          Connect layer properties (text, image, colors) to a spreadsheet to generate multiple version variants of this banner set automatically.
        </div>
        <button class="btn primary dm-control" id="dm-open-from-props" title="Open spreadsheet view to edit dynamic data and banner versions" style="width:100%;font-size:11px;">Data and Versions...</button>
      </div>`;
    }
  }

  if (!el) {
    if (!c) { propsEl.innerHTML = '<div class="panel-section"><h3>Properties</h3><div class="prop-empty">No canvas.</div></div>'; return; }
    
    const activeIdx = state.frames.findIndex(fr => fr.id === state.activeFrameId);
    let frameTransitionSectionHtml = '';
    if (state.frames.length > 1 && (activeIdx > 0 || state.loopAd)) {
      frameTransitionSectionHtml = `
        <div class="panel-section" id="panel-section-animation">
          <h3 class="panel-header-collapsible" id="header-animation" style="cursor: pointer; user-select: none;">
            <span>Animation</span>
            <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="transition: transform 0.2s ease;">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </h3>
          <div class="panel-section-content">
            ${getFrameTransitionHtml(state.frames[activeIdx])}
          </div>
        </div>
      `;
    }

    const autoSettings = (typeof getAutoResizeSettings === 'function') ? getAutoResizeSettings() : null;
    const isSyncCanvasBg = !!(autoSettings && autoSettings.behaviour && autoSettings.behaviour.syncCanvasBg === true);

    // show canvas properties when no element is selected
    propsEl.innerHTML = `
      ${dynamicHtml}
      <div class="panel-section" id="panel-section-canvas-settings">
        <h3 class="panel-header-collapsible" id="header-canvas-settings" style="cursor: pointer; user-select: none;">
          <span>Canvas Settings</span>
          <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="transition: transform 0.2s ease;">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </h3>
        <div class="panel-section-content">
        <div class="prop-row">
          <label>Dimensions</label>
          <div class="prop-grid-2">
            <input type="number" id="c-w" value="${c.width}" title="Canvas Width (px)" />
            <input type="number" id="c-h" value="${c.height}" title="Canvas Height (px)" />
          </div>
        </div>
        <div class="prop-row" style="margin-top:12px;">
          <label>Background Color</label>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <button class="cp-trigger" data-k="canvas-bg" id="c-bg-color" title="Choose canvas background color" style="width:24px; height:24px; border-radius:4px; border:1px solid var(--border-light); cursor:pointer; background:${getBgStyle(getCanvasBg(c, state.activeFrameId)) || '#000'}"></button>
            <span style="display:none;">${hexInputBox('canvas-bg', getCanvasBg(c, state.activeFrameId), 'c-bg-color-hex')}</span>
            <div class="checkbox-row">
              <input type="checkbox" id="c-bg-per-frame" title="When ON, the background colour you pick applies to the current frame only (other frames keep their own colour). When OFF, every frame on this canvas unifies to the current colour." ${state.bgPerFrame === true ? 'checked' : ''} />
              <label for="c-bg-per-frame" title="When ON, the background colour you pick applies to the current frame only (other frames keep their own colour). When OFF, every frame on this canvas unifies to the current colour.">Per frame</label>
            </div>
            <div class="checkbox-row">
              <input type="checkbox" id="c-bg-per-canvas" title="When ON, the background colour you pick applies to this canvas only (other canvas sizes keep their own colour). When OFF, every canvas unifies to the current colour." ${state.bgPerCanvas === true ? 'checked' : ''} />
              <label for="c-bg-per-canvas" title="When ON, the background colour you pick applies to this canvas only (other canvas sizes keep their own colour). When OFF, every canvas unifies to the current colour.">Per canvas</label>
            </div>
          </div>
        </div>
        <div class="prop-row" style="margin-top:12px;">
          <div class="checkbox-row">
            <input type="checkbox" id="c-full-click" title="Make the entire canvas clickable (landing page redirect)" ${c.fullClickArea !== false ? 'checked' : ''} />
            <label for="c-full-click" title="Make the entire canvas clickable (landing page redirect)">Use entire canvas as click area</label>
          </div>
        </div>
        <div class="prop-row" style="margin-top:8px;">
          <div class="checkbox-row">
            <input type="checkbox" id="c-show-safezones" title="Show the safezone overlay (centered guides + edge inset) on every canvas" ${state.showSafezones ? 'checked' : ''} />
            <label for="c-show-safezones" title="Show the safezone overlay (centered guides + edge inset) on every canvas">Show safezones on all canvases</label>
          </div>
        </div>

        <div class="prop-row" style="margin-top:16px; display:flex; flex-direction:column; gap:8px;">
          <button id="c-btn-preview" title="Toggle preview mode for this canvas" style="
            width:100%; padding:8px 12px; border-radius:6px; border:none; cursor:pointer;
            background:var(--accent-base); color:var(--text-on-accent, #fff); font-size:12px; font-weight:600;
            font-family:inherit; display:flex; align-items:center; justify-content:center; gap:6px;
            box-shadow:0 2px 8px rgba(0,0,0,0.25); transition:filter 0.15s;
          ">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Preview
          </button>
          <div style="display:flex; gap:6px;">
            <button id="btn-ai-resize" title="Auto-resize from selected canvas" style="
              flex:1; padding:8px 12px; border-radius:6px; border:1px solid var(--border-light); cursor:pointer;
              background:var(--bg-btn); color:var(--text-main); font-size:11px; font-weight:600;
              font-family:inherit; display:flex; align-items:center; justify-content:center; gap:6px;
              transition:border-color 0.15s; white-space:nowrap;
            ">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3H13M21 3V11M21 3L11 13M3 21H11M3 21V13M3 21L13 11"/></svg>
              Auto-resize
            </button>
            <button id="btn-ai-resize-settings" title="Auto-Resize settings — engine + behaviour + live linking" style="
              padding:8px; border-radius:6px; border:1px solid var(--border-light); cursor:pointer;
              background:var(--bg-btn); color:var(--text-main); display:flex; align-items:center; justify-content:center;
              transition:border-color 0.15s;
            ">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </div>
          <div style="display:flex; gap:6px;">
            <button id="c-btn-dl-zip" title="Download this size as a zip package containing HTML and assets" style="
              flex:1; padding:7px 0; border-radius:6px; border:1px solid var(--border-light); cursor:pointer;
              background:var(--bg-input); color:var(--text-main); font-size:11px; font-weight:500;
              font-family:inherit; display:flex; align-items:center; justify-content:center; gap:4px;
              transition:border-color 0.15s; white-space:nowrap;
            ">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download ZIP
            </button>
            <button id="c-btn-dl-img" title="Download a PNG snapshot of the current canvas" style="
              flex:1; padding:7px 0; border-radius:6px; border:1px solid var(--border-light); cursor:pointer;
              background:var(--bg-input); color:var(--text-main); font-size:11px; font-weight:500;
              font-family:inherit; display:flex; align-items:center; justify-content:center; gap:4px;
              transition:border-color 0.15s; white-space:nowrap;
            ">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5L11 18"/></svg>
              Download PNG
            </button>
          </div>
        </div>

        <div class="prop-row" style="margin-top:12px;">
          <label>Clear all</label>
          <div style="display:flex; gap:6px;">
            <button id="c-btn-clear-current" title="Clear every element on this canvas only" style="
              flex:1; padding:7px 0; border-radius:6px; cursor:pointer;
              background:rgba(239, 68, 68, 0.05); color:#ef4444; font-size:11px; font-weight:500;
              font-family:inherit; display:flex; align-items:center; justify-content:center; gap:4px;
              border:1px solid rgba(239, 68, 68, 0.25);
              transition:background 0.15s, border-color 0.15s; white-space:nowrap;
            ">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Current
            </button>
            <button id="c-btn-clear-others" title="Clear every other canvas; keep this one untouched" style="
              flex:1; padding:7px 0; border-radius:6px; cursor:pointer;
              background:rgba(239, 68, 68, 0.05); color:#ef4444; font-size:11px; font-weight:500;
              font-family:inherit; display:flex; align-items:center; justify-content:center; gap:4px;
              border:1px solid rgba(239, 68, 68, 0.25);
              transition:background 0.15s, border-color 0.15s; white-space:nowrap;
            ">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="12" y1="11" x2="12" y2="17"></line></svg>
              Others
            </button>
            <button id="c-btn-clear-all" title="Clear every element on every canvas in the project" style="
              flex:1; padding:7px 0; border-radius:6px; cursor:pointer;
              background:rgba(239, 68, 68, 0.05); color:#ef4444; font-size:11px; font-weight:500;
              font-family:inherit; display:flex; align-items:center; justify-content:center; gap:4px;
              border:1px solid rgba(239, 68, 68, 0.25);
              transition:background 0.15s, border-color 0.15s; white-space:nowrap;
            ">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              All
            </button>
          </div>
        </div>
      </div></div>
      ${frameTransitionSectionHtml}`;
    const wInp = document.getElementById('c-w');
    const hInp = document.getElementById('c-h');

    wInp.addEventListener('input', e => { c.width = Math.max(20, +e.target.value || 20); render(true); });
    wInp.addEventListener('change', () => pushHistory());

    hInp.addEventListener('input', e => { c.height = Math.max(20, +e.target.value || 20); render(true); });
    hInp.addEventListener('change', () => pushHistory());

    const bgColor = document.getElementById('c-bg-color');
    const bgHex = document.getElementById('c-bg-color-hex');
    const bgPerFrame = document.getElementById('c-bg-per-frame');
    const bgPerCanvas = document.getElementById('c-bg-per-canvas');
    const fullClick = document.getElementById('c-full-click');

    // Write a bg colour using the current Per-frame / Per-canvas mode:
    //  • Per-frame OFF: writes c.bgColor (every frame on this canvas
    //    reads it as fallback) and clears c.bgByFrame so prior per-frame
    //    overrides don't linger.
    //  • Per-frame ON: writes the active frame's slot in c.bgByFrame.
    //    First-frame writes also mirror to c.bgColor so legacy code
    //    paths reading c.bgColor see the right colour.
    //  • Per-canvas OFF: the above applies to every canvas in state.
    //  • Per-canvas ON: only the active canvas is touched.
    const writeBg = (val) => {
      const perFrame = state.bgPerFrame === true;
      const perCanvas = state.bgPerCanvas === true;
      const targets = perCanvas ? [c] : state.canvases;
      const fid = state.activeFrameId;
      const firstId = state.frames && state.frames[0] ? state.frames[0].id : null;
      targets.forEach(cv => {
        if (perFrame) {
          if (!cv.bgByFrame) cv.bgByFrame = {};
          cv.bgByFrame[fid] = val;
          if (fid === firstId) cv.bgColor = val;
        } else {
          cv.bgColor = val;
          cv.bgByFrame = {};
        }
      });
    };

    if (bgColor) {
      bgColor.addEventListener('click', () => openColorPicker(bgColor, 'canvas-bg', getCanvasBg(c, state.activeFrameId)));
    }

    bgHex.addEventListener('input', e => {
      let val = e.target.value;
      if (!val.startsWith('#') && val.length > 0 && !val.includes('gradient')) val = '#' + val;
      writeBg(val);
      if (bgColor) bgColor.style.background = val;
      render(true);
    });
    bgHex.addEventListener('change', () => pushHistory());

    if (bgPerFrame) {
      bgPerFrame.addEventListener('change', e => {
        state.bgPerFrame = e.target.checked;
        if (!e.target.checked) {
          // Toggle OFF: unify every frame on this canvas to the
          // currently visible colour. Clears any per-frame overrides
          // so all frames read c.bgColor uniformly.
          const val = getCanvasBg(c, state.activeFrameId);
          c.bgColor = val;
          c.bgByFrame = {};
          render(true);
        }
        pushHistory();
      });
    }
    if (bgPerCanvas) {
      bgPerCanvas.addEventListener('change', e => {
        state.bgPerCanvas = e.target.checked;
        if (!e.target.checked) {
          // Toggle OFF: unify every canvas to the currently visible
          // colour. Clears per-frame overrides on every canvas so the
          // entire project reads a single bg.
          const val = getCanvasBg(c, state.activeFrameId);
          state.canvases.forEach(cv => {
            cv.bgColor = val;
            cv.bgByFrame = {};
          });
          render(true);
        }
        pushHistory();
      });
    }

    fullClick.addEventListener('change', e => {
      c.fullClickArea = e.target.checked;
      pushHistory();
      render(true);
    });

    const showSafezonesChk = document.getElementById('c-show-safezones');
    if (showSafezonesChk) {
      showSafezonesChk.addEventListener('change', e => {
        state.showSafezones = e.target.checked;
        render(true);
      });
    }

    // ── Preview button ──
    const btnPreview = document.getElementById('c-btn-preview');
    if (btnPreview) {
      const isSinglePreview = state.singlePreviewId === c.id;
      if (isSinglePreview) {
        btnPreview.style.background = 'var(--bg-input)';
        btnPreview.style.color = 'var(--text-muted)';
        btnPreview.style.border = '1px solid var(--border-light)';
        btnPreview.style.boxShadow = 'none';
        btnPreview.querySelector('polygon').setAttribute('fill', 'currentColor');
        btnPreview.innerHTML = btnPreview.innerHTML.replace('Preview', 'Exit Preview');
      }
      btnPreview.addEventListener('mouseenter', () => { btnPreview.style.filter = 'brightness(1.15)'; });
      btnPreview.addEventListener('mouseleave', () => { btnPreview.style.filter = ''; });
      btnPreview.addEventListener('click', () => {
        state.singlePreviewId = (state.singlePreviewId === c.id) ? null : c.id;
        render();
      });
    }

    // ── Auto-resize buttons ──
    const btnAiResize = document.getElementById('btn-ai-resize');
    if (btnAiResize && typeof handleAutoResizeClick === 'function') {
      btnAiResize.addEventListener('mouseenter', () => { btnAiResize.style.borderColor = 'var(--accent-base)'; });
      btnAiResize.addEventListener('mouseleave', () => { btnAiResize.style.borderColor = 'var(--border-light)'; });
      btnAiResize.addEventListener('click', handleAutoResizeClick);
    }
    const btnAiResizeSettings = document.getElementById('btn-ai-resize-settings');
    if (btnAiResizeSettings && typeof openAutoResizeSettingsModal === 'function') {
      btnAiResizeSettings.addEventListener('mouseenter', () => { btnAiResizeSettings.style.borderColor = 'var(--accent-base)'; });
      btnAiResizeSettings.addEventListener('mouseleave', () => { btnAiResizeSettings.style.borderColor = 'var(--border-light)'; });
      btnAiResizeSettings.addEventListener('click', openAutoResizeSettingsModal);
    }

    // ── Download ZIP button ──
    const btnDlZip = document.getElementById('c-btn-dl-zip');
    if (btnDlZip) {
      btnDlZip.addEventListener('mouseenter', () => { btnDlZip.style.borderColor = 'var(--accent-base)'; });
      btnDlZip.addEventListener('mouseleave', () => { btnDlZip.style.borderColor = 'var(--border-light)'; });
      btnDlZip.addEventListener('click', () => exportCanvasAsZip(c));
    }

    // ── Download PNG button ──
    const btnDlImg = document.getElementById('c-btn-dl-img');
    if (btnDlImg) {
      btnDlImg.addEventListener('mouseenter', () => { btnDlImg.style.borderColor = 'var(--accent-base)'; });
      btnDlImg.addEventListener('mouseleave', () => { btnDlImg.style.borderColor = 'var(--border-light)'; });
      btnDlImg.addEventListener('click', async () => {
        btnDlImg.textContent = 'Rendering…';
        btnDlImg.disabled = true;
        await exportCanvasAsPng(c);
        btnDlImg.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5L11 18"/></svg> Download PNG';
        btnDlImg.disabled = false;
      });
    }


    const dmOpenBtn = propsEl.querySelector('#dm-open-from-props');
    if (dmOpenBtn) dmOpenBtn.addEventListener('click', () => openDataPanel());

    // Wire the three Clear-all buttons in the canvas Properties panel.
    const btnClearCurr   = document.getElementById('c-btn-clear-current');
    const btnClearOthers = document.getElementById('c-btn-clear-others');
    const btnClearAll    = document.getElementById('c-btn-clear-all');
    if (btnClearCurr)   btnClearCurr.addEventListener('click',   clearCurrentCanvasContents);
    if (btnClearOthers) btnClearOthers.addEventListener('click', clearOtherCanvasesContents);
    if (btnClearAll)    btnClearAll.addEventListener('click',    clearAllCanvasesContents);

    if (typeof syncColorPickerWithSelection === 'function') {
      syncColorPickerWithSelection(null, c);
    }
    const canvasActiveIdx = state.frames.findIndex(fr => fr.id === state.activeFrameId);
    if (state.frames.length > 1 && (canvasActiveIdx > 0 || state.loopAd)) {
      wireFrameTransitionEvents();
    }
    initCollapsiblePanels();
    wireCustomSelects(null, null);
    return;
  }

  const f = [];
  const _dm = (typeof dmDisplay === 'function') ? dmDisplay(el) : {};
  const dText = _dm.text !== undefined ? _dm.text : el.text;
  const dColor = _dm.color !== undefined ? _dm.color : el.color;
  const dBg = _dm.bg !== undefined ? _dm.bg : el.bg;
  const dAssetId = _dm.assetId !== undefined ? _dm.assetId : el.assetId;

  const isFieldDisabled = (field) => {
    return !!(state.dataMerge && state.dataMerge.locked && typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, field));
  };

  const propTooltips = {
    // Canvas dimensions
    'c-w': 'Canvas Width (px)',
    'c-h': 'Canvas Height (px)',
    // Standard properties
    'x': 'X position in pixels',
    'y': 'Y position in pixels',
    'width': 'Width in pixels',
    'height': 'Height in pixels',
    'rotation': 'Rotation in degrees',
    'radius': 'Corner radius in pixels',
    // Text properties
    'fontSize': 'Font size in pixels',
    'maxFontSize': 'Maximum font size when using Auto-size',
    'lineHeight': 'Line height multiplier',
    'letterSpacing': 'Letter spacing in pixels',
    'bgPadL': 'Left and Right padding in pixels',
    'bgPadV': 'Top and Bottom padding in pixels',
    'bgCoverage': 'Width percentage of text background coverage',
    'bgOpacity': 'Text background opacity percentage',
    // Shape properties
    'strokeOpacity': 'Stroke opacity percentage',
    'strokeWidth': 'Stroke thickness in pixels',
    'strokeDash': 'Stroke dash length in pixels',
    'strokeGap': 'Stroke gap length in pixels',
    // Button properties
    'paddingLR': 'Button horizontal padding in pixels',
    // Image properties
    'opacity': 'Opacity percentage',
    // Animation properties
    'animDuration': 'Animation duration in seconds',
    'animDelay': 'Animation start delay in seconds',
    'zoomFrom': 'Animation zoom starting scale percentage',
    'zoomAnchor': 'Animation zoom anchor point (transform-origin)',
    'bgOffset': 'Delay offset for background block animation in seconds',
    // Effect properties
    'effDuration': 'Effect cycle duration in seconds',
    'effDelay': 'Effect start delay in seconds',
    'panDist': 'Pan translation distance in pixels',
    'zoomTarget': 'Zoom peak scale percentage',
    'effSpeed': 'Effect speed percentage',
    'effOnce': 'Run the effect cycle only once',
    'effEase': 'Apply smooth ease in/out curve',
    'spinTarget': 'Target rotation angle in degrees',
    'spinRepeat': 'Repeat count (minimum 1)',
    'pulseScale': 'Pulse peak scale percentage',
    'heartbeatScale': 'Heartbeat peak scale percentage',
    'floatRange': 'Float translation distance in pixels',
    'floatDirection': 'Float movement direction'
  };

  const num = (key, label, def = '') => `<div class="prop-row"><label>${label}</label><input type="number" data-k="${key}" value="${el[key] !== undefined ? el[key] : def}" title="${propTooltips[key] || label}" /></div>`;
  const txt = (key, label) => {
    const val = (key === 'text' && dText !== undefined) ? dText : el[key];
    const isDisabled = isFieldDisabled(key);
    return `<div class="prop-row" ${isDisabled ? 'data-locked-field="true"' : ''}><label>${label}</label><input type="text" data-k="${key}" value="${(val || '').replace(/"/g, '&quot;')}" title="${propTooltips[key] || label}" ${isDisabled ? 'disabled style="pointer-events:none;"' : ''} /></div>`;
  };
  const numIcon = (key, svgIcon, tooltip, def = '') => `
    <div class="prop-row-compact" title="${tooltip}">
      ${svgIcon}
      <input type="number" data-k="${key}" value="${el[key] !== undefined ? el[key] : def}" title="${tooltip}" />
    </div>`;

  const xIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="m18 8 4 4-4 4M6 8l-4 4 4 4M2 12h20"/></svg>`;
  const yIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="m8 18 4 4 4-4M8 6l4-4 4 4M12 2v20"/></svg>`;
  const wIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M2 5v14M22 5v14M6 12h12M10 8l-4 4 4 4M14 8l4 4-4 4"/></svg>`;
  const hIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M5 2h14M5 22h14M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4"/></svg>`;
  const rIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M18 18H6L16 8"/><path d="M13 18a7 7 0 0 0-2-5"/></svg>`;

  const col = (key, label) => {
    const val = (key === 'color' && dColor !== undefined) ? dColor : ((key === 'bg' && dBg !== undefined) ? dBg : el[key]);
    const isDisabled = isFieldDisabled(key);
    const triggerTitle = `Choose ${label.toLowerCase()} color`;
    return `
    <div class="prop-row" ${isDisabled ? 'data-locked-field="true"' : ''}>
      <label>${label}</label>
      <div style="display:flex; gap:6px; align-items:center; ${isDisabled ? 'pointer-events:none;' : ''}">
        <button class="cp-trigger" data-k="${key}" ${isDisabled ? 'disabled' : ''} title="${triggerTitle}" style="width:24px; height:24px; border-radius:4px; border:1px solid var(--border-light); cursor:pointer; background:${getBgStyle(val) || '#000'}"></button>
        ${hexInputBox(key, val, '', isDisabled)}
      </div>
    </div>`;
  };

  const colOpac = (key, label) => {
    const val = (key === 'color' && dColor !== undefined) ? dColor : ((key === 'bg' && dBg !== undefined) ? dBg : el[key]);
    const isDisabled = isFieldDisabled(key);
    const triggerTitle = `Choose ${label.toLowerCase()} color`;
    const opacityTitle = `${label} opacity percentage`;
    return `
    <div class="prop-row" ${isDisabled ? 'data-locked-field="true"' : ''}>
      <div style="display:flex; align-items:end; gap:8px; width:100%;">
        <div class="prop-row" style="margin:0; flex:1; min-width:0;">
          <label>${label}</label>
          <div style="display:flex; gap:6px; align-items:center; ${isDisabled ? 'pointer-events:none;' : ''}">
            <button class="cp-trigger" data-k="${key}" ${isDisabled ? 'disabled' : ''} title="${triggerTitle}" style="width:24px; height:24px; border-radius:4px; border:1px solid var(--border-light); cursor:pointer; background:${getBgStyle(val) || '#000'}"></button>
            ${hexInputBox(key, val, '', isDisabled)}
          </div>
        </div>
        <div class="prop-row" style="margin:0; width:78px; flex-shrink:0;">
          <label>Opacity %</label>
          <input type="number" data-k="opacity" value="${el.opacity !== undefined ? el.opacity : 100}" min="0" max="100" title="${opacityTitle}" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" />
        </div>
      </div>
    </div>`;
  };

  const alignElOptions = [
    { id: 'left', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="4" y1="2" x2="4" y2="22"/><rect x="8" y="10" width="12" height="4" rx="1"/></svg>' },
    { id: 'center', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="2" x2="12" y2="22"/><rect x="6" y="10" width="12" height="4" rx="1"/></svg>' },
    { id: 'right', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="20" y1="2" x2="20" y2="22"/><rect x="4" y="10" width="12" height="4" rx="1"/></svg>' },
    { id: 'top', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="2" y1="4" x2="22" y2="4"/><rect x="10" y="8" width="4" height="12" rx="1"/></svg>' },
    { id: 'middle', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="2" y1="12" x2="22" y2="12"/><rect x="10" y="6" width="4" height="12" rx="1"/></svg>' },
    { id: 'bottom', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="2" y1="20" x2="22" y2="20"/><rect x="10" y="4" width="4" height="12" rx="1"/></svg>' }
  ];
  const elAlignTitles = { left: 'Align Left', center: 'Align Horizontal Center', right: 'Align Right', top: 'Align Top', middle: 'Align Vertical Center', bottom: 'Align Bottom' };
  const alignElHtml = alignElOptions.map(a => `<button class="align-btn action-el-align" data-align="${a.id}" title="${elAlignTitles[a.id]}">${a.icon}</button>`).join('');

  f.push(`<div class="prop-row"><div class="align-group" style="justify-content:space-between; width:100%;">${alignElHtml}</div></div>`);
  f.push(`<div class="prop-row" style="margin-bottom:6px;"><div class="prop-grid-2">${numIcon('x', xIcon, 'X Position')}${numIcon('y', yIcon, 'Y Position')}</div></div>`);
  f.push(`<div class="prop-row" style="margin-bottom:6px;"><div class="prop-grid-2">${numIcon('width', wIcon, el.type === 'line' ? 'Length' : 'Width')}${numIcon('height', hIcon, el.type === 'line' ? 'Thickness' : 'Height')}</div></div>`);
  f.push(`<div class="prop-row" style="margin-bottom:6px;">
    <div class="prop-grid-2">
      ${numIcon('rotation', rIcon, 'Rotation', 0)}
      <div class="checkbox-row" style="height:24px; align-items:center;">
        <input type="checkbox" data-k="lockRatio" id="prop-lock-ratio" title="Maintain aspect ratio when resizing" ${el.lockRatio ? 'checked' : ''} />
        <label for="prop-lock-ratio" title="Maintain aspect ratio when resizing">Lock Ratio</label>
      </div>
    </div>
  </div>`);

  const FONT_OPTIONS = ['Arial', 'Helvetica Neue LT Pro', 'Museo', 'Times New Roman', 'Verdana', 'Tahoma'];
  const fontWeights = {
    'Museo': ['300', '500', '700'],
    'Helvetica Neue LT Pro': ['300', '400', '500']
  };
  const getWeightsForFont = (fnt) => fontWeights[fnt] || ['100', '200', '300', '400', '500', '600', '700', '800', '900'];
  // When a font is switched to one that lacks the element's current weight, the
  // stored weight stays out-of-range: the dropdown can't select it (so it shows
  // the first option) while the browser renders the nearest available face — the
  // UI and the canvas disagree. Snap the stored weight to the nearest available
  // one so the value, the dropdown, and the rendered glyphs all agree.
  const reconcileWeightForFont = (targetEl) => {
    if (!targetEl || (targetEl.type !== 'text' && targetEl.type !== 'button')) return;
    const avail = getWeightsForFont(targetEl.fontFamily || 'Arial');
    const cur = String(targetEl.weight ?? '');
    if (avail.includes(cur)) return;
    const curNum = parseInt(cur, 10);
    let nearest = avail[0];
    if (!Number.isNaN(curNum)) {
      nearest = avail.reduce((best, w) =>
        Math.abs(parseInt(w, 10) - curNum) < Math.abs(parseInt(best, 10) - curNum) ? w : best, avail[0]);
    }
    targetEl.weight = nearest;
  };

  if (el.type === 'text') {
    const textDisabled = isFieldDisabled('text');
    f.push(`<div class="prop-row" ${textDisabled ? 'data-locked-field="true"' : ''}><label>Text</label><textarea data-k="text" rows="2" ${textDisabled ? 'disabled style="pointer-events:none;"' : ''}>${esc(dText)}</textarea></div>`);

    // Resolve computed size for display
    const computedFontSize = el.autoSize ? calculateAutoSize(el, dText) : (el.fontSize || 14);

    // Line 1: Font and Weight
    f.push(`<div class="prop-row">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
        <div class="prop-row" style="margin:0"><label>Font</label>
          <select data-k="fontFamily" title="Font Family">
            ${FONT_OPTIONS.map(fnt => `<option ${fnt === (el.fontFamily || 'Arial') ? 'selected' : ''} value="${fnt}">${fnt}</option>`).join('')}
          </select>
        </div>
        <div class="prop-row" style="margin:0"><label>Weight</label>
          <select data-k="weight" title="Font Weight">
            ${getWeightsForFont(el.fontFamily || 'Arial').map(w => `<option ${String(w) === String(el.weight) ? 'selected' : ''} value="${w}">${w}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>`);

    // Line 2: Size & Auto & Max size
    f.push(`<div class="prop-row">
      <div style="display:flex; align-items:end; gap:8px; width:100%;">
        <div class="prop-row" style="margin:0; flex:1;">
          <label for="prop-font-size">Size</label>
          <input type="number" data-k="fontSize" id="prop-font-size" value="${computedFontSize}" ${el.autoSize ? 'disabled' : ''} style="width:100%;" title="Font Size (px)" />
        </div>
        <div class="checkbox-row" style="margin:0 12px 5px 0; font-size:11px; color:var(--text-main); gap:4px; height:22px; flex-shrink:0; white-space:nowrap;">
          <input type="checkbox" data-k="autoSize" id="prop-auto-size" title="Auto-scale text size to fit boundary" ${el.autoSize ? 'checked' : ''} style="width:12px; height:12px; margin:0;" />
          <label for="prop-auto-size" title="Auto-scale text size to fit boundary" style="cursor:pointer; margin:0;">Auto</label>
        </div>
        <div class="prop-row" style="margin:0; flex:1;">
          <label for="prop-max-font-size">Max size</label>
          <input type="number" data-k="maxFontSize" id="prop-max-font-size" value="${el.maxFontSize !== undefined ? el.maxFontSize : (el.fontSize || 72)}" ${!el.autoSize ? 'disabled' : ''} style="width:100%;" title="Maximum font size when using Auto-size" />
        </div>
      </div>
    </div>`);

    f.push(colOpac('color', 'Color'));

    const autoChecked = isLineHeightAuto(el);
    f.push(`<div class="prop-row" id="prop-spacing-row">
          <div style="display:flex; align-items:end; gap:8px; width:100%;">
            <div class="prop-row" style="margin:0; flex:1;">
              <label for="prop-line-height">Leading</label>
              <input type="number" step="0.1" min="0.1" data-k="lineHeight" id="prop-line-height" value="${el.lineHeight !== undefined ? el.lineHeight : '1.2'}" ${autoChecked ? 'disabled' : ''} style="width:100%;" title="Line height multiplier" />
            </div>
            <div class="checkbox-row" style="margin:0 12px 5px 0; font-size:11px; color:var(--text-main); gap:4px; height:22px; flex-shrink:0; white-space:nowrap;">
              <input type="checkbox" data-k="lineHeightAuto" id="prop-line-height-auto" title="Auto-calculate line height based on size" ${autoChecked ? 'checked' : ''} style="width:12px; height:12px; margin:0;" />
              <label for="prop-line-height-auto" title="Auto-calculate line height based on size" style="cursor:pointer; margin:0;">Auto</label>
            </div>
            <div class="prop-row" style="margin:0; flex:1;">
              <label for="prop-letter-spacing">Tracking</label>
              <input type="number" data-k="letterSpacing" id="prop-letter-spacing" value="${el.letterSpacing !== undefined ? el.letterSpacing : 0}" style="width:100%;" title="Letter spacing in pixels" />
            </div>
          </div>
        </div>`);

    // Text background — color, toggle (BG), and opacity on one line.
    f.push(`<div class="prop-row">
      <div style="display:flex; align-items:end; gap:8px; width:100%;">
        <div class="prop-row" style="margin:0; flex:1; min-width:0;">
          <label>BG Color</label>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="cp-trigger" data-k="bg" ${!el.hasBg ? 'disabled' : ''} title="Choose text background color" style="width:24px; height:24px; border-radius:4px; border:1px solid var(--border-light); cursor:pointer; background:${getBgStyle(el.bg || '#000000') || '#000'}"></button>
            ${hexInputBox('bg', el.bg || '#000000', '', !el.hasBg)}
          </div>
        </div>
        <div class="checkbox-row" style="margin:0 12px 5px 0; font-size:11px; color:var(--text-main); gap:4px; height:22px; flex-shrink:0; white-space:nowrap;">
          <input type="checkbox" data-k="hasBg" id="prop-has-bg" title="Enable text background" ${el.hasBg ? 'checked' : ''} style="width:12px; height:12px; margin:0;" />
          <label for="prop-has-bg" title="Enable text background" style="cursor:pointer; margin:0;">BG</label>
        </div>
        <div class="prop-row" style="margin:0; width:78px; flex-shrink:0;">
          <label for="prop-bg-opacity">Opacity %</label>
          <input type="number" data-k="bgOpacity" id="prop-bg-opacity" value="${el.bgOpacity !== undefined ? el.bgOpacity : 100}" min="0" max="100" ${!el.hasBg ? 'disabled' : ''} style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Text background opacity percentage" />
        </div>
      </div>
    </div>`);

    // L/R pad, T/B pad, Coverage — three compact columns on a single row.
    f.push(`<div class="prop-row" style="display:flex; gap:6px;">
      <div style="flex:1; min-width:0;"><label for="prop-bg-pad-l">L/R Pad</label><input type="number" data-k="bgPadL" id="prop-bg-pad-l" value="${el.bgPadL !== undefined ? el.bgPadL : 8}" min="0" ${!el.hasBg ? 'disabled' : ''} style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Left and Right padding in pixels" /></div>
      <div style="flex:1; min-width:0;"><label for="prop-bg-pad-v">T/B Pad</label><input type="number" data-k="bgPadV" id="prop-bg-pad-v" value="${el.bgPadV !== undefined ? el.bgPadV : 4}" min="0" ${!el.hasBg ? 'disabled' : ''} style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Top and Bottom padding in pixels" /></div>
      <div style="flex:1; min-width:0;"><label for="prop-bg-coverage">Cover %</label><input type="number" data-k="bgCoverage" id="prop-bg-coverage" value="${el.bgCoverage !== undefined ? el.bgCoverage : 100}" min="0" max="100" ${!el.hasBg ? 'disabled' : ''} style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Width percentage of text background coverage" /></div>
    </div>`);
  }

  if (el.type === 'text' || el.type === 'button') {
    const alignOptions = [
      { id: 'left', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' },
      { id: 'center', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' },
      { id: 'right', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' }
    ];
    const alignTitles = { left: 'Align text left', center: 'Align text center', right: 'Align text right' };
    const alignHtml = alignOptions.map(a => `<button class="align-btn ${el.textAlign === a.id ? 'active' : ''}" data-align="${a.id}" title="${alignTitles[a.id]}" style="padding:4px 0;">${a.icon}</button>`).join('');
    const vAlignOptions = [
      { id: 'top', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="4" y1="4" x2="20" y2="4"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="14" x2="16" y2="14"/></svg>' },
      { id: 'middle', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="4" y1="12" x2="20" y2="12"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="17" x2="16" y2="17"/></svg>' },
      { id: 'bottom', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="4" y1="20" x2="20" y2="20"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="8" y1="10" x2="16" y2="10"/></svg>' }
    ];
    const vAlignTitles = { top: 'Vertical align top', middle: 'Vertical align middle', bottom: 'Vertical align bottom' };
    const vAlignHtml = vAlignOptions.map(a => `<button class="valign-btn align-btn ${el.verticalAlign === a.id ? 'active' : ''}" data-valign="${a.id}" title="${vAlignTitles[a.id]}" style="padding:4px 0;">${a.icon}</button>`).join('');

    f.push(`<div class="prop-row"><label>Alignment</label>
      <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
        <div class="align-group">${alignHtml}</div>
        <div class="align-group">${vAlignHtml}</div>
      </div>
    </div>`);
  }
  // Stroke section — applies to shapes (rect/circle) and the button frame, NOT to
  // text elements or the text inside a button. Always rendered (no toggle); thickness
  // = 0 simply means no stroke is drawn. The other fields stay editable since their
  // values don't visually change anything until thickness is non-zero anyway.
  const strokeSection = () => {
    const sw = el.strokeWidth !== undefined ? el.strokeWidth : 0;
    let h = '';
    h += `<div class="prop-row" style="display:flex; gap:10px;">
          <div style="flex:1; min-width:0;">
            <label>Stroke Color</label>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="cp-trigger" data-k="strokeColor" title="Choose stroke color" style="width:24px; height:24px; border-radius:4px; border:1px solid var(--border-light); cursor:pointer; background:transparent; box-shadow:inset 0 0 0 4px ${getBgStyle(el.strokeColor || '#ffffff') || '#fff'};"></button>
              ${hexInputBox('strokeColor', el.strokeColor || '#ffffff')}
            </div>
          </div>
          <div style="width:78px; flex-shrink:0;">
            <label for="prop-stroke-opacity">Opacity %</label>
            <input type="number" data-k="strokeOpacity" id="prop-stroke-opacity" value="${el.strokeOpacity !== undefined ? el.strokeOpacity : 100}" min="0" max="100" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Stroke opacity percentage" />
          </div>
        </div>`;
    h += `<div class="prop-row" style="display:flex; gap:6px;">
          <div style="flex:1; min-width:0;"><label for="prop-stroke-width">Thickness</label><input type="number" data-k="strokeWidth" id="prop-stroke-width" value="${sw}" min="0" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Stroke thickness in pixels" /></div>
          <div style="flex:1; min-width:0;"><label for="prop-stroke-dash">Dash</label><input type="number" data-k="strokeDash" id="prop-stroke-dash" value="${el.strokeDash !== undefined ? el.strokeDash : 0}" min="0" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Stroke dash length in pixels" /></div>
          <div style="flex:1; min-width:0;"><label for="prop-stroke-gap">Gap</label><input type="number" data-k="strokeGap" id="prop-stroke-gap" value="${el.strokeGap !== undefined ? el.strokeGap : 0}" min="0" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Stroke gap length in pixels" /></div>
        </div>`;
    return h;
  };

  if (el.type === 'rect') { f.push(colOpac('color', 'Fill')); f.push(num('radius', 'Radius')); f.push(strokeSection()); }
  if (el.type === 'circle') { f.push(colOpac('color', 'Fill')); f.push(strokeSection()); }
  if (el.type === 'pixel') { f.push(colOpac('color', 'Fill')); f.push(strokeSection()); }
  if (el.type === 'line') { f.push(colOpac('color', 'Line color')); }
  if (el.type === 'button') {
    f.push(txt('text', 'Label'));
    // Row 1: Font and Weight
    f.push(`<div class="prop-row">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
        <div class="prop-row" style="margin:0"><label>Font</label>
          <select data-k="fontFamily" title="Button Font Family">
            ${FONT_OPTIONS.map(fnt => `<option ${fnt === (el.fontFamily || 'Arial') ? 'selected' : ''} value="${fnt}">${fnt}</option>`).join('')}
          </select>
        </div>
        <div class="prop-row" style="margin:0"><label>Weight</label>
          <select data-k="weight" title="Button Font Weight">
            ${getWeightsForFont(el.fontFamily || 'Arial').map(w => `<option ${String(w) === String(el.weight) ? 'selected' : ''} value="${w}">${w}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>`);

    // Sizing controls: the two toggles share a row, then the numeric limits
    // (Size / Max / Wrap-threshold) sit together on the row below. "Wrap <"
    // only appears when it's actually in play (Auto-size + Wrap both on).
    const computedFontSize = el.autoSize ? calculateAutoSize(el, dText) : (el.fontSize || 14);
    const showWrapMin = el.autoSize && el.wrapText;
    f.push(`<div class="prop-row" style="margin-bottom:6px;">
      <div style="display:flex; align-items:center; gap:18px; width:100%;">
        <div class="checkbox-row" style="margin:0; font-size:11px; color:var(--text-main); gap:5px;">
          <input type="checkbox" data-k="autoSize" id="prop-auto-size" title="Auto-scale the text to fit the button" ${el.autoSize ? 'checked' : ''} style="width:13px; height:13px; margin:0;" />
          <label for="prop-auto-size" title="Auto-scale the text to fit the button" style="cursor:pointer; margin:0;">Auto-size</label>
        </div>
        <div class="checkbox-row" style="margin:0; font-size:11px; color:var(--text-main); gap:5px;">
          <input type="checkbox" data-k="wrapText" id="prop-wrap-text" title="Allow the label to break onto multiple lines" ${el.wrapText ? 'checked' : ''} style="width:13px; height:13px; margin:0;" />
          <label for="prop-wrap-text" title="Allow the label to break onto multiple lines" style="cursor:pointer; margin:0;">Wrap lines</label>
        </div>
      </div>
    </div>`);
    f.push(`<div class="prop-row">
      <div style="display:flex; align-items:flex-end; gap:8px; width:100%;">
        <div class="prop-row" style="margin:0; flex:1; min-width:0;">
          <label for="prop-font-size">${el.autoSize ? 'Size (auto)' : 'Size'}</label>
          <input type="number" data-k="fontSize" id="prop-font-size" value="${computedFontSize}" ${el.autoSize ? 'disabled' : ''} style="width:100%;" title="${el.autoSize ? 'Auto-size is on — turn it off to set a fixed font size' : 'Fixed font size'}" />
        </div>
        <div class="prop-row" style="margin:0; flex:1; min-width:0;">
          <label for="prop-max-font-size">Max</label>
          <input type="number" data-k="maxFontSize" id="prop-max-font-size" value="${el.maxFontSize !== undefined ? el.maxFontSize : (el.fontSize || 72)}" ${!el.autoSize ? 'disabled' : ''} style="width:100%;" title="Largest font size auto-size may use" />
        </div>
        ${showWrapMin ? `<div class="prop-row" style="margin:0; flex:1; min-width:0;">
          <label for="prop-wrap-min" title="When auto-size would shrink the label below this size, it wraps onto multiple lines instead of shrinking further.">Wrap &lt;</label>
          <input type="number" data-k="wrapMinSize" id="prop-wrap-min" min="4" value="${el.wrapMinSize !== undefined ? el.wrapMinSize : DEFAULT_WRAP_MIN}" style="width:100%;" title="When auto-size would shrink the label below this size, it wraps onto multiple lines instead of shrinking further." />
        </div>` : ''}
      </div>
    </div>`);

    f.push(colOpac('bg', 'BG'));
    f.push(col('color', 'Text color'));
    // Radius + Padding L/R + Padding T/B share a row.
    f.push(`<div class="prop-row" style="display:flex; gap:6px;">
          <div style="flex:1; min-width:0;"><label for="prop-radius">Radius</label><input type="number" data-k="radius" id="prop-radius" value="${el.radius !== undefined ? el.radius : 0}" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Button corner radius in pixels" /></div>
          <div style="flex:1; min-width:0;"><label for="prop-padding-lr">Padding L/R</label><input type="number" data-k="paddingLR" id="prop-padding-lr" value="${el.paddingLR !== undefined ? el.paddingLR : 16}" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Button horizontal padding in pixels" /></div>
          <div style="flex:1; min-width:0;"><label for="prop-padding-tb">Padding T/B</label><input type="number" data-k="paddingTB" id="prop-padding-tb" value="${el.paddingTB !== undefined ? el.paddingTB : 0}" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Button vertical padding in pixels" /></div>
        </div>`);
    f.push(`<div class="prop-row" style="display:flex; gap:16px;">
          <div class="checkbox-row">
            <input type="checkbox" data-k="autoHug" id="prop-auto-hug" title="Auto-scale button width to hug text content" ${el.autoHug ? 'checked' : ''} ${el.autoSize ? 'disabled style="pointer-events:none; opacity:0.5;"' : ''}/>
            <label for="prop-auto-hug" title="Auto-scale button width to hug text content" style="cursor:${el.autoSize ? 'not-allowed' : 'pointer'}; opacity:${el.autoSize ? '0.5' : '1'};">Hug</label>
          </div>
          <div class="checkbox-row">
            ${c && c.fullClickArea !== false 
              ? `<input type="checkbox" data-k="isClickArea" id="prop-is-click-area" title="Forced selected because 'Use entire canvas as click area' is checked in Canvas Settings" checked disabled style="cursor: not-allowed;"/>
                 <label for="prop-is-click-area" title="Forced selected because 'Use entire canvas as click area' is checked in Canvas Settings" style="cursor: not-allowed; opacity: 0.5;">Clicktag</label>`
              : `<input type="checkbox" data-k="isClickArea" id="prop-is-click-area" title="Make this button the main click-through area" ${el.isClickArea ? 'checked' : ''}/>
                 <label for="prop-is-click-area" title="Make this button the main click-through area" style="cursor:pointer;">Clicktag</label>`
            }
          </div>
        </div>`);
    f.push(strokeSection());
  }
  if (el.type === 'image') {
    const imgDisabled = isFieldDisabled('image');
    const src = dAssetId ? ((state.assets && state.assets[dAssetId]) || dAssetId) : '';
    const isRmitLogo = el.role === 'rmit-logo' || (el.customName && el.customName.toLowerCase().includes('rmit') && el.customName.toLowerCase().includes('logo'));
    const isVector = (el.name && el.name.toLowerCase().endsWith('.svg')) || 
                     (dAssetId && typeof dAssetId === 'string' && dAssetId.toLowerCase().includes('.svg')) ||
                     (dAssetId && state.assets && state.assets[dAssetId] && (
                       state.assets[dAssetId].startsWith('data:image/svg+xml') || 
                       state.assets[dAssetId].toLowerCase().includes('.svg')
                     )) ||
                     isRmitLogo || 
                     (el.customName && (
                       el.customName.toLowerCase().includes('logo') || 
                       el.customName.toLowerCase().includes('pixel')
                     ));

    if (isRmitLogo) {
      const variantOptions = [
        { val: 'data/Elements/RMIT_full.svg', label: 'Full Color', img: 'data/Elements/RMIT_full.svg' },
        { val: 'data/Elements/RMIT_RedPixel.svg', label: 'Red Pixel', img: 'data/Elements/RMIT_RedPixel.svg' },
        { val: 'data/Elements/RMIT_White.svg', label: 'White', img: 'data/Elements/RMIT_White.svg' }
      ];
      const currentVariantVal = el.assetId || 'data/Elements/RMIT_White.svg';
      f.push(`<div class="prop-row">
        <label>Variant</label>
        ${customSelect('logoVariant', variantOptions, currentVariantVal, 'RMIT Logo Variant')}
      </div>`);
    }

    // Output file input element (hidden if image already uploaded, so we can trigger it via custom UI)
    const fileInputHtml = `<input type="file" accept="image/*" id="img-upload" title="Upload an image file" style="${src ? 'display:none;' : ''}" ${imgDisabled ? 'disabled style="pointer-events:none;"' : ''} />`;

    if (!src) {
      // Standard upload row when no image is set yet
      f.push(`<div class="prop-row" ${imgDisabled ? 'data-locked-field="true"' : ''}>
        <label for="img-upload">Upload image</label>
        ${fileInputHtml}
      </div>`);
    } else {
      // Image uploaded / used: hide top button and filename, display preview container with overlay
      f.push(fileInputHtml);
      const overlayHtml = isRmitLogo ? '' : `<div class="img-preview-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.65); display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s ease; gap:8px;">
            <button id="overlay-browse-btn" class="btn" style="background:var(--accent-base); color:var(--text-on-accent, var(--text-bright)); border:none; border-radius:4px; padding:6px 16px; font-size:11px; font-weight:600; cursor:pointer;">Browse...</button>
            <span class="overlay-filename" style="color:var(--text-muted); font-size:10px; max-width:90%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(el.name || '')}">${esc(el.name || '')}</span>
          </div>`;
      f.push(`<div class="prop-row">
        <label>Preview</label>
        <div class="img-preview-container" style="position:relative; width:100%; border-radius:4px; overflow:hidden; border:1px solid var(--border-light); background:#12131a; cursor:${isRmitLogo ? 'default' : 'pointer'};">
          <img src="${src}" style="display:block; width:100%; max-height:160px; object-fit:contain; pointer-events:none;" />
          ${overlayHtml}
        </div>
      </div>`);

      if (!isVector) {
        const compressBtnStyle = 'background:var(--accent-base); color:var(--text-on-accent, var(--text-bright)); border:none; cursor:pointer;';
        const gearBtnStyle = 'background:var(--accent-base); color:var(--text-on-accent, var(--text-bright)); border:none; cursor:pointer; width:28px; display:flex; align-items:center; justify-content:center; padding:0;';
        const isCropped = !!el.cropOriginalAssetId;
        const cropBtnStyle = isCropped
          ? 'background:var(--accent-dark); color:var(--text-main); border:1px solid var(--accent-base); cursor:pointer;'
          : 'background:var(--bg-input); color:var(--text-main); border:1px solid var(--border-light); cursor:pointer;';
        const cropTitle = isCropped
          ? 'Re-crop / re-rotate. Reopens the crop dialogue with the original (uncropped) image and the current crop region preselected.'
          : 'Crop & level — rotate the image and pull the corners to crop. Result is baked into the image (element rotation stays 0).';
        const GEAR_ICON = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

        f.push(`<div class="prop-row" style="margin-top:4px; margin-bottom:6px; display:flex; gap:6px; width:100%;">
          <div style="display:flex; gap:4px; flex:1;">
            <button id="btn-webp-compress" class="btn" title="Auto-compress image to reduce file size at suggested level" style="flex:1; padding:6px 8px; font-size:11px; border-radius:4px; transition:opacity 0.2s; font-weight:600; ${compressBtnStyle}" ${imgDisabled ? 'disabled' : ''}>
              ${el.isCompressed ? '✓ Auto-compress' : 'Auto-compress'}
            </button>
            <button id="btn-webp-settings" class="btn" title="Open compression settings dialog" style="border-radius:4px; transition:opacity 0.2s; ${gearBtnStyle}" ${imgDisabled ? 'disabled' : ''}>
              ${GEAR_ICON}
            </button>
          </div>
        </div>`);

        f.push(`<div class="prop-row" style="margin-top:0; margin-bottom:8px; display:flex; gap:6px; width:100%;">
          <button id="btn-image-crop" class="btn" title="${cropTitle}" style="flex:1; padding:6px 8px; font-size:11px; border-radius:4px; font-weight:600; ${cropBtnStyle}" ${imgDisabled ? 'disabled style="pointer-events:none; opacity:0.5;"' : ''}>
            ${isCropped ? '✓ Crop & Level' : 'Crop & Level'}
          </button>
          ${!isRmitLogo ? `
          <button id="btn-image-remove" class="btn" title="Remove image and keep placeholder" style="flex:1; padding:6px 8px; font-size:11px; border-radius:4px; font-weight:600; background:rgba(239, 68, 68, 0.1); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.3); cursor:pointer; transition: background 0.2s, border-color 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.borderColor='rgba(239, 68, 68, 0.5)';" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.borderColor='rgba(239, 68, 68, 0.3)';" ${imgDisabled ? 'disabled style="pointer-events:none; opacity:0.5;"' : ''}>
            Remove Image
          </button>
          ` : ''}
        </div>`);
      } else {
        if (!isRmitLogo) {
          f.push(`<div class="prop-row" style="margin-top:0; margin-bottom:8px;">
            <button id="btn-image-remove" class="btn" title="Remove image and keep placeholder" style="width:100%; padding:6px 8px; font-size:11px; border-radius:4px; font-weight:600; background:rgba(239, 68, 68, 0.1); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.3); cursor:pointer; transition: background 0.2s, border-color 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.borderColor='rgba(239, 68, 68, 0.5)';" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.borderColor='rgba(239, 68, 68, 0.3)';" ${imgDisabled ? 'disabled style="pointer-events:none; opacity:0.5;"' : ''}>
              Remove Image
            </button>
          </div>`);
        }
      }
    }

    // Sizing (Fit), Radius, and Opacity inline side-by-side
    f.push(`<div class="prop-row" style="display:flex; gap:6px;">
      <div style="flex:1; min-width:0;">
        <label for="prop-object-fit">Fit</label>
        <select data-k="objectFit" id="prop-object-fit" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="How the image fits within its bounding box">
          <option value="cover" ${el.objectFit === 'cover' ? 'selected' : ''}>Fill</option>
          <option value="contain" ${el.objectFit === 'contain' || !el.objectFit ? 'selected' : ''}>Fit</option>
          <option value="fill" ${el.objectFit === 'fill' ? 'selected' : ''}>Stretch</option>
        </select>
      </div>
      <div style="flex:1; min-width:0;">
        <label for="prop-radius">Radius</label>
        <input type="number" data-k="radius" id="prop-radius" value="${el.radius !== undefined ? el.radius : 0}" min="0" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Corner radius in pixels" />
      </div>
      <div style="flex:1; min-width:0;">
        <label for="prop-opacity">Opacity %</label>
        <input type="number" data-k="opacity" id="prop-opacity" value="${el.opacity !== undefined ? el.opacity : 100}" min="0" max="100" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Opacity percentage" />
      </div>
    </div>`);

    // Alt Text for screen readers
    const altTextDisabled = isFieldDisabled('altText');
    f.push(`<div class="prop-row" ${altTextDisabled ? 'data-locked-field="true"' : ''}>
      <label for="prop-alt-text">Alt Text</label>
      <input type="text" data-k="altText" id="prop-alt-text" value="${(el.altText || '').replace(/"/g, '&quot;')}" placeholder="Alt text for screen readers..." title="Alt text for screen readers" ${altTextDisabled ? 'disabled style="pointer-events:none;"' : ''} />
    </div>`);
  }

  // Animation section
  f.push(`</div></div>`); // end of properties section
  if (state.layerSelection && state.layerSelection.length > 1) {
    f.push(`<div class="panel-section" id="panel-section-animation">
      <h3 class="panel-header-collapsible" id="header-animation" style="cursor: pointer; user-select: none; color: var(--text-label);">
        <span>Animation</span>
        <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="transition: transform 0.2s ease;">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </h3>
      <div class="panel-section-content" style="font-size:11px; color:var(--text-muted); line-height:1.45; padding:10px 12px; background:var(--bg-input); border:1px solid var(--border-light); border-radius:5px; margin-top: 10px;">
        <b style="color:var(--text-label);">Disabled for groups / multi-selection.</b><br>
        Isolate the group (double-click) to configure animations on individual elements.
      </div>
    </div>`);
  } else {
    const starIcon = state.filterFavorites ? `
      <svg class="fav-filter-icon" width="12" height="12" viewBox="0 0 24 24" fill="var(--accent-base)" stroke="var(--accent-base)" stroke-width="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    ` : `
      <svg class="fav-filter-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    `;

    f.push(`<div class="panel-section" id="panel-section-animation">
      <h3 class="panel-header-collapsible" id="header-animation" style="cursor: pointer; user-select: none;">
        <span>Animation</span>
        <button class="fav-filter-btn" style="background:none; border:none; padding:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; outline:none; margin-left:auto;" title="${state.filterFavorites ? 'Show All Transitions' : 'Filter Favorites'}">
          ${starIcon}
        </button>
        <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="transition: transform 0.2s ease;">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </h3>
      <div class="panel-section-content">`);

    f.push(`<div id="in-transition-preview-area" class="animation-sub-panel">`);
    f.push(`<div class="prop-row" style="margin-bottom:6px;"><label class="anim-sub-head"><svg id="fi_18562238" width="12" height="12" viewBox="0 0 100 100" style="color: var(--accent-base); flex-shrink: 0;" fill="currentColor"><path d="m21.5527992 16.0015984h-16.6498918c-2.1364791 0-3.2064319 2.5830956-1.695713 4.0938129l29.9045877 29.9045887-29.9045878 29.9045868c-1.5107189 1.5107193-.4407661 4.093811 1.695713 4.093811h16.6498909c.6360168 0 1.2459831-.252655 1.695713-.7023849l31.6003047-31.6002999c.9365158-.9365158.9365158-2.4549103 0-3.3914261l-31.6003036-31.6003017c-.44973-.4497299-1.0596962-.7023868-1.6957131-.7023868z"></path><path d="m63.5015984 16.0015984h-16.6498948c-2.1364784 0-3.2064323 2.5830956-1.695713 4.0938129l29.9045868 29.9045887-29.9045868 29.9045868c-1.5107193 1.5107193-.4407654 4.093811 1.695713 4.093811h16.6498947c.636013 0 1.2459831-.252655 1.695713-.7023849l31.6003038-31.6002999c.9365158-.9365158.9365158-2.4549103 0-3.3914261l-31.6003037-31.6003017c-.4497299-.4497299-1.0597-.7023868-1.695713-.7023868z"></path></svg>IN ANIMATIONS</label></div>`);

    const animOptions = [
      { val: 'none', label: 'None' },
      { val: 'fade-in', label: 'Fade In' },
      { val: 'slide', label: 'Slide' },
      { val: 'swipe', label: 'Swipe' },
      { val: 'zoom', label: 'Zoom' },
      { val: 'split', label: 'Split' }
    ];
    if (el.type === 'text' || el.type === 'button') {
      animOptions.push({ val: 'typing', label: 'Typing' });
    }

    let filteredOptions = animOptions;
    let favMessageHtml = '';
    if (state.filterFavorites) {
      filteredOptions = animOptions.filter(o => o.val === 'none' || state.favoriteAnimations?.includes('in-' + o.val));
      if (filteredOptions.length <= 1) {
        favMessageHtml = `<div style="grid-column: span 3; font-size: 10px; color: var(--text-muted); line-height: 1.4; padding: 4px 0; text-align: center;">
          No favorite animations for this element type yet. Right-click presets to add to favorites.
        </div>`;
      }
    }

    const isSwipeActive = (el.animType || 'none').startsWith('swipe-');
    const isSlideActive = el.animType === 'slide' || el.animType === 'slide-up' || el.animType === 'slide-down' || el.animType === 'slide-left' || el.animType === 'slide-right';

    f.push(`<div class="anim-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px;">
      ${filteredOptions.map(o => {
        const isActive = o.val === 'swipe' ? isSwipeActive : (o.val === 'zoom' ? (el.animType === 'zoom' || el.animType === 'zoom-in' || el.animType === 'pop-in') : (o.val === 'slide' ? isSlideActive : o.val === (el.animType || 'none')));
        const isFav = state.favoriteAnimations?.includes('in-' + o.val);
        const favStyle = isFav ? 'outline: 1px solid var(--accent-base); outline-offset: -1px;' : '';
        return `<button class="align-btn anim-btn ${isActive ? 'active' : ''}" data-val="${o.val}" style="font-size:10px; ${favStyle}" title="Transition: ${o.label}">${o.label}</button>`;
      }).join('')}
      ${favMessageHtml}
    </div>`);

    // Seconds inputs use step=0.1 so wheel-scroll and arrow keys nudge by 0.1.
    const secNum = (key, label, def = '') => `<div class="prop-row" style="margin:0;"><label>${label}</label><input type="number" step="0.1" data-k="${key}" value="${el[key] !== undefined ? el[key] : def}" /></div>`;

    const isZoomLike = el.animType === 'zoom' || el.animType === 'zoom-in' || el.animType === 'pop-in';
    const isSlideLike = el.animType === 'slide' || el.animType === 'slide-up' || el.animType === 'slide-down' || el.animType === 'slide-left' || el.animType === 'slide-right';
    const isSwipeLike = (el.animType || 'none').startsWith('swipe-');
    const isSplit = el.animType === 'split';

    if (isZoomLike) {
      const defaultZoomFrom = el.animType === 'pop-in' ? 80 : (el.animType === 'zoom-in' ? 110 : 80);
      f.push(`<div class="prop-row" style="margin-bottom:8px;"><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px;">
        ${secNum('animDuration', 'Duration (s)', 1)}
        ${secNum('animDelay', 'Delay (s)', 0)}
        ${secNum('zoomFrom', 'From (%)', defaultZoomFrom)}
      </div></div>`);
    } else {
      f.push(`<div class="prop-row" style="margin-bottom:8px;"><div class="prop-grid-2">
        ${secNum('animDuration', 'Duration (s)', 1)}
        ${secNum('animDelay', 'Delay (s)', 0)}
      </div></div>`);
    }

    if (isZoomLike) {
      const renderAnchorDot = (anchorName, title) => {
        const isSelected = el.zoomAnchor === anchorName || (!el.zoomAnchor && anchorName === 'center');
        return `<button class="anchor-dot-btn ${isSelected ? 'active' : ''}" data-anchor="${anchorName}" title="${title}"><div></div></button>`;
      };
      f.push(`
        <div class="prop-row" style="margin-bottom:8px; display:flex; align-items:center; gap:16px;">
          <!-- Left: 9-dot box -->
          <div class="anchor-grid" style="flex-shrink:0;">
            ${renderAnchorDot('top-left', 'Top Left')}
            ${renderAnchorDot('top-center', 'Top Center')}
            ${renderAnchorDot('top-right', 'Top Right')}
            ${renderAnchorDot('middle-left', 'Middle Left')}
            ${renderAnchorDot('center', 'Center')}
            ${renderAnchorDot('middle-right', 'Middle Right')}
            ${renderAnchorDot('bottom-left', 'Bottom Left')}
            ${renderAnchorDot('bottom-center', 'Bottom Center')}
            ${renderAnchorDot('bottom-right', 'Bottom Right')}
          </div>
          
          <!-- Right: Checkboxes -->
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div class="checkbox-row" style="margin:0;">
              <input type="checkbox" data-k="animFade" id="prop-anim-fade" title="Fade in element during transition" ${el.animFade !== false ? 'checked' : ''}/>
              <label for="prop-anim-fade" title="Fade in element during transition" style="cursor:pointer; font-size:11px; white-space:nowrap;">Fade</label>
            </div>
            <div class="checkbox-row" style="margin:0;">
              <input type="checkbox" data-k="animBounce" id="prop-anim-bounce" title="Elastic bounce at the end of zoom transition" ${el.animBounce ? 'checked' : ''}/>
              <label for="prop-anim-bounce" title="Elastic bounce at the end of zoom transition" style="cursor:pointer; font-size:11px; white-space:nowrap;">Bounce</label>
            </div>
            ${el.type === 'button' ? `
            <div class="checkbox-row" style="margin:0;">
              <input type="checkbox" data-k="animStaggerText" id="prop-anim-stagger-text" title="Stagger animation between button and text" ${el.animStaggerText ? 'checked' : ''}/>
              <label for="prop-anim-stagger-text" title="Stagger animation between button and text" style="cursor:pointer; font-size:11px; white-space:nowrap;">Stagger</label>
            </div>
            ` : ''}
          </div>
        </div>
      `);
    } else if (isSlideLike) {
      const currentDirection = el.animDirection || (el.animType.startsWith('slide-') ? el.animType.replace('slide-', '') : 'up');
      f.push(`
        <div class="prop-row" style="margin-bottom:8px;">
          <div class="prop-grid-2">
            <div style="display:flex; flex-direction:column; gap:6px; justify-content:center;">
              <div class="checkbox-row" style="margin:0;">
                <input type="checkbox" data-k="animFade" id="prop-anim-fade" title="Fade in element during transition" ${el.animFade !== false ? 'checked' : ''}/>
                <label for="prop-anim-fade" title="Fade in element during transition" style="cursor:pointer; font-size:11px; white-space:nowrap;">Fade</label>
              </div>
              <div class="checkbox-row" style="margin:0;">
                <input type="checkbox" data-k="animBounce" id="prop-anim-bounce" title="Elastic bounce at the end of slide transition" ${el.animBounce ? 'checked' : ''}/>
                <label for="prop-anim-bounce" title="Elastic bounce at the end of slide transition" style="cursor:pointer; font-size:11px; white-space:nowrap;">Bounce</label>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label>Direction</label>
              ${customSelect('animDirection', [
                { val: 'up', label: 'Up' },
                { val: 'down', label: 'Down' },
                { val: 'left', label: 'Left' },
                { val: 'right', label: 'Right' },
                { val: 'closest', label: 'Closest edge' }
              ], currentDirection, 'Animation direction', false, 'prop-anim-direction')}
            </div>
          </div>
        </div>
        <div class="prop-row" style="margin-bottom:8px;">
          <div style="display: grid; grid-template-columns: 3.5fr 6.5fr; gap: 6px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label>Dist. (px)</label>
              <input type="number" min="1" max="500" data-k="animDistance" value="${el.animDistance !== undefined ? el.animDistance : (el.animType.startsWith('slide-') ? 20 : 100)}" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; height:24px; outline:none;" title="Animation slide distance in pixels" />
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label>Rot. Offset (°)</label>
              <input type="number" data-k="animRotateOffset" value="${el.animRotateOffset !== undefined ? el.animRotateOffset : 0}" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; height:24px; outline:none;" title="Entrance animation rotation offset in degrees" />
            </div>
          </div>
        </div>
      `);
    } else if (isSwipeLike) {
      const currentDirection = el.animType.replace('swipe-', '');
      f.push(`
        <div class="prop-row" style="margin-bottom:8px;">
          <div class="prop-grid-2">
            <div style="display:flex; align-items:center; margin-top:14px;">
              <div class="checkbox-row" style="margin:0;">
                <input type="checkbox" data-k="animFade" id="prop-anim-fade" title="Fade in element during transition" ${el.animFade !== false ? 'checked' : ''}/>
                <label for="prop-anim-fade" title="Fade in element during transition" style="cursor:pointer; font-size:11px; white-space:nowrap;">Fade</label>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label>Direction</label>
              ${customSelect('animDirection', [
                { val: 'up', label: 'Up' },
                { val: 'down', label: 'Down' },
                { val: 'left', label: 'Left' },
                { val: 'right', label: 'Right' }
              ], currentDirection, 'Animation direction', false, 'prop-anim-direction')}
            </div>
          </div>
        </div>
      `);
    } else if (isSplit) {
      f.push(`
        <div class="prop-row" style="margin-bottom:8px;">
          <div class="prop-grid-2">
            <div style="display:flex; align-items:center; margin-top:14px;">
              <div class="checkbox-row" style="margin:0;">
                <input type="checkbox" data-k="animFade" id="prop-anim-fade" title="Fade in element during transition" ${el.animFade !== false ? 'checked' : ''}/>
                <label for="prop-anim-fade" title="Fade in element during transition" style="cursor:pointer; font-size:11px; white-space:nowrap;">Fade</label>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label>Angle (°)</label>
              <input type="number" data-k="animAngle" value="${el.animAngle !== undefined ? el.animAngle : 0}" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; height:24px; outline:none; text-align:right;" title="Split reveal angle in degrees" />
            </div>
          </div>
        </div>
      `);
    } else if (el.animType === 'typing' || el.animType === 'fade-typing' || el.animType === 'word-fade') {
      const fadeBg = el.animFadeBg !== undefined ? el.animFadeBg : (el.type === 'button' ? true : !!el.animateBg);
      f.push(`
        <div class="prop-row" style="margin-bottom:8px;">
          <div style="display:flex; flex-direction:row; gap:16px; align-items:center; height:24px;">
            <div class="checkbox-row" style="margin:0;">
              <input type="checkbox" data-k="animFadeLetters" id="prop-anim-fade-letters" title="Fade in characters one by one" ${el.animFadeLetters !== false ? 'checked' : ''}/>
              <label for="prop-anim-fade-letters" title="Fade in characters one by one" style="cursor:pointer; font-size:11px; white-space:nowrap;">Fade letters</label>
            </div>
            <div class="checkbox-row" style="margin:0; ${el.type === 'text' && !el.hasBg ? 'opacity:0.5; pointer-events:none;' : ''}">
              <input type="checkbox" data-k="animFadeBg" id="prop-anim-fade-bg" title="Fade/Animate background block/container during transition" ${fadeBg ? 'checked' : ''} ${el.type === 'text' && !el.hasBg ? 'disabled' : ''}/>
              <label for="prop-anim-fade-bg" title="Fade/Animate background block/container during transition" style="cursor:pointer; font-size:11px; white-space:nowrap;">${el.type === 'text' ? 'Animate BG' : 'Fade BG'}</label>
            </div>
          </div>
        </div>
        ${el.type === 'text' && el.hasBg && fadeBg ? `
        <div class="prop-row" style="margin-bottom:8px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            ${secNum('bgOffset', 'BG Offset', 0)}
            <div></div>
          </div>
        </div>
        ` : ''}
      `);
    }

    f.push(`</div>`); // Close in-transition-preview-area
    f.push(`<div id="effects-preview-area" class="animation-sub-panel">`);
    f.push(`<div class="prop-row" style="margin-bottom:6px;"><label class="anim-sub-head"><svg id="fi_18489086" width="12" height="12" viewBox="0 0 100 100" style="color: var(--accent-base); flex-shrink: 0;"><g fill="currentColor"><path d="m62.9545441 6.8181796v17.2727323h-60.4545455v17.2727203h95.0000014z"></path><path d="m37.0454559 75.9090881h60.4545441v-17.2727203h-95.0000014l34.5454573 34.5454559z"></path></g></svg>CONTINUOUS EFFECT</label></div>`);
    const effectOptions = [
      { val: 'none', label: 'None' },
      { val: 'pulse', label: 'Pulse' },
      { val: 'float', label: 'Float' },
      { val: 'flash', label: 'Flash' },
      { val: 'wiggle', label: 'Wiggle' },
      { val: 'spin', label: 'Spin' },
      { val: 'heartbeat', label: 'Heartbeat' },
      { val: 'pan', label: 'Move' },
      { val: 'zoom', label: 'Zoom' }
    ];

    let filteredEffects = effectOptions;
    let effFavMessageHtml = '';
    if (state.filterFavorites) {
      filteredEffects = effectOptions.filter(o => o.val === 'none' || state.favoriteAnimations?.includes('eff-' + o.val));
      if (filteredEffects.length <= 1) {
        effFavMessageHtml = `<div style="grid-column: span 3; font-size: 10px; color: var(--text-muted); line-height: 1.4; padding: 4px 0; text-align: center;">
          No favorite continuous effects yet. Right-click presets to add to favorites.
        </div>`;
      }
    }

    f.push(`<div class="anim-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:16px;">
      ${filteredEffects.map(o => {
        const isActive = o.val === (el.effectType || 'none');
        const isFav = state.favoriteAnimations?.includes('eff-' + o.val);
        const favStyle = isFav ? 'outline: 1px solid var(--accent-base); outline-offset: -1px;' : '';
        return `<button class="align-btn eff-btn ${isActive ? 'active' : ''}" data-val="${o.val}" style="font-size:10px; ${favStyle}" title="Effect: ${o.label}">${o.label}</button>`;
      }).join('')}
      ${effFavMessageHtml}
    </div>`);

    if (el.effectType && el.effectType !== 'none') {
      if (el.effectType === 'pan') {
        if (el.panFromX === undefined && el.panFromY === undefined) {
          const dist = el.panDist !== undefined ? el.panDist : 50;
          if (el.panDir === 'L') { el.panFromX = dist; el.panFromY = 0; }
          else if (el.panDir === 'R') { el.panFromX = -dist; el.panFromY = 0; }
          else if (el.panDir === 'U') { el.panFromX = 0; el.panFromY = dist; }
          else if (el.panDir === 'D') { el.panFromX = 0; el.panFromY = -dist; }
          else { el.panFromX = 0; el.panFromY = -50; }
        }
        const px_val = el.panFromX !== undefined ? el.panFromX : 0;
        const py_val = el.panFromY !== undefined ? el.panFromY : -50;
        const mx_val = el.panMidX !== undefined ? el.panMidX : Math.round(px_val / 2);
        const my_val = el.panMidY !== undefined ? el.panMidY : Math.round(py_val / 2);
        f.push(`<div class="prop-row" style="margin-bottom:16px; margin-top:-8px;"><div class="prop-grid-2">
        ${num('effDuration', 'Duration (s)', 5)}
        ${num('effDelay', 'Delay (s)', 0)}
        <div class="prop-row"><label>From X (px)</label><input type="number" data-k="panFromX" id="prop-pan-from-x" value="${px_val}" title="X offset for starting position of Move effect" /></div>
        <div class="prop-row"><label>From Y (px)</label><input type="number" data-k="panFromY" id="prop-pan-from-y" value="${py_val}" title="Y offset for starting position of Move effect" /></div>
        <div class="prop-row"><label>Rot. Offset (°)</label><input type="number" data-k="panRotate" id="prop-pan-rotate" value="${el.panRotate !== undefined ? el.panRotate : 0}" title="Rotational offset angle in degrees" /></div>
        <div class="prop-row"><label>Curve X (px)</label><input type="number" data-k="panMidX" id="prop-pan-mid-x" value="${mx_val}" title="X offset for path control point of Move effect" /></div>
        <div class="prop-row"><label>Curve Y (px)</label><input type="number" data-k="panMidY" id="prop-pan-mid-y" value="${my_val}" title="Y offset for path control point of Move effect" /></div>
      </div>
      <div style="display:flex; gap:16px; margin-top:8px; flex-wrap:wrap;">
        <div class="checkbox-row"><input type="checkbox" data-k="effEase" id="prop-eff-ease" title="Apply smooth ease in/out curve" ${el.effEase !== false ? 'checked' : ''}/><label for="prop-eff-ease" title="Apply smooth ease in/out curve" style="cursor:pointer;">Ease</label></div>
        <div class="checkbox-row"><input type="checkbox" data-k="effOnce" id="prop-eff-once" title="Run the effect cycle only once" ${el.effOnce !== false ? 'checked' : ''}/><label for="prop-eff-once" title="Run the effect cycle only once" style="cursor:pointer;">Perform once</label></div>
        <div class="checkbox-row"><input type="checkbox" data-k="panFade" id="prop-pan-fade" title="Fade opacity from 0 to 1 during movement" ${el.panFade ? 'checked' : ''}/><label for="prop-pan-fade" title="Fade opacity from 0 to 1 during movement" style="cursor:pointer;">Fade</label></div>
      </div>
      </div>`);
      } else if (el.effectType === 'zoom') {
        f.push(`<div class="prop-row" style="margin-bottom:16px; margin-top:-8px;"><div class="prop-grid-2">
        ${num('effDuration', 'Duration (s)', 5)}
        ${num('effDelay', 'Delay (s)', 0)}
        ${num('zoomTarget', 'Target (%)', 150)}
      </div>
      <div style="display:flex; gap:16px; margin-top:8px;">
        <div class="checkbox-row"><input type="checkbox" data-k="effEase" id="prop-eff-ease-zoom" title="Apply smooth ease in/out curve" ${el.effEase !== false ? 'checked' : ''}/><label for="prop-eff-ease-zoom" title="Apply smooth ease in/out curve" style="cursor:pointer;">Ease</label></div>
        <div class="checkbox-row"><input type="checkbox" data-k="effOnce" id="prop-eff-once-zoom" title="Run the effect cycle only once" ${el.effOnce ? 'checked' : ''}/><label for="prop-eff-once-zoom" title="Run the effect cycle only once" style="cursor:pointer;">Perform once</label></div>
      </div>
      </div>`);
      } else if (el.effectType === 'spin') {
        f.push(`<div class="prop-row" style="margin-bottom:16px; margin-top:-8px;"><div class="prop-grid-2">
        ${num('effDuration', 'Duration (s)', 2)}
        ${num('effDelay', 'Delay (s)', 0)}
        ${num('spinTarget', 'Target (deg)', 360)}
        <div class="prop-row"><label>Repeat</label><input type="number" data-k="spinRepeat" min="1" value="${el.spinRepeat !== undefined ? el.spinRepeat : 1}" title="${propTooltips.spinRepeat || 'Repeat count'}" /></div>
      </div>
      <div style="display:flex; gap:16px; margin-top:8px;">
        <div class="checkbox-row"><input type="checkbox" data-k="effEase" id="prop-eff-ease-spin" title="Apply smooth ease in/out curve" ${el.effEase !== false ? 'checked' : ''}/><label for="prop-eff-ease-spin" title="Apply smooth ease in/out curve" style="cursor:pointer;">Ease</label></div>
      </div>
      </div>`);
      } else if (el.effectType === 'pulse') {
        f.push(`<div class="prop-row" style="margin-bottom:16px; margin-top:-8px;"><div class="prop-grid-2">
        ${num('effSpeed', 'Speed (%)', 100)}
        ${num('effDelay', 'Delay (s)', 0)}
        ${num('pulseScale', 'Scale (%)', 105)}
      </div></div>`);
      } else if (el.effectType === 'heartbeat') {
        f.push(`<div class="prop-row" style="margin-bottom:16px; margin-top:-8px;"><div class="prop-grid-2">
        ${num('effSpeed', 'Speed (%)', 100)}
        ${num('effDelay', 'Delay (s)', 0)}
        ${num('heartbeatScale', 'Scale (%)', 130)}
      </div></div>`);
      } else if (el.effectType === 'float') {
        const currentDir = el.floatDirection || 'up';
        f.push(`<div class="prop-row" style="margin-bottom:16px; margin-top:-8px;"><div class="prop-grid-2">
        ${num('effSpeed', 'Speed (%)', 100)}
        ${num('effDelay', 'Delay (s)', 0)}
        ${num('floatRange', 'Range (px)', 10)}
        <div class="prop-row"><label>Direction</label>
          <select data-k="floatDirection" title="Float direction" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; height:24px; outline:none; cursor:pointer;">
            <option value="up" ${currentDir === 'up' ? 'selected' : ''}>Up</option>
            <option value="down" ${currentDir === 'down' ? 'selected' : ''}>Down</option>
            <option value="left" ${currentDir === 'left' ? 'selected' : ''}>Left</option>
            <option value="right" ${currentDir === 'right' ? 'selected' : ''}>Right</option>
          </select>
        </div>
      </div></div>`);
      } else {
        f.push(`<div class="prop-row" style="margin-bottom:16px; margin-top:-8px;"><div class="prop-grid-2">
        ${num('effSpeed', 'Speed (%)', 100)}
        ${num('effDelay', 'Delay (s)', 0)}
      </div></div>`);
      }
    }

    f.push(`</div>`); // Close effects-preview-area

    const activeIdx = state.frames.findIndex(fr => fr.id === state.activeFrameId);
    if (state.frames.length > 1 && (activeIdx > 0 || state.loopAd)) {
      f.push(getFrameTransitionHtml(state.frames[activeIdx]));
    }

    f.push(`</div></div>`);
  }

  propsEl.innerHTML = `
    ${dynamicHtml}
    <div class="panel-section" id="panel-section-properties">
      <h3 class="panel-header-collapsible" id="header-properties" style="cursor: pointer; user-select: none;">
        <span>Properties</span>
        <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="transition: transform 0.2s ease;">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </h3>
      <div class="panel-section-content">
        ${f.join('')}`;

function checkButtonFontSizeWarning(el) {
  if (el && el.type === 'button' && el.autoSize) {
    const dText = (typeof dmDisplay === 'function' ? dmDisplay(el).text : null) || el.text;
    const computedFontSize = calculateAutoSize(el, dText);
    if (computedFontSize < 6) {
      showCanvasNotification('Text size will be unreadable', { type: 'warning' });
    }
  }
}

  const updateProp = (k, val) => {
    if (!k) return;
    if (k === 'logoVariant') {
      let customName = 'RMIT Logo (white)';
      if (val === 'data/Elements/RMIT_full.svg') {
        customName = 'RMIT Logo (Full color)';
      } else if (val === 'data/Elements/RMIT_RedPixel.svg') {
        customName = 'RMIT Logo (Red Pixel)';
      }

      const updateLogo = (targetEl) => {
        targetEl.assetId = val;
        targetEl.customName = customName;
        targetEl.name = customName;
      };

      const c = getActiveCanvas();
      if (state.layerSelection && state.layerSelection.length > 1 && c) {
        c.elements.filter(e => state.layerSelection.includes(e.id)).forEach(updateLogo);
      } else {
        updateLogo(el);
      }

      pushHistory();
      renderProps();
      render(true);
      return;
    }
    // (A) Edit-in-place for panel-edited dynamic fields (color/bg/text): route to the active
    // version's cell rather than the template, when a single dynamic element is selected.
    const dmField = (k === 'color' || k === 'bg' || k === 'text') ? k : null;
    if (dmField && (!state.layerSelection || state.layerSelection.length <= 1) &&
        typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, dmField)) {
      if (!state.dataMerge.locked) { dmWriteCell(el, dmField, val); render(true); }
      return;
    }
    const c = getActiveCanvas();
    if (state.layerSelection && state.layerSelection.length > 1 && c) {
      c.elements.filter(e => state.layerSelection.includes(e.id)).forEach(selEl => {
        if (['x', 'y', 'width', 'height', 'lockRatio', 'fontSize', 'autoSize', 'textAlign'].includes(k)) {
          if (selEl.autoArranged) delete selEl.autoArranged;
        }
        if (k === 'text' && selEl.id !== el.id) return; // Don't copy specific text content across elements
        if (['fontFamily', 'fontSize', 'weight', 'color', 'lineHeight', 'letterSpacing', 'textAlign', 'verticalAlign', 'autoSize', 'maxFontSize', 'paddingLR', 'paddingTB'].includes(k) && selEl.type !== 'text' && selEl.type !== 'button') return;
        
        if ((k === 'width' || k === 'height') && selEl.type === 'button') {
          selEl.autoHug = false;
        }

        if (k === 'lockRatio') {
          if (val) {
            selEl.aspectRatio = (selEl.width && selEl.height) ? (selEl.width / selEl.height) : 1;
          } else {
            delete selEl.aspectRatio;
          }
        }

        if (k === 'width' && selEl.lockRatio) {
          if (val === undefined || val === '') {
            delete selEl.width;
            delete selEl.height;
          } else {
            if (!selEl.aspectRatio) {
              selEl.aspectRatio = (selEl.width && selEl.height) ? (selEl.width / selEl.height) : 1;
            }
            selEl.width = val;
            selEl.height = Math.max(1, Math.round(val / selEl.aspectRatio));
          }
        } else if (k === 'height' && selEl.lockRatio) {
          if (val === undefined || val === '') {
            delete selEl.width;
            delete selEl.height;
          } else {
            if (!selEl.aspectRatio) {
              selEl.aspectRatio = (selEl.width && selEl.height) ? (selEl.width / selEl.height) : 1;
            }
            selEl.height = val;
            selEl.width = Math.max(1, Math.round(val * selEl.aspectRatio));
          }
        } else {
          if (val === undefined) {
            delete selEl[k];
          } else {
            selEl[k] = val;
            if (k === 'animFadeBg') {
              selEl.animateBg = val;
            }
            if (k === 'autoSize' && val === true) {
              selEl.autoHug = false;
            }
            if (k === 'autoHug' && val === true) {
              selEl.autoSize = false;
            }
          }
        }
        
        if (selEl.type === 'button' && selEl.autoHug) {
          selEl.width = measureButtonWidth(selEl);
        }
      });
    } else {
      if (['x', 'y', 'width', 'height', 'lockRatio', 'fontSize', 'autoSize', 'textAlign'].includes(k)) {
        if (el.autoArranged) delete el.autoArranged;
      }
      if ((k === 'width' || k === 'height') && el.type === 'button') {
        el.autoHug = false;
      }

      if (k === 'lockRatio') {
        if (val) {
          el.aspectRatio = (el.width && el.height) ? (el.width / el.height) : 1;
        } else {
          delete el.aspectRatio;
        }
      }

      if (k === 'width' && el.lockRatio) {
        if (val === undefined || val === '') {
          delete el.width;
          delete el.height;
        } else {
          if (!el.aspectRatio) {
            el.aspectRatio = (el.width && el.height) ? (el.width / el.height) : 1;
          }
          el.width = val;
          el.height = Math.max(1, Math.round(val / el.aspectRatio));
        }
      } else if (k === 'height' && el.lockRatio) {
        if (val === undefined || val === '') {
          delete el.width;
          delete el.height;
        } else {
          if (!el.aspectRatio) {
            el.aspectRatio = (el.width && el.height) ? (el.width / el.height) : 1;
          }
          el.height = val;
          el.width = Math.max(1, Math.round(val * el.aspectRatio));
        }
      } else {
        if (val === undefined) {
          delete el[k];
        } else {
          el[k] = val;
          if (k === 'animFadeBg') {
            el.animateBg = val;
          }
          if (k === 'autoSize' && val === true) {
            el.autoHug = false;
          }
          if (k === 'autoHug' && val === true) {
            el.autoSize = false;
          }
        }
      }
      if (el.type === 'button' && el.autoHug) {
        el.width = measureButtonWidth(el);
      }
    }
    if (k === 'fontFamily') {
      const affected = (state.layerSelection && state.layerSelection.length > 1 && c)
        ? c.elements.filter(e => state.layerSelection.includes(e.id))
        : [el];
      affected.forEach(reconcileWeightForFont);
    }
    if ((k === 'width' || k === 'height') && (el.type === 'button' || (state.layerSelection && state.layerSelection.length > 1 && c && c.elements.filter(e => state.layerSelection.includes(e.id)).some(selEl => selEl.type === 'button')))) {
      const autoHugInp = propsEl.querySelector('input[data-k="autoHug"]');
      if (autoHugInp) autoHugInp.checked = false;
    }
    checkButtonFontSizeWarning(el);
    render(true);
  };

  const clampNum = (inp, n) => {
    if (Number.isNaN(n)) return n;
    const min = inp.min !== '' ? Number(inp.min) : -Infinity;
    const max = inp.max !== '' ? Number(inp.max) : Infinity;
    return Math.min(max, Math.max(min, n));
  };

  const syncLockRatio = (changedKey) => {
    if (!el.lockRatio) return;
    const sibKey = changedKey === 'width' ? 'height' : changedKey === 'height' ? 'width' : null;
    if (!sibKey) return;
    const sibInp = propsEl.querySelector(`[data-k="${sibKey}"]`);
    if (sibInp && document.activeElement !== sibInp) {
      sibInp.value = el[sibKey] !== undefined ? el[sibKey] : '';
    }
  };

  propsEl.querySelectorAll('input, select, textarea').forEach((inp) => {
    if (inp.classList.contains('dm-control') || (inp.id && inp.id.startsWith('frame-trans'))) return; // dynamic-data and frame transitions controls wired separately
    inp.addEventListener('input', () => {
      let val = inp.type === 'number' ? (inp.value === '' ? undefined : Number(inp.value)) : (inp.type === 'checkbox' ? inp.checked : inp.value);
      if (inp.type === 'number' && inp.value !== '' && val !== undefined) {
        const clamped = clampNum(inp, val);
        if (clamped !== val) {
          val = clamped;
          inp.value = clamped;
        }
      }
      if (inp.type === 'text' && (inp.dataset.k === 'color' || inp.dataset.k === 'bg' || inp.dataset.k === 'strokeColor') && val !== undefined) {
        if (!val.startsWith('#') && val.length > 0 && !val.includes('gradient')) val = '#' + val;
      }
      updateProp(inp.dataset.k, val);
      syncLockRatio(inp.dataset.k);
      propsEl.querySelectorAll(`[data-k="${inp.dataset.k}"]`).forEach(otherInp => {
        if (otherInp !== inp) {
          if (otherInp.classList.contains('cp-trigger')) {
            if (inp.dataset.k === 'strokeColor') {
              otherInp.style.background = 'transparent';
              otherInp.style.boxShadow = `inset 0 0 0 4px ${val}`;
            } else {
              otherInp.style.background = val;
              otherInp.style.boxShadow = 'none';
            }
          }
          else otherInp.value = (inp.dataset.k === 'color' || inp.dataset.k === 'bg' || inp.dataset.k === 'canvas-bg' || inp.dataset.k === 'strokeColor') ? (val !== undefined ? val.replace(/^#/, '') : '') : (val !== undefined ? val : '');
        }
      });
    });
    inp.addEventListener('change', () => {
      pushHistory();
      if (inp.dataset.k === 'fontFamily' || inp.dataset.k === 'hasBg' || inp.dataset.k === 'animateBg' || inp.dataset.k === 'animFadeBg' || inp.dataset.k === 'animFadeLetters' || inp.dataset.k === 'lineHeightAuto' || inp.dataset.k === 'autoSize' || inp.dataset.k === 'maxFontSize' || inp.dataset.k === 'lockRatio' || inp.dataset.k === 'wrapText' || inp.dataset.k === 'wrapMinSize' || inp.dataset.k === 'animStaggerText') renderProps();
    });
    if (inp.type === 'number') {
      inp.addEventListener('wheel', (e) => {
        if (!e.shiftKey) return;
        e.preventDefault();
        // Use the input's step attribute as the base nudge (1 if unset). Shift+Alt = 10×.
        // Result is rounded to the step's decimal precision to avoid 0.30000000000004.
        const stepAttr = parseFloat(inp.step);
        const baseStep = (stepAttr && stepAttr > 0) ? stepAttr : 1;
        const step = e.altKey ? baseStep * 10 : baseStep;
        const delta = e.deltaY < 0 ? step : -step;
        const decimals = (String(inp.step).split('.')[1] || '').length;
        const next = Number(inp.value) + delta;
        const rounded = decimals ? parseFloat(next.toFixed(decimals)) : next;
        inp.value = clampNum(inp, rounded);
        updateProp(inp.dataset.k, Number(inp.value));
        syncLockRatio(inp.dataset.k);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        clearTimeout(inp.wheelHistTimer);
        inp.wheelHistTimer = setTimeout(() => pushHistory(), 400);
      });
    }
  });

  // Dynamic-data controls (data-merge). Toggling a field flag propagates across the
  // element's link group so a logical slot stays consistent across all sizes.
  propsEl.querySelectorAll('.dm-field-chk').forEach((chk) => {
    chk.addEventListener('change', () => {
      const targetId = chk.dataset.elId;
      const targetEl = (targetId && c) ? c.elements.find(e => e.id === targetId) : el;
      if (!targetEl) return;
      dmToggleField(targetEl, chk.dataset.dmField, chk.checked);
      pushHistory();
      renderProps();
      render(true);
    });
  });

  propsEl.querySelectorAll('.dm-field-select').forEach((sel) => {
    sel.addEventListener('change', () => {
      const targetId = sel.dataset.elId;
      const targetEl = (targetId && c) ? c.elements.find(e => e.id === targetId) : el;
      if (!targetEl) return;
      const field = sel.dataset.dmField;
      const k = dmSlotKey(targetEl) + '::' + field;
      if (sel.value) {
        state.dataMerge.mappings[k] = sel.value;
      } else {
        delete state.dataMerge.mappings[k];
      }
      pushHistory();
      render(true);
      renderProps();
    });
  });

  // Highlight active canvas layer on mouseenter / mouseleave of the layer groups in dynamic data multiple-selection view
  propsEl.querySelectorAll('.dd-layer-group').forEach((groupEl) => {
    const targetId = groupEl.dataset.elId;
    const targetEl = (targetId && c) ? c.elements.find(e => e.id === targetId) : null;
    if (!targetEl) return;

    groupEl.onmouseenter = () => {
      const activeCanvasNode = document.querySelector(`.canvas-frame[data-canvas-id="${state.activeCanvasId}"] .canvas`);
      if (activeCanvasNode) {
        activeCanvasNode.querySelectorAll('.layer-hover-outline').forEach(n => n.remove());
        const hoverOutline = document.createElement('div');
        hoverOutline.className = 'layer-hover-outline';
        hoverOutline.style.left = (targetEl.x - 1.5) + 'px';
        hoverOutline.style.top = (targetEl.y - 1.5) + 'px';
        hoverOutline.style.width = (targetEl.width + 3) + 'px';
        hoverOutline.style.height = (targetEl.height + 3) + 'px';
        hoverOutline.style.transform = `rotate(${targetEl.rotation || 0}deg)`;
        hoverOutline.style.transformOrigin = 'center';
        activeCanvasNode.appendChild(hoverOutline);
      }
    };

    groupEl.onmouseleave = () => {
      const activeCanvasNode = document.querySelector(`.canvas-frame[data-canvas-id="${state.activeCanvasId}"] .canvas`);
      if (activeCanvasNode) {
        activeCanvasNode.querySelectorAll('.layer-hover-outline').forEach(n => n.remove());
      }
    };
  });

  const dmOpenBtn = propsEl.querySelector('#dm-open-from-props');
  if (dmOpenBtn) dmOpenBtn.addEventListener('click', () => openDataPanel());

  // Dynamic Data header carries the element name — marquee-scroll it on hover
  // when the combined title is too long to fit.
  const ddHeader = propsEl.querySelector('#header-dynamic-data');
  const ddMarquee = ddHeader && ddHeader.querySelector('.dd-marquee');
  if (ddMarquee) {
    ddHeader.addEventListener('mouseenter', () => {
      if (ddMarquee.scrollWidth > ddMarquee.clientWidth) {
        let pos = 0;
        ddMarquee.dataset.scrollInterval = setInterval(() => {
          pos += 1;
          if (pos > ddMarquee.scrollWidth - ddMarquee.clientWidth + 20) {
            pos = 0;
            ddMarquee.scrollLeft = 0;
          } else {
            ddMarquee.scrollLeft = pos;
          }
        }, 30);
      }
    });
    ddHeader.addEventListener('mouseleave', () => {
      if (ddMarquee.dataset.scrollInterval) {
        clearInterval(ddMarquee.dataset.scrollInterval);
        ddMarquee.dataset.scrollInterval = '';
        ddMarquee.scrollLeft = 0;
      }
    });
  }

  propsEl.querySelectorAll('.cp-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = btn.dataset.k;
      let val = el[key];
      openColorPicker(btn, key, val);
    });
  });

  propsEl.querySelectorAll('.hex-copy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const k = btn.dataset.targetK;
      const inp = btn.parentElement.querySelector(`input[data-k="${k}"]`);
      if (!inp) return;
      const raw = String(inp.value || '').trim();
      const hex = (raw.startsWith('#') ? raw : '#' + raw).toUpperCase();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(hex);
      }
      const original = btn.innerHTML;
      btn.innerHTML = '<span style="font-size:11px; font-weight:700; color:var(--accent-base);">✓</span>';
      setTimeout(() => { btn.innerHTML = original; }, 900);
    });
  });

  let activePreviewVal = null;
  const startPreviewLoop = (val) => {
    if (state.previewTimeoutId) {
      clearTimeout(state.previewTimeoutId);
      state.previewTimeoutId = null;
    }
    activePreviewVal = val;
    if (val === 'none') {
      resetPreviewNodes();
      return;
    }

    const runLoop = () => {
      if (activePreviewVal !== val) return;
      
      const domNodes = state.layerSelection.length > 1
        ? state.layerSelection.map(id => document.querySelector(`.el[data-id="${id}"]`))
        : [document.querySelector(`.el[data-id="${el.id}"]`)];
      
      domNodes.forEach(node => {
        if (!node) return;
        node.style.animation = '';
        node.style.transformOrigin = '';
        const nodeEl = state.canvases.flatMap(c => c.elements).find(e => e.id === node.dataset.id) || el;
        const activeC = getActiveCanvas();
        const isMaskedImg = activeC && findMaskAbove(activeC, nodeEl);
        if (isMaskedImg) {
          const innerImg = node.querySelector('img');
          if (innerImg) {
            innerImg.style.animation = '';
            innerImg.style.transformOrigin = '';
          }
        }
        if (nodeEl.isMask && activeC) {
          const imgEl = activeC.elements.find(x => findMaskAbove(activeC, x) === nodeEl);
          if (imgEl) {
            const imgDom = document.querySelector(`.el[data-id="${imgEl.id}"]`);
            if (imgDom) {
              imgDom.style.animation = '';
              imgDom.style.transformOrigin = '';
            }
          }
        }
        const target = node.querySelector('.editable') || node.querySelector('span');
        if (target && target.dataset.origHtml !== undefined) {
          target.innerHTML = target.dataset.origHtml;
          if (target.dataset.origStyle !== undefined) {
            target.setAttribute('style', target.dataset.origStyle);
          }
          ['origHtml', 'origStyle', 'bgInited', 'bgColor', 'bgPadL', 'bgPadV', 'bgCov', 'bgDelay', 'bgDuration', 'bgAnim'].forEach(k => delete target.dataset[k]);
        }
        if (nodeEl.type === 'button') {
          const fillBg = node.querySelector('div[style*="position: absolute"], div[style*="position:absolute"]');
          if (fillBg) {
            fillBg.style.animation = '';
            fillBg.style.transformOrigin = '';
          }
          const strokeSvg = node.querySelector('svg[style*="position: absolute"], svg[style*="position:absolute"]');
          if (strokeSvg) {
            strokeSvg.style.animation = '';
            strokeSvg.style.transformOrigin = '';
          }
        }
      });

      domNodes.forEach(node => { if (node) void node.offsetHeight; });

      let maxDur = 1;
      domNodes.forEach(node => {
        if (node) {
          const nodeEl = state.canvases.flatMap(c => c.elements).find(e => e.id === node.dataset.id) || el;
          let previewVal = val;
          if (previewVal === 'swipe') {
            const currentSwipeDir = (nodeEl.animType || 'none').startsWith('swipe-') ? nodeEl.animType.replace('swipe-', '') : 'right';
            previewVal = `swipe-${currentSwipeDir}`;
          }
          if (previewVal === 'none') return;

          const dur = Number(nodeEl.animDuration || 1);
          const del = Number(nodeEl.animDelay || 0);
          maxDur = Math.max(maxDur, dur + del);

          if ((nodeEl.type === 'text' || nodeEl.type === 'button') && (previewVal === 'typing' || previewVal === 'fade-typing' || previewVal === 'word-fade')) {
            const target = node.querySelector('.editable') || node.querySelector('span');
            if (target) {
              target.dataset.origHtml = target.innerHTML;
              target.dataset.origStyle = target.getAttribute('style') || '';
              const totalDur = nodeEl.animDuration || 1;
              const baseDelay = nodeEl.animDelay || 0;

              const overrides = typeof dmDisplay === 'function' ? dmDisplay(nodeEl) : {};
              const displayText = overrides.text !== undefined ? overrides.text : (nodeEl.text || '');

              if (previewVal === 'typing' || previewVal === 'fade-typing') {
                const chars = [...displayText];
                const fadeLetters = nodeEl.animFadeLetters !== false;
                const charDur = fadeLetters ? 0.3 : 0.01;
                const nonNewlines = chars.filter(c => c !== '\n').length;
                const charDelay = totalDur / Math.max(1, nonNewlines);
                let spanIdx = 0;
                target.innerHTML = chars.map((c) => {
                   if (c === '\n') return '<br/>';
                   const del = (Number(baseDelay) + spanIdx * charDelay).toFixed(3);
                   spanIdx++;
                   const escC = c === ' ' ? ' ' : c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                   return `<span style="opacity:0; animation: anim-fade-in ${charDur}s linear ${del}s both;">${escC}</span>`;
                }).join('');
              } else if (previewVal === 'word-fade') {
                const words = displayText.split(/(\s+)/);
                const nonSpas = words.filter(w => /\S/.test(w));
                const wordDur = 0.3;
                const wordDelay = totalDur / Math.max(1, nonSpas.length);
                let wordIdx = 0;
                target.innerHTML = words.map(w => {
                  if (w === '\n') return '<br/>';
                  if (/\s+/.test(w)) return w.replace(/\n/g, '<br/>');
                  const del = (Number(baseDelay) + wordIdx * wordDelay).toFixed(3);
                  wordIdx++;
                  const escW = w.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                  return `<span style="opacity:0; display:inline-block; animation: anim-fade-in ${wordDur}s linear ${del}s both;">${escW}</span>`;
                }).join('');
              }

              const fadeBg = nodeEl.animFadeBg !== undefined ? nodeEl.animFadeBg : (nodeEl.type === 'button' ? true : !!nodeEl.animateBg);
              if (nodeEl.type === 'text' && nodeEl.hasBg && fadeBg && (previewVal === 'typing' || previewVal === 'fade-typing' || previewVal === 'word-fade')) {
                const lr = nodeEl.bgPadL !== undefined ? nodeEl.bgPadL : 8;
                const tb = nodeEl.bgPadV !== undefined ? nodeEl.bgPadV : 4;
                const cov = nodeEl.bgCoverage !== undefined ? nodeEl.bgCoverage : 100;
                const opa = (nodeEl.bgOpacity !== undefined ? nodeEl.bgOpacity : 100) / 100;
                const bgRgba = hexToRgba(nodeEl.bg || '#000000', opa);
                let offset = Number(nodeEl.bgOffset) || 0;
                if (offset === 0 && (previewVal === 'typing' || previewVal === 'fade-typing' || previewVal === 'word-fade')) {
                  offset = -0.1;
                }
                const bgDelay = Number(baseDelay) + offset;
                target.style.backgroundImage = '';
                target.style.boxDecorationBreak = '';
                target.style.removeProperty('-webkit-box-decoration-break');
                target.style.display = 'inline-block';
                target.style.position = 'relative';
                target.style.isolation = 'isolate';
                target.style.maxWidth = '100%';
                target.dataset.bgColor = bgRgba;
                target.dataset.bgPadL = lr;
                target.dataset.bgPadV = tb;
                target.dataset.bgCov = cov;
                target.dataset.bgDelay = bgDelay;
                target.dataset.bgDuration = totalDur;
                requestAnimationFrame(() => setupTextLineBgs(target));
              }

              if (nodeEl.type === 'button' && fadeBg) {
                const fillBg = node.querySelector('div[style*="position: absolute"], div[style*="position:absolute"]');
                if (fillBg) {
                  fillBg.style.animation = `anim-fade-in ${dur}s ease-out ${del}s both`;
                }
                const strokeSvg = node.querySelector('svg[style*="position: absolute"], svg[style*="position:absolute"]');
                if (strokeSvg) {
                  strokeSvg.style.animation = `anim-fade-in ${dur}s ease-out ${del}s both`;
                }
              }
            }
          } else {
            const activeC = getActiveCanvas();
            const isMaskedImg = activeC && findMaskAbove(activeC, nodeEl);
            const targetNode = isMaskedImg ? node.querySelector('img') : node;

            if (previewVal === 'split') {
              const angle = nodeEl.animAngle !== undefined ? nodeEl.animAngle : 0;
              const fromPoly = getSplitClipPath(angle);
              const fadeFrom = nodeEl.animFade !== false ? 'opacity: 0;' : '';
              const fadeTo = nodeEl.animFade !== false ? 'opacity: 1;' : '';
              let styleTag = document.getElementById('dynamic-anim-styles');
              if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = 'dynamic-anim-styles';
                document.head.appendChild(styleTag);
              }
              const keyframesRule = `
@keyframes anim-split-${nodeEl.id} {
  from { clip-path: ${fromPoly}; ${fadeFrom} }
  to { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); ${fadeTo} }
}`;
              const regex = new RegExp(`@keyframes\\s+anim-split-${nodeEl.id}\\s*\\{[\\s\\S]*?\\n\\}`, 'g');
              styleTag.textContent = styleTag.textContent.replace(regex, '') + '\n' + keyframesRule;
              targetNode.style.animation = `anim-split-${nodeEl.id} ${nodeEl.animDuration || 1}s ease-out 0s both`;
            } else if (previewVal === 'zoom' || previewVal === 'zoom-in' || previewVal === 'pop-in') {
              const tempEl = { ...nodeEl };
              if (previewVal === 'pop-in') {
                tempEl.zoomFrom = 80;
                tempEl.animFade = true;
              } else if (previewVal === 'zoom-in') {
                tempEl.zoomFrom = 110;
                tempEl.animFade = true;
              } else {
                if (tempEl.zoomFrom === undefined) {
                  tempEl.zoomFrom = 80;
                }
              }
              let styleTag = document.getElementById('dynamic-anim-styles');
              if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = 'dynamic-anim-styles';
                document.head.appendChild(styleTag);
              }
              const keyframesRule = getZoomKeyframes(tempEl);
              const regex = new RegExp(`@keyframes\\s+anim-zoom-${nodeEl.id}\\s*\\{[\\s\\S]*?\\n\\s*\\}`, 'g');
              styleTag.textContent = styleTag.textContent.replace(regex, '') + '\n' + keyframesRule;
              const timing = tempEl.animBounce ? 'linear' : 'ease-out';
              if (nodeEl.type === 'button' && nodeEl.animStaggerText) {
                // Background fill
                const fillBg = node.querySelector('div[style*="position: absolute"], div[style*="position:absolute"]');
                if (fillBg) {
                  fillBg.style.animation = `anim-zoom-${nodeEl.id} ${nodeEl.animDuration || 1}s ${timing} 0s both`;
                  fillBg.style.transformOrigin = getTransformOriginValue(nodeEl.zoomAnchor || 'center');
                }
                // Stroke SVG
                const strokeSvg = node.querySelector('svg[style*="position: absolute"], svg[style*="position:absolute"]');
                if (strokeSvg) {
                  strokeSvg.style.animation = `anim-zoom-${nodeEl.id} ${nodeEl.animDuration || 1}s ${timing} 0s both`;
                  strokeSvg.style.transformOrigin = getTransformOriginValue(nodeEl.zoomAnchor || 'center');
                }
                // Text child
                const target = node.querySelector('.editable') || node.querySelector('span');
                if (target) {
                  target.dataset.origStyle = target.getAttribute('style') || '';
                  target.dataset.origHtml = target.innerHTML;
                  target.style.display = 'inline-block';
                  target.style.transformOrigin = 'center';
                  target.style.animation = `anim-zoom-${nodeEl.id} ${nodeEl.animDuration || 1}s ${timing} 0.15s both`;
                }
              } else {
                targetNode.style.animation = `anim-zoom-${nodeEl.id} ${nodeEl.animDuration || 1}s ${timing} 0s both`;
                targetNode.style.transformOrigin = getTransformOriginValue(nodeEl.zoomAnchor || 'center');
              }
            } else if (previewVal === 'slide' || previewVal === 'slide-up' || previewVal === 'slide-down' || previewVal === 'slide-left' || previewVal === 'slide-right') {
              const tempEl = { ...nodeEl };
              if (previewVal === 'slide-up') { tempEl.animDirection = 'up'; tempEl.animDistance = 20; }
              else if (previewVal === 'slide-down') { tempEl.animDirection = 'down'; tempEl.animDistance = 20; }
              else if (previewVal === 'slide-left') { tempEl.animDirection = 'left'; tempEl.animDistance = 20; }
              else if (previewVal === 'slide-right') { tempEl.animDirection = 'right'; tempEl.animDistance = 20; }
              else {
                if (tempEl.animDirection === undefined) tempEl.animDirection = 'up';
                if (tempEl.animDistance === undefined) tempEl.animDistance = 100;
              }
              let styleTag = document.getElementById('dynamic-anim-styles');
              if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = 'dynamic-anim-styles';
                document.head.appendChild(styleTag);
              }
              const keyframesRule = getSlideKeyframes(tempEl);
              const regex = new RegExp(`@keyframes\\s+anim-slide-${nodeEl.id}\\s*\\{[\\s\\S]*?\\n\\s*\\}`, 'g');
              styleTag.textContent = styleTag.textContent.replace(regex, '') + '\n' + keyframesRule;
              const timing = tempEl.animBounce ? 'linear' : 'ease-out';
              targetNode.style.animation = `anim-slide-${nodeEl.id} ${nodeEl.animDuration || 1}s ${timing} 0s both`;
            } else {
              const isSwipe = ['swipe-up', 'swipe-down', 'swipe-left', 'swipe-right'].includes(previewVal);
              const isSlideLike = ['slide-up', 'slide-down', 'slide-left', 'slide-right'].includes(previewVal);
              const fadeOn = nodeEl.animFade !== false;
              const suffix = isSwipe ? (fadeOn ? '-fade' : '') : (isSlideLike && !fadeOn ? '-nofade' : '');
              targetNode.style.animation = `anim-${previewVal}${suffix} ${nodeEl.animDuration || 1}s ease-out 0s both`;
            }

            if (nodeEl.isMask) {
              if (activeC) {
                const imgEl = activeC.elements.find(x => findMaskAbove(activeC, x) === nodeEl);
                if (imgEl) {
                  const imgDom = document.querySelector(`.el[data-id="${imgEl.id}"]`);
                  if (imgDom && typeof generateMaskClipPathKeyframes === 'function') {
                    const maskAnim = generateMaskClipPathKeyframes(nodeEl, imgEl, previewVal);
                    if (maskAnim) {
                      let styleTag = document.getElementById('dynamic-mask-styles');
                      if (!styleTag) {
                        styleTag = document.createElement('style');
                        styleTag.id = 'dynamic-mask-styles';
                        document.head.appendChild(styleTag);
                      }
                      styleTag.textContent = maskAnim.keyframes;
                      imgDom.style.animation = maskAnim.animationCss;
                    }
                  }
                }
              }
            }
          }
        }
      });

      state.previewTimeoutId = setTimeout(runLoop, maxDur * 1000 + 400);
    };

    runLoop();
  };

  const resetPreviewNodes = () => {
    const domNodes = state.layerSelection.length > 1
      ? state.layerSelection.map(id => document.querySelector(`.el[data-id="${id}"]`))
      : [document.querySelector(`.el[data-id="${el.id}"]`)];
    domNodes.forEach(node => {
      if (node) {
        node.style.animation = '';
        const nodeEl = state.canvases.flatMap(c => c.elements).find(e => e.id === node.dataset.id) || el;
        const activeC = getActiveCanvas();
        const isMaskedImg = activeC && findMaskAbove(activeC, nodeEl);

        if (isMaskedImg) {
          const innerImg = node.querySelector('img');
          if (innerImg) {
            innerImg.style.animation = '';
            innerImg.style.removeProperty('--zoom-from');
          }
        }

        if (nodeEl.isMask) {
          if (activeC) {
            const imgEl = activeC.elements.find(x => findMaskAbove(activeC, x) === nodeEl);
            if (imgEl) {
              const imgDom = document.querySelector(`.el[data-id="${imgEl.id}"]`);
              if (imgDom) imgDom.style.animation = '';
              const styleTag = document.getElementById('dynamic-mask-styles');
              if (styleTag) styleTag.textContent = '';
            }
          }
        }
        if (nodeEl.type === 'button') {
          const fillBg = node.querySelector('div[style*="position: absolute"], div[style*="position:absolute"]');
          if (fillBg) {
            fillBg.style.animation = '';
            fillBg.style.transformOrigin = '';
          }
          const strokeSvg = node.querySelector('svg[style*="position: absolute"], svg[style*="position:absolute"]');
          if (strokeSvg) {
            strokeSvg.style.animation = '';
            strokeSvg.style.transformOrigin = '';
          }
        }
        const target = node.querySelector('.editable') || node.querySelector('span');
        if (target && target.dataset.origHtml !== undefined) {
          target.innerHTML = target.dataset.origHtml;
          if (target.dataset.origStyle !== undefined) {
            target.setAttribute('style', target.dataset.origStyle);
          }
          ['origHtml', 'origStyle', 'bgInited', 'bgColor', 'bgPadL', 'bgPadV', 'bgCov', 'bgDelay', 'bgDuration', 'bgAnim'].forEach(k => delete target.dataset[k]);
        }
      }
    });
  };

  propsEl.querySelectorAll('.anim-btn').forEach(btn => {
    const val = btn.dataset.val;
    btn.addEventListener('click', () => {
      let targetVal = val;
      if (targetVal === 'swipe') {
        targetVal = 'swipe-right';
      }
      updateProp('animType', targetVal);
      pushHistory();
      renderProps();
    });
    btn.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      startPreviewLoop(val);
    });
  });

  propsEl.querySelectorAll('.anchor-dot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const anchorVal = btn.dataset.anchor;
      updateProp('zoomAnchor', anchorVal);
      pushHistory();
      renderProps();
      startPreviewLoop(el.animType || 'none');
    });
    btn.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      const oldAnchor = el.zoomAnchor;
      el.zoomAnchor = btn.dataset.anchor;
      
      let styleTag = document.getElementById('dynamic-anim-styles');
      if (styleTag) {
        const tempEl = { ...el };
        if (el.animType === 'pop-in') {
          tempEl.zoomFrom = 80;
          tempEl.animFade = true;
        } else if (el.animType === 'zoom-in') {
          tempEl.zoomFrom = 110;
          tempEl.animFade = true;
        } else {
          if (tempEl.zoomFrom === undefined) {
            tempEl.zoomFrom = 80;
          }
        }
        const keyframesRule = getZoomKeyframes(tempEl);
        const regex = new RegExp(`@keyframes\\s+anim-zoom-${el.id}\\s*\\{[\\s\\S]*?\\n\\s*\\}`, 'g');
        styleTag.textContent = styleTag.textContent.replace(regex, '') + '\n' + keyframesRule;
      }
      
      const domNode = document.querySelector(`.el[data-id="${el.id}"]`);
      if (domNode) {
        const activeC = getActiveCanvas();
        const isMaskedImg = activeC && findMaskAbove(activeC, el);
        const targetNode = isMaskedImg ? domNode.querySelector('img') : domNode;
        if (targetNode) {
          targetNode.style.transformOrigin = getTransformOriginValue(btn.dataset.anchor);
        }
      }
      
      startPreviewLoop(el.animType || 'none');
      
      btn.addEventListener('mouseleave', function onLeave() {
        el.zoomAnchor = oldAnchor;
        btn.removeEventListener('mouseleave', onLeave);
        
        let styleTag = document.getElementById('dynamic-anim-styles');
        if (styleTag) {
          const tempEl = { ...el };
          if (el.animType === 'pop-in') {
            tempEl.zoomFrom = 80;
            tempEl.animFade = true;
          } else if (el.animType === 'zoom-in') {
            tempEl.zoomFrom = 110;
            tempEl.animFade = true;
          } else {
            if (tempEl.zoomFrom === undefined) {
              tempEl.zoomFrom = 80;
            }
          }
          const keyframesRule = getZoomKeyframes(tempEl);
          const regex = new RegExp(`@keyframes\\s+anim-zoom-${el.id}\\s*\\{[\\s\\S]*?\\n\\s*\\}`, 'g');
          styleTag.textContent = styleTag.textContent.replace(regex, '') + '\n' + keyframesRule;
        }
        const domNode = document.querySelector(`.el[data-id="${el.id}"]`);
        if (domNode) {
          const activeC = getActiveCanvas();
          const isMaskedImg = activeC && findMaskAbove(activeC, el);
          const targetNode = isMaskedImg ? domNode.querySelector('img') : domNode;
          if (targetNode) {
            targetNode.style.transformOrigin = getTransformOriginValue(oldAnchor || 'center');
          }
        }
      });
    });
  });

  const stopAnimPreviewLoop = () => {
    if (activePreviewVal === null && !state.previewTimeoutId) return;
    activePreviewVal = null;
    if (state.previewTimeoutId) {
      clearTimeout(state.previewTimeoutId);
      state.previewTimeoutId = null;
    }
    resetPreviewNodes();
  };
  stopElementAnimPreviewFn = stopAnimPreviewLoop;
  startElementAnimPreviewFn = startPreviewLoop;

  const transitionArea = propsEl.querySelector('#in-transition-preview-area');
  if (transitionArea) {
    transitionArea.addEventListener('mouseleave', stopAnimPreviewLoop);

    transitionArea.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('mouseenter', () => {
        startPreviewLoop(el.animType || 'none');
      });
      input.addEventListener('input', () => {
        startPreviewLoop(el.animType || 'none');
      });
      input.addEventListener('change', () => {
        startPreviewLoop(el.animType || 'none');
      });
    });
  }

  const animDirectionSelect = propsEl.querySelector('#prop-anim-direction');
  if (animDirectionSelect) {
    animDirectionSelect.addEventListener('change', () => {
      const dir = animDirectionSelect.value;
      if ((el.animType || '').startsWith('swipe-')) {
        updateProp('animType', `swipe-${dir}`);
      } else {
        updateProp('animDirection', dir);
      }
      pushHistory();
      renderProps();
    });
  }

  const favFilterBtn = propsEl.querySelector('.fav-filter-btn');
  if (favFilterBtn) {
    favFilterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.filterFavorites = !state.filterFavorites;
      renderProps();
    });
  }

  let activeEffectVal = null;
  const applyEffectPreview = (val) => {
    activeEffectVal = val;
    if (val === 'none') {
      resetEffectPreviewNodes();
      return;
    }
    
    const domNodes = state.layerSelection.length > 1
      ? state.layerSelection.map(id => document.querySelector(`.el[data-id="${id}"]`))
      : [document.querySelector(`.el[data-id="${el.id}"]`)];
    
    domNodes.forEach(node => {
      if (node && val !== 'none') {
        const nodeEl = state.canvases.flatMap(c => c.elements).find(e => e.id === node.dataset.id) || el;
        startEffectPreview(nodeEl, val);
      }
    });
  };

  const resetEffectPreviewNodes = () => {
    const domNodes = state.layerSelection.length > 1
      ? state.layerSelection.map(id => document.querySelector(`.el[data-id="${id}"]`))
      : [document.querySelector(`.el[data-id="${el.id}"]`)];
    domNodes.forEach(node => {
      if (node) {
        node.style.animation = '';
        const nodeEl = state.canvases.flatMap(c => c.elements).find(e => e.id === node.dataset.id) || el;
        const activeC = getActiveCanvas();
        const isMaskedImg = activeC && findMaskAbove(activeC, nodeEl);

        if (isMaskedImg) {
          const innerImg = node.querySelector('img');
          if (innerImg) {
            innerImg.style.animation = '';
            innerImg.style.transformOrigin = '';
            innerImg.style.removeProperty('--pan-x');
            innerImg.style.removeProperty('--pan-y');
            innerImg.style.removeProperty('--zoom-target-inverse');
            innerImg.style.removeProperty('--spin-target-inverse');
          }
        }

        if (nodeEl.isMask) {
          if (activeC) {
            const imgEl = activeC.elements.find(x => findMaskAbove(activeC, x) === nodeEl);
            if (imgEl) {
              const imgDom = document.querySelector(`.el[data-id="${imgEl.id}"]`);
              if (imgDom) {
                imgDom.style.animation = '';
                imgDom.style.transformOrigin = '';
                const innerImg = imgDom.querySelector('img');
                if (innerImg) {
                  innerImg.style.animation = '';
                  innerImg.style.transformOrigin = '';
                  innerImg.style.removeProperty('--pan-x');
                  innerImg.style.removeProperty('--pan-y');
                  innerImg.style.removeProperty('--zoom-target-inverse');
                  innerImg.style.removeProperty('--spin-target-inverse');
                }
              }
            }
          }
        }
      }
    });
  };

  propsEl.querySelectorAll('.eff-btn').forEach(btn => {
    const val = btn.dataset.val;
    btn.addEventListener('click', () => {
      updateProp('effectType', val);
      if (val === 'pan') {
        if (el.panFromX === undefined && el.panFromY === undefined) {
          const dist = el.panDist !== undefined ? el.panDist : 50;
          if (el.panDir === 'L') { updateProp('panFromX', dist); updateProp('panFromY', 0); }
          else if (el.panDir === 'R') { updateProp('panFromX', -dist); updateProp('panFromY', 0); }
          else if (el.panDir === 'U') { updateProp('panFromX', 0); updateProp('panFromY', dist); }
          else if (el.panDir === 'D') { updateProp('panFromX', 0); updateProp('panFromY', -dist); }
          else { updateProp('panFromX', 0); updateProp('panFromY', -50); }
        }
        if (el.effDuration === undefined) updateProp('effDuration', 5);
        if (el.effOnce === undefined) updateProp('effOnce', true);
      } else if (val === 'zoom') {
        if (el.zoomTarget === undefined) updateProp('zoomTarget', 150);
        if (el.effDuration === undefined) updateProp('effDuration', 5);
      } else if (val === 'spin') {
        if (el.spinTarget === undefined) updateProp('spinTarget', 360);
        if (el.spinRepeat === undefined) updateProp('spinRepeat', 1);
        if (el.effDuration === undefined) updateProp('effDuration', 2);
        if (el.effEase === undefined) updateProp('effEase', true);
      } else if (val === 'pulse') {
        if (el.pulseScale === undefined) updateProp('pulseScale', 105);
        if (el.effSpeed === undefined) updateProp('effSpeed', 100);
      } else if (val === 'heartbeat') {
        if (el.heartbeatScale === undefined) updateProp('heartbeatScale', 130);
        if (el.effSpeed === undefined) updateProp('effSpeed', 100);
      } else if (val === 'float') {
        if (el.floatRange === undefined) updateProp('floatRange', 10);
        if (el.floatDirection === undefined) updateProp('floatDirection', 'up');
        if (el.effSpeed === undefined) updateProp('effSpeed', 100);
      } else if (val !== 'none') {
        if (el.effSpeed === undefined) updateProp('effSpeed', 100);
      }
      if (val !== 'none' && el.effDelay === undefined) {
        updateProp('effDelay', 0);
      }
      pushHistory();
      renderProps();
    });
    btn.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      applyEffectPreview(val);
    });
  });

  const stopEffectPreviewLoop = () => {
    if (activeEffectVal === null && !hoverEffectPreviewActive) return;
    activeEffectVal = null;
    hoverEffectPreviewActive = false;
    resetEffectPreviewNodes();
  };
  stopElementEffectPreviewFn = stopEffectPreviewLoop;

  const effectsArea = propsEl.querySelector('#effects-preview-area');
  if (effectsArea) {
    effectsArea.addEventListener('mouseleave', stopEffectPreviewLoop);

    effectsArea.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('mouseenter', () => {
        applyEffectPreview(el.effectType || 'none');
      });
      input.addEventListener('input', () => {
        applyEffectPreview(el.effectType || 'none');
      });
      input.addEventListener('change', () => {
        applyEffectPreview(el.effectType || 'none');
      });
    });
  }

  propsEl.querySelectorAll('.align-btn[data-align]').forEach(btn => {
    if (btn.classList.contains('action-el-align')) {
      btn.addEventListener('click', () => {
        const align = btn.dataset.align;
        const c = getActiveCanvas();
        if (!c) return;
        const els = state.layerSelection?.length > 1 ? c.elements.filter(e => state.layerSelection.includes(e.id)) : [el];

        els.forEach(targetEl => {
          if (align === 'left') targetEl.x = 0;
          if (align === 'center') targetEl.x = Math.round((c.width - targetEl.width) / 2);
          if (align === 'right') targetEl.x = c.width - targetEl.width;
          if (align === 'top') targetEl.y = 0;
          if (align === 'middle') targetEl.y = Math.round((c.height - targetEl.height) / 2);
          if (align === 'bottom') targetEl.y = c.height - targetEl.height;
          if (targetEl.autoArranged) delete targetEl.autoArranged;
        });

        pushHistory();
        render();
      });
    } else {
      btn.addEventListener('click', () => {
        updateProp('textAlign', btn.dataset.align);
        pushHistory();
        renderProps();
      });
    }
  });

  propsEl.querySelectorAll('.valign-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateProp('verticalAlign', btn.dataset.valign);
      pushHistory();
      renderProps();
    });
  });

  const upload = propsEl.querySelector('#img-upload');
  if (upload) {
    const overlayBrowseBtn = propsEl.querySelector('#overlay-browse-btn');
    if (overlayBrowseBtn) {
      overlayBrowseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        upload.click();
      });
    }
    const previewContainer = propsEl.querySelector('.img-preview-container');
    if (previewContainer) {
      previewContainer.addEventListener('click', () => {
        upload.click();
      });
    }
  }
  if (upload) upload.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      const id = 'img_' + uid();
      if (!state.assets) state.assets = {};
      state.assets[id] = fr.result;
      if (!state.assetNames) state.assetNames = {};
      state.assetNames[id] = f.name;
      const _imgDyn = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, 'image');
      if (_imgDyn) {
        // Dynamic image slot: write to the active version's cell, or do nothing when
        // locked (read-only) — never overwrite the template default.
        if (!state.dataMerge.locked) dmWriteCell(el, 'image', id);
        else { alert('Data lock is on — unlock to change this version’s image.'); }
      } else {
        el.assetId = id;
      }
      if (!el.name || el.name.startsWith('Image')) el.name = f.name;
      el.isCompressed = false;
      delete el.webpQuality;
      pushHistory();
      render();
    };
    fr.readAsDataURL(f);
  });

  const btnCompress = propsEl.querySelector('#btn-webp-compress');
  if (btnCompress) {
    btnCompress.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const origText = btnCompress.textContent;
      btnCompress.textContent = 'Compressing...';
      btnCompress.disabled = true;
      try {
        await autoCompressImage(el);
      } catch (err) {
        console.error(err);
        alert('Failed to auto-compress image: ' + err.message);
      } finally {
        btnCompress.textContent = origText;
        btnCompress.disabled = false;
      }
    };
  }
  const btnSettings = propsEl.querySelector('#btn-webp-settings');
  if (btnSettings) {
    btnSettings.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await openWebpCompressionModal(el);
    };
  }
  const btnCrop = propsEl.querySelector('#btn-image-crop');
  if (btnCrop) {
    btnCrop.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const _imgDyn = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, 'image');
      if (_imgDyn && state.dataMerge && state.dataMerge.locked) {
        alert('Data lock is on — unlock to crop this version’s image.');
        return;
      }
      openImageCropModal(el);
    };
  }

  const btnRemove = propsEl.querySelector('#btn-image-remove');
  if (btnRemove) {
    btnRemove.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const _imgDyn = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, 'image');
      if (_imgDyn && state.dataMerge && state.dataMerge.locked) {
        alert('Data lock is on — unlock to remove this version’s image.');
        return;
      }
      delete el.assetId;
      delete el.name;
      delete el.isCompressed;
      delete el.webpQuality;
      delete el.cropOriginalAssetId;
      delete el.cropRegion;
      delete el.cropRotation;
      delete el.cropMirror;

      if (_imgDyn && state.dataMerge && state.dataMerge.mappings) {
        const sk = dmSlotKey(el) + '::image';
        delete state.dataMerge.mappings[sk];
      }

      pushHistory();
      render();
    };
  }

  if (typeof syncColorPickerWithSelection === 'function') {
    syncColorPickerWithSelection(el, null);
  }
  const canvasActiveIdx = state.frames.findIndex(fr => fr.id === state.activeFrameId);
  if (state.frames.length > 1 && (canvasActiveIdx > 0 || state.loopAd)) {
    wireFrameTransitionEvents();
  }
  initCollapsiblePanels();

  wireCustomSelects(el, updateProp);
}

// ============================================================================
// Top bar wiring
// ============================================================================




function addElement(type) {
  const c = getActiveCanvas(); if (!c) return;
  const isBg = type === 'background';
  const addAllArrange = document.getElementById('chk-add-all-arrange')?.checked;

  if (addAllArrange && !isBg) {
    const addedIdsPerCanvas = {};
    state.canvases.forEach(cv => {
      const el = makeElement(type);
      cv.elements.push(el);
      addedIdsPerCanvas[cv.id] = el.id;
      ensureRolesAssigned(cv);
    });

    state.canvases.forEach(cv => {
      const elId = addedIdsPerCanvas[cv.id];
      runAutoArrange(cv.id, [elId]);
    });

    const activeElId = addedIdsPerCanvas[c.id];
    state.selectedElementId = activeElId;
    state.layerSelection = [activeElId];
    state.editingElementId = null;
    pushHistory();
    render();
  } else {
    const el = makeElement(isBg ? 'rect' : type);
    
    if (isBg) {
      el.customName = 'Background';
      el.color = '#000054';
      el.x = 0;
      el.y = 0;
      el.width = c.width;
      el.height = c.height;
      el.radius = 0;
      el.locked = true;
      
      const firstFrameIdx = c.elements.findIndex(e => e.persistent === false && e.frameId === state.activeFrameId);
      if (firstFrameIdx === -1) {
        c.elements.unshift(el);
      } else {
        c.elements.splice(firstFrameIdx, 0, el);
      }
    } else {
      c.elements.push(el);
    }
    
    state.selectedElementId = el.id;
    state.layerSelection = [el.id];
    state.editingElementId = null;
    pushHistory();
    render();
  }
}

function addBackgroundToCanvases(allCanvases) {
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return;

  const color = '#000054';
  const canvasesToAdd = allCanvases ? state.canvases : [activeCanvas];
  let activeElId = null;

  canvasesToAdd.forEach(c => {
    const el = makeElement('rect');
    el.customName = 'Background';
    el.color = color;
    el.x = 0;
    el.y = 0;
    el.width = c.width;
    el.height = c.height;
    el.radius = 0;
    el.locked = true;

    const firstFrameIdx = c.elements.findIndex(e => e.persistent === false && e.frameId === state.activeFrameId);
    if (firstFrameIdx === -1) {
      c.elements.unshift(el);
    } else {
      c.elements.splice(firstFrameIdx, 0, el);
    }

    if (c.id === activeCanvas.id) {
      activeElId = el.id;
    }
  });

  if (activeElId) {
    state.selectedElementId = activeElId;
    state.layerSelection = [activeElId];
  }
  state.editingElementId = null;
  pushHistory();
  render();
}

function showBackgroundDropdown(e) {
  let popup = document.getElementById('background-popup');
  if (popup) { popup.remove(); return; }

  popup = document.createElement('div');
  popup.id = 'background-popup';
  popup.style.position = 'absolute';
  popup.style.background = 'var(--bg-panel)';
  popup.style.border = '1px solid var(--border-light)';
  popup.style.borderRadius = '6px';
  popup.style.padding = '4px 0';
  popup.style.zIndex = '1000000';
  popup.style.width = '240px';
  popup.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';

  const items = [
    { label: 'Add to current canvas only', action: () => addBackgroundToCanvases(false) },
    { label: 'Add to all canvases', action: () => addBackgroundToCanvases(true) }
  ];

  items.forEach(item => {
    const btn = document.createElement('div');
    btn.textContent = item.label;
    btn.style.padding = '8px 16px';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '12px';
    btn.style.color = 'var(--text-main)';
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'var(--accent-base)';
      btn.style.color = 'var(--text-on-accent, var(--text-bright))';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text-main)';
    });
    btn.addEventListener('click', () => {
      item.action();
      popup.remove();
    });
    popup.appendChild(btn);
  });

  document.body.appendChild(popup);

  const triggerEl = e.currentTarget || e.target || e;
  const rect = triggerEl.getBoundingClientRect();
  popup.style.left = rect.left + 'px';
  popup.style.top = (rect.bottom + window.scrollY + 4) + 'px';

  const popupRect = popup.getBoundingClientRect();
  if (popupRect.right > window.innerWidth) {
    popup.style.left = (window.innerWidth - popupRect.width - 8) + 'px';
  }
  if (popupRect.bottom > window.innerHeight) {
    popup.style.top = (rect.top - popupRect.height - 4) + 'px';
  }

  const closer = (ev) => {
    if (!popup.contains(ev.target) && ev.target !== triggerEl && !triggerEl.contains(ev.target)) {
      popup.remove();
      document.removeEventListener('mousedown', closer);
    }
  };
  document.addEventListener('mousedown', closer);
}

document.querySelectorAll('[data-add]').forEach(btn => {
  if (btn.dataset.add === 'background') {
    btn.addEventListener('click', (e) => {
      const addAllArrange = document.getElementById('chk-add-all-arrange')?.checked;
      if (addAllArrange) {
        addBackgroundToCanvases(true);
      } else {
        showBackgroundDropdown(e);
      }
    });
  } else {
    btn.addEventListener('click', () => addElement(btn.dataset.add));
  }
});

document.getElementById('btn-add-brand')?.addEventListener('click', (e) => {
  let popup = document.getElementById('brand-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'brand-popup';
    popup.style.position = 'absolute';
    popup.style.background = 'var(--bg-panel)';
    popup.style.border = '1px solid var(--border-light)';
    popup.style.borderRadius = '4px';
    popup.style.padding = '4px 0';
    popup.style.zIndex = '10000';
    popup.style.width = '200px';
    popup.style.boxShadow = '0 8px 24px var(--shadow-medium)';
    
    const items = [
      { label: 'CRICOS', action: () => addBrandElement('cricos') },
      { label: 'RFWN text', action: () => addBrandElement('rfwn') },
      { label: 'RMIT Logo (white)', action: () => addBrandElement('logo_white') },
      { label: 'RMIT Logo (Full color)', action: () => addBrandElement('logo_full') },
      { label: 'RMIT Logo (Red Pixel)', action: () => addBrandElement('logo_red') },
      { label: 'Pixel Shape', action: () => addBrandElement('pixel') }
    ];
    
    items.forEach(item => {
      const btn = document.createElement('div');
      btn.className = 'dropdown-item';
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        item.action();
        popup.remove();
      });
      popup.appendChild(btn);
    });
    
    document.body.appendChild(popup);
    
    const closer = (ev) => {
      if (!popup.contains(ev.target) && ev.target !== e.target && !e.target.contains(ev.target)) {
        popup.remove();
        document.removeEventListener('mousedown', closer);
      }
    };
    document.addEventListener('mousedown', closer);
  }
  
  const rect = e.currentTarget.getBoundingClientRect();
  popup.style.left = rect.left + 'px';
  popup.style.top = (rect.bottom + 4) + 'px';
});

document.getElementById('btn-add-brandset')?.addEventListener('click', (e) => {
  let popup = document.getElementById('brandset-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'brandset-popup';
    popup.style.position = 'absolute';
    popup.style.background = 'var(--bg-panel)';
    popup.style.border = '1px solid var(--border-light)';
    popup.style.borderRadius = '4px';
    popup.style.padding = '4px 0';
    popup.style.zIndex = '10000';
    popup.style.width = '200px';
    popup.style.boxShadow = '0 8px 24px var(--shadow-medium)';
    
    const items = [
      { label: 'Logo + RFWN + CRICOS', action: () => addBrandSet('logo_rfwn_cricos') }
    ];
    
    items.forEach(item => {
      const btn = document.createElement('div');
      btn.className = 'dropdown-item';
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        item.action();
        popup.remove();
      });
      popup.appendChild(btn);
    });
    
    document.body.appendChild(popup);
    
    const closer = (ev) => {
      if (!popup.contains(ev.target) && ev.target !== e.target && !e.target.contains(ev.target)) {
        popup.remove();
        document.removeEventListener('mousedown', closer);
      }
    };
    document.addEventListener('mousedown', closer);
  }
  
  const rect = e.currentTarget.getBoundingClientRect();
  popup.style.left = rect.left + 'px';
  popup.style.top = (rect.bottom + 4) + 'px';
});

function addBrandElement(type) {
  const c = getActiveCanvas(); if (!c) return;
  const addAllArrange = document.getElementById('chk-add-all-arrange')?.checked;

  const getElementForType = () => {
    let el;
    if (type === 'cricos') {
      el = makeElement('text');
      el.customName = 'CRICOS';
      el.text = 'CRICOS: 00122A | RTO: 3046';
      el.fontFamily = 'Helvetica Neue LT Pro';
      el.weight = '400';
      el.fontSize = 7;
      el.color = '#ffffff';
      el.width = 120;
      el.height = 12;
      el.role = 'cricos';
      el.roleAuto = false;
      el.persistent = 'top';
    } else if (type === 'rfwn') {
      el = makeElement('text');
      el.customName = 'RFWN';
      el.text = "Ready for what's next";
      el.fontFamily = 'Museo';
      el.weight = '700';
      el.fontSize = 10;
      el.color = '#ffffff';
      el.width = 160;
      el.height = 14;
      el.role = 'rfwn';
      el.roleAuto = false;
      el.persistent = 'top';
    } else if (type === 'logo_white') {
      el = makeElement('image');
      el.customName = 'RMIT Logo (white)';
      el.assetId = 'data/Elements/RMIT_White.svg';
      el.role = 'rmit-logo';
      el.roleAuto = false;
      el.persistent = 'top';
    } else if (type === 'logo_full') {
      el = makeElement('image');
      el.customName = 'RMIT Logo (Full color)';
      el.assetId = 'data/Elements/RMIT_full.svg';
      el.role = 'rmit-logo';
      el.roleAuto = false;
      el.persistent = 'top';
    } else if (type === 'logo_red') {
      el = makeElement('image');
      el.customName = 'RMIT Logo (Red Pixel)';
      el.assetId = 'data/Elements/RMIT_RedPixel.svg';
      el.role = 'rmit-logo';
      el.roleAuto = false;
      el.persistent = 'top';
    } else if (type === 'pixel') {
      el = makeElement('pixel');
      el.customName = 'RMIT Pixel';
      el.role = 'main-image';
      el.roleAuto = false;
    }
    return el;
  };

  if (addAllArrange) {
    const addedIdsPerCanvas = {};
    state.canvases.forEach(cv => {
      const el = getElementForType();
      if (el) {
        cv.elements.push(el);
        addedIdsPerCanvas[cv.id] = el.id;
        ensureRolesAssigned(cv);
      }
    });

    state.canvases.forEach(cv => {
      const elId = addedIdsPerCanvas[cv.id];
      if (elId) {
        runAutoArrange(cv.id, [elId]);
      }
    });

    const activeElId = addedIdsPerCanvas[c.id];
    if (activeElId) {
      state.selectedElementId = activeElId;
      state.layerSelection = [activeElId];
      state.editingElementId = null;
    }
    pushHistory();
    render();
  } else {
    const el = getElementForType();
    if (el) {
      c.elements.push(el);
      state.selectedElementId = el.id;
      state.layerSelection = [el.id];
      state.editingElementId = null;
      pushHistory();
      render();
    }
  }
}

function addBrandSet(setName) {
  const c = getActiveCanvas(); if (!c) return;
  const addAllArrange = document.getElementById('chk-add-all-arrange')?.checked;

  if (setName === 'logo_rfwn_cricos') {
    const canvasesToCheck = addAllArrange ? state.canvases : [c];
    let alreadyHas = false;
    for (const cv of canvasesToCheck) {
      const hasLogo = cv.elements.some(el => el.role === 'rmit-logo' || (el.customName && el.customName.toLowerCase().includes('rmit logo')));
      const hasRfwn = cv.elements.some(el => el.role === 'rfwn' || (el.customName && el.customName.toLowerCase().includes('rfwn')));
      const hasCricos = cv.elements.some(el => el.role === 'cricos' || (el.customName && el.customName.toLowerCase().includes('cricos')));
      if (hasLogo || hasRfwn || hasCricos) {
        alreadyHas = true;
        break;
      }
    }

    if (alreadyHas) {
      showCanvasNotification('Existing elements already placed', {
        type: 'warning',
        button: {
          text: 'Clear all',
          onClick: () => {
            canvasesToCheck.forEach(cv => {
              cv.elements = cv.elements.filter(el => {
                const isLogo = el.role === 'rmit-logo' || (el.customName && el.customName.toLowerCase().includes('rmit logo'));
                const isRfwn = el.role === 'rfwn' || (el.customName && el.customName.toLowerCase().includes('rfwn'));
                const isCricos = el.role === 'cricos' || (el.customName && el.customName.toLowerCase().includes('cricos'));
                return !(isLogo || isRfwn || isCricos);
              });
            });
            state.selectedElementId = null;
            state.layerSelection = [];
            pushHistory();
            render();
            if (typeof renderProps === 'function') renderProps();
            showCanvasNotification('Existing brand elements cleared.', { type: 'success' });
          }
        }
      });
      return;
    }

    const addedIdsPerCanvas = {};
    const canvasesToAdd = addAllArrange ? state.canvases : [c];

    canvasesToAdd.forEach(cv => {
      // 1. Create the logo white element
      const logo = makeElement('image');
      logo.customName = 'RMIT Logo (white)';
      logo.assetId = 'data/Elements/RMIT_White.svg';
      logo.role = 'rmit-logo';
      logo.roleAuto = false;
      logo.lockRatio = true;
      logo.persistent = 'top';

      // 2. Create the RFWN tagline
      const rfwn = makeElement('text');
      rfwn.customName = 'RFWN';
      rfwn.text = "Ready for what's next";
      rfwn.fontFamily = 'Museo';
      rfwn.weight = '700';
      rfwn.fontSize = 10;
      rfwn.color = '#ffffff';
      rfwn.width = 160;
      rfwn.height = 14;
      rfwn.role = 'rfwn';
      rfwn.roleAuto = false;
      rfwn.persistent = 'top';

      // 3. Create the CRICOS line
      const cricos = makeElement('text');
      cricos.customName = 'CRICOS';
      cricos.text = 'CRICOS: 00122A | RTO: 3046';
      cricos.fontFamily = 'Helvetica Neue LT Pro';
      cricos.weight = '400';
      cricos.fontSize = 7;
      cricos.color = '#ffffff';
      cricos.width = 120;
      cricos.height = 12;
      cricos.role = 'cricos';
      cricos.roleAuto = false;
      cricos.persistent = 'top';

      const sizeKey = cv.width + "x" + cv.height;
      const config = AUTO_ARRANGE_CONFIG[sizeKey];

      if (config) {
        cv.elements.push(logo, rfwn, cricos);
        addedIdsPerCanvas[cv.id] = [logo.id, rfwn.id, cricos.id];
      } else {
        const cw = cv.width;
        const ch = cv.height;
        const logoW = 113;
        const logoH = 40;
        const rfwnW = 160;
        const rfwnH = 14;
        const cricosW = 120;
        const cricosH = 12;
        const gap1 = 10;
        const gap2 = 8;
        const totalH = logoH + gap1 + rfwnH + gap2 + cricosH;

        const startY = Math.max(10, (ch - totalH) / 2);

        logo.width = logoW;
        logo.height = logoH;
        logo.x = (cw - logoW) / 2;
        logo.y = startY;

        rfwn.width = rfwnW;
        rfwn.height = rfwnH;
        rfwn.x = (cw - rfwnW) / 2;
        rfwn.y = startY + logoH + gap1;
        rfwn.textAlign = 'center';

        cricos.width = cricosW;
        cricos.height = cricosH;
        cricos.x = (cw - cricosW) / 2;
        cricos.y = rfwn.y + rfwnH + gap2;
        cricos.textAlign = 'center';

        cv.elements.push(logo, rfwn, cricos);
        addedIdsPerCanvas[cv.id] = [logo.id, rfwn.id, cricos.id];
      }
    });

    canvasesToAdd.forEach(cv => {
      const ids = addedIdsPerCanvas[cv.id];
      const sizeKey = cv.width + "x" + cv.height;
      const config = AUTO_ARRANGE_CONFIG[sizeKey];
      if (config && ids) {
        runAutoArrange(cv.id, ids);
      }
    });

    const activeIds = addedIdsPerCanvas[c.id];
    if (activeIds) {
      state.selectedElementId = null;
      state.layerSelection = activeIds;
      state.editingElementId = null;
    }

    pushHistory();
    render();
    if (typeof renderProps === 'function') renderProps();

    if (addAllArrange) {
      showCanvasNotification('Brand set added to all canvases and arranged.', { type: 'success' });
    } else {
      const sizeKey = c.width + "x" + c.height;
      if (AUTO_ARRANGE_CONFIG[sizeKey]) {
        showCanvasNotification('Brand set added and arranged.', { type: 'success' });
      } else {
        showCanvasNotification('Brand set added and centered.', { type: 'success' });
      }
    }
  }
}

// ============================================================================
// Drag-and-drop image / SVG import
// ============================================================================

// Accepted MIME types — includes svg+xml for SVG vectors
const ACCEPTED_IMAGE_TYPES = /^image\/(png|jpeg|gif|webp|svg\+xml|bmp|avif|tiff)$/i;

/** Read a File object and register it as a state asset. Returns { assetId, naturalW, naturalH }. */
function readFileAsAsset(file) {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_IMAGE_TYPES.test(file.type)) {
      reject(new Error('Unsupported file type: ' + file.type));
      return;
    }
    const fr = new FileReader();
    fr.onload = () => {
      const dataUrl = fr.result;
      const assetId = 'img_' + uid();
      state.assets[assetId] = dataUrl;
      // Detect natural dimensions to size the element sensibly
      const img = new Image();
      img.onload = () => resolve({ assetId, naturalW: img.naturalWidth || 120, naturalH: img.naturalHeight || 90 });
      img.onerror = () => resolve({ assetId, naturalW: 120, naturalH: 90 });
      img.src = dataUrl;
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

/**
 * Handle one or more dropped image files onto a canvas element.
 * dropX/Y — pointer position in canvas-space pixels (zoom-adjusted).
 */
async function handleDroppedFiles(files, canvasEl, dropX, dropY) {
  const frameEl = canvasEl.closest('.canvas-frame');
  if (!frameEl) return;
  const c = state.canvases.find(x => x.id === frameEl.dataset.canvasId);
  if (!c) return;

  state.activeCanvasId = c.id;

  const imageFiles = Array.from(files).filter(f => ACCEPTED_IMAGE_TYPES.test(f.type));
  if (imageFiles.length === 0) return;

  const addedIds = [];
  for (const file of imageFiles) {
    try {
      const { assetId, naturalW, naturalH } = await readFileAsAsset(file);

      // Fit inside canvas (up to 80% of each dimension), preserving aspect ratio
      const maxW = Math.round(c.width * 0.8);
      const maxH = Math.round(c.height * 0.8);
      const scale = Math.min(1, maxW / naturalW, maxH / naturalH);
      const elW = Math.max(10, Math.round(naturalW * scale));
      const elH = Math.max(10, Math.round(naturalH * scale));

      // Center on drop point (fall back to canvas center)
      const cx = dropX !== null ? Math.round(dropX - elW / 2) : Math.round((c.width - elW) / 2);
      const cy = dropY !== null ? Math.round(dropY - elH / 2) : Math.round((c.height - elH) / 2);

      const el = Object.assign(makeElement('image'), {
        name: file.name,
        assetId,
        width: elW,
        height: elH,
        x: Math.max(0, cx),
        y: Math.max(0, cy),
      });

      c.elements.push(el);
      addedIds.push(el.id);
    } catch (err) {
      console.warn('[drop] Skipped file:', err.message);
    }
  }

  if (addedIds.length > 0) {
    state.selectedElementId = addedIds[addedIds.length - 1];
    state.layerSelection = addedIds;
    pushHistory();
    render();
  }
}

// Drop-target highlight tracking
let _dropHighlightCanvas = null;
function setDropHighlight(canvasEl, on) {
  if (_dropHighlightCanvas && _dropHighlightCanvas !== canvasEl) {
    _dropHighlightCanvas.classList.remove('drop-target');
    _dropHighlightCanvas = null;
  }
  if (canvasEl) {
    if (on) { canvasEl.classList.add('drop-target'); _dropHighlightCanvas = canvasEl; }
    else canvasEl.classList.remove('drop-target');
  }
}

canvasArea.addEventListener('dragover', (e) => {
  // Intercept real file drags and Assets-panel drags (layer reorders carry text/plain)
  const t = e.dataTransfer.types;
  if (!t.includes('Files') && !t.includes('application/x-asset')) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';

  // Check if hovering over an image placeholder
  const elsFromPoint = document.elementsFromPoint(e.clientX, e.clientY);
  const targetElNode = elsFromPoint.map(node => node.closest && node.closest('.el')).find(Boolean);
  let targetPlaceholderId = null;
  if (targetElNode) {
    const found = findElementById(targetElNode.dataset.id);
    if (found && found.element.type === 'image') {
      targetPlaceholderId = found.element.id;
    }
  }

  if (targetPlaceholderId) {
    if (state.dragOverPlaceholderId !== targetPlaceholderId) {
      state.dragOverPlaceholderId = targetPlaceholderId;
      render(true);
    }
    setDropHighlight(null, false);
  } else {
    if (state.dragOverPlaceholderId) {
      state.dragOverPlaceholderId = null;
      render(true);
    }
    setDropHighlight(e.target.closest('.canvas'), true);
  }
});

canvasArea.addEventListener('dragleave', (e) => {
  if (!canvasArea.contains(e.relatedTarget)) {
    setDropHighlight(null, false);
    if (state.dragOverPlaceholderId) {
      state.dragOverPlaceholderId = null;
      render(true);
    }
  }
});

canvasArea.addEventListener('drop', async (e) => {
  if (state.dragOverPlaceholderId) {
    const placeholderId = state.dragOverPlaceholderId;
    state.dragOverPlaceholderId = null;

    // 1. Asset dragged out of the Assets panel onto a canvas placeholder.
    const assetId = e.dataTransfer.getData('application/x-asset');
    if (assetId) {
      e.preventDefault();
      const dropCanvas = e.target.closest('.canvas');
      setDropHighlight(dropCanvas, false);
      const asset = (state.assetLibrary || []).find(a => a.id === assetId);
      if (asset) {
        const imgEl = (asset.elements || []).find(el => el.type === 'image');
        if (imgEl && imgEl.assetId) {
          const found = findElementById(placeholderId);
          if (found) {
            found.element.assetId = imgEl.assetId;
            found.element.name = imgEl.name || found.element.name;
            if (imgEl._assetDmMap && state.dataMerge) {
              if (!state.dataMerge.mappings) state.dataMerge.mappings = {};
              const sk = dmSlotKey(found.element) + '::';
              Object.keys(imgEl._assetDmMap).forEach(field => {
                state.dataMerge.mappings[sk + field] = imgEl._assetDmMap[field];
              });
            }
            pushHistory();
            render();
            return;
          }
        }
      }
    }

    // 2. Files dropped directly from computer onto a placeholder
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      const dropCanvas = e.target.closest('.canvas');
      setDropHighlight(dropCanvas, false);
      const imageFiles = Array.from(e.dataTransfer.files).filter(f => ACCEPTED_IMAGE_TYPES.test(f.type));
      if (imageFiles.length > 0) {
        try {
          const { assetId } = await readFileAsAsset(imageFiles[0]);
          const found = findElementById(placeholderId);
          if (found) {
            found.element.assetId = assetId;
            found.element.name = imageFiles[0].name || found.element.name;
            pushHistory();
            render();
            return;
          }
        } catch (err) {
          console.warn('[drop] Failed to read file for placeholder:', err.message);
        }
      }
    }
  }

  // Fallback to original drop behavior if not dropping onto a placeholder
  const assetId = e.dataTransfer.getData('application/x-asset');
  if (assetId) {
    e.preventDefault();
    const dropCanvas = e.target.closest('.canvas');
    setDropHighlight(dropCanvas, false);
    if (!dropCanvas) return;
    const z = state.zoom || 1;
    const r = dropCanvas.getBoundingClientRect();
    placeAsset(assetId, dropCanvas.parentElement.dataset.canvasId,
      (e.clientX - r.left) / z, (e.clientY - r.top) / z);
    return;
  }
  if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
  e.preventDefault();
  const targetCanvas = e.target.closest('.canvas');
  setDropHighlight(targetCanvas, false);
  if (!targetCanvas) return;
  const z = state.zoom || 1;
  const rect = targetCanvas.getBoundingClientRect();
  await handleDroppedFiles(
    e.dataTransfer.files, targetCanvas,
    (e.clientX - rect.left) / z,
    (e.clientY - rect.top) / z
  );
});

document.addEventListener('dragend', () => {
  if (state.dragOverPlaceholderId) {
    state.dragOverPlaceholderId = null;
    render(true);
  }
});

function deselectNonPersistentLayers() {
  const isPersistent = (id) => {
    for (const c of state.canvases) {
      const el = c.elements.find(e => e.id === id);
      if (el) return el.persistent !== false;
    }
    return false;
  };

  state.layerSelection = state.layerSelection.filter(isPersistent);

  if (state.selectedElementId && !isPersistent(state.selectedElementId)) {
    state.selectedElementId = null;
  }

  if (state.layerSelection.length === 1 && !state.selectedElementId) {
    state.selectedElementId = state.layerSelection[0];
  } else if (state.layerSelection.length === 0) {
    state.selectedElementId = null;
  }
}


// ============================================================================
// Keyboard shortcuts
// ============================================================================
window.addEventListener('keydown', (e) => {
  if (e.key === 'Alt') {
    e.preventDefault();
    if (state.activeTool === 'zoom') {
      const area = document.getElementById('canvas-area');
      if (area) {
        area.style.cursor = 'zoom-out';
        area.classList.add('zoom-out-active');
      }
    }
  }
  // never intercept while typing in an input/textarea
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
    if (e.key === 'Escape') {
      t.blur();
    }
    return;
  }

  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    if (e.key.toLowerCase() === 'v') {
      setActiveTool('select');
      return;
    }
    if (e.key.toLowerCase() === 'z') {
      setActiveTool('zoom');
      return;
    }
    if (e.key.toLowerCase() === 't') {
      setActiveTool('text');
      return;
    }
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    const isNowFullscreen = document.body.classList.toggle('fullscreen-mode');
    if (isNowFullscreen) {
      setActiveTool('select');
    }
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    state.showRulers = !state.showRulers;
    render();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (e.shiftKey) {
      // Ctrl/Cmd + Shift + S → Save silently to browser database (IndexedDB).
      (async () => {
        if (_autosaveTimer) {
          clearTimeout(_autosaveTimer);
          _autosaveTimer = null;
        }
        await writeAutosave();
        showCanvasNotification('Project saved to browser', { type: 'success' });
      })();
    } else {
      // Ctrl/Cmd + S → Push to Cloud (no fallback to file download).
      if (typeof authState !== 'undefined' && authState.enabled && authState.currentUser()) {
        (async () => {
          try {
            const res = await pushCurrentProjectToCloud();
            if (res && res.collisionHandled) {
              // handled inside
            } else if (res && res.isFirstSave) {
              showCanvasNotification(`"${state.projectName}" project saved to cloud`, { type: 'success' });
            } else {
              showCanvasNotification('Pushed to cloud', { type: 'success' });
            }
          }
          catch (err) { showCanvasNotification(`Push failed: ${err.message || err}`, { type: 'error' }); }
        })();
      } else {
        showCanvasNotification('Cloud save failed: Please sign in to save projects to the cloud.', { type: 'warning' });
      }
    }
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    toggleOutlineMode();
    return;
  }

  // Ctrl+Shift+G → ungroup ; Ctrl+G → group (hijacks browser Find Next)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) ungroupSelection();
    else groupSelection();
    return;
  }

  // Ctrl+] → bring forward, Ctrl+[ → send backward (Illustrator-style)
  if ((e.ctrlKey || e.metaKey) && (e.key === ']' || e.key === '[')) {
    e.preventDefault();
    shiftLayerOrder(e.key === ']' ? 1 : -1);
    return;
  }

  // Ctrl+2 → lock selection, Ctrl+Shift+2 → unlock selection (Illustrator-style).
  // Operates on every currently-selected layer; no-op when selection is empty.
  if ((e.ctrlKey || e.metaKey) && e.key === '2') {
    e.preventDefault();
    const cnv = getActiveCanvas();
    if (!cnv) return;
    const ids = (state.layerSelection && state.layerSelection.length)
      ? state.layerSelection
      : (state.selectedElementId ? [state.selectedElementId] : []);
    if (ids.length === 0) return;
    const lockTo = !e.shiftKey;   // shift = unlock; plain Ctrl+2 = lock
    let changed = 0;
    ids.forEach(id => {
      const item = cnv.elements.find(x => x.id === id);
      if (!item) return;
      if (!!item.locked !== lockTo) { item.locked = lockTo; changed++; }
    });
    if (changed > 0) {
      pushHistory();
      render();
      showCanvasNotification(
        lockTo
          ? `Locked ${changed} layer${changed === 1 ? '' : 's'}.`
          : `Unlocked ${changed} layer${changed === 1 ? '' : 's'}.`,
        { type: 'success' }
      );
    }
    return;
  }

  // Copy, Cut, and Paste are handled by standard window events below
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
    e.preventDefault();
    if (state.clipboard) {
      performPaste(state.clipboard, true);
    } else if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(text => {
        try {
          const parsedData = JSON.parse(text);
          performPaste(parsedData, true);
        } catch (err) {
          // ignore non-json text
        }
      }).catch(() => {});
    }
    return;
  }


  if (e.code === 'Space') {
    e.preventDefault();
    if (!isSpaceDown) {
      isSpaceDown = true;
      if (!isPanning) canvasArea.style.cursor = 'var(--cur-grab, grab)';
      canvasArea.classList.add('panning-active');
      document.querySelectorAll('.preview-iframe').forEach(ifr => ifr.style.pointerEvents = 'none');
    }
    return;
  }

  const el = getSelectedElement();
  const hasSelection = el || (state.layerSelection && state.layerSelection.length > 0);

  // Delete / Backspace → remove selected asset(s) or element(s)
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (state.assetSelection && state.assetSelection.length > 0) {
      e.preventDefault();
      const hasReadOnly = state.assetSelection.some(aid => {
        const a = (state.assetLibrary || []).find(x => x.id === aid);
        if (a) {
          const pf = a.folderId ? (state.assetFolders || []).find(f => f.id === a.folderId) : null;
          return pf && pf.readOnly;
        }
        return false;
      });
      if (hasReadOnly) {
        alert("Pre-loaded read-only assets cannot be deleted.");
        return;
      }
      state.assetLibrary = (state.assetLibrary || []).filter(x => !state.assetSelection.includes(x.id));
      state.assetSelection = [];
      pushHistory();
      render();
      return;
    }
    if (hasSelection) {
      const c = getActiveCanvas();
      const toDel = (state.layerSelection && state.layerSelection.length > 0) ? state.layerSelection : [el.id];
      c.elements = c.elements.filter(x => !toDel.includes(x.id));
      state.selectedElementId = null;
      state.layerSelection = [];
      e.preventDefault();
      pushHistory();
      render();
      return;
    }
  }

  // Esc → deselect
  if (e.key === 'Escape') {
    if (state.singlePreviewId) {
      state.singlePreviewId = null;
      render();
      return;
    }
    if (state.isPreviewMode) {
      state.isPreviewMode = false;
      if (state.prePreviewZoom) state.zoom = state.prePreviewZoom;
      render();
      setTimeout(() => {
        const area = document.getElementById('canvas-area');
        if (state.prePreviewScrollLeft !== undefined) {
          area.scrollTo({ left: state.prePreviewScrollLeft, top: state.prePreviewScrollTop, behavior: 'instant' });
        }
      }, 10);
      return;
    }
    state.selectedElementId = null;
    state.editingElementId = null;
    state.layerSelection = [];
    if (state.isolatedGroupId) state.isolatedGroupId = null;
    render();
    return;
  }

  // Arrow keys → nudge (1px, or 10px with Shift)
  if (e.key.startsWith('Arrow')) {
    const toMove = [];
    if (state.layerSelection && state.layerSelection.length > 0) {
      toMove.push(...state.layerSelection);
    } else if (el) {
      toMove.push(el.id);
    }

    if (toMove.length > 0) {
      const step = e.shiftKey
        ? (state.nudgeShift !== undefined ? state.nudgeShift : 10)
        : (state.nudgeDefault !== undefined ? state.nudgeDefault : 1);
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      if (e.key === 'ArrowRight') dx = step;
      if (e.key === 'ArrowUp') dy = -step;
      if (e.key === 'ArrowDown') dy = step;

      if (dx !== 0 || dy !== 0) {
        const c = getActiveCanvas();
        if (c) {
          c.elements.forEach(x => {
            if (toMove.includes(x.id) && !x.locked) {
              x.x += dx;
              x.y += dy;
              if (x.autoArranged) delete x.autoArranged;
            }
          });
          e.preventDefault();
          render();
        }
        return;
      }
    }
  }

  // Cmd/Ctrl+D → duplicate selection
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
    if (c && state.layerSelection?.length > 0) {
      const groupMap = {};
      const newIds = [];
      const toDup = c.elements.filter(x => state.layerSelection.includes(x.id));
      const duped = toDup.map(x => {
        const copy = JSON.parse(JSON.stringify(x));
        copy.id = uid();
        copy.x += 10;
        copy.y += 10;
        if (copy.groupId) {
          if (!groupMap[copy.groupId]) groupMap[copy.groupId] = uid();
          copy.groupId = groupMap[copy.groupId];
        }
        newIds.push(copy.id);
        return copy;
      });
      duped.forEach(d => insertAtGroupEnd(c.elements, d));
      state.layerSelection = newIds;
      state.selectedElementId = newIds.length === 1 ? newIds[0] : null;
      pushHistory();
      render();
    }
    e.preventDefault();
    return;
  }
});

function performPaste(parsedData, isPasteInPlace) {
  const c = getActiveCanvas();
  if (!c) return false;

  let parsed = [];
  let sourceCanvasId = null;
  let sourceWidth = null;
  let sourceHeight = null;
  if (Array.isArray(parsedData)) {
    parsed = parsedData;
  } else if (parsedData && Array.isArray(parsedData.elements)) {
    parsed = parsedData.elements;
    sourceCanvasId = parsedData.sourceCanvasId;
    sourceWidth = parsedData.sourceCanvasWidth;
    sourceHeight = parsedData.sourceCanvasHeight;
  }

  if (parsed.length > 0) {
    const groupMap = {};
    const newIds = [];
    const pasted = parsed.map(x => {
      const copy = JSON.parse(JSON.stringify(x));
      copy.id = uid();

      if (isPasteInPlace) {
        if (sourceCanvasId && sourceCanvasId === c.id) {
          // Same canvas: keep exact original position
        } else if (sourceWidth && sourceHeight) {
          // Different canvas: calculate proportional position based on element center anchor
          const w = x.width || 0;
          const h = x.height || 0;
          copy.x = Math.round(((x.x + w / 2) / sourceWidth) * c.width - w / 2);
          copy.y = Math.round(((x.y + h / 2) / sourceHeight) * c.height - h / 2);
        } else {
          // Fallback (keep original coordinates)
        }
      } else {
        // Normal paste: offset by 10
        copy.x += 10;
        copy.y += 10;
      }

      if (copy.persistent === false) {
        copy.frameId = state.activeFrameId;
      }
      if (copy.groupId) {
        if (!groupMap[copy.groupId]) groupMap[copy.groupId] = uid();
        copy.groupId = groupMap[copy.groupId];
      }
      newIds.push(copy.id);
      return copy;
    });
    pasted.forEach(p => insertAtGroupEnd(c.elements, p));
    state.layerSelection = newIds;
    state.selectedElementId = newIds.length === 1 ? newIds[0] : null;
    pushHistory();
    render();
    return true;
  }
  return false;
}

window.addEventListener('copy', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
    return;
  }
  const c = getActiveCanvas();
  if (c && state.layerSelection?.length > 0) {
    const selected = c.elements.filter(x => state.layerSelection.includes(x.id)).map(x => JSON.parse(JSON.stringify(x)));
    const clipboardPayload = {
      sourceCanvasId: c.id,
      sourceCanvasWidth: c.width,
      sourceCanvasHeight: c.height,
      elements: selected
    };
    state.clipboard = clipboardPayload;
    e.clipboardData.setData('application/x-adflow-elements', JSON.stringify(clipboardPayload));
    e.preventDefault();
  }
});

window.addEventListener('cut', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
    return;
  }
  const c = getActiveCanvas();
  if (c && state.layerSelection?.length > 0) {
    const selected = c.elements.filter(x => state.layerSelection.includes(x.id)).map(x => JSON.parse(JSON.stringify(x)));
    const clipboardPayload = {
      sourceCanvasId: c.id,
      sourceCanvasWidth: c.width,
      sourceCanvasHeight: c.height,
      elements: selected
    };
    state.clipboard = clipboardPayload;
    e.clipboardData.setData('application/x-adflow-elements', JSON.stringify(clipboardPayload));
    c.elements = c.elements.filter(x => !state.layerSelection.includes(x.id));
    state.layerSelection = [];
    state.selectedElementId = null;
    e.preventDefault();
    pushHistory();
    render();
  }
});

window.addEventListener('paste', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
    return;
  }
  const c = getActiveCanvas();
  if (!c) return;

  const isPasteInPlace = !!window._isPasteInPlace;
  window._isPasteInPlace = false;

  // 1. Try pasting Adflow elements
  const elementsData = e.clipboardData.getData('application/x-adflow-elements') || e.clipboardData.getData('application/x-adcooker-elements');
  let parsedData = null;
  if (elementsData) {
    try {
      parsedData = JSON.parse(elementsData);
    } catch (err) {
      console.warn('Failed to parse pasted elements from clipboardData:', err);
    }
  }

  // Fallback to internal state if OS clipboard custom data is empty
  if (!parsedData && state.clipboard) {
    parsedData = state.clipboard;
  }

  if (parsedData) {
    const success = performPaste(parsedData, isPasteInPlace);
    if (success) {
      e.preventDefault();
      return;
    }
  }

  // 2. Try pasting images from clipboard
  const items = e.clipboardData?.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = function(event) {
            const dataUrl = event.target.result;
            const assetKey = 'pasted_' + uid();
            state.assets[assetKey] = dataUrl;
            
            const imgEl = Object.assign(makeElement('image'), {
              customName: 'Pasted Image',
              assetKey: assetKey,
              x: 20,
              y: 20,
              width: 150,
              height: 150,
              persistent: false,
              frameId: state.activeFrameId
            });
            
            const img = new Image();
            img.onload = function() {
              const maxW = Math.round(c.width * 0.8);
              const maxH = Math.round(c.height * 0.8);
              let w = img.width;
              let h = img.height;
              if (w > maxW || h > maxH) {
                const ratio = Math.min(maxW / w, maxH / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
              }
              imgEl.width = w;
              imgEl.height = h;
              imgEl.x = Math.round((c.width - w) / 2);
              imgEl.y = Math.round((c.height - h) / 2);
              render();
            };
            img.src = dataUrl;

            insertAtGroupEnd(c.elements, imgEl);
            state.selectedElementId = imgEl.id;
            state.layerSelection = [imgEl.id];
            pushHistory();
            render();
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  }

  // 3. Try pasting plain text
  const text = e.clipboardData?.getData('text/plain');
  if (text) {
    e.preventDefault();
    const textEl = Object.assign(makeElement('text'), {
      customName: 'Pasted Text',
      text: text,
      x: 20,
      y: 20,
      width: Math.min(250, Math.round(c.width * 0.8)),
      height: 40,
      fontSize: 18,
      fontFamily: 'Helvetica Neue LT Pro',
      weight: '400',
      color: '#ffffff',
      persistent: false,
      frameId: state.activeFrameId
    });
    textEl.x = Math.round((c.width - textEl.width) / 2);
    textEl.y = Math.round((c.height - textEl.height) / 2);

    insertAtGroupEnd(c.elements, textEl);
    state.selectedElementId = textEl.id;
    state.layerSelection = [textEl.id];
    pushHistory();
    render();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Alt') {
    e.preventDefault();
    if (state.activeTool === 'zoom') {
      const area = document.getElementById('canvas-area');
      if (area) {
        area.style.cursor = 'zoom-in';
        area.classList.remove('zoom-out-active');
      }
    }
  }
  if (e.code === 'Space') {
    isSpaceDown = false;
    isPanning = false;
    const area = document.getElementById('canvas-area');
    if (area) {
      area.style.cursor = state.activeTool === 'zoom' ? 'zoom-in' : '';
      area.classList.remove('panning-active');
    }
    document.querySelectorAll('.preview-iframe').forEach(ifr => ifr.style.pointerEvents = 'auto');
    checkCanvasesInView();
  }
});

function allCanvasesCenter() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  state.canvases.forEach(c => {
    if (c.workspaceX < minX) minX = c.workspaceX;
    if (c.workspaceY < minY) minY = c.workspaceY;
    if (c.workspaceX + c.width > maxX) maxX = c.workspaceX + c.width;
    if (c.workspaceY + c.height > maxY) maxY = c.workspaceY + c.height;
  });
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

document.getElementById('zoom-level-display')?.addEventListener('click', () => {
  if (state.canvases.length === 0) return;
  const { x, y } = allCanvasesCenter();
  animateViewTo(1.0, x, y);
});

document.getElementById('app-version-display')?.addEventListener('click', () => {
  openChangelogModal();
});

// Safezones toggle — entry points live in the canvas Properties panel
// (Canvas Settings → "Show safezones") and the canvas / workspace right-click
// menus. There used to be a Tool-panel button; it's gone since v0.12.
function _toggleSafezones() {
  state.showSafezones = !state.showSafezones;
  render();
}

// The auto-resize rule engine (openRolePicker, openAutoResizeModal,
// runRuleBasedAutoResize, all place* rules, applyRelationR1,
// resolveNoTouchCollisions, clampToCanvas, openAutoResizeSettingsModal,
// wireLinkGroup, legacyRoleForCategory,
// AUTO_RESIZE_DEFAULT_SETTINGS / getAutoResizeSettings, plus the
// btn-ai-resize + btn-ai-resize-settings click listeners) all live in
// `auto-resize-engine.js`. That file is loaded BEFORE this one in
// index.html so its functions are globally available by the time any
// layer-row click handler or render() call fires.

// "Clear all" helpers — surfaced from the canvas context menu and the
// canvas Properties panel. The legacy Tools-panel "Clear everything" button
// was removed in v0.16.0; these are the only entry points now.
function clearCurrentCanvasContents() {
  const c = getActiveCanvas();
  if (!c) return;
  if (!confirm(`Clear every element on "${c.name || c.width + '×' + c.height}"? This cannot be undone (use Ctrl+Z to restore).`)) return;
  c.elements = [];
  state.selectedElementId = null;
  state.layerSelection = [];
  // Prune any link groups that no longer have members anywhere.
  if (typeof cleanupLinkGroups === 'function') cleanupLinkGroups();
  pushHistory();
  render();
}

function clearAllCanvasesContents() {
  if (!confirm("Clear every element on EVERY canvas? This cannot be undone (use Ctrl+Z to restore).")) return;
  state.canvases.forEach(c => { c.elements = []; });
  state.linkGroups = {};
  state.selectedElementId = null;
  state.layerSelection = [];
  pushHistory();
  render();
}

// Clear every canvas except the active one. Selection stays put because it
// only ever lives on the active canvas, which we're preserving.
function clearOtherCanvasesContents() {
  const active = getActiveCanvas();
  if (!active) return;
  const others = state.canvases.filter(c => c.id !== active.id);
  if (others.length === 0) {
    showCanvasNotification('No other canvases to clear.', { type: 'info' });
    return;
  }
  const activeLabel = active.name || (active.width + '×' + active.height);
  if (!confirm(`Clear every element on EVERY canvas EXCEPT "${activeLabel}"? This cannot be undone (use Ctrl+Z to restore).`)) return;
  others.forEach(c => { c.elements = []; });
  if (typeof cleanupLinkGroups === 'function') cleanupLinkGroups();
  pushHistory();
  render();
}

function setActiveTool(tool) {
  state.activeTool = tool;
  const toolSelect = document.getElementById('tool-select');
  const toolZoom = document.getElementById('tool-zoom');
  const toolText = document.getElementById('tool-text');
  const canvasArea = document.getElementById('canvas-area');

  if (toolSelect && toolZoom) {
    toolSelect.classList.toggle('active', tool === 'select');
    toolZoom.classList.toggle('active', tool === 'zoom');
    if (toolText) toolText.classList.toggle('active', tool === 'text');

    if (canvasArea) {
      if (tool === 'select') {
        canvasArea.style.cursor = '';
        canvasArea.classList.remove('tool-zoom-active');
        canvasArea.classList.remove('zoom-out-active');
        canvasArea.classList.remove('tool-text-active');
      } else if (tool === 'zoom') {
        canvasArea.style.cursor = 'zoom-in';
        canvasArea.classList.add('tool-zoom-active');
        canvasArea.classList.remove('tool-text-active');
      } else if (tool === 'text') {
        canvasArea.style.cursor = 'text';
        canvasArea.classList.remove('tool-zoom-active');
        canvasArea.classList.remove('zoom-out-active');
        canvasArea.classList.add('tool-text-active');
      }
    }
  }
}

document.getElementById('tool-select')?.addEventListener('click', () => {
  setActiveTool('select');
});

document.getElementById('tool-zoom')?.addEventListener('click', () => {
  setActiveTool('zoom');
});

document.getElementById('tool-text')?.addEventListener('click', () => {
  setActiveTool('text');
});

document.getElementById('btn-preview').addEventListener('click', () => {
  const c = getActiveCanvas(); if (!c) return;
  const area = document.getElementById('canvas-area');
  state.prePreviewScrollLeft = area.scrollLeft;
  state.prePreviewScrollTop = area.scrollTop;
  state.prePreviewZoom = state.zoom || 0.6;
  // Hide the side panels NOW (preview-active expands canvas-area to full viewport).
  // animateViewTo captures area.clientWidth — if we don't expand first, it computes a
  // target for the editor's narrower viewport and the canvases end up skewed left.
  document.body.classList.add('preview-active');
  const { x, y } = allCanvasesCenter();
  // Animate the editor view first; only after we've arrived at the destination do we
  // switch to preview mode and rebuild as iframes. This way the user sees a smooth
  // zoom/pan instead of editor → blank → iframes-load → scroll.
  animateViewTo(1, x, y, 350, () => {
    state.isPreviewMode = true;
    render();
  });
});

// ----------------------------------------------------------------------------
// Frame controls — horizontal scroll + fade hints
// ----------------------------------------------------------------------------
// When the top bar is too narrow to show every frame control, the row splits
// into pages (like flipping frames) — there's no scrollbar and no free
// scrolling. Chevron arrows on #frame-controls-wrap appear at whichever edge has
// more controls; clicking one pages to the next/previous set, snapping to a
// control boundary so each page starts on a whole control.
function updateFrameControlsArrows() {
  const sc = document.getElementById('frame-controls-container');
  const wrap = document.getElementById('frame-controls-wrap');
  if (!sc || !wrap) return;
  const maxScroll = sc.scrollWidth - sc.clientWidth;
  wrap.classList.toggle('overflow-left', sc.scrollLeft > 1);
  wrap.classList.toggle('overflow-right', maxScroll > 1 && sc.scrollLeft < maxScroll - 1);
}

(function setupFrameControlsPaging() {
  const sc = document.getElementById('frame-controls-container');
  if (!sc) return;
  // The scroll event fires during the programmatic page slide too, keeping the
  // arrow visibility in sync as the row moves.
  sc.addEventListener('scroll', updateFrameControlsArrows, { passive: true });
  window.addEventListener('resize', updateFrameControlsArrows);
  // The row's own width changes when the top bar reflows (window resize, auth
  // chip / version switcher toggling) — re-evaluate the arrows when it does.
  if (window.ResizeObserver) {
    new ResizeObserver(updateFrameControlsArrows).observe(sc);
  }
  // Page the row by one viewport toward the off-screen controls, snapping to a
  // control boundary so the new page starts on a whole control (not mid-button).
  const page = (dir) => {
    const scLeft = sc.getBoundingClientRect().left;
    const view = sc.clientWidth;
    const cur = sc.scrollLeft;
    const edges = [...sc.children]
      .filter((k) => k.nodeType === 1)
      .map((k) => {
        const left = k.getBoundingClientRect().left - scLeft + cur;
        return { left, right: left + k.offsetWidth };
      });
    let target = cur;
    if (dir > 0) {
      // First control whose right edge spills past this page → next page start.
      const next = edges.find((e) => e.right > cur + view + 1);
      if (next) target = next.left;
    } else {
      // Land so the controls ending at the current left edge fill one page.
      const first = edges.find((e) => cur - e.left <= view);
      target = first ? first.left : 0;
    }
    sc.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  };
  const arrowLeft = document.getElementById('frame-controls-arrow-left');
  const arrowRight = document.getElementById('frame-controls-arrow-right');
  if (arrowLeft) arrowLeft.addEventListener('click', () => page(-1));
  if (arrowRight) arrowRight.addEventListener('click', () => page(1));
  updateFrameControlsArrows();
})();

// ============================================================================
// Save / Load Project
// ============================================================================
// Build a .flow Blob + sidecar metadata (savedAt, suggestedName, exportState).
// Reused by both the menu Save (saveProjectAsFlow) and the cloud push.
async function buildFlowBlob(isTemplate = false) {
  if (typeof JSZip === 'undefined') throw new Error('JSZip is not loaded.');

  const zip = new JSZip();
  const exportState = JSON.parse(JSON.stringify(state));
  delete exportState.isTemplate;

  if (isTemplate) {
    exportState.isTemplate = true;
    delete exportState.history;
    delete exportState.historyIndex;
    delete exportState.projectId;
    delete exportState.cloudId;
    delete exportState.cloudFolder;

    exportState.selectedElementId = null;
    exportState.layerSelection = [];
    exportState.assetSelection = [];
    exportState.editingElementId = null;
    exportState.isolatedGroupId = null;
    exportState.activeSmartGuides = null;
    exportState.clipboard = null;
    exportState.previewMode = false;
    exportState.singlePreviewId = null;
    exportState.playState = 'paused';
    exportState.viewScrollLeft = 0;
    exportState.viewScrollTop = 0;
    exportState.zoom = 0.6;

    // Fix workspace preferences riding along
    delete exportState.favoriteAnimations;
    exportState.showRulers = true;
    exportState.showSafezones = false;
    exportState.snapEnabled = true;
    exportState.snapToElements = true;
    exportState.snapToCanvas = true;
    exportState.snapToGuides = true;
    exportState.cropToCanvas = false;
    exportState.loopAd = false;
    exportState.previewCurrentOnly = false;
    exportState.guides = [];
    exportState.activeSmartGuides = null;
    exportState.autosaveInterval = 10;
    exportState.savedHistoryLimit = 50;
    exportState.activeTool = 'select';
    exportState.assetLibrary = [];
    exportState.assetFolders = [];

    // Reset data-merge active state
    if (exportState.dataMerge) {
      exportState.dataMerge.activeVersion = null;
      exportState.dataMerge.locked = false;
      delete exportState.dataMerge.sort;
    }
  } else {
    exportState.editingElementId = null;
    if (document.getElementById('canvas-area')) {
      const ca = document.getElementById('canvas-area');
      exportState.viewScrollLeft = ca.scrollLeft;
      exportState.viewScrollTop = ca.scrollTop;
    }
    exportState.zoom = state.zoom || 0.6;
    if (!exportState.projectId) exportState.projectId = state.projectId = uid('proj_');

    const limit = state.savedHistoryLimit !== undefined ? state.savedHistoryLimit : 50;
    const capped = getCappedHistory(limit);
    exportState.history = capped.history;
    exportState.historyIndex = capped.historyIndex;

    const settings = (await _idbGet('settings')) || {};
    if (settings.saveHistoryInProject !== true) {
      delete exportState.history;
      delete exportState.historyIndex;
    }
  }

  const imgFolder = zip.folder('images');
  if (exportState.assets) {
    for (const [assetId, dataUrl] of Object.entries(exportState.assets)) {
      if (dataUrl && dataUrl.startsWith('data:image/')) {
        const parts = dataUrl.split(',');
        const b64Data = parts[1];
        const mimeType = parts[0].split(';')[0].split(':')[1];
        let ext = mimeType.split('/')[1];
        if (ext === 'jpeg') ext = 'jpg';
        if (ext === 'svg+xml') ext = 'svg';

        const filename = `${assetId}.${ext}`;
        imgFolder.file(filename, b64Data, { base64: true });
        exportState.assets[assetId] = `images/${filename}`;
      }
    }
  }

  const savedAt = new Date().toISOString();
  zip.file('meta.json', JSON.stringify({
    magic: 'adflow',
    version: 1,
    savedAt,
    projectName: state.projectName || 'RMIT_ad',
    projectId: exportState.projectId,
    isTemplate: !!isTemplate
  }, null, 2));
  zip.file('project.json', JSON.stringify(exportState, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const projName = (state.projectName || 'RMIT_ad').replace(/[^a-zA-Z0-9_-]/g, '_');
  const datePart = savedAt.slice(0, 10);
  const suggestedName = isTemplate 
    ? `${projName}.template.flow` 
    : `${projName}-${datePart}.flow`;
  return { blob, exportState, savedAt, suggestedName };
}

async function saveProjectAsFlow() {
  let built;
  try { built = await buildFlowBlob(); }
  catch (e) { alert(e.message || 'Save failed'); return; }
  const { blob, exportState, suggestedName } = built;

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        types: [{ description: 'Ad Flow Project', accept: { 'application/octet-stream': ['.flow'] } }],
        suggestedName
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      await addRecentProject(exportState);
      _fileSaveStatus = 'saved';
      _lastFileSaveTime = new Date();
      updateSaveStatusUI();
    } catch (e) { if (e.name !== 'AbortError') console.error('Save failed:', e); }
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(a.href);
    await addRecentProject(exportState);
    _fileSaveStatus = 'saved';
    _lastFileSaveTime = new Date();
    updateSaveStatusUI();
  }
}

async function saveTemplateAsFlow() {
  let built;
  try { built = await buildFlowBlob(true); }
  catch (e) { alert(e.message || 'Save failed'); return; }
  const { blob, exportState, suggestedName } = built;

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        types: [{ description: 'Ad Flow Template', accept: { 'application/octet-stream': ['.flow'] } }],
        suggestedName
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      showCanvasNotification('Template saved successfully', { type: 'success' });
      _fileSaveStatus = 'saved';
      _lastFileSaveTime = new Date();
      updateSaveStatusUI();
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Save failed:', e);
        showCanvasNotification('Failed to save template: ' + (e.message || e), { type: 'error' });
      }
    }
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(a.href);
    showCanvasNotification('Template saved successfully', { type: 'success' });
    _fileSaveStatus = 'saved';
    _lastFileSaveTime = new Date();
    updateSaveStatusUI();
  }
}

// Backwards-compat aliases — keyboard shortcuts and a few other places still reference
// the original name.
const saveProjectAsCook = saveProjectAsFlow;
const saveProjectToZip = saveProjectAsFlow;

async function addRecentProject(exportState) {
  try {
    const recents = (await _idbGet('recents')) || [];
    const projName = state.projectName || 'RMIT_ad';
    const filtered = recents.filter(r => r.name !== projName);
    filtered.unshift({
      name: projName,
      timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      updatedAtMs: Date.now(),
      stateSnapshot: JSON.parse(JSON.stringify(exportState))
    });
    const limited = filtered.slice(0, 10);
    await _idbPut('recents', limited);
    updateRecentProjectsMenu();
  } catch (err) {
    console.error('Failed to add recent project:', err);
  }
}

// Populate the Open Recent submenu with two sections — local recents
// (IndexedDB snapshots) and cloud projects (most-recent saves on
// Supabase). The cloud section only appears when the user is signed in
// and the Supabase client is available. Called after each save and on
// hover of the "Open Recent" parent menu item so the cloud list stays
// fresh as the user signs in/out.
async function clearRecentProjects() {
  if (!confirm('Clear recent list and keep only the latest project for each category?')) return;
  
  // 1. Clear local
  try {
    const recents = (await _idbGet('recents')) || [];
    if (recents.length > 1) {
      await _idbPut('recents', [recents[0]]);
    }
  } catch (err) {
    console.error('Failed to clear local recents:', err);
  }

  // 2. Clear cloud (only store cleared-at timestamp in localStorage, no database deletions)
  localStorage.setItem('cloud-recents-cleared-at', Date.now().toString());

  showCanvasNotification('Recent list cleared.', { type: 'success' });
  updateRecentProjectsMenu();
}

// Populate the Open Recent submenu with two sections — local recents
// (IndexedDB snapshots) and cloud projects (most-recent saves on
// Supabase). The cloud section only appears when the user is signed in
// and the Supabase client is available. Called after each save and on
// hover of the "Open Recent" parent menu item so the cloud list stays
// fresh as the user signs in/out.
async function updateRecentProjectsMenu() {
  const container = document.getElementById('recent-projects-list');
  if (!container) return;
  container.innerHTML = '';

  // --- Header helpers (kept inside so they capture `container`) ----
  const appendSectionHeader = (label) => {
    const h = document.createElement('div');
    h.style.cssText = 'padding:4px 16px; font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:.05em;';
    h.textContent = label;
    container.appendChild(h);
  };
  const appendDivider = () => {
    const d = document.createElement('div');
    d.className = 'dropdown-divider';
    container.appendChild(d);
  };
  const appendEmpty = (text) => {
    const empty = document.createElement('div');
    empty.className = 'dropdown-item';
    empty.style.cssText = 'color:var(--text-muted); cursor:default; pointer-events:none; padding:6px 16px;';
    empty.textContent = text;
    container.appendChild(empty);
  };
  const appendItem = (label, sub, onClick) => {
    const el = document.createElement('div');
    el.className = 'dropdown-item';
    el.style.cssText = 'display:flex; flex-direction:column; align-items:flex-start; gap:2px; padding:6px 16px; line-height:1.3;';
    const name = document.createElement('div');
    name.style.cssText = 'font-weight:500; color:inherit;';
    name.textContent = label;
    const date = document.createElement('div');
    date.style.cssText = 'font-size:9px; color:var(--text-muted); transition:color 0.2s;';
    date.textContent = sub;
    el.appendChild(name);
    el.appendChild(date);
    el.addEventListener('mouseenter', () => { date.style.color = '#e0e0e0'; });
    el.addEventListener('mouseleave', () => { date.style.color = 'var(--text-muted)'; });
    el.addEventListener('click', onClick);
    container.appendChild(el);
  };

  // --- 1. Fetch Local Recents (IndexedDB) --------------------------
  let localRecents = [];
  try {
    localRecents = (await _idbGet('recents')) || [];
  } catch (e) {
    console.error('Failed to load local recents:', e);
  }

  // --- 2. Fetch Cloud projects (Supabase) if user is signed in ------
  let cloudData = null;
  const authReady = typeof authState !== 'undefined' && authState.enabled && typeof sb !== 'undefined' && sb;
  const user = authReady ? authState.currentUser() : null;
  if (authReady && user) {
    try {
      const { data, error } = await sb
        .from('projects')
        .select('id, name, updated_at, storage_path, space_id, folder_id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);
      if (!error) {
        // Filter out cloud projects older than cloud-recents-cleared-at
        // except the very latest one (which is data[0])
        const clearedAt = parseInt(localStorage.getItem('cloud-recents-cleared-at') || '0', 10);
        let filtered = [];
        if (data && data.length > 0) {
          filtered.push(data[0]);
          for (let i = 1; i < data.length; i++) {
            const projTime = Date.parse(data[i].updated_at);
            if (isNaN(projTime) || projTime >= clearedAt) {
              filtered.push(data[i]);
            }
          }
        }
        cloudData = filtered;
      }
    } catch (e) {
      console.error('Failed to load cloud projects:', e);
    }
  }

  // Helpers to retrieve timestamp values for ordering comparison
  const getLocalTime = (item) => {
    if (!item) return 0;
    if (item.updatedAtMs) return item.updatedAtMs;
    const parsed = Date.parse(item.timestamp);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getCloudTime = (row) => {
    if (!row || !row.updated_at) return 0;
    const parsed = Date.parse(row.updated_at);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Render logic for local section
  const renderLocalSection = () => {
    appendSectionHeader('Local');
    if (localRecents.length === 0) {
      appendEmpty('(No recent local projects)');
    } else {
      localRecents.forEach(item => {
        appendItem(item.name, item.timestamp, async () => {
          if (confirm(`Open recent project "${item.name}"? Any unsaved changes will be lost.`)) {
            await loadProjectFromState(item.stateSnapshot);
          }
        });
      });
    }
  };

  // Render logic for cloud section
  const renderCloudSection = () => {
    appendSectionHeader('Cloud');
    if (cloudData === null) {
      appendEmpty('(Failed to load cloud projects)');
    } else if (cloudData.length === 0) {
      appendEmpty('(No cloud projects yet)');
    } else {
      const fmt = (iso) => {
        if (!iso) return '';
        if (typeof _formatRelativeTime === 'function') {
          try { return _formatRelativeTime(iso); } catch (_) { /* fall through */ }
        }
        try {
          return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (_) { return ''; }
      };
      cloudData.forEach(row => {
        appendItem(row.name || '(untitled)', fmt(row.updated_at), async () => {
          if (!confirm(`Open cloud project "${row.name || 'untitled'}"? Any unsaved changes will be lost.`)) return;
          if (typeof pullCloudProject !== 'function') {
            showCanvasNotification('Cloud open not available.', { type: 'error' });
            return;
          }
          try { await pullCloudProject(row); }
          catch (err) { showCanvasNotification(`Open failed: ${err.message || err}`, { type: 'error' }); }
        });
      });
    }
  };

  // --- 3. Determine Ordering & Render -------------------------------
  const latestLocalTime = localRecents.length > 0 ? getLocalTime(localRecents[0]) : 0;
  const latestCloudTime = (cloudData && cloudData.length > 0) ? getCloudTime(cloudData[0]) : 0;

  if (cloudData !== null) {
    if (latestCloudTime > latestLocalTime) {
      // Cloud is latest, render Cloud on top
      renderCloudSection();
      appendDivider();
      renderLocalSection();
    } else {
      // Local is latest, render Local on top
      renderLocalSection();
      appendDivider();
      renderCloudSection();
    }
  } else {
    // Only local rendered (signed out)
    renderLocalSection();
  }

  // --- 4. Toggle main menu "Clear Recent" visibility -----------------
  // Configured to remain permanently visible per user request
}

async function loadProjectFromState(loadedState) {
  state.selectedElementId = null;
  state.layerSelection = [];
  state.editingElementId = null;
  state.isolatedGroupId = null;

  // Extract history data and clean loadedState to prevent polluting global state
  let restoredHistory = null;
  let restoredHistoryIndex = -1;
  if (loadedState.history) {
    restoredHistory = loadedState.history;
    restoredHistoryIndex = loadedState.historyIndex;
    loadedState = JSON.parse(JSON.stringify(loadedState));
    delete loadedState.history;
    delete loadedState.historyIndex;
  }

  loadedState = JSON.parse(JSON.stringify(loadedState));
  delete loadedState.isTemplate;

  Object.assign(state, loadedState);
  delete state.isTemplate;
  if (!state.projectId) state.projectId = uid('proj_');

  // Re-home legacy centre-anchored layouts onto the smaller board.
  const positionsMigrated = normalizeCanvasPositions();

  await syncRmitAssets();
  setLocalSaveStatus('saved');
  initializeCloudSaveStatus();

  if (!positionsMigrated && restoredHistory && Array.isArray(restoredHistory) && restoredHistory.length > 0) {
    history.length = 0;
    history.push(...restoredHistory);
    historyIndex = restoredHistoryIndex !== undefined ? restoredHistoryIndex : history.length - 1;
  } else {
    history.length = 0;
    historyIndex = -1;
    pushHistory();
  }

  render();
  // Startup view: always centered. initApp() owns the scroll + resume toast.
}

// Shared inflater used by the menu Open dialog AND the drag-drop overlay. Both
// formats — modern .flow and legacy .cook/.zip — share the same internal structure.
async function loadProjectFromBlob(file, customProjectName, existingProgress = null, customCompressFormat = null) {
  const progress = existingProgress || showLoadingProgress('Opening Project...');
  try {
    progress.setProgress(10, 'Reading file structure...');
    if (typeof JSZip === 'undefined') throw new Error('JSZip is not loaded.');
    const zip = await JSZip.loadAsync(file);
    
    progress.setProgress(20, 'Reading configuration...');
    const projFile = zip.file('project.json');
    if (!projFile) throw new Error('Invalid project file (missing project.json)');
  
    const jsonStr = await projFile.async('string');
    const loadedState = JSON.parse(jsonStr);
  
    // Extract history data and clean loadedState to prevent polluting global state
    let restoredHistory = null;
    let restoredHistoryIndex = -1;
    if (loadedState.history) {
      restoredHistory = loadedState.history;
      restoredHistoryIndex = loadedState.historyIndex;
      delete loadedState.history;
      delete loadedState.historyIndex;
    }
  
    // Check if this file is a template
    let isTemplateFile = false;
    if (loadedState.isTemplate === true) {
      isTemplateFile = true;
    } else {
      const metaFile = zip.file('meta.json');
      if (metaFile) {
        try {
          const metaStr = await metaFile.async('string');
          const meta = JSON.parse(metaStr);
          if (meta.isTemplate === true) {
            isTemplateFile = true;
          }
        } catch (e) {
          console.warn('Failed to parse meta.json in loadProjectFromBlob:', e);
        }
      }
    }
  
    // Clean template-related state and environment preferences from loadedState
    if (isTemplateFile) {
      delete loadedState.isTemplate;
      delete loadedState.favoriteAnimations;
      delete loadedState.showRulers;
      delete loadedState.showSafezones;
      delete loadedState.snapEnabled;
      delete loadedState.snapToElements;
      delete loadedState.snapToCanvas;
      delete loadedState.snapToGuides;
      delete loadedState.cropToCanvas;
      delete loadedState.loopAd;
      delete loadedState.previewCurrentOnly;
      delete loadedState.guides;
      delete loadedState.activeSmartGuides;
      delete loadedState.autosaveInterval;
      delete loadedState.savedHistoryLimit;
      delete loadedState.activeTool;
      delete loadedState.assetLibrary;
      delete loadedState.assetFolders;
      if (loadedState.dataMerge) {
        loadedState.dataMerge.activeVersion = null;
        loadedState.dataMerge.locked = false;
        delete loadedState.dataMerge.sort;
      }
    }
  
    const newAssets = {};
    if (loadedState.assets) {
      const entries = Object.entries(loadedState.assets);
      const total = entries.length;
      let count = 0;
      for (const [assetId, path] of entries) {
        count++;
        const percent = 30 + Math.round((count / total) * 60);
        progress.setProgress(percent, `Extracting asset ${count} of ${total}...`);
        if (path.startsWith('images/')) {
          const imgFile = zip.file(path);
          if (imgFile) {
            const base64 = await imgFile.async('base64');
            const ext = path.split('.').pop();
            const mime = ext === 'jpg' ? 'jpeg' : (ext === 'svg' ? 'svg+xml' : ext);
            newAssets[assetId] = `data:image/${mime};base64,${base64}`;
          }
        } else {
          newAssets[assetId] = path;
        }
      }
    }
    const savedLeft = isTemplateFile ? undefined : loadedState.viewScrollLeft;
    const savedTop = isTemplateFile ? undefined : loadedState.viewScrollTop;
    const savedZoom = isTemplateFile ? undefined : loadedState.zoom;
  
    progress.setProgress(95, 'Syncing application assets...');
    Object.assign(state, loadedState);
    delete state.isTemplate; // Always ensure isTemplate is removed at runtime
  
    if (customCompressFormat) {
      state.compressFormat = customCompressFormat;
    }
    if (customProjectName) {
      state.projectName = customProjectName;
    }
    if (!isTemplateFile && state.favoriteAnimations) {
      localStorage.setItem('favoriteAnimations', JSON.stringify(state.favoriteAnimations));
    }
    state.zoom = 1.0;
    state.assets = newAssets || {};
    if (!state.projectId) state.projectId = uid('proj_');
    // Re-home legacy centre-anchored layouts onto the smaller board.
    const positionsMigrated = normalizeCanvasPositions();
    await syncRmitAssets();
    setLocalSaveStatus('saved');
    initializeCloudSaveStatus();
    _fileSaveStatus = 'saved';
    _lastFileSaveTime = new Date();
  
    if (!positionsMigrated && restoredHistory && Array.isArray(restoredHistory) && restoredHistory.length > 0) {
      history.length = 0;
      history.push(...restoredHistory);
      historyIndex = restoredHistoryIndex !== undefined ? restoredHistoryIndex : history.length - 1;
    } else {
      history.length = 0;
      historyIndex = -1;
      pushHistory();
    }
  
    render();
    progress.setProgress(100, 'Done!');
    setTimeout(() => {
      progress.close();
    }, 300);
  
    // Open Project: drop into the canvas-centered view, then offer to restore
    // wherever the user last left off.
    setTimeout(() => {
      centerWorkspace('instant');
      offerResumeView(savedLeft, savedTop, savedZoom);
    }, 10);
  } catch (err) {
    progress.close();
    throw err;
  }
}

async function openProjectFromZip() {
  let file;
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Ad Flow Project', accept: { 'application/octet-stream': ['.flow', '.cook', '.zip'] } }]
      });
      file = await handle.getFile();
    } catch (e) { if (e.name !== 'AbortError') console.error('Open failed:', e); return; }
  } else {
    file = await new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.flow,.cook,.zip';
      input.onchange = e => resolve(e.target.files[0]);
      input.click();
    });
    if (!file) return;
  }
  try {
    await loadProjectFromBlob(file);
  } catch (err) {
    console.error(err);
    alert('Failed to load project. Ensure it is a valid .flow or .cook file.');
  }
}

// ============================================================================
// Menu wiring
// ============================================================================
document.getElementById('frame-select').addEventListener('change', (e) => {
  state.activeFrameId = parseInt(e.target.value);
  deselectNonPersistentLayers();
  render();
});

document.getElementById('btn-prev-frame').addEventListener('click', () => {
  const idx = state.frames.findIndex(f => f.id === state.activeFrameId);
  if (idx > 0) {
    state.activeFrameId = state.frames[idx - 1].id;
    deselectNonPersistentLayers();
    render();
  }
});

document.getElementById('btn-next-frame').addEventListener('click', () => {
  const idx = state.frames.findIndex(f => f.id === state.activeFrameId);
  if (idx < state.frames.length - 1) {
    state.activeFrameId = state.frames[idx + 1].id;
    deselectNonPersistentLayers();
    render();
  }
});

document.getElementById('btn-add-frame').addEventListener('click', () => {
  const newId = Math.max(...state.frames.map(f => f.id), 0) + 1;
  state.frames.push({ id: newId, duration: 2 });
  state.activeFrameId = newId;
  deselectNonPersistentLayers();
  pushHistory();
  render();
});

document.getElementById('btn-remove-frame').addEventListener('click', () => {
  if (state.frames.length <= 1) return;
  const idx = state.frames.findIndex(f => f.id === state.activeFrameId);
  state.frames.splice(idx, 1);
  state.activeFrameId = state.frames[Math.max(0, idx - 1)].id;
  if (state.frames.length === 1) {
    state.frames[0].skip = false;
  }

  state.canvases.forEach(c => {
    c.elements = c.elements.filter(e => e.persistent !== false || state.frames.some(f => f.id === e.frameId));
  });

  deselectNonPersistentLayers();
  pushHistory();
  render();
});
document.getElementById('btn-skip-frame').addEventListener('click', () => {
  const currentFrame = state.frames.find(f => f.id === state.activeFrameId);
  if (currentFrame) {
    if (state.frames.length <= 1) return;
    const wasSkipped = !!currentFrame.skip;
    
    // Enforce at most one skipped frame by unskipping all other frames
    state.frames.forEach(f => {
      f.skip = false;
    });
    
    // Toggle active frame skip
    currentFrame.skip = !wasSkipped;
    
    pushHistory();
    render();
  }
});

document.getElementById('frame-duration').addEventListener('input', (e) => {
  const f = state.frames.find(x => x.id === state.activeFrameId);
  if (f) {
    f.duration = parseFloat(e.target.value) || 2;
    render();
  }
});
document.getElementById('frame-duration').addEventListener('change', () => pushHistory());

document.getElementById('menu-file-open').addEventListener('click', openProjectFromZip);
document.getElementById('menu-file-save-browser').addEventListener('click', async () => {
  if (_autosaveTimer) {
    clearTimeout(_autosaveTimer);
    _autosaveTimer = null;
  }
  await writeAutosave();
  showCanvasNotification('Project saved to browser', { type: 'success' });
});
document.getElementById('menu-file-save-file').addEventListener('click', saveProjectToZip);
document.getElementById('menu-file-save-template').addEventListener('click', saveTemplateAsFlow);
document.getElementById('menu-file-new').addEventListener('click', openNewProjectDialog);
document.getElementById('menu-project-settings').addEventListener('click', openProjectSettingsDialog);

const _clearRecentBtn = document.getElementById('menu-file-clear-recent');
if (_clearRecentBtn) {
  _clearRecentBtn.addEventListener('click', async () => {
    await clearRecentProjects();
  });
}

// Refresh the Open Recent submenu when the user hovers it. Keeps the
// Cloud section in sync with the live auth state — signing in mid-session
// adds the Cloud section on the next hover without needing a save.
const _menuFileRecent = document.getElementById('menu-file-recent');
if (_menuFileRecent) {
  _menuFileRecent.addEventListener('mouseenter', () => {
    // Fire-and-forget; the function already guards its own DOM updates.
    updateRecentProjectsMenu();
  });
}

// Project name display and setting modal triggers
(function() {
  let projectClickTimeout = null;
  const projectMeta = document.getElementById('project-meta-container');
  const projectNameDisp = document.getElementById('project-name-display');

  if (projectMeta && projectNameDisp) {
    projectMeta.addEventListener('click', (e) => {
      if (projectNameDisp.contentEditable === 'true') return;
      if (e.target.tagName === 'INPUT') return;

      if (projectClickTimeout) {
        clearTimeout(projectClickTimeout);
        projectClickTimeout = null;
      } else {
        projectClickTimeout = setTimeout(() => {
          projectClickTimeout = null;
          openProjectSettingsDialog();
        }, 220);
      }
    });

    projectMeta.addEventListener('dblclick', (e) => {
      if (projectClickTimeout) {
        clearTimeout(projectClickTimeout);
        projectClickTimeout = null;
      }
      e.stopPropagation();
      startRenameProject();
    });
  }
})();

function startRenameProject() {
  const disp = document.getElementById('project-name-display');
  if (!disp) return;

  disp.contentEditable = 'true';
  disp.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(disp);
  selection.removeAllRanges();
  selection.addRange(range);

  const originalName = state.projectName || 'RMIT_ad';

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      disp.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      disp.innerText = originalName;
      disp.blur();
    }
  };

  const onBlur = () => {
    disp.contentEditable = 'false';
    disp.removeEventListener('keydown', onKeyDown);
    const newName = disp.innerText.trim();
    if (newName && newName !== originalName) {
      state.projectName = newName;
      pushHistory();
      render();
    } else {
      disp.innerText = originalName;
    }
  };

  disp.addEventListener('keydown', onKeyDown);
  disp.addEventListener('blur', onBlur, { once: true });
}

const defaultFallbackFiles = [
  'Asset (1).jpg',
  'Asset (2).jpg',
  'image.jpg'
];

async function fetchAssetFilenames() {
  // Prefer the committed manifest — generated by scripts/build-asset-manifest.js
  // on Netlify build, so dropping a file into data/assets/ reflects on deploy.
  try {
    const r = await fetch('data/assets/manifest.json');
    if (r.ok) {
      const list = await r.json();
      if (Array.isArray(list) && list.length > 0) {
        const cleaned = list.filter(f => typeof f === 'string' && f.trim());
        if (cleaned.length > 0) return cleaned;
      }
    }
  } catch (e) {}

  // Fallback: scrape a directory listing (works on python -m http.server, etc.)
  try {
    const response = await fetch('data/assets/');
    if (response.ok) {
      const html = await response.text();
      const regex = /href=["']?([^"'>]+?\.(?:jpg|jpeg|png|gif|svg|webp))["']?/gi;
      const files = new Set();
      let match;
      while ((match = regex.exec(html)) !== null) {
        try {
          const decoded = decodeURIComponent(match[1]);
          const filename = decoded.split('/').pop();
          if (filename && filename.trim()) {
            files.add(filename.trim());
          }
        } catch (e) {}
      }
      if (files.size > 0) return Array.from(files);
    }
  } catch (e) {}

  return defaultFallbackFiles;
}

async function syncRmitAssets() {
  const rmitFolderId = 'af_rmit';
  
  if (!state.assetFolders) state.assetFolders = [];
  let rmitFolder = state.assetFolders.find(f => f.id === rmitFolderId);
  if (!rmitFolder) {
    rmitFolder = {
      id: rmitFolderId,
      name: 'RMIT',
      collapsed: false,
      readOnly: true
    };
    state.assetFolders.push(rmitFolder);
  }
  
  const filenames = await fetchAssetFilenames();
  
  if (!state.assetLibrary) state.assetLibrary = [];
  if (!state.assets) state.assets = {};
  
  const nonRmitLibrary = state.assetLibrary.filter(a => a.folderId !== rmitFolderId);

  // Fetch all RMIT assets in parallel — sequential awaits used to add N× RTT
  // on cold Netlify loads. Preserve manifest order in the final library.
  const results = await Promise.all(filenames.map(async (filename) => {
    const assetId = 'as_rmit_' + filename;
    const imgId = 'img_rmit_' + filename;
    const url = 'data/assets/' + encodeURIComponent(filename);
    const displayName = filename.substring(0, filename.lastIndexOf('.')) || filename;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
      });
      const { naturalW, naturalH } = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ naturalW: img.naturalWidth || 120, naturalH: img.naturalHeight || 90 });
        img.onerror = () => resolve({ naturalW: 120, naturalH: 90 });
        img.src = dataUrl;
      });
      return {
        imgId,
        dataUrl,
        entry: {
          id: assetId,
          name: displayName,
          kind: 'element',
          iconType: 'image',
          folderId: rmitFolderId,
          elements: [
            {
              id: uid(),
              type: 'image',
              name: filename,
              assetId: imgId,
              width: naturalW,
              height: naturalH,
              x: 0,
              y: 0
            }
          ]
        }
      };
    } catch (err) {
      console.error('Failed to preload RMIT asset:', url, err);
      return null;
    }
  }));

  const rmitLibrary = [];
  for (const r of results) {
    if (!r) continue;
    state.assets[r.imgId] = r.dataUrl;
    rmitLibrary.push(r.entry);
  }

  state.assetLibrary = [...nonRmitLibrary, ...rmitLibrary];
}

// ============================================================================
// New Project dialog
// ============================================================================
// Builds a fresh project from picked canvas presets (all checked by default),
// a name, an ad-size limit (KB) and a default canvas background. Replaces the
// working state and lets the normal autosave persist it.
async function createNewProject({ name, presetIndices, sizeLimitKb, bgColor, clickTag, compressFormat }) {
  const bg = bgColor || '#0f172a';
  
  let currentX = BOARD_MARGIN;
  let currentY = BOARD_MARGIN;
  let rowMaxHeight = 0;
  const maxRowWidth = 1400;

  const canvases = presetIndices.map((pi, i) => {
    const preset = PRESET_SIZES[pi];
    const c = seedCanvas(preset, i);
    c.bgColor = bg;
    
    c.workspaceX = currentX;
    c.workspaceY = currentY;
    
    currentX += preset.width + 60;
    rowMaxHeight = Math.max(rowMaxHeight, preset.height);
    
    if (i < presetIndices.length - 1) {
      const nextPreset = PRESET_SIZES[presetIndices[i + 1]];
      if (currentX + nextPreset.width - BOARD_MARGIN > maxRowWidth) {
        currentX = BOARD_MARGIN;
        currentY += rowMaxHeight + 60;
        rowMaxHeight = 0;
      }
    }
    
    c.elements = [];
    
    return c;
  });

  // Center the whole canvas group on the board so a new project opens with
  // even breathing room on every side, rather than pinned to the top-left
  // margin where the layout was built.
  if (canvases.length) {
    let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
    canvases.forEach(c => {
      if (c.workspaceX < gMinX) gMinX = c.workspaceX;
      if (c.workspaceY < gMinY) gMinY = c.workspaceY;
      if (c.workspaceX + c.width > gMaxX) gMaxX = c.workspaceX + c.width;
      if (c.workspaceY + c.height > gMaxY) gMaxY = c.workspaceY + c.height;
    });
    const dx = Math.round(BOARD_SIZE / 2 - (gMinX + gMaxX) / 2);
    const dy = Math.round(BOARD_SIZE / 2 - (gMinY + gMaxY) / 2);
    canvases.forEach(c => { c.workspaceX += dx; c.workspaceY += dy; });
  }

  state.projectName = (name || 'RMIT_ad').trim() || 'RMIT_ad';
  state.projectId = uid('proj_');
  state.clickTag = (clickTag || 'https://www.rmit.edu.au/').trim();
  state.adSizeLimit = Math.max(1, parseInt(sizeLimitKb, 10) || 150);
  state.defaultBg = bg;
  if (compressFormat) {
    state.compressFormat = compressFormat;
  }
  state.canvases = canvases;
  state.activeCanvasId = canvases[0] ? canvases[0].id : null;
  state.frames = [{ id: 1, duration: 2 }];
  state.activeFrameId = 1;
  state.selectedElementId = null;
  state.layerSelection = [];
  state.editingElementId = null;
  state.isolatedGroupId = null;
  state.guides = [];
  state.clipboard = null;
  // Reset assets panel
  state.assetLibrary = [];
  state.assetFolders = [];
  state.assets = state.assets && state.assets.rmit_logo ? { rmit_logo: state.assets.rmit_logo } : {};
  state.compressedAssetsMap = {};

  await syncRmitAssets();
  state.dataMerge = {
    enabled: false,
    columns: [],
    rows: [],
    keyColumn: null,
    activeVersion: null,
    locked: false,
    mappings: {},
    skipHeaders: false
  };
  state.zoom = 1.0;

  history.length = 0;
  historyIndex = -1;
  pushHistory();
  render();
  setTimeout(() => {
    const ca = document.getElementById('canvas-area');
    if (ca && ca.scrollTo && state.canvases.length > 0) {
      const { x, y } = allCanvasesCenter();
      const z = state.zoom || 0.6;
      const targetScrollLeft = Math.max(0, x * z - ca.clientWidth / 2);
      const targetScrollTop = Math.max(0, y * z - ca.clientHeight / 2);
      ca.scrollTo({ left: targetScrollLeft, top: targetScrollTop, behavior: 'instant' });
    } else if (ca && ca.scrollTo) {
      ca.scrollTo({ left: BOARD_MARGIN, top: BOARD_MARGIN, behavior: 'instant' });
    }
  }, 50);
}

function openNewProjectDialog() {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';

  const presetRows = PRESET_SIZES.map((p, i) => `
    <label class="np-row" style="display:flex; align-items:center; gap:10px; padding:7px 10px; border-radius:6px; cursor:pointer;" title="Toggle canvas size ${p.width} × ${p.height}">
      <input type="checkbox" class="np-canvas" data-idx="${i}" checked style="margin:0;" title="Toggle canvas size ${p.width} × ${p.height}" />
      <span style="font-size:12px; color:var(--text-main);">${p.name}</span>
      <span style="font-size:11px; color:var(--text-muted); margin-left:auto;">${p.width} × ${p.height}</span>
    </label>`).join('');

  let selectedLocalTemplateBlob = null;
  let selectedLocalTemplateName = '';

  bg.innerHTML = `
    <div class="modal" style="max-width:480px;">
      <div class="modal-head">
        <h2>New Project</h2>
        <button class="btn" id="np-close" title="Close dialog">Close</button>
      </div>
      <div class="modal-body" style="display:flex; flex-direction:column; gap:16px; padding:18px 22px;">
        <!-- Template mode checkbox and selection -->
        <div style="border-bottom: 1px solid var(--border-light); padding-bottom: 12px; margin-bottom: 4px; display:flex; flex-direction:column; gap:8px;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; font-weight:600; color:var(--text-bright); user-select:none;" title="If checked, initializes the project with a template.">
            <input type="checkbox" id="np-use-startup-template" ${localStorage.getItem('adflow-startup-mode') !== 'fresh' ? 'checked' : ''} style="margin:0;" />
            <span>Use template</span>
          </label>
          <div id="np-template-container" style="display:flex; gap:8px; align-items:center;">
            <select id="np-startup-template-select" style="flex:1; min-width:0; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:6px; padding:7px 9px; font-size:12px; outline:none; cursor:pointer;">
              <!-- populated dynamically -->
            </select>
            <button class="btn" id="np-rescan-templates-btn" title="Re-scan Startup folder templates" style="padding:7px 10px; font-size:12px;">↻</button>
            <button class="btn" id="np-browse-template-btn" style="padding:7px 12px; font-size:12px; white-space:nowrap;">Browse...</button>
            <input type="file" id="np-local-template-file" accept=".flow" style="display:none;" />
          </div>
          <div id="np-local-template-status" style="font-size:11px; color:var(--text-accent); display:none; align-items:center; gap:6px;">
            <span>Selected local template:</span>
            <span id="np-local-template-name" style="font-weight:600; color:var(--text-bright);"></span>
            <button class="btn ghost icon" id="np-clear-local-template-btn" title="Clear local template selection" style="padding:2px 4px; font-size:10px; line-height:1;">&times;</button>
          </div>
        </div>

        <div>
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Project name</label>
          <input type="text" id="np-name" value="RMIT_ad" title="Enter the name for the new project" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:6px; padding:7px 9px; font-size:12px; outline:none;" />
        </div>

        <div>
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Auto-compression Format</label>
          <select id="np-compress-format" title="Auto-compression output format: JPEG/PNG (ad-server safe) or WebP" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:6px; padding:7px 9px; font-size:12px; outline:none; cursor:pointer;">
            <option value="jpeg" ${state.compressFormat !== 'webp' ? 'selected' : ''}>JPEG / PNG (auto — ad-server safe)</option>
            <option value="webp" ${state.compressFormat === 'webp' ? 'selected' : ''}>WebP (smallest files)</option>
          </select>
        </div>

        <div id="np-custom-config-container" style="display:flex; flex-direction:column; gap:16px; transition: opacity 0.2s;">
          <div>
            <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">ClickTag URL</label>
            <input type="url" id="np-clicktag" value="${(state.clickTag || 'https://www.rmit.edu.au/').replace(/"/g, '&quot;')}" title="Default exit/landing page URL for all canvases" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:6px; padding:7px 9px; font-size:12px; outline:none;" />
          </div>
          <div>
            <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:flex; justify-content:space-between; margin-bottom:6px;">
              <span>Canvases</span>
              <span id="np-canvas-toggle" style="cursor:pointer; color:var(--text-accent); text-transform:none; letter-spacing:0;" title="Select or deselect all preset canvas sizes">Toggle all</span>
            </label>
            <div style="border:1px solid var(--border-light); border-radius:6px; padding:4px;">${presetRows}</div>
          </div>
          <div style="display:flex; gap:14px;">
            <div style="flex:1;">
              <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Max ad size (KB)</label>
              <input type="number" id="np-size-limit" value="${state.adSizeLimit || 150}" min="1" title="Target file size limit for export warning / Ads Validator (KB)" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:6px; padding:7px 9px; font-size:12px; outline:none;" />
            </div>
            <div style="flex:1;">
              <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Default background</label>
              <div style="display:flex; align-items:center; gap:8px;">
                <button class="cp-trigger" data-k="np-bg" id="np-bg" title="Choose default canvas background color" style="width:36px; height:32px; padding:0; border:1px solid var(--border-light); border-radius:6px; background:${(state.defaultBg || '#0f172a')}; cursor:pointer; outline:none; flex-shrink:0;"></button>
                <input type="text" id="np-bg-hex" data-k="np-bg" value="${(state.defaultBg || '#0f172a').replace(/^#/, '').toUpperCase()}" maxlength="6" title="Hex color code for canvas background" style="flex:1; min-width:0; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:6px; padding:7px 9px; font-size:12px; outline:none; text-transform:uppercase;" />
              </div>
            </div>
          </div>
        </div>
        <p style="margin:0; font-size:11px; color:var(--text-muted); line-height:1.5;">This replaces your current project. Your existing work is auto-saved — save a <strong>.flow</strong> file first if you want a separate backup.</p>
      </div>
      <div class="modal-foot">
        <button class="btn" id="np-cancel" title="Cancel and keep current project">Cancel</button>
        <button class="btn primary" id="np-create" title="Create a new project with the selected configurations">Create Project</button>
      </div>
    </div>`;

  document.body.appendChild(bg);

  const closeFn = () => {
    if (typeof closeColorPicker === 'function') closeColorPicker();
    bg.remove();
    document.removeEventListener('keydown', escHandler);
  };
  const escHandler = (e) => { if (e.key === 'Escape') closeFn(); };
  document.addEventListener('keydown', escHandler);
  bg.querySelector('#np-close').onclick = closeFn;
  bg.querySelector('#np-cancel').onclick = closeFn;
  bg.onclick = (e) => { if (e.target === bg) closeFn(); };

  // Startup template checkbox change logic
  const chkUseStartup = bg.querySelector('#np-use-startup-template');
  const selectTemplate = bg.querySelector('#np-startup-template-select');
  const customConfigContainer = bg.querySelector('#np-custom-config-container');
  const btnBrowse = bg.querySelector('#np-browse-template-btn');
  const btnRescan = bg.querySelector('#np-rescan-templates-btn');
  const fileInput = bg.querySelector('#np-local-template-file');
  const localStatus = bg.querySelector('#np-local-template-status');
  const localName = bg.querySelector('#np-local-template-name');
  const btnClearLocal = bg.querySelector('#np-clear-local-template-btn');

  const currentPref = localStorage.getItem('adflow-startup-mode') || 'fresh';
  const activeTemplate = currentPref !== 'fresh' ? currentPref : 'Adflow_startup.flow';

  if (Array.isArray(startupTemplates) && startupTemplates.length > 0) {
    selectTemplate.innerHTML = startupTemplates.map(t => {
      const selected = t.fileName === activeTemplate || (activeTemplate === 'startup' && t.fileName === 'Adflow_startup.flow');
      return `<option value="${t.fileName}" ${selected ? 'selected' : ''}>${t.projectName} (${t.fileName})</option>`;
    }).join('');
  } else {
    selectTemplate.innerHTML = `<option value="Adflow_startup.flow" selected>RMIT_ad (Adflow_startup.flow)</option>`;
  }

  const updateFieldsVisibility = () => {
    const useStartup = chkUseStartup.checked;
    if (useStartup) {
      bg.querySelector('#np-template-container').style.display = 'flex';
      if (selectedLocalTemplateBlob) {
        localStatus.style.display = 'flex';
      } else {
        localStatus.style.display = 'none';
      }
      customConfigContainer.style.opacity = '0.4';
      customConfigContainer.style.pointerEvents = 'none';
    } else {
      bg.querySelector('#np-template-container').style.display = 'none';
      localStatus.style.display = 'none';
      customConfigContainer.style.opacity = '1';
      customConfigContainer.style.pointerEvents = 'auto';
    }
  };

  btnBrowse.onclick = () => {
    fileInput.click();
  };

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (typeof JSZip === 'undefined') throw new Error('JSZip is not loaded.');
      const zip = await JSZip.loadAsync(file);
      
      let isTemplate = false;
      const projFile = zip.file('project.json');
      if (projFile) {
        const jsonStr = await projFile.async('string');
        const loadedState = JSON.parse(jsonStr);
        if (loadedState.isTemplate === true) {
          isTemplate = true;
        }
      }
      
      if (!isTemplate) {
        const metaFile = zip.file('meta.json');
        if (metaFile) {
          const metaStr = await metaFile.async('string');
          const meta = JSON.parse(metaStr);
          if (meta.isTemplate === true) {
            isTemplate = true;
          }
        }
      }

      if (!isTemplate) {
        showCanvasNotification('Selected file is not a valid template (missing template metadata).', { type: 'error' });
        fileInput.value = '';
        return;
      }

      selectedLocalTemplateBlob = file;
      selectedLocalTemplateName = file.name;
      localName.textContent = file.name;
      localStatus.style.display = 'flex';
      
      selectTemplate.disabled = true;
      selectTemplate.style.opacity = '0.5';
    } catch (err) {
      console.error(err);
      showCanvasNotification('Failed to read template file: ' + err.message, { type: 'error' });
      fileInput.value = '';
    }
  };

  const clearLocalSelection = () => {
    selectedLocalTemplateBlob = null;
    selectedLocalTemplateName = '';
    localName.textContent = '';
    localStatus.style.display = 'none';
    fileInput.value = '';
    selectTemplate.disabled = false;
    selectTemplate.style.opacity = '1';
  };

  btnClearLocal.onclick = clearLocalSelection;

  selectTemplate.onchange = () => {
    clearLocalSelection();
  };

  btnRescan.onclick = async () => {
    btnRescan.disabled = true;
    btnRescan.style.opacity = '0.5';
    btnRescan.textContent = '...';
    showCanvasNotification('Scanning startup templates...', { type: 'info' });
    
    const ok = await scanStartupTemplates();
    
    btnRescan.disabled = false;
    btnRescan.style.opacity = '1';
    btnRescan.textContent = '↻';
    
    if (ok) {
      if (Array.isArray(startupTemplates) && startupTemplates.length > 0) {
        selectTemplate.innerHTML = startupTemplates.map(t => {
          return `<option value="${t.fileName}">${t.projectName} (${t.fileName})</option>`;
        }).join('');
        showCanvasNotification(`Scan completed! Found ${startupTemplates.length} template(s).`, { type: 'success' });
      } else {
        selectTemplate.innerHTML = `<option value="" disabled selected>(No verified templates found)</option>`;
        showCanvasNotification('Scan completed. No templates found.', { type: 'warning' });
      }
      clearLocalSelection();
    } else {
      showCanvasNotification('Failed to scan startup folder.', { type: 'error' });
    }
  };

  chkUseStartup.onchange = updateFieldsVisibility;
  updateFieldsVisibility();

  // Keep the color swatch and hex field in sync.
  const colorInp = bg.querySelector('#np-bg');
  const hexInp = bg.querySelector('#np-bg-hex');

  colorInp.onclick = (e) => {
    e.preventDefault();
    if (typeof openColorPicker === 'function') {
      openColorPicker(colorInp, 'np-bg', '#' + hexInp.value);
    }
  };

  hexInp.addEventListener('input', () => {
    const v = hexInp.value.replace(/[^0-9a-fA-F]/g, '');
    if (v.length === 6) {
      const colorVal = '#' + v;
      colorInp.style.background = colorVal;
      if (typeof iroPicker !== 'undefined' && iroPicker && currentCpKey === 'np-bg') {
        try { iroPicker.color.set(colorVal); } catch (e) { }
      }
    }
  });

  bg.querySelector('#np-canvas-toggle').onclick = () => {
    const boxes = [...bg.querySelectorAll('.np-canvas')];
    const allOn = boxes.every(b => b.checked);
    boxes.forEach(b => { b.checked = !allOn; });
  };

  bg.querySelector('#np-create').onclick = async () => {
    const useStartup = chkUseStartup.checked;
    const name = bg.querySelector('#np-name').value;
    const chosenCompressFormat = bg.querySelector('#np-compress-format').value;

    const btn = bg.querySelector('#np-create');
    const cancelBtn = bg.querySelector('#np-cancel');

    const setButtonsLoading = (isLoading) => {
      if (isLoading) {
        btn.disabled = true;
        cancelBtn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
        cancelBtn.style.opacity = '0.5';
        cancelBtn.style.cursor = 'not-allowed';
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:14px; height:14px; animation: save-spin 1s linear infinite; margin-right:8px; display:inline-block; vertical-align:middle;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-dasharray="32" stroke-dashoffset="16" fill="none"></circle></svg>${useStartup ? 'Loading Template...' : 'Creating Project...'}`;
      } else {
        btn.disabled = false;
        cancelBtn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
        cancelBtn.style.opacity = '';
        cancelBtn.style.cursor = '';
        btn.innerHTML = 'Create Project';
      }
    };

    setButtonsLoading(true);

    try {
      if (useStartup) {
        if (selectedLocalTemplateBlob) {
          await loadProjectFromBlob(selectedLocalTemplateBlob, name, null, chosenCompressFormat);
          closeFn();
          showCanvasNotification('Loaded local template.', { type: 'success' });
          return;
        }

        const chosenTemplate = selectTemplate.value;
        const ok = await loadStartupTemplate(chosenTemplate, name, chosenCompressFormat);
        if (ok) {
          closeFn();
          showCanvasNotification('Loaded startup template.', { type: 'success' });
        } else {
          setButtonsLoading(false);
        }
        return;
      }

      const presetIndices = [...bg.querySelectorAll('.np-canvas:checked')].map(b => +b.dataset.idx);
      if (presetIndices.length === 0) {
        alert('Pick at least one canvas size.');
        setButtonsLoading(false);
        return;
      }
      const hex = '#' + (hexInp.value.replace(/[^0-9a-fA-F]/g, '').padEnd(6, '0').slice(0, 6) || '0f172a');
      await createNewProject({
        name,
        presetIndices,
        sizeLimitKb: bg.querySelector('#np-size-limit').value,
        bgColor: hex,
        clickTag: bg.querySelector('#np-clicktag').value,
        compressFormat: chosenCompressFormat,
      });
      closeFn();
    } catch (err) {
      console.error(err);
      setButtonsLoading(false);
      alert('Error creating project: ' + err.message);
    }
  };
}


function openProjectSettingsDialog() {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';

  const localConf = localMap[_localSaveStatus] || localMap.saved;
  let currentCloudStatus = _cloudSaveStatus;
  if (typeof authState !== 'undefined' && authState.enabled && !authState.currentUser()) {
    currentCloudStatus = 'none';
  }
  const cloudConf = cloudMap[currentCloudStatus] || cloudMap.none;

  const fileConf = {
    class: _fileSaveStatus === 'saved' ? 'status-saved' : (_fileSaveStatus === 'unsaved' ? 'status-unsaved' : 'status-none'),
    text: _fileSaveStatus === 'saved' ? 'Saved' : (_fileSaveStatus === 'unsaved' ? 'Out of Sync' : 'Not Saved'),
    title: _fileSaveStatus === 'saved' ? 'Project is backed up to a physical file' : (_fileSaveStatus === 'unsaved' ? 'Changes have been made since last file save' : 'Project has not been saved as a file yet'),
    lastTime: _lastFileSaveTime ? _formatSaveTime(_lastFileSaveTime) : 'Never'
  };

  const isCloudProject = currentCloudStatus !== 'none';
  const secondStatusHtml = isCloudProject ? `
            <div style="display:flex; align-items:flex-start; gap:8px;">
              <div style="margin-top:2px;">
                <svg class="save-icon-status cloud ${cloudConf.class}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px; flex-shrink:0;">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:11px; font-weight:600; color:var(--text-bright);">Cloud Backup: ${cloudConf.text}</span>
                <span style="font-size:10px; color:var(--text-muted);">${cloudConf.title}</span>
                <span style="font-size:10px; color:var(--text-muted); font-style:italic;">Last Synced: ${_formatSaveTime(_lastCloudSaveTime)}</span>
              </div>
            </div>` : `
            <div style="display:flex; align-items:flex-start; gap:8px;">
              <div style="margin-top:2px;">
                <svg class="save-icon-status file ${fileConf.class}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px; flex-shrink:0;">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:11px; font-weight:600; color:var(--text-bright);">File Backup: ${fileConf.text}</span>
                <span style="font-size:10px; color:var(--text-muted);">${fileConf.title}</span>
                <span style="font-size:10px; color:var(--text-muted); font-style:italic;">Last Saved: ${fileConf.lastTime}</span>
              </div>
            </div>`;

  bg.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <div class="modal-head">
        <h2>Project Settings</h2>
        <button class="btn" id="ps-close" title="Close settings">Close</button>
      </div>
      <div class="modal-body" style="display:flex; flex-direction:column; gap:16px; padding:18px 22px;">
        <div>
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Project Name</label>
          <input type="text" id="ps-name" value="${(state.projectName || 'RMIT_ad').replace(/"/g, '&quot;')}" title="Enter the name for the project" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:7px 9px; font-size:12px; outline:none;" />
        </div>
        <div>
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">ClickTag URL</label>
          <input type="url" id="ps-clicktag" value="${(state.clickTag || 'https://www.rmit.edu.au/').replace(/"/g, '&quot;')}" title="Default exit/landing page URL for all canvases" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:7px 9px; font-size:12px; outline:none;" />
        </div>
        <div>
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Max ad size (KB)</label>
          <input type="number" id="ps-size-limit" value="${state.adSizeLimit || 150}" min="1" title="Target file size limit for export warning / Ads Validator (KB)" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:7px 9px; font-size:12px; outline:none;" />
        </div>
        <div>
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Auto-compression Format</label>
          <select id="ps-compress-format" title="Auto-compression output format: JPEG/PNG (ad-server safe) or WebP" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:7px 9px; font-size:12px; outline:none; cursor:pointer;">
            <option value="jpeg" ${state.compressFormat !== 'webp' ? 'selected' : ''}>JPEG / PNG (auto — ad-server safe)</option>
            <option value="webp" ${state.compressFormat === 'webp' ? 'selected' : ''}>WebP (smallest files)</option>
          </select>
        </div>
        <div style="margin-top:4px;">
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Save &amp; Sync Status</label>
          <div style="background:var(--bg-body, #0b0c0f); border:1px solid var(--border-light); border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; align-items:flex-start; gap:8px;">
              <div style="margin-top:2px;">
                <svg class="save-icon-status local ${localConf.class}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px; flex-shrink:0;">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:11px; font-weight:600; color:var(--text-bright);">Browser Autosave: ${localConf.text}</span>
                <span style="font-size:10px; color:var(--text-muted);">${localConf.title.replace('locally', 'in browser cache')}</span>
                <span style="font-size:10px; color:var(--text-muted); font-style:italic;">Last Saved: ${_formatSaveTime(_lastLocalSaveTime)}</span>
              </div>
            </div>
            <div style="height:1px; background:var(--border-light); margin:4px 0;"></div>
            ${secondStatusHtml}
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="ps-cancel" title="Cancel changes">Cancel</button>
        <button class="btn primary" id="ps-save" title="Save and apply project settings">Save Settings</button>
      </div>
    </div>`;

  document.body.appendChild(bg);

  const closeFn = () => { bg.remove(); document.removeEventListener('keydown', escHandler); };
  const escHandler = (e) => { if (e.key === 'Escape') closeFn(); };
  document.addEventListener('keydown', escHandler);
  bg.querySelector('#ps-close').onclick = closeFn;
  bg.querySelector('#ps-cancel').onclick = closeFn;
  bg.onclick = (e) => { if (e.target === bg) closeFn(); };

  bg.querySelector('#ps-save').onclick = () => {
    const newName = bg.querySelector('#ps-name').value.trim() || 'RMIT_ad';
    const newClickTag = bg.querySelector('#ps-clicktag').value.trim();
    const newSizeLimit = Math.max(1, parseInt(bg.querySelector('#ps-size-limit').value, 10) || 150);
    const newCompressFormat = bg.querySelector('#ps-compress-format').value;

    state.projectName = newName;
    state.clickTag = newClickTag;
    state.adSizeLimit = newSizeLimit;
    state.compressFormat = newCompressFormat;

    pushHistory();
    render();
    closeFn();
  };
}



function queueSizeUpdate() {
  if (typeof JSZip === 'undefined') return;
  if (sizeUpdateTimeout) clearTimeout(sizeUpdateTimeout);
  sizeUpdateTimeout = setTimeout(async () => {
    for (const c of state.canvases) {
      let errors = [];
      if (!state.clickTag || state.clickTag.trim() === '') {
        errors.push('Missing clickTag URL');
      } else {
        try {
          const urlStr = state.clickTag.trim();
          const url = new URL(urlStr);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            errors.push('clickTag URL must start with http:// or https://');
          } else if (!url.hostname.includes('.') || url.hostname.split('.').pop().length < 2) {
            errors.push('clickTag URL must be a valid website name with domain');
          }
        } catch (e) {
          errors.push('clickTag URL format is invalid (e.g. https://example.com)');
        }
      }

      let hasMissing = false;
      let hasExt = false;
      c.elements.forEach(el => {
        if (el.type === 'image') {
          const overrides = (typeof dmDisplay === 'function') ? dmDisplay(el) : {};
          const activeAssetId = overrides.assetId !== undefined ? overrides.assetId : el.assetId;
          let src = state.assets[activeAssetId] || activeAssetId;
          if (!src) {
            hasMissing = true;
          } else if (src.startsWith('http://') || src.startsWith('https://')) {
            hasExt = true;
          } else if (src.startsWith('data/Elements/')) {
            // Valid local application asset
          } else if (!state.assets[activeAssetId]) {
            hasMissing = true;
          }
        }
      });

      if (hasMissing) errors.push('Contains missing assets');
      if (hasExt) errors.push('Contains external URLs (local assets are required)');

      const zip = new JSZip();

      // Pre-fetch for validation zip size (reflecting the active data version, if any).
      await dmRunExport(dmActiveRowForOutput(), async () => {
        await addCanvasAssetsToZip(c, zip);
        zip.file('index.html', generateExportHTML(c, zip));
      });
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const kb = (blob.size / 1024).toFixed(1);

      const limitKb = state.adSizeLimit || 150;
      if (blob.size > limitKb * 1024) {
        errors.push(`Filesize (${kb} KB) exceeds ${limitKb}KB limit`);
      }

      c._valKb = kb;
      c._valErrors = errors;
      runAuditChecks(c);
    }
    renderCanvasesList();
  }, 300);
}

async function updateCanvasSizeSync(c) {
  if (typeof JSZip === 'undefined') return;
  let errors = [];
  if (!state.clickTag || state.clickTag.trim() === '') {
    errors.push('Missing clickTag URL');
  } else {
    try {
      const urlStr = state.clickTag.trim();
      const url = new URL(urlStr);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.push('clickTag URL must start with http:// or https://');
      } else if (!url.hostname.includes('.') || url.hostname.split('.').pop().length < 2) {
        errors.push('clickTag URL must be a valid website name with domain');
      }
    } catch (e) {
      errors.push('clickTag URL format is invalid (e.g. https://example.com)');
    }
  }

  let hasMissing = false;
  let hasExt = false;
  c.elements.forEach(el => {
    if (el.type === 'image') {
      const overrides = (typeof dmDisplay === 'function') ? dmDisplay(el) : {};
      const activeAssetId = overrides.assetId !== undefined ? overrides.assetId : el.assetId;
      let src = state.assets[activeAssetId] || activeAssetId;
      if (!src) {
        hasMissing = true;
      } else if (src.startsWith('http://') || src.startsWith('https://')) {
        hasExt = true;
      } else if (src.startsWith('data/Elements/')) {
        // Valid local application asset
      } else if (!state.assets[activeAssetId]) {
        hasMissing = true;
      }
    }
  });

  if (hasMissing) errors.push('Contains missing assets');
  if (hasExt) errors.push('Contains external URLs (local assets are required)');

  const zip = new JSZip();
  await dmRunExport(dmActiveRowForOutput(), async () => {
    await addCanvasAssetsToZip(c, zip);
    zip.file('index.html', generateExportHTML(c, zip));
  });
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const kb = (blob.size / 1024).toFixed(1);

  const limitKb = state.adSizeLimit || 150;
  if (blob.size > limitKb * 1024) {
    errors.push(`Filesize (${kb} KB) exceeds ${limitKb}KB limit`);
  }

  c._valKb = kb;
  c._valErrors = errors;
  runAuditChecks(c);
  renderCanvasesList();
  render();
}

async function autoCompressCanvasImages(canvasId) {
  const canvas = state.canvases.find(c => c.id === canvasId);
  if (!canvas) return;

  // Repair pass: if any RMIT logo / brand element was previously mistakenly compressed/rasterized,
  // restore it to its original SVG asset.
  canvas.elements.forEach(el => {
    if (el.role === 'rmit-logo' || (el.customName && (
      el.customName.toLowerCase().includes('logo') || 
      el.customName.toLowerCase().includes('pixel')
    ))) {
      const _dm = (typeof dmDisplay === 'function') ? dmDisplay(el) : {};
      const activeAssetId = _dm.assetId !== undefined ? _dm.assetId : el.assetId;
      if (activeAssetId && typeof activeAssetId === 'string' && activeAssetId.startsWith('img_')) {
        let restoredAssetId = 'data/Elements/RMIT_White.svg';
        if (el.customName && el.customName.toLowerCase().includes('full color')) {
          restoredAssetId = 'data/Elements/RMIT_full.svg';
        } else if (el.customName && el.customName.toLowerCase().includes('red pixel')) {
          restoredAssetId = 'data/Elements/RMIT_RedPixel.svg';
        }
        
        const _imgDyn = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, 'image');
        if (_imgDyn) {
          const dm = state.dataMerge;
          if (dm && dm.mappings) {
            const col = dm.mappings[dmSlotKey(el) + '::image'];
            if (col && dm.rows && dm.activeVersion != null) {
              const row = dm.rows[dm.activeVersion];
              if (row) {
                row[col] = restoredAssetId;
              }
            }
          }
        } else {
          el.assetId = restoredAssetId;
        }
        el.isCompressed = false;
        delete el.webpQuality;
        delete el.compressionFormat;
      }
    }
  });

  const limitKb = state.adSizeLimit || 150;
  
  // Calculate up-to-date ZIP size dynamically
  const tempZip = new JSZip();
  await dmRunExport(dmActiveRowForOutput(), async () => {
    await addCanvasAssetsToZip(canvas, tempZip);
    tempZip.file('index.html', generateExportHTML(canvas, tempZip));
  });
  const tempBlob = await tempZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const currentAdSize = tempBlob.size / 1024;

  if (currentAdSize <= limitKb) {
    showCanvasNotification('Ad package size is already under the limit.', { type: 'info' });
    return;
  }
  
  const imageElements = canvas.elements.filter(el => {
    if (el.type !== 'image') return false;

    // Do not compress branding or logo elements (SVG or otherwise)
    if (el.role === 'rmit-logo' || (el.customName && (
      el.customName.toLowerCase().includes('logo') || 
      el.customName.toLowerCase().includes('pixel')
    ))) {
      return false;
    }

    const _dm = (typeof dmDisplay === 'function') ? dmDisplay(el, true) : {};
    let activeAssetId = _dm.assetId !== undefined ? _dm.assetId : el.assetId;
    if (!activeAssetId) return false;

    // Resolve back to original uncompressed asset ID if it was compressed
    if (state.compressedAssetsMap) {
      for (const [origId, compId] of Object.entries(state.compressedAssetsMap)) {
        if (compId === activeAssetId) {
          activeAssetId = origId;
          break;
        }
      }
    }

    // Do not compress SVG vector images
    if (typeof activeAssetId === 'string' && activeAssetId.toLowerCase().includes('.svg')) {
      return false;
    }
    const originalDataUrl = (state.assets && state.assets[activeAssetId]) || activeAssetId;
    if (typeof originalDataUrl === 'string' && (originalDataUrl.startsWith('data:image/svg+xml') || originalDataUrl.toLowerCase().includes('.svg'))) {
      return false;
    }
    return true;
  });
  if (imageElements.length === 0) {
    showCanvasNotification('No bitmap image layers found to compress.', { type: 'warning' });
    return;
  }

  const imageTasks = [];
  let totalOriginalImagesSizeKB = 0;
  for (const el of imageElements) {
    const _dm = (typeof dmDisplay === 'function') ? dmDisplay(el, true) : {};
    let activeAssetId = _dm.assetId !== undefined ? _dm.assetId : el.assetId;
    
    // Resolve back to original uncompressed asset ID if it was compressed
    if (state.compressedAssetsMap) {
      for (const [origId, compId] of Object.entries(state.compressedAssetsMap)) {
        if (compId === activeAssetId) {
          activeAssetId = origId;
          break;
        }
      }
    }

    const originalDataUrl = (activeAssetId && state.assets && state.assets[activeAssetId]) || activeAssetId;
    if (originalDataUrl) {
      const sizeStr = await getImageSizeKB(originalDataUrl);
      const sizeKB = parseFloat(sizeStr) || 0;
      totalOriginalImagesSizeKB += sizeKB;
      imageTasks.push({
        el,
        activeAssetId,
        originalDataUrl,
        originalSizeKB: sizeKB,
        newId: 'img_' + uid(),
        fmt: await resolveAutoCompressFormat(originalDataUrl)
      });
    }
  }

  if (imageTasks.length === 0) {
    showCanvasNotification('No valid image data found to compress.', { type: 'warning' });
    return;
  }

  const qualities = [90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10];
  let optimalQuality = 10;

  const scanPromises = qualities.map(async (q) => {
    try {
      let compSumKB = 0;
      for (const task of imageTasks) {
        const compressed = await compressImage(task.originalDataUrl, task.fmt.format, q / 100);
        const compSizeStr = await getImageSizeKB(compressed);
        const compSizeKB = parseFloat(compSizeStr) || 0;
        compSumKB += compSizeKB;
      }
      const estAdSize = Math.max(0, currentAdSize - totalOriginalImagesSizeKB + compSumKB);
      return { q, estAdSize, compSumKB };
    } catch (e) {
      return { q, estAdSize: Infinity, compSumKB: Infinity };
    }
  });

  const scanResults = await Promise.all(scanPromises);
  scanResults.sort((a, b) => b.q - a.q);

  const match = scanResults.find(r => r.estAdSize <= (limitKb - 3.0));
  optimalQuality = match ? match.q : 10;

  let attempts = 0;
  let finalZipSize = Infinity;
  while (optimalQuality >= 10 && attempts < 3) {
    for (const task of imageTasks) {
      const finalCompressed = await compressImage(task.originalDataUrl, task.fmt.format, optimalQuality / 100);
      
      if (!state.assets) state.assets = {};
      state.assets[task.newId] = finalCompressed;

      if (!state.assetNames) state.assetNames = {};
      const origName = state.assetNames && state.assetNames[task.activeAssetId] ? state.assetNames[task.activeAssetId] : (task.el.name || 'image');
      state.assetNames[task.newId] = origName.replace(/\.[a-z0-9]+$/i, '') + task.fmt.ext;

      const _imgDyn = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(task.el, 'image');
      if (!_imgDyn) {
        task.el.assetId = task.newId;
      }
      
      if (!state.compressedAssetsMap) state.compressedAssetsMap = {};
      state.compressedAssetsMap[task.activeAssetId] = task.newId;

      task.el.isCompressed = true;
      task.el.webpQuality = optimalQuality;
      task.el.compressionFormat = task.fmt.format;
    }

    // Verify ZIP size
    const verifyZip = new JSZip();
    await dmRunExport(dmActiveRowForOutput(), async () => {
      await addCanvasAssetsToZip(canvas, verifyZip);
      verifyZip.file('index.html', generateExportHTML(canvas, verifyZip));
    });
    const verifyBlob = await verifyZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    finalZipSize = verifyBlob.size / 1024;

    if (finalZipSize <= limitKb) {
      break;
    }

    // Try lower quality
    optimalQuality = Math.max(10, optimalQuality - 15);
    attempts++;
  }

  showCanvasNotification(`Compressed ${imageTasks.length} images at ${optimalQuality}% quality.`, { type: 'success' });
  await updateCanvasSizeSync(canvas);
  render();
}

function solveBrandElements(canvas, present, config) {
  if (present.length === 0) return false;

  // Calculate preferred quadrant based on current centroid
  const getPreferredQuadrant = (el) => {
    const centerX = el.x + el.width / 2;
    const centerY = el.y + el.height / 2;
    const isTop = centerY < canvas.height / 2;
    const isLeft = centerX < canvas.width / 2;
    if (isTop && isLeft) return 'TL';
    if (isTop && !isLeft) return 'TR';
    if (!isTop && isLeft) return 'BL';
    return 'BR';
  };

  present.forEach(p => {
    p.pref = getPreferredQuadrant(p.el);
  });

  const getQuadrantOfElement = (el) => {
    const centerX = el.x + el.width / 2;
    const centerY = el.y + el.height / 2;
    const isTop = centerY < canvas.height / 2;
    const isLeft = centerX < canvas.width / 2;
    if (isTop && isLeft) return 'TL';
    if (isTop && !isLeft) return 'TR';
    if (!isTop && isLeft) return 'BL';
    return 'BR';
  };

  const occupiedQuadrants = {};
  const logoOnCanvas = canvas.elements.find(el => el.role === 'rmit-logo' && !el.hidden);
  const taglineOnCanvas = canvas.elements.find(el => el.role === 'rfwn' && !el.hidden);
  const cricosOnCanvas = canvas.elements.find(el => el.role === 'cricos' && !el.hidden);

  const isRoleSelected = (role) => present.some(item => item.role === role);

  if (logoOnCanvas && !isRoleSelected('logo')) {
    occupiedQuadrants['logo'] = getQuadrantOfElement(logoOnCanvas);
  }
  if (taglineOnCanvas && !isRoleSelected('tagline')) {
    occupiedQuadrants['tagline'] = getQuadrantOfElement(taglineOnCanvas);
  }
  if (cricosOnCanvas && !isRoleSelected('cricos')) {
    occupiedQuadrants['cricos'] = getQuadrantOfElement(cricosOnCanvas);
  }

  const quadrants = ['TL', 'TR', 'BL', 'BR'];

  // Generate all permutations of size len from quadrants
  const getPermutations = (arr, len) => {
    if (len === 1) return arr.map(x => [x]);
    const results = [];
    arr.forEach((item, index) => {
      const rest = arr.filter((_, i) => i !== index);
      const perm = getPermutations(rest, len - 1);
      perm.forEach(p => {
        results.push([item, ...p]);
      });
    });
    return results;
  };

  const perms = getPermutations(quadrants, present.length);
  let bestAssignment = null;
  let minCost = Infinity;

  perms.forEach(p => {
    const assignment = {};
    present.forEach((item, idx) => {
      assignment[item.role] = p[idx];
    });

    // Prevent overlap with unselected brand elements occupying quadrants
    let hasCollision = false;
    present.forEach(item => {
      const q = assignment[item.role];
      if (Object.values(occupiedQuadrants).includes(q)) {
        hasCollision = true;
      }
    });
    if (hasCollision) return;

    // Validate cross-quadrant constraint:
    // For 970x250: Logo and Tagline must be on the same vertical half (both left, or both right).
    // For other sizes: Logo and Tagline must be on the same horizontal half (both top, or both bottom).
    const logoOnCanvas = canvas.elements.find(el => el.role === 'rmit-logo');
    const taglineOnCanvas = canvas.elements.find(el => el.role === 'rfwn');

    if (canvas.width === 970 && canvas.height === 250) {
      let resolvedLogoIsLeft = null;
      if (assignment.logo) {
        const qLogo = assignment.logo;
        resolvedLogoIsLeft = (qLogo === 'TL' || qLogo === 'BL');
      } else if (logoOnCanvas) {
        const centerX = logoOnCanvas.x + logoOnCanvas.width / 2;
        resolvedLogoIsLeft = centerX < canvas.width / 2;
      }

      let resolvedTaglineIsLeft = null;
      if (assignment.tagline) {
        const qTagline = assignment.tagline;
        resolvedTaglineIsLeft = (qTagline === 'TL' || qTagline === 'BL');
      } else if (taglineOnCanvas) {
        const centerX = taglineOnCanvas.x + taglineOnCanvas.width / 2;
        resolvedTaglineIsLeft = centerX < canvas.width / 2;
      }

      if (resolvedLogoIsLeft !== null && resolvedTaglineIsLeft !== null) {
        if (resolvedLogoIsLeft !== resolvedTaglineIsLeft) {
          return; // Invalid assignment
        }
      }
    } else {
      let resolvedLogoIsTop = null;
      if (assignment.logo) {
        const qLogo = assignment.logo;
        resolvedLogoIsTop = (qLogo === 'TL' || qLogo === 'TR');
      } else if (logoOnCanvas) {
        const centerY = logoOnCanvas.y + logoOnCanvas.height / 2;
        resolvedLogoIsTop = centerY < canvas.height / 2;
      }

      let resolvedTaglineIsTop = null;
      if (assignment.tagline) {
        const qTagline = assignment.tagline;
        resolvedTaglineIsTop = (qTagline === 'TL' || qTagline === 'TR');
      } else if (taglineOnCanvas) {
        const centerY = taglineOnCanvas.y + taglineOnCanvas.height / 2;
        resolvedTaglineIsTop = centerY < canvas.height / 2;
      }

      if (resolvedLogoIsTop !== null && resolvedTaglineIsTop !== null) {
        if (resolvedLogoIsTop !== resolvedTaglineIsTop) {
          return; // Invalid assignment
        }
      }
    }

    // Calculate cost based on deviation from preferred quadrant
    let cost = 0;
    present.forEach(item => {
      if (assignment[item.role] !== item.pref) {
        cost += item.costWeight;
      }
    });

    if (cost < minCost) {
      minCost = cost;
      bestAssignment = assignment;
    }
  });

  if (bestAssignment) {
    const logoCoords = config.logoCoords;
    const cricosCoords = config.cricos ? config.cricos.coords : null;
    const rfwnCoords = config.tagline ? config.tagline.coords : null;

    const roleCoords = {
      logo: logoCoords,
      cricos: cricosCoords,
      tagline: rfwnCoords
    };

    present.forEach(item => {
      const assignedQuad = bestAssignment[item.role];
      const coords = roleCoords[item.role][assignedQuad];
      const el = item.el;

      el.x = coords.x;
      el.y = coords.y;
      el.width = coords.w;
      el.height = coords.h;
      el.lockRatio = true;

      if (item.role === 'cricos' && config.cricos) {
        el.fontSize = config.cricos.fontSize;
        el.autoSize = false;
        el.textAlign = config.cricos.textAlign || 'left';
      } else if (item.role === 'tagline' && config.tagline) {
        el.fontSize = config.tagline.fontSize;
        el.autoSize = false;
        if (canvas.width === 970 && canvas.height === 250) {
          el.textAlign = assignedQuad.endsWith('R') ? 'right' : 'left';
        } else {
          el.textAlign = config.tagline.textAlign || (assignedQuad.endsWith('L') ? 'left' : 'right');
        }
      }

      const settings = (typeof getAutoResizeSettings === 'function') ? getAutoResizeSettings() : { behaviour: {} };
      if (settings.behaviour?.lockBrandElements !== false) {
        el.locked = true;
      } else {
        if (el.locked) delete el.locked;
      }
      el.autoArranged = true;
    });
    return true;
  }
  return false;
}

function runAutoArrange(canvasId, selectedIds) {
  const canvas = state.canvases.find(c => c.id === canvasId);
  if (!canvas) return;

  let changed = false;

  const isSelected = (el) => {
    if (!el) return false;
    if (!selectedIds || selectedIds.length === 0) return true;
    return selectedIds.includes(el.id);
  };

  if (canvas.width === 300 && canvas.height === 250) {
    const config = AUTO_ARRANGE_CONFIG["300x250"];

    const logoEl = canvas.elements.find(el => el.role === 'rmit-logo');
    const taglineEl = canvas.elements.find(el => el.role === 'rfwn');
    const cricosEl = canvas.elements.find(el => el.role === 'cricos');
    const headingEl = canvas.elements.find(el => el.role === 'heading');
    const subheadingEl = canvas.elements.find(el => el.role === 'subheading');
    const buttonEl = canvas.elements.find(el => el.role === 'cta-button');

    if (headingEl) {
      const distLeft = Math.abs(headingEl.x - config.safezone.minX);
      const distRight = Math.abs((headingEl.x + headingEl.width) - config.safezone.maxX);
      let isLeft = true;
      if (headingEl.textAlign === 'left') {
        isLeft = true;
      } else if (headingEl.textAlign === 'right') {
        isLeft = false;
      } else {
        isLeft = distLeft < distRight;
      }

      if (isSelected(headingEl)) {
        if (isLeft) {
          headingEl.x = config.safezone.minX;
          if (headingEl.x + headingEl.width > config.safezone.maxX) {
            headingEl.width = config.safezone.maxX - headingEl.x;
          }
        } else {
          headingEl.x = config.safezone.maxX - headingEl.width;
          if (headingEl.x < config.safezone.minX) {
            headingEl.x = config.safezone.minX;
            headingEl.width = config.safezone.maxX - config.safezone.minX;
          }
        }

        // Vertical clamping to safezone
        const minY = config.safezone.minY;
        const maxY = config.safezone.maxY;
        if (headingEl.y < minY) {
          headingEl.y = minY;
        }
        if (headingEl.y + headingEl.height > maxY) {
          headingEl.y = maxY - headingEl.height;
          if (headingEl.y < minY) {
            headingEl.y = minY;
            headingEl.height = maxY - minY;
          }
        }

        headingEl.autoSize = true;
        headingEl.maxFontSize = config.heading.maxFontSize;
        headingEl.textAlign = isLeft ? 'left' : 'right';
        headingEl.autoArranged = true;
        changed = true;
      }

      if (subheadingEl && isSelected(subheadingEl)) {
        subheadingEl.textAlign = isLeft ? 'left' : 'right';
        if (isLeft) {
          subheadingEl.x = config.safezone.minX;
          if (subheadingEl.x + subheadingEl.width > config.safezone.maxX) {
            subheadingEl.width = config.safezone.maxX - subheadingEl.x;
          }
        } else {
          subheadingEl.x = config.safezone.maxX - subheadingEl.width;
          if (subheadingEl.x < config.safezone.minX) {
            subheadingEl.x = config.safezone.minX;
            subheadingEl.width = config.safezone.maxX - config.safezone.minX;
          }
        }

        // Stack right under heading's box
        subheadingEl.y = headingEl.y + headingEl.height + config.subheading.gapBelowHeading;

        // Fit entirely within vertical safezone
        const minY = config.safezone.minY;
        const maxY = config.safezone.maxY;
        if (subheadingEl.y < minY) {
          subheadingEl.y = minY;
        }
        if (subheadingEl.y + subheadingEl.height > maxY) {
          subheadingEl.height = maxY - subheadingEl.y;
          if (subheadingEl.height < 0) {
            subheadingEl.height = 0;
          }
        }

        subheadingEl.autoSize = true;
        subheadingEl.maxFontSize = config.subheading.maxFontSize;
        subheadingEl.autoArranged = true;
        changed = true;
      }

      if (buttonEl && isSelected(buttonEl)) {
        // Edge alignment with heading/subheading (isLeft vs isRight)
        buttonEl.width = config.button.width;
        if (isLeft) {
          buttonEl.x = config.safezone.minX;
        } else {
          buttonEl.x = config.safezone.maxX - buttonEl.width;
        }

        // Stack right under subheading (or heading if subheading is missing)
        if (subheadingEl) {
          buttonEl.y = subheadingEl.y + subheadingEl.height + config.button.gapBelowText;
        } else {
          buttonEl.y = headingEl.y + headingEl.height + config.button.gapBelowText;
        }

        // Fit entirely within vertical safezone
        const minY = config.safezone.minY;
        const maxY = config.safezone.maxY;
        if (buttonEl.y < minY) {
          buttonEl.y = minY;
        }
        if (buttonEl.y + buttonEl.height > maxY) {
          buttonEl.height = maxY - buttonEl.y;
          if (buttonEl.height < 0) {
            buttonEl.height = 0;
          }
        }

        // Auto font size and wrapText on
        buttonEl.autoSize = true;
        buttonEl.wrapText = true;
        buttonEl.autoArranged = true;
        changed = true;
      }
    }

    const present = [];
    if (logoEl && isSelected(logoEl)) present.push({ el: logoEl, role: 'logo', priority: 1, costWeight: 100 });
    if (taglineEl && isSelected(taglineEl) && config.tagline) present.push({ el: taglineEl, role: 'tagline', priority: 2, costWeight: 10 });
    if (cricosEl && isSelected(cricosEl) && config.cricos) present.push({ el: cricosEl, role: 'cricos', priority: 3, costWeight: 1 });

    if (solveBrandElements(canvas, present, config)) {
      changed = true;
    }
  } else if (canvas.width === 300 && canvas.height === 600) {
    const config = AUTO_ARRANGE_CONFIG["300x600"];

    const logoEl = canvas.elements.find(el => el.role === 'rmit-logo');
    const taglineEl = canvas.elements.find(el => el.role === 'rfwn');
    const cricosEl = canvas.elements.find(el => el.role === 'cricos');
    const headingEl = canvas.elements.find(el => el.role === 'heading');
    const subheadingEl = canvas.elements.find(el => el.role === 'subheading');
    const buttonEl = canvas.elements.find(el => el.role === 'cta-button');

    let headingJustification = 'center';
    if (headingEl) {
      if (headingEl.textAlign === 'left') {
        headingJustification = 'left';
      } else if (headingEl.textAlign === 'right') {
        headingJustification = 'right';
      } else if (headingEl.textAlign === 'center') {
        headingJustification = 'center';
      } else {
        const distLeft = Math.abs(headingEl.x - config.safezone.minX);
        const distRight = Math.abs((headingEl.x + headingEl.width) - config.safezone.maxX);
        headingJustification = distLeft < distRight ? 'left' : 'right';
      }

      if (isSelected(headingEl)) {
        headingEl.x = config.safezone.minX;
        headingEl.width = config.safezone.maxX - config.safezone.minX;

        // Vertical clamping to safezone
        const minY = config.safezone.minY;
        const maxY = config.safezone.maxY;
        if (headingEl.y < minY) {
          headingEl.y = minY;
        }
        if (headingEl.y + headingEl.height > maxY) {
          headingEl.y = maxY - headingEl.height;
          if (headingEl.y < minY) {
            headingEl.y = minY;
            headingEl.height = maxY - minY;
          }
        }

        headingEl.autoSize = true;
        headingEl.maxFontSize = config.heading.maxFontSize;
        headingEl.textAlign = headingJustification;
        headingEl.autoArranged = true;
        changed = true;
      }
    } else {
      headingJustification = 'center';
    }

    if (subheadingEl && isSelected(subheadingEl)) {
      subheadingEl.x = config.safezone.minX;
      subheadingEl.width = config.safezone.maxX - config.safezone.minX;

      const subGap = config.subheading.gapBelowHeading || 4;
      const minY = config.safezone.minY;
      const maxY = config.safezone.maxY;
      const minSubY = headingEl ? (headingEl.y + headingEl.height + subGap) : minY;

      if (subheadingEl.y < minSubY) {
        subheadingEl.y = minSubY;
      }
      if (subheadingEl.y + subheadingEl.height > maxY) {
        subheadingEl.y = maxY - subheadingEl.height;
        if (subheadingEl.y < minSubY) {
          subheadingEl.y = minSubY;
          subheadingEl.height = maxY - minSubY;
          if (subheadingEl.height < 0) {
            subheadingEl.height = 0;
          }
        }
      }

      subheadingEl.autoSize = true;
      subheadingEl.maxFontSize = config.subheading.maxFontSize;
      subheadingEl.textAlign = headingJustification;
      subheadingEl.autoArranged = true;
      changed = true;
    }

    if (buttonEl && isSelected(buttonEl)) {
      if (buttonEl.x < config.safezone.minX) {
        buttonEl.x = config.safezone.minX;
      }
      if (buttonEl.x + buttonEl.width > config.safezone.maxX) {
        buttonEl.width = config.safezone.maxX - buttonEl.x;
        if (buttonEl.width < 0) {
          buttonEl.width = 0;
        }
      }

      // Resolve overlap with text boxes: push down if touching/overlapping, otherwise preserve current Y
      let minYLimit = config.safezone.minY;
      const gap = config.button.gapBelowText || 8;
      if (headingEl) {
        const minHeadingY = headingEl.y + headingEl.height + gap;
        if (minYLimit < minHeadingY) {
          minYLimit = minHeadingY;
        }
      }
      if (subheadingEl) {
        const minSubheadingY = subheadingEl.y + subheadingEl.height + gap;
        if (minYLimit < minSubheadingY) {
          minYLimit = minSubheadingY;
        }
      }

      if (buttonEl.y < minYLimit) {
        buttonEl.y = minYLimit;
      }

      // If outside safezone bottom boundary, push it up (Ignore button height, clamp only position to minYLimit to avoid overlap)
      const maxY = config.safezone.maxY;
      if (buttonEl.y + buttonEl.height > maxY) {
        buttonEl.y = maxY - buttonEl.height;
        // If pushing up causes it to violate the text box boundary, clamp to minYLimit (do not shrink button height)
        if (buttonEl.y < minYLimit) {
          buttonEl.y = minYLimit;
        }
      }

      buttonEl.autoSize = true;
      buttonEl.wrapText = true;
      buttonEl.textAlign = headingJustification;
      buttonEl.autoArranged = true;
      changed = true;
    }

    const present = [];
    if (logoEl && isSelected(logoEl)) present.push({ el: logoEl, role: 'logo', priority: 1, costWeight: 100 });
    if (taglineEl && isSelected(taglineEl) && config.tagline) present.push({ el: taglineEl, role: 'tagline', priority: 2, costWeight: 10 });
    if (cricosEl && isSelected(cricosEl) && config.cricos) present.push({ el: cricosEl, role: 'cricos', priority: 3, costWeight: 1 });

    if (solveBrandElements(canvas, present, config)) {
      changed = true;
    }
  } else if (canvas.width === 160 && canvas.height === 600) {
    const config = AUTO_ARRANGE_CONFIG["160x600"];

    const logoEl = canvas.elements.find(el => el.role === 'rmit-logo');
    const taglineEl = canvas.elements.find(el => el.role === 'rfwn');
    const cricosEl = canvas.elements.find(el => el.role === 'cricos');
    const headingEl = canvas.elements.find(el => el.role === 'heading');
    const subheadingEl = canvas.elements.find(el => el.role === 'subheading');
    const buttonEl = canvas.elements.find(el => el.role === 'cta-button');

    // Dynamically calculate vertical safezone based on brand element placement
    let minY = config.safezone.minY;
    let maxY = config.safezone.maxY;
    canvas.elements.forEach(el => {
      if (el.role === 'rmit-logo' || el.role === 'rfwn') {
        if (el.y + el.height < canvas.height / 2) {
          minY = Math.max(minY, el.y + el.height + 12);
        } else {
          maxY = Math.min(maxY, el.y - 12);
        }
      }
    });

    const hasBrandMaster = !!(logoEl || taglineEl || cricosEl);

    let headingJustification = 'center';
    if (headingEl) {
      if (headingEl.textAlign === 'left') {
        headingJustification = 'left';
      } else if (headingEl.textAlign === 'right') {
        headingJustification = 'right';
      } else if (headingEl.textAlign === 'center') {
        headingJustification = 'center';
      } else {
        const distLeft = Math.abs(headingEl.x - config.safezone.minX);
        const distRight = Math.abs((headingEl.x + headingEl.width) - config.safezone.maxX);
        headingJustification = distLeft < distRight ? 'left' : 'right';
      }

      if (isSelected(headingEl)) {
        // Full width within safezone
        headingEl.x = config.safezone.minX;
        headingEl.width = config.safezone.maxX - config.safezone.minX;

        // Vertical clamping to dynamic safezone (only if brand master is present)
        if (hasBrandMaster) {
          if (headingEl.y < minY) {
            headingEl.y = minY;
          }
          if (headingEl.y + headingEl.height > maxY) {
            headingEl.y = maxY - headingEl.height;
            if (headingEl.y < minY) {
              headingEl.y = minY;
              headingEl.height = maxY - minY;
            }
          }
        }

        headingEl.autoSize = true;
        headingEl.maxFontSize = config.heading.maxFontSize;
        headingEl.textAlign = headingJustification;
        headingEl.autoArranged = true;
        changed = true;
      }
    } else {
      headingJustification = 'center';
    }

    if (subheadingEl && isSelected(subheadingEl)) {
      // Full width within safezone
      subheadingEl.x = config.safezone.minX;
      subheadingEl.width = config.safezone.maxX - config.safezone.minX;

      if (hasBrandMaster) {
        const subGap = config.subheading.gapBelowHeading || 4;
        const minSubY = headingEl ? (headingEl.y + headingEl.height + subGap) : minY;

        if (subheadingEl.y < minSubY) {
          subheadingEl.y = minSubY;
        }
        if (subheadingEl.y + subheadingEl.height > maxY) {
          subheadingEl.y = maxY - subheadingEl.height;
          if (subheadingEl.y < minSubY) {
            subheadingEl.y = minSubY;
            subheadingEl.height = maxY - minSubY;
            if (subheadingEl.height < 0) {
              subheadingEl.height = 0;
            }
          }
        }
      }

      subheadingEl.autoSize = true;
      subheadingEl.maxFontSize = config.subheading.maxFontSize;
      subheadingEl.textAlign = headingJustification;
      subheadingEl.autoArranged = true;
      changed = true;
    }

    if (buttonEl && isSelected(buttonEl)) {
      // Full width within safezone
      buttonEl.x = config.safezone.minX;
      buttonEl.width = config.safezone.maxX - config.safezone.minX;

      if (hasBrandMaster) {
        // Resolve overlap with text boxes: push down if touching/overlapping, otherwise preserve Y
        let minYLimit = minY;
        const gap = config.button.gapBelowText || 8;
        if (headingEl) {
          const minHeadingY = headingEl.y + headingEl.height + gap;
          if (minYLimit < minHeadingY) {
            minYLimit = minHeadingY;
          }
        }
        if (subheadingEl) {
          const minSubheadingY = subheadingEl.y + subheadingEl.height + gap;
          if (minYLimit < minSubheadingY) {
            minYLimit = minSubheadingY;
          }
        }

        if (buttonEl.y < minYLimit) {
          buttonEl.y = minYLimit;
        }

        // If outside dynamic safezone bottom boundary, push it up (Ignore button height, clamp only position to minYLimit to avoid overlap)
        if (buttonEl.y + buttonEl.height > maxY) {
          buttonEl.y = maxY - buttonEl.height;
          // If pushing up causes it to violate the text box boundary, clamp to minYLimit (do not shrink button height)
          if (buttonEl.y < minYLimit) {
            buttonEl.y = minYLimit;
          }
        }
      }

      buttonEl.autoSize = true;
      buttonEl.wrapText = true;
      buttonEl.textAlign = headingJustification;
      buttonEl.autoArranged = true;
      changed = true;
    }

    const present = [];
    if (logoEl && isSelected(logoEl)) present.push({ el: logoEl, role: 'logo', priority: 1, costWeight: 100 });
    if (taglineEl && isSelected(taglineEl) && config.tagline) present.push({ el: taglineEl, role: 'tagline', priority: 2, costWeight: 10 });
    if (cricosEl && isSelected(cricosEl) && config.cricos) present.push({ el: cricosEl, role: 'cricos', priority: 3, costWeight: 1 });

    if (solveBrandElements(canvas, present, config)) {
      changed = true;
    }
  } else if (canvas.width === 728 && canvas.height === 90) {
    const config = AUTO_ARRANGE_CONFIG["728x90"];

    const logoEl = canvas.elements.find(el => el.role === 'rmit-logo');
    const taglineEl = canvas.elements.find(el => el.role === 'rfwn');
    const cricosEl = canvas.elements.find(el => el.role === 'cricos');
    const buttonEl = canvas.elements.find(el => el.role === 'cta-button');
    const headingEl = canvas.elements.find(el => el.role === 'heading');
    const subheadingEl = canvas.elements.find(el => el.role === 'subheading');

    if (headingEl && isSelected(headingEl)) {
      headingEl.x = 39;
      headingEl.y = 17;
      headingEl.width = 368;
      headingEl.height = 33;
      headingEl.autoSize = true;
      headingEl.maxFontSize = 28;
      headingEl.textAlign = 'left';
      headingEl.autoArranged = true;
      changed = true;
    }

    if (subheadingEl && isSelected(subheadingEl)) {
      subheadingEl.x = 39;
      subheadingEl.y = 53;
      subheadingEl.width = 346;
      subheadingEl.height = 21;
      subheadingEl.autoSize = true;
      subheadingEl.maxFontSize = 23;
      subheadingEl.textAlign = 'left';
      subheadingEl.autoArranged = true;
      changed = true;
    }

    if (logoEl && isSelected(logoEl)) {
      logoEl.x = 607;
      logoEl.y = 8;
      logoEl.width = 113;
      logoEl.height = 40;
      logoEl.autoArranged = true;
      changed = true;
    }

    if (taglineEl && isSelected(taglineEl)) {
      taglineEl.x = 630;
      taglineEl.y = 72;
      taglineEl.width = 90;
      taglineEl.height = 10;
      taglineEl.fontSize = 8;
      taglineEl.autoArranged = true;
      changed = true;
    }

    if (buttonEl && isSelected(buttonEl)) {
      buttonEl.x = 429;
      buttonEl.y = 22;
      buttonEl.width = 144;
      buttonEl.height = 33;
      buttonEl.autoSize = true;
      buttonEl.wrapText = true;
      buttonEl.maxFontSize = 20;
      buttonEl.textAlign = 'center';
      buttonEl.autoArranged = true;
      changed = true;
    }

    if (cricosEl && isSelected(cricosEl)) {
      if (buttonEl) {
        cricosEl.x = buttonEl.x;
        cricosEl.y = buttonEl.y + buttonEl.height + 5;
        cricosEl.width = buttonEl.width;
        cricosEl.height = 10;
        cricosEl.fontSize = 7;
        cricosEl.textAlign = 'center';
      } else {
        cricosEl.x = 0;
        cricosEl.y = 77;
        cricosEl.width = 106;
        cricosEl.height = 10;
        cricosEl.fontSize = 7;
        cricosEl.textAlign = 'left';
      }
      cricosEl.autoArranged = true;
      changed = true;
    }
  } else if (canvas.width === 320 && canvas.height === 50) {
    const config = AUTO_ARRANGE_CONFIG["320x50"];
    const minX = config.safezone.minX;
    const maxX = config.safezone.maxX;
    const minY = config.safezone.minY;
    const maxY = config.safezone.maxY;

    const logoEl = canvas.elements.find(el => el.role === 'rmit-logo');
    const taglineEl = canvas.elements.find(el => el.role === 'rfwn');
    const cricosEl = canvas.elements.find(el => el.role === 'cricos');
    const buttonEl = canvas.elements.find(el => el.role === 'cta-button');
    const headingEl = canvas.elements.find(el => el.role === 'heading');
    const subheadingEl = canvas.elements.find(el => el.role === 'subheading');

    if (logoEl && isSelected(logoEl)) {
      logoEl.x = 265;
      logoEl.y = 5;
      logoEl.width = 50;
      logoEl.height = 18;
      logoEl.autoArranged = true;
      changed = true;
    }

    if (taglineEl && isSelected(taglineEl)) {
      taglineEl.x = 280;
      taglineEl.y = 32;
      taglineEl.width = 35;
      taglineEl.height = 12;
      taglineEl.fontSize = 5;
      taglineEl.textAlign = 'right';
      taglineEl.autoArranged = true;
      changed = true;
    }

    if (buttonEl && isSelected(buttonEl)) {
      buttonEl.x = 143;
      buttonEl.y = 9;
      buttonEl.width = 99;
      buttonEl.height = 25;
      buttonEl.autoSize = true;
      buttonEl.wrapText = true;
      buttonEl.maxFontSize = 20;
      // text just. stays as is (do not override textAlign)
      buttonEl.autoArranged = true;
      changed = true;
    }

    if (cricosEl && isSelected(cricosEl)) {
      cricosEl.x = 2;
      cricosEl.y = 39;
      cricosEl.width = 72;
      cricosEl.height = 10;
      cricosEl.fontSize = 5;
      cricosEl.textAlign = 'center';
      cricosEl.autoArranged = true;
      changed = true;
    }

    if (headingEl && isSelected(headingEl)) {
      headingEl.height = 31;
      headingEl.verticalAlign = 'middle';
      headingEl.textAlign = 'left';
      headingEl.autoSize = true;
      headingEl.maxFontSize = 30;

      // Vertically center the heading box within the canvas
      headingEl.y = (canvas.height - headingEl.height) / 2;

      // Clamp when box out of safezone (for any edge)
      if (headingEl.x < minX) {
        headingEl.x = minX;
      }
      if (headingEl.x + headingEl.width > maxX) {
        headingEl.width = Math.max(10, maxX - headingEl.x);
      }
      if (headingEl.y < minY) {
        headingEl.y = minY;
      }
      if (headingEl.y + headingEl.height > maxY) {
        headingEl.y = Math.max(minY, maxY - headingEl.height);
      }

      headingEl.autoArranged = true;
      changed = true;
    }

    if (subheadingEl && isSelected(subheadingEl)) {
      // Center it before hiding
      subheadingEl.textAlign = 'center';
      subheadingEl.x = (320 - subheadingEl.width) / 2;
      subheadingEl.hidden = true;
      subheadingEl.autoArranged = true;
      changed = true;
    }
  } else if (canvas.width === 970 && canvas.height === 250) {
    const config = AUTO_ARRANGE_CONFIG["970x250"];

    const logoEl = canvas.elements.find(el => el.role === 'rmit-logo');
    const taglineEl = canvas.elements.find(el => el.role === 'rfwn');
    const cricosEl = canvas.elements.find(el => el.role === 'cricos');
    const headingEl = canvas.elements.find(el => el.role === 'heading');
    const subheadingEl = canvas.elements.find(el => el.role === 'subheading');
    const buttonEl = canvas.elements.find(el => el.role === 'cta-button');

    let maxRight = config.safezone.maxX;
    const rightSideElements = [logoEl, taglineEl, cricosEl].filter(el => {
      if (!el) return false;
      const cx = el.x + el.width / 2;
      return cx > 485;
    });
    if (rightSideElements.length > 0) {
      const minX = Math.min(...rightSideElements.map(el => el.x));
      maxRight = Math.min(maxRight, minX - 8);
    }
    if (buttonEl && buttonEl.x >= 73) {
      maxRight = Math.min(maxRight, buttonEl.x - 8);
    }
    const targetW = Math.max(50, maxRight - 73);

    if (headingEl) {
      if (isSelected(headingEl)) {
        headingEl.x = 73;
        headingEl.width = targetW;

        // Vertical clamping to safezone
        const minY = config.safezone.minY;
        const maxY = config.safezone.maxY;
        if (headingEl.y < minY) {
          headingEl.y = minY;
        }
        if (headingEl.y + headingEl.height > maxY) {
          headingEl.y = maxY - headingEl.height;
          if (headingEl.y < minY) {
            headingEl.y = minY;
            headingEl.height = maxY - minY;
          }
        }

        headingEl.autoSize = true;
        headingEl.maxFontSize = config.heading.maxFontSize;
        headingEl.verticalAlign = 'bottom';
        headingEl.textAlign = 'left';
        headingEl.autoArranged = true;
        changed = true;
      }

      if (subheadingEl && isSelected(subheadingEl)) {
        subheadingEl.x = 73;
        subheadingEl.width = targetW;

        // Stack right under heading's box if head is present
        subheadingEl.y = headingEl.y + headingEl.height + config.subheading.gapBelowHeading;

        // Fit entirely within vertical safezone
        const minY = config.safezone.minY;
        const maxY = config.safezone.maxY;
        if (subheadingEl.y < minY) {
          subheadingEl.y = minY;
        }
        if (subheadingEl.y + subheadingEl.height > maxY) {
          subheadingEl.height = maxY - subheadingEl.y;
          if (subheadingEl.height < 0) {
            subheadingEl.height = 0;
          }
        }

        subheadingEl.autoSize = true;
        subheadingEl.maxFontSize = config.subheading.maxFontSize;
        subheadingEl.textAlign = 'left';
        subheadingEl.autoArranged = true;
        changed = true;
      }

      if (buttonEl && isSelected(buttonEl)) {
        buttonEl.width = 203;
        buttonEl.x = 636;
        if (buttonEl.x + buttonEl.width > config.safezone.maxX) {
          buttonEl.width = Math.max(10, config.safezone.maxX - buttonEl.x);
        }

        // Vertically middle align the button box within the canvas
        buttonEl.y = (canvas.height - buttonEl.height) / 2;

        // Fit entirely within vertical safezone
        const minY = config.safezone.minY;
        const maxY = config.safezone.maxY;
        if (buttonEl.y < minY) {
          buttonEl.y = minY;
        }
        if (buttonEl.y + buttonEl.height > maxY) {
          buttonEl.height = maxY - buttonEl.y;
          if (buttonEl.height < 0) {
            buttonEl.height = 0;
          }
        }

        // Auto font size and wrapText on
        buttonEl.autoSize = true;
        buttonEl.wrapText = true;
        buttonEl.autoArranged = true;
        changed = true;
      }
    }

    const present = [];
    if (logoEl && isSelected(logoEl)) present.push({ el: logoEl, role: 'logo', priority: 1, costWeight: 100 });
    if (taglineEl && isSelected(taglineEl) && config.tagline) present.push({ el: taglineEl, role: 'tagline', priority: 2, costWeight: 10 });
    if (cricosEl && isSelected(cricosEl) && config.cricos) present.push({ el: cricosEl, role: 'cricos', priority: 3, costWeight: 1 });

    if (solveBrandElements(canvas, present, config)) {
      changed = true;
    }
  }

  if (canvas.layoutOverrides) {
    canvas.elements.forEach(el => {
      if (el.role && canvas.layoutOverrides[el.role] && isSelected(el)) {
        const o = canvas.layoutOverrides[el.role];
        if (typeof o.x === 'number') el.x = o.x;
        if (typeof o.y === 'number') el.y = o.y;
        if (typeof o.width === 'number') el.width = o.width;
        if (typeof o.height === 'number') el.height = o.height;
        if (typeof o.fontSize === 'number') el.fontSize = o.fontSize;
        if (typeof o.maxFontSize === 'number') el.maxFontSize = o.maxFontSize;
        if (typeof o.textAlign === 'string') el.textAlign = o.textAlign;
        if (typeof o.verticalAlign === 'string') el.verticalAlign = o.verticalAlign;
        el.autoArranged = true;
        changed = true;
      }
    });
  }

  if (changed) {
    pushHistory();
    render();
    renderProps();
    showCanvasNotification('Elements auto-arranged.', { type: 'success' });
  } else {
    showCanvasNotification('No auto-arrange sets matched for this canvas size.', { type: 'info' });
  }
}

document.getElementById('menu-edit-undo').addEventListener('click', undo);
document.getElementById('menu-edit-redo').addEventListener('click', redo);
document.getElementById('menu-help-shortcuts').addEventListener('click', () => {
  const body = `
    <style>
      .shortcuts-table { width: 100%; font-size: 12px; line-height: 1.4; border-collapse: collapse; }
      .shortcuts-table td { padding: 4px 0; border-bottom: 1px solid var(--border-light); }
      .shortcuts-table tr:last-child td { border-bottom: none; }
      .shortcuts-table b { color: #fff; font-weight: 500; }
    </style>
    <table class="shortcuts-table">
      <tr><td><b>Push to Cloud</b> <span style="color:var(--text-muted);">(falls back to local save when signed out)</span></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">S</span></td></tr>
      <tr><td><b>Save Project locally (.flow)</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">Shift</span> + <span class="kbd">S</span></td></tr>
      <tr><td><b>Copy Elements</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">C</span></td></tr>
      <tr><td><b>Cut Elements</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">X</span></td></tr>
      <tr><td><b>Paste Elements</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">V</span></td></tr>
      <tr><td><b>Paste in Place</b></td><td style="text-align: right;"><span class="kbd">⇧ Shift</span> + <span class="kbd">⌘ / Ctrl</span> + <span class="kbd">V</span></td></tr>
      <tr><td><b>Duplicate Elements</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">D</span></td></tr>
      <tr><td><b>Group Elements</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">G</span></td></tr>
      <tr><td><b>Ungroup Elements</b></td><td style="text-align: right;"><span class="kbd">⇧</span> + <span class="kbd">⌘ / Ctrl</span> + <span class="kbd">G</span></td></tr>
      <tr><td><b>Bring Layer Forward</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">]</span></td></tr>
      <tr><td><b>Send Layer Backward</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">[</span></td></tr>
      <tr><td><b>Undo</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">Z</span></td></tr>
      <tr><td><b>Redo</b></td><td style="text-align: right;"><span class="kbd">⇧</span> + <span class="kbd">⌘ / Ctrl</span> + <span class="kbd">Z</span></td></tr>
      <tr><td><b>Outline Mode</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">Y</span></td></tr>
      <tr><td><b>Delete Elements</b></td><td style="text-align: right;"><span class="kbd">⌫</span> <span class="kbd">Del</span></td></tr>
      <tr><td><b>Duplicate on Drag</b></td><td style="text-align: right;">Hold <span class="kbd">Alt</span> while dragging</td></tr>
      <tr><td><b>Scale Font Size</b></td><td style="text-align: right;">Hold <span class="kbd">Alt</span> + Resize handle</td></tr>
      <tr><td><b>Constrain Drag / Aspect Ratio</b></td><td style="text-align: right;">Hold <span class="kbd">⇧ Shift</span> while dragging / resizing</td></tr>
      <tr><td><b>Snap Resize to 10px</b></td><td style="text-align: right;">Hold <span class="kbd">⌘ / Ctrl</span> while resizing</td></tr>
      <tr><td><b>Nudge 1 Pixel</b></td><td style="text-align: right;"><span class="kbd">←</span> <span class="kbd">↑</span> <span class="kbd">↓</span> <span class="kbd">→</span></td></tr>
      <tr><td><b>Nudge 10 Pixels</b></td><td style="text-align: right;"><span class="kbd">⇧ Shift</span> + <span class="kbd">← ↑ ↓ →</span></td></tr>
      <tr><td><b>Pan Workspace</b></td><td style="text-align: right;">Hold <span class="kbd">Space</span> + Drag</td></tr>
      <tr><td><b>Toggle Rulers & Guides</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">R</span></td></tr>
      <tr><td><b>Toggle Fullscreen</b></td><td style="text-align: right;"><span class="kbd">Tab</span></td></tr>
      <tr><td><b>Deselect / Exit Modes</b></td><td style="text-align: right;"><span class="kbd">Esc</span></td></tr>
      <tr><td><b>Context Menu</b></td><td style="text-align: right;">Right-click Canvas or Element</td></tr>
      <tr><td><b>Edit Text Inline</b></td><td style="text-align: right;">Double-click text element</td></tr>
      <tr><td><b>Select Inside Group</b></td><td style="text-align: right;">Double-click grouped element</td></tr>
      <tr><td><b>Workspace Settings</b></td><td style="text-align: right;">Right-click empty workspace</td></tr>
    </table>`;
  openModal('Shortcuts', body, false);
});






function checkVersionUpdate() {
  const currentVersion = 'v0.19.14';
  const lastSeen = localStorage.getItem('last-seen-version');
  
  if (!lastSeen) {
    localStorage.setItem('last-seen-version', currentVersion);
  } else if (lastSeen !== currentVersion) {
    const updatesHtml = generateChangelogHtml(lastSeen);
    
    const modal = document.createElement('div');
    modal.id = 'version-update-modal';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(0, 0, 0, 0.7)';
    modal.style.zIndex = '1000';
    
    modal.innerHTML = `
      <div style="background:var(--bg-panel); border:1px solid var(--border-light); border-radius:8px; width:480px; max-width:90%; padding:24px; box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.5); display:flex; flex-direction:column; gap:16px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <h2 style="margin:0; font-size:16px; font-weight:600; color:var(--text-bright);">RMIT Adflow Updated</h2>
            <span style="background:var(--accent-base); color:var(--text-bright); font-size:10px; font-weight:700; padding:2px 6px; border-radius:12px;">${currentVersion}</span>
          </div>
          <span style="font-size:11px; color:var(--text-muted);">Updated from ${lastSeen}</span>
        </div>
        <div style="font-size:13px; color:var(--text-muted); line-height:1.5;">
          Welcome to the new update! Here's what's new since your last session (${lastSeen}):
        </div>
        <div style="max-height:250px; overflow-y:auto; border:1px solid var(--border-light); border-radius:6px; padding:16px; background:var(--bg-input);">
          ${updatesHtml}
        </div>
        <div style="display:flex; justify-content:flex-end;">
          <button id="btn-close-update-notif" class="btn primary" style="padding:8px 16px; font-size:12px; font-weight:600; cursor:pointer;">Awesome</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('btn-close-update-notif').addEventListener('click', () => {
      modal.remove();
    });
    
    localStorage.setItem('last-seen-version', currentVersion);
  }
}


document.getElementById('menu-about').addEventListener('click', () => {
  const currentVersion = 'v0.18.2';
  const body = `
      <div style="font-size:13px; line-height:1.75; color:var(--text-main); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <p style="margin: 0 0 16px 0;">Hi, I’m Danh.</p>
        <p style="margin: 0 0 16px 0;">After months of wrestling with legacy display ad editors, I came to a very professional conclusion: banner production should not be this painful.</p>
        <p style="margin: 0 0 16px 0;">These tools somehow manage to be both massively overkill and still missing basic features I need daily. Weird workflows, clicktag chaos, timeline madness, random compatibility issues, and somehow every single ad feels like a fight against the software instead of actually designing.</p>
        <p style="margin: 0 0 16px 0;">So eventually I hit the point where I thought:<br/>
        “Fuck it, I’ll just build my own.”</p>
        <p style="margin: 0 0 16px 0;">This project is my attempt at creating the HTML5 ad tool I always wanted: fast, lightweight, visual, export-friendly, standards-compatible, and without the feeling that the software is actively fighting me.</p>
        <p style="margin: 0 0 16px 0;">Also, my teammate Eden, who has suffered through years of banner production alongside me, may finally have his curse lifted.</p>
        <p style="font-style:italic; margin: 24px 0 0 0; color:var(--text-label);">Built by a designer trying to free creative teams from cursed display ad workflows.</p>
        <div style="margin-top:24px; padding-top:16px; border-top:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; color:var(--text-muted);">${currentVersion}</span>
            <button id="btn-changelog" class="btn" style="padding:6px 12px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; cursor:pointer;">Version and changelog</button>
          </div>
          <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" style="display:inline-block; padding:8px 16px; background:#f59e0b; color:var(--bg-input); text-decoration:none; border-radius:4px; font-weight:600; font-size:13px; transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">☕ Buy me a cà phê</a>
        </div>
      </div>`;
  openModal('About RMIT Adflow', body, false);
  const btnChangelog = document.getElementById('btn-changelog');
  if (btnChangelog) {
    btnChangelog.onclick = () => {
      openChangelogModal();
    };
  }
});

function isOutlineModeAllowed() {
  if (state.isPreviewMode || state.singlePreviewId || document.body.classList.contains('preview-active')) {
    return false;
  }
  if (document.querySelector('.modal-bg') !== null) {
    return false;
  }
  const cpModal = document.getElementById('color-picker-modal');
  if (cpModal && cpModal.style.display === 'flex') {
    return false;
  }
  const splash = document.getElementById('app-splash');
  if (splash && !splash.classList.contains('app-splash-out')) {
    return false;
  }
  return true;
}

function toggleOutlineMode() {
  if (!isOutlineModeAllowed()) return;
  state.outlineMode = !state.outlineMode;
  document.body.classList.toggle('outline-mode', state.outlineMode);
  if (typeof showCanvasNotification === 'function') {
    showCanvasNotification(state.outlineMode ? 'Outline Mode Enabled' : 'Normal Preview');
  }
}

document.getElementById('menu-view-clear-guides').addEventListener('click', () => { state.guides = []; render(); });
document.getElementById('menu-view-outline').addEventListener('click', () => { toggleOutlineMode(); });
document.getElementById('menu-open-settings').addEventListener('click', () => { openSettings(); });


// Settings panel — opens from the main menu only, doesn't live among the working
// panels. Houses everything that's an app/view preference (rulers, snapping,
// theme) plus the new Crop-to-Canvas toggle.
const THEMES = [
  { id: 'default', label: 'Adflow' },
  { id: 'obsidian', label: 'Obsidian' },
  { id: 'nordic', label: 'Nordic' },
  { id: 'amber', label: 'Amber' },
  { id: 'amethyst', label: 'Amethyst' },
  { id: 'rmit-navy', label: 'RMIT Navy' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'navy', label: 'Navy' },
  { id: 'light', label: 'Light' },
  { id: 'rmit', label: 'RMIT' },
  { id: 'nordic-light', label: 'Nordic Light' },
  { id: 'amber-light', label: 'Amber Light' },
  { id: 'sage-light', label: 'Sage Light' },
];

function openSettings() {
  const existing = document.getElementById('settings-panel-bg');
  if (existing) { existing.remove(); return; }

  let mode = localStorage.getItem('adflow-startup-mode') || 'fresh';
  if (mode === 'startup') mode = 'Adflow_startup.flow';

  // Store initial settings configuration for rollback
  const initialSettings = {
    theme: state.theme || 'default',
    startupMode: mode,
    showRulers: state.showRulers !== false,
    cropToCanvas: !!state.cropToCanvas,
    tempTopDuringDrag: !!state.tempTopDuringDrag,
    zoomStep: state.zoomStep !== undefined ? state.zoomStep : 0.1,
    defaultBg: state.defaultBg || '#0f172a',
    snapEnabled: state.snapEnabled !== false,
    snapToElements: state.snapToElements !== false,
    snapToCanvas: state.snapToCanvas !== false,
    snapToGuides: state.snapToGuides !== false,
    snapDistance: state.snapDistance !== undefined ? state.snapDistance : 5,
    savedHistoryLimit: state.savedHistoryLimit !== undefined ? state.savedHistoryLimit : 50,
    autosaveInterval: state.autosaveInterval !== undefined ? state.autosaveInterval : 10,
    adSizeLimit: state.adSizeLimit !== undefined ? state.adSizeLimit : 150,
    validationSettings: {
      textSize: state.validationSettings?.textSize !== false,
      contrast: state.validationSettings?.contrast !== false,
      transitionTiming: state.validationSettings?.transitionTiming !== false,
      infiniteMotion: state.validationSettings?.infiniteMotion !== false,
      cricos: state.validationSettings?.cricos !== false,
      logo: state.validationSettings?.logo !== false,
      brandColors: state.validationSettings?.brandColors !== false,
      brandFonts: state.validationSettings?.brandFonts !== false
    }
  };

  // Deep clone of settings variables into tempSettings
  const tempSettings = JSON.parse(JSON.stringify(initialSettings));

  const bg = document.createElement('div');
  bg.id = 'settings-panel-bg';
  bg.className = 'modal-bg';

  const lightThemeIds = new Set(['light', 'rmit', 'nordic-light', 'amber-light', 'sage-light']);

  const buildThemeGrid = (filterFn) => THEMES.filter(filterFn).map(t => {
    const active = tempSettings.theme === t.id;
    return `<button class="settings-theme-btn${active ? ' active' : ''}" data-theme="${t.id}">${t.label}</button>`;
  }).join('');

  const darkThemeBtns = buildThemeGrid(t => !lightThemeIds.has(t.id));
  const lightThemeBtns = buildThemeGrid(t => lightThemeIds.has(t.id));

  const buildStartupOptions = () => {
    const opts = [];
    opts.push(`<option value="fresh" ${tempSettings.startupMode === 'fresh' ? 'selected' : ''}>Start fresh as normal</option>`);
    if (Array.isArray(startupTemplates) && startupTemplates.length > 0) {
      opts.push('<optgroup label="Startup Templates">');
      startupTemplates.forEach(t => {
        const isSelected = tempSettings.startupMode === t.fileName;
        opts.push(`<option value="${t.fileName}" ${isSelected ? 'selected' : ''}>${t.projectName} (${t.fileName})</option>`);
      });
      opts.push('</optgroup>');
    } else {
      const isSelected = tempSettings.startupMode === 'Adflow_startup.flow';
      opts.push(`<option value="Adflow_startup.flow" ${isSelected ? 'selected' : ''}>RMIT_ad (Adflow_startup.flow)</option>`);
    }
    return opts.join('');
  };

  const row = (id, label, checked, hint = '') => `
        <label class="settings-row" style="display:flex; align-items:flex-start; gap:10px; padding:8px 10px; border-radius:6px; cursor:pointer;">
          <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="margin:2px 0 0 0;" />
          <span style="display:flex; flex-direction:column; gap:2px;">
            <span style="font-size:12px; color:var(--text-main);">${label}</span>
            ${hint ? `<span style="font-size:10px; color:var(--text-muted);">${hint}</span>` : ''}
          </span>
        </label>`;

  bg.innerHTML = `
        <div class="modal" style="width:820px; max-width:95vw; height:600px; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; padding:0;">
          <!-- Modal Header -->
          <div class="modal-head" style="border-bottom:1px solid var(--border-light); background:var(--bg-panel); flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:12px; flex:1;">
              <h2 style="margin:0; font-size:14px; font-weight:600; color:var(--text-bright);">Settings</h2>
              <span style="font-size:11px; color:var(--text-muted);">v0.19.14</span>
              <button id="settings-changelog" class="btn" style="padding:4px 8px; font-size:10px; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; cursor:pointer;">Changelog</button>
            </div>
            <button class="btn" id="settings-close">Close</button>
          </div>
          
          <!-- Modal Content: Vertical Navigation + Panels Container -->
          <div style="display:flex; flex:1; min-height:0;">
            <!-- Left Navigation Sidebar -->
            <div class="settings-tabs-nav-vertical">
              <button class="settings-tab-btn-vertical active" data-tab="general">General & View</button>
              <button class="settings-tab-btn-vertical" data-tab="snapping">Snapping & Layout</button>
              <button class="settings-tab-btn-vertical" data-tab="validation">Validation & QC</button>
              <button class="settings-tab-btn-vertical" data-tab="performance">History & Export</button>
            </div>
            
            <!-- Right Panels Content -->
            <div class="modal-body" style="flex:1; padding:20px 24px; overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
              <!-- Tab 1: General & View -->
              <div class="settings-tab-panel" id="panel-general" style="display:flex; flex-direction:column; gap:14px;">
                <section style="display:flex; flex-direction:column; gap:8px;">
                  <h3 style="margin:0 0 4px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">View Settings</h3>
                  ${row('set-rulers', 'Show rulers & guides', tempSettings.showRulers)}
                  ${row('set-crop', 'Crop to Canvas', tempSettings.cropToCanvas, 'Hide anything placed outside the canvas bounds while you work.')}
                  ${row('set-temp-top', 'Temporarily on top during drag', tempSettings.tempTopDuringDrag, 'Temporarily bring the dragged layer to the front layer during dragging.')}
                </section>
                
                <section style="display:flex; flex-direction:column; gap:10px; padding:4px 0; border-top:1px solid var(--border-light); padding-top:14px;">
                  <h3 style="margin:0 0 4px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">Canvas Configuration</h3>
                  <div style="display:flex; align-items:center; gap:12px; font-size:12px; color:var(--text-main);">
                    <span style="flex:1;">Mouse Scroll Zoom Step:</span>
                    <input type="number" id="set-zoom-step" value="${Math.round(tempSettings.zoomStep * 100)}" min="1" max="50" style="width:65px; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:3px 8px; font-family:inherit; font-size:12px;" />
                    <span style="color:var(--text-muted); width:20px;">%</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:12px; font-size:12px; color:var(--text-main);">
                    <span style="flex:1;">Default Canvas Background:</span>
                    <input type="color" id="set-default-bg" value="${tempSettings.defaultBg}" style="width:65px; height:24px; padding:0; border:1px solid var(--border-light); background:none; border-radius:4px; cursor:pointer;" />
                    <span id="default-bg-preview" style="color:var(--text-muted); font-size:11px; font-family:monospace; width:60px;">${tempSettings.defaultBg}</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:12px; font-size:12px; color:var(--text-main);">
                    <span style="flex:1;">Startup Template preference:</span>
                    <select id="set-startup-mode" style="width:240px; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 8px; font-family:inherit; font-size:12px; outline:none; cursor:pointer;">
                      ${buildStartupOptions()}
                    </select>
                  </div>
                </section>

                <section style="display:flex; flex-direction:column; gap:12px; border-top:1px solid var(--border-light); padding-top:14px;">
                  <h3 style="margin:0 0 4px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">Theme</h3>
                  
                  <div style="display:flex; flex-direction:column; gap:6px;">
                    <span style="font-size:11px; color:var(--text-muted); font-weight:500;">Dark Themes</span>
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">${darkThemeBtns}</div>
                  </div>
                  
                  <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
                    <span style="font-size:11px; color:var(--text-muted); font-weight:500;">Light Themes</span>
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">${lightThemeBtns}</div>
                  </div>
                </section>
              </div>
              
              <!-- Tab 2: Snapping & Layout -->
              <div class="settings-tab-panel" id="panel-snapping" style="display:none; flex-direction:column; gap:14px;">
                <section style="display:flex; flex-direction:column; gap:8px;">
                  <h3 style="margin:0 0 4px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">Snapping Options</h3>
                  ${row('set-snap', 'Enable Snapping', tempSettings.snapEnabled, 'Master switch — turning off disables all snapping behavior.')}
                  ${row('set-snap-el', 'Snap to other elements', tempSettings.snapToElements)}
                  ${row('set-snap-cv', 'Snap to canvas bounds', tempSettings.snapToCanvas)}
                  ${row('set-snap-gd', 'Snap to guides', tempSettings.snapToGuides)}
                </section>

                <section style="display:flex; flex-direction:column; gap:10px; padding:4px 0; border-top:1px solid var(--border-light); padding-top:14px;">
                  <h3 style="margin:0 0 4px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">Snapping Threshold</h3>
                  <div style="display:flex; align-items:center; gap:12px; font-size:12px; color:var(--text-main);">
                    <span style="flex:1;">Snapping Distance Tolerance:</span>
                    <input type="number" id="set-snap-distance" value="${tempSettings.snapDistance}" min="2" max="25" style="width:65px; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:3px 8px; font-family:inherit; font-size:12px;" />
                    <span style="color:var(--text-muted); width:20px;">px</span>
                  </div>
                  <div style="font-size:10px; color:var(--text-muted); line-height:1.4;">
                    Defines the sensitivity radius (in pixels) for magnet snapping when dragging guides or design elements.
                  </div>
                </section>
              </div>

              <!-- Tab 3: Validation & QC -->
              <div class="settings-tab-panel" id="panel-validation" style="display:none; flex-direction:column; gap:14px;">
                <section style="display:flex; flex-direction:column; gap:8px;">
                  <h3 style="margin:0 0 4px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">Active QC Audits</h3>
                  ${row('val-text-size', 'Audit text minimum sizes', tempSettings.validationSettings.textSize, 'Flags text layers scaled below critical legibility heights.')}
                  ${row('val-contrast', 'Audit color contrast ratio', tempSettings.validationSettings.contrast, 'Verifies background/foreground contrast conforms to WCAG AA accessibility rules.')}
                  ${row('val-timing', 'Audit animation transition timings', tempSettings.validationSettings.transitionTiming, 'Flags invalid animation durations or custom timeline delays.')}
                  ${row('val-motion', 'Audit infinite loop motion', tempSettings.validationSettings.infiniteMotion, 'Flags loop counts exceeding standard guidelines (e.g. max 15 seconds loop).')}
                  ${row('val-cricos', 'CRICOS registration code verification', tempSettings.validationSettings.cricos, 'Warns if CRICOS provider code is missing or empty in RMIT brand ads.')}
                  ${row('val-logo', 'RMIT Brand Logo presence', tempSettings.validationSettings.logo, 'Verifies RMIT brand logo is correctly present and visible.')}
                  ${row('val-brand-colors', 'RMIT brand color validation', tempSettings.validationSettings.brandColors, 'Validates that color values match RMIT corporate identity guides.')}
                  ${row('val-brand-fonts', 'RMIT brand typography validation', tempSettings.validationSettings.brandFonts, 'Validates that typography elements use corporate fonts.')}
                </section>
              </div>
              
              <!-- Tab 4: History & Export -->
              <div class="settings-tab-panel" id="panel-performance" style="display:none; flex-direction:column; gap:14px;">
                <section style="display:flex; flex-direction:column; gap:10px;">
                  <h3 style="margin:0 0 4px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">History Engine</h3>
                  <label style="display:flex; align-items:center; gap:12px; font-size:12px; color:var(--text-main); cursor:pointer;">
                    <span style="flex:1;">Undo / Redo History Limit:</span>
                    <input type="number" id="set-history-limit" value="${tempSettings.savedHistoryLimit}" min="5" max="100" style="width:65px; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:3px 8px; font-family:inherit; font-size:12px;" />
                  </label>
                  <label style="display:flex; align-items:center; gap:12px; font-size:12px; color:var(--text-main); cursor:pointer;">
                    <span style="flex:1;">Local Auto-Save Interval:</span>
                    <input type="number" id="set-autosave-interval" value="${tempSettings.autosaveInterval}" min="5" max="60" style="width:65px; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:3px 8px; font-family:inherit; font-size:12px;" />
                    <span style="color:var(--text-muted); font-size:11px;">seconds</span>
                  </label>
                </section>

                <section style="display:flex; flex-direction:column; gap:10px; border-top:1px solid var(--border-light); padding-top:14px;">
                  <h3 style="margin:0 0 4px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">Export Pipelines</h3>
                  <label style="display:flex; align-items:center; gap:12px; font-size:12px; color:var(--text-main); cursor:pointer;">
                    <span style="flex:1;">Max Ad Weight Limit (IAB):</span>
                    <input type="number" id="set-ad-limit" value="${tempSettings.adSizeLimit}" min="50" max="1000" style="width:65px; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:3px 8px; font-family:inherit; font-size:12px;" />
                    <span style="color:var(--text-muted); font-size:11px; width:20px;">KB</span>
                  </label>
                  <div style="font-size:10px; color:var(--text-muted); line-height:1.4;">
                    Default payload threshold target (IAB Standard displays flag ads above this target size as non-compliant).
                  </div>
                </section>

                <div style="font-size:10px; color:#f59e0b; line-height:1.4; display:flex; align-items:flex-start; gap:6px; border-top:1px solid var(--border-light); padding-top:14px; margin-top:4px;">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0; margin-top:1px;">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>Warning: Undo stack stores element structures but does not persist deleted local files (like uncommitted custom fonts/images) after browser reloads.</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Modal Footer: Save and Cancel with Preview option -->
          <div class="modal-foot" style="border-top:1px solid var(--border-light); background:var(--bg-panel); flex-shrink:0; display:flex; align-items:center; justify-content:space-between; width:100%;">
            <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-main); cursor:pointer; user-select:none; margin:0;">
              <input type="checkbox" id="settings-preview-toggle" checked style="margin:0;" />
              <span>Preview changes instantly</span>
            </label>
            <div style="display:flex; gap:8px;">
              <button class="btn" id="settings-cancel">Cancel</button>
              <button class="btn primary" id="settings-save">Save Changes</button>
            </div>
          </div>
        </div>`;

  document.body.appendChild(bg);

  const applyPreview = () => {
    const isPreviewChecked = bg.querySelector('#settings-preview-toggle').checked;
    if (isPreviewChecked) {
      state.theme = tempSettings.theme;
      state.showRulers = tempSettings.showRulers;
      state.cropToCanvas = tempSettings.cropToCanvas;
      state.tempTopDuringDrag = tempSettings.tempTopDuringDrag;
      state.zoomStep = tempSettings.zoomStep;
      state.defaultBg = tempSettings.defaultBg;
      state.snapEnabled = tempSettings.snapEnabled;
      state.snapToElements = tempSettings.snapToElements;
      state.snapToCanvas = tempSettings.snapToCanvas;
      state.snapToGuides = tempSettings.snapToGuides;
      state.snapDistance = tempSettings.snapDistance;
      state.savedHistoryLimit = tempSettings.savedHistoryLimit;
      state.autosaveInterval = tempSettings.autosaveInterval;
      state.adSizeLimit = tempSettings.adSizeLimit;

      if (!state.validationSettings) state.validationSettings = {};
      Object.assign(state.validationSettings, tempSettings.validationSettings);

      document.body.className = state.theme && state.theme !== 'default' ? 'theme-' + state.theme : '';
      syncAdflowLogos();

      if (state.activeCanvasId) {
        const activeCanvas = state.canvases.find(c => c.id === state.activeCanvasId);
        if (activeCanvas && typeof runAuditChecks === 'function') {
          runAuditChecks(activeCanvas);
        }
      }
      if (typeof queueSizeUpdate === 'function') queueSizeUpdate();
      render();
    }
  };

  const revertToInitial = () => {
    state.theme = initialSettings.theme;
    state.showRulers = initialSettings.showRulers;
    state.cropToCanvas = initialSettings.cropToCanvas;
    state.tempTopDuringDrag = initialSettings.tempTopDuringDrag;
    state.zoomStep = initialSettings.zoomStep;
    state.defaultBg = initialSettings.defaultBg;
    state.snapEnabled = initialSettings.snapEnabled;
    state.snapToElements = initialSettings.snapToElements;
    state.snapToCanvas = initialSettings.snapToCanvas;
    state.snapToGuides = initialSettings.snapToGuides;
    state.snapDistance = initialSettings.snapDistance;
    state.savedHistoryLimit = initialSettings.savedHistoryLimit;
    state.autosaveInterval = initialSettings.autosaveInterval;
    state.adSizeLimit = initialSettings.adSizeLimit;

    if (!state.validationSettings) state.validationSettings = {};
    state.validationSettings = JSON.parse(JSON.stringify(initialSettings.validationSettings));

    document.body.className = state.theme && state.theme !== 'default' ? 'theme-' + state.theme : '';
    syncAdflowLogos();

    if (state.activeCanvasId) {
      const activeCanvas = state.canvases.find(c => c.id === state.activeCanvasId);
      if (activeCanvas && typeof runAuditChecks === 'function') {
        runAuditChecks(activeCanvas);
      }
    }
    if (typeof queueSizeUpdate === 'function') queueSizeUpdate();
    render();
  };

  const closeFn = () => {
    revertToInitial();
    bg.remove();
    document.removeEventListener('keydown', escHandler);
  };
  const escHandler = (e) => { if (e.key === 'Escape') closeFn(); };
  document.addEventListener('keydown', escHandler);
  bg.querySelector('#settings-cancel').addEventListener('click', closeFn);
  bg.querySelector('#settings-close').addEventListener('click', closeFn);
  
  const btnChangelog = bg.querySelector('#settings-changelog');
  if (btnChangelog) {
    btnChangelog.addEventListener('click', () => {
      openChangelogModal();
    });
  }
  bg.addEventListener('click', (e) => { if (e.target === bg) closeFn(); });

  bg.querySelector('#settings-preview-toggle').addEventListener('change', (e) => {
    if (e.target.checked) {
      applyPreview();
    } else {
      revertToInitial();
    }
  });

  // Tab switching logic for vertical layout
  const tabBtns = bg.querySelectorAll('.settings-tab-btn-vertical');
  const tabPanels = bg.querySelectorAll('.settings-tab-panel');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      
      const tabId = btn.dataset.tab;
      tabPanels.forEach(p => {
        p.style.display = p.id === `panel-${tabId}` ? 'flex' : 'none';
      });
    });
  });

  // Bind settings change listeners to tempSettings
  const bind = (id, key) => bg.querySelector('#' + id).addEventListener('change', (e) => {
    tempSettings[key] = e.target.checked;
    applyPreview();
  });
  bind('set-rulers', 'showRulers');
  bind('set-crop', 'cropToCanvas');
  bind('set-temp-top', 'tempTopDuringDrag');
  bind('set-snap', 'snapEnabled');
  bind('set-snap-el', 'snapToElements');
  bind('set-snap-cv', 'snapToCanvas');
  bind('set-snap-gd', 'snapToGuides');

  // Validation checkbox bindings to tempSettings
  const bindVal = (id, key) => bg.querySelector('#' + id).addEventListener('change', (e) => {
    tempSettings.validationSettings[key] = e.target.checked;
    applyPreview();
  });
  bindVal('val-text-size', 'textSize');
  bindVal('val-contrast', 'contrast');
  bindVal('val-timing', 'transitionTiming');
  bindVal('val-motion', 'infiniteMotion');
  bindVal('val-cricos', 'cricos');
  bindVal('val-logo', 'logo');
  bindVal('val-brand-colors', 'brandColors');
  bindVal('val-brand-fonts', 'brandFonts');

  bg.querySelector('#set-history-limit').addEventListener('change', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 5) val = 5;
    if (val > 100) val = 100;
    e.target.value = val;
    tempSettings.savedHistoryLimit = val;
    applyPreview();
  });

  bg.querySelector('#set-zoom-step').addEventListener('change', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 50) val = 50;
    e.target.value = val;
    tempSettings.zoomStep = val / 100;
    applyPreview();
  });

  bg.querySelector('#set-autosave-interval').addEventListener('change', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 5) val = 5;
    if (val > 60) val = 60;
    e.target.value = val;
    tempSettings.autosaveInterval = val;
    applyPreview();
  });

  bg.querySelector('#set-snap-distance').addEventListener('change', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 2) val = 2;
    if (val > 25) val = 25;
    e.target.value = val;
    tempSettings.snapDistance = val;
    applyPreview();
  });

  bg.querySelector('#set-ad-limit').addEventListener('change', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 50) val = 50;
    if (val > 1000) val = 1000;
    e.target.value = val;
    tempSettings.adSizeLimit = val;
    applyPreview();
  });

  bg.querySelector('#set-default-bg').addEventListener('input', (e) => {
    tempSettings.defaultBg = e.target.value;
    const label = bg.querySelector('#default-bg-preview');
    if (label) label.textContent = tempSettings.defaultBg;
    applyPreview();
  });

  const selectStartupMode = bg.querySelector('#set-startup-mode');
  if (selectStartupMode) {
    selectStartupMode.addEventListener('change', (e) => {
      tempSettings.startupMode = e.target.value;
    });
  }

  bg.querySelectorAll('.settings-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tempSettings.theme = btn.dataset.theme;
      // Restyle the theme buttons in place without rebuilding the panel.
      bg.querySelectorAll('.settings-theme-btn').forEach(b => {
        const active = b.dataset.theme === tempSettings.theme;
        b.classList.toggle('active', active);
      });
      applyPreview();
    });
  });

  // Save Settings handler - applies changes to global state and persists them
  bg.querySelector('#settings-save').addEventListener('click', () => {
    // Apply changes
    state.theme = tempSettings.theme;
    state.showRulers = tempSettings.showRulers;
    state.cropToCanvas = tempSettings.cropToCanvas;
    state.tempTopDuringDrag = tempSettings.tempTopDuringDrag;
    state.zoomStep = tempSettings.zoomStep;
    state.defaultBg = tempSettings.defaultBg;
    state.snapEnabled = tempSettings.snapEnabled;
    state.snapToElements = tempSettings.snapToElements;
    state.snapToCanvas = tempSettings.snapToCanvas;
    state.snapToGuides = tempSettings.snapToGuides;
    state.snapDistance = tempSettings.snapDistance;
    state.savedHistoryLimit = tempSettings.savedHistoryLimit;
    state.autosaveInterval = tempSettings.autosaveInterval;
    state.adSizeLimit = tempSettings.adSizeLimit;

    if (!state.validationSettings) state.validationSettings = {};
    Object.assign(state.validationSettings, tempSettings.validationSettings);

    // Persist Startup Mode Preference
    localStorage.setItem('adflow-startup-mode', tempSettings.startupMode);

    // Apply theme change on body
    document.body.className = state.theme && state.theme !== 'default' ? 'theme-' + state.theme : '';
    syncAdflowLogos();

    // Trigger validation and rendering
    if (state.activeCanvasId) {
      const activeCanvas = state.canvases.find(c => c.id === state.activeCanvasId);
      if (activeCanvas && typeof runAuditChecks === 'function') {
        runAuditChecks(activeCanvas);
      }
    }
    if (typeof queueSizeUpdate === 'function') queueSizeUpdate();
    render();

    // Force autosave write
    scheduleAutosave();

    // Close modal directly without rollback
    bg.remove();
    document.removeEventListener('keydown', escHandler);
    showCanvasNotification('Settings saved.', { type: 'success' });
  });
}

function showLoadingProgress(title) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg loading-progress-bg';
  bg.style.cssText = 'position:fixed; inset:0; background:rgba(0, 0, 0, 0.75); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:110000; pointer-events:all; user-select:none;';
  
  bg.innerHTML = `
    <div class="modal loading-progress-modal" style="width:340px; padding:24px; background:var(--bg-panel); border:1px solid var(--border-light); border-radius:8px; box-shadow:0 20px 50px rgba(0,0,0,0.5); text-align:center; display:flex; flex-direction:column; gap:16px;">
      <div style="font-size:15px; font-weight:600; color:var(--text-bright);" class="loading-title">${title || 'Loading Project...'}</div>
      <div style="width:100%; height:6px; background:var(--bg-input); border-radius:3px; overflow:hidden; border:1px solid var(--border-light);">
        <div class="loading-bar" style="width:0%; height:100%; background:var(--accent-base); box-shadow:0 0 8px var(--accent-base); transition:width 0.15s ease-out;"></div>
      </div>
      <div style="font-size:11px; color:var(--text-muted);" class="loading-status">Preparing...</div>
    </div>
  `;
  document.body.appendChild(bg);
  
  const stopEsc = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
    }
  };
  window.addEventListener('keydown', stopEsc, true);
  
  return {
    setProgress: (percent, statusText) => {
      const bar = bg.querySelector('.loading-bar');
      const status = bg.querySelector('.loading-status');
      if (bar) bar.style.width = percent + '%';
      if (status && statusText) status.textContent = statusText;
    },
    close: () => {
      bg.remove();
      window.removeEventListener('keydown', stopEsc, true);
    }
  };
}
window.showLoadingProgress = showLoadingProgress;

// ============================================================================
// Modal
// ============================================================================
function openModal(title, body, isCode) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h2>${title}</h2>
        <button class="btn" id="modal-close" title="Close dialog">Close</button>
      </div>
      <div class="modal-body">
        ${isCode ? `<textarea id="modal-text" spellcheck="false"></textarea>` : `<div>${body}</div>`}
      </div>
      <div class="modal-foot">
        ${isCode ? `<button class="btn" id="modal-copy" title="Copy code to clipboard">Copy</button>
                    <button class="btn primary" id="modal-download" title="Download as HTML file">Download .html</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(bg);
  if (isCode) bg.querySelector('#modal-text').value = body;
  const closeFn = () => {
    bg.remove();
    document.removeEventListener('keydown', escHandler);
  };
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      const allBgs = document.querySelectorAll('.modal-bg');
      if (allBgs.length > 0 && allBgs[allBgs.length - 1] === bg) {
        closeFn();
      }
    }
  };
  document.addEventListener('keydown', escHandler);
  bg.querySelector('#modal-close').onclick = closeFn;
  bg.onclick = (e) => { if (e.target === bg) closeFn(); };
  if (isCode) {
    bg.querySelector('#modal-copy').onclick = () => {
      navigator.clipboard.writeText(body);
      bg.querySelector('#modal-copy').textContent = 'Copied!';
      setTimeout(() => { const b = bg.querySelector('#modal-copy'); if (b) b.textContent = 'Copy'; }, 1200);
    };
    bg.querySelector('#modal-download').onclick = () => {
      const c = getActiveCanvas();
      const blob = new Blob([body], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const projName = state.projectName || 'Ad';
      const safeName = projName.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeName}_${c.width}x${c.height}.html`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }
}

function showAdflowAlert(message, title = 'Notification') {
  return new Promise((resolve) => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `
      <div class="modal" style="max-width: 400px; display: flex; flex-direction: column; gap: 16px;">
        <div class="modal-head">
          <h2>${title}</h2>
          <button class="btn" id="adflow-alert-close" title="Close">Close</button>
        </div>
        <div class="modal-body" style="font-size: 13px; color: var(--text-main); line-height: 1.5; padding: 18px 22px;">
          ${message}
        </div>
        <div class="modal-foot" style="display: flex; justify-content: flex-end;">
          <button class="btn primary" id="adflow-alert-ok">OK</button>
        </div>
      </div>`;
    document.body.appendChild(bg);

    const closeFn = () => {
      bg.remove();
      document.removeEventListener('keydown', escHandler);
      resolve();
    };
    const escHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        closeFn();
      }
    };
    document.addEventListener('keydown', escHandler);
    bg.querySelector('#adflow-alert-close').onclick = closeFn;
    bg.querySelector('#adflow-alert-ok').onclick = closeFn;
    bg.querySelector('#adflow-alert-ok').focus();
    bg.onclick = (e) => { if (e.target === bg) closeFn(); };
  });
}

function showAdflowConfirm(message, title = 'Confirm Action') {
  return new Promise((resolve) => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `
      <div class="modal" style="max-width: 400px; display: flex; flex-direction: column; gap: 16px;">
        <div class="modal-head">
          <h2>${title}</h2>
          <button class="btn" id="adflow-confirm-close" title="Close">Close</button>
        </div>
        <div class="modal-body" style="font-size: 13px; color: var(--text-main); line-height: 1.5; padding: 18px 22px;">
          ${message}
        </div>
        <div class="modal-foot" style="display: flex; justify-content: flex-end; gap: 12px;">
          <button class="btn" id="adflow-confirm-cancel">Cancel</button>
          <button class="btn primary" id="adflow-confirm-ok">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(bg);

    const closeFn = (val) => {
      bg.remove();
      document.removeEventListener('keydown', escHandler);
      resolve(val);
    };
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFn(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        closeFn(true);
      }
    };
    document.addEventListener('keydown', escHandler);
    bg.querySelector('#adflow-confirm-close').onclick = () => closeFn(false);
    bg.querySelector('#adflow-confirm-cancel').onclick = () => closeFn(false);
    bg.querySelector('#adflow-confirm-ok').onclick = () => closeFn(true);
    bg.querySelector('#adflow-confirm-ok').focus();
    bg.onclick = (e) => { if (e.target === bg) closeFn(false); };
  });
}

function showAdflowPrompt(message, defaultValue = '', title = 'Input Required') {
  return new Promise((resolve) => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `
      <div class="modal" style="max-width: 420px; display: flex; flex-direction: column; gap: 16px;">
        <div class="modal-head">
          <h2>${title}</h2>
          <button class="btn" id="adflow-prompt-close" title="Close">Close</button>
        </div>
        <div class="modal-body" style="display: flex; flex-direction: column; gap: 12px; font-size: 13px; color: var(--text-main); padding: 18px 22px;">
          <div>${message}</div>
          <input type="text" id="adflow-prompt-input" value="${defaultValue.replace(/"/g, '&quot;')}" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 4px; padding: 7px 9px; font-size: 12px; outline: none;" />
        </div>
        <div class="modal-foot" style="display: flex; justify-content: flex-end; gap: 12px;">
          <button class="btn" id="adflow-prompt-cancel">Cancel</button>
          <button class="btn primary" id="adflow-prompt-ok">OK</button>
        </div>
      </div>`;
    document.body.appendChild(bg);

    const input = bg.querySelector('#adflow-prompt-input');
    input.focus();
    input.select();

    const closeFn = (val) => {
      bg.remove();
      document.removeEventListener('keydown', escHandler);
      resolve(val);
    };
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFn(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        closeFn(input.value);
      }
    };
    document.addEventListener('keydown', escHandler);
    bg.querySelector('#adflow-prompt-close').onclick = () => closeFn(null);
    bg.querySelector('#adflow-prompt-cancel').onclick = () => closeFn(null);
    bg.querySelector('#adflow-prompt-ok').onclick = () => closeFn(input.value);
    bg.onclick = (e) => { if (e.target === bg) closeFn(null); };
  });
}

function getImageSizeKBSync(url) {
  if (!url || typeof url !== 'string') return 0;
  if (url.startsWith('data:')) {
    const base64Part = url.split(',')[1];
    if (!base64Part) return 0;
    const stringLength = base64Part.length;
    const sizeInBytes = Math.round((stringLength * 3) / 4) - (base64Part.endsWith('==') ? 2 : base64Part.endsWith('=') ? 1 : 0);
    return sizeInBytes / 1024;
  }
  return 0;
}

function getElementSizeKB(el) {
  if (!el) return 0;
  if (el.type === 'image') {
    const src = (el.assetId && state.assets && state.assets[el.assetId]) || el.assetId;
    if (!src) return 0;
    if (src.startsWith('data:')) {
      return getImageSizeKBSync(src);
    }
    if (urlSizeCache[src] !== undefined) {
      return urlSizeCache[src];
    }
    // Asynchronously fetch and cache it so it updates next render
    fetch(src).then(resp => {
      if (resp.ok) return resp.blob();
    }).then(blob => {
      if (blob) {
        urlSizeCache[src] = blob.size / 1024;
        renderCanvasesList();
      }
    }).catch(err => {
      console.error('Failed to fetch asset size in getElementSizeKB', src, err);
    });
    return 0;
  }
  return 0;
}

// Image Compression Utilities
// Resolves the output format for auto-compression from the Settings preference
// (state.compressFormat). 'webp' → always WebP. 'jpeg' (default, ad-server
// safe) → PNG when the image actually uses transparency (JPEG would flatten
// it onto white), JPEG otherwise. WebP assets are rejected by CM360, Google
// Ads and Adobe DSP HTML5 bundles — hence the JPEG/PNG default.
async function resolveAutoCompressFormat(dataUrl) {
  if (state.compressFormat === 'webp') return { format: 'image/webp', ext: '.webp' };
  const hasAlpha = await new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(checkTransparency(img));
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
  return hasAlpha ? { format: 'image/png', ext: '.png' } : { format: 'image/jpeg', ext: '.jpg' };
}

async function getImageSizeKB(url) {
  if (!url || typeof url !== 'string') return '0.0';
  if (url.startsWith('data:')) {
    const base64Part = url.split(',')[1];
    if (!base64Part) return '0.0';
    const stringLength = base64Part.length;
    const sizeInBytes = Math.round((stringLength * 3) / 4) - (base64Part.endsWith('==') ? 2 : base64Part.endsWith('=') ? 1 : 0);
    return (sizeInBytes / 1024).toFixed(1);
  } else {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const blob = await resp.blob();
        return (blob.size / 1024).toFixed(1);
      }
    } catch (err) {
      console.error('Failed to fetch image size for', url, err);
    }
    return '0.0';
  }
}

function checkTransparency(img) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(100, img.naturalWidth);
  canvas.height = Math.min(100, img.naturalHeight);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < imgData.length; i += 4) {
      if (imgData[i] < 255) {
        return true;
      }
    }
  } catch (e) {
    console.warn("Transparency scan failed:", e);
  }
  return false;
}

function compressImage(dataUrl, format, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!dataUrl || typeof dataUrl !== 'string') {
      reject(new Error('Invalid image data URL'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.drawImage(img, 0, 0);
      
      try {
        if (format === 'image/png') {
          if (quality < 1.0) {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            const step = Math.round(1 + Math.pow(1 - quality, 1.5) * 63);
            if (step > 1) {
              for (let i = 0; i < data.length; i += 4) {
                data[i]     = Math.min(255, Math.round(data[i] / step) * step);
                data[i + 1] = Math.min(255, Math.round(data[i + 1] / step) * step);
                data[i + 2] = Math.min(255, Math.round(data[i + 2] / step) * step);
                if (data[i + 3] < 255) {
                  data[i + 3] = Math.min(255, Math.round(data[i + 3] / step) * step);
                }
              }
              ctx.putImageData(imgData, 0, 0);
            }
          }
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(canvas.toDataURL(format, quality));
        }
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for WebP compression'));
    img.src = dataUrl;
  });
}

async function openWebpCompressionModal(el) {
  const _dm = (typeof dmDisplay === 'function') ? dmDisplay(el, true) : {};
  const activeAssetId = _dm.assetId !== undefined ? _dm.assetId : el.assetId;
  const originalDataUrl = (activeAssetId && state.assets && state.assets[activeAssetId]) || activeAssetId;
  if (!originalDataUrl) return;

  const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const warningDisplay = el.isCompressed ? 'block' : 'none';

  // Pre-select per the Settings auto-compression preference (already
  // transparency-aware: JPEG pref resolves to PNG for images with alpha).
  const initialModalFormat = (await resolveAutoCompressFormat(originalDataUrl)).format;

  const activeC = getActiveCanvas();
  const limitKb = state.adSizeLimit || 150;

  // Calculate current ad size dynamically and synchronously to be 100% accurate
  let currentAdSize = 0;
  if (activeC) {
    const tempZip = new JSZip();
    await dmRunExport(dmActiveRowForOutput(), async () => {
      await addCanvasAssetsToZip(activeC, tempZip);
      tempZip.file('index.html', generateExportHTML(activeC, tempZip));
    });
    const tempBlob = await tempZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    currentAdSize = tempBlob.size / 1024;
  }

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <style>
      #webp-quality-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 12px;
        border-radius: 6px;
        border: 1px solid var(--border-light);
        margin: 0;
        cursor: pointer;
        outline: none;
        background-size: 100% 100%, 28px 28px;
        background-repeat: no-repeat, repeat;
        animation: webp-zebra 2s linear infinite;
      }
      #webp-quality-slider:focus {
        outline: none;
      }
      
      /* Webkit track style - transparent since input holds background */
      #webp-quality-slider::-webkit-slider-runnable-track {
        height: 12px;
        background: transparent;
        border: none;
      }
      
      /* Webkit thumb style */
      #webp-quality-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--accent-base);
        border: 2px solid var(--text-bright);
        box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        margin-top: -3px; /* Centering */
        transition: transform 0.15s ease, background-color 0.15s ease;
      }
      #webp-quality-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        background: var(--accent-light);
      }
      
      /* Moz track style - transparent since input holds background */
      #webp-quality-slider::-moz-range-track {
        height: 12px;
        background: transparent;
        border: none;
      }
      
      /* Moz thumb style */
      #webp-quality-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--accent-base);
        border: 2px solid var(--text-bright);
        box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        transition: transform 0.15s ease, background-color 0.15s ease;
      }
      #webp-quality-slider::-moz-range-thumb:hover {
        transform: scale(1.2);
        background: var(--accent-light);
      }
      
      /* Animate only the second background layer (the zebra stripes) */
      @keyframes webp-zebra {
        0% { background-position: 0 0, 0 0; }
        100% { background-position: 0 0, 28px 0; }
      }
      
      #webp-suggested-marker {
        transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.15s ease;
      }
      #webp-suggested-marker:hover {
        transform: translate(-50%, -30px) scale(1.08) !important;
        background-color: #059669 !important;
      }
      #webp-suggested-marker:hover #webp-suggested-arrow {
        border-top-color: #059669 !important;
      }
      #webp-suggested-marker:active {
        transform: translate(-50%, -30px) scale(0.98) !important;
      }
      .format-opt:not(.active):hover {
        background: rgba(255,255,255,0.06) !important;
        color: var(--text-bright) !important;
      }
    </style>
    <div class="modal" style="width:850px;">
      <div class="modal-head">
        <h2>Image Compression</h2>
        <button class="btn" id="webp-close" title="Close dialog">Close</button>
      </div>
      <div class="modal-body" style="display:grid; grid-template-columns:1.2fr 1fr; gap:24px; max-height:580px; overflow-y:auto; padding-right:6px;">
        <!-- Left Column: Interactive controls & zoom preview -->
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="position:relative; width:100%; height:250px; background:#12131a; border:1px solid var(--border-light); border-radius:6px; overflow:hidden; display:flex; align-items:center; justify-content:center;">
            <div id="webp-preview-viewport" style="width:100%; height:100%; overflow:hidden; position:relative; display:flex; align-items:center; justify-content:center; cursor:default; user-select:none;">
              <img id="webp-preview-img" src="${originalDataUrl}" title="Image preview (Drag/Scroll to zoom, drag to pan)" style="max-width:100%; max-height:100%; object-fit:contain; transition:transform 0.1s ease; transform-origin:center center;" />
            </div>
            <div style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.6); padding:4px 8px; border-radius:4px; display:flex; gap:6px; align-items:center; z-index:10; border:1px solid var(--border-light);">
              <button class="btn" id="webp-zoom-out" style="padding:2px 6px; font-size:10px; min-width:20px; border:none; background:var(--bg-input); color:var(--text-bright); font-weight:bold; cursor:pointer;">-</button>
              <span id="webp-zoom-display" style="font-size:10px; color:var(--text-bright); font-weight:600; min-width:32px; text-align:center; user-select:none;">100%</span>
              <button class="btn" id="webp-zoom-in" style="padding:2px 6px; font-size:10px; min-width:20px; border:none; background:var(--bg-input); color:var(--text-bright); font-weight:bold; cursor:pointer;">+</button>
              <button class="btn" id="webp-zoom-reset" style="padding:2px 6px; font-size:10px; border:none; background:var(--bg-input); color:var(--text-bright); font-weight:bold; cursor:pointer;" title="Reset zoom to 100%">100%</button>
            </div>
            <div style="position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.6); padding:2px 6px; border-radius:4px; font-size:9px; color:var(--accent-light); font-weight:bold; border:1px solid var(--border-light);">
              PREVIEW VIEWPORT
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px; background:var(--table-zebra-1); padding:8px 12px; border-radius:6px; border:1px solid var(--border-light);">
            <div style="font-size:11.5px; font-weight:600; color:var(--text-bright); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(el.name || el.customName || 'Unnamed Image')}</div>
            <div style="font-size:10px; color:var(--text-muted); display:grid; grid-template-columns:auto 1fr auto 1fr; gap:4px 16px; align-items:center;">
              <span>Original size:</span><span id="webp-original-size" style="font-weight:600; color:var(--text-bright);">Calculating...</span>
              <span>Compressed size:</span><span id="webp-compressed-size" style="font-weight:600; color:var(--text-accent);">Calculating...</span>
              <span>Est. Ad ZIP size:</span><span id="webp-est-ad-size" style="font-weight:700; color:var(--text-bright);">Calculating...</span>
              <span>Ad size limit:</span><span style="font-weight:600; color:var(--text-bright);">${limitKb} KB</span>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Output Format</label>
            <div style="display:flex; background:var(--bg-input); padding:2px; border-radius:6px; border:1px solid var(--border-light);">
              ${['image/webp', 'image/jpeg', 'image/png'].map(f => {
                const isActive = f === initialModalFormat;
                const label = f === 'image/webp' ? 'WebP' : (f === 'image/jpeg' ? 'JPEG' : 'PNG');
                const activeStyle = 'background:var(--accent-base); color:var(--text-on-accent, var(--text-bright));';
                const idleStyle = 'background:transparent; color:var(--text-muted);';
                return `<button class="btn format-opt${isActive ? ' active' : ''}" data-format="${f}" style="flex:1; padding:6px 12px; font-size:11px; font-weight:600; border:none; border-radius:4px; cursor:pointer; ${isActive ? activeStyle : idleStyle} transition:all 0.15s ease;">${label}</button>`;
              }).join('')}
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Compression Quality</label>
              <span id="webp-quality-display" style="font-size:11px; color:var(--text-bright); font-weight:700;">${el.webpQuality || 80}%</span>
            </div>
            <div style="position:relative; padding-top:20px; padding-bottom:4px;">
              <input type="range" id="webp-quality-slider" min="10" max="100" value="${el.webpQuality || 80}" title="Adjust compression quality percentage" />
              <div id="webp-slider-marker-container" style="position:absolute; left:9px; right:9px; top:23px; height:12px; pointer-events:none;">
                <div id="webp-suggested-marker" style="display:none; position:absolute; transform:translate(-50%, -30px); z-index:2; background:#10b981; color:#fff; font-size:10.5px; font-weight:700; padding:4px 8px; border-radius:4px; white-space:nowrap; box-shadow:0 2px 4px rgba(0,0,0,0.3); pointer-events:auto; cursor:pointer;">
                  SUGGESTED: <span id="webp-suggested-val">...</span>
                  <div id="webp-suggested-arrow" style="position:absolute; bottom:-4px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:4px solid transparent; border-right:4px solid transparent; border-top:4px solid #10b981; transition:border-top-color 0.15s ease;"></div>
                </div>
                <div id="webp-suggested-tick" style="display:none; position:absolute; width:2px; height:12px; background:#fff; transform:translate(-50%, 0); z-index:1; border-radius:1px; opacity:0.8;"></div>
              </div>
            </div>
          </div>

          <div style="display:${warningDisplay}; font-size:10.5px; color:#e2a537; background:rgba(226,165,55,0.08); border:1px solid rgba(226,165,55,0.25); padding:6px 10px; border-radius:4px; line-height:1.35; margin-top:-4px;">
            <strong>⚠️ Quality Degradation Warning:</strong> Re-compressing an already compressed image may cause visible and cumulative quality loss. Use the zoomable viewport to inspect details.
          </div>

          <div id="webp-transparency-warning" style="display:none; font-size:10.5px; color:#e2a537; background:rgba(226,165,55,0.08); border:1px solid rgba(226,165,55,0.25); padding:6px 10px; border-radius:4px; line-height:1.35; margin-top:-4px;">
            <strong>⚠️ JPEG Transparency Warning:</strong> JPEG does not support transparency. Transparent areas will be filled with white in the output.
          </div>
        </div>

        <!-- Right Column: Ad Size Breakdown -->
        <div style="display:flex; flex-direction:column; gap:12px; border-left:1px solid var(--border-light); padding-left:20px; font-size:11.5px; line-height:1.5; color:var(--text-main); min-height:100%;">
          <h3 style="font-size:12px; color:var(--text-bright); text-transform:uppercase; letter-spacing:0.05em; margin:0 0 6px 0;">Ad Size Breakdown</h3>
          <div id="webp-breakdown-list" style="display:flex; flex-direction:column; gap:8px; max-height:360px; overflow-y:auto; padding-right:4px;">
            <!-- Populated dynamically by renderBreakdown -->
          </div>
          <div style="border-top:1px solid var(--border-light); padding-top:10px; margin-top:auto; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted);">
              <span>Uncompressed Sum:</span>
              <span id="webp-breakdown-sum" style="font-weight:600; color:var(--text-bright);">0.0 KB</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:700; color:var(--text-bright);">
              <span>Est. Ad ZIP Size:</span>
              <span id="webp-breakdown-total" style="color:var(--accent-base);">0.0 KB</span>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-foot" style="justify-content:flex-end; gap: 8px; display: flex; border-top: 1px solid var(--border-light); padding-top:12px; margin-top:4px;">
        <button class="btn" id="webp-btn-cancel" title="Cancel image compression">Cancel</button>
        <button class="btn primary" id="webp-btn-apply" title="Apply compression and replace image with the compressed version">Apply Compression</button>
      </div>
    </div>`;
  
  document.body.appendChild(bg);

  const viewport = bg.querySelector('#webp-preview-viewport');
  const previewImg = bg.querySelector('#webp-preview-img');
  const origSizeDisplay = bg.querySelector('#webp-original-size');
  const sizeDisplay = bg.querySelector('#webp-compressed-size');
  const estAdSizeDisplay = bg.querySelector('#webp-est-ad-size');
  const qualityDisplay = bg.querySelector('#webp-quality-display');
  const slider = bg.querySelector('#webp-quality-slider');
  const autoBtn = bg.querySelector('#webp-btn-auto');
  const marker = bg.querySelector('#webp-suggested-marker');
  const tick = bg.querySelector('#webp-suggested-tick');
  const suggestedVal = bg.querySelector('#webp-suggested-val');
  const btnZoomIn = bg.querySelector('#webp-zoom-in');
  const btnZoomOut = bg.querySelector('#webp-zoom-out');
  const btnZoomReset = bg.querySelector('#webp-zoom-reset');
  const zoomDisplay = bg.querySelector('#webp-zoom-display');

  let selectedFormat = initialModalFormat;
  let originalHasTransparency = false;

  const formatButtons = bg.querySelectorAll('.format-opt');
  formatButtons.forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault();
      if (btn.classList.contains('active')) return;
      
      formatButtons.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-muted)';
      });
      
      btn.classList.add('active');
      btn.style.background = 'var(--accent-base)';
      btn.style.color = 'var(--text-on-accent, var(--text-bright))';
      
      selectedFormat = btn.dataset.format;
      
      const transpWarning = bg.querySelector('#webp-transparency-warning');
      if (transpWarning) {
        transpWarning.style.display = (selectedFormat === 'image/jpeg' && originalHasTransparency) ? 'block' : 'none';
      }
      
      sizeDisplay.textContent = 'Calculating...';
      await updateCompression();
      await runSuggestedScan(selectedFormat);
    };
  });

  let currentCompressedDataUrl = originalDataUrl;
  let originalImageSizeKB = 0;
  let suggestedQuality = null;

  // Viewport Zoomable Drag-to-Pan state
  let scale = 1;
  let isPanning = false;
  let startX = 0, startY = 0;
  let translateX = 0, translateY = 0;

  const updateTransform = () => {
    previewImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    zoomDisplay.textContent = Math.round(scale * 100) + '%';
    viewport.style.cursor = scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default';
  };

  const updateSliderBg = () => {
    const val = parseInt(slider.value, 10);
    const pct = ((val - 10) / 90 * 100);
    const zebra = `repeating-linear-gradient(
      -45deg,
      var(--accent-base),
      var(--accent-base) 10px,
      var(--accent-hover) 10px,
      var(--accent-hover) 20px
    )`;
    slider.style.backgroundImage = `linear-gradient(to right, transparent ${pct}%, var(--border-light) ${pct}%), ${zebra}`;
  };

  const renderBreakdown = (compSize) => {
    const breakdownList = bg.querySelector('#webp-breakdown-list');
    const breakdownSum = bg.querySelector('#webp-breakdown-sum');
    const breakdownTotal = bg.querySelector('#webp-breakdown-total');
    if (!breakdownList) return;

    let html = '';
    let totalUncompressed = 0;

    // 1. index.html size
    const dummyZip = { file: () => {} };
    const htmlString = (typeof generateExportHTML === 'function') ? generateExportHTML(activeC, dummyZip) : '';
    const htmlSize = htmlString.length / 1024;
    totalUncompressed += htmlSize;

    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--table-zebra-1); border:1px solid var(--border-light); padding:6px 10px; border-radius:4px;">
        <div>
          <span style="color:var(--text-bright); font-weight:500;">index.html</span>
          <div style="font-size:9px; color:var(--text-muted);">HTML Structure & Logic</div>
        </div>
        <span style="font-weight:600; color:var(--text-bright);">${htmlSize.toFixed(1)} KB</span>
      </div>
    `;

    // 2. Font assets
    const req = (typeof getRequiredFonts === 'function') ? getRequiredFonts(activeC) : { museo: new Set(), helvetica: new Set() };
    const fonts = [];
    if (req.museo.has(300)) fonts.push({ name: 'Museo300-Regular.woff2', size: 32 });
    if (req.museo.has(500)) fonts.push({ name: 'Museo500-Regular.woff2', size: 33 });
    if (req.museo.has(700)) fonts.push({ name: 'Museo700-Regular.woff2', size: 33 });
    if (req.helvetica.has(300)) fonts.push({ name: 'helveticaneueltpro_lt.woff2', size: 38 });
    if (req.helvetica.has(400)) fonts.push({ name: 'helveticaneueltpro_roman.woff2', size: 39 });
    if (req.helvetica.has(500)) fonts.push({ name: 'helveticaneueltpro.woff2', size: 38 });

    fonts.forEach(f => {
      totalUncompressed += f.size;
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--table-zebra-1); border:1px solid var(--border-light); padding:6px 10px; border-radius:4px;">
          <div>
            <span style="color:var(--text-bright); font-weight:500;">${f.name}</span>
            <div style="font-size:9px; color:var(--text-muted);">Font Asset (WOFF2)</div>
          </div>
          <span style="font-weight:600; color:var(--text-bright);">${f.size.toFixed(1)} KB</span>
        </div>
      `;
    });

    // 3. Image assets
    activeC.elements.forEach(imgEl => {
      if (imgEl.type === 'image') {
        const isActive = imgEl.id === el.id;
        const sizeVal = isActive ? compSize : getElementSizeKB(imgEl);
        totalUncompressed += sizeVal;

        if (isActive) {
          html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--accent-dark); border:1px solid var(--accent-base); padding:6px 10px; border-radius:4px;">
              <div>
                <span style="color:var(--text-bright); font-weight:600;">${escapeHtml(imgEl.name || imgEl.customName || 'Unnamed Image')} <span style="font-size:9px; color:var(--accent-base); font-weight:bold; margin-left:4px;">(Active)</span></span>
                <div style="font-size:9px; color:var(--text-muted);">Image Asset (Compressing)</div>
              </div>
              <span style="font-weight:700; color:var(--text-bright);">${sizeVal.toFixed(1)} KB</span>
            </div>
          `;
        } else {
          html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--table-zebra-1); border:1px solid var(--border-light); padding:6px 10px; border-radius:4px;">
              <div>
                <span style="color:var(--text-bright); font-weight:500;">${escapeHtml(imgEl.name || imgEl.customName || 'Unnamed Image')}</span>
                <div style="font-size:9px; color:var(--text-muted);">Image Asset</div>
              </div>
              <span style="font-weight:600; color:var(--text-bright);">${sizeVal.toFixed(1)} KB</span>
            </div>
          `;
        }
      }
    });

    breakdownList.innerHTML = html;
    if (breakdownSum) {
      breakdownSum.textContent = totalUncompressed.toFixed(1) + ' KB';
    }

    if (originalImageSizeKB > 0 && currentAdSize > 0) {
      const estAdSize = Math.max(0, currentAdSize - originalImageSizeKB + compSize);
      if (breakdownTotal) {
        breakdownTotal.textContent = estAdSize.toFixed(1) + ' KB';
        if (estAdSize > limitKb) {
          breakdownTotal.style.color = '#ef4444';
        } else {
          breakdownTotal.style.color = '#10b981';
        }
      }
    } else {
      if (breakdownTotal) breakdownTotal.textContent = 'Calculating...';
    }
  };

  btnZoomIn.onclick = (e) => {
    e.preventDefault();
    scale = Math.min(8, scale * 2);
    if (scale === 1) { translateX = 0; translateY = 0; }
    updateTransform();
  };

  btnZoomOut.onclick = (e) => {
    e.preventDefault();
    scale = Math.max(1, scale / 2);
    if (scale === 1) { translateX = 0; translateY = 0; }
    updateTransform();
  };

  btnZoomReset.onclick = (e) => {
    e.preventDefault();
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
  };

  // Allow scrollwheel to zoom
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    if (e.deltaY < 0) {
      scale = Math.min(8, scale * zoomFactor);
    } else {
      scale = Math.max(1, scale / zoomFactor);
    }
    if (scale === 1) {
      translateX = 0;
      translateY = 0;
    }
    updateTransform();
  }, { passive: false });

  viewport.addEventListener('mousedown', (e) => {
    if (scale <= 1) return;
    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    updateTransform();
    e.preventDefault();
  });

  const onMouseMove = (e) => {
    if (!isPanning) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
  };

  const onMouseUp = () => {
    if (isPanning) {
      isPanning = false;
      updateTransform();
    }
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  const updateCompression = async () => {
    const quality = parseInt(slider.value, 10) / 100;
    try {
      const compressed = await compressImage(originalDataUrl, selectedFormat, quality);
      previewImg.src = compressed;
      const compSizeStr = await getImageSizeKB(compressed);
      const compSize = parseFloat(compSizeStr) || 0;
      sizeDisplay.textContent = compSize.toFixed(1) + ' KB';
      currentCompressedDataUrl = compressed;

      if (originalImageSizeKB > 0 && currentAdSize > 0) {
        const estAdSize = Math.max(0, currentAdSize - originalImageSizeKB + compSize);
        estAdSizeDisplay.textContent = estAdSize.toFixed(1) + ' KB';
        if (estAdSize > limitKb) {
          estAdSizeDisplay.style.color = '#ef4444';
        } else {
          estAdSizeDisplay.style.color = '#10b981';
        }
      } else {
        estAdSizeDisplay.textContent = 'Calculating...';
      }

      // Render breakdown in real-time
      renderBreakdown(compSize);
      updateSliderBg();
    } catch (err) {
      console.error(err);
      sizeDisplay.textContent = 'Error';
    }
  };

  const runSuggestedScan = async (format) => {
    if (marker) marker.style.display = 'none';
    if (tick) tick.style.display = 'none';
    suggestedQuality = null;

    if (currentAdSize <= limitKb) {
      return; // Do not show suggestion if already under limit
    }

    const qualities = [];
    for (let q = 100; q >= 10; q -= 5) {
      qualities.push(q);
    }

    const scanPromises = qualities.map(async (q) => {
      try {
        const compressed = await compressImage(originalDataUrl, format, q / 100);
        const compSizeStr = await getImageSizeKB(compressed);
        const compSize = parseFloat(compSizeStr) || 0;
        const estAdSize = currentAdSize - originalImageSizeKB + compSize;
        return { q, estAdSize };
      } catch (err) {
        return { q, estAdSize: Infinity };
      }
    });

    const scanResults = await Promise.all(scanPromises);
    if (selectedFormat !== format) return; // Prevent race conditions
    scanResults.sort((a, b) => b.q - a.q);

    const match = scanResults.find(r => r.estAdSize <= limitKb);
    suggestedQuality = match ? match.q : 10;

    const pct = ((suggestedQuality - 10) / 90 * 100);
    if (marker) {
      marker.style.left = pct + '%';
      marker.style.display = 'block';
    }
    if (tick) {
      tick.style.left = pct + '%';
      tick.style.display = 'block';
    }
    if (suggestedVal) {
      suggestedVal.textContent = suggestedQuality + '%';
    }
  };

  getImageSizeKB(originalDataUrl).then(async (sizeStr) => {
    originalImageSizeKB = parseFloat(sizeStr) || 0;
    origSizeDisplay.textContent = originalImageSizeKB.toFixed(1) + ' KB';
    
    // Check transparency
    const tempImg = new Image();
    tempImg.onload = async () => {
      originalHasTransparency = checkTransparency(tempImg);
      
      const transpWarning = bg.querySelector('#webp-transparency-warning');
      if (transpWarning) {
        transpWarning.style.display = (selectedFormat === 'image/jpeg' && originalHasTransparency) ? 'block' : 'none';
      }
      
      await updateCompression();
      await runSuggestedScan(selectedFormat);
    };
    tempImg.onerror = async () => {
      await updateCompression();
      await runSuggestedScan(selectedFormat);
    };
    tempImg.src = originalDataUrl;
  });

  slider.oninput = () => {
    if (qualityDisplay) {
      qualityDisplay.textContent = slider.value + '%';
      qualityDisplay.classList.add('webp-val-change');
    }
    clearTimeout(slider._t);
    slider._t = setTimeout(() => {
      if (qualityDisplay) {
        qualityDisplay.classList.remove('webp-val-change');
      }
    }, 150);
    updateSliderBg();
  };
  slider.onchange = async () => {
    sizeDisplay.textContent = 'Calculating...';
    await updateCompression();
  };

  if (marker) {
    marker.onclick = async (e) => {
      e.stopPropagation();
      if (suggestedQuality) {
        slider.value = suggestedQuality;
        if (qualityDisplay) {
          qualityDisplay.textContent = suggestedQuality + '%';
        }
        sizeDisplay.textContent = 'Calculating...';
        await updateCompression();
      }
    };
  }

  const closeFn = () => {
    bg.remove();
    document.removeEventListener('keydown', escHandler);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };
  const escHandler = (e) => { if (e.key === 'Escape') closeFn(); };
  document.addEventListener('keydown', escHandler);

  bg.querySelector('#webp-close').onclick = closeFn;
  bg.querySelector('#webp-btn-cancel').onclick = closeFn;
  bg.querySelector('#webp-btn-apply').onclick = () => {
    const _dm = (typeof dmDisplay === 'function') ? dmDisplay(el, true) : {};
    const activeAssetId = _dm.assetId !== undefined ? _dm.assetId : el.assetId;
    
    const newId = 'img_' + uid();
    if (!state.assets) state.assets = {};
    state.assets[newId] = currentCompressedDataUrl;
    
    if (!state.assetNames) state.assetNames = {};
    const origName = state.assetNames && state.assetNames[activeAssetId] ? state.assetNames[activeAssetId] : (el.name || 'image');
    const ext = selectedFormat === 'image/webp' ? '.webp' : (selectedFormat === 'image/jpeg' ? '.jpg' : '.png');
    state.assetNames[newId] = origName.replace(/\.[a-z0-9]+$/i, '') + ext;
    
    const _imgDyn = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, 'image');
    if (_imgDyn) {
      // Do NOT update data sheet cell (preserving the original spreadsheet reference)
    } else {
      el.assetId = newId;
    }

    if (!state.compressedAssetsMap) state.compressedAssetsMap = {};
    state.compressedAssetsMap[activeAssetId] = newId;

    el.isCompressed = true;
    el.webpQuality = parseInt(slider.value, 10);
    el.compressionFormat = selectedFormat;
    pushHistory();
    render();
    renderProps();
    closeFn();
  };
}

async function autoCompressImage(el) {
  const _dm = (typeof dmDisplay === 'function') ? dmDisplay(el, true) : {};
  let activeAssetId = _dm.assetId !== undefined ? _dm.assetId : el.assetId;
  
  // Resolve back to the original uncompressed asset ID if it was compressed
  if (state.compressedAssetsMap) {
    for (const [origId, compId] of Object.entries(state.compressedAssetsMap)) {
      if (compId === activeAssetId) {
        activeAssetId = origId;
        break;
      }
    }
  }

  const originalDataUrl = (activeAssetId && state.assets && state.assets[activeAssetId]) || activeAssetId;
  if (!originalDataUrl) return;

  const fmt = await resolveAutoCompressFormat(originalDataUrl);
  const activeC = getActiveCanvas();
  const limitKb = state.adSizeLimit || 150;

  // Calculate current ad size dynamically and synchronously to be 100% accurate
  let currentAdSize = 0;
  if (activeC) {
    const tempZip = new JSZip();
    await dmRunExport(dmActiveRowForOutput(), async () => {
      await addCanvasAssetsToZip(activeC, tempZip);
      tempZip.file('index.html', generateExportHTML(activeC, tempZip));
    });
    const tempBlob = await tempZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    currentAdSize = tempBlob.size / 1024;
  }

  if (currentAdSize <= limitKb) {
    showCanvasNotification('Ad package size is already under the limit.', { type: 'info' });
    return;
  }
  
  let originalImageSizeKB = 0;
  try {
    const sizeStr = await getImageSizeKB(originalDataUrl);
    originalImageSizeKB = parseFloat(sizeStr) || 0;
  } catch (e) {
    originalImageSizeKB = 0;
  }

  const qualities = [];
  for (let q = 80; q >= 10; q -= 5) {
    qualities.push(q);
  }

  const scanPromises = qualities.map(async (q) => {
    try {
      const compressed = await compressImage(originalDataUrl, fmt.format, q / 100);
      const compSizeStr = await getImageSizeKB(compressed);
      const compSize = parseFloat(compSizeStr) || 0;
      const estAdSize = currentAdSize - originalImageSizeKB + compSize;
      return { q, estAdSize, dataUrl: compressed };
    } catch (err) {
      return { q, estAdSize: Infinity, dataUrl: null };
    }
  });

  const scanResults = await Promise.all(scanPromises);
  scanResults.sort((a, b) => b.q - a.q);

  let best = scanResults.find(r => r.estAdSize <= (limitKb - 3.0));
  if (!best) {
    best = scanResults.find(r => r.estAdSize <= limitKb);
  }
  if (!best) {
    best = scanResults[scanResults.length - 1];
  }

  if (best && best.dataUrl) {
    const newId = 'img_' + uid();
    let optimalQuality = best.q;
    let currentDataUrl = best.dataUrl;
    let attempts = 0;

    while (optimalQuality >= 10 && attempts < 3) {
      if (!state.assets) state.assets = {};
      state.assets[newId] = currentDataUrl;

      if (!state.assetNames) state.assetNames = {};
      const origName = state.assetNames && state.assetNames[activeAssetId] ? state.assetNames[activeAssetId] : (el.name || 'image');
      state.assetNames[newId] = origName.replace(/\.[a-z0-9]+$/i, '') + fmt.ext;

      const _imgDyn = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, 'image');
      if (!_imgDyn) {
        el.assetId = newId;
      }

      if (!state.compressedAssetsMap) state.compressedAssetsMap = {};
      state.compressedAssetsMap[activeAssetId] = newId;

      el.isCompressed = true;
      el.webpQuality = optimalQuality;
      el.compressionFormat = fmt.format;

      // Verify ZIP size
      if (!activeC) break;
      const verifyZip = new JSZip();
      await dmRunExport(dmActiveRowForOutput(), async () => {
        await addCanvasAssetsToZip(activeC, verifyZip);
        verifyZip.file('index.html', generateExportHTML(activeC, verifyZip));
      });
      const verifyBlob = await verifyZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const finalZipSize = verifyBlob.size / 1024;

      if (finalZipSize <= limitKb) {
        break;
      }

      // Try lower quality
      optimalQuality = Math.max(10, optimalQuality - 15);
      attempts++;
      if (optimalQuality >= 10) {
        try {
          currentDataUrl = await compressImage(originalDataUrl, fmt.format, optimalQuality / 100);
        } catch (e) {
          break;
        }
      }
    }

    pushHistory();
    render();
    renderProps();
  }
}

// Image crop + rotate modal. Lets users level a tilted horizon or crop a
// region in one go. The output is BAKED into a new image (PNG data URL)
// and assigned as the element's new asset — the element's own
// `rotation` property stays at 0, exactly as the user requested. The
// original (pre-crop) asset is remembered on `el.cropOriginalAssetId`
// so re-opening the dialogue starts from the original (not the
// already-cropped version) — successive edits don't keep losing
// resolution to round-trip rasterisation.
function openImageCropModal(el) {
  if (!el || el.type !== 'image') return;
  // Resolve the source we'll crop from. If a previous crop exists,
  // use the original — never crop a crop.
  const _dm = (typeof dmDisplay === 'function') ? dmDisplay(el) : {};
  const activeAssetId = _dm.assetId !== undefined ? _dm.assetId : el.assetId;
  
  let baseAssetId = activeAssetId;
  if (activeAssetId && activeAssetId.startsWith('img_crop_') && el.cropOriginalAssetId) {
    baseAssetId = el.cropOriginalAssetId;
  }
  const baseDataUrl = baseAssetId && state.assets ? state.assets[baseAssetId] : null;
  if (!baseDataUrl) {
    showCanvasNotification('Image data not available.', { type: 'error' });
    return;
  }

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal" style="width:600px;">
      <div class="modal-head">
        <h2 style="margin:0;">Crop &amp; Level</h2>
        <button class="btn" id="crop-close" title="Close dialog">Close</button>
      </div>
      <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
        <div id="crop-stage" style="position:relative; width:100%; height:360px; background:#0d1018; border:1px solid var(--border-light); border-radius:6px; overflow:hidden; user-select:none;">
          <canvas id="crop-canvas" style="position:absolute; top:0; left:0; pointer-events:none;"></canvas>
          <div id="crop-rect" style="position:absolute; box-sizing:border-box; border:1.5px solid var(--accent-base); box-shadow:0 0 0 9999px rgba(0,0,0,0.5); cursor:move;">
            <div data-corner="nw" style="position:absolute; left:-6px; top:-6px; width:11px; height:11px; background:var(--accent-base); border:1.5px solid #fff; border-radius:2px; cursor:nwse-resize;"></div>
            <div data-corner="ne" style="position:absolute; right:-6px; top:-6px; width:11px; height:11px; background:var(--accent-base); border:1.5px solid #fff; border-radius:2px; cursor:nesw-resize;"></div>
            <div data-corner="se" style="position:absolute; right:-6px; bottom:-6px; width:11px; height:11px; background:var(--accent-base); border:1.5px solid #fff; border-radius:2px; cursor:nwse-resize;"></div>
            <div data-corner="sw" style="position:absolute; left:-6px; bottom:-6px; width:11px; height:11px; background:var(--accent-base); border:1.5px solid #fff; border-radius:2px; cursor:nesw-resize;"></div>
          </div>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <label style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:600; min-width:74px; letter-spacing:.04em;">Rotation</label>
          <input type="range" id="crop-rot-slider" min="-180" max="180" step="0.1" value="0" style="flex:1; accent-color:var(--accent-base); cursor:pointer;" />
          <input type="number" id="crop-rot-input" min="-180" max="180" step="0.1" value="0" style="width:64px; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none; font-family:inherit;" />
          <button class="btn" id="crop-rot-reset" style="padding:4px 10px; font-size:11px;" title="Reset rotation to 0°">Reset</button>
        </div>
        <div style="font-size:10.5px; color:var(--text-muted); line-height:1.5;">
          Drag the rectangle's corners to crop, or drag the rectangle itself to reposition. Use the rotation slider to level horizons or fix skew — the rotation is baked into the image, the element's own rotation property stays at 0. Re-cropping starts from the original image so resolution doesn't degrade with successive edits.
        </div>
      </div>
      <div class="modal-foot" style="display:flex; justify-content:space-between; gap:8px;">
        <button class="btn" id="crop-reset-all" style="color:var(--text-muted);" title="Drop the crop and restore the original full image">Restore original</button>
        <div style="display:flex; gap:8px;">
          <button class="btn" id="crop-cancel" title="Discard changes">Cancel</button>
          <button class="btn primary" id="crop-apply" title="Bake the crop + rotation into a new image">Apply</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(bg);

  const stage     = bg.querySelector('#crop-stage');
  const canvas    = bg.querySelector('#crop-canvas');
  const cropRect  = bg.querySelector('#crop-rect');
  const rotSlider = bg.querySelector('#crop-rot-slider');
  const rotInput  = bg.querySelector('#crop-rot-input');
  const rotReset  = bg.querySelector('#crop-rot-reset');

  const img = new Image();
  let imgW = 0, imgH = 0;       // intrinsic source dims
  let canvasOffsetX = 0, canvasOffsetY = 0;
  let renderScale = 1;          // canvas-px per source-px (after rotation fit)
  let currentRotation = (typeof el.cropRotation === 'number') ? el.cropRotation : 0;
  let cropPx = { x: 0, y: 0, w: 0, h: 0 };  // in canvas (preview) px

  const renderImage = (preserveCrop = false) => {
    const stageW = stage.clientWidth, stageH = stage.clientHeight;
    const θ = currentRotation * Math.PI / 180;
    const absCos = Math.abs(Math.cos(θ));
    const absSin = Math.abs(Math.sin(θ));
    const rotW = imgW * absCos + imgH * absSin;
    const rotH = imgW * absSin + imgH * absCos;
    const PAD = 20;
    const scale = Math.min((stageW - PAD * 2) / rotW, (stageH - PAD * 2) / rotH);
    renderScale = scale;
    const cnvW = Math.round(rotW * scale);
    const cnvH = Math.round(rotH * scale);
    canvas.width = cnvW;
    canvas.height = cnvH;
    canvas.style.width  = cnvW + 'px';
    canvas.style.height = cnvH + 'px';
    canvasOffsetX = Math.round((stageW - cnvW) / 2);
    canvasOffsetY = Math.round((stageH - cnvH) / 2);
    canvas.style.left = canvasOffsetX + 'px';
    canvas.style.top  = canvasOffsetY + 'px';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cnvW, cnvH);
    ctx.save();
    ctx.translate(cnvW / 2, cnvH / 2);
    ctx.rotate(θ);
    ctx.drawImage(img, -imgW * scale / 2, -imgH * scale / 2, imgW * scale, imgH * scale);
    ctx.restore();
    if (!preserveCrop) {
      cropPx = { x: 0, y: 0, w: cnvW, h: cnvH };
    } else {
      // Clamp the existing crop into the new canvas size.
      cropPx.w = Math.max(20, Math.min(cropPx.w, cnvW));
      cropPx.h = Math.max(20, Math.min(cropPx.h, cnvH));
      cropPx.x = Math.max(0, Math.min(cropPx.x, cnvW - cropPx.w));
      cropPx.y = Math.max(0, Math.min(cropPx.y, cnvH - cropPx.h));
    }
    positionCropRect();
  };

  const positionCropRect = () => {
    cropRect.style.left   = (canvasOffsetX + cropPx.x) + 'px';
    cropRect.style.top    = (canvasOffsetY + cropPx.y) + 'px';
    cropRect.style.width  = cropPx.w + 'px';
    cropRect.style.height = cropPx.h + 'px';
  };

  img.onload = () => {
    imgW = img.naturalWidth;
    imgH = img.naturalHeight;
    renderImage(false);
    // If the element had a previous crop, restore it (normalized rect).
    if (el.cropRect && typeof el.cropRect === 'object') {
      cropPx = {
        x: el.cropRect.x * canvas.width,
        y: el.cropRect.y * canvas.height,
        w: el.cropRect.w * canvas.width,
        h: el.cropRect.h * canvas.height
      };
      positionCropRect();
    }
  };
  img.src = baseDataUrl;

  // Rotation wire-up
  rotSlider.value = currentRotation;
  rotInput.value  = currentRotation;
  const setRotation = (v) => {
    currentRotation = Math.max(-180, Math.min(180, parseFloat(v) || 0));
    rotSlider.value = currentRotation;
    rotInput.value  = currentRotation;
    renderImage(true);
  };
  rotSlider.addEventListener('input', e => setRotation(e.target.value));
  rotInput.addEventListener('input',  e => setRotation(e.target.value));
  rotReset.addEventListener('click', () => setRotation(0));

  // Drag rectangle body
  cropRect.addEventListener('mousedown', (e) => {
    if (e.target.dataset.corner) return; // corner handles own their drag
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const ix = cropPx.x, iy = cropPx.y;
    const onMove = (ev) => {
      cropPx.x = Math.max(0, Math.min(canvas.width  - cropPx.w, ix + ev.clientX - sx));
      cropPx.y = Math.max(0, Math.min(canvas.height - cropPx.h, iy + ev.clientY - sy));
      positionCropRect();
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
  // Corner handles
  cropRect.querySelectorAll('[data-corner]').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const corner = handle.dataset.corner;
      const sx = e.clientX, sy = e.clientY;
      const init = { ...cropPx };
      const MIN = 20;
      const onMove = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        let nx = init.x, ny = init.y, nw = init.w, nh = init.h;
        if (corner.includes('w')) {
          nx = Math.max(0, Math.min(init.x + dx, init.x + init.w - MIN));
          nw = init.w - (nx - init.x);
        }
        if (corner.includes('n')) {
          ny = Math.max(0, Math.min(init.y + dy, init.y + init.h - MIN));
          nh = init.h - (ny - init.y);
        }
        if (corner.includes('e')) {
          nw = Math.max(MIN, Math.min(init.w + dx, canvas.width - init.x));
        }
        if (corner.includes('s')) {
          nh = Math.max(MIN, Math.min(init.h + dy, canvas.height - init.y));
        }
        cropPx = { x: nx, y: ny, w: nw, h: nh };
        positionCropRect();
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  });

  const close = () => bg.remove();
  bg.querySelector('#crop-close').onclick  = close;
  bg.querySelector('#crop-cancel').onclick = close;

  // Restore original — drop any prior crop/rotation, revert to the
  // uncropped asset. Doesn't apply changes; user can still Cancel.
  bg.querySelector('#crop-reset-all').onclick = () => {
    if (!confirm('Drop the crop and rotation, restoring the original image?')) return;
    if (el.cropOriginalAssetId) {
      const orig = el.cropOriginalAssetId;
      const _imgDyn = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, 'image');
      if (_imgDyn) {
        if (!state.dataMerge.locked) dmWriteCell(el, 'image', orig);
      } else {
        el.assetId = orig;
      }
      delete el.cropOriginalAssetId;
    }
    delete el.cropRotation;
    delete el.cropRect;
    el.isCompressed = false;
    pushHistory();
    render();
    renderProps();
    close();
  };

  bg.querySelector('#crop-apply').onclick = () => {
    // Compose the final image at SOURCE resolution. We do the same
    // translate / rotate / drawImage that the preview canvas did, then
    // extract the user's crop rectangle scaled back up from preview-px
    // to source-rotated-px (via 1/renderScale).
    const θ = currentRotation * Math.PI / 180;
    const absCos = Math.abs(Math.cos(θ));
    const absSin = Math.abs(Math.sin(θ));
    const rotW = Math.round(imgW * absCos + imgH * absSin);
    const rotH = Math.round(imgW * absSin + imgH * absCos);
    const comp = document.createElement('canvas');
    comp.width = rotW; comp.height = rotH;
    const cctx = comp.getContext('2d');
    cctx.translate(rotW / 2, rotH / 2);
    cctx.rotate(θ);
    cctx.drawImage(img, -imgW / 2, -imgH / 2);
    const ratio = 1 / renderScale;
    const sx = cropPx.x * ratio;
    const sy = cropPx.y * ratio;
    const sw = cropPx.w * ratio;
    const sh = cropPx.h * ratio;
    const out = document.createElement('canvas');
    out.width  = Math.max(1, Math.round(sw));
    out.height = Math.max(1, Math.round(sh));
    out.getContext('2d').drawImage(comp, sx, sy, sw, sh, 0, 0, out.width, out.height);
    const outDataUrl = out.toDataURL('image/png');

    // Remember the uncropped original on first crop, so subsequent
    // edits start from it rather than re-cropping a crop.
    const _dm = (typeof dmDisplay === 'function') ? dmDisplay(el) : {};
    const activeAssetId = _dm.assetId !== undefined ? _dm.assetId : el.assetId;
    
    if (!el.cropOriginalAssetId) el.cropOriginalAssetId = activeAssetId;
    el.cropRotation = currentRotation;
    el.cropRect = {
      x: cropPx.x / canvas.width,
      y: cropPx.y / canvas.height,
      w: cropPx.w / canvas.width,
      h: cropPx.h / canvas.height
    };
    const newId = 'img_crop_' + uid();
    if (!state.assets) state.assets = {};
    state.assets[newId] = outDataUrl;
    
    const _imgDyn = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, 'image');
    if (_imgDyn) {
      if (!state.dataMerge.locked) dmWriteCell(el, 'image', newId);
    } else {
      el.assetId = newId;
    }
    el.isCompressed = false; // crop output is PNG; compress flag no longer applies

    // Adjust the element's bounding box height to match the new image
    // aspect (keep the existing width). Without this, a portrait crop
    // would appear stretched/squashed against the element's prior aspect.
    const newAspect = out.width / out.height;
    if (newAspect && el.width) {
      el.height = Math.max(1, Math.round(el.width / newAspect));
    }
    pushHistory();
    render();
    renderProps();
    close();
  };
}

// ============================================================================
// Initial render
// ============================================================================
function groupSelection() {
  const c = getActiveCanvas();
  if (!c || !state.layerSelection || state.layerSelection.length < 2) return;

  const els = state.layerSelection.map(id => c.elements.find(e => e.id === id)).filter(Boolean);
  const first = els[0];
  const sameContext = els.every(e => e.persistent === first.persistent && (e.persistent !== false || e.frameId === first.frameId));
  if (!sameContext) {
    alert('Cannot group elements from different frames or persistent layers.');
    return;
  }

  const gid = uid();
  els.forEach(el => el.groupId = gid);
  pushHistory();
  render();
}

function ungroupSelection() {
  const c = getActiveCanvas();
  if (!c || !state.layerSelection) return;
  state.layerSelection.forEach(id => {
    const el = c.elements.find(e => e.id === id);
    if (el && el.groupId) delete el.groupId;
  });
  pushHistory();
  render();
}

// Illustrator-style Ctrl+] / Ctrl+[
// direction = +1 brings forward (toward array end / on top), -1 sends backward.
// NOTE: persistent:'top' and persistent:'bottom' elements can appear anywhere
// in the array (not necessarily at the edges), so they must be skipped
// transparently rather than treated as hard boundaries.
function shiftLayerOrder(direction) {
  const c = getActiveCanvas();
  if (!c || !state.layerSelection || state.layerSelection.length === 0) return;

  const selSet = new Set(state.layerSelection);

  // Check whether two elements share the same "visible section" in the panel.
  // Elements are in the same section when they have the same persistent tier
  // AND (if that tier is false/mid) the same frameId.
  const sameSection = (a, b) => {
    if (a.persistent !== b.persistent) return false;
    if (a.persistent === false && a.frameId !== b.frameId) return false;
    return true;
  };

  // Process order: when bringing forward, start from the element highest in the
  // array so earlier swaps don't displace later ones (and vice versa).
  const sortedIds = [...state.layerSelection].sort((a, b) => {
    const ia = c.elements.findIndex(e => e.id === a);
    const ib = c.elements.findIndex(e => e.id === b);
    return direction > 0 ? ib - ia : ia - ib;
  });

  let moved = false;
  for (const id of sortedIds) {
    const idx = c.elements.findIndex(e => e.id === id);
    if (idx === -1) continue;
    const el = c.elements[idx];

    // Walk in `direction`, skipping:
    //   - co-selected siblings (they move as one)
    //   - elements from a DIFFERENT section (e.g. 'top'/'bottom' mixed in)
    //   - elements from other frames within the same mid-tier
    // Stop at the first element that IS in the same section (valid swap target).
    let j = idx + direction;
    let targetIdx = -1;
    while (j >= 0 && j < c.elements.length) {
      const cand = c.elements[j];

      // Skip co-selected siblings.
      if (selSet.has(cand.id)) { j += direction; continue; }

      // Skip elements that belong to a different section (e.g. 'top'/'bottom'
      // interleaved among 'false' elements – they're invisible in this section).
      if (!sameSection(el, cand)) { j += direction; continue; }

      // Valid same-section candidate found.
      targetIdx = j;
      break;
    }

    if (targetIdx === -1) continue;

    const [removed] = c.elements.splice(idx, 1);
    const adj = idx < targetIdx ? targetIdx - 1 : targetIdx;
    const insertAt = direction > 0 ? adj + 1 : adj;
    c.elements.splice(insertAt, 0, removed);
    moved = true;
  }

  if (moved) {
    pushHistory();
    render();
  }
}


// Middle-mouse guard for interactive controls. Several of our
// mousedown-based handlers (per-canvas frame controls, single-preview
// toggle, transform/rotate/radius/thickness/endpoint handles, etc.)
// don't filter `e.button`, so middle-clicking them fires the same
// action as left-click — surprising for users. Capture-phase so we run
// before any other mousedown listener on the target.
//
// Scoped: `<button>` / `[role="button"]` / element selection handles
// (`.handle`) / fullscreen-panel buttons. NOT canvas areas or element
// wrappers — those legitimately use middle-click for the pan-by-drag
// affordance (see onElementMouseDown + canvasArea mousedown, both of
// which start panning on `e.button === 1`).
document.addEventListener('mousedown', (e) => {
  if (e.button !== 1) return;
  if (e.target.closest('button, [role="button"], .handle, .panel-fullscreen-btn')) {
    e.preventDefault();
    e.stopPropagation();
  }
}, true);

document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('#app-splash')) {
    e.preventDefault();
    return;
  }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  e.preventDefault();

  const animBtn = e.target.closest('.anim-btn');
  const effBtn = e.target.closest('.eff-btn');
  const frameTransBtn = e.target.closest('.frame-trans-btn');
  if (animBtn || effBtn || frameTransBtn) {
    const btn = animBtn || effBtn || frameTransBtn;
    const rawVal = btn.dataset.val;
    if (rawVal === 'none') return; // Cannot favorite 'None' preset
    
    let val = '';
    if (animBtn) val = `in-${rawVal}`;
    else if (effBtn) val = `eff-${rawVal}`;
    else if (frameTransBtn) val = `frame-${rawVal}`;
    
    const isFav = state.favoriteAnimations?.includes(val);
    const menu = document.getElementById('ctx-menu');
    menu.innerHTML = `
      <div class="ctx-item" id="ctx-toggle-fav">${isFav ? '★ Remove from Favorites' : '☆ Add to Favorites'}</div>
      <div class="ctx-item" id="ctx-reset-settings">⟲ Reset Settings</div>
    `;
    menu.style.display = 'flex';
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    let left = e.clientX, top = e.clientY;
    if (left + mw > window.innerWidth) left -= mw;
    if (top + mh > window.innerHeight) top -= mh;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    
    const toggleBtn = document.getElementById('ctx-toggle-fav');
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        if (!state.favoriteAnimations) state.favoriteAnimations = [];
        if (isFav) {
          state.favoriteAnimations = state.favoriteAnimations.filter(x => x !== val);
        } else {
          state.favoriteAnimations.push(val);
        }
        localStorage.setItem('favoriteAnimations', JSON.stringify(state.favoriteAnimations));
        menu.style.display = 'none';
        renderProps();
      };
    }

    const resetBtn = document.getElementById('ctx-reset-settings');
    if (resetBtn) {
      resetBtn.onclick = () => {
        const activeC = getActiveCanvas();
        const el = activeC ? activeC.elements.find(x => x.id === state.selectedElementId) : null;
        if (animBtn && el) {
          const inAnimProps = ['animDuration', 'animDelay', 'animFade', 'animFadeLetters', 'animFadeBg', 'zoomFrom', 'animBounce', 'animDirection', 'animDistance', 'animRotateOffset', 'animAngle', 'animateBg', 'bgOffset', 'zoomAnchor', 'animStaggerText'];
          inAnimProps.forEach(p => delete el[p]);
        } else if (effBtn && el) {
          const effectProps = ['effDuration', 'effDelay', 'panDist', 'panDir', 'effEase', 'effOnce', 'effSpeed', 'zoomTarget', 'spinTarget', 'spinRepeat', 'panFromX', 'panFromY', 'panRotate', 'panFade', 'panMidX', 'panMidY', 'pulseScale', 'heartbeatScale', 'floatRange', 'floatDirection'];
          effectProps.forEach(p => delete el[p]);
        } else if (frameTransBtn) {
          const currentFrame = state.frames.find(f => f.id === state.activeFrameId);
          if (currentFrame) {
            const frameProps = ['transitionDuration', 'transitionFade', 'transitionDirection', 'transitionBounce', 'transitionZoomFrom', 'transitionAngle', 'transitionIrisShape', 'transitionIrisOrigin', 'transitionBlurAmount', 'transitionBlurScale', 'transitionFeather'];
            frameProps.forEach(p => delete currentFrame[p]);
          }
        }
        pushHistory();
        menu.style.display = 'none';
        renderProps();
        render(true);
      };
    }
    return;
  }

  const menu = document.getElementById('ctx-menu');
  let elNode = e.target.closest('.el');
  if (!elNode) {
    const selectionOutline = e.target.closest('.selection-outline');
    if (selectionOutline) {
      const targetId = state.selectedElementId || (state.layerSelection && state.layerSelection[0]);
      if (targetId) {
        elNode = document.querySelector(`.canvas-frame[data-canvas-id="${state.activeCanvasId}"] .canvas-inner .el[data-id="${targetId}"]`);
      }
    }
  }
  let canvasNode = e.target.closest('.canvas');
  const canvasItemNode = e.target.closest('.canvas-item');
  // Right-clicking the canvas-header (the "300 × 250" dimensions label
  // floating above each canvas frame) should behave the same as right-
  // clicking the canvas surface with no element selected. The header is a
  // sibling of `.canvas`, not an ancestor, so closest('.canvas') misses
  // it — resolve via the parent .canvas-frame instead.
  if (!canvasNode && !elNode) {
    const headerNode = e.target.closest('.canvas-header');
    if (headerNode) {
      const frame = headerNode.closest('.canvas-frame');
      if (frame) canvasNode = frame.querySelector('.canvas');
    }
  }

  const svgWrap = (svg, text) => `<div style="display:flex; align-items:center; gap:8px;">${svg}${text}</div>`;
  const brandSetsSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;
  const brandSvg = `<svg viewBox="0 0 578.52 556.76" fill="currentColor" style="width:14px;height:14px;"><path d="M290.78,0h-74.15v60.23h-123.75v125.78H0v184.74h92.88v125.78h123.5v60.23h65.55c152.85,0,287.74-123.5,287.74-277.62S444.14,0,290.78,0"/></svg>`;
  const textSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V5h16v2M9 19h6M12 5v14" /></svg>`;
  const imageSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L11 18" /></svg>`;
  const rectSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>`;
  const circleSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8" /></svg>`;
  const lineSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="19" x2="19" y2="5" /></svg>`;
  const btnSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="8" rx="4" /></svg>`;
  const bgSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="4" /><line x1="2" y1="12" x2="22" y2="12" stroke-dasharray="2 2" /></svg>`;

  const addElementsMenuHTML = `
    <div class="ctx-item has-submenu">Add Element
      <div class="ctx-submenu">
        <div class="ctx-item has-submenu">
          ${svgWrap(brandSetsSvg, 'Brand sets')}
          <div class="ctx-submenu">
            <div class="ctx-item" id="ctx-brandset-logo-rfwn-cricos" style="white-space:nowrap;">Logo + RFWN + CRICOS</div>
          </div>
        </div>
        <div class="ctx-item has-submenu">
          ${svgWrap(brandSvg, 'Brand Elements')}
          <div class="ctx-submenu">
            <div class="ctx-item" id="ctx-brand-cricos" style="white-space:nowrap;">CRICOS</div>
            <div class="ctx-item" id="ctx-brand-rfwn" style="white-space:nowrap;">RFWN text</div>
            <div class="ctx-item" id="ctx-brand-logowhite" style="white-space:nowrap;">RMIT Logo (white)</div>
            <div class="ctx-item" id="ctx-brand-logofull" style="white-space:nowrap;">RMIT Logo (Full color)</div>
            <div class="ctx-item" id="ctx-brand-logored" style="white-space:nowrap;">RMIT Logo (Red Pixel)</div>
            <div class="ctx-item" id="ctx-brand-pixel" style="white-space:nowrap;">Pixel Shape</div>
          </div>
        </div>
        <div class="ctx-item" id="ctx-add-text">${svgWrap(textSvg, 'Add Text')}</div>
        <div class="ctx-item" id="ctx-add-image">${svgWrap(imageSvg, 'Add Image')}</div>
        <div class="ctx-item" id="ctx-add-rect">${svgWrap(rectSvg, 'Add Rectangle')}</div>
        <div class="ctx-item" id="ctx-add-circle">${svgWrap(circleSvg, 'Add Circle')}</div>
        <div class="ctx-item" id="ctx-add-line">${svgWrap(lineSvg, 'Add Line')}</div>
        <div class="ctx-item" id="ctx-add-btn">${svgWrap(btnSvg, 'Add Button')}</div>
        <div class="ctx-item" id="ctx-add-bg">${svgWrap(bgSvg, 'Add Background')}</div>
      </div>
    </div>
  `;

  let html = '';
  if (canvasItemNode) {
    html += `<div class="ctx-item" id="ctx-canvas-clone">Clone Canvas</div>`;
    if (state.canvases.length > 1) {
      html += `<div class="ctx-item" id="ctx-canvas-delete" style="color:#ef4444;">Delete Canvas</div>`;
    }
  } else if (elNode) {
    const id = elNode.dataset.id;
    if (!state.layerSelection?.includes(id)) {
      const c = getActiveCanvas();
      const el = c.elements.find(x => x.id === id);
      if (el && el.groupId) {
        state.layerSelection = c.elements.filter(x => x.groupId === el.groupId).map(x => x.id);
        state.selectedElementId = null;
      } else {
        state.layerSelection = [id];
        state.selectedElementId = id;
      }
      render(true);
    }

    const autoArrangeSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>`;
    html += `<div class="ctx-item highlight" id="ctx-canvas-auto-arrange" style="display:flex; align-items:center; gap:8px;">${autoArrangeSvg}Auto-arrange elements</div>`;
    html += `<div class="ctx-divider"></div>`;

    html += `<div class="ctx-item" id="ctx-bring-fwd">Bring Forward</div>`;
    html += `<div class="ctx-item" id="ctx-send-bwd">Send Backward</div>`;
    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-cut">Cut</div>`;
    html += `<div class="ctx-item" id="ctx-copy">Copy</div>`;
    html += `<div class="ctx-item" id="ctx-clone">Clone</div>`;
    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-reset-transform">Reset Transform</div>`;

    // Only emit the Group/Ungroup section + its divider when there's actually
    // something to put there — avoids two adjacent dividers leaving a blank gap.
    const c = getActiveCanvas();
    const showGroup = state.layerSelection && state.layerSelection.length > 1;
    const hasGroup = state.layerSelection && state.layerSelection.some(selId => {
      const el = c.elements.find(x => x.id === selId);
      return el && el.groupId;
    });
    if (showGroup || hasGroup) {
      html += `<div class="ctx-divider"></div>`;
      if (showGroup) html += `<div class="ctx-item" id="ctx-group">Group Selection</div>`;
      if (hasGroup) html += `<div class="ctx-item" id="ctx-ungroup">Ungroup</div>`;
    }

    const activeEl = getSelectedElement() || (state.layerSelection?.length > 0 ? c.elements.find(x => x.id === state.layerSelection[0]) : null);
    const cat = activeEl ? getElementCategory(activeEl) : null;
    const sameCat = state.layerSelection?.every(id => {
      const el = c.elements.find(x => x.id === id);
      return el && getElementCategory(el) === cat;
    });
    // Mask layers don't participate in link groups.
    const anyMaskInSelection = state.layerSelection?.some(id => {
      const el = c.elements.find(x => x.id === id);
      return el && el.isMask;
    });

    if (cat && sameCat && !anyMaskInSelection) {
      const linkedEl = c.elements.filter(x => state.layerSelection.includes(x.id));
      const groupIds = [...new Set(linkedEl.map(x => x.linkGroupId).filter(Boolean))];
      const hasLink = groupIds.length > 0;

      html += `<div class="ctx-divider"></div>`;
      if (hasLink) {
        const firstGroup = state.linkGroups[groupIds[0]];
        const isLive = firstGroup?.liveLink === true;
        html += `<div class="ctx-item" id="ctx-link-toggle-live">${isLive ? '✓ Live Linking' : 'Live Linking'}</div>`;
        html += `<div class="ctx-item highlight" id="ctx-link-push" style="white-space:nowrap;">Push Changes to Group</div>`;
      }
      html += `<div class="ctx-item has-submenu">Link Group
        <div class="ctx-submenu">`;
      
      const groups = Object.values(state.linkGroups || {}).filter(g => g.category === cat);
      if (groups.length > 0) {
        groups.forEach(g => {
          const isMember = linkedEl.some(x => x.linkGroupId === g.id);
          const prefix = isMember ? 'Linked to' : 'Link to';
          html += `<div class="ctx-item ctx-link-to-existing" data-group-id="${g.id}" style="white-space:nowrap;">${prefix}: ${g.name}</div>`;
        });
        html += `<div class="ctx-divider"></div>`;
      }

      html += `
          <div class="ctx-item" id="ctx-link-autolink" style="white-space:nowrap;">Auto-Link</div>
          <div class="ctx-item" id="ctx-link-new" style="white-space:nowrap;">Create New Group...</div>
          <div class="ctx-item" id="ctx-link-autoadd" style="white-space:nowrap;">Distribute & Link</div>`;

      if (hasLink) {
        html += `<div class="ctx-divider"></div>`;
        html += `<div class="ctx-item" id="ctx-link-remove" style="color:#ef4444; white-space:nowrap;">Remove Link</div>`;
        html += `<div class="ctx-item" id="ctx-link-delete-all" style="color:#ef4444; white-space:nowrap;">Delete Group & Elements</div>`;
      }
      html += `</div></div>`;
    }

    // "Use as mask" — only for rect/circle/pixel shapes, only when not on a
    // persistent layer, and only when there's an image directly beneath them.
    const singleEl = (state.layerSelection?.length === 1)
      ? c.elements.find(x => x.id === state.layerSelection[0]) : null;
    if (singleEl && canShapeBeMask(singleEl)) {
      const beneath = findImageBeneath(c, singleEl);
      html += `<div class="ctx-divider"></div>`;
      if (singleEl.isMask) {
        html += `<div class="ctx-item highlight" id="ctx-mask-off">✓ Use as mask</div>`;
      } else if (beneath) {
        html += `<div class="ctx-item" id="ctx-mask-on">Use as mask</div>`;
      } else {
        html += `<div class="ctx-item" style="color:var(--text-muted); cursor:not-allowed;" title="A mask needs an image layer directly beneath it.">Use as mask <span style="opacity:.55; font-size:10px;">— need image below</span></div>`;
      }
    }

    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-save-asset">Save to Assets</div>`;

    if (activeEl && activeEl.role && activeEl.role !== 'misc') {
      html += `<div class="ctx-divider"></div>`;
      html += `<div class="ctx-item has-submenu">Advanced
        <div class="ctx-submenu">
          <div class="ctx-item" id="ctx-define-placement" style="white-space:nowrap;">Define default placement</div>`;
      if (c.layoutOverrides && c.layoutOverrides[activeEl.role]) {
        html += `<div class="ctx-item" id="ctx-clear-override" style="color:#ef4444; white-space:nowrap;">Clear placement override</div>`;
      }
      html += `</div></div>`;
    }
    html += `<div class="ctx-divider"></div>`;
    html += addElementsMenuHTML;
    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-delete" style="color:#ef4444">Delete</div>`;
  } else if (canvasNode) {
    state.activeCanvasId = canvasNode.parentElement.dataset.canvasId;
    state.selectedElementId = null;
    state.layerSelection = [];
    render(true);

    const inPreview = state.singlePreviewId === state.activeCanvasId;
    const previewSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="${inPreview ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    html += `<div class="ctx-item highlight" id="ctx-canvas-preview" style="display:flex; align-items:center; gap:8px;">${previewSvg}${inPreview ? 'Exit Preview' : 'Preview'}</div>`;
    // Auto-Resize sits directly under Preview with the same highlight style.
    // Click forces the canvas-selection dialogue regardless of the bypass
    // setting — when the user invokes via this menu they expect to pick targets.
    const autoResizeSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3H13M21 3V11M21 3L11 13M3 21H11M3 21V13M3 21L13 11"/></svg>`;
    html += `<div class="ctx-item highlight" id="ctx-canvas-auto-resize" style="display:flex; align-items:center; gap:8px;">${autoResizeSvg}Auto-Resize</div>`;
    html += `<div class="ctx-divider"></div>`;

    html += `<div class="ctx-item has-submenu">
      ${svgWrap(brandSetsSvg, 'Brand sets')}
      <div class="ctx-submenu">
        <div class="ctx-item" id="ctx-brandset-logo-rfwn-cricos" style="white-space:nowrap;">Logo + RFWN + CRICOS</div>
      </div>
    </div>`;
    html += `<div class="ctx-item has-submenu">
      ${svgWrap(brandSvg, 'Brand Elements')}
      <div class="ctx-submenu">
        <div class="ctx-item" id="ctx-brand-cricos" style="white-space:nowrap;">CRICOS</div>
        <div class="ctx-item" id="ctx-brand-rfwn" style="white-space:nowrap;">RFWN text</div>
        <div class="ctx-item" id="ctx-brand-logowhite" style="white-space:nowrap;">RMIT Logo (white)</div>
        <div class="ctx-item" id="ctx-brand-logofull" style="white-space:nowrap;">RMIT Logo (Full color)</div>
        <div class="ctx-item" id="ctx-brand-logored" style="white-space:nowrap;">RMIT Logo (Red Pixel)</div>
        <div class="ctx-item" id="ctx-brand-pixel" style="white-space:nowrap;">Pixel Shape</div>
      </div>
    </div>`;
    html += `<div class="ctx-item" id="ctx-add-text">${svgWrap(textSvg, 'Add Text')}</div>`;
    html += `<div class="ctx-item" id="ctx-add-image">${svgWrap(imageSvg, 'Add Image')}</div>`;
    html += `<div class="ctx-item" id="ctx-add-rect">${svgWrap(rectSvg, 'Add Rectangle')}</div>`;
    html += `<div class="ctx-item" id="ctx-add-circle">${svgWrap(circleSvg, 'Add Circle')}</div>`;
    html += `<div class="ctx-item" id="ctx-add-line">${svgWrap(lineSvg, 'Add Line')}</div>`;
    html += `<div class="ctx-item" id="ctx-add-btn">${svgWrap(btnSvg, 'Add Button')}</div>`;
    html += `<div class="ctx-item" id="ctx-add-bg">${svgWrap(bgSvg, 'Add Background')}</div>`;
    html += `<div class="ctx-divider"></div>`;

    const syncSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`;
    html += `<div class="ctx-item has-submenu">
      ${svgWrap(syncSvg, 'Frame Sync')}
      <div class="ctx-submenu">
        <div class="ctx-item" id="ctx-canvas-sync" style="white-space:nowrap;">Sync Across Canvases...</div>
        <div class="ctx-item" id="ctx-frame-sync" style="white-space:nowrap;">Sync Across Frames...</div>
      </div>
    </div>`;
    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-canvas-clone">Clone Canvas</div>`;
    if (state.canvases.length > 1) {
      html += `<div class="ctx-item" id="ctx-canvas-delete" style="color:#ef4444;">Delete Canvas</div>`;
    }
    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-canvas-bg-color">Change canvas BG color</div>`;
    html += `<div class="ctx-item has-submenu">Export
      <div class="ctx-submenu">
        <div class="ctx-item" id="ctx-canvas-export-html">HTML5</div>
        <div class="ctx-item" id="ctx-canvas-export-png">PNG</div>
      </div>
    </div>`;
    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item has-submenu" style="color:#ef4444">Clear all
      <div class="ctx-submenu">
        <div class="ctx-item" id="ctx-clear-current"    style="white-space:nowrap;">Current canvas</div>
        <div class="ctx-item" id="ctx-clear-others"     style="white-space:nowrap;">Other canvases</div>
        <div class="ctx-item" id="ctx-clear-all-canv"   style="white-space:nowrap;">All canvases</div>
      </div>
    </div>`;
    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-toggle-snap">${state.snapEnabled !== false ? '✓ ' : ''}Snapping</div>`;
    html += `<div class="ctx-item" id="ctx-toggle-rulers">${state.showRulers ? 'Hide' : 'Show'} Rulers & Guides</div>`;
    html += `<div class="ctx-item" id="ctx-toggle-safezones">${state.showSafezones ? '✓ ' : ''}Show Safezones</div>`;
    html += `<div class="ctx-item" id="ctx-clear-guides">Clear All Guides</div>`;
    html += `<div class="ctx-item" id="ctx-toggle-outline">${state.outlineMode ? '✓ ' : ''}Outline Mode</div>`;
    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-open-settings">Settings…</div>`;
  } else {
    html += `<div class="ctx-item" id="ctx-toggle-snap">${state.snapEnabled !== false ? '✓ ' : ''}Snapping</div>`;
    html += `<div class="ctx-item" id="ctx-toggle-rulers">${state.showRulers ? 'Hide' : 'Show'} Rulers & Guides</div>`;
    html += `<div class="ctx-item" id="ctx-toggle-safezones">${state.showSafezones ? '✓ ' : ''}Show Safezones</div>`;
    html += `<div class="ctx-item" id="ctx-clear-guides">Clear All Guides</div>`;
    html += `<div class="ctx-item" id="ctx-toggle-outline">${state.outlineMode ? '✓ ' : ''}Outline Mode</div>`;
    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-open-settings">Settings…</div>`;
  }

  menu.innerHTML = html;
  menu.style.display = 'flex';

  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  let left = e.clientX, top = e.clientY;
  if (left + mw > window.innerWidth) left -= mw;
  if (top + mh > window.innerHeight) top -= mh;
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';

  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = (e) => { fn(e); menu.style.display = 'none'; }; };

  bind('ctx-mask-on', () => {
    const c = getActiveCanvas();
    if (!c || !state.layerSelection?.length) return;
    const id = state.layerSelection[0];
    const el = c.elements.find(x => x.id === id);
    if (!el || !canShapeBeMask(el)) return;
    const imgBeneath = findImageBeneath(c, el);
    if (!imgBeneath) {
      showCanvasNotification('Mask needs an image layer directly below it.', { type: 'warning' });
      return;
    }
    el.isMask = true;
    // Mask layers are allowed in link groups (v0.16.50). Mask geometry on
    // auto-resize is handled by the engine's mask post-pass independent
    // of link-group sync, so the prior strip-linkGroupId-on-mask gate
    // was overly defensive. We still drop dynamic data because masks
    // aren't real content slots — only their shape matters.
    if (el.dynamic) { delete el.dynamic; }
    if (el._assetDmMap) { delete el._assetDmMap; }
    // Auto-group the mask shape with its image so the pair moves/scales
    // together. Reuses an existing groupId on either side if present
    // (so we don't tear apart a pre-existing group). Removing the mask
    // intentionally does NOT auto-ungroup — the user can ungroup
    // manually via Ctrl+Shift+G.
    const groupGid = el.groupId || imgBeneath.groupId || uid();
    el.groupId = groupGid;
    imgBeneath.groupId = groupGid;
    pushHistory(); render();
    showCanvasNotification('Layer set as mask.', { type: 'success' });
  });
  bind('ctx-mask-off', () => {
    const c = getActiveCanvas();
    if (!c || !state.layerSelection?.length) return;
    const id = state.layerSelection[0];
    const el = c.elements.find(x => x.id === id);
    if (!el) return;
    delete el.isMask;
    pushHistory(); render();
    showCanvasNotification('Mask removed — shape is back to normal.');
  });
  bind('ctx-bring-fwd', () => { const c = getActiveCanvas(); if (c && state.layerSelection) { state.layerSelection.forEach(id => reorder(c, id, +1)); pushHistory(); render(); } });
  bind('ctx-send-bwd', () => { const c = getActiveCanvas(); if (c && state.layerSelection) { [...state.layerSelection].reverse().forEach(id => reorder(c, id, -1)); pushHistory(); render(); } });
  bind('ctx-copy', () => {
    const c = getActiveCanvas();
    if (c && state.layerSelection?.length > 0) {
      const selected = c.elements.filter(x => state.layerSelection.includes(x.id)).map(x => JSON.parse(JSON.stringify(x)));
      state.clipboard = {
        sourceCanvasId: c.id,
        sourceCanvasWidth: c.width,
        sourceCanvasHeight: c.height,
        elements: selected
      };
    }
  });
  bind('ctx-cut', () => {
    const c = getActiveCanvas();
    if (c && state.layerSelection?.length > 0) {
      const selected = c.elements.filter(x => state.layerSelection.includes(x.id)).map(x => JSON.parse(JSON.stringify(x)));
      state.clipboard = {
        sourceCanvasId: c.id,
        sourceCanvasWidth: c.width,
        sourceCanvasHeight: c.height,
        elements: selected
      };
      c.elements = c.elements.filter(x => !state.layerSelection.includes(x.id));
      state.layerSelection = [];
      state.selectedElementId = null;
      pushHistory();
      render();
    }
  });
  bind('ctx-reset-transform', () => {
    // Resets rotation + W/H back to the type's defaults from makeElement().
    // X/Y are intentionally preserved so the element stays where the user put it.
    const c = getActiveCanvas();
    if (!c || !state.layerSelection?.length) return;
    const defaultDims = { text: [220, 32], rect: [120, 80], circle: [80, 80], button: [130, 40], image: [140, 90] };
    let changed = false;
    c.elements.forEach(el => {
      if (!state.layerSelection.includes(el.id)) return;
      const def = defaultDims[el.type];
      if (el.rotation) { el.rotation = 0; changed = true; }
      if (def && (el.width !== def[0] || el.height !== def[1])) {
        el.width = def[0];
        el.height = def[1];
        changed = true;
      }
    });
    if (changed) {
      pushHistory();
      render();
    }
  });
  bind('ctx-group', groupSelection);
  bind('ctx-ungroup', ungroupSelection);
  bind('ctx-clone', () => {
    const c = getActiveCanvas();
    if (c && state.layerSelection) {
      const clones = [];
      state.layerSelection.forEach(id => {
        const el = c.elements.find(x => x.id === id);
        if (el) {
          const clone = JSON.parse(JSON.stringify(el));
          clone.id = uid();
          clone.x += 15;
          clone.y += 15;
          if (clone.groupId) clone.groupId = uid(); // Detach from group
          clones.push(clone);
        }
      });
      clones.forEach(cl => insertAtGroupEnd(c.elements, cl));
      state.layerSelection = clones.map(x => x.id);
      state.selectedElementId = clones[clones.length - 1].id;
      pushHistory();
      render();
    }
  });
  bind('ctx-save-asset', async () => await saveSelectionAsAsset());
  bind('ctx-define-placement', () => {
    const c = getActiveCanvas();
    const el = getSelectedElement() || (state.layerSelection?.length > 0 ? c.elements.find(x => x.id === state.layerSelection[0]) : null);
    if (!c || !el || !el.role || el.role === 'misc') return;
    
    if (!c.layoutOverrides) {
      c.layoutOverrides = {};
    }
    
    c.layoutOverrides[el.role] = {
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      fontSize: el.fontSize,
      maxFontSize: el.maxFontSize,
      textAlign: el.textAlign,
      verticalAlign: el.verticalAlign
    };

    const roleName = ROLE_LABELS[el.role] || el.role;
    showCanvasNotification(`Custom placement override for "${roleName}" saved for this canvas size.`, { type: 'success' });
    pushHistory();
    render();
  });
  bind('ctx-clear-override', () => {
    const c = getActiveCanvas();
    const el = getSelectedElement() || (state.layerSelection?.length > 0 ? c.elements.find(x => x.id === state.layerSelection[0]) : null);
    if (!c || !el || !el.role) return;
    
    if (c.layoutOverrides && c.layoutOverrides[el.role]) {
      delete c.layoutOverrides[el.role];
      if (Object.keys(c.layoutOverrides).length === 0) {
        delete c.layoutOverrides;
      }
      const roleName = ROLE_LABELS[el.role] || el.role;
      showCanvasNotification(`Cleared placement override for "${roleName}" on this canvas.`, { type: 'success' });
      pushHistory();
      render();
    }
  });
  bind('ctx-delete', () => {
    const c = getActiveCanvas();
    if (c && state.layerSelection) {
      c.elements = c.elements.filter(x => !state.layerSelection.includes(x.id));
      state.selectedElementId = null;
      state.layerSelection = [];
      pushHistory();
      render();
    }
  });

  bind('ctx-link-autolink', async () => {
    await autoLinkElements(true);
  });
  bind('ctx-link-new', async () => {
    const name = await showAdflowPrompt("Enter new link group name:");
    if (name && name.trim()) {
      createAndLinkGroup(name.trim());
    }
  });
  bind('ctx-link-autoadd', () => {
    const c = getActiveCanvas();
    if (!c || !state.layerSelection?.length) return;
    const selectedEls = state.layerSelection.map(id => c.elements.find(x => x.id === id)).filter(Boolean);
    if (selectedEls.length > 0) {
      selectedEls.forEach(el => {
        autoAddAndLink(el, true);
      });
      pushHistory();
      render();
      showCanvasNotification("Distributed & linked selected elements");
    }
  });
  bind('ctx-link-remove', () => {
    removeSelectionFromGroup();
  });
  bind('ctx-link-toggle-live', () => {
    const c = getActiveCanvas();
    if (c && state.layerSelection?.length > 0) {
      const linkedEl = c.elements.filter(x => state.layerSelection.includes(x.id));
      const groupIds = [...new Set(linkedEl.map(x => x.linkGroupId).filter(Boolean))];
      if (groupIds.length > 0) {
        const targetState = !state.linkGroups[groupIds[0]]?.liveLink;
        groupIds.forEach(gid => {
          if (state.linkGroups[gid]) {
            state.linkGroups[gid].liveLink = targetState;
          }
        });
        pushHistory();
        render();
        showCanvasNotification(targetState ? 'Live syncing enabled for group(s)' : 'Live syncing disabled for group(s)', { type: 'success' });
      }
    }
  });
  bind('ctx-link-push', () => {
    pushGroupChanges();
  });
  bind('ctx-link-delete-all', () => {
    const c = getActiveCanvas();
    if (c && state.layerSelection?.length > 0) {
      const firstEl = c.elements.find(x => x.id === state.layerSelection[0]);
      if (firstEl && firstEl.linkGroupId) {
        deleteGroupAndElements(firstEl.linkGroupId);
      }
    }
  });
  menu.querySelectorAll('.ctx-link-to-existing').forEach(btn => {
    btn.onclick = () => {
      const gid = btn.dataset.groupId;
      linkSelectionToGroup(gid);
      menu.style.display = 'none';
    };
  });
  bind('ctx-canvas-clone', () => {
    const id = canvasItemNode ? canvasItemNode.dataset.canvasId : state.activeCanvasId;
    const c = state.canvases.find(x => x.id === id);
    if (c) {
      const clone = JSON.parse(JSON.stringify(c));
      clone.id = uid();
      clone.workspaceX += 40;
      clone.workspaceY += 40;
      clone.elements.forEach(el => el.id = uid());
      state.canvases.push(clone);
      state.activeCanvasId = clone.id;
      pushHistory();
      render();
    }
  });
  bind('ctx-canvas-delete', () => {
    const id = canvasItemNode ? canvasItemNode.dataset.canvasId : state.activeCanvasId;
    if (state.canvases.length > 1) {
      const idx = state.canvases.findIndex(x => x.id === id);
      state.canvases.splice(idx, 1);
      if (state.activeCanvasId === id) state.activeCanvasId = state.canvases[0].id;
      pushHistory();
      render();
    }
  });
  bind('ctx-add-text', () => addElement('text'));
  bind('ctx-add-image', () => addElement('image'));
  bind('ctx-add-rect', () => addElement('rect'));
  bind('ctx-add-circle', () => addElement('circle'));
  bind('ctx-add-line', () => addElement('line'));
  bind('ctx-add-btn', () => addElement('button'));
  bind('ctx-add-bg', (e) => showBackgroundDropdown(e));

  bind('ctx-brand-cricos', () => addBrandElement('cricos'));
  bind('ctx-brandset-logo-rfwn-cricos', () => addBrandSet('logo_rfwn_cricos'));
  bind('ctx-brand-rfwn', () => addBrandElement('rfwn'));
  bind('ctx-brand-logowhite', () => addBrandElement('logo_white'));
  bind('ctx-brand-logofull', () => addBrandElement('logo_full'));
  bind('ctx-brand-logored', () => addBrandElement('logo_red'));
  bind('ctx-brand-pixel', () => addBrandElement('pixel'));
  bind('ctx-canvas-preview', () => {
    state.singlePreviewId = (state.singlePreviewId === state.activeCanvasId) ? null : state.activeCanvasId;
    render();
  });
  bind('ctx-canvas-bg-color', () => {
    // Surface the canvas Properties panel (renders when nothing is selected) and
    // programmatically click the bg-color swatch to open the existing color picker.
    state.selectedElementId = null;
    state.layerSelection = [];
    render();
    setTimeout(() => {
      const trigger = document.getElementById('c-bg-color');
      if (trigger) trigger.click();
    }, 50);
  });
  bind('ctx-canvas-export-html', () => { const c = getActiveCanvas(); if (c) exportCanvasAsZip(c); });
  bind('ctx-canvas-export-png', () => { const c = getActiveCanvas(); if (c) exportCanvasAsPng(c); });
  bind('ctx-canvas-sync', (e) => {
    e.stopPropagation();
    showSyncLayersMenu(e.target, 'canvas');
  });
  bind('ctx-frame-sync', (e) => {
    e.stopPropagation();
    showSyncLayersMenu(e.target, 'frame');
  });
  bind('ctx-canvas-auto-resize', () => {
    const s = (typeof getAutoResizeSettings === 'function') ? getAutoResizeSettings() : null;
    const showModal = s ? s.behaviour.showModalInCtxMenu !== false : true;
    if (showModal) {
      if (typeof openAutoResizeModal === 'function') {
        openAutoResizeModal();
      }
    } else {
      const src = getActiveCanvas();
      if (!src) return;
      const targets = state.canvases.filter(c => c.id !== src.id);
      if (targets.length === 0) {
        showCanvasNotification('Add at least one more canvas to resize into.', { type: 'warning' });
        return;
      }
      if (typeof runRuleBasedAutoResize === 'function') {
        runRuleBasedAutoResize({
          sourceId: src.id,
          targetIds: targets.map(c => c.id),
          includeUnassigned: s ? s.behaviour.includeUnassigned : false
        });
      }
    }
  });
  bind('ctx-canvas-auto-arrange', () => {
    runAutoArrange(state.activeCanvasId, state.layerSelection);
  });
  bind('ctx-clear-current',   () => clearCurrentCanvasContents());
  bind('ctx-clear-others',    () => clearOtherCanvasesContents());
  bind('ctx-clear-all-canv',  () => clearAllCanvasesContents());
  bind('ctx-toggle-snap', () => { state.snapEnabled = state.snapEnabled === false ? true : false; render(); });
  bind('ctx-toggle-rulers', () => { state.showRulers = !state.showRulers; render(); });
  bind('ctx-toggle-safezones', () => _toggleSafezones());
  bind('ctx-clear-guides', () => { state.guides = []; render(); });
  bind('ctx-toggle-outline', () => toggleOutlineMode());
  bind('ctx-open-settings', () => { if (typeof openSettings === 'function') openSettings(); });
});

document.addEventListener('mousedown', (e) => {
  if (state.editingElementId) {
    const activeEd = document.querySelector('.editable');
    if (activeEd && !activeEd.contains(e.target)) {
      activeEd.blur();
    }
  }

  const menu = document.getElementById('ctx-menu');
  if (menu && menu.style.display === 'flex' && !menu.contains(e.target)) {
    menu.style.display = 'none';
  }

  // Clear asset selection if clicked outside the Assets panel or popup
  const ap = document.getElementById('panel-section-assets');
  const popup = document.getElementById('asset-add-popup');
  if (state.assetSelection && state.assetSelection.length > 0) {
    if ((!ap || !ap.contains(e.target)) && (!popup || !popup.contains(e.target))) {
      state.assetSelection = [];
      render();
    }
  }
}, true);

let currentHoveredSection = null;
document.addEventListener('mouseover', (e) => {
  currentHoveredSection = e.target.closest('.panel-section');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const menu = document.getElementById('ctx-menu');
    if (menu && menu.style.display === 'flex') {
      menu.style.display = 'none';
    }
  }
  
  if (e.key === '`' || e.code === 'Backquote') {
    const activeEl = document.activeElement;
    if (activeEl && (
      activeEl.tagName === 'INPUT' || 
      activeEl.tagName === 'TEXTAREA' || 
      activeEl.isContentEditable
    )) {
      return;
    }
    if (currentHoveredSection) {
      if (currentHoveredSection.hasAttribute('data-permanent') || currentHoveredSection.getAttribute('data-permanent') === 'true') {
        return;
      }
      const fsBtn = currentHoveredSection.querySelector('.panel-fullscreen-btn');
      if (fsBtn) {
        e.preventDefault();
        fsBtn.click();
      }
    }
  }
});

// Autosave makes leaving seamless — no "unsaved changes" prompt. If a debounced
// write is still pending, flush it best-effort (IndexedDB may not finish, but the
// previous autosave is at most a few seconds old).
window.addEventListener('beforeunload', () => {
  if (_autosaveTimer) {
    clearTimeout(_autosaveTimer);
    _autosaveTimer = null;
    if (!_autosaveSuspended) writeAutosave();
  }
});


function initCollapsiblePanels() {
  document.querySelectorAll('.panel-header-collapsible').forEach(header => {
    if (header.dataset.collapsibleInit === 'true') return;
    header.dataset.collapsibleInit = 'true';
    
    const parentSection = header.closest('.panel-section');
    if (!parentSection) return;
    const keyAttr = header.id || header.innerText.trim().toLowerCase().replace(/\s+/g, '-');
    const storageKey = `panel-collapsed-${keyAttr}`;
    const isCollapsed = localStorage.getItem(storageKey) === 'true';

    // Swap the chevron's polyline points instead of relying on a CSS
    // `transform: rotate()` on the <svg> root — that doesn't actually
    // render in this browser/SVG combo (verified empirically). Two
    // hard-coded point sets:
    //   • '6 9 12 15 18 9'  → ▼ down (apex at bottom)
    //   • '9 6 15 12 9 18'  → ▶ right (apex on right)
    const setChevronPoints = (collapsed) => {
      const poly = header.querySelector('.collapse-icon polyline');
      if (poly) poly.setAttribute('points', collapsed ? '9 6 15 12 9 18' : '6 9 12 15 18 9');
    };

    if (isCollapsed) {
      parentSection.classList.add('collapsed');
    }
    setChevronPoints(isCollapsed);

    header.addEventListener('click', (e) => {
      if (e.target.closest('.panel-fullscreen-btn') || e.target.closest('.fav-filter-btn') || e.target.closest('#btn-add-canvas')) return;
      const currentlyCollapsed = parentSection.classList.toggle('collapsed');
      localStorage.setItem(storageKey, currentlyCollapsed ? 'true' : 'false');
      setChevronPoints(currentlyCollapsed);
    });
    // Exclude canvases and Dynamic Data
    const isExcluded = (keyAttr === 'header-dynamic-data' || keyAttr === 'header-canvases');
    if (!isExcluded) {
      const collapseIcon = header.querySelector('.collapse-icon');
      if (collapseIcon) {
        const fsBtn = document.createElement('button');
        fsBtn.className = 'panel-fullscreen-btn';
        fsBtn.title = 'Toggle Full Mode';
        fsBtn.style.cursor = 'pointer';
        fsBtn.style.display = 'inline-flex';
        fsBtn.style.alignItems = 'center';
        fsBtn.style.justifyContent = 'center';
        fsBtn.style.background = 'none';
        fsBtn.style.border = 'none';
        fsBtn.style.padding = '0';
        fsBtn.style.outline = 'none';
        fsBtn.style.color = 'var(--text-muted)';
        fsBtn.style.transition = 'color 0.15s';
        
        fsBtn.addEventListener('mouseenter', () => fsBtn.style.color = 'var(--text-bright)');
        fsBtn.addEventListener('mouseleave', () => {
          if (!parentSection.classList.contains('full-mode')) {
            fsBtn.style.color = 'var(--text-muted)';
          } else {
            fsBtn.style.color = 'var(--text-accent)';
          }
        });
        
        const setIcon = () => {
          const isFull = parentSection.classList.contains('full-mode');
          if (isFull) {
            fsBtn.title = 'Exit Full Mode';
            fsBtn.style.color = 'var(--text-accent)';
            fsBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v3a2 2 0 0 1-2 2H4M15 4v3a2 2 0 0 0 2 2h3M15 20v-3a2 2 0 0 1 2-2h3M9 20v-3a2 2 0 0 0-2-2H4"/></svg>`;
          } else {
            fsBtn.title = 'Toggle Full Mode';
            fsBtn.style.color = 'var(--text-muted)';
            fsBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H6a2 2 0 0 0-2 2v3M15 4h3a2 2 0 0 1 2 2v3M15 20h3a2 2 0 0 0 2-2v-3M9 20H6a2 2 0 0 1-2-2v-3"/></svg>`;
          }
        };
        setIcon();
        
        if (header.querySelector('.fav-filter-btn')) {
          fsBtn.style.marginLeft = '4px';
        }
        
        // v0.16.32 menu reshuffle: chevron now sits on the LEFT of the
        // header (via CSS flex `order: -1` on `.collapse-icon`). To let
        // the CSS reorder fire, the chevron must remain a direct child
        // of the h3 — DON'T wrap it together with fsBtn anymore. The
        // fullscreen button is simply appended as another direct child
        // of the header and the CSS rule
        //   .panel-header-collapsible > *:not(:first-child):not(.collapse-icon)
        // pushes it to the far right via margin-left:auto.
        if (collapseIcon.parentNode === header) {
          header.appendChild(fsBtn);
        } else {
          // The chevron is inside a nested container (e.g. an existing
          // actions span). Put fsBtn next to it inside that container
          // so the existing layout doesn't break.
          collapseIcon.parentNode.insertBefore(fsBtn, collapseIcon);
        }
        
        if (parentSection.id === 'panel-section-layers' && !header.querySelector('.panel-sync-layers-btn')) {
          const syncBtn = document.createElement('button');
          syncBtn.className = 'panel-sync-layers-btn';
          syncBtn.title = 'Sync layer order & settings to other canvases';
          syncBtn.style.cursor = 'pointer';
          syncBtn.style.display = 'inline-flex';
          syncBtn.style.alignItems = 'center';
          syncBtn.style.justifyContent = 'center';
          syncBtn.style.background = 'none';
          syncBtn.style.border = 'none';
          syncBtn.style.padding = '0';
          syncBtn.style.outline = 'none';
          syncBtn.style.color = 'var(--text-muted)';
          syncBtn.style.transition = 'color 0.15s';
          syncBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><title>Sync layer order & settings to other canvases</title><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`;
          
          syncBtn.addEventListener('mouseenter', () => syncBtn.style.color = 'var(--text-bright)');
          syncBtn.addEventListener('mouseleave', () => syncBtn.style.color = 'var(--text-muted)');
          
          if (collapseIcon.parentNode === header) {
            header.insertBefore(syncBtn, fsBtn);
          } else {
            collapseIcon.parentNode.insertBefore(syncBtn, fsBtn);
          }
          
          fsBtn.style.marginLeft = '6px';
          
          syncBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            showSyncLayersMenu(syncBtn);
          });
        }
        
        fsBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          
          const isEnteringFull = !parentSection.classList.contains('full-mode');
          const panelScroll = parentSection.closest('.panel-scroll');
          
          if (panelScroll) {
            panelScroll.querySelectorAll('.panel-section').forEach(sec => {
              if (sec !== parentSection) {
                sec.classList.remove('full-mode');
                sec.classList.remove('sibling-hidden');
                const siblingFsBtn = sec.querySelector('.panel-fullscreen-btn');
                if (siblingFsBtn) {
                  siblingFsBtn.title = 'Toggle Full Mode';
                  siblingFsBtn.style.color = 'var(--text-muted)';
                  siblingFsBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H6a2 2 0 0 0-2 2v3M15 4h3a2 2 0 0 1 2 2v3M15 20h3a2 2 0 0 0 2-2v-3M9 20H6a2 2 0 0 1-2-2v-3"/></svg>`;
                }
              }
            });
          }
          
          if (isEnteringFull) {
            parentSection.classList.add('full-mode');
            parentSection.classList.remove('collapsed');
            
            if (panelScroll) {
              panelScroll.querySelectorAll('.panel-section').forEach(sec => {
                if (sec !== parentSection && !sec.hasAttribute('data-permanent') && sec.getAttribute('data-permanent') !== 'true') {
                  sec.classList.add('sibling-hidden');
                }
              });
            }
          } else {
            parentSection.classList.remove('full-mode');
            if (panelScroll) {
              panelScroll.querySelectorAll('.panel-section').forEach(sec => {
                sec.classList.remove('sibling-hidden');
              });
            }
          }
          
          setIcon();
        });
      }
    }
  });
}

// Splash controller — bar tracks the real initialisation phases while the
// status line cycles through randomised quips (Sims-style). Shuffled per
// session, long enough that repeats are unlikely on a normal cold boot.
// If init takes longer than expected, more quips appear automatically.
const SPLASH_QUIPS = [
  'Locating the RMIT Red Pixel…',
  'Finding a free study spot in Building 80…',
  'Calibrating Design Hub\'s glass discs…',
  'Walking up the endless Building 80 stairs…',
  'Waiting for the Swanston Street tram…',
  'Consulting the Design Archive…',
  'Aligning coordinates to Bowen Street…',
  'Syncing with the SGS Saigon South campus…',
  'Hunting for the secret elevators in Building 80…',
  'Double-checking accessibility compliance…',
  'Inhaling Brunswick campus creative vibes…',
  'Waking up the Bundoora wind tunnel…',
  'Rendering the colorful facade of Building 80…',
  'Applying the RMIT brand guidelines…',
  'Waiting for student Wi-Fi to authenticate…',
  'Optimizing assets for online courses…',
  'Tuning the Capitol Theatre acoustics…',
  'Chasing the Red Pixel across the canvas…',
  'Drafting building plans in Design Hub…',
  'Sourcing Melbourne coffee for the render loop…',
  'Translating the brand style guide…',
  'Polishing the brand library…',
  'Aligning columns to the Swanston Street grid…',
  'Exporting marketing campaign versions…',
  'Reticulating logo variants…',
  'Checking pixel alignment constraints…',
  'Waiting for Melbourne Central crossing traffic…',
  'Defragmenting the creative assets library…',
  'Calibrating brand red HSL values…',
  'Downloading Melbourne city creative energy…',
  'Checking in at the SGS Hanoi campus…',
  'Tracing the pathways of Bowen Street…',
  'Consulting the Brand Hub guidelines…',
  'Loading visual identity assets…',
  'Simulating the walk from Central Station to Bowen Street…',
  'Refining pixel-level details…',
  'Syncing brand colors with corporate guidelines…',
  'Searching for Bowen Street food trucks…',
  'Wrangling brand typography weights…',
  'Putting the Red Pixel in place…'
];

const appSplash = (() => {
  const root = document.getElementById('app-splash');
  const statusEl = document.getElementById('app-splash-status');
  const barEl = document.getElementById('app-splash-bar-fill');
  const startedAt = performance.now();
  const MIN_DISPLAY_MS = 1500;
  const TOTAL_PHASES = 5;

  // Add version next to the logo, style it as a badge, and scale up splash elements
  if (root) {
    const inner = root.querySelector('.app-splash-inner');
    if (inner) {
      inner.style.gap = '32px';
    }

    if (statusEl) {
      statusEl.style.fontSize = '13px';
      statusEl.style.letterSpacing = '0.12em';
    }

    const bar = root.querySelector('.app-splash-bar');
    if (bar) {
      bar.style.width = '300px';
      bar.style.height = '4px';
      bar.style.borderRadius = '4px';
    }

    const logoEl = root.querySelector('.app-splash-logo');
    if (logoEl) {
      // Stop logo from pulsing
      logoEl.style.animation = 'none';

      // Position logo and version side by side
      logoEl.style.display = 'flex';
      logoEl.style.alignItems = 'center';
      logoEl.style.justifyContent = 'center';
      logoEl.style.gap = '14px';

      // Set logo image size to look larger and clean
      const img = logoEl.querySelector('img');
      if (img) {
        img.style.width = 'auto';
        img.style.height = '44px';
      }

      if (!logoEl.querySelector('.app-splash-version')) {
        const verEl = document.createElement('span');
        verEl.className = 'app-splash-version';
        verEl.style.cssText = 'font-size: 10px; color: var(--text-muted, #8b8f9c); border: 1px solid rgba(139, 143, 156, 0.4); padding: 2px 8px; border-radius: 10px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: inline-flex; align-items: center; justify-content: center; line-height: 1; margin-top: 2px;';
        verEl.textContent = 'v0.19.14';
        logoEl.appendChild(verEl);
      }
    }
  }

  // Fisher-Yates-ish shuffle so each session feels fresh.
  const pool = SPLASH_QUIPS.slice().sort(() => Math.random() - 0.5);
  let poolIdx = 0;
  let progress = 0;
  let finished = false;
  let cycleTimer = null;

  function setText(text) {
    if (!statusEl || finished) return;
    statusEl.classList.add('app-splash-status-fade');
    setTimeout(() => {
      if (finished) return;
      statusEl.textContent = text;
      statusEl.classList.remove('app-splash-status-fade');
    }, 130);
  }

  function nextQuip() {
    if (finished) return;
    setText(pool[poolIdx % pool.length]);
    poolIdx++;
    // Make durations intermittent and randomized (e.g. 300ms to 1800ms)
    const randomMs = Math.floor(Math.random() * (1800 - 300 + 1)) + 300;
    cycleTimer = setTimeout(nextQuip, randomMs);
  }

  function setPhase(idx) {
    if (!root || finished) return;
    const p = Math.min(1, (idx + 1) / TOTAL_PHASES);
    if (p > progress) progress = p;
    if (barEl) barEl.style.width = Math.round(progress * 100) + '%';
  }

  let finishing = false;
  async function finish() {
    if (!root || finishing || finished) return;
    finishing = true;
    if (barEl) barEl.style.width = '100%';
    // Keep quips cycling through the min-display wait — only mark `finished`
    // and stop the cycle when we're actually about to fade out.
    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
    finished = true;
    if (cycleTimer) { clearTimeout(cycleTimer); cycleTimer = null; }
    root.classList.add('app-splash-out');
    setTimeout(() => { if (root) root.style.display = 'none'; }, 420);
  }

  if (barEl) barEl.style.width = '5%';
  nextQuip();

  return { setPhase, finish };
})();


async function scanStartupTemplates() {
  try {
    const res = await fetch(`Startup/registry.json?t=${Date.now()}`);
    if (res.ok) {
      const rawTemplates = await res.json();
      const verified = [];
      for (const t of rawTemplates) {
        try {
          const fileRes = await fetch(`Startup/${t.fileName}?t=${Date.now()}`);
          if (fileRes.ok) {
            const blob = await fileRes.blob();
            const zip = await JSZip.loadAsync(blob);
            let isTemplate = false;

            const projFile = zip.file('project.json');
            if (projFile) {
              const jsonStr = await projFile.async('string');
              const loadedState = JSON.parse(jsonStr);
              if (loadedState.isTemplate === true) isTemplate = true;
            }
            if (!isTemplate) {
              const metaFile = zip.file('meta.json');
              if (metaFile) {
                const metaStr = await metaFile.async('string');
                const meta = JSON.parse(metaStr);
                if (meta.isTemplate === true) isTemplate = true;
              }
            }

            if (isTemplate) {
              verified.push(t);
            } else {
              console.warn(`Template registry file ${t.fileName} is missing template metadata. Omitted.`);
            }
          }
        } catch (err) {
          console.warn(`Failed to validate registry template ${t.fileName}:`, err);
        }
      }
      startupTemplates = verified;
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Could not load startup templates registry:', e);
    return false;
  }
}

async function loadStartupTemplate(fileName, customProjectName, customCompressFormat = null) {
  const progress = showLoadingProgress('Creating Project from Template...');
  try {
    progress.setProgress(10, 'Fetching template...');
    const fileToFetch = fileName || 'Adflow_startup.flow';
    const response = await fetch(`Startup/${fileToFetch}?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();

    progress.setProgress(20, 'Reading template structure...');
    if (typeof JSZip === 'undefined') throw new Error('JSZip is not loaded.');
    const zip = await JSZip.loadAsync(blob);
    let isTemplate = false;

    const projFile = zip.file('project.json');
    if (projFile) {
      const jsonStr = await projFile.async('string');
      const loadedState = JSON.parse(jsonStr);
      if (loadedState.isTemplate === true) isTemplate = true;
    }
    if (!isTemplate) {
      const metaFile = zip.file('meta.json');
      if (metaFile) {
        const metaStr = await metaFile.async('string');
        const meta = JSON.parse(metaStr);
        if (meta.isTemplate === true) isTemplate = true;
      }
    }

    if (!isTemplate) {
      progress.close();
      showCanvasNotification('Selected startup file is not a valid template.', { type: 'error' });
      return false;
    }

    await loadProjectFromBlob(blob, customProjectName, progress, customCompressFormat);
    if (typeof writeAutosave === 'function') {
      await writeAutosave();
    }
    return true;
  } catch (e) {
    progress.close();
    console.error('Failed to load startup template:', e);
    showCanvasNotification('Failed to load startup template. Starting fresh instead.', { type: 'warning' });
    return false;
  }
}


(async function initApp() {
  appSplash.setPhase(0.5);
  await scanStartupTemplates();

  appSplash.setPhase(1);
  let restored = false;
  try { restored = await restoreAutosave(); } catch (e) { console.warn(e); }
  if (!restored) {
    let mode = localStorage.getItem('adflow-startup-mode') || 'fresh';
    if (mode === 'startup') mode = 'Adflow_startup.flow';
    if (mode !== 'fresh') {
      try {
        restored = await loadStartupTemplate(mode);
      } catch (e) {
        console.warn('Startup template load failed, starting fresh:', e);
      }
    }
  }
  appSplash.setPhase(2);
  await syncRmitAssets();
  appSplash.setPhase(3);
  updateRecentProjectsMenu();

  const savedLeft = restored ? state.viewScrollLeft : undefined;
  const savedTop = restored ? state.viewScrollTop : undefined;
  const savedZoom = restored ? state.zoom : undefined;

  if (restored) {
    state.zoom = 1.0;
  }

  render();
  setActiveTool(state.activeTool || 'select');
  initCollapsiblePanels();
  appSplash.setPhase(4);
  checkVersionUpdate();
  queueSizeUpdate();
  // Always boot to a centered view, regardless of last saved scroll. If the
  // user had a non-default position saved, offer a toast to jump back to it
  // — but only after the splash has finished so the toast isn't hidden under it.
  setTimeout(() => centerWorkspace('instant'), 10);
  // Enable autosave now that the initial state is settled, and persist the seed
  // project once if there was nothing to restore.
  _autosaveSuspended = false;
  setLocalSaveStatus('saved');
  initializeCloudSaveStatus();
  if (!restored) writeAutosave();

  // If auth is configured and no user is signed in, the splash sticks around
  // showing the gate. Sign-in OR "Use locally" dismisses it. If creds are
  // missing, or the user has a remembered session, fall through to the normal
  // finish path.
  if (authState.enabled) {
    await authState.ready;
    if (!authState.currentUser()) {
      await new Promise(resolve => showSplashGate(resolve));
    }
  }
  await appSplash.finish();
  offerResumeView(savedLeft, savedTop, savedZoom);

  // Project name auto-scrolling on hover when text is too long
  const projMetaContainer = document.getElementById('project-meta-container');
  const projNameDisplay = document.getElementById('project-name-display');
  if (projMetaContainer && projNameDisplay) {
    let scrollAnimFrame = null;
    projMetaContainer.addEventListener('mouseenter', () => {
      const limit = projNameDisplay.scrollWidth - projNameDisplay.clientWidth;
      if (limit > 0) {
        let start = null;
        const duration = limit * 25; // 25ms per pixel
        function step(timestamp) {
          if (!start) start = timestamp;
          const progress = Math.min(1, (timestamp - start) / duration);
          projNameDisplay.scrollLeft = progress * limit;
          if (progress < 1) {
            scrollAnimFrame = requestAnimationFrame(step);
          }
        }
        scrollAnimFrame = requestAnimationFrame(step);
      }
    });
    projMetaContainer.addEventListener('mouseleave', () => {
      if (scrollAnimFrame) {
        cancelAnimationFrame(scrollAnimFrame);
        scrollAnimFrame = null;
      }
      projNameDisplay.scrollTo({ left: 0, behavior: 'smooth' });
    });
  }
})();



function showCanvasNotification(message, options = {}) {
  let toast = document.getElementById('canvas-toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'canvas-toast-msg';
    toast.className = 'canvas-notification';
    document.body.appendChild(toast);
  }

  // Clone node to reset all event listeners
  const newToast = toast.cloneNode(false);
  toast.parentNode.replaceChild(newToast, toast);
  toast = newToast;

  // Set class name with type support
  toast.className = 'canvas-notification';
  if (options.type) {
    toast.classList.add(options.type);
  }

  // Predefined SVG icons for standard types
  const successIcon = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  `;
  const warningIcon = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  `;
  const infoIcon = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  `;
  const errorIcon = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  `;

  let iconHtml = options.icon || '';
  if (!iconHtml) {
    if (options.type === 'warning') iconHtml = warningIcon;
    else if (options.type === 'error') iconHtml = errorIcon;
    else if (options.type === 'info') iconHtml = infoIcon;
    else iconHtml = successIcon;
  }

  // Accept either `button` (singular, legacy) or `buttons` (plural array).
  const buttonList = Array.isArray(options.buttons)
    ? options.buttons
    : (options.button ? [options.button] : []);
  const buttonHtml = buttonList.map((b, i) => `<button class="toast-btn" data-btn-i="${i}">${b.text}</button>`).join('');

  toast.innerHTML = `
    <span class="icon">${iconHtml}</span>
    <span>${message}</span>
    ${buttonHtml}
  `;
  // Wire each button's click — dismisses the toast on any choice.
  buttonList.forEach((b, i) => {
    const el = toast.querySelector(`.toast-btn[data-btn-i="${i}"]`);
    if (!el || !b.onClick) return;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      try { b.onClick(e); } catch (err) { console.warn(err); }
      toast.classList.remove('show');
    });
  });
  const hasButton = buttonList.length > 0;

  toast.classList.remove('show');
  void toast.offsetWidth; // Force reflow
  toast.classList.add('show');

  if (window.canvasNotificationTimeout) {
    clearTimeout(window.canvasNotificationTimeout);
  }

  const duration = options.duration || (hasButton ? 6000 : 2500);
  window.canvasNotificationTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function showSyncLayersMenu(anchorEl, initialTab = 'canvas') {
  const existing = document.getElementById('sync-layers-modal-bg');
  if (existing) {
    existing.remove();
    return;
  }

  const originalActiveFrameId = state.activeFrameId;

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.id = 'sync-layers-modal-bg';
  bg.style.zIndex = '999999';

  const syncOrder = localStorage.getItem('sync-layers-order') !== 'false';
  const syncVisibility = localStorage.getItem('sync-layers-visibility') !== 'false';
  const syncLock = localStorage.getItem('sync-layers-lock') !== 'false';
  const syncPersistent = localStorage.getItem('sync-layers-persistent') !== 'false';
  const syncAllCanvases = localStorage.getItem('sync-layers-all-canvases') !== 'false';

  const syncFramesOrder = localStorage.getItem('sync-frames-order') !== 'false';
  const syncFramesVisibility = localStorage.getItem('sync-frames-visibility') !== 'false';
  const syncFramesLock = localStorage.getItem('sync-frames-lock') !== 'false';
  const syncFramesPersistent = localStorage.getItem('sync-frames-persistent') !== 'false';
  const syncFramesBreakLink = localStorage.getItem('sync-frames-break-link') !== 'false';
  const syncAllFrames = localStorage.getItem('sync-layers-all-frames') !== 'false';

  const otherCanvases = state.canvases.filter(c => c.id !== state.activeCanvasId);
  const esc = (s) => String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  let canvasesListHtml = '';
  if (otherCanvases.length > 0) {
    canvasesListHtml = `
      <div id="sync-canvases-selection-container" style="display: ${syncAllCanvases ? 'none' : 'flex'}; flex-direction: column; gap: 4px; max-height: 100px; overflow-y: auto; padding: 4px 6px; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 4px; margin-top: 4px;">
        ${otherCanvases.map(c => `
          <label style="display:flex; align-items:center; gap:6px; font-size:11px; cursor:pointer;" title="Toggle canvas target ${esc(c.name || `${c.width}x${c.height}`)}">
            <input type="checkbox" class="sync-target-canvas-chk" data-id="${c.id}" checked style="margin:0;" />
            <span>${esc(c.name || `${c.width}x${c.height}`)}</span>
          </label>
        `).join('')}
      </div>
    `;
  } else {
    canvasesListHtml = `<div style="font-size:11px; color:var(--text-muted); font-style:italic;">No other canvases</div>`;
  }

  bg.innerHTML = `
    <div class="modal" style="max-width:440px;">
      <div class="modal-head">
        <h2>Frame Sync</h2>
        <button class="btn" id="sync-layers-close" title="Close dialog">Close</button>
      </div>

      <!-- Tab navigation -->
      <div style="display: flex; gap: 0; border-bottom: 1px solid var(--border-light); background: var(--bg-body); padding: 0 12px; flex-shrink: 0;">
        <button id="btn-tab-canvas-sync" style="flex: 1; padding: 12px 0; font-size: 12px; font-weight: 600; border: none; border-bottom: 2px solid var(--accent-base); background: none; color: var(--text-main); cursor: pointer; text-align: center; outline: none; transition: all 0.15s;">Sync Across Canvases</button>
        <button id="btn-tab-frame-sync" style="flex: 1; padding: 12px 0; font-size: 12px; font-weight: 500; border: none; border-bottom: 2px solid transparent; background: none; color: var(--text-muted); cursor: pointer; text-align: center; outline: none; transition: all 0.15s;">Sync Across Frames</button>
      </div>

      <div class="modal-body" style="display:flex; flex-direction:column; gap:16px; padding:18px 22px; overflow-y:auto;">
        <!-- Canvas Sync Container -->
        <div id="container-canvas-sync" style="display: flex; flex-direction: column; gap: 14px;">
          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
            Match the layer order, visibility, and lock settings of the current canvas across your other canvases.
          </div>
          
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Sync Options</div>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size: 12px; font-weight: 500;" title="Reorders linked layers in target canvases to match the active canvas stack order. Local unlinked layers remain safe on top.">
              <input type="checkbox" id="chk-sync-order" ${syncOrder ? 'checked' : ''} style="margin:0;" />
              <span>Stacking Order</span>
            </label>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size: 12px; font-weight: 500;" title="Synchronizes layer visibility state (hidden/visible) with the active canvas elements.">
              <input type="checkbox" id="chk-sync-visibility" ${syncVisibility ? 'checked' : ''} style="margin:0;" />
              <span>Visibility State</span>
            </label>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size: 12px; font-weight: 500;" title="Synchronizes layers locking status (editable/locked) to match the active canvas state.">
              <input type="checkbox" id="chk-sync-lock" ${syncLock ? 'checked' : ''} style="margin:0;" />
              <span>Lock State</span>
            </label>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size: 12px; font-weight: 500;" title="Synchronizes tier assignments (Always Top, Always Bottom, or Standard) and parent frames.">
              <input type="checkbox" id="chk-sync-persistent" ${syncPersistent ? 'checked' : ''} style="margin:0;" />
              <span>Persistent Tiers & Roles</span>
            </label>
          </div>

          <div style="height:1px; background:var(--border-light); margin: 4px 0;"></div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Target Canvases</div>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size: 12px; font-weight: 500;" title="Apply the sync configuration to all other canvases in the document.">
              <input type="checkbox" id="chk-sync-all-canvases" ${syncAllCanvases ? 'checked' : ''} style="margin:0;" />
              <span>All other canvases</span>
            </label>
            ${canvasesListHtml}
          </div>
        </div>

        <!-- Frame Sync Container -->
        <div id="container-frame-sync" style="display: none; flex-direction: column; gap: 14px;">
          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
            Copy the layer stack of a selected frame to other target frames on this canvas.
          </div>

          <!-- Source Frame Selector Dropdown -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Source Frame</div>
            <select id="select-sync-source-frame" style="width:100%; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:6px 8px; font-size:12px; outline:none; cursor:pointer;" title="Choose the source frame to copy layer stack from. Updates active frame on canvas in real-time.">
              ${state.frames.map((f, i) => `
                <option value="${f.id}" ${f.id === state.activeFrameId ? 'selected' : ''}>Frame ${i + 1}</option>
              `).join('')}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Sync Options</div>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size: 12px; font-weight: 500;" title="Copy stacking order from the active frame.">
              <input type="checkbox" id="chk-sync-frames-order" ${syncFramesOrder ? 'checked' : ''} style="margin:0;" />
              <span>Stacking Order</span>
            </label>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size: 12px; font-weight: 500;" title="Copy layer visibility state.">
              <input type="checkbox" id="chk-sync-frames-visibility" ${syncFramesVisibility ? 'checked' : ''} style="margin:0;" />
              <span>Visibility State</span>
            </label>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size: 12px; font-weight: 500;" title="Copy lock state.">
              <input type="checkbox" id="chk-sync-frames-lock" ${syncFramesLock ? 'checked' : ''} style="margin:0;" />
              <span>Lock State</span>
            </label>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size: 12px; font-weight: 500;" title="Copy persistent tiers and roles.">
              <input type="checkbox" id="chk-sync-frames-persistent" ${syncFramesPersistent ? 'checked' : ''} style="margin:0;" />
              <span>Persistent Tiers & Roles</span>
            </label>
          </div>

          <div style="height:1px; background:var(--border-light); margin: 2px 0;"></div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Link Sync Options</div>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size: 12px; font-weight: 500;" title="Remove link group association on cloned layers so they edit independently of source layers.">
              <input type="checkbox" id="chk-sync-frames-break-link" ${syncFramesBreakLink ? 'checked' : ''} style="margin:0;" />
              <span>Break Link Group</span>
            </label>
          </div>

          <div style="height:1px; background:var(--border-light); margin: 4px 0;"></div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Target Frames</div>
            <div id="sync-frames-targets-wrapper">
              <!-- Rendered dynamically -->
            </div>
          </div>
        </div>
      </div>

      <!-- Modal footer -->
      <div class="modal-foot">
        <button class="btn btn-sync-layers-cancel" style="padding: 6px 12px; font-size: 12px; cursor: pointer;">Cancel</button>
        <button class="btn primary" id="btn-sync-layers-execute" style="padding: 6px 16px; font-size: 12px; font-weight: 600; background: var(--accent-base); color: var(--text-on-accent, #fff); border: none; border-radius: 4px; cursor: pointer;">Sync Across Canvases</button>
      </div>
    </div>
  `;

  document.body.appendChild(bg);

  // Tab buttons and containers
  const tabCanvas = bg.querySelector('#btn-tab-canvas-sync');
  const tabFrame = bg.querySelector('#btn-tab-frame-sync');
  const containerCanvas = bg.querySelector('#container-canvas-sync');
  const containerFrame = bg.querySelector('#container-frame-sync');
  const executeBtn = bg.querySelector('#btn-sync-layers-execute');

  let activeTab = 'canvas';

  tabCanvas.onclick = () => {
    activeTab = 'canvas';
    tabCanvas.style.borderBottomColor = 'var(--accent-base)';
    tabCanvas.style.color = 'var(--text-main)';
    tabCanvas.style.fontWeight = '600';

    tabFrame.style.borderBottomColor = 'transparent';
    tabFrame.style.color = 'var(--text-muted)';
    tabFrame.style.fontWeight = '500';

    containerCanvas.style.display = 'flex';
    containerFrame.style.display = 'none';
    executeBtn.innerText = 'Sync Across Canvases';
  };

  tabFrame.onclick = () => {
    activeTab = 'frame';
    tabCanvas.style.borderBottomColor = 'transparent';
    tabCanvas.style.color = 'var(--text-muted)';
    tabCanvas.style.fontWeight = '500';

    tabFrame.style.borderBottomColor = 'var(--accent-base)';
    tabFrame.style.color = 'var(--text-main)';
    tabFrame.style.fontWeight = '600';

    containerCanvas.style.display = 'none';
    containerFrame.style.display = 'flex';
    executeBtn.innerText = 'Sync Across Frames';
  };

  // Helper to update target frames selection dynamically
  const updateTargetFramesList = (selectedSourceId) => {
    const otherFrames = state.frames.filter(f => f.id !== selectedSourceId);
    const syncAllFrames = localStorage.getItem('sync-layers-all-frames') !== 'false';
    const wrapper = bg.querySelector('#sync-frames-targets-wrapper');
    if (!wrapper) return;

    if (otherFrames.length === 0) {
      wrapper.innerHTML = `<div style="font-size:12px; color:var(--text-muted); font-style:italic; padding: 4px 0;">No other frames available to sync</div>`;
      return;
    }

    const checkboxRows = otherFrames.map(f => {
      const frameIndex = state.frames.findIndex(x => x.id === f.id);
      return `
        <label style="display:flex; align-items:center; gap:6px; font-size:11px; cursor:pointer;" title="Toggle frame target Frame ${frameIndex + 1}">
          <input type="checkbox" class="sync-target-frame-chk" data-id="${f.id}" checked style="margin:0;" />
          <span>Frame ${frameIndex + 1}</span>
        </label>
      `;
    }).join('');

    wrapper.innerHTML = `
      <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size: 12px; font-weight: 500;" title="Apply the frame sync to all other frames.">
        <input type="checkbox" id="chk-sync-all-frames" ${syncAllFrames ? 'checked' : ''} style="margin:0;" />
        <span>All other frames</span>
      </label>
      <div id="sync-frames-selection-container" style="display: ${syncAllFrames ? 'none' : 'flex'}; flex-direction: column; gap: 4px; max-height: 100px; overflow-y: auto; padding: 4px 6px; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 4px; margin-top: 4px;">
        ${checkboxRows}
      </div>
    `;

    const chkAllFrames = wrapper.querySelector('#chk-sync-all-frames');
    const containerFramesSelection = wrapper.querySelector('#sync-frames-selection-container');
    if (chkAllFrames && containerFramesSelection) {
      chkAllFrames.onchange = () => {
        containerFramesSelection.style.display = chkAllFrames.checked ? 'none' : 'flex';
        localStorage.setItem('sync-layers-all-frames', chkAllFrames.checked ? 'true' : 'false');
      };
    }
  };

  // Populate target frames list initially
  updateTargetFramesList(state.activeFrameId);

  // Set initial active tab state
  if (initialTab === 'frame') {
    tabFrame.onclick();
  } else {
    tabCanvas.onclick();
  }

  // Source Frame Selector dynamic preview
  const selectSourceFrame = bg.querySelector('#select-sync-source-frame');
  if (selectSourceFrame) {
    selectSourceFrame.onchange = (e) => {
      const selectedId = parseInt(e.target.value, 10);
      state.activeFrameId = selectedId;
      render();
      updateTargetFramesList(selectedId);
    };
  }

  // Canvas Options Change listeners
  const chkAllCanvases = bg.querySelector('#chk-sync-all-canvases');
  const containerSelection = bg.querySelector('#sync-canvases-selection-container');
  if (chkAllCanvases && containerSelection) {
    chkAllCanvases.onchange = () => {
      containerSelection.style.display = chkAllCanvases.checked ? 'none' : 'flex';
      localStorage.setItem('sync-layers-all-canvases', chkAllCanvases.checked ? 'true' : 'false');
    };
  }

  bg.querySelector('#chk-sync-order').onchange = (e) => localStorage.setItem('sync-layers-order', e.target.checked ? 'true' : 'false');
  bg.querySelector('#chk-sync-visibility').onchange = (e) => localStorage.setItem('sync-layers-visibility', e.target.checked ? 'true' : 'false');
  bg.querySelector('#chk-sync-lock').onchange = (e) => localStorage.setItem('sync-layers-lock', e.target.checked ? 'true' : 'false');
  bg.querySelector('#chk-sync-persistent').onchange = (e) => localStorage.setItem('sync-layers-persistent', e.target.checked ? 'true' : 'false');

  bg.querySelector('#chk-sync-frames-order').onchange = (e) => localStorage.setItem('sync-frames-order', e.target.checked ? 'true' : 'false');
  bg.querySelector('#chk-sync-frames-visibility').onchange = (e) => localStorage.setItem('sync-frames-visibility', e.target.checked ? 'true' : 'false');
  bg.querySelector('#chk-sync-frames-lock').onchange = (e) => localStorage.setItem('sync-frames-lock', e.target.checked ? 'true' : 'false');
  bg.querySelector('#chk-sync-frames-break-link').onchange = (e) => localStorage.setItem('sync-frames-break-link', e.target.checked ? 'true' : 'false');
  bg.querySelector('#chk-sync-frames-persistent').onchange = (e) => {
    localStorage.setItem('sync-frames-persistent', e.target.checked ? 'true' : 'false');
    localStorage.setItem('sync-layers-maintain-settings', e.target.checked ? 'true' : 'false');
  };

  // Close and Cancel triggers
  const closeModal = (restore = true) => {
    if (restore && state.activeFrameId !== originalActiveFrameId) {
      state.activeFrameId = originalActiveFrameId;
      render();
    }
    bg.remove();
  };

  bg.querySelector('#sync-layers-close').onclick = () => closeModal(true);
  bg.querySelectorAll('.btn-sync-layers-cancel').forEach(btn => {
    btn.onclick = () => closeModal(true);
  });

  bg.onclick = (e) => {
    if (e.target === bg) closeModal(true);
  };

  // Execute Action
  executeBtn.onclick = () => {
    const sourceC = getActiveCanvas();
    if (!sourceC) {
      closeModal(true);
      return;
    }

    if (activeTab === 'canvas') {
      const settings = {
        syncOrder: bg.querySelector('#chk-sync-order').checked,
        syncVisibility: bg.querySelector('#chk-sync-visibility').checked,
        syncLock: bg.querySelector('#chk-sync-lock').checked,
        syncPersistent: bg.querySelector('#chk-sync-persistent').checked,
      };

      const isAll = chkAllCanvases ? chkAllCanvases.checked : true;
      let targets = [];
      if (isAll) {
        targets = state.canvases.filter(c => c.id !== sourceC.id);
      } else {
        const selectedIds = Array.from(bg.querySelectorAll('.sync-target-canvas-chk:checked')).map(chk => chk.dataset.id);
        targets = state.canvases.filter(c => selectedIds.includes(c.id));
      }

      if (targets.length === 0) {
        showCanvasNotification('No target canvases selected.', { type: 'warning' });
        closeModal(true);
        return;
      }

      executeLayersSync(sourceC, targets, settings);
      closeModal(false);
      showCanvasNotification(`Synchronized layers to ${targets.length} canvas${targets.length > 1 ? 'es' : ''}.`, { type: 'success' });
    } else {
      const chkAllFrames = bg.querySelector('#chk-sync-all-frames');
      const isAll = chkAllFrames ? chkAllFrames.checked : true;

      const currentSourceId = state.activeFrameId;
      const otherFrames = state.frames.filter(f => f.id !== currentSourceId);

      let targetFrameIds = [];
      if (isAll) {
        targetFrameIds = otherFrames.map(f => f.id);
      } else {
        targetFrameIds = Array.from(bg.querySelectorAll('.sync-target-frame-chk:checked')).map(chk => parseInt(chk.dataset.id, 10));
      }

      if (targetFrameIds.length === 0) {
        showCanvasNotification('No target frames selected.', { type: 'warning' });
        closeModal(true);
        return;
      }

      const settings = {
        syncOrder: bg.querySelector('#chk-sync-frames-order').checked,
        syncVisibility: bg.querySelector('#chk-sync-frames-visibility').checked,
        syncLock: bg.querySelector('#chk-sync-frames-lock').checked,
        syncPersistent: bg.querySelector('#chk-sync-frames-persistent').checked,
        breakLink: bg.querySelector('#chk-sync-frames-break-link').checked,
      };

      executeFrameSync(sourceC, targetFrameIds, settings);
      closeModal(false);
      showCanvasNotification(`Copied frame layer stack to ${targetFrameIds.length} frame${targetFrameIds.length > 1 ? 's' : ''}.`, { type: 'success' });
    }
  };

  const outsideClickListener = (e) => {
    if (!bg.contains(e.target) && !anchorEl.contains(e.target)) {
      closeModal(true);
      document.removeEventListener('click', outsideClickListener, true);
    }
  };
  document.addEventListener('click', outsideClickListener, true);
}

function executeLayersSync(sourceC, targets, settings) {
  let changed = false;

  const sourceLinkedMap = {};
  sourceC.elements.forEach((el, index) => {
    if (el.linkGroupId) {
      sourceLinkedMap[el.linkGroupId] = { el, index };
    }
  });

  targets.forEach(targetC => {
    const targetLinked = [];
    const targetCanvasSpecific = [];

    targetC.elements.forEach(el => {
      if (el.linkGroupId && sourceLinkedMap[el.linkGroupId]) {
        targetLinked.push(el);
      } else {
        targetCanvasSpecific.push(el);
      }
    });

    if (targetLinked.length === 0) return;

    changed = true;

    targetLinked.forEach(tEl => {
      const sEl = sourceLinkedMap[tEl.linkGroupId].el;

      if (settings.syncVisibility) {
        tEl.hidden = sEl.hidden;
      }
      if (settings.syncLock) {
        tEl.locked = sEl.locked;
      }
      if (settings.syncPersistent) {
        tEl.persistent = sEl.persistent;
        if (sEl.persistent === false) {
          tEl.frameId = sEl.frameId;
        }
      }
    });

    if (settings.syncOrder) {
      targetLinked.sort((a, b) => {
        return sourceLinkedMap[a.linkGroupId].index - sourceLinkedMap[b.linkGroupId].index;
      });

      const bottomLinked = targetLinked.filter(el => el.persistent === 'bottom');
      const bottomSpecific = targetCanvasSpecific.filter(el => el.persistent === 'bottom');

      const midLinked = targetLinked.filter(el => el.persistent === false);
      const midSpecific = targetCanvasSpecific.filter(el => el.persistent === false);

      const topLinked = targetLinked.filter(el => el.persistent === 'top');
      const topSpecific = targetCanvasSpecific.filter(el => el.persistent === 'top');

      targetC.elements = [
        ...bottomLinked,
        ...bottomSpecific,
        ...midLinked,
        ...midSpecific,
        ...topLinked,
        ...topSpecific
      ];
    } else {
      const bottomEls = targetC.elements.filter(el => el.persistent === 'bottom');
      const midEls = targetC.elements.filter(el => el.persistent === false);
      const topEls = targetC.elements.filter(el => el.persistent === 'top');
      targetC.elements = [...bottomEls, ...midEls, ...topEls];
    }
  });

  if (changed) {
    pushHistory();
    render();
  }
}

function executeFrameSync(canvas, targetFrameIds, settings) {
  if (!canvas || !targetFrameIds || targetFrameIds.length === 0) return;

  const activeFrameId = state.activeFrameId;

  // 1. Get elements to clone: el.persistent === false && el.frameId === activeFrameId
  const sourceElements = canvas.elements.filter(el => el.persistent === false && el.frameId === activeFrameId);

  // 2. Clear target frame elements, and add cloned elements
  let newElements = canvas.elements.filter(el => {
    if (el.persistent !== false) return true;
    if (!targetFrameIds.includes(el.frameId)) return true;
    return false;
  });

  targetFrameIds.forEach(targetFrameId => {
    const clones = sourceElements.map(srcEl => {
      const clone = JSON.parse(JSON.stringify(srcEl));
      clone.id = uid();
      clone.frameId = targetFrameId;
      
      // If syncLock is false, clear locked state
      if (!settings.syncLock) {
        clone.locked = false;
      }
      // If syncVisibility is false, clear hidden state
      if (!settings.syncVisibility) {
        clone.hidden = false;
      }
      // If syncPersistent is false, clear role
      if (!settings.syncPersistent) {
        delete clone.role;
      }
      // If breakLink is true, clear linkGroupId
      if (settings.breakLink) {
        delete clone.linkGroupId;
      }
      return clone;
    });

    const bottomEls = newElements.filter(el => el.persistent === 'bottom');
    const midEls = newElements.filter(el => el.persistent === false);
    const topEls = newElements.filter(el => el.persistent === 'top');

    newElements = [
      ...bottomEls,
      ...midEls,
      ...clones,
      ...topEls
    ];
  });

  canvas.elements = newElements;
  pushHistory();
  render();
}
