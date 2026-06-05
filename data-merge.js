// ============================================================================
// data-merge.js — Live Data / Versioning (spreadsheet → ads)
// ============================================================================
// Bind named element "slots" to spreadsheet columns so one template produces a
// finished ad set per row. A slot maps to a link group when the element is
// grouped (so one binding fans across all sizes), else to the single element.
// Substitution is non-destructive: elements always hold their template default;
// the active version is overlaid at render and baked transiently at export.
//
// Loaded BEFORE script.js. All dm* functions, the data panel UI (openDataPanel,
// dmRenderPanel, dmWirePanel), CSV in/out (dmParseCSV, dmImportCSV, dmExportCSV,
// dmToCSV), version switching (dmSetActiveVersion, cycleVersion,
// renderVersionSwitcher, renderPreviewVersionBar), and export helpers
// (dmBakeRow, dmRunExport, dmActiveRowForOutput, dmExportAllVersions) live here.
//
// References to script.js globals (state, render, pushHistory,
// showCanvasNotification, getElementCategory, baseLayerLabel, applyLinkSync,
// queueSizeUpdate, scheduleAutosave, etc.) are call-time only — by the time
// any dm function executes (render, user click, export), script.js has loaded.
// Many script.js call sites already guard with `typeof dm* === "function"`
// for forward-compat anyway.
// ============================================================================

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
function dmResolveImage(val, bypassRedirect = false) {
  if (!val) return null;

  let resolvedId = null;

  if (state.assets && state.assets[val]) {
    resolvedId = val;
  }

  if (!resolvedId && state.assetNames) {
    const lc = String(val).toLowerCase();
    for (const [aid, name] of Object.entries(state.assetNames)) {
      if (name === val || String(name).toLowerCase() === lc) {
        resolvedId = aid;
        break;
      }
    }
  }

  if (!resolvedId && state.assetLibrary) {
    const want = String(val).replace(/\.[a-z0-9]+$/i, '').trim().toLowerCase();
    for (const asset of state.assetLibrary) {
      const an = String(asset.name || '').replace(/\.[a-z0-9]+$/i, '').trim().toLowerCase();
      if (an && an === want) {
        const imgEl = (asset.elements || []).find(e => e.type === 'image' && e.assetId);
        if (imgEl) {
          resolvedId = imgEl.assetId;
          break;
        }
      }
    }
  }

  const originalId = resolvedId || val;

  if (!bypassRedirect && originalId && state.compressedAssetsMap && state.compressedAssetsMap[originalId]) {
    const compressedId = state.compressedAssetsMap[originalId];
    if (state.assets && state.assets[compressedId]) {
      return compressedId;
    }
  }

  return originalId;
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

function dmOverridesForRow(el, rowIdx, bypassRedirect = false) {
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
    if (field === 'image') out.assetId = dmResolveImage(val, bypassRedirect);
    else out[field] = val;
  }
  return out;
}

function dmDisplay(el, bypassRedirect = false) {
  const dm = state.dataMerge;
  if (!dm || !dm.enabled || dm.activeVersion == null) return {};
  return dmOverridesForRow(el, dm.activeVersion, bypassRedirect);
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
  const skipHeaders = !!document.getElementById('dm-skip-headers')?.checked;
  const matrix = dmParseCSV(text);
  if (!matrix.length) { alert('No rows found in the file.'); return false; }

  let headers;
  let rows;
  if (skipHeaders) {
    const maxCols = Math.max(...matrix.map(r => r.length));
    headers = [];
    for (let c = 1; c <= maxCols; c++) {
      headers.push('Column ' + c);
    }
    rows = matrix.map(r => {
      const o = { _selected: true };
      headers.forEach((h, idx) => {
        o[h] = r[idx] != null ? r[idx] : '';
      });
      return o;
    });
  } else {
    headers = matrix[0].map(h => h.trim()).filter(h => h !== '');
    if (!headers.length) { alert('No column headers found in the first row.'); return false; }
    rows = matrix.slice(1).map(r => {
      const o = { _selected: true };
      headers.forEach((h, idx) => {
        o[h] = r[idx] != null ? r[idx] : '';
      });
      return o;
    });
  }

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

function dmRenderCustomSelect(container, options, activeVal, onSelect) {
  if (!container) return;
  const currentOpt = options.find(o => o.val === activeVal) || options[0] || { label: '— none —', val: '' };
  
  container.innerHTML = `
    <button class="custom-select-trigger" style="width: 100%; display: flex; justify-content: space-between; align-items: center; background: var(--bg-input); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 4px; padding: 4px 6px; font-size: 11px; height: 24px; text-align: left; cursor: pointer; outline: none;">
      <span class="custom-select-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; padding-right: 4px;">${dmEsc(currentOpt.label)}</span>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="opacity: 0.7; pointer-events: none; flex-shrink: 0;"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>
    <div class="custom-select-dropdown" style="display: none; position: absolute; top: 26px; left: 0; right: 0; background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 4px; z-index: 10000; box-shadow: 0 8px 24px var(--shadow-medium); max-height: 440px; overflow-y: auto; padding: 4px 0;">
      ${options.map(opt => `
        <div class="custom-select-item" data-value="${opt.val}" style="padding: 5px 8px; font-size: 11px; color: var(--text-main); cursor: pointer; transition: background 0.1s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${dmEsc(opt.label)}">
          ${dmEsc(opt.label)}
        </div>
      `).join('')}
    </div>
  `;

  const trigger = container.querySelector('.custom-select-trigger');
  const dropdown = container.querySelector('.custom-select-dropdown');

  trigger.onclick = (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display === 'block';
    document.querySelectorAll('.custom-select-dropdown').forEach(d => {
      if (d !== dropdown) d.style.display = 'none';
    });
    dropdown.style.display = isOpen ? 'none' : 'block';
  };

  dropdown.querySelectorAll('.custom-select-item').forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      const val = item.dataset.value;
      onSelect(val);
    };
  });
}

