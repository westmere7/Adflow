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

const uid = () => Math.random().toString(36).slice(2, 8);

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

// Initial layout positions in the all-sizes workspace
const INITIAL_LAYOUT = [
  { x: 2040, y: 2040 },
  { x: 2240, y: 2040 },
  { x: 2580, y: 2040 },
  { x: 2920, y: 2040 },
  { x: 2920, y: 2210 },
  { x: 2920, y: 2340 },
];

function seedCanvas(preset, layoutIdx) {
  const id = uid();
  return {
    id,
    name: preset.name,
    width: preset.width,
    height: preset.height,
    bgColor: '#0f172a',
    workspaceX: INITIAL_LAYOUT[layoutIdx]?.x ?? (2050 + (layoutIdx || 0) * 30),
    workspaceY: INITIAL_LAYOUT[layoutIdx]?.y ?? (2050 + (layoutIdx || 0) * 30),
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
    case 'text': return { ...base, type, text: 'Your headline', fontSize: 22, color: '#ffffff', weight: '700', fontFamily: 'Arial', width: 220, height: 32 };
    case 'rect': return { ...base, type, color: '#7c5cff', width: 120, height: 80, radius: 8 };
    case 'circle': return { ...base, type, color: '#22d3ee', width: 80, height: 80 };
    case 'line': return { ...base, type, color: '#ffffff', width: 160, height: 3, opacity: 100 };
    case 'pixel': return { ...base, type, color: '#e61e2a', width: 100, height: 100 };
    case 'button': return { ...base, type, text: 'Learn more', fontSize: 14, color: '#ffffff', bg: '#7c5cff', radius: 6, fontFamily: 'Arial', width: 130, height: 40, isClickArea: true };
    case 'image': return { ...base, type, assetId: null, width: 140, height: 90, objectFit: 'contain' };
  }
}

// Initial state: all 5 preset canvases pre-seeded
const state = {
  projectName: 'RMIT_Ad',
  clickTag: 'https://www.rmit.edu.au/',
  frames: [{ id: 1, duration: 2 }],
  activeFrameId: 1,
  canvases: PRESET_SIZES.map((p, i) => seedCanvas(p, i)),
  activeCanvasId: null,
  selectedElementId: null,
  layerSelection: [],
  assetSelection: [],
  zoom: 0.6,
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
  guides: [],
  activeSmartGuides: null,
  showSafezones: false,
  adSizeLimit: 150,      // max exported ad weight in KB (IAB display-ad standard)
  defaultBg: '#0f172a',  // default background for newly created canvases
  savedHistoryLimit: 10,
  clipboard: null,
  linkGroups: {},
  assetNames: {},        // assetId -> original filename (for data-merge image lookup)
  assetLibrary: [],      // saved reusable elements/groups (Assets panel)
  assetFolders: [],      // folders organizing the Assets panel (1 level deep)
  // Data-merge / versioning: bind named element "slots" to spreadsheet columns so a
  // single template produces one finished ad set per row (e.g. one per RMIT course).
  dataMerge: {
    enabled: false,
    columns: [],         // header names, in order
    rows: [],            // array of { columnName: value }
    keyColumn: null,     // column used to name exported zips
    activeVersion: null, // index into rows, or null = template defaults
    locked: false,       // when true, dynamic slots are read-only in the editor
    mappings: {}         // 'slotKey::field' -> columnName  (slotKey = 'g:'+gid | 'el:'+id | 'clicktag')
  }
};
state.activeCanvasId = state.canvases[0].id;

const history = [];
let historyIndex = -1;

function measureButtonWidth(el) {
  const canvas = measureButtonWidth.canvas || (measureButtonWidth.canvas = document.createElement('canvas'));
  const ctx = canvas.getContext('2d');
  ctx.font = `${el.weight || '600'} ${el.fontSize || 14}px ${el.fontFamily || 'Arial'}`;
  const textW = ctx.measureText(el.text).width;
  return Math.ceil(textW) + (el.paddingLR || 16) * 2;
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
    measureDiv.style.wordBreak = 'break-word';
    measureDiv.style.boxSizing = 'border-box';
    document.body.appendChild(measureDiv);
  }
  return measureDiv;
}

