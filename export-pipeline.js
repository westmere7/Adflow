// ============================================================================
// export-pipeline.js — Standard-compliant HTML5 export
// ============================================================================
// Generates self-contained ZIPs that pass HTML5 ad validation:
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
// Helper to calculate the collapsed starting polygon coordinates for a split reveal
// along a line passing through the center of the element at a given angle.
function getSplitClipPath(angleDeg) {
  const theta = (angleDeg || 0) * Math.PI / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  
  const corners = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
  ];
  
  const projected = corners.map(pt => {
    const dx = pt.x - 50;
    const dy = pt.y - 50;
    const d = dx * cos + dy * sin;
    const px = 50 + d * cos;
    const py = 50 + d * sin;
    return `${px.toFixed(2)}% ${py.toFixed(2)}%`;
  });
  
  return `polygon(${projected.join(', ')})`;
}

// Helper to calculate the keyframes for a curved motion path Move effect
function getPanCurveKeyframes(el) {
  const px = el.panFromX !== undefined ? el.panFromX : 0;
  const py = el.panFromY !== undefined ? el.panFromY : -50;
  const mx = el.panMidX !== undefined ? el.panMidX : px / 2;
  const my = el.panMidY !== undefined ? el.panMidY : py / 2;
  const rot = el.panRotate !== undefined ? el.panRotate : 0;
  const opStart = el.panFade ? 0 : 1;
  const animName = `eff-pan-${el.id}`;

  let steps = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const pct = i * 5;
    const mt = 1 - t;
    const bx = mt * mt * px + 2 * mt * t * mx;
    const by = mt * mt * py + 2 * mt * t * my;
    const r = mt * rot;
    const o = mt * opStart + t * 1.0;

    steps.push(`      ${pct}% { translate: ${bx.toFixed(1)}px ${by.toFixed(1)}px; rotate: ${r.toFixed(1)}deg; opacity: ${o.toFixed(2)}; }`);
  }

  return `@keyframes ${animName} {\n${steps.join('\n')}\n    }`;
}

