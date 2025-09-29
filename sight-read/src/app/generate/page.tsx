'use client';

import { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';

const BARS_PER_LINE = 5;
const LINES = 5;
const TOTAL_BARS = BARS_PER_LINE * LINES;

type Duration = { token: string; units: number; weight: number };
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

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

function pickWeighted<T>(items: T[], getWeight: (t: T) => number): T {
    const weights = items.map(getWeight);
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
    }
    return items[items.length - 1];
}

// Prefer simpler keys at low grades; allow all keys; bias toward complex keys at high grades.
function pickKeyForGrade(grade: number): KeyDef {
    const g01 = (clamp(grade, 1, 8) - 1) / 7; // 0..1
    return pickWeighted(KEY_DEFS, (k) => {
        const accAbs = Math.abs(k.acc) / 7;           // 0..1
        const soft = 1 / (1 + accAbs * 7);            // favors 0 accidentals
        const hard = 0.4 + accAbs;                    // favors many accidentals
        const weight = (1 - g01) * soft + g01 * hard; // blend by grade
        return weight + 0.01; // ensure non-zero
    });
}

// Grade → tempo range; we’ll randomize inside and adjust for key complexity
function tempoRangeForGrade(grade: number): [number, number] {
    switch (clamp(grade, 1, 8)) {
        case 1: return [60, 72];
        case 2: return [66, 84];
        case 3: return [72, 96];
        case 4: return [80, 110];
        case 5: return [88, 120];
        case 6: return [96, 132];
        case 7: return [104, 144];
        case 8: return [112, 160];
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
    unitsPerBar: number;
};

function planDurations(effComplexity: number): DurationPlan {
    // If complexity is high, allow sixteenths (use L:1/16). Else stick to L:1/8.
    if (effComplexity >= 0.55) {
        // L:1/16 → units per bar = 16
        const sixteenthWeight = 2 + (effComplexity - 0.55) * 8; // 2..~6
        const eighthWeight = 3 + (effComplexity - 0.55) * 4;    // 3..~5
        const quarterWeight = 2 + (1 - effComplexity) * 4;      // 2..~4
        return {
            noteLength: '1/16',
            unitsPerBar: 16,
            durations: [
                { token: '', units: 1, weight: sixteenthWeight }, // 1/16
                { token: '2', units: 2, weight: eighthWeight },   // 1/8
                { token: '4', units: 4, weight: quarterWeight },  // 1/4
            ],
        };
    } else {
        // L:1/8 → units per bar = 8
        const eighthWeight = 5 - effComplexity * 2;  // ~5..4
        const quarterWeight = 3 + (1 - effComplexity) * 2; // ~5..3
        return {
            noteLength: '1/8',
            unitsPerBar: 8,
            durations: [
                { token: '', units: 1, weight: eighthWeight },   // 1/8
                { token: '2', units: 2, weight: quarterWeight }, // 1/4
            ],
        };
    }
}

function getPreset(grade: number): Preset {
    const g = clamp(grade, 1, 8);
    // 1) Pick a key for this grade (any major/minor), weighted by grade.
    const keyDef = pickKeyForGrade(g);
    const key = keyDef.label;
    const keyHardness = Math.abs(keyDef.acc) / 7; // 0..1

    // 2) Base musical complexity from grade, then adjust down if key is hard.
    const baseComplexity = (g - 1) / 7; // 0..1
    const effComplexity = clamp(baseComplexity - 0.35 * keyHardness + rand(-0.05, 0.05), 0, 1);

    // 3) Tempo: pick within the grade band, then reduce slightly for harder keys.
    let [tMin, tMax] = tempoRangeForGrade(g);
    const tempoScale = 1 - 0.15 * keyHardness; // up to -15% at 7 accidentals
    const tempo = Math.round(rand(Math.round(tMin * tempoScale), Math.round(tMax * tempoScale)));

    // 4) Rhythmic plan (note length and durations) based on effective complexity.
    const { noteLength, unitsPerBar, durations } = planDurations(effComplexity);

    // 5) Pitch ranges for both hands.
    // Right hand: around and above middle C (lowercase >= middle C)
    let notePoolRH: string[] = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
    if (effComplexity >= 0.4) notePoolRH.push("c'", "d'", "e'");
    if (effComplexity >= 0.7) notePoolRH.push("f'", "g'", "a'", "b'");

    // Left hand: below middle C (uppercase and commas)
    let notePoolLH: string[] = ['C,', 'D,', 'E,', 'F,', 'G,', 'A,', 'B,'];
    if (effComplexity >= 0.35) notePoolLH.push('C', 'D', 'E', 'F', 'G', 'A', 'B');
    if (effComplexity >= 0.75) notePoolLH.push('C,,', 'D,,', 'E,,', 'F,,', 'G,,');

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
    };
}

