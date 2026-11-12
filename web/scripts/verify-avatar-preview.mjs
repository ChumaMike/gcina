// Run against the served, self-contained docs/avatar/preview.html.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.AVATAR_PREVIEW_URL||'http://localhost:8000/preview.html';
const output=path.resolve(process.env.AVATAR_CAPTURE_DIR||'../work/avatar-preview-captures');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:process.env.AVATAR_SOFTWARE_GPU==='1'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:1100},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForSelector('body[data-ready=true]');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Pause',exact:true}).click();
 const button=name=>page.getByRole('button',{name,exact:true});
 const capture=name=>page.screenshot({path:path.join(output,`${name}.png`)});
 await capture('full-character');await button('Face').click();await capture('face');
 for(const side of ['Left','Right']){
  await button('Open').click();await button(`${side} hand`).click();await capture(`${side.toLowerCase()}-open`);
  const open=await page.locator('canvas').screenshot();await button('Closed').click();await capture(`${side.toLowerCase()}-closed`);
  assert.ok(!(await page.locator('canvas').screenshot()).equals(open),'closed hand must change actual output');
  await button('Open').click();
  for(const finger of ['index','middle','ring','little','thumb']){
   await page.getByLabel('Individual digit').selectOption(finger);
   await page.getByLabel('Finger curl').focus();await page.keyboard.press('Home');const before=await page.locator('canvas').screenshot();
   await page.keyboard.press('End');assert.ok(!(await page.locator('canvas').screenshot()).equals(before),`${side} ${finger} must visibly articulate`);
  }
 }
 await button('Relaxed').click();await button('Side').click();await capture('side');
 await button('Left hand').click();await button('Reset view').click();assert.equal(await button('Front').getAttribute('aria-pressed'),'true');
 await page.setViewportSize({width:390,height:844});await capture('studio-mobile');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log(`PASS: front, face, side, both open/closed hands, ten independent digit controls, reset, mobile. Captures: ${output}`);
}finally{await browser.close()}
