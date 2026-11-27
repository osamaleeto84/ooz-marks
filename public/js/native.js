/* Ooz Marks — bridge to the Android or Windows host (window.OozNative). In a plain browser the same calls
   fall back to the browser: downloads for saving, a file input for choosing. */
(function () {
'use strict';
const host = window.OozNative; let next = 1; const wait = new Map();
window.OozBridgeResult = r => { const w = wait.get(r.id); if (!w) return; wait.delete(r.id); if (r.error) w.reject(new Error(r.error)); else w.resolve(r.result); };
const call = (method, payload) => new Promise((resolve, reject) => { const id = next++; wait.set(id, { resolve, reject }); host.call(JSON.stringify({ id, method, payload: payload || {} })); });
let can = {}; try { can = window.OozNativeCan || (host && typeof host.caps === 'function' ? JSON.parse(host.caps()) : {}); } catch (e) { can = {}; }
window.OozNativeCan = can;
const N = { native: !!host, can };
function input(accept) {
  return new Promise(resolve => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.style.display = 'none';
    i.onchange = () => { const f = i.files && i.files[0]; i.remove(); if (!f) return resolve(null); const r = new FileReader(); r.onload = () => resolve({ name: f.name, dataURL: r.result }); r.readAsDataURL(f); };
    document.body.appendChild(i); i.click(); setTimeout(() => { if (document.body.contains(i)) { /* still open */ } }, 0);
  });
}
// pickFile → {name, base64}; pickImage → {name, dataURL}
N.pickFile = async accept => {
  if (host && window.OozNativeCan && OozNativeCan.pickFile) return call('pickFile', { accept });
  const r = await input(accept || '*/*'); return r && { name: r.name, base64: r.dataURL.split(',')[1] };
};
N.pickImage = async () => {
  if (host && window.OozNativeCan && OozNativeCan.pickImage) { const r = await call('pickImage', {}); return r && { name: r.name || 'image', dataURL: r.dataURL }; }
  return input('image/*');
};
// saveFile {name, mime, base64} → true when saved (the host asks where), 'download' in a browser
N.saveFile = async o => {
  if (host && window.OozNativeCan && OozNativeCan.saveFile) return call('saveFile', o);
  const bin = atob(o.base64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([u], { type: o.mime })); const a = document.createElement('a'); a.href = url; a.download = o.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000); return 'download';
};
N.copy = async text => { if (host && window.OozNativeCan && OozNativeCan.copy) return call('copy', { text }); try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; } };
N.openUrl = async url => { if (host && window.OozNativeCan && OozNativeCan.openUrl) return call('openUrl', { url }); window.open(url, '_blank', 'noopener'); return true; };
N.appearance = dark => { if (host && window.OozNativeCan && OozNativeCan.appearance) call('appearance', { dark: !!dark }).catch(() => {}); };
window.N = N;
})();
