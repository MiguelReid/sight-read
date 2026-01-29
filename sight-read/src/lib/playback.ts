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
type BpmListener = (bpm: number) => void;
type MetronomeListener = (state: MetronomeState) => void;

export type MetronomeBeatState = 'normal' | 'mute' | 'accent';

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

export interface MetronomeState {
  enabled: boolean;
  pattern: MetronomeBeatState[];
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
let currentBpm = 72;
let generatedBpm = 72; // Store the original generated tempo
let metronomeEnabled = false;
let metronomePattern: MetronomeBeatState[] = Array.from({ length: 4 }, () => 'normal');
let metronomeMeterNum = 4;
let metronomeMeterDen = 4;
let metronomeTimer: ReturnType<typeof setInterval> | null = null;
let metronomeBeatIndex = 0;
const listeners = new Set<PlaybackListener>();
const generateListeners = new Set<GenerateListener>();
const bpmListeners = new Set<BpmListener>();
const metronomeListeners = new Set<MetronomeListener>();

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

function notifyBpmListeners() {
  bpmListeners.forEach(listener => listener(currentBpm));
}

function subscribeBpm(listener: BpmListener): () => void {
  bpmListeners.add(listener);
  listener(currentBpm);
  return () => bpmListeners.delete(listener);
}

function notifyMetronomeListeners() {
  const state: MetronomeState = {
    enabled: metronomeEnabled,
    pattern: [...metronomePattern],
    meterNum: metronomeMeterNum,
    meterDen: metronomeMeterDen,
  };
  metronomeListeners.forEach(listener => listener(state));
}

function getMetronomeState(): MetronomeState {
  return {
    enabled: metronomeEnabled,
    pattern: [...metronomePattern],
    meterNum: metronomeMeterNum,
    meterDen: metronomeMeterDen,
  };
}

function subscribeMetronome(listener: MetronomeListener): () => void {
  metronomeListeners.add(listener);
  listener(getMetronomeState());
  return () => metronomeListeners.delete(listener);
}

export function getBpm(): number {
  return currentBpm;
}

export function setBpm(bpm: number): void {
  currentBpm = Math.max(40, Math.min(240, bpm));
  notifyBpmListeners();
  updateMetronomeTimer();
}

export function resetBpm(): void {
  currentBpm = generatedBpm;
  notifyBpmListeners();
  updateMetronomeTimer();
}

export function setMusic(music: MusicData | null): void {
  currentMusic = music;
  if (music) {
    generatedBpm = music.tempo;
    currentBpm = music.tempo;
    metronomeMeterNum = music.meterNum;
    metronomeMeterDen = music.meterDen;
    if (metronomeEnabled) {
      resetMetronomePattern();
    } else if (metronomePattern.length !== metronomeMeterNum) {
      metronomePattern = Array.from({ length: metronomeMeterNum }, () => 'normal');
      metronomeBeatIndex = 0;
    }
    notifyBpmListeners();
    notifyMetronomeListeners();
    updateMetronomeTimer();
  }
  notifyListeners();
}

function getMetronomeBeatIntervalMs(): number {
  const meterNum = metronomeMeterNum || 4;
  const meterDen = metronomeMeterDen || 4;
  const quarterEquiv = (4 * meterNum) / meterDen;
  const msPerMeasure = Math.round((60000 / currentBpm) * quarterEquiv);
  return Math.max(120, Math.round(msPerMeasure / meterNum));
}

function playMetronomeClick(state: MetronomeBeatState) {
  if (state === 'mute') return;
  if (!audioCtx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AC();
  }
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;
  osc.frequency.value = state === 'accent' ? 1100 : 750;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

function stopMetronomeTimer() {
  if (metronomeTimer) {
    clearInterval(metronomeTimer);
    metronomeTimer = null;
  }
}

function startMetronomeTimer() {
  stopMetronomeTimer();
  metronomeBeatIndex = 0;
  const intervalMs = getMetronomeBeatIntervalMs();
  const tick = () => {
    if (!metronomeEnabled) return;
    const pattern = metronomePattern.length ? metronomePattern : ['normal'] as MetronomeBeatState[];
    const beatState: MetronomeBeatState = pattern[metronomeBeatIndex % pattern.length] ?? 'normal';
    playMetronomeClick(beatState);
    metronomeBeatIndex = (metronomeBeatIndex + 1) % pattern.length;
  };
  tick();
  metronomeTimer = setInterval(tick, intervalMs);
}

function updateMetronomeTimer() {
  if (!metronomeEnabled) return;
  startMetronomeTimer();
}

export function setMetronomeEnabled(enabled: boolean): void {
  metronomeEnabled = enabled;
  if (metronomeEnabled) {
    if (metronomePattern.length !== metronomeMeterNum) {
      resetMetronomePattern();
    }
    startMetronomeTimer();
  } else {
    stopMetronomeTimer();
  }
  notifyMetronomeListeners();
}

export function resetMetronomePattern(): void {
  metronomePattern = Array.from({ length: metronomeMeterNum }, () => 'normal');
  metronomeBeatIndex = 0;
  notifyMetronomeListeners();
}

export function setMetronomeBeat(index: number, state: MetronomeBeatState): void {
  if (index < 0 || index >= metronomePattern.length) return;
  metronomePattern = metronomePattern.map((beat, idx) => (idx === index ? state : beat));
  notifyMetronomeListeners();
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

    const { visualObj, meterNum, meterDen } = currentMusic;
    const quarterEquiv = (4 * meterNum) / meterDen;
    const msPerMeasure = Math.round((60000 / currentBpm) * quarterEquiv);

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

    // Start metronome after music starts to stay in sync
    if (metronomeEnabled) {
      startMetronomeTimer();
    }
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
  bpm: number;
  setBpm: (bpm: number) => void;
  resetBpm: () => void;
  metronomeEnabled: boolean;
  metronomePattern: MetronomeBeatState[];
  meterNum: number;
  meterDen: number;
  setMetronomeEnabled: (enabled: boolean) => void;
  resetMetronomePattern: () => void;
  setMetronomeBeat: (index: number, state: MetronomeBeatState) => void;
}

export function usePlayback(): UsePlaybackReturn {
  const [state, setState] = useState<PlaybackState>(getState);
  const [bpm, setBpmState] = useState<number>(getBpm);
  const [metronomeState, setMetronomeState] = useState<MetronomeState>(getMetronomeState);

  useEffect(() => subscribe(setState), []);
  useEffect(() => subscribeBpm(setBpmState), []);
  useEffect(() => subscribeMetronome(setMetronomeState), []);

  return {
    ...state,
    play,
    stop,
    setMusic,
    requestGenerate,
    bpm,
    setBpm,
    resetBpm,
    metronomeEnabled: metronomeState.enabled,
    metronomePattern: metronomeState.pattern,
    meterNum: metronomeState.meterNum,
    meterDen: metronomeState.meterDen,
    setMetronomeEnabled,
    resetMetronomePattern,
    setMetronomeBeat,
  };
}

export function useGenerateListener(onGenerate: () => void): void {
  useEffect(() => onGenerateRequest(onGenerate), [onGenerate]);
}
