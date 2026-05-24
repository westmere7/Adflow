// ============================================================================
// Adflow — Auto-Resize Engine (v2, rule-based)
// ============================================================================
//
// All code that powers the new role-based auto-resize feature lives in this
// file:
//
//   - Role taxonomy data tables (the 9 roles + 'misc')
//   - Heuristic role detection (autoAssignRole + sweep helpers)
//   - The 9 per-role placement rules + cross-role relations
//   - The main executor (runRuleBasedAutoResize)
//   - Engine settings (toggle each rule + behaviour options)
//   - UI: role picker dropdown, run modal, settings modal, fake loading overlay
//
// Loaded BEFORE script.js so its top-level functions and constants are
// available globally. This file does NOT depend on anything from script.js
// at top-level evaluation — only function bodies reference script.js
// globals (state, render, pushHistory, showCanvasNotification, uid,
// getElementCategory, baseLayerLabel, syncDefaultsForRole, applyLinkSync,
// cleanupLinkGroups, measureButtonWidth, getActiveCanvas). By the time
// any function runs, script.js has loaded and those are defined.
//
// The rule formulas in this file are derived from
// /Resize ref/auto-resize-rules.md — see that doc for the geometric
// reasoning behind each placer and the reference 6-canvas dataset.
// ============================================================================


// ----- Engine version -----------------------------------------------------
// Bump on substantive rule / behaviour changes. Surfaced in the Settings
// modal header and the fake progress overlay so the user can tell at a
// glance which engine generation produced a given resize.
//
//   v2.0 — initial 9-role rule engine + R1 logo↔RFWN relation
//   v2.1 — mask post-pass, contain→cover fallback, link-group wiring
//   v2.2 — collision resolution + canvas-clamp post-pass, no-drop policy
//   v2.3 — logo always top-right, RFWN skyscraper top-left, canvas-sized
//          subhead font, role-refresh sweep, instant-resize bypass
//   v2.4 — stack-mode heading uses full safezone width (logo doesn't
//          constrain it), wrapLines bumped to 4-5 for tall canvases,
//          subhead banner font bumped to 14-18, CRICOS dual-source font
//   v2.5 — logo + RFWN shrink 25% on tall formats (h > w) for breathing
//          room across the top row; subhead box overlaps heading bottom
//          (negative offY) to eat the heading's trailing empty padding;
//          RFWN width tightened from font×7 → font×6.2 so the box hugs
//          the wrapped "what's next" line instead of leaving trailing slack
//   v2.6 — heading wrap budget tightened (3 lines stack, 4 lines skyscraper)
//          so heading.height tracks actual text rather than reserving extra
//          padding; subhead font multiplier 0.05 → 0.06 for stack-mode
//          canvases so it reads larger relative to heading
//   v2.7 — wide-banner heading vertically centred in canvas instead of
//          hugging the top (so the side-by-side heading+subhead pair reads
//          as centred); RFWN width loosened back to fit "what's next" on
//          a single line (font × 6.8, cap 100); per-element live-linking
//          property toggles in Settings (text / font / colour / opacity /
//          animations), driven by user choice rather than role defaults
const ENGINE_VERSION = 'v2.7';


// ----- Role taxonomy data tables ------------------------------------------

const ROLE_IDS = [
  'background-image',
  'rmit-logo',
  'cta-button',
  'heading',
  'subheading',
  'cricos',
  'main-image',
  'rfwn',
  'extra-info',
  'misc'
];

const ROLE_LABELS = {
  'background-image': 'Background image',
  'rmit-logo':        'RMIT logo',
  'cta-button':       'CTA button',
  'heading':          'Heading',
  'subheading':       'Subheading',
  'cricos':           'CRICOS line',
  'main-image':       'Main image',
  'rfwn':             'RFWN tagline',
  'extra-info':       'Extra info',
  'misc':             'Unassigned'
};

const ROLE_PICKER_ORDER = [
  'heading', 'subheading', 'cta-button', 'main-image', 'background-image',
  'rmit-logo', 'rfwn', 'cricos', 'extra-info', 'misc'
];

const ROLE_PRIORITIES = {
  'background-image': 1,
  'rmit-logo':        3,
  'cta-button':       4,
  'heading':          5,
  'subheading':       6,
  'cricos':           7,
  'main-image':       7,
  'rfwn':             8,
  'extra-info':       9,
  'misc':             99
};


// ----- Heuristic role detection -------------------------------------------

function autoAssignRole(el, canvas) {
  if (!el || !canvas) return 'misc';
  const text = (el.text || '').toLowerCase();
  const name = (el.customName || '').toLowerCase();
  const area = (el.width * el.height) / (canvas.width * canvas.height || 1);

  // Name-based first (trust the user's layer name when present).
  if (name === 'rfwn' || name.includes('ready for')) return 'rfwn';
  if (name.includes('cricos') || name.includes('compliance')) return 'cricos';
  if (name.includes('rmit') || name.includes('logo')) return 'rmit-logo';
  if (name === 'background' || name === 'bg' || name.includes('background image')) return 'background-image';
  if (name === 'heading' || name.includes('headline')) return 'heading';
  if (name === 'subheading' || name.includes('subhead')) return 'subheading';
  if (name === 'extra info' || name.includes('extra-info') || name.includes('extra info')) return 'extra-info';
  if (name.includes('main image') || name.includes('hero') || name.includes('main-image')) return 'main-image';
  if (name === 'button' || name.includes('cta')) return 'cta-button';

  // Text-content recognition for the brand-specific lines.
  if (el.type === 'text') {
    if (text.includes('cricos') || /\brto\b/i.test(el.text || '')) return 'cricos';
    if (text.includes('ready for') && text.includes('next')) return 'rfwn';
    // Largest font in the canvas = heading, second largest = subheading.
    const ranked = (canvas.elements || [])
      .filter(e => e.type === 'text' && e.persistent !== 'top')
      .sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0));
    if (ranked[0] && ranked[0].id === el.id) return 'heading';
    if (ranked[1] && ranked[1].id === el.id) return 'subheading';
    if (el.persistent === 'top') return 'cricos';
    return 'extra-info';
  }

  if (el.type === 'button') return 'cta-button';

  if (el.type === 'image') {
    if (area >= 0.7 || el.persistent === 'bottom') return 'background-image';
    if (el.persistent === 'top' && area < 0.18) return 'rmit-logo';
    // Aspect-ratio heuristic — a small horizontal image (wider than 2:1,
    // <18% of canvas area) is almost certainly a logo lockup, even if the
    // user didn't drop it into the Always-Top section.
    const imgAspect = (el.width && el.height) ? (el.width / el.height) : 1;
    if (imgAspect >= 2.0 && area < 0.18) return 'rmit-logo';
    return 'main-image';
  }

  if (el.type === 'rect' || el.type === 'circle' || el.type === 'pixel') {
    if (area >= 0.7 || el.persistent === 'bottom') return 'background-image';
    return 'misc';
  }

  return 'misc';
}

// Walk a canvas and fill in `role` for any element that needs one.
// Behaviour:
//   - User-set roles (el.roleAuto === false) are preserved as-is. Manual
//     intent always wins.
//   - Auto-assigned roles (el.roleAuto === true OR undefined) get
//     RE-DETECTED on every sweep. This means improvements to autoAssignRole
//     (e.g. the aspect-ratio logo heuristic added later) take effect on
//     existing projects without forcing the user to reset each layer.
//   - Elements with no role at all get classified for the first time.
// The user-toggleable green chip in the layer panel reflects whichever
// state the element ends up in.
function ensureRolesAssigned(canvas) {
  if (!canvas || !Array.isArray(canvas.elements)) return;
  canvas.elements.forEach(el => {
    if (el.role && el.roleAuto === false) return;   // user-locked
    const detected = autoAssignRole(el, canvas);
    if (el.role !== detected) el.role = detected;
    el.roleAuto = true;
  });
}

// Sweep every canvas in the current project. Safe to call from any boot path.
function ensureRolesAssignedAll() {
  if (typeof state === 'undefined' || !state || !Array.isArray(state.canvases)) return;
  state.canvases.forEach(ensureRolesAssigned);
}


// ----- Role picker dropdown (anchored to the layer-row role icon) ---------