function renderVersionSwitcher() {
  const wrap = document.getElementById('version-switcher');
  const container = document.getElementById('version-select-container');
  if (!wrap || !container) return;
  const dm = state.dataMerge;
  if (!dm || !dm.enabled || !dm.rows.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  const keyCol = (dm.keyColumn && dm.columns.includes(dm.keyColumn)) ? dm.keyColumn : dm.columns[0];
  const options = [{ label: 'No version', val: '' }].concat(
    dm.rows.map((r, i) => {
      const name = r[keyCol] || ('Row ' + (i + 1));
      return { label: `${i + 1}. ${name}`, val: String(i) };
    })
  );
  const activeVal = dm.activeVersion == null ? '' : String(dm.activeVersion);
  dmRenderCustomSelect(container, options, activeVal, (val) => dmSetActiveVersion(val));

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
      '<div id="preview-version-select-container" style="position:relative; width:200px; z-index:1000001;"></div>';
    document.body.appendChild(bar);
  }
  bar.style.display = 'flex';
  const container = bar.querySelector('#preview-version-select-container');
  const keyCol = (dm.keyColumn && dm.columns.includes(dm.keyColumn)) ? dm.keyColumn : dm.columns[0];
  const options = [{ label: 'No version', val: '' }].concat(
    dm.rows.map((r, i) => {
      const name = r[keyCol] || ('Row ' + (i + 1));
      return { label: `${i + 1}. ${name}`, val: String(i) };
    })
  );
  const activeVal = dm.activeVersion == null ? '' : String(dm.activeVersion);
  dmRenderCustomSelect(container, options, activeVal, (val) => dmSetActiveVersion(val));
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

async function dmExportAllVersions(selectedCanvases, filenamePrefix) {
  if (typeof dmExportAllVersionsStreaming === 'function') {
    return await dmExportAllVersionsStreaming(selectedCanvases, filenamePrefix);
  }
  alert('Export pipeline is not loaded.');
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
function dmRenameColumn(oldName, newName) {
  newName = (newName || '').trim();
  const dm = state.dataMerge;
  if (!newName || newName === oldName) return false;
  if (!dm.columns.includes(oldName)) return false;
  if (dm.columns.includes(newName)) { alert('A column named "' + newName + '" already exists.'); return false; }
  const idx = dm.columns.indexOf(oldName);
  dm.columns[idx] = newName;
  dm.rows.forEach(r => { if (r[oldName] !== undefined) { r[newName] = r[oldName]; delete r[oldName]; } });
  Object.keys(dm.mappings).forEach(k => { if (dm.mappings[k] === oldName) dm.mappings[k] = newName; });
  if (dm.keyColumn === oldName) dm.keyColumn = newName;
  return true;
}
function dmReorderColumns(fromIdx, toIdx) {
  const dm = state.dataMerge;
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= dm.columns.length || toIdx > dm.columns.length) return;
  const [moved] = dm.columns.splice(fromIdx, 1);
  // Adjust toIdx if we removed from earlier in the array.
  const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
  dm.columns.splice(insertAt, 0, moved);
}
function dmReorderRows(fromIdx, toIdx) {
  const dm = state.dataMerge;
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= dm.rows.length || toIdx > dm.rows.length) return;
  const activeRowRef = (dm.activeVersion != null) ? dm.rows[dm.activeVersion] : null;
  const [moved] = dm.rows.splice(fromIdx, 1);
  const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
  dm.rows.splice(insertAt, 0, moved);
  if (activeRowRef) dm.activeVersion = dm.rows.indexOf(activeRowRef);
}
function dmSortByColumn(column, direction) {
  const dm = state.dataMerge;
  if (!dm.columns.includes(column)) return;
  const activeRowRef = (dm.activeVersion != null) ? dm.rows[dm.activeVersion] : null;
  const dir = direction === 'desc' ? -1 : 1;
  // Stable sort: compare numerically if both values parse as numbers, else string-locale-aware.
  dm.rows.sort((a, b) => {
    const av = a[column] == null ? '' : String(a[column]);
    const bv = b[column] == null ? '' : String(b[column]);
    const an = parseFloat(av), bn = parseFloat(bv);
    if (!Number.isNaN(an) && !Number.isNaN(bn) && /^-?\d+(\.\d+)?$/.test(av.trim()) && /^-?\d+(\.\d+)?$/.test(bv.trim())) {
      return (an - bn) * dir;
    }
    return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' }) * dir;
  });
  if (activeRowRef) dm.activeVersion = dm.rows.indexOf(activeRowRef);
}
function dmAddRow() {
  const dm = state.dataMerge;
  const o = { _selected: true }; dm.columns.forEach(c => o[c] = '');
  dm.rows.push(o);
  dm.enabled = true;
}
function dmDeleteRow(i) {
  const dm = state.dataMerge;
  dm.rows.splice(i, 1);
  if (dm.activeVersion === i) dm.activeVersion = null;
  else if (dm.activeVersion != null && dm.activeVersion > i) dm.activeVersion--;
}
function dmDeleteSelectedRows() {
  const dm = state.dataMerge;
  const activeRowRef = (dm.activeVersion != null) ? dm.rows[dm.activeVersion] : null;
  dm.rows = dm.rows.filter(r => r._selected === false);
  if (activeRowRef) {
    const idx = dm.rows.indexOf(activeRowRef);
    dm.activeVersion = idx > -1 ? idx : null;
  } else {
    dm.activeVersion = null;
  }
}

