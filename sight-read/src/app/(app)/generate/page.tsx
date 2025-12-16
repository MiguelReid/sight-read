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
	{ meter: '2/2', num: 2, den: 2, min: 2, weight: 2.2, strongBeats: [1], secondaryBeats: [] },
	{ meter: '2/4', num: 2, den: 4, min: 1, weight: 3.5, strongBeats: [1], secondaryBeats: [] },
	{ meter: '3/2', num: 3, den: 2, min: 4, weight: 1.4, strongBeats: [1], secondaryBeats: [3] },
	{ meter: '3/4', num: 3, den: 4, min: 1, weight: 3.2, strongBeats: [1], secondaryBeats: [3] },
	{ meter: '3/8', num: 3, den: 8, min: 3, weight: 1.6, strongBeats: [1], secondaryBeats: [3] },
	{ meter: '4/2', num: 4, den: 2, min: 5, weight: 1.0, strongBeats: [1], secondaryBeats: [3] },
	{ meter: '4/4', num: 4, den: 4, min: 1, weight: 5.0, strongBeats: [1], secondaryBeats: [3] },
	{ meter: '4/8', num: 4, den: 8, min: 3, weight: 1.3, strongBeats: [1], secondaryBeats: [3] },
	{ meter: '6/4', num: 6, den: 4, min: 5, weight: 1.1, strongBeats: [1], secondaryBeats: [4] },
	{ meter: '6/8', num: 6, den: 8, min: 3, weight: 2.4, strongBeats: [1], secondaryBeats: [4] },
	{ meter: '9/8', num: 9, den: 8, min: 6, weight: 1.2, strongBeats: [1], secondaryBeats: [4, 7] },
	{ meter: '12/8', num: 12, den: 8, min: 7, weight: 1.0, strongBeats: [1], secondaryBeats: [4, 7, 10] },
	{ meter: '5/4', num: 5, den: 4, min: 7, weight: 0.9, strongBeats: [1], secondaryBeats: [4] },
	{ meter: '7/8', num: 7, den: 8, min: 8, weight: 0.8, strongBeats: [1], secondaryBeats: [3, 5] },
];

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

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
	const choice = pickWeightedRandom(avail, m => m.weight * (1 + 0.15 * Math.max(0, g - m.min)));
	return { meter: choice.meter, num: choice.num, den: choice.den, strongBeats: choice.strongBeats, secondaryBeats: choice.secondaryBeats };
}

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

type DurationPlan = {
	noteLength: '1/8' | '1/16';
	durations: Duration[];
};

