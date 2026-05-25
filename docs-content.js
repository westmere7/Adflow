// ============================================================================
// docs-content.js — In-app documentation + changelog content/UI
// ============================================================================
// Everything related to the Help → Documentation modal and the Version &
// Changelog modal lives here:
//   - DOCS_SECTIONS: the structured content tree (sections → subs → body HTML)
//   - openDocumentation / renderDocsPanel: modal scaffolding + sidebar nav
//   - CHANGELOG_DATA: per-release entry list (newest first)
//   - generateChangelogHtml: shared renderer for the changelog and the
//     post-update splash
//   - openChangelogModal: standalone changelog viewer
//
// Loaded BEFORE script.js so its top-level functions and constants are
// available globally. Depends on script.js globals (openModal,
// syncAdflowLogos) only at click-time — never at load-time.
//
// The post-update splash (checkVersionUpdate) stays in script.js because it
// is tightly bound to the boot flow and hardcoded currentVersion check.
// ============================================================================

const DOCS_SECTIONS = [
  {
    id: 'getting-started', title: 'Getting Started',
    subs: [
      { id: 'welcome', title: 'Welcome to Adflow', body: `
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="data/Elements/Adflow_logo.svg" alt="Adflow Logo" data-adflow-logo style="max-width: 140px; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));">
        </div>
        <p>Adflow is a browser-based design tool for animated HTML5 display ads. Lay out every banner size side-by-side in one project, sync them with <a href="#" data-doc-sec="multi-canvas" data-doc-sub="auto-link" style="color:var(--accent-light); font-weight: 500;">Link Groups</a>, mail-merge a spreadsheet to generate dozens of versions, and export Google-Ads-compliant ZIPs in a click.</p>
        <p style="color:var(--text-muted);">Two ideas to start with — read the next two pages even if you skip the rest:</p>
        <ul><li><b>Multi-canvas + Link Groups</b> — every size in one workspace, edits sync automatically.</li><li><b>Auto-Resize from Selected</b> — design one banner, generate every size, all link-grouped.</li></ul>
      `},
      { id: 'multi-canvas-concept', title: 'The multi-canvas idea', body: `
        <p>Instead of opening one file per banner size, Adflow shows every canvas (300×250, 728×90, 160×600, …) side-by-side on an infinite workspace. You pan with <span class="kbd">Space</span>+drag, zoom with the scroll wheel.</p>
        <p>The win: when you edit a headline on the 728×90, you don't repeat the edit on the other 5 sizes. <b>Link Groups</b> bind siblings across canvases — a change on one propagates to all of them (immediately if Live-link is on, on demand otherwise).</p>
        <p>See <a href="#" data-doc-sec="multi-canvas" data-doc-sub="auto-link" style="color:var(--accent-light); font-weight: 500;">Link Groups</a> for the full mechanics.</p>
      `},
      { id: 'auto-resize-glance', title: 'Auto-Resize at a glance', body: `
        <p>Design <b>one</b> canvas exactly how you want it. Click <b>Auto-resize</b> at the bottom of the left panel (or right-click any canvas and pick <b>Auto-Resize</b> at the top of the menu). A rule-based engine reads each element's role (heading, button, logo, background, CRICOS, RFWN, image…), wipes the other canvases, and rebuilds them with format-aware placements — auto-linking everything so future edits stay in sync.</p>
        <p style="color:var(--text-muted);">Full breakdown under <a href="#" data-doc-sec="auto-resize" data-doc-sub="auto-resize-overview" style="color:var(--accent-light); font-weight: 500;">Auto-Resize ✨</a>.</p>
      `},
      { id: 'first-project', title: 'Your first project', body: `
        <ol>
          <li><b>File → New Project…</b>, tick the sizes you need, name it, set the default background and ad-weight limit.</li>
          <li>Pick the size closest to your intended layout. Add a heading, subheading, button, and your logo.</li>
          <li>Click that canvas, then hit <b>Auto-resize</b> at the bottom of the left panel to fill in the rest of the sizes.</li>
          <li>Refine. Add per-frame animation if you want movement.</li>
          <li><b>Export</b> from the top bar → ZIP per canvas, ready to upload.</li>
        </ol>
      `},
    ]
  },
  {
    id: 'workspace', title: 'Workspace',
    subs: [
      { id: 'canvases-navigation', title: 'Canvases & navigation', body: `
        <ul>
          <li><b>Add a canvas:</b> the <b>+</b> button in the left Canvases panel — pick a standard IAB size or enter custom dimensions.</li>
          <li><b>Active canvas:</b> click any canvas to focus the side panels on it. Renames via double-click on its title.</li>
          <li><b>Navigate:</b> <span class="kbd">Space</span>+drag to pan, scroll wheel to zoom. Click the zoom % in the top bar to reset. <span class="kbd">Tab</span> toggles Fullscreen.</li>
          <li><b>Canvas right-click:</b> Preview, Export HTML5/PNG, background, clear. The sidebar entry's right-click adds clone/delete.</li>
          <li><b>Crop to canvas:</b> <b>File → Settings</b> — clips elements that bleed outside a canvas for a true export preview.</li>
        </ul>
      `},
      { id: 'layers-persistence', title: 'Layers & persistence', body: `
        <p>Each canvas has a layer stack in the left Layers panel.</p>
        <ul>
          <li><b>Reorder:</b> drag layers, or <span class="kbd">Ctrl</span>+<span class="kbd">[</span> / <span class="kbd">Ctrl</span>+<span class="kbd">]</span>.</li>
          <li><b>Group:</b> select layers, <span class="kbd">Ctrl</span>+<span class="kbd">G</span>. Double-click a group to <b>isolate</b> and edit inside.</li>
          <li><b>Layer sections</b> in the panel: <i>Main Layers</i> (default — visible only on the active frame, driven by the timeline), <i>Always Bottom</i> (background, painted under every frame), <i>Always Top</i> (overlay painted above every frame — typical for logos and compliance text). Drag a layer between sections to change its persistence.</li>
        </ul>
      `},
      { id: 'assets-panel', title: 'Assets panel', body: `
        <ul>
          <li><b>Save:</b> select an element/group → <b>+</b> in the Assets panel header. Preserves styles, content, and animations.</li>
          <li><b>Folders:</b> the folder icon. Double-click to rename custom folders.</li>
          <li><b>Drop files in:</b> drag PNG / JPEG / SVG from your file manager into the panel or a folder. Or <b>+</b> → upload.</li>
          <li><b>Hover-preview thumbnail:</b> hover a row to see a small thumbnail next to it.</li>
          <li><b>RMIT folder:</b> a read-only set of brand assets (logos, Cricos text) preloaded for you.</li>
          <li><b>Place on canvas:</b> drag onto a canvas, or double-click to drop in the centre.</li>
        </ul>
      `},
      { id: 'alignment-snapping', title: 'Alignment & snapping', body: `
        <ul>
          <li><b>Magnetic snap:</b> canvas edges, centres, sibling layers, custom guides. Toggle in the workspace right-click menu.</li>
          <li><b>Rulers & guides:</b> enable rulers, drag from a ruler into a canvas to drop a guide. Drag the guide back to the ruler to remove.</li>
          <li><b>Nudging:</b> arrow keys = 1px; <span class="kbd">Shift</span>+arrows = 10px.</li>
        </ul>
      `},
    ]
  },
  {
    id: 'designing', title: 'Designing Elements',
    subs: [
      { id: 'text-typography', title: 'Text & typography', body: `
        <p>Add a text layer from the left panel (or right-click the canvas). Double-click to edit inline.</p>
        <ul>
          <li>Brand fonts pre-installed (Museo Sans, RMIT Lato, Helvetica Neue).</li>
          <li>Per-layer controls: size, weight, alignment, line-height, letter-spacing.</li>
          <li>Background fill behind text supports adjustable padding and coverage; with a typing IN animation, sweeps in line-by-line.</li>
        </ul>
      `},
      { id: 'cta-buttons', title: 'CTA buttons', body: `
        <p>Buttons are specialised text boxes with auto-hug padding, stroke widths, and a fill. Right-click to convert text into a button. Hover state available for interactive previews.</p>
      `},
      { id: 'images-svg', title: 'Images & SVG', body: `
        <p>Drop image files anywhere onto the workspace or insert via the Add panel. Aspect ratio is locked by default — hold <span class="kbd">Shift</span> while resizing to stretch.</p>
        <p><b>WebP compression:</b> Adflow includes a built-in compressor for PNG/JPEG uploads — quality slider (10–100%), live KB preview, helps you stay under the Google Ads weight limit.</p>
      `},
      { id: 'shapes', title: 'Shapes & Image Masking', body: `
        <p>Rectangles, circles, and lines from the Add panel. Adjust fill, stroke, corner radius from the Properties panel.</p>
        <p><b>Image Masking:</b> Right-click a shape layer (rectangle, circle, or pixel) and select <b>Use as Mask</b> to clip the image directly beneath it. The mask constraint validates automatically — if the masked image is deleted or moved, the mask safely reverts to a normal shape layer.</p>
      `},
      { id: 'advanced-masking', title: 'Advanced Masking Engine', body: `
        <p>The image masking system is extremely robust and natively mirrored in the HTML5 exporter.</p>
        <ul>
          <li><b>Independent Animation:</b> Mask shapes carry their own independent entry transitions and effects separate from the image they mask. Hovering animation presets previews the mask or image accurately.</li>
          <li><b>Layer Prefixes:</b> Mask layers display a <span style="color: var(--accent-light);">[mask]</span> prefix, and target images display a <span style="color: var(--accent-light); opacity: 0.7;">[masked]</span> prefix in the Layers panel.</li>
          <li><b>Link Group Restraint:</b> A mask is a per-canvas effect and cannot be linked across canvases. The <a href="#" data-doc-sec="multi-canvas" data-doc-sub="live-link-mode" style="color:var(--accent-light); font-weight: 500;">Live-Link mode</a> and Dynamic Data panels will display a concise warning when selecting a mask layer.</li>
        </ul>
      `},
      { id: 'color-picker', title: 'Color picker & gradients', body: `
        <p>The custom picker (powered by Iro.js) supports:</p>
        <ul>
          <li>Solid HEX, alpha-aware.</li>
          <li>Linear and radial gradients with multi-stop editing.</li>
          <li>Native eyedropper on Chromium browsers.</li>
        </ul>
      `},
    ]
  },
  {
    id: 'animation', title: 'Animation',
    subs: [
      { id: 'frames-timeline', title: 'Frames & timeline', body: `
        <p>Add frames to the timeline at the top of the workspace. Each frame has its own duration (seconds). Toggle global <b>Loop</b> to repeat the whole timeline.</p>
        <p><b>Skip frame:</b> mark a frame as skipped to hide it in preview/export (max 1 skipped frame).</p>
      `},
      { id: 'frame-transitions', title: 'Frame transitions', body: `
        <p>Set how each frame enters: <b>Fade</b>, <b>Slide</b> (4 directions), <b>Swipe</b> (4 directions — a directional wipe that reveals the next frame). Slide and Swipe also offer an <b>Add Fade</b> toggle and adjustable duration.</p>
      `},
      { id: 'entrance-animations', title: 'Entrance animations', body: `
        <p>Per-element IN animations played when a frame begins: Pop-in, Fade, Slide, Typing. Each has duration, delay, and an optional fade. Stagger them by adjusting delays.</p>
      `},
      { id: 'continuous-effects', title: 'Continuous effects', body: `
        <p>Looping, non-destructive effects that overlay on top of the frame state: Pan, Zoom, Float, Pulse, Wiggle, Spin, Heartbeat, Flash. Toggle <b>Perform once</b> to play a single cycle instead of looping.</p>
      `},
    ]
  },
  {
    id: 'multi-canvas', title: 'Link Groups',
    subs: [
      { id: 'auto-link', title: 'Auto-Link', body: `
        <p><b>Auto-Link</b> in the sidebar scans all canvases and groups matching elements by layer name + type. Use <b>Selected only</b> to target just the active layer.</p>
        <p>Best paired with consistent layer names (rename via the Layers panel).</p>
      `},
      { id: 'manual-linking', title: 'Manual linking', body: `
        <p>Right-click an element → <b>Link Group</b> shows "Linked to: [Name]" if already in the group, or "Link to: [Name]" otherwise. From the Link Groups panel you can also create a new group or merge groups.</p>
      `},
      { id: 'sync-properties', title: 'Sync properties', body: `
        <p>Per group, control what propagates: Text content, Font settings, Font size (separate so you can scale per canvas), Colors (text), Background (text background settings), Colors & Fill, Stroke, Transform (Width/Height), Opacity, IN Animations, Effects.</p>
      `},
      { id: 'live-link-mode', title: 'Live-Link mode', body: `
        <p>The ⚡ lightning-bolt toggle on a group. When on, every edit on one sibling fires the same update on all the others in real time — dragging, resizing, typing, recolouring.</p>
      `},
      { id: 'manual-push', title: 'Manual push', body: `
        <p>Live-link off? Use <b>Push changes to group</b> in the right-click menu (or the side-panel button) to broadcast on demand.</p>
      `},
    ]
  },
  {
    id: 'auto-resize', title: 'Auto-Resize ✨',
    subs: [
      { id: 'auto-resize-overview', title: 'Overview & philosophy', body: `
        <p>Adflow's Auto-Resize is a <b>deterministic rule-based placement engine</b> — not a generative model, not an LLM, not a black box. Given a source canvas you've designed, it propagates every element to every other canvas at format-appropriate positions, sizes, and font sizes, using parametric formulas tuned against a hand-built reference set of six canvas geometries.</p>

        <p>Engine version is tracked independently of the Adflow app version. Bumping the engine on substantive rule or behaviour changes means a project's resize output is reproducible for that specific engine generation. The version pill in the Settings modal (and the technical progress overlay) surfaces the running engine — currently <b>v2.7</b>.</p>

        <p><b>Design principles:</b></p>
        <ul>
          <li><b>Per-target independence.</b> Each target canvas is computed from the source independently — no shared state between targets, parallelisable in principle.</li>
          <li><b>Single undo step.</b> The whole resize collapses into one history entry. <span class="kbd">Ctrl+Z</span> restores every canvas at once.</li>
          <li><b>Source canvas inviolate.</b> The source is never mutated; only its roles are re-detected.</li>
          <li><b>No-drop policy.</b> Every element with a known role lands somewhere on every target — never silently lost. Only role <code>misc</code> elements can be dropped, and only when "Include unassigned" is off.</li>
          <li><b>Parametric, not table-driven.</b> Rule formulas reference <code>canvas.w</code>, <code>canvas.h</code>, <code>sqrt(area)</code>, <code>aspect</code>, <code>min/max</code> — they generalise to canvas sizes the engine has never seen.</li>
        </ul>

        <p><b>Two entry points:</b></p>
        <ul>
          <li>The <b>Auto-resize</b> button anchored at the bottom of the left panel column. Respects the canvas-selection-dialogue setting — can be made one-click instant.</li>
          <li>The canvas right-click menu → <b>Auto-Resize</b> (top of the menu, directly under Preview). Always opens the canvas-selection dialogue.</li>
        </ul>
      `},

      { id: 'roles-taxonomy', title: 'The 9-role taxonomy', body: `
        <p>Every element on the source canvas is classified into one of 10 roles. Nine carry placement rules; <code>misc</code> is the unassigned fallback.</p>

        <table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0 14px 0;">
          <thead>
            <tr style="border-bottom:1px solid var(--border-light); text-align:left; color:var(--text-muted);">
              <th style="padding:6px 8px;">Role</th>
              <th style="padding:6px 8px;">Priority</th>
              <th style="padding:6px 8px;">Strategy</th>
              <th style="padding:6px 8px;">Required</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>background-image</code></td><td style="padding:5px 8px;">1</td><td style="padding:5px 8px;">source-mirror</td><td style="padding:5px 8px;">no</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>rmit-logo</code></td><td style="padding:5px 8px;">3</td><td style="padding:5px 8px;">anchor (top-right)</td><td style="padding:5px 8px;">yes</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>cta-button</code></td><td style="padding:5px 8px;">4</td><td style="padding:5px 8px;">anchor (tall / wide)</td><td style="padding:5px 8px;">no</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>heading</code></td><td style="padding:5px 8px;">5</td><td style="padding:5px 8px;">anchor (top-left)</td><td style="padding:5px 8px;">yes</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>subheading</code></td><td style="padding:5px 8px;">6</td><td style="padding:5px 8px;">anchor → heading</td><td style="padding:5px 8px;">yes</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>cricos</code></td><td style="padding:5px 8px;">7</td><td style="padding:5px 8px;">anchor (canvas bot-left)</td><td style="padding:5px 8px;">yes</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>main-image</code></td><td style="padding:5px 8px;">7</td><td style="padding:5px 8px;">slot-search</td><td style="padding:5px 8px;">no</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>rfwn</code></td><td style="padding:5px 8px;">8</td><td style="padding:5px 8px;">anchor + R1 snap to logo</td><td style="padding:5px 8px;">no</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>extra-info</code></td><td style="padding:5px 8px;">9</td><td style="padding:5px 8px;">slot-search</td><td style="padding:5px 8px;">no</td></tr>
            <tr><td style="padding:5px 8px;"><code>misc</code></td><td style="padding:5px 8px;">99</td><td style="padding:5px 8px;">centred or dropped</td><td style="padding:5px 8px;">—</td></tr>
          </tbody>
        </table>

        <p><b>Priority drives placement order.</b> The engine sorts source elements by their role's priority before placing, so later rules (e.g. main-image at priority 7) can read the geometry of already-placed earlier rules (heading at 5, cta at 4) via <code>ctx.placedElements[role]</code>. This enables slot-search rules to compute "the largest empty rectangle remaining" deterministically.</p>

        <p><b>Required roles</b> never drop. If a placement rule returns null (slot crushed beyond viability), a fallback geometry is supplied so the element always lands somewhere on every target.</p>
      `},

      { id: 'role-detection', title: 'Role detection & manual override', body: `
        <p>The detector — <code>autoAssignRole(el, canvas)</code> — runs a layered heuristic ladder. The first match wins:</p>

        <ol>
          <li><b>Layer name match</b> (highest trust): <code>name === 'rfwn'</code>, <code>name.includes('logo')</code>, <code>name === 'background'</code>, <code>name.includes('headline')</code>, etc. If you've named your layers, the detector trusts you.</li>
          <li><b>Text content match</b> for text elements: <code>'cricos'</code> or <code>/\\brto\\b/</code> → cricos. <code>'ready for' + 'next'</code> → rfwn.</li>
          <li><b>Ranking-based match</b> for text elements: largest <code>fontSize</code> on the canvas → heading. Second largest → subheading. <code>persistent === 'top'</code> with no other match → cricos.</li>
          <li><b>Type + aspect match</b> for images: <code>aspect ≥ 2.0</code> AND <code>area &lt; 0.18</code> → rmit-logo (the RMIT lockup has a 2.85:1 ratio and is typically &lt;10% of canvas area). <code>area ≥ 0.7</code> OR <code>persistent === 'bottom'</code> → background-image.</li>
          <li><b>Type fallback</b>: buttons → cta-button, images → main-image, shapes → misc, loose text → extra-info.</li>
        </ol>

        <p><b>Detection is idempotent and refreshing.</b> Every <code>render()</code> call re-runs the detector on auto-assigned roles (where <code>el.roleAuto === true</code>), so improvements to the detector's heuristics take effect on existing projects automatically without manual reset. Roles you've manually set are locked (<code>el.roleAuto === false</code>) and never re-detected.</p>

        <p><b>Manual override.</b> A third icon column in the Layers panel — between the layer name and the lock/visibility eyes — shows each element's role status. Click to open a popup listing all 10 roles plus a "Reset to auto-detect" entry. Manually-assigned roles render the icon in <span style="color:var(--accent-base); font-weight:600;">accent purple</span>; auto-detected ones render in muted grey. Hover the icon for a tooltip naming the current role.</p>
      `},

      { id: 'placement-rules', title: 'Placement rules — anchors & formulas', body: `
        <p>Each rule is a pure function — <code>placer(srcEl, target, ctx) → {x, y, width, height, fontSize?, maxFontSize?, textAlign?}</code> or <code>null</code>. Returning these fields produces the final geometry; the executor clones the source element and applies these properties to the clone.</p>

        <h4 style="color:var(--accent-light); margin:16px 0 4px 0;">background-image · priority 1</h4>
        <p><b>Source-mirror strategy.</b> Normalises the source rect against the source canvas (<code>x/srcW</code>, <code>y/srcH</code>, <code>w/srcW</code>, <code>h/srcH</code>), then re-applies the same ratios on the target. Fast-path detects 100% canvas fills (<code>(0, 0, 1, 1)</code>) and emits exact canvas dimensions — covers the most common case where the background is just a coloured rect filling the canvas.</p>

        <h4 style="color:var(--accent-light); margin:16px 0 4px 0;">rmit-logo · priority 3 · required</h4>
        <p>Always top-right of safezone. No mode switching since v2.5.</p>
        <ul>
          <li><b>Height:</b> <code>clamp(15, h × 0.2 + 8, 30)</code> on banners (<code>h ≤ 100</code>); <code>clamp(15, sqrt(w × h) × 0.075, 40)</code> otherwise.</li>
          <li><b>Width:</b> derived from the source asset's intrinsic aspect ratio (~2.85 for the RMIT lockup). Width = <code>height × srcAspect</code>.</li>
          <li><b>Tall format shrink:</b> on canvases where <code>h &gt; w</code>, height is multiplied by 0.75 so the logo shares the top row comfortably with RFWN top-left.</li>
        </ul>

        <h4 style="color:var(--accent-light); margin:16px 0 4px 0;">cta-button · priority 4</h4>
        <p>Two modes by canvas aspect.</p>
        <ul>
          <li><b>Tall mode</b> (<code>aspect ≤ 2.0</code>): bot-center of safezone. Height <code>clamp(14, sqrt(area) × 0.11, 53)</code>, width <code>clamp(70, height × 3.7, min(200, safezone.w))</code>. Vertical offset from safezone bottom: <code>clamp(15, h × 0.04, 30)</code>.</li>
          <li><b>Wide mode</b> (<code>aspect &gt; 2.0</code>): mid-right, button-right edge at <code>canvas.w × 0.84</code>, vertically centred in the canvas. Width <code>clamp(70, height × 4.2, 200)</code>.</li>
        </ul>

        <h4 style="color:var(--accent-light); margin:16px 0 4px 0;">heading · priority 5 · required</h4>
        <p>Top-left of safezone (or vertically centred on wide banners). Width adapts by canvas mode:</p>
        <ul>
          <li><b>Stack</b> (<code>h ≥ 300</code>): full <code>safezone.w</code>.</li>
          <li><b>Wide banner</b> (<code>h ≤ 100</code>, <code>aspect &gt; 2</code>): <code>clamp(80, w × 0.42, 400)</code>; heading box is vertically centred in canvas so the side-by-side heading + subhead pair sits at canvas mid-y.</li>
          <li><b>Square-ish</b>: <code>clamp(120, safezone.w × 0.55, 270)</code>.</li>
        </ul>
        <ul>
          <li><b>Font size:</b> <code>clamp(9, h × 0.22, 22)</code> on banners (<code>h ≤ 100</code>); <code>clamp(16, sqrt(area) × 0.07, 35)</code> on mid canvases; <code>clamp(22, sqrt(area) × 0.08, 46)</code> on stack mode.</li>
          <li><b>maxFontSize is locked</b> to the computed font, so the source's autoSize cap (often 68 pt) can't blow past the per-canvas decision.</li>
          <li><b>Wrap budget</b> (heading.height): 2 lines on banners, 3 lines on stack mode, 4 lines on narrow skyscrapers (<code>w &lt; 200</code>). Sized to track expected text rather than reserve generous trailing padding.</li>
        </ul>

        <h4 style="color:var(--accent-light); margin:16px 0 4px 0;">subheading · priority 6 · required</h4>
        <p>Anchored to <code>heading.bottom-left</code> with a 4-px gap below the heading box. Width inherits from heading.</p>
        <ul>
          <li><b>Font:</b> <code>clamp(8, h × 0.18, 11)</code> for tiny banners (<code>h ≤ 60</code>); <code>clamp(14, h × 0.18, 18)</code> for <code>h ≤ 100</code>; <code>clamp(14, sqrt(area) × 0.06, 28)</code> otherwise.</li>
          <li><b>Side-by-side mode:</b> on tight horizontal banners (<code>h ≤ 100</code>), subhead sits to the <b>right</b> of heading instead of below — vertically centred on heading's middle.</li>
          <li><b>No-drop fallback:</b> if no heading was placed (rare), subhead parks at safezone top-left.</li>
        </ul>

        <h4 style="color:var(--accent-light); margin:16px 0 4px 0;">cricos · priority 7 · required</h4>
        <p>Bot-left of <b>canvas</b> (not safezone — legal compliance text traditionally hugs the canvas edge).</p>
        <ul>
          <li><b>Font (dual-source):</b> <code>max(minDim × 0.023, w × 0.008)</code> capped at 7 and floored at 4. Width-based contribution kicks in on banners where minDim is too small to give cricos a legible font.</li>
          <li><b>Width:</b> hugs content scaled from source.</li>
        </ul>

        <h4 style="color:var(--accent-light); margin:16px 0 4px 0;">main-image · priority 7</h4>
        <p>Slot-search strategy. Computes the largest empty rectangle remaining after heading + subheading + CTA + logo have placed:</p>
        <ul>
          <li><b>Stack mode</b> (<code>h ≥ w</code>): slot from <code>(safezone.x, subheading.bottom + gapY)</code> to <code>(safezone.right, cta.top - gapY)</code>.</li>
          <li><b>Side-by-side</b> (<code>h &lt; w</code>): slot from <code>(heading.right + gapX, safezone.y)</code> to <code>(cta.left - gapX, safezone.bottom)</code>.</li>
        </ul>
        <ul>
          <li><b>Fitting strategy:</b> contain by source aspect first.</li>
          <li><b>Cover fallback:</b> when contain would leave the image filling less than 60% of the slot's larger dimension, switch to cover mode (fill the slot, allow canvas-edge clipping). Toggleable in settings.</li>
          <li><b>No-drop:</b> 24-px floor on width and height — image never shrinks below visibility.</li>
        </ul>

        <h4 style="color:var(--accent-light); margin:16px 0 4px 0;">rfwn · priority 8</h4>
        <p>Two modes.</p>
        <ul>
          <li><b>Top-left</b> (<code>aspect ≤ 2.0</code>): tucked into safezone top-left, <code>textAlign: 'left'</code>.</li>
          <li><b>Bot-right</b> (<code>aspect &gt; 2.0</code>): tucked into safezone bot-right, <code>textAlign: 'right'</code>.</li>
        </ul>
        <ul>
          <li><b>Text always justifies toward the closest canvas edge — never centred.</b></li>
          <li><b>Font:</b> <code>clamp(5, sqrt(area) × 0.032, 17)</code>; scaled by 0.8 on tall formats so it doesn't crowd the logo.</li>
          <li><b>Width:</b> <code>clamp(35, fontSize × 6.8, 100)</code> — sized to fit "what's next" (the longer of the two natural wrap lines) on a single row.</li>
        </ul>

        <h4 style="color:var(--accent-light); margin:16px 0 4px 0;">extra-info · priority 9</h4>
        <p>Slot-search for residual gaps below or beside the text block. May overlap with main-image and background-image; must not collide with heading / subheading / CTA / logo / RFWN / CRICOS. Falls back to a minimum bot-left placement when no slot fits — no-drop policy.</p>

        <h4 style="color:var(--accent-light); margin:16px 0 4px 0;">misc — unassigned fallback</h4>
        <p>Anything the detector couldn't classify. Behaviour gated by the "Include unassigned" setting:</p>
        <ul>
          <li><b>Off (default):</b> dropped on target canvases.</li>
          <li><b>On:</b> copied to the centre of each target canvas at source dimensions (clamped to fit).</li>
        </ul>
        <p><b>Exception:</b> mask shapes (<code>el.isMask === true</code>) are always carried over regardless, because the mask post-pass needs them to overlay the target image.</p>
      `},

      { id: 'relations-passes', title: 'Cross-role relations & post-placement passes', body: `
        <p>After per-role placement completes for a target canvas, four post-passes run in sequence:</p>

        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">1. R1 — logo ↔ RFWN edge alignment</h4>
        <p>The brand lockup and the tagline read as a pair. R1 snaps RFWN to share the relevant safezone edge with the logo:</p>
        <ul>
          <li><code>aspect ≤ 2.0</code> → both top-anchored → <code>rfwn.y = logo.y</code> (share top edge).</li>
          <li><code>aspect &gt; 2.0</code> → both right-anchored → <code>rfwn.x = logo.x + logo.width - rfwn.width</code> (share right edge).</li>
        </ul>
        <p>Toggleable in settings. Disabling it lets RFWN and logo sit at their independently-computed positions.</p>

        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">2. Mask post-pass</h4>
        <p>For every cloned shape with <code>isMask: true</code>: looks up its source image's clone via a <code>sourceToTargetId</code> map populated during placement, remaps <code>maskTargetId</code> to the new image id, and aligns the shape's x/y/w/h to the target image's geometry so the mask follows the photo to its new placement. If the target image didn't transfer (e.g. main-image rule disabled, or source image deleted), the mask flag is removed so the shape renders as a normal shape rather than a silent cover.</p>

        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">3. No-touch collision resolution</h4>
        <p>Five "no-touch" roles must never overlap each other: <code>rmit-logo</code>, <code>cta-button</code>, <code>heading</code>, <code>subheading</code>, <code>rfwn</code>. The pass walks pairs in priority order; when two overlap, the lower-priority element shrinks along whichever axis the centres are most offset, with a 4-px clearance gap. The higher-priority element never moves.</p>
        <p>Single-pass (not iterative) — covers the cases the reference set surfaces. Future canvases that need cascading resolution would extend this to a fixed-point loop.</p>

        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">4. Canvas-bounds clamp</h4>
        <p>Every role except <code>main-image</code> and <code>background-image</code> is forced fully inside the canvas. Off-canvas portions get clipped by adjusting x / y / width / height. Cover-mode images deliberately bleed past canvas edges, so they're exempt.</p>

        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">Order matters</h4>
        <p>R1 runs before the collision pass so the snap can't be undone by a clearance shrink. The mask pass runs after R1 but before collision so masks align with their images first, then collisions only run against the five no-touch roles (masks not included). Canvas-clamp runs last so any earlier pass that pushed an element off-canvas gets corrected at the end.</p>
      `},

      { id: 'settings-engine', title: 'Settings, live linking & engine versioning', body: `
        <p>Settings live in <code>state.autoResizeSettings</code> and persist with the project. Open via the gear icon next to the Auto-resize button in the left panel.</p>

        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">Cross-role relations</h4>
        <ul>
          <li><b>R1: Logo ↔ RFWN edge alignment</b> (default on) — described in the previous section.</li>
        </ul>

        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">Behaviour</h4>
        <ul>
          <li><b>Show canvas selection dialogue</b> (default on). On: clicking the Auto-resize button opens the run modal where you pick target canvases. Off: clicks run the engine directly on every other canvas — combined with "Show technical progress overlay" off, the resize is fully instant with no intermediate UI at all.</li>
          <li><b>Include unassigned elements by default</b> (default off). Used by the bypass path; pre-fills the run modal's checkbox otherwise.</li>
          <li><b>Allow cover fallback for main image</b> (default on). When contain would leave the image filling less than 60% of its slot, switch to cover. Off: always contain even if visually small.</li>
          <li><b>Show technical progress overlay</b> (default on). Displays a randomly-timed 2–3 s pipeline-style loading panel during the resize. Pure cosmetics — the placement work has already completed when the overlay appears. Disable for instant results.</li>
        </ul>

        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">Live linking</h4>
        <p>When enabled, every target element joins the source's link group with <code>group.liveLink = true</code> — edits on the source propagate to every target in real time. Five property toggles drive which properties actually sync:</p>
        <ul>
          <li><b>Text content</b> (text changes propagate).</li>
          <li><b>Font family + weight</b> (typeface and weight sync; size does not).</li>
          <li><b>Colour / fill</b> (text colour, button fill + stroke, shape fill + stroke, line colour, text background).</li>
          <li><b>Opacity.</b></li>
          <li><b>Animations + effects</b> (in-transitions + continuous effects).</li>
        </ul>
        <p><b>Position, size, and font size are always independent per canvas</b> — that's the entire point of the resize. Not user-toggleable.</p>
        <p>When the master toggle is off, no link group is wired during auto-resize and target elements land as fully independent copies.</p>

        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">Engine versioning</h4>
        <p>The constant <code>ENGINE_VERSION</code> in <code>auto-resize-engine.js</code> tracks rule and behaviour generations:</p>
        <ul>
          <li><b>v2.0</b> — initial 9-role rule engine + R1 cross-role relation.</li>
          <li><b>v2.1</b> — mask post-pass, contain→cover fallback, link-group wiring.</li>
          <li><b>v2.2</b> — collision resolution + canvas-clamp passes, no-drop policy.</li>
          <li><b>v2.3</b> — logo always top-right, RFWN skyscraper top-left, canvas-sized subhead font, role-refresh sweep, instant-resize bypass.</li>
          <li><b>v2.4</b> — full-width stack-mode heading, expanded wrap budget on tall canvases, banner subhead bump, CRICOS dual-source font.</li>
          <li><b>v2.5</b> — tall-format logo + RFWN shrink, subhead overlap, tighter RFWN width.</li>
          <li><b>v2.6</b> — heading wrap-budget tightening, subhead font multiplier bump, simplified subhead position.</li>
          <li><b>v2.7</b> — wide-banner heading vertically centred, RFWN width restored to fit "what's next", live linking control surface.</li>
        </ul>
        <p>Surfaced as a glowing pulsing pill in the Settings modal header (2.6 s breathing animation, purple shadow opacity 0 ↔ 0.45). Independent of the Adflow app version so engine output is reproducible for a given engine generation.</p>
      `},

      { id: 'workflow-tips', title: 'Workflow & tips', body: `
        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">Run from</h4>
        <ul>
          <li><b>The Auto-resize button</b> at the bottom of the left panel column. Respects the canvas-selection-dialogue setting — can be made one-click instant.</li>
          <li><b>The canvas right-click menu</b> → "Auto-Resize" (top of the menu, directly under Preview). Always opens the canvas-selection dialogue regardless of settings.</li>
        </ul>

        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">Best practices</h4>
        <ul>
          <li><b>Verify roles before resizing.</b> Open the Layers panel, scan the role icons. Anything with a grey icon was auto-detected; click to open the picker and override if wrong. Anything with a <span style="color:var(--accent-base); font-weight:600;">purple sparkle</span> icon is manually locked and the detector won't touch it.</li>
          <li><b>Name your layers when in doubt.</b> The detector trusts layer names first. <code>logo</code>, <code>heading</code>, <code>subheading</code>, <code>cricos</code>, <code>rfwn</code>, <code>background</code>, <code>extra info</code> are all explicit triggers.</li>
          <li><b>Use 300×250 as your canonical source.</b> It's square-ish, so all rule modes have something to fall back on. Designing first on a wide banner can mean some rules have nothing to anchor to when the target is portrait.</li>
          <li><b>For iterative tuning, turn off both the canvas dialogue and the progress overlay.</b> Auto-resize then becomes a one-click instant rebuild — useful when you're nudging the source and want to see every target update in real time.</li>
          <li><b>Mask shapes need a target image.</b> If a shape was a mask on the source but the underlying image was deleted, the post-pass strips the mask flag automatically — no silent failure modes.</li>
          <li><b>Live linking is on by default.</b> Edits on the source canvas propagate to every linked target. To break the link for a specific layer, set its link group to off via the Link Groups panel.</li>
        </ul>

        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">Reference canvas set</h4>
        <p>The engine was tuned against six hand-built canvases. Each rule's formulas were verified to land within ±10 px of the reference data:</p>
        <table style="width:100%; border-collapse:collapse; font-size:11.5px; margin:8px 0;">
          <thead>
            <tr style="border-bottom:1px solid var(--border-light); text-align:left; color:var(--text-muted);">
              <th style="padding:5px 8px;">Canvas</th>
              <th style="padding:5px 8px;">Aspect</th>
              <th style="padding:5px 8px;">Class</th>
              <th style="padding:5px 8px;">Mode notes</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>300×250</code></td><td style="padding:5px 8px;">1.20</td><td style="padding:5px 8px;">rectangle</td><td style="padding:5px 8px;">Square-ish, side-by-side image</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>300×600</code></td><td style="padding:5px 8px;">0.50</td><td style="padding:5px 8px;">portrait</td><td style="padding:5px 8px;">Stack mode, image below text</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>160×600</code></td><td style="padding:5px 8px;">0.27</td><td style="padding:5px 8px;">skyscraper</td><td style="padding:5px 8px;">Narrow stack, image full-width</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>728×90</code></td><td style="padding:5px 8px;">8.09</td><td style="padding:5px 8px;">leaderboard</td><td style="padding:5px 8px;">Side-by-side, vertically centred</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:5px 8px;"><code>970×250</code></td><td style="padding:5px 8px;">3.88</td><td style="padding:5px 8px;">billboard</td><td style="padding:5px 8px;">Side-by-side, larger fonts</td></tr>
            <tr><td style="padding:5px 8px;"><code>320×50</code></td><td style="padding:5px 8px;">6.40</td><td style="padding:5px 8px;">mobile</td><td style="padding:5px 8px;">Tight banner, max 22 pt heading</td></tr>
          </tbody>
        </table>

        <h4 style="color:var(--accent-light); margin:14px 0 4px 0;">Internal architecture</h4>
        <p>The engine lives in its own file — <code>auto-resize-engine.js</code> — loaded before <code>script.js</code>. ~1300 lines covering role taxonomy, detector, rule functions, post-passes, settings, the progress overlay, and the two UI modals. Pure functions throughout where geometry is concerned, so unit-testing each rule in isolation is trivial. The executor calls <code>render()</code> exactly once at the end (deferred behind the progress overlay if enabled), so the visible canvas update is atomic.</p>
      `},
    ]
  },
  {
    id: 'data-versions', title: 'Data & Versions ✨',
    subs: [
      { id: 'dynamic-slots', title: 'Marking dynamic slots', body: `
        <p>Select an element, open the <b>Dynamic Data</b> section of the Properties panel, and tick fields to make dynamic:</p>
        <ul>
          <li><b>Text</b> + <b>Color</b> on text.</li>
          <li><b>Background</b> on buttons.</li>
          <li><b>Image</b> on images.</li>
          <li>Fill <b>Color</b> on shapes.</li>
        </ul>
        <p>A small dot marks dynamic elements on the canvas. Unmarked elements are never touched by the merge.</p>
      `},
      { id: 'slots-link-groups', title: 'Slots × Link Groups', body: `
        <p>A dynamic field becomes a <b>slot</b>. If the element is in a Link Group, the slot covers the whole group — so one binding fills that element on every size at once. Toggling a dynamic field on a linked element applies it to all siblings automatically, and your link-group sync settings are never altered.</p>
      `},
      { id: 'loading-data', title: 'Loading data', body: `
        <p>Open <b>File → Data &amp; Versions</b> (or the <b>Data</b> button). <b>Import CSV</b>, or add columns/rows by hand. Map each column to a slot's field, pick the <b>★ version name</b> column (names the exported folders), and optionally bind a column to <b>ClickTag</b>.</p>
        <p>The sheet stores inside the <code>.flow</code> project; it auto-saves and travels with it.</p>
        <p><b>Interactions:</b> double-click a column header to rename, drag the header to reorder columns, drag the ⋮⋮ grip on each row to reorder rows, click the sort icon for asc/desc/none.</p>
      `},
      { id: 'switching-versions', title: 'Switching versions live', body: `
        <p>Pick a row from the <b>Version</b> dropdown in the top bar to preview that row on the canvas. Non-destructive — your template defaults are never overwritten, and selecting "No version" returns to them.</p>
      `},
      { id: 'edit-in-place-lock', title: 'Edit-in-place & Data lock', body: `
        <p>While a version is active and the <b>Data lock</b> is OFF, editing a dynamic slot on the canvas writes back to <b>that row's cell</b>. Toggle the lock to ON to make dynamic inputs/textareas read-only — handy when reviewing versions without nudging the data.</p>
      `},
      { id: 'export-all-versions', title: 'Export all versions', body: `
        <p><b>Export All Versions</b> produces one folder per row, named from the version-name column, each containing the full Google-Ads-compliant ZIP set through the standard export pipeline.</p>
      `},
    ]
  },
  {
    id: 'cloud-spaces', title: 'Cloud & Spaces',
    subs: [
      { id: 'sign-in', title: 'Signing in', body: `
        <p>The splash screen now doubles as a sign-in gate. New users tap <b>Sign up</b>, enter email + password (≥6 chars), check inbox if email confirmation is on, then sign in.</p>
        <ul>
          <li><b>Remember me on this device</b> (default on) — session token stored in localStorage and persists across tabs. Uncheck to scope the session to the current tab only.</li>
          <li><b>Use locally without signing in</b> — skip the cloud, work entirely against IndexedDB autosave. You can sign in later from the top-bar chip.</li>
        </ul>
      `},
      { id: 'cloud-projects', title: 'Cloud Projects', body: `
        <p>When signed in, click the chip → <b>My Cloud Projects</b>. Push the current project to the cloud, open one back, or delete. Cloud projects use the same <code>.flow</code> format as local saves, so nothing needs re-importing.</p>
        <p><b>Same-name push:</b> if a project with the same name already exists in the current context, a toast appears with <b>Replace</b> (overwrite) and <b>Rename</b> (push as a new project with a different name).</p>
      `},
      { id: 'spaces', title: 'Spaces (team workspaces)', body: `
        <p>Spaces are shared pools. The chip dropdown lists all spaces you belong to plus "Personal". The current space's name appears next to your email in the top bar.</p>
        <ul>
          <li><b>+ Create new space…</b> spins up a new shared workspace you own.</li>
          <li><b>Manage Spaces…</b> opens a list with per-space actions: <b>Members</b>, <b>Invite</b>, <b>Rename</b> (owner), <b>Duplicate</b> (clones folders + projects to a new space you own), <b>Delete</b> (owner — type the name to confirm), <b>Leave</b> (non-owner).</li>
        </ul>
      `},
      { id: 'invitations', title: 'Inviting members', body: `
        <p>From Manage Spaces → <b>Invite</b>, type the teammate's email. Adflow generates a one-time join URL and copies it to your clipboard. Paste it into Slack or email yourself. When the recipient opens it and signs in with the same email, they're auto-added.</p>
      `},
      { id: 'cloud-folders', title: 'Folders in spaces', body: `
        <p>Inside a space, the Cloud Projects modal shows a folder tree on the left. <b>+ New folder</b> creates one, hover a folder to delete, and use the per-row dropdown to move a project between folders.</p>
      `},
    ]
  },
  {
    id: 'projects', title: 'Saving & Projects',
    subs: [
      { id: 'autosave', title: 'Auto-save', body: `
        <p>Every change is debounced and persisted to your browser's IndexedDB. Restored on reload — including zoom and scroll position. Top bar shows a live status indicator (saved / saving / unsaved / error).</p>
        <p><b>History limit:</b> set in <b>File → Settings</b> — 1 to 50 states, default 10.</p>
      `},
      { id: 'flow-files', title: '.flow files', body: `
        <p><b>File → Save Project</b> (<span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">S</span>) writes a portable <code>.flow</code> file containing the project JSON plus all embedded assets. <b>Open Project</b> reads <code>.flow</code> (and legacy <code>.cook</code>/<code>.zip</code>) back in.</p>
        <p><b>Ctrl</b>+<b>S</b> pushes to the cloud when you're signed in (see <i>Cloud &amp; Spaces</i>). If you're signed out or Supabase isn't configured, it falls back to the local <code>.flow</code> save dialog.</p>
        <p><b>Open Recent</b> in the File menu shows your last manually-saved projects.</p>
      `},
      { id: 'new-project-wizard', title: 'New Project wizard', body: `
        <p><b>File → New Project…</b> lets you pick which canvas sizes to include, the project name, ClickTag URL, default canvas background, and ad-weight limit (default 150 KB — the Google Ads standard).</p>
      `},
      { id: 'settings', title: 'App settings', body: `
        <p><b>File → Settings</b>: theme (Dark, RMIT Brand, Ocean, Navy, Light), rulers, snapping, Crop to Canvas, history limit, autosave behaviour. <b>File → Project Settings</b> covers per-project options (name, ClickTag, weight limit).</p>
      `},
      { id: 'startup-view', title: 'Startup view & resume', body: `
        <p>The view is always centred on your canvases at startup. If you had a saved scroll position from your last session, a toast appears with <b>Resume previous view</b> to jump back.</p>
      `},
    ]
  },
  {
    id: 'export', title: 'Export & Validation',
    subs: [
      { id: 'clicktag', title: 'ClickTag', body: `
        <p>The exit URL used when someone clicks the banner. Set globally per project, or override per canvas. Can also be bound to a CSV column in Data & Versions for per-row click destinations.</p>
      `},
      { id: 'validation', title: 'Validation audits', body: `
        <p>The left panel runs live checks: missing ClickTag, external asset references, total ad weight. Anything above your configured weight limit flags as an error — the default (150 KB) is the Google Ads standard.</p>
      `},
      { id: 'bundling', title: 'Bundling', body: `
        <p>Per-canvas ZIP from the canvas right-click menu. Whole-project batch from the top-bar <b>Export</b> button.</p>
        <p>SVG brand assets are fetched and inlined automatically so the ZIPs are self-contained.</p>
      `},
      { id: 'static-fallback', title: 'Static PNG fallback', body: `
        <p>One-click PNG snapshot of any frame for use as a fallback image when an ad network can't render the animation.</p>
      `},
    ]
  },
  {
    id: 'reference', title: 'Reference',
    subs: [
      { id: 'keyboard-shortcuts', title: 'Keyboard shortcuts', body: `
        <table style="border-collapse:collapse; font-size:12px; width:100%;">
          <thead><tr><th style="text-align:left; padding:6px 8px; border-bottom:1px solid var(--border-light);">Shortcut</th><th style="text-align:left; padding:6px 8px; border-bottom:1px solid var(--border-light);">Action</th></tr></thead>
          <tbody>
          ${[
            ['Ctrl + S','Push to cloud (falls back to local save when signed out)'],
            ['Ctrl + Shift + S','Save project locally (.flow)'],
            ['Ctrl + C / X / V','Copy / Cut / Paste'],
            ['Ctrl + D','Duplicate selected'],
            ['Ctrl + Z / Y','Undo / Redo'],
            ['Ctrl + G / Shift + G','Group / Ungroup'],
            ['Ctrl + ] / [','Layer order forward / back'],
            ['Space + Drag','Pan workspace'],
            ['Delete / Backspace','Delete selected'],
            ['Tab','Toggle Fullscreen'],
            ['Arrow keys','Nudge 1px'],
            ['Shift + Arrows','Nudge 10px'],
            ['Shift + Drag corner','Lock aspect ratio'],
            ['Alt + Drag','Clone element on drag'],
            ['Alt + Resize handle','Scale font proportionally'],
            ['Ctrl + Resize','Snap dimensions to 10px'],
            ['Double-click text','Inline edit'],
            ['Double-click group','Isolate & edit inside'],
            ['Escape','Deselect / close modal']
          ].map(([k,v]) => `<tr><td style="padding:5px 8px; border-bottom:1px solid #1f2330;"><span class="kbd">${k}</span></td><td style="padding:5px 8px; border-bottom:1px solid #1f2330; color:var(--text-muted);">${v}</td></tr>`).join('')}
          </tbody>
        </table>
      `},
      { id: 'changelog-link', title: 'Changelog', body: `
        <p>Click the version label in the top bar (e.g. <b>v0.11.0</b>) to open the full changelog modal.</p>
      `},
    ]
  }
];