function openRolePicker(el, anchorBtn) {
  if (!el || !anchorBtn) return;
  // Close any existing picker.
  document.querySelectorAll('.role-picker-popup').forEach(n => n.remove());

  const pop = document.createElement('div');
  // NOTE: do NOT add the `dropdown` class here — `.dropdown` has
  // `display:none` by default and is only revealed by a `.menu-item:hover`
  // parent. Our popup is body-anchored, so it would stay hidden forever.
  // We use `dropdown-item` / `dropdown-divider` on children only.
  pop.className = 'role-picker-popup';
  const currentRole = el.role || 'misc';
  const isAuto = el.roleAuto !== false;

  pop.innerHTML = `
    <div style="padding:8px 12px 4px 12px; font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">
      Auto-resize role
    </div>
    <div style="padding:0 12px 6px 12px; font-size:10px; color:var(--text-muted);">
      ${isAuto ? 'Auto-detected. Pick one to override.' : 'Manually assigned. Reset clears the override.'}
    </div>
    <div class="dropdown-divider"></div>
    ${ROLE_PICKER_ORDER.map(id => {
      const isCurrent = id === currentRole;
      const colorStyle = isCurrent ? 'color:var(--accent-base); font-weight:600;' : '';
      return `<div class="dropdown-item role-picker-item" data-role-id="${id}" style="display:flex; align-items:center; gap:8px; ${colorStyle}">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${isCurrent ? 'var(--accent-base)' : 'transparent'}; border:1px solid var(--border-light); flex-shrink:0;"></span>
        <span>${ROLE_LABELS[id]}</span>
      </div>`;
    }).join('')}
    <div class="dropdown-divider"></div>
    <div class="dropdown-item role-picker-reset" style="font-size:10px; color:var(--text-muted);">↺ Reset to auto-detect</div>
  `;

  document.body.appendChild(pop);

  // Anchor below the button, right-aligned.
  const rect = anchorBtn.getBoundingClientRect();
  Object.assign(pop.style, {
    position: 'fixed',
    top: (rect.bottom + 4) + 'px',
    left: Math.max(8, rect.right - 220) + 'px',
    minWidth: '220px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-light)',
    borderRadius: '6px',
    boxShadow: '0 10px 30px rgba(0,0,0,.4)',
    zIndex: 100001,
    padding: '0 0 4px 0'
  });

  const closePicker = () => {
    pop.remove();
    document.removeEventListener('click', outsideHandler, true);
    document.removeEventListener('keydown', escHandler);
  };
  const outsideHandler = (e) => {
    if (!pop.contains(e.target) && e.target !== anchorBtn && !anchorBtn.contains(e.target)) {
      closePicker();
    }
  };
  const escHandler = (e) => { if (e.key === 'Escape') closePicker(); };
  // Defer attaching so the click that opened us doesn't immediately close.
  setTimeout(() => {
    document.addEventListener('click', outsideHandler, true);
    document.addEventListener('keydown', escHandler);
  }, 0);

  pop.querySelectorAll('.role-picker-item').forEach(item => {
    item.addEventListener('click', () => {
      const newRole = item.dataset.roleId;
      el.role = newRole;
      el.roleAuto = false;
      pushHistory();
      closePicker();
      render();
    });
  });

  pop.querySelector('.role-picker-reset').addEventListener('click', () => {
    const c = getActiveCanvas();
    delete el.role;
    delete el.roleAuto;
    ensureRolesAssigned(c);
    pushHistory();
    closePicker();
    render();
  });
}


// ----- "Run Auto-Resize" modal (collects target canvases + run options) ---

