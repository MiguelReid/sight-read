'use client';

import { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';

const BARS_PER_LINE = 5;
const LINES = 5;
const TOTAL_BARS = BARS_PER_LINE * LINES;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

type Duration = { token: string; units: number; weight: number };
type LHStyle = 'none' | 'drone' | 'halves' | 'quarters' | 'eighths';

type Preset = {
    grade: number;
    tempo: number;
    key: string;
    bars: number;
    noteLength: '1/8' | '1/16';
    unitsPerBar: number;
    durations: Duration[];
    notePoolRH: string[];
    notePoolLH: string[];
    lhStyle: LHStyle;
    meter: string;
    meterNum: number;
    meterDen: number;
    strongBeats: number[];
    secondaryBeats: number[]; 
};

type KeyDef = { label: string; acc: number }; // acc = number of sharps(+) or flats(-)

// 15 major + 15 minor (all standard key signatures)
const MAJOR_KEYS: KeyDef[] = [
    { label: 'C', acc: 0 },
    { label: 'G', acc: +1 },
    { label: 'D', acc: +2 },
    { label: 'A', acc: +3 },
    { label: 'E', acc: +4 },
    { label: 'B', acc: +5 },
    { label: 'F#', acc: +6 },
    { label: 'C#', acc: +7 },
    { label: 'F', acc: -1 },
    { label: 'Bb', acc: -2 },
    { label: 'Eb', acc: -3 },
    { label: 'Ab', acc: -4 },
    { label: 'Db', acc: -5 },
    { label: 'Gb', acc: -6 },
    { label: 'Cb', acc: -7 },
];
const MINOR_KEYS: KeyDef[] = [
    { label: 'Am', acc: 0 },
    { label: 'Em', acc: +1 },
    { label: 'Bm', acc: +2 },
    { label: 'F#m', acc: +3 },
    { label: 'C#m', acc: +4 },
    { label: 'G#m', acc: +5 },
    { label: 'D#m', acc: +6 },
    { label: 'A#m', acc: +7 },
    { label: 'Dm', acc: -1 },
    { label: 'Gm', acc: -2 },
    { label: 'Cm', acc: -3 },
    { label: 'Fm', acc: -4 },
    { label: 'Bbm', acc: -5 },
    { label: 'Ebm', acc: -6 },
    { label: 'Abm', acc: -7 },
];
const KEY_DEFS: KeyDef[] = [...MAJOR_KEYS, ...MINOR_KEYS];

const METER_OPTIONS = [
    { meter: '2/2',  num: 2, den: 2,  min: 2, weight: 2.2, strongBeats: [1], secondaryBeats: [] },
    { meter: '2/4',  num: 2, den: 4,  min: 1, weight: 3.5, strongBeats: [1], secondaryBeats: [] },
    { meter: '3/2',  num: 3, den: 2,  min: 4, weight: 1.4, strongBeats: [1], secondaryBeats: [3] },
    { meter: '3/4',  num: 3, den: 4,  min: 1, weight: 3.2, strongBeats: [1], secondaryBeats: [3] },
    { meter: '3/8',  num: 3, den: 8,  min: 3, weight: 1.6, strongBeats: [1], secondaryBeats: [3] },
    { meter: '4/2',  num: 4, den: 2,  min: 5, weight: 1.0, strongBeats: [1], secondaryBeats: [3] },
    { meter: '4/4',  num: 4, den: 4,  min: 1, weight: 5.0, strongBeats: [1], secondaryBeats: [3] },
    { meter: '4/8',  num: 4, den: 8,  min: 3, weight: 1.3, strongBeats: [1], secondaryBeats: [3] },
    { meter: '6/4',  num: 6, den: 4,  min: 5, weight: 1.1, strongBeats: [1], secondaryBeats: [4] },
    { meter: '6/8',  num: 6, den: 8,  min: 3, weight: 2.4, strongBeats: [1], secondaryBeats: [4] },
    { meter: '9/8',  num: 9, den: 8,  min: 6, weight: 1.2, strongBeats: [1], secondaryBeats: [4,7] },
    { meter: '12/8', num: 12, den: 8, min: 7, weight: 1.0, strongBeats: [1], secondaryBeats: [4,7,10] },
    // Either 3+2 or 2+3
    { meter: '5/4',  num: 5, den: 4,  min: 7, weight: 0.9, strongBeats: [1], secondaryBeats: [4] },
    { meter: '7/8',  num: 7, den: 8,  min: 8, weight: 0.8, strongBeats: [1], secondaryBeats: [3,5] }, // common 2+2+3 pattern
];

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
// Removed unused randInt helper to keep things lean.
// const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

function pickWeightedRandom<T>(items: T[], getWeight: (t: T) => number): T {
    const weights = items.map(getWeight);
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
    }
    return items[items.length - 1];
}