function openDocumentation() {
  const body = `<div id="docs-panel"></div>`;
  openModal('Documentation', body, false);
  const bg = document.body.lastElementChild;
  const modal = bg.querySelector('.modal');
  if (modal) { modal.style.width = '1100px'; modal.style.maxWidth = '95vw'; }
  // Initial: first sub of first section.
  const first = DOCS_SECTIONS[0].subs[0];
  renderDocsPanel(bg, DOCS_SECTIONS[0].id, first.id);
}

function renderDocsPanel(bg, activeSecId, activeSubId) {
  const panel = bg.querySelector('#docs-panel');
  if (!panel) return;
  const activeSec = DOCS_SECTIONS.find(s => s.id === activeSecId) || DOCS_SECTIONS[0];
  const activeSub = activeSec.subs.find(s => s.id === activeSubId) || activeSec.subs[0];

  const sidebarHtml = DOCS_SECTIONS.map(sec => {
    const isOpen = sec.id === activeSecId;
    const subs = isOpen ? `<div class="docs-subs">${sec.subs.map(sub => `
      <div class="docs-sub${sub.id === activeSubId ? ' active' : ''}" data-sec="${sec.id}" data-sub="${sub.id}">
        ${sub.title}
      </div>`).join('')}</div>` : '';
    return `
      <div class="docs-section${isOpen ? ' open' : ''}">
        <div class="docs-section-head" data-sec="${sec.id}">
          <span>${sec.title}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transform:rotate(${isOpen ? '0' : '-90'}deg); transition:transform .15s ease; opacity:.6;"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        ${subs}
      </div>`;
  }).join('');

  panel.innerHTML = `
    <div style="display:flex; gap:0; height:calc(86vh - 80px); min-height:480px;">
      <div id="docs-sidebar" style="width:240px; flex-shrink:0; overflow-y:auto; border-right:1px solid var(--border-light); padding:8px 0;">
        ${sidebarHtml}
      </div>
      <div id="docs-content" style="flex:1; overflow-y:auto; padding:18px 28px;">
        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; margin-bottom:6px;">${activeSec.title}</div>
        <h2 style="margin:0 0 14px; font-size:18px; font-weight:600; color:var(--text-bright);">${activeSub.title}</h2>
        <div class="docs-body" style="font-size:13px; line-height:1.65; color:var(--text-main);">${activeSub.body}</div>
      </div>
    </div>`;

  // Welcome page contains the Adflow wordmark — sync it to the active
  // theme now that the dynamic HTML has been inserted into the DOM.
  if (typeof syncAdflowLogos === 'function') syncAdflowLogos();

  // Wire interactions
  bg.querySelectorAll('.docs-section-head').forEach(head => {
    head.addEventListener('click', () => {
      const sec = head.dataset.sec;
      // Click on a section header toggles open and selects the first sub.
      const target = DOCS_SECTIONS.find(s => s.id === sec);
      if (!target) return;
      // If already open and clicked again, collapse by switching to a different section's first sub.
      if (sec === activeSecId) {
        // Toggle: open another section would lose current state, so instead keep current.
        // Allow collapse only if user clicks again — show first sub of same section.
        renderDocsPanel(bg, sec, target.subs[0].id);
      } else {
        renderDocsPanel(bg, sec, target.subs[0].id);
      }
    });
  });
  bg.querySelectorAll('.docs-sub').forEach(sub => {
    sub.addEventListener('click', () => {
      renderDocsPanel(bg, sub.dataset.sec, sub.dataset.sub);
    });
  });
  bg.querySelectorAll('a[data-doc-sec]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      renderDocsPanel(bg, link.dataset.docSec, link.dataset.docSub);
    });
  });
}