// ---- Data panel modal ----
// Per-panel transient state — sort direction, etc. Lives on bg.
function _dmState(bg) {
  if (!bg._dmState) bg._dmState = { sortCol: null, sortDir: null };
  return bg._dmState;
}

function openDataPanel() {
  // Snapshot the current state.dataMerge so Cancel can roll back to
  // exactly the pre-modal state, including any per-cell edits that
  // happened while the modal was open (cell input handlers still
  // commit live to state.dataMerge — Cancel just replays the snapshot
  // over that). JSON-round-trip is sufficient because dataMerge is a
  // plain shape of strings / arrays / objects.
  const snapshot = state.dataMerge ? JSON.parse(JSON.stringify(state.dataMerge)) : null;

  openModal('Data &amp; Versions', '<div id="dm-panel"></div>', false);
  const bg = document.body.lastElementChild;
  // Widen the modal so the sheet has real room.
  const modal = bg.querySelector('.modal');
  if (modal) {
    modal.style.width = '1450px';
    modal.style.maxWidth = '96vw';
  }

  const head = bg.querySelector('.modal-head');
  const closeBtn = bg.querySelector('#modal-close');

  // Relabel the generic close button as Save. The data panel commits
  // each edit live (cell handlers call pushHistory + render), so Save
  // is effectively "close and keep everything you just did". Promote
  // it to the `primary` style so it reads as the affirmative action.
  if (closeBtn) {
    closeBtn.textContent = 'Save';
    closeBtn.title = 'Save and close';
    closeBtn.classList.add('primary');
  }

  // Add a Cancel button alongside Save. Cancel restores the snapshot
  // taken when the modal opened, discarding any cell edits / column
  // changes / mapping changes / row reorders that happened while the
  // modal was open, then fires the modal's normal close path. The
  // intermediate per-edit history entries still exist, but a single
  // pushHistory() after restore makes the discard itself a discrete
  // undoable step — so Cmd-Z right after Cancel undoes the discard.
  // ESC / outside-click are intentionally NOT cancel: those keep
  // changes (same path as Save). Cancel must be an explicit click so
  // it can't fire by accident.
  // Escape key capture handler to cancel instead of save
  const localEscHandler = (e) => {
    if (e.key === 'Escape') {
      const allBgs = document.querySelectorAll('.modal-bg');
      if (allBgs.length > 0 && allBgs[allBgs.length - 1] === bg) {
        e.stopImmediatePropagation();
        const cancelBtn = head?.querySelector('#dm-cancel');
        if (cancelBtn) cancelBtn.click();
        else bg.remove();
      }
    }
  };
  document.addEventListener('keydown', localEscHandler, true);

  // Clean up escape listener on save close
  closeBtn.addEventListener('click', () => {
    document.removeEventListener('keydown', localEscHandler, true);
  });

  // Override background click to run cancel instead of save
  bg.onclick = (e) => {
    if (e.target === bg) {
      const cancelBtn = head?.querySelector('#dm-cancel');
      if (cancelBtn) cancelBtn.click();
      else bg.remove();
    }
  };

  if (head && closeBtn && !head.querySelector('#dm-cancel')) {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.id = 'dm-cancel';
    cancelBtn.title = 'Discard changes made in this session and close';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.marginRight = '6px';
    head.insertBefore(cancelBtn, closeBtn);
    cancelBtn.onclick = () => {
      if (snapshot) {
        state.dataMerge = snapshot;
      } else {
        state.dataMerge = null;
      }
      renderVersionSwitcher();
      pushHistory();
      render();
      document.removeEventListener('keydown', localEscHandler, true);
      closeBtn.click();
    };
  }

  dmRenderPanel(bg);
}

