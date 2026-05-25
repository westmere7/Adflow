// ============================================================================
// color-picker.js — Custom Color Picker (iro.js wrapper)
// ============================================================================
// Wraps iro.js into a popover anchored beneath any swatch in the app. Adds:
//   - Solid + gradient modes (gradient stops, opacity, angle)
//   - Hex / RGB / opacity inputs in sync with the iro wheel
//   - Recent-colors palette + project palette
//   - Two-way sync with the current selection (canvas bg or element color)
//
// Public surface:
//   openColorPicker(button, key, initialValue) — anchor + open
//   closeColorPicker()                         — close + cleanup
//   syncColorPickerWithSelection(el, canvas)   — re-render swatches when
//                                                 selection changes
//   initColorPicker()                          — lazy-init on first open
//
// Loaded BEFORE script.js. Top-level state (iroPicker, currentCpKey,
// cpIsGradient, cpGradStops, cpActiveStop) lives at module top. Functions
// reference script.js globals (state, hexToRgba, render, pushHistory,
// getActiveCanvas, etc.) only at call-time — by the time the user clicks
// a swatch, script.js has fully loaded.
// ============================================================================

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
