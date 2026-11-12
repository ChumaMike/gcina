import { createAvatarScene, type AvatarView } from "../src/components/sasl-avatar/scene";
import { createSpeechController, preferredVoice } from "../src/components/sasl-avatar/speech";
import type { FingerName, HandPose } from "../src/components/sasl-avatar/rig";

declare const AVATAR_GLB: string;
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const host = element("avatar"), status = element("status"), message = element("speech-status");
const media = matchMedia("(prefers-reduced-motion: reduce)");
const options = { paused: false, demo: false, slow: false, reduced: media.matches, speaking: false };
let scene: ReturnType<typeof createAvatarScene> | undefined;
let pose: HandPose = "relaxed", finger: FingerName | undefined, voiceUsed = false;
const text = element<HTMLTextAreaElement>("text");
const voices = element<HTMLSelectElement>("voices"), rate = element<HTMLSelectElement>("rate");
const port = "speechSynthesis" in window ? window.speechSynthesis : undefined;
const speech = createSpeechController(port, (next) => {
  options.speaking = next.status === "speaking";
  scene?.setOptions(options);
  message.textContent = next.message;
  const active = ["starting", "speaking", "paused"].includes(next.status);
  element<HTMLButtonElement>("listen").disabled = active || next.status === "unsupported" || !text.value.trim();
  element<HTMLButtonElement>("stop").disabled = !active;
  element<HTMLButtonElement>("pause").disabled = next.status === "starting";
  const words = [...element("spoken").children];
  words.forEach((word, index) => word.classList.toggle("current", index === next.word));
});
function update() {
  scene?.setOptions(options);
  element<HTMLButtonElement>("demo").disabled = options.reduced;
  element("demo").setAttribute("aria-pressed", String(options.demo && !options.reduced));
  element("demo").textContent = options.demo && !options.reduced ? "Stop rig demo" : "Try rig demo";
  element("pause").setAttribute("aria-pressed", String(options.paused));
  element("pause").textContent = options.paused ? "Resume" : "Pause";
  status.textContent = options.reduced ? "Reduced motion · still pose" : options.paused ? "Motion paused" : options.demo ? "Rig demonstration · not SASL" : "Natural idle · drag or use arrow keys to turn";
}
function displayText() {
  const spans = text.value.trim().split(/\s+/).filter(Boolean).map((word) => { const span = document.createElement("span"); span.textContent = word + " "; return span; });
  element("spoken").replaceChildren(...spans);
  element<HTMLButtonElement>("listen").disabled = !text.value.trim() || speech.getState().status === "unsupported";
}
function refreshVoices() {
  const selected = voices.value, list = port?.getVoices() ?? [];
  voices.replaceChildren(...list.map((voice) => new Option(`${voice.name} (${voice.lang})`, voice.voiceURI)));
  if (!list.length) voices.add(new Option("System default · if available", ""));
  voices.value = list.some((voice) => voice.voiceURI === selected) ? selected : preferredVoice(list)?.voiceURI ?? "";
  element("voice-help").textContent = list.length ? "Uses voices available on this device; en-ZA is preferred when installed." : "No voices listed. Listen will try your system default. Install a speech voice in your device settings if needed.";
}
function listen() {
  voiceUsed = true; options.paused = false; update(); displayText();
  speech.listen(text.value.trim(), { voiceURI: voices.value, rate: Number(rate.value) * (options.slow ? .75 : 1) });
}
function inspect() { scene?.setInspection({ pose, finger, curl: Number(element<HTMLInputElement>("curl").value) }); }
element("listen").onclick = listen;
element("stop").onclick = () => speech.stop();
element("replay").onclick = () => { if (voiceUsed) listen(); else { options.paused = false; update(); } };
element("pause").onclick = () => {
  options.paused = !options.paused;
  if (options.paused) speech.pause(); else speech.resume();
  update();
};
element("demo").onclick = () => {
  options.demo = !options.demo; options.paused = false; speech.resume();
  if (options.demo) { pose = "relaxed"; finger = undefined; scene?.setInspection(); }
  else inspect();
  document.querySelectorAll("[data-pose]").forEach((button) => button.setAttribute("aria-pressed", String(button.getAttribute("data-pose") === pose && !options.demo)));
  element<HTMLSelectElement>("finger").value = "";
  element<HTMLInputElement>("curl").disabled = true;
  update();
};
element("reset").onclick = () => {
  scene?.setView("portrait"); scene?.resetView();
  document.querySelectorAll("[data-view]").forEach((button) => button.setAttribute("aria-pressed", String(button.getAttribute("data-view") === "portrait")));
};
element("slow").onclick = () => {
  speech.stop(); options.slow = !options.slow;
  element("slow").setAttribute("aria-pressed", String(options.slow)); update();
};
document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => button.onclick = () => {
  scene?.setView(button.dataset.view as AvatarView);
  document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
});
document.querySelectorAll<HTMLButtonElement>("[data-pose]").forEach((button) => button.onclick = () => {
  pose = button.dataset.pose as HandPose; finger = undefined; options.demo = false;
  element<HTMLSelectElement>("finger").value = ""; element<HTMLInputElement>("curl").disabled = true;
  document.querySelectorAll("[data-pose]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
  inspect(); update();
});
element<HTMLSelectElement>("finger").onchange = (event) => {
  finger = (event.target as HTMLSelectElement).value as FingerName || undefined;
  options.demo = false; element<HTMLInputElement>("curl").disabled = !finger;
  inspect(); update();
};
element<HTMLInputElement>("curl").oninput = () => { element("curl-value").textContent = `${Math.round(Number(element<HTMLInputElement>("curl").value) * 100)}%`; inspect(); };
text.oninput = () => { speech.stop(); voiceUsed = false; displayText(); };
voices.onchange = rate.onchange = () => speech.stop();
const motionChanged = () => { options.reduced = media.matches; update(); };
media.addEventListener("change", motionChanged);
port?.addEventListener("voiceschanged", refreshVoices);
refreshVoices(); displayText(); message.textContent = speech.getState().message;
try {
  const binary = Uint8Array.from(atob(AVATAR_GLB), (character) => character.charCodeAt(0));
  scene = createAvatarScene(host, () => { status.textContent = "3D is unavailable. Reload to retry. Voice and written text remain available."; }, binary.buffer);
  scene.ready.then(() => { update(); document.body.dataset.ready = "true"; }).catch(() => { status.textContent = "The character could not load. Voice and written text remain available."; });
} catch { status.textContent = "3D is unavailable. Enable WebGL and reload. Voice and written text remain available."; }
window.addEventListener("pagehide", () => {
  speech.dispose(); scene?.dispose();
  port?.removeEventListener("voiceschanged", refreshVoices);
  media.removeEventListener("change", motionChanged);
}, { once: true });