function weightedPick<T extends { weight: number }>(items: T[]): T {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const it of items) {
        r -= it.weight;
        if (r <= 0) return it;
    }
    return items[items.length - 1];
}

function makeBars(notePool: string[], durations: Duration[], unitsPerBar: number, bars: number): string[] {
    const out: string[] = [];
    for (let b = 0; b < bars; b++) {
        let used = 0;
        const tokens: string[] = [];
        while (used < unitsPerBar) {
            const candidates = durations.filter(d => d.units <= unitsPerBar - used);
            const d = weightedPick(candidates.length ? candidates : durations);
            const note = notePool[Math.floor(Math.random() * notePool.length)];
            tokens.push(`${note}${d.token}`);
            used += d.units;
        }
        out.push(tokens.join(' '));
    }
    return out;
}

// Build ABC with two voices (RH treble, LH bass), 4 bars per line
function generateAbcForPreset(preset: Preset, barsPerLine = 4): string {
    const { bars, unitsPerBar, durations, notePoolRH, notePoolLH, key, tempo, noteLength, grade } = preset;

    const rhBars = makeBars(notePoolRH, durations, unitsPerBar, bars);
    const lhBars = makeBars(notePoolLH, durations, unitsPerBar, bars);

    const systems: string[] = [];
    for (let i = 0; i < bars; i += barsPerLine) {
        const rhLine = rhBars.slice(i, i + barsPerLine).join(' | ') + (i + barsPerLine >= bars ? ' |]' : ' |');
        const lhLine = lhBars.slice(i, i + barsPerLine).join(' | ') + (i + barsPerLine >= bars ? ' |]' : ' |');
        systems.push(`[V:RH] ${rhLine}`, `[V:LH] ${lhLine}`);
    }

    return [
        'X:1',
        'M:4/4',
        `L:${noteLength}`,
        `K:${key}`,
        '%%staves {RH LH}', // brace for both clefs
        'V:RH clef=treble',
        'V:LH clef=bass',
        ...systems
    ].join('\n');
}

export default function Generate() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [grade, setGrade] = useState<number>(1);

    // Generate AFTER mount to avoid SSR/client mismatch
    const [abc, setAbc] = useState<string>('');                 // start empty on server
    const [lastPreset, setLastPreset] = useState<Preset | null>(null);

    useEffect(() => {
        if (!containerRef.current || !abc) return;
        const width = containerRef.current.clientWidth || 680;
        abcjs.renderAbc(containerRef.current, abc, {
            responsive: 'resize',
            staffwidth: width,
            scale: 1.35,
            add_classes: true,
        });
    }, [abc]);

    const handleGenerate = () => {
        const p = getPreset(grade); // randomize only here
        setLastPreset(p);
        setAbc(generateAbcForPreset(p, BARS_PER_LINE));
    };

    // Generate initial score on client after mount
    useEffect(() => {
        handleGenerate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

                <div style={{ marginBottom: '0.75rem', color: '#555' }}>
                    Key: {lastPreset ? lastPreset.key : '—'}
                    {' | '}
                    Tempo: {lastPreset ? lastPreset.tempo : '—'} bpm
                    {' | '}
                    Note length: {lastPreset ? lastPreset.noteLength : '—'}
                    {' | '}
                    Bars: {lastPreset ? lastPreset.bars : '—'}
                </div>

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