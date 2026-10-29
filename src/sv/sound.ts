/** Short synthesized alert tones, so no audio files are needed. Each name is a sequence of [frequency Hz, milliseconds]. */
const TONES: Record<string, Array<[number, number]>> = {
  classic: [[880, 180], [660, 180], [880, 180], [660, 180]],
  soft: [[523, 260], [659, 260]],
  bright: [[1046, 120], [1318, 120], [1568, 200]],
  chime: [[988, 120], [1319, 220]],
  pop: [[700, 70], [450, 90]],
  alert: [[440, 200], [440, 200], [330, 320]],
  double: [[660, 120], [660, 120]],
  success: [[523, 120], [659, 120], [784, 220]],
  sparkle: [[1319, 90], [1568, 90], [2093, 180]],
};

let context: AudioContext | null = null;

/** Plays a named tone. "off" or an unknown name is silent; browsers without audio support are ignored. */
export function playTone(name: string) {
  const steps = TONES[name];
  if (!steps) return;
  try {
    context = context ?? new AudioContext();
    void context.resume();
    let at = context.currentTime;
    for (const [frequency, ms] of steps) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
      osc.connect(gain).connect(context.destination);
      osc.start(at);
      osc.stop(at + ms / 1000 + 0.02);
      at += ms / 1000 + 0.04;
    }
  } catch {
    // No audio available: stay silent.
  }
}