// Prefer simpler keys at low grades + bias toward complex keys at high grades.
function pickKeyForGrade(grade: number): KeyDef {
    const g01 = (clamp(grade, 1, 8) - 1) / 7; // 0..1
    return pickWeightedRandom(KEY_DEFS, (k) => {
        const accAbs = Math.abs(k.acc) / 7;           // 0..1
        const soft = 1 / (1 + accAbs * 7);            // favors 0 accidentals
        const hard = 0.4 + accAbs;                    // favors many accidentals
        const weight = (1 - g01) * soft + g01 * hard; // blend by grade
        return weight + 0.01; // ensure non-zero
    });
}

function pickMeterForGrade(grade: number): { meter: string; num: number; den: number; strongBeats: number[]; secondaryBeats: number[] } {
    const g = clamp(grade, 1, 8);
    const avail = METER_OPTIONS.filter(m => g >= m.min);
    // Slightly boost weight the further above its min grade we are (keeps variety later)
    const choice = pickWeightedRandom(avail, m => m.weight * (1 + 0.15 * Math.max(0, g - m.min)));
    return { meter: choice.meter, num: choice.num, den: choice.den, strongBeats: choice.strongBeats, secondaryBeats: choice.secondaryBeats };
}

// Grade → tempo range; we’ll randomize inside and adjust for key complexity
function tempoRangeForGrade(grade: number): [number, number] {
    switch (clamp(grade, 1, 8)) {
        case 1: return [60, 72];
        case 2: return [60, 84];
        case 3: return [60, 96];
        case 4: return [70, 110];
        case 5: return [70, 120];
        case 6: return [80, 132];
        case 7: return [80, 144];
        case 8: return [80, 160];
        default: return [72, 100];
    }
}

/*
ABC pitch cheatsheet:
- c = middle C, C = octave below c; c' = octave above; commas lower, apostrophes raise (e.g., C,, two below).
- Accidentals in K: use key names like F#, Bb, C#m, etc. For notes: ^c (sharp), _c (flat), =c (natural).
- Durations from L: base: if L:1/8 → bare note = eighth, 2 = quarter, / = sixteenth; if L:1/16 → bare = sixteenth, 2 = eighth, 4 = quarter.
*/

type DurationPlan = {
    noteLength: '1/8' | '1/16';
    durations: Duration[];
};

function planDurations(effComplexity: number): DurationPlan {
    if (effComplexity < 0.55) {
        const t = Math.max(0, Math.min(1, effComplexity / 0.55)); // 0..1
        // At t=0 → 70% eighths / 30% quarters; at t=1 → 55% / 45%.
        const eighthW = 0.60 - 0.15 * t;
        const quarterW = 0.40 + 0.15 * t;
        return {
            noteLength: '1/8',
            durations: [
                { token: '', units: 1, weight: eighthW },
                { token: '2', units: 2, weight: quarterW },
            ],
        };
    }

    const t = Math.max(0, Math.min(1, (effComplexity - 0.55) / 0.45));
    const sixteenthW = 0.10;
    const eighthW = 0.50 - 0.10 * t;
    const quarterW = 0.40; + 0.10 * t;
    return {
        noteLength: '1/16',
        durations: [
            { token: '', units: 1, weight: sixteenthW },
            { token: '2', units: 2, weight: eighthW },
            { token: '4', units: 4, weight: quarterW },
        ],
    };
}

