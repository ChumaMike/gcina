// Browser regression checks. Playwright is deliberately an optional test tool.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const loadTool = createRequire(import.meta.url);
const { chromium } = loadTool(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.AVATAR_BASE_URL || 'http://localhost:3000';
const passcode = process.env.AVATAR_TEST_PASSCODE;
if (!passcode) throw new Error('Set AVATAR_TEST_PASSCODE to your local mock dashboard passcode.');
const output = path.resolve(process.env.AVATAR_CAPTURE_DIR || '../work/avatar-captures');
fs.mkdirSync(output, { recursive: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function checkCompactLayout(page) {
  const panel = await page.locator('#sasl-preview-panel').boundingBox();
  const avatar = await page.locator('.sasl-studio').boundingBox();
  const text = await page.locator('[data-avatar-text]').boundingBox();
  assert.ok(panel.width <= 320, 'panel must retain the original 320px maximum width');
  assert.ok(avatar.width <= 160 && avatar.width >= 140, 'avatar must fit the original compact width');
  assert.equal(avatar.height, 190, 'avatar must retain the original 190px height');
  assert.ok(text.x >= avatar.x + avatar.width && text.y < avatar.y + avatar.height, 'text must remain beside the avatar');
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headless: true,
    args: process.env.AVATAR_SOFTWARE_GPU === '1' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [],
  });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5 });
    await context.addInitScript(() => {
      window.__avatarDraws = 0;
      window.__avatarFrames = 0;
      let lastFrame = -1, stamp = 0;
      const raf = window.requestAnimationFrame;
      window.requestAnimationFrame = callback => raf.call(window, ts => { stamp = ts; callback(ts); });
      for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const original = WebGL2RenderingContext.prototype[name];
        WebGL2RenderingContext.prototype[name] = function (...args) {
          if (this.canvas.closest?.('.sasl-studio')) {
            window.__avatarDraws++;
            if (lastFrame !== stamp) { window.__avatarFrames++; lastFrame = stamp; }
          }
          return original.apply(this, args);
        };
      }
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.locator('input[type="password"]').fill(passcode);
    await page.getByRole('button', { name: 'Open my dashboard' }).click();
    await page.waitForURL(`${base}/`);
    assert.equal(await page.locator('canvas').count(), 0, '3D must be lazy');
    const panel = page.locator('#sasl-preview-panel');
    const button = name => page.getByRole('button', { name, exact: true });
    const open = async () => {
      await button('Sign language preview').click();
      await page.getByRole('group', { name: 'Interactive 3D human avatar' }).waitFor();
      await page.locator('.sasl-studio canvas').waitFor();
      await page.getByText('Preparing your avatar…').waitFor({ state: 'hidden' });
    };
    await open();
    await checkCompactLayout(page);
    assert.equal(await page.locator('canvas').count(), 1);
    assert.match(await panel.innerText(), /Movement study, not SASL translation/);
    await button('Pause').click();
    await delay(150);
    const canvas = page.locator('.sasl-studio canvas');
    // Exclude the focus outline and overlaid controls, which change on keyboard/hover input.
    const capture = async () => {
      const b = await canvas.boundingBox();
      return page.screenshot({ clip: { x: b.x + 24, y: b.y + 48, width: b.width - 48, height: b.height - 90 } });
    };
    const difference = (a, b) => page.evaluate(async ([first, second]) => {
      const pixels = async source => {
        const image = new Image(); image.src = source; await image.decode();
        const canvas = new OffscreenCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
        return ctx.getImageData(0, 0, image.width, image.height).data;
      };
      const [left, right] = await Promise.all([pixels(first), pixels(second)]);
      let delta = 0;
      for (let i = 0; i < left.length; i++) delta += Math.abs(left[i] - right[i]);
      return delta / left.length;
    }, [a, b].map(buffer => `data:image/png;base64,${buffer.toString('base64')}`));
    const pausedA = await capture();
    const drawsPaused = await page.evaluate(() => window.__avatarDraws);
    await delay(400);
    assert.ok(await difference(await capture(), pausedA) < 0.25, 'pause must freeze the actual output');
    assert.equal(await page.evaluate(() => window.__avatarDraws), drawsPaused, 'paused render loop must stop');
    await page.screenshot({ path: path.join(output, 'desktop.png') });
    await panel.screenshot({ path: path.join(output, 'avatar.png') });
    const viewer = page.getByRole('group', { name: 'Interactive 3D human avatar' });
    await viewer.focus();
    const frontFocused = await capture();
    await page.keyboard.press('ArrowRight');
    assert.ok(await difference(await capture(), pausedA) > 0.5, 'keyboard rotation must change the character');
    await page.keyboard.press('Home');
    const homeCapture = await capture();
    assert.ok(await difference(homeCapture, frontFocused) < 0.25, 'Home must restore the front view (allow subpixel raster differences)');
    const box = await viewer.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    assert.ok(await difference(await capture(), pausedA) > 0.5, 'drag rotation must work');
    await button('Reset avatar view').click();
    assert.ok(await difference(await capture(), pausedA) < 0.25, 'reset must restore the front view');

    // Existing page text selection, reading pace, replay and keyboard selection.
    const heading = page.locator('main h1').first();
    await heading.hover();
    await delay(220);
    const headingText = (await heading.innerText()).trim();
    assert.ok(await panel.getByText(headingText, { exact: true }).count(), 'hover must select page text');
    assert.match(await heading.getAttribute('class'), /sasl-highlight/);
    await button('Slower').click();
    assert.equal(await button('Slower').getAttribute('aria-pressed'), 'true');
    await button('Replay').click();
    await delay(80);
    assert.ok(await page.evaluate(() => CSS.highlights.has('sasl-word')));
    await button('Pause').click();
    const textBefore = await panel.innerText();
    await delay(700);
    assert.equal(await panel.innerText(), textBefore, 'pause must also pause reading');
    const link = page.locator('aside a, nav a').first();
    await link.focus();
    await delay(30);
    assert.match(await link.getAttribute('class'), /sasl-highlight/, 'keyboard focus must select text');
    await page.keyboard.press('Escape');
    await button('Sign language preview').waitFor();
    assert.equal(await page.locator('canvas').count(), 0);
    assert.equal(await page.locator('.sasl-highlight').count(), 0);
    assert.equal(await page.evaluate(() => CSS.highlights.has('sasl-word')), false);
    assert.equal(await button('Sign language preview').evaluate(el => el === document.activeElement), true);

    // Motion and drawing budget, observed in real Chromium, not inferred from source.
    await open();
    await button('Try rig demo').click();
    await delay(1200);
    const motionA = await capture();
    await delay(600);
    assert.ok(!(await capture()).equals(motionA), 'rig demo must animate');
    await button('Slower').click(); // restore normal speed
    const before = await page.evaluate(() => ({ frames: window.__avatarFrames, draws: window.__avatarDraws }));
    const start = performance.now();
    await delay(3000);
    const after = await page.evaluate(() => ({ frames: window.__avatarFrames, draws: window.__avatarDraws }));
    const seconds = (performance.now() - start) / 1000;
    const fps = (after.frames - before.frames) / seconds;
    console.log(JSON.stringify({ observedFps: +fps.toFixed(1), drawCallsPerFrame: Math.round((after.draws - before.draws) / (after.frames - before.frames)), softwareGpu: process.env.AVATAR_SOFTWARE_GPU === '1' }));
    await button('Pause').click();
    await panel.screenshot({ path: path.join(output, 'rig-demo.png') });

    // Preference changes while open must take effect immediately, without remounting.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByText('Reduced motion · still pose', { exact: true }).waitFor();
    assert.equal(await button('Try rig demo').isDisabled(), true);
    const reducedA = await capture();
    const reducedDraws = await page.evaluate(() => window.__avatarDraws);
    await delay(450);
    assert.ok(await difference(await capture(), reducedA) < 0.25, 'reduced motion must keep the actual output still');
    assert.equal(await page.evaluate(() => window.__avatarDraws), reducedDraws);
    await panel.screenshot({ path: path.join(output, 'reduced-motion.png') });
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // Simulate a lost GPU context, then recover through the visible retry action.
    await page.evaluate(() => document.querySelector('.sasl-studio canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.getByText(/The 3D preview is unavailable/).waitFor();
    await button('Retry 3D preview').click();
    await page.getByText('Preparing your avatar…').waitFor({ state: 'hidden' });
    await button('Reset avatar view').waitFor();
    assert.equal(await page.locator('canvas').count(), 1);

    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Escape');
      const stopped = await page.evaluate(() => window.__avatarDraws);
      await delay(100);
      assert.equal(await page.evaluate(() => window.__avatarDraws), stopped, 'closed renderer must not draw');
      await open();
      assert.equal(await page.locator('canvas').count(), 1, 'reopen must not leak canvases');
    }
    await page.keyboard.press('Escape');

    // The GLB is new in V2: closing during an in-flight load must not revive it.
    await page.route('**/avatars/gcina-v2.glb', async route => {
      await delay(350);
      try { await route.continue(); } catch { /* Closing legitimately aborts the request. */ }
    });
    await button('Sign language preview').click();
    await page.getByText('Preparing your avatar…').waitFor();
    await page.keyboard.press('Escape');
    await delay(500);
    assert.equal(await page.locator('canvas').count(), 0, 'late model load must not revive a closed viewer');
    await page.unroute('**/avatars/gcina-v2.glb');
    await open();
    assert.equal(await page.locator('canvas').count(), 1);
    await page.keyboard.press('Escape');

    // Real mobile viewport/touch context, plus compact and landscape layouts.
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, storageState: await context.storageState() });
    const phone = await mobile.newPage();
    phone.on('pageerror', e => errors.push(e.message));
    await phone.goto(base);
    await phone.getByRole('button', { name: 'Sign language preview', exact: true }).tap();
    await phone.locator('canvas').waitFor();
    await phone.getByText('Preparing your avatar…').waitFor({ state: 'hidden' });
    await phone.getByRole('button', { name: 'Pause', exact: true }).tap();
    const mobilePanel = phone.locator('#sasl-preview-panel');
    await checkCompactLayout(phone);
    const mobileBox = await mobilePanel.boundingBox();
    assert.ok(mobileBox.x >= 0 && mobileBox.y >= 0 && mobileBox.x + mobileBox.width <= 390 && mobileBox.y + mobileBox.height <= 844);
    await phone.screenshot({ path: path.join(output, 'mobile.png') });
    // Touch selection does not need to navigate or mutate the page.
    await phone.locator('main h1').first().tap();
    await delay(80);
    assert.match(await phone.locator('main h1').first().getAttribute('class'), /sasl-highlight/);
    await phone.setViewportSize({ width: 320, height: 568 });
    await delay(150);
    await checkCompactLayout(phone);
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await mobilePanel.getByRole('button', { name: 'Slower', exact: true }).scrollIntoViewIfNeeded();
    await phone.screenshot({ path: path.join(output, 'mobile-small.png') });
    await phone.setViewportSize({ width: 844, height: 390 });
    await delay(150);
    await phone.getByRole('button', { name: 'Close the sign language preview (Esc)', exact: true }).scrollIntoViewIfNeeded();
    const landscape = await mobilePanel.boundingBox();
    assert.ok(landscape.y >= 0 && landscape.y + landscape.height <= 390);
    await phone.getByRole('button', { name: 'Close the sign language preview (Esc)', exact: true }).tap();
    await mobile.close();

    // WebGL unavailable: text flow and panel controls must remain usable.
    const fallback = await browser.newContext({ storageState: await context.storageState() });
    await fallback.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (/webgl/.test(type)) return null;
        return getContext.call(this, type, ...args);
      };
    });
    const fallbackPage = await fallback.newPage();
    await fallbackPage.goto(base);
    await fallbackPage.getByRole('button', { name: 'Sign language preview', exact: true }).click();
    await fallbackPage.getByText(/The 3D preview is unavailable/).waitFor();
    await fallbackPage.locator('main h1').first().hover();
    await delay(200);
    assert.ok(await fallbackPage.locator('.sasl-highlight').count());
    await fallbackPage.getByRole('button', { name: 'Retry 3D preview' }).click();
    await fallbackPage.getByText(/The 3D preview is unavailable/).waitFor();
    await fallbackPage.keyboard.press('Escape');
    assert.equal(await fallbackPage.locator('#sasl-preview-panel').count(), 0);
    await fallback.close();

    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log(`PASS: desktop, mobile, touch, keyboard, reading/replay, pause, reduced motion, WebGL fallback, teardown. Captures: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
