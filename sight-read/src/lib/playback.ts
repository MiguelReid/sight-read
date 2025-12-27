/**
 * Playback Service + React Hooks
 * 
 * Centralized audio playback for sheet music with React integration.
 */

'use client';

import { useState, useEffect } from 'react';
import abcjs from 'abcjs';

// Types
interface SynthLike {
  stop: () => void;
  init: (opts: any) => Promise<void>;
  prime: () => Promise<void>;
  start: () => Promise<void>;
}

type PlaybackListener = (state: PlaybackState) => void;
type GenerateListener = () => void;

export interface PlaybackState {
  isPlaying: boolean;
  canPlay: boolean;
}

export interface MusicData {
  visualObj: unknown;
  tempo: number;
  meterNum: number;
  meterDen: number;
}

// ============================================
// Singleton state & core functions
// ============================================

let audioCtx: AudioContext | null = null;
let synth: SynthLike | null = null;
let currentMusic: MusicData | null = null;
let isPlaying = false;
const listeners = new Set<PlaybackListener>();
const generateListeners = new Set<GenerateListener>();

function notifyListeners() {
  const state: PlaybackState = { isPlaying, canPlay: currentMusic !== null };
  listeners.forEach(listener => listener(state));
}

function getState(): PlaybackState {
  return { isPlaying, canPlay: currentMusic !== null };
}

function subscribe(listener: PlaybackListener): () => void {
  listeners.add(listener);
  listener(getState());
  return () => listeners.delete(listener);
}

export function setMusic(music: MusicData | null): void {
  currentMusic = music;
  notifyListeners();
}

export async function play(): Promise<void> {
  if (!currentMusic || isPlaying) return;

  // Set playing immediately to prevent race condition from double-clicks
  isPlaying = true;
  notifyListeners();

  try {
    if (!audioCtx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AC();
    }

    if (audioCtx && audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    if (!synth) {
      synth = new (abcjs as any).synth.CreateSynth() as SynthLike;
    } else {
      try { synth.stop(); } catch { }
    }

    const { visualObj, tempo, meterNum, meterDen } = currentMusic;
    const quarterEquiv = (4 * meterNum) / meterDen;
    const msPerMeasure = Math.round((60000 / tempo) * quarterEquiv);

    await synth.init({
      visualObj,
      audioContext: audioCtx,
      millisecondsPerMeasure: msPerMeasure,
      options: {
        onEnded: () => {
          isPlaying = false;
          notifyListeners();
        }
      }
    });
    await synth.prime();
    await synth.start();
  } catch (err) {
    // Reset state on error
    isPlaying = false;
    notifyListeners();
    throw err;
  }
}

export function stop(): void {
  if (synth) {
    try { synth.stop(); } catch { }
  }
  isPlaying = false;
  notifyListeners();
}

export function requestGenerate(): void {
  generateListeners.forEach(listener => listener());
}

function onGenerateRequest(listener: GenerateListener): () => void {
  generateListeners.add(listener);
  return () => generateListeners.delete(listener);
}

// ============================================
// React Hooks
// ============================================

export interface UsePlaybackReturn extends PlaybackState {
  play: () => Promise<void>;
  stop: () => void;
  setMusic: (music: MusicData | null) => void;
  requestGenerate: () => void;
}

export function usePlayback(): UsePlaybackReturn {
  const [state, setState] = useState<PlaybackState>(getState);

  useEffect(() => subscribe(setState), []);

  return {
    ...state,
    play,
    stop,
    setMusic,
    requestGenerate,
  };
}

export function useGenerateListener(onGenerate: () => void): void {
  useEffect(() => onGenerateRequest(onGenerate), [onGenerate]);
}
