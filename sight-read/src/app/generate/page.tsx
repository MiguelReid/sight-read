'use client';

import { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';

const BARS_PER_LINE = 5;
const LINES = 5;
const TOTAL_BARS = BARS_PER_LINE * LINES;

type Duration = { token: string; units: number; weight: number };
type LHStyle = 'none' | 'drone' | 'halves' | 'quarters' | 'eighths' | 'simple-melodic' | 'melodic';

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

    // 6) Left-hand style by grade (bigger differences between grades)
    // - 1-2: no LH at all
    // - 3:   one sustained note per bar (drone)
    // - 4:   two notes per bar (halves)
    // - 5:   four notes per bar (quarters)
    // - 6:   eight notes per bar (eighths)
    // - 7:   simple melodic (no fastest subdivisions)
    // - 8:   full melodic/random in both hands
    let lhStyle: LHStyle = 'none';
    if (g <= 2) lhStyle = 'none';
    else if (g === 3) lhStyle = 'drone';
    else if (g === 4) lhStyle = 'halves';
    else if (g === 5) lhStyle = 'quarters';
    else if (g === 6) lhStyle = 'eighths';
    else if (g === 7) lhStyle = 'simple-melodic';
    else lhStyle = 'melodic';

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

function tokenFromUnits(units: number): string {
    return units === 1 ? '' : String(units);
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
            const segToken = tokenFromUnits(segUnits);
            const tokens: string[] = [];
            let used = 0;
            while (used < unitsPerBar) {
                // Vary notes slightly within the bar
                const n = notePool[Math.floor(Math.random() * notePool.length)];
                tokens.push(`${n}${segToken}`);
                used += segUnits;
                if (used + segUnits > unitsPerBar && used < unitsPerBar) {
                    // pad remainder with a final note
                    tokens.push(`${n}${tokenFromUnits(unitsPerBar - used)}`);
                    break;
                }
            }
            out.push(tokens.join(' '));
            continue;
        }

        // Melodic styles: use the durations plan, but for 'simple-melodic' avoid the fastest subdivision
        const durList = style === 'simple-melodic'
            ? durations.filter(d => d.units > 1) // drop 1-unit (sixteenth) when L:1/16
            : durations;

        let used = 0;
        const tokens: string[] = [];
        while (used < unitsPerBar) {
            const candidates = durList.filter(d => d.units <= unitsPerBar - used);
            const d = weightedPick(candidates.length ? candidates : durList);
            const n = notePool[Math.floor(Math.random() * notePool.length)];
            tokens.push(`${n}${d.token}`);
            used += d.units;
        }
        out.push(tokens.join(' '));
    }
    return out;
}

// Build ABC with two voices (RH treble, LH bass), 4 bars per line
function generateAbcForPreset(preset: Preset): string {
    const { bars, unitsPerBar, durations, notePoolRH, notePoolLH, key, noteLength, lhStyle } = preset;

    const rhBars = makeBars(notePoolRH, durations, unitsPerBar, bars);
    const includeLH = lhStyle !== 'none';
    const lhBars = includeLH ? makeLeftHandBars(lhStyle, notePoolLH, durations, unitsPerBar, bars) : [];

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
        'M:4/4',
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
    const [visualObj, setVisualObj] = useState<any | null>(null);

    // WebAudio synth refs
    const audioCtxRef = useRef<AudioContext | null>(null);
    const synthRef = useRef<any | null>(null);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Play/Stop controls
    const handlePlay = async () => {
        if (!visualObj || !lastPreset) return;

        // Lazily create AudioContext
        if (!audioCtxRef.current) {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AC();
        }

        // Create or re-init synth for this tune
        if (!synthRef.current) {
            synthRef.current = new (abcjs as any).synth.CreateSynth();
        } else {
            try { synthRef.current.stop(); } catch { }
        }

        // Match playback tempo to your overlay (no Q: in ABC)
        const msPerMeasure = Math.round((60000 / lastPreset.tempo) * 4); // 4/4

        await synthRef.current.init({
            visualObj,
            audioContext: audioCtxRef.current,
            millisecondsPerMeasure: msPerMeasure,
            options: {
                // pan: [-0.3, 0.3]
            }
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