function planDurations(effComplexity: number): DurationPlan {
	if (effComplexity < 0.55) {
		const t = Math.max(0, Math.min(1, effComplexity / 0.55));
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

	const meterOpt = pickMeterForGrade(g);
	const { meter, num: meterNum, den: meterDen, strongBeats, secondaryBeats } = meterOpt;

	const { noteLength, durations } = planDurations(effComplexity);
	const baseDen = noteLength === '1/8' ? 8 : 16;

	const unitsPerBar = meterNum * (baseDen / meterDen);

	const notePoolRH: string[] = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
	if (effComplexity >= 0.4) notePoolRH.push("c'", "d'");
	if (effComplexity >= 0.55) notePoolRH.push("e'");

	const notePoolLH: string[] = ['C,', 'D,', 'E,', 'F,', 'G,', 'A,', 'B,'];
	if (effComplexity >= 0.35) notePoolLH.push('C', 'D', 'E', 'F', 'G', 'A', 'B');

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

function makeBars(notePool: string[], durations: Duration[], unitsPerBar: number, bars: number): string[] {
	const out: string[] = [];
	const minUnits = Math.min(...durations.map(d => d.units));
	const maxSmallRun = 3;
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
				if (x.units === minUnits && runSmall >= maxSmallRun) w *= 0.2;
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
	const inside = notes.join('');
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
		const note = notePool[Math.floor(Math.random() * notePool.length)];

		if (style === 'drone') {
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

function pickSpecificChordTone(letters: [string, string, string], which: 'root' | 'third' | 'fifth' | 'any'): string {
	if (which === 'any') return letters[Math.floor(Math.random() * letters.length)];
	if (which === 'root') return letters[0];
	if (which === 'third') return letters[1];
	return letters[2];
}

function generateAbcForPreset(preset: Preset): string {
	const { bars, unitsPerBar, durations, notePoolRH, notePoolLH, key, noteLength, lhStyle, meter } = preset;

	const rhBars = makeBars(notePoolRH, durations, unitsPerBar, bars);
	const includeLH = lhStyle !== 'none';
	const lhBars = includeLH ? makeLeftHandBars(lhStyle, notePoolLH, durations, unitsPerBar, bars) : [];

	const { tonicLetter } = parseKeyLabel(key);

	const allowedDegreesBase = [1, 5, 3];
	const startDegree = allowedDegreesBase[Math.floor(Math.random() * allowedDegreesBase.length)];
	const endDegree = allowedDegreesBase[Math.floor(Math.random() * allowedDegreesBase.length)];

	const startTriad = triadForDegree(startDegree, tonicLetter);
	const endTriad = triadForDegree(endDegree, tonicLetter);

	const add7 = preset.grade >= 6;
	const add9 = preset.grade >= 8;
	const endExts: string[] = add7 ? [diatonicExtension(tonicLetter, endDegree + 6)] : [];
	if (add9) {
		endExts.push(diatonicExtension(tonicLetter, endDegree + 1));
	}

	const lastIdx = bars - 1;
	const rhLastTokens = rhBars[lastIdx].trim().split(/\s+/);
	const rhLastDur = extractDurationToken(rhLastTokens[rhLastTokens.length - 1]);
	const rhEndPref: ('root' | 'third' | 'fifth')[] = Math.random() < 0.7 ? ['root', 'third', 'fifth'] : ['root', 'fifth', 'third'];
	const rhEndLetter = pickSpecificChordTone(endTriad, rhEndPref[0]);
	const rhLastNote = pickNoteFromPoolByLetter(notePoolRH, rhEndLetter, false) || rhLastTokens[rhLastTokens.length - 1];
	rhLastTokens[rhLastTokens.length - 1] = `${rhLastNote}${rhLastDur}`;
	rhBars[lastIdx] = rhLastTokens.join(' ');

	if (includeLH) {
		const lhLastTokens = lhBars[lastIdx].trim().split(/\s+/);
		const lhLastDur = extractDurationToken(lhLastTokens[lhLastTokens.length - 1]);

		let lastLetters: string[] = [];
		if (preset.grade <= 3) {
			lastLetters = [endTriad[0], endTriad[2]];
		} else if (preset.grade <= 6) {
			lastLetters = [...endTriad];
		} else {
			lastLetters = [...endTriad, ...endExts];
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

	const [grade, setGrade] = useState<number>(1);
	const [abc, setAbc] = useState<string>('');
	const [lastPreset, setLastPreset] = useState<Preset | null>(null);
	const [visualObj, setVisualObj] = useState<unknown | null>(null);

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
		if (synthRef.current) {
			try { synthRef.current.stop(); } catch { }
			setIsPlaying(false);
		}
		const p = getPreset(grade);
		setLastPreset(p);
		setAbc(generateAbcForPreset(p));
	};

	useEffect(() => {
		handleGenerate();
	}, []);

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

	useEffect(() => {
		return () => {
			try { synthRef.current?.stop(); } catch { }
			audioCtxRef.current?.close?.();
		};
	}, []);

	return (
		<div className="p-4 md:p-8 grid grid-cols-[200px_1fr] md:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr] gap-4 md:gap-8 items-start">
			<div className="no-print flex flex-col gap-6">
				<div>
					<h3 className="text-2xl font-bold m-0">Generate Sheet Music</h3>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="grade-select" className="font-semibold">Grade</label>
					<select
						id="grade-select"
						value={grade}
						onChange={(e) => setGrade(parseInt(e.target.value, 10))}
						className="p-2 rounded border border-gray-300 bg-white text-black"
						aria-label="Select difficulty grade"
					>
						{Array.from({ length: 8 }, (_, i) => i + 1).map((g) => (
							<option key={g} value={g}>Grade {g}</option>
						))}
					</select>
				</div>

				<div className="text-gray-600">
					<span>Key: {lastPreset ? lastPreset.key : '—'}</span>
				</div>

				<div className="flex flex-col gap-3">
					<button
						onClick={handleGenerate}
						className="px-4 py-2.5 bg-blue-500 text-white border-none rounded-md cursor-pointer hover:bg-blue-600 transition-colors"
					>
						Generate New
					</button>
					<div className="grid grid-cols-2 gap-3">
						<button
							onClick={handlePlay}
							disabled={!abc || isPlaying}
							className={`px-4 py-2.5 text-white border-none rounded-md transition-colors ${
								isPlaying ? 'bg-blue-300 cursor-default' : 'bg-green-600 cursor-pointer hover:bg-green-700'
							}`}
							title="Play"
						>
							Play
						</button>
						<button
							onClick={handleStop}
							disabled={!isPlaying}
							className={`px-4 py-2.5 text-white border-none rounded-md transition-colors ${
								!isPlaying ? 'bg-red-300 cursor-default' : 'bg-red-600 cursor-pointer hover:bg-red-700'
							}`}
							title="Stop"
						>
							Stop
						</button>
					</div>
				</div>
			</div>

			<div className="a4-page overflow-auto max-w-full">
				<div className="a4-content">
					<div className="score-title">
						<div className="main">Sight Reading Practice</div>
						<div className="sub">{lastPreset ? `Grade ${lastPreset.grade}` : `Grade ${grade}`}</div>
					</div>

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