// Helper to calculate the keyframes for a zoom transition (with optional elastic bounce)
function getZoomKeyframes(el) {
  const zf = el.zoomFrom !== undefined ? el.zoomFrom / 100 : 0.8;
  const fadeFrom = el.animFade !== false ? 'opacity: 0;' : '';
  const fadeTo = el.animFade !== false ? 'opacity: 1;' : '';
  const animName = `anim-zoom-${el.id}`;
  
  if (el.animBounce) {
    let keyframes = `@keyframes ${animName} {\n`;
    const d = 4.0; // damping
    const f = 2.0; // frequency
    
    for (let pct = 0; pct <= 100; pct += 5) {
      const t = pct / 100;
      const x = Math.exp(-d * t) * Math.cos(2 * Math.PI * f * t);
      const scale = (1.0 + (zf - 1.0) * x).toFixed(3);
      
      let opacityStr = '';
      if (el.animFade !== false) {
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
    return keyframes;
  } else {
    return `@keyframes ${animName} {
      from { transform: scale(${zf}); ${fadeFrom} }
      to { transform: scale(1); ${fadeTo} }
    }`;
  }
}

// Helper to calculate the keyframes for a slide transition (with optional elastic bounce, custom distance, and rotation offset)
function getSlideKeyframes(el) {
  const dir = el.animDirection || 'up';
  const dist = el.animDistance !== undefined ? el.animDistance : 100;
  const rOffset = el.animRotateOffset !== undefined ? el.animRotateOffset : 0;
  const fade = el.animFade !== false;
  const bounce = !!el.animBounce;
  const animName = `anim-slide-${el.id}`;

  if (bounce) {
    let keyframes = `@keyframes ${animName} {\n`;
    const d = 4.0; // damping
    const f = 2.0; // frequency
    
    for (let pct = 0; pct <= 100; pct += 5) {
      const t = pct / 100;
      const x = Math.exp(-d * t) * Math.cos(2 * Math.PI * f * t);
      const currentDist = (dist * x).toFixed(2);
      const currentRot = (rOffset * x).toFixed(2);
      
      let transformStr = '';
      if (dir === 'up') transformStr = `transform: translateY(${currentDist}px) rotate(${currentRot}deg);`;
      else if (dir === 'down') transformStr = `transform: translateY(${-currentDist}px) rotate(${currentRot}deg);`;
      else if (dir === 'left') transformStr = `transform: translateX(${currentDist}px) rotate(${currentRot}deg);`;
      else if (dir === 'right') transformStr = `transform: translateX(${-currentDist}px) rotate(${currentRot}deg);`;
      
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
    return keyframes;
  } else {
    let transformFrom = '';
    if (dir === 'up') transformFrom = `translateY(${dist}px) rotate(${rOffset}deg)`;
    else if (dir === 'down') transformFrom = `translateY(${-dist}px) rotate(${rOffset}deg)`;
    else if (dir === 'left') transformFrom = `translateX(${dist}px) rotate(${rOffset}deg)`;
    else if (dir === 'right') transformFrom = `translateX(${-dist}px) rotate(${rOffset}deg)`;

    return `@keyframes ${animName} {
      from { transform: ${transformFrom}; ${fade ? 'opacity: 0;' : ''} }
      to { transform: translate(0) rotate(0); ${fade ? 'opacity: 1;' : ''} }
    }`;
  }
}

function getFrameTransitionKeyframes(f) {
  const t = f.transition || 'none';
  if (t === 'none') return '';

  const animName = `anim-frame-trans-${f.id}`;
  const fade = f.transitionFade !== false;
  const bounce = !!f.transitionBounce;
  const dir = f.transitionDirection || (t.startsWith('slide-') ? t.replace('slide-', '') : (t.startsWith('swipe-') ? t.replace('swipe-', '') : 'left'));
  
  let keyframes = '';

  if (t === 'fade') {
    keyframes = `@keyframes ${animName} { from { opacity: 0; } to { opacity: 1; } }`;
  } else if (t === 'slide' || t === 'push') {
    let transformFrom = '';
    let transformToOut = '';
    if (dir === 'up') { transformFrom = 'translateY(100%)'; transformToOut = 'translateY(-100%)'; }
    else if (dir === 'down') { transformFrom = 'translateY(-100%)'; transformToOut = 'translateY(100%)'; }
    else if (dir === 'left') { transformFrom = 'translateX(100%)'; transformToOut = 'translateX(-100%)'; }
    else if (dir === 'right') { transformFrom = 'translateX(-100%)'; transformToOut = 'translateX(100%)'; }

    if (bounce) {
      keyframes = `@keyframes ${animName} {\n`;
      const d = 4.0; // damping
      const freq = 2.0; // frequency
      for (let pct = 0; pct <= 100; pct += 5) {
        const time = pct / 100;
        const x = Math.exp(-d * time) * Math.cos(2 * Math.PI * freq * time);
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
            const opt = (time / 0.3).toFixed(2);
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

    if (t === 'push') {
      const animNameOut = `anim-frame-trans-out-${f.id}`;
      keyframes += '\n' + `@keyframes ${animNameOut} {
        from { transform: translate(0); ${fade ? 'opacity: 1;' : ''} }
        to { transform: ${transformToOut}; ${fade ? 'opacity: 0;' : ''} }
      }`;
    }
  } else if (t.startsWith('swipe') || t === 'swipe') {
    let clipFrom = '';
    if (dir === 'up') clipFrom = 'inset(100% 0 0 0)';
    else if (dir === 'down') clipFrom = 'inset(0 0 100% 0)';
    else if (dir === 'left') clipFrom = 'inset(0 0 0 100%)';
    else if (dir === 'right') clipFrom = 'inset(0 100% 0 0)';
    
    keyframes = `@keyframes ${animName} {
      from { clip-path: ${clipFrom}; ${fade ? 'opacity: 0;' : ''} }
      to { clip-path: inset(0 0 0 0); ${fade ? 'opacity: 1;' : ''} }
    }`;
  } else if (t === 'zoom') {
    const zfVal = f.transitionZoomFrom !== undefined ? f.transitionZoomFrom : 80;
    const zf = zfVal / 100;
    if (bounce) {
      keyframes = `@keyframes ${animName} {\n`;
      const d = 4.0; // damping
      const freq = 2.0; // frequency
      for (let pct = 0; pct <= 100; pct += 5) {
        const time = pct / 100;
        const x = Math.exp(-d * time) * Math.cos(2 * Math.PI * freq * time);
        const scale = (1.0 + (zf - 1.0) * x).toFixed(3);
        
        let opacityStr = '';
        if (fade) {
          if (pct === 0) opacityStr = 'opacity: 0; ';
          else if (pct >= 30) opacityStr = 'opacity: 1; ';
          else {
            const opt = (time / 0.3).toFixed(2);
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
  } else if (t === 'split') {
    const angle = f.transitionAngle !== undefined ? f.transitionAngle : 0;
    const fromPoly = getSplitClipPath(angle);
    keyframes = `@keyframes ${animName} {
      from { clip-path: ${fromPoly}; ${fade ? 'opacity: 0;' : ''} }
      to { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); ${fade ? 'opacity: 1;' : ''} }
    }`;
  } else if (t === 'iris') {
    const shape = f.transitionIrisShape || 'circle';
    const origin = f.transitionIrisOrigin || 'center';
    let originCoords = '50% 50%';
    if (origin === 'top-left') originCoords = '0% 0%';
    else if (origin === 'top-right') originCoords = '100% 0%';
    else if (origin === 'bottom-left') originCoords = '0% 100%';
    else if (origin === 'bottom-right') originCoords = '100% 100%';

    let fromClip = '';
    let toClip = '';

    if (shape === 'circle') {
      fromClip = `circle(0% at ${originCoords})`;
      toClip = `circle(150% at ${originCoords})`;
    } else if (shape === 'square') {
      if (origin === 'center') {
        fromClip = 'inset(50%)';
        toClip = 'inset(0%)';
      } else if (origin === 'top-left') {
        fromClip = 'inset(0% 100% 100% 0%)';
        toClip = 'inset(0%)';
      } else if (origin === 'top-right') {
        fromClip = 'inset(0% 0% 100% 100%)';
        toClip = 'inset(0%)';
      } else if (origin === 'bottom-left') {
        fromClip = 'inset(100% 100% 0% 0%)';
        toClip = 'inset(0%)';
      } else if (origin === 'bottom-right') {
        fromClip = 'inset(100% 0% 0% 100%)';
        toClip = 'inset(0%)';
      }
    } else if (shape === 'diamond') {
      if (origin === 'center') {
        fromClip = 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)';
        toClip = 'polygon(50% -100%, 200% 50%, 50% 200%, -100% 50%)';
      } else if (origin === 'top-left') {
        fromClip = 'polygon(0% 0%, 0% 0%, 0% 0%)';
        toClip = 'polygon(0% 0%, 250% 0%, 0% 250%)';
      } else if (origin === 'top-right') {
        fromClip = 'polygon(100% 0%, 100% 0%, 100% 0%)';
        toClip = 'polygon(100% 0%, -150% 0%, 100% 250%)';
      } else if (origin === 'bottom-left') {
        fromClip = 'polygon(0% 100%, 0% 100%, 0% 100%)';
        toClip = 'polygon(0% 100%, 250% 100%, 0% -150%)';
      } else if (origin === 'bottom-right') {
        fromClip = 'polygon(100% 100%, 100% 100%, 100% 100%)';
        toClip = 'polygon(100% 100%, -150% 100%, 100% -150%)';
      }
    }

    keyframes = `@keyframes ${animName} {
      from { clip-path: ${fromClip}; ${fade ? 'opacity: 0;' : ''} }
      to { clip-path: ${toClip}; ${fade ? 'opacity: 1;' : ''} }
    }`;
  }

  return keyframes;
}


// ============================================================================
// Export — Standard-compliant HTML5 (active canvas)
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
  const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
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
function getExportFilename(el, ext) {
  const dm = state.dataMerge;
  const _imgDyn = typeof dmIsDynamicEditable === 'function' && dmIsDynamicEditable(el, 'image');
  if (_imgDyn && dm && dm.enabled && dm.activeVersion != null) {
    const row = dm.rows[dm.activeVersion];
    const sk = dmSlotKey(el);
    const col = dm.mappings[sk + '::image'];
    const val = row && row[col];
    if (val) {
      const base = String(val).replace(/\.[a-z0-9]+$/i, '').trim();
      if (base) return `${base}.${ext}`;
    }
  }

  let originalAssetId = el.assetId;
  if (state.compressedAssetsMap) {
    for (const [origId, compId] of Object.entries(state.compressedAssetsMap)) {
      if (compId === el.assetId) {
        originalAssetId = origId;
        break;
      }
    }
  }

  const nameInNames = state.assetNames && state.assetNames[originalAssetId];
  if (nameInNames) {
    const base = String(nameInNames).replace(/\.[a-z0-9]+$/i, '').trim();
    if (base) return `${base}.${ext}`;
  }

  return `${el.assetId}.${ext}`;
}

function _generateExportHTMLRaw(targetCanvas, zipRef, isImageExport = false) {
  const c = targetCanvas || getActiveCanvas();
  if (!c) return '';
  const esc = (s) => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  let dynamicKeyframes = '';

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
    if (animType === 'split' && !isImageExport) {
      const fromPoly = getSplitClipPath(el.animAngle || 0);
      const fadeFrom = el.animFade !== false ? 'opacity: 0;' : '';
      const fadeTo = el.animFade !== false ? 'opacity: 1;' : '';
      dynamicKeyframes += `
  @keyframes anim-split-${el.id} {
    from { clip-path: ${fromPoly}; ${fadeFrom} }
    to { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); ${fadeTo} }
  }`;
    }
    const isZoomLike = animType === 'zoom' || animType === 'zoom-in' || animType === 'pop-in';
    if (isZoomLike && !isImageExport) {
      const tempEl = { ...el };
      if (animType === 'pop-in') {
        tempEl.zoomFrom = 80;
        tempEl.animFade = true;
      } else if (animType === 'zoom-in') {
        tempEl.zoomFrom = 110;
        tempEl.animFade = true;
      }
      dynamicKeyframes += '\n' + getZoomKeyframes(tempEl);
    }
    const isSlideLike = animType === 'slide' || animType === 'slide-up' || animType === 'slide-down' || animType === 'slide-left' || animType === 'slide-right';
    if (isSlideLike && !isImageExport) {
      const tempEl = { ...el };
      if (animType === 'slide-up') { tempEl.animDirection = 'up'; tempEl.animDistance = 20; }
      else if (animType === 'slide-down') { tempEl.animDirection = 'down'; tempEl.animDistance = 20; }
      else if (animType === 'slide-left') { tempEl.animDirection = 'left'; tempEl.animDistance = 20; }
      else if (animType === 'slide-right') { tempEl.animDirection = 'right'; tempEl.animDistance = 20; }
      dynamicKeyframes += '\n' + getSlideKeyframes(tempEl);
    }
    if (el.effectType === 'pan' && el.panMidX !== undefined && el.panMidY !== undefined && !isImageExport) {
      dynamicKeyframes += '\n' + getPanCurveKeyframes(el);
    }
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
      } else if (animType === 'word-fade') {
        const words = (el.text || '').split(/(\s+)/);
        const nonSpas = words.filter(w => /\S/.test(w));
        const totalDur = el.animDuration || 1;
        const wordDur = 0.3;
        const baseDelay = el.animDelay || 0;
        const wordDelay = totalDur / Math.max(1, nonSpas.length);

        let wordIdx = 0;
        content = words.map(w => {
          if (w === '\n') return '<br/>';
          if (/\s+/.test(w)) return w.replace(/\n/g, '<br/>');
          const del = (Number(baseDelay) + wordIdx * wordDelay).toFixed(3);
          wordIdx++;
          const wordContent = esc(w);
          const animStyle = isImageExport ? '' : `opacity:0; display:inline-block; animation: anim-fade-in ${wordDur}s linear ${del}s both;`;
          return `<span style="${animStyle}">${wordContent}</span>`;
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
      const useLineBgScript = el.hasBg && el.animateBg && !isImageExport && (animType === 'typing' || animType === 'fade-typing' || animType === 'word-fade');
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
        const exportName = getExportFilename(el, ext);
        const filename = `assets/${exportName}`;
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
      let maskImgStyle = '';
      const maskAbove = findMaskAbove(c, el);
      if (maskAbove && typeof buildMaskClipPath === 'function') {
        const cp = buildMaskClipPath(maskAbove, el);
        maskCss = `clip-path:${cp};-webkit-clip-path:${cp};`;
        
        let animations = [];
        
        // 1. Entrance transition on the mask
        if (typeof generateMaskClipPathKeyframes === 'function' && !isImageExport) {
          const maskAnim = generateMaskClipPathKeyframes(maskAbove, el);
          if (maskAnim) {
            dynamicKeyframes += '\n' + maskAnim.keyframes;
            animations.push(maskAnim.animationCss);
          }
        }
        
        // 2. Continuous FX on the mask
        if (typeof getElementAnimationCSS === 'function' && !isImageExport) {
          const maskEff = getElementAnimationCSS(maskAbove, isImageExport);
          if (maskEff.effConfig) {
            const animRule = maskEff.effConfig.replace('animation:', '').trim();
            if (animRule) {
              animations.push(animRule);
            }
            maskCss += maskEff.effVars;
          }
          
          if (typeof getInverseElementAnimationCSS === 'function') {
            const maskInverseEff = getInverseElementAnimationCSS(maskAbove, isImageExport, el);
            if (maskInverseEff.effConfig) {
              maskImgStyle = `${maskInverseEff.effConfig}${maskInverseEff.effVars}`;
            }
          }

          // Apply transform-origin to both the parent mask wrapper and the child image
          const maskCenterX = maskAbove.x + maskAbove.width / 2 - el.x;
          const maskCenterY = maskAbove.y + maskAbove.height / 2 - el.y;
          maskCss += `transform-origin:${maskCenterX}px ${maskCenterY}px;`;
          maskImgStyle += `transform-origin:${maskCenterX}px ${maskCenterY}px;`;
        }
        
        if (animations.length > 0) {
          maskCss += `animation:${animations.join(', ')};`;
        }
      }
      return `    <div style="${wrapStyle}${maskCss}">${openDivs}<img src="${src}" style="width:100%;height:100%;object-fit:${el.objectFit || 'contain'};${maskImgStyle}" alt="${esc(el.altText || '')}" />${closeDivs}</div>`;
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
    const excludePers = !!f.excludePersistent;
    const frameElsList = [];
    if (!excludePers) {
      c.elements.filter(e => e.persistent === 'bottom').forEach(e => frameElsList.push(renderEl(e)));
    }
    c.elements.filter(e => e.persistent === false && e.frameId === f.id).forEach(e => frameElsList.push(renderEl(e)));
    if (!excludePers) {
      c.elements.filter(e => e.persistent === 'top').forEach(e => frameElsList.push(renderEl(e)));
    }
    const frameEls = frameElsList.join('\n');

    const displayStyle = isImageExport
      ? (f.id === state.activeFrameId ? 'block' : 'none')
      : (i === 0 ? 'block' : 'none');
    const frameBg = _frameBgOf(f.id);
    framesHTML += `<div class="frame" id="frame-${f.id}" style="display:${displayStyle};width:100%;height:100%;position:absolute;inset:0;background:${frameBg};">\n${frameEls}\n</div>\n`;
    const transitionVal = (i === 0)
      ? (state.loopAd ? (f.transition || 'none') : 'none')
      : (f.transition || 'fade');
    frameData.push({ 
      id: f.id, 
      duration: f.duration || 2, 
      transition: transitionVal, 
      transitionDuration: f.transitionDuration || 0.5, 
      transitionFade: f.transitionFade,
      excludePersistent: excludePers
    });
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

  activeFrames.forEach((f, i) => {
    if (i > 0 || (i === 0 && state.loopAd)) {
      const kf = getFrameTransitionKeyframes(f);
      if (kf) {
        dynamicKeyframes += '\n' + kf;
      }
    }
  });

  const activeFrameIdx = activeFrames.findIndex(f => f.id === state.activeFrameId);
  const initExclude = (activeFrameIdx >= 0) ? !!activeFrames[activeFrameIdx].excludePersistent : (activeFrames[0] ? !!activeFrames[0].excludePersistent : false);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Ad</title>
<meta name="ad.size" content="width=${c.width},height=${c.height}">
<style>
${fontFaceRules.join('\n')}
${dynamicKeyframes}

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
  @keyframes eff-wiggle { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
  @keyframes eff-spin { 100% { transform: rotate(var(--spin-target, 360deg)); } }
  @keyframes eff-heartbeat { 0% { transform: scale(1); } 14% { transform: scale(1.3); } 28% { transform: scale(1); } 42% { transform: scale(1.3); } 70% { transform: scale(1); } }
  @keyframes eff-pan { 0% { translate: var(--pan-x, 0px) var(--pan-y, 0px); rotate: var(--pan-rotate, 0deg); opacity: var(--pan-opacity-start, 1); } 100% { translate: 0 0; rotate: 0deg; opacity: 1; } }
  @keyframes eff-zoom { 0% { scale: 1; } 100% { scale: var(--zoom-target, 1.5); } }
  @keyframes eff-pulse-inverse { 0% { scale: 1; } 50% { scale: 0.9524; } 100% { scale: 1; } }
  @keyframes eff-float-inverse { 0% { translate: 0 0; } 50% { translate: 0 10px; } 100% { translate: 0 0; } }
  @keyframes eff-wiggle-inverse { 0%, 100% { rotate: 5deg; } 50% { rotate: -5deg; } }
  @keyframes eff-spin-inverse { 100% { rotate: var(--spin-target-inverse, -360deg); } }
  @keyframes eff-heartbeat-inverse { 0% { scale: 1; } 14% { scale: 0.7692; } 28% { scale: 1; } 42% { scale: 0.7692; } 70% { scale: 1; } }
  @keyframes eff-pan-inverse { 0% { translate: var(--pan-x, 0px) var(--pan-y, 0px); rotate: var(--pan-rotate, 0deg); } 100% { translate: 0 0; rotate: 0deg; } }
  @keyframes eff-zoom-inverse { 0% { scale: 1; } 100% { scale: var(--zoom-target-inverse, 0.6667); } }

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
    <div id="layer-bot" style="position:absolute;inset:0;pointer-events:none;z-index:1;display:${initExclude ? 'block' : 'none'};">
${elsBot}
    </div>
    <div id="layer-frames" style="position:absolute;inset:0;pointer-events:none;z-index:2;">
${framesHTML}
    </div>
    <div id="layer-top" style="position:absolute;inset:0;pointer-events:none;z-index:3;display:${initExclude ? 'block' : 'none'};">
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

    function updatePersistentLayersVisibility(frameIdx) {
      var exclude = !!frames[frameIdx].excludePersistent;
      var botLayer = document.getElementById('layer-bot');
      var topLayer = document.getElementById('layer-top');
      if (botLayer) botLayer.style.display = exclude ? 'block' : 'none';
      if (topLayer) topLayer.style.display = exclude ? 'block' : 'none';
    }
    
    function nextFrame() {
      if (frames.length <= 1) return;
      var prevFrameIdx = currentFrame;
      var prevFrameEl = document.getElementById('frame-' + frames[prevFrameIdx].id);
      
      currentFrame = (currentFrame + 1) % frames.length;
      updatePersistentLayersVisibility(currentFrame);
      var nextFrameEl = document.getElementById('frame-' + frames[currentFrame].id);
      
      prevFrameEl.style.zIndex = '1';
      nextFrameEl.style.zIndex = '2';
      nextFrameEl.style.display = 'block';
      
      var t = frames[currentFrame].transition;
      var td = (frames[currentFrame].transitionDuration || 0.5) + 's';
      var anim = '';
      var animOut = '';
      if (t && t !== 'none') {
        anim = 'anim-frame-trans-' + frames[currentFrame].id;
        if (t === 'push') {
          animOut = 'anim-frame-trans-out-' + frames[currentFrame].id;
        }
      }
      
      nextFrameEl.style.animation = anim ? (anim + ' ' + td + ' ease both') : '';
      if (animOut) {
        prevFrameEl.style.animation = animOut + ' ' + td + ' ease both';
      }
      
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
      updatePersistentLayersVisibility(0);
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

  const selectedCount = dm && dm.rows ? dm.rows.filter(r => r._selected !== false).length : 0;

  const tbody = state.canvases.map((c) => {
    let ct = '';
    const ctCol = dm ? dm.mappings['clicktag::url'] : null;
    if (dm && ctCol && dm.rows[activeVersionIdx]) {
      ct = dm.rows[activeVersionIdx][ctCol] || state.clickTag || 'No clickTag';
    } else {
      ct = state.clickTag || 'No clickTag';
    }
    const kb = c._valKb || 'calc...';
    
    const hasErrors = c._valErrors && c._valErrors.length > 0;
    const hasA11y = c._valA11y && c._valA11y.length > 0;
    const hasBrand = c._valBrand && c._valBrand.length > 0;

    const specsIcon = hasErrors ? getWarningIcon('#ef4444', 13) : getCheckIcon('#10b981', 13);
    const a11yIcon = hasA11y ? getWarningIcon('#f97316', 13) : getCheckIcon('#10b981', 13);
    const brandIcon = hasBrand ? getWarningIcon('#f97316', 13) : getCheckIcon('#10b981', 13);

    const specsTitle = hasErrors ? `${c._valErrors.length} compliance errors. Click to view.` : 'All compliance checks passed. Click to view.';
    const a11yTitle = hasA11y ? `${c._valA11y.length} accessibility warnings. Click to view.` : 'All accessibility checks passed. Click to view.';
    const brandTitle = hasBrand ? `${c._valBrand.length} branding warnings. Click to view.` : 'All branding checks passed. Click to view.';

    return `
      <tr data-cid="${c.id}">
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330;"><input type="checkbox" class="export-chk" data-cid="${c.id}" checked title="Include this canvas size in the export" /></td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330;">${c.name || (c.width + '×' + c.height)}</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #1f2330;">${c.width}×${c.height}</td>
        <td class="exp-weight" style="padding: 6px 0; border-bottom: 1px solid #1f2330; color:${kb !== 'calc...' && parseFloat(kb) > 150 ? '#ef4444' : '#c7ccdb'}">${kb} ${kb === 'calc...' ? '' : 'KB'}</td>
        <td class="exp-clicktag" style="padding: 6px 0; border-bottom: 1px solid #1f2330; max-width: 180px;">
          <div style="font-family:monospace; font-size:10.5px; overflow-x:auto; white-space:nowrap; scrollbar-width:none; -ms-overflow-style:none;">
            <a ${ct && ct !== '—' && ct !== 'No clickTag' ? `href="${ct.startsWith('http') ? ct : 'https://' + ct}" target="_blank" style="color:var(--accent-light, #a78bfa); text-decoration:none; cursor:pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'"` : `style="color:var(--text-label); text-decoration:none;"`}>${ct}</a>
          </div>
        </td>
        <td class="exp-td-specs" style="padding: 6px 0; border-bottom: 1px solid #1f2330; text-align:center;">
          <span class="exp-val-badge" data-tab="specs" data-cid="${c.id}" style="cursor:pointer;" title="${specsTitle}">${specsIcon}</span>
        </td>
        <td class="exp-td-a11y" style="padding: 6px 0; border-bottom: 1px solid #1f2330; text-align:center;">
          <span class="exp-val-badge" data-tab="a11y" data-cid="${c.id}" style="cursor:pointer;" title="${a11yTitle}">${a11yIcon}</span>
        </td>
        <td class="exp-td-brand" style="padding: 6px 0; border-bottom: 1px solid #1f2330; text-align:center;">
          <span class="exp-val-badge" data-tab="brand" data-cid="${c.id}" style="cursor:pointer;" title="${brandTitle}">${brandIcon}</span>
        </td>
      </tr>
    `;
  }).join('');

  const bodyHTML = `
    <!-- Header: filename, format, skip-frames toggle, version (when data
         versions exist). The filename is a build-time override only —
         it doesn't touch state.projectName. -->
    <div style="display:grid; grid-template-columns: ${hasVersions ? '1.2fr 1fr 1.1fr' : '1.4fr 1fr'}; gap:14px; margin-bottom:14px;">
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
        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; font-weight:600; color:var(--text-main);">
            <input type="radio" name="exp-version-mode" value="single" checked style="margin:0;" />
            <span>Single Version</span>
          </label>
          <select id="exp-version" style="width:100%; padding:6px 8px; background:var(--bg-input); border:1px solid var(--border-light); border-radius:4px; color:var(--text-main); font-size:12px; outline:none; font-family:inherit; margin-left:18px; width:calc(100% - 18px);" title="Pick which data row to bake into the export.">
            ${dm.rows.map((row, i) => `<option value="${i}" ${i === activeVersionIdx ? 'selected' : ''}>${(versionLabel(i) || '').replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</option>`).join('')}
          </select>
          
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; font-weight:600; color:var(--text-main); margin-top:2px;">
            <input type="radio" name="exp-version-mode" value="all" style="margin:0;" />
            <span>All Selected Versions (${selectedCount})</span>
          </label>
        </div>
        <div style="font-size:10px; color:var(--text-muted); margin-top:6px; line-height:1.3;">"All selected versions" forces HTML5 ZIP — one folder per selected data row.</div>
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
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;width:40px;"><input type="checkbox" id="chk-all" checked title="Select/deselect all canvas sizes" /></th>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;color:var(--text-label);font-weight:600;width:180px;">Name</th>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;color:var(--text-label);font-weight:600;width:80px;">Size</th>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;color:var(--text-label);font-weight:600;width:95px;">Est. Weight</th>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;color:var(--text-label);font-weight:600;">Click Tag</th>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;color:var(--text-label);font-weight:600;width:110px;text-align:center;">Ad Compliance</th>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;color:var(--text-label);font-weight:600;width:110px;text-align:center;">Accessibility</th>
          <th style="padding-bottom:8px;border-bottom:1px solid #1f2330;color:var(--text-label);font-weight:600;width:90px;text-align:center;">Branding</th>
        </tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>

    <div style="margin-top: 16px; display: flex; gap: 8px; align-items:center; justify-content:space-between;">
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="btn" id="btn-export-open-validator" style="
          background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(124, 92, 255, 0.05));
          border: 1px solid rgba(124, 92, 255, 0.35);
          color: var(--accent-light);
          font-weight: 600;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        " title="Open Ads Validator">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-top:-1px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Ads Validator
        </button>
        ${hasVersions ? `
        <button class="btn" id="btn-export-all-versions-validator" style="
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(20, 184, 166, 0.05));
          border: 1px solid rgba(20, 184, 166, 0.35);
          color: #2dd4bf;
          font-weight: 600;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        " title="Batch-validate compliance, accessibility, and branding across all versions">
          All Versions Validator
        </button>
        ` : ''}
        <button class="btn" id="btn-export-batch-webp" style="
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05));
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34d399;
          font-weight: 600;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        " title="Compress image assets of oversized canvases to WebP format across selected canvases and versions">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-top:-1px;">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          Batch WebP Compression
        </button>
      </div>
      <button class="btn primary" id="btn-export-selected" title="Export the selected canvases in the chosen format using the filename above. Honors version export settings.">Export Selected</button>
    </div>
  `;

  openModal('Export', bodyHTML, false);

  const modalBg = document.body.lastElementChild;
  const modal = modalBg.querySelector('.modal');
  if (modal) {
    modal.style.width = '1200px';
    modal.style.maxWidth = '95vw';
  }

  const calculateCanvasZipSize = async (c, versionIdx) => {
    if (typeof JSZip === 'undefined') return 0;
    const zip = new JSZip();
    await dmRunExport(versionIdx, async () => {
      await addCanvasAssetsToZip(c, zip);
      zip.file('index.html', generateExportHTML(c, zip));
    });
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    return parseFloat((blob.size / 1024).toFixed(1));
  };

  const chkAll = modalBg.querySelector('#chk-all');
  const chks = modalBg.querySelectorAll('.export-chk');
  chkAll.addEventListener('change', (e) => {
    chks.forEach(chk => 	chk.checked = e.target.checked);
  });

  const btnOpenValidator = modalBg.querySelector('#btn-export-open-validator');
  if (btnOpenValidator) {
    btnOpenValidator.addEventListener('click', () => {
      openValidatorDetails(state.canvases.find(x => x.id === state.activeCanvasId) || state.canvases[0]);
    });
  }

  const btnAllVersionsValidator = modalBg.querySelector('#btn-export-all-versions-validator');
  if (btnAllVersionsValidator) {
    btnAllVersionsValidator.addEventListener('click', () => {
      runAllVersionsValidator();
    });
  }

  const btnBatchWebp = modalBg.querySelector('#btn-export-batch-webp');
  if (btnBatchWebp) {
    btnBatchWebp.addEventListener('click', () => {
      runBatchWebpCompression();
    });
  }

  modalBg.addEventListener('click', (e) => {
    const badge = e.target.closest('.exp-val-badge');
    if (badge) {
      const cid = badge.dataset.cid;
      const tab = badge.dataset.tab;
      const canvas = state.canvases.find(x => x.id === cid);
      if (canvas) {
        openValidatorDetails(canvas, tab);
      }
    }
  });

  const updateExportTableDetails = async () => {
    const versionModeRadio = modalBg.querySelector('input[name="exp-version-mode"]:checked');
    const mode = versionModeRadio ? versionModeRadio.value : 'single';
    const versionSelect = modalBg.querySelector('#exp-version');
    
    if (versionSelect) {
      versionSelect.disabled = (mode === 'all');
    }
    
    const versionChoice = mode === 'all' ? 'all' : (versionSelect ? versionSelect.value : null);
    
    let exportVersionIdx = null;
    if (hasVersions && versionChoice !== 'all' && versionChoice !== null) {
      const idx = parseInt(versionChoice, 10);
      if (!isNaN(idx) && dm.rows[idx]) exportVersionIdx = idx;
    }

    state.canvases.forEach(c => {
      const tr = modalBg.querySelector(`tr[data-cid="${c.id}"]`);
      if (!tr) return;
      const weightTd = tr.querySelector('.exp-weight');
      if (weightTd && !(hasVersions && mode === 'all')) {
        weightTd.textContent = 'calc...';
        weightTd.style.color = 'var(--text-muted)';
      }
    });
    
    const limitKb = state.adSizeLimit || 150;
    
    const sizePromises = state.canvases.map(async (c) => {
      const tr = modalBg.querySelector(`tr[data-cid="${c.id}"]`);
      if (!tr) return null;
      
      const weightTd = tr.querySelector('.exp-weight');
      const clicktagTd = tr.querySelector('.exp-clicktag');
      const specsTd = tr.querySelector('.exp-td-specs');
      const a11yTd = tr.querySelector('.exp-td-a11y');
      const brandTd = tr.querySelector('.exp-td-brand');
      
      if (hasVersions && mode === 'all') {
        if (weightTd) {
          weightTd.textContent = '—';
          weightTd.style.color = 'var(--text-muted)';
        }
        if (clicktagTd) {
          clicktagTd.innerHTML = `
            <div style="font-family:monospace; font-size:10.5px; overflow-x:auto; white-space:nowrap; scrollbar-width:none; -ms-overflow-style:none;">
              <a style="color:var(--text-muted); text-decoration:none;">—</a>
            </div>
          `;
        }
        if (specsTd) { specsTd.innerHTML = '<span style="color:var(--text-muted)">—</span>'; }
        if (a11yTd) { a11yTd.innerHTML = '<span style="color:var(--text-muted)">—</span>'; }
        if (brandTd) { brandTd.innerHTML = '<span style="color:var(--text-muted)">—</span>'; }
        return null;
      }

      const kb = await calculateCanvasZipSize(c, exportVersionIdx);
      
      let ct = '';
      const savedActive = dm ? dm.activeVersion : null;
      if (dm && exportVersionIdx != null) dm.activeVersion = exportVersionIdx;
      const restore = (dm && dm.enabled && dm.activeVersion != null) ? dmBakeRow(dm.activeVersion) : null;
      try {
        const ctCol = dm ? dm.mappings['clicktag::url'] : null;
        if (dm && ctCol && dm.rows[exportVersionIdx]) {
          ct = dm.rows[exportVersionIdx][ctCol] || state.clickTag || 'No clickTag';
        } else {
          ct = state.clickTag || 'No clickTag';
        }
      } finally {
        if (restore) restore();
        if (dm) dm.activeVersion = savedActive;
      }
      
      let errors = [];
      if (!ct || ct === 'No clickTag') {
        errors.push('Missing clickTag URL');
      } else if (ct !== '—') {
        try {
          const url = new URL(ct);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            errors.push('clickTag URL must start with http:// or https://');
          } else if (!url.hostname.includes('.') || url.hostname.split('.').pop().length < 2) {
            errors.push('clickTag URL must be a valid website name with domain');
          }
        } catch (e) {
          errors.push('clickTag URL format is invalid');
        }
      }
      
      let imageElements = c.elements.filter(el => el.type === 'image');
      let hasMissing = false;
      let hasExt = false;
      imageElements.forEach(el => {
        let src = state.assets[el.assetId] || el.assetId;
        if (!src) {
          hasMissing = true;
        } else if (src.startsWith('http://') || src.startsWith('https://')) {
          hasExt = true;
        } else if (!state.assets[el.assetId] && !src.startsWith('data/Elements/')) {
          hasMissing = true;
        }
      });
      if (hasMissing) errors.push('Contains missing assets');
      if (hasExt) errors.push('Contains external URLs');
      if (kb > limitKb) {
        errors.push(`Filesize (${kb.toFixed(1)} KB) exceeds ${limitKb}KB limit`);
      }
      
      c._valErrors = errors;
      c._valKb = kb.toFixed(1);

      const hasErrors = errors.length > 0;
      const hasA11y = c._valA11y && c._valA11y.length > 0;
      const hasBrand = c._valBrand && c._valBrand.length > 0;

      const specsIcon = hasErrors ? getWarningIcon('#ef4444', 13) : getCheckIcon('#10b981', 13);
      const a11yIcon = hasA11y ? getWarningIcon('#f97316', 13) : getCheckIcon('#10b981', 13);
      const brandIcon = hasBrand ? getWarningIcon('#f97316', 13) : getCheckIcon('#10b981', 13);

      const specsTitle = hasErrors ? `${errors.length} compliance errors. Click to view.` : 'All compliance checks passed. Click to view.';
      const a11yTitle = hasA11y ? `${c._valA11y.length} accessibility warnings. Click to view.` : 'All accessibility checks passed. Click to view.';
      const brandTitle = hasBrand ? `${c._valBrand.length} branding warnings. Click to view.` : 'All branding checks passed. Click to view.';

      return {
        cid: c.id,
        weightTd,
        clicktagTd,
        specsTd,
        a11yTd,
        brandTd,
        kb,
        ct,
        specsIcon,
        a11yIcon,
        brandIcon,
        specsTitle,
        a11yTitle,
        brandTitle
      };
    });

    const results = await Promise.all(sizePromises);
    results.forEach(res => {
      if (!res) return;
      if (res.weightTd) {
        res.weightTd.textContent = `${res.kb.toFixed(1)} KB`;
        res.weightTd.style.color = res.kb > limitKb ? '#ef4444' : '#c7ccdb';
      }
      if (res.clicktagTd) {
        const ct = res.ct;
        res.clicktagTd.innerHTML = `
          <div style="font-family:monospace; font-size:10.5px; overflow-x:auto; white-space:nowrap; scrollbar-width:none; -ms-overflow-style:none;">
            <a ${ct && ct !== '—' && ct !== 'No clickTag' ? `href="${ct.startsWith('http') ? ct : 'https://' + ct}" target="_blank" style="color:var(--accent-light, #a78bfa); text-decoration:none; cursor:pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'"` : `style="color:var(--text-label); text-decoration:none;"`}>${ct}</a>
          </div>
        `;
      }
      if (res.specsTd) {
        res.specsTd.innerHTML = `<span class="exp-val-badge" data-tab="specs" data-cid="${res.cid}" style="cursor:pointer;" title="${res.specsTitle}">${res.specsIcon}</span>`;
      }
      if (res.a11yTd) {
        res.a11yTd.innerHTML = `<span class="exp-val-badge" data-tab="a11y" data-cid="${res.cid}" style="cursor:pointer;" title="${res.a11yTitle}">${res.a11yIcon}</span>`;
      }
      if (res.brandTd) {
        res.brandTd.innerHTML = `<span class="exp-val-badge" data-tab="brand" data-cid="${res.cid}" style="cursor:pointer;" title="${res.brandTitle}">${res.brandIcon}</span>`;
      }
    });
  };

  // Trigger async table update to calculate and show exact ZIP sizes
  updateExportTableDetails();

  const runBatchWebpCompression = async () => {
    const dm = state.dataMerge;
    const hasVersions = !!(dm && dm.rows && dm.rows.length);
    const limitKb = state.adSizeLimit || 150;

    // 1. Get selected canvases
    const selectedCids = Array.from(modalBg.querySelectorAll('.export-chk:checked')).map(chk => chk.dataset.cid);
    if (selectedCids.length === 0) {
      alert('Please select at least one canvas size to compress.');
      return;
    }
    const selectedCanvases = selectedCids.map(id => state.canvases.find(x => x.id === id)).filter(Boolean);

    // 2. Get selected version indices
    let versionIndices = [];
    if (hasVersions) {
      const versionModeRadio = modalBg.querySelector('input[name="exp-version-mode"]:checked');
      const mode = versionModeRadio ? versionModeRadio.value : 'single';
      if (mode === 'all') {
        dm.rows.forEach((row, idx) => {
          if (row._selected !== false) {
            versionIndices.push(idx);
          }
        });
      } else {
        const versionSelect = modalBg.querySelector('#exp-version');
        const idx = versionSelect ? parseInt(versionSelect.value, 10) : 0;
        if (!isNaN(idx) && dm.rows[idx]) {
          versionIndices.push(idx);
        }
      }
    } else {
      versionIndices.push(null);
    }

    if (versionIndices.length === 0) {
      alert('No versions selected for compression.');
      return;
    }

    // 3. Open progress modal
    const progressHtml = `
      <div id="batch-compress-progress-container" style="padding:20px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:var(--text-main); text-align:center; display:flex; flex-direction:column; gap:16px;">
        <div style="font-size:16px; font-weight:600; color:var(--text-bright); display:flex; align-items:center; justify-content:center; gap:8px;">
          <svg class="batch-compress-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color:#10b981; animation: batch-compress-spin 1s linear infinite;">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          Batch WebP Compression
        </div>
        <div style="font-size:12px; color:var(--text-muted); line-height:1.5;">Automatically finding and compressing oversized canvases to WebP. Please keep this modal open.</div>
        
        <!-- Progress Bar -->
        <div style="height:8px; background:var(--bg-input); border-radius:4px; overflow:hidden; margin-top:8px; position:relative; width:100%;">
          <div id="batch-compress-progress-bar" style="width:0%; height:100%; background:linear-gradient(135deg, #10b981, #059669); border-radius:4px; transition: width 0.15s ease;"></div>
        </div>
        
        <div id="batch-compress-status-text" style="font-size:13px; font-weight:500; color:#34d399;">Initializing scan...</div>
        
        <div style="margin-top:12px;">
          <button class="btn" id="batch-compress-cancel" style="padding:6px 16px; font-size:12px; cursor:pointer;">Cancel</button>
        </div>
      </div>
    `;

    // Inject CSS keyframes if not exists
    if (!document.getElementById('batch-compress-style')) {
      const style = document.createElement('style');
      style.id = 'batch-compress-style';
      style.textContent = `
        @keyframes batch-compress-spin {
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    openModal('Compression Progress', progressHtml, false);
    const progressModalBg = document.body.lastElementChild;
    const progressModal = progressModalBg.querySelector('.modal');
    if (progressModal) {
      progressModal.style.width = '450px';
      progressModal.style.maxWidth = '95vw';
    }

    let isCancelled = false;
    progressModalBg.querySelector('#batch-compress-cancel').onclick = () => {
      isCancelled = true;
      progressModalBg.remove();
    };

    const progressBar = progressModalBg.querySelector('#batch-compress-progress-bar');
    const statusText = progressModalBg.querySelector('#batch-compress-status-text');

    const updateProgress = (pct, text) => {
      if (progressBar) progressBar.style.width = `${pct}%`;
      if (statusText) statusText.textContent = text;
    };

    // Phase 1: Scan
    const compressionQueue = [];
    const totalCombinations = versionIndices.length * selectedCanvases.length;
    let scannedCount = 0;

    for (let vIdx of versionIndices) {
      if (isCancelled) return;
      
      const savedActive = dm ? dm.activeVersion : null;
      if (dm && vIdx != null) dm.activeVersion = vIdx;
      const restore = (dm && dm.enabled && dm.activeVersion != null) ? dmBakeRow(vIdx) : null;
      
      try {
        for (let canvas of selectedCanvases) {
          if (isCancelled) return;
          
          scannedCount++;
          const pct = Math.round((scannedCount / totalCombinations) * 30);
          const verName = vIdx !== null ? `Version ${vIdx + 1}` : 'Template';
          updateProgress(pct, `Scanning ${verName}: ${canvas.name || (canvas.width + 'x' + canvas.height)}...`);

          const kb = await calculateCanvasZipSize(canvas, vIdx);
          if (kb > limitKb) {
            const imageElements = canvas.elements.filter(el => el.type === 'image');
            if (imageElements.length > 0) {
              compressionQueue.push({
                versionIdx: vIdx,
                canvasId: canvas.id,
                canvasName: canvas.name || `${canvas.width}x${canvas.height}`,
                kb: kb
              });
            }
          }
        }
      } finally {
        if (restore) restore();
        if (dm) dm.activeVersion = savedActive;
      }
    }

    if (isCancelled) return;

    if (compressionQueue.length === 0) {
      updateProgress(100, 'Scan complete. No oversized canvases found.');
      setTimeout(() => {
        progressModalBg.remove();
        alert('All selected versions and canvases are already under the size limit!');
      }, 1200);
      return;
    }

    // Phase 2: Compress
    const totalCompressions = compressionQueue.length;
    let compressedCount = 0;

    const originalLockState = dm ? dm.locked : false;
    if (dm && originalLockState) {
      dm.locked = false;
    }

    try {
      for (let task of compressionQueue) {
        if (isCancelled) break;

        compressedCount++;
        const pct = 30 + Math.round((compressedCount / totalCompressions) * 70);
        const verLabel = task.versionIdx !== null ? `Version ${task.versionIdx + 1}` : 'Template';
        updateProgress(pct, `Compressing ${verLabel}: ${task.canvasName} (${task.kb.toFixed(1)} KB)...`);

        await dmRunExport(task.versionIdx, async () => {
          await autoCompressCanvasImages(task.canvasId);
        });
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error('Batch compression error:', error);
      alert('An error occurred during compression: ' + error.message);
    } finally {
      if (dm) {
        dm.locked = originalLockState;
        if (typeof renderVersionSwitcher === 'function') renderVersionSwitcher();
      }
      if (typeof render === 'function') render();
    }

    if (isCancelled) return;

    updateProgress(100, `Done! Compressed ${compressedCount} canvas/version combination(s).`);
    setTimeout(() => {
      progressModalBg.remove();
      if (typeof updateExportTableDetails === 'function') {
        updateExportTableDetails();
      }
    }, 1000);
  };

  if (hasVersions) {
    modalBg.querySelectorAll('input[name="exp-version-mode"]').forEach(r => {
      r.addEventListener('change', updateExportTableDetails);
    });
    modalBg.querySelector('#exp-version')?.addEventListener('change', updateExportTableDetails);
  }

  modalBg.querySelector('#btn-export-selected').addEventListener('click', async () => {
    const selectedIds = Array.from(chks).filter(c => c.checked).map(c => c.dataset.cid);
    if (selectedIds.length === 0) { alert('No ads selected.'); return; }

    const fnameInput = modalBg.querySelector('#exp-filename');
    const filenamePrefix = (fnameInput && fnameInput.value.trim()) ? fnameInput.value.trim() : defaultPrefix;
    const skipChk = modalBg.querySelector('#exp-skip-frames');
    const includeSkippedFrames = !(skipChk && skipChk.checked);
    const format = (modalBg.querySelector('input[name="exp-format"]:checked') || {}).value || 'zip';
    
    const versionModeRadio = modalBg.querySelector('input[name="exp-version-mode"]:checked');
    const mode = versionModeRadio ? versionModeRadio.value : 'single';
    const versionSelect = modalBg.querySelector('#exp-version');
    const versionChoice = mode === 'all' ? 'all' : (versionSelect ? versionSelect.value : null);
    
    const selectedCanvases = selectedIds.map(id => state.canvases.find(x => x.id === id)).filter(Boolean);

    if (hasVersions && versionChoice === 'all') {
      await dmExportAllVersions(selectedCanvases, filenamePrefix);
      return;
    }

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
          const adContent = await adZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
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

// ============================================================================
// Web Workers & Streaming Zip Exporter (Bulk Versions)
// ============================================================================

// CRC-32 Lookup Table & Fast Lookup Function
const CRC_TABLE = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c;
}

function computeCrc32(buf) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Lightweight, zero-dependency client-side ZIP stream writer.
 * Packs files sequentially using the STORE (no compression) method.
 * Fits perfectly for wrapping sub-ZIPs which are already compressed.
 */
class ZipStreamWriter {
  constructor(underlyingWriter) {
    this.writer = underlyingWriter;
    this.offset = 0;
    this.files = [];
  }

  async addFile(path, dataUint8) {
    const crc = computeCrc32(dataUint8);
    const size = dataUint8.length;
    const pathBytes = new TextEncoder().encode(path);
    const headerOffset = this.offset;
    
    // Convert current time to MS-DOS date/time
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const dosTime = (hours << 11) | (minutes << 5) | (seconds >> 1);
    const dosDate = ((year - 1980) << 9) | (month << 5) | day;

    // Create Local File Header (30 bytes + filename size)
    const header = new ArrayBuffer(30 + pathBytes.length);
    const view = new DataView(header);

    view.setUint32(0, 0x04034b50, true);         // local file header signature
    view.setUint16(4, 20, true);                 // version needed to extract (2.0)
    view.setUint16(6, 0x0800, true);             // general purpose flags (UTF-8 filename encoding)
    view.setUint16(8, 0, true);                  // compression method (0 = STORE)
    view.setUint16(10, dosTime, true);           // last mod file time
    view.setUint16(12, dosDate, true);           // last mod file date
    view.setUint32(14, crc, true);               // crc-32
    view.setUint32(18, size, true);              // compressed size
    view.setUint32(22, size, true);              // uncompressed size
    view.setUint16(26, pathBytes.length, true);  // file name length
    view.setUint16(28, 0, true);                 // extra field length

    const u8Header = new Uint8Array(header);
    u8Header.set(pathBytes, 30);

    await this.writer.write(u8Header);
    this.offset += u8Header.length;

    await this.writer.write(dataUint8);
    this.offset += size;

    this.files.push({
      pathBytes,
      crc,
      size,
      headerOffset,
      dosTime,
      dosDate
    });
  }

  async close() {
    const centralDirectoryStart = this.offset;
    let centralDirectorySize = 0;

    // Write Central Directory Headers
    for (const file of this.files) {
      const cdHeader = new ArrayBuffer(46 + file.pathBytes.length);
      const view = new DataView(cdHeader);

      view.setUint32(0, 0x02014b50, true);                 // central file header signature
      view.setUint16(4, 20, true);                         // version made by (2.0)
      view.setUint16(6, 20, true);                         // version needed to extract (2.0)
      view.setUint16(8, 0x0800, true);                     // general purpose flags (UTF-8)
      view.setUint16(10, 0, true);                         // compression method
      view.setUint16(12, file.dosTime, true);              // last mod file time
      view.setUint16(14, file.dosDate, true);              // last mod file date
      view.setUint32(16, file.crc, true);                  // crc-32
      view.setUint32(20, file.size, true);                 // compressed size
      view.setUint32(24, file.size, true);                 // uncompressed size
      view.setUint16(28, file.pathBytes.length, true);      // file name length
      view.setUint16(30, 0, true);                         // extra field length
      view.setUint16(32, 0, true);                         // file comment length
      view.setUint16(34, 0, true);                         // disk number start
      view.setUint16(36, 0, true);                         // internal file attributes
      view.setUint32(38, 0, true);                         // external file attributes
      view.setUint32(42, file.headerOffset, true);         // relative offset of local header

      const u8CdHeader = new Uint8Array(cdHeader);
      u8CdHeader.set(file.pathBytes, 46);

      await this.writer.write(u8CdHeader);
      this.offset += u8CdHeader.length;
      centralDirectorySize += u8CdHeader.length;
    }

    // Write End of Central Directory (EOCD)
    const eocd = new ArrayBuffer(22);
    const view = new DataView(eocd);

    view.setUint32(0, 0x06054b50, true);                 // EOCD signature
    view.setUint16(4, 0, true);                         // number of this disk
    view.setUint16(6, 0, true);                         // number of the disk with the start of the central directory
    view.setUint16(8, this.files.length, true);         // total number of entries in the central directory on this disk
    view.setUint16(10, this.files.length, true);        // total number of entries in the central directory
    view.setUint32(12, centralDirectorySize, true);     // size of the central directory
    view.setUint32(16, centralDirectoryStart, true);    // offset of start of central directory, relative to start of archive
    view.setUint16(20, 0, true);                         // ZIP file comment length

    const u8Eocd = new Uint8Array(eocd);
    await this.writer.write(u8Eocd);
    await this.writer.close();
  }
}

// Background Worker Code String
const EXPORT_WORKER_CODE = `
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');

  self.onmessage = async (e) => {
    const { type, versionIndex, canvasId, files } = e.data;
    if (type === 'zip_canvas') {
      try {
        const zip = new JSZip();
        for (const file of files) {
          if (file.isBase64) {
            zip.file(file.name, file.content, { base64: true });
          } else {
            zip.file(file.name, file.content);
          }
        }
        const zipData = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
        self.postMessage({
          type: 'zip_canvas_done',
          versionIndex,
          canvasId,
          data: zipData
        }, [zipData]);
      } catch (err) {
        self.postMessage({
          type: 'error',
          versionIndex,
          canvasId,
          error: err.message
        });
      }
    }
  };
`;

/**
 * Wraps worker postMessage into a Promise.
 */
function zipVersionInWorker(worker, versionIndex, canvasId, files) {
  return new Promise((resolve, reject) => {
    const handleMessage = (e) => {
      if (e.data.versionIndex === versionIndex && e.data.canvasId === canvasId) {
        worker.removeEventListener('message', handleMessage);
        if (e.data.type === 'zip_canvas_done') {
          resolve(e.data.data);
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.error));
        }
      }
    };
    worker.addEventListener('message', handleMessage);
    worker.postMessage({
      type: 'zip_canvas',
      versionIndex,
      canvasId,
      files
    });
  });
}

/**
 * Creates and renders the Premium Progress UI Modal.
 */
function showExportProgressModal(onCancel) {
  const overlay = document.createElement('div');
  overlay.id = 'export-progress-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 1000000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(11, 12, 15, 0.82);
    backdrop-filter: blur(8px);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;
  
  overlay.innerHTML = `
    <div style="
      background: #15171f;
      border: 1px solid #2a2f3e;
      border-radius: 12px;
      padding: 24px;
      width: 420px;
      max-width: 90vw;
      box-shadow: 0 20px 40px rgba(0,0,0,0.55);
      display: flex;
      flex-direction: column;
      gap: 16px;
    ">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:14px; font-weight:600; color:#fff; font-family:'Outfit', sans-serif;">Exporting version sets…</span>
        <span id="export-progress-percent" style="font-size:13px; font-weight:700; color:var(--accent-light, #7c5cff);">0%</span>
      </div>
      
      <div style="width:100%; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden; position:relative;">
        <div id="export-progress-fill" style="width:0%; height:100%; background:linear-gradient(90deg, #7c5cff, #a78bfa); border-radius:3px; transition: width 0.15s ease;"></div>
      </div>
      
      <div style="display:flex; flex-direction:column; gap:4px;">
        <span id="export-progress-status" style="font-size:11.5px; color:#c7ccdb; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Preparing export pipeline…</span>
        <span id="export-progress-bytes" style="font-size:10.5px; color:var(--text-muted, #8b8f9c); font-family:monospace;">0 bytes written</span>
      </div>
      
      <div style="display:flex; justify-content:flex-end; margin-top:8px;">
        <button id="export-progress-cancel" class="btn" style="padding: 6px 14px; font-size:11.5px; font-weight:500;">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  overlay.querySelector('#export-progress-cancel').onclick = () => {
    if (confirm('Cancel the current export session? Partials written will be discarded.')) {
      onCancel();
      document.body.removeChild(overlay);
    }
  };
  
  return {
    update: (percent, statusText, bytesText) => {
      overlay.querySelector('#export-progress-percent').textContent = `${Math.round(percent)}%`;
      overlay.querySelector('#export-progress-fill').style.width = `${percent}%`;
      overlay.querySelector('#export-progress-status').textContent = statusText;
      overlay.querySelector('#export-progress-bytes').textContent = bytesText;
    },
    close: () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }
  };
}

/**
 * Unified high-performance Streaming and Web Worker-driven export system.
 * Streams ZIP data directly to disk via showSaveFilePicker, or accumulates
 * in-memory on Safari/Firefox.
 */
async function dmExportAllVersionsStreaming(selectedCanvases = state.canvases, filenamePrefix = null) {
  const dm = state.dataMerge;
  if (!dm || !dm.rows.length) { alert('No versions to export. Import a data sheet first.'); return; }
  
  const keyCol = (dm.keyColumn && dm.columns.includes(dm.keyColumn)) ? dm.keyColumn : dm.columns[0];
  const safeProj = (filenamePrefix || state.projectName || 'Ad').replace(/[^a-zA-Z0-9_-]/g, '_');
  const outerName = `${safeProj}_all_versions.zip`;

  // 1. Get Writable Stream or fall back to Memory Accumulator
  let underlyingWriter = null;
  let fileHandle = null;
  const isStreamingSupported = !!window.showSaveFilePicker;
  
  if (isStreamingSupported) {
    try {
      fileHandle = await window.showSaveFilePicker({
        types: [{ description: 'Exported Ads ZIP', accept: { 'application/zip': ['.zip'] } }],
        suggestedName: outerName
      });
      const stream = await fileHandle.createWritable();
      underlyingWriter = stream.getWriter();
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('File system write access denied, falling back to memory collection.', e);
    }
  }
  
  if (!underlyingWriter) {
    // Memory Fallback for Safari/Firefox
    underlyingWriter = {
      chunks: [],
      async write(data) {
        this.chunks.push(data);
      },
      async close() {}
    };
  }

  // 2. Initialize Stream Packager
  const zipWriter = new ZipStreamWriter(underlyingWriter);

  // 3. Setup Worker Thread
  let isCancelled = false;
  const workerCodeBlob = new Blob([EXPORT_WORKER_CODE], { type: 'application/javascript' });
  const worker = new Worker(URL.createObjectURL(workerCodeBlob));
  
  const progressUI = showExportProgressModal(() => {
    isCancelled = true;
    worker.terminate();
    try {
      if (fileHandle && underlyingWriter && underlyingWriter.close) {
        underlyingWriter.close();
      }
    } catch (err) {}
    showCanvasNotification('Export cancelled');
  });

  // 4. Overwrite window.fetch with cloned caching for the duration of bulk generation
  const originalFetch = window.fetch;
  const fetchCache = {};
  window.fetch = async (url, options) => {
    if (fetchCache[url]) {
      return fetchCache[url].clone();
    }
    const resp = await originalFetch(url, options);
    if (resp.ok) {
      fetchCache[url] = resp.clone();
    }
    return resp;
  };

  try {
    const selectedIndices = dm.rows
      .map((r, idx) => ({ row: r, idx }))
      .filter(item => item.row._selected !== false);
    const totalVersions = selectedIndices.length;
    const usedFolders = {};
    let totalBytesWritten = 0;
    
    for (let k = 0; k < totalVersions; k++) {
      if (isCancelled) break;
      const i = selectedIndices[k].idx;
      const row = selectedIndices[k].row;
      
      const folderBase = String(row[keyCol] || ('version_' + (i + 1))).replace(/[^a-zA-Z0-9_-]/g, '_') || ('version_' + (i + 1));
      let folderName = folderBase;
      usedFolders[folderName] = (usedFolders[folderName] || 0) + 1;
      if (usedFolders[folderName] > 1) {
        folderName += '_' + usedFolders[folderName];
      }
      
      progressUI.update(
        (k / totalVersions) * 100,
        `Zipping Version ${k + 1} of ${totalVersions} ("${folderName}")…`,
        `${(totalBytesWritten / (1024 * 1024)).toFixed(2)} MB written`
      );
      
      // Run the transient canvas baking and packaging
      await dmRunExport(i, async () => {
        for (const c of selectedCanvases) {
          if (isCancelled) break;
          
          const filesToPackage = [];
          const mockZip = {
            file: (name, content, options) => {
              filesToPackage.push({
                name,
                content,
                isBase64: !!(options && options.base64)
              });
            }
          };
          
          // Gather HTML & assets locally via mockZip callbacks
          await addCanvasAssetsToZip(c, mockZip);
          const html = generateExportHTML(c, mockZip);
          mockZip.file('index.html', html);
          
          // Offload compression to background Web Worker thread
          const subZipBuffer = await zipVersionInWorker(worker, i, c.id, filesToPackage);
          
          // Stream package the sub-zip directly to outer ZIP
          const subZipPath = `${folderName}/${safeProj}_${c.width}x${c.height}.zip`;
          await zipWriter.addFile(subZipPath, new Uint8Array(subZipBuffer));
          totalBytesWritten = zipWriter.offset;
        }
      });
      
      // Yield thread slice to allow UI and overlay refresh
      await new Promise(r => setTimeout(r, 0));
    }
    
    if (!isCancelled) {
      progressUI.update(98, 'Writing central directory records to disk…', `${(totalBytesWritten / (1024 * 1024)).toFixed(2)} MB written`);
      await zipWriter.close();
      
      progressUI.update(100, 'Export complete!', `${(totalBytesWritten / (1024 * 1024)).toFixed(2)} MB written`);
      
      // Trigger download for browser memory fallback (Safari/Firefox)
      if (!isStreamingSupported || !fileHandle) {
        const finalBlob = new Blob(underlyingWriter.chunks, { type: 'application/zip' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(finalBlob);
        a.download = outerName;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      
      showCanvasNotification('All versions exported successfully');
    }
  } catch (err) {
    console.error('Streaming version export failure:', err);
    alert('Version export failed: ' + err.message);
  } finally {
    // Restore clean window environment
    window.fetch = originalFetch;
    worker.terminate();
    URL.revokeObjectURL(workerCodeBlob);
    
    // Leave modal showing success state briefly, then auto-close
    setTimeout(() => progressUI.close(), 1000);
  }
}

// ============================================================================
// Batch Validator (All Versions Validator)
// ============================================================================
function runAllVersionsValidator() {
  const dm = state.dataMerge;
  if (!dm || !dm.enabled || !dm.rows || !dm.rows.length) {
    alert('Data Merge is not enabled or contains no versions to validate.');
    return;
  }

  // Open the Progress loading modal
  const progressHtml = `
    <div id="batch-val-progress-container" style="padding:20px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:var(--text-main); text-align:center; display:flex; flex-direction:column; gap:16px;">
      <div style="font-size:16px; font-weight:600; color:var(--text-bright);">Batch Validating All Versions</div>
      <div style="font-size:12px; color:var(--text-muted); line-height:1.5;">Please wait while we audit every version against ad compliance, accessibility, and branding rules. This can take a few moments.</div>
      
      <!-- Progress Bar -->
      <div style="height:8px; background:var(--bg-input); border-radius:4px; overflow:hidden; margin-top:8px; position:relative; width:100%;">
        <div id="batch-val-progress-bar" style="width:0%; height:100%; background:linear-gradient(135deg, #14b8a6, #0d9488); border-radius:4px; transition: width 0.15s ease;"></div>
      </div>
      
      <div id="batch-val-status-text" style="font-size:13px; font-weight:500; color:var(--accent-light);">Starting audit...</div>
      
      <div style="margin-top:12px;">
        <button class="btn" id="batch-val-cancel" style="padding:6px 16px; font-size:12px; cursor:pointer;">Cancel Audit</button>
      </div>
    </div>
  `;

  openModal('Validator Progress', progressHtml, false);
  const modalBg = document.body.lastElementChild;
  const modal = modalBg.querySelector('.modal');
  if (modal) {
    modal.style.width = '500px';
    modal.style.maxWidth = '90vw';
  }

  let isCancelled = false;
  const cancelBtn = modalBg.querySelector('#batch-val-cancel');
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      isCancelled = true;
      modalBg.remove();
    };
  }

  const totalRows = dm.rows.length;
  const problems = [];
  let currentIdx = 0;

  const processNextRow = async () => {
    if (isCancelled) return;
    if (currentIdx >= totalRows) {
      // Done processing! Close progress modal
      modalBg.remove();
      // Cache results
      state._latestBatchProblems = problems;
      // Render results modal
      showBatchValidatorResults(problems);
      return;
    }

    const progressPct = Math.round((currentIdx / totalRows) * 100);
    const bar = modalBg.querySelector('#batch-val-progress-bar');
    const txt = modalBg.querySelector('#batch-val-status-text');
    const keyCol = (dm.keyColumn && dm.columns.includes(dm.keyColumn)) ? dm.keyColumn : dm.columns[0];
    const row = dm.rows[currentIdx];
    const rowName = row[keyCol] || `Version ${currentIdx + 1}`;

    if (bar) bar.style.width = `${progressPct}%`;
    if (txt) txt.textContent = `Auditing Row ${currentIdx + 1} of ${totalRows}: "${rowName}"...`;

    // Bake row elements temporarily
    const restore = dmBakeRow(currentIdx);
    try {
      for (const c of state.canvases) {
        let html = generateExportHTML(c);
        const ctCol = dm.mappings['clicktag::url'];
        const ct = (ctCol && row[ctCol]) ? row[ctCol] : (state.clickTag || 'No clickTag');

        // Compliance checks
        const kb = (new Blob([html]).size / 1024).toFixed(1);
        const limitKb = state.adSizeLimit || 150;
        let errors = [];
        if (!ct || ct === 'No clickTag') {
          errors.push('Missing clickTag URL');
        } else {
          try {
            const url = new URL(ct);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
              errors.push('clickTag URL must start with http:// or https://');
            } else if (!url.hostname.includes('.') || url.hostname.split('.').pop().length < 2) {
              errors.push('clickTag URL must be a valid website name with domain');
            }
          } catch (e) {
            errors.push('clickTag URL format is invalid');
          }
        }

        let imageElements = c.elements.filter(el => el.type === 'image');
        let hasMissing = false;
        let hasExt = false;
        imageElements.forEach(el => {
          let src = state.assets[el.assetId] || el.assetId;
          if (!src) {
            hasMissing = true;
          } else if (src.startsWith('http://') || src.startsWith('https://')) {
            hasExt = true;
          } else if (!state.assets[el.assetId] && !src.startsWith('data/Elements/')) {
            hasMissing = true;
          }
        });
        if (hasMissing) errors.push('Contains missing assets');
        if (hasExt) errors.push('Contains external URLs');
        if (parseFloat(kb) > limitKb) {
          errors.push(`Filesize (${kb} KB) exceeds ${limitKb}KB limit`);
        }

        // Run accessibility & branding compliance checks
        runAuditChecks(c);

        const a11y = c._valA11y || [];
        const brand = c._valBrand || [];

        if (errors.length > 0 || a11y.length > 0 || brand.length > 0) {
          problems.push({
            versionIndex: currentIdx,
            versionName: rowName,
            canvasId: c.id,
            canvasSize: `${c.width}×${c.height}`,
            errors: errors,
            a11y: a11y.map(x => x.message),
            brand: brand.map(x => x.message)
          });
        }
      }
    } finally {
      restore();
    }

    currentIdx++;
    setTimeout(processNextRow, 30);
  };

  setTimeout(processNextRow, 50);
}

function showBatchValidatorResults(problems) {
  if (problems.length === 0) {
    const successHtml = `
      <div style="padding:30px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:var(--text-main); text-align:center; display:flex; flex-direction:column; gap:16px;">
        <div style="font-size:48px; line-height:1;">🎉</div>
        <div style="font-size:18px; font-weight:600; color:#10b981;">All Versions Passed!</div>
        <div style="font-size:13px; color:var(--text-muted); max-width:400px; margin:0 auto; line-height:1.5;">Every version and canvas size conforms to technical compliance rules, accessibility guidelines, and RMIT branding rules.</div>
        <div style="margin-top:10px; display:flex; gap:8px; justify-content:center;">
          <button class="btn primary" id="batch-val-success-ok" style="padding:6px 20px; cursor:pointer; font-size:12px;">Awesome</button>
          <button class="btn" id="btn-batch-rerun" style="
            background: linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(20, 184, 166, 0.05));
            border: 1px solid rgba(20, 184, 166, 0.35);
            color: #2dd4bf;
            font-weight: 600;
            padding: 6px 20px;
            font-size: 12px;
            cursor: pointer;
            border-radius: 4px;
          ">Re-run</button>
        </div>
      </div>
    `;
    openModal('Batch Validation Results', successHtml, false);
    const bg = document.body.lastElementChild;
    const okBtn = bg.querySelector('#batch-val-success-ok');
    if (okBtn) okBtn.onclick = () => bg.remove();
    
    const rerunBtn = bg.querySelector('#btn-batch-rerun');
    if (rerunBtn) {
      rerunBtn.onclick = () => {
        bg.remove();
        runAllVersionsValidator();
      };
    }
    return;
  }

  // Render list of issues
  let issuesHtml = '';
  problems.forEach(p => {
    issuesHtml += `
      <div style="background:var(--bg-input); border:1px solid var(--border-light); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:6px;">
          <span style="font-size:13px; font-weight:600; color:var(--text-bright);">Version "${p.versionName}" — ${p.canvasSize}</span>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${p.errors.length > 0 ? `
            <div style="font-size:11.5px; color:#ef4444; display:flex; gap:6px; align-items:start;">
              <span style="font-weight:600; min-width:110px; flex-shrink:0;">🔴 Ad Compliance:</span>
              <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
                ${p.errors.map(e => `<span>• ${e}</span>`).join('')}
              </div>
              <button class="btn btn-fix-issue" data-cid="${p.canvasId}" data-vidx="${p.versionIndex}" data-tab="specs" style="padding:2px 8px; font-size:10px; background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.3); color:#ef4444; border-radius:4px; cursor:pointer; flex-shrink:0;">Fix</button>
            </div>
          ` : ''}
          
          ${p.a11y.length > 0 ? `
            <div style="font-size:11.5px; color:#f97316; display:flex; gap:6px; align-items:start;">
              <span style="font-weight:600; min-width:110px; flex-shrink:0;">🟠 Accessibility:</span>
              <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
                ${p.a11y.map(w => `<span>• ${w}</span>`).join('')}
              </div>
              <button class="btn btn-fix-issue" data-cid="${p.canvasId}" data-vidx="${p.versionIndex}" data-tab="a11y" style="padding:2px 8px; font-size:10px; background:rgba(249, 115, 22, 0.15); border:1px solid rgba(249, 115, 22, 0.3); color:#f97316; border-radius:4px; cursor:pointer; flex-shrink:0;">Fix</button>
            </div>
          ` : ''}
          
          ${p.brand.length > 0 ? `
            <div style="font-size:11.5px; color:#f97316; display:flex; gap:6px; align-items:start;">
              <span style="font-weight:600; min-width:110px; flex-shrink:0;">🟡 Branding:</span>
              <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
                ${p.brand.map(w => `<span>• ${w}</span>`).join('')}
              </div>
              <button class="btn btn-fix-issue" data-cid="${p.canvasId}" data-vidx="${p.versionIndex}" data-tab="brand" style="padding:2px 8px; font-size:10px; background:rgba(249, 115, 22, 0.15); border:1px solid rgba(249, 115, 22, 0.3); color:#f97316; border-radius:4px; cursor:pointer; flex-shrink:0;">Fix</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  const resultsHtml = `
    <div style="display:flex; flex-direction:column; gap:16px; height:100%; max-height: 550px;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-light); padding-bottom:12px;">
        <div style="flex: 1; min-width: 0; padding-right: 12px;">
          <h3 style="margin:0; font-size:15px; font-weight:600; color:#ef4444; display:flex; align-items:center; gap:6px;">
            <span>⚠️</span> Issues Detected in ${problems.length} Canvas-Version Combinations
          </h3>
          <span style="font-size:11.5px; color:var(--text-muted); display:block; margin-top:4px;">The following combinations failed verification. Click the "Fix" button to automatically load that version/canvas in the editor and open the Ads Validator.</span>
        </div>
        <button class="btn" id="btn-batch-rerun" style="
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(20, 184, 166, 0.05));
          border: 1px solid rgba(20, 184, 166, 0.35);
          color: #2dd4bf;
          font-weight: 600;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          border-radius: 4px;
          flex-shrink: 0;
        " title="Re-run validation checks across all versions">
          Re-run
        </button>
      </div>
      
      <div style="flex:1; overflow-y:auto; padding-right:4px;">
        ${issuesHtml}
      </div>
    </div>
  `;

  openModal('Batch Validation Results', resultsHtml, false);
  const bg = document.body.lastElementChild;
  const modal = bg.querySelector('.modal');
  if (modal) {
    modal.style.width = '750px';
    modal.style.maxWidth = '95vw';
  }

  bg.addEventListener('click', (e) => {
    const rerunBtn = e.target.closest('#btn-batch-rerun');
    if (rerunBtn) {
      bg.remove();
      runAllVersionsValidator();
      return;
    }

    const btn = e.target.closest('.btn-fix-issue');
    if (btn) {
      const cid = btn.dataset.cid;
      const vidx = parseInt(btn.dataset.vidx, 10);
      const tab = btn.dataset.tab;
      
      const canvas = state.canvases.find(x => x.id === cid);
      if (canvas) {
        // Close all modals
        document.querySelectorAll('.modal-bg').forEach(m => m.remove());
        
        // Select active version and canvas
        state.dataMerge.activeVersion = vidx;
        state.activeCanvasId = cid;
        
        if (typeof renderVersionSwitcher === 'function') renderVersionSwitcher();
        if (typeof renderCanvasesList === 'function') renderCanvasesList();
        if (typeof render === 'function') render();
        
        // Open Validator details modal on the tab
        openValidatorDetails(canvas, tab);
      }
    }
  });
}