function getPreset(grade: number): Preset {
    const g = clamp(grade, 1, 8);
    const keyDef = pickKeyForGrade(g);
    const key = keyDef.label;
    const keyHardness = Math.abs(keyDef.acc) / 7;

    const baseComplexity = (g - 1) / 7;
    const effComplexity = clamp(baseComplexity - 0.35 * keyHardness + rand(-0.05, 0.05), 0, 1);

    const [tMin, tMax] = tempoRangeForGrade(g);
    const tempoScale = 1 - 0.15 * keyHardness;
    const tempo = Math.round(rand(Math.round(tMin * tempoScale), Math.round(tMax * tempoScale)));

    // 1) Pick meter first
    const meterOpt = pickMeterForGrade(g);
    const { meter, num: meterNum, den: meterDen, strongBeats, secondaryBeats } = meterOpt;

    // 2) Rhythmic resolution
    const { noteLength, durations } = planDurations(effComplexity);
    const baseDen = noteLength === '1/8' ? 8 : 16;

    // Units per bar = (n/d) / (1/baseDen) = n * baseDen / d
    const unitsPerBar = meterNum * (baseDen / meterDen);

    // Simpler + fewer ledger-line extremes: only lightly expand upward/downward.
    // RH: stop expansion at e' (avoid piling on f' g' a' b').
    const notePoolRH: string[] = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
    if (effComplexity >= 0.4) notePoolRH.push("c'", "d'");
    if (effComplexity >= 0.55) notePoolRH.push("e'"); // cap highest at e'

    // LH: keep one octave below (comma) + natural octave. Drop double-commas entirely.
    const notePoolLH: string[] = ['C,', 'D,', 'E,', 'F,', 'G,', 'A,', 'B,'];
    if (effComplexity >= 0.35) notePoolLH.push('C', 'D', 'E', 'F', 'G', 'A', 'B');
    // Removed ultra-low expansion (C,, etc.) to avoid excessive ledger lines.

    let lhStyle: LHStyle = 'none';
    if (g <= 2) lhStyle = 'none';
    else if (g === 3) lhStyle = 'drone';
    else if (g === 4) lhStyle = 'halves';
    else if (g >= 5) lhStyle = 'quarters';

    return {
        grade: g,
        tempo,
        key,
        bars: TOTAL_BARS,
        noteLength,
        unitsPerBar,
        durations,
        notePoolRH,
        notePoolLH,
        lhStyle,
        meter,
        meterNum,
        meterDen,
        strongBeats: strongBeats,
        secondaryBeats: secondaryBeats,
    };
}

