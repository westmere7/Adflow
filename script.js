// ============================================================================
// State — multi-canvas model, all serializable to JSON.
// ============================================================================
const uid = () => Math.random().toString(36).slice(2, 8);

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
    workspaceX: INITIAL_LAYOUT[layoutIdx]?.x ?? 40,
    workspaceY: INITIAL_LAYOUT[layoutIdx]?.y ?? 40,
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
      fontSize: fs, color: '#ffffff', weight: '700',
      width: w - pad * 2, height: Math.round(fs * 1.2)
    }));
  if (!isWide || w > 600) {
    out.push(Object.assign(makeElement('text'),
      {
        x: pad, y: pad + fs + 6, text: 'Up to 50% off',
        fontSize: Math.max(11, Math.round(fs * 0.55)),
        color: '#c7ccdb', weight: '500',
        width: w - pad * 2, height: Math.round(fs * 0.7)
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
      radius: 6, width: btnW, height: btnH, isClickArea: true
    }));

  const logoW = Math.max(60, Math.min(100, Math.round(w * 0.2)));
  const logoH = Math.round(logoW * 0.35); // rough aspect ratio for RMIT logo
  out.push(Object.assign(makeElement('image'),
    { customName: 'RMIT Logo', assetId: 'rmit_logo', x: w - logoW - pad, y: pad, width: logoW, height: logoH, persistent: 'top' }));

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
    case 'pixel': return { ...base, type, color: '#e61e2a', width: 100, height: 100 };
    case 'button': return { ...base, type, text: 'Learn more', fontSize: 14, color: '#ffffff', bg: '#7c5cff', radius: 6, fontFamily: 'Arial', width: 130, height: 40, isClickArea: true };
    case 'image': return { ...base, type, assetId: null, width: 140, height: 90 };
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
  loopAd: false,
  guides: [],
  activeSmartGuides: null,
  showSafezones: false,
  clipboard: null
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



function pushHistory() {
  const snapshot = JSON.stringify({
    canvases: state.canvases,
    activeCanvasId: state.activeCanvasId,
    selectedElementId: state.selectedElementId,
    layerSelection: state.layerSelection,
    guides: state.guides
  });
  if (historyIndex >= 0 && history[historyIndex] === snapshot) return;
  history.splice(historyIndex + 1);
  history.push(snapshot);
  if (history.length > 15) history.shift();
  else historyIndex++;
  queueSizeUpdate();
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
  state.editingElementId = null;
  render();
}

pushHistory();

// ============================================================================
// Accessors
// ============================================================================
const getActiveCanvas = () => state.canvases.find(c => c.id === state.activeCanvasId);
const getSelectedElement = () => {
  const c = getActiveCanvas();
  return c ? c.elements.find(e => e.id === state.selectedElementId) : null;
};

// ============================================================================
// Render
// ============================================================================
const workspaceEl = document.getElementById('workspace-canvas');
const canvasArea = document.getElementById('canvas-area');
const layersEl = document.getElementById('layers');
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
  document.querySelector('.app').classList.toggle('preview-lock', !!(state.isPreviewMode || state.singlePreviewId));
  // workspace sizing
  const z = state.zoom || 1;
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
  renderFrameControls();
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

  const z = state.zoom || 1;
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
  const startZoom = state.zoom || 1;
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

  state.zoom = Math.max(0.1, newZoom);
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
    zip.file('index.html', generateExportHTML(c, zip));
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

    const layerBot = document.createElement('div'); layerBot.style.position = 'absolute'; layerBot.style.inset = '0'; layerBot.style.pointerEvents = 'none'; layerBot.className = 'layer-bot';
    const layerMid = document.createElement('div'); layerMid.style.position = 'absolute'; layerMid.style.inset = '0'; layerMid.style.pointerEvents = 'none'; layerMid.className = 'layer-mid';
    const layerTop = document.createElement('div'); layerTop.style.position = 'absolute'; layerTop.style.inset = '0'; layerTop.style.pointerEvents = 'none'; layerTop.className = 'layer-top';
    canvasInner.appendChild(layerBot);
    canvasInner.appendChild(layerMid);
    canvasInner.appendChild(layerTop);

    // elements
    c.elements.forEach(el => {
      if (el.persistent === 'bottom') layerBot.appendChild(elementNode(el, c));
      else if (el.persistent === 'top') layerTop.appendChild(elementNode(el, c));
      else if (el.frameId === state.activeFrameId) layerMid.appendChild(elementNode(el, c));
    });
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
      if (isSpaceDown) return;
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
  if (state.isDragging && state.layerSelection && state.layerSelection.includes(el.id)) {
    d.style.zIndex = '99999';
  }
  if (el.locked) d.style.pointerEvents = 'none';

  const editing = state.editingElementId === el.id;
  if (editing) d.classList.add('editing');

  if (el.type === 'text') {
    d.classList.add('text');
    d.style.display = 'flex';
    d.style.flexDirection = 'column';
    const vAlignMap = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
    d.style.justifyContent = vAlignMap[el.verticalAlign || 'top'];
    if (editing) {
      const ed = document.createElement('div');
      ed.className = 'editable';
      ed.contentEditable = 'true';
      applyColorToText(ed, el.color);
      ed.style.fontSize = el.fontSize + 'px';
      ed.style.fontWeight = el.weight;
      ed.style.fontFamily = el.fontFamily || 'Arial';
      ed.style.lineHeight = el.lineHeight ? (String(el.lineHeight).includes('px') || String(el.lineHeight).includes('em') ? el.lineHeight : el.lineHeight + 'px') : '1.2';
      ed.style.letterSpacing = (el.letterSpacing || 0) + 'px';
      ed.style.textAlign = el.textAlign || 'left';
      ed.style.width = '100%';
      ed.style.outline = 'none';
      ed.style.whiteSpace = 'pre-wrap';
      ed.style.wordBreak = 'break-word';
      ed.innerText = el.text;
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
      textBlock.style.fontSize = el.fontSize + 'px';
      textBlock.style.lineHeight = el.lineHeight ? (String(el.lineHeight).includes('px') || String(el.lineHeight).includes('em') ? el.lineHeight : el.lineHeight + 'px') : '1.2';

      const span = document.createElement(el.htmlTag || 'span');
      span.innerText = el.text;
      applyColorToText(span, el.color);
      span.style.fontSize = el.fontSize + 'px';
      span.style.fontWeight = el.weight;
      span.style.fontFamily = el.fontFamily || 'Arial';
      span.style.lineHeight = el.lineHeight ? (String(el.lineHeight).includes('px') || String(el.lineHeight).includes('em') ? el.lineHeight : el.lineHeight + 'px') : '1.2';
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
    fill.style.cssText = `position:absolute;inset:0;background:${el.color};border-radius:${el.radius || 0}px;opacity:${(el.opacity !== undefined ? el.opacity : 100) / 100};pointer-events:none;`;
    d.appendChild(fill);
    const stroke = strokeOverlayNode(el);
    if (stroke) d.appendChild(stroke);
  } else if (el.type === 'circle') {
    d.classList.add('shape-circle');
    d.style.borderRadius = '50%';
    const fill = document.createElement('div');
    fill.style.cssText = `position:absolute;inset:0;background:${el.color};border-radius:50%;opacity:${(el.opacity !== undefined ? el.opacity : 100) / 100};pointer-events:none;`;
    d.appendChild(fill);
    const stroke = strokeOverlayNode(el);
    if (stroke) d.appendChild(stroke);
  } else if (el.type === 'pixel') {
    d.classList.add('shape-pixel');
    const fillOpacity = (el.opacity !== undefined ? el.opacity : 100) / 100;
    const fill = document.createElement('div');
    fill.style.cssText = `position:absolute;inset:0;opacity:${fillOpacity};pointer-events:none;`;
    fill.innerHTML = `<svg viewBox="0 0 578.52 556.76" width="100%" height="100%" preserveAspectRatio="none"><path fill="${el.color}" d="M290.78,0h-74.15v60.23h-123.75v125.78H0v184.74h92.88v125.78h123.5v60.23h65.55c152.85,0,287.74-123.5,287.74-277.62S444.14,0,290.78,0"/></svg>`;
    d.appendChild(fill);
    const stroke = strokeOverlayNode(el);
    if (stroke) d.appendChild(stroke);
  } else if (el.type === 'button') {
    d.classList.add('button');
    d.style.color = el.color;
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
    fill.style.cssText = `position:absolute;inset:0;background:${el.bg};border-radius:${el.radius || 0}px;opacity:${(el.opacity !== undefined ? el.opacity : 100) / 100};pointer-events:none;`;
    d.appendChild(fill);
    if (editing) {
      const ed = document.createElement('span');
      ed.className = 'editable';
      ed.contentEditable = 'true';
      applyColorToText(ed, el.color);
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
      ed.innerText = el.text;
      wireInlineEdit(ed, el, 'text');
      d.appendChild(ed);
    } else {
      const span = document.createElement('span');
      span.innerText = el.text;
      applyColorToText(span, el.color);
      span.style.fontWeight = el.weight || '600';
      span.style.position = 'relative';
      d.appendChild(span);
    }
    const stroke = strokeOverlayNode(el);
    if (stroke) d.appendChild(stroke);
  } else if (el.type === 'image') {
    d.classList.add('image');
    if (el.assetId) {
      const img = document.createElement('img');
      img.src = state.assets[el.assetId] || el.assetId;
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
  const commit = () => {
    el[key] = ed.innerText;
    state.editingElementId = null;
    render();
  };
  const cancel = () => {
    state.editingElementId = null;
    render();
  };
  ed.addEventListener('blur', commit);
  ed.addEventListener('keydown', (e) => {
    e.stopPropagation(); // don't fire global shortcuts while typing
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  ed.addEventListener('input', () => {
    el[key] = ed.innerText;
    if (el.type === 'button' && el.autoHug) {
      el.width = measureButtonWidth(el);
      const wrapper = ed.closest('.el');
      if (wrapper) wrapper.style.width = el.width + 'px';
    }
  });
  // don't let mouse-drag inside the editor move the element
  ed.addEventListener('mousedown', (e) => e.stopPropagation());
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
  ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(corner => {
    const h = document.createElement('div');
    h.className = 'handle ' + corner;
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

// ============================================================================
// Element drag / resize
// ============================================================================
function onElementMouseDown(e, el, canvasCtx) {
  if (isSpaceDown) {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    scrollStartX = canvasArea.scrollLeft;
    scrollStartY = canvasArea.scrollTop;
    canvasArea.style.cursor = 'var(--cur-grabbing, grabbing)';
    e.stopPropagation();
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

    state.activeSmartGuides = { x: snapX, y: snapY };
    render(true);
  };
  const onUp = (ev) => {
    state.isDragging = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    state.activeSmartGuides = null;
    state.dropTargetCanvasId = null;

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

  const onMove = (ev) => {
    const dx = (ev.clientX - startX) / z;
    const dy = (ev.clientY - startY) / z;
    let ldx = dx * cos - dy * sin;
    let ldy = dx * sin + dy * cos;

    // Shift = lock aspect ratio. For corners, sync the smaller delta to the
    // dominant one along the original aspect.
    const aspect = o.h / o.w;
    if (ev.shiftKey && ['nw', 'ne', 'sw', 'se'].includes(corner) && o.w > 0 && o.h > 0) {
      const signSame = (corner === 'se' || corner === 'nw') ? 1 : -1;
      if (Math.abs(ldx / o.w) > Math.abs(ldy / o.h)) {
        ldy = signSame * ldx * aspect;
      } else {
        ldx = signSame * ldy / aspect;
      }
    }

    if (corner === 'se') { el.width = Math.max(10, o.w + ldx); el.height = Math.max(10, o.h + ldy); }
    if (corner === 'sw') { el.x = o.x + ldx; el.width = Math.max(10, o.w - ldx); el.height = Math.max(10, o.h + ldy); }
    if (corner === 'ne') { el.y = o.y + ldy; el.width = Math.max(10, o.w + ldx); el.height = Math.max(10, o.h - ldy); }
    if (corner === 'nw') { el.x = o.x + ldx; el.y = o.y + ldy; el.width = Math.max(10, o.w - ldx); el.height = Math.max(10, o.h - ldy); }
    if (corner === 'n') { el.y = o.y + ldy; el.height = Math.max(10, o.h - ldy); }
    if (corner === 's') { el.height = Math.max(10, o.h + ldy); }
    if (corner === 'w') { el.x = o.x + ldx; el.width = Math.max(10, o.w - ldx); }
    if (corner === 'e') { el.width = Math.max(10, o.w + ldx); }

    // Shift on an edge handle: scale the perpendicular axis proportionally,
    // anchored at the center of that axis so the box grows symmetrically.
    if (ev.shiftKey && o.w > 0 && o.h > 0) {
      if (corner === 'e' || corner === 'w') {
        const newH = Math.max(10, el.width * aspect);
        el.y = o.y + (o.h - newH) / 2;
        el.height = newH;
      } else if (corner === 'n' || corner === 's') {
        const newW = Math.max(10, el.height / aspect);
        el.x = o.x + (o.w - newW) / 2;
        el.width = newW;
      }
    }

    if (el.type === 'button' && el.autoHug && Math.abs(ldx) > 2) {
      el.autoHug = false;
    }

    if (ev.altKey && (el.type === 'text' || el.type === 'button') && o.fs) {
      const isHorizontalOnly = (corner === 'e' || corner === 'w');
      const scale = isHorizontalOnly ? (el.width / o.w) : (el.height / o.h);
      el.fontSize = Math.max(4, Math.round(o.fs * scale));
    } else if ((el.type === 'text' || el.type === 'button') && o.fs) {
      el.fontSize = o.fs;
    }

    if (ev.ctrlKey || ev.metaKey) {
      el.width = Math.round(el.width / 10) * 10;
      el.height = Math.round(el.height / 10) * 10;
      el.x = Math.round(el.x / 10) * 10;
      el.y = Math.round(el.y / 10) * 10;
    } else {
      el.x = Math.round(el.x); el.y = Math.round(el.y);
      el.width = Math.round(el.width); el.height = Math.round(el.height);
    }

    render();
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if (el.width !== o.w || el.height !== o.h) pushHistory();
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
    if (ev.shiftKey && ['nw', 'ne', 'sw', 'se'].includes(corner) && obb.w > 0 && obb.h > 0) {
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

    if (ev.shiftKey && obb.w > 0 && obb.h > 0) {
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
  if (isSpaceDown) return;
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
  if (isSpaceDown) {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    scrollStartX = canvasArea.scrollLeft;
    scrollStartY = canvasArea.scrollTop;
    canvasArea.style.cursor = 'var(--cur-grabbing, grabbing)';
    e.stopPropagation();
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

  const oldZoom = state.zoom || 1;
  const zoomSpeed = e.deltaMode === 1 ? 0.05 : 0.002;
  let newZoom = oldZoom - e.deltaY * zoomSpeed;
  newZoom = Math.max(0.1, Math.min(newZoom, 5));

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
    if (c._valKb) {
      const color = (c._valErrors && c._valErrors.length > 0) ? '#ef4444' : '#10b981';
      sizeHtml = `<span id="val-size-${c.id}" style="color:${color}; font-size:9px; font-weight:bold; transition: color 0.2s;">${c._valKb}KB</span>`;
      if (c._valErrors && c._valErrors.length > 0) {
        warnHtml = `<span id="val-warn-${c.id}"><span class="val-warn-icon" style="cursor:pointer; color:#ef4444;" title="Click for details" data-err-canvas="${c.id}">⚠️</span></span>`;
      } else {
        warnHtml = `<span id="val-warn-${c.id}"><span style="color:#10b981;" title="Passed checks">✓</span></span>`;
      }
    } else {
      sizeHtml = `<span id="val-size-${c.id}" style="color:var(--text-muted); font-size:9px; font-weight:bold; opacity: 0.5;">calc...</span>`;
      warnHtml = `<span id="val-warn-${c.id}"></span>`;
      if (!window._valInitRun) {
        window._valInitRun = true;
        setTimeout(() => queueSizeUpdate(), 200);
      }
    }

    div.innerHTML = `
      <div style="flex:1; display:flex; flex-direction:row; align-items:center; gap:8px; overflow:hidden;">
        <span class="ci-name" style="font-family:'JetBrains Mono', ui-monospace, monospace; font-size:12px;">${index + 1}. ${c.width}×${c.height}</span>
        <div style="display:flex; align-items:center; gap:4px; margin-left:auto;">
          ${sizeHtml}
          ${warnHtml}
        </div>
      </div>
    `;

    const warnIcon = div.querySelector('.val-warn-icon');
    if (warnIcon) {
      warnIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const errors = c._valErrors || [];
        const criteriaHTML = `
              <div style="font-size:12px; color:var(--text-label); margin-bottom:12px;">
                <strong style="color:var(--text-main);">Google Ad Requirements:</strong>
                <ul style="margin-top:6px; padding-left:20px; line-height:1.5;">
                  <li>ZIP file size must be 150KB or smaller.</li>
                  <li>Must contain a valid clickTag URL (http/https).</li>
                  <li>All assets must be local (no external URLs).</li>
                  <li>No missing or broken assets.</li>
                </ul>
              </div>
            `;
        const errorsHTML = `
              <div style="font-size:12px; color:#ef4444; background:rgba(239, 68, 68, 0.1); padding:12px; border-radius:6px; border:1px solid rgba(239, 68, 68, 0.2);">
                <strong style="display:block; margin-bottom:8px;">Found Issues:</strong>
                <ul style="margin:0; padding-left:20px; line-height:1.5;">
                  ${errors.map(err => `<li>${err}</li>`).join('')}
                </ul>
              </div>
            `;
        openModal(`Validation: ${c.width}x${c.height}`, criteriaHTML + errorsHTML, false);
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
// Layers panel
// ============================================================================
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
          <button class="icon-btn ${el.hidden ? 'active' : ''}" data-act="hide" title="Toggle visibility">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      `;

      div.addEventListener('mouseenter', () => {
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
  const hexCopyBtn = (k) => `<button class="hex-copy" data-target-k="${k}" title="Copy hex" tabindex="-1" style="position:absolute; right:4px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; padding:2px; color:var(--text-muted); display:flex; align-items:center;">${HEX_COPY_SVG}</button>`;
  const hexInputBox = (key, value, inputId = '') => `<div style="position:relative; flex:1; min-width:0;"><input type="text" data-k="${key}" ${inputId ? `id="${inputId}"` : ''} value="${(value || '').replace(/^#/, '')}" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 24px 4px 6px; font-size:11px; outline:none; text-transform:uppercase;" />${hexCopyBtn(key)}</div>`;

  if (!el) {
    if (!c) { propsEl.innerHTML = '<div class="panel-section"><h3>Properties</h3><div class="prop-empty">No canvas.</div></div>'; return; }
    // show canvas properties when no element is selected
    propsEl.innerHTML = `
      <div class="panel-section">
        <h3>Canvas Settings</h3>
        <div class="prop-row">
          <label>Dimensions</label>
          <div class="prop-grid-2">
            <input type="number" id="c-w" value="${c.width}" />
            <input type="number" id="c-h" value="${c.height}" />
          </div>
        </div>
        <div class="prop-row" style="margin-top:12px;">
          <label>Background Color</label>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="cp-trigger" data-k="canvas-bg" id="c-bg-color" style="width:24px; height:24px; border-radius:4px; border:1px solid #272c3a; cursor:pointer; background:${getBgStyle(c.bgColor) || '#000'}"></button>
            ${hexInputBox('canvas-bg', c.bgColor, 'c-bg-color-hex')}
          </div>
        </div>
        <div class="prop-row" style="margin-top:4px;">
          <div class="checkbox-row">
            <input type="checkbox" id="c-bg-apply-all" ${state.bgApplyAll !== false ? 'checked' : ''} />
            <label>Apply to all canvases</label>
          </div>
        </div>
        <div class="prop-row" style="margin-top:12px;">
          <div class="checkbox-row">
            <input type="checkbox" id="c-full-click" ${c.fullClickArea !== false ? 'checked' : ''} />
            <label>Use entire canvas as click area</label>
          </div>
        </div>

        <div class="prop-row" style="margin-top:16px; display:flex; flex-direction:column; gap:8px;">
          <button id="c-btn-preview" style="
            width:100%; padding:8px 12px; border-radius:6px; border:none; cursor:pointer;
            background:var(--accent-base); color:#fff; font-size:12px; font-weight:600;
            font-family:inherit; display:flex; align-items:center; justify-content:center; gap:6px;
            box-shadow:0 2px 8px rgba(124,92,255,0.35); transition:filter 0.15s;
          ">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Preview
          </button>
          <div style="display:flex; gap:6px;">
            <button id="c-btn-dl-zip" style="
              flex:1; padding:7px 0; border-radius:6px; border:1px solid #272c3a; cursor:pointer;
              background:var(--bg-input); color:var(--text-main); font-size:11px; font-weight:500;
              font-family:inherit; display:flex; align-items:center; justify-content:center; gap:4px;
              transition:border-color 0.15s; white-space:nowrap;
            ">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download ZIP
            </button>
            <button id="c-btn-dl-img" style="
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
      </div>`;
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

    if (typeof syncColorPickerWithSelection === 'function') {
      syncColorPickerWithSelection(null, c);
    }
    return;
  }

  const f = [];
  const num = (key, label, def = '') => `<div class="prop-row"><label>${label}</label><input type="number" data-k="${key}" value="${el[key] !== undefined ? el[key] : def}" /></div>`;
  const txt = (key, label) => `<div class="prop-row"><label>${label}</label><input type="text" data-k="${key}" value="${(el[key] || '').replace(/"/g, '&quot;')}" /></div>`;
  const col = (key, label) => `
    <div class="prop-row">
      <label>${label}</label>
      <div style="display:flex; gap:6px; align-items:center;">
        <button class="cp-trigger" data-k="${key}" style="width:24px; height:24px; border-radius:4px; border:1px solid #272c3a; cursor:pointer; background:${getBgStyle(el[key]) || '#000'}"></button>
        ${hexInputBox(key, el[key])}
      </div>
    </div>`;
  const colOpac = (key, label) => `
    <div class="prop-row" style="display:flex; gap:10px;">
      <div style="flex:1; min-width:0;">
        <label>${label}</label>
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="cp-trigger" data-k="${key}" style="width:24px; height:24px; border-radius:4px; border:1px solid #272c3a; cursor:pointer; background:${getBgStyle(el[key]) || '#000'}"></button>
          ${hexInputBox(key, el[key])}
        </div>
      </div>
      <div style="width:78px; flex-shrink:0;">
        <label>Opacity %</label>
        <input type="number" data-k="opacity" value="${el.opacity !== undefined ? el.opacity : 100}" min="0" max="100" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" />
      </div>
    </div>`;

  const alignElOptions = [
    { id: 'left', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="4" y1="2" x2="4" y2="22"/><rect x="8" y="10" width="12" height="4" rx="1"/></svg>' },
    { id: 'center', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="2" x2="12" y2="22"/><rect x="6" y="10" width="12" height="4" rx="1"/></svg>' },
    { id: 'right', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="20" y1="2" x2="20" y2="22"/><rect x="4" y="10" width="12" height="4" rx="1"/></svg>' },
    { id: 'top', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="2" y1="4" x2="22" y2="4"/><rect x="10" y="8" width="4" height="12" rx="1"/></svg>' },
    { id: 'middle', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="2" y1="12" x2="22" y2="12"/><rect x="10" y="6" width="4" height="12" rx="1"/></svg>' },
    { id: 'bottom', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="2" y1="20" x2="22" y2="20"/><rect x="10" y="4" width="4" height="12" rx="1"/></svg>' }
  ];
  const alignElHtml = alignElOptions.map(a => `<button class="align-btn action-el-align" data-align="${a.id}" title="Align ${a.id}">${a.icon}</button>`).join('');

  f.push(`<div class="prop-row"><div class="align-group" style="justify-content:space-between; width:100%;">${alignElHtml}</div></div>`);
  f.push(`<div class="prop-row"><div class="prop-grid-2">${num('x', 'X')}${num('y', 'Y')}</div></div>`);
  f.push(`<div class="prop-row"><div class="prop-grid-2">${num('width', 'W')}${num('height', 'H')}</div></div>`);
  f.push(`<div class="prop-row"><div class="prop-grid-2">${num('rotation', 'Rotation', 0)}</div></div>`);

  const FONT_OPTIONS = ['Arial', 'Helvetica Neue LT Pro', 'Museo', 'Times New Roman', 'Verdana', 'Tahoma'];
  const fontWeights = {
    'Museo': ['300', '500', '700'],
    'Helvetica Neue LT Pro': ['300', '400', '500']
  };
  const getWeightsForFont = (fnt) => fontWeights[fnt] || ['100', '200', '300', '400', '500', '600', '700', '800', '900'];

  if (el.type === 'text') {
    f.push(`<div class="prop-row"><label>Text</label><textarea data-k="text" rows="2">${el.text}</textarea></div>`);



    f.push(`<div class="prop-row"><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px;">
      <div class="prop-row" style="margin:0"><label>Font</label>
        <select data-k="fontFamily">
          ${FONT_OPTIONS.map(fnt => `<option ${fnt === (el.fontFamily || 'Arial') ? 'selected' : ''} value="${fnt}">${fnt}</option>`).join('')}
        </select>
      </div>
      <div class="prop-row" style="margin:0"><label>Weight</label>
        <select data-k="weight">
          ${getWeightsForFont(el.fontFamily || 'Arial').map(w => `<option ${w === el.weight ? 'selected' : ''} value="${w}">${w}</option>`).join('')}
        </select>
      </div>
      <div class="prop-row" style="margin:0"><label>Size</label>
        <input type="number" data-k="fontSize" value="${el.fontSize}" />
      </div>
    </div></div>`);

    f.push(colOpac('color', 'Color'));

    f.push(`<div class="prop-row" id="prop-spacing-row">
          <div class="prop-grid-2">
            <div class="prop-row" style="margin:0"><label>Line Height</label><input type="number" step="0.1" data-k="lineHeight" value="${el.lineHeight || '1.2'}" /></div>
            <div class="prop-row" style="margin:0"><label>Spacing</label><input type="number" data-k="letterSpacing" value="${el.letterSpacing !== undefined ? el.letterSpacing : 0}" /></div>
          </div>
        </div>`);

    // Text background — checkbox toggles a sub-panel of color/opacity/padding/coverage.
    f.push(`<div class="prop-row"><div class="checkbox-row"><input type="checkbox" data-k="hasBg" ${el.hasBg ? 'checked' : ''}/><label>Background</label></div></div>`);
    if (el.hasBg) {
      // BG color column shrunk so "Opacity %" label fits on one line without wrapping.
      f.push(`<div class="prop-row" style="display:flex; gap:10px;">
            <div style="flex:1; min-width:0;">
              <label>BG Color</label>
              <div style="display:flex; gap:6px; align-items:center;">
                <button class="cp-trigger" data-k="bg" style="width:24px; height:24px; border-radius:4px; border:1px solid #272c3a; cursor:pointer; background:${getBgStyle(el.bg || '#000000') || '#000'}"></button>
                ${hexInputBox('bg', el.bg || '#000000')}
              </div>
            </div>
            <div style="width:78px; flex-shrink:0;">
              <label>Opacity %</label>
              <input type="number" data-k="bgOpacity" value="${el.bgOpacity !== undefined ? el.bgOpacity : 100}" min="0" max="100" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" />
            </div>
          </div>`);
      // L/R pad, T/B pad, Coverage — three compact columns on a single row.
      f.push(`<div class="prop-row" style="display:flex; gap:6px;">
            <div style="flex:1; min-width:0;"><label>L/R Pad</label><input type="number" data-k="bgPadL" value="${el.bgPadL !== undefined ? el.bgPadL : 8}" min="0" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" /></div>
            <div style="flex:1; min-width:0;"><label>T/B Pad</label><input type="number" data-k="bgPadV" value="${el.bgPadV !== undefined ? el.bgPadV : 4}" min="0" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" /></div>
            <div style="flex:1; min-width:0;"><label>Cover %</label><input type="number" data-k="bgCoverage" value="${el.bgCoverage !== undefined ? el.bgCoverage : 100}" min="0" max="100" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" /></div>
          </div>`);
    }
  }

  if (el.type === 'text' || el.type === 'button') {
    const alignOptions = [
      { id: 'left', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' },
      { id: 'center', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' },
      { id: 'right', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' }
    ];
    const alignHtml = alignOptions.map(a => `<button class="align-btn ${el.textAlign === a.id ? 'active' : ''}" data-align="${a.id}" title="${a.id}" style="padding:4px 0;">${a.icon}</button>`).join('');
    const vAlignOptions = [
      { id: 'top', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="4" y1="4" x2="20" y2="4"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="14" x2="16" y2="14"/></svg>' },
      { id: 'middle', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="4" y1="12" x2="20" y2="12"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="17" x2="16" y2="17"/></svg>' },
      { id: 'bottom', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="4" y1="20" x2="20" y2="20"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="8" y1="10" x2="16" y2="10"/></svg>' }
    ];
    const vAlignHtml = vAlignOptions.map(a => `<button class="valign-btn align-btn ${el.verticalAlign === a.id ? 'active' : ''}" data-valign="${a.id}" title="${a.id}" style="padding:4px 0;">${a.icon}</button>`).join('');

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
              <button class="cp-trigger" data-k="strokeColor" style="width:24px; height:24px; border-radius:4px; border:1px solid #272c3a; cursor:pointer; background:transparent; box-shadow:inset 0 0 0 4px ${getBgStyle(el.strokeColor || '#ffffff') || '#fff'};"></button>
              ${hexInputBox('strokeColor', el.strokeColor || '#ffffff')}
            </div>
          </div>
          <div style="width:78px; flex-shrink:0;">
            <label>Opacity %</label>
            <input type="number" data-k="strokeOpacity" value="${el.strokeOpacity !== undefined ? el.strokeOpacity : 100}" min="0" max="100" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" />
          </div>
        </div>`;
    h += `<div class="prop-row" style="display:flex; gap:6px;">
          <div style="flex:1; min-width:0;"><label>Thickness</label><input type="number" data-k="strokeWidth" value="${sw}" min="0" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" /></div>
          <div style="flex:1; min-width:0;"><label>Dash</label><input type="number" data-k="strokeDash" value="${el.strokeDash !== undefined ? el.strokeDash : 0}" min="0" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" /></div>
          <div style="flex:1; min-width:0;"><label>Gap</label><input type="number" data-k="strokeGap" value="${el.strokeGap !== undefined ? el.strokeGap : 0}" min="0" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" /></div>
        </div>`;
    return h;
  };

  if (el.type === 'rect') { f.push(colOpac('color', 'Fill')); f.push(num('radius', 'Radius')); f.push(strokeSection()); }
  if (el.type === 'circle') { f.push(colOpac('color', 'Fill')); f.push(strokeSection()); }
  if (el.type === 'pixel') { f.push(colOpac('color', 'Fill')); f.push(strokeSection()); }
  if (el.type === 'button') {
    f.push(txt('text', 'Label'));
    f.push(`<div class="prop-row"><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px;">
      <div class="prop-row" style="margin:0"><label>Font</label>
        <select data-k="fontFamily">
          ${FONT_OPTIONS.map(fnt => `<option ${fnt === (el.fontFamily || 'Arial') ? 'selected' : ''} value="${fnt}">${fnt}</option>`).join('')}
        </select>
      </div>
      <div class="prop-row" style="margin:0"><label>Weight</label>
        <select data-k="weight">
          ${getWeightsForFont(el.fontFamily || 'Arial').map(w => `<option ${w === el.weight ? 'selected' : ''} value="${w}">${w}</option>`).join('')}
        </select>
      </div>
      <div class="prop-row" style="margin:0"><label>Size</label>
        <input type="number" data-k="fontSize" value="${el.fontSize}" />
      </div>
    </div></div>`);
    f.push(colOpac('bg', 'Background'));
    f.push(col('color', 'Text color'));
    // Radius + Padding L/R share a row.
    f.push(`<div class="prop-row" style="display:flex; gap:6px;">
          <div style="flex:1; min-width:0;"><label>Radius</label><input type="number" data-k="radius" value="${el.radius !== undefined ? el.radius : 0}" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" /></div>
          <div style="flex:1; min-width:0;"><label>Padding L/R</label><input type="number" data-k="paddingLR" value="${el.paddingLR !== undefined ? el.paddingLR : 16}" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" /></div>
        </div>`);
    f.push(`<div class="prop-row" style="display:flex; gap:16px;">
          <div class="checkbox-row"><input type="checkbox" data-k="autoHug" ${el.autoHug ? 'checked' : ''}/><label>Hug</label></div>
          <div class="checkbox-row"><input type="checkbox" data-k="isClickArea" ${el.isClickArea ? 'checked' : ''}/><label>Clicktag</label></div>
        </div>`);
    f.push(strokeSection());
  }
  if (el.type === 'image') {
    f.push(`<div class="prop-row"><label>Upload image</label><input type="file" accept="image/*" id="img-upload" /></div>`);
    if (el.name) {
      f.push(`<div class="prop-row" style="margin-top:-6px;"><label style="font-size:10px; color:var(--text-main); margin:0;">File: ${esc(el.name)}</label></div>`);
    }
    if (el.assetId && state.assets[el.assetId]) {
      f.push(`<div class="prop-row"><label>Preview</label><img src="${state.assets[el.assetId]}" style="max-width:100%;border-radius:4px;border:1px solid #272c3a;" /></div>`);
    }
  }

  // Animation section
  f.push(`</div>`); // end of properties section
  f.push(`<div class="panel-section"><h3>Animation</h3>`);
  f.push(`<div class="prop-row" style="margin-bottom:8px;"><label>IN TRANSITIONS</label></div>`);

  const animOptions = [
    { val: 'none', label: 'None' },
    { val: 'fade-in', label: 'Fade In' },
    { val: 'slide-up', label: 'Slide Up' },
    { val: 'slide-down', label: 'Slide Down' },
    { val: 'slide-left', label: 'Slide Left' },
    { val: 'slide-right', label: 'Slide Right' },
    { val: 'pop-in', label: 'Pop In' },
    { val: 'zoom-in', label: 'Zoom Out' }
  ];
  if (el.type === 'text') {
    animOptions.push({ val: 'typing', label: 'Typing' });
    animOptions.push({ val: 'fade-typing', label: 'Fade Typing' });
  }

  f.push(`<div class="anim-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px;">
    ${animOptions.map(o => `<button class="align-btn anim-btn ${o.val === (el.animType || 'none') ? 'active' : ''}" data-val="${o.val}" style="font-size:10px;">${o.label}</button>`).join('')}
  </div>`);

  // Seconds inputs use step=0.1 so wheel-scroll and arrow keys nudge by 0.1.
  const secNum = (key, label, def = '') => `<div class="prop-row"><label>${label}</label><input type="number" step="0.1" data-k="${key}" value="${el[key] !== undefined ? el[key] : def}" /></div>`;
  f.push(`<div class="prop-row" style="margin-bottom:8px;"><div class="prop-grid-2">
    ${secNum('animDuration', 'Duration (s)')}
    ${secNum('animDelay', 'Delay (s)')}
  </div></div>`);

  const hasFadeToggle = ['slide-up', 'slide-down', 'slide-left', 'slide-right', 'pop-in', 'zoom-in'].includes(el.animType);
  if (hasFadeToggle || el.animType === 'zoom-in') {
    let extraProps = '';
    if (el.animType === 'zoom-in') {
      extraProps += `<div style="flex:1; min-width:0;"><label>Zoom From (%)</label><input type="number" data-k="zoomFrom" value="${el.zoomFrom !== undefined ? el.zoomFrom : 110}" style="width:100%; background:var(--bg-input); border:1px solid #272c3a; color:var(--text-main); border-radius:4px; padding:4px 6px; font-size:11px; outline:none;" /></div>`;
    }
    if (hasFadeToggle) {
      const fadeChecked = el.animFade !== false ? 'checked' : '';
      extraProps += `<div style="flex:1; display:flex; align-items:center; margin-top:0px;"><div class="checkbox-row"><input type="checkbox" data-k="animFade" ${fadeChecked}/><label>Fade</label></div></div>`;
    }
    f.push(`<div class="prop-row" style="display:flex; gap:16px; margin-bottom:12px;">${extraProps}</div>`);
  }

  // Animate BG belongs with the animation timing controls, not the BG sub-panel —
  // it modulates how the BG arrives, which is conceptually part of the entry anim.
  if (el.type === 'text' && el.hasBg && (el.animType === 'typing' || el.animType === 'fade-typing')) {
    f.push(`<div class="prop-row"><div class="checkbox-row"><input type="checkbox" data-k="animateBg" ${el.animateBg ? 'checked' : ''}/><label>Animate BG</label></div></div>`);
    if (el.animateBg) {
      f.push(`<div class="prop-row"><label>BG Offset (s)</label><input type="number" step="0.1" data-k="bgOffset" value="${el.bgOffset !== undefined ? el.bgOffset : 0}" /></div>`);
    }
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
    ${effectOptions.map(o => `<button class="align-btn eff-btn ${o.val === (el.effectType || 'none') ? 'active' : ''}" data-val="${o.val}" style="font-size:10px;">${o.label}</button>`).join('')}
  </div>`);

  if (el.effectType && el.effectType !== 'none') {
    if (el.effectType === 'pan') {
      f.push(`<div class="prop-row" style="margin-bottom:16px; margin-top:-8px;"><div class="prop-grid-2">
      ${num('effDuration', 'Duration (s)', 5)}
      ${num('effDelay', 'Delay (s)', 0)}
      ${num('panDist', 'Distance (px)', 50)}
      <div class="prop-row" style="margin:0"><label>Direction</label>
        <select data-k="panDir">
          <option value="R" ${el.panDir === 'R' ? 'selected' : ''}>Right</option>
          <option value="L" ${el.panDir === 'L' ? 'selected' : ''}>Left</option>
          <option value="U" ${el.panDir === 'U' ? 'selected' : ''}>Up</option>
          <option value="D" ${el.panDir === 'D' ? 'selected' : ''}>Down</option>
        </select>
      </div>
    </div>
    <div style="display:flex; gap:16px; margin-top:8px;">
      <div class="checkbox-row"><input type="checkbox" data-k="effEase" ${el.effEase !== false ? 'checked' : ''}/><label>Ease</label></div>
      <div class="checkbox-row"><input type="checkbox" data-k="effOnce" ${el.effOnce ? 'checked' : ''}/><label>Perform once</label></div>
    </div>
    </div>`);
    } else if (el.effectType === 'zoom') {
      f.push(`<div class="prop-row" style="margin-bottom:16px; margin-top:-8px;"><div class="prop-grid-2">
      ${num('effDuration', 'Duration (s)', 5)}
      ${num('effDelay', 'Delay (s)', 0)}
      ${num('zoomTarget', 'Target (%)', 150)}
    </div>
    <div style="display:flex; gap:16px; margin-top:8px;">
      <div class="checkbox-row"><input type="checkbox" data-k="effEase" ${el.effEase !== false ? 'checked' : ''}/><label>Ease</label></div>
      <div class="checkbox-row"><input type="checkbox" data-k="effOnce" ${el.effOnce ? 'checked' : ''}/><label>Perform once</label></div>
    </div>
    </div>`);
    } else {
      f.push(`<div class="prop-row" style="margin-bottom:16px; margin-top:-8px;"><div class="prop-grid-2">
      ${num('effSpeed', 'Speed (%)', 100)}
      ${num('effDelay', 'Delay (s)', 0)}
    </div></div>`);
    }
  }

  f.push(`</div>`);

  propsEl.innerHTML = `<div class="panel-section"><h3>Properties</h3>${f.join('')}`;

  const updateProp = (k, val) => {
    if (!k) return;
    const c = getActiveCanvas();
    if (state.layerSelection && state.layerSelection.length > 1 && c) {
      c.elements.filter(e => state.layerSelection.includes(e.id)).forEach(selEl => {
        if (k === 'text' && selEl.id !== el.id) return; // Don't copy specific text content across elements
        if (['fontFamily', 'fontSize', 'weight', 'color', 'lineHeight', 'letterSpacing', 'textAlign', 'verticalAlign'].includes(k) && selEl.type !== 'text' && selEl.type !== 'button') return;
        selEl[k] = val;
        if (selEl.type === 'button' && selEl.autoHug) {
          selEl.width = measureButtonWidth(selEl);
        }
      });
    } else {
      el[k] = val;
      if (el.type === 'button' && el.autoHug) {
        el.width = measureButtonWidth(el);
      }
    }
    render(true);
  };

  const clampNum = (inp, n) => {
    if (Number.isNaN(n)) return n;
    const min = inp.min !== '' ? Number(inp.min) : -Infinity;
    const max = inp.max !== '' ? Number(inp.max) : Infinity;
    return Math.min(max, Math.max(min, n));
  };

  propsEl.querySelectorAll('input, select, textarea').forEach((inp) => {
    inp.addEventListener('input', () => {
      let val = inp.type === 'number' ? Number(inp.value) : (inp.type === 'checkbox' ? inp.checked : inp.value);
      if (inp.type === 'number' && inp.value !== '') {
        const clamped = clampNum(inp, val);
        if (clamped !== val) {
          val = clamped;
          inp.value = clamped;
        }
      }
      if (inp.type === 'text' && (inp.dataset.k === 'color' || inp.dataset.k === 'bg' || inp.dataset.k === 'strokeColor')) {
        if (!val.startsWith('#') && val.length > 0 && !val.includes('gradient')) val = '#' + val;
      }
      updateProp(inp.dataset.k, val);
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
          else otherInp.value = (inp.dataset.k === 'color' || inp.dataset.k === 'bg' || inp.dataset.k === 'canvas-bg' || inp.dataset.k === 'strokeColor') ? val.replace(/^#/, '') : val;
        }
      });
    });
    inp.addEventListener('change', () => {
      pushHistory();
      if (inp.dataset.k === 'fontFamily' || inp.dataset.k === 'hasBg' || inp.dataset.k === 'animateBg') renderProps();
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
        clearTimeout(inp.wheelHistTimer);
        inp.wheelHistTimer = setTimeout(() => pushHistory(), 400);
      });
    }
  });




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
      updateProp('animType', val);
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
          if (nodeEl.type === 'text' && (val === 'typing' || val === 'fade-typing')) {
            const target = node.querySelector('.editable') || node.querySelector('span');
            if (target && !target.dataset.origHtml) {
              target.dataset.origHtml = target.innerHTML;
              target.dataset.origStyle = target.getAttribute('style') || '';
              const chars = [...(nodeEl.text || '')];
              const totalDur = nodeEl.animDuration || 1;
              const charDur = val === 'fade-typing' ? 0.3 : 0.01;
              const baseDelay = nodeEl.animDelay || 0;
              const charDelay = totalDur / Math.max(1, chars.length);
              target.innerHTML = chars.map((c, i) => {
                if (c === '\n') return '<br/>';
                const del = (Number(baseDelay) + i * charDelay).toFixed(3);
                const escC = c === ' ' ? ' ' : c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                return `<span style="opacity:0; animation: anim-fade-in ${charDur}s linear ${del}s both;">${escC}</span>`;
              }).join('');
              // Match the export behavior: when Animate BG is on, swap the static
              // box-decoration-break bg for runtime per-line overlays so the bg
              // arrival tracks each line's typing window.
              if (nodeEl.hasBg && nodeEl.animateBg) {
                const lr = nodeEl.bgPadL !== undefined ? nodeEl.bgPadL : 8;
                const tb = nodeEl.bgPadV !== undefined ? nodeEl.bgPadV : 4;
                const cov = nodeEl.bgCoverage !== undefined ? nodeEl.bgCoverage : 100;
                const opa = (nodeEl.bgOpacity !== undefined ? nodeEl.bgOpacity : 100) / 100;
                const bgRgba = hexToRgba(nodeEl.bg || '#000000', opa);
                const bgDelay = Number(baseDelay) + (Number(nodeEl.bgOffset) || 0);
                // Strip the static bg styling so overlays don't double up. Keep
                // the padding — the per-line overlays' math assumes the wrapper
                // is padded (charSpan.offsetLeft = lr), and removing it would shift
                // the text left compared to the static-bg state.
                target.style.backgroundImage = '';
                target.style.boxDecorationBreak = '';
                target.style.removeProperty('-webkit-box-decoration-break');
                // Switch to a positioned inline-block so absolute overlays anchor here.
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
            if (val === 'zoom-in') {
              const zf = nodeEl.zoomFrom !== undefined ? nodeEl.zoomFrom / 100 : 1.1;
              node.style.setProperty('--zoom-from', zf);
            }
            const hasFade = ['slide-up', 'slide-down', 'slide-left', 'slide-right', 'pop-in', 'zoom-in'].includes(val);
            const suffix = (hasFade && nodeEl.animFade === false) ? '-nofade' : '';
            node.style.animation = `anim-${val}${suffix} ${nodeEl.animDuration || 1}s ease-out 0s both`;
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
            // Restore the original style attribute wholesale so any overlays-related
            // inline styles (display, position, isolation, padding strip, etc.) revert.
            if (target.dataset.origStyle !== undefined) {
              target.setAttribute('style', target.dataset.origStyle);
            }
            ['origHtml', 'origStyle', 'bgInited', 'bgColor', 'bgPadL', 'bgPadV', 'bgCov', 'bgDelay', 'bgDuration', 'bgAnim'].forEach(k => delete target.dataset[k]);
          }
        }
      });
    });
  });

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
  if (upload) upload.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      const id = 'img_' + uid();
      state.assets[id] = fr.result;
      el.assetId = id;
      if (!el.name || el.name.startsWith('Image')) el.name = f.name;
      pushHistory();
      render();
    };
    fr.readAsDataURL(f);
  });

  if (typeof syncColorPickerWithSelection === 'function') {
    syncColorPickerWithSelection(el, null);
  }
}

// ============================================================================
// Top bar wiring
// ============================================================================


document.getElementById('project-name').addEventListener('input', (e) => { state.projectName = e.target.value; });
document.getElementById('project-name').addEventListener('change', () => pushHistory());
document.getElementById('clicktag').addEventListener('input', (e) => { state.clickTag = e.target.value; });
document.getElementById('clicktag').addEventListener('change', () => pushHistory());

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

document.querySelectorAll('[data-add]').forEach(btn => {
  btn.addEventListener('click', () => addElement(btn.dataset.add));
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
  // Layer reorders only carry text/plain — only intercept real file drags
  if (!e.dataTransfer.types.includes('Files')) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  setDropHighlight(e.target.closest('.canvas'), true);
});

canvasArea.addEventListener('dragleave', (e) => {
  if (!canvasArea.contains(e.relatedTarget)) setDropHighlight(null, false);
});

canvasArea.addEventListener('drop', async (e) => {
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

  // Copy
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
    if (c && state.layerSelection?.length > 0) {
      state.clipboard = c.elements.filter(x => state.layerSelection.includes(x.id)).map(x => JSON.parse(JSON.stringify(x)));
    }
    return;
  }

  // Cut
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
    if (c && state.layerSelection?.length > 0) {
      state.clipboard = c.elements.filter(x => state.layerSelection.includes(x.id)).map(x => JSON.parse(JSON.stringify(x)));
      c.elements = c.elements.filter(x => !state.layerSelection.includes(x.id));
      state.layerSelection = [];
      state.selectedElementId = null;
      pushHistory();
      render();
    }
    return;
  }

  // Paste
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
    if (c && state.clipboard && state.clipboard.length > 0) {
      const groupMap = {};
      const newIds = [];
      const pasted = state.clipboard.map(x => {
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
    }
    return;
  }

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

  // Delete / Backspace → remove selected element(s)
  const hasSelection = el || (state.layerSelection && state.layerSelection.length > 0);
  if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection) {
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

document.addEventListener('keyup', (e) => {
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
// Shared single-canvas exporters — used by both the Canvas Properties panel buttons
// and the canvas right-click context menu so the two paths can't drift apart.
async function exportCanvasAsZip(c) {
  if (typeof JSZip === 'undefined') { alert('JSZip is not loaded.'); return; }
  const zip = new JSZip();
  const projName = state.projectName || 'Ad';
  const safeName = projName.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  for (const el of c.elements) {
    if (el.type === 'image' && el.assetId && el.assetId.startsWith('data/Elements/')) {
      try {
        const resp = await fetch(el.assetId);
        if (resp.ok) {
          const blob = await resp.blob();
          const filename = el.assetId.split('/').pop();
          zip.file(`assets/${filename}`, blob);
        }
      } catch (err) { console.error('Failed to prefetch', el.assetId); }
    }
  }

  zip.file('index.html', generateExportHTML(c, zip));
  const content = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = `${safeName}_${c.width}x${c.height}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportCanvasAsPng(c) {
  try {
    const html = generateExportHTML(c, null, true); // disable anims for static image
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const xhtml = new XMLSerializer().serializeToString(doc.documentElement);
    const cnv = document.createElement('canvas');
    cnv.width = c.width;
    cnv.height = c.height;
    const ctx = cnv.getContext('2d');
    ctx.fillStyle = c.bgColor || '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}"><foreignObject x="0" y="0" width="100%" height="100%">${xhtml}</foreignObject></svg>`;
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); res(); };
      img.onerror = () => rej(new Error('Image failed to load from SVG'));
      img.src = svgUrl;
    });
    URL.revokeObjectURL(svgUrl);
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

function generateExportHTML(targetCanvas, zipRef, isImageExport = false) {
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
      const hasFade = ['slide-up', 'slide-down', 'slide-left', 'slide-right', 'pop-in', 'zoom-in'].includes(animType);
      const suffix = (hasFade && el.animFade === false) ? '-nofade' : '';
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
      const resolvedLH = el.lineHeight ? (String(el.lineHeight).includes('px') || String(el.lineHeight).includes('em') ? el.lineHeight : el.lineHeight + 'px') : '1.2';
      const innerSpan = el.hasBg
        ? `<span${bgDataAttrs} style="color:${el.color};font-size:${el.fontSize}px;font-weight:${el.weight};line-height:${resolvedLH};font-family:${ff};word-break:break-word;${bgStyle}">${content}</span>`
        : `<span style="display:inline;color:${el.color};font-size:${el.fontSize}px;font-weight:${el.weight};line-height:${resolvedLH};font-family:${ff};word-break:break-word;">${content}</span>`;
      // font-size + line-height on the wrapper div eliminates the inherited body strut
      // (browser default ~16px * normal) which would push small-font text downward.
      const inner = `<div style="text-align:${ta};width:100%;font-size:${el.fontSize}px;line-height:${resolvedLH};">${innerSpan}</div>`;
      return `    <div style="${wrapStyle}">${openDivs}<div style="display:flex;flex-direction:column;justify-content:${jc};width:100%;height:100%;">${inner}</div>${closeDivs}</div>`;
    }
    if (el.type === 'rect') {
      return `    <div style="${wrapStyle}">${openDivs}<div style="width:100%;height:100%;background:${el.color};border-radius:${el.radius || 0}px;opacity:${fillOpacity};"></div>${strokeOverlayHTML(el)}${closeDivs}</div>`;
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
      if (src === 'data/Elements/RMIT_white.svg') {
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
      return `    <div style="${wrapStyle}">${openDivs}<img src="${src}" style="width:100%;height:100%;object-fit:contain;" alt="" />${closeDivs}</div>`;
    }
    return '';
  };

  const elsBot = c.elements.filter(e => e.persistent === 'bottom').map(renderEl).join('\n');
  const elsTop = c.elements.filter(e => e.persistent === 'top').map(renderEl).join('\n');

  let framesHTML = '';
  const frameData = [];
  state.frames.forEach((f, i) => {
    const frameEls = c.elements.filter(e => e.persistent === false && e.frameId === f.id).map(renderEl).join('\n');
    framesHTML += `<div class="frame" id="frame-${f.id}" style="display:${i === 0 ? 'block' : 'none'};width:100%;height:100%;position:absolute;inset:0;">\n${frameEls}\n</div>\n`;
    frameData.push({ id: f.id, duration: f.duration || 2, transition: i === 0 ? 'none' : (f.transition || 'fade'), transitionDuration: f.transitionDuration || 0.5, transitionFade: f.transitionFade });
  });

  let clickAreasHTML = '';
  const clickBtns = c.elements.filter(e => e.type === 'button' && e.isClickArea);
  if (c.fullClickArea === false && clickBtns.length > 0) {
    clickAreasHTML = clickBtns.map(btn => `<a class="clickArea" href="javascript:void(0);" style="position:absolute;left:${btn.x}px;top:${btn.y}px;width:${btn.width}px;height:${btn.height}px;z-index:9999;display:block;"></a>`).join('\n    ');
  } else {
    clickAreasHTML = `<a class="clickArea" href="javascript:void(0);" style="position:absolute;inset:0;z-index:9999;display:block;"></a>`;
  }

  // Only include @font-face rules for fonts actually used in this canvas
  const usedFonts = new Set(c.elements.map(e => e.fontFamily).filter(Boolean));
  const fontFaceRules = [];
  if (usedFonts.has('Museo')) {
    fontFaceRules.push(`  @font-face { font-family: 'Museo'; src: url('data/fonts/Museo300-Regular.otf') format('opentype'); font-weight: 300; }`);
    fontFaceRules.push(`  @font-face { font-family: 'Museo'; src: url('data/fonts/Museo500-Regular.otf') format('opentype'); font-weight: 500; }`);
    fontFaceRules.push(`  @font-face { font-family: 'Museo'; src: url('data/fonts/Museo700-Regular.otf') format('opentype'); font-weight: 700; }`);
  }
  if (usedFonts.has('Helvetica Neue LT Pro')) {
    fontFaceRules.push(`  @font-face { font-family: 'Helvetica Neue LT Pro'; src: url('data/fonts/helveticaneueltpro_lt.otf') format('opentype'); font-weight: 300; }`);
    fontFaceRules.push(`  @font-face { font-family: 'Helvetica Neue LT Pro'; src: url('data/fonts/helveticaneueltpro_roman.otf') format('opentype'); font-weight: 400; }`);
    fontFaceRules.push(`  @font-face { font-family: 'Helvetica Neue LT Pro'; src: url('data/fonts/helveticaneueltpro.otf') format('opentype'); font-weight: 500; }`);
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
  @keyframes anim-swipe-up    { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes anim-swipe-down  { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes anim-swipe-left-fade  { from { clip-path: inset(0 0 0 100%); opacity: 0; } to { clip-path: inset(0 0 0 0); opacity: 1; } }
  @keyframes anim-swipe-right-fade { from { clip-path: inset(0 100% 0 0); opacity: 0; } to { clip-path: inset(0 0 0 0); opacity: 1; } }
  @keyframes anim-swipe-up-fade    { from { clip-path: inset(0 0 100% 0); opacity: 0; } to { clip-path: inset(0 0 0 0); opacity: 1; } }
  @keyframes anim-swipe-down-fade  { from { clip-path: inset(100% 0 0 0); opacity: 0; } to { clip-path: inset(0 0 0 0); opacity: 1; } }
  @keyframes eff-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
  @keyframes eff-float { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); } }
  @keyframes eff-flash { 0%, 50%, 100% { opacity: 1; } 25%, 75% { opacity: 0; } }
  @keyframes eff-wiggle { 0% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 50% { transform: rotate(0deg); } 75% { transform: rotate(5deg); } 100% { transform: rotate(0deg); } }
  @keyframes eff-spin { 100% { transform: rotate(360deg); } }
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
    <div id="layer-bot" style="position:absolute;inset:0;pointer-events:none;">
${elsBot}
    </div>
    <div id="layer-frames" style="position:absolute;inset:0;pointer-events:none;">
${framesHTML}
    </div>
    <div id="layer-top" style="position:absolute;inset:0;pointer-events:none;">
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
      var current = document.getElementById('frame-' + frames[currentFrame].id);
      current.style.display = 'none';
      current.style.animation = '';
      currentFrame = (currentFrame + 1) % frames.length;
      var next = document.getElementById('frame-' + frames[currentFrame].id);
      next.style.display = 'block';
      var t = frames[currentFrame].transition;
      var td = (frames[currentFrame].transitionDuration || 0.5) + 's';
      // transitionFade: optional boolean. Defaults: slide keeps its baked-in fade,
      // swipe stays pure (no fade) unless the user opts in. Fade transition ignores
      // the flag since it IS the fade.
      var fadeRaw = frames[currentFrame].transitionFade;
      var fade = (fadeRaw === undefined) ? (t && t.indexOf('slide-') === 0) : !!fadeRaw;
      var anim = '';
      if (t === 'fade') anim = 'anim-fade-in';
      else if (t && t.indexOf('slide-') === 0) anim = 'anim-frame-' + t + (fade ? '' : '-nofade');
      else if (t && t.indexOf('swipe-') === 0) anim = 'anim-' + t + (fade ? '-fade' : '');
      next.style.animation = anim ? (anim + ' ' + td + ' ease both') : '';
      
      if (!loopAd && currentFrame === frames.length - 1) {
        return;
      }
      setTimeout(nextFrame, frames[currentFrame].duration * 1000);
    }
    
    ${setupTextLineBgs.toString()}

    window.addEventListener('load', function () {
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
  animateViewTo(1, x, y);
});

document.getElementById('btn-toggle-safezones').addEventListener('click', (e) => {
  state.showSafezones = !state.showSafezones;
  e.currentTarget.classList.toggle('active', state.showSafezones);
  render();
});

document.getElementById('btn-ai-resize').addEventListener('click', () => {
  openModal('Auto-resize', '<div style="padding:18px 6px; font-size:13px; line-height:1.5;">Milo and Roy are working hard to implement this highly anticipated feature.</div>', false);
});

document.getElementById('btn-preview').addEventListener('click', () => {
  const c = getActiveCanvas(); if (!c) return;
  const area = document.getElementById('canvas-area');
  state.prePreviewScrollLeft = area.scrollLeft;
  state.prePreviewScrollTop = area.scrollTop;
  state.prePreviewZoom = state.zoom || 1;
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
async function saveProjectAsCook() {
  if (typeof JSZip === 'undefined') { alert('JSZip is not loaded.'); return; }

  const zip = new JSZip();
  const exportState = JSON.parse(JSON.stringify(state));
  exportState.editingElementId = null;
  const ca = document.getElementById('canvas-area');
  if (ca) {
    exportState.viewScrollLeft = ca.scrollLeft;
    exportState.viewScrollTop = ca.scrollTop;
  }

  const imgFolder = zip.folder('images');
  for (const [assetId, dataUrl] of Object.entries(exportState.assets || {})) {
    if (dataUrl.startsWith('data:')) {
      const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : (match[1] === 'svg+xml' ? 'svg' : match[1]);
        const b64Data = match[2];
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
    magic: 'adcooker',
    version: 1,
    savedAt,
    projectName: state.projectName || 'RMIT_Ad'
  }, null, 2));
  zip.file('project.json', JSON.stringify(exportState, null, 2));

  const content = await zip.generateAsync({ type: 'blob' });
  const projName = (state.projectName || 'RMIT_Ad').replace(/[^a-zA-Z0-9_-]/g, '_');
  const datePart = savedAt.slice(0, 10); // YYYY-MM-DD
  const suggestedName = `${projName}-${datePart}.cook`;

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        types: [{ description: 'Ad Cooker Project', accept: { 'application/octet-stream': ['.cook'] } }],
        suggestedName
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (e) { if (e.name !== 'AbortError') console.error('Save failed:', e); }
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

// Backwards-compat alias — keyboard shortcuts and a few other places still reference
// the original name.
const saveProjectToZip = saveProjectAsCook;

// Shared inflater used by the menu Open dialog AND the drag-drop overlay. Both
// formats — modern .cook and legacy .zip — share the same internal structure.
async function loadProjectFromBlob(file) {
  if (typeof JSZip === 'undefined') throw new Error('JSZip is not loaded.');
  const zip = await JSZip.loadAsync(file);
  const projFile = zip.file('project.json');
  if (!projFile) throw new Error('Invalid project file (missing project.json)');

  const jsonStr = await projFile.async('string');
  const loadedState = JSON.parse(jsonStr);
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
  history.length = 0;
  historyIndex = -1;
  pushHistory();
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
        types: [{ description: 'Ad Cooker Project', accept: { 'application/octet-stream': ['.cook', '.zip'] } }]
      });
      file = await handle.getFile();
    } catch (e) { if (e.name !== 'AbortError') console.error('Open failed:', e); return; }
  } else {
    file = await new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.cook,.zip';
      input.onchange = e => resolve(e.target.files[0]);
      input.click();
    });
    if (!file) return;
  }
  try {
    await loadProjectFromBlob(file);
  } catch (err) {
    console.error(err);
    alert('Failed to load project. Ensure it is a valid .cook file.');
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


function openExportModal() {
  const tbody = state.canvases.map((c) => {
    const html = generateExportHTML(c);
    const kb = (new Blob([html]).size / 1024).toFixed(1);
    const ct = state.clickTag || 'No clickTag';
    const projName = state.projectName || 'Ad';
    const fullName = `${projName}_${c.width}x${c.height}`;
    return `
      <tr data-cid="${c.id}">
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330;"><input type="checkbox" class="export-chk" data-cid="${c.id}" checked /></td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330;">${fullName}</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330;">${c.width}x${c.height}</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330; color:${kb > 150 ? '#ef4444' : '#c7ccdb'}">${kb} KB</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330; font-family:monospace; font-size:10px; color:var(--text-label); word-break:break-all; max-width:200px;">${ct}</td>
      </tr>
    `;
  }).join('');

  const bodyHTML = `
    <div style="margin-bottom: 16px; display: flex; gap: 8px;">
      <button class="btn primary" id="btn-export-selected">Export Selected (ZIP)</button>
    </div>
    <table style="width:100%; text-align:left; border-collapse:collapse; font-size:13px; color:var(--text-main);">
      <thead>
        <tr>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;width:30px;"><input type="checkbox" id="chk-all" checked /></th>
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

  modalBg.querySelector('#btn-export-selected').addEventListener('click', async () => {
    if (typeof JSZip === 'undefined') { alert('JSZip is not loaded.'); return; }

    const selectedIds = Array.from(chks).filter(c => c.checked).map(c => c.dataset.cid);
    if (selectedIds.length === 0) { alert('No ads selected.'); return; }

    const zip = new JSZip();
    for (const cid of selectedIds) {
      const c = state.canvases.find(x => x.id === cid);
      const adZip = new JSZip();
      const html = generateExportHTML(c, adZip);
      const projName = state.projectName || 'Ad';
      const safeName = projName.replace(/[^a-zA-Z0-9_-]/g, '_');

      adZip.file('index.html', html);
      const adContent = await adZip.generateAsync({ type: 'blob' });
      zip.file(`${safeName}_${c.width}x${c.height}.zip`, adContent);
    }

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
      
      // Pre-fetch for validation zip size
      for (const el of c.elements) {
        if (el.type === 'image' && el.assetId && el.assetId.startsWith('data/Elements/')) {
          try {
            const resp = await fetch(el.assetId);
            if (resp.ok) {
              const blob = await resp.blob();
              const filename = el.assetId.split('/').pop();
              zip.file(`assets/${filename}`, blob);
            }
          } catch (e) {}
        }
      }

      const htmlCode = generateExportHTML(c, zip);
      zip.file('index.html', htmlCode);
      const blob = await zip.generateAsync({ type: 'blob' });
      const kb = (blob.size / 1024).toFixed(1);

      if (blob.size > 153600) {
        errors.push(`Filesize (${kb} KB) exceeds 150KB limit`);
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
        
        <h2 style="color:#22d3ee; margin-top:0; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:16px;">1. Workspace & Canvases</h2>
        <p>Ad Cooker operates on an infinite panning workspace. You can create multiple "Canvases" (individual ad sizes) within a single project.</p>
        <ul style="padding-left:20px; color:var(--text-muted);">
          <li style="margin-bottom:6px;"><b>Adding Canvases:</b> Click the <b>+</b> button in the left panel to add common ad sizes (300x250, 728x90, etc.) or input custom dimensions.</li>
          <li style="margin-bottom:6px;"><b>Navigation:</b> Hold <span class="kbd">Space</span> and drag to pan around. Scroll your mouse wheel to zoom in and out. Press <span class="kbd">Tab</span> to toggle Fullscreen Mode.</li>
          <li style="margin-bottom:6px;"><b>Selection:</b> Click a canvas to make it active. The right-hand Properties Panel will then display settings specific to that canvas (like Background Color or Export options).</li>
        </ul>

        <h2 style="color:#22d3ee; margin-top:24px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:16px;">2. Elements & Properties</h2>
        <p>Right-click any active canvas to open the Context Menu and add elements. Once added, click an element to select it and view its options in the right-hand Properties Panel.</p>
        <ul style="padding-left:20px; color:var(--text-muted);">
          <li style="margin-bottom:6px;"><b>Text:</b> Double-click to edit inline. You can adjust Font Family (including embedded RMIT fonts like Museo and Helvetica Neue), Weight, Size, Line Height, Letter Spacing, and alignment.</li>
          <li style="margin-bottom:6px;"><b>Images & Shapes:</b> Add external SVG assets, rectangles, or circles. Images maintain their aspect ratio by default. Hold <span class="kbd">Shift</span> while resizing to force aspect ratio constraints.</li>
          <li style="margin-bottom:6px;"><b>Buttons:</b> Specialized text elements with built-in padding and background colors, ideal for Call-to-Actions (CTAs).</li>
          <li style="margin-bottom:6px;"><b>Color Picker:</b> Click any color swatch to open the native-feeling picker. It supports solid HEX values, a built-in Eyedropper tool, and dynamic linear gradients.</li>
          <li style="margin-bottom:6px;"><b>Brand Elements:</b> Pre-configured, high-quality SVGs (like RMIT logos) or standard legal text that automatically bundle into the final export without bloating your project file.</li>
        </ul>

        <h2 style="color:#22d3ee; margin-top:24px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:16px;">3. Layers & Grouping</h2>
        <p>Manage the stacking order of your ad through the Layers Panel on the left.</p>
        <ul style="padding-left:20px; color:var(--text-muted);">
          <li style="margin-bottom:6px;"><b>Reordering:</b> Drag and drop layers, or use <span class="kbd">Ctrl</span>+<span class="kbd">[</span> and <span class="kbd">Ctrl</span>+<span class="kbd">]</span> to push them backward or forward.</li>
          <li style="margin-bottom:6px;"><b>Grouping:</b> Select multiple elements by holding <span class="kbd">Shift</span> and clicking them, then press <span class="kbd">Ctrl</span>+<span class="kbd">G</span>. Groups can be animated as a single unit. Double-click a group to isolate it and edit its internal contents.</li>
          <li style="margin-bottom:6px;"><b>Persistence:</b> By default, elements only exist on the specific "Frame" they were created on. In the Layer panel, click the "Frame" badge to toggle it to <b>Top</b> or <b>Bottom</b>. Persistent elements will remain visible across <i>all</i> frames. Use this for your background color (Bottom) or your logo/CTA (Top).</li>
        </ul>

        <h2 style="color:#22d3ee; margin-top:24px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:16px;">4. Timeline & Animation</h2>
        <p>Ad Cooker uses a frame-based timeline approach rather than complex keyframing.</p>
        <ul style="padding-left:20px; color:var(--text-muted);">
          <li style="margin-bottom:6px;"><b>Frames:</b> Use the top bar controls to add/remove frames. Set the <b>Duration (s)</b> for how long each frame stays on screen.</li>
          <li style="margin-bottom:6px;"><b>Transitions:</b> Select a transition (e.g. Slide Up, Fade) for how the <i>entire frame</i> enters the screen.</li>
          <li style="margin-bottom:6px;"><b>Element Animations:</b> In the Properties Panel, apply <b>Entrance</b> animations (like Pop-in or Swipe Left) to individual elements to make them stagger in.</li>
          <li style="margin-bottom:6px;"><b>Continuous Effects:</b> Apply subtle, looping effects like Pan, Zoom, or Float. If you disable "Perform once", the pan/zoom will ping-pong back and forth indefinitely.</li>
          <li style="margin-bottom:6px;"><b>Looping:</b> Check the "Loop" box in the top bar to make the ad restart endlessly.</li>
        </ul>

        <h2 style="color:#22d3ee; margin-top:24px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:16px;">5. Alignment & Guides</h2>
        <p>Keep your designs pixel-perfect.</p>
        <ul style="padding-left:20px; color:var(--text-muted);">
          <li style="margin-bottom:6px;"><b>Snapping:</b> Right-click the dark workspace background to enable Snapping. Elements will magnetically snap to canvas edges, centers, and other elements.</li>
          <li style="margin-bottom:6px;"><b>Rulers & Guides:</b> Toggle Rulers from the workspace context menu. Hover over the ruler edges (top or left) and drag inward to pull out an alignment guide. Drag a guide back into the ruler to delete it.</li>
          <li style="margin-bottom:6px;"><b>Nudging:</b> Use the <span class="kbd">Arrow Keys</span> to nudge selected elements by 1px. Hold <span class="kbd">Shift</span> to nudge by 10px.</li>
        </ul>

        <h2 style="color:#22d3ee; margin-top:24px; border-bottom:1px solid #272c3a; padding-bottom:8px; font-size:16px;">6. Exporting & Google Ads</h2>
        <p>Ad Cooker generates Google Ads-compliant, pure HTML5/CSS/JS bundles.</p>
        <ul style="padding-left:20px; color:var(--text-muted);">
          <li style="margin-bottom:6px;"><b>ClickTags:</b> Define your global ClickTag URL in the left-side Project panel. You can also override it per-canvas.</li>
          <li style="margin-bottom:6px;"><b>Previewing:</b> Click the purple <b>Preview</b> button in a canvas's properties to see exactly how the HTML will render in a browser iframe.</li>
          <li style="margin-bottom:6px;"><b>Validation:</b> The left panel continuously validates your canvases. It will flag if your ClickTag is missing, if you have external/unsupported assets, or if the final zip exceeds the Google Ads 150KB limit.</li>
          <li style="margin-bottom:6px;"><b>Downloading:</b> Click <b>Download ZIP</b> to get the final ad package. The exporter automatically minifies the code, bundles external SVGs, and disables animations on persistent background layers to save file size.</li>

          <li style="margin-bottom:6px;"><b>PNG Fallbacks:</b> Click <b>Download PNG</b> to instantly generate a static snapshot of the current frame for use as a backup image.</li>
        </ul>
      </div>`;
  openModal('Ad Cooker Documentation', body, false);
});

document.getElementById('menu-about').addEventListener('click', () => {
  const body = `
      <div style="font-size:13px; line-height:1.6; color:var(--text-main); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <p>Hi, I’m Danh.</p>
        <p>After months of wrestling with Google Web Designer and Flashtalking, I came to a very professional conclusion: banner production should not be this painful.</p>
        <p>These tools somehow manage to be both massively overkill and still missing basic features I need daily. Weird workflows, clicktag chaos, timeline madness, random compatibility issues, and somehow every single ad feels like a fight against the software instead of actually designing.</p>
        <p>So eventually I hit the point where I thought:<br/>
        “Fuck it, I’ll just build my own.”</p>
        <p>This project is my attempt at creating the HTML5 ad tool I always wanted: fast, lightweight, visual, export-friendly, Google Ads compatible, and without the feeling that the software is actively fighting me.</p>
        <p>Also, my teammate Eden, who has suffered through years of banner production alongside me, may finally have his curse lifted.</p>
        <p style="font-style:italic; margin-top:20px; color:var(--text-label);">Built by a designer trying to free creative teams from cursed display ad workflows.</p>
        <div style="margin-top:24px; padding-top:16px; border-top:1px solid #1f2330; text-align:center;">
          <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" style="display:inline-block; padding:8px 16px; background:#f59e0b; color:var(--bg-input); text-decoration:none; border-radius:4px; font-weight:600; font-size:13px; transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">☕ Buy me a coffee</a>
        </div>
      </div>`;
  openModal('About RMIT Ad Cooker', body, false);
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
  { id: 'hc', label: 'High Contrast' },
  { id: 'pride', label: '🏳️‍🌈 Pride' },
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
            <h2>Settings</h2>
            <button class="btn" id="settings-close">Close</button>
          </div>
          <div class="modal-body" style="display:flex; flex-direction:column; gap:16px; padding:18px 22px;">
            <section>
              <h3 style="margin:0 0 6px; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600;">View</h3>
              ${row('set-rulers', 'Show rulers & guides', state.showRulers !== false)}
              ${row('set-crop', 'Crop to Canvas', !!state.cropToCanvas, 'Hide anything placed outside the canvas bounds while you work.')}
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
  bg.addEventListener('click', (e) => { if (e.target === bg) closeFn(); });

  const bind = (id, key) => bg.querySelector('#' + id).addEventListener('change', (e) => {
    state[key] = e.target.checked;
    render();
  });
  bind('set-rulers', 'showRulers');
  bind('set-crop', 'cropToCanvas');
  bind('set-snap', 'snapEnabled');
  bind('set-snap-el', 'snapToElements');
  bind('set-snap-cv', 'snapToCanvas');
  bind('set-snap-gd', 'snapToGuides');

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
        <button class="btn" id="modal-close">Close</button>
      </div>
      <div class="modal-body">
        ${isCode ? `<textarea id="modal-text" spellcheck="false"></textarea>` : `<div>${body}</div>`}
      </div>
      <div class="modal-foot">
        ${isCode ? `<button class="btn" id="modal-copy">Copy</button>
                    <button class="btn primary" id="modal-download">Download .html</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(bg);
  if (isCode) document.getElementById('modal-text').value = body;
  const closeFn = () => {
    bg.remove();
    document.removeEventListener('keydown', escHandler);
  };
  const escHandler = (e) => { if (e.key === 'Escape') closeFn(); };
  document.addEventListener('keydown', escHandler);
  document.getElementById('modal-close').onclick = closeFn;
  bg.onclick = (e) => { if (e.target === bg) closeFn(); };
  if (isCode) {
    document.getElementById('modal-copy').onclick = () => {
      navigator.clipboard.writeText(body);
      document.getElementById('modal-copy').textContent = 'Copied!';
      setTimeout(() => { const b = document.getElementById('modal-copy'); if (b) b.textContent = 'Copy'; }, 1200);
    };
    document.getElementById('modal-download').onclick = () => {
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
    const svgWrap = (svg, text) => `<div style="display:flex; align-items:center; gap:8px;">${svg}${text}</div>`;
    const brandSvg = `<svg viewBox="0 0 578.52 556.76" fill="currentColor" style="width:14px;height:14px;"><path d="M290.78,0h-74.15v60.23h-123.75v125.78H0v184.74h92.88v125.78h123.5v60.23h65.55c152.85,0,287.74-123.5,287.74-277.62S444.14,0,290.78,0"/></svg>`;
    const textSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V5h16v2M9 19h6M12 5v14" /></svg>`;
    const imageSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L11 18" /></svg>`;
    const rectSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>`;
    const circleSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8" /></svg>`;
    const btnSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="8" rx="4" /></svg>`;
    const bgSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="4" /><line x1="2" y1="12" x2="22" y2="12" stroke-dasharray="2 2" /></svg>`;

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

  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = () => { fn(); menu.style.display = 'none'; }; };

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
  bind('ctx-add-btn', () => addElement('button'));
  bind('ctx-add-bg', () => addElement('background'));

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
  const menu = document.getElementById('ctx-menu');
  if (menu && menu.style.display === 'flex' && !menu.contains(e.target)) {
    menu.style.display = 'none';
  }
}, true);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const menu = document.getElementById('ctx-menu');
    if (menu && menu.style.display === 'flex') {
      menu.style.display = 'none';
    }
  }
});

window.addEventListener('beforeunload', (e) => {
  if (historyIndex > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
});

render();
queueSizeUpdate();
setTimeout(() => {
  const canvasArea = document.getElementById('canvas-area');
  if (canvasArea.scrollTo) {
    canvasArea.scrollTo({ left: 2000, top: 2000, behavior: 'instant' });
  }
}, 10);


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