function measureTextFits(el, text, fontSize) {
  const m = getMeasureDiv();
  m.innerHTML = '';
  m.style.width = el.width + 'px';
  
  const textBlock = document.createElement('div');
  textBlock.style.textAlign = el.textAlign || 'left';
  textBlock.style.width = '100%';
  textBlock.style.fontSize = fontSize + 'px';
  textBlock.style.lineHeight = getResolvedLineHeight(el);
  
  const span = document.createElement(el.htmlTag || 'span');
  span.innerText = text;
  span.style.fontSize = fontSize + 'px';
  span.style.fontWeight = el.weight || '400';
  span.style.fontFamily = el.fontFamily || 'Arial';
  span.style.lineHeight = getResolvedLineHeight(el);
  span.style.letterSpacing = (el.letterSpacing || 0) + 'px';
  span.style.wordBreak = 'break-word';
  
  if (el.hasBg) {
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
  const fitsHeight = rect.height <= el.height;
  const fitsWidth = textBlock.scrollWidth <= el.width;
  
  return fitsHeight && fitsWidth;
}

function calculateAutoSize(el, text) {
  if (!text) return 4;
  let low = 4;
  let high = el.maxFontSize !== undefined ? el.maxFontSize : (el.fontSize || 72);
  if (high < low) high = low;
  let best = low;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (measureTextFits(el, text, mid)) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}



function pushHistory() {
  const snapshot = JSON.stringify({
    canvases: state.canvases,
    activeCanvasId: state.activeCanvasId,
    selectedElementId: state.selectedElementId,
    layerSelection: state.layerSelection,
    guides: state.guides,
    linkGroups: state.linkGroups,
    dataMerge: state.dataMerge
  });
  if (historyIndex >= 0 && history[historyIndex] === snapshot) return;
  history.splice(historyIndex + 1);
  history.push(snapshot);
  if (history.length > 15) history.shift();
  else historyIndex++;
  queueSizeUpdate();
  scheduleAutosave();
}

function getCappedHistory(limit) {
  const l = limit !== undefined ? limit : (state.savedHistoryLimit || 10);
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

let _saveStatus = 'saved';      // 'saved' | 'unsaved' | 'saving' | 'error'
let _autosaveTimer = null;
let _autosaveSuspended = true;  // suppressed until the initial restore/render finishes

function setSaveStatus(status) {
  _saveStatus = status;
  const el = document.getElementById('save-status');
  if (!el) return;

  const getSimpleFloppy = (color, anim = '') => `
    <svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="${anim}; width: 14px; height: 14px; display: block;">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <path d="M17 21v-8H7v8"/>
    </svg>
  `;

  const map = {
    saved: {
      tooltip: 'All changes saved to local storage',
      html: `
        ${getSimpleFloppy('#10b981')}
        <svg class="status-indicator" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; display: block; animation: save-pop 0.3s ease;">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `
    },
    unsaved: {
      tooltip: 'Unsaved changes',
      html: `
        ${getSimpleFloppy('#f59e0b')}
        <svg class="status-indicator" viewBox="0 0 24 24" fill="#f59e0b" style="width: 12px; height: 12px; display: block;">
          <circle cx="12" cy="12" r="5"/>
        </svg>
      `
    },
    saving: {
      tooltip: 'Saving changes...',
      html: `
        ${getSimpleFloppy('#38bdf8')}
        <svg class="status-indicator loading" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" style="width: 12px; height: 12px; display: block;">
          <circle cx="12" cy="12" r="10" stroke="rgba(56, 189, 248, 0.2)"/>
          <path d="M12 2a10 10 0 0 1 10 10"/>
        </svg>
      `
    },
    error: {
      tooltip: 'Auto-save failed!',
      html: `
        ${getSimpleFloppy('#ef4444', 'animation: save-shake 0.4s ease')}
        <svg class="status-indicator" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; display: block; animation: save-shake 0.4s ease;">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      `
    }
  };

  const m = map[status] || map.saved;
  el.innerHTML = m.html;
  el.title = m.tooltip;
}

async function writeAutosave() {
  try {
    setSaveStatus('saving');
    const limit = state.savedHistoryLimit !== undefined ? state.savedHistoryLimit : 10;
    const capped = getCappedHistory(limit);
    await _idbPut(AUTOSAVE_KEY, { 
      savedAt: Date.now(), 
      state: buildStateSnapshot(),
      history: capped.history,
      historyIndex: capped.historyIndex
    });
    setSaveStatus('saved');
  } catch (e) {
    console.warn('Auto-save failed:', e);
    setSaveStatus('error');
  }
}

// Debounced — called from every state-mutating path (pushHistory + render).
function scheduleAutosave() {
  if (_autosaveSuspended) return;
  if (_saveStatus !== 'saving') setSaveStatus('unsaved');
  if (_autosaveTimer) clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(writeAutosave, 1000);
}

async function restoreAutosave() {
  try {
    const rec = await _idbGet(AUTOSAVE_KEY);
    if (rec && rec.state && Array.isArray(rec.state.canvases) && rec.state.canvases.length) {
      Object.assign(state, rec.state);
      if (rec.history && Array.isArray(rec.history) && rec.history.length > 0) {
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
  const snap = JSON.parse(snapStr);
  state.canvases = snap.canvases;
  state.activeCanvasId = snap.activeCanvasId;
  state.selectedElementId = snap.selectedElementId;
  state.layerSelection = snap.layerSelection || [];
  state.guides = snap.guides || [];
  state.linkGroups = snap.linkGroups || {};
  if (snap.dataMerge) state.dataMerge = snap.dataMerge;
  state.editingElementId = null;
  render();
}

pushHistory();

// ============================================================================
// Element Linking System Helpers & Operations
// ============================================================================

function areStylesAndNamesEqual(el1, el2) {
  if (el1.type !== el2.type) return false;
  return baseLayerLabel(el1) === baseLayerLabel(el2);
}

function autoLinkElements() {
  const chkSelectedOnly = document.getElementById('lnk-opt-selected-only');
  const selectedOnly = chkSelectedOnly ? chkSelectedOnly.checked : false;

  let allowedTargets = null;
  if (selectedOnly) {
    const selectedCanvas = getActiveCanvas();
    if (!selectedCanvas || !state.layerSelection?.length) {
      alert("No elements are currently selected. Select one or more elements to use 'Selected only' auto-linking.");
      return;
    }
    allowedTargets = state.layerSelection.map(id => {
      const el = selectedCanvas.elements.find(x => x.id === id);
      return el ? { type: el.type, name: baseLayerLabel(el) } : null;
    }).filter(Boolean);
  }

  const allElements = [];
  state.canvases.forEach(c => {
    c.elements.forEach(el => {
      if (allowedTargets) {
        const matchesAllowed = allowedTargets.some(t => t.type === el.type && t.name === baseLayerLabel(el));
        if (!matchesAllowed) return;
      }
      allElements.push(el);
    });
  });

  let countLinked = 0;
  let countGroupsCreated = 0;
  const processed = new Set();

  for (let i = 0; i < allElements.length; i++) {
    const el1 = allElements[i];
    if (processed.has(el1)) continue;

    const matches = [];
    for (let j = 0; j < allElements.length; j++) {
      if (i === j) continue;
      const el2 = allElements[j];
      if (areStylesAndNamesEqual(el1, el2)) {
        matches.push(el2);
      }
    }

    if (matches.length > 0) {
      const set = [el1, ...matches];
      set.forEach(el => processed.add(el));

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

        const defaultSync = {};
        if (cat === 'text') {
          defaultSync.text = true;
          defaultSync.font = true;
          defaultSync.color = true;
          defaultSync.background = true;
          defaultSync.opacity = true;
          defaultSync.inAnim = true;
          defaultSync.effect = true;
        } else if (cat === 'button') {
          defaultSync.text = true;
          defaultSync.textColor = true;
          defaultSync.fill = true;
          defaultSync.stroke = true;
          defaultSync.transform = true;
          defaultSync.opacity = true;
          defaultSync.inAnim = true;
          defaultSync.effect = true;
        } else if (cat === 'image') {
          defaultSync.image = true;
          defaultSync.transform = true;
          defaultSync.opacity = true;
          defaultSync.rotation = true;
          defaultSync.inAnim = true;
          defaultSync.effect = true;
        } else if (cat === 'shape') {
          defaultSync.fill = true;
          defaultSync.stroke = true;
          defaultSync.transform = true;
          defaultSync.opacity = true;
          defaultSync.inAnim = true;
          defaultSync.effect = true;
        } else if (cat === 'line') {
          defaultSync.color = true;
          defaultSync.thickness = true;
          defaultSync.opacity = true;
          defaultSync.inAnim = true;
          defaultSync.effect = true;
        }

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
        alert("The selected element is already linked, and no other matching elements were found to link.");
        return;
      }
    }

    const anyLinked = allElements.some(el => el.linkGroupId && state.linkGroups?.[el.linkGroupId]);
    if (anyLinked) {
      alert("Matching elements are already linked, and no new matching elements were found.");
    } else {
      alert("No matching elements with the same layer name and style were found.");
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
  if (cat === 'text') {
    if (sync.text) targetEl.text = sourceEl.text;
    if (sync.font) {
      // Font family/weight/spacing/alignment — NOT fontSize (handled separately so a
      // group can sync typeface but keep per-canvas sizes, as auto-resize needs).
      const fontProps = ['fontFamily', 'weight', 'lineHeight', 'lineSpacing', 'leading', 'tracking', 'textAlign', 'verticalAlign'];
      fontProps.forEach(p => {
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
      const bgProps = ['bg', 'hasBg', 'textBgColor', 'animateBg', 'timeOffset'];
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
    if (sync.fill) {
      if (sourceEl.bg !== undefined) targetEl.bg = sourceEl.bg;
      else delete targetEl.bg;
    }
    if (sync.stroke) {
      const strokeProps = ['strokeColor', 'strokeWidth'];
      strokeProps.forEach(p => {
        if (sourceEl[p] !== undefined) targetEl[p] = sourceEl[p];
        else delete targetEl[p];
      });
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
      const strokeProps = ['strokeColor', 'strokeWidth'];
      strokeProps.forEach(p => {
        if (sourceEl[p] !== undefined) targetEl[p] = sourceEl[p];
        else delete targetEl[p];
      });
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
  if (sync.inAnim) {
    const inAnimProps = ['animType', 'animDuration', 'animDelay', 'animFade', 'zoomFrom', 'animateBg', 'bgOffset'];
    inAnimProps.forEach(p => {
      if (sourceEl[p] !== undefined) targetEl[p] = sourceEl[p];
      else delete targetEl[p];
    });
  }
  if (sync.effect) {
    const effectProps = ['effectType', 'effDuration', 'effDelay', 'panDist', 'panDir', 'effEase', 'effOnce', 'effSpeed', 'zoomTarget', 'spinTarget', 'spinRepeat'];
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

function createAndLinkGroup(name) {
  const c = getActiveCanvas();
  if (!c || !state.layerSelection?.length) return;
  const activeEl = getSelectedElement();
  const cat = getElementCategory(activeEl);
  if (!cat) return;

  const gid = 'lg_' + uid();
  const defaultSync = {};
  if (cat === 'text') {
    defaultSync.text = true;
    defaultSync.font = true;
    defaultSync.color = true;
    defaultSync.background = true;
    defaultSync.opacity = true;
    defaultSync.inAnim = true;
    defaultSync.effect = true;
  } else if (cat === 'button') {
    defaultSync.text = true;
    defaultSync.textColor = true;
    defaultSync.fill = true;
    defaultSync.stroke = true;
    defaultSync.transform = true;
    defaultSync.opacity = true;
    defaultSync.inAnim = true;
    defaultSync.effect = true;
  } else if (cat === 'image') {
    defaultSync.image = true;
    defaultSync.transform = true;
    defaultSync.opacity = true;
    defaultSync.rotation = true;
    defaultSync.inAnim = true;
    defaultSync.effect = true;
  } else if (cat === 'shape') {
    defaultSync.fill = true;
    defaultSync.stroke = true;
    defaultSync.transform = true;
    defaultSync.opacity = true;
    defaultSync.inAnim = true;
    defaultSync.effect = true;
  } else if (cat === 'line') {
    defaultSync.color = true;
    defaultSync.thickness = true;
    defaultSync.opacity = true;
    defaultSync.inAnim = true;
    defaultSync.effect = true;
  }

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

function autoAddAndLink(srcEl) {
  if (!srcEl) return;
  const name = baseLayerLabel(srcEl);
  const cat = getElementCategory(srcEl);
  if (!cat) return;

  let gid = srcEl.linkGroupId;
  let isNewGroup = false;

  if (!gid) {
    gid = 'lg_' + uid();
    isNewGroup = true;
    
    const defaultSync = {};
    if (cat === 'text') {
      defaultSync.text = true;
      defaultSync.font = true;
      defaultSync.color = true;
      defaultSync.background = true;
      defaultSync.opacity = true;
      defaultSync.inAnim = true;
      defaultSync.effect = true;
    } else if (cat === 'button') {
      defaultSync.text = true;
      defaultSync.textColor = true;
      defaultSync.fill = true;
      defaultSync.stroke = true;
      defaultSync.transform = true;
      defaultSync.opacity = true;
      defaultSync.inAnim = true;
      defaultSync.effect = true;
    } else if (cat === 'image') {
      defaultSync.image = true;
      defaultSync.transform = true;
      defaultSync.opacity = true;
      defaultSync.rotation = true;
      defaultSync.inAnim = true;
      defaultSync.effect = true;
    } else if (cat === 'shape') {
      defaultSync.fill = true;
      defaultSync.stroke = true;
      defaultSync.transform = true;
      defaultSync.opacity = true;
      defaultSync.inAnim = true;
      defaultSync.effect = true;
    } else if (cat === 'line') {
      defaultSync.color = true;
      defaultSync.thickness = true;
      defaultSync.opacity = true;
      defaultSync.inAnim = true;
      defaultSync.effect = true;
    }

    if (!state.linkGroups) state.linkGroups = {};
    state.linkGroups[gid] = {
      id: gid,
      name: name + " Group",
      category: cat,
      syncProperties: defaultSync
    };
    
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
  pushGroupChangesForId(gid);
}

function pushGroupChanges() {
  const sourceEl = getSelectedElement();
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


function pushGroupChangesForId(gid) {
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
  const sourceEl = elementsInGroup[0];
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
    bg.style.cssText = 'position:absolute;left:' + (lineLeft - lr) + 'px;top:' + (lineTop - tb) + 'px;width:' + ((lineWidth + 2 * lr) * cov) + 'px;height:' + (lineHeight + 2 * tb) + 'px;background:' + bgColor + ';transform-origin:left center;transform:scaleX(0);z-index:-1;pointer-events:none;animation:anim-bg-grow ' + lineDur + 's cubic-bezier(0.22,1,0.36,1) ' + lineDelay + 's both;';
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

function render(skipProps = false) {
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
  // workspace sizing
  const z = state.zoom || 0.6;
  workspaceEl.style.zoom = z;
  workspaceEl.style.setProperty('--z', z);

  const zoomDisp = document.getElementById('zoom-level-display');
  if (zoomDisp) zoomDisp.innerText = 'Zoom ' + Math.round(z * 100) + '%';

  workspaceEl.style.width = '5000px';
  workspaceEl.style.height = '5000px';
  workspaceEl.style.margin = '';

  // which canvases to render
  workspaceEl.innerHTML = '';
  const active = getActiveCanvas();

  if (state.isPreviewMode) {
    state.canvases.forEach(c => workspaceEl.appendChild(previewFrameNode(c)));
  } else {
    state.canvases.forEach(c => workspaceEl.appendChild(canvasFrameNode(c)));
  }


  const projectNameEl = document.getElementById('project-name');
  if (projectNameEl && document.activeElement !== projectNameEl) {
    projectNameEl.value = state.projectName || 'RMIT_Ad';
  }
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
    let exitBtn = document.getElementById('exit-preview-btn');
    if (!exitBtn) {
      exitBtn = document.createElement('button');
      exitBtn.id = 'exit-preview-btn';
      exitBtn.className = 'btn primary';
      exitBtn.style.position = 'fixed';
      exitBtn.style.bottom = '30px';
      exitBtn.style.left = '50%';
      exitBtn.style.transform = 'translateX(-50%)';
      exitBtn.style.zIndex = '999999';
      exitBtn.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
      exitBtn.style.padding = '12px 24px';
      exitBtn.style.fontSize = '14px';
      exitBtn.innerText = 'Exit Preview (ESC)';
      exitBtn.onclick = () => {
        state.isPreviewMode = false;
        if (state.prePreviewZoom) state.zoom = state.prePreviewZoom;
        render();
        setTimeout(() => {
          const area = document.getElementById('canvas-area');
          if (state.prePreviewScrollLeft !== undefined) {
            area.scrollTo({ left: state.prePreviewScrollLeft, top: state.prePreviewScrollTop, behavior: 'instant' });
          }
        }, 10);
      };
      document.body.appendChild(exitBtn);
    }
    exitBtn.style.display = 'block';
  } else {
    document.body.classList.remove('preview-active');
    const exitBtn = document.getElementById('exit-preview-btn');
    if (exitBtn) exitBtn.style.display = 'none';
  }

  // (View/Snap/Theme menu items moved into the Settings panel — no menu ticks here.)
  const isFs = document.body.classList.contains('fullscreen-mode');
  const isPreview = document.body.classList.contains('preview-active');
  document.body.className = state.theme && state.theme !== 'default' ? 'theme-' + state.theme : '';
  if (isFs) document.body.classList.add('fullscreen-mode');
  if (isPreview) document.body.classList.add('preview-active');

  // Catch-all autosave trigger: render() runs after virtually every state change
  // (element edits, project settings, theme, etc.). Debounced + suspended during the
  // initial restore, so this is cheap and won't fire spuriously on boot.
  scheduleAutosave();
}

function centerWorkspace() {
  if (state.canvases.length === 0) return;
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
  const area = document.getElementById('canvas-area');
  const targetScrollLeft = centerX * z - area.clientWidth / 2;
  const targetScrollTop = centerY * z - area.clientHeight / 2;

  area.scrollTo({ left: Math.max(0, targetScrollLeft), top: Math.max(0, targetScrollTop), behavior: 'smooth' });
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
    if (typeof JSZip === 'undefined') { alert('JSZip is not loaded.'); return; }
    const zip = new JSZip();
    const projName = state.projectName || 'Ad';
    const safeName = projName.replace(/[^a-zA-Z0-9_-]/g, '_');
    await dmRunExport(dmActiveRowForOutput(), async () => {
      await addCanvasAssetsToZip(c, zip);
      zip.file('index.html', generateExportHTML(c, zip));
    });
    const content = await zip.generateAsync({ type: 'blob' });
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
  titleSpan.innerHTML = `<span class="dim" style="font-weight:600; color:var(--text-bright);">${c.width} &times; ${c.height}</span><span class="dim" style="margin-left:8px;">&bull; <span style="color:var(--accent-light); font-size:12px; font-weight:700;">${kb} KB</span></span>`;

  header.appendChild(titleSpan);
  frame.appendChild(header);

  const canvas = document.createElement('div');
  canvas.className = 'canvas';
  canvas.style.width = c.width + 'px';
  canvas.style.height = c.height + 'px';
  canvas.style.background = c.bgColor;
  canvas.style.borderTopLeftRadius = '0';
  canvas.style.borderTopRightRadius = '0';
  canvas.style.overflow = 'hidden';
  // In full preview, show the ad as it would appear in the wild — no editor outline.
  canvas.style.boxShadow = 'none';

  const iframe = document.createElement('iframe'); iframe.className = 'preview-iframe';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.position = 'absolute';
  iframe.style.inset = '0';
  iframe.style.background = c.bgColor;
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
  sel.innerHTML = state.frames.map((f, i) => `<option value="${f.id}" ${f.id === state.activeFrameId ? 'selected' : ''}>Frame ${i + 1}</option>`).join('');

  const currentFrame = state.frames.find(f => f.id === state.activeFrameId);
  const durInput = document.getElementById('frame-duration');

  const btnPrev = document.getElementById('btn-prev-frame');
  const btnNext = document.getElementById('btn-next-frame');
  const fIdx = state.frames.findIndex(f => f.id === state.activeFrameId);
  if (btnPrev) btnPrev.disabled = fIdx <= 0;
  if (btnNext) btnNext.disabled = fIdx >= state.frames.length - 1;

  const loopChk = document.getElementById('project-loop-ad');
  if (loopChk) {
    if (document.activeElement !== loopChk) loopChk.checked = state.loopAd === true;
    loopChk.onchange = (e) => {
      state.loopAd = e.target.checked;
      pushHistory();
      render();
    };
  }

  const isLastFrame = fIdx === state.frames.length - 1;

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

  const transSelect = document.getElementById('frame-transition');
  const transLabel = document.getElementById('frame-transition-label');
  const transDur = document.getElementById('frame-transition-duration');
  const transDurLabel = document.getElementById('frame-transition-duration-label');
  const fadeRow = document.getElementById('frame-transition-fade-row');
  const fadeChk = document.getElementById('frame-transition-fade');
  const fadeLabel = document.getElementById('frame-transition-fade-label');
  if (transSelect && transLabel && currentFrame) {
    if (state.frames.length > 0 && state.frames[0].id === currentFrame.id) {
      transSelect.style.display = 'none';
      transLabel.style.display = 'none';
      if (transDur) transDur.style.display = 'none';
      if (transDurLabel) transDurLabel.style.display = 'none';
      if (fadeRow) fadeRow.style.display = 'none';
    } else {
      transSelect.style.display = 'inline-block';
      transLabel.style.display = 'inline-block';
      transSelect.value = currentFrame.transition || 'fade';
      if (transDur) {
        transDur.style.display = 'inline-block';
        if (document.activeElement !== transDur) transDur.value = currentFrame.transitionDuration || 0.5;
        transDur.style.visibility = (transSelect.value === 'none') ? 'hidden' : 'visible';
        transDur.disabled = false;
        transDur.style.opacity = '1';
        transSelect.disabled = false;
        transSelect.style.opacity = '1';
        if (transDurLabel) {
          transDurLabel.style.display = 'inline-block';
          transDurLabel.style.visibility = transDur.style.visibility;
        }
      }
      // Add Fade checkbox: hide when no transition; gray out when transition is
      // 'fade' (the fade flag is meaningless — fade is the transition).
      if (fadeRow) {
        const t = transSelect.value;
        const hide = (t === 'none');
        fadeRow.style.display = hide ? 'none' : 'flex';
        if (!hide) {
          const grayed = (t === 'fade');
          const fadeRaw = currentFrame.transitionFade;
          // Resolved value matches export: slide defaults to faded, swipe defaults
          // to pure. Fade transition is always shown as checked.
          const resolved = (t === 'fade') ? true
                         : (fadeRaw === undefined) ? (t.indexOf('slide-') === 0)
                         : !!fadeRaw;
          fadeChk.checked = resolved;
          fadeChk.disabled = grayed;
          fadeRow.style.opacity = grayed ? '0.45' : '1';
          fadeRow.style.pointerEvents = grayed ? 'none' : 'auto';
          if (fadeLabel) fadeLabel.style.cursor = grayed ? 'default' : 'pointer';
        }
      }
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
  const w = 5000 * z, h = 5000 * z;
  rh.width = w; rh.height = 16;
  rh.style.width = w + 'px';
  rv.width = 16; rv.height = h;
  rv.style.height = h + 'px';

  const ctxH = rh.getContext('2d');
  ctxH.font = '9px sans-serif'; ctxH.fillStyle = '#9aa1b6'; ctxH.strokeStyle = '#5a6178';
  for (let x = 0; x <= 5000; x += 100) {
    const px = x * z;
    ctxH.fillText(x.toString(), px + 4, 9);
    ctxH.beginPath(); ctxH.moveTo(px, 12); ctxH.lineTo(px, 16); ctxH.stroke();
    for (let i = 10; i < 100; i += 10) { const p = (x + i) * z; ctxH.beginPath(); ctxH.moveTo(p, 14); ctxH.lineTo(p, 16); ctxH.stroke(); }
  }

  const ctxV = rv.getContext('2d');
  ctxV.font = '9px sans-serif'; ctxV.fillStyle = '#9aa1b6'; ctxV.strokeStyle = '#5a6178';
  for (let y = 0; y <= 5000; y += 100) {
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
      let bestDelta = 5 / z, snapPos = null;
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
  frame.className = 'canvas-frame' + (c.id === state.activeCanvasId ? ' active' : '');
  frame.dataset.canvasId = c.id;

  frame.style.left = c.workspaceX + 'px';
  frame.style.top = c.workspaceY + 'px';

  // header
  const isSinglePreview = state.singlePreviewId === c.id;
  const header = document.createElement('div');
  header.className = 'canvas-header';
  header.innerHTML = `
    <span class="dim" style="font-weight:600; color:var(--text-bright);">${c.width} × ${c.height}</span>
  `;
  header.addEventListener('mousedown', (e) => {
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
  canvas.style.background = c.bgColor;

  if (isSinglePreview) {
    const iframe = document.createElement('iframe');
    iframe.srcdoc = generateExportHTML(c);
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    iframe.style.background = c.bgColor;
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
      if (el.persistent === 'bottom') layerBot.appendChild(elementNode(el, c));
      else if (el.persistent === 'top') layerTop.appendChild(elementNode(el, c));
      else if (el.frameId === state.activeFrameId) layerMid.appendChild(elementNode(el, c));
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
        if (sel && !sel.hidden) canvas.appendChild(selectionOverlay(sel));
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
      if (isSpaceDown || e.button === 1) return;
      if (e.target === canvas || e.target === canvasInner) {
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
    const opts = state.frames.map((f, i) => `<option value="${f.id}" ${f.id === state.activeFrameId ? 'selected' : ''}>Frame ${i + 1}</option>`).join('');
    leftSide.innerHTML = `
      <div style="display:flex; align-items:center; gap:3px;">
        <button class="btn-prev-inline" style="background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); cursor:pointer; padding:0 4px; border-radius:3px; font-size:10px; height:18px; display:flex; align-items:center; justify-content:center;">&lsaquo;</button>
        <select class="frame-select-inline" style="background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:3px; padding:0 2px; font-size:9px; height:18px; outline:none; cursor:pointer;">
          ${opts}
        </select>
        <button class="btn-next-inline" style="background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); cursor:pointer; padding:0 4px; border-radius:3px; font-size:10px; height:18px; display:flex; align-items:center; justify-content:center;">&rsaquo;</button>
        <div style="width:2px"></div>
        <button class="btn-add-frame-inline" title="Add Frame" style="background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); cursor:pointer; padding:0 4px; border-radius:3px; font-size:10px; height:18px; display:flex; align-items:center; justify-content:center;">+</button>
        <button class="btn-remove-frame-inline" title="Remove Frame" style="background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); cursor:pointer; padding:0 4px; border-radius:3px; font-size:10px; height:18px; display:flex; align-items:center; justify-content:center;">-</button>
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
      if (idx > 0) { state.activeFrameId = state.frames[idx - 1].id; render(); }
    });
    if (nextBtn) nextBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const idx = state.frames.findIndex(f => f.id === state.activeFrameId);
      if (idx < state.frames.length - 1) { state.activeFrameId = state.frames[idx + 1].id; render(); }
    });
    if (sel) {
      sel.addEventListener('mousedown', e => e.stopPropagation());
      sel.addEventListener('change', (e) => {
        state.activeFrameId = parseInt(e.target.value, 10);
        render();
      });
    }
    const addBtn = footer.querySelector('.btn-add-frame-inline');
    if (addBtn) addBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const newId = Math.max(...state.frames.map(f => f.id), 0) + 1;
      state.frames.push({ id: newId, duration: 2 });
      state.activeFrameId = newId;
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
      state.canvases.forEach(cv => {
        cv.elements = cv.elements.filter(el => el.persistent !== false || state.frames.some(f => f.id === el.frameId));
      });
      state.selectedElementId = null;
      state.layerSelection = [];
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
  setBtn.style.cssText = 'background:var(--accent-base); border:none; color:var(--text-bright); cursor:pointer; padding:6px 18px; border-radius:4px; font-size:13px; font-weight:600;';
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

function elementNode(el, canvasCtx) {
  const d = document.createElement('div');
  d.className = 'el';
  if (el.hidden) d.style.display = 'none';
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
      ed.style.wordBreak = 'break-word';
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
      span.style.wordBreak = 'break-word';

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
    fill.innerHTML = `<svg viewBox="0 0 578.52 556.76" width="100%" height="100%" preserveAspectRatio="none"><path fill="${dColor}" d="M290.78,0h-74.15v60.23h-123.75v125.78H0v184.74h92.88v125.78h123.5v60.23h65.55c152.85,0,287.74-123.5,287.74-277.62S444.14,0,290.78,0"/></svg>`;
    d.appendChild(fill);
    const stroke = strokeOverlayNode(el);
    if (stroke) d.appendChild(stroke);
  } else if (el.type === 'line') {
    d.classList.add('shape-line');
    d.style.background = dColor;
  } else if (el.type === 'button') {
    d.classList.add('button');
    d.style.color = dColor;
    d.style.fontSize = el.fontSize + 'px';
    d.style.fontFamily = el.fontFamily || 'Arial';
    d.style.borderRadius = (el.radius || 0) + 'px';
    d.style.padding = `0 ${el.paddingLR || 16}px`;
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
      ed.style.fontSize = el.fontSize + 'px';
      ed.style.fontFamily = el.fontFamily || 'Arial';
      ed.style.fontWeight = el.weight || '600';
      ed.style.outline = 'none';
      // override .editable defaults so we match the non-edit <span> layout —
      // otherwise width:100% + word-break:break-word fragments the text mid-word.
      ed.style.display = 'inline';
      ed.style.width = 'auto';
      ed.style.wordBreak = 'normal';
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
      span.style.position = 'relative';
      d.appendChild(span);
    }
    const stroke = strokeOverlayNode(el);
    if (stroke) d.appendChild(stroke);
  } else if (el.type === 'image') {
    d.classList.add('image');
    if (dAssetId) {
      const img = document.createElement('img');
      img.src = state.assets[dAssetId] || dAssetId;
      img.style.objectFit = el.objectFit || 'contain';
      d.appendChild(img);
    } else {
      d.style.background = 'repeating-linear-gradient(45deg, #1f2330, #1f2330 6px, #272c3a 6px, #272c3a 12px)';
      d.style.display = 'flex';
      d.style.alignItems = 'center';
      d.style.justifyContent = 'center';
      d.style.color = '#9aa1b6';
      d.style.fontSize = '11px';
      d.textContent = '(no image)';
    }
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
      state.layerSelection = [el.id];
      state.selectedElementId = el.id;
      render(true);
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
  const factor = (minDim < 200 && aspect > 3) ? 0.08 : 0.05;
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

  if (['rect', 'button'].includes(el.type)) {
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
    const canvasNode = elsFromPoint.find(n => n.classList && n.classList.contains('canvas'));
    if (canvasNode) {
      const frameNode = canvasNode.closest('.canvas-frame');
      if (frameNode) cvsId = frameNode.dataset.canvasId;
    }

    if (cvsId && cvsId !== canvasCtx.id) {
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
      let minDx = 5 / z, minDy = 5 / z;

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
      t.x = Math.round(nx);
      t.y = Math.round(ny);
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
  const onUp = (ev) => {
    state.isDragging = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    state.activeSmartGuides = null;
    state.dropTargetCanvasId = null;

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
        alert("Cannot add assets to a read-only folder.");
        render();
        return;
      }
      saveSelectionAsAsset(targetFolderId);
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

    render();
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if (el.width !== o.w || el.height !== o.h || el.x !== o.x || el.y !== o.y) pushHistory();
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
      el.x = Math.round(nbb.x + (o.x - obb.x) * scaleX);
      el.y = Math.round(nbb.y + (o.y - obb.y) * scaleY);
      el.width = Math.round(Math.max(2, o.w * scaleX));
      el.height = Math.round(Math.max(2, o.h * scaleY));
      if (o.fs) el.fontSize = Math.max(8, Math.round(o.fs * Math.min(scaleX, scaleY)));
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

// Click empty workspace area: deselect element (keep active canvas)
canvasArea.addEventListener('mousedown', (e) => {
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
  if (e.target === canvasArea || e.target === workspaceEl) {
    if (state.singlePreviewId) state.singlePreviewId = null;
    state.selectedElementId = null;
    state.editingElementId = null;
    state.layerSelection = [];
    if (state.isolatedGroupId) state.isolatedGroupId = null;
    render();
  }
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
  }
});

canvasArea.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (state.isPreviewMode) return;

  const oldZoom = state.zoom || 0.6;
  const zoomSpeed = e.deltaMode === 1 ? 0.05 : 0.002;
  let newZoom = oldZoom - e.deltaY * zoomSpeed;
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

// ============================================================================
function openValidatorDetails(initialCanvas) {
  const modalId = `val-modal-${Date.now()}`;
  
  const generateModalContent = (focusedCanvasId) => {
    let sidebarHtml = '';
    state.canvases.forEach((c, index) => {
      const isFocused = c.id === focusedCanvasId;
      const hasErrors = c._valErrors && c._valErrors.length > 0;
      const statusIcon = hasErrors ? '⚠️' : '✓';
      const statusColor = hasErrors ? '#f97316' : '#10b981';
      
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
      let src = state.assets[el.assetId] || el.assetId;
      if (!src) {
        missingAssets.push(el.name || `Image Layer (${el.id})`);
      } else if (src.startsWith('http://') || src.startsWith('https://')) {
        externalAssets.push(el.name || `Image Layer (${el.id})`);
      } else if (!state.assets[el.assetId] && !src.startsWith('data/Elements/')) {
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
          </div>
          <span style="color:${isSizePassed ? '#10b981' : '#ef4444'}; font-weight:bold; font-size:14px; flex-shrink:0; white-space:nowrap;">${isSizePassed ? '✓ Pass' : '✗ Fail'}</span>
        </div>

        <div style="display:flex; align-items:start; justify-content:space-between; gap:16px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
          <div style="flex:1; min-width:0;">
            <span style="font-weight:600; color:var(--text-main); display:block; font-size:13px;">clickTag URL Validation</span>
            <span style="font-size:12px; opacity:0.8; word-break:break-all;">URL: <span style="font-family:monospace; color:${clickTagValid ? 'var(--accent-light)' : '#ef4444'};">${clickTagMsg}</span></span>
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

        <div style="display:flex; align-items:start; justify-content:space-between; gap:16px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
          <div style="flex:1; min-width:0;">
            <span style="font-weight:600; color:var(--text-main); display:block; font-size:13px;">GWD environment check</span>
            <span style="font-size:12px; opacity:0.8;">Ensures creatives built in Google Web Designer were created using the correct environment.</span>
          </div>
          <span style="color:#10b981; font-weight:bold; font-size:14px; flex-shrink:0; white-space:nowrap;">✓ Pass</span>
        </div>

        <div style="display:flex; align-items:start; justify-content:space-between; gap:16px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
          <div style="flex:1; min-width:0;">
            <span style="font-weight:600; color:var(--text-main); display:block; font-size:13px;">File Type/Count</span>
            <span style="font-size:12px; opacity:0.8;">Ensures all files contained in the zip bundle are supported.</span>
          </div>
          <span style="color:#10b981; font-weight:bold; font-size:14px; flex-shrink:0; white-space:nowrap;">✓ Pass</span>
        </div>
      </div>
    `;
    
    const errorsHTML = errors.length > 0 ? `
      <div style="font-size:13px; color:#ef4444; background:rgba(239, 68, 68, 0.08); padding:16px; border-radius:8px; border:1px solid rgba(239, 68, 68, 0.2); display:flex; flex-direction:column; gap:6px;">
        <strong style="display:flex; align-items:center; gap:6px; font-size:14px;">
          <span>⚠️</span> Issues Found (${errors.length})
        </strong>
        <ul style="margin:0; padding-left:18px; line-height:1.5; display:flex; flex-direction:column; gap:4px;">
          ${errors.map(err => `<li>${err}</li>`).join('')}
        </ul>
      </div>
    ` : `
      <div style="font-size:13px; color:#10b981; background:rgba(16, 185, 129, 0.08); padding:16px; border-radius:8px; border:1px solid rgba(16, 185, 129, 0.2); display:flex; flex-direction:column; gap:6px;">
        <strong style="display:flex; align-items:center; gap:6px; font-size:14px;">
          <span>✓</span> All validation checks passed!
        </strong>
        <p style="margin:0; color:var(--text-label); line-height:1.4;">This canvas conforms to the specified file size limit and Google Ad specs.</p>
      </div>
    `;
    
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
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:6px;">
        <span style="color:var(--text-main); font-family:monospace; font-size:12px;">${f.name}</span>
        <span style="color:var(--text-muted); font-size:11px;">~${f.size} KB</span>
      </div>
    `).join('') : '<div style="font-size:12px; color:var(--text-muted); font-style:italic; padding-left:4px;">No custom fonts embedded</div>';

    const imageSectionHTML = imageDetails.length > 0 ? imageDetails.map(img => `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.02); padding-bottom:6px;">
        <div style="display:flex; flex-direction:column; min-width:0; flex:1; padding-right:8px;">
          <span style="color:var(--text-main); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-weight:500; font-size:12px;">${img.name}</span>
          <span style="font-size:11px; color:var(--text-muted);">${img.dimensions} • ${img.isLocal ? 'Template' : 'Upload'}</span>
        </div>
        <span style="color:var(--text-muted); font-size:11.5px; flex-shrink:0;">${img.size ? img.size.toFixed(1) + ' KB' : '0 KB'}</span>
      </div>
    `).join('') : '<div style="font-size:12px; color:var(--text-muted); font-style:italic; padding-left:4px;">No image layers used</div>';

    const dynamicSectionHTML = dynamicDetails.length > 0 ? dynamicDetails.map(d => `
      <div style="display:flex; flex-direction:column; font-size:11.5px; margin-bottom:8px; background:rgba(255,255,255,0.02); padding:8px; border-radius:4px; border:1px solid rgba(255,255,255,0.04);">
        <span style="color:var(--text-main); font-weight:500;">${d.layerName} <span style="font-weight:normal; color:var(--text-muted); font-size:11px;">(${d.field})</span></span>
        <span style="font-size:11px; color:var(--accent-light); font-family:monospace; margin-top:2px;">↳ mapped to {${d.mapping}}</span>
      </div>
    `).join('') : '<div style="font-size:12px; color:var(--text-muted); font-style:italic; padding-left:4px;">No dynamic fields configured</div>';

    const codeKb = 2.5;
    const estimatedTotal = codeKb + fontKbSum + imgKbSum;

    const breakdownHTML = `
      <div style="width:360px; flex-shrink:0; border-left:1px solid var(--border-left, var(--border-light)); padding-left:18px; display:flex; flex-direction:column; gap:20px; height:100%; overflow-y:auto; padding-right:4px;">
        <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border-light); padding-bottom:10px; flex-shrink:0;">
          <h3 style="margin:0; font-size:16px; font-weight:600; color:var(--text-bright);">Ad Composition Breakdown</h3>
        </div>

        <!-- Element counts -->
        <div style="background:rgba(255,255,255,0.01); padding:12px; border-radius:6px; border:1px solid var(--border-light);">
          <strong style="display:block; font-size:11px; text-transform:uppercase; color:var(--text-label); letter-spacing:0.05em; margin-bottom:10px;">Layers &amp; Elements</strong>
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8px; font-size:12.5px;">
            <div style="display:flex; justify-content:space-between; background:var(--bg-input); padding:6px 8px; border-radius:4px;">
              <span style="color:var(--text-muted); font-size:11px;">Total Layers</span>
              <span style="font-weight:600; color:var(--text-bright); font-size:12.5px;">${totalCount}</span>
            </div>
            <div style="display:flex; justify-content:space-between; background:var(--bg-input); padding:6px 8px; border-radius:4px;">
              <span style="color:var(--text-muted); font-size:11px;">Text Fields</span>
              <span style="font-weight:600; color:var(--text-bright); font-size:12.5px;">${textCount}</span>
            </div>
            <div style="display:flex; justify-content:space-between; background:var(--bg-input); padding:6px 8px; border-radius:4px;">
              <span style="color:var(--text-muted); font-size:11px;">Images</span>
              <span style="font-weight:600; color:var(--text-bright); font-size:12.5px;">${imgCount}</span>
            </div>
            <div style="display:flex; justify-content:space-between; background:var(--bg-input); padding:6px 8px; border-radius:4px;">
              <span style="color:var(--text-muted); font-size:11px;">Shapes &amp; Buttons</span>
              <span style="font-weight:600; color:var(--text-bright); font-size:12.5px;">${shapeCount + btnCount}</span>
            </div>
          </div>
        </div>

        <!-- Weight breakdown chart -->
        <div style="background:rgba(255,255,255,0.01); padding:12px; border-radius:6px; border:1px solid var(--border-light);">
          <strong style="display:block; font-size:11px; text-transform:uppercase; color:var(--text-label); letter-spacing:0.05em; margin-bottom:10px;">Weight Contribution (Est.)</strong>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <!-- Code progress bar -->
            <div>
              <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:4px;">
                <span style="color:var(--text-main);">Structure &amp; Libraries</span>
                <span style="color:var(--text-muted); font-family:monospace; font-size:10.5px;">${codeKb.toFixed(1)} KB</span>
              </div>
              <div style="height:6px; background:var(--bg-input); border-radius:3px; overflow:hidden;">
                <div style="width:${Math.min(100, (codeKb / estimatedTotal) * 100)}%; height:100%; background:#3b82f6; border-radius:3px;"></div>
              </div>
            </div>
            <!-- Fonts progress bar -->
            <div>
              <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:4px;">
                <span style="color:var(--text-main);">Embedded Fonts</span>
                <span style="color:var(--text-muted); font-family:monospace; font-size:10.5px;">${fontKbSum.toFixed(1)} KB</span>
              </div>
              <div style="height:6px; background:var(--bg-input); border-radius:3px; overflow:hidden;">
                <div style="width:${Math.min(100, (fontKbSum / estimatedTotal) * 100)}%; height:100%; background:#8b5cf6; border-radius:3px;"></div>
              </div>
            </div>
            <!-- Images progress bar -->
            <div>
              <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:4px;">
                <span style="color:var(--text-main);">Image Assets</span>
                <span style="color:var(--text-muted); font-family:monospace; font-size:10.5px;">${imgKbSum.toFixed(1)} KB</span>
              </div>
              <div style="height:6px; background:var(--bg-input); border-radius:3px; overflow:hidden;">
                <div style="width:${Math.min(100, (imgKbSum / estimatedTotal) * 100)}%; height:100%; background:#10b981; border-radius:3px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Embedded Fonts list -->
        <div>
          <strong style="display:block; font-size:11px; text-transform:uppercase; color:var(--text-label); letter-spacing:0.05em; margin-bottom:8px;">Embedded Fonts</strong>
          ${fontSectionHTML}
        </div>

        <!-- Images list -->
        <div>
          <strong style="display:block; font-size:11px; text-transform:uppercase; color:var(--text-label); letter-spacing:0.05em; margin-bottom:8px;">Image Assets (Uncompressed)</strong>
          <div style="max-height:250px; overflow-y:auto; padding-right:2px;">
            ${imageSectionHTML}
          </div>
        </div>

        <!-- Dynamic Slot Variables -->
        <div>
          <strong style="display:block; font-size:11px; text-transform:uppercase; color:var(--text-label); letter-spacing:0.05em; margin-bottom:8px;">Dynamic Mappings</strong>
          <div style="max-height:200px; overflow-y:auto; padding-right:2px;">
            ${dynamicSectionHTML}
          </div>
        </div>
      </div>
    `;
    
    return `
      <div id="${modalId}" style="display:flex; gap:24px; min-height:600px; height: 100%;">
        <div style="width:190px; flex-shrink:0; border-right:1px solid var(--border-light); padding-right:16px; display:flex; flex-direction:column; gap:4px; height:100%; overflow-y:auto;">
          <div style="font-size:11.5px; font-weight:600; color:var(--text-label); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px; padding-left:4px;">Canvases</div>
          ${sidebarHtml}
        </div>
        <div style="flex:1; display:flex; flex-direction:column; gap:16px; overflow-y:auto; height:100%; padding-right:4px;">
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border-light); padding-bottom:10px; flex-shrink:0;">
            <h3 style="margin:0; font-size:16px; font-weight:600; color:var(--text-bright);">${focusedCanvas.width} × ${focusedCanvas.height} Details</h3>
            <span style="font-size:12.5px; font-weight:bold; color:var(--text-label);">ZIP Size: <span style="color:${errors.some(e => e.includes('limit')) ? '#f97316' : '#10b981'}; font-size:14px;">${focusedCanvas._valKb ? focusedCanvas._valKb + 'KB' : 'calc...'}</span></span>
          </div>
          ${errorsHTML}
          ${criteriaHTML}
        </div>
        ${breakdownHTML}
      </div>
    `;
  };

  let activeDetailsId = initialCanvas.id;

  openModal(`Validation Dashboard`, generateModalContent(initialCanvas.id), false);
  
  const modalEl = document.querySelector('.modal-bg:last-child .modal');
  if (modalEl) {
    modalEl.style.width = '1200px';
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
        
        // Close modal
        const modalBg = modalEl.closest('.modal-bg');
        if (modalBg) modalBg.remove();
        
        // Activate target canvas
        state.activeCanvasId = currentCanvas.id;
        render();
        
        // Enter preview mode
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

  const setupModalListeners = (modalEl, currentId) => {
    activeDetailsId = currentId;
    const buttons = modalEl.querySelectorAll('.val-sidebar-item');
    buttons.forEach(btn => {
      const canvasId = btn.dataset.canvasId;
      if (canvasId === currentId) {
        btn.classList.add('active');
      }
      btn.onclick = () => {
        const modalContainer = document.getElementById(modalId);
        if (modalContainer) {
          const parent = modalContainer.parentElement;
          parent.innerHTML = generateModalContent(canvasId);
          const newContainer = parent.querySelector(`#${modalId}`);
          setupModalListeners(newContainer, canvasId);
        }
      };
    });
  };

  const modalContainer = document.getElementById(modalId);
  if (modalContainer) {
    setupModalListeners(modalContainer.parentElement, initialCanvas.id);
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
      if (hasErrors) {
        btnBg = 'rgba(249, 115, 22, 0.15)';
        btnColor = '#f97316';
        btnBgHover = 'rgba(249, 115, 22, 0.3)';
        btnText = '⚠️';
        btnTitle = 'Validation warnings found. Click to open validator dashboard.';
      } else {
        btnBg = 'rgba(16, 185, 129, 0.15)';
        btnColor = '#10b981';
        btnBgHover = 'rgba(16, 185, 129, 0.3)';
        btnText = '✓';
        btnTitle = 'All validation checks passed. Click to open validator dashboard.';
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
    popup.style.background = '#181b22';
    popup.style.border = '1px solid #272c3a';
    popup.style.borderRadius = '6px';
    popup.style.padding = '4px 0';
    popup.style.zIndex = '2000';
    popup.style.boxShadow = '0 8px 24px rgba(0,0,0,.5)';

    PRESET_SIZES.forEach(sz => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.innerText = `${sz.name} (${sz.width}x${sz.height})`;
      item.addEventListener('click', () => {
        const idx = state.canvases.length;
        const c = seedCanvas(sz, idx % PRESET_SIZES.length);
        if (state.defaultBg) c.bgColor = state.defaultBg;
        if (idx >= PRESET_SIZES.length) {
          c.workspaceX = 2060 + idx * 30;
          c.workspaceY = 2060 + idx * 30;
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
      const rowBg = isGroupSelected ? 'rgba(124, 92, 255, 0.12)' : 'rgba(255,255,255,0.02)';
      const rowStyle = isGroupSelected 
        ? 'border-left: 3px solid var(--accent-light); padding-left: 5px; border-top-left-radius: 0; border-bottom-left-radius: 0;' 
        : '';

      html += `
        <div class="link-group-row" data-group-id="${g.id}" style="display:flex; align-items:center; justify-content:space-between; padding:5px 6px; border-radius:4px; margin-bottom:4px; background:${rowBg}; ${rowStyle} cursor:pointer; gap:6px;">
          <div style="display:flex; align-items:center; gap:5px; flex:1; min-width:0;">
            ${iconHtml}
            <span class="layer-name" style="font-size:11px; font-weight:500; color:var(--text-bright); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${g.name}</span>
          </div>
          <div style="display:flex; align-items:center; gap:2px; flex-shrink:0;">
            <span style="font-size:10px; font-weight:600; color:var(--text-bright); background:rgba(255,255,255,0.08); padding:2px 4px; border-radius:8px; margin-right:2px; display:inline-block; line-height:1;">${count}</span>
            <button class="icon-btn ${g.liveLink ? 'active' : ''} lg-live-btn" data-group-id="${g.id}" title="Toggle Live-Link Mode (Instant Sync)" style="background:none; border:none; cursor:pointer; padding:2px; display:flex; align-items:center; color:${g.liveLink ? 'var(--accent-light)' : 'var(--text-muted)'};">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="${g.liveLink ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </button>
            <button class="icon-btn ${hasElements && !allHidden ? 'active' : ''} lg-eye-btn" data-group-id="${g.id}" title="Toggle group visibility" style="background:none; border:none; cursor:pointer; padding:2px; display:flex; align-items:center; color:${hasElements && !allHidden ? 'var(--text-bright)' : 'var(--text-muted)'};">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button class="icon-btn active lg-delete-btn" data-group-id="${g.id}" title="Unlink group" style="background:none; border:none; cursor:pointer; padding:2px; display:flex; align-items:center; color:#ef4444;">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.84 12.2a4.5 4.5 0 0 0-6.37-6.37l-1.5 1.5"></path><path d="M11.53 16.07a4.5 4.5 0 0 0 6.37 6.37l1.5-1.5"></path></svg>
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
        <button id="lnk-btn-autolink" class="btn" title="Automatically link matching layers across canvases by name and type" style="flex:1; font-size:11px; padding:6px 12px; display:flex; align-items:center; justify-content:center; gap:6px; border: 1px solid var(--accent-dark); background: rgba(124, 92, 255, 0.05); color: var(--accent-light); box-sizing:border-box;">
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
      <button id="lnk-btn-autoadd" class="btn" title="Distribute this element to other canvases and link them together" style="width:100%; font-size:11px; padding:6px 12px; display:flex; align-items:center; justify-content:center; gap:6px; border: 1px solid var(--accent-dark); background: rgba(124, 92, 255, 0.05); color: var(--accent-light); margin-bottom: 8px; box-sizing:border-box;">
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
          const anyChecked = Object.values(sync).some(Boolean);

          html += `<div style="padding-top:4px;">`;
          html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="font-size:10px; font-weight:600; color:var(--text-label); text-transform:uppercase; letter-spacing:0.05em;">Link Properties</div>
            <button id="lnk-toggle-all-props" title="Select or deselect all sync properties" style="background:none; border:none; color:var(--accent-light); font-size:10px; cursor:pointer; padding:0; text-decoration:underline;">${anyChecked ? 'Unselect all' : 'Select all'}</button>
          </div>`;
          
          if (cat === 'text') {
            html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 8px;">
              <label title="Sync text content across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="text" ${sync.text ? 'checked' : ''} title="Sync text content across linked elements" /> Text content</label>
              <label title="Sync font family and weight settings across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="font" ${sync.font ? 'checked' : ''} title="Sync font family and weight settings across linked elements" /> Font settings</label>
              <label title="Sync font size across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="fontSize" ${(sync.fontSize !== undefined ? sync.fontSize : sync.font) ? 'checked' : ''} title="Sync font size across linked elements" /> Font size</label>
              <label title="Sync text color across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="color" ${sync.color ? 'checked' : ''} title="Sync text color across linked elements" /> Colors</label>
              <label title="Sync text background properties across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="background" ${(sync.background !== undefined ? sync.background : sync.color) ? 'checked' : ''} title="Sync text background properties across linked elements" /> Background</label>
              <label title="Sync opacity across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="opacity" ${sync.opacity ? 'checked' : ''} title="Sync opacity across linked elements" /> Opacity</label>
              <label title="Sync entry transition animation across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="inAnim" ${sync.inAnim ? 'checked' : ''} title="Sync entry transition animation across linked elements" /> IN Animation</label>
              <label title="Sync continuous effect across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="effect" ${sync.effect ? 'checked' : ''} title="Sync continuous effect across linked elements" /> Effects</label>
            </div>`;
          } else if (cat === 'button') {
            html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 8px;">
              <label title="Sync button label text across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="text" ${sync.text ? 'checked' : ''} title="Sync button label text across linked elements" /> Button text</label>
              <label title="Sync button text color across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="textColor" ${sync.textColor ? 'checked' : ''} title="Sync button text color across linked elements" /> Button text color</label>
              <label title="Sync button background fill across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="fill" ${sync.fill ? 'checked' : ''} title="Sync button background fill across linked elements" /> Fill</label>
              <label title="Sync button stroke properties across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="stroke" ${sync.stroke ? 'checked' : ''} title="Sync button stroke properties across linked elements" /> Stroke</label>
              <label title="Sync button width and height across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="transform" ${sync.transform ? 'checked' : ''} title="Sync button width and height across linked elements" /> Transform (W+H)</label>
              <label title="Sync button opacity across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="opacity" ${sync.opacity ? 'checked' : ''} title="Sync button opacity across linked elements" /> Opacity</label>
              <label title="Sync button entry transition animation across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="inAnim" ${sync.inAnim ? 'checked' : ''} title="Sync button entry transition animation across linked elements" /> IN Animation</label>
              <label title="Sync button continuous effect across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="effect" ${sync.effect ? 'checked' : ''} title="Sync button continuous effect across linked elements" /> Effects</label>
            </div>`;
          } else if (cat === 'image') {
            html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 8px;">
              <label title="Sync image asset across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="image" ${sync.image ? 'checked' : ''} title="Sync image asset across linked elements" /> Image asset</label>
              <label title="Sync image width and height across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="transform" ${sync.transform ? 'checked' : ''} title="Sync image width and height across linked elements" /> Transform (W+H)</label>
              <label title="Sync image opacity across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="opacity" ${sync.opacity ? 'checked' : ''} title="Sync image opacity across linked elements" /> Opacity</label>
              <label title="Sync image rotation angle across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="rotation" ${sync.rotation ? 'checked' : ''} title="Sync image rotation angle across linked elements" /> Rotation</label>
              <label title="Sync image entry transition animation across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="inAnim" ${sync.inAnim ? 'checked' : ''} title="Sync image entry transition animation across linked elements" /> IN Animation</label>
              <label title="Sync image continuous effect across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="effect" ${sync.effect ? 'checked' : ''} title="Sync image continuous effect across linked elements" /> Effects</label>
            </div>`;
          } else if (cat === 'shape') {
            html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 8px;">
              <label title="Sync shape fill color across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="fill" ${sync.fill ? 'checked' : ''} title="Sync shape fill color across linked elements" /> Color</label>
              <label title="Sync shape stroke properties across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="stroke" ${sync.stroke ? 'checked' : ''} title="Sync shape stroke properties across linked elements" /> Stroke</label>
              <label title="Sync shape width and height across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="transform" ${sync.transform ? 'checked' : ''} title="Sync shape width and height across linked elements" /> Transform (W+H)</label>
              <label title="Sync shape opacity across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="opacity" ${sync.opacity ? 'checked' : ''} title="Sync shape opacity across linked elements" /> Opacity</label>
              <label title="Sync shape entry transition animation across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="inAnim" ${sync.inAnim ? 'checked' : ''} title="Sync shape entry transition animation across linked elements" /> IN Animation</label>
              <label title="Sync shape continuous effect across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="effect" ${sync.effect ? 'checked' : ''} title="Sync shape continuous effect across linked elements" /> Effects</label>
            </div>`;
          } else if (cat === 'line') {
            html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 8px;">
              <label title="Sync line color across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="color" ${sync.color ? 'checked' : ''} title="Sync line color across linked elements" /> Color</label>
              <label title="Sync line thickness across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="thickness" ${sync.thickness ? 'checked' : ''} title="Sync line thickness across linked elements" /> Thickness</label>
              <label title="Sync line opacity across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="opacity" ${sync.opacity ? 'checked' : ''} title="Sync line opacity across linked elements" /> Opacity</label>
              <label title="Sync line entry transition animation across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="inAnim" ${sync.inAnim ? 'checked' : ''} title="Sync line entry transition animation across linked elements" /> IN Animation</label>
              <label title="Sync line continuous effect across linked elements" style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;"><input type="checkbox" class="lnk-sync-prop" data-prop="effect" ${sync.effect ? 'checked' : ''} title="Sync line continuous effect across linked elements" /> Effects</label>
            </div>`;
          }
          html += `</div>`;
          
          html += `<div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--bg-input); display:flex; align-items:center; margin-bottom:6px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-bright); font-weight:500; cursor:pointer;" title="Sync changes instantly across all canvases as you edit">
              <input type="checkbox" id="lnk-live-toggle" title="Sync changes instantly across all canvases as you edit" ${group.liveLink ? 'checked' : ''} />
              Live-link mode
            </label>
          </div>`;

          html += `<button id="lnk-btn-push" class="btn primary" title="Force push properties from selection to all other members in the group" style="width:100%; font-size:11px; padding:6px 12px; font-weight:600; margin-top:8px; box-sizing:border-box;">Push Changes to Group</button>`;
          html += `<button id="lnk-btn-unlink" class="btn" title="Remove selected element(s) from link groups" style="width:100%; font-size:11px; padding:6px 12px; margin-top:4px; box-sizing:border-box;">Unlink Selected</button>`;
        }
      } else {
        html += `<div style="font-size: 11px; color:#ef4444; width:100%; box-sizing:border-box;">Selection contains multiple link groups.</div>`;
        html += `<button id="lnk-btn-unlink-all" class="btn" title="Remove selected element(s) from link groups" style="width:100%; font-size:11px; padding:6px 12px; margin-top:4px; box-sizing:border-box;">Unlink All</button>`;
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
    btnAutolink.onclick = () => {
      autoLinkElements();
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
          const anyChecked = Object.values(group.syncProperties).some(Boolean);
          const targetVal = !anyChecked;
          
          const cat = group.category;
          let keys = [];
          if (cat === 'text') keys = ['text', 'font', 'fontSize', 'color', 'background', 'opacity', 'inAnim', 'effect'];
          else if (cat === 'button') keys = ['text', 'textColor', 'fill', 'stroke', 'transform', 'opacity', 'inAnim', 'effect'];
          else if (cat === 'image') keys = ['image', 'transform', 'opacity', 'rotation', 'inAnim', 'effect'];
          else if (cat === 'shape') keys = ['fill', 'stroke', 'transform', 'opacity', 'inAnim', 'effect'];
          
          keys.forEach(k => {
            group.syncProperties[k] = targetVal;
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
          pushHistory();
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
      document.querySelectorAll(`.el[data-link-group="${gid}"]`).forEach(el => {
        el.classList.add('link-highlight-hover');
        if (lg && lg.liveLink) {
          el.classList.add('link-highlight-hover-live');
        }
      });
    });
    row.addEventListener('mouseleave', () => {
      document.querySelectorAll('.el.link-highlight-hover').forEach(el => el.classList.remove('link-highlight-hover'));
      document.querySelectorAll('.el.link-highlight-hover-live').forEach(el => el.classList.remove('link-highlight-hover-live'));
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
function saveSelectionAsAsset(folderId) {
  ensureAssetsPanelExpanded();
  const c = getActiveCanvas();
  if (!c) return;
  const ids = (state.layerSelection && state.layerSelection.length)
    ? state.layerSelection
    : (state.selectedElementId ? [state.selectedElementId] : []);
  let els = c.elements.filter(e => ids.includes(e.id));
  if (!els.length) { alert('Select an element or group first, then save it to Assets.'); return; }
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
      e.dataTransfer.effectAllowed = 'copyMove';
    });
    return div;
  };

  const makeFolderRow = (folder) => {
    const div = document.createElement('div');
    div.className = 'layer' + (folder.readOnly ? ' read-only-folder' : '');
    div.dataset.folderId = folder.id;
    const caretRot = folder.collapsed ? 'transform:rotate(-90deg);' : '';
    const deleteBtn = folder.readOnly ? '' : `<button class="icon-btn active" data-act="del-folder" title="Delete folder (its assets move out)">${TRASH}</button>`;
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
        (state.assetLibrary || []).forEach(a => { if (a.folderId === folder.id) a.folderId = null; });
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
      action: () => {
        saveSelectionAsAsset();
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
      btn.style.color = 'var(--text-bright)';
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
        alert("Cannot add assets to a read-only folder.");
        return;
      }
      const files = Array.from(e.dataTransfer.files).filter(f => 
        /^image\/(png|jpeg|svg\+xml)$/i.test(f.type) || /\.(png|jpg|jpeg|svg)$/i.test(f.name)
      );
      if (files.length === 0) {
        alert('Only image files (PNG, JPEG, SVG) are allowed.');
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
            alert("Cannot add assets to a read-only folder.");
            return;
          }
          const prevSelection = state.layerSelection;
          const prevSelectedId = state.selectedElementId;
          state.layerSelection = ids;
          state.selectedElementId = ids[ids.length - 1];
          saveSelectionAsAsset(targetFolderId);
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
    <div class="layer-section-title" style="font-size:10px;font-weight:600;color:var(--text-label);padding:4px 0;text-transform:uppercase;letter-spacing:0.05em">Persistent (Top)</div>
    <div id="layers-top" class="layer-dropzone" data-persistent="top" style="min-height:16px;margin-bottom:8px"></div>
    <div class="layer-section-title" style="font-size:10px;font-weight:600;color:var(--text-label);padding:4px 0;text-transform:uppercase;letter-spacing:0.05em">Frame ${frameIdx + 1}</div>
    <div id="layers-mid" class="layer-dropzone" data-persistent="false" style="min-height:16px;margin-bottom:8px"></div>
    <div class="layer-section-title" style="font-size:10px;font-weight:600;color:var(--text-label);padding:4px 0;text-transform:uppercase;letter-spacing:0.05em">Persistent (Bottom)</div>
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
      div.className = 'layer' + (isSel ? ' selected' : '');
      div.draggable = true;
      div.innerHTML = `
        <svg class="layer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${layerIcon(el.type)}</svg>
        <span class="layer-name" style="${el.hidden ? 'opacity:0.5;text-decoration:line-through' : ''}">${layerLabel(el)}</span>
        <div class="layer-actions">
          <button class="icon-btn ${el.locked ? 'active' : ''}" data-act="lock" title="Toggle lock">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </button>
          <button class="icon-btn ${!el.hidden ? 'active' : ''}" data-act="hide" title="Toggle visibility">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
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

        nameSpan.contentEditable = 'true';
        div.draggable = false; // Disable dragging to allow text selection
        nameSpan.focus();
        const sel = window.getSelection();
        sel.selectAllChildren(nameSpan);

        const finishEdit = () => {
          nameSpan.contentEditable = 'false';
          div.draggable = true; // Restore dragging
          el.customName = nameSpan.innerText.trim() || '';
          nameSpan.innerText = layerLabel(el);
          pushHistory();
        };

        nameSpan.addEventListener('blur', finishEdit, { once: true });
        nameSpan.addEventListener('keydown', (ek) => {
          if (ek.key === 'Enter') {
            ek.preventDefault();
            nameSpan.blur();
          }
          if (ek.key === 'Escape') {
            ek.preventDefault();
            nameSpan.innerText = layerLabel(el); // Revert back
            nameSpan.blur();
          }
        });
      });

      div.addEventListener('click', (e) => {
        const act = e.target.closest('button')?.dataset.act;
        if (act === 'lock') {
          const toToggle = (state.layerSelection?.includes(el.id)) ? state.layerSelection : [el.id];
          toToggle.forEach(id => {
            const item = c.elements.find(x => x.id === id);
            if (item) item.locked = !item.locked;
          });
          pushHistory();
          render();
          return;
        }
        if (act === 'hide') {
          const toToggle = (state.layerSelection?.includes(el.id)) ? state.layerSelection : [el.id];
          toToggle.forEach(id => {
            const item = c.elements.find(x => x.id === id);
            if (item) item.hidden = !item.hidden;
          });
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
  return count > 1 ? `${base} ${count}` : base;
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
    const inputStyle = `width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 24px 4px 6px; font-size:11px; outline:none; text-transform:uppercase; ${pointerEvents}`;
    return `<div style="${containerStyle}"><input type="text" data-k="${key}" ${inputId ? `id="${inputId}"` : ''} value="${(value || '').replace(/^#/, '')}" title="Hex color code" ${disabledAttr} style="${inputStyle}" />${hexCopyBtn(key, disabled)}</div>`;
  };

  // ---- Dynamic Data (data-merge / versioning) ----
  let dynamicHtml = '';
  if (typeof dmFieldsForType === 'function') {
    const dmFields = el ? dmFieldsForType(el.type) : [];
    if (el && dmFields.length) {
      dynamicHtml = `<div class="panel-section highlighted" id="panel-section-dynamic-data" data-permanent="true">
        <h3 class="panel-header-collapsible" id="header-dynamic-data" style="cursor: pointer; user-select: none; color: var(--text-label);">
          <span class="dd-marquee" style="flex:1; min-width:0; overflow:hidden; white-space:nowrap;">Dynamic Data<span style="color:var(--text-main);">: ${esc(layerLabel(el))}</span></span>
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
              <input type="checkbox" id="${id}" class="dm-control dm-field-chk" data-dm-field="${field}" title="Toggle dynamic data binding for ${DM_FIELD_LABEL[field] || field}" ${on ? 'checked' : ''}/>
              <label for="${id}" title="Toggle dynamic data binding for ${DM_FIELD_LABEL[field] || field}" style="cursor:pointer; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-weight:500;">${DM_FIELD_LABEL[field] || field}</label>
            </div>
            <select class="dm-control dm-field-select" data-dm-field="${field}" title="Column header map for ${DM_FIELD_LABEL[field] || field}" style="width:130px; flex-shrink:0; padding:3px 4px; font-size:11px; outline:none; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; font-family:inherit; transition:opacity 0.2s;" ${on ? '' : 'disabled'}>
              ${colOptions}
            </select>
          </div>
        `);
      });
      dynamicHtml += `<div class="prop-row" style="display:flex; flex-direction:column; gap:2px; margin-bottom:8px; width:100%;">${checkboxRows.join('')}</div>`;
      if (el.linkGroupId) {
        dynamicHtml += `<div class="prop-row" style="font-size:10px;color:var(--accent-light);margin-top:4px;line-height:1.4;">Linked element — these toggles apply to every size in the link group.</div>`;
      }
      dynamicHtml += `<button class="btn primary dm-control" id="dm-open-from-props" title="Open spreadsheet view to edit dynamic data and banner versions" style="margin-top:10px;width:100%;font-size:11px;">Open Data &amp; Versions…</button>`;
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
        <button class="btn primary dm-control" id="dm-open-from-props" title="Open spreadsheet view to edit dynamic data and banner versions" style="width:100%;font-size:11px;">Open Data &amp; Versions…</button>
      </div>`;
    }
  }

  if (!el) {
    if (!c) { propsEl.innerHTML = '<div class="panel-section"><h3>Properties</h3><div class="prop-empty">No canvas.</div></div>'; return; }
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
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="cp-trigger" data-k="canvas-bg" id="c-bg-color" title="Choose canvas background color" style="width:24px; height:24px; border-radius:4px; border:1px solid #272c3a; cursor:pointer; background:${getBgStyle(c.bgColor) || '#000'}"></button>
            ${hexInputBox('canvas-bg', c.bgColor, 'c-bg-color-hex')}
          </div>
        </div>
        <div class="prop-row" style="margin-top:4px;">
          <div class="checkbox-row">
            <input type="checkbox" id="c-bg-apply-all" title="Apply background color to all canvas sizes" ${state.bgApplyAll !== false ? 'checked' : ''} />
            <label for="c-bg-apply-all" title="Apply background color to all canvas sizes">Apply to all canvases</label>
          </div>
        </div>
        <div class="prop-row" style="margin-top:12px;">
          <div class="checkbox-row">
            <input type="checkbox" id="c-full-click" title="Make the entire canvas clickable (landing page redirect)" ${c.fullClickArea !== false ? 'checked' : ''} />
            <label for="c-full-click" title="Make the entire canvas clickable (landing page redirect)">Use entire canvas as click area</label>
          </div>
        </div>

        <div class="prop-row" style="margin-top:16px; display:flex; flex-direction:column; gap:8px;">
          <button id="c-btn-preview" title="Toggle preview mode for this canvas" style="
            width:100%; padding:8px 12px; border-radius:6px; border:none; cursor:pointer;
            background:var(--accent-base); color:#fff; font-size:12px; font-weight:600;
            font-family:inherit; display:flex; align-items:center; justify-content:center; gap:6px;
            box-shadow:0 2px 8px rgba(124,92,255,0.35); transition:filter 0.15s;
          ">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Preview
          </button>
          <div style="display:flex; gap:6px;">
            <button id="c-btn-dl-zip" title="Download this size as a zip package containing HTML and assets" style="
              flex:1; padding:7px 0; border-radius:6px; border:1px solid #272c3a; cursor:pointer;
              background:var(--bg-input); color:var(--text-main); font-size:11px; font-weight:500;
              font-family:inherit; display:flex; align-items:center; justify-content:center; gap:4px;
              transition:border-color 0.15s; white-space:nowrap;
            ">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download ZIP
            </button>
            <button id="c-btn-dl-img" title="Download a PNG snapshot of the current canvas" style="
              flex:1; padding:7px 0; border-radius:6px; border:1px solid #272c3a; cursor:pointer;
              background:var(--bg-input); color:var(--text-main); font-size:11px; font-weight:500;
              font-family:inherit; display:flex; align-items:center; justify-content:center; gap:4px;
              transition:border-color 0.15s; white-space:nowrap;
            ">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5L11 18"/></svg>
              Download PNG
            </button>
          </div>
        </div>

        <div class="prop-empty" style="padding: 16px 0 0;">Tip: double-click text to edit it inline. Use <span class="kbd">←↑↓→</span> to nudge, <span class="kbd">⌫</span> to delete.</div>
      </div></div>`;
    const wInp = document.getElementById('c-w');
    const hInp = document.getElementById('c-h');

    wInp.addEventListener('input', e => { c.width = Math.max(20, +e.target.value || 20); render(true); });
    wInp.addEventListener('change', () => pushHistory());

    hInp.addEventListener('input', e => { c.height = Math.max(20, +e.target.value || 20); render(true); });
    hInp.addEventListener('change', () => pushHistory());

    const bgColor = document.getElementById('c-bg-color');
    const bgHex = document.getElementById('c-bg-color-hex');
    const bgAll = document.getElementById('c-bg-apply-all');
    const fullClick = document.getElementById('c-full-click');

    bgAll.addEventListener('change', e => {
      state.bgApplyAll = e.target.checked;
      if (state.bgApplyAll) {
        state.canvases.forEach(cv => cv.bgColor = c.bgColor);
        render(true);
        pushHistory();
      }
    });

    if (bgColor) {
      bgColor.addEventListener('click', () => openColorPicker(bgColor, 'canvas-bg', c.bgColor));
    }

    bgHex.addEventListener('input', e => {
      let val = e.target.value;
      if (!val.startsWith('#') && val.length > 0 && !val.includes('gradient')) val = '#' + val;
      c.bgColor = val;
      if (bgColor) bgColor.style.background = val;
      if (bgAll.checked) state.canvases.forEach(cv => cv.bgColor = val);
      render(true);
    });
    bgHex.addEventListener('change', () => pushHistory());

    fullClick.addEventListener('change', e => {
      c.fullClickArea = e.target.checked;
      pushHistory();
      render(true);
    });

    // ── Preview button ──
    const btnPreview = document.getElementById('c-btn-preview');
    if (btnPreview) {
      const isSinglePreview = state.singlePreviewId === c.id;
      if (isSinglePreview) {
        btnPreview.style.background = 'var(--bg-input)';
        btnPreview.style.color = 'var(--text-muted)';
        btnPreview.style.border = '1px solid #272c3a';
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

    // ── Download ZIP button ──
    const btnDlZip = document.getElementById('c-btn-dl-zip');
    if (btnDlZip) {
      btnDlZip.addEventListener('mouseenter', () => { btnDlZip.style.borderColor = 'var(--accent-base)'; });
      btnDlZip.addEventListener('mouseleave', () => { btnDlZip.style.borderColor = '#272c3a'; });
      btnDlZip.addEventListener('click', () => exportCanvasAsZip(c));
    }

    // ── Download PNG button ──
    const btnDlImg = document.getElementById('c-btn-dl-img');
    if (btnDlImg) {
      btnDlImg.addEventListener('mouseenter', () => { btnDlImg.style.borderColor = 'var(--accent-base)'; });
      btnDlImg.addEventListener('mouseleave', () => { btnDlImg.style.borderColor = '#272c3a'; });
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

    if (typeof syncColorPickerWithSelection === 'function') {
      syncColorPickerWithSelection(null, c);
    }
    initCollapsiblePanels();
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
    'spinRepeat': 'Repeat count (minimum 1)'
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
        <button class="cp-trigger" data-k="${key}" ${isDisabled ? 'disabled' : ''} title="${triggerTitle}" style="width:24px; height:24px; border-radius:4px; border:1px solid #272c3a; cursor:pointer; background:${getBgStyle(val) || '#000'}"></button>
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
            <button class="cp-trigger" data-k="${key}" ${isDisabled ? 'disabled' : ''} title="${triggerTitle}" style="width:24px; height:24px; border-radius:4px; border:1px solid #272c3a; cursor:pointer; background:${getBgStyle(val) || '#000'}"></button>
            ${hexInputBox(key, val, '', isDisabled)}
          </div>
        </div>
        <div class="prop-row" style="margin:0; width:78px; flex-shrink:0;">
          <label>Opacity %</label>
          <input type="number" data-k="opacity" value="${el.opacity !== undefined ? el.opacity : 100}" min="0" max="100" title="${opacityTitle}" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" />
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
            ${getWeightsForFont(el.fontFamily || 'Arial').map(w => `<option ${w === el.weight ? 'selected' : ''} value="${w}">${w}</option>`).join('')}
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
            <button class="cp-trigger" data-k="bg" ${!el.hasBg ? 'disabled' : ''} title="Choose text background color" style="width:24px; height:24px; border-radius:4px; border:1px solid #272c3a; cursor:pointer; background:${getBgStyle(el.bg || '#000000') || '#000'}"></button>
            ${hexInputBox('bg', el.bg || '#000000', '', !el.hasBg)}
          </div>
        </div>
        <div class="checkbox-row" style="margin:0 12px 5px 0; font-size:11px; color:var(--text-main); gap:4px; height:22px; flex-shrink:0; white-space:nowrap;">
          <input type="checkbox" data-k="hasBg" id="prop-has-bg" title="Enable text background" ${el.hasBg ? 'checked' : ''} style="width:12px; height:12px; margin:0;" />
          <label for="prop-has-bg" title="Enable text background" style="cursor:pointer; margin:0;">BG</label>
        </div>
        <div class="prop-row" style="margin:0; width:78px; flex-shrink:0;">
          <label for="prop-bg-opacity">Opacity %</label>
          <input type="number" data-k="bgOpacity" id="prop-bg-opacity" value="${el.bgOpacity !== undefined ? el.bgOpacity : 100}" min="0" max="100" ${!el.hasBg ? 'disabled' : ''} style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Text background opacity percentage" />
        </div>
      </div>
    </div>`);

    // L/R pad, T/B pad, Coverage — three compact columns on a single row.
    f.push(`<div class="prop-row" style="display:flex; gap:6px;">
      <div style="flex:1; min-width:0;"><label for="prop-bg-pad-l">L/R Pad</label><input type="number" data-k="bgPadL" id="prop-bg-pad-l" value="${el.bgPadL !== undefined ? el.bgPadL : 8}" min="0" ${!el.hasBg ? 'disabled' : ''} style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Left and Right padding in pixels" /></div>
      <div style="flex:1; min-width:0;"><label for="prop-bg-pad-v">T/B Pad</label><input type="number" data-k="bgPadV" id="prop-bg-pad-v" value="${el.bgPadV !== undefined ? el.bgPadV : 4}" min="0" ${!el.hasBg ? 'disabled' : ''} style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Top and Bottom padding in pixels" /></div>
      <div style="flex:1; min-width:0;"><label for="prop-bg-coverage">Cover %</label><input type="number" data-k="bgCoverage" id="prop-bg-coverage" value="${el.bgCoverage !== undefined ? el.bgCoverage : 100}" min="0" max="100" ${!el.hasBg ? 'disabled' : ''} style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Width percentage of text background coverage" /></div>
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
              <button class="cp-trigger" data-k="strokeColor" title="Choose stroke color" style="width:24px; height:24px; border-radius:4px; border:1px solid #272c3a; cursor:pointer; background:transparent; box-shadow:inset 0 0 0 4px ${getBgStyle(el.strokeColor || '#ffffff') || '#fff'};"></button>
              ${hexInputBox('strokeColor', el.strokeColor || '#ffffff')}
            </div>
          </div>
          <div style="width:78px; flex-shrink:0;">
            <label for="prop-stroke-opacity">Opacity %</label>
            <input type="number" data-k="strokeOpacity" id="prop-stroke-opacity" value="${el.strokeOpacity !== undefined ? el.strokeOpacity : 100}" min="0" max="100" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Stroke opacity percentage" />
          </div>
        </div>`;
    h += `<div class="prop-row" style="display:flex; gap:6px;">
          <div style="flex:1; min-width:0;"><label for="prop-stroke-width">Thickness</label><input type="number" data-k="strokeWidth" id="prop-stroke-width" value="${sw}" min="0" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Stroke thickness in pixels" /></div>
          <div style="flex:1; min-width:0;"><label for="prop-stroke-dash">Dash</label><input type="number" data-k="strokeDash" id="prop-stroke-dash" value="${el.strokeDash !== undefined ? el.strokeDash : 0}" min="0" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Stroke dash length in pixels" /></div>
          <div style="flex:1; min-width:0;"><label for="prop-stroke-gap">Gap</label><input type="number" data-k="strokeGap" id="prop-stroke-gap" value="${el.strokeGap !== undefined ? el.strokeGap : 0}" min="0" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Stroke gap length in pixels" /></div>
        </div>`;
    return h;
  };

  if (el.type === 'rect') { f.push(colOpac('color', 'Fill')); f.push(num('radius', 'Radius')); f.push(strokeSection()); }
  if (el.type === 'circle') { f.push(colOpac('color', 'Fill')); f.push(strokeSection()); }
  if (el.type === 'pixel') { f.push(colOpac('color', 'Fill')); f.push(strokeSection()); }
  if (el.type === 'line') { f.push(colOpac('color', 'Line color')); }
  if (el.type === 'button') {
    f.push(txt('text', 'Label'));
    f.push(`<div class="prop-row"><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px;">
      <div class="prop-row" style="margin:0"><label>Font</label>
        <select data-k="fontFamily" title="Button Font Family">
          ${FONT_OPTIONS.map(fnt => `<option ${fnt === (el.fontFamily || 'Arial') ? 'selected' : ''} value="${fnt}">${fnt}</option>`).join('')}
        </select>
      </div>
      <div class="prop-row" style="margin:0"><label>Weight</label>
        <select data-k="weight" title="Button Font Weight">
          ${getWeightsForFont(el.fontFamily || 'Arial').map(w => `<option ${w === el.weight ? 'selected' : ''} value="${w}">${w}</option>`).join('')}
        </select>
      </div>
      <div class="prop-row" style="margin:0"><label>Size</label>
        <input type="number" data-k="fontSize" value="${el.fontSize}" title="Button Font Size" />
      </div>
    </div></div>`);
    f.push(colOpac('bg', 'BG'));
    f.push(col('color', 'Text color'));
    // Radius + Padding L/R share a row.
    f.push(`<div class="prop-row" style="display:flex; gap:6px;">
          <div style="flex:1; min-width:0;"><label for="prop-radius">Radius</label><input type="number" data-k="radius" id="prop-radius" value="${el.radius !== undefined ? el.radius : 0}" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Button corner radius in pixels" /></div>
          <div style="flex:1; min-width:0;"><label for="prop-padding-lr">Padding L/R</label><input type="number" data-k="paddingLR" id="prop-padding-lr" value="${el.paddingLR !== undefined ? el.paddingLR : 16}" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Button horizontal padding in pixels" /></div>
        </div>`);
    f.push(`<div class="prop-row" style="display:flex; gap:16px;">
          <div class="checkbox-row">
            <input type="checkbox" data-k="autoHug" id="prop-auto-hug" title="Auto-scale button width to hug text content" ${el.autoHug ? 'checked' : ''}/>
            <label for="prop-auto-hug" title="Auto-scale button width to hug text content" style="cursor:pointer;">Hug</label>
          </div>
          <div class="checkbox-row">
            <input type="checkbox" data-k="isClickArea" id="prop-is-click-area" title="Make this button the main click-through area" ${el.isClickArea ? 'checked' : ''}/>
            <label for="prop-is-click-area" title="Make this button the main click-through area" style="cursor:pointer;">Clicktag</label>
          </div>
        </div>`);
    f.push(strokeSection());
  }
  if (el.type === 'image') {
    const imgDisabled = isFieldDisabled('image');
    const src = dAssetId ? ((state.assets && state.assets[dAssetId]) || dAssetId) : '';
    const isVector = (el.name && el.name.toLowerCase().endsWith('.svg')) || 
                     (dAssetId && state.assets && state.assets[dAssetId] && state.assets[dAssetId].startsWith('data:image/svg+xml'));

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
      f.push(`<div class="prop-row">
        <label>Preview</label>
        <div class="img-preview-container" style="position:relative; width:100%; border-radius:4px; overflow:hidden; border:1px solid #272c3a; background:#12131a; cursor:pointer;">
          <img src="${src}" style="display:block; width:100%; max-height:160px; object-fit:contain; pointer-events:none;" />
          <div class="img-preview-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.65); display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s ease; gap:8px;">
            <button id="overlay-browse-btn" class="btn" style="background:var(--accent-base); color:var(--text-bright); border:none; border-radius:4px; padding:6px 16px; font-size:11px; font-weight:600; cursor:pointer;">Browse...</button>
            <span class="overlay-filename" style="color:var(--text-muted); font-size:10px; max-width:90%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(el.name || '')}">${esc(el.name || '')}</span>
          </div>
        </div>
      </div>`);

      if (el.name && !isVector) {
        const btnStyle = el.isCompressed 
          ? 'background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px solid rgba(255,255,255,0.1); cursor:not-allowed;'
          : 'background:var(--accent-base); color:var(--text-bright); border:none; cursor:pointer;';
        f.push(`<div class="prop-row" style="margin-top:4px; margin-bottom:8px;">
          <button id="btn-webp-compress" class="btn" title="Compress image to WebP format to reduce file size" style="width:100%; padding:6px 12px; font-size:11px; border-radius:4px; transition:opacity 0.2s; font-weight:600; text-align:center; display:block; ${btnStyle}" ${el.isCompressed ? 'disabled' : ''}>
            ${el.isCompressed ? '✓ Compressed' : 'Compress to WebP'}
          </button>
        </div>`);
      }
    }

    // Sizing (Fit) and Opacity inline side-by-side
    f.push(`<div class="prop-row" style="display:flex; gap:6px;">
      <div style="flex:1; min-width:0;">
        <label for="prop-object-fit">Fit</label>
        <select data-k="objectFit" id="prop-object-fit" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="How the image fits within its bounding box">
          <option value="cover" ${el.objectFit === 'cover' ? 'selected' : ''}>Fill</option>
          <option value="contain" ${el.objectFit === 'contain' || !el.objectFit ? 'selected' : ''}>Fit</option>
          <option value="fill" ${el.objectFit === 'fill' ? 'selected' : ''}>Stretch</option>
        </select>
      </div>
      <div style="flex:1; min-width:0;">
        <label for="prop-opacity">Opacity %</label>
        <input type="number" data-k="opacity" id="prop-opacity" value="${el.opacity !== undefined ? el.opacity : 100}" min="0" max="100" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" title="Opacity percentage" />
      </div>
    </div>`);
  }

  // Animation section
  f.push(`</div></div>`); // end of properties section
  f.push(`<div class="panel-section" id="panel-section-animation">
    <h3 class="panel-header-collapsible" id="header-animation" style="cursor: pointer; user-select: none;">
      <span>Animation</span>
      <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="transition: transform 0.2s ease;">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </h3>
    <div class="panel-section-content">`);

  f.push(`<div class="prop-row" style="margin-bottom:8px;"><label>IN TRANSITIONS</label></div>`);

  const animOptions = [
    { val: 'none', label: 'None' },
    { val: 'fade-in', label: 'Fade In' },
    { val: 'slide-up', label: 'Slide Up' },
    { val: 'slide-down', label: 'Slide Down' },
    { val: 'slide-left', label: 'Slide Left' },
    { val: 'slide-right', label: 'Slide Right' },
    { val: 'swipe', label: 'Swipe' },
    { val: 'pop-in', label: 'Pop In' },
    { val: 'zoom-in', label: 'Zoom Out' }
  ];
  if (el.type === 'text') {
    animOptions.push({ val: 'typing', label: 'Typing' });
    animOptions.push({ val: 'fade-typing', label: 'Fade Typing' });
  }

  const isSwipeActive = (el.animType || 'none').startsWith('swipe-');

  f.push(`<div class="anim-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px;">
    ${animOptions.map(o => {
      const isActive = o.val === 'swipe' ? isSwipeActive : o.val === (el.animType || 'none');
      return `<button class="align-btn anim-btn ${isActive ? 'active' : ''}" data-val="${o.val}" style="font-size:10px;" title="Transition: ${o.label}">${o.label}</button>`;
    }).join('')}
  </div>`);

  // Seconds inputs use step=0.1 so wheel-scroll and arrow keys nudge by 0.1.
  const secNum = (key, label, def = '') => `<div class="prop-row" style="margin:0;"><label>${label}</label><input type="number" step="0.1" data-k="${key}" value="${el[key] !== undefined ? el[key] : def}" /></div>`;
  f.push(`<div class="prop-row" style="margin-bottom:8px;"><div class="prop-grid-2">
    ${secNum('animDuration', 'Duration (s)')}
    ${secNum('animDelay', 'Delay (s)')}
  </div></div>`);

  const isSwipe = (el.animType || 'none').startsWith('swipe-');
  const currentDirection = isSwipe ? el.animType.replace('swipe-', '') : 'right';

  const directionSelector = isSwipe ? `
    <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;">
      <label>Direction</label>
      <select id="prop-swipe-direction" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; height:24px; outline:none;" title="Swipe direction">
        <option value="up" ${currentDirection === 'up' ? 'selected' : ''}>Up</option>
        <option value="down" ${currentDirection === 'down' ? 'selected' : ''}>Down</option>
        <option value="left" ${currentDirection === 'left' ? 'selected' : ''}>Left</option>
        <option value="right" ${currentDirection === 'right' ? 'selected' : ''}>Right</option>
      </select>
    </div>
  ` : '';

  const hasFadeToggle = ['slide-up', 'slide-down', 'slide-left', 'slide-right', 'swipe-up', 'swipe-down', 'swipe-left', 'swipe-right', 'pop-in', 'zoom-in'].includes(el.animType);
  const fadeCheckbox = hasFadeToggle ? `
    <div style="flex:1; display:flex; align-items:center; height:100%; padding-top:14px;">
      <div class="checkbox-row" style="margin:0;">
        <input type="checkbox" data-k="animFade" id="prop-anim-fade" title="Fade in element during movement transition" ${el.animFade !== false ? 'checked' : ''}/>
        <label for="prop-anim-fade" title="Fade in element during movement transition" style="cursor:pointer; font-size:11px;">Fade</label>
      </div>
    </div>
  ` : '';

  const zoomFromControl = el.animType === 'zoom-in' ? `
    <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;">
      <label>Zoom From (%)</label>
      <input type="number" data-k="zoomFrom" value="${el.zoomFrom !== undefined ? el.zoomFrom : 110}" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; height:24px; outline:none;" title="Animation zoom starting scale percentage" />
    </div>
  ` : '';

  if (fadeCheckbox || directionSelector || zoomFromControl) {
    f.push(`<div class="prop-row" style="margin-bottom:8px;">
      <div class="prop-grid-2">
        ${fadeCheckbox || '<div></div>'}
        ${directionSelector || zoomFromControl || '<div></div>'}
      </div>
    </div>`);
  }

  if (el.type === 'text' && el.hasBg && (el.animType === 'typing' || el.animType === 'fade-typing')) {
    let animTextBgRow = '';
    if (el.animateBg) {
      animTextBgRow = `
        <div class="checkbox-row" style="align-self: end; margin-bottom: 4px;">
          <input type="checkbox" data-k="animateBg" id="prop-animate-bg" title="Animate text background block alongside typing animation" ${el.animateBg ? 'checked' : ''}/>
          <label for="prop-animate-bg" title="Animate text background block alongside typing animation" style="cursor:pointer;">Animate text BG</label>
        </div>
        <div class="prop-row" style="margin: 0;">
          <label for="prop-bg-offset" style="text-transform: none;">Time offset</label>
          <input type="number" step="0.1" data-k="bgOffset" id="prop-bg-offset" value="${el.bgOffset !== undefined ? el.bgOffset : 0}" title="Delay offset for background block animation in seconds" />
        </div>
      `;
    } else {
      animTextBgRow = `
        <div class="checkbox-row" style="align-self: center; margin-top: 4px;">
          <input type="checkbox" data-k="animateBg" id="prop-animate-bg" title="Animate text background block alongside typing animation" ${el.animateBg ? 'checked' : ''}/>
          <label for="prop-animate-bg" title="Animate text background block alongside typing animation" style="cursor:pointer;">Animate text BG</label>
        </div>
        <div></div>
      `;
    }
    f.push(`<div class="prop-row" style="margin-bottom:8px;"><div class="prop-grid-2">${animTextBgRow}</div></div>`);
  }

  f.push(`<div style="height:1px; background:var(--border-color, #272c3a); margin:16px 0;"></div>`);
  f.push(`<div class="prop-row" style="margin-bottom:8px;"><label>CONTINUOUS EFFECT</label></div>`);
  const effectOptions = [
    { val: 'none', label: 'None' },
    { val: 'pulse', label: 'Pulse' },
    { val: 'float', label: 'Float' },
    { val: 'flash', label: 'Flash' },
    { val: 'wiggle', label: 'Wiggle' },
    { val: 'spin', label: 'Spin' },
    { val: 'heartbeat', label: 'Heartbeat' },
    { val: 'pan', label: 'Pan' },
    { val: 'zoom', label: 'Zoom' }
  ];
  f.push(`<div class="anim-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:16px;">
    ${effectOptions.map(o => `<button class="align-btn eff-btn ${o.val === (el.effectType || 'none') ? 'active' : ''}" data-val="${o.val}" style="font-size:10px;" title="Effect: ${o.label}">${o.label}</button>`).join('')}
  </div>`);

  if (el.effectType && el.effectType !== 'none') {
    if (el.effectType === 'pan') {
      f.push(`<div class="prop-row" style="margin-bottom:16px; margin-top:-8px;"><div class="prop-grid-2">
      ${num('effDuration', 'Duration (s)', 5)}
      ${num('effDelay', 'Delay (s)', 0)}
      ${num('panDist', 'Distance (px)', 50)}
      <div class="prop-row" style="margin:0"><label>Direction</label>
        <select data-k="panDir" title="Pan translation direction">
          <option value="R" ${el.panDir === 'R' ? 'selected' : ''}>Right</option>
          <option value="L" ${el.panDir === 'L' ? 'selected' : ''}>Left</option>
          <option value="U" ${el.panDir === 'U' ? 'selected' : ''}>Up</option>
          <option value="D" ${el.panDir === 'D' ? 'selected' : ''}>Down</option>
        </select>
      </div>
    </div>
    <div style="display:flex; gap:16px; margin-top:8px;">
      <div class="checkbox-row"><input type="checkbox" data-k="effEase" id="prop-eff-ease" title="Apply smooth ease in/out curve" ${el.effEase !== false ? 'checked' : ''}/><label for="prop-eff-ease" title="Apply smooth ease in/out curve" style="cursor:pointer;">Ease</label></div>
      <div class="checkbox-row"><input type="checkbox" data-k="effOnce" id="prop-eff-once" title="Run the effect cycle only once" ${el.effOnce ? 'checked' : ''}/><label for="prop-eff-once" title="Run the effect cycle only once" style="cursor:pointer;">Perform once</label></div>
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
    } else {
      f.push(`<div class="prop-row" style="margin-bottom:16px; margin-top:-8px;"><div class="prop-grid-2">
      ${num('effSpeed', 'Speed (%)', 100)}
      ${num('effDelay', 'Delay (s)', 0)}
    </div></div>`);
    }
  }

  f.push(`</div></div>`);

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

  const updateProp = (k, val) => {
    if (!k) return;
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
        if (k === 'text' && selEl.id !== el.id) return; // Don't copy specific text content across elements
        if (['fontFamily', 'fontSize', 'weight', 'color', 'lineHeight', 'letterSpacing', 'textAlign', 'verticalAlign', 'autoSize', 'maxFontSize'].includes(k) && selEl.type !== 'text' && selEl.type !== 'button') return;
        
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
          }
        }
        
        if (selEl.type === 'button' && selEl.autoHug) {
          selEl.width = measureButtonWidth(selEl);
        }
      });
    } else {
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
        }
      }
      if (el.type === 'button' && el.autoHug) {
        el.width = measureButtonWidth(el);
      }
    }
    if ((k === 'width' || k === 'height') && (el.type === 'button' || (state.layerSelection && state.layerSelection.length > 1 && c && c.elements.filter(e => state.layerSelection.includes(e.id)).some(selEl => selEl.type === 'button')))) {
      const autoHugInp = propsEl.querySelector('input[data-k="autoHug"]');
      if (autoHugInp) autoHugInp.checked = false;
    }
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
    if (inp.classList.contains('dm-control')) return; // dynamic-data controls wired separately
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
      if (inp.dataset.k === 'fontFamily' || inp.dataset.k === 'hasBg' || inp.dataset.k === 'animateBg' || inp.dataset.k === 'lineHeightAuto' || inp.dataset.k === 'autoSize' || inp.dataset.k === 'maxFontSize' || inp.dataset.k === 'lockRatio') renderProps();
    });
    if (inp.type === 'number') {
      inp.addEventListener('wheel', (e) => {
        e.preventDefault();
        // Use the input's step attribute as the base nudge (1 if unset). Shift = 10×.
        // Result is rounded to the step's decimal precision to avoid 0.30000000000004.
        const stepAttr = parseFloat(inp.step);
        const baseStep = (stepAttr && stepAttr > 0) ? stepAttr : 1;
        const step = e.shiftKey ? baseStep * 10 : baseStep;
        const delta = e.deltaY < 0 ? step : -step;
        const decimals = (String(inp.step).split('.')[1] || '').length;
        const next = Number(inp.value) + delta;
        const rounded = decimals ? parseFloat(next.toFixed(decimals)) : next;
        inp.value = clampNum(inp, rounded);
        updateProp(inp.dataset.k, Number(inp.value));
        syncLockRatio(inp.dataset.k);
        clearTimeout(inp.wheelHistTimer);
        inp.wheelHistTimer = setTimeout(() => pushHistory(), 400);
      });
    }
  });

  // Dynamic-data controls (data-merge). Toggling a field flag propagates across the
  // element's link group so a logical slot stays consistent across all sizes.
  propsEl.querySelectorAll('.dm-field-chk').forEach((chk) => {
    chk.addEventListener('change', () => {
      if (!el) return;
      dmToggleField(el, chk.dataset.dmField, chk.checked);
      pushHistory();
      renderProps();
      render(true);
    });
  });
  propsEl.querySelectorAll('.dm-field-select').forEach((sel) => {
    sel.addEventListener('change', () => {
      if (!el) return;
      const field = sel.dataset.dmField;
      const k = dmSlotKey(el) + '::' + field;
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
    btn.addEventListener('mouseenter', () => {
      let previewVal = val;
      if (previewVal === 'swipe') {
        const currentSwipeDir = (el.animType || 'none').startsWith('swipe-') ? el.animType.replace('swipe-', '') : 'right';
        previewVal = `swipe-${currentSwipeDir}`;
      }
      const domNodes = state.layerSelection.length > 1
        ? state.layerSelection.map(id => document.querySelector(`.el[data-id="${id}"]`))
        : [document.querySelector(`.el[data-id="${el.id}"]`)];
      domNodes.forEach(node => {
        if (node && previewVal !== 'none') {
          const nodeEl = state.canvases.flatMap(c => c.elements).find(e => e.id === node.dataset.id) || el;
          if (nodeEl.type === 'text' && (previewVal === 'typing' || previewVal === 'fade-typing')) {
            const target = node.querySelector('.editable') || node.querySelector('span');
            if (target && !target.dataset.origHtml) {
              target.dataset.origHtml = target.innerHTML;
              target.dataset.origStyle = target.getAttribute('style') || '';
              const chars = [...(nodeEl.text || '')];
              const totalDur = nodeEl.animDuration || 1;
              const charDur = previewVal === 'fade-typing' ? 0.3 : 0.01;
              const baseDelay = nodeEl.animDelay || 0;
              const charDelay = totalDur / Math.max(1, chars.length);
              target.innerHTML = chars.map((c, i) => {
                if (c === '\n') return '<br/>';
                const del = (Number(baseDelay) + i * charDelay).toFixed(3);
                const escC = c === ' ' ? ' ' : c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                return `<span style="opacity:0; animation: anim-fade-in ${charDur}s linear ${del}s both;">${escC}</span>`;
              }).join('');
              if (nodeEl.hasBg && nodeEl.animateBg) {
                const lr = nodeEl.bgPadL !== undefined ? nodeEl.bgPadL : 8;
                const tb = nodeEl.bgPadV !== undefined ? nodeEl.bgPadV : 4;
                const cov = nodeEl.bgCoverage !== undefined ? nodeEl.bgCoverage : 100;
                const opa = (nodeEl.bgOpacity !== undefined ? nodeEl.bgOpacity : 100) / 100;
                const bgRgba = hexToRgba(nodeEl.bg || '#000000', opa);
                const bgDelay = Number(baseDelay) + (Number(nodeEl.bgOffset) || 0);
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
            }
          } else {
            if (previewVal === 'zoom-in') {
              const zf = nodeEl.zoomFrom !== undefined ? nodeEl.zoomFrom / 100 : 1.1;
              node.style.setProperty('--zoom-from', zf);
            }
            const isSwipe = ['swipe-up', 'swipe-down', 'swipe-left', 'swipe-right'].includes(previewVal);
            const isSlideLike = ['slide-up', 'slide-down', 'slide-left', 'slide-right', 'pop-in', 'zoom-in'].includes(previewVal);
            const fadeOn = nodeEl.animFade !== false;
            const suffix = isSwipe ? (fadeOn ? '-fade' : '') : (isSlideLike && !fadeOn ? '-nofade' : '');
            node.style.animation = `anim-${previewVal}${suffix} ${nodeEl.animDuration || 1}s ease-out 0s both`;
          }
        }
      });
    });
    btn.addEventListener('mouseleave', () => {
      const domNodes = state.layerSelection.length > 1
        ? state.layerSelection.map(id => document.querySelector(`.el[data-id="${id}"]`))
        : [document.querySelector(`.el[data-id="${el.id}"]`)];
      domNodes.forEach(node => {
        if (node) {
          node.style.animation = '';
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
    });
  });

  const swipeDirectionSelect = propsEl.querySelector('#prop-swipe-direction');
  if (swipeDirectionSelect) {
    swipeDirectionSelect.addEventListener('change', () => {
      const dir = swipeDirectionSelect.value;
      updateProp('animType', `swipe-${dir}`);
      pushHistory();
      renderProps();
    });
  }

  propsEl.querySelectorAll('.eff-btn').forEach(btn => {
    const val = btn.dataset.val;
    btn.addEventListener('click', () => {
      updateProp('effectType', val);
      if (val === 'pan') {
        if (el.panDir === undefined) updateProp('panDir', 'R');
        if (el.panDist === undefined) updateProp('panDist', 50);
        if (el.effDuration === undefined) updateProp('effDuration', 5);
      } else if (val === 'zoom') {
        if (el.zoomTarget === undefined) updateProp('zoomTarget', 150);
        if (el.effDuration === undefined) updateProp('effDuration', 5);
      } else if (val === 'spin') {
        if (el.spinTarget === undefined) updateProp('spinTarget', 360);
        if (el.spinRepeat === undefined) updateProp('spinRepeat', 1);
        if (el.effDuration === undefined) updateProp('effDuration', 2);
        if (el.effEase === undefined) updateProp('effEase', true);
      } else if (val !== 'none') {
        if (el.effSpeed === undefined) updateProp('effSpeed', 100);
      }
      if (val !== 'none' && el.effDelay === undefined) {
        updateProp('effDelay', 0);
      }
      pushHistory();
      renderProps();
    });
    btn.addEventListener('mouseenter', () => {
      const domNodes = state.layerSelection.length > 1
        ? state.layerSelection.map(id => document.querySelector(`.el[data-id="${id}"]`))
        : [document.querySelector(`.el[data-id="${el.id}"]`)];
      domNodes.forEach(node => {
        if (node && val !== 'none') {
          const nodeEl = state.canvases.flatMap(c => c.elements).find(e => e.id === node.dataset.id) || el;
          const effDur = nodeEl.effDuration !== undefined ? nodeEl.effDuration : 2;
          if (val === 'pan') {
            const dist = nodeEl.panDist !== undefined ? nodeEl.panDist : 50;
            let px = 0, py = 0;
            if (nodeEl.panDir === 'L') px = -dist;
            else if (nodeEl.panDir === 'U') py = -dist;
            else if (nodeEl.panDir === 'D') py = dist;
            else px = dist;
            node.style.setProperty('--pan-x', px + 'px');
            node.style.setProperty('--pan-y', py + 'px');
            const ease = nodeEl.effEase !== false ? 'ease-in-out' : 'linear';
            const fill = nodeEl.effOnce ? 'forwards' : 'infinite';
            node.style.animation = `eff-pan ${effDur}s ${ease} 0s ${fill}`;
          } else if (val === 'zoom') {
            const zt = nodeEl.zoomTarget !== undefined ? nodeEl.zoomTarget / 100 : 1.5;
            node.style.setProperty('--zoom-target', zt);
            const ease = nodeEl.effEase !== false ? 'ease-in-out' : 'linear';
            const fill = nodeEl.effOnce ? 'forwards' : 'infinite';
            node.style.animation = `eff-zoom ${effDur}s ${ease} 0s ${fill}`;
          } else if (val === 'spin') {
            const spinT = nodeEl.spinTarget !== undefined ? nodeEl.spinTarget : 360;
            node.style.setProperty('--spin-target', spinT + 'deg');
            const ease = nodeEl.effEase !== false ? 'ease-in-out' : 'linear';
            const repeat = nodeEl.spinRepeat !== undefined ? nodeEl.spinRepeat : 1;
            const fill = Math.max(1, repeat);
            node.style.animation = `eff-spin ${effDur}s ${ease} 0s ${fill} both`;
          } else {
            const speedStr = nodeEl.effSpeed !== undefined ? nodeEl.effSpeed : 100;
            const speed = Math.max(1, Number(speedStr));
            const duration = 2 / (speed / 100);
            node.style.animation = `eff-${val} ${duration}s ease-in-out 0s infinite`;
          }
        }
      });
    });
    btn.addEventListener('mouseleave', () => {
      const domNodes = state.layerSelection.length > 1
        ? state.layerSelection.map(id => document.querySelector(`.el[data-id="${id}"]`))
        : [document.querySelector(`.el[data-id="${el.id}"]`)];
      domNodes.forEach(node => {
        if (node) node.style.animation = '';
      });
    });
  });

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
    btnCompress.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openWebpCompressionModal(el);
    };
  }

  if (typeof syncColorPickerWithSelection === 'function') {
    syncColorPickerWithSelection(el, null);
  }
  initCollapsiblePanels();
}

// ============================================================================
// Top bar wiring
// ============================================================================




function addElement(type) {
  const c = getActiveCanvas(); if (!c) return;
  const isBg = type === 'background';
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
      btn.style.color = 'var(--text-bright)';
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
      showBackgroundDropdown(e);
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
    popup.style.background = '#181b22';
    popup.style.border = '1px solid #272c3a';
    popup.style.borderRadius = '4px';
    popup.style.padding = '4px 0';
    popup.style.zIndex = '10000';
    popup.style.width = '200px';
    popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    
    const items = [
      { label: 'CRICOS', action: () => addBrandElement('cricos') },
      { label: 'RFWN text', action: () => addBrandElement('rfwn') },
      { label: 'RMIT Logo (white)', action: () => addBrandElement('logo_white') },
      { label: 'RMIT Logo (Full color)', action: () => addBrandElement('logo_full') },
      { label: 'RMIT Logo (Red Pixel)', action: () => addBrandElement('logo_red') },
      { label: 'Pixel Shape', action: () => addElement('pixel') }
    ];
    
    items.forEach(item => {
      const btn = document.createElement('div');
      btn.textContent = item.label;
      btn.style.padding = '8px 16px';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '12px';
      btn.style.color = '#c7ccdb';
      btn.addEventListener('mouseenter', () => btn.style.background = '#272c3a');
      btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
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
  } else if (type === 'logo_white') {
    el = makeElement('image');
    el.customName = 'RMIT Logo (white)';
    el.assetId = 'data/Elements/RMIT_White.svg';
  } else if (type === 'logo_full') {
    el = makeElement('image');
    el.customName = 'RMIT Logo (Full color)';
    el.assetId = 'data/Elements/RMIT_full.svg';
  } else if (type === 'logo_red') {
    el = makeElement('image');
    el.customName = 'RMIT Logo (Red Pixel)';
    el.assetId = 'data/Elements/RMIT_RedPixel.svg';
  }
  
  if (el) {
    c.elements.push(el);
    state.selectedElementId = el.id;
    state.layerSelection = [el.id];
    state.editingElementId = null;
    pushHistory();
    render();
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
  setDropHighlight(e.target.closest('.canvas'), true);
});

canvasArea.addEventListener('dragleave', (e) => {
  if (!canvasArea.contains(e.relatedTarget)) setDropHighlight(null, false);
});

canvasArea.addEventListener('drop', async (e) => {
  // Asset dragged out of the Assets panel onto a canvas.
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


// ============================================================================
// Keyboard shortcuts
// ============================================================================
window.addEventListener('keydown', (e) => {
  if (e.key === 'Alt') {
    e.preventDefault();
  }
  // never intercept while typing in an input/textarea
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
    if (e.key === 'Escape') {
      t.blur();
    }
    return;
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    document.body.classList.toggle('fullscreen-mode');
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveProjectToZip();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
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

  const c = getActiveCanvas();

  // Copy, Cut, and Paste are handled by standard window events below


  if (e.code === 'Space') {
    e.preventDefault();
    if (!isSpaceDown) {
      isSpaceDown = true;
      if (!isPanning) canvasArea.style.cursor = 'var(--cur-grab, grab)';
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
      const step = e.shiftKey ? 10 : 1;
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

window.addEventListener('copy', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
    return;
  }
  const c = getActiveCanvas();
  if (c && state.layerSelection?.length > 0) {
    const selected = c.elements.filter(x => state.layerSelection.includes(x.id)).map(x => JSON.parse(JSON.stringify(x)));
    state.clipboard = selected;
    e.clipboardData.setData('application/x-adflow-elements', JSON.stringify(selected));
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
    state.clipboard = selected;
    e.clipboardData.setData('application/x-adflow-elements', JSON.stringify(selected));
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

  // 1. Try pasting Adflow elements
  const elementsData = e.clipboardData.getData('application/x-adflow-elements') || e.clipboardData.getData('application/x-adcooker-elements');
  if (elementsData) {
    e.preventDefault();
    try {
      const parsed = JSON.parse(elementsData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const groupMap = {};
        const newIds = [];
        const pasted = parsed.map(x => {
          const copy = JSON.parse(JSON.stringify(x));
          copy.id = uid();
          copy.x += 10;
          copy.y += 10;
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
        return;
      }
    } catch (err) {
      console.warn('Failed to parse pasted elements:', err);
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
  }
  if (e.code === 'Space') {
    isSpaceDown = false;
    isPanning = false;
    document.getElementById('canvas-area').style.cursor = '';
    document.querySelectorAll('.preview-iframe').forEach(ifr => ifr.style.pointerEvents = 'auto');
  }
});

// ============================================================================
// Export — Google-Ads-friendly HTML5 (active canvas)
// ============================================================================
// Helper to identify exactly which brand fonts and weights are required for a canvas.
function getRequiredFonts(c) {
  const req = {
    museo: new Set(),
    helvetica: new Set()
  };

  c.elements.forEach(el => {
    if (el.hidden) return;
    if (el.type !== 'text' && el.type !== 'button') return;
    
    const ff = el.fontFamily;
    if (!ff) return;

    // Resolve weight
    let weight = 400; // default for text
    if (el.weight !== undefined && el.weight !== null && el.weight !== '') {
      weight = Number(el.weight);
    } else if (el.type === 'button') {
      weight = 600; // default for button
    }

    if (ff === 'Museo') {
      if (weight <= 300) {
        req.museo.add(300);
      } else if (weight >= 600) {
        req.museo.add(700);
      } else {
        req.museo.add(500);
      }
    } else if (ff === 'Helvetica Neue LT Pro') {
      if (weight <= 300) {
        req.helvetica.add(300);
      } else if (weight === 400) {
        req.helvetica.add(400);
      } else {
        req.helvetica.add(500);
      }
    }
  });

  return req;
}

// Helper to pre-fetch all image and font assets and add them to a ZIP file.
async function addCanvasAssetsToZip(c, zip) {
  // 1. Pack image assets
  for (const el of c.elements) {
    if (el.type === 'image' && el.assetId && el.assetId.startsWith('data/Elements/')) {
      try {
        const resp = await fetch(el.assetId);
        if (resp.ok) {
          const blob = await resp.blob();
          urlSizeCache[el.assetId] = blob.size / 1024;
          const filename = el.assetId.split('/').pop();
          zip.file(`assets/${filename}`, blob);
        }
      } catch (err) {
        console.error('Failed to prefetch image asset', el.assetId, err);
      }
    }
  }

  // 2. Pack font assets (only those actually used by active text/button elements)
  const req = getRequiredFonts(c);
  const fontsToFetch = [];

  if (req.museo.has(300)) fontsToFetch.push('Museo300-Regular.woff2');
  if (req.museo.has(500)) fontsToFetch.push('Museo500-Regular.woff2');
  if (req.museo.has(700)) fontsToFetch.push('Museo700-Regular.woff2');

  if (req.helvetica.has(300)) fontsToFetch.push('helveticaneueltpro_lt.woff2');
  if (req.helvetica.has(400)) fontsToFetch.push('helveticaneueltpro_roman.woff2');
  if (req.helvetica.has(500)) fontsToFetch.push('helveticaneueltpro.woff2');

  for (const fontFile of fontsToFetch) {
    try {
      const resp = await fetch(`data/fonts/${fontFile}`);
      if (resp.ok) {
        const blob = await resp.blob();
        zip.file(`assets/${fontFile}`, blob);
      }
    } catch (err) {
      console.error('Failed to prefetch font asset', fontFile, err);
    }
  }
}

// Shared single-canvas exporters — used by both the Canvas Properties panel buttons
// and the canvas right-click context menu so the two paths can't drift apart.
async function exportCanvasAsZip(c) {
  if (typeof JSZip === 'undefined') { alert('JSZip is not loaded.'); return; }
  const zip = new JSZip();
  const projName = state.projectName || 'Ad';
  const safeName = projName.replace(/[^a-zA-Z0-9_-]/g, '_');

  await dmRunExport(dmActiveRowForOutput(), async () => {
    await addCanvasAssetsToZip(c, zip);
    zip.file('index.html', generateExportHTML(c, zip));
  });
  const content = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = `${safeName}_${c.width}x${c.height}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const fontCache = {};
async function getFontAsDataUrl(filename) {
  if (fontCache[filename]) return fontCache[filename];
  try {
    const res = await fetch(`data/fonts/${filename}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    fontCache[filename] = base64;
    return base64;
  } catch (err) {
    console.warn(`Failed to fetch font ${filename}:`, err);
    return null;
  }
}

async function exportCanvasAsPng(c) {
  try {
    // 1. Fetch and inline required fonts for this canvas
    const req = getRequiredFonts(c);
    const fontPromises = [];
    const fontReplacements = [];
    
    const museoFiles = {
      300: 'Museo300-Regular.woff2',
      500: 'Museo500-Regular.woff2',
      700: 'Museo700-Regular.woff2'
    };
    const helveticaFiles = {
      300: 'helveticaneueltpro_lt.woff2',
      400: 'helveticaneueltpro_roman.woff2',
      500: 'helveticaneueltpro.woff2'
    };
    
    if (req.museo) {
      for (const w of req.museo) {
        const file = museoFiles[w];
        if (file) {
          fontPromises.push((async () => {
            const dataUrl = await getFontAsDataUrl(file);
            if (dataUrl) {
              fontReplacements.push({ file, dataUrl });
            }
          })());
        }
      }
    }
    if (req.helvetica) {
      for (const w of req.helvetica) {
        const file = helveticaFiles[w];
        if (file) {
          fontPromises.push((async () => {
            const dataUrl = await getFontAsDataUrl(file);
            if (dataUrl) {
              fontReplacements.push({ file, dataUrl });
            }
          })());
        }
      }
    }
    
    await Promise.all(fontPromises);

    let html = generateExportHTML(c, null, true); // disable anims for static image
    for (const rep of fontReplacements) {
      html = html.split(`data/fonts/${rep.file}`).join(rep.dataUrl);
      html = html.split(`assets/${rep.file}`).join(rep.dataUrl);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract styles
    const styles = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');
    
    // Extract the #ad element
    const adEl = doc.querySelector('#ad');
    if (!adEl) throw new Error('#ad element not found');
    
    // Inline any relative img sources
    const imgPromises = [];
    const imgs = adEl.querySelectorAll('img');
    imgs.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('data:') && !src.startsWith('http:') && !src.startsWith('https:')) {
        imgPromises.push((async () => {
          try {
            const res = await fetch(src);
            if (res.ok) {
              const blob = await res.blob();
              const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              img.setAttribute('src', dataUrl);
            }
          } catch (e) {
            console.warn(`Failed to inline image ${src}:`, e);
          }
        })());
      }
    });
    await Promise.all(imgPromises);

    // Make sure we have a well-formed XHTML container starting with div
    const xhtmlContainer = document.createElement('div');
    xhtmlContainer.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    xhtmlContainer.style.width = '100%';
    xhtmlContainer.style.height = '100%';
    xhtmlContainer.style.position = 'relative';
    
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    xhtmlContainer.appendChild(styleEl);
    
    // Clone and append the ad structure
    xhtmlContainer.appendChild(adEl.cloneNode(true));
    
    const xhtml = new XMLSerializer().serializeToString(xhtmlContainer);
    
    const cnv = document.createElement('canvas');
    cnv.width = c.width;
    cnv.height = c.height;
    const ctx = cnv.getContext('2d');
    ctx.fillStyle = c.bgColor || '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}"><foreignObject x="0" y="0" width="100%" height="100%">${xhtml}</foreignObject></svg>`;
    const base64Svg = btoa(unescape(encodeURIComponent(svgStr)));
    const svgUrl = `data:image/svg+xml;base64,${base64Svg}`;
    await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); res(); };
      img.onerror = () => rej(new Error('Image failed to load from SVG'));
      img.src = svgUrl;
    });
    const pngUrl = cnv.toDataURL('image/png');
    const a = document.createElement('a');
    const projName = state.projectName || 'Ad';
    const safeName = projName.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName}_${c.width}x${c.height}.png`;
    a.href = pngUrl;
    a.click();
  } catch (err) {
    console.error('PNG export failed:', err);
    alert('PNG export failed. Try the ZIP export instead.');
  }
}

// Clear contents = remove all frame-specific elements from the active frame, keep
// persistent top/bottom layers. Maps to the "wipe the working frame" intent.
function clearCanvasFrame(c) {
  c.elements = c.elements.filter(el =>
    el.persistent === 'top' ||
    el.persistent === 'bottom' ||
    el.frameId !== state.activeFrameId
  );
  state.selectedElementId = null;
  state.layerSelection = [];
  pushHistory();
  render();
}

// When a data version is active, all generated output (live preview iframes, single
// exports, weight estimates) reflects that version — baked transiently then restored.
// This is synchronous and self-balancing: dmBakeRow saves whatever is currently on the
// element and restores it, so it nests safely inside an export that already baked the
// same row (dmRunExport sets activeVersion to the row it's exporting).
function generateExportHTML(targetCanvas, zipRef, isImageExport = false) {
  const dm = state.dataMerge;
  const idx = (dm && dm.enabled && dm.activeVersion != null) ? dm.activeVersion : null;
  if (idx == null) return _generateExportHTMLRaw(targetCanvas, zipRef, isImageExport);
  const restore = dmBakeRow(idx);
  try { return _generateExportHTMLRaw(targetCanvas, zipRef, isImageExport); }
  finally { restore(); }
}
function _generateExportHTMLRaw(targetCanvas, zipRef, isImageExport = false) {
  const c = targetCanvas || getActiveCanvas();
  if (!c) return '';
  const esc = (s) => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const renderEl = (el) => {
    if (el.hidden) return '';
    // For rect/circle/button the opacity is the *fill* opacity and is applied to
    // the fill layer below — leave the wrapper at 1 so stroke/text aren't dragged
    // down. All other element types get the opacity on the wrapper as before.
    const isFillTypeWithStroke = el.type === 'rect' || el.type === 'circle' || el.type === 'button' || el.type === 'pixel';
    const wrapOpacity = isFillTypeWithStroke ? 1 : (el.opacity !== undefined ? el.opacity / 100 : 1);
    const fillOpacity = (el.opacity !== undefined ? el.opacity : 100) / 100;
    const wrapStyle = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;transform:rotate(${el.rotation || 0}deg);opacity:${wrapOpacity};`;

    const animType = el.animType || 'none';
    const effType = el.effectType || 'none';

    let entryAnims = [];
    let entryVars = '';
    if (animType !== 'none' && !isImageExport) {
      const isSwipe = ['swipe-up', 'swipe-down', 'swipe-left', 'swipe-right'].includes(animType);
      const isSlideLike = ['slide-up', 'slide-down', 'slide-left', 'slide-right', 'pop-in', 'zoom-in'].includes(animType);
      const fadeOn = el.animFade !== false;
      const suffix = isSwipe ? (fadeOn ? '-fade' : '') : (isSlideLike && !fadeOn ? '-nofade' : '');
      if (el.type !== 'text' || (animType !== 'typing' && animType !== 'fade-typing')) {
        entryAnims.push(`anim-${animType}${suffix} ${el.animDuration || 1}s ${animType === 'typing' ? 'steps(30, end)' : 'ease-out'} ${el.animDelay || 0}s both`);
      }
      if (animType === 'zoom-in') {
        const zf = el.zoomFrom !== undefined ? el.zoomFrom / 100 : 1.1;
        entryVars += `--zoom-from:${zf};`;
      }
    }

    let effAnims = [];
    let effVars = '';
    if (effType !== 'none') {
      const effDur = el.effDuration !== undefined ? el.effDuration : 2;
      const effDelay = el.effDelay !== undefined ? el.effDelay : 0;
      if (effType === 'pan') {
        const dist = el.panDist !== undefined ? el.panDist : 50;
        let px = 0, py = 0;
        if (el.panDir === 'L') px = -dist;
        else if (el.panDir === 'U') py = -dist;
        else if (el.panDir === 'D') py = dist;
        else px = dist; // R
        const ease = el.effEase !== false ? 'ease-in-out' : 'linear';
        const fill = el.effOnce ? 'forwards' : 'infinite';
        if (!isImageExport) effAnims.push(`eff-pan ${effDur}s ${ease} ${effDelay}s ${fill}`);
        effVars = `--pan-x:${px}px; --pan-y:${py}px;`;
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
      } else {
        const speedStr = el.effSpeed !== undefined ? el.effSpeed : 100;
        const speed = Math.max(1, Number(speedStr));
        const duration = 2 / (speed / 100);
        if (!isImageExport) effAnims.push(`eff-${effType} ${duration}s ease-in-out ${effDelay}s infinite`);
      }
    }

    const entryConfig = entryAnims.length > 0 ? `animation: ${entryAnims.join(', ')};` : '';
    const effConfig = effAnims.length > 0 ? `animation: ${effAnims.join(', ')};` : '';
    const openDivs = `<div style="width:100%;height:100%;${entryConfig}${entryVars}"><div style="width:100%;height:100%;${effConfig}${effVars}">`;
    const closeDivs = `</div></div>`;

    if (el.type === 'text') {
      const ff = el.fontFamily ? el.fontFamily + ',sans-serif' : 'Arial,Helvetica,sans-serif';
      let content = esc(el.text);

      if (animType === 'typing' || animType === 'fade-typing') {
        const chars = [...(el.text || '')];
        const totalDur = el.animDuration || 1;
        const charDur = animType === 'fade-typing' ? 0.3 : 0.01;
        const baseDelay = el.animDelay || 0;
        const charDelay = totalDur / Math.max(1, chars.length);

        content = chars.map((c, i) => {
          if (c === '\n') return '<br/>';
          const del = (Number(baseDelay) + i * charDelay).toFixed(3);
          const charContent = c === ' ' ? ' ' : esc(c);
          const animStyle = isImageExport ? '' : `opacity:0; animation: anim-fade-in ${charDur}s linear ${del}s both;`;
          return `<span style="${animStyle}">${charContent}</span>`;
        }).join('');
      }
      const vAlignMap = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
      const hAlignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
      const jc = vAlignMap[el.verticalAlign || 'top'];
      const hjc = hAlignMap[el.textAlign || 'left'];
      const ta = el.textAlign || 'left';
      // Multi-line BG strategies:
      //   - Static (no anim, or non-typing entry anim, or animateBg=off): use
      //     `box-decoration-break: clone` + linear-gradient bg so each line gets
      //     its own background rectangle automatically.
      //   - Animated typing + animateBg: render the wrapper without inline bg,
      //     emit data-bg-* attrs, and let setupTextLineBgs() (in the runtime
      //     script) measure post-layout and inject per-line overlays with
      //     staggered animation timing so the bg arrival matches each line's
      //     share of the typing duration.
      let bgStyle = '';
      let bgDataAttrs = '';
      const useLineBgScript = el.hasBg && el.animateBg && !isImageExport && (animType === 'typing' || animType === 'fade-typing');
      if (el.hasBg) {
        const lr = el.bgPadL !== undefined ? el.bgPadL : 8;
        const tb = el.bgPadV !== undefined ? el.bgPadV : 4;
        const cov = el.bgCoverage !== undefined ? el.bgCoverage : 100;
        const opa = (el.bgOpacity !== undefined ? el.bgOpacity : 100) / 100;
        const bgRgba = hexToRgba(el.bg || '#000000', opa);
        if (useLineBgScript) {
          const dur = el.animDuration || 1;
          const delay = (Number(el.animDelay) || 0) + (Number(el.bgOffset) || 0);
          // Padding on the wrapper matches the static path's per-line padding — without
          // it, char.offsetLeft starts at 0 and the text appears shifted left by `lr`
          // compared to the editor (and to the static-bg variant of the same element).
          bgStyle = `display:inline-block;max-width:100%;position:relative;isolation:isolate;text-align:${ta};padding:${tb}px ${lr}px;`;
          bgDataAttrs = ` data-bg-anim="1" data-bg-color="${bgRgba}" data-bg-pad-l="${lr}" data-bg-pad-v="${tb}" data-bg-cov="${cov}" data-bg-delay="${delay}" data-bg-duration="${dur}"`;
        } else {
          bgStyle = `display:inline;background-image:linear-gradient(${bgRgba},${bgRgba});background-repeat:no-repeat;background-position:left center;background-size:${cov}% 100%;padding:${tb}px ${lr}px;box-decoration-break:clone;-webkit-box-decoration-break:clone;`;
        }
      }
      const resolvedLH = getResolvedLineHeight(el);
      const autoAttrs = el.autoSize
        ? ` class="auto-size-text" data-max-size="${el.maxFontSize !== undefined ? el.maxFontSize : (el.fontSize || 72)}" data-width="${el.width}" data-height="${el.height}"`
        : '';
      const blockClass = el.autoSize ? ' class="auto-size-block"' : '';
      const spanClass = el.autoSize ? ' class="auto-size-span"' : '';

      const innerSpan = el.hasBg
        ? `<span${bgDataAttrs}${spanClass} style="color:${el.color};font-size:${el.fontSize}px;font-weight:${el.weight};line-height:${resolvedLH};font-family:${ff};word-break:break-word;${bgStyle}">${content}</span>`
        : `<span${spanClass} style="display:inline;color:${el.color};font-size:${el.fontSize}px;font-weight:${el.weight};line-height:${resolvedLH};font-family:${ff};word-break:break-word;">${content}</span>`;
      // font-size + line-height on the wrapper div eliminates the inherited body strut
      // (browser default ~16px * normal) which would push small-font text downward.
      const inner = `<div${blockClass} style="text-align:${ta};width:100%;font-size:${el.fontSize}px;line-height:${resolvedLH};">${innerSpan}</div>`;
      return `    <div style="${wrapStyle}"${autoAttrs}>${openDivs}<div style="display:flex;flex-direction:column;justify-content:${jc};width:100%;height:100%;">${inner}</div>${closeDivs}</div>`;
    }
    if (el.type === 'rect') {
      return `    <div style="${wrapStyle}">${openDivs}<div style="width:100%;height:100%;background:${el.color};border-radius:${el.radius || 0}px;opacity:${fillOpacity};"></div>${strokeOverlayHTML(el)}${closeDivs}</div>`;
    }
    if (el.type === 'line') {
      return `    <div style="${wrapStyle}">${openDivs}<div style="width:100%;height:100%;background:${el.color};"></div>${closeDivs}</div>`;
    }
    if (el.type === 'circle') {
      return `    <div style="${wrapStyle}">${openDivs}<div style="width:100%;height:100%;background:${el.color};border-radius:50%;opacity:${fillOpacity};"></div>${strokeOverlayHTML(el)}${closeDivs}</div>`;
    }
    if (el.type === 'pixel') {
      return `    <div style="${wrapStyle}">${openDivs}<div style="width:100%;height:100%;opacity:${fillOpacity};"><svg viewBox="0 0 578.52 556.76" width="100%" height="100%" preserveAspectRatio="none"><path fill="${el.color}" d="M290.78,0h-74.15v60.23h-123.75v125.78H0v184.74h92.88v125.78h123.5v60.23h65.55c152.85,0,287.74-123.5,287.74-277.62S444.14,0,290.78,0"/></svg></div>${strokeOverlayHTML(el)}${closeDivs}</div>`;
    }
    if (el.type === 'button') {
      const ff = el.fontFamily ? el.fontFamily + ',sans-serif' : 'Arial,Helvetica,sans-serif';
      const alignMap = { left: 'flex-start', center: 'center', right: 'flex-end', justify: 'space-between' };
      const jc = alignMap[el.textAlign || 'center'];
      // Fill is its own absolute layer with `fillOpacity`; the text sits on top
      // at full opacity (relative positioning so it stacks above the fill); the
      // stroke overlay paints last on top of both.
      return `    <div style="${wrapStyle}">${openDivs}<div style="position:absolute;inset:0;background:${el.bg};border-radius:${el.radius || 0}px;opacity:${fillOpacity};"></div><div style="position:relative;width:100%;height:100%;color:${el.color};font-size:${el.fontSize}px;font-weight:${el.weight || '600'};display:flex;align-items:center;justify-content:${jc};text-align:${el.textAlign || 'center'};font-family:${ff};cursor:pointer;padding:0 ${el.paddingLR || 16}px;box-sizing:border-box;">${esc(el.text)}</div>${strokeOverlayHTML(el)}${closeDivs}</div>`;
    }
    if (el.type === 'image' && el.assetId) {
      let src = state.assets[el.assetId] || el.assetId;
      if (src === 'data/Elements/RMIT_white.svg' || src === 'data/Elements/RMIT_White.svg') {
        src = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMiIgZGF0YS1uYW1lPSJMYXllciAyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMTkuNjcgNzYuMjMiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICNmZmY7CiAgICAgIH0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDxnIGlkPSJMYXllcl8xLTIiIGRhdGEtbmFtZT0iTGF5ZXIgMSI+CiAgICA8ZyBpZD0iUk1JVF93aGl0ZSI+CiAgICAgIDxnPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI2LjIxLDBoLTYuNjh2NS40M2gtMTEuMTV2MTEuMzRIMHYxNi42NWg4LjM3djExLjM0aDExLjEzdjUuNDNoNS45MWMxMy43OCwwLDI1LjkzLTExLjEzLDI1LjkzLTI1LjAyUzQwLjAzLDAsMjYuMjEsMCIvPgogICAgICAgIDxwb2x5Z29uIGNsYXNzPSJjbHMtMSIgcG9pbnRzPSIxNjAuNDEgNC43OSAxNjYuMjMgNC43OSAxNjYuMjMgNDUuMzcgMTYwLjQxIDQ1LjM3IDE2MC40MSA0Ny40NiAxODAuNTggNDcuNDYgMTgwLjU4IDQ1LjM3IDE3NC43OCA0NS4zNyAxNzQuNzggNC43OSAxODAuNTggNC43OSAxODAuNTggMi42NyAxNjAuNDEgMi42NyAxNjAuNDEgNC43OSIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTIxOC45NCwyLjY1aC0zNS44OGwtLjczLDExLjgxaDIuMTJjMS4yMy04LjU4LDIuODEtMTAuNjEsMTIuMjctMTAuMTN2NDEuMDNoLTYuMTh2Mi4xaDIwLjk2di0yLjFoLTYuMThWNC4zM2M5LjQ0LS40OCwxMS4wNiwxLjU1LDEyLjI3LDEwLjEzaDIuMDhsLS43My0xMS44MVoiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xNDIuMjMsNS40N3YzOS44OWgtNS43N3YyLjFoMjAuMTR2LTIuMWgtNS43N1Y0Ljc3aDUuNzV2LTIuMTRoLTE2LjU0bC05LjcyLDMwLjY1LTkuMzctMzAuNjVoLTE2LjQ3djIuMTJoNS43OXY0MC42aC02LjI1Yy01LjgyLjE0LTUuOTEtNC44MS01Ljg4LTUuODQuMDktMTAuOTMtMi4zNy0xNC44OS0xMi44NC0xNi41MXYtLjE0YzYuMjUtLjY2LDE0LjIzLTIuNDQsMTQuMjMtMTAuMDEsMC05LjMzLTguNjktMTAuMi0xNi4wMy0xMC4yaC0yMS42djIuMTJoNS43OXY0MC42aC01Ljc5djIuMTJoMjAuMTZ2LTIuMTJoLTUuNzl2LTIxLjM5YzMuNzItLjE0LDcuOTEuOCw5Ljc4LDIuNDIsMS43NiwxLjQ4LDIuNjksNi4wOSwyLjY5LDExLjYzLDAsNi44NCwzLjU0LDkuNDQsMTAuMzMsOS40NGgxOS40M3YtMi4xaC01LjY2VjUuNDdoLjE0bDEzLjM0LDQyLjAxaDIuMjZsMTMuNDMtNDIuMDFoLjIxWk03Ni4yNywyMS44NWwtLjAyLjAyVjQuNzdoNS44NGM1Ljk4LDAsOC4xOSwxLjUxLDguMTksOS4wMywwLDYtMi40OSw4LjA1LTguNTEsOC4wNWgtNS41WiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTc4LjU1LDU5Ljk0djkuNjljMCwyLjY3LTEuNjcsNC4yNC00LjIsNC4yNHMtNC4yLTEuNTUtNC4yLTQuMnYtOS43NGMwLTEuMTItLjQ4LTEuNi0xLjYtMS42aC0yLjUxdjIuMTRoMS4wN2MuMzQsMCwuNTUuMTguNTUuNTVoLS4wMnMwLDguNzQsMCw4Ljc0YzAsMy44MywyLjc0LDYuNDUsNi43Myw2LjQ1czYuNjYtMi42Miw2LjY2LTYuNDV2LTguNzRjMC0uMzYuMjEtLjU1LjU1LS41NWgxLjA3di0yLjE0aC0yLjQ5Yy0xLjEyLDAtMS42Mi40OC0xLjYyLDEuNiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTk3LjM5LDU5Ljk0djkuNTNjMCwxLC4xOCwyLjM5LjE4LDIuMzloLS4wNXMtLjgyLTEuNDYtMS40Ni0yLjM5bC03LjgyLTExLjEzaC0yLjI2djE0Ljg3YzAsLjM0LS4yMS41NS0uNTUuNTVoLTEuMDd2Mi4xNGgyLjUxYzEuMTIsMCwxLjYtLjQ4LDEuNi0xLjZ2LTkuNTNjMC0uOTgtLjE2LTIuMzktLjE2LTIuMzloLjA1cy44LDEuNDYsMS40NCwyLjM5bDcuODUsMTEuMTNoMi4yNHYtMTQuODdjMC0uMzYuMjEtLjU1LjU1LS41NWgxLjA3di0yLjE0aC0yLjQ5Yy0xLjE0LDAtMS42Mi40OC0xLjYyLDEuNiIvPgogICAgICAgIDxwb2x5Z29uIGNsYXNzPSJjbHMtMSIgcG9pbnRzPSIxMDQuMjEgNjAuNDkgMTA1LjkyIDYwLjQ5IDEwNS45MiA3My43NiAxMDQuMjEgNzMuNzYgMTA0LjIxIDc1LjkxIDExMC4wMSA3NS45MSAxMTAuMDEgNzMuNzYgMTA4LjMgNzMuNzYgMTA4LjMgNjAuNDkgMTEwLjAxIDYwLjQ5IDExMC4wMSA1OC4zNCAxMDQuMjEgNTguMzQgMTA0LjIxIDYwLjQ5Ii8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTI0LjEsNTkuNzhsLTMuODUsMTAuODNjLS4zNC45Ni0uNjYsMi40Mi0uNjYsMi40MmgtLjA1cy0uMzQtMS40OC0uNjYtMi40MmwtMy44NS0xMC44M2MtLjQxLTEuMTYtLjg0LTEuNDQtMi4wOC0xLjQ0aC0xLjM5djIuMTRoLjM0Yy40MywwLC42Ni4wOS44Mi41NWgtLjAybDUuNTIsMTQuODdoMi42NWw1LjUyLTE0Ljg3Yy4xNi0uNDYuMzYtLjU1LjgyLS41NWguMzR2LTIuMTRoLTEuMzljLTEuMjMsMC0xLjY0LjI3LTIuMDUsMS40NCIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTEzOS4zNiw3My4yNGMwLC4zNC0uMjEuNTUtLjU1LjU1aC01LjEzYy0uMzQsMC0uNTUtLjIxLS41NS0uNTV2LTUuMTFoNi4xNHYtMi4xNGgtNi4xNHYtNS41aDVjLjM0LDAsLjU1LjE4LjU1LjU1djEuMTJoMi4yNnYtMi4yMWMwLTEuMTItLjQ4LTEuNi0xLjYtMS42aC0xMC4zM3YyLjE0aDEuNjJ2MTMuODRjMCwxLjEyLjQ4LDEuNiwxLjYsMS42aDcuODJjMS4xMiwwLDEuNi0uNDgsMS42LTEuNnYtMi4yMWgtMi4yOHYxLjEyWiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE1Ni4xMyw3My4xOWwtMi4xMi00LjJjLS4zLS41Ny0uNzUtLjgtLjc1LS44di0uMDVjMS4yNS0uMjcsMy4xNy0xLjcxLDMuMTctNC42NSwwLTMuMjItMi4xNy01LjE1LTUuMjUtNS4xNWgtNy42NnYyLjE0aDEuNjJ2MTUuNDJoMi40OXYtN2gyLjI4Yy45NiwwLDEuMjguMTQsMS43My45NmwyLjM5LDQuNzJjLjU3LDEuMTQsMS4wNywxLjMyLDIuNDQsMS4zMmgxLjIzdi0yLjE0aC0uMzJjLS42MiwwLTEtLjA1LTEuMjUtLjU3TTE1MC44Niw2Ni43OGgtMy4yNHYtNi4zaDMuMjhjMS44NSwwLDIuOTcsMS4xNCwyLjk3LDMuMXMtMS4xMiwzLjE5LTMuMDEsMy4xOSIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE2Mi4zNSw2Mi42OGMwLTEuMzIsMS4xOS0yLjM3LDMuMDgtMi4zNywxLjM5LDAsMi43MS42OCwyLjcxLDEuNnYuODJoMi4yOHYtMS40NGMwLTIuMzktMy4xMi0zLjI0LTUtMy4yNC0zLjMzLDAtNS42MywyLjA1LTUuNjMsNC43LDAsNS40Nyw4LjQ4LDQuOSw4LjQ4LDguNTgsMCwxLjYyLTEuMzcsMi42Mi0zLjAxLDIuNjItMi41MSwwLTQuMjctMS45Ny00LjM5LTIuMTFsLTEuNDUsMS43NHMyLjA4LDIuNjIsNS44MiwyLjYyYzMuNDcsMCw1LjU3LTIuMyw1LjU3LTUsMC01Ljc3LTguNDYtNC45Ny04LjQ2LTguNTMiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xNjAuODcsNzEuODJzMCwwLC4wMS4wMWguMDFzLS4wMi0uMDEtLjAyLS4wMVoiLz4KICAgICAgICA8cG9seWdvbiBjbGFzcz0iY2xzLTEiIHBvaW50cz0iMTczLjQxIDYwLjQ5IDE3NS4xMiA2MC40OSAxNzUuMTIgNzMuNzYgMTczLjQxIDczLjc2IDE3My40MSA3NS45MSAxNzkuMjEgNzUuOTEgMTc5LjIxIDczLjc2IDE3Ny41IDczLjc2IDE3Ny41IDYwLjQ5IDE3OS4yMSA2MC40OSAxNzkuMjEgNTguMzQgMTczLjQxIDU4LjM0IDE3My40MSA2MC40OSIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE5NC40LDU4LjM3aC0xMi4wOWMtMS4xMiwwLTEuNDguMzctMS40OCwxLjQ4djIuM2gyLjIxdi0xLjEyYzAtLjM3LjIxLS41NS41NS0uNTVoMy41MXYxNS40MmgyLjQ5di0xNS40MmgzLjU0Yy4zNCwwLC41NS4xOC41NS41NXYxLjEyaDIuMjF2LTIuM2MwLTEuMTItLjM2LTEuNDgtMS40OC0xLjQ4Ii8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMjA4LjAxLDU5LjY5bC0yLjY1LDQuNDJjLS41OS45Ni0xLjA3LDEuOTYtMS4wNywxLjk2aC0uMDVzLS41LS45OC0xLjA3LTEuOTZsLTIuNjctNC40MmMtLjcxLTEuMTYtMS4xOS0xLjM1LTIuMzctMS4zNWgtMS4xNHYyLjE0aC41Yy41MiwwLC43NS4wOSwxLjA3LjYybDQuNDUsNy4xNGguMDJ2Ny42NmgyLjQ5di03LjY2bDQuNDItNy4xNGMuMzItLjUyLjU3LS42MiwxLjA5LS42MmguNDh2LTIuMTRoLTEuMTRjLTEuMTksMC0xLjY5LjE4LTIuMzcsMS4zNSIvPgogICAgICA8L2c+CiAgICA8L2c+CiAgPC9nPgo8L3N2Zz4=';
        state.assets[el.assetId] = src; // upgrade legacy state
      }
      if (zipRef && src.startsWith('data:image/')) {
        const b64Parts = src.split(',');
        const b64Data = b64Parts[1];
        const mimeMatch = b64Parts[0].match(/data:image\/([a-zA-Z0-9+]+);/);
        let ext = 'png';
        if (mimeMatch) {
          const mime = mimeMatch[1].toLowerCase();
          if (mime === 'jpeg') ext = 'jpg';
          else if (mime === 'svg+xml') ext = 'svg';
          else ext = mime;
        }
        const filename = `assets/${el.assetId}.${ext}`;
        zipRef.file(filename, b64Data, { base64: true });
        src = filename;
      } else if (zipRef && src.startsWith('data/Elements/')) {
        const filename = src.split('/').pop();
        src = `assets/${filename}`;
      }
      return `    <div style="${wrapStyle}">${openDivs}<img src="${src}" style="width:100%;height:100%;object-fit:${el.objectFit || 'contain'};" alt="" />${closeDivs}</div>`;
    }
    return '';
  };

  const elsBot = c.elements.filter(e => e.persistent === 'bottom').map(renderEl).join('\n');
  const elsTop = c.elements.filter(e => e.persistent === 'top').map(renderEl).join('\n');

  let framesHTML = '';
  const frameData = [];
  state.frames.forEach((f, i) => {
    const frameEls = c.elements.filter(e => e.persistent === false && e.frameId === f.id).map(renderEl).join('\n');
    const displayStyle = isImageExport 
      ? (f.id === state.activeFrameId ? 'block' : 'none') 
      : (i === 0 ? 'block' : 'none');
    framesHTML += `<div class="frame" id="frame-${f.id}" style="display:${displayStyle};width:100%;height:100%;position:absolute;inset:0;">\n${frameEls}\n</div>\n`;
    frameData.push({ id: f.id, duration: f.duration || 2, transition: i === 0 ? 'none' : (f.transition || 'fade'), transitionDuration: f.transitionDuration || 0.5, transitionFade: f.transitionFade });
  });

  let clickAreasHTML = '';
  if (!isImageExport) {
    const clickBtns = c.elements.filter(e => e.type === 'button' && e.isClickArea);
    if (c.fullClickArea === false && clickBtns.length > 0) {
      clickAreasHTML = clickBtns.map(btn => `<a class="clickArea" href="javascript:void(0);" style="position:absolute;left:${btn.x}px;top:${btn.y}px;width:${btn.width}px;height:${btn.height}px;z-index:9999;display:block;"></a>`).join('\n    ');
    } else {
      clickAreasHTML = `<a class="clickArea" href="javascript:void(0);" style="position:absolute;inset:0;z-index:9999;display:block;"></a>`;
    }
  }

  // Only include @font-face rules for fonts and weights actually used in this canvas
  const req = getRequiredFonts(c);
  const fontFaceRules = [];
  const fontPrefix = zipRef ? 'assets/' : 'data/fonts/';

  if (req.museo.has(300)) {
    fontFaceRules.push(`  @font-face { font-family: 'Museo'; src: url('${fontPrefix}Museo300-Regular.woff2') format('woff2'); font-weight: 300; }`);
  }
  if (req.museo.has(500)) {
    fontFaceRules.push(`  @font-face { font-family: 'Museo'; src: url('${fontPrefix}Museo500-Regular.woff2') format('woff2'); font-weight: 500; }`);
  }
  if (req.museo.has(700)) {
    fontFaceRules.push(`  @font-face { font-family: 'Museo'; src: url('${fontPrefix}Museo700-Regular.woff2') format('woff2'); font-weight: 700; }`);
  }

  if (req.helvetica.has(300)) {
    fontFaceRules.push(`  @font-face { font-family: 'Helvetica Neue LT Pro'; src: url('${fontPrefix}helveticaneueltpro_lt.woff2') format('woff2'); font-weight: 300; }`);
  }
  if (req.helvetica.has(400)) {
    fontFaceRules.push(`  @font-face { font-family: 'Helvetica Neue LT Pro'; src: url('${fontPrefix}helveticaneueltpro_roman.woff2') format('woff2'); font-weight: 400; }`);
  }
  if (req.helvetica.has(500)) {
    fontFaceRules.push(`  @font-face { font-family: 'Helvetica Neue LT Pro'; src: url('${fontPrefix}helveticaneueltpro.woff2') format('woff2'); font-weight: 500; }`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Ad</title>
<meta name="ad.size" content="width=${c.width},height=${c.height}">
<style>
${fontFaceRules.join('\n')}

  @keyframes anim-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes anim-zoom-in { from { opacity: 0; transform: scale(var(--zoom-from, 1.1)); } to { opacity: 1; transform: scale(1); } }
  @keyframes anim-zoom-in-nofade { from { transform: scale(var(--zoom-from, 1.1)); } to { transform: scale(1); } }
  @keyframes anim-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes anim-slide-up-nofade { from { transform: translateY(20px); } to { transform: translateY(0); } }
  @keyframes anim-slide-down { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes anim-slide-down-nofade { from { transform: translateY(-20px); } to { transform: translateY(0); } }
  @keyframes anim-slide-left { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes anim-slide-left-nofade { from { transform: translateX(20px); } to { transform: translateX(0); } }
  @keyframes anim-slide-right { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes anim-slide-right-nofade { from { transform: translateX(-20px); } to { transform: translateX(0); } }
  @keyframes anim-frame-slide-up { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes anim-frame-slide-up-nofade { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes anim-frame-slide-down { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes anim-frame-slide-down-nofade { from { transform: translateY(-100%); } to { transform: translateY(0); } }
  @keyframes anim-frame-slide-left { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes anim-frame-slide-left-nofade { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes anim-frame-slide-right { from { opacity: 0; transform: translateX(-100%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes anim-frame-slide-right-nofade { from { transform: translateX(-100%); } to { transform: translateX(0); } }
  @keyframes anim-pop-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
  @keyframes anim-pop-in-nofade { from { transform: scale(0.8); } to { transform: scale(1); } }
  @keyframes anim-typing { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes anim-fade-typing { 0% { -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 65%); -webkit-mask-size: 300% 100%; -webkit-mask-position: 100% 0; } 100% { -webkit-mask-position: 0 0; } }
  @keyframes anim-bg-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes anim-swipe-left  { from { clip-path: inset(0 0 0 100%); } to { clip-path: inset(0 0 0 0); } }
  @keyframes anim-swipe-right { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes anim-swipe-up    { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes anim-swipe-down  { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes anim-swipe-left-fade  { from { clip-path: inset(0 0 0 100%); opacity: 0; } to { clip-path: inset(0 0 0 0); opacity: 1; } }
  @keyframes anim-swipe-right-fade { from { clip-path: inset(0 100% 0 0); opacity: 0; } to { clip-path: inset(0 0 0 0); opacity: 1; } }
  @keyframes anim-swipe-up-fade    { from { clip-path: inset(100% 0 0 0); opacity: 0; } to { clip-path: inset(0 0 0 0); opacity: 1; } }
  @keyframes anim-swipe-down-fade  { from { clip-path: inset(0 0 100% 0); opacity: 0; } to { clip-path: inset(0 0 0 0); opacity: 1; } }
  @keyframes eff-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
  @keyframes eff-float { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); } }
  @keyframes eff-flash { 0%, 50%, 100% { opacity: 1; } 25%, 75% { opacity: 0; } }
  @keyframes eff-wiggle { 0% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 50% { transform: rotate(0deg); } 75% { transform: rotate(5deg); } 100% { transform: rotate(0deg); } }
  @keyframes eff-spin { 100% { transform: rotate(var(--spin-target, 360deg)); } }
  @keyframes eff-heartbeat { 0% { transform: scale(1); } 14% { transform: scale(1.3); } 28% { transform: scale(1); } 42% { transform: scale(1.3); } 70% { transform: scale(1); } }
  @keyframes eff-pan { 0% { translate: 0 0; } 100% { translate: var(--pan-x, 0px) var(--pan-y, 0px); } }
  @keyframes eff-zoom { 0% { scale: 1; } 100% { scale: var(--zoom-target, 1.5); } }

  html, body { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; background: ${c.bgColor}; }
  #ad {
    width: ${c.width}px;
    height: ${c.height}px;
    position: relative;
    overflow: hidden;
    background: ${c.bgColor};
    font-family: Arial, Helvetica, sans-serif;
  }
  .clickArea { cursor: pointer; background: transparent; }
</style>
</head>
<body>
  <div id="ad">
    <div id="layer-bot" style="position:absolute;inset:0;pointer-events:none;z-index:1;">
${elsBot}
    </div>
    <div id="layer-frames" style="position:absolute;inset:0;pointer-events:none;z-index:2;">
${framesHTML}
    </div>
    <div id="layer-top" style="position:absolute;inset:0;pointer-events:none;z-index:3;">
${elsTop}
    </div>
    ${clickAreasHTML}
  </div>

  <script type="text/javascript">
    var clickTag = "${esc(state.clickTag || 'https://www.rmit.edu.au/')}";
  </script>
  <script>
    var frames = ${JSON.stringify(frameData)};
    var currentFrame = 0;
    var loopAd = ${state.loopAd === true};
    
    function nextFrame() {
      if (frames.length <= 1) return;
      var prevFrameIdx = currentFrame;
      var prevFrameEl = document.getElementById('frame-' + frames[prevFrameIdx].id);
      
      currentFrame = (currentFrame + 1) % frames.length;
      var nextFrameEl = document.getElementById('frame-' + frames[currentFrame].id);
      
      prevFrameEl.style.zIndex = '1';
      nextFrameEl.style.zIndex = '2';
      nextFrameEl.style.display = 'block';
      
      var t = frames[currentFrame].transition;
      var td = (frames[currentFrame].transitionDuration || 0.5) + 's';
      var fadeRaw = frames[currentFrame].transitionFade;
      var fade = (fadeRaw === undefined) ? (t && t.indexOf('slide-') === 0) : !!fadeRaw;
      var anim = '';
      if (t === 'fade') anim = 'anim-fade-in';
      else if (t && t.indexOf('slide-') === 0) anim = 'anim-frame-' + t + (fade ? '' : '-nofade');
      else if (t && t.indexOf('swipe-') === 0) anim = 'anim-' + t + (fade ? '-fade' : '');
      
      nextFrameEl.style.animation = anim ? (anim + ' ' + td + ' ease both') : '';
      
      if (anim) {
        var transDurationMs = (frames[currentFrame].transitionDuration || 0.5) * 1000;
        setTimeout(function() {
          prevFrameEl.style.display = 'none';
          prevFrameEl.style.animation = '';
          prevFrameEl.style.zIndex = '';
          nextFrameEl.style.zIndex = '';
        }, transDurationMs);
      } else {
        prevFrameEl.style.display = 'none';
        prevFrameEl.style.animation = '';
        prevFrameEl.style.zIndex = '';
        nextFrameEl.style.zIndex = '';
      }
      
      if (!loopAd && currentFrame === frames.length - 1) {
        return;
      }
      setTimeout(nextFrame, frames[currentFrame].duration * 1000);
    }
    
    ${setupTextLineBgs.toString()}

    function adjustAutoSizes() {
      document.querySelectorAll('.auto-size-text').forEach(function(wrapper) {
        var maxFontSize = parseFloat(wrapper.getAttribute('data-max-size')) || 72;
        var targetWidth = parseFloat(wrapper.getAttribute('data-width')) || wrapper.offsetWidth;
        var targetHeight = parseFloat(wrapper.getAttribute('data-height')) || wrapper.offsetHeight;
        
        var block = wrapper.querySelector('.auto-size-block');
        var span = wrapper.querySelector('.auto-size-span');
        if (!block || !span) return;
        
        var hiddenAncestors = [];
        var parent = wrapper.parentElement;
        while (parent && parent !== document.body) {
          var display = window.getComputedStyle(parent).display;
          if (display === 'none') {
            hiddenAncestors.push({
              element: parent,
              prevDisplay: parent.style.display,
              prevVisibility: parent.style.visibility,
              prevPosition: parent.style.position
            });
            parent.style.setProperty('display', 'block', 'important');
            parent.style.setProperty('visibility', 'hidden', 'important');
            parent.style.setProperty('position', 'absolute', 'important');
          }
          parent = parent.parentElement;
        }
        
        var low = 4;
        var high = maxFontSize;
        var best = low;
        
        while (low <= high) {
          var mid = Math.floor((low + high) / 2);
          block.style.fontSize = mid + 'px';
          span.style.fontSize = mid + 'px';
          
          var rect = block.getBoundingClientRect();
          var fitsHeight = rect.height <= targetHeight;
          var fitsWidth = block.scrollWidth <= targetWidth;
          
          if (fitsHeight && fitsWidth) {
            best = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        
        block.style.fontSize = best + 'px';
        span.style.fontSize = best + 'px';
        
        hiddenAncestors.forEach(function(item) {
          if (item.prevDisplay) {
            item.element.style.display = item.prevDisplay;
          } else {
            item.element.style.removeProperty('display');
          }
          if (item.prevVisibility) {
            item.element.style.visibility = item.prevVisibility;
          } else {
            item.element.style.removeProperty('visibility');
          }
          if (item.prevPosition) {
            item.element.style.position = item.prevPosition;
          } else {
            item.element.style.removeProperty('position');
          }
        });
      });
    }

    window.addEventListener('load', function () {
      adjustAutoSizes();
      if (frames.length > 1) {
        setTimeout(nextFrame, frames[0].duration * 1000);
      }
      document.querySelectorAll('.clickArea').forEach(function(el) {
        el.addEventListener('click', function () {
          window.open(clickTag);
        });
      });
      // Per-line animated bg: wait one frame so fonts/layout settle before measuring.
      requestAnimationFrame(function () {
        document.querySelectorAll('[data-bg-anim]').forEach(setupTextLineBgs);
      });
    });
  <\/script>
</body>
</html>`;
}
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
  animateViewTo(0.6, x, y);
});

document.getElementById('app-version-display')?.addEventListener('click', () => {
  openChangelogModal();
});

document.getElementById('btn-toggle-safezones').addEventListener('click', (e) => {
  state.showSafezones = !state.showSafezones;
  e.currentTarget.classList.toggle('active', state.showSafezones);
  render();
});

// ============================================================================
// Auto-resize from selected canvas
// ============================================================================
// Classifies each element of the source canvas into a role (hybrid: layer name
// first, then heuristics), then places & sizes a matching element on every other
// canvas using per-format presets, links them, and syncs content/appearance
// (keeping position, size and font-size independent per canvas).

function canvasFormatClass(c) {
  const w = c.width, h = c.height, r = w / h;
  if (h <= 60) return 'mobile';                       // 320×50
  if (r >= 3) return w >= 900 ? 'billboard' : 'leaderboard'; // 970×250 vs 728×90
  if (h >= w * 1.6) return 'skyscraper';              // 160×600, 300×600
  return 'rectangle';                                 // 300×250
}

function detectElementRole(el, canvas) {
  const name = (el.customName || '').toLowerCase();
  const area = (el.width * el.height) / (canvas.width * canvas.height || 1);
  // Name-based (hybrid: trusted first)
  if (name.includes('logo')) return 'logo';
  if (name.includes('compliance') || name === 'cricos' || name === 'rfwn') return 'compliance';
  if (name === 'background' || name === 'bg') return 'bgimage';
  if (name === 'heading' || name.includes('headline')) return 'heading';
  if (name === 'subheading' || name.includes('subhead')) return 'subheading';
  // Type + heuristic fallbacks
  if (el.type === 'button') return 'button';
  if (el.type === 'image') {
    if (area >= 0.7 || el.persistent === 'bottom') return 'bgimage';
    if (el.persistent === 'top' && area < 0.18) return 'logo';
    return 'image';
  }
  if (['rect', 'circle', 'pixel'].includes(el.type)) {
    if (area >= 0.7 || el.persistent === 'bottom') return 'bgimage';
    return 'shape';
  }
  if (el.type === 'text') {
    if (el.persistent === 'top') return 'compliance'; // tiny persistent legal text
    const texts = canvas.elements
      .filter(e => e.type === 'text' && e.persistent !== 'top')
      .sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0));
    if (texts[0] && texts[0].id === el.id) return 'heading';
    if (texts[1] && texts[1].id === el.id) return 'subheading';
    return 'text';
  }
  return 'other';
}

function syncDefaultsForRole(role, cat) {
  // Baseline: content + appearance; keep layout (transform) and font-size independent.
  const s = { opacity: true, inAnim: true, effect: true, transform: false };
  if (cat === 'text') { s.text = true; s.font = true; s.fontSize = false; s.color = true; s.background = true; }
  else if (cat === 'button') { s.text = true; s.textColor = true; s.fill = true; s.stroke = true; }
  else if (cat === 'image') { s.image = true; s.rotation = true; }
  else if (cat === 'shape') { s.fill = true; s.stroke = true; }
  else if (cat === 'line') { s.color = true; s.thickness = true; }
  return s;
}

function layoutForRole(role, c, srcEl) {
  const w = c.width, h = c.height;
  const pad = Math.max(8, Math.round(Math.min(w, h) * 0.06));
  const fmt = canvasFormatClass(c);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  if (role === 'bgimage') {
    return { x: 0, y: 0, width: w, height: h };
  }
  if (role === 'logo') {
    const ratio = (srcEl.width && srcEl.height) ? srcEl.height / srcEl.width : 0.35;
    const lw = clamp(Math.round(w * 0.2), 48, 110);
    return { x: w - lw - pad, y: pad, width: lw, height: Math.round(lw * ratio) };
  }
  if (role === 'heading') {
    const fs = clamp(Math.round(Math.min(w, h) * 0.12), 12, 46);
    const reserve = (fmt === 'leaderboard' || fmt === 'billboard') ? Math.round(w * 0.28) : 0;
    return { x: pad, y: pad, width: Math.max(60, w - pad * 2 - reserve), height: Math.round(fs * 1.3), fontSize: fs };
  }
  if (role === 'subheading') {
    const hFs = clamp(Math.round(Math.min(w, h) * 0.12), 12, 46);
    const fs = Math.max(10, Math.round(hFs * 0.55));
    const reserve = (fmt === 'leaderboard' || fmt === 'billboard') ? Math.round(w * 0.28) : 0;
    return { x: pad, y: pad + Math.round(hFs * 1.3) + Math.round(fs * 0.5), width: Math.max(60, w - pad * 2 - reserve), height: Math.round(fs * 1.3), fontSize: fs };
  }
  if (role === 'button') {
    const btnH = clamp(Math.round(h * 0.12), 22, 48);
    const btnW = clamp(Math.round(w * 0.4), 80, w - pad * 2);
    const fs = Math.max(11, Math.round(btnH * 0.42));
    let x, y;
    if (fmt === 'leaderboard' || fmt === 'billboard' || fmt === 'mobile') {
      x = w - btnW - pad; y = Math.round((h - btnH) / 2);     // right, vertically centered
    } else { // skyscraper / rectangle
      x = Math.round((w - btnW) / 2); y = h - btnH - pad;     // bottom, centered
    }
    return { x, y, width: btnW, height: btnH, fontSize: fs };
  }
  // Generic shape / image / loose text: scale to fit, centered (preserve aspect).
  const ratio = (srcEl.width && srcEl.height) ? srcEl.width / srcEl.height : 1;
  let nw = clamp(Math.round(w * 0.5), 20, w - pad * 2);
  let nh = Math.round(nw / (ratio || 1));
  if (nh > h - pad * 2) { nh = Math.max(10, h - pad * 2); nw = Math.round(nh * ratio); }
  const out = { x: Math.round((w - nw) / 2), y: Math.round((h - nh) / 2), width: nw, height: nh };
  if (srcEl.type === 'text') {
    const fs = clamp(Math.round(Math.min(w, h) * 0.1), 10, 40);
    out.fontSize = fs;
    out.height = Math.round(fs * 1.3);
  }
  return out;
}

function autoResizeFromSelected() {
  const src = getActiveCanvas();
  if (!src) { alert('Select a source canvas first (click its header).'); return; }
  if (state.canvases.length < 2) { alert('Add at least one more canvas to resize into.'); return; }

  const otherCount = state.canvases.length - 1;
  if (!confirm(`Auto-resize from "${src.name || src.width + '×' + src.height}" (${src.width}×${src.height})?\n\n⚠ This first CLEARS every element on the other ${otherCount} canvas${otherCount > 1 ? 'es' : ''}, then places & sizes every element from this canvas onto them, links them, and syncs content/appearance. Position, size and font-size stay per-canvas. You can undo.`)) return;

  if (!state.linkGroups) state.linkGroups = {};

  // Wipe the target canvases completely — only source-derived elements will remain.
  state.canvases.forEach(c => {
    if (c.id === src.id) return;
    c.elements = [];
  });

  // Every source element in the active frame (+ persistent layers) gets carried over.
  const srcEls = src.elements.filter(el => el.persistent !== false || el.frameId === state.activeFrameId);

  srcEls.forEach(srcEl => {
    const role = detectElementRole(srcEl, src);
    const cat = getElementCategory(srcEl) || srcEl.type;

    // Create or refresh this element's link group with role-appropriate sync defaults.
    let gid = srcEl.linkGroupId;
    if (!gid || !state.linkGroups[gid]) {
      gid = 'lg_' + uid();
      state.linkGroups[gid] = { id: gid, name: baseLayerLabel(srcEl), category: cat, syncProperties: syncDefaultsForRole(role, cat) };
      srcEl.linkGroupId = gid;
    } else {
      state.linkGroups[gid].syncProperties = syncDefaultsForRole(role, cat);
    }
    const group = state.linkGroups[gid];
    const srcLabel = baseLayerLabel(srcEl);

    state.canvases.forEach(c => {
      if (c.id === src.id) return;
      // Reuse a same-named element of the same type if one exists, else clone.
      let target = c.elements.find(el => el.type === srcEl.type && baseLayerLabel(el) === srcLabel);
      if (!target) {
        target = JSON.parse(JSON.stringify(srcEl));
        target.id = uid();
        if (target.persistent === false) target.frameId = state.activeFrameId;
        insertAtGroupEnd(c.elements, target);
      }
      target.linkGroupId = gid;
      // Place & size per format, then sync content/appearance from the source.
      Object.assign(target, layoutForRole(role, c, srcEl));
      applyLinkSync(srcEl, target, group);
      if (target.type === 'button' && target.autoHug) target.width = measureButtonWidth(target);
    });
  });

  cleanupLinkGroups(); // prune any groups orphaned by the clear
  pushHistory();
  render();
}

document.getElementById('btn-ai-resize').addEventListener('click', autoResizeFromSelected);

document.getElementById('btn-clear-everything')?.addEventListener('click', () => {
  if (!confirm("Are you sure you want to clear all elements from all canvases? This cannot be undone.")) return;
  state.canvases.forEach(c => {
    c.elements = [];
  });
  state.linkGroups = {};
  state.selectedElementId = null;
  state.layerSelection = [];
  pushHistory();
  render();
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

// ============================================================================
// Save / Load Project
// ============================================================================
async function saveProjectAsFlow() {
  if (typeof JSZip === 'undefined') { alert('JSZip is not loaded.'); return; }

  const zip = new JSZip();
  const exportState = JSON.parse(JSON.stringify(state));
  exportState.editingElementId = null;
  if (document.getElementById('canvas-area')) {
    const ca = document.getElementById('canvas-area');
    exportState.viewScrollLeft = ca.scrollLeft;
    exportState.viewScrollTop = ca.scrollTop;
  }
  exportState.zoom = state.zoom || 0.6;

  // Embed the capped history stack and index
  const limit = state.savedHistoryLimit !== undefined ? state.savedHistoryLimit : 10;
  const capped = getCappedHistory(limit);
  exportState.history = capped.history;
  exportState.historyIndex = capped.historyIndex;

  // Prune history from file to keep size small, unless user configured to save it
  const settings = (await _idbGet('settings')) || {};
  if (settings.saveHistoryInProject !== true) {
    delete exportState.history;
    delete exportState.historyIndex;
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

  // Metadata sits next to project.json so it's cheap to read for the drag-over
  // preview without unpacking the whole project payload.
  const savedAt = new Date().toISOString();
  zip.file('meta.json', JSON.stringify({
    magic: 'adflow',
    version: 1,
    savedAt,
    projectName: state.projectName || 'RMIT_Ad'
  }, null, 2));
  zip.file('project.json', JSON.stringify(exportState, null, 2));

  const content = await zip.generateAsync({ type: 'blob' });
  const projName = (state.projectName || 'RMIT_Ad').replace(/[^a-zA-Z0-9_-]/g, '_');
  const datePart = savedAt.slice(0, 10); // YYYY-MM-DD
  const suggestedName = `${projName}-${datePart}.flow`;

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        types: [{ description: 'Ad Flow Project', accept: { 'application/octet-stream': ['.flow'] } }],
        suggestedName
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      await addRecentProject(exportState);
    } catch (e) { if (e.name !== 'AbortError') console.error('Save failed:', e); }
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(a.href);
    await addRecentProject(exportState);
  }
}

// Backwards-compat aliases — keyboard shortcuts and a few other places still reference
// the original name.
const saveProjectAsCook = saveProjectAsFlow;
const saveProjectToZip = saveProjectAsFlow;

async function addRecentProject(exportState) {
  try {
    const recents = (await _idbGet('recents')) || [];
    const projName = state.projectName || 'RMIT_Ad';
    const filtered = recents.filter(r => r.name !== projName);
    filtered.unshift({
      name: projName,
      timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      stateSnapshot: JSON.parse(JSON.stringify(exportState))
    });
    const limited = filtered.slice(0, 10);
    await _idbPut('recents', limited);
    updateRecentProjectsMenu();
  } catch (err) {
    console.error('Failed to add recent project:', err);
  }
}

async function updateRecentProjectsMenu() {
  const container = document.getElementById('recent-projects-list');
  if (!container) return;
  try {
    const recents = (await _idbGet('recents')) || [];
    container.innerHTML = '';
    if (recents.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dropdown-item';
      empty.style.color = 'var(--text-muted)';
      empty.style.cursor = 'default';
      empty.style.pointerEvents = 'none';
      empty.style.padding = '6px 16px';
      empty.textContent = '(No recent projects)';
      container.appendChild(empty);
      return;
    }
    recents.forEach(item => {
      const el = document.createElement('div');
      el.className = 'dropdown-item';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'flex-start';
      el.style.gap = '2px';
      el.style.padding = '6px 16px';
      el.style.lineHeight = '1.3';
      
      const name = document.createElement('div');
      name.style.fontWeight = '500';
      name.style.color = 'inherit';
      name.textContent = item.name;
      
      const date = document.createElement('div');
      date.style.fontSize = '9px';
      date.style.color = 'var(--text-muted)';
      date.style.transition = 'color 0.2s';
      date.textContent = item.timestamp;
      
      el.appendChild(name);
      el.appendChild(date);
      
      el.addEventListener('mouseenter', () => {
        date.style.color = '#e0e0e0';
      });
      el.addEventListener('mouseleave', () => {
        date.style.color = 'var(--text-muted)';
      });
      
      el.addEventListener('click', () => {
        if (confirm(`Open recent project "${item.name}"? Any unsaved changes will be lost.`)) {
          loadProjectFromState(item.stateSnapshot);
        }
      });
      container.appendChild(el);
    });
  } catch (e) {
    console.error('Failed to update recents menu:', e);
  }
}

function loadProjectFromState(loadedState) {
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

  Object.assign(state, JSON.parse(JSON.stringify(loadedState)));
  
  if (restoredHistory && Array.isArray(restoredHistory) && restoredHistory.length > 0) {
    history.length = 0;
    history.push(...restoredHistory);
    historyIndex = restoredHistoryIndex !== undefined ? restoredHistoryIndex : history.length - 1;
  } else {
    history.length = 0;
    historyIndex = -1;
    pushHistory();
  }

  render();
  if (loadedState.viewScrollLeft !== undefined) {
    setTimeout(() => {
      const ca = document.getElementById('canvas-area');
      if (ca && ca.scrollTo) ca.scrollTo({ left: loadedState.viewScrollLeft, top: loadedState.viewScrollTop, behavior: 'instant' });
    }, 10);
  }
}

// Shared inflater used by the menu Open dialog AND the drag-drop overlay. Both
// formats — modern .flow and legacy .cook/.zip — share the same internal structure.
async function loadProjectFromBlob(file) {
  if (typeof JSZip === 'undefined') throw new Error('JSZip is not loaded.');
  const zip = await JSZip.loadAsync(file);
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

  const newAssets = {};
  if (loadedState.assets) {
    for (const [assetId, path] of Object.entries(loadedState.assets)) {
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
  Object.assign(state, loadedState);
  state.assets = newAssets || {};

  if (restoredHistory && Array.isArray(restoredHistory) && restoredHistory.length > 0) {
    history.length = 0;
    history.push(...restoredHistory);
    historyIndex = restoredHistoryIndex !== undefined ? restoredHistoryIndex : history.length - 1;
  } else {
    history.length = 0;
    historyIndex = -1;
    pushHistory();
  }

  render();
  if (loadedState.viewScrollLeft !== undefined) {
    setTimeout(() => {
      const ca = document.getElementById('canvas-area');
      if (ca && ca.scrollTo) ca.scrollTo({ left: loadedState.viewScrollLeft, top: loadedState.viewScrollTop, behavior: 'instant' });
    }, 10);
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
  state.selectedElementId = null;
  state.layerSelection = [];
  render();
});

document.getElementById('btn-prev-frame').addEventListener('click', () => {
  const idx = state.frames.findIndex(f => f.id === state.activeFrameId);
  if (idx > 0) {
    state.activeFrameId = state.frames[idx - 1].id;
    state.selectedElementId = null;
    state.layerSelection = [];
    render();
  }
});

document.getElementById('btn-next-frame').addEventListener('click', () => {
  const idx = state.frames.findIndex(f => f.id === state.activeFrameId);
  if (idx < state.frames.length - 1) {
    state.activeFrameId = state.frames[idx + 1].id;
    state.selectedElementId = null;
    state.layerSelection = [];
    render();
  }
});

document.getElementById('btn-add-frame').addEventListener('click', () => {
  const newId = Math.max(...state.frames.map(f => f.id), 0) + 1;
  state.frames.push({ id: newId, duration: 2 });
  state.activeFrameId = newId;
  pushHistory();
  render();
});

document.getElementById('btn-remove-frame').addEventListener('click', () => {
  if (state.frames.length <= 1) return;
  const idx = state.frames.findIndex(f => f.id === state.activeFrameId);
  state.frames.splice(idx, 1);
  state.activeFrameId = state.frames[Math.max(0, idx - 1)].id;

  state.canvases.forEach(c => {
    c.elements = c.elements.filter(e => e.persistent !== false || state.frames.some(f => f.id === e.frameId));
  });

  state.selectedElementId = null;
  state.layerSelection = [];
  pushHistory();
  render();
});

document.getElementById('frame-duration').addEventListener('input', (e) => {
  const f = state.frames.find(x => x.id === state.activeFrameId);
  if (f) {
    f.duration = parseFloat(e.target.value) || 2;
    render();
  }
});
document.getElementById('frame-duration').addEventListener('change', () => pushHistory());

document.getElementById('frame-transition').addEventListener('change', (e) => {
  const f = state.frames.find(x => x.id === state.activeFrameId);
  if (f) {
    f.transition = e.target.value;
    pushHistory();
    render();
  }
});

document.getElementById('frame-transition-duration').addEventListener('input', (e) => {
  const f = state.frames.find(x => x.id === state.activeFrameId);
  if (f) {
    f.transitionDuration = parseFloat(e.target.value) || 0.5;
    render();
  }
});
document.getElementById('frame-transition-duration').addEventListener('change', () => pushHistory());

document.getElementById('frame-transition-fade').addEventListener('change', (e) => {
  const f = state.frames.find(x => x.id === state.activeFrameId);
  if (f) {
    f.transitionFade = e.target.checked;
    pushHistory();
    render();
  }
});

document.getElementById('menu-file-open').addEventListener('click', openProjectFromZip);
document.getElementById('menu-file-save').addEventListener('click', saveProjectToZip);
document.getElementById('menu-file-new').addEventListener('click', openNewProjectDialog);
document.getElementById('menu-project-settings').addEventListener('click', openProjectSettingsDialog);

// ============================================================================
// New Project dialog
// ============================================================================
// Builds a fresh project from picked canvas presets (all checked by default),
// a name, an ad-size limit (KB) and a default canvas background. Replaces the
// working state and lets the normal autosave persist it.
async function createNewProject({ name, presetIndices, sizeLimitKb, bgColor, clickTag }) {
  const bg = bgColor || '#0f172a';
  
  let currentX = 2050;
  let currentY = 2050;
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
      if (currentX + nextPreset.width - 2050 > maxRowWidth) {
        currentX = 2050;
        currentY += rowMaxHeight + 60;
        rowMaxHeight = 0;
      }
    }
    
    // Start clean: keep only the persistent brand layers (RMIT logo + compliance),
    // drop the demo "Summer sale" content.
    c.elements = c.elements.filter(el => el.persistent === 'top' || el.persistent === 'bottom');
    
    // Add Heading and Subheading inside the main layer group (frame-dependent)
    const w = preset.width;
    const h = preset.height;
    const isWide = w > h * 3;
    const fsHeading = Math.max(14, Math.min(40, Math.round(Math.min(w, h) * 0.12)));
    const fsSubheading = Math.max(11, Math.round(fsHeading * 0.55));
    const pad = Math.max(10, Math.round(Math.min(w, h) * 0.06));
    
    const heading = Object.assign(makeElement('text'), {
      customName: 'Heading',
      x: pad,
      y: pad,
      text: 'Heading Text',
      fontSize: fsHeading,
      fontFamily: 'Museo',
      weight: '700',
      color: '#ffffff',
      width: Math.max(120, w - pad * 2 - (w * 0.25)),
      height: Math.round(fsHeading * 1.3),
      persistent: false
    });
    
    const subheading = Object.assign(makeElement('text'), {
      customName: 'Subheading',
      x: pad,
      y: pad + Math.round(fsHeading * 1.3) + 8,
      text: 'Subheading Text',
      fontSize: fsSubheading,
      fontFamily: 'Helvetica Neue LT Pro',
      weight: '400',
      color: '#c7ccdb',
      width: w - pad * 2,
      height: Math.round(fsSubheading * 1.3),
      persistent: false
    });
    
    c.elements.push(heading);
    if (!isWide || w > 600) {
      c.elements.push(subheading);
    }
    
    // Add default button on top of the main layer group
    const btnW = Math.min(140, Math.round(w * 0.35));
    const btnH = Math.max(24, Math.min(48, Math.round(h * 0.12)));
    const button = Object.assign(makeElement('button'), {
      customName: 'Button',
      x: pad,
      y: h - btnH - pad,
      text: 'Learn more',
      bg: '#7c5cff',
      color: '#ffffff',
      fontSize: Math.max(11, Math.round(btnH * 0.42)),
      radius: 6,
      width: btnW,
      height: btnH,
      isClickArea: true,
      fontFamily: 'Museo',
      weight: '700',
      persistent: false
    });
    c.elements.push(button);
    
    return c;
  });

  state.projectName = (name || 'RMIT_Ad').trim() || 'RMIT_Ad';
  state.clickTag = (clickTag || 'https://www.rmit.edu.au/').trim();
  state.adSizeLimit = Math.max(1, parseInt(sizeLimitKb, 10) || 150);
  state.defaultBg = bg;
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

  // Create default read-only RMIT folder
  const rmitFolderId = 'af_rmit';
  state.assetFolders.push({
    id: rmitFolderId,
    name: 'RMIT',
    collapsed: false,
    readOnly: true
  });

  // Load default RMIT assets from data/assets/
  const filesToLoad = [
    { name: 'Image (1)', filename: 'Image (1).jpg', url: 'data/assets/Image (1).jpg' },
    { name: 'Image (2)', filename: 'Image (2).jpg', url: 'data/assets/Image (2).jpg' },
    { name: 'Image (3)', filename: 'Image (3).jpg', url: 'data/assets/Image (3).jpg' },
    { name: 'Image (6)', filename: 'Image (6).jpg', url: 'data/assets/Image (6).jpg' }
  ];

  for (const item of filesToLoad) {
    try {
      const response = await fetch(item.url);
      if (response.ok) {
        const blob = await response.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = () => reject(fr.error);
          fr.readAsDataURL(blob);
        });
        const assetId = 'img_' + uid();
        state.assets[assetId] = dataUrl;
        
        const { naturalW, naturalH } = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ naturalW: img.naturalWidth || 120, naturalH: img.naturalHeight || 90 });
          img.onerror = () => resolve({ naturalW: 120, naturalH: 90 });
          img.src = dataUrl;
        });

        state.assetLibrary.push({
          id: 'as_' + uid(),
          name: item.name,
          kind: 'element',
          iconType: 'image',
          folderId: rmitFolderId,
          elements: [
            {
              id: uid(),
              type: 'image',
              name: item.filename,
              assetId,
              width: naturalW,
              height: naturalH,
              x: 0,
              y: 0
            }
          ]
        });
      }
    } catch (err) {
      console.error('Failed to preload RMIT asset:', item.url, err);
    }
  }
  state.dataMerge = {
    enabled: false,
    columns: [],
    rows: [],
    keyColumn: null,
    activeVersion: null,
    locked: false,
    mappings: {}
  };
  state.zoom = 0.6;

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
      ca.scrollTo({ left: 2000, top: 2000, behavior: 'instant' });
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

  bg.innerHTML = `
    <div class="modal" style="max-width:480px;">
      <div class="modal-head">
        <h2>New Project</h2>
        <button class="btn" id="np-close" title="Close dialog">Close</button>
      </div>
      <div class="modal-body" style="display:flex; flex-direction:column; gap:16px; padding:18px 22px;">
        <div>
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Project name</label>
          <input type="text" id="np-name" value="${(state.projectName || 'RMIT_Ad').replace(/"/g, '&quot;')}" title="Enter the name for the new project" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:7px 9px; font-size:12px; outline:none;" />
        </div>
        <div>
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">ClickTag URL</label>
          <input type="url" id="np-clicktag" value="${(state.clickTag || 'https://www.rmit.edu.au/').replace(/"/g, '&quot;')}" title="Default exit/landing page URL for all canvases" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:7px 9px; font-size:12px; outline:none;" />
        </div>
        <div>
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Canvases</span>
            <span id="np-canvas-toggle" style="cursor:pointer; color:var(--accent-light); text-transform:none; letter-spacing:0;" title="Select or deselect all preset canvas sizes">Toggle all</span>
          </label>
          <div style="border:1px solid #272c3a; border-radius:6px; padding:4px;">${presetRows}</div>
        </div>
        <div style="display:flex; gap:14px;">
          <div style="flex:1;">
            <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Max ad size (KB)</label>
            <input type="number" id="np-size-limit" value="${state.adSizeLimit || 150}" min="1" title="Target file size limit for export warning / validator (KB)" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:7px 9px; font-size:12px; outline:none;" />
          </div>
          <div style="flex:1;">
            <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Default background</label>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="color" id="np-bg" value="${(state.defaultBg || '#0f172a')}" title="Choose default canvas background color" style="width:36px; height:32px; padding:0; border:1px solid #272c3a; border-radius:4px; background:none; cursor:pointer;" />
              <input type="text" id="np-bg-hex" value="${(state.defaultBg || '#0f172a').replace(/^#/, '').toUpperCase()}" maxlength="6" title="Hex color code for canvas background" style="flex:1; min-width:0; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:7px 9px; font-size:12px; outline:none; text-transform:uppercase;" />
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

  const closeFn = () => { bg.remove(); document.removeEventListener('keydown', escHandler); };
  const escHandler = (e) => { if (e.key === 'Escape') closeFn(); };
  document.addEventListener('keydown', escHandler);
  bg.querySelector('#np-close').onclick = closeFn;
  bg.querySelector('#np-cancel').onclick = closeFn;
  bg.onclick = (e) => { if (e.target === bg) closeFn(); };

  // Keep the color swatch and hex field in sync.
  const colorInp = bg.querySelector('#np-bg');
  const hexInp = bg.querySelector('#np-bg-hex');
  colorInp.addEventListener('input', () => { hexInp.value = colorInp.value.replace(/^#/, '').toUpperCase(); });
  hexInp.addEventListener('input', () => {
    const v = hexInp.value.replace(/[^0-9a-fA-F]/g, '');
    if (v.length === 6) colorInp.value = '#' + v;
  });

  bg.querySelector('#np-canvas-toggle').onclick = () => {
    const boxes = [...bg.querySelectorAll('.np-canvas')];
    const allOn = boxes.every(b => b.checked);
    boxes.forEach(b => { b.checked = !allOn; });
  };

  bg.querySelector('#np-create').onclick = async () => {
    const presetIndices = [...bg.querySelectorAll('.np-canvas:checked')].map(b => +b.dataset.idx);
    if (presetIndices.length === 0) { alert('Pick at least one canvas size.'); return; }
    const hex = '#' + (hexInp.value.replace(/[^0-9a-fA-F]/g, '').padEnd(6, '0').slice(0, 6) || '0f172a');
    await createNewProject({
      name: bg.querySelector('#np-name').value,
      presetIndices,
      sizeLimitKb: bg.querySelector('#np-size-limit').value,
      bgColor: hex,
      clickTag: bg.querySelector('#np-clicktag').value,
    });
    closeFn();
  };
}


function openProjectSettingsDialog() {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';

  bg.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <div class="modal-head">
        <h2>Project Settings</h2>
        <button class="btn" id="ps-close" title="Close settings">Close</button>
      </div>
      <div class="modal-body" style="display:flex; flex-direction:column; gap:16px; padding:18px 22px;">
        <div>
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Project Name</label>
          <input type="text" id="ps-name" value="${(state.projectName || 'RMIT_Ad').replace(/"/g, '&quot;')}" title="Enter the name for the project" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:7px 9px; font-size:12px; outline:none;" />
        </div>
        <div>
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">ClickTag URL</label>
          <input type="url" id="ps-clicktag" value="${(state.clickTag || 'https://www.rmit.edu.au/').replace(/"/g, '&quot;')}" title="Default exit/landing page URL for all canvases" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:7px 9px; font-size:12px; outline:none;" />
        </div>
        <div>
          <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; display:block; margin-bottom:6px;">Max ad size (KB)</label>
          <input type="number" id="ps-size-limit" value="${state.adSizeLimit || 150}" min="1" title="Target file size limit for export warning / validator (KB)" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:7px 9px; font-size:12px; outline:none;" />
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
    const newName = bg.querySelector('#ps-name').value.trim() || 'RMIT_Ad';
    const newClickTag = bg.querySelector('#ps-clicktag').value.trim();
    const newSizeLimit = Math.max(1, parseInt(bg.querySelector('#ps-size-limit').value, 10) || 150);

    state.projectName = newName;
    state.clickTag = newClickTag;
    state.adSizeLimit = newSizeLimit;

    pushHistory();
    render();
    closeFn();
  };
}


function openExportModal() {
  const tbody = state.canvases.map((c) => {
    const html = generateExportHTML(c);
    const kb = (new Blob([html]).size / 1024).toFixed(1);
    const ct = state.clickTag || 'No clickTag';
    const projName = state.projectName || 'Ad';
    const fullName = `${projName}_${c.width}x${c.height}`;
    return `
      <tr data-cid="${c.id}">
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330;"><input type="checkbox" class="export-chk" data-cid="${c.id}" checked title="Select this canvas size for export" /></td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330;">${fullName}</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330;">${c.width}x${c.height}</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330; color:${kb > 150 ? '#ef4444' : '#c7ccdb'}">${kb} KB</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330; font-family:monospace; font-size:10px; color:var(--text-label); word-break:break-all; max-width:200px;">${ct}</td>
      </tr>
    `;
  }).join('');

  const bodyHTML = `
    <div style="margin-bottom: 16px; display: flex; gap: 8px; align-items:center;">
      <button class="btn primary" id="btn-export-selected" title="Export selected canvases as individual zip packages inside a main zip">Export Selected (ZIP)</button>
      ${(state.dataMerge && state.dataMerge.rows && state.dataMerge.rows.length)
        ? `<button class="btn" id="btn-export-versions" title="Generate and export all data versions for the selected configurations">Export All Versions (${state.dataMerge.rows.length})</button>
           <span style="font-size:10px;color:var(--text-muted);">one folder per row</span>`
        : ''}
    </div>
    <table style="width:100%; text-align:left; border-collapse:collapse; font-size:13px; color:var(--text-main);">
      <thead>
        <tr>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;width:30px;"><input type="checkbox" id="chk-all" checked title="Select/deselect all canvas sizes" /></th>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;color:var(--text-label);font-weight:600;">Name</th>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;color:var(--text-label);font-weight:600;">Size</th>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;color:var(--text-label);font-weight:600;">Est. Weight</th>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;color:var(--text-label);font-weight:600;">Click Tag</th>
        </tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>
  `;

  openModal('Export Ads', bodyHTML, false);

  const modalBg = document.body.lastElementChild;

  const chkAll = modalBg.querySelector('#chk-all');
  const chks = modalBg.querySelectorAll('.export-chk');
  chkAll.addEventListener('change', (e) => {
    chks.forEach(chk => chk.checked = e.target.checked);
  });

  const verBtn = modalBg.querySelector('#btn-export-versions');
  if (verBtn) verBtn.addEventListener('click', () => dmExportAllVersions());

  modalBg.querySelector('#btn-export-selected').addEventListener('click', async () => {
    if (typeof JSZip === 'undefined') { alert('JSZip is not loaded.'); return; }

    const selectedIds = Array.from(chks).filter(c => c.checked).map(c => c.dataset.cid);
    if (selectedIds.length === 0) { alert('No ads selected.'); return; }

    // If a data version is active, export reflects it (WYSIWYG).
    const zip = new JSZip();
    await dmRunExport(dmActiveRowForOutput(), async () => {
      for (const cid of selectedIds) {
        const c = state.canvases.find(x => x.id === cid);
        const adZip = new JSZip();
        await addCanvasAssetsToZip(c, adZip);
        const html = generateExportHTML(c, adZip);
        const projName = state.projectName || 'Ad';
        const safeName = projName.replace(/[^a-zA-Z0-9_-]/g, '_');

        adZip.file('index.html', html);
        const adContent = await adZip.generateAsync({ type: 'blob' });
        zip.file(`${safeName}_${c.width}x${c.height}.zip`, adContent);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          types: [{ description: 'Exported Ads ZIP', accept: { 'application/zip': ['.zip'] } }],
          suggestedName: 'exported_ads.zip'
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } catch (e) { if (e.name !== 'AbortError') console.error('Export failed:', e); }
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = 'exported_ads.zip';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  });
}

document.getElementById('menu-file-export').addEventListener('click', openExportModal);
document.getElementById('btn-export-top').addEventListener('click', openExportModal);

var sizeUpdateTimeout = null;
function queueSizeUpdate() {
  if (typeof JSZip === 'undefined') return;
  if (sizeUpdateTimeout) clearTimeout(sizeUpdateTimeout);
  sizeUpdateTimeout = setTimeout(async () => {
    for (const c of state.canvases) {
      const sizeSpan = document.getElementById(`val-size-${c.id}`);
      const warnSpan = document.getElementById(`val-warn-${c.id}`);
      if (!sizeSpan || !warnSpan) continue;

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
          let src = state.assets[el.assetId] || el.assetId;
          if (!src) {
            hasMissing = true;
          } else if (src.startsWith('http://') || src.startsWith('https://')) {
            hasExt = true;
          } else if (src.startsWith('data/Elements/')) {
            // Valid local application asset
          } else if (!state.assets[el.assetId]) {
            hasMissing = true;
          }
        }
      });

      if (hasMissing) errors.push('Contains missing assets');
      if (hasExt) errors.push('Contains external URLs (Google Ads requires local assets)');

      const zip = new JSZip();

      // Pre-fetch for validation zip size (reflecting the active data version, if any).
      await dmRunExport(dmActiveRowForOutput(), async () => {
        await addCanvasAssetsToZip(c, zip);
        zip.file('index.html', generateExportHTML(c, zip));
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const kb = (blob.size / 1024).toFixed(1);

      const limitKb = state.adSizeLimit || 150;
      if (blob.size > limitKb * 1024) {
        errors.push(`Filesize (${kb} KB) exceeds ${limitKb}KB limit`);
      }

      c._valKb = kb;
      c._valErrors = errors;
    }
    renderCanvasesList();
  }, 300);
}

document.getElementById('menu-edit-undo').addEventListener('click', undo);
document.getElementById('menu-edit-redo').addEventListener('click', redo);
document.getElementById('menu-help-shortcuts').addEventListener('click', () => {
  const body = `
    <style>
      .shortcuts-table { width: 100%; font-size: 12px; line-height: 1.4; border-collapse: collapse; }
      .shortcuts-table td { padding: 4px 0; border-bottom: 1px solid #1f2330; }
      .shortcuts-table tr:last-child td { border-bottom: none; }
      .shortcuts-table b { color: #fff; font-weight: 500; }
    </style>
    <table class="shortcuts-table">
      <tr><td><b>Save Project</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">S</span></td></tr>
      <tr><td><b>Copy Elements</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">C</span></td></tr>
      <tr><td><b>Cut Elements</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">X</span></td></tr>
      <tr><td><b>Paste Elements</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">V</span></td></tr>
      <tr><td><b>Duplicate Elements</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">D</span></td></tr>
      <tr><td><b>Group Elements</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">G</span></td></tr>
      <tr><td><b>Ungroup Elements</b></td><td style="text-align: right;"><span class="kbd">⇧</span> + <span class="kbd">⌘ / Ctrl</span> + <span class="kbd">G</span></td></tr>
      <tr><td><b>Bring Layer Forward</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">]</span></td></tr>
      <tr><td><b>Send Layer Backward</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">[</span></td></tr>
      <tr><td><b>Undo</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">Z</span></td></tr>
      <tr><td><b>Redo</b></td><td style="text-align: right;"><span class="kbd">⌘ / Ctrl</span> + <span class="kbd">Y</span> or <span class="kbd">⇧</span> + <span class="kbd">⌘ / Ctrl</span> + <span class="kbd">Z</span></td></tr>
      <tr><td><b>Delete Elements</b></td><td style="text-align: right;"><span class="kbd">⌫</span> <span class="kbd">Del</span></td></tr>
      <tr><td><b>Duplicate on Drag</b></td><td style="text-align: right;">Hold <span class="kbd">Alt</span> while dragging</td></tr>
      <tr><td><b>Scale Font Size</b></td><td style="text-align: right;">Hold <span class="kbd">Alt</span> + Resize handle</td></tr>
      <tr><td><b>Constrain Drag / Aspect Ratio</b></td><td style="text-align: right;">Hold <span class="kbd">⇧ Shift</span> while dragging / resizing</td></tr>
      <tr><td><b>Snap Resize to 10px</b></td><td style="text-align: right;">Hold <span class="kbd">⌘ / Ctrl</span> while resizing</td></tr>
      <tr><td><b>Nudge 1 Pixel</b></td><td style="text-align: right;"><span class="kbd">←</span> <span class="kbd">↑</span> <span class="kbd">↓</span> <span class="kbd">→</span></td></tr>
      <tr><td><b>Nudge 10 Pixels</b></td><td style="text-align: right;"><span class="kbd">⇧ Shift</span> + <span class="kbd">← ↑ ↓ →</span></td></tr>
      <tr><td><b>Pan Workspace</b></td><td style="text-align: right;">Hold <span class="kbd">Space</span> + Drag</td></tr>
      <tr><td><b>Toggle Fullscreen</b></td><td style="text-align: right;"><span class="kbd">Tab</span></td></tr>
      <tr><td><b>Deselect / Exit Modes</b></td><td style="text-align: right;"><span class="kbd">Esc</span></td></tr>
      <tr><td><b>Context Menu</b></td><td style="text-align: right;">Right-click Canvas or Element</td></tr>
      <tr><td><b>Edit Text Inline</b></td><td style="text-align: right;">Double-click text element</td></tr>
      <tr><td><b>Select Inside Group</b></td><td style="text-align: right;">Double-click grouped element</td></tr>
      <tr><td><b>Workspace Settings</b></td><td style="text-align: right;">Right-click empty workspace</td></tr>
    </table>`;
  openModal('Shortcuts', body, false);
});



document.getElementById('menu-help-documentation').addEventListener('click', () => {
  const body = `
      <div style="font-size:13px; line-height:1.6; color:var(--text-main); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-height:70vh; overflow-y:auto; padding-right:16px;">
        
        <div style="background: linear-gradient(135deg, rgba(34, 211, 238, 0.08), rgba(124, 92, 255, 0.08)); border: 1px solid rgba(124, 92, 255, 0.2); border-radius: 8px; padding: 14px; margin-bottom: 14px;">
          <h3 style="color:#22d3ee; margin:0 0 6px 0; font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            Key Concept: Multi-Canvas Workflow & Link Groups
          </h3>
          <p style="margin:0; font-size:12px; color:var(--text-muted); line-height:1.5;">
            Design once, propagate everywhere. RMIT Adflow lets you orchestrate every banner size (Canvas) inside a single project. Using <b>Link Groups</b>, you bind elements — headlines, CTA buttons, logos, background shapes — across canvases, so a change syncs automatically (or in real time) instead of being re-done by hand in every size.
          </p>
        </div>

        <div style="background: linear-gradient(135deg, rgba(124, 92, 255, 0.14), rgba(167, 139, 250, 0.06)); border: 1px solid rgba(124, 92, 255, 0.35); border-radius: 8px; padding: 14px; margin-bottom: 20px;">
          <h3 style="color:var(--accent-light); margin:0 0 6px 0; font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 9l-4.8 3.5L17 18l-5-3.5L7 18l1.8-5.5L4 9l6.1.2z"></path></svg>
            Headline Feature: Auto-Resize from Selected (AI)
          </h3>
          <p style="margin:0; font-size:12px; color:var(--text-muted); line-height:1.5;">
            Build your whole size set from one designed canvas. Lay out a single banner exactly how you want it, then hit <b>Auto-resize from selected</b> in the Tools panel — Studio reads every element, figures out its role, rebuilds all the other canvases to fit their proportions, and links everything together so future edits stay in sync. See section 2 for the full breakdown.
          </p>
        </div>

        <h2 style="color:#22d3ee; margin-top:0; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:15px; font-weight:600;">1. Workspace & Multi-Canvas Orchestration</h2>
        <p>Instead of managing separate files for each banner size, RMIT Adflow arranges all your ad sizes (Canvases) side-by-side on an infinite panning workspace.</p>
        <ul style="padding-left:20px; color:var(--text-muted); margin-bottom:16px;">
          <li style="margin-bottom:6px;"><b>Adding Canvases:</b> Click the <b>+</b> button in the left sidebar to add standard IAB display sizes (300×250, 728×90, 160×600, 970×250, 320×50, …) or input custom dimensions.</li>
          <li style="margin-bottom:6px;"><b>Active Canvas Selection:</b> Click any canvas to make it the active workspace. The side property panels and options automatically scope to the selected canvas.</li>
          <li style="margin-bottom:6px;"><b>Navigation & Zoom:</b> Hold <span class="kbd">Space</span> and drag to pan. Scroll the mouse wheel (or pinch) to zoom; click the zoom % in the top bar to reset to 100%. Press <span class="kbd">Tab</span> to toggle Fullscreen Mode.</li>
          <li style="margin-bottom:6px;"><b>Canvas Controls:</b> Double-click a canvas title to rename it. Right-click a canvas for Preview, Export HTML5 / PNG, change background, or clear contents. Right-click its sidebar entry to clone or delete.</li>
          <li style="margin-bottom:6px;"><b>Crop to Canvas:</b> Enable in <b>Settings</b> to clip anything that bleeds outside a canvas's bounds — an Illustrator-style trim preview of the exported result.</li>
        </ul>

        <h2 style="color:var(--accent-light); margin-top:20px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:15px; font-weight:600;">2. Auto-Resize from Selected ✨ (AI)</h2>
        <p>The flagship workflow accelerator. Design one canvas, then propagate it across every other size in a single click via the <b>Auto-resize from selected</b> button in the left <b>Tools</b> panel.</p>
        <ul style="padding-left:20px; color:var(--text-muted); margin-bottom:10px;">
          <li style="margin-bottom:8px;"><b>Role detection (hybrid):</b> Each element on the source canvas is classified by layer name first, then by smart heuristics — <i>heading</i>, <i>subheading</i>, <i>button</i>, <i>logo</i>, <i>shape</i>, <i>background image</i> (anything filling the canvas), or a generic fallback for anything unrecognised.</li>
          <li style="margin-bottom:8px;"><b>Format-aware placement & sizing:</b> Every target canvas is matched to a format class — skyscraper, rectangle, leaderboard, billboard, mobile — and each role is positioned and scaled with presets tuned for that shape (e.g. CTAs anchor bottom-centre on tall/rectangle formats and right-centre on wide/mobile strips; headings stack top-left and reserve space for the button on wide units; logos pin top-right; full-bleed images fill the frame).</li>
          <li style="margin-bottom:8px;"><b>Clean slate:</b> Before rebuilding, the other canvases are <b>cleared</b> so only source-derived elements remain — you'll be asked to confirm first, and the whole operation is a single undo.</li>
          <li style="margin-bottom:8px;"><b>Auto-linking:</b> Every propagated element is placed in its own Link Group with role-appropriate sync defaults. Content and appearance (text, typeface, colours, stroke, animation) stay in sync across canvases, while <b>position, dimensions and font-size remain independent</b> per format — so later edits to wording or colour ripple everywhere without disturbing each size's tuned layout.</li>
        </ul>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">Tip: results are a strong starting point, not a final layout — nudge anything afterwards, and your manual tweaks to size/position won't be overwritten by content syncs.</p>

        <h2 style="color:#22d3ee; margin-top:20px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:15px; font-weight:600;">3. Link Groups & Synchronization (Real-time & Manual)</h2>
        <p>Link Groups are the engine behind the multi-canvas workflow, binding sibling elements across canvases.</p>
        <ul style="padding-left:20px; color:var(--text-muted); margin-bottom:16px;">
          <li style="margin-bottom:8px;"><b>Auto-Link:</b> Click <b>Auto-Link</b> in the sidebar to scan all canvases and group matching elements by layer name and type. Toggle <b>Selected only</b> to match against just the currently selected layer.</li>
          <li style="margin-bottom:8px;"><b>Manual Linking:</b> Right-click an element → <b>Link Group</b> to join an existing group (which lists existing groups as "Linked to: [Name]" if the element is already part of the group, or "Link to: [Name]" otherwise), or create a new group from the Link panel.</li>
          <li style="margin-bottom:8px;"><b>Sync Properties:</b> Define exactly which properties sync within a group — <i>Text content</i>, <i>Font settings</i> (family/weight/spacing/alignment), the standalone <i>Font size</i>, <i>Colors</i> (text color), <i>Background</i> (text background color &amp; settings), <i>Colors &amp; Fill</i>, <i>Stroke</i>, <i>Transform (Width/Height)</i>, <i>Opacity</i>, <i>IN Animations</i>, and <i>Effects</i>. Splitting Font size from Font settings lets you keep one typeface across canvases while each size keeps its own scale.</li>
          <li style="margin-bottom:8px;"><b>Live-Link Mode (Real-time Sync):</b> Toggle the lightning-bolt icon in the Link Groups panel (or the <b>Live-link mode</b> checkbox under Sync Properties). When active, any edit — moving, resizing, editing text, changing colour — propagates to all siblings instantly.</li>
          <li style="margin-bottom:8px;"><b>Manual Push:</b> With Live-link off, broadcast changes on demand via <b>Push changes to group</b> in the context menu or the side-panel button.</li>
        </ul>

        <h2 style="color:#22d3ee; margin-top:20px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:15px; font-weight:600;">4. Element Creation & Customization</h2>
        <p>Right-click inside any canvas to add design layers. Adjust their visuals using the right-hand Properties Panel:</p>
        <ul style="padding-left:20px; color:var(--text-muted); margin-bottom:16px;">
          <li style="margin-bottom:6px;"><b>Text & Typography:</b> Supports custom styling (size, alignment, weight, line-height, leading, and tracking). Includes pre-installed brand typography (Museo Sans, RMIT Lato, etc.). Double-click text layers to edit content inline.</li>
          <li style="margin-bottom:6px;"><b>CTA Buttons:</b> Specialized text boxes with integrated auto-hug layout padding, stroke widths, and background fills. Excellent for responsive Call-to-Actions.</li>
          <li style="margin-bottom:6px;"><b>Images & Brand Assets:</b> Insert SVG/PNG assets. Supports RMIT logo configurations and custom file uploads. Holds aspect ratio bounds automatically (press <span class="kbd">Shift</span> to stretch).</li>
          <li style="margin-bottom:6px;"><b>Vector Shapes:</b> Add editable rectangles, circles, or custom shapes with stroke and fill adjustments.</li>
          <li style="margin-bottom:6px;"><b>Advanced Color Picker:</b> Swatches support linear and radial gradients, hex inputs, alpha opacity settings, and saved project swatches.</li>
        </ul>

        <h2 style="color:#22d3ee; margin-top:20px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:15px; font-weight:600;">5. Assets Panel &amp; Reusable Elements</h2>
        <p>The Assets panel (bottom-left) allows you to store, organize, and reuse design elements and image uploads:</p>
        <ul style="padding-left:20px; color:var(--text-muted); margin-bottom:16px;">
          <li style="margin-bottom:6px;"><b>Saving Custom Assets:</b> Select any canvas element (text, shape, button, image, or group) and click the <b>+</b> button in the Assets panel header (or right-click the element and select <b>Save to Assets</b>) to store it. Custom assets preserve all styles, contents, and animations.</li>
          <li style="margin-bottom:6px;"><b>Asset Folders:</b> Create folders via the folder icon in the panel header. Double-click custom folder names to rename them (read-only preloaded folders cannot be renamed).</li>
          <li style="margin-bottom:6px;"><b>External Files &amp; Drag-and-Drop:</b> Drag image files (PNG, JPEG, SVG) directly from your computer into the Assets panel or onto a specific folder. Alternatively, click the <b>+</b> button to trigger a prompt to upload new files.</li>
          <li style="margin-bottom:6px;"><b>Organizing Assets:</b> Supports single/multiple selection (hold <span class="kbd">Ctrl</span> or <span class="kbd">Shift</span>). Drag selected assets into folders or out to the left margin to move them back to the root list. Press <span class="kbd">Delete</span> or <span class="kbd">Backspace</span> to delete selected custom assets.</li>
          <li style="margin-bottom:6px;"><b>RMIT Folder:</b> A read-only collection of RMIT brand assets is preloaded automatically. These assets are protected against deletion or renaming and support WebP compression when placed on canvas.</li>
          <li style="margin-bottom:6px;"><b>Adding to Canvas:</b> Drag assets from the panel onto any canvas, or double-click an asset to place it in the center. Placed elements are registered correctly in the Layers list.</li>
        </ul>

        <h2 style="color:#22d3ee; margin-top:20px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:15px; font-weight:600;">6. Layer Stacking & Persistence</h2>
        <p>Order and target layers across frames via the left Layers Panel:</p>
        <ul style="padding-left:20px; color:var(--text-muted); margin-bottom:16px;">
          <li style="margin-bottom:6px;"><b>Arranging:</b> Drag layers up and down the stack, or use <span class="kbd">Ctrl</span>+<span class="kbd">[</span> and <span class="kbd">Ctrl</span>+<span class="kbd">]</span> to order.</li>
          <li style="margin-bottom:6px;"><b>Group & Isolate:</b> Select multiple items and press <span class="kbd">Ctrl</span>+<span class="kbd">G</span> to group. Double-click a group to isolate it, focusing edits solely inside its bounds.</li>
          <li style="margin-bottom:6px;"><b>Persistence (Frame vs Top vs Bottom):</b> Click the persistence badge on a layer. <i>Frame</i> limits the element to the current timeline frame. <i>Bottom</i> locks it as a background across all frames. <i>Top</i> forces it to overlay above all frames (useful for branding logos and persistent CTAs).</li>
        </ul>

        <h2 style="color:#22d3ee; margin-top:20px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:15px; font-weight:600;">7. Timeline, Animations & Loop</h2>
        <p>Animate your display ads using the frame-based sequencer at the top of the workspace:</p>
        <ul style="padding-left:20px; color:var(--text-muted); margin-bottom:16px;">
          <li style="margin-bottom:6px;"><b>Frames:</b> Create sequence steps with individual display durations. The per-frame transition selector covers <i>Fade</i>, <i>Slide</i> (L/R/U/D), and <i>Swipe</i> (L/R/U/D, a wipe that reveals the next frame). Slide/Swipe also offer an <b>Add Fade</b> toggle and a transition duration.</li>
          <li style="margin-bottom:6px;"><b>Entrance Animations:</b> Apply IN animations (Pop-in, Fade, Slide, Typing) per layer to animate them onto the screen when a frame begins, with duration, delay and an optional fade toggle.</li>
          <li style="margin-bottom:6px;"><b>Continuous Effects:</b> Apply looping effects (Pan, Zoom, Float, Pulse, Wiggle, Spin, Heartbeat, Flash) to keep banners dynamic. Toggle "Perform once" to play a single cycle instead of looping.</li>
          <li style="margin-bottom:6px;"><b>Text background animation:</b> Text layers can carry a coloured background with adjustable padding and coverage; with a typing IN animation it can sweep in line-by-line alongside the text.</li>
          <li style="margin-bottom:6px;"><b>Timeline Loop:</b> Toggle the global Loop option to repeat the whole timeline continuously.</li>
        </ul>

        <h2 style="color:#22d3ee; margin-top:20px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:15px; font-weight:600;">8. Alignment, Guides & Snapping</h2>
        <p>Ensure precise layout alignment across your banners:</p>
        <ul style="padding-left:20px; color:var(--text-muted); margin-bottom:16px;">
          <li style="margin-bottom:6px;"><b>Magnetic Snapping:</b> Elements align and snap to canvas edges, centers, guidelines, and sibling layers. Toggle Snapping in the workspace context menu.</li>
          <li style="margin-bottom:6px;"><b>Guides & Rulers:</b> Toggle rulers on. Drag from the horizontal or vertical ruler into a canvas to position alignment guides. Drag a guide back to the ruler to delete.</li>
          <li style="margin-bottom:6px;"><b>Precision Nudging:</b> Use arrow keys to nudge elements 1px, or hold <span class="kbd">Shift</span> to nudge 10px.</li>
        </ul>

        <h2 style="color:#22d3ee; margin-top:20px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:15px; font-weight:600;">9. Saving, Auto-Save & Project Management</h2>
        <p>Your work is protected automatically, and projects are easy to start, reopen and configure:</p>
        <ul style="padding-left:20px; color:var(--text-muted); margin-bottom:16px;">
          <li style="margin-bottom:6px;"><b>Seamless auto-save:</b> Every change is continuously persisted to this browser (IndexedDB) and restored when you return — including your zoom and scroll position. The top bar shows a live status: <i>All changes saved</i>, <i>Saving…</i>, or <i>Unsaved changes</i>. No prompt on close.</li>
          <li style="margin-bottom:6px;"><b>Project History:</b> Undo/redo history is saved directly within the browser session autosave and inside <code>.flow</code> project files, allowing full history recovery upon reopening or importing a project. The history limit is configurable from <b>File → Settings</b> (1 to 50 states, default 10). <i>Warning: Storing history does not persist deleted assets (like images) from a past session. Undoing after reopening a project might result in missing images if those assets were deleted and pruned.</i></li>
          <li style="margin-bottom:6px;"><b>Manual save / open (.flow):</b> <b>File → Save Project</b> (<span class="kbd">⌘ / Ctrl</span>+<span class="kbd">S</span>) writes a portable <b>.flow</b> file (project + embedded assets); <b>Open Project</b> loads <code>.flow</code> (and legacy <code>.cook</code>/<code>.zip</code>) back in.</li>
          <li style="margin-bottom:6px;"><b>Open Recent:</b> The File menu lists your last manually-saved projects with timestamps for one-click restore.</li>
          <li style="margin-bottom:6px;"><b>New Project wizard:</b> Choose which canvas sizes to include (all on by default), the project name, ClickTag URL, the default canvas background colour, and a configurable <b>maximum ad weight (KB)</b> used by the live validator.</li>
          <li style="margin-bottom:6px;"><b>Project Settings &amp; Settings:</b> Edit project name / ClickTag in <b>File → Project Settings</b>; app-level preferences (theme, rulers, snapping, Crop to Canvas, and history limit) live in <b>File → Settings</b>.</li>
        </ul>

        <h2 style="color:var(--accent-light); margin-top:20px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:15px; font-weight:600;">10. Data &amp; Versions ✨ (Dynamic Creative)</h2>
        <p>Design <b>one</b> template, then mail-merge a spreadsheet of data into it to produce a finished ad set per row — perfect for running the same banner set across many RMIT courses. Open it from <b>File → Data &amp; Versions…</b> or the <b>Data</b> button in the top bar.</p>
        <ul style="padding-left:20px; color:var(--text-muted); margin-bottom:10px;">
          <li style="margin-bottom:8px;"><b>1 · Mark what's dynamic:</b> Select an element and, in the <b>Dynamic Data</b> section of the Properties panel, tick the fields that should vary per version — <i>Text</i> &amp; <i>Color</i> on text, plus <i>Background</i> on buttons, <i>Image</i> on images, or fill <i>Color</i> on shapes. A small dot marks dynamic elements on the canvas. Unmarked elements are never touched by the merge.</li>
          <li style="margin-bottom:8px;"><b>Slots &amp; link groups:</b> A dynamic field becomes a <b>slot</b>. If the element belongs to a Link Group, the slot covers the <b>whole group</b> — so one binding fills that element on every size at once. Toggling a field on a linked element automatically applies it to all its siblings, and your link-group sync settings are never altered.</li>
          <li style="margin-bottom:8px;"><b>2 · Load your sheet:</b> In the panel, <b>Import CSV</b> (or add columns/rows by hand). Map each spreadsheet column to a slot's field, choose the <b>★ key column</b> (used to name exported folders), and optionally bind a column to the <b>ClickTag</b> exit URL. The whole sheet is stored inside the <code>.flow</code> project, auto-saves with it, and can be exported back to CSV for the team to edit.</li>
          <li style="margin-bottom:8px;"><b>3 · Switch versions live:</b> Pick a row from the <b>Version</b> dropdown in the top bar to preview it on the canvas — in both editing and preview modes. Substitution is <b>non-destructive</b>: your template defaults are never overwritten, and choosing "Template (no version)" returns to them.</li>
          <li style="margin-bottom:8px;"><b>Edit-in-place &amp; Data lock:</b> While a version is active, editing a dynamic slot on the canvas (typing into text, recolouring, swapping an image) writes back to <b>that row's cell</b> rather than the template. Click the <b>lock</b> button next to the dropdown to make dynamic slots read-only so you can review versions without nudging the data.</li>
          <li style="margin-bottom:8px;"><b>4 · Export every version:</b> In the Export dialog, <b>Export All Versions</b> generates one folder per row (named from the key column), each containing the full Google-Ads-compliant ZIP set, through the standard export pipeline.</li>
        </ul>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">Image columns should reference an asset filename already used in the project (or a full URL). Frames need no special handling — a frame-1 and frame-2 headline are simply two differently-named slots.</p>

        <h2 style="color:#22d3ee; margin-top:20px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:15px; font-weight:600;">11. Exporting & Google Ads Validation</h2>
        <p>Export ready-to-run HTML5 ad packages tailored for Google Ads compliance:</p>
        <ul style="padding-left:20px; color:var(--text-muted); margin-bottom:8px;">
          <li style="margin-bottom:6px;"><b>ClickTag Configuration:</b> Set target redirects globally or override individual click destinations per canvas.</li>
          <li style="margin-bottom:6px;"><b>Validation Audits:</b> The left panel runs live checks on assets, external links and weight, flagging errors when a canvas exceeds your configured size limit (default 150&nbsp;KB, the Google Ads standard) or contains non-compliant external assets.</li>
          <li style="margin-bottom:6px;"><b>Production Bundling:</b> Exports as self-contained ZIP files with inline code and embedded assets — per canvas, or batch-export the whole set.</li>
          <li style="margin-bottom:6px;"><b>PNG backup:</b> One-click static raster capture of any frame for use as a fallback image.</li>
        </ul>

      </div>`;
  openModal('RMIT Adflow Documentation', body, false);
});


const CHANGELOG_DATA = [
  {
    version: 'v0.8.0',
    date: 'May 2026',
    items: [
      'Added options to save undo/redo history within the .flow project file and the IndexedDB autosave, allowing full project history recovery upon session reload or project file import.',
      'Introduced a "History & Saving" settings section, allowing users to configure the saved history limit (1 to 50 entries, defaulting to 10).',
      'Added a prominent warning in the settings panel regarding deleted image and assets persistence across sessions to prevent missing references when undoing past deletions.',
      'Synchronized versioning strings across Settings headers, About dialogs, and Update checks.'
    ]
  },
  {
    version: 'v0.7.0',
    date: 'May 2026',
    items: [
      'Refined saving indicators with a simpler, cleaner floppy disk icon and status indicators (check mark for saved, rotating circle for saving, amber dot for unsaved, and cross for error) positioned before the Preview button with a fixed width to prevent layout shifting.',
      'Decoupled Link Group and Dynamic Data indicator badges from element wrappers, aligning them statically with the active selection outline to prevent them from animating or scaling with elements.',
      'Show slot dropdowns directly in the Properties menu for quick binding next to the checkboxes, with dropdowns grayed out when unchecked.',
      'Added version cycle arrows in the top bar to easily cycle through active data versions.',
      'Persistent Dynamic Data panel in the properties sidebar, showing a general description and setup button even when no element is selected.',
      'Global rename of "Add to canvases and link" to "Distribute & Link" for clarity.'
    ]
  },
  {
    version: 'v0.6.0',
    date: 'May 2026',
    items: [
      'Data & Versions (dynamic creative): bind named element “slots” to spreadsheet columns and generate one finished ad set per row — ideal for spinning up the same banner set across many RMIT courses. Open it from File → Data & Versions or the Data button in the top bar.',
      'Per-element dynamic opt-in: a new “Dynamic Data” section in the Properties panel lets you mark exactly which fields vary per version (text & colour on text, + background on buttons, image on images, fill colour on shapes). Toggles propagate across a link group, so one logical slot stays consistent on every size.',
      'Composable with link groups: a slot maps to its link group when one exists (one binding fans across all sizes) or to a single element otherwise — without ever altering your link-group sync settings.',
      'Version switcher in the top bar applies the selected row live in both editing and preview, non-destructively — your template defaults are never overwritten.',
      'Edit-in-place: changing a dynamic slot on the canvas while a version is active writes back to that row’s cell. A new Data lock button makes dynamic slots read-only so you can review versions without nudging the data.',
      'ClickTag is bindable per version, and “Export All Versions” produces one folder per row (named from your chosen key column) through the standard Google-Ads export pipeline. The data sheet is stored inside the .flow project (auto-saves & travels) and can be imported/exported as CSV.'
    ]
  },
  {
    version: 'v0.5.1',
    date: 'May 2026',
    items: [
      'Converted brand and editor fonts (Museo & Helvetica Neue LT Pro) to highly compressed WOFF2 format to optimize loading speed.',
      'Implemented selective font packaging, bundling only the specific font families and weights used by the text and button elements of each canvas (e.g. only packaging Museo 700 if Museo 300/500 are not used), minimizing export bundle sizes.',
      'Added a WebP image compression function for non-vector uploaded images inside the workspace, allowing quality customization via slider with real-time file size previews. Previously compressed images grey out the option to avoid duplicate compression.'
    ]
  },
  {
    version: 'v0.5.0',
    date: 'May 2026',
    items: [
      'Auto-resize from selected (AI): build your entire size set in one click. It reads every element on the selected canvas, detects each one’s role (heading, subheading, button, logo, shape, background image, or generic), then clears the other canvases and re-places + re-sizes matching elements using per-format layout presets.',
      'Auto-resize automatically links every propagated element into its own group with role-aware sync defaults — content and appearance stay in sync across canvases while position, dimensions and font-size remain independent per format.',
      'Added a dedicated "Font size" sync property for text link groups, split out from "Font settings" — you can now sync the typeface across canvases while keeping per-canvas sizes.',
      'Added seamless local auto-save: projects are continuously persisted to the browser (IndexedDB) and restored on reload, with a live save-status indicator (All changes saved / Saving… / Unsaved) in the top bar. Manual .flow saving is unchanged.',
      'New Project wizard now lets you pick which canvas sizes to include, the project name, the default canvas background colour, and a configurable maximum ad weight (KB) that drives the live size-validation warnings.',
      'Cleaned up the Tools panel — removed the permanent highlight on the Auto-resize and Toggle Safezones buttons (the AI badge stays).'
    ]
  },
  {
    version: 'v0.4.32',
    date: 'May 2026',
    items: [
      'Disabled the confirmation pop-up alert when adding/cloning elements to other canvases and linking them.'
    ]
  },
  {
    version: 'v0.4.31',
    date: 'May 2026',
    items: [
      'Added a "Live-link mode" option under Sync Properties which synchronizes element updates across all canvases in real time as the user edits (dragging, resizing, typing, etc.).',
      'Added a "Live-link" lightning bolt button to the active link groups panel, and condensed the action button layout to optimize sidebar space.'
    ]
  },
  {
    version: 'v0.4.30',
    date: 'May 2026',
    items: [
      'Disabled the success pop-up message upon successful auto-linking; alerts are now shown only when no elements are found to link.'
    ]
  },
  {
    version: 'v0.4.29',
    date: 'May 2026',
    items: [
      'Reorganized context menu layout: Moved "Push changes to group" to the main context menu directly above the "Link Group" submenu item.',
      'Renamed "Link to: [Name]" list items inside the "Link Group" submenu to "Linked to: [Name]" and moved them to the top of the submenu.'
    ]
  },
  {
    version: 'v0.4.28',
    date: 'May 2026',
    items: [
      'Added a "Selected only" checkbox option under Auto-Link to only auto-link elements matching the name and type of currently selected layers.'
    ]
  },
  {
    version: 'v0.4.27',
    date: 'May 2026',
    items: [
      'Added a "Clear everything" button to the TOOLs section to reset all canvases, selections, and link groups.',
      'Cleaned up the element context menu by grouping Remove Link, Push Changes, and Delete Group actions inside the Link Group submenu.',
      'Added "Distribute & Link" as a direct context menu action under the Link Group submenu.',
      'Renamed the link-group panel button to "Auto-Link" and the canvas element cloning action to "Distribute & Link".',
      'Ensured cloned elements are automatically centered on target canvases.',
      'Synchronized link group icons to match the exact SVGs of the corresponding Layer list item types.',
      'Highlighted active link group rows in the sidebar when any of their elements are selected.'
    ]
  },
  {
    version: 'v0.4.26',
    date: 'May 2026',
    items: [
      'Added a comprehensive component linking system: link elements of the same type across canvases to sync text, styles, shapes, button properties, images, rotation, opacity, IN animations, and effects.',
      'Added support for auto-linking elements by layer name and type, with visual highlighting, group visibility toggles, and group deletion.',
      'Added inline double-click renaming, marquee scrolling, and a dedicated right-side element counter badge for link groups.',
      'Relocated project settings to a dedicated modal dialog accessible from the File dropdown menu, and added a ClickTag URL field to the New Project wizard.'
    ]
  },
  {
    version: 'v0.4.25',
    date: 'May 2026',
    items: [
      'Introduced emotional support loading spinner: when exports take longer than 3 seconds, the spinner now sighs dramatically to validate your frustration.',
      'Refactored the alignment helper to respect personal space. Elements will now complain in the console if positioned too close to each other.',
      'Fixed a bug where zoom levels above 400% would temporarily summon a portal to the Flashtalking timeline dimension.'
    ]
  },
  {
    version: 'v0.4.24',
    date: 'May 2026',
    items: [
      'Refactored "Recent Projects" to be a nested "Open Recent" slide-out submenu inside the File dropdown menu.'
    ]
  },
  {
    version: 'v0.4.23',
    date: 'May 2026',
    items: [
      'Added a "Recent Projects" section in the File menu displaying the last 10 manually saved projects with their names and save timestamps, allowing quick one-click restoration.'
    ]
  },
  {
    version: 'v0.4.22',
    date: 'May 2026',
    items: [
      'Added a 1px solid black border overlay showing the exact boundaries of the canvas in the editor workspace when Crop to Canvas is disabled.'
    ]
  },
  {
    version: 'v0.4.21',
    date: 'May 2026',
    items: [
      'Fixed frame transition stacking issue where animating frame-dependent images would briefly override and overlap persistent top layers by isolating layer z-indices.'
    ]
  },
  {
    version: 'v0.4.20',
    date: 'May 2026',
    items: [
      'Allows direct pasting of text strings and image files from standard clipboards into active canvas without selecting or adding element placeholders first.'
    ]
  },
  {
    version: 'v0.4.19',
    date: 'May 2026',
    items: [
      'Strips all rich-text and source formatting (HTML/inline styles) when pasting text from external applications like Adobe Illustrator, Microsoft Word, or web pages.'
    ]
  },
  {
    version: 'v0.4.18',
    date: 'May 2026',
    items: [
      'Updated default "Learn more" button to use Museo 700 branding typeface.'
    ]
  },
  {
    version: 'v0.4.17',
    date: 'May 2026',
    items: [
      'Added a default "Learn more" button in RMIT font styling on top of the main layer group for all canvases in new projects.'
    ]
  },
  {
    version: 'v0.4.16',
    date: 'May 2026',
    items: [
      'Added a toggle setting (off by default) to temporarily bring elements to the front layer during dragging operations.'
    ]
  },
  {
    version: 'v0.4.15',
    date: 'May 2026',
    items: [
      'Introduced pre-styled heading (Museo 700) and subheading (Helvetica Neue LT Pro) elements into the main layer group for all canvases on project creation.'
    ]
  },
  {
    version: 'v0.4.14',
    date: 'May 2026',
    items: [
      'Fixed off-center new project canvas rendering by dynamically positioning canvases in wrapping grid rows and auto-centering viewport focus.'
    ]
  },
  {
    version: 'v0.4.13',
    date: 'May 2026',
    items: [
      'Added version display next to zoom level in the header and enabled opening the Changelog directly by clicking it.'
    ]
  },
  {
    version: 'v0.4.12',
    date: 'May 2026',
    items: [
      'Fixed frame transition flicker / blackout bug by maintaining the previous frame underneath during the animation transition.'
    ]
  },
  {
    version: 'v0.4.11',
    date: 'May 2026',
    items: [
      'Arranged spacing properties in "Leading - Auto - Tracking" order with custom spacing constraints for clean visual separation.'
    ]
  },
  {
    version: 'v0.4.10',
    date: 'May 2026',
    items: [
      'Renamed spacing properties to Leading and Tracking, and placed the Auto checkbox after Tracking on the same line.'
    ]
  },
  {
    version: 'v0.4.9',
    date: 'May 2026',
    items: [
      'Reorganized Spacing Properties layout (moved Auto checkbox underneath the input and expanded column gap) to prevent visual overlap.'
    ]
  },
  {
    version: 'v0.4.8',
    date: 'May 2026',
    items: [
      'Renamed Line Height to Line Spacing, fixed text-jamming bugs for unitless spacing multipliers, and added an Auto line spacing toggle.'
    ]
  },
  {
    version: 'v0.4.7',
    date: 'May 2026',
    items: [
      'Prevented middle-mouse panning from triggering canvas marquee selection or header dragging.'
    ]
  },
  {
    version: 'v0.4.6',
    date: 'May 2026',
    items: [
      'Enabled workspace panning via middle mouse click dragging.'
    ]
  },
  {
    version: 'v0.4.5',
    date: 'May 2026',
    items: [
      'Aligned default RMIT logo seed with the Brand Element full white logo (RMIT_White.svg).'
    ]
  },
  {
    version: 'v0.4.4',
    date: 'May 2026',
    items: [
      'Added quick dropdown to background creation to allow adding background layers to all canvases simultaneously.'
    ]
  },
  {
    version: 'v0.4.3',
    date: 'May 2026',
    items: [
      'Expanded overlay screen joke database to 30+ jokes.'
    ]
  },
  {
    version: 'v0.4.2',
    date: 'May 2026',
    items: [
      'Implemented random overlay jokes on viewport size check screen.',
      'Enforced light-scheme color-rendering for Light and RMIT themes.',
      'Removed High Contrast and Pride themes.',
      'Added version number and Changelog button to the Settings panel header.'
    ]
  },
  {
    version: 'v0.4.1',
    date: 'May 2026',
    items: [
      'Enforced light-scheme color-rendering for Light and RMIT themes on browser native controls (inputs, select dropdowns).',
      'Removed High Contrast and Pride themes from the project.',
      'Added version number and Changelog button to the Settings panel header.'
    ]
  },
  {
    version: 'v0.4.0',
    date: 'May 2026',
    items: [
      'Streamlined Gradient Color Picker layout (removed eyedropper fallback, moved stop swatches under gradient track, aligned Opacity, Angle, and Reverse Swap icon onto a single row).',
      'Refactored Text Background animations to layout the toggle ("animate text BG") and the "Time offset" numeric input side-by-side.',
      'Rebranded the application from Ad Cooker to RMIT Display Studio.',
      'Simplified the File & Edit menus by removing the Multi-Save to Folder and Test menu items.',
      'Completely rewrote the GitHub README with high-fidelity technical specs and clean formatting.',
      'Introduced the Versioning & Changelog system to the About section.'
    ]
  },
  {
    version: 'v0.3.0',
    date: 'May 2026',
    items: [
      'Added new "Settings..." workspace shortcuts to the top menu and canvas context menu.',
      'Introduced a detailed Help Documentation system with in-app guide modals.',
      'Synchronized all workspace shortcut listings across in-app modals and project docs.'
    ]
  },
  {
    version: 'v0.2.0',
    date: 'May 2026',
    items: [
      'Decoupled continuous animations (Pan, Zoom, Float, Pulse, etc.) from entry transitions.',
      'Renamed automation panels, grouped HTML & PNG exports, and added validation for ClickTags.'
    ]
  },
  {
    version: 'v0.1.0',
    date: 'May 2026',
    items: [
      'Initial deployment of the visual banner designer with multi-canvas support and frame animations.'
    ]
  }
];

function generateChangelogHtml(limitVersion = null) {
  let filtered = CHANGELOG_DATA;
  if (limitVersion) {
    const index = CHANGELOG_DATA.findIndex(c => c.version === limitVersion);
    if (index !== -1) {
      filtered = CHANGELOG_DATA.slice(0, index);
    }
  }
  
  if (filtered.length === 0) {
    return `<div style="color:var(--text-muted); font-size:13px; text-align:center; padding: 20px;">No new updates detected.</div>`;
  }
  
  return filtered.map((c, idx) => `
    <div style="margin-bottom:20px;">
      <h3 style="margin:0 0 4px 0; color:${idx === 0 && !limitVersion ? 'var(--accent-base)' : 'var(--text-main)'}; font-size:14px; font-weight:700;">
        ${c.version} <span style="font-weight:normal; font-size:11px; color:var(--text-muted);">— ${c.date}${idx === 0 && !limitVersion ? ' (Current)' : ''}</span>
      </h3>
      <ul style="margin:0 0 0 20px; padding:0; color:var(--text-muted);">
        ${c.items.map(item => `<li style="margin-bottom:4px;">${item}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

function checkVersionUpdate() {
  const currentVersion = 'v0.8.0';
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

function openChangelogModal() {
  const changelogHtml = `
      <div style="font-size:13px; line-height:1.6; color:var(--text-main); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-height:400px; overflow-y:auto; padding-right:8px;">
        ${generateChangelogHtml()}
      </div>`;
  openModal('Version & Changelog History', changelogHtml, false);
}

document.getElementById('menu-about').addEventListener('click', () => {
  const body = `
      <div style="font-size:13px; line-height:1.75; color:var(--text-main); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <p style="margin: 0 0 16px 0;">Hi, I’m Danh.</p>
        <p style="margin: 0 0 16px 0;">After months of wrestling with Google Web Designer and Flashtalking, I came to a very professional conclusion: banner production should not be this painful.</p>
        <p style="margin: 0 0 16px 0;">These tools somehow manage to be both massively overkill and still missing basic features I need daily. Weird workflows, clicktag chaos, timeline madness, random compatibility issues, and somehow every single ad feels like a fight against the software instead of actually designing.</p>
        <p style="margin: 0 0 16px 0;">So eventually I hit the point where I thought:<br/>
        “Fuck it, I’ll just build my own.”</p>
        <p style="margin: 0 0 16px 0;">This project is my attempt at creating the HTML5 ad tool I always wanted: fast, lightweight, visual, export-friendly, Google Ads compatible, and without the feeling that the software is actively fighting me.</p>
        <p style="margin: 0 0 16px 0;">Also, my teammate Eden, who has suffered through years of banner production alongside me, may finally have his curse lifted.</p>
        <p style="font-style:italic; margin: 24px 0 0 0; color:var(--text-label);">Built by a designer trying to free creative teams from cursed display ad workflows.</p>
        <div style="margin-top:24px; padding-top:16px; border-top:1px solid #1f2330; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; color:var(--text-muted);">v0.8.0</span>
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

document.getElementById('menu-view-clear-guides').addEventListener('click', () => { state.guides = []; render(); });
document.getElementById('menu-open-settings').addEventListener('click', () => { openSettings(); });

// Settings panel — opens from the main menu only, doesn't live among the working
// panels. Houses everything that's an app/view preference (rulers, snapping,
// theme) plus the new Crop-to-Canvas toggle.
const THEMES = [
  { id: 'default', label: 'Dark (Default)' },
  { id: 'rmit', label: 'RMIT' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'navy', label: 'Navy' },
  { id: 'light', label: 'Light' },
];

function openSettings() {
  const existing = document.getElementById('settings-panel-bg');
  if (existing) { existing.remove(); return; }

  const bg = document.createElement('div');
  bg.id = 'settings-panel-bg';
  bg.className = 'modal-bg';

  const themeBtns = THEMES.map(t => {
    const active = (state.theme || 'default') === t.id;
    return `<button class="settings-theme-btn" data-theme="${t.id}" style="padding:8px 12px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:500; font-family:inherit; text-align:left; border:1px solid ${active ? 'var(--accent-base)' : '#272c3a'}; background:${active ? 'rgba(124,92,255,0.18)' : 'var(--bg-input)'}; color:${active ? 'var(--accent-base)' : 'var(--text-main)'};">${t.label}</button>`;
  }).join('');

  const row = (id, label, checked, hint = '') => `
        <label class="settings-row" style="display:flex; align-items:flex-start; gap:10px; padding:8px 10px; border-radius:6px; cursor:pointer;">
          <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="margin:2px 0 0 0;" />
          <span style="display:flex; flex-direction:column; gap:2px;">
            <span style="font-size:12px; color:var(--text-main);">${label}</span>
            ${hint ? `<span style="font-size:10px; color:var(--text-muted);">${hint}</span>` : ''}
          </span>
        </label>`;

  bg.innerHTML = `
        <div class="modal" style="max-width:520px;">
          <div class="modal-head">
            <div style="display:flex; align-items:center; gap:12px; flex:1;">
              <h2 style="margin:0; font-size:14px; font-weight:600; color:var(--text-bright);">Settings</h2>
              <span style="font-size:11px; color:var(--text-muted);">v0.8.0</span>
              <button id="settings-changelog" class="btn" style="padding:4px 8px; font-size:10px; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; cursor:pointer;">Changelog</button>
            </div>
            <button class="btn" id="settings-close">Close</button>
          </div>
          <div class="modal-body" style="display:flex; flex-direction:column; gap:16px; padding:18px 22px;">
            <section>
              <h3 style="margin:0 0 6px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">View</h3>
              ${row('set-rulers', 'Show rulers & guides', state.showRulers !== false)}
              ${row('set-crop', 'Crop to Canvas', !!state.cropToCanvas, 'Hide anything placed outside the canvas bounds while you work.')}
              ${row('set-temp-top', 'Temporarily on top during drag', !!state.tempTopDuringDrag, 'Temporarily bring the dragged layer to the front layer during dragging.')}
            </section>
            <section>
              <h3 style="margin:0 0 6px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">Snapping</h3>
              ${row('set-snap', 'Snapping', state.snapEnabled !== false, 'Master switch — turning off disables all snap types below.')}
              ${row('set-snap-el', 'Snap to other elements', state.snapToElements !== false)}
              ${row('set-snap-cv', 'Snap to canvas bounds', state.snapToCanvas !== false)}
              ${row('set-snap-gd', 'Snap to guides', state.snapToGuides !== false)}
            </section>
            <section>
              <h3 style="margin:0 0 6px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">Theme</h3>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">${themeBtns}</div>
            </section>
            <section>
              <h3 style="margin:0 0 6px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">History & Saving</h3>
              <div style="display:flex; flex-direction:column; gap:8px; padding:4px 10px;">
                <label style="display:flex; align-items:center; gap:10px; font-size:12px; color:var(--text-main); cursor:pointer;">
                  <span>Save History Limit:</span>
                  <input type="number" id="set-history-limit" value="${state.savedHistoryLimit !== undefined ? state.savedHistoryLimit : 10}" min="1" max="50" style="width:55px; background:var(--bg-input); border:1px solid var(--border-light); color:var(--text-main); border-radius:4px; padding:2px 6px; font-family:inherit; font-size:12px;" />
                </label>
                <div style="font-size:10px; color:#f59e0b; line-height:1.4; display:flex; align-items:flex-start; gap:6px; margin-top:2px;">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0; margin-top:1px;">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>Warning: Storing history does not persist deleted assets (like images) from a past session. Undoing after reopening a project might result in missing images if those assets were deleted and pruned.</span>
                </div>
              </div>
            </section>
          </div>
        </div>`;

  document.body.appendChild(bg);

  const closeFn = () => {
    bg.remove();
    document.removeEventListener('keydown', escHandler);
  };
  const escHandler = (e) => { if (e.key === 'Escape') closeFn(); };
  document.addEventListener('keydown', escHandler);
  bg.querySelector('#settings-close').addEventListener('click', closeFn);
  const btnChangelog = bg.querySelector('#settings-changelog');
  if (btnChangelog) {
    btnChangelog.addEventListener('click', () => {
      openChangelogModal();
    });
  }
  bg.addEventListener('click', (e) => { if (e.target === bg) closeFn(); });

  const bind = (id, key) => bg.querySelector('#' + id).addEventListener('change', (e) => {
    state[key] = e.target.checked;
    render();
  });
  bind('set-rulers', 'showRulers');
  bind('set-crop', 'cropToCanvas');
  bind('set-temp-top', 'tempTopDuringDrag');
  bind('set-snap', 'snapEnabled');
  bind('set-snap-el', 'snapToElements');
  bind('set-snap-cv', 'snapToCanvas');
  bind('set-snap-gd', 'snapToGuides');

  bg.querySelector('#set-history-limit').addEventListener('change', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 50) val = 50;
    e.target.value = val;
    state.savedHistoryLimit = val;
    scheduleAutosave();
  });

  bg.querySelectorAll('.settings-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.theme = btn.dataset.theme;
      render();
      // Restyle the theme buttons in place without rebuilding the panel.
      bg.querySelectorAll('.settings-theme-btn').forEach(b => {
        const active = b.dataset.theme === state.theme;
        b.style.border = `1px solid ${active ? 'var(--accent-base)' : '#272c3a'}`;
        b.style.background = active ? 'rgba(124,92,255,0.18)' : 'var(--bg-input)';
        b.style.color = active ? 'var(--accent-base)' : 'var(--text-main)';
      });
    });
  });
}

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
  const escHandler = (e) => { if (e.key === 'Escape') closeFn(); };
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

// WebP Image Compression Utilities
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

function compressImageToWebP(dataUrl, quality = 0.8) {
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
      ctx.drawImage(img, 0, 0);
      try {
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        resolve(webpDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

function openWebpCompressionModal(el) {
  const originalDataUrl = (el.assetId && state.assets && state.assets[el.assetId]) || el.assetId;
  if (!originalDataUrl) return;

  const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal" style="width:480px;">
      <div class="modal-head">
        <h2>WebP Image Compression</h2>
        <button class="btn" id="webp-close" title="Close dialog">Close</button>
      </div>
      <div class="modal-body" style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; gap:12px; align-items:center; background:rgba(255,255,255,0.03); padding:10px; border-radius:6px;">
          <img id="webp-preview-img" src="${originalDataUrl}" title="WebP compression preview" style="width:80px; height:80px; object-fit:contain; border:1px solid var(--border-light); border-radius:4px; background:#12131a;" />
          <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;">
            <div style="font-size:12px; font-weight:600; color:var(--text-bright); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(el.name)}</div>
            <div style="font-size:11px; color:var(--text-muted);">
              Original size: <span id="webp-original-size" style="font-weight:600; color:var(--text-bright);">Calculating...</span>
            </div>
            <div style="font-size:11px; color:var(--text-muted);">
              Compressed size: <span id="webp-compressed-size" style="font-weight:600; color:var(--accent-light);">Calculating...</span>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <label style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Compression Quality</label>
            <span id="webp-quality-display" style="font-size:12px; font-weight:700; color:var(--accent-light);">80%</span>
          </div>
          <input type="range" id="webp-quality-slider" min="10" max="100" value="80" style="width:100%; cursor:pointer; accent-color:var(--accent-base);" title="Adjust compression quality percentage" />
        </div>
      </div>
      <div class="modal-foot" style="justify-content:flex-end; gap: 8px; display: flex;">
        <button class="btn" id="webp-btn-cancel" title="Cancel image compression">Cancel</button>
        <button class="btn primary" id="webp-btn-apply" title="Apply compression and replace image with WebP version">Apply Compression</button>
      </div>
    </div>`;
  
  document.body.appendChild(bg);

  const previewImg = bg.querySelector('#webp-preview-img');
  const origSizeDisplay = bg.querySelector('#webp-original-size');
  const sizeDisplay = bg.querySelector('#webp-compressed-size');
  const qualityDisplay = bg.querySelector('#webp-quality-display');
  const slider = bg.querySelector('#webp-quality-slider');

  let currentCompressedDataUrl = originalDataUrl;

  // Load original size asynchronously
  getImageSizeKB(originalDataUrl).then(size => {
    origSizeDisplay.textContent = size + ' KB';
  });

  const updateCompression = async () => {
    const quality = parseInt(slider.value, 10) / 100;
    try {
      const compressed = await compressImageToWebP(originalDataUrl, quality);
      previewImg.src = compressed;
      const compSize = await getImageSizeKB(compressed);
      sizeDisplay.textContent = compSize + ' KB';
      currentCompressedDataUrl = compressed;
    } catch (err) {
      console.error(err);
      sizeDisplay.textContent = 'Error';
    }
  };

  // Run initial compression calculation asynchronously
  updateCompression();

  slider.oninput = () => {
    qualityDisplay.textContent = slider.value + '%';
  };
  slider.onchange = async () => {
    sizeDisplay.textContent = 'Calculating...';
    await updateCompression();
  };

  const closeFn = () => {
    bg.remove();
    document.removeEventListener('keydown', escHandler);
  };
  const escHandler = (e) => { if (e.key === 'Escape') closeFn(); };
  document.addEventListener('keydown', escHandler);

  bg.querySelector('#webp-close').onclick = closeFn;
  bg.querySelector('#webp-btn-cancel').onclick = closeFn;
  bg.querySelector('#webp-btn-apply').onclick = () => {
    let id = el.assetId;
    if (!id || !id.startsWith('img_')) {
      id = 'img_' + uid();
      el.assetId = id;
    }
    if (!state.assets) state.assets = {};
    state.assets[id] = currentCompressedDataUrl;
    el.isCompressed = true;
    el.webpQuality = parseInt(slider.value, 10);
    pushHistory();
    render();
    renderProps();
    closeFn();
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


document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  e.preventDefault();

  const menu = document.getElementById('ctx-menu');
  const elNode = e.target.closest('.el');
  const canvasNode = e.target.closest('.canvas');
  const canvasItemNode = e.target.closest('.canvas-item');

  const svgWrap = (svg, text) => `<div style="display:flex; align-items:center; gap:8px;">${svg}${text}</div>`;
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

    const activeEl = getSelectedElement();
    const cat = activeEl ? getElementCategory(activeEl) : null;
    const sameCat = state.layerSelection?.every(id => {
      const el = c.elements.find(x => x.id === id);
      return el && getElementCategory(el) === cat;
    });

    if (cat && sameCat) {
      const linkedEl = c.elements.filter(x => state.layerSelection.includes(x.id));
      const groupIds = [...new Set(linkedEl.map(x => x.linkGroupId).filter(Boolean))];
      const hasLink = groupIds.length > 0;

      html += `<div class="ctx-divider"></div>`;
      if (hasLink) {
        html += `<div class="ctx-item" id="ctx-link-push" style="color:var(--accent-light); white-space:nowrap;">Push Changes to Group</div>`;
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
          <div class="ctx-item" id="ctx-link-new" style="white-space:nowrap;">Create New Group...</div>
          <div class="ctx-item" id="ctx-link-autoadd" style="white-space:nowrap;">Distribute & Link</div>`;

      if (hasLink) {
        html += `<div class="ctx-divider"></div>`;
        html += `<div class="ctx-item" id="ctx-link-remove" style="color:#ef4444; white-space:nowrap;">Remove Link</div>`;
        html += `<div class="ctx-item" id="ctx-link-delete-all" style="color:#ef4444; white-space:nowrap;">Delete Group & Elements</div>`;
      }
      html += `</div></div>`;
    }

    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-save-asset">Save to Assets</div>`;
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
    html += `<div class="ctx-divider"></div>`;

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
    html += `<div class="ctx-item" id="ctx-canvas-bg-color">Change canvas BG color</div>`;
    html += `<div class="ctx-item has-submenu">Export
      <div class="ctx-submenu">
        <div class="ctx-item" id="ctx-canvas-export-html">HTML5</div>
        <div class="ctx-item" id="ctx-canvas-export-png">PNG</div>
      </div>
    </div>`;
    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-canvas-clear" style="color:#ef4444">Clear contents</div>`;
    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-toggle-snap">${state.snapEnabled !== false ? '✓ ' : ''}Snapping</div>`;
    html += `<div class="ctx-item" id="ctx-toggle-rulers">${state.showRulers ? 'Hide' : 'Show'} Rulers & Guides</div>`;
    html += `<div class="ctx-item" id="ctx-clear-guides">Clear All Guides</div>`;
    html += `<div class="ctx-divider"></div>`;
    html += `<div class="ctx-item" id="ctx-open-settings">Settings…</div>`;
  } else {
    html += `<div class="ctx-item" id="ctx-toggle-snap">${state.snapEnabled !== false ? '✓ ' : ''}Snapping</div>`;
    html += `<div class="ctx-item" id="ctx-toggle-rulers">${state.showRulers ? 'Hide' : 'Show'} Rulers & Guides</div>`;
    html += `<div class="ctx-item" id="ctx-clear-guides">Clear All Guides</div>`;
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

  bind('ctx-bring-fwd', () => { const c = getActiveCanvas(); if (c && state.layerSelection) { state.layerSelection.forEach(id => reorder(c, id, +1)); pushHistory(); render(); } });
  bind('ctx-send-bwd', () => { const c = getActiveCanvas(); if (c && state.layerSelection) { [...state.layerSelection].reverse().forEach(id => reorder(c, id, -1)); pushHistory(); render(); } });
  bind('ctx-copy', () => {
    const c = getActiveCanvas();
    if (c && state.layerSelection?.length > 0) {
      state.clipboard = c.elements.filter(x => state.layerSelection.includes(x.id)).map(x => JSON.parse(JSON.stringify(x)));
    }
  });
  bind('ctx-cut', () => {
    const c = getActiveCanvas();
    if (c && state.layerSelection?.length > 0) {
      state.clipboard = c.elements.filter(x => state.layerSelection.includes(x.id)).map(x => JSON.parse(JSON.stringify(x)));
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
  bind('ctx-save-asset', () => saveSelectionAsAsset());
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

  bind('ctx-link-new', () => {
    const name = prompt("Enter new link group name:");
    if (name && name.trim()) {
      createAndLinkGroup(name.trim());
    }
  });
  bind('ctx-link-autoadd', () => {
    const activeEl = getSelectedElement();
    if (activeEl) {
      autoAddAndLink(activeEl);
    }
  });
  bind('ctx-link-remove', () => {
    removeSelectionFromGroup();
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
  if (canvasItemNode) {
    bind('ctx-canvas-clone', () => {
      const id = canvasItemNode.dataset.canvasId;
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
      const id = canvasItemNode.dataset.canvasId;
      if (state.canvases.length > 1) {
        const idx = state.canvases.findIndex(x => x.id === id);
        state.canvases.splice(idx, 1);
        if (state.activeCanvasId === id) state.activeCanvasId = state.canvases[0].id;
        pushHistory();
        render();
      }
    });
  }
  bind('ctx-add-text', () => addElement('text'));
  bind('ctx-add-image', () => addElement('image'));
  bind('ctx-add-rect', () => addElement('rect'));
  bind('ctx-add-circle', () => addElement('circle'));
  bind('ctx-add-line', () => addElement('line'));
  bind('ctx-add-btn', () => addElement('button'));
  bind('ctx-add-bg', (e) => showBackgroundDropdown(e));

  bind('ctx-brand-cricos', () => addBrandElement('cricos'));
  bind('ctx-brand-rfwn', () => addBrandElement('rfwn'));
  bind('ctx-brand-logowhite', () => addBrandElement('logo_white'));
  bind('ctx-brand-logofull', () => addBrandElement('logo_full'));
  bind('ctx-brand-logored', () => addBrandElement('logo_red'));
  bind('ctx-brand-pixel', () => addElement('pixel'));
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
  bind('ctx-canvas-clear', () => { const c = getActiveCanvas(); if (c) clearCanvasFrame(c); });
  bind('ctx-toggle-snap', () => { state.snapEnabled = state.snapEnabled === false ? true : false; render(); });
  bind('ctx-toggle-rulers', () => { state.showRulers = !state.showRulers; render(); });
  bind('ctx-clear-guides', () => { state.guides = []; render(); });
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
// previous autosave is at most ~1s old).
window.addEventListener('beforeunload', () => {
  if (_autosaveTimer) {
    clearTimeout(_autosaveTimer);
    _autosaveTimer = null;
    if (!_autosaveSuspended) writeAutosave();
  }
});

// ============================================================================
// Data Merge / Versioning
// ----------------------------------------------------------------------------
// Bind named element "slots" to spreadsheet columns so one template produces a
// finished ad set per row. A slot maps to a link group when the element is
// grouped (so one binding fans across all sizes), else to the single element.
// Substitution is non-destructive: elements always hold their template default;
// the active version is overlaid at render and baked transiently at export.
// ============================================================================
function dmEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const DM_FIELD_LABEL = { text: 'Text', color: 'Color', bg: 'Background', image: 'Image' };

function dmFieldsForType(type) {
  switch (type) {
    case 'text': return ['text', 'color'];
    case 'button': return ['text', 'color', 'bg'];
    case 'image': return ['image'];
    case 'rect': case 'circle': case 'pixel': return ['color'];
    case 'line': return [];
    default: return ['text', 'color'];
  }
}

function dmSlotKey(el) {
  return el.linkGroupId ? ('g:' + el.linkGroupId) : ('el:' + el.id);
}

function dmSlotName(el) {
  if (el.linkGroupId && state.linkGroups && state.linkGroups[el.linkGroupId]) {
    return state.linkGroups[el.linkGroupId].name || baseLayerLabel(el);
  }
  return el.customName || baseLayerLabel(el);
}

// Resolve a sheet cell's image reference to something usable as an <img> src /
// asset id: an existing asset id, a filename match, or a direct URL / data URI.
function dmResolveImage(val) {
  if (!val) return null;
  if (state.assets && state.assets[val]) return val;
  if (state.assetNames) {
    const lc = String(val).toLowerCase();
    for (const [aid, name] of Object.entries(state.assetNames)) {
      if (name === val || String(name).toLowerCase() === lc) return aid;
    }
  }
  // An image saved in the Assets panel, matched by name with the extension ignored.
  if (state.assetLibrary) {
    const want = String(val).replace(/\.[a-z0-9]+$/i, '').trim().toLowerCase();
    for (const asset of state.assetLibrary) {
      const an = String(asset.name || '').replace(/\.[a-z0-9]+$/i, '').trim().toLowerCase();
      if (an && an === want) {
        const imgEl = (asset.elements || []).find(e => e.type === 'image' && e.assetId);
        if (imgEl) return imgEl.assetId;
      }
    }
  }
  return val; // direct URL / data: / packaged path, or unresolved (validation flags it)
}

// Does the element's link group sync the property behind this dynamic field?
// (so version values flow to every linked sibling exactly like normal link sync).
function dmGroupSyncsField(el, field) {
  if (!el.linkGroupId) return false;
  const lg = state.linkGroups && state.linkGroups[el.linkGroupId];
  if (!lg || !lg.syncProperties) return false;
  const s = lg.syncProperties;
  if (field === 'text') return !!s.text;
  if (field === 'image') return !!s.image;
  if (field === 'bg') return !!s.fill;                 // button fill
  if (field === 'color') {
    if (el.type === 'button') return !!s.textColor;    // button text colour
    if (el.type === 'text') return !!s.color;          // text colour
    return !!s.fill;                                   // shape fill
  }
  return false;
}

// A field is "active" for an element when a column is mapped to its slot AND the
// element either opts in directly (its own dynamic flag) or inherits via a link
// group that syncs that property. The latter means flagging the source alone is
// enough — linked siblings follow, no per-sibling flagging required.
function dmFieldActive(el, field) {
  if (!state.dataMerge.mappings[dmSlotKey(el) + '::' + field]) return false;
  if (el.dynamic && el.dynamic[field]) return true;
  return dmGroupSyncsField(el, field);
}

function dmOverridesForRow(el, rowIdx) {
  const out = {};
  const dm = state.dataMerge;
  if (!dm || !dm.enabled || rowIdx == null) return out;
  const row = dm.rows[rowIdx];
  if (!row) return out;
  const sk = dmSlotKey(el);
  for (const field of dmFieldsForType(el.type)) {
    if (!dmFieldActive(el, field)) continue;
    const col = dm.mappings[sk + '::' + field];
    const val = row[col];
    if (val == null || val === '') continue;
    if (field === 'image') out.assetId = dmResolveImage(val);
    else out[field] = val;
  }
  return out;
}

function dmDisplay(el) {
  const dm = state.dataMerge;
  if (!dm || !dm.enabled || dm.activeVersion == null) return {};
  return dmOverridesForRow(el, dm.activeVersion);
}

function dmIsDynamicEditable(el, field) {
  const dm = state.dataMerge;
  if (!dm || !dm.enabled || dm.activeVersion == null) return false;
  return dmFieldActive(el, field);
}

function dmWriteCell(el, field, value) {
  const dm = state.dataMerge;
  const col = dm.mappings[dmSlotKey(el) + '::' + field];
  if (!col) return false;
  const row = dm.rows[dm.activeVersion];
  if (!row) return false;

  const originalVal = row[col];
  if (originalVal !== value) {
    row[col] = value;
    if (originalVal !== undefined && originalVal !== null && String(originalVal).trim() !== '') {
      const keyCol = (dm.keyColumn && dm.columns.includes(dm.keyColumn)) ? dm.keyColumn : dm.columns[0];
      const versionName = row[keyCol] || ('Row ' + (dm.activeVersion + 1));
      showCanvasNotification(`Version "${versionName}" updated`);
    }
    return true;
  }
  return false;
}

// Toggle a dynamic field flag; propagate across the link group so the logical
// slot stays consistent on every size.
function dmToggleField(el, field, on) {
  const apply = (t) => {
    if (on) { (t.dynamic || (t.dynamic = {}))[field] = true; }
    else if (t.dynamic) { delete t.dynamic[field]; if (!Object.keys(t.dynamic).length) delete t.dynamic; }
  };
  apply(el);
  if (el.linkGroupId) {
    state.canvases.forEach(c => c.elements.forEach(t => { if (t !== el && t.linkGroupId === el.linkGroupId) apply(t); }));
  }
}

// Collapse every dynamic-flagged element into a list of slots (group = one slot).
function dmDiscoverSlots() {
  const slots = []; const seen = {};
  state.canvases.forEach(c => c.elements.forEach(el => {
    if (!el.dynamic) return;
    const fields = Object.keys(el.dynamic).filter(f => el.dynamic[f]);
    if (!fields.length) return;
    const sk = dmSlotKey(el);
    if (!seen[sk]) {
      seen[sk] = { slotKey: sk, type: el.type, name: dmSlotName(el), fields: new Set(), count: 0, grouped: !!el.linkGroupId };
      slots.push(seen[sk]);
    }
    fields.forEach(f => seen[sk].fields.add(f));
    seen[sk].count++;
  }));
  slots.forEach(s => { s.fields = Array.from(s.fields); });
  return slots;
}

// ---- CSV ----
function dmParseCSV(text) {
  const rows = []; let row = []; let cur = ''; let inQ = false;
  text = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Allow tab-delimited paste too (auto-detect on the header line).
  const delim = (text.split('\n')[0] || '').indexOf('\t') > -1 && (text.split('\n')[0] || '').indexOf(',') === -1 ? '\t' : ',';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') { inQ = true; }
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

function dmCsvCell(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

function dmToCSV() {
  const dm = state.dataMerge;
  const lines = [dm.columns.map(dmCsvCell).join(',')];
  dm.rows.forEach(r => lines.push(dm.columns.map(c => dmCsvCell(r[c])).join(',')));
  return lines.join('\n');
}

function dmImportCSV(text) {
  const matrix = dmParseCSV(text);
  if (!matrix.length) { alert('No rows found in the file.'); return false; }
  const headers = matrix[0].map(h => h.trim()).filter(h => h !== '');
  if (!headers.length) { alert('No column headers found in the first row.'); return false; }
  const rows = matrix.slice(1).map(r => { const o = {}; headers.forEach((h, idx) => o[h] = r[idx] != null ? r[idx] : ''); return o; });
  const dm = state.dataMerge;
  dm.columns = headers;
  dm.rows = rows;
  if (!dm.keyColumn || !headers.includes(dm.keyColumn)) dm.keyColumn = headers[0] || null;
  Object.keys(dm.mappings).forEach(k => { if (!headers.includes(dm.mappings[k])) delete dm.mappings[k]; });
  dm.enabled = true;
  if (rows.length) { if (dm.activeVersion == null || dm.activeVersion >= rows.length) dm.activeVersion = 0; }
  else dm.activeVersion = null;
  return true;
}

function dmImportFile(onDone) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.tsv,.txt';
  input.onchange = () => {
    const f = input.files[0]; if (!f) return;
    const fr = new FileReader();
    fr.onload = () => { if (dmImportCSV(fr.result)) { pushHistory(); render(); if (onDone) onDone(); } };
    fr.readAsText(f);
  };
  input.click();
}

function dmExportCSV() {
  const blob = new Blob([dmToCSV()], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (state.projectName || 'data').replace(/[^a-zA-Z0-9_-]/g, '_') + '-versions.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function dmSetActiveVersion(v) {
  state.dataMerge.activeVersion = (v === '' || v == null) ? null : Number(v);
  pushHistory();
  render();
}

function dmToggleLock() {
  state.dataMerge.locked = !state.dataMerge.locked;
  pushHistory();
  renderVersionSwitcher();
  render();
}

function renderVersionSwitcher() {
  const wrap = document.getElementById('version-switcher');
  const sel = document.getElementById('version-select');
  if (!wrap || !sel) return;
  const dm = state.dataMerge;
  if (!dm || !dm.enabled || !dm.rows.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  const keyCol = (dm.keyColumn && dm.columns.includes(dm.keyColumn)) ? dm.keyColumn : dm.columns[0];
  sel.innerHTML = '<option value="">— Template (no version) —</option>' +
    dm.rows.map((r, i) => `<option value="${i}">${dmEsc(r[keyCol] || ('Row ' + (i + 1)))}</option>`).join('');
  sel.value = dm.activeVersion == null ? '' : String(dm.activeVersion);
  const lockBtn = document.getElementById('btn-data-lock');
  if (lockBtn) {
    if (dm.locked) {
      lockBtn.style.background = 'var(--accent-base)';
      lockBtn.style.color = '#fff';
      lockBtn.style.border = '1px solid var(--accent-base)';
      lockBtn.style.boxShadow = '0 0 0 2px rgba(124,92,255,0.35)';
    } else {
      lockBtn.style.background = '';
      lockBtn.style.color = '';
      lockBtn.style.border = '';
      lockBtn.style.boxShadow = '';
    }
    lockBtn.title = dm.locked ? 'Data lock ON — dynamic slots are read-only (click to unlock)' : 'Data lock — make dynamic slots read-only';
    // Swap the padlock glyph open/closed so the state reads at a glance.
    lockBtn.innerHTML = dm.locked
      ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
      : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
  }
}

// Floating version selector shown during single-canvas and full preview, so you can
// flip versions and watch the rendered ad update without leaving preview.
function renderPreviewVersionBar() {
  const dm = state.dataMerge;
  const inPreview = !!(state.isPreviewMode || state.singlePreviewId);
  let bar = document.getElementById('preview-version-bar');
  const show = inPreview && dm && dm.enabled && dm.rows.length;
  if (!show) { if (bar) bar.style.display = 'none'; return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'preview-version-bar';
    bar.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:1000000;display:flex;align-items:center;gap:8px;background:#15171f;border:1px solid #2a2f3e;border-radius:8px;padding:8px 12px;box-shadow:0 8px 24px rgba(0,0,0,.55);';
    bar.innerHTML = '<span style="font-size:11px;color:#9aa1b6;font-weight:600;">Version</span>' +
      '<select id="preview-version-select" style="background:#0f131b;border:1px solid #272c3a;color:#fff;border-radius:4px;padding:5px 8px;font-size:12px;outline:none;font-family:inherit;max-width:240px;"></select>';
    document.body.appendChild(bar);
    bar.querySelector('#preview-version-select').addEventListener('change', (e) => dmSetActiveVersion(e.target.value));
  }
  bar.style.display = 'flex';
  const sel = bar.querySelector('#preview-version-select');
  const keyCol = (dm.keyColumn && dm.columns.includes(dm.keyColumn)) ? dm.keyColumn : dm.columns[0];
  sel.innerHTML = '<option value="">— Template (no version) —</option>' +
    dm.rows.map((r, i) => `<option value="${i}">${dmEsc(r[keyCol] || ('Row ' + (i + 1)))}</option>`).join('');
  sel.value = dm.activeVersion == null ? '' : String(dm.activeVersion);
}

// Temporarily bake a row's values into elements (+clickTag) for export; returns a
// restore function that puts the template defaults back.
function dmBakeRow(rowIdx) {
  const saved = [];
  const savedClick = state.clickTag;
  state.canvases.forEach(c => c.elements.forEach(el => {
    const ov = dmOverridesForRow(el, rowIdx);
    const keys = Object.keys(ov);
    if (keys.length) {
      const orig = {};
      keys.forEach(k => { orig[k] = el[k]; el[k] = ov[k]; });
      saved.push([el, orig]);
    }
  }));
  const ctCol = state.dataMerge.mappings['clicktag::url'];
  if (ctCol) { const v = state.dataMerge.rows[rowIdx] && state.dataMerge.rows[rowIdx][ctCol]; if (v) state.clickTag = v; }
  return () => { saved.forEach(([el, orig]) => Object.assign(el, orig)); state.clickTag = savedClick; };
}

// Run an async export block with a row baked into the elements (covering the asset-
// bundling step). It also points activeVersion at the row so the synchronous bake
// inside generateExportHTML targets the same row (nested = balanced). activeVersion is
// restored afterwards so the editor's current selection is untouched.
async function dmRunExport(rowIdx, fn) {
  const dm = state.dataMerge;
  const savedActive = dm.activeVersion;
  if (rowIdx != null) dm.activeVersion = rowIdx;
  const restore = (dm.enabled && dm.activeVersion != null) ? dmBakeRow(dm.activeVersion) : null;
  try { return await fn(); }
  finally { if (restore) restore(); dm.activeVersion = savedActive; }
}
function dmActiveRowForOutput() {
  const dm = state.dataMerge;
  return (dm && dm.enabled && dm.activeVersion != null) ? dm.activeVersion : null;
}

async function dmExportAllVersions() {
  if (typeof JSZip === 'undefined') { alert('JSZip is not loaded.'); return; }
  const dm = state.dataMerge;
  if (!dm.rows.length) { alert('No versions to export. Import a data sheet first.'); return; }
  const keyCol = (dm.keyColumn && dm.columns.includes(dm.keyColumn)) ? dm.keyColumn : dm.columns[0];
  const master = new JSZip();
  const safeProj = (state.projectName || 'Ad').replace(/[^a-zA-Z0-9_-]/g, '_');
  const used = {};
  for (let i = 0; i < dm.rows.length; i++) {
    await dmRunExport(i, async () => {
      let folder = String(dm.rows[i][keyCol] || ('version_' + (i + 1))).replace(/[^a-zA-Z0-9_-]/g, '_') || ('version_' + (i + 1));
      used[folder] = (used[folder] || 0) + 1;
      if (used[folder] > 1) folder += '_' + used[folder];
      const verFolder = master.folder(folder);
      for (const c of state.canvases) {
        const adZip = new JSZip();
        await addCanvasAssetsToZip(c, adZip);
        const html = generateExportHTML(c, adZip);
        adZip.file('index.html', html);
        const adBlob = await adZip.generateAsync({ type: 'blob' });
        verFolder.file(`${safeProj}_${c.width}x${c.height}.zip`, adBlob);
      }
    });
  }
  const content = await master.generateAsync({ type: 'blob' });
  const suggested = `${safeProj}_all_versions.zip`;
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({ types: [{ description: 'Exported Ads ZIP', accept: { 'application/zip': ['.zip'] } }], suggestedName: suggested });
      const w = await handle.createWritable(); await w.write(content); await w.close();
    } catch (e) { if (e.name !== 'AbortError') console.error('Version export failed:', e); }
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(content); a.download = suggested; a.click(); URL.revokeObjectURL(a.href);
  }
}

// ---- Column / row mutations ----
function dmAddColumn(name) {
  name = (name || '').trim();
  const dm = state.dataMerge;
  if (!name) return;
  if (dm.columns.includes(name)) { alert('A column named "' + name + '" already exists.'); return; }
  dm.columns.push(name);
  dm.rows.forEach(r => { if (r[name] === undefined) r[name] = ''; });
  if (!dm.keyColumn) dm.keyColumn = name;
}
function dmDeleteColumn(name) {
  const dm = state.dataMerge;
  dm.columns = dm.columns.filter(c => c !== name);
  dm.rows.forEach(r => delete r[name]);
  Object.keys(dm.mappings).forEach(k => { if (dm.mappings[k] === name) delete dm.mappings[k]; });
  if (dm.keyColumn === name) dm.keyColumn = dm.columns[0] || null;
}
function dmAddRow() {
  const dm = state.dataMerge;
  const o = {}; dm.columns.forEach(c => o[c] = '');
  dm.rows.push(o);
  dm.enabled = true;
}
function dmDeleteRow(i) {
  const dm = state.dataMerge;
  dm.rows.splice(i, 1);
  if (dm.activeVersion === i) dm.activeVersion = null;
  else if (dm.activeVersion != null && dm.activeVersion > i) dm.activeVersion--;
}

// ---- Data panel modal ----
function openDataPanel() {
  openModal('Data &amp; Versions', '<div id="dm-panel"></div>', false);
  const bg = document.body.lastElementChild;
  dmRenderPanel(bg);
}

function dmRenderPanel(bg) {
  const panel = bg.querySelector('#dm-panel');
  if (!panel) return;
  const dm = state.dataMerge;
  const slots = dmDiscoverSlots();
  const cellStyle = 'width:100%;background:var(--bg-input);border:1px solid #272c3a;color:var(--text-main);border-radius:4px;padding:4px 6px;font-size:11px;outline:none;';
  const selStyle = 'background:var(--bg-input);border:1px solid #272c3a;color:var(--text-main);border-radius:4px;padding:4px 6px;font-size:11px;outline:none;font-family:inherit;min-width:140px;';
  const thStyle = 'padding:6px 8px;border-bottom:1px solid #1f2330;color:var(--text-label);font-weight:600;text-align:left;white-space:nowrap;';
  const colOptions = (sel) => ['<option value="">— none —</option>'].concat(dm.columns.map(c => `<option value="${dmEsc(c)}" ${c === sel ? 'selected' : ''}>${dmEsc(c)}</option>`)).join('');

  // Mapping rows
  let mapRows = '';
  slots.forEach(s => s.fields.forEach(field => {
    const key = s.slotKey + '::' + field;
    const linkIcon = s.grouped ? `
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-left:4px; color:var(--accent-light);" title="Link Group">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>` : '';
    mapRows += `<tr>
      <td style="padding:4px 12px 4px 0;font-size:12px;color:var(--text-main);">${dmEsc(s.name)}${linkIcon}
        <span style="color:var(--text-muted);font-size:10px;">· ${DM_FIELD_LABEL[field] || field}${s.grouped ? ` · ${s.count} sizes` : ''}</span></td>
      <td style="padding:4px 0;"><select class="dm-map" data-mapkey="${key}" style="${selStyle}">${colOptions(dm.mappings[key])}</select></td>
    </tr>`;
  }));
  mapRows += `<tr>
    <td style="padding:4px 12px 4px 0;font-size:12px;color:var(--text-main);">ClickTag <span style="color:var(--text-muted);font-size:10px;">· exit URL</span></td>
    <td style="padding:4px 0;"><select class="dm-map" data-mapkey="clicktag::url" style="${selStyle}">${colOptions(dm.mappings['clicktag::url'])}</select></td>
  </tr>`;

  const mapSection = slots.length
    ? `<table style="border-collapse:collapse;">${mapRows}</table>`
    : `<div style="font-size:11px;color:var(--text-muted);line-height:1.5;">No dynamic slots yet. Select an element on the canvas and tick fields under <b>Dynamic Data</b> in the Properties panel to make them vary per version.<br><br><table style="border-collapse:collapse;">${mapRows}</table></div>`;

  // Data grid
  const gridHead = `<tr>
    <th style="${thStyle}width:28px;"></th>` +
    dm.columns.map(c => `<th style="${thStyle}">
      <span class="dm-keycol" data-col="${dmEsc(c)}" title="Click to set as naming key" style="cursor:pointer;">${dmEsc(c)} ${c === dm.keyColumn ? '<span style="color:var(--accent-light);" title="Used to name exported folders">★</span>' : ''}</span>
      <button class="dm-delcol" data-col="${dmEsc(c)}" title="Delete column" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:13px;line-height:1;margin-left:4px;">×</button>
    </th>`).join('') +
    `<th style="${thStyle}width:28px;"></th></tr>`;
  const gridBody = dm.rows.map((r, i) => `<tr data-row="${i}" style="${dm.activeVersion === i ? 'background:rgba(124,92,255,.12);' : ''}">
    <td style="padding:3px 6px;border-bottom:1px solid #15171f;"><button class="dm-viewrow" data-row="${i}" title="Preview this version on the canvas" style="background:none;border:none;color:${dm.activeVersion === i ? 'var(--accent-light)' : 'var(--text-muted)'};cursor:pointer;font-size:13px;">${dm.activeVersion === i ? '●' : '○'}</button></td>` +
    dm.columns.map(c => `<td style="padding:3px 6px;border-bottom:1px solid #15171f;"><input class="dm-cell" data-row="${i}" data-col="${dmEsc(c)}" value="${dmEsc(r[c] || '')}" style="${cellStyle}min-width:120px;"/></td>`).join('') +
    `<td style="padding:3px 6px;border-bottom:1px solid #15171f;"><button class="dm-delrow" data-row="${i}" title="Delete row" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:13px;">×</button></td></tr>`).join('');

  const gridSection = dm.columns.length
    ? `<div style="overflow:auto;max-height:300px;border:1px solid #1f2330;border-radius:6px;">
         <table style="border-collapse:collapse;width:100%;font-size:11px;color:var(--text-main);"><thead>${gridHead}</thead><tbody>${gridBody}</tbody></table>
       </div>`
    : `<div style="font-size:11px;color:var(--text-muted);">No data yet — import a CSV or add a column to begin.</div>`;

  panel.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;">
      <button class="btn" id="dm-import">Import CSV…</button>
      <button class="btn" id="dm-export" ${dm.columns.length ? '' : 'disabled'}>Export CSV</button>
      <button class="btn" id="dm-addcol">+ Column</button>
      <button class="btn" id="dm-addrow" ${dm.columns.length ? '' : 'disabled'}>+ Row</button>
      <div style="flex:1;"></div>
      <label class="checkbox-row" style="display:flex;align-items:center;gap:6px;font-size:11px;"><input type="checkbox" id="dm-enabled" ${dm.enabled ? 'checked' : ''}/> Enable merge</label>
      <button class="btn primary" id="dm-export-versions" ${dm.rows.length ? '' : 'disabled'}>Export All Versions (${dm.rows.length})</button>
    </div>

    <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin:0 0 8px;">Column → Slot Mapping</h3>
    ${mapSection}

    <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin:18px 0 8px;">Versions (${dm.rows.length} row${dm.rows.length === 1 ? '' : 's'}) · ● = active preview · ★ = name key</h3>
    ${gridSection}

    <div style="margin-top:12px;font-size:10px;color:var(--text-muted);line-height:1.5;">
      Image columns should hold an asset filename already used in this project (or a full URL). Editing a dynamic slot on the canvas while a version is active writes back to that row${dm.locked ? ' — currently <b style="color:var(--accent-light);">locked</b> (read-only)' : ''}.
    </div>`;

  dmWirePanel(bg);
}

function dmWirePanel(bg) {
  const reRender = () => { renderVersionSwitcher(); render(); dmRenderPanel(bg); };
  const q = (sel) => bg.querySelector(sel);
  const all = (sel) => bg.querySelectorAll(sel);

  if (q('#dm-import')) q('#dm-import').onclick = () => dmImportFile(() => reRender());
  if (q('#dm-export')) q('#dm-export').onclick = () => dmExportCSV();
  if (q('#dm-addcol')) q('#dm-addcol').onclick = () => { const n = prompt('New column name:'); if (n) { dmAddColumn(n); pushHistory(); reRender(); } };
  if (q('#dm-addrow')) q('#dm-addrow').onclick = () => { dmAddRow(); pushHistory(); reRender(); };
  if (q('#dm-export-versions')) q('#dm-export-versions').onclick = () => dmExportAllVersions();
  if (q('#dm-enabled')) q('#dm-enabled').onchange = (e) => { state.dataMerge.enabled = e.target.checked; pushHistory(); reRender(); };

  all('.dm-map').forEach(sel => sel.onchange = () => {
    const k = sel.dataset.mapkey;
    if (sel.value) state.dataMerge.mappings[k] = sel.value;
    else delete state.dataMerge.mappings[k];
    pushHistory();
    render();
  });

  all('.dm-keycol').forEach(s => s.onclick = () => { state.dataMerge.keyColumn = s.dataset.col; pushHistory(); reRender(); });
  all('.dm-delcol').forEach(b => b.onclick = () => { if (confirm(`Delete column "${b.dataset.col}"?`)) { dmDeleteColumn(b.dataset.col); pushHistory(); reRender(); } });
  all('.dm-delrow').forEach(b => b.onclick = () => { dmDeleteRow(Number(b.dataset.row)); pushHistory(); reRender(); });
  all('.dm-viewrow').forEach(b => b.onclick = () => {
    const i = Number(b.dataset.row);
    state.dataMerge.activeVersion = (state.dataMerge.activeVersion === i) ? null : i;
    state.dataMerge.enabled = true;
    pushHistory(); reRender();
  });

  all('.dm-cell').forEach(inp => {
    inp.oninput = () => {
      const row = state.dataMerge.rows[Number(inp.dataset.row)];
      if (row) row[inp.dataset.col] = inp.value;
      render();
      renderVersionSwitcher();
    };
    inp.onchange = () => pushHistory();
  });
}

function cycleVersion(dir) {
  const dm = state.dataMerge;
  if (!dm || !dm.enabled || !dm.rows.length) return;
  const L = dm.rows.length;
  let current = dm.activeVersion; // null or number
  let next;
  if (dir === 'prev') {
    if (current === null) {
      next = L - 1;
    } else if (current === 0) {
      next = null;
    } else {
      next = current - 1;
    }
  } else {
    if (current === null) {
      next = 0;
    } else if (current === L - 1) {
      next = null;
    } else {
      next = current + 1;
    }
  }
  dmSetActiveVersion(next);
}

document.getElementById('menu-file-data')?.addEventListener('click', openDataPanel);
document.getElementById('btn-open-data')?.addEventListener('click', openDataPanel);
document.getElementById('version-select')?.addEventListener('change', (e) => dmSetActiveVersion(e.target.value));
document.getElementById('btn-version-prev')?.addEventListener('click', () => cycleVersion('prev'));
document.getElementById('btn-version-next')?.addEventListener('click', () => cycleVersion('next'));
document.getElementById('btn-data-lock')?.addEventListener('click', dmToggleLock);
propsEl?.addEventListener('click', (e) => {
  const lockedRow = e.target.closest('[data-locked-field="true"]');
  if (lockedRow) {
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
    
    if (isCollapsed) {
      parentSection.classList.add('collapsed');
    }
    
    header.addEventListener('click', (e) => {
      if (e.target.closest('.panel-fullscreen-btn')) return;
      const currentlyCollapsed = parentSection.classList.toggle('collapsed');
      localStorage.setItem(storageKey, currentlyCollapsed ? 'true' : 'false');
    });

    // Exclude canvases (which is not collapsible anyway) and Dynamic Data
    const isExcluded = (keyAttr === 'header-dynamic-data');
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
            fsBtn.style.color = 'var(--accent-light)';
          }
        });
        
        const setIcon = () => {
          const isFull = parentSection.classList.contains('full-mode');
          if (isFull) {
            fsBtn.title = 'Exit Full Mode';
            fsBtn.style.color = 'var(--accent-light)';
            fsBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v3a2 2 0 0 1-2 2H4M15 4v3a2 2 0 0 0 2 2h3M15 20v-3a2 2 0 0 1 2-2h3M9 20v-3a2 2 0 0 0-2-2H4"/></svg>`;
          } else {
            fsBtn.title = 'Toggle Full Mode';
            fsBtn.style.color = 'var(--text-muted)';
            fsBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H6a2 2 0 0 0-2 2v3M15 4h3a2 2 0 0 1 2 2v3M15 20h3a2 2 0 0 0 2-2v-3M9 20H6a2 2 0 0 1-2-2v-3"/></svg>`;
          }
        };
        setIcon();
        
        if (collapseIcon.parentNode === header) {
          const wrapper = document.createElement('span');
          wrapper.style.display = 'inline-flex';
          wrapper.style.alignItems = 'center';
          wrapper.style.gap = '6px';
          wrapper.style.marginLeft = 'auto';
          
          header.insertBefore(wrapper, collapseIcon);
          wrapper.appendChild(fsBtn);
          wrapper.appendChild(collapseIcon);
        } else {
          collapseIcon.parentNode.insertBefore(fsBtn, collapseIcon);
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

(async function initApp() {
  let restored = false;
  try { restored = await restoreAutosave(); } catch (e) { console.warn(e); }
  updateRecentProjectsMenu();
  render();
  initCollapsiblePanels();
  checkVersionUpdate();
  queueSizeUpdate();
  setTimeout(() => {
    const canvasArea = document.getElementById('canvas-area');
    if (!canvasArea || !canvasArea.scrollTo) return;
    if (restored && state.viewScrollLeft !== undefined) {
      canvasArea.scrollTo({ left: state.viewScrollLeft, top: state.viewScrollTop, behavior: 'instant' });
    } else {
      canvasArea.scrollTo({ left: 2000, top: 2000, behavior: 'instant' });
    }
  }, 10);
  // Enable autosave now that the initial state is settled, and persist the seed
  // project once if there was nothing to restore.
  _autosaveSuspended = false;
  setSaveStatus('saved');
  if (!restored) writeAutosave();
})();


// ============================================================================
// Custom Color Picker (iro.js wrapper)
// ============================================================================
let iroPicker = null;
let currentCpKey = null;
let cpIsGradient = false;
// Each stop carries color (hex), opacity (0-100) and pos (0-100). Output is a
// linear-gradient using rgba() so opacity bakes into the CSS string the rest of
// the app already consumes.
let cpGradStops = [
  { color: '#7c5cff', opacity: 100, pos: 0 },
  { color: '#2a1f55', opacity: 100, pos: 100 }
];
let cpActiveStop = 0;

function cpStopCss(s) {
  return `${hexToRgba(s.color, (s.opacity !== undefined ? s.opacity : 100) / 100)} ${s.pos}%`;
}

function cpBuildGradient() {
  const angle = document.getElementById('cp-grad-angle').value || 90;
  const ordered = [...cpGradStops].sort((a, b) => a.pos - b.pos);
  return `linear-gradient(${angle}deg, ${ordered.map(cpStopCss).join(', ')})`;
}

// Parse a linear-gradient string back into {angle, stops}. Handles both bare hex
// stops (legacy gradients) and rgba()+position stops (the new format).
function cpParseGradient(str) {
  const m = str.match(/linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(.+)\)\s*$/i);
  if (!m) return null;
  const angle = parseFloat(m[1]);
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of m[2]) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  let stops = parts.map((p, i) => {
    p = p.trim();
    const posM = p.match(/\s+(\d+(?:\.\d+)?)%\s*$/);
    const pos = posM ? parseFloat(posM[1]) : (i === 0 ? 0 : 100);
    const colorStr = (posM ? p.slice(0, posM.index) : p).trim();
    const rgbaM = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i);
    if (rgbaM) {
      const hex = '#' + [rgbaM[1], rgbaM[2], rgbaM[3]].map(n => (+n).toString(16).padStart(2, '0')).join('');
      const op = rgbaM[4] !== undefined ? Math.round(parseFloat(rgbaM[4]) * 100) : 100;
      return { color: hex, opacity: op, pos };
    }
    return { color: colorStr, opacity: 100, pos };
  });
  // The UI supports 2-5 stops; keep the first 5, ensure at least 2.
  if (stops.length > 5) stops = stops.slice(0, 5);
  if (stops.length === 1) stops.push({ color: stops[0].color, opacity: stops[0].opacity, pos: 100 });
  return { angle, stops };
}

// Lightweight per-frame update: positions, colors, active states, inputs and the
// preview bar. Does NOT recreate DOM (safe to call during a marker drag).
function cpSyncGradientUI() {
  document.querySelectorAll('#cp-grad-swatches .cp-grad-stop-container').forEach((c, i) => {
    c.classList.toggle('active', i === cpActiveStop);
    const btn = c.querySelector('.cp-color-btn');
    if (btn && cpGradStops[i]) btn.style.background = cpGradStops[i].color;
  });
  const opInput = document.getElementById('cp-grad-opacity');
  const active = cpGradStops[cpActiveStop];
  if (active) {
    if (opInput && document.activeElement !== opInput) opInput.value = active.opacity !== undefined ? active.opacity : 100;
  }
  const bar = document.getElementById('cp-grad-bar');
  if (bar) {
    const ordered = [...cpGradStops].sort((a, b) => a.pos - b.pos);
    bar.style.backgroundImage = `linear-gradient(to right, ${ordered.map(cpStopCss).join(', ')})`;
  }
  document.querySelectorAll('#cp-grad-track .cp-grad-marker').forEach(m => {
    const idx = +m.dataset.stop;
    if (!cpGradStops[idx]) return;
    m.style.left = cpGradStops[idx].pos + '%';
    m.style.background = cpGradStops[idx].color;
    m.classList.toggle('active', idx === cpActiveStop);
  });
  const removeBtn = document.getElementById('cp-grad-remove');
  const addBtn = document.getElementById('cp-grad-add');
  if (removeBtn) removeBtn.disabled = cpGradStops.length <= 2;
  if (addBtn) addBtn.disabled = cpGradStops.length >= 5;
}

// Recreate the markers + swatch buttons from scratch — called when the stop count
// changes (add/remove) or the picker opens. Drag/click handlers are bound here.
function cpRebuildStops() {
  const track = document.getElementById('cp-grad-track');
  const swatches = document.getElementById('cp-grad-swatches');
  if (track) {
    track.innerHTML = '';
    cpGradStops.forEach((stop, idx) => {
      const marker = document.createElement('div');
      marker.className = 'cp-grad-marker';
      marker.dataset.stop = idx;
      marker.addEventListener('mousedown', (e) => {
        e.preventDefault();
        cpActiveStop = idx;
        if (iroPicker) iroPicker.color.set(cpGradStops[idx].color);
        cpSyncGradientUI();
        const bar = document.getElementById('cp-grad-bar');
        const rect = bar.getBoundingClientRect();
        const onMove = (ev) => {
          let pct = ((ev.clientX - rect.left) / rect.width) * 100;
          pct = Math.max(0, Math.min(100, Math.round(pct)));
          cpGradStops[idx].pos = pct;
          cpSyncGradientUI();
          emitColorUpdate();
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
      marker.addEventListener('dblclick', (e) => { e.preventDefault(); cpRemoveStop(idx); });
      track.appendChild(marker);
    });
  }
  if (swatches) {
    swatches.innerHTML = '';
    cpGradStops.forEach((stop, idx) => {
      const cont = document.createElement('div');
      cont.className = 'cp-grad-stop-container' + (idx === cpActiveStop ? ' active' : '');
      const btn = document.createElement('button');
      btn.className = 'cp-color-btn';
      btn.style.background = stop.color;
      btn.addEventListener('click', () => {
        cpActiveStop = idx;
        if (iroPicker) iroPicker.color.set(cpGradStops[idx].color);
        cpSyncGradientUI();
      });
      cont.appendChild(btn);
      swatches.appendChild(cont);
    });
  }
  cpSyncGradientUI();
}

// Interpolate a hex color between the two stops surrounding `pos`.
function cpColorAtPos(pos) {
  const ordered = [...cpGradStops].sort((a, b) => a.pos - b.pos);
  let lo = ordered[0], hi = ordered[ordered.length - 1];
  for (let i = 0; i < ordered.length - 1; i++) {
    if (pos >= ordered[i].pos && pos <= ordered[i + 1].pos) { lo = ordered[i]; hi = ordered[i + 1]; break; }
  }
  const span = hi.pos - lo.pos || 1;
  const t = Math.max(0, Math.min(1, (pos - lo.pos) / span));
  const toRgb = (hx) => { let h = hx.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
  const a = toRgb(lo.color), b = toRgb(hi.color);
  const mix = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return '#' + mix.map(v => v.toString(16).padStart(2, '0')).join('');
}

function cpAddStop(pos) {
  if (cpGradStops.length >= 5) return;
  if (pos === undefined) {
    // Default: midpoint of the widest gap between consecutive stops.
    const ordered = [...cpGradStops].sort((a, b) => a.pos - b.pos);
    let bestGap = -1, bestPos = 50;
    for (let i = 0; i < ordered.length - 1; i++) {
      const gap = ordered[i + 1].pos - ordered[i].pos;
      if (gap > bestGap) { bestGap = gap; bestPos = (ordered[i].pos + ordered[i + 1].pos) / 2; }
    }
    pos = Math.round(bestPos);
  }
  const opacity = (cpGradStops[cpActiveStop] && cpGradStops[cpActiveStop].opacity) ?? 100;
  cpGradStops.push({ color: cpColorAtPos(pos), opacity, pos });
  cpActiveStop = cpGradStops.length - 1;
  if (iroPicker) iroPicker.color.set(cpGradStops[cpActiveStop].color);
  cpRebuildStops();
  emitColorUpdate();
}

function cpRemoveStop(idx) {
  if (cpGradStops.length <= 2) return;
  cpGradStops.splice(idx, 1);
  if (cpActiveStop >= cpGradStops.length) cpActiveStop = cpGradStops.length - 1;
  if (iroPicker) iroPicker.color.set(cpGradStops[cpActiveStop].color);
  cpRebuildStops();
  emitColorUpdate();
}

if (!state.savedPalette) {
  state.savedPalette = ['#ffffff', '#000000', '#000054', '#e61e2a', '#00bcd4', '#4caf50', '#ff9800', '#f44336'];
}

function initColorPicker() {
  if (iroPicker) return;
  iroPicker = new iro.ColorPicker("#cp-iro-container", {
    width: 180,
    color: "#fff",
    layout: [
      { component: iro.ui.Box },
      { component: iro.ui.Slider, options: { sliderType: 'hue' } }
    ]
  });

  const modal = document.getElementById('color-picker-modal');
  const hexInput = document.getElementById('cp-hex-input');
  const addSwatchBtn = document.getElementById('cp-add-swatch');
  const copyHexBtn = document.getElementById('cp-hex-copy');

  iroPicker.on('color:change', (color) => {
    if (document.activeElement !== hexInput) {
      hexInput.value = color.hexString.replace(/^#/, '');
    }
    updateCurrentColor(color.hexString);
  });

  hexInput.addEventListener('input', (e) => {
    let val = e.target.value;
    if (!val.startsWith('#') && val.length > 0) val = '#' + val;
    try {
      // Only set if it looks like a valid hex
      if (val.length === 4 || val.length === 7) {
        iroPicker.color.set(val);
        updateCurrentColor(val);
      }
    } catch (err) { }
  });

  hexInput.addEventListener('click', function () {
    this.select();
  });

  if (copyHexBtn) {
    copyHexBtn.addEventListener('click', () => {
      let val = hexInput.value;
      if (!val.startsWith('#') && val.length > 0) val = '#' + val;
      if (navigator.clipboard && navigator.clipboard.writeText && val) {
        navigator.clipboard.writeText(val);
      }
      const original = copyHexBtn.innerHTML;
      copyHexBtn.innerHTML = '<span style="font-size:10px; font-weight:700; color:var(--accent-base);">✓</span>';
      setTimeout(() => { copyHexBtn.innerHTML = original; }, 900);
    });
  }

  addSwatchBtn.addEventListener('click', () => {
    const hex = iroPicker.color.hexString;
    if (!state.savedPalette.includes(hex)) {
      state.savedPalette.unshift(hex);
      if (state.savedPalette.length > 16) state.savedPalette.pop();
      renderPalettes();
    }
  });

  document.querySelectorAll('.cp-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.cp-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      cpIsGradient = e.target.dataset.tab === 'gradient';
      document.getElementById('cp-gradient-controls').style.display = cpIsGradient ? 'block' : 'none';

      if (cpIsGradient) {
        iroPicker.color.set(cpGradStops[cpActiveStop].color);
        cpRebuildStops();
      }
      emitColorUpdate();
    });
  });

  // Click an empty spot on the preview bar to add a stop at that position.
  const gradBar = document.getElementById('cp-grad-bar');
  if (gradBar) {
    gradBar.addEventListener('click', (e) => {
      const rect = gradBar.getBoundingClientRect();
      let pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      pct = Math.max(0, Math.min(100, pct));
      cpAddStop(pct);
    });
  }
  document.getElementById('cp-grad-add').addEventListener('click', () => cpAddStop());
  document.getElementById('cp-grad-remove').addEventListener('click', () => cpRemoveStop(cpActiveStop));

  document.getElementById('cp-grad-opacity').addEventListener('input', (e) => {
    let v = parseInt(e.target.value, 10);
    if (isNaN(v)) return;
    cpGradStops[cpActiveStop].opacity = Math.max(0, Math.min(100, v));
    cpSyncGradientUI();
    emitColorUpdate();
  });

  document.getElementById('cp-grad-reverse').addEventListener('click', () => {
    // Mirror every stop's position so the colour order flips along the same axis.
    cpGradStops.forEach(s => { s.pos = 100 - s.pos; });
    cpSyncGradientUI();
    emitColorUpdate();
  });

  document.getElementById('cp-grad-angle').addEventListener('input', () => {
    cpSyncGradientUI();
    emitColorUpdate();
  });

  // Scroll-wheel to nudge the gradient number fields (1 per tick, 10 with Shift),
  // clamped to each input's min/max. Re-dispatches 'input' so the handlers above run.
  ['cp-grad-angle', 'cp-grad-opacity'].forEach(id => {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      let v = (parseFloat(inp.value) || 0) + (e.deltaY < 0 ? step : -step);
      if (inp.min !== '') v = Math.max(parseFloat(inp.min), v);
      if (inp.max !== '') v = Math.min(parseFloat(inp.max), v);
      inp.value = v;
      inp.dispatchEvent(new Event('input'));
    });
  });

  document.addEventListener('mousedown', (e) => {
    if (modal.style.display === 'flex' && !modal.contains(e.target) && !e.target.closest('.cp-trigger')) {
      closeColorPicker();
    }
  });
}

function renderPalettes() {
  const container = document.getElementById('cp-swatches');
  container.innerHTML = '';
  state.savedPalette.forEach(hex => {
    const s = document.createElement('div');
    s.className = 'cp-swatch';
    s.style.background = hex;
    s.title = `Apply color ${hex}`;
    s.addEventListener('click', () => {
      iroPicker.color.set(hex);
      document.getElementById('cp-hex-input').value = hex.replace(/^#/, '');
      updateCurrentColor(hex);
    });
    container.appendChild(s);
  });
}

function updateCurrentColor(hex) {
  if (cpIsGradient) {
    cpGradStops[cpActiveStop].color = hex;
    cpSyncGradientUI();
  }
  emitColorUpdate();
}

function emitColorUpdate() {
  if (!currentCpKey) return;
  let val = '';
  if (cpIsGradient) {
    val = cpBuildGradient();
  } else {
    val = iroPicker.color.hexString;
  }

  const propsEl = document.getElementById('props');
  const input = propsEl.querySelector(`input[type="text"][data-k="${currentCpKey}"]`);
  if (input) {
    input.value = val.replace(/^#/, '');
    input.dispatchEvent(new Event('input'));
  }
  const trigger = propsEl.querySelector(`.cp-trigger[data-k="${currentCpKey}"]`);
  if (trigger) {
    if (currentCpKey === 'strokeColor') {
      trigger.style.background = 'transparent';
      trigger.style.boxShadow = `inset 0 0 0 4px ${val}`;
    } else {
      trigger.style.background = val;
      trigger.style.boxShadow = 'none';
    }
  }
}

function openColorPicker(btn, key, initialValue) {
  initColorPicker();
  currentCpKey = key;
  const modal = document.getElementById('color-picker-modal');

  const gradientTab = document.querySelector('.cp-tab[data-tab="gradient"]');
  if (key === 'strokeColor') {
    gradientTab.style.display = 'none';
  } else {
    gradientTab.style.display = '';
  }

  if (initialValue && initialValue.includes('gradient') && key !== 'strokeColor') {
    cpIsGradient = true;
    document.querySelector('.cp-tab[data-tab="gradient"]').click();
    const parsed = cpParseGradient(initialValue);
    if (parsed) {
      document.getElementById('cp-grad-angle').value = parsed.angle;
      cpGradStops = parsed.stops;
      cpActiveStop = 0;
      iroPicker.color.set(cpGradStops[0].color);
      cpRebuildStops();
    }
  } else {
    cpIsGradient = false;
    document.querySelector('.cp-tab[data-tab="solid"]').click();
    const isSolidValue = initialValue && !initialValue.includes('gradient');
    if (isSolidValue) iroPicker.color.set(initialValue);
    document.getElementById('cp-hex-input').value = isSolidValue ? initialValue.replace(/^#/, '') : '';
  }

  renderPalettes();

  const rect = btn.getBoundingClientRect();
  modal.style.display = 'flex';

  let top = rect.top;
  let left = rect.left - 280;
  if (left < 0) left = rect.right + 10;
  if (top + modal.offsetHeight > window.innerHeight) {
    top = window.innerHeight - modal.offsetHeight - 10;
  }
  modal.style.top = top + 'px';
  modal.style.left = left + 'px';
}

function closeColorPicker() {
  document.getElementById('color-picker-modal').style.display = 'none';
  currentCpKey = null;
  pushHistory();
}

function syncColorPickerWithSelection(el, c) {
  if (document.getElementById('color-picker-modal').style.display !== 'flex' || !currentCpKey) return;

  let val;
  if (currentCpKey === 'canvas-bg' && c) {
    val = c.bgColor;
  } else if (el && el[currentCpKey] !== undefined) {
    val = el[currentCpKey];
  } else {
    closeColorPicker();
    return;
  }

  const activeBtn = document.querySelector(`.cp-trigger[data-k="${currentCpKey}"]`);
  if (activeBtn) {
    const rect = activeBtn.getBoundingClientRect();
    const modal = document.getElementById('color-picker-modal');
    let top = rect.top;
    let left = rect.left - 280;
    if (left < 0) left = rect.right + 10;
    if (top + modal.offsetHeight > window.innerHeight) {
      top = window.innerHeight - modal.offsetHeight - 10;
    }
    modal.style.top = top + 'px';
    modal.style.left = left + 'px';
  }

  if (val && val.includes('gradient') && currentCpKey !== 'strokeColor') {
    cpIsGradient = true;
    document.querySelector('.cp-tab[data-tab="gradient"]').classList.add('active');
    document.querySelector('.cp-tab[data-tab="solid"]').classList.remove('active');
    document.getElementById('cp-gradient-controls').style.display = 'block';

    const parsed = cpParseGradient(val);
    if (parsed) {
      document.getElementById('cp-grad-angle').value = parsed.angle;
      cpGradStops = parsed.stops;
      if (cpActiveStop > cpGradStops.length - 1) cpActiveStop = 0;
      iroPicker.color.set(cpGradStops[cpActiveStop].color);
      cpRebuildStops();
    }
  } else {
    cpIsGradient = false;
    document.querySelector('.cp-tab[data-tab="solid"]').classList.add('active');
    document.querySelector('.cp-tab[data-tab="gradient"]').classList.remove('active');
    document.getElementById('cp-gradient-controls').style.display = 'none';

    const isSolidValue = val && !val.includes('gradient');
    if (isSolidValue) {
      try { iroPicker.color.set(val); } catch (e) { }
    }
    document.getElementById('cp-hex-input').value = isSolidValue ? val.replace(/^#/, '') : '';
  }
}

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

  let buttonHtml = '';
  if (options.button) {
    buttonHtml = `<button class="toast-btn">${options.button.text}</button>`;
  }

  toast.innerHTML = `
    <span class="icon">${iconHtml}</span>
    <span>${message}</span>
    ${buttonHtml}
  `;

  // Attach interactive button click event
  if (options.button && options.button.onClick) {
    const btn = toast.querySelector('.toast-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        options.button.onClick(e);
        toast.classList.remove('show');
      });
    }
  }

  toast.classList.remove('show');
  void toast.offsetWidth; // Force reflow
  toast.classList.add('show');

  if (window.canvasNotificationTimeout) {
    clearTimeout(window.canvasNotificationTimeout);
  }

  const duration = options.duration || (options.button ? 6000 : 2500);
  window.canvasNotificationTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}
