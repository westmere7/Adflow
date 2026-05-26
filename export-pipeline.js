// ============================================================================
// export-pipeline.js — Google-Ads-friendly HTML5 export
// ============================================================================
// Generates self-contained ZIPs that pass Google Ads / Studio validation:
// inline assets (images as base64 / file:// in zip), inline @font-face for
// brand fonts, clickTag wiring, CSS keyframe animations baked from the
// app state, and a synthesized index.html shell.
//
// Public functions:
//   getRequiredFonts(canvas)              — collect Museo / Bilo / Akkurat
//                                            weights & styles in use
//   exportCanvasAsZip(canvas)             — primary HTML5 ZIP export
//   exportCanvasAsPng(canvas)             — static PNG via dom-to-image
//   clearCanvasFrame(canvas)              — strip frame-scoped elements,
//                                            used by image-export bake
//   generateExportHTML(canvas, zip?, isImageExport?) — public HTML builder
//   _generateExportHTMLRaw(...)           — internal template, the actual
//                                            string-builder doing the work
//   openExportModal()                     — Export modal (table of canvases,
//                                            individual + ZIP-all + image-set
//                                            export entry points)
//
// Loaded BEFORE script.js. Top-level event-handler attachments at the bottom
// of the file wire the Export menu items. References to script.js globals
// (state, dmBakeRow, dmRunExport, dmActiveRowForOutput, getActiveCanvas,
// elementNode, multiSelectionOverlay, openModal, showCanvasNotification, etc.)
// are call-time only — fire only when the user triggers an export.
// ============================================================================

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