function openAutoResizeModal() {
  const src = getActiveCanvas();
  if (!src) {
    showCanvasNotification('Select a source canvas first (click its header).', { type: 'warning' });
    return;
  }
  if (state.canvases.length < 2) {
    showCanvasNotification('Add at least one more canvas to resize into.', { type: 'warning' });
    return;
  }

  // Local HTML-escape helper — matches the pattern used by modal builders
  // elsewhere in the codebase. We need this because `esc` is not global.
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  ensureRolesAssigned(src);
  const srcEls = src.elements || [];
  const unassignedCount = srcEls.filter(el => (el.role || 'misc') === 'misc').length;
  const totalCount = srcEls.length;

  const persistedSettings = getAutoResizeSettings();
  const targets = state.canvases.filter(c => c.id !== src.id);

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal" style="max-width:560px;">
      <div class="modal-head">
        <h2>Auto-Resize</h2>
        <button class="btn" id="ar-modal-close" title="Close dialog">Close</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:14px;">
          <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px;">Source canvas</div>
          <div style="font-size:13px; font-weight:600; color:var(--text-main);">${esc(src.name || (src.width + '×' + src.height))} <span style="color:var(--text-muted); font-weight:400;">— ${src.width}×${src.height}</span></div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${totalCount} element${totalCount === 1 ? '' : 's'} on this frame${unassignedCount > 0 ? ` &middot; <span style="color:#f59e0b;">${unassignedCount} unassigned</span>` : ''}</div>
        </div>

        <div style="margin-bottom:14px;">
          <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:6px;">Apply to these canvases</div>
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <button class="btn" id="ar-select-all" style="padding:3px 8px; font-size:10px;">Select all</button>
            <button class="btn" id="ar-select-none" style="padding:3px 8px; font-size:10px;">Clear</button>
          </div>
          <div id="ar-target-list" style="display:grid; grid-template-columns: 1fr 1fr; gap:6px 14px; max-height:200px; overflow-y:auto; padding:8px; background:var(--bg-deep); border:1px solid var(--border-light); border-radius:4px;">
            ${targets.map(c => `
              <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; padding:3px 0;">
                <input type="checkbox" class="ar-target-checkbox" data-canvas-id="${c.id}" checked />
                <span style="color:var(--text-main);">${esc(c.name || (c.width + '×' + c.height))}</span>
                <span style="color:var(--text-muted); font-size:10px;">${c.width}×${c.height}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; cursor:pointer;">
            <input type="checkbox" id="ar-include-unassigned" ${persistedSettings.behaviour.includeUnassigned ? 'checked' : ''} />
            <span>
              <span style="color:var(--text-main); font-weight:500;">Place unassigned elements in the centre of each target canvas</span>
              <br>
              <span style="color:var(--text-muted); font-size:10.5px;">Off (default): unassigned elements are skipped on target canvases. On: they're copied and centred (no rule-based placement). Saved as your default after Run.</span>
            </span>
          </label>
        </div>

        <div style="padding:10px 12px; background:rgba(239, 68, 68, 0.08); border:1px solid rgba(239, 68, 68, 0.25); border-radius:4px; font-size:11.5px; color:#fca5a5; line-height:1.5;">
          <strong style="color:#f87171;">⚠ Heads up:</strong> This wipes every element on the selected target frames — including locked and hidden layers — before placing the new content. The source canvas is untouched. Undo (Ctrl+Z) restores everything.
        </div>
      </div>
      <div class="modal-foot" style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn" id="ar-cancel">Cancel</button>
        <button class="btn primary" id="ar-run">Run Auto-Resize</button>
      </div>
    </div>
  `;
  document.body.appendChild(bg);

  const close = () => {
    bg.remove();
    document.removeEventListener('keydown', escHandler);
  };
  const escHandler = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', escHandler);

  bg.querySelector('#ar-modal-close').onclick = close;
  bg.querySelector('#ar-cancel').onclick = close;
  bg.onclick = (e) => { if (e.target === bg) close(); };

  bg.querySelector('#ar-select-all').onclick = () => {
    bg.querySelectorAll('.ar-target-checkbox').forEach(cb => cb.checked = true);
  };
  bg.querySelector('#ar-select-none').onclick = () => {
    bg.querySelectorAll('.ar-target-checkbox').forEach(cb => cb.checked = false);
  };

  bg.querySelector('#ar-run').onclick = () => {
    const targetIds = Array.from(bg.querySelectorAll('.ar-target-checkbox'))
      .filter(cb => cb.checked)
      .map(cb => cb.dataset.canvasId);
    if (targetIds.length === 0) {
      showCanvasNotification('Pick at least one target canvas.', { type: 'warning' });
      return;
    }
    const includeUnassigned = bg.querySelector('#ar-include-unassigned').checked;
    // Persist the user's last choice so the bypass path (when canvas-
    // selection dialogue is turned off in settings) has a remembered value.
    persistedSettings.behaviour.includeUnassigned = includeUnassigned;
    close();
    runRuleBasedAutoResize({
      sourceId: src.id,
      targetIds,
      includeUnassigned
    });
  };
}


// ----- Shared geometric helpers -------------------------------------------

function clampNum(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

function computeSafezone(c) {
  const w = c.width, h = c.height;
  const minDim = Math.min(w, h);
  const aspect = Math.max(w, h) / minDim;
  const factor = (minDim < 200 && aspect > 3) ? 0.08 : 0.05;
  const inset = Math.max(4, Math.round(minDim * factor));
  return {
    x: inset,
    y: inset,
    w: w - 2 * inset,
    h: h - 2 * inset,
    right: w - inset,
    bottom: h - inset,
    inset
  };
}

// Deep-clone a source element for placement on the target canvas. The mask
// relationship (isMask + maskTargetId) is preserved here; the executor's
// post-placement pass remaps maskTargetId to the cloned image's new id and
// aligns the mask's geometry to that image. If the target image didn't
// transfer to this canvas, the mask is disabled in the post-pass.
function cloneSourceElement(srcEl) {
  const clone = JSON.parse(JSON.stringify(srcEl));
  clone.id = uid();
  if (clone.persistent === false) clone.frameId = state.activeFrameId;
  return clone;
}


// ----- Per-role placement rules -------------------------------------------

function placeBackgroundImage(srcEl, target, ctx) {
  const src = ctx.sourceCanvas;
  const norm = {
    x: srcEl.x / src.width,
    y: srcEl.y / src.height,
    w: srcEl.width / src.width,
    h: srcEl.height / src.height
  };
  // Fast-path: 100% canvas fill
  if (Math.abs(norm.x) < 0.005 && Math.abs(norm.y) < 0.005 &&
      Math.abs(norm.w - 1) < 0.01 && Math.abs(norm.h - 1) < 0.01) {
    return { x: 0, y: 0, width: target.width, height: target.height };
  }
  return {
    x: Math.round(norm.x * target.width),
    y: Math.round(norm.y * target.height),
    width:  Math.max(1, Math.round(norm.w * target.width)),
    height: Math.max(1, Math.round(norm.h * target.height))
  };
}

function placeRmitLogo(srcEl, target, ctx) {
  const sz = ctx.safezone;
  const w = target.width, h = target.height;
  const isTallFormat = h > w;  // portrait + skyscraper

  // Height: banner branch vs standard branch.
  let logoH = (h <= 100)
    ? clampNum(Math.round(h * 0.2 + 8), 15, 30)
    : clampNum(Math.round(Math.sqrt(w * h) * 0.075), 15, 40);

  // Tall formats (300×600, 160×600) have RFWN top-left and logo top-right
  // sharing the same row at the top of safezone. Shrink the logo so the
  // pair has breathing room across the limited horizontal real estate.
  if (isTallFormat) {
    logoH = Math.max(15, Math.round(logoH * 0.75));
  }

  // Width derived from source aspect (default ~2.85 for RMIT lockup)
  const srcAspect = (srcEl.width && srcEl.height) ? (srcEl.width / srcEl.height) : 2.85;
  const logoW = Math.round(logoH * srcAspect);

  // Top-right of safezone, always. The previous bot-left fallback for
  // ultra-narrow skyscrapers (aspect < 0.4) created a cramped bottom strip
  // with RFWN + CTA all competing for ~30 px of vertical space. Top-right
  // is consistent across formats and pairs naturally with RFWN top-left
  // (via the R1 relation), splitting the brand corners across opposite
  // sides of the same row.
  const offX = clampNum(Math.round(sz.inset * 0.15), 0, 3);
  const offY = clampNum(Math.round(sz.inset * 0.2), 1, 3);
  return {
    x: sz.right - offX - logoW,
    y: sz.y + offY,
    width: logoW,
    height: logoH
  };
}

function placeCtaButton(srcEl, target, ctx) {
  const sz = ctx.safezone;
  const w = target.width, h = target.height;
  const aspect = w / h;
  const sqArea = Math.sqrt(w * h);

  const btnH = clampNum(Math.round(sqArea * 0.11), 14, 53);

  if (aspect <= 2.0) {
    // Tall mode: bot-center of safezone
    const btnW = clampNum(Math.round(btnH * 3.7), 70, Math.min(200, sz.w));
    const offY = clampNum(Math.round(h * 0.04), 15, 30);
    return {
      x: sz.x + Math.round((sz.w - btnW) / 2),
      y: sz.bottom - offY - btnH,
      width: btnW,
      height: btnH
    };
  }
  // Wide mode: button-right at canvas.w × 0.84, vertically centred
  const btnW = clampNum(Math.round(btnH * 4.2), 70, 200);
  const btnRight = Math.round(w * 0.84);
  return {
    x: btnRight - btnW,
    y: Math.round((h - btnH) / 2),
    width: btnW,
    height: btnH
  };
}

function placeHeading(srcEl, target, ctx) {
  const sz = ctx.safezone;
  const w = target.width, h = target.height;
  const aspect = w / h;

  const offX = clampNum(Math.round(w * 0.03), 2, 80);
  const offY = (h < 100) ? 2 : clampNum(Math.round(h * 0.15), 20, 100);

  let width;
  const stackMode = h >= 300;
  if (stackMode) {
    width = sz.w;
  } else if (aspect > 2) {
    // Wide banner — heading column gets a generous share of canvas width so
    // 2-line wrapping of "It's not too late to study in 2026." fits cleanly.
    width = (h <= 100)
      ? clampNum(Math.round(w * 0.42), 80, 400)
      : clampNum(Math.round(w * 0.40), 80, 400);
  } else {
    width = clampNum(Math.round(sz.w * 0.55), 120, 270);
  }

  // Constrain width by already-placed CTA / logo only when they're in the
  // same horizontal band as the heading.
  //   - CTA only sits "to the right" in wide-banner mode (aspect > 2); in
  //     tall/stack layouts CTA is below heading and doesn't conflict.
  //   - Logo is always top-right. In stack mode (h ≥ 300) heading starts
  //     well below the top (offY ~90), so logo is above heading — no
  //     horizontal conflict. Skip the logo constraint in stack mode so
  //     heading can use the full safezone width.
  const cta  = ctx.placedElements['cta-button'];
  const logo = ctx.placedElements['rmit-logo'];
  const headingX = sz.x + offX;
  const ctaIsWideMode = aspect > 2.0;
  let maxRight = sz.right;
  if (cta && ctaIsWideMode && cta.x >= headingX) {
    maxRight = Math.min(maxRight, cta.x - 8);
  }
  if (logo && !stackMode && logo.x >= headingX) {
    maxRight = Math.min(maxRight, logo.x - 8);
  }
  width = Math.max(40, Math.min(width, maxRight - headingX));

  // Font size: scaled to canvas. Tight banners cap at 22.
  let fontSize;
  if (h <= 100) {
    fontSize = clampNum(Math.round(h * 0.22), 9, 22);
  } else if (h < 300) {
    fontSize = clampNum(Math.round(Math.sqrt(w * h) * 0.07), 16, 35);
  } else {
    fontSize = clampNum(Math.round(Math.sqrt(w * h) * 0.08), 22, 46);
  }

  // Wrap budget — sized to match the EXPECTED wrap count for the source
  // headline, so heading.height tracks the actual rendered text without
  // a tall pile of trailing padding below the last line.
  let wrapLines;
  if (h <= 100) wrapLines = 2;
  else if (h < 300) wrapLines = 2;
  else if (w < 200) wrapLines = 4;   // narrow skyscraper (160×600 → 4 lines)
  else wrapLines = 3;                 // standard stack (300×600 → 3 lines)
  const idealH = Math.round(fontSize * 1.32 * wrapLines);
  const remainH = h - sz.inset * 2 - 4;
  const height = Math.max(Math.round(fontSize * 1.32), Math.min(idealH, remainH));

  // Y placement. Wide banners (h ≤ 100, aspect > 2) host the heading +
  // side-by-side subhead pair, which reads best when vertically centred
  // in the canvas rather than hugging the top. All other layouts use the
  // safezone-top-anchored offY.
  let y;
  if (h <= 100 && aspect > 2.0) {
    y = Math.max(sz.y, Math.round((h - height) / 2));
  } else {
    y = sz.y + offY;
  }

  return {
    x: headingX,
    y,
    width,
    height,
    fontSize,
    maxFontSize: fontSize  // cap auto-fit so source's 68pt max can't blow up
  };
}

function placeSubheading(srcEl, target, ctx) {
  const heading = ctx.placedElements['heading'];
  const h = target.height, w = target.width;
  const sz = ctx.safezone;
  const cta = ctx.placedElements['cta-button'];

  // Font: scaled to canvas dimensions. Updated multipliers for tall
  // canvases so subhead reads larger relative to heading.
  //   320×50  →  9   (banner formula)
  //   728×90  → 16   (banner formula)
  //   300×250 → 16   (sqrt × 0.06 = 16.4)
  //   970×250 → 28   (capped from 29.6 → cap 28)
  //   300×600 → 25   (was 21, bumped via 0.06 multiplier)
  //   160×600 → 19   (was 16)
  let fontSize;
  if (h <= 60) {
    fontSize = clampNum(Math.round(h * 0.18), 8, 11);
  } else if (h <= 100) {
    fontSize = clampNum(Math.round(h * 0.18), 14, 18);
  } else {
    fontSize = clampNum(Math.round(Math.sqrt(w * h) * 0.06), 14, 28);
  }
  const subH = Math.round(fontSize * 1.35);

  // No-drop fallback: if heading didn't place (rare — heading rule never
  // returns null), park subheading at safezone top-left so it's still
  // visible on the target canvas.
  if (!heading) {
    return {
      x: sz.x + 4,
      y: sz.y + 4,
      width: sz.w - 8,
      height: subH,
      fontSize,
      maxFontSize: fontSize
    };
  }

  // Tight horizontal banners (h ≤ 100): subheading sits to the RIGHT of
  // heading instead of below.
  if (h <= 100) {
    const gapX = 8;
    const x = heading.x + heading.width + gapX;
    let maxRight = sz.right;
    if (cta && cta.x >= x) maxRight = Math.min(maxRight, cta.x - 8);
    const width = Math.max(30, maxRight - x);
    return {
      x,
      y: heading.y + Math.round((heading.height - subH) / 2),
      width,
      height: subH,
      fontSize,
      maxFontSize: fontSize
    };
  }

  // Default: below heading with a small visual gap. Heading wrap budget
  // is now sized to expected text length (3 lines stack, 4 lines
  // skyscraper, 2 elsewhere) so the heading box ends close to its text;
  // a 4 px gap reads as "stacked" without an aggressive negative offset.
  return {
    x: heading.x,
    y: heading.y + heading.height + 4,
    width: heading.width,
    height: subH,
    fontSize,
    maxFontSize: fontSize
  };
}

function placeCricos(srcEl, target, ctx) {
  const sz = ctx.safezone;
  const w = target.width, h = target.height;
  const minDim = Math.min(w, h);

  // Font: take the larger of two candidates so wide banners don't end up
  // with a floor-of-4 cricos when there's plenty of horizontal real estate.
  //   minDim × 0.023 — original formula, drives portrait / square sizes
  //   width  × 0.008 — kicks in for wide canvases (970×250, 728×90)
  // Both capped at 7.
  //   300×250 → max(6, 4) = 6
  //   300×600 → max(7, 4) = 7
  //   160×600 → max(4, 4) = 4
  //   728×90  → max(4, 6) = 6   (was 4)
  //   970×250 → max(6, 7) = 7   (was 6)
  //   320×50  → max(4, 4) = 4
  const fontFromMin   = clampNum(Math.round(minDim * 0.023), 4, 7);
  const fontFromWidth = clampNum(Math.round(w * 0.008),       4, 7);
  const fontSize = Math.max(fontFromMin, fontFromWidth);
  const srcFs = srcEl.fontSize || 7;
  const scale = fontSize / srcFs;
  const widthRaw = Math.round((srcEl.width || 100) * scale);
  const width = clampNum(widthRaw, 40, w - 8);
  const height = Math.max(8, Math.round((srcEl.height || 12) * scale));

  const offX = Math.max(sz.inset, 8);
  const offY = Math.max(Math.round(fontSize * 0.5), 4);
  return {
    x: offX,
    y: h - offY - height,
    width,
    height,
    fontSize,
    maxFontSize: fontSize
  };
}

function placeMainImage(srcEl, target, ctx) {
  const sz = ctx.safezone;
  const w = target.width, h = target.height;
  const heading    = ctx.placedElements['heading'];
  const subheading = ctx.placedElements['subheading'];
  const cta        = ctx.placedElements['cta-button'];

  const gapX = clampNum(Math.round(w * 0.02), 6, 30);
  const gapY = clampNum(Math.round(h * 0.02), 6, 20);

  const textBottom = subheading
    ? (subheading.y + subheading.height)
    : (heading ? heading.y + heading.height : sz.y);

  const textRight = subheading
    ? Math.max(((heading?.x || 0) + (heading?.width || 0)), subheading.x + subheading.width)
    : (heading ? heading.x + heading.width : sz.x);

  const ratio = h / w;
  const stack = ratio >= 1.0;
  const ctaWideMode = (w / h) > 2.0;

  let slot;
  if (stack) {
    slot = {
      x: sz.x,
      y: textBottom + gapY,
      w: sz.w,
      h: ((cta) ? (cta.y - gapY) : sz.bottom) - (textBottom + gapY)
    };
  } else {
    slot = {
      x: textRight + gapX,
      y: sz.y,
      w: ((cta && ctaWideMode) ? (cta.x - gapX) : sz.right) - (textRight + gapX),
      h: sz.h
    };
  }

  // No-drop fallback: if the slot search yielded nothing usable, place the
  // image at a minimum size centered on the canvas. The mask post-pass
  // will follow it. Better to render small than to vanish entirely.
  if (slot.w <= 0 || slot.h <= 0) {
    const minDim = Math.max(30, Math.min(80, Math.round(Math.min(w, h) * 0.3)));
    return {
      x: Math.max(0, Math.round((w - minDim) / 2)),
      y: Math.max(0, Math.round((h - minDim) / 2)),
      width: minDim,
      height: minDim
    };
  }

  const srcAspect = (srcEl.width && srcEl.height) ? (srcEl.width / srcEl.height) : 1;
  const slotAspect = slot.w / slot.h;

  let imgW, imgH;
  if (srcAspect >= slotAspect) {
    imgW = slot.w;
    imgH = Math.round(imgW / srcAspect);
  } else {
    imgH = slot.h;
    imgW = Math.round(imgH * srcAspect);
  }

  // Cover fallback when contain leaves the image too small in the slot.
  // Honour the engine setting — when off, the image stays small (contain).
  const allowCover = !ctx.engineSettings || ctx.engineSettings.behaviour?.allowCoverFallback !== false;
  const fillFrac = Math.max(imgW, imgH) / Math.max(slot.w, slot.h);
  if (allowCover && fillFrac < 0.6) {
    if (srcAspect >= slotAspect) {
      imgH = slot.h;
      imgW = Math.round(imgH * srcAspect);
    } else {
      imgW = slot.w;
      imgH = Math.round(imgW / srcAspect);
    }
  }

  // No-drop floor: keep at least a 24-px-square image so it remains visible.
  if (Math.min(imgW, imgH) < 24) {
    const floor = 24;
    imgW = Math.max(imgW, floor);
    imgH = Math.max(imgH, floor);
  }

  return {
    x: slot.x + Math.round((slot.w - imgW) / 2),
    y: slot.y + Math.round((slot.h - imgH) / 2),
    width: imgW,
    height: imgH
  };
}

function placeRfwn(srcEl, target, ctx) {
  const sz = ctx.safezone;
  const w = target.width, h = target.height;
  const aspect = w / h;
  const isTallFormat = h > w;

  let fontSize = clampNum(Math.round(Math.sqrt(w * h) * 0.032), 5, 17);
  // Tall formats share the top row with the logo. Shrink to keep them
  // visually separated — pairs with the logo-shrink in placeRmitLogo.
  if (isTallFormat) {
    fontSize = Math.max(5, Math.round(fontSize * 0.8));
  }
  // Width hugs the wrapped text. "what's next" (11 chars) is the longer
  // of the two natural lines and must fit on a single row, otherwise RFWN
  // wraps to 3 lines. font × 6.8 with cap 100 leaves the box snug to the
  // text right edge while still keeping the 2-line wrap intact.
  const width  = clampNum(Math.round(fontSize * 6.8), 35, 100);
  // RFWN wraps to ~2 lines at chosen font; leading ~1.2.
  const height = Math.max(10, Math.round(fontSize * 2.4));

  // Two modes:
  //   - aspect ≤ 2.0 → top-left  (square, portrait, AND skyscraper — the
  //     latter previously went bot-right, which packed it against the logo
  //     in the bottom strip; top-left now mirrors the portrait pattern).
  //   - aspect > 2.0 → bot-right (wide banner — logo is top-right, RFWN
  //     mirrors below it).
  // Text always justifies toward the closest canvas edge (left for left
  // anchors, right for right anchors). Never centered.
  let x, y, textAlign;
  if (aspect <= 2.0) {
    const offX = Math.max(2, Math.round(sz.inset * 0.2));
    x = sz.x + offX;
    y = sz.y;
    textAlign = 'left';
  } else {
    const offX = clampNum(Math.round(sz.inset * 0.4), 0, 5);
    const offY = clampNum(Math.round(sz.inset * 0.4), 0, 5);
    x = sz.right - offX - width;
    y = sz.bottom - offY - height;
    textAlign = 'right';
  }
  return { x, y, width, height, fontSize, maxFontSize: fontSize, textAlign };
}

function placeExtraInfo(srcEl, target, ctx) {
  const sz = ctx.safezone;
  const w = target.width, h = target.height;
  const heading    = ctx.placedElements['heading'];
  const subheading = ctx.placedElements['subheading'];
  const cta        = ctx.placedElements['cta-button'];

  const gapY = clampNum(Math.round(h * 0.015), 4, 12);
  const gapX = clampNum(Math.round(w * 0.015), 4, 16);
  const srcW = srcEl.width || 100;
  const srcH = srcEl.height || 16;

  // Candidate 1 — below subheading (or heading if no subheading)
  const anchor = subheading || heading;
  if (anchor) {
    const x1 = anchor.x;
    const y1 = anchor.y + anchor.height + gapY;
    const x2 = anchor.x + anchor.width;
    const y2 = (cta && cta.y > y1) ? (cta.y - gapY) : sz.bottom;
    const candW = x2 - x1, candH = y2 - y1;
    if (candW >= 40 && candH >= 12) {
      return {
        x: x1,
        y: y1,
        width: Math.min(srcW, candW),
        height: Math.min(srcH, candH)
      };
    }
  }

  // Candidate 2 — right of subheading (banner / horizontal layouts)
  if (subheading && cta) {
    const x1 = subheading.x + subheading.width + gapX;
    const y1 = subheading.y;
    const x2 = cta.x - gapX;
    const y2 = subheading.y + subheading.height;
    const candW = x2 - x1, candH = y2 - y1;
    if (candW >= 40 && candH >= 12) {
      return { x: x1, y: y1, width: Math.min(srcW, candW), height: Math.min(srcH, candH) };
    }
  }

  // No-drop fallback: park near the bottom-left of safezone at a minimum
  // size. Small enough not to interfere with the brand corner; visible
  // enough that the user knows the element survived the resize.
  const fallbackW = Math.min(srcW, sz.w - 8);
  const fallbackH = Math.min(srcH, 14);
  return {
    x: sz.x + 4,
    y: sz.bottom - fallbackH - 4,
    width: fallbackW,
    height: fallbackH
  };
}

const PLACEMENT_RULES = {
  'background-image': placeBackgroundImage,
  'rmit-logo':        placeRmitLogo,
  'cta-button':       placeCtaButton,
  'heading':          placeHeading,
  'subheading':       placeSubheading,
  'cricos':           placeCricos,
  'main-image':       placeMainImage,
  'rfwn':             placeRfwn,
  'extra-info':       placeExtraInfo
};


// ----- Post-placement passes ----------------------------------------------

function _rectsOverlap(a, b) {
  if (!a || !b) return false;
  return !(a.x + a.width  <= b.x ||
           b.x + b.width  <= a.x ||
           a.y + a.height <= b.y ||
           b.y + b.height <= a.y);
}

// Shrink `low` along whichever axis the centres differ most on, so it
// clears `high` with the requested gap. Width / height are reduced rather
// than the element being moved off its anchor (more visually predictable).
function _shrinkToClear(low, high, gap) {
  if (!_rectsOverlap(low, high)) return false;
  const lowCx  = low.x  + low.width  / 2;
  const lowCy  = low.y  + low.height / 2;
  const highCx = high.x + high.width  / 2;
  const highCy = high.y + high.height / 2;
  const dx = lowCx - highCx;
  const dy = lowCy - highCy;
  const horizAxis = Math.abs(dx) / (high.width  + low.width)
                  > Math.abs(dy) / (high.height + low.height);

  if (horizAxis) {
    if (dx >= 0) {
      const newX = high.x + high.width + gap;
      if (newX < low.x + low.width) {
        const newW = (low.x + low.width) - newX;
        low.width = Math.max(20, newW);
        low.x = newX;
      }
    } else {
      const newW = (high.x - gap) - low.x;
      low.width = Math.max(20, newW);
    }
  } else {
    if (dy >= 0) {
      const newY = high.y + high.height + gap;
      if (newY < low.y + low.height) {
        const newH = (low.y + low.height) - newY;
        low.height = Math.max(10, newH);
        low.y = newY;
      }
    } else {
      const newH = (high.y - gap) - low.y;
      low.height = Math.max(10, newH);
    }
  }
  return true;
}

// Post-placement pass: the 5 "no-touch" elements (rmit-logo, cta-button,
// heading, subheading, rfwn) must not overlap each other. Walk pairs in
// priority order — when two collide, the lower-priority one shrinks /
// shifts to clear the higher-priority one.
function resolveNoTouchCollisions(ctx) {
  const order = ['rmit-logo', 'cta-button', 'heading', 'subheading', 'rfwn'];
  for (let i = 0; i < order.length; i++) {
    const high = ctx.placedElements[order[i]];
    if (!high) continue;
    for (let j = i + 1; j < order.length; j++) {
      const low = ctx.placedElements[order[j]];
      if (!low) continue;
      _shrinkToClear(low, high, 4);
    }
  }
}

// Post-placement pass: every role except main-image and background-image
// must stay fully inside the canvas. Off-canvas elements get clipped.
function clampToCanvas(ctx) {
  const w = ctx.target.width, h = ctx.target.height;
  const allowOutside = new Set(['main-image', 'background-image']);
  Object.entries(ctx.placedElements).forEach(([role, el]) => {
    if (allowOutside.has(role)) return;
    if (el.x < 0) {
      el.width = Math.max(20, el.width + el.x);
      el.x = 0;
    }
    if (el.y < 0) {
      el.height = Math.max(10, el.height + el.y);
      el.y = 0;
    }
    if (el.x + el.width > w) {
      el.width = Math.max(20, w - el.x);
    }
    if (el.y + el.height > h) {
      el.height = Math.max(10, h - el.y);
    }
  });
}


// ----- Cross-role relations -----------------------------------------------

// R1: rmit-logo ↔ rfwn edge alignment. After both place individually,
// snap rfwn to share the relevant edge with the logo. With the updated
// rules (logo always top-right, RFWN top-left for aspect ≤ 2, bot-right
// for aspect > 2), there are only two cases:
//   - aspect ≤ 2: both at top → share top edge (rfwn.y = logo.y)
//   - aspect > 2: both at right side → share right edge
function applyRelationR1(ctx) {
  const logo = ctx.placedElements['rmit-logo'];
  const rfwn = ctx.placedElements['rfwn'];
  if (!logo || !rfwn) return;
  const w = ctx.target.width, h = ctx.target.height;
  const aspect = w / h;

  if (aspect <= 2.0) {
    rfwn.y = logo.y;
  } else {
    rfwn.x = logo.x + logo.width - rfwn.width;
  }
}


// ----- Main executor ------------------------------------------------------

function runRuleBasedAutoResize(settings) {
  const src = state.canvases.find(c => c.id === settings.sourceId);
  if (!src) {
    showCanvasNotification('Source canvas no longer exists.', { type: 'error' });
    return;
  }

  ensureRolesAssigned(src);

  const srcEls = (src.elements || []).filter(el =>
    el.persistent !== false || el.frameId === state.activeFrameId
  );

  if (!state.linkGroups) state.linkGroups = {};

  const engineSettings = getAutoResizeSettings();
  const rulesEnabled  = engineSettings.rulesEnabled;
  const relationsOn   = engineSettings.relations;

  let placedTotal = 0;
  let droppedTotal = 0;
  let canvasesUpdated = 0;

  settings.targetIds.forEach(targetId => {
    const target = state.canvases.find(c => c.id === targetId);
    if (!target || target.id === src.id) return;

    target.elements = [];

    // Tracks which target clone corresponds to which source element id —
    // used by the mask post-pass to remap maskTargetId references.
    const sourceToTargetId = {};

    const ctx = {
      sourceCanvas: src,
      target,
      safezone: computeSafezone(target),
      placedElements: {},
      engineSettings
    };

    const sorted = [...srcEls].sort((a, b) => {
      const ap = ROLE_PRIORITIES[a.role || 'misc'] ?? 99;
      const bp = ROLE_PRIORITIES[b.role || 'misc'] ?? 99;
      return ap - bp;
    });

    sorted.forEach(srcEl => {
      const role = srcEl.role || 'misc';
      const cat  = getElementCategory(srcEl) || srcEl.type;

      if (role === 'misc') {
        // Mask shapes are always carried over, even with includeUnassigned
        // off — the mask post-pass will reposition them to overlay their
        // target image. Disabling them at this stage would lose the mask
        // entirely on every target canvas.
        const isMaskShape = !!srcEl.isMask;
        if (!settings.includeUnassigned && !isMaskShape) {
          droppedTotal++;
          return;
        }
        const clone = cloneSourceElement(srcEl);
        clone.width  = Math.min(srcEl.width  || 100, target.width  - 8);
        clone.height = Math.min(srcEl.height || 100, target.height - 8);
        clone.x = Math.max(0, Math.round((target.width  - clone.width)  / 2));
        clone.y = Math.max(0, Math.round((target.height - clone.height) / 2));
        wireLinkGroup(srcEl, clone, role, cat);
        target.elements.push(clone);
        sourceToTargetId[srcEl.id] = clone.id;
        placedTotal++;
        return;
      }

      if (rulesEnabled[role] === false) {
        droppedTotal++;
        return;
      }

      const placer = PLACEMENT_RULES[role];
      const geom = placer ? placer(srcEl, target, ctx) : null;
      if (!geom) { droppedTotal++; return; }

      const clone = cloneSourceElement(srcEl);
      clone.x = geom.x;
      clone.y = geom.y;
      clone.width  = Math.max(1, geom.width);
      clone.height = Math.max(1, geom.height);
      if (typeof geom.fontSize    === 'number') clone.fontSize    = geom.fontSize;
      if (typeof geom.maxFontSize === 'number') clone.maxFontSize = geom.maxFontSize;
      if (typeof geom.textAlign   === 'string') clone.textAlign   = geom.textAlign;

      if (clone.type === 'button' && clone.autoHug && typeof measureButtonWidth === 'function') {
        clone.width = measureButtonWidth(clone);
      }

      wireLinkGroup(srcEl, clone, role, cat);
      target.elements.push(clone);
      ctx.placedElements[role] = clone;
      sourceToTargetId[srcEl.id] = clone.id;
      placedTotal++;
    });

    // Cross-role pass — R1 only for now, gated by settings.
    if (relationsOn.r1 !== false) applyRelationR1(ctx);

    // Mask post-pass: align each mask shape to its target image's new
    // geometry and remap maskTargetId from the source id to the target id.
    // If the target image didn't transfer (e.g. dropped by a disabled
    // rule), the mask flag is removed so the shape renders as a normal
    // shape rather than silently covering empty space.
    target.elements.forEach(el => {
      if (!el.isMask || !el.maskTargetId) return;
      const newTargetId = sourceToTargetId[el.maskTargetId];
      const targetImg = newTargetId
        ? target.elements.find(t => t.id === newTargetId)
        : null;
      if (!targetImg) {
        delete el.isMask;
        delete el.maskTargetId;
        return;
      }
      el.maskTargetId = newTargetId;
      el.x = targetImg.x;
      el.y = targetImg.y;
      el.width = targetImg.width;
      el.height = targetImg.height;
    });

    // Post-placement collision + canvas-bounds passes.
    resolveNoTouchCollisions(ctx);
    clampToCanvas(ctx);

    canvasesUpdated++;
  });

  cleanupLinkGroups();

  const finalize = () => {
    pushHistory();
    render();
    showCanvasNotification(
      `Auto-Resize: ${canvasesUpdated} canvas${canvasesUpdated === 1 ? '' : 'es'} updated · ${placedTotal} placed, ${droppedTotal} dropped`,
      { type: 'success' }
    );
  };

  if (engineSettings.showProgress !== false) {
    showFakeAutoResizeProgress({
      sourceCanvas: src,
      sourceElementCount: srcEls.length,
      targetCount: canvasesUpdated,
      placedCount: placedTotal,
      droppedCount: droppedTotal
    }, finalize);
  } else {
    finalize();
  }
}

// Hook src ↔ target into a link group so cross-canvas style/content sync
// works the way the user configured in the Auto-Resize Settings modal.
// When liveLink is disabled, no group is created and the target stays
// independent. When enabled, syncProperties are built from the user's
// per-property toggles and group.liveLink is set true so edits on the
// source propagate to every target in real time.
function wireLinkGroup(srcEl, target, role, cat) {
  const settings = getAutoResizeSettings();
  const ll = settings.behaviour.liveLink;

  if (!ll || ll.enabled === false) {
    // Live linking off — target gets no linkGroupId and stays an
    // independent copy. (Existing link groups on the source aren't
    // touched.)
    return;
  }

  const syncProps = buildSyncFromLiveLink(ll, cat);

  let gid = srcEl.linkGroupId;
  if (!gid || !state.linkGroups[gid]) {
    gid = 'lg_' + uid();
    state.linkGroups[gid] = {
      id:             gid,
      name:           baseLayerLabel(srcEl),
      category:       cat,
      syncProperties: syncProps,
      liveLink:       true   // real-time propagation enabled by default
    };
    srcEl.linkGroupId = gid;
  } else {
    state.linkGroups[gid].syncProperties = syncProps;
    state.linkGroups[gid].liveLink       = true;
  }
  target.linkGroupId = gid;
  applyLinkSync(srcEl, target, state.linkGroups[gid]);
}

// Map the 5 high-level live-link toggles to the underlying syncProperty
// keys that applyLinkSync reads. Position/size and font size are ALWAYS
// off (per-canvas independence is the whole point of auto-resize). Other
// category-specific properties (radius, image src, thickness, etc.) tag
// along with the closest high-level toggle.
function buildSyncFromLiveLink(ll, cat) {
  const s = { transform: false, fontSize: false };

  if (ll.syncOpacity)    s.opacity = true;
  if (ll.syncAnimations) { s.inAnim = true; s.effect = true; }

  if (cat === 'text') {
    if (ll.syncText)  s.text = true;
    if (ll.syncFont)  s.font = true;
    if (ll.syncColor) { s.color = true; s.background = true; }
  } else if (cat === 'button') {
    if (ll.syncText)  s.text = true;
    if (ll.syncFont)  s.font = true;
    if (ll.syncColor) { s.textColor = true; s.fill = true; s.stroke = true; }
    s.radius = true;
  } else if (cat === 'image') {
    s.image = true;
    s.rotation = true;
  } else if (cat === 'shape') {
    if (ll.syncColor) { s.fill = true; s.stroke = true; }
    s.radius = true;
  } else if (cat === 'line') {
    if (ll.syncColor) s.color = true;
    s.thickness = true;
  }
  return s;
}

// Map our v2 role IDs to the legacy role names that syncDefaultsForRole
// already understands. The legacy helper only branches on category really,
// but we keep the role argument for forward-compat.
function legacyRoleForCategory(roleV2, cat) {
  switch (roleV2) {
    case 'heading':          return 'heading';
    case 'subheading':       return 'subheading';
    case 'cta-button':       return 'button';
    case 'rmit-logo':        return 'logo';
    case 'cricos':           return 'compliance';
    case 'rfwn':             return 'compliance';
    case 'extra-info':       return 'text';
    case 'main-image':       return 'image';
    case 'background-image': return 'bgimage';
    default:                 return 'other';
  }
}


// ----- Engine settings (persisted in state.autoResizeSettings) ------------

const AUTO_RESIZE_DEFAULT_SETTINGS = {
  rulesEnabled: {
    'background-image': true,
    'rmit-logo':        true,
    'cta-button':       true,
    'heading':          true,
    'subheading':       true,
    'cricos':           true,
    'main-image':       true,
    'rfwn':             true,
    'extra-info':       true
  },
  relations: {
    r1: true   // rmit-logo ↔ rfwn edge alignment
  },
  behaviour: {
    allowCoverFallback:   true,   // main-image: contain → cover at <60% fill
    showProgress:         true,   // fake technical loading overlay
    showCanvasSelection:  true,   // run modal pops up before resize; off → instant
    includeUnassigned:    false,  // remembered value for the misc-elements toggle
    // Live linking config for auto-resized elements. When enabled, each
    // placed target joins the source's link group with group.liveLink =
    // true (real-time propagation), and syncProperties are built from the
    // 5 toggles below — position/size + font size are ALWAYS independent
    // per-canvas regardless of toggle state.
    liveLink: {
      enabled:      true,
      syncText:     true,
      syncFont:     true,
      syncColor:    true,
      syncOpacity:  true,
      syncAnimations: true
    }
  },
  showProgress: true             // mirrored for fast top-level read
};

function getAutoResizeSettings() {
  if (!state.autoResizeSettings) {
    state.autoResizeSettings = JSON.parse(JSON.stringify(AUTO_RESIZE_DEFAULT_SETTINGS));
  }
  const s = state.autoResizeSettings;
  if (!s.rulesEnabled) s.rulesEnabled = { ...AUTO_RESIZE_DEFAULT_SETTINGS.rulesEnabled };
  if (!s.relations)    s.relations    = { ...AUTO_RESIZE_DEFAULT_SETTINGS.relations };
  if (!s.behaviour)    s.behaviour    = { ...AUTO_RESIZE_DEFAULT_SETTINGS.behaviour };
  // Backfill any behaviour keys missing on projects saved before this version.
  if (typeof s.behaviour.allowCoverFallback  !== 'boolean') s.behaviour.allowCoverFallback  = true;
  if (typeof s.behaviour.showProgress        !== 'boolean') s.behaviour.showProgress        = true;
  if (typeof s.behaviour.showCanvasSelection !== 'boolean') s.behaviour.showCanvasSelection = true;
  if (typeof s.behaviour.includeUnassigned   !== 'boolean') s.behaviour.includeUnassigned   = false;
  if (!s.behaviour.liveLink) s.behaviour.liveLink = { ...AUTO_RESIZE_DEFAULT_SETTINGS.behaviour.liveLink };
  const ll = s.behaviour.liveLink;
  if (typeof ll.enabled        !== 'boolean') ll.enabled        = true;
  if (typeof ll.syncText       !== 'boolean') ll.syncText       = true;
  if (typeof ll.syncFont       !== 'boolean') ll.syncFont       = true;
  if (typeof ll.syncColor      !== 'boolean') ll.syncColor      = true;
  if (typeof ll.syncOpacity    !== 'boolean') ll.syncOpacity    = true;
  if (typeof ll.syncAnimations !== 'boolean') ll.syncAnimations = true;
  if (typeof s.showProgress !== 'boolean') s.showProgress = s.behaviour.showProgress !== false;
  return s;
}


// ----- Fake technical loading overlay (pure theatre) ----------------------
// Computes nothing — the placement work has already happened when this is
// called. The overlay just delays the visible render() so the user gets
// a satisfying "the engine is working" cue.
function showFakeAutoResizeProgress(stats, onComplete) {
  const bg = document.createElement('div');
  bg.id = 'ar-progress-overlay';
  bg.style.cssText = `
    position: fixed; inset: 0; z-index: 100050;
    background: rgba(8, 10, 18, 0.78); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    font-family: ui-monospace, "SF Mono", Consolas, Menlo, monospace;
    color: #c8f9e2;
  `;

  const elemCount = stats.sourceElementCount;
  const tgtCount  = stats.targetCount;
  const src = stats.sourceCanvas;
  const srcLabel = `${src.width}×${src.height}`;

  const stepLabels = [
    `Initializing visual analysis pipeline`,
    `Uploading source canvas (${srcLabel})`,
    `Loading Adflow Visual Model v2.4`,
    `Tokenizing ${elemCount} element${elemCount === 1 ? '' : 's'}`,
    `Detecting roles via heuristic ensemble`,
    `Computing safezone parametrics (${tgtCount} target${tgtCount === 1 ? '' : 's'})`,
    `Solving anchor + size constraints`,
    `Applying cross-role relations (R1)`,
    `Synchronizing link groups`,
    `Finalizing per-canvas placements`
  ];

  // Random total duration in [2000, 3000] ms. Reserve a 280 ms tail.
  const TOTAL_MS = 2000 + Math.floor(Math.random() * 1001);
  const stepWindow = TOTAL_MS - 280;

  // Each step gets a random weight (0.4×–1.6× of average), then cumulative
  // sums give the step delay. Produces "stutter" — sometimes two ticks
  // ~80ms apart, sometimes one sits alone for ~450ms.
  const weights = stepLabels.map(() => 0.4 + Math.random() * 1.2);
  const wSum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const steps = stepLabels.map((label, i) => {
    acc += (weights[i] / wSum) * stepWindow;
    return { label, delay: Math.round(acc) };
  });

  bg.innerHTML = `
    <div style="
      width: 520px; max-width: calc(100vw - 48px);
      background: #0d111c;
      border: 1px solid rgba(124, 92, 255, 0.4);
      border-radius: 8px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(124, 92, 255, 0.15) inset;
      padding: 18px 22px 16px 22px;
      font-size: 11.5px; line-height: 1.55;
    ">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
        <span class="ar-prog-spinner" style="
          display:inline-block; width:10px; height:10px;
          border:1.5px solid rgba(124, 92, 255, 0.35);
          border-top-color: #b7a3ff; border-radius:50%;
          animation: ar-prog-spin 0.7s linear infinite;
        "></span>
        <span style="color:#b7a3ff; font-weight:600; letter-spacing:0.5px;">Adflow Auto-Resize Engine</span>
        <span style="color:#5b6478; margin-left:auto; font-size:10px;">${ENGINE_VERSION} · rule-based</span>
      </div>
      <div style="color:#5b6478; font-size:10px; margin-bottom:10px; border-bottom:1px dashed rgba(124, 92, 255, 0.18); padding-bottom:8px;">
        pid 0x${Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0')} · ${new Date().toISOString().split('T')[1].split('.')[0]} UTC · stream: visual_pipeline.v2
      </div>
      <div id="ar-prog-log" style="min-height:200px; max-height:280px; overflow-y:auto;"></div>
      <div style="margin-top:12px; height:4px; border-radius:2px; background:rgba(124, 92, 255, 0.12); overflow:hidden;">
        <div id="ar-prog-bar" style="height:100%; width:0%; background:linear-gradient(90deg, #7c5cff, #b7a3ff); transition: width 0.12s linear;"></div>
      </div>
      <div style="margin-top:6px; font-size:9.5px; color:#5b6478; display:flex; justify-content:space-between;">
        <span id="ar-prog-percent">0%</span>
        <span>${elemCount} layer${elemCount === 1 ? '' : 's'} · ${tgtCount} target${tgtCount === 1 ? '' : 's'}</span>
      </div>
    </div>
  `;

  if (!document.getElementById('ar-prog-keyframes')) {
    const style = document.createElement('style');
    style.id = 'ar-prog-keyframes';
    style.textContent = `
      @keyframes ar-prog-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes ar-prog-fade { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(bg);
  const log = bg.querySelector('#ar-prog-log');
  const bar = bg.querySelector('#ar-prog-bar');
  const pct = bg.querySelector('#ar-prog-percent');

  steps.forEach((step, i) => {
    setTimeout(() => {
      const row = document.createElement('div');
      row.style.cssText = `animation: ar-prog-fade 0.18s ease-out; margin-bottom:2px;`;
      row.innerHTML = `
        <span style="color:#34d399; font-weight:700; margin-right:8px;">[✓]</span><span style="color:#c8f9e2;">${step.label}</span>
      `;
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      const p = Math.round(((i + 1) / steps.length) * 100);
      bar.style.width = p + '%';
      pct.textContent = p + '%';
    }, step.delay);
  });

  setTimeout(() => {
    bar.style.width = '100%';
    pct.textContent = '100%';
    const done = document.createElement('div');
    done.style.cssText = `margin-top:6px; padding-top:6px; border-top:1px dashed rgba(52, 211, 153, 0.25); animation: ar-prog-fade 0.2s ease-out;`;
    done.innerHTML = `<span style="color:#34d399; font-weight:700;">→</span> <span style="color:#a7f0d2;">done — ${stats.placedCount} placed, ${stats.droppedCount} dropped across ${stats.targetCount} canvas${stats.targetCount === 1 ? '' : 'es'}.</span>`;
    log.appendChild(done);

    const spinner = bg.querySelector('.ar-prog-spinner');
    if (spinner) {
      spinner.style.animation = 'none';
      spinner.style.borderColor = '#34d399';
      spinner.style.borderTopColor = '#34d399';
    }
  }, TOTAL_MS - 80);

  setTimeout(() => {
    bg.remove();
    if (typeof onComplete === 'function') onComplete();
  }, TOTAL_MS + 280);
}


// ----- Auto-Resize Settings modal (gear icon) -----------------------------

function openAutoResizeSettingsModal() {
  const s = getAutoResizeSettings();

  // Per-rule toggle UI was removed in v0.15.10. Placement rules are now
  // always-on; only cross-role relations and behaviour toggles are
  // user-configurable.
  const relationRows = [
    { id: 'r1', label: 'Logo ↔ RFWN edge alignment', desc: 'After both place individually, RFWN snaps to share the relevant safezone edge with the logo (top / bottom / right depending on aspect).' }
  ];

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal" style="max-width:560px;">
      <div class="modal-head">
        <h2 style="margin:0;">Auto-Resize Settings</h2>
        <div style="display:flex; align-items:center; gap:10px; margin-left:auto;">
          <span class="ar-engine-pill" title="Auto-Resize engine version — bumps independently of the Adflow app version on substantive rule changes.">Engine ${ENGINE_VERSION}</span>
          <button class="btn" id="ars-modal-close" title="Close dialog">Close</button>
        </div>
      </div>
      <style>
        .ars-row:hover { background: rgba(124, 92, 255, 0.07); }
        .ar-engine-pill {
          font-size: 10.5px;
          color: var(--accent-light, #b7a3ff);
          font-family: ui-monospace, "SF Mono", Consolas, Menlo, monospace;
          padding: 2px 8px;
          border: 1px solid rgba(124, 92, 255, 0.4);
          border-radius: 3px;
          font-weight: 600;
          letter-spacing: 0.3px;
          animation: ar-engine-pulse 2.6s ease-in-out infinite;
        }
        @keyframes ar-engine-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(124, 92, 255, 0);
            border-color: rgba(124, 92, 255, 0.4);
          }
          50% {
            box-shadow: 0 0 9px 1px rgba(124, 92, 255, 0.45);
            border-color: rgba(124, 92, 255, 0.75);
          }
        }
      </style>
      <div class="modal-body" style="max-height:70vh; overflow-y:auto; padding-top:8px;">
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px; line-height:1.45;">
          Cross-role relations and behaviour toggles. Placement rules themselves are baked into the engine and always on — bumping the engine version covers rule changes.
        </div>

        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin:14px 0 6px 0;">Cross-role relations</div>
        <div style="display:flex; flex-direction:column; gap:2px;">
          ${relationRows.map(r => `
            <label class="ars-row" style="display:flex; align-items:flex-start; gap:9px; padding:6px 8px; cursor:pointer; border-radius:4px;">
              <input type="checkbox" class="ars-rel" data-rel="${r.id}" ${s.relations[r.id] !== false ? 'checked' : ''} style="margin-top:3px; flex-shrink:0;" />
              <div style="flex:1; min-width:0;">
                <div style="font-size:12px; font-weight:600; color:var(--text-main); line-height:1.35;">${r.label}</div>
                <div style="font-size:10.5px; color:var(--text-muted); line-height:1.4; margin-top:2px;">${r.desc}</div>
              </div>
            </label>
          `).join('')}
        </div>

        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin:14px 0 6px 0;">Behaviour</div>
        <div style="display:flex; flex-direction:column; gap:2px;">
          <label class="ars-row" style="display:flex; align-items:flex-start; gap:9px; padding:6px 8px; cursor:pointer; border-radius:4px;">
            <input type="checkbox" id="ars-show-selection" ${s.behaviour.showCanvasSelection !== false ? 'checked' : ''} style="margin-top:3px; flex-shrink:0;" />
            <div style="flex:1; min-width:0;">
              <div style="font-size:12px; font-weight:600; color:var(--text-main); line-height:1.35;">Show canvas selection dialogue</div>
              <div style="font-size:10.5px; color:var(--text-muted); line-height:1.4; margin-top:2px;">On (default): the run modal pops up to pick targets each time. Off + progress overlay off = fully instant resize with no intermediate UI.</div>
            </div>
          </label>
          <label class="ars-row" style="display:flex; align-items:flex-start; gap:9px; padding:6px 8px; cursor:pointer; border-radius:4px;">
            <input type="checkbox" id="ars-include-unassigned" ${s.behaviour.includeUnassigned ? 'checked' : ''} style="margin-top:3px; flex-shrink:0;" />
            <div style="flex:1; min-width:0;">
              <div style="font-size:12px; font-weight:600; color:var(--text-main); line-height:1.35;">Include unassigned elements by default</div>
              <div style="font-size:10.5px; color:var(--text-muted); line-height:1.4; margin-top:2px;">Used by the bypass path; pre-fills the dialogue's checkbox otherwise. Default off.</div>
            </div>
          </label>
          <label class="ars-row" style="display:flex; align-items:flex-start; gap:9px; padding:6px 8px; cursor:pointer; border-radius:4px;">
            <input type="checkbox" id="ars-cover" ${s.behaviour.allowCoverFallback !== false ? 'checked' : ''} style="margin-top:3px; flex-shrink:0;" />
            <div style="flex:1; min-width:0;">
              <div style="font-size:12px; font-weight:600; color:var(--text-main); line-height:1.35;">Allow cover fallback for main image</div>
              <div style="font-size:10.5px; color:var(--text-muted); line-height:1.4; margin-top:2px;">Switch from contain to cover when fill &lt; 60% of slot. Off: always contain even if visually small.</div>
            </div>
          </label>
          <label class="ars-row" style="display:flex; align-items:flex-start; gap:9px; padding:6px 8px; cursor:pointer; border-radius:4px;">
            <input type="checkbox" id="ars-progress" ${s.showProgress !== false ? 'checked' : ''} style="margin-top:3px; flex-shrink:0;" />
            <div style="flex:1; min-width:0;">
              <div style="font-size:12px; font-weight:600; color:var(--text-main); line-height:1.35;">Show technical progress overlay</div>
              <div style="font-size:10.5px; color:var(--text-muted); line-height:1.4; margin-top:2px;">~2–3s pipeline-style loading panel during the run. Off: results appear instantly.</div>
            </div>
          </label>
        </div>

        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin:14px 0 6px 0;">Live linking</div>
        <div style="display:flex; flex-direction:column; gap:2px;">
          <label class="ars-row" style="display:flex; align-items:flex-start; gap:9px; padding:6px 8px; cursor:pointer; border-radius:4px;">
            <input type="checkbox" id="ars-ll-enabled" ${s.behaviour.liveLink.enabled !== false ? 'checked' : ''} style="margin-top:3px; flex-shrink:0;" />
            <div style="flex:1; min-width:0;">
              <div style="font-size:12px; font-weight:600; color:var(--text-main); line-height:1.35;">Enable live linking for auto-resized elements</div>
              <div style="font-size:10.5px; color:var(--text-muted); line-height:1.4; margin-top:2px;">When on, every target element joins the source's link group with real-time propagation — edits on the source update every target instantly. Off: target elements are independent copies after the resize completes.</div>
            </div>
          </label>
          <div id="ars-ll-sub" style="display:flex; flex-direction:column; gap:2px; margin-left:24px; padding-left:8px; border-left:1px solid var(--border-light);">
            <label class="ars-row" style="display:flex; align-items:flex-start; gap:9px; padding:5px 8px; cursor:pointer; border-radius:4px;">
              <input type="checkbox" id="ars-ll-text" ${s.behaviour.liveLink.syncText !== false ? 'checked' : ''} style="margin-top:3px; flex-shrink:0;" />
              <div style="flex:1; min-width:0;">
                <div style="font-size:11.5px; font-weight:600; color:var(--text-main); line-height:1.3;">Text content</div>
                <div style="font-size:10px; color:var(--text-muted); line-height:1.35;">Edits to the headline / CTA / RFWN text propagate to every linked target.</div>
              </div>
            </label>
            <label class="ars-row" style="display:flex; align-items:flex-start; gap:9px; padding:5px 8px; cursor:pointer; border-radius:4px;">
              <input type="checkbox" id="ars-ll-font" ${s.behaviour.liveLink.syncFont !== false ? 'checked' : ''} style="margin-top:3px; flex-shrink:0;" />
              <div style="flex:1; min-width:0;">
                <div style="font-size:11.5px; font-weight:600; color:var(--text-main); line-height:1.3;">Font family + weight</div>
                <div style="font-size:10px; color:var(--text-muted); line-height:1.35;">Changing the typeface or weight syncs across canvases. Font SIZE is always independent per canvas.</div>
              </div>
            </label>
            <label class="ars-row" style="display:flex; align-items:flex-start; gap:9px; padding:5px 8px; cursor:pointer; border-radius:4px;">
              <input type="checkbox" id="ars-ll-color" ${s.behaviour.liveLink.syncColor !== false ? 'checked' : ''} style="margin-top:3px; flex-shrink:0;" />
              <div style="flex:1; min-width:0;">
                <div style="font-size:11.5px; font-weight:600; color:var(--text-main); line-height:1.3;">Colour / fill</div>
                <div style="font-size:10px; color:var(--text-muted); line-height:1.35;">Text colour, button fill + stroke, shape fill + stroke, line colour. Background colours included for text.</div>
              </div>
            </label>
            <label class="ars-row" style="display:flex; align-items:flex-start; gap:9px; padding:5px 8px; cursor:pointer; border-radius:4px;">
              <input type="checkbox" id="ars-ll-opacity" ${s.behaviour.liveLink.syncOpacity !== false ? 'checked' : ''} style="margin-top:3px; flex-shrink:0;" />
              <div style="flex:1; min-width:0;">
                <div style="font-size:11.5px; font-weight:600; color:var(--text-main); line-height:1.3;">Opacity</div>
                <div style="font-size:10px; color:var(--text-muted); line-height:1.35;">Per-element opacity / alpha changes sync across canvases.</div>
              </div>
            </label>
            <label class="ars-row" style="display:flex; align-items:flex-start; gap:9px; padding:5px 8px; cursor:pointer; border-radius:4px;">
              <input type="checkbox" id="ars-ll-anim" ${s.behaviour.liveLink.syncAnimations !== false ? 'checked' : ''} style="margin-top:3px; flex-shrink:0;" />
              <div style="flex:1; min-width:0;">
                <div style="font-size:11.5px; font-weight:600; color:var(--text-main); line-height:1.3;">Animations + effects</div>
                <div style="font-size:10px; color:var(--text-muted); line-height:1.35;">In-transitions (Fade in, Slide up, etc.) and continuous effects (Pulse, Wiggle, Spin) sync across canvases.</div>
              </div>
            </label>
          </div>
          <div style="font-size:10px; color:var(--text-muted); padding:4px 8px 0 8px; font-style:italic; line-height:1.4;">
            Position, size, and font size are always independent per canvas — that's the point of the resize.
          </div>
        </div>
      </div>
      <div class="modal-foot" style="display:flex; justify-content:space-between; gap:8px;">
        <button class="btn" id="ars-reset" style="color:var(--text-muted);">Reset to defaults</button>
        <div style="display:flex; gap:8px;">
          <button class="btn" id="ars-cancel">Cancel</button>
          <button class="btn primary" id="ars-save">Save</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(bg);

  const close = () => {
    bg.remove();
    document.removeEventListener('keydown', escHandler);
  };
  const escHandler = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', escHandler);

  bg.querySelector('#ars-modal-close').onclick = close;
  bg.querySelector('#ars-cancel').onclick = close;
  bg.onclick = (e) => { if (e.target === bg) close(); };

  // Dim the live-link sub-toggles when the master toggle is off so the
  // hierarchy of choices is visually obvious.
  const llMaster = bg.querySelector('#ars-ll-enabled');
  const llSub    = bg.querySelector('#ars-ll-sub');
  const syncLlDim = () => {
    if (llSub) {
      llSub.style.opacity = llMaster.checked ? '1' : '0.4';
      llSub.style.pointerEvents = llMaster.checked ? '' : 'none';
    }
  };
  if (llMaster) {
    llMaster.addEventListener('change', syncLlDim);
    syncLlDim();
  }

  bg.querySelector('#ars-reset').onclick = () => {
    state.autoResizeSettings = JSON.parse(JSON.stringify(AUTO_RESIZE_DEFAULT_SETTINGS));
    close();
    openAutoResizeSettingsModal();
  };

  bg.querySelector('#ars-save').onclick = () => {
    const next = getAutoResizeSettings();
    // Per-rule toggles were removed from the UI in v0.15.10 — every
    // placement rule is always on. The rulesEnabled object is preserved
    // for forward-compat but no longer mutated from this modal.
    bg.querySelectorAll('.ars-rel').forEach(cb => {
      next.relations[cb.dataset.rel] = cb.checked;
    });
    next.behaviour.showCanvasSelection = bg.querySelector('#ars-show-selection').checked;
    next.behaviour.includeUnassigned   = bg.querySelector('#ars-include-unassigned').checked;
    next.behaviour.allowCoverFallback  = bg.querySelector('#ars-cover').checked;
    next.behaviour.showProgress        = bg.querySelector('#ars-progress').checked;
    next.behaviour.liveLink = {
      enabled:        bg.querySelector('#ars-ll-enabled').checked,
      syncText:       bg.querySelector('#ars-ll-text').checked,
      syncFont:       bg.querySelector('#ars-ll-font').checked,
      syncColor:      bg.querySelector('#ars-ll-color').checked,
      syncOpacity:    bg.querySelector('#ars-ll-opacity').checked,
      syncAnimations: bg.querySelector('#ars-ll-anim').checked
    };
    next.showProgress                  = next.behaviour.showProgress;
    state.autoResizeSettings = next;
    pushHistory();
    close();
    showCanvasNotification('Auto-Resize settings saved.', { type: 'success' });
  };
}


// ----- DOM event listeners (attach the buttons to engine entry points) ----
// Attached at module-evaluation time. These elements must exist in the DOM
// by the time this script runs — script tags are at the end of <body>, so
// the buttons are already parsed when we get here.

// Auto-Resize button dispatcher. When the canvas-selection setting is on
// (default), opens the run modal. When off, skips straight to the engine
// with all other canvases as targets — combined with `showProgress` off,
// the resize is fully instant (no intermediate UI at all).
function handleAutoResizeClick() {
  const settings = getAutoResizeSettings();
  if (settings.behaviour.showCanvasSelection !== false) {
    openAutoResizeModal();
    return;
  }
  const src = getActiveCanvas();
  if (!src) {
    showCanvasNotification('Select a source canvas first (click its header).', { type: 'warning' });
    return;
  }
  const targetIds = state.canvases.filter(c => c.id !== src.id).map(c => c.id);
  if (targetIds.length === 0) {
    showCanvasNotification('No other canvases to resize into.', { type: 'warning' });
    return;
  }
  runRuleBasedAutoResize({
    sourceId: src.id,
    targetIds,
    includeUnassigned: settings.behaviour.includeUnassigned === true
  });
}

document.getElementById('btn-ai-resize')?.addEventListener('click', handleAutoResizeClick);
document.getElementById('btn-ai-resize-settings')?.addEventListener('click', openAutoResizeSettingsModal);