function dmRenderPanel(bg) {
  const panel = bg.querySelector('#dm-panel');
  if (!panel) return;
  const dm = state.dataMerge;
  const dms = _dmState(bg);
  const slots = dmDiscoverSlots();
  const selStyle = 'background:var(--bg-input);border:1px solid var(--border-light);color:var(--text-main);border-radius:4px;padding:5px 7px;font-size:11px;outline:none;font-family:inherit;width:100%;';
  const colOptions = (sel) => ['<option value="">— none —</option>'].concat(dm.columns.map(c => `<option value="${dmEsc(c)}" ${c === sel ? 'selected' : ''}>${dmEsc(c)}</option>`)).join('');

  // --- LEFT: controls + mapping ---
  let mapRows = '';
  slots.forEach(s => s.fields.forEach(field => {
    const key = s.slotKey + '::' + field;
    const linkIcon = s.grouped ? `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-left:4px; color:var(--text-accent);"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>` : '';
    mapRows += `
      <div style="display:flex; flex-direction:column; gap:4px;">
        <div style="font-size:11px; color:var(--text-main);"><b>${dmEsc(s.name)}</b>${linkIcon} <span style="color:var(--text-muted); font-weight:400;">· ${DM_FIELD_LABEL[field] || field}${s.grouped ? ` · ${s.count} sizes` : ''}</span></div>
        <div class="dm-map-container" data-mapkey="${key}" style="position:relative;"></div>
      </div>`;
  }));
  mapRows += `
    <div style="display:flex; flex-direction:column; gap:4px;">
      <div style="font-size:11px; color:var(--text-main);"><b>ClickTag</b> <span style="color:var(--text-muted); font-weight:400;">· exit URL</span></div>
      <div class="dm-map-container" data-mapkey="clicktag::url" style="position:relative;"></div>
    </div>`;

  const slotHint = slots.length
    ? ''
    : `<div style="font-size:11px;color:var(--text-muted);line-height:1.5; padding:8px 10px; background:var(--bg-input); border-radius:5px;">No dynamic slots yet. Select an element on the canvas and tick fields under <b>Dynamic Data</b> in the Properties panel to make them vary per version.</div>`;

  // --- RIGHT: sheet ---
  const sortIconFor = (c) => {
    if (dms.sortCol !== c) return '<span style="color:var(--text-muted); opacity:.5;">↕</span>';
    return dms.sortDir === 'asc'
      ? '<span style="color:var(--text-accent);">↑</span>'
      : '<span style="color:var(--text-accent);">↓</span>';
  };
  const colHeaderHtml = dm.columns.map((c, ci) => `
    <th data-col-idx="${ci}" data-col="${dmEsc(c)}" draggable="true" class="dm-col-th${c === dm.keyColumn ? ' dm-key-col' : ''}" style="padding:6px 8px;border-bottom:1px solid var(--border-light); border-right:1px solid var(--border-light); color:var(--text-label); font-weight:600; text-align:left; white-space:nowrap; cursor:grab; user-select:none; min-width:140px;">
      <div style="display:flex; align-items:center; gap:6px;">
        <span class="dm-col-name" data-col="${dmEsc(c)}" contenteditable="false" title="Double-click to rename" style="cursor:text; outline:none; padding:1px 2px; border-radius:3px; flex:1; overflow:hidden; text-overflow:ellipsis;">${dmEsc(c)}</span>
        <button class="dm-key-toggle" data-col="${dmEsc(c)}" title="Toggle Version name (used for exported folder names)" style="background:none; border:none; padding:0 2px; cursor:pointer; font-size:13px; line-height:1; color:${c === dm.keyColumn ? 'var(--text-accent)' : 'var(--text-muted)'};">★</button>
        <button class="dm-sort" data-col="${dmEsc(c)}" title="Sort by this column" style="background:none; border:none; padding:0 2px; cursor:pointer; font-size:12px; line-height:1;">${sortIconFor(c)}</button>
        <button class="dm-delcol" data-col="${dmEsc(c)}" title="Delete column" style="background:none; border:none; padding:0 2px; cursor:pointer; font-size:13px; line-height:1; color:var(--text-muted);">×</button>
      </div>
    </th>`).join('');

  const allChecked = dm.rows.length > 0 && dm.rows.every(r => r._selected !== false);
  const selectedCount = dm.rows.filter(r => r._selected !== false).length;
  const totalCount = dm.rows.length;
  const btnLabel = selectedCount === totalCount
    ? `Export All Versions (${totalCount})`
    : `Export Selected Versions (${selectedCount})`;
  const btnDisabled = selectedCount === 0 ? 'disabled' : '';

  const rowsHtml = dm.rows.map((r, i) => {
    const active = dm.activeVersion === i;
    return `<tr data-row="${i}" class="dm-row" style="${active ? 'background:rgba(124,92,255,.10);' : ''}">
      <td class="dm-row-handle" data-row="${i}" draggable="true" title="Drag to reorder" style="padding:3px 4px; border-bottom:1px solid var(--border-light); border-right:1px solid var(--border-light); cursor:grab; text-align:center; color:var(--text-muted); width:22px; user-select:none; font-size:11px;">⋮⋮</td>
      <td style="padding:3px 4px; border-bottom:1px solid var(--border-light); border-right:1px solid var(--border-light); width:28px; text-align:center;"><input type="checkbox" class="dm-row-select" data-row="${i}" ${r._selected !== false ? 'checked' : ''} style="margin:0; cursor:pointer;" title="Include this version in export"/></td>
      <td style="padding:3px 4px; border-bottom:1px solid var(--border-light); border-right:1px solid var(--border-light); width:28px; text-align:center;"><button class="dm-viewrow" data-row="${i}" title="Preview this version on the canvas" style="background:none; border:none; color:${active ? 'var(--text-accent)' : 'var(--text-muted)'}; cursor:pointer; font-size:14px; padding:0;">${active ? '●' : '○'}</button></td>
      <td style="padding:3px 4px; border-bottom:1px solid var(--border-light); border-right:1px solid var(--border-light); width:32px; text-align:center; color:var(--text-muted); font-size:10px; font-variant-numeric:tabular-nums;">${i + 1}</td>` +
      dm.columns.map(c => `<td class="dm-col-td ${c === dm.keyColumn ? 'dm-key-col' : ''}" data-col="${dmEsc(c)}" style="padding:0; border-bottom:1px solid var(--border-light); border-right:1px solid var(--border-light); min-width:140px;"><input class="dm-cell" readonly data-row="${i}" data-col="${dmEsc(c)}" value="${dmEsc(r[c] || '')}" style="width:100%; background:transparent; border:1px solid transparent; color:var(--text-main); padding:5px 7px; font-size:11px; outline:none; font-family:inherit; cursor:default; border-radius:3px; text-overflow:ellipsis;"/></td>`).join('') +
      `<td style="padding:3px 4px; border-bottom:1px solid var(--border-light); width:28px; text-align:center;"><button class="dm-delrow" data-row="${i}" title="Delete row" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:13px; padding:0;">×</button></td>
    </tr>`;
  }).join('');

  const sheetTable = dm.columns.length
    ? `<div style="overflow:auto; max-height:100%; min-height:0; flex:0 1 auto; border:1px solid var(--border-light); border-radius:6px; background:var(--bg-panel);">
         <table style="border-collapse:collapse; width:100%; font-size:11px; color:var(--text-main);">
           <thead>
             <tr>
               <th style="width:22px; padding:6px 4px; border-bottom:1px solid var(--border-light); border-right:1px solid var(--border-light); background:var(--bg-panel);"></th>
               <th style="width:28px; padding:6px 4px; border-bottom:1px solid var(--border-light); border-right:1px solid var(--border-light); background:var(--bg-panel); text-align:center;"><input type="checkbox" id="dm-select-all" ${allChecked ? 'checked' : ''} style="margin:0; cursor:pointer;" title="Select/deselect all versions"/></th>
               <th style="width:28px; padding:6px 4px; border-bottom:1px solid var(--border-light); border-right:1px solid var(--border-light); background:var(--bg-panel);"></th>
               <th style="width:32px; padding:6px 4px; border-bottom:1px solid var(--border-light); border-right:1px solid var(--border-light); background:var(--bg-panel); color:var(--text-muted); font-size:10px; font-weight:600;">#</th>
               ${colHeaderHtml}
               <th style="width:28px; padding:6px 4px; border-bottom:1px solid var(--border-light); background:var(--bg-panel);"></th>
             </tr>
           </thead>
           <tbody>${rowsHtml}</tbody>
         </table>
       </div>`
    : `<div style="flex:1; min-height:200px; display:flex; align-items:center; justify-content:center; border:1px dashed var(--border-light); border-radius:6px; color:var(--text-muted); font-size:12px;">No data yet — import a CSV or add a column to begin.</div>`;

  panel.innerHTML = `
    <div style="display:flex; gap:16px; height:calc(86vh - 110px); min-height:420px;">

      <!-- LEFT: controls -->
      <div style="width:280px; flex-shrink:0; display:flex; flex-direction:column; gap:14px; overflow-y:auto; padding-right:4px;">
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn" id="dm-import" style="flex:1;">Import CSV…</button>
          <button class="btn" id="dm-export" ${dm.columns.length ? '' : 'disabled'} style="flex:1;">Export CSV</button>
        </div>
        <div style="display:flex; gap:8px;">
          <label class="checkbox-row" style="flex:1; display:flex; align-items:center; gap:7px; font-size:11px; padding:7px 10px; background:var(--bg-input); border-radius:5px; cursor:pointer;" title="If checked, CSV has no header row. Column names will be generated automatically.">
            <input type="checkbox" id="dm-skip-headers" ${dm.skipHeaders ? 'checked' : ''} style="margin:0;"/>
            Skip header
          </label>
          <label class="checkbox-row" style="flex:1; display:flex; align-items:center; gap:7px; font-size:11px; padding:7px 10px; background:var(--bg-input); border-radius:5px; cursor:pointer;">
            <input type="checkbox" id="dm-enabled" ${dm.enabled ? 'checked' : ''} style="margin:0;"/>
            Enable merge
          </label>
        </div>

        <button class="btn primary" id="dm-export-versions" ${btnDisabled} style="padding:8px; width:100%;">${btnLabel}</button>

        <div>
          <h3 style="font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin:0 0 8px; font-weight:600;">Column → Slot Mapping</h3>
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${slotHint}
            ${mapRows}
          </div>
        </div>
      </div>

      <!-- RIGHT: sheet -->
      <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; border-bottom:1px solid var(--border-light); padding-bottom:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <h3 style="font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin:0; font-weight:600;">
              Versions <span style="color:var(--text-main);">·</span> ${dm.rows.length} row${dm.rows.length === 1 ? '' : 's'}
            </h3>
            <div style="display:flex; align-items:center; gap:6px; margin-left:12px;">
              <button class="btn" id="dm-table-addcol" style="font-size:10.5px; padding:3px 8px; height:24px;">+ Add Column</button>
              <button class="btn" id="dm-table-addrow" ${dm.columns.length ? '' : 'disabled'} style="font-size:10.5px; padding:3px 8px; height:24px;">+ Add Row</button>
              <button class="btn" id="dm-table-delselected" ${dm.rows.some(r => r._selected !== false) ? '' : 'disabled'} style="font-size:10.5px; padding:3px 8px; height:24px; background:rgba(239, 68, 68, 0.05); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.25);">Delete Selected Rows</button>
            </div>
          </div>
          <div style="font-size:10px; color:var(--text-muted);">
            ● active preview · ★ version name · drag ⋮⋮ to reorder · double-click header/cell to edit
          </div>
        </div>
        ${sheetTable}
        <div style="font-size:10px; color:var(--text-muted); line-height:1.5;">
          Image columns should hold an asset filename already used in this project (or a full URL). Editing a dynamic slot on the canvas while a version is active writes back to that row${dm.locked ? ' — currently <b style="color:var(--text-accent);">locked</b> (read-only)' : ''}.
        </div>
      </div>
    </div>`;

  dmWirePanel(bg);
}