// Shared single-canvas exporters — used by the Canvas Properties panel
// buttons, the canvas right-click context menu, and the Export dialogue.
// `options.filenamePrefix` overrides the auto-derived safe project name
// (lets the Export dialogue's filename input change just the download
// name without touching `state.projectName`). `options.includeSkippedFrames`
// flips the default "skip frames marked with f.skip" behaviour off, so
// the user can force-include flagged frames when they want.
async function exportCanvasAsZip(c, options = {}) {
  if (typeof JSZip === 'undefined') { alert('JSZip is not loaded.'); return; }
  const zip = new JSZip();
  const projName = state.projectName || 'Ad';
  const fallbackSafe = projName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const prefix = (options.filenamePrefix && String(options.filenamePrefix).trim())
    ? String(options.filenamePrefix).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
    : fallbackSafe;

  // generateExportHTML reads this transient flag to decide whether to
  // honour `f.skip`. Saved/restored around the call so concurrent
  // exports of multiple canvases don't leak state across each other.
  const prevIncludeSkipped = state._exportIncludeSkippedFrames;
  if (options.includeSkippedFrames) state._exportIncludeSkippedFrames = true;
  try {
    await dmRunExport(dmActiveRowForOutput(), async () => {
      await addCanvasAssetsToZip(c, zip);
      zip.file('index.html', generateExportHTML(c, zip));
    });
  } finally {
    state._exportIncludeSkippedFrames = prevIncludeSkipped;
  }
  const content = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = `${prefix}_${c.width}x${c.height}.zip`;
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

async function exportCanvasAsPng(c, options = {}) {
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
    // PNG export captures the active frame, so paint that frame's bg
    // beneath the SVG-rendered foreignObject.
    const _pngBg = (typeof getCanvasBg === 'function')
      ? getCanvasBg(c, state.activeFrameId)
      : c.bgColor;
    ctx.fillStyle = _pngBg || '#000';
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
    const fallbackSafe = projName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const prefix = (options.filenamePrefix && String(options.filenamePrefix).trim())
      ? String(options.filenamePrefix).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
      : fallbackSafe;
    a.download = `${prefix}_${c.width}x${c.height}.png`;
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
    // Mask layer: not rendered visibly — its geometry is baked into the SVG
    // mask attached to the image below it. Skip here.
    if (isActiveMask(el)) return '';
    // For rect/circle/button the opacity is the *fill* opacity and is applied to
    // the fill layer below — leave the wrapper at 1 so stroke/text aren't dragged
    // down. All other element types get the opacity on the wrapper as before.
    const isFillTypeWithStroke = el.type === 'rect' || el.type === 'circle' || el.type === 'button' || el.type === 'pixel';
    const wrapOpacity = isFillTypeWithStroke ? 1 : (el.opacity !== undefined ? el.opacity / 100 : 1);
    const fillOpacity = (el.opacity !== undefined ? el.opacity : 100) / 100;
    const wrapStyle = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;transform:rotate(${el.rotation || 0}deg);opacity:${wrapOpacity};`;

    const animType = el.animType || 'none';
    const { entryConfig, entryVars, effConfig, effVars } = getElementAnimationCSS(el, isImageExport);
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
        ? `<span${bgDataAttrs}${spanClass} style="color:${el.color};font-size:${el.fontSize}px;font-weight:${el.weight};line-height:${resolvedLH};font-family:${ff};word-break:normal;overflow-wrap:normal;${bgStyle}">${content}</span>`
        : `<span${spanClass} style="display:inline;color:${el.color};font-size:${el.fontSize}px;font-weight:${el.weight};line-height:${resolvedLH};font-family:${ff};word-break:normal;overflow-wrap:normal;">${content}</span>`;
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
      // Match editor behaviour: gradient fills need an inline <linearGradient>
      // def referenced via url(#id) because SVG fill="" can't take CSS strings.
      const svgGrad = (typeof svgFillForCssColor === 'function') ? svgFillForCssColor(el.color, 'exp_' + el.id) : null;
      const pathFillAttr = svgGrad ? svgGrad.fillAttr : el.color;
      const defs = svgGrad ? svgGrad.defs : '';
      return `    <div style="${wrapStyle}">${openDivs}<div style="width:100%;height:100%;opacity:${fillOpacity};"><svg viewBox="0 0 578.52 556.76" width="100%" height="100%" preserveAspectRatio="none">${defs}<path fill="${pathFillAttr}" d="M290.78,0h-74.15v60.23h-123.75v125.78H0v184.74h92.88v125.78h123.5v60.23h65.55c152.85,0,287.74-123.5,287.74-277.62S444.14,0,290.78,0"/></svg></div>${strokeOverlayHTML(el)}${closeDivs}</div>`;
    }
    if (el.type === 'button') {
      const ff = el.fontFamily ? el.fontFamily + ',sans-serif' : 'Arial,Helvetica,sans-serif';
      const alignMap = { left: 'flex-start', center: 'center', right: 'flex-end', justify: 'space-between' };
      const jc = alignMap[el.textAlign || 'center'];
      const paddingTB = el.paddingTB !== undefined ? el.paddingTB : 0;
      const paddingLR = el.paddingLR !== undefined ? el.paddingLR : 16;
      // Fill is its own absolute layer with `fillOpacity`; the text sits on top
      // at full opacity (relative positioning so it stacks above the fill); the
      // stroke overlay paints last on top of both.
      if (el.autoSize) {
        const autoAttrs = ` class="auto-size-text" data-max-size="${el.maxFontSize !== undefined ? el.maxFontSize : (el.fontSize || 72)}" data-width="${el.width}" data-height="${el.height}" data-padding-lr="${paddingLR}" data-padding-tb="${paddingTB}"`;
        const spanStyle = el.wrapText
          ? `display:inline;word-break:normal;white-space:normal;`
          : `display:inline;white-space:nowrap;`;
        return `    <div style="${wrapStyle}"${autoAttrs}>${openDivs}<div style="position:absolute;inset:0;background:${el.bg};border-radius:${el.radius || 0}px;opacity:${fillOpacity};"></div><div class="auto-size-block" style="position:relative;width:100%;height:100%;color:${el.color};font-size:${el.fontSize}px;font-weight:${el.weight || '600'};display:flex;align-items:center;justify-content:${jc};text-align:${el.textAlign || 'center'};font-family:${ff};cursor:pointer;padding:${paddingTB}px ${paddingLR}px;box-sizing:border-box;${el.wrapText ? 'word-break:normal;' : ''}"><span class="auto-size-span" style="${spanStyle}">${esc(el.text)}</span></div>${strokeOverlayHTML(el)}${closeDivs}</div>`;
      } else {
        const normalBlockStyle = `position:relative;width:100%;height:100%;color:${el.color};font-size:${el.fontSize}px;font-weight:${el.weight || '600'};display:flex;align-items:center;justify-content:${jc};text-align:${el.textAlign || 'center'};font-family:${ff};cursor:pointer;padding:${paddingTB}px ${paddingLR}px;box-sizing:border-box;${el.wrapText ? 'word-break:normal;' : 'white-space:nowrap;'}`;
        return `    <div style="${wrapStyle}">${openDivs}<div style="position:absolute;inset:0;background:${el.bg};border-radius:${el.radius || 0}px;opacity:${fillOpacity};"></div><div style="${normalBlockStyle}">${esc(el.text)}</div>${strokeOverlayHTML(el)}${closeDivs}</div>`;
      }
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
      // Layer-based mask (v0.16.50 revamp): clip the image with CSS
      // `clip-path` using inline shape functions. See script.js
      // `buildMaskClipPath` for the rationale (same algorithm, same
      // function — declared in script.js which loads after this file
      // but renderEl only runs at export time, long after page load).
      let maskCss = '';
      const maskAbove = findMaskAbove(c, el);
      if (maskAbove && typeof buildMaskClipPath === 'function') {
        const cp = buildMaskClipPath(maskAbove, el);
        maskCss = `clip-path:${cp};-webkit-clip-path:${cp};`;
      }
      return `    <div style="${wrapStyle}${maskCss}">${openDivs}<img src="${src}" style="width:100%;height:100%;object-fit:${el.objectFit || 'contain'};" alt="" />${closeDivs}</div>`;
    }
    return '';
  };

  const elsBot = c.elements.filter(e => e.persistent === 'bottom').map(renderEl).join('\n');
  const elsTop = c.elements.filter(e => e.persistent === 'top').map(renderEl).join('\n');

  // Filter out skipped frames unless (a) it's a static image export of the
  // active frame, OR (b) the caller explicitly requested skipped frames be
  // included via `state._exportIncludeSkippedFrames` (set by the Export
  // dialogue's "Skip flagged frames" toggle).
  const includeSkipped = !!state._exportIncludeSkippedFrames;
  const activeFrames = state.frames.filter(f =>
    includeSkipped ||
    !f.skip ||
    (isImageExport && f.id === state.activeFrameId)
  );

  // Each frame div paints its own bg so animations show bg changes
  // correctly between frames. Falls back to c.bgColor when no override.
  const _frameBgOf = (fid) => (typeof getCanvasBg === 'function')
    ? getCanvasBg(c, fid)
    : ((c.bgByFrame && c.bgByFrame[fid] !== undefined) ? c.bgByFrame[fid] : c.bgColor);

  let framesHTML = '';
  const frameData = [];
  activeFrames.forEach((f, i) => {
    const frameEls = c.elements.filter(e => e.persistent === false && e.frameId === f.id).map(renderEl).join('\n');
    const displayStyle = isImageExport
      ? (f.id === state.activeFrameId ? 'block' : 'none')
      : (i === 0 ? 'block' : 'none');
    const frameBg = _frameBgOf(f.id);
    framesHTML += `<div class="frame" id="frame-${f.id}" style="display:${displayStyle};width:100%;height:100%;position:absolute;inset:0;background:${frameBg};">\n${frameEls}\n</div>\n`;
    frameData.push({ id: f.id, duration: f.duration || 2, transition: i === 0 ? 'none' : (f.transition || 'fade'), transitionDuration: f.transitionDuration || 0.5, transitionFade: f.transitionFade });
  });

  let clickAreasHTML = '';
  if (!isImageExport) {
    if (c.fullClickArea !== false) {
      clickAreasHTML = `<a class="clickArea" href="javascript:void(0);" style="position:absolute;inset:0;z-index:9999;display:block;"></a>`;
    } else {
      const clickBtns = c.elements.filter(e => e.type === 'button' && e.isClickArea);
      if (clickBtns.length > 0) {
        clickAreasHTML = clickBtns.map(btn => `<a class="clickArea" href="javascript:void(0);" style="position:absolute;left:${btn.x}px;top:${btn.y}px;width:${btn.width}px;height:${btn.height}px;z-index:9999;display:block;"></a>`).join('\n    ');
      }
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

  /* html/body intentionally transparent (no width/height/background).
     When the ad is served via an iframe (the normal display-ad case)
     the iframe is sized exactly to the ad, so transparency just shows
     the iframe's bg beneath the ad container -- no visible effect.
     When index.html is opened DIRECTLY in a desktop browser, leaving
     html/body transparent prevents the page-wide flood of the canvas
     bg colour that used to drown the viewport in green. The ad sits
     as a contained block in the top-left and the browser shows its
     default page bg around it. The ad's own container div carries
     the explicit pixel size and bg colour. */
  html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
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
        
        var padLR = parseFloat(wrapper.getAttribute('data-padding-lr')) || 0;
        var padTB = parseFloat(wrapper.getAttribute('data-padding-tb')) || 0;
        targetWidth = Math.max(0, targetWidth - padLR * 2);
        targetHeight = Math.max(0, targetHeight - padTB * 2);

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
          
          var fitsHeight = (block.scrollHeight - padTB * 2) <= (targetHeight + 1.5);
          var fitsWidth = (block.scrollWidth - padLR * 2) <= (targetWidth + 1.5);
          
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

function openExportModal() {
  const projName = state.projectName || 'Ad';
  const defaultPrefix = projName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const flaggedFrameCount = (state.frames || []).filter(f => f.skip).length;
  const dm = state.dataMerge;
  const hasVersions = !!(dm && dm.rows && dm.rows.length);
  // Build version dropdown options when we have data rows. The active row
  // (or current selection in the version switcher) is selected by default;
  // the user can pick any other row, or "All versions" which routes to
  // dmExportAllVersions instead of the per-canvas Export Selected path.
  const versionKeyCol = hasVersions
    ? ((dm.keyColumn && dm.columns.includes(dm.keyColumn)) ? dm.keyColumn : dm.columns[0])
    : null;
  const versionLabel = (i) => {
    if (!hasVersions) return '';
    const v = dm.rows[i] && versionKeyCol ? dm.rows[i][versionKeyCol] : '';
    return (v && String(v).trim()) ? String(v) : `Version ${i + 1}`;
  };
  const activeVersionIdx = (hasVersions && dm.activeVersion != null) ? dm.activeVersion : 0;

  const tbody = state.canvases.map((c) => {
    const html = generateExportHTML(c);
    const kb = (new Blob([html]).size / 1024).toFixed(1);
    const ct = state.clickTag || 'No clickTag';
    return `
      <tr data-cid="${c.id}">
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330;"><input type="checkbox" class="export-chk" data-cid="${c.id}" checked title="Include this canvas size in the export" /></td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330;">${c.name || (c.width + '×' + c.height)}</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330;">${c.width}×${c.height}</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330; color:${kb > 150 ? '#ef4444' : '#c7ccdb'}">${kb} KB</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330; font-family:monospace; font-size:10px; color:var(--text-label); word-break:break-all; max-width:200px;">${ct}</td>
      </tr>
    `;
  }).join('');

  const bodyHTML = `
    <!-- Header: filename, format, skip-frames toggle, version (when data
         versions exist). The filename is a build-time override only —
         it doesn't touch state.projectName. -->
    <div style="display:grid; grid-template-columns: ${hasVersions ? '1.3fr 1fr 0.9fr' : '1.4fr 1fr'}; gap:14px; margin-bottom:14px;">
      <div>
        <label style="display:block; font-size:11px; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:.04em;">Filename prefix</label>
        <input type="text" id="exp-filename" value="${defaultPrefix}" placeholder="${defaultPrefix}" style="width:100%; padding:6px 8px; background:var(--bg-input); border:1px solid var(--border-light); border-radius:4px; color:var(--text-main); font-size:12px; font-family:ui-monospace,Consolas,monospace;" title="Just renames the download files. Does NOT change the project name." />
        <div style="font-size:10px; color:var(--text-muted); margin-top:4px;">Each file is named <code style="background:var(--bg-input); padding:1px 4px; border-radius:3px;">prefix_WxH</code>. Renaming here doesn't change the project name.</div>
      </div>
      <div>
        <label style="display:block; font-size:11px; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:.04em;">Format</label>
        <div style="display:flex; gap:6px;">
          <label style="flex:1; display:flex; align-items:center; gap:6px; padding:7px 9px; background:var(--bg-input); border:1px solid var(--border-light); border-radius:4px; cursor:pointer; font-size:12px;">
            <input type="radio" name="exp-format" value="zip" checked style="margin:0;" />
            <span>HTML5 ZIP</span>
          </label>
          <label style="flex:1; display:flex; align-items:center; gap:6px; padding:7px 9px; background:var(--bg-input); border:1px solid var(--border-light); border-radius:4px; cursor:pointer; font-size:12px;">
            <input type="radio" name="exp-format" value="png" style="margin:0;" />
            <span>PNG</span>
          </label>
        </div>
        <div style="font-size:10px; color:var(--text-muted); margin-top:4px;">PNG exports the active frame as a static image (one file per canvas).</div>
      </div>
      ${hasVersions ? `
      <div>
        <label style="display:block; font-size:11px; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:.04em;">Data version</label>
        <select id="exp-version" style="width:100%; padding:6px 8px; background:var(--bg-input); border:1px solid var(--border-light); border-radius:4px; color:var(--text-main); font-size:12px; outline:none; font-family:inherit;" title="Pick which data row to bake into the export, or All versions for one folder per row (ZIP only).">
          ${dm.rows.map((row, i) => `<option value="${i}" ${i === activeVersionIdx ? 'selected' : ''}>${(versionLabel(i) || '').replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</option>`).join('')}
          <option value="all">All versions (separate folders)</option>
        </select>
        <div style="font-size:10px; color:var(--text-muted); margin-top:4px;">"All versions" forces HTML5 ZIP — one folder per data row.</div>
      </div>
      ` : ''}
    </div>

    <div style="margin-bottom:14px; padding:8px 10px; background:var(--bg-input); border:1px solid var(--border-light); border-radius:4px;">
      <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
        <input type="checkbox" id="exp-skip-frames" checked style="margin-top:3px; flex-shrink:0;" ${flaggedFrameCount === 0 ? 'disabled' : ''} />
        <div style="flex:1; min-width:0;">
          <div style="font-size:12px; font-weight:600; color:var(--text-main);">Skip frames marked as skipped${flaggedFrameCount > 0 ? ` (${flaggedFrameCount} flagged)` : ''}</div>
          <div style="font-size:10.5px; color:var(--text-muted); line-height:1.4; margin-top:2px;">${flaggedFrameCount === 0 ? 'No frames are currently flagged. Toggle "Skip Frame" on the timeline to flag one.' : 'On (default): flagged frames are excluded from HTML5 exports. Off: they\'re included. PNG always exports the active frame regardless.'}</div>
        </div>
      </label>
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

    <div style="margin-top: 16px; display: flex; gap: 8px; align-items:center; justify-content:flex-end;">
      <button class="btn primary" id="btn-export-selected" title="Export the selected canvases in the chosen format using the filename above${hasVersions ? '. Honours the Data version dropdown — pick "All versions" to export every row as separate folders' : ''}">Export Selected</button>
    </div>
  `;

  openModal('Export', bodyHTML, false);

  const modalBg = document.body.lastElementChild;

  const chkAll = modalBg.querySelector('#chk-all');
  const chks = modalBg.querySelectorAll('.export-chk');
  chkAll.addEventListener('change', (e) => {
    chks.forEach(chk => chk.checked = e.target.checked);
  });

  modalBg.querySelector('#btn-export-selected').addEventListener('click', async () => {
    const selectedIds = Array.from(chks).filter(c => c.checked).map(c => c.dataset.cid);
    if (selectedIds.length === 0) { alert('No ads selected.'); return; }

    const fnameInput = modalBg.querySelector('#exp-filename');
    const filenamePrefix = (fnameInput && fnameInput.value.trim()) ? fnameInput.value.trim() : defaultPrefix;
    const skipChk = modalBg.querySelector('#exp-skip-frames');
    const includeSkippedFrames = !(skipChk && skipChk.checked);
    const format = (modalBg.querySelector('input[name="exp-format"]:checked') || {}).value || 'zip';
    const versionSelect = modalBg.querySelector('#exp-version');
    const versionChoice = versionSelect ? versionSelect.value : null; // 'all' | '<row-index>' | null
    const selectedCanvases = selectedIds.map(id => state.canvases.find(x => x.id === id)).filter(Boolean);

    // "All versions" routes to the existing dmExportAllVersions path,
    // which already handles its own ZIP-of-folders output. PNG/format
    // selector and filename input are ignored in this mode (matches the
    // old standalone-button behaviour).
    if (hasVersions && versionChoice === 'all') {
      await dmExportAllVersions();
      return;
    }

    // Resolve which data row to bake into the export. When the dropdown
    // is present we honour its current value; otherwise fall back to
    // whatever is currently active in the version switcher (or null).
    let exportVersionIdx = dmActiveRowForOutput();
    if (hasVersions && versionChoice !== null && versionChoice !== 'all') {
      const idx = parseInt(versionChoice, 10);
      if (!isNaN(idx) && dm.rows[idx]) exportVersionIdx = idx;
    }

    if (format === 'png') {
      // PNG path: one file per canvas. Wrap in dmRunExport so the
      // selected version bakes into each render before exportCanvasAsPng
      // snapshots it; otherwise PNGs would silently reflect whatever
      // version was active in the editor.
      await dmRunExport(exportVersionIdx, async () => {
        for (const c of selectedCanvases) {
          await exportCanvasAsPng(c, { filenamePrefix });
        }
      });
      return;
    }

    // ZIP path: outer-zip of per-canvas inner-zips.
    if (typeof JSZip === 'undefined') { alert('JSZip is not loaded.'); return; }
    const safePrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');

    const prevIncludeSkipped = state._exportIncludeSkippedFrames;
    if (includeSkippedFrames) state._exportIncludeSkippedFrames = true;
    const zip = new JSZip();
    try {
      await dmRunExport(exportVersionIdx, async () => {
        for (const c of selectedCanvases) {
          const adZip = new JSZip();
          await addCanvasAssetsToZip(c, adZip);
          const html = generateExportHTML(c, adZip);
          adZip.file('index.html', html);
          const adContent = await adZip.generateAsync({ type: 'blob' });
          zip.file(`${safePrefix}_${c.width}x${c.height}.zip`, adContent);
        }
      });
    } finally {
      state._exportIncludeSkippedFrames = prevIncludeSkipped;
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const outerName = `${safePrefix || 'exported_ads'}.zip`;

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          types: [{ description: 'Exported Ads ZIP', accept: { 'application/zip': ['.zip'] } }],
          suggestedName: outerName
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } catch (e) { if (e.name !== 'AbortError') console.error('Export failed:', e); }
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = outerName;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  });
}

document.getElementById('menu-file-export').addEventListener('click', openExportModal);
document.getElementById('btn-export-top').addEventListener('click', openExportModal);
