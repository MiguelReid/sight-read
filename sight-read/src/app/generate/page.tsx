'use client';

import { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';

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

function getPreset(grade: number): Preset {
  const g = Math.min(Math.max(grade, 1), 8);
  const keys = ['C', 'G', 'F', 'D', 'Bb', 'A', 'E', 'B'];
  const key = keys[g - 1];

  // Right hand: middle and above
  let notePoolRH: string[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  if (g >= 3) notePoolRH.push('c', 'd', 'e');
  if (g >= 5) notePoolRH.push('f', 'g', 'a', 'b');
  if (g >= 7) notePoolRH.push("c'", "d'");

  // Left hand: lower register
  let notePoolLH: string[] = ['C,', 'D,', 'E,', 'F,', 'G,', 'A,', 'B,'];
  if (g >= 3) notePoolLH.push('C', 'D', 'E', 'F', 'G', 'A', 'B');
  if (g >= 7) notePoolLH.push('C,,', 'D,,', 'E,,', 'F,,', 'G,,');

  const tempo = 60 + g * 12;
  const useSixteenths = g >= 5;
  const noteLength: Preset['noteLength'] = useSixteenths ? '1/16' : '1/8';
  const unitsPerBar = useSixteenths ? 16 : 8;

  const durations: Duration[] = useSixteenths
    ? [
        { token: '4', units: 4, weight: 2 }, // quarter
        { token: '2', units: 2, weight: 4 }, // eighth
        { token: '', units: 1, weight: 3 },  // sixteenth
      ]
    : [
        { token: '2', units: 2, weight: 3 }, // quarter
        { token: '', units: 1, weight: 5 },  // eighth
      ];

  return {
    grade: g,
    tempo,
    key,
    bars: 16,
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
    `T:Grade ${grade} Practice`,
    'M:4/4',
    `L:${noteLength}`,
    `Q:1/4=${tempo}`,
    `K:${key}`,
    '%%staves {LH RH}',   // brace and align the two staves
    'V:RH clef=treble',
    'V:LH clef=bass',
    ...systems
  ].join('\n');
}

export default function Generate() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [grade, setGrade] = useState<number>(1);
  const [abc, setAbc] = useState<string>(generateAbcForPreset(getPreset(1)));

  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 680;
    abcjs.renderAbc(containerRef.current, abc, {
      responsive: 'resize',
      staffwidth: width,
      scale: 1.35,
      add_classes: true,
    });
  }, [abc]);

  const handleGenerate = () => {
    const p = getPreset(grade);
    setAbc(generateAbcForPreset(p, 4));
  };

  const p = getPreset(grade);

  return (
    <div style={{ padding: '2rem' }}>
      <div className="no-print" style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Generate Sheet Music</h1>
        <p style={{ marginTop: 4 }}>Select a grade and click Generate New.</p>

        {/* Compact grade selector (combobox) */}
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
          Key: {p.key} | Tempo: {p.tempo} bpm | Note length: {p.noteLength} | Bars: {p.bars}
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
          <div ref={containerRef} />
        </div>
      </div>
    </div>
  );
}