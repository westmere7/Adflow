// ============================================================================
// share-preview.js — Shareable Preview Portal Logic
// ============================================================================

// Inject spin keyframes dynamically for the loading indicator
(() => {
  if (!document.getElementById('adflow-share-spin-style')) {
    const style = document.createElement('style');
    style.id = 'adflow-share-spin-style';
    style.textContent = `
      @keyframes adflow-share-spin {
        to { transform: rotate(360deg); }
      }
      .adflow-share-spinner {
        animation: adflow-share-spin 0.8s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }
})();

async function openSharePreviewModal() {
  const u = typeof authState !== 'undefined' ? authState.currentUser() : null;
  if (!u || !sb) {
    const body = `
      <div style="font-family: inherit; color: var(--text-main); font-size: 13px; line-height: 1.6;">
        <p style="margin-top: 0; margin-bottom: 12px;">To generate a secure, shareable preview link, you need to sign in and save this project to Adflow Cloud.</p>
        <p style="margin-bottom: 16px; color: var(--text-muted);">Cloud projects support instant real-time sharing with clients, version switching, and multi-format previewing.</p>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn" id="btn-share-cancel" style="padding: 6px 12px;">Cancel</button>
          <button class="btn primary" id="btn-share-login" style="padding: 6px 12px; font-weight: 600;">Sign In / Sign Up</button>
        </div>
      </div>
    `;
    
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `
      <div class="modal" style="max-width: 420px; border-radius: 8px; background: var(--bg-panel); border: 1px solid var(--border-light); overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);">
        <div class="modal-head" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--border-light);">
          <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--text-bright);">Share Project Preview</h2>
          <button class="btn ghost icon" id="modal-close" style="padding: 4px;" title="Close dialog">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body" style="padding: 18px;">
          ${body}
        </div>
      </div>
    `;
    document.body.appendChild(bg);
    
    const closeFn = () => bg.remove();
    bg.querySelector('#modal-close').onclick = closeFn;
    bg.querySelector('#btn-share-cancel').onclick = closeFn;
    bg.querySelector('#btn-share-login').onclick = () => {
      closeFn();
      if (typeof openAuthModal === 'function') openAuthModal();
    };
    bg.onclick = (e) => { if (e.target === bg) closeFn(); };
    return;
  }

  // User is logged in. Show loading dialog while we save and generate URL.
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal" style="max-width: 480px; border-radius: 8px; background: var(--bg-panel); border: 1px solid var(--border-light); overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);">
      <div class="modal-head" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--border-light);">
        <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--text-bright);">Share Project Preview</h2>
        <button class="btn ghost icon" id="modal-close" style="padding: 4px;" title="Close dialog">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="modal-body" style="padding: 18px;" id="share-modal-body">
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0; gap: 12px;">
          <div class="adflow-share-spinner" style="width: 28px; height: 28px; border: 3px solid var(--accent-base); border-top-color: transparent; border-radius: 50%;"></div>
          <span style="font-size: 13px; color: var(--text-muted);" id="share-progress-text">Saving latest changes to cloud...</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(bg);
  
  const closeFn = () => bg.remove();
  bg.querySelector('#modal-close').onclick = closeFn;
  bg.onclick = (e) => { if (e.target === bg) closeFn(); };
  
  try {
    const textEl = bg.querySelector('#share-progress-text');
    
    // Save to Cloud
    if (textEl) textEl.textContent = 'Saving latest changes to cloud...';
    
    const pushRes = await pushCurrentProjectToCloud();
    if (pushRes && pushRes.collisionHandled) {
      closeFn();
      return;
    }
    
    // Generate signed URL
    if (textEl) textEl.textContent = 'Generating secure signed URL...';
    
    const spaceId = state.spaceId || (typeof spacesState !== 'undefined' ? spacesState.currentId() : null);
    const path = spaceId ? `spaces/${spaceId}/${state.projectId}.flow` : `${u.id}/${state.projectId}.flow`;
    
    // Expires in 30 days
    const expires = 2592000;
    const { data, error } = await sb.storage.from('projects').createSignedUrl(path, expires);
    
    if (error) throw error;
    if (!data || !data.signedUrl) throw new Error('Failed to retrieve signed URL.');
    
    const previewUrl = window.location.origin + window.location.pathname.replace('index.html', '') + 'preview.html?url=' + encodeURIComponent(data.signedUrl);
    
    const bodyEl = bg.querySelector('#share-modal-body');
    bodyEl.innerHTML = `
      <div style="font-family: inherit; color: var(--text-main); font-size: 13px; line-height: 1.6;">
        <p style="margin-top: 0; margin-bottom: 12px;">Your project has been successfully saved to the cloud, and a shareable preview link is ready.</p>
        
        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 6px; letter-spacing: 0.05em;">Preview Link</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="share-link-input" readonly value="${previewUrl}" style="flex: 1; padding: 8px 12px; font-size: 12px; font-family: monospace; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 4px; color: var(--text-main); outline: none;" />
            <button class="btn primary" id="btn-copy-share-link" style="padding: 0 16px; font-weight: 600; font-size: 12px; white-space: nowrap;">Copy Link</button>
          </div>
        </div>
        
        <div style="background: rgba(124, 92, 255, 0.08); border: 1px solid rgba(124, 92, 255, 0.2); border-radius: 6px; padding: 10px 12px; font-size: 12px; color: var(--text-muted); margin-bottom: 16px; display: flex; gap: 8px; align-items: flex-start;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-base)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <div>
            Anyone with this link can view the interactive preview without logging in.
            <div style="margin-top: 4px; font-weight: 500;">Link expires in 30 days.</div>
          </div>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn" id="btn-share-done" style="padding: 6px 16px; font-weight: 500;">Done</button>
        </div>
      </div>
    `;
    
    const input = bg.querySelector('#share-link-input');
    const copyBtn = bg.querySelector('#btn-copy-share-link');
    
    input.onclick = () => input.select();
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(previewUrl);
      copyBtn.textContent = 'Copied!';
      copyBtn.style.background = '#10b981';
      copyBtn.style.borderColor = '#10b981';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Link';
        copyBtn.style.background = '';
        copyBtn.style.borderColor = '';
      }, 2000);
    };
    
    bg.querySelector('#btn-share-done').onclick = closeFn;
    
  } catch (err) {
    console.error('Sharing failed:', err);
    const bodyEl = bg.querySelector('#share-modal-body');
    bodyEl.innerHTML = `
      <div style="font-family: inherit; color: var(--text-main); font-size: 13px; line-height: 1.6;">
        <div style="color: #ef4444; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Sharing Failed</span>
        </div>
        <p style="margin-top: 0; margin-bottom: 16px; color: var(--text-muted);">An error occurred while preparing your shareable preview: <strong style="color:var(--text-main);">${err.message || err}</strong></p>
        <div style="display: flex; justify-content: flex-end;">
          <button class="btn" id="btn-share-error-close" style="padding: 6px 16px;">Close</button>
        </div>
      </div>
    `;
    bg.querySelector('#btn-share-error-close').onclick = closeFn;
  }
}

// Bind event listeners to DOM elements
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-share-top')?.addEventListener('click', openSharePreviewModal);
  document.getElementById('menu-file-share')?.addEventListener('click', openSharePreviewModal);
});