function dmWirePanel(bg) {
  const reRender = () => { renderVersionSwitcher(); render(); dmRenderPanel(bg); };
  const q = (sel) => bg.querySelector(sel);
  const all = (sel) => bg.querySelectorAll(sel);
  const dms = _dmState(bg);

  if (q('#dm-import')) q('#dm-import').onclick = () => dmImportFile(() => reRender());
  if (q('#dm-skip-headers')) {
    q('#dm-skip-headers').onchange = (e) => {
      state.dataMerge.skipHeaders = e.target.checked;
      pushHistory();
    };
  }
  if (q('#dm-export')) q('#dm-export').onclick = () => dmExportCSV();
  if (q('#dm-table-addcol')) q('#dm-table-addcol').onclick = () => { const n = prompt('New column name:'); if (n) { dmAddColumn(n); pushHistory(); reRender(); } };
  if (q('#dm-table-addrow')) q('#dm-table-addrow').onclick = () => { dmAddRow(); pushHistory(); reRender(); };
  if (q('#dm-table-delselected')) {
    q('#dm-table-delselected').onclick = () => {
      const selectedCount = state.dataMerge.rows.filter(r => r._selected !== false).length;
      if (selectedCount === 0) return;
      if (confirm(`Delete ${selectedCount} selected row(s)?`)) {
        dmDeleteSelectedRows();
        pushHistory();
        reRender();
      }
    };
  }
  if (q('#dm-export-versions')) q('#dm-export-versions').onclick = () => dmExportAllVersions();
  if (q('#dm-enabled')) q('#dm-enabled').onchange = (e) => { state.dataMerge.enabled = e.target.checked; pushHistory(); reRender(); };

  if (q('#dm-select-all')) {
    q('#dm-select-all').onchange = (e) => {
      state.dataMerge.rows.forEach(r => r._selected = e.target.checked);
      pushHistory();
      reRender();
    };
  }

  all('.dm-row-select').forEach(cb => {
    cb.onchange = () => {
      const idx = Number(cb.dataset.row);
      if (state.dataMerge.rows[idx]) {
        state.dataMerge.rows[idx]._selected = cb.checked;
        pushHistory();
        reRender();
      }
    };
  });

  // Helper to highlight a column by name
  const highlightColumn = (colName) => {
    all('.dm-col-highlight').forEach(el => el.classList.remove('dm-col-highlight'));
    if (colName) {
      all('[data-col]').forEach(el => {
        if ((el.tagName === 'TH' || el.tagName === 'TD') && el.getAttribute('data-col') === colName) {
          el.classList.add('dm-col-highlight');
        }
      });
    }
  };

  // Render slot mapping custom select dropdowns
  all('.dm-map-container').forEach(container => {
    const key = container.dataset.mapkey;
    const activeVal = state.dataMerge.mappings[key] || '';
    const options = [{ label: '— none —', val: '' }].concat(state.dataMerge.columns.map(c => ({ label: c, val: c })));

    dmRenderCustomSelect(container, options, activeVal, (val) => {
      if (val) state.dataMerge.mappings[key] = val;
      else delete state.dataMerge.mappings[key];
      pushHistory();
      render();
      highlightColumn(val);
    });

    const trigger = container.querySelector('.custom-select-trigger');
    const dropdown = container.querySelector('.custom-select-dropdown');

    // Hover or focus the trigger: highlight the CURRENT selected value
    trigger.addEventListener('mouseenter', () => {
      highlightColumn(state.dataMerge.mappings[key]);
    });
    trigger.addEventListener('mouseleave', () => {
      if (dropdown.style.display !== 'block') {
        highlightColumn(null);
      }
    });

    trigger.addEventListener('focus', () => {
      highlightColumn(state.dataMerge.mappings[key]);
    });
    trigger.addEventListener('blur', () => {
      setTimeout(() => {
        if (dropdown.style.display !== 'block') {
          highlightColumn(null);
        }
      }, 150);
    });

    // Hovering the items in the dropdown list
    container.querySelectorAll('.custom-select-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        highlightColumn(item.dataset.value);
      });
      item.addEventListener('mouseleave', () => {
        highlightColumn(state.dataMerge.mappings[key]);
      });
    });
  });

  // Clear highlight when clicking outside any mapping dropdown
  bg.addEventListener('click', (e) => {
    if (!e.target.closest('.dm-map-container')) {
      highlightColumn(null);
    }
  });

  // Key toggle
  all('.dm-key-toggle').forEach(b => b.onclick = () => {
    state.dataMerge.keyColumn = (state.dataMerge.keyColumn === b.dataset.col) ? null : b.dataset.col;
    pushHistory(); reRender();
  });

  // Sort cycle: none → asc → desc → none
  all('.dm-sort').forEach(b => b.onclick = () => {
    const col = b.dataset.col;
    if (dms.sortCol !== col) { dms.sortCol = col; dms.sortDir = 'asc'; dmSortByColumn(col, 'asc'); }
    else if (dms.sortDir === 'asc') { dms.sortDir = 'desc'; dmSortByColumn(col, 'desc'); }
    else { dms.sortCol = null; dms.sortDir = null; /* leave row order as-is */ }
    pushHistory(); reRender();
  });

  // Delete column
  all('.dm-delcol').forEach(b => b.onclick = () => {
    if (confirm(`Delete column "${b.dataset.col}"?`)) { dmDeleteColumn(b.dataset.col); if (dms.sortCol === b.dataset.col) { dms.sortCol = null; dms.sortDir = null; } pushHistory(); reRender(); }
  });

  // Delete row
  all('.dm-delrow').forEach(b => b.onclick = () => { dmDeleteRow(Number(b.dataset.row)); pushHistory(); reRender(); });

  // Active version toggle
  all('.dm-viewrow').forEach(b => b.onclick = () => {
    const i = Number(b.dataset.row);
    state.dataMerge.activeVersion = (state.dataMerge.activeVersion === i) ? null : i;
    state.dataMerge.enabled = true;
    pushHistory(); reRender();
  });

  // Cell double-click inline editing
  all('.dm-cell').forEach(inp => {
    let originalValue = inp.value;

    inp.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      originalValue = inp.value; // Store original value in case of ESC
      inp.removeAttribute('readonly');
      inp.style.background = 'var(--bg-input)';
      inp.style.borderColor = 'var(--accent-base)';
      inp.style.cursor = 'text';
      inp.focus();
      inp.select();
    });

    const commitCell = (cancel) => {
      inp.setAttribute('readonly', 'true');
      inp.style.background = 'transparent';
      inp.style.borderColor = 'transparent';
      inp.style.cursor = 'default';

      if (cancel) {
        inp.value = originalValue;
        const row = state.dataMerge.rows[Number(inp.dataset.row)];
        if (row) row[inp.dataset.col] = originalValue;
        render();
        renderVersionSwitcher();
      } else {
        if (inp.value !== originalValue) {
          const row = state.dataMerge.rows[Number(inp.dataset.row)];
          if (row) row[inp.dataset.col] = inp.value;
          pushHistory();
          render();
          renderVersionSwitcher();
          originalValue = inp.value;
        }
      }
    };

    inp.addEventListener('blur', () => {
      if (!inp.hasAttribute('readonly')) {
        commitCell(false);
      }
    });

    inp.addEventListener('keydown', (e) => {
      if (inp.hasAttribute('readonly')) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        commitCell(false);
        inp.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        commitCell(true);
        inp.blur();
      }
    });

    inp.oninput = () => {
      if (inp.hasAttribute('readonly')) return;
      const row = state.dataMerge.rows[Number(inp.dataset.row)];
      if (row) row[inp.dataset.col] = inp.value;
      render();
      renderVersionSwitcher();
    };
  });

  // Inline column rename: double-click span → contenteditable; Enter/blur to commit, Esc to cancel.
  all('.dm-col-name').forEach(span => {
    span.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const original = span.dataset.col;
      span.contentEditable = 'true';
      span.style.background = 'var(--bg-input)';
      span.style.border = '1px solid var(--accent-base)';
      span.focus();
      const sel = window.getSelection(); sel.removeAllRanges();
      const range = document.createRange(); range.selectNodeContents(span); sel.addRange(range);

      const commit = (cancel) => {
        span.removeEventListener('blur', onBlur);
        span.removeEventListener('keydown', onKey);
        span.contentEditable = 'false';
        span.style.background = ''; span.style.border = '';
        const newName = span.textContent.trim();
        if (cancel || !newName || newName === original) { span.textContent = original; return; }
        if (dmRenameColumn(original, newName)) { pushHistory(); reRender(); }
        else { span.textContent = original; }
      };
      const onBlur = () => commit(false);
      const onKey = (k) => {
        if (k.key === 'Enter') { k.preventDefault(); commit(false); }
        else if (k.key === 'Escape') { k.preventDefault(); commit(true); }
      };
      span.addEventListener('blur', onBlur, { once: true });
      span.addEventListener('keydown', onKey);
    });
  });

  // --- Drag-and-drop reordering ---
  let dragOverEl = null;
  const clearDragHints = () => {
    bg.querySelectorAll('.dm-col-th').forEach(el => { el.style.borderLeft = ''; el.style.boxShadow = ''; });
    bg.querySelectorAll('.dm-row').forEach(el => { el.style.borderTop = ''; el.style.boxShadow = ''; });
  };

  // Column drag
  all('.dm-col-th').forEach(th => {
    th.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-dm-col', th.dataset.colIdx);
      th.style.opacity = '.4';
    });
    th.addEventListener('dragend', () => { th.style.opacity = ''; clearDragHints(); });
    th.addEventListener('dragover', (e) => {
      if (!e.dataTransfer.types.includes('application/x-dm-col')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      clearDragHints();
      th.style.borderLeft = '2px solid var(--accent-base)';
      dragOverEl = th;
    });
    th.addEventListener('drop', (e) => {
      if (!e.dataTransfer.types.includes('application/x-dm-col')) return;
      e.preventDefault();
      const from = Number(e.dataTransfer.getData('application/x-dm-col'));
      const to = Number(th.dataset.colIdx);
      dmReorderColumns(from, to);
      pushHistory(); reRender();
    });
  });

  // Row drag
  all('.dm-row-handle').forEach(handle => {
    const row = handle.closest('.dm-row');
    handle.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-dm-row', handle.dataset.row);
      if (row) row.style.opacity = '.4';
    });
    handle.addEventListener('dragend', () => { if (row) row.style.opacity = ''; clearDragHints(); });
  });
  all('.dm-row').forEach(rowEl => {
    rowEl.addEventListener('dragover', (e) => {
      if (!e.dataTransfer.types.includes('application/x-dm-row')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      clearDragHints();
      rowEl.style.boxShadow = 'inset 0 2px 0 var(--accent-base)';
    });
    rowEl.addEventListener('drop', (e) => {
      if (!e.dataTransfer.types.includes('application/x-dm-row')) return;
      e.preventDefault();
      const from = Number(e.dataTransfer.getData('application/x-dm-row'));
      const to = Number(rowEl.dataset.row);
      dmReorderRows(from, to);
      pushHistory(); reRender();
    });
  });
}