document.getElementById('menu-help-documentation').addEventListener('click', openDocumentation);

const CHANGELOG_DATA = [
  {
    version: 'v0.16.16',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Removed the fake "AI" progress overlay from Auto-Resize entirely. The terminal-styled pipeline panel with the spinner, scripted pid + UTC header, and 10 random-weighted status lines is gone — it was pure theatre gating the render for 2–3 seconds while placement had already completed. Results now render instantly when Auto-Resize finishes.',
      'The `showFakeAutoResizeProgress` function and the `showProgress` setting are removed. The "Show technical progress overlay" checkbox in the Auto-Resize Settings modal is gone, and the "Show canvas selection dialogue" hint text no longer references it.',
      'Existing projects with `showProgress` keys in their autosave blobs get those keys quietly stripped on load — no migration banner, no data loss elsewhere.'
    ]
  },
  {
    version: 'v0.16.15',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Faster cold loads on the deployed Netlify build. Removed `?_t=Date.now()` cache-busters from the RMIT asset fetches in `syncRmitAssets` — they were forcing both the browser and the Netlify edge to bypass cache on every page load, so each visit re-downloaded the manifest + every RMIT image fresh.',
      'Parallelised the RMIT asset preload loop. The sequential `for...of` + `await fetch(url)` was costing N× RTT on cold loads. Switched to `Promise.all(filenames.map(...))` so all assets fetch concurrently; final library order is preserved by iterating the resolved results.',
      'No behaviour change otherwise — same fallback chain (manifest → directory listing → hardcoded defaults), same per-asset error handling.'
    ]
  },
  {
    version: 'v0.16.14',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Internal refactor: extracted the custom color picker (iro.js wrapper) into a new file `color-picker.js`. Moved the picker state, gradient helpers (cpBuildGradient, cpParseGradient, cpSyncGradientUI, cpRebuildStops, cpColorAtPos, cpAddStop, cpRemoveStop), and the public API (initColorPicker, renderPalettes, updateCurrentColor, emitColorUpdate, openColorPicker, closeColorPicker, syncColorPickerWithSelection) — about 484 lines.',
      'This completes the Option A refactor. Over five minor versions (v0.16.9 → v0.16.14), the script.js monolith has gone from 16,082 lines down to 11,482 lines — a 29% reduction. Pulled out into focused files: auto-resize-engine.js, docs-content.js, auth-ui.js, data-merge.js, export-pipeline.js, color-picker.js.',
      'No user-facing change. Color picker, gradient editor, swatches, and selection sync all behave identically.'
    ]
  },
  {
    version: 'v0.16.13',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Internal refactor: extracted the HTML5 export pipeline into a new file `export-pipeline.js`. Moved getRequiredFonts, exportCanvasAsZip, exportCanvasAsPng, clearCanvasFrame, generateExportHTML + _generateExportHTMLRaw (the giant index.html template builder), and openExportModal — about 862 lines.',
      'script.js dropped from 12,828 → 11,966 lines. Project save/load (buildFlowBlob, saveProjectAsFlow, loadProjectFromBlob) intentionally stays in script.js — that is project persistence, not export.',
      'No user-facing change. ZIP export, PNG export, image-set export, all-version export, and the Export modal table all behave identically.'
    ]
  },
  {
    version: 'v0.16.12',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Internal refactor: extracted the Live Data / Versioning system into a new file `data-merge.js`. Moved 38 `dm*` helpers, the data panel UI (openDataPanel, dmRenderPanel, dmWirePanel), CSV in/out, version switcher rendering (renderVersionSwitcher, renderPreviewVersionBar, cycleVersion), and the DM_FIELD_LABEL constant.',
      'About 803 lines lifted out. script.js dropped from 13,631 → 12,828 lines.',
      'No user-facing change. Live Data panel, dynamic slot binding, CSV import/export, and version switching behave identically.'
    ]
  },
  {
    version: 'v0.16.11',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Internal refactor: extracted the entire Supabase auth + Cloud Projects + Team Spaces stack into a new file `auth-ui.js`. Moved the Supabase client init, the authState IIFE, the spacesState IIFE, the top-bar auth chip, the sign-in/sign-up modal, the Cloud Projects modal, space management + members + invitations, and the splash auth gate — about 924 lines.',
      'script.js dropped from 14,555 → 13,631 lines. auth-ui.js loads before script.js because the boot IIFE references authState.enabled / .ready / .currentUser() at load-time.',
      'Anonymous local use is completely unchanged. When credentials are blank or the Supabase SDK fails to load, the chip hides, menu items stay hidden, and no network calls fire — exactly as before.'
    ]
  },
  {
    version: 'v0.16.10',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Internal refactor: extracted the documentation and changelog system into a new file `docs-content.js`. Moved DOCS_SECTIONS (the full Help → Documentation content tree), openDocumentation + renderDocsPanel, CHANGELOG_DATA, generateChangelogHtml, and openChangelogModal — about 1,360 lines lifted out of the monolith.',
      'script.js dropped from 15,919 → 14,555 lines. checkVersionUpdate (the post-update splash) intentionally stays in script.js since it is tightly bound to the boot flow and the hardcoded currentVersion check.',
      'docs-content.js loads before script.js in index.html, same pattern as auto-resize-engine.js. No user-facing change — documentation modal, changelog modal, About dialog, and the post-update splash all behave identically.'
    ]
  },
  {
    version: 'v0.16.9',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Internal cleanup: deleted the legacy `autoResizeFromSelected` executor and its four helpers (`canvasFormatClass`, `detectElementRole`, `syncDefaultsForRole`, `layoutForRole`) from script.js. Dead code since the FAB / context-menu entries switched to the v2 rule engine — roughly 170 lines gone.',
      'No user-facing change. Auto-resize behaviour, settings, and engine version (v2.7) are unaffected.',
      'First step in a planned multi-file refactor: docs-content.js, auth-ui.js, data-merge.js, export-pipeline.js, and color-picker.js will be split out over the next minor versions to shrink the script.js monolith.'
    ]
  },
  {
    version: 'v0.16.8',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Undo/redo overhaul. Default depth bumped from 10 to 50 steps. Long-standing bug where the engine capped at a hardcoded 15 entries regardless of the configured limit is fixed — the configured limit now actually applies.',
      'Snapshot fields expanded: frames (timeline durations / transitions / skip flags), activeFrameId, and projectName are now undoable. Settings-toggle state (theme, auto-resize behaviour, view prefs, zoom/scroll, history-limit itself) intentionally remains EXCLUDED.',
      'Re-entrancy guard added. A `_restoringHistory` flag short-circuits any pushHistory() call fired DURING a restore — prevents the restore from polluting history with a duplicate of the snapshot just popped.',
      'Settings UI: history-limit max raised 50 → 100, default value 10 → 50, minimum bumped from 1 to 5 (1 made undo functionally useless).',
      'Migration: projects with old default (savedHistoryLimit ≤ 10) get bumped to 50 automatically on autosave restore. Customised values above 10 are preserved.'
    ]
  },
  {
    version: 'v0.16.7',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Light theme now uses a dedicated Adflow wordmark — `data/Elements/Adflow_lighttheme.svg` — so the brand reads cleanly against the lighter panel background. Every other theme continues to use `Adflow_logo.svg`.',
      'The swap is JS-driven via syncAdflowLogos() — walks every <img data-adflow-logo> in the DOM and sets the right src based on state.theme. Called from render() right after the theme class is applied, so theme changes update every wordmark in place without a reload.',
      'Four locations now carry the data-adflow-logo attribute: boot splash, topbar, size-overlay (tiny-viewport warning), Documentation welcome page. The docs renderer calls syncAdflowLogos() after its dynamic HTML is inserted to catch the welcome-page image too.'
    ]
  },
  {
    version: 'v0.16.6',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Auto-resize button stripped to just its "Auto-resize" label — sparkle icon and "AI" pill badge removed. The matching CSS rules were dropped since they\'re no longer referenced.'
    ]
  },
  {
    version: 'v0.16.5',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Auto-Resize documentation completely rewritten and significantly expanded. The previous 4-subsection summary is replaced with a deep 7-subsection technical reference covering the v2.7 rule-based engine end-to-end.',
      'New subsections: Overview & philosophy / 9-role taxonomy (with priority + strategy table) / Role detection & manual override / Placement rules (each rule with anchor, size, font formulas, and mode case-analysis) / Cross-role relations & post-placement passes (R1, mask post-pass, no-touch collisions, canvas clamp) / Settings, live linking & engine versioning (with full v2.0-v2.7 history) / Workflow & tips (best practices + reference canvas data table + internal architecture pointer).',
      'Also updated the Getting Started "Auto-Resize at a glance" and "Your first project" entries to reference the new panel-anchored Auto-resize button rather than the obsolete Tools-panel button.'
    ]
  },
  {
    version: 'v0.16.4',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Canvas context menu: Auto-Resize moved up directly under Preview at the top. Styled identically to Preview (purple accent, ctx-item highlight class, icon-on-left). Sparkle SVG replaces the ✨ emoji. Text shortened to "Auto-Resize".',
      'Clicking the menu entry now always opens the canvas-selection dialogue regardless of the engine settings — the FAB\'s instant-resize bypass doesn\'t apply here, since reaching for the context menu implies you want to choose targets each time.'
    ]
  },
  {
    version: 'v0.16.3',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Auto-resize anchor: background switched from --bg-panel to --bg-body (slightly darker), making the strip read as a darker base than the panel sections above.',
      'Trimmed ~6 px off the anchor height: container padding 10 → 8/10 px, button padding 10/14 → 7/14 px, border-radius 8 → 7 px, settings button 38×38 → 32×32 px.'
    ]
  },
  {
    version: 'v0.16.2',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Auto-resize button toned down and re-homed. No longer a floating FAB — now a prominent button anchored at the bottom of the left panel column, outside the scroll area so it stays visible regardless of scroll position.',
      'Resting pulse animation dropped. The button just sits there. Hover lifts 1 px with a stronger purple halo + brightness boost; click scales to 0.97 with a tighter shadow. No animation unless interacted with.',
      'Form factor lowered: 10/14 px padding (was 13/22), 8 px border-radius (was 14), 12.5 px label (was 13.5), softer 0 2px 8px shadow at rest. Reads as a more prominent version of a regular button rather than a flashy FAB.',
      'AI badge preserved next to the label — kept from the original Tools-panel button. Settings (gear) button beside it at 38×38 px, dark-input background, subtle hover border highlight.'
    ]
  },
  {
    version: 'v0.16.1',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Fix: Auto-resize FAB wasn\'t showing because the boot splash overlay (z-index 999999, stays in DOM after fade-out) was claiming the top stacking context above the FAB\'s z-index 9000. Bumped FAB to 999998 with !important on position properties so nothing else can hide it. Hard refresh required if styles.css was cached.',
      'New "✨ Auto-resize from this canvas" entry in the canvas right-click context menu. Sits above the Clear all submenu, accent-coloured + bold to mark it as the primary creative action. Triggers the same dispatcher the FAB uses, so it honours the canvas-selection-dialogue + include-unassigned settings. Resizes from whichever canvas is currently active.'
    ]
  },
  {
    version: 'v0.16.0',
    date: 'May 2026 — Engine v2.7',
    items: [
      'Tools panel removed. The Auto-resize button is now a prominent floating action button (FAB) pinned to the bottom-left of the viewport. Gradient purple pill with sparkle icon and "Auto-resize" label.',
      'FAB has a 3.2-second resting pulse animation (subtle box-shadow breathing), pauses on hover with a 3-px lift + stronger 40-px purple halo + brightness boost. On click, scales to 0.97 with a sharp 50-px halo flash for tactile feedback.',
      'A smaller, quieter settings (gear) FAB sits beside the main button with backdrop-blur, purple-tinted border, and matching hover/active behaviour. Opens the Auto-Resize Settings modal as before.',
      '"Clear everything" removed from the Tools panel. Now lives in: (1) the canvas context menu as a "Clear all" submenu with "Current canvas" / "All canvases" options, and (2) the canvas Properties panel as a pair of red-bordered buttons below the Download row.',
      'Current canvas clears every element on the active canvas; All canvases wipes every canvas and resets linkGroups. Both prompt for confirmation and push history so Ctrl+Z restores.'
    ]
  },
  {
    version: 'v0.15.11',
    date: 'May 2026 — Engine v2.7',
    items: [
      'RFWN width loosened to fit "what\'s next" on a single line. Was font × 6.2 / cap 80 which forced 3-line wrap on larger canvases; now font × 6.8 / cap 100 so the tagline stays on 2 lines.',
      'Wide-banner heading (h ≤ 100, aspect > 2) now vertically centres in the canvas. The side-by-side heading + subhead pair reads as a centred block rather than upper-aligned. 728×90 heading y: 9 → 18.',
      'New Live linking section in the Auto-Resize Settings modal. Master toggle + 5 property toggles (Text / Font / Colour / Opacity / Animations). When master is on, target elements join the source\'s link group with real-time propagation enabled. When off, targets are independent copies. Position, size, and font size are always independent per canvas.',
      'Sub-toggles dim when master is off so the hierarchy is visually obvious.',
      'Auto-Resize engine bumped to v2.7.'
    ]
  },
  {
    version: 'v0.15.10',
    date: 'May 2026 — Engine v2.6',
    items: [
      'Heading box height tracks actual text more closely. Wrap budget reduced from 4 to 3 lines on stack mode and 5 to 4 on narrow skyscrapers. 300×600 heading box ~135 px (was 180); 160×600 ~132 px (was 165).',
      'Subhead font bumped on tall canvases. Multiplier 0.05 → 0.06, cap 26 → 28. 300×600 subhead 21 → 25 px; 160×600 16 → 19 px.',
      'Subhead-to-heading positioning simplified. The v2.5 aggressive negative overlap is gone; subhead sits at heading.bottom + 4 px now that the heading box matches its text closely.',
      'Auto-Resize Settings modal redesigned. Placement-rules section removed entirely — the 9 rules are now always-on, baked into the engine. Bumping ENGINE_VERSION covers rule changes. Modal slimmed to just Cross-role relations + Behaviour; row sizes restored to more readable padding/fonts.',
      'Settings header layout: Engine version pill moved to right side next to the Close button, with a subtle 2.6-second pulsing glow to draw the eye to the version.',
      'Auto-Resize engine bumped to v2.6.'
    ]
  },
  {
    version: 'v0.15.9',
    date: 'May 2026 — Engine v2.5',
    items: [
      'Logo + RFWN shrink 25% on tall formats (h > w). Tall layouts share the top row, so 300×600 and 160×600 needed breathing room. Logo height × 0.75, RFWN font × 0.8. Wide banners and square canvases unchanged.',
      'Subhead bounding box now stacks onto heading\'s. Pulls subhead up by ~55% of heading font size so its top overlaps the heading\'s trailing empty padding instead of starting after it. Heading wrap budget is generous (4–5 lines); the overlap eats unused padding without colliding with actual heading lines.',
      'RFWN bounding box hugs the wrapped text tighter. Width formula changed from fontSize × 7 to fontSize × 6.2, max clamp 90 → 80. Sized to fit "what\'s next" (the longer of the two natural wrap lines) so the box edge sits flush against the text.',
      'Auto-Resize engine bumped to v2.5.'
    ]
  },
  {
    version: 'v0.15.8',
    date: 'May 2026 — Engine v2.4',
    items: [
      'Stack-mode heading (h ≥ 300) now uses the full safezone width. Was still being shrunk by the top-right logo constraint even though logo sits well above the heading on tall canvases. 300×600 heading now goes full 270-px column; 160×600 full 134-px column.',
      'Heading wrap budget bumped on tall canvases: stack mode = 4 lines (was 3), narrow skyscraper (w < 200) = 5 lines. 160×600 heading no longer gets crushed by auto-fit because the box is now tall enough to hold all the wrapped lines.',
      'Subheading font bumped on horizontal banners (h ≤ 100). 728×90 now renders subhead at 16 px (was 14); 320×50 stays in the 8-11 readable range.',
      'CRICOS font takes the max of minDim × 0.023 and width × 0.008. Bumps 728×90 from 4 → 6 and 970×250 from 6 → 7 where there\'s plenty of horizontal room. Other sizes unchanged.',
      'Auto-Resize engine version bumped to v2.4. Surfaced in the settings modal header pill and the progress overlay.'
    ]
  },
  {
    version: 'v0.15.7',
    date: 'May 2026',
    items: [
      'The auto-resize engine now has its own version number, separate from the Adflow app version. Currently Engine v2.3 — surfaced as a monospaced pill next to the title in the Auto-Resize Settings modal, and in the header of the technical progress overlay. Bumps on substantive rule / behaviour changes so you can tell at a glance which engine generation produced a given resize.',
      'Auto-Resize Settings modal compacted: max-width 640 → 520 px, per-row padding 8/10 → 4/6 px, hover-only highlight instead of per-row borders, title font 12 → 11 px, description font 10.5 → 10 px. The whole sheet (9 rules + 1 relation + 4 behaviour toggles) fits in a single viewport on most screens without scrolling.'
    ]
  },
  {
    version: 'v0.15.6',
    date: 'May 2026',
    items: [
      'Auto-Resize role detection now refreshes auto-assigned roles every sweep. Improvements to the detector (like the aspect-ratio logo heuristic) take effect on existing projects without resetting each layer manually. Only auto-assigned roles refresh; manually-set roles are preserved.',
      'New "Show canvas selection dialogue" setting in the Auto-Resize Settings panel. On (default): the run modal pops up so you can pick targets each time. Off: clicking the Auto-resize button runs the engine on every other canvas immediately. Combined with the progress overlay also off, the resize is fully instant with no intermediate UI.',
      'New "Include unassigned elements by default" setting. Used directly when the canvas-selection dialogue is bypassed; pre-fills the run modal\'s checkbox otherwise. The run modal also remembers your last choice between sessions.'
    ]
  },
  {
    version: 'v0.15.5',
    date: 'May 2026',
    items: [
      'RMIT logo: always top-right of safezone now. The previous bot-left mode for ultra-narrow skyscrapers packed the logo against RFWN + CTA in a cramped 30-px-tall bottom strip on 160×600. Top-right is consistent across formats and pairs naturally with RFWN top-left.',
      'RFWN: top-left mode extended to cover the skyscraper case too (aspect ≤ 2.0). The bot-right mode is now reserved for wide banners only. Text always justifies toward the closest canvas edge. The R1 logo↔RFWN snap is updated accordingly.',
      'Subheading font now scales from canvas dimensions rather than as a fixed % of heading font — tuned within ±2 of the user\'s reference data. Fixes "sub headline too small" on 728×90 / 970×250 / 320×50.',
      'No-drop policy: every placement rule returns geometry rather than null. Subheading without a heading-anchor parks at safezone top-left. Main-image without a usable slot falls back to a centred minimum-size box (24-px floor). Extra-info without any candidate slot falls back to a small box at safezone bot-left. Drop behaviour is now reserved exclusively for role=Unassigned when "include unassigned" is off.'
    ]
  },
  {
    version: 'v0.15.4',
    date: 'May 2026',
    items: [
      'Auto-Resize tuning batch from second real-canvas test. Heading on stacked canvases (300×600 / 160×600) no longer crushes to a one-word-per-line column — the CTA-clearance constraint was firing for tall-mode CTAs too, but those sit below the heading, not to the right. The constraint now only fires when canvas aspect > 2.',
      'Heading on tight wide banners (728×90, 320×50) gets a roomier column — canvas.w × 0.42 instead of × 0.32 so "It\'s not too late to study in 2026." wraps cleanly across 2 lines without cropping.',
      'maxFontSize is now set alongside fontSize on every text-bearing rule. Source elements with autoSize:true + maxFontSize:68 no longer blow past the per-canvas computed cap — auto-fit honours whatever the rule decided.',
      'Logo detection: small horizontal images (aspect ≥ 2.0, area < 18% of canvas) are classified as rmit-logo regardless of the Always-Top persistence flag. Logos dropped into Main Layers no longer fall through to the main-image slot-search rule and disappear from the brand corner.',
      'Masks survive auto-resize. Shape-with-isMask now preserves the mask flag through cloning, and a post-pass remaps maskTargetId from the source image id to the cloned target image id, then aligns the mask\'s x/y/w/h to the target image\'s new geometry. If the target image didn\'t transfer, the mask flag is removed so the shape renders as a normal shape instead of covering empty space.'
    ]
  },
  {
    version: 'v0.15.3',
    date: 'May 2026',
    items: [
      'Internal refactor: the auto-resize rule engine has been extracted from script.js into its own file, auto-resize-engine.js. Everything that powers the rule-based auto-resize feature lives there now — role taxonomy, role detection, all 9 placement rules, cross-role relations, post-placement passes, the main executor, settings + modals, the role picker, the fake progress overlay, and the two button click listeners. No behavioural change for the user; the move keeps script.js leaner so the engine can grow without bloating the main script.'
    ]
  },
  {
    version: 'v0.15.2',
    date: 'May 2026',
    items: [
      'Auto-Resize tuning from the first real test (300×250 → all sizes): heading on tight horizontal banners (h ≤ 100) now caps font at 22 (was 68) and uses a narrower column (canvas.w × 0.32), so the headline no longer crops or bleeds into the image. Width is also constrained by already-placed CTA + logo positions; height is computed from the chosen font + a 2-line wrap budget and clipped to remaining canvas height.',
      'Subheading: on tight horizontal banners (h ≤ 100) it now sits to the RIGHT of the heading instead of below, vertically centred — there isn\'t enough room to stack them. Subheading font is ~60% of heading font.',
      'RFWN justification matches placement mode: left-justified when at top-left, right-justified when at bot-right. Never centred.',
      'Post-placement collision pass: the five "never-touch" roles (logo, CTA, heading, subheading, RFWN) get walked pairwise in priority order. If two overlap, the lower-priority one shrinks along whichever axis the centres are most offset on, with a 4-px clearance gap. Higher-priority element never moves.',
      'Post-placement canvas-clamp pass: every role except main-image and background-image is forced fully inside the canvas. Off-canvas portions get clipped by adjusting x/y/width/height.'
    ]
  },
  {
    version: 'v0.15.1',
    date: 'May 2026',
    items: [
      'Auto-Resize progress overlay now feels more organic: total run-time randomised between 2.0 and 3.0 seconds, and the per-step intervals use random weights (0.4×–1.6× of average) so checkmarks tick unevenly — sometimes two pop in ~80ms apart, sometimes one sits alone for ~450ms before the next, matching the cadence of a real ML pipeline rather than a metronome.'
    ]
  },
  {
    version: 'v0.15.0',
    date: 'May 2026',
    items: [
      'Auto-Resize now runs behind a ~2-second pipeline-style loading overlay. Terminal-styled centred panel with a spinner, fake pid + UTC timestamp header, a scripted sequence of ten checkmarked status lines, animated progress bar, and a "→ done" capstone. Purely theatrical — placement happens in <50ms; the overlay gates the visible render() so the user sees the engine "doing work."',
      'New gear icon next to "Auto-resize from selected" opens the Auto-Resize Settings panel. Every placement rule and every cross-role relation is a labelled checkbox with a one-line description. Behaviour section toggles cover-fallback for the main image and the progress overlay. Reset-to-defaults, save, cancel.',
      'Engine respects the settings: disabled rules drop matching elements on every target, R1 cross-role snap can be turned off, and the cover-fallback gate now reads from settings rather than being hard-coded.'
    ]
  },
  {
    version: 'v0.14.5',
    date: 'May 2026',
    items: [
      'Role-assignment icon: back to two diagonal arrows (the same concept as the original) but with rounded corner brackets instead of right-angle joins. Smoother silhouette at 13px while keeping the "resize" semantic.'
    ]
  },
  {
    version: 'v0.14.4',
    date: 'May 2026',
    items: [
      'Swapped the role-assignment icon back to a resize-style glyph — four rounded corner brackets, no diagonal arrows. Reads as "resize/format" without the previous version\'s noise at 13px.',
      'Accent colour now applies to every layer that has a known role, not just manually-assigned ones. Auto-detected and manually-assigned both show purple; only truly unassigned layers stay grey. The tooltip still says "(auto-detected)" or "(manually set)" on hover so the distinction is preserved.'
    ]
  },
  {
    version: 'v0.14.3',
    date: 'May 2026',
    items: [
      'Polish: swapped the layer-row role-assignment icon from a four-corner expand arrow to a single-stroke tag icon — smoother at 13px and a better semantic fit for "this layer\'s role".',
      'Polish: manually-assigned role icons now use the purple accent colour instead of the previous green, matching the rest of the editor\'s "this was changed from default" visual language. The role-picker dropdown\'s current-selection dot follows the same accent.'
    ]
  },
  {
    version: 'v0.14.2',
    date: 'May 2026',
    items: [
      'Fix: clicking the role-assignment icon on a layer row did nothing because the popup inherited display:none from the global `.dropdown` class (which is only revealed via a `.menu-item:hover` parent rule that doesn\'t apply to body-anchored popups). Dropped the `dropdown` class from the popup container so it stays visible on creation.'
    ]
  },
  {
    version: 'v0.14.1',
    date: 'May 2026',
    items: [
      'Fix: Auto-Resize modal and the Layers-panel role-assignment icon were both silently dead — clicking either did nothing. The modal builder referenced a global esc() helper that\'s only defined locally inside other modal functions, so it threw a ReferenceError before the modal could render. Inlined a local esc inside the auto-resize modal builder.',
      'Hardening: hoisted the three role-taxonomy constants (ROLE_IDS, ROLE_LABELS, ROLE_PICKER_ORDER) to the top of the script so any boot-time render call can read them without risking a temporal-dead-zone ReferenceError.'
    ]
  },
  {
    version: 'v0.14.0',
    date: 'May 2026',
    items: [
      'Step 2 of the new rule-based Auto-Resize engine — the placer is live. Clicking Run Auto-Resize reads each element\'s assigned role on the source canvas, applies the matching parametric rule from the locked rule set (anchor + size + font-size formulas), and writes the result onto every selected target canvas.',
      'All 9 roles wired: background-image (source-mirror), rmit-logo (top-right / bot-left by aspect), cta-button (tall bot-center / wide mid-right), heading (top-left of safezone, two layout modes), subheading (anchored to heading.bottom-left), cricos (bot-left of canvas, min font 4), main-image (slot-search with contain→cover fallback at 60% fill), rfwn (top-left / bot-right by aspect), extra-info (residual slot-search).',
      'Cross-role relation R1: after the logo + RFWN both place, RFWN snaps to share the relevant safezone edge with the logo (top edge on square/portrait, bottom on skyscraper, right on wide banner).',
      'Unassigned elements (role = Unassigned) follow the modal toggle — off skips them, on copies them centred on every target. The source canvas always stays untouched and Ctrl+Z reverts the whole operation.',
      'Link groups stitched up automatically: every placed target element joins or reuses the source\'s link group with role-appropriate sync defaults, so subsequent edits propagate per-canvas the same way as before.'
    ]
  },
  {
    version: 'v0.13.0',
    date: 'May 2026',
    items: [
      'Step 1 of the new rule-based Auto-Resize engine. Every layer now carries an "auto-resize role" assignment — one of Heading, Subheading, CTA Button, Main image, Background image, RMIT logo, RFWN tagline, CRICOS line, Extra info, or Unassigned. Adflow auto-detects the role for every element using text content, layer name, and size heuristics.',
      'New role-assignment icon column in the Layers panel: a small resize/expand icon sits beside the lock and visibility eyes on every layer row. Gray when auto-detected, green once you pick a role yourself. Click it for a dropdown of all ten roles + a Reset-to-auto option.',
      'The "Auto-resize from selected" button now opens a settings modal first. Pick exactly which target canvases to resize into (multi-select checkboxes, source excluded), toggle whether unassigned elements get placed in the centre of each target, and review a clear warning that the operation wipes everything on the selected target frames (including locked + hidden layers) before placing new content. Ctrl+Z still reverts the whole operation.',
      'The rule engine that reads each role and places elements per-canvas is wired up next step — the modal currently surfaces a status toast confirming the settings it captured.'
    ]
  },
  {
    version: 'v0.12.0',
    date: 'May 2026',
    items: [
      'New layer-based masking system. Right-click a shape layer (rectangle, circle, pixel — not line) on a non-persistent frame and pick "Use as mask" to clip the image directly beneath it. The mask carries its own independent animation.',
      'Mask layers show a solid eye icon in the Layers panel (white when active, grey when hidden). Hiding the mask turns it off and the image reverts to fully visible.',
      'Mask layers are mutually exclusive with link groups and dynamic data — both panels show a clear notice when a mask is selected; the Link Group context submenu is suppressed too.',
      'Persistent (Top/Bottom) layers cannot host masks. Dragging a mask into a persistent slot drops the mask flag automatically.',
      'Saving a masked shape to the Assets library strips the mask flag so the asset comes back in as a plain shape.',
      'Export pipeline emits the same SVG-mask construction so masked images export pixel-for-pixel the same way they look in the editor.'
    ]
  },
  {
    version: 'v0.11.2',
    date: 'May 2026',
    items: [
      'Footer pills (zoom + version) are now plain text (no boxes / borders) with a subtle hover background.',
      'Renamed the version dropdown placeholder from "Template (no version)" to "No version".'
    ]
  },
  {
    version: 'v0.11.1',
    date: 'May 2026',
    items: [
      'Rebuilt the Documentation modal as a two-column menu: 11 top-level sections each with focused subsections. Click a section to expand its subs, click a sub to load just that page on the right.',
      'Wider modal (~1100px), accent-coloured active row in the sidebar, scoped scrollbars, and a Keyboard Shortcuts table under Reference.',
      'Added a dedicated Cloud & Spaces section covering the splash sign-in gate, cloud projects, spaces, invitations, and folders.',
      'Moved the zoom and version labels out of the top bar and into a static footer strip at the bottom of the right panel — zoom pill on the left, version pill on the right. Both are now styled as clickable pill buttons; the strip stays put as the panel scrolls.'
    ]
  },
  {
    version: 'v0.11.0',
    date: 'May 2026',
    items: [
      'Rebuilt the Data & Versions panel as a spreadsheet-style editor. The modal is now ~1180px wide with a two-column layout: controls (import/export, slot mapping, enable toggle, export-all) stay on the left, the data sheet fills the right.',
      'Inline column rename — double-click a column header to edit; Enter to commit, Esc to cancel. Column header now has separate buttons for the naming-key star (★), sort cycle (↕/↑/↓), and delete (×).',
      'Drag-and-drop reordering for both rows (grip ⋮⋮ at the left of each row) and columns (drag the column header). Active-preview index follows the row it was attached to.',
      'Sort cycle on each column: none → ascending → descending → none. Sort uses numeric comparison when both values parse as numbers, locale-aware string comparison otherwise.',
      'Sheet now stretches to the modal\'s available height and shows numeric row numbers in a dedicated # column.'
    ]
  },
  {
    version: 'v0.10.1',
    date: 'May 2026',
    items: [
      'Manage Spaces now supports rename (owner), duplicate (anyone — clones folders + projects to a new space you own), and delete (owner — confirmation by typing the space name; cleans up storage blobs).',
      'Signing out now flushes the local autosave and reloads back to the splash + sign-in gate instead of leaving the app open in a half-signed-out state.',
      'Pushing to the cloud now checks for a same-name collision in the current context. If another project shares the name, a warning toast appears with "Replace" and "Rename" buttons; pushes with unique names go through silently as before.',
      'Lowered the minimum supported viewport from 1920 × 1080 back to 1366 × 768 — closer to what most laptops can give without external displays.'
    ]
  },
  {
    version: 'v0.10.0',
    date: 'May 2026',
    items: [
      'Loading screen now doubles as the sign-in gate with a "Remember me on this device" checkbox and a "Use locally" escape hatch. Remembered sessions skip the gate and the splash dismisses normally.',
      'Added team Spaces — multi-workspace collaboration with a switcher in the chip dropdown. The current space\'s name appears next to your email in the top bar.',
      'Invitations via shareable join link from Manage Spaces → Invite. Recipients land at /?invite=… and on sign-in are auto-joined.',
      'Cloud Projects panel now scopes to the current context (Personal or active Space) and shows the space\'s folder tree on the left. Folders can be created, assigned to projects, and deleted inline.',
      'New SQL required in Supabase for the spaces/folders/invitations schema and updated RLS policies on projects and storage.'
    ]
  },
  {
    version: 'v0.9.0',
    date: 'May 2026',
    items: [
      'Optional account sign-up and log-in (email + password) via a top-bar chip. Anonymous local use is unchanged — sign-in only unlocks cloud features and never blocks the app.',
      'New "My Cloud Projects" panel (accessible from the chip dropdown or the File menu) for pushing the current project to Supabase storage and pulling any of your cloud-saved projects back into the workspace. Pushed projects use the same .flow format as local saves, so nothing has to be re-imported.',
      'Added a stable per-project ID (state.projectId) so cloud pushes update the same record rather than creating duplicates. Existing local projects get one assigned on first open.'
    ]
  },
  {
    version: 'v0.8.3',
    date: 'May 2026',
    items: [
      'Loading splash now cycles through a randomised pool of ~45 tech-humour quips (Sims-style — "Reticulating splines…", "Convincing the kerning to behave…", "Locating the perfect shade of RMIT red…"). Shuffled per session and long enough to rarely repeat; if init runs long, more quips appear automatically.',
      'Restyled the below-minimum-resolution warning to match the splash visual language — Adflow logo, the existing randomised one-liner as a heading, and a fresh explanation paragraph. Static screen (no loading animation, no progress bar).',
      'Bumped minimum supported viewport from 1024 × 768 to 1920 × 1080 to match real banner-production needs.'
    ]
  },
  {
    version: 'v0.8.2',
    date: 'May 2026',
    items: [
      'Added a themed loading splash that appears on startup with the Adflow logo, a subtle accent-color glow, a rapidly-cycling status line, and a sheen-animated progress bar. Tied to real initialisation phases (session restore, brand library, workspace build, polish) and held visible for at least 1.5 seconds so it never flashes by.'
    ]
  },
  {
    version: 'v0.8.1',
    date: 'May 2026',
    items: [
      'Added a hover preview thumbnail to the Assets panel: hovering an image asset row now pops a small thumbnail next to it after a short delay, with the popup flipping to the row\'s other side when it would overflow the viewport.',
      'Startup view now always centers on the canvases regardless of last saved scroll position. If a previous scroll position is available, a toast appears with a "Resume previous view" button to jump back to where you left off — same behaviour applies when opening a .flow project file.'
    ]
  },
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
      'Rebranded the application from Ad Cooker to RMIT Adflow.',
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

function openChangelogModal() {
  const changelogHtml = `
      <div style="font-size:13px; line-height:1.6; color:var(--text-main); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-height:400px; overflow-y:auto; padding-right:8px;">
        ${generateChangelogHtml()}
      </div>`;
  openModal('Version & Changelog History', changelogHtml, false);
}
