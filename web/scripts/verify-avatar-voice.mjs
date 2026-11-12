// Optional Playwright tool. The deterministic speech double tests browser wiring;
// a separate native check records real installed voices without claiming audio.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.AVATAR_BASE_URL || 'http://localhost:3000';
const passcode = process.env.AVATAR_TEST_PASSCODE;
if (!passcode) throw new Error('Set AVATAR_TEST_PASSCODE for the local mock dashboard.');
const output = path.resolve(process.env.AVATAR_CAPTURE_DIR || '../work/avatar-captures');
fs.mkdirSync(output,{recursive:true});
function speechDouble() {
  class Utterance { constructor(text) { this.text=text; } }
  class Synth extends EventTarget {
    calls=[]; current=null;
    getVoices(){return [{voiceURI:'us',name:'Test English US',lang:'en-US',localService:true},{voiceURI:'za',name:'Test English ZA',lang:'en-ZA',localService:true}]}
    speak(u){this.current=u;this.calls.push({action:'speak',text:u.text,voice:u.voice?.voiceURI,rate:u.rate});setTimeout(()=>u.onstart?.({}),25)}
    cancel(){this.calls.push({action:'cancel'});this.current=null}
    pause(){this.calls.push({action:'pause'})}
    resume(){this.calls.push({action:'resume'})}
    boundary(index){this.current?.onboundary?.({name:'word',charIndex:index})}
  }
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:Utterance,configurable:true});
  Object.defineProperty(window,'speechSynthesis',{value:new Synth(),configurable:true});
}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:process.env.AVATAR_SOFTWARE_GPU==='1'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]});
const errors=[];
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(speechDouble);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.locator('input[type=password]').fill(passcode);await page.getByRole('button',{name:'Open my dashboard'}).click();await page.waitForURL(`${base}/`);
  const state=await context.storageState();
  const panel=page.locator('#sasl-preview-panel');
  const button=name=>panel.getByRole('button',{name,exact:true});
  const open=async()=>{await page.getByRole('button',{name:'Sign language preview',exact:true}).click();await page.getByRole('button',{name:'Reset avatar view',exact:true}).waitFor()};
  await open();
  const paragraph=page.locator('main p').first();await paragraph.hover();await page.waitForTimeout(220);
  const selected=(await paragraph.innerText()).trim().split(/\s+/).slice(0,28).join(' ');
  assert.equal(await page.evaluate(()=>speechSynthesis.calls.length),0,'selection must never autoplay');
  await button('Listen').click();await page.getByText('Reading aloud. Mouth movement is approximate.',{exact:true}).waitFor();
  const first=await page.evaluate(()=>speechSynthesis.calls[0]);assert.equal(first.text,selected);assert.equal(first.voice,'za');
  assert.equal(await button('Listen').count(),0);assert.equal(await button('Stop audio').isVisible(),true);
  await page.waitForTimeout(1300);assert.match(await panel.innerText(),/does not provide word timing/);
  assert.equal(await page.evaluate(()=>CSS.highlights.has('sasl-word')),false,'no guessed highlighting without boundaries');
  const second=selected.indexOf(' ')+1;
  await page.evaluate(index=>speechSynthesis.boundary(index),second);
  await page.waitForFunction(word=>[...(CSS.highlights.get('sasl-word')??[])].some(range=>range.toString()===word),selected.split(' ')[1]);
  await button('Pause').click();assert.equal(await page.evaluate(()=>speechSynthesis.calls.at(-1).action),'pause');
  await button('Resume').click();assert.equal(await page.evaluate(()=>speechSynthesis.calls.at(-1).action),'resume');
  await button('Replay').click();await page.waitForTimeout(100);
  assert.deepEqual(await page.evaluate(()=>speechSynthesis.calls.slice(-2).map(c=>c.action)),['cancel','speak']);
  await panel.screenshot({path:path.join(output,'voice-controls-test-double.png')});
  await button('Stop audio').click();assert.equal(await page.evaluate(()=>speechSynthesis.calls.at(-1).action),'cancel');
  await panel.getByText('Voice settings',{exact:true}).click();
  await panel.getByLabel('Installed voice').selectOption('us');await panel.getByLabel('Speech speed').selectOption('0.75');
  await button('Listen').click();await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>{const c=speechSynthesis.calls.at(-1);return[c.voice,c.rate]}),['us',.75]);
  const calls=await page.evaluate(()=>speechSynthesis.calls.length);await page.locator('main h1').first().hover();await page.waitForTimeout(220);
  assert.equal(await page.evaluate(()=>speechSynthesis.calls.length),calls+1);assert.equal(await page.evaluate(()=>speechSynthesis.calls.at(-1).action),'cancel','new selection cancels without starting audio');
  await button('Listen').click();await page.waitForTimeout(100);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>speechSynthesis.calls.at(-1).action),'cancel');
  assert.equal(await page.locator('canvas').count(),0);
  await open();await paragraph.hover();await page.waitForTimeout(220);await page.emulateMedia({reducedMotion:'reduce'});
  await button('Listen').click();await page.getByText('Reading aloud. Mouth movement is approximate.',{exact:true}).waitFor();
  await page.getByText('Reduced motion · still pose',{exact:true}).waitFor();
  await page.evaluate(()=>speechSynthesis.boundary(0));await page.waitForTimeout(150);
  const canvas=page.locator('.sasl-studio canvas');const before=await canvas.screenshot();await page.waitForTimeout(450);
  const after=await canvas.screenshot();
  fs.writeFileSync(path.join(output,'voice-reduced-before.png'),before);fs.writeFileSync(path.join(output,'voice-reduced-after.png'),after);
  const difference=await page.evaluate(async images=>{
    const pixels=async source=>{const image=new Image();image.src=source;await image.decode();const canvas=new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,image.width,image.height).data};
    const [a,b]=await Promise.all(images.map(pixels));let delta=0;for(let i=0;i<a.length;i++)delta+=Math.abs(a[i]-b[i]);return delta/a.length;
  },[before,after].map(b=>'data:image/png;base64,'+b.toString('base64')));
  assert.ok(difference<.25,`reduced-motion speech must keep the character still (pixel delta ${difference})`);
  await page.keyboard.press('Escape');

  const unsupported=await browser.newContext({storageState:state});
  await unsupported.addInitScript(()=>Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true}));
  const noSpeech=await unsupported.newPage();await noSpeech.goto(base);await noSpeech.getByRole('button',{name:'Sign language preview',exact:true}).click();
  await noSpeech.getByText(/Read aloud is unavailable/).waitFor();await noSpeech.locator('main p').first().hover();await noSpeech.waitForTimeout(220);
  assert.equal(await noSpeech.getByRole('button',{name:'Listen',exact:true}).isDisabled(),true);await unsupported.close();

  const native=await browser.newContext({storageState:state});const nativePage=await native.newPage();
  await nativePage.goto(base);await nativePage.getByRole('button',{name:'Sign language preview',exact:true}).click();
  await nativePage.locator('main p').first().hover();await nativePage.waitForTimeout(300);
  const voices=await nativePage.evaluate(()=>speechSynthesis.getVoices().map(v=>({name:v.name,lang:v.lang})));
  if(!voices.length){await nativePage.getByRole('button',{name:'Listen',exact:true}).click();await nativePage.getByText(/could not play|did not start|could not start/).waitFor({timeout:12000});}
  console.log(JSON.stringify({nativeVoices:voices,audiblePlaybackVerified:false,speechDouble:'PASS: explicit start, selection cancellation, boundaries, no-boundary fallback, settings, pause/resume, replay, stop, close, reduced motion, unsupported'}));
  assert.deepEqual(errors,[]);
  await native.close();await context.close();
}finally{await browser.close()}
