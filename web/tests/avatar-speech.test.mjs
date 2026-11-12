import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSpeechController, preferredVoice } from '../src/components/sasl-avatar/speech.ts';
const voices = [{ voiceURI: 'us', name: 'English US', lang: 'en-US', localService: true }, { voiceURI: 'za', name: 'English ZA', lang: 'en-ZA', localService: true }];
function harness(list = voices) {
  const calls = [], states = [];
  const port = { getVoices: () => list, speak: utterance => calls.push(['speak', utterance]), cancel: () => calls.push(['cancel']), pause: () => calls.push(['pause']), resume: () => calls.push(['resume']) };
  const controller = createSpeechController(port, state => states.push(state), text => ({ text }));
  return { calls, states, controller, utterance: () => calls.filter(c => c[0] === 'speak').at(-1)[1] };
}
test('audio requires Listen; prefers installed en-ZA and honours voice/rate selection', () => {
  const h = harness();
  try {
    assert.deepEqual(h.calls, []);
    h.controller.listen('Payment paused.');
    assert.equal(h.utterance().voice.voiceURI, 'za');
    assert.equal(h.utterance().lang, 'en-ZA');
    h.controller.listen('Review the supplier.', { voiceURI: 'us', rate: .75 });
    assert.deepEqual(h.calls.map(c => c[0]), ['speak', 'cancel', 'speak']);
    assert.equal(h.utterance().voice.voiceURI, 'us');
    assert.equal(h.utterance().rate, .75);
    assert.equal(preferredVoice([]), undefined);
  } finally { h.controller.dispose(); }
});
test('only reliable word events drive highlighting; pause and resume retain the word', () => {
  const h = harness();
  try {
    h.controller.listen('Payment paused. Review'); const u = h.utterance(); u.onstart();
    const boundary = charIndex => u.onboundary({ name: 'word', charIndex });
    u.onboundary({ name: 'sentence', charIndex: 0 }); assert.equal(h.controller.getState().word, -1);
    boundary(0); boundary(8); assert.equal(h.controller.getState().word, 1);
    boundary(0); boundary(999); boundary(-1); boundary(3.5); assert.equal(h.controller.getState().word, 1);
    h.controller.pause(); boundary(16); assert.equal(h.controller.getState().word, 1);
    assert.equal(h.controller.getState().status, 'paused');
    h.controller.resume(); boundary(16); assert.equal(h.controller.getState().word, 2);
    u.onend(); assert.equal(h.controller.getState().word, 3); assert.equal(h.controller.getState().status, 'idle');
    assert.deepEqual(h.calls.map(c => c[0]), ['speak', 'pause', 'resume']);
  } finally { h.controller.dispose(); }
});
test('stop, replacement and unmount invalidate late browser callbacks and cancel owned speech', () => {
  const h = harness();
  h.controller.listen('First message');
  const staleStart = h.utterance().onstart, staleEnd = h.utterance().onend, staleError = h.utterance().onerror;
  h.controller.listen('Second message'); h.utterance().onstart();
  staleStart(); staleEnd(); staleError({ error: 'canceled' });
  assert.equal(h.controller.getState().status, 'speaking');
  const staleBoundary = h.utterance().onboundary;
  h.controller.stop(); staleBoundary({ name: 'word', charIndex: 0 });
  assert.equal(h.controller.getState().status, 'idle'); assert.equal(h.controller.getState().word, -1);
  h.controller.listen('Third message'); const callback = h.utterance().onstart;
  h.controller.dispose(); const count = h.states.length; callback(); h.controller.listen('Should not speak');
  assert.equal(h.states.length, count);
  assert.deepEqual(h.calls.map(c => c[0]), ['speak', 'cancel', 'speak', 'cancel', 'speak', 'cancel']);
});
test('no word boundaries keeps all text available without invented timing', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const h = harness();
  try {
    h.controller.listen('Payment paused. Review the supplier.'); h.utterance().onstart();
    context.mock.timers.tick(1500);
    assert.equal(h.controller.getState().word, -1); assert.equal(h.controller.getState().timed, false);
    assert.match(h.controller.getState().message, /does not provide word timing/);
  } finally { h.controller.dispose(); }
});
test('unsupported, empty voice lists, errors and silent engines fail gracefully', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const unavailable = createSpeechController(undefined, () => assert.fail('unsupported must not speak'));
  unavailable.listen('Text'); assert.equal(unavailable.getState().status, 'unsupported'); unavailable.dispose();
  const h = harness([]);
  try {
    h.controller.listen('Text'); assert.equal(h.utterance().voice, undefined); // Browser default may still work.
    h.utterance().onerror({ error: 'voice-unavailable' }); assert.equal(h.controller.getState().status, 'error');
    assert.match(h.controller.getState().message, /text is still available/);
    h.controller.listen('Text'); context.mock.timers.tick(10001);
    assert.equal(h.controller.getState().status, 'error'); assert.equal(h.calls.at(-1)[0], 'cancel');
  } finally { h.controller.dispose(); }
});
