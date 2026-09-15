// Web Audio API lightweight sound effects for interactive learning

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  if ("AudioContext" in window && typeof window.AudioContext === "function") {
    return window.AudioContext;
  }
  const win = window as unknown as Record<string, unknown>;
  const webkitCtx = win["webkitAudioContext"];
  if (typeof webkitCtx === "function") {
    return webkitCtx as typeof AudioContext;
  }
  return null;
}

export function playSuccessChime(): void {
  const AudioContextClass = getAudioContextConstructor();
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    // Pleasant C6 - E6 - G6 chord
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.2);

    osc2.frequency.setValueAtTime(1046.5, now + 0.1);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.08);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch {}
}

export function playErrorBuzz(): void {
  const AudioContextClass = getAudioContextConstructor();
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.2);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch {}
}
