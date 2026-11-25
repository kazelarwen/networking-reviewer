export type AudioEngine = {
  setEnabled: (enabled: boolean) => Promise<void>;
  playResult: (correct: boolean) => void;
  dispose: () => void;
};

export function createAudioEngine(): AudioEngine {
  let context: AudioContext | null = null;
  let enabled = false;
  let backgroundTimer: number | null = null;
  let noteIndex = 0;
  const melody = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];

  function getContext(): AudioContext {
    if (!context) context = new window.AudioContext();
    return context;
  }

  function playTone(frequency: number, startAt: number, duration: number, volume: number) {
    if (!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration);
  }

  function playBackgroundNote() {
    if (!context || !enabled) return;
    playTone(melody[noteIndex % melody.length], context.currentTime, 1.3, 0.012);
    noteIndex += 1;
  }

  async function setEnabled(nextEnabled: boolean) {
    if (!nextEnabled) {
      enabled = false;
      if (backgroundTimer !== null) window.clearInterval(backgroundTimer);
      backgroundTimer = null;
      if (context?.state === "running") await context.suspend();
      return;
    }

    const audioContext = getContext();
    await audioContext.resume();
    enabled = true;
    if (backgroundTimer === null) {
      playBackgroundNote();
      backgroundTimer = window.setInterval(playBackgroundNote, 1900);
    }
  }

  function playResult(correct: boolean) {
    if (!enabled || !context) return;
    const startAt = context.currentTime;
    if (correct) {
      playTone(659.25, startAt, 0.16, 0.06);
      playTone(880, startAt + 0.12, 0.2, 0.06);
    } else {
      playTone(246.94, startAt, 0.2, 0.045);
    }
  }

  function dispose() {
    enabled = false;
    if (backgroundTimer !== null) window.clearInterval(backgroundTimer);
    backgroundTimer = null;
    if (context) void context.close();
    context = null;
  }

  return { setEnabled, playResult, dispose };
}
