'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import abcjs from 'abcjs';
import { usePlayback, useGenerateListener } from '@/lib/playback';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

type Duration = { token: string; units: number; weight: number; isRest?: boolean };
type LHStyle = 'none' | 'drone' | 'halves' | 'quarters';

type Preset = {
	grade: number;
	tempo: number;
	key: string;
	bars: number;
	barsPerLine: number;
	noteLength: '1/8';
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

type KeyDef = { label: string; acc: number; min: number; weight: number }; // acc = number of sharps(+) or flats(-), min = minimum grade

const MAJOR_KEYS: KeyDef[] = [
	{ label: 'C', acc: 0, min: 1, weight: 3.0 },
	{ label: 'G', acc: +1, min: 1, weight: 3.0 },
	{ label: 'F', acc: -1, min: 1, weight: 3.0 },
	{ label: 'D', acc: +2, min: 2, weight: 3.0 },
	{ label: 'Bb', acc: -2, min: 2, weight: 3.0 },
	{ label: 'A', acc: +3, min: 3, weight: 2.7 },
	{ label: 'Eb', acc: -3, min: 3, weight: 2.7 },
	{ label: 'E', acc: +4, min: 4, weight: 2.4 },
	{ label: 'Ab', acc: -4, min: 4, weight: 2.4 },
	{ label: 'B', acc: +5, min: 4, weight: 2.0 },
	{ label: 'Db', acc: -5, min: 4, weight: 2.0 },
	{ label: 'F#', acc: +6, min: 5, weight: 1.5 },
	{ label: 'Gb', acc: -6, min: 5, weight: 1.5 },
	{ label: 'C#', acc: +7, min: 6, weight: 1.0 },
	{ label: 'Cb', acc: -7, min: 6, weight: 1.0 },
];
const MINOR_KEYS: KeyDef[] = [
	{ label: 'Am', acc: 0, min: 2, weight: 3.0 },
	{ label: 'Em', acc: +1, min: 2, weight: 3.0 },
	{ label: 'Dm', acc: -1, min: 2, weight: 3.0 },
	{ label: 'Bm', acc: +2, min: 3, weight: 3.0 },
	{ label: 'Gm', acc: -2, min: 3, weight: 3.0 },
	{ label: 'F#m', acc: +3, min: 3, weight: 2.7 },
	{ label: 'Cm', acc: -3, min: 3, weight: 2.7 },
	{ label: 'C#m', acc: +4, min: 4, weight: 2.4 },
	{ label: 'Fm', acc: -4, min: 4, weight: 2.4 },
	{ label: 'G#m', acc: +5, min: 4, weight: 2.0 },
	{ label: 'Bbm', acc: -5, min: 4, weight: 2.0 },
	{ label: 'D#m', acc: +6, min: 5, weight: 1.5 },
	{ label: 'Ebm', acc: -6, min: 5, weight: 1.5 },
	{ label: 'A#m', acc: +7, min: 6, weight: 1.0 },
	{ label: 'Abm', acc: -7, min: 6, weight: 1.0 },
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

function computeLayout(width: number) {
	const barsPerLine = clamp(Math.floor(width / 190), 3, 6); // cap at 6 to avoid crowding
	let lines = 3;
	if (width < 640) lines = 4;
	else if (width < 960) lines = 4;
	else lines = 3;
	const totalBars = barsPerLine * lines;
	return { totalBars, barsPerLine };
}
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
	const g = clamp(grade, 1, 8);
	// Filter to only keys available at this grade (like time signatures)
	const avail = KEY_DEFS.filter(k => g >= k.min);
	// Weight by the key's base weight, with a slight boost for keys that have been available longer
	const choice = pickWeightedRandom(avail, k => k.weight * (1 + 0.1 * Math.max(0, g - k.min)));
	return choice;
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
	noteLength: '1/8';
	durations: Duration[];
};

function planDurations(effComplexity: number): DurationPlan {
	// All grades use 1/8 as base unit for consistent notation
	// Higher complexity adds shorter notes but always keeps longer values present
	
	// Base weights that ensure musical variety at all levels
	const halfW = 0.18;              // Half note (4 units) - always present for phrasing
	const dottedQuarterW = 0.12;     // Dotted quarter (3 units) - adds rhythmic interest
	const quarterW = 0.28;           // Quarter note (2 units) - backbone of most music
	const eighthW = 0.22 - 0.08 * effComplexity;  // Eighth note - decreases slightly as complexity rises
	const sixteenthW = effComplexity >= 0.5 ? 0.06 * effComplexity : 0; // Only appears at higher grades
	
	// Rests - musical breathing room (more present now)
	const halfRestW = 0.06;
	const quarterRestW = 0.08;
	const eighthRestW = 0.04;
	
	const durations: Duration[] = [
		{ token: '4', units: 4, weight: halfW },           // Half note
		{ token: '3', units: 3, weight: dottedQuarterW }, // Dotted quarter
		{ token: '2', units: 2, weight: quarterW },       // Quarter note
		{ token: '', units: 1, weight: eighthW },         // Eighth note
		{ token: '4', units: 4, weight: halfRestW, isRest: true },
		{ token: '2', units: 2, weight: quarterRestW, isRest: true },
		{ token: '', units: 1, weight: eighthRestW, isRest: true },
	];
	
	// Add sixteenth notes for higher complexity (grade 5+)
	if (sixteenthW > 0) {
		durations.push({ token: '/2', units: 0.5, weight: sixteenthW }); // Sixteenth note
		durations.push({ token: '/2', units: 0.5, weight: 0.02, isRest: true }); // Sixteenth rest
	}
	
	return {
		noteLength: '1/8',
		durations,
	};
}

function getPreset(grade: number, totalBars: number, barsPerLine: number): Preset {
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
	// Base unit is always 1/8, so calculate units per bar accordingly
	const unitsPerBar = meterNum * (8 / meterDen);

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
		bars: totalBars,
		barsPerLine,
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
	const maxConsecutiveRests = 1; // Never have two rests in a row
	for (let b = 0; b < bars; b++) {
		let used = 0;
		let runSmall = 0;
		let hasNonSmall = false;
		let consecutiveRests = 0;
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
				// Discourage rests at start of bar or after consecutive rests
				if (x.isRest) {
					if (used === 0) w *= 0.3; // Less likely to start bar with rest
					if (consecutiveRests >= maxConsecutiveRests) w *= 0.1;
				}
				return Math.max(w, 0.0001);
			});
			if (d.isRest) {
				tokens.push(`z${d.token}`);
				consecutiveRests++;
			} else {
				const note = notePool[Math.floor(Math.random() * notePool.length)];
				tokens.push(`${note}${d.token}`);
				consecutiveRests = 0;
			}
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
	if (style === 'none') {
		// For grades 1-2 we still render LH staff but fill with full-bar rests.
		const rest = `z${tokenFromUnits(unitsPerBar)}`;
		return Array.from({ length: bars }, () => rest);
	}

	const out: string[] = [];
	for (let b = 0; b < bars; b++) {
		const note = notePool[Math.floor(Math.random() * notePool.length)];

		if (style === 'drone') {
			// Grade 3: whole bar sustained note
			out.push(`${note}${tokenFromUnits(unitsPerBar)}`);
			continue;
		}

		if (style === 'halves') {
			// Grade 4: use half notes and quarter notes with some rests
			const lhDurations: Duration[] = [
				{ token: '4', units: 4, weight: 0.35 },  // Half note
				{ token: '2', units: 2, weight: 0.40 },  // Quarter note
				{ token: '4', units: 4, weight: 0.10, isRest: true },  // Half rest
				{ token: '2', units: 2, weight: 0.15, isRest: true },  // Quarter rest
			];
			const tokens: string[] = [];
			let used = 0;
			let hadRest = false;
			while (used < unitsPerBar) {
				const remaining = unitsPerBar - used;
				const candidates = lhDurations.filter(d => d.units <= remaining);
				const pickList = candidates.length ? candidates : lhDurations;
				const d = pickWeightedRandom(pickList, (x) => {
					let w = x.weight;
					if (x.isRest && hadRest) w *= 0.1; // Avoid consecutive rests
					if (x.isRest && used === 0) w *= 0.3; // Less likely to start with rest
					return Math.max(w, 0.0001);
				});
				if (d.isRest) {
					tokens.push(`z${d.token}`);
					hadRest = true;
				} else {
					const n = notePool[Math.floor(Math.random() * notePool.length)];
					tokens.push(`${n}${d.token}`);
					hadRest = false;
				}
				used += d.units;
			}
			out.push(tokens.join(' '));
			continue;
		}

		if (style === 'quarters') {
			// Grade 5+: use the full duration system like RH
			const lhDurations: Duration[] = [
				{ token: '4', units: 4, weight: 0.20 },  // Half note
				{ token: '3', units: 3, weight: 0.12 }, // Dotted quarter
				{ token: '2', units: 2, weight: 0.35 },  // Quarter note
				{ token: '', units: 1, weight: 0.15 },   // Eighth note
				{ token: '4', units: 4, weight: 0.06, isRest: true },  // Half rest
				{ token: '2', units: 2, weight: 0.08, isRest: true },  // Quarter rest
				{ token: '', units: 1, weight: 0.04, isRest: true },   // Eighth rest
			];
			const tokens: string[] = [];
			let used = 0;
			let hadRest = false;
			while (used < unitsPerBar) {
				const remaining = unitsPerBar - used;
				const candidates = lhDurations.filter(d => d.units <= remaining);
				const pickList = candidates.length ? candidates : lhDurations;
				const d = pickWeightedRandom(pickList, (x) => {
					let w = x.weight;
					if (x.isRest && hadRest) w *= 0.1; // Avoid consecutive rests
					if (x.isRest && used === 0) w *= 0.3; // Less likely to start with rest
					return Math.max(w, 0.0001);
				});
				if (d.isRest) {
					tokens.push(`z${d.token}`);
					hadRest = true;
				} else {
					const n = notePool[Math.floor(Math.random() * notePool.length)];
					tokens.push(`${n}${d.token}`);
					hadRest = false;
				}
				used += d.units;
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
	const { bars, unitsPerBar, durations, notePoolRH, notePoolLH, key, noteLength, lhStyle, meter, barsPerLine } = preset;

	const rhBars = makeBars(notePoolRH, durations, unitsPerBar, bars);
	const lhBars = makeLeftHandBars(lhStyle, notePoolLH, durations, unitsPerBar, bars);

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

	if (preset.grade > 2) {
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
	for (let i = 0; i < bars; i += barsPerLine) {
		const rhLine = rhBars.slice(i, i + barsPerLine).join(' | ') + (i + barsPerLine >= bars ? ' |]' : ' |');
		const lhLine = lhBars.slice(i, i + barsPerLine).join(' | ') + (i + barsPerLine >= bars ? ' |]' : ' |');
		systems.push(`[V:RH] ${rhLine}`, `[V:LH] ${lhLine}`);
	}

	const header = [
		'X:1',
		`M:${meter}`,
		`L:${noteLength}`,
		`K:${key}`,
		'%%staffsep 26',
		'%%musicspace 6',
		'%%staves {RH LH}',
		'V:RH clef=treble',
		'V:LH clef=bass'
	];

	return [...header, ...systems].join('\n');
}

export default function Generate() {
	const containerRef = useRef<HTMLDivElement | null>(null);

	const [grade, setGrade] = useState<number>(1);
	const [abc, setAbc] = useState<string>('');
	const [lastPreset, setLastPreset] = useState<Preset | null>(null);
	const [visualObj, setVisualObj] = useState<unknown | null>(null);
	const [layoutConfig, setLayoutConfig] = useState({ totalBars: 18, barsPerLine: 6 });
	const [bpm, setBpm] = useState<number>(72);
	
	// Use shared playback service
	const { isPlaying, canPlay, play, stop, setMusic } = usePlayback();

	useEffect(() => {
		const handleResize = () => {
			const width = window.innerWidth;
			const newConfig = computeLayout(width);
			setLayoutConfig(prev => {
				if (prev.totalBars === newConfig.totalBars && prev.barsPerLine === newConfig.barsPerLine) return prev;
				return newConfig;
			});
		};

		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Render ABC notation
	useEffect(() => {
		if (!containerRef.current || !abc) return;
		const width = containerRef.current.clientWidth || 680;
		const scale = clamp(width / 1200, 0.72, 0.9);
		const tunes = abcjs.renderAbc(containerRef.current, abc, {
			responsive: 'resize',
			staffwidth: width,
			scale,
			add_classes: true,
		});
		setVisualObj(tunes?.[0] ?? null);
	}, [abc]);

	// Update playback service when music changes
	useEffect(() => {
		if (visualObj && lastPreset) {
			setMusic({
				visualObj,
				tempo: bpm,
				meterNum: lastPreset.meterNum,
				meterDen: lastPreset.meterDen,
			});
		} else {
			setMusic(null);
		}
	}, [visualObj, lastPreset, bpm, setMusic]);

	const handleGenerate = useCallback(() => {
		stop(); // Stop any current playback
		const p = getPreset(grade, layoutConfig.totalBars, layoutConfig.barsPerLine);
		setLastPreset(p);
		setBpm(p.tempo);
		setAbc(generateAbcForPreset(p));
	}, [grade, layoutConfig, stop]);

	// Listen for generate requests from BottomNav
	useGenerateListener(handleGenerate);

	// Generate on layout change (and initial mount)
	const layoutKey = `${layoutConfig.totalBars}-${layoutConfig.barsPerLine}`;
	useEffect(() => {
		handleGenerate();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [layoutKey]);

	return (
		<div className="generate-page p-4 md:p-6 lg:p-8">
			{/* Controls - compact bar on mobile */}
			<div className="no-print settings-panel order-1">
				<div className="flex flex-col gap-4">
					<div className="flex flex-row flex-wrap items-center gap-3 md:gap-4">
						<div className="flex flex-col gap-1 min-w-[120px]">
							<select
								id="grade-select"
								value={grade}
								onChange={(e) => setGrade(parseInt(e.target.value, 10))}
								className="p-2 md:p-2.5 rounded border border-gray-300 bg-white text-black min-h-[40px] md:min-h-[44px] text-sm"
								aria-label="Select difficulty grade"
							>
								{Array.from({ length: 8 }, (_, i) => i + 1).map((g) => (
									<option key={g} value={g}>Grade {g}</option>
								))}
							</select>
						</div>

						<div className="text-gray-600 flex flex-col gap-1 text-xs md:text-sm">
							<span>Key: {lastPreset ? lastPreset.key : '—'}</span>
						</div>
					</div>

					<div className="flex flex-row flex-wrap items-center gap-2">
						<div className="bpm-control">
							<button
								type="button"
								className="bpm-icon"
								onClick={() => lastPreset && setBpm(lastPreset.tempo)}
								aria-label="Reset tempo"
								title="Reset tempo to generated value"
							>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path
										d="M9 3h6v2h-2v2.2l2.7 2.7a6.5 6.5 0 1 1-9.2 9.2 6.5 6.5 0 0 1 3.5-11.1V5H9V3zm3 7.2a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6zm0 1.6c.4 0 .8.3.8.8v2.3l1.2 1.2a.8.8 0 1 1-1.1 1.1l-1.4-1.4a.8.8 0 0 1-.3-.6v-2.6c0-.4.4-.8.8-.8z"
									/>
								</svg>
							</button>
							<button
								type="button"
								className="bpm-step"
								onClick={() => setBpm(prev => clamp(prev - 2, 40, 240))}
								aria-label="Decrease tempo"
							>
								-
							</button>
							<div className="bpm-value" aria-live="polite">
								{bpm}
							</div>
							<button
								type="button"
								className="bpm-step"
								onClick={() => setBpm(prev => clamp(prev + 2, 40, 240))}
								aria-label="Increase tempo"
							>
								+
							</button>
							<span className="bpm-label">BPM</span>
						</div>
					</div>

					{/* Desktop only: Generate/Play/Stop buttons */}
					<div className="hidden md:flex flex-row lg:flex-col gap-2">
						<button
							onClick={handleGenerate}
							className="px-4 py-2.5 bg-blue-500 text-white border-none rounded-md cursor-pointer hover:bg-blue-600 active:bg-blue-700 transition-colors min-h-[44px] min-w-[44px]"
						>
							Generate
						</button>
						<div className="flex flex-row gap-2">
							<button
								onClick={play}
								disabled={!canPlay || isPlaying}
								className={`px-4 py-2.5 text-white border-none rounded-md transition-colors min-h-[44px] min-w-[44px] ${
									isPlaying ? 'bg-blue-300 cursor-default' : 'bg-green-600 cursor-pointer hover:bg-green-700 active:bg-green-800'
								}`}
								title="Play"
							>
								Play
							</button>
							<button
								onClick={stop}
								disabled={!isPlaying}
								className={`px-4 py-2.5 text-white border-none rounded-md transition-colors min-h-[44px] min-w-[44px] ${
									!isPlaying ? 'bg-red-300 cursor-default' : 'bg-red-600 cursor-pointer hover:bg-red-700 active:bg-red-800'
								}`}
								title="Stop"
							>
								Stop
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Sheet music display */}
			<div className="w-full min-w-0 bg-white rounded-lg shadow-md p-2 md:p-4 overflow-auto order-2">
				<div className="w-full [&_svg]:w-full [&_svg]:h-auto">
					<div className="score-wrap">
						<div ref={containerRef} className="score-surface" />
					</div>
				</div>
			</div>
		</div>
	);
}