function cycleVersion(dir) {
  const dm = state.dataMerge;
  if (!dm || !dm.enabled || !dm.rows.length) return;
  const L = dm.rows.length;
  const current = dm.activeVersion; // null or number
  let next;
  // v0.16.46: the cycle buttons now skip the "no version" slot — it's
  // still reachable via the dropdown, but a user clicking ‹/› clearly
  // wants to move between actual versions. Pre-fix the cycle went
  // null→0→1…→L−1→null→0, which made the buttons feel unresponsive:
  // hitting Next on the last row landed on "No version" (template
  // defaults reappeared, looking like the click had been swallowed)
  // and a second click was needed to wrap to row 0. New behaviour is
  // a pure 0…L−1 wrap. The only time `null` is the starting state is
  // when no version has been picked yet — then Next enters at 0 and
  // Prev enters at L−1.
  if (current === null) {
    next = (dir === 'prev') ? L - 1 : 0;
  } else if (dir === 'prev') {
    next = (current - 1 + L) % L;
  } else {
    next = (current + 1) % L;
  }
  dmSetActiveVersion(next);
}

document.getElementById('menu-file-data')?.addEventListener('click', openDataPanel);
document.getElementById('btn-open-data')?.addEventListener('click', openDataPanel);
document.getElementById('btn-version-prev')?.addEventListener('click', () => cycleVersion('prev'));
document.getElementById('btn-version-next')?.addEventListener('click', () => cycleVersion('next'));
document.getElementById('btn-data-lock')?.addEventListener('click', dmToggleLock);
document.getElementById('props')?.addEventListener('click', (e) => {
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
