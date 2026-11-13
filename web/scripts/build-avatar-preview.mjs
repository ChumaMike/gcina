// Optional authoring tool; esbuild is not a runtime dependency.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const { build } = await import(process.env.ESBUILD_MODULE ? pathToFileURL(process.env.ESBUILD_MODULE).href : 'esbuild');
const web = fileURLToPath(new URL('..', import.meta.url));
const glb = await readFile(path.join(web, 'public/avatars/gcina-v2.glb'));
const result = await build({
  entryPoints: [path.join(web, 'scripts/avatar-preview.ts')],
  define: { AVATAR_GLB: JSON.stringify(glb.toString('base64')) },
  bundle: true, format: 'iife', minify: true, write: false, legalComments: 'inline',
});
const template = await readFile(path.join(web, 'scripts/avatar-preview.html'), 'utf8');
const html = template.replace('<!-- BUNDLED_SCRIPT -->', () => `<script>${result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>`);
const output = path.join(web, '../docs/avatar/preview.html');
await writeFile(output, html);
console.log(`Built self-contained preview: ${output} (${Math.round(Buffer.byteLength(html) / 1024)} KiB).`);
