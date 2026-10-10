/**
 * Utility for synthesizing and playing clear, pleasant retail/order notification sounds
 * using the Web Audio API. Requires zero external audio files, works completely offline,
 * and has zero latency.
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (err) {
    console.warn("AudioContext initialization warning:", err);
    return null;
  }
}

/**
 * Call on first user interaction to ensure browser autoplay policy is satisfied.
 */
export function unlockAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

/**
 * Plays a bright, pleasant multi-tone chime for incoming orders (like a luxury cash register chime).
 */
export function playOrderNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().then(() => playChimeSequence(ctx)).catch(() => {});
    } else {
      playChimeSequence(ctx);
    }
  } catch (err) {
    console.warn("Could not play order notification chime:", err);
  }
}

function playChimeSequence(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // Harmonious ascending chime chord (E6 -> G#6 -> B6 -> E7)
  const chordNotes = [
    { freq: 1318.51, start: 0.0, duration: 0.45, gain: 0.28 },   // E6
    { freq: 1661.22, start: 0.12, duration: 0.55, gain: 0.32 },  // G#6
    { freq: 1975.53, start: 0.25, duration: 0.70, gain: 0.38 },  // B6
    { freq: 2637.02, start: 0.38, duration: 1.10, gain: 0.42 },  // E7 (shimmering sustain)
  ];

  chordNotes.forEach(({ freq, start, duration, gain }) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + start);

    // Smooth envelope attack and exponential decay
    gainNode.gain.setValueAtTime(0, now + start);
    gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.025);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + start);
    osc.stop(now + start + duration);
  });
}