function noteAndDur(token: string): { note: string; dur: string } {
    const m = token.match(/^(\[[^\]]+\]|z|[A-Ga-g][,']*)([0-9/]*)$/);
    if (!m) return { note: token, dur: '' };
    return { note: m[1], dur: m[2] || '' };
}

function rebuild(note: string, dur: string) {
    return `${note}${dur}`;
}


// Replace a token in a bar at given token index
function replaceTokenInBar(bar: string, idx: number, newTok: string): string {
    const toks = bar.trim().split(/\s+/);
    toks[idx] = newTok;
    return toks.join(' ');
}

// Find first token beginning exactly at a strong beat (beat numbers 1-based)
function findTokenIndexAtBeat(bar: string, beatNumber: number, unitsPerBar: number, meterNum: number, beatUnit: number): number | null {
    const toks = bar.trim().split(/\s+/);
    let posUnits = 0;
    for (let i = 0; i < toks.length; i++) {
        if (posUnits === (beatNumber - 1) * beatUnit) return i;
        // advance
        const { dur } = noteAndDur(toks[i]);
        // duration units: if empty token = 1 unit
        const units = dur ? parseInt(dur, 10) : 1;
        posUnits += units;
    }
    return null;
}

function makeBars(notePool: string[], durations: Duration[], unitsPerBar: number, bars: number): string[] {
    const out: string[] = [];
    const minUnits = Math.min(...durations.map(d => d.units));
    const maxSmallRun = 3; // prevent overly long runs of the fastest value
    for (let b = 0; b < bars; b++) {
        let used = 0;
        let runSmall = 0;
        let hasNonSmall = false;
        const tokens: string[] = [];
        while (used < unitsPerBar) {
            const remaining = unitsPerBar - used;
            const candidates = durations.filter(d => d.units <= remaining);
            const pickList = candidates.length ? candidates : durations;
            const d = pickWeightedRandom(pickList, (x) => {
                let w = x.weight;
                // Penalize continuing a long run of the fastest unit
                if (x.units === minUnits && runSmall >= maxSmallRun) w *= 0.2;
                // Encourage placing at least one longer note per bar if we're running out of room
                const isNonSmall = x.units > minUnits;
                if (!hasNonSmall && remaining <= minUnits * 2 && isNonSmall && x.units <= remaining) w *= 3.0;
                return Math.max(w, 0.0001);
            });
            const note = notePool[Math.floor(Math.random() * notePool.length)];
            tokens.push(`${note}${d.token}`);
            used += d.units;
            if (d.units === minUnits) runSmall += 1; else { runSmall = 0; hasNonSmall = true; }
        }
        out.push(tokens.join(' '));
    }
    return out;
}

function tokenFromUnits(units: number): string {
    return units === 1 ? '' : String(units);
}

// --- Harmonic helpers ---
function parseKeyLabel(key: string): { tonicLetter: string; isMinor: boolean } {
    const isMinor = key.endsWith('m');
    const tonicLetter = key.replace('m', '')[0].toUpperCase();
    return { tonicLetter, isMinor };
}

function diatonicLettersFrom(tonicLetter: string): string[] {
    const idx = LETTERS.indexOf(tonicLetter.toUpperCase());
    const seq: string[] = [];
    for (let i = 0; i < 7; i++) seq.push(LETTERS[(idx + i) % 7]);
    return seq;
}

function diatonicExtension(keyLabel: string, degree: number): string {
    const { tonicLetter } = parseKeyLabel(keyLabel);
    const seq = diatonicLettersFrom(tonicLetter);
    const normalized = ((degree - 1) % 7 + 7) % 7;
    return seq[normalized];
}


// degree: 1..7 (I..VII). Returns triad letters [root, third, fifth]
function triadForDegree(degree: number, tonicLetter: string): [string, string, string] {
    const seq = diatonicLettersFrom(tonicLetter);
    const i = (degree - 1) % 7;
    return [seq[i], seq[(i + 2) % 7], seq[(i + 4) % 7]];
}

function pickNoteFromPoolByLetter(notePool: string[], letter: string, preferLower = false): string | null {
    const target = letter.toLowerCase();
    const candidates = notePool.filter(n => n[0].toLowerCase() === target);
    if (!candidates.length) return null;
    if (!preferLower) return candidates[Math.floor(Math.random() * candidates.length)];
    // Prefer lower by scoring commas/uppercase vs apostrophes
    const scored = candidates.map(n => ({
        n,
        score: (/[A-G],[,]*/.test(n) ? 3 : /[A-G]$/.test(n) ? 2 : /[a-g]$/.test(n) ? 1 : 0) - (/'/.test(n) ? 1 : 0)
    })).sort((a, b) => b.score - a.score);
    return scored[0].n;
}

function extractDurationToken(token: string): string {
    const m = token.match(/[0-9/]+$/);
    return m ? m[0] : '';
}

function buildChordToken(
    notePool: string[],
    letters: string[],
    durationToken: string,
    preferLower: boolean
): string {
    const notes: string[] = [];
    for (const L of letters) {
        const nn = pickNoteFromPoolByLetter(notePool, L, preferLower) || pickNoteFromPoolByLetter(notePool, L, false);
        if (nn) notes.push(nn);
    }
    const inside = notes.join(''); // no spaces inside chord per ABC
    return `[${inside}]${durationToken}`;
}

function makeLeftHandBars(
    style: LHStyle,
    notePool: string[],
    durations: Duration[],
    unitsPerBar: number,
    bars: number
): string[] {
    if (style === 'none') return [];

    const out: string[] = [];
    for (let b = 0; b < bars; b++) {
        // Pick a base note for this bar
        const note = notePool[Math.floor(Math.random() * notePool.length)];

        if (style === 'drone') {
            // One sustained note filling the bar
            out.push(`${note}${tokenFromUnits(unitsPerBar)}`);
            continue;
        }

        if (style === 'halves' || style === 'quarters' || style === 'eighths') {
            const divisions = style === 'halves' ? 2 : style === 'quarters' ? 4 : 8;
            const segUnits = Math.max(1, Math.floor(unitsPerBar / divisions));
            const tokens: string[] = [];
            let used = 0;
            while (used < unitsPerBar) {
                const n = notePool[Math.floor(Math.random() * notePool.length)];
                const remaining = unitsPerBar - used;
                const len = Math.min(segUnits, remaining);
                tokens.push(`${n}${tokenFromUnits(len)}`);
                used += len;
            }
            out.push(tokens.join(' '));
            continue;
        }
    }
    return out;
}

// Removed start policy to simplify starting tone handling.

function pickSpecificChordTone(letters: [string, string, string], which: 'root' | 'third' | 'fifth' | 'any'): string {
    if (which === 'any') return letters[Math.floor(Math.random() * letters.length)];
    if (which === 'root') return letters[0];
    if (which === 'third') return letters[1];
    return letters[2]; // 'fifth'
}

// Build ABC with two voices (RH treble, LH bass), 4 bars per line, with harmonic start/end enforcement
function generateAbcForPreset(preset: Preset): string {
    const { bars, unitsPerBar, durations, notePoolRH, notePoolLH, key, noteLength, lhStyle, meter } = preset;

    let rhBars = makeBars(notePoolRH, durations, unitsPerBar, bars);
    const includeLH = lhStyle !== 'none';
    let lhBars = includeLH ? makeLeftHandBars(lhStyle, notePoolLH, durations, unitsPerBar, bars) : [];

    // --- Harmonic rule: start/end on I/III/V tones (or chords) with musical voicings ---
    const { tonicLetter } = parseKeyLabel(key);

    // Degrees we allow at edges (prioritize I and V, then III)
    const allowedDegreesBase = [1, 5, 3];
    const startDegree = allowedDegreesBase[Math.floor(Math.random() * allowedDegreesBase.length)];
    const endDegree = allowedDegreesBase[Math.floor(Math.random() * allowedDegreesBase.length)];

    const startTriad = triadForDegree(startDegree, tonicLetter); // [root, third, fifth] as letters
    const endTriad = triadForDegree(endDegree, tonicLetter);

    const add7 = preset.grade >= 6;
    const add9 = preset.grade >= 8;
    const endExts: string[] = add7 ? [diatonicExtension(tonicLetter, endDegree + 6)] : [];
    if (add9) {
        endExts.push(diatonicExtension(tonicLetter, endDegree + 1));
    }

    // RH ending tone (cadential feel): prefer root or third; allow fifth occasionally
    const lastIdx = bars - 1;
    const rhLastTokens = rhBars[lastIdx].trim().split(/\s+/);
    const rhLastDur = extractDurationToken(rhLastTokens[rhLastTokens.length - 1]);
    const rhEndPref: ('root' | 'third' | 'fifth')[] = Math.random() < 0.7 ? ['root', 'third', 'fifth'] : ['root', 'fifth', 'third'];
    const rhEndLetter = pickSpecificChordTone(endTriad, rhEndPref[0]);
    const rhLastNote = pickNoteFromPoolByLetter(notePoolRH, rhEndLetter, false) || rhLastTokens[rhLastTokens.length - 1];
    rhLastTokens[rhLastTokens.length - 1] = `${rhLastNote}${rhLastDur}`;
    rhBars[lastIdx] = rhLastTokens.join(' ');

    // --- LEFT HAND: cadential last event (at high grades add 7/9 subtly)
    if (includeLH) {
        const lhLastTokens = lhBars[lastIdx].trim().split(/\s+/);
        const lhLastDur = extractDurationToken(lhLastTokens[lhLastTokens.length - 1]);

        // Prefer a fuller cadence than the start (unless very easy)
        let lastLetters: string[] = [];
        if (preset.grade <= 3) {
            lastLetters = [endTriad[0], endTriad[2]]; // root + fifth
        } else if (preset.grade <= 6) {
            lastLetters = [...endTriad]; // full triad
        } else {
            lastLetters = [...endTriad, ...endExts]; // triad + 7/9
        }

        lhLastTokens[lhLastTokens.length - 1] = buildChordToken(notePoolLH, lastLetters, lhLastDur, true);
        lhBars[lastIdx] = lhLastTokens.join(' ');
    }


    const systems: string[] = [];
    for (let i = 0; i < bars; i += BARS_PER_LINE) {
        const rhLine = rhBars.slice(i, i + BARS_PER_LINE).join(' | ') + (i + BARS_PER_LINE >= bars ? ' |]' : ' |');
        if (includeLH) {
            const lhLine = lhBars.slice(i, i + BARS_PER_LINE).join(' | ') + (i + BARS_PER_LINE >= bars ? ' |]' : ' |');
            systems.push(`[V:RH] ${rhLine}`, `[V:LH] ${lhLine}`);
        } else {
            systems.push(`[V:RH] ${rhLine}`);
        }
    }

    const header = [
        'X:1',
        `M:${meter}`,
        `L:${noteLength}`,
        `K:${key}`,
    ];

    if (includeLH) {
        header.push('%%staves {RH LH}', 'V:RH clef=treble', 'V:LH clef=bass');
    } else {
        header.push('V:RH clef=treble');
    }

    return [...header, ...systems].join('\n');
}

export default function Generate() {
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Audio + render state
    const [grade, setGrade] = useState<number>(1);
    const [abc, setAbc] = useState<string>(''); // keep empty during SSR
    const [lastPreset, setLastPreset] = useState<Preset | null>(null);
    const [visualObj, setVisualObj] = useState<unknown | null>(null);

    // WebAudio synth refs
    const audioCtxRef = useRef<AudioContext | null>(null);
    interface SynthLike { stop: () => void; init: (opts: any) => Promise<void>; prime: () => Promise<void>; start: () => Promise<void>; }
    const synthRef = useRef<SynthLike | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!containerRef.current || !abc) return;
        const width = containerRef.current.clientWidth || 680;
        const tunes = abcjs.renderAbc(containerRef.current, abc, {
            responsive: 'resize',
            staffwidth: width,
            scale: 1.35,
            add_classes: true,
        });
        setVisualObj(tunes?.[0] ?? null);
    }, [abc]);

    const handleGenerate = () => {
        // Stop any current audio before regenerating
        if (synthRef.current) {
            try { synthRef.current.stop(); } catch { }
            setIsPlaying(false);
        }
        const p = getPreset(grade);
        setLastPreset(p);
        setAbc(generateAbcForPreset(p)); // uses your BARS_PER_LINE & LINES constants
    };

    // Initial client-only generation
    useEffect(() => {
        handleGenerate();
    }, []);

    // Play/Stop controls
    const handlePlay = async () => {
        if (!visualObj || !lastPreset) return;
        if (!audioCtxRef.current) {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AC();
        }
        if (!synthRef.current) {
            synthRef.current = new (abcjs as any).synth.CreateSynth() as SynthLike;
        } else {
            try { synthRef.current.stop(); } catch { }
        }

        const quarterEquiv = (4 * lastPreset.meterNum) / lastPreset.meterDen;
        const msPerMeasure = Math.round((60000 / lastPreset.tempo) * quarterEquiv);

        await synthRef.current.init({
            visualObj,
            audioContext: audioCtxRef.current,
            millisecondsPerMeasure: msPerMeasure,
            options: {}
        });
        await synthRef.current.prime();
        await synthRef.current.start();
        setIsPlaying(true);
    };

    const handleStop = () => {
        if (synthRef.current) {
            try { synthRef.current.stop(); } catch { }
        }
        setIsPlaying(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            try { synthRef.current?.stop(); } catch { }
            audioCtxRef.current?.close?.();
        };
    }, []);

    return (
        <div style={{ padding: '2rem' }}>
            <div className="no-print" style={{ marginBottom: '1rem' }}>
                <h1 style={{ margin: 0 }}>Generate Sheet Music</h1>
                <p style={{ marginTop: 4 }}>Select a grade and click Generate New.</p>

                {/* Grade selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0.5rem 0 1rem' }}>
                    <label htmlFor="grade-select" style={{ fontWeight: 600 }}>Grade</label>
                    <select
                        id="grade-select"
                        value={grade}
                        onChange={(e) => setGrade(parseInt(e.target.value, 10))}
                        style={{
                            padding: '0.35rem 0.6rem',
                            borderRadius: 6,
                            border: '1px solid #ccc',
                            background: '#fff',
                            color: '#000'
                        }}
                        aria-label="Select difficulty grade"
                    >
                        {Array.from({ length: 8 }, (_, i) => i + 1).map((g) => (
                            <option key={g} value={g}>Grade {g}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '0.75rem', color: '#555' }}>
                    <span>Key: {lastPreset ? lastPreset.key : '—'}</span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={handleGenerate}
                        style={{
                            padding: '0.6rem 1rem',
                            background: '#1e90ff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer'
                        }}
                    >
                        Generate New
                    </button>
                    <button
                        onClick={handlePlay}
                        disabled={!abc || isPlaying}
                        style={{
                            padding: '0.6rem 1rem',
                            background: isPlaying ? '#8aaed8' : '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: isPlaying ? 'default' : 'pointer'
                        }}
                        title="Play"
                    >
                        Play
                    </button>
                    <button
                        onClick={handleStop}
                        disabled={!isPlaying}
                        style={{
                            padding: '0.6rem 1rem',
                            background: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: !isPlaying ? 'default' : 'pointer'
                        }}
                        title="Stop"
                    >
                        Stop
                    </button>
                </div>
            </div>

            <div className="a4-page">
                <div className="a4-content">
                    {/* Title and subtitle */}
                    <div className="score-title">
                        <div className="main">Sight Reading Practice</div>
                        <div className="sub">{lastPreset ? `Grade ${lastPreset.grade}` : `Grade ${grade}`}</div>
                    </div>

                    {/* Fixed overlays and score */}
                    <div className="score-wrap">
                        <div className="tempo-overlay">
                            {lastPreset ? `♩ = ${lastPreset.tempo}` : ''}
                        </div>
                        <div className="brand-overlay">SightRead</div>
                        <div ref={containerRef} className="score-surface" />
                    </div>
                </div>
            </div>
        </div>
    );
}