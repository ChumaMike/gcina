// Optional, reproducible standalone preview; esbuild is not a runtime dependency.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const { build } = await import(process.env.ESBUILD_MODULE ? pathToFileURL(process.env.ESBUILD_MODULE).href : 'esbuild');
const web = fileURLToPath(new URL('..', import.meta.url));
const result = await build({
  stdin: {
    resolveDir: web,
    contents: `import { createAvatarScene } from './src/components/sasl-avatar/scene';
const host = document.querySelector('#avatar');
const status = document.querySelector('#status');
const media = matchMedia('(prefers-reduced-motion: reduce)');
const options = { paused: false, demo: false, slow: false, reduced: media.matches };
let scene;
const demo = document.querySelector('#demo');
const pause = document.querySelector('#pause');
function update() {
  scene?.setOptions(options);
  demo.disabled = options.reduced;
  demo.setAttribute('aria-pressed', String(options.demo && !options.reduced));
  pause.setAttribute('aria-pressed', String(options.paused));
  pause.textContent = options.paused ? 'Resume motion' : 'Pause motion';
  demo.textContent = options.demo && !options.reduced ? 'Stop rig demo' : 'Try rig demo';
  status.textContent = options.reduced ? 'Reduced motion · still pose' : options.paused ? 'Motion paused' : options.demo ? 'Rig demonstration · not SASL' : 'Natural idle · drag or use arrow keys to explore';
}
try { scene = createAvatarScene(host, () => { status.textContent = 'WebGL context lost. Reload to retry.'; }); update(); }
catch { status.textContent = '3D is unavailable in this browser. Enable WebGL and reload to retry.'; }
demo.onclick = () => { options.demo = !options.demo; options.paused = false; update(); };
pause.onclick = () => { options.paused = !options.paused; update(); };
document.querySelector('#reset').onclick = () => scene?.resetView();
document.querySelector('#slow').onclick = e => { options.slow = !options.slow; e.currentTarget.setAttribute('aria-pressed', String(options.slow)); update(); };
media.addEventListener('change', () => { options.reduced = media.matches; update(); });
window.addEventListener('pagehide', () => scene?.dispose(), { once: true });`,
  },
  bundle: true, format: 'iife', minify: true, write: false, legalComments: 'inline',
});
const html = `<!doctype html>
<html lang="en-ZA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gcina · human connection</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f2f5f2;color:#193b36;font:15px/1.6 system-ui,sans-serif}main{max-width:1040px;margin:0 auto;padding:44px 24px;display:grid;grid-template-columns:1fr 1.25fr;align-items:center;gap:64px}h1{font-size:clamp(34px,5vw,56px);line-height:1.1;letter-spacing:-.05em;font-weight:650;margin:24px 0}p{color:#586f68}.brand{display:inline-flex;align-items:center;gap:10px;font-weight:700;letter-spacing:.01em}.brand span{width:24px;height:24px;border:6px double #087b76;border-radius:50%;display:inline-block}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.15em;font-weight:600}.card{background:white;padding:12px;border:1px solid #dbe6df;border-radius:28px;box-shadow:0 28px 65px -30px #234f4938}.sasl-studio{position:relative;height:min(65vh,570px);min-height:340px;background:radial-gradient(ellipse at 50% 38%,#fff 0%,#edf4ef 38%,#d2e3dc 100%);border-radius:20px;overflow:hidden}#avatar{width:100%;height:100%;touch-action:pan-y;cursor:grab;outline-offset:-4px;border-radius:20px}#avatar:active{cursor:grabbing}#avatar:focus-visible{outline:2px solid #087b76}#avatar canvas{display:block}.tag{position:absolute;top:18px;left:20px;font-size:10px;letter-spacing:.18em;font-weight:650;pointer-events:none}.controls{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px 2px 4px}button{font:600 12px system-ui;color:#1c514a;min-height:42px;border:1px solid #d7e4de;border-radius:99px;background:white;cursor:pointer}button:hover{background:#edf4ef}button[aria-pressed=true]{background:#087b76;color:white;border-color:#087b76}button:focus-visible{outline:2px solid #087b76;outline-offset:3px}button:disabled{opacity:.5;cursor:default}#status{text-align:center;font-size:11px;min-height:18px;margin:10px 0 2px}.note{padding:16px 0;border-top:1px solid #d5e0da;font-size:12px;margin-top:28px}.hint{font-size:12px}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}@media(max-width:700px){main{display:flex;flex-direction:column;gap:22px;padding:24px 18px}.intro,.card{width:100%;max-width:440px}h1{font-size:34px;margin:16px 0}.intro>p:not(.eyebrow){margin-bottom:8px}.note{margin-top:14px;padding-top:12px}.hint{display:none}.sasl-studio{height:440px;min-height:0}}
</style></head><body><main><div class="intro"><div class="brand"><span aria-hidden="true"></span>gcina</div><h1>A more human<br>connection.</h1><p class="eyebrow">South African Sign Language · concept</p><p>An expressive, articulated human avatar.<br>Designed to make space for authentic signing.</p><p class="hint">Drag the character to explore. Use left/right arrows when the viewer is focused, or Home to return to the front.</p><p class="note"><strong>Movement study, not SASL translation.</strong><br>Authentic signing requires animation built and validated with Deaf SASL experts. The rig demo is a fixed movement study, independent of language.</p></div><div class="card"><div class="sasl-studio"><div id="avatar" role="group" tabindex="0" aria-label="Interactive 3D human avatar" aria-describedby="help"></div><span class="tag">GCINA AVATAR</span></div><span id="help" class="sr">Drag horizontally or use left and right arrows to turn. Home resets the view. This is not SASL translation.</span><div class="controls"><button id="demo" aria-pressed="false">Try rig demo</button><button id="pause" aria-pressed="false">Pause motion</button><button id="slow" aria-pressed="false">Slower</button><button id="reset">Reset view</button></div><p id="status" role="status">Preparing your avatar…</p></div></main><script>${result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
const output = path.join(web, '../docs/avatar/preview.html');
await writeFile(output, html);
console.log(`Built ${output} (${Math.round(Buffer.byteLength(html) / 1024)} KiB).`);
