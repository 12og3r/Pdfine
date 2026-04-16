import { useCallback, useEffect, useState } from 'react';

/**
 * useSfx — 8-bit sound effects for the Inkworld theme.
 *
 * Sounds are synthesized at call time via WebAudio (no audio files shipped).
 * Mute state persists in localStorage under "pdfine-muted" so the user's
 * preference survives reloads.
 *
 * Sounds:
 *   click    — tiny pip, for button clicks
 *   coin     — classic coin pickup arpeggio, for saves/success
 *   jump     — upward sweep, for upload / entering edit mode
 *   error    — descending buzz, for errors
 *   powerUp  — short ascending scale, for the "finished export" celebration
 *
 * Usage:
 *   const { play, muted, toggleMute } = useSfx();
 *   <button onClick={() => { play('click'); doThing(); }} />
 */

export type SfxName = 'click' | 'coin' | 'jump' | 'error' | 'powerUp';

const STORAGE_KEY = 'pdfine-muted';

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedCtx) return sharedCtx;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  sharedCtx = new Ctx();
  return sharedCtx;
}

interface Envelope {
  freq: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  sweepTo?: number;
  delay?: number;
}

function playTone(ctx: AudioContext, env: Envelope, startOffset = 0) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = env.type ?? 'square';
  osc.frequency.setValueAtTime(env.freq, now);
  if (env.sweepTo !== undefined) {
    osc.frequency.linearRampToValueAtTime(env.sweepTo, now + env.duration);
  }

  const peak = env.volume ?? 0.15;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.005);
  gain.gain.linearRampToValueAtTime(peak * 0.7, now + env.duration * 0.7);
  gain.gain.linearRampToValueAtTime(0, now + env.duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + env.duration + 0.02);
}

function playSequence(ctx: AudioContext, envs: Envelope[]) {
  let cursor = 0;
  envs.forEach((env) => {
    playTone(ctx, env, cursor + (env.delay ?? 0));
    cursor += (env.delay ?? 0) + env.duration * 0.85;
  });
}

function playSound(name: SfxName) {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  switch (name) {
    case 'click':
      playTone(ctx, { freq: 880, duration: 0.05, type: 'square', volume: 0.08 });
      break;
    case 'coin':
      playSequence(ctx, [
        { freq: 988, duration: 0.08, type: 'square', volume: 0.1 },
        { freq: 1319, duration: 0.18, type: 'square', volume: 0.1 },
      ]);
      break;
    case 'jump':
      playTone(ctx, {
        freq: 330,
        sweepTo: 880,
        duration: 0.18,
        type: 'square',
        volume: 0.1,
      });
      break;
    case 'error':
      playSequence(ctx, [
        { freq: 220, duration: 0.08, type: 'square', volume: 0.12 },
        { freq: 165, duration: 0.12, type: 'square', volume: 0.12 },
        { freq: 110, duration: 0.16, type: 'square', volume: 0.12 },
      ]);
      break;
    case 'powerUp':
      playSequence(ctx, [
        { freq: 523, duration: 0.07, type: 'square', volume: 0.1 },
        { freq: 659, duration: 0.07, type: 'square', volume: 0.1 },
        { freq: 784, duration: 0.07, type: 'square', volume: 0.1 },
        { freq: 1047, duration: 0.14, type: 'square', volume: 0.12 },
      ]);
      break;
  }
}

function readInitialMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function useSfx() {
  const [muted, setMuted] = useState<boolean>(readInitialMuted);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [muted]);

  const play = useCallback(
    (name: SfxName) => {
      if (muted) return;
      try {
        playSound(name);
      } catch {
        /* fail silently — audio is cosmetic */
      }
    },
    [muted]
  );

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  return { play, muted, setMuted, toggleMute };
}
