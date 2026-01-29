const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

type Duration = { token: string; units: number; weight: number; isRest?: boolean };
type LHStyle = 'none' | 'drone' | 'halves' | 'quarters';
type ChordDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Preset = {
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
	// Feature flags - set based on grade in getPreset()
	features: {
		dynamics: ('p' | 'f')[] | ('p' | 'mp' | 'mf' | 'f')[] | ('p' | 'mp' | 'mf' | 'f' | 'ff')[];
		useCrescendo: boolean;
	};
};

type KeyDef = { label: string; acc: number; min: number; weight: number }; // acc = number of sharps(+) or flats(-), min = minimum grade

const MAJOR_KEYS: KeyDef[] = [
	// Grade 1: C, G, F
	{ label: 'C', acc: 0, min: 1, weight: 3.0 },
	{ label: 'G', acc: +1, min: 1, weight: 3.0 },
	{ label: 'F', acc: -1, min: 1, weight: 3.0 },
	// Grade 2: +D
	{ label: 'D', acc: +2, min: 2, weight: 3.0 },
	// Grade 3: +A, Bb, Eb
	{ label: 'A', acc: +3, min: 3, weight: 2.7 },
	{ label: 'Bb', acc: -2, min: 3, weight: 2.7 },
	{ label: 'Eb', acc: -3, min: 3, weight: 2.7 },
	// Grade 5: +E, Ab
	{ label: 'E', acc: +4, min: 5, weight: 2.4 },
	{ label: 'Ab', acc: -4, min: 5, weight: 2.4 },
];
const MINOR_KEYS: KeyDef[] = [
	// Grade 1: Am, Dm
	{ label: 'Am', acc: 0, min: 1, weight: 3.0 },
	{ label: 'Dm', acc: -1, min: 1, weight: 3.0 },
	// Grade 2: +Em, Gm
	{ label: 'Em', acc: +1, min: 2, weight: 3.0 },
	{ label: 'Gm', acc: -2, min: 2, weight: 3.0 },
	// Grade 3: +Em (already), Bm
	{ label: 'Bm', acc: +2, min: 3, weight: 2.7 },
	// Grade 5: +F#m, Cm
	{ label: 'F#m', acc: +3, min: 5, weight: 2.4 },
	{ label: 'Cm', acc: -3, min: 5, weight: 2.4 },
];
const KEY_DEFS: KeyDef[] = [...MAJOR_KEYS, ...MINOR_KEYS];

const METER_OPTIONS = [
	// Grade 1: 2/4, 3/4, 4/4
	{ meter: '2/4', num: 2, den: 4, min: 1, weight: 3.5, strongBeats: [1], secondaryBeats: [] },
	{ meter: '3/4', num: 3, den: 4, min: 1, weight: 3.2, strongBeats: [1], secondaryBeats: [3] },
	{ meter: '4/4', num: 4, den: 4, min: 1, weight: 5.0, strongBeats: [1], secondaryBeats: [3] },
	// Grade 3+: compound and other meters
	{ meter: '6/8', num: 6, den: 8, min: 3, weight: 2.4, strongBeats: [1], secondaryBeats: [4] },
	{ meter: '3/8', num: 3, den: 8, min: 4, weight: 1.6, strongBeats: [1], secondaryBeats: [3] },
	// Grade 5: more complex
	{ meter: '2/2', num: 2, den: 2, min: 5, weight: 1.8, strongBeats: [1], secondaryBeats: [] },
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

function pickFromWeightedMap<T>(items: T[], weights: number[]): T {
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	let r = Math.random() * total;
	for (let i = 0; i < items.length; i++) {
		r -= weights[i];
		if (r <= 0) return items[i];
	}
	return items[items.length - 1];
}

function pickKeyForGrade(grade: number): KeyDef {
	const g = clamp(grade, 1, 5);
	// Filter to only keys available at this grade (like time signatures)
	const avail = KEY_DEFS.filter(k => g >= k.min);
	// Weight by the key's base weight, with a slight boost for keys that have been available longer
	const choice = pickWeightedRandom(avail, k => k.weight * (1 + 0.1 * Math.max(0, g - k.min)));
	return choice;
}

function pickMeterForGrade(grade: number): { meter: string; num: number; den: number; strongBeats: number[]; secondaryBeats: number[] } {
	const g = clamp(grade, 1, 5);
	const avail = METER_OPTIONS.filter(m => g >= m.min);
	const choice = pickWeightedRandom(avail, m => m.weight * (1 + 0.15 * Math.max(0, g - m.min)));
	return { meter: choice.meter, num: choice.num, den: choice.den, strongBeats: choice.strongBeats, secondaryBeats: choice.secondaryBeats };
}

function tempoRangeForGrade(grade: number): [number, number] {
	switch (clamp(grade, 1, 5)) {
		case 1: return [60, 72];
		case 2: return [60, 84];
		case 3: return [60, 96];
		case 4: return [70, 110];
		case 5: return [70, 120];
		default: return [72, 100];
	}
}

type DurationPlan = {
	noteLength: '1/8';
	durations: Duration[];
};

function planDurations(effComplexity: number, meterDen: number, grade: number): DurationPlan {
	// For meters with larger beat values (smaller denominators like /2), 
	// moderately boost longer note durations to avoid overwhelming note density
	// meterDen 2 = half note beats, meterDen 4 = quarter beats, meterDen 8 = eighth beats
	const denFactor = 4 / meterDen; // 2 for /2, 1 for /4, 0.5 for /8
	const longBoost = denFactor > 1 ? (denFactor - 1) * 0.25 : 0; // Gentler boost for /2 meters
	const shortPenalty = denFactor > 1 ? (denFactor - 1) * 0.15 : 0; // Gentler reduction for short notes

	// Base weights for variety (adjusted by meter)
	const wholeW = denFactor > 1 ? 0.06 * (denFactor - 1) : 0; // Modest whole notes for /2 meters
	const halfW = 0.18 + longBoost;          
	const dottedQuarterW = 0.12 + (longBoost * 0.3);    
	const quarterW = 0.28;       
	const eighthW = Math.max(0.10, 0.22 - 0.08 * effComplexity - shortPenalty);
	// Semiquavers (16ths) only from Grade 3+, no 16ths in /2 meters
	const sixteenthW = (grade >= 3 && denFactor <= 1) ? 0.06 * effComplexity : 0;

	// Rests: quaver rests from G1, but dotted crotchet rests and more complex from G3+
	const wholeRestW = denFactor > 1 ? 0.02 * (denFactor - 1) : 0;
	const halfRestW = 0.06 + (longBoost * 0.2);
	const quarterRestW = 0.08;
	const eighthRestW = Math.max(0.02, 0.04 - shortPenalty * 0.3);

	const durations: Duration[] = [
		{ token: '4', units: 4, weight: halfW },         
		{ token: '3', units: 3, weight: dottedQuarterW },
		{ token: '2', units: 2, weight: quarterW },      
		{ token: '', units: 1, weight: eighthW },       
		{ token: '4', units: 4, weight: halfRestW, isRest: true },
		{ token: '2', units: 2, weight: quarterRestW, isRest: true },
		{ token: '', units: 1, weight: eighthRestW, isRest: true },
	];

	// Add whole notes for /2 time signatures
	if (wholeW > 0) {
		durations.unshift({ token: '8', units: 8, weight: wholeW }); // Whole note
		durations.push({ token: '8', units: 8, weight: wholeRestW, isRest: true }); // Whole rest
	}

	// Add sixteenth notes for higher complexity (but not in /2 meters)
	if (sixteenthW > 0) {
		durations.push({ token: '/2', units: 0.5, weight: sixteenthW }); // Sixteenth note
		durations.push({ token: '/2', units: 0.5, weight: 0.02, isRest: true }); // Sixteenth rest
	}

	return {
		noteLength: '1/8',
		durations,
	};
}

// Each progression has a weight and a minimum grade (like keys/meters)
// Chords: 1=I, 2=ii, 3=iii, 4=IV, 5=V, 6=vi, 7=vii°
type ProgressionDef = { prog: ChordDegree[]; min: number; weight: number };

const CHORD_PROGRESSIONS: ProgressionDef[] = [
	// Basic progressions (available early)
	{ prog: [1, 5, 1], min: 1, weight: 3.0 },           // I-V-I (simplest)
	{ prog: [1, 4, 1], min: 1, weight: 2.5 },           // I-IV-I (plagal feel)
	{ prog: [1, 4, 5, 1], min: 1, weight: 3.5 },        // I-IV-V-I (classic)
	{ prog: [1, 5, 4, 1], min: 1, weight: 2.0 },        // I-V-IV-I (rock)
	{ prog: [1, 4, 5], min: 1, weight: 2.5 },           // I-IV-V (open ending)
	{ prog: [4, 5, 1], min: 1, weight: 2.0 },           // IV-V-I (approach)
	
	// Add ii chord (grade 2+)
	{ prog: [1, 2, 5, 1], min: 2, weight: 2.8 },        // I-ii-V-I
	{ prog: [1, 4, 2, 5], min: 2, weight: 2.5 },        // I-IV-ii-V
	{ prog: [2, 5, 1], min: 2, weight: 2.2 },           // ii-V-I (jazz essential)
	{ prog: [1, 2, 4, 5], min: 2, weight: 2.0 },        // I-ii-IV-V

	// Add vi chord (grade 3+)
	{ prog: [1, 6, 4, 5], min: 3, weight: 3.0 },        // I-vi-IV-V (50s)
	{ prog: [1, 5, 6, 4], min: 3, weight: 2.8 },        // I-V-vi-IV (pop)
	{ prog: [6, 4, 1, 5], min: 3, weight: 2.5 },        // vi-IV-I-V (modern pop)
	
	// More complex (grade 4+)
	{ prog: [1, 4, 6, 5], min: 4, weight: 2.0 },        // I-IV-vi-V
	{ prog: [1, 6, 4, 2], min: 4, weight: 1.8 },        // I-vi-IV-ii
	{ prog: [4, 1, 5, 6], min: 4, weight: 1.5 },        // IV-I-V-vi
	
	// Add iii chord (grade 5)
	{ prog: [1, 3, 4, 5], min: 5, weight: 1.0 },        // I-iii-IV-V
	{ prog: [1, 3, 6, 4], min: 5, weight: 0.9 },        // I-iii-vi-IV
	{ prog: [1, 5, 3, 4], min: 5, weight: 0.8 },        // I-V-iii-IV
];

function buildChordPlan(bars: number, grade: number): ChordDegree[] {
	if (bars <= 1) return [1];
	
	// Always end with V-I cadence
	const cadential: ChordDegree[] = bars >= 2 ? [5, 1] : [1];
	const g = clamp(grade, 1, 5);
	
	// Available progressions at n grade
	const available = CHORD_PROGRESSIONS.filter(p => g >= p.min);
	
	const degrees: ChordDegree[] = [];
	const targetLength = Math.max(0, bars - cadential.length);
	
	while (degrees.length < targetLength) {
		// Pick a progression with weighted probability
		const next = pickWeightedRandom(available, p => {
			const familiarityBonus = 1 + 0.1 * Math.max(0, g - p.min);
			return p.weight * familiarityBonus;
		});
		degrees.push(...next.prog);
	}

	return [...degrees.slice(0, targetLength), ...cadential].slice(0, bars);
}

function scaleDistance(scale: string[], from: string, to: string): number {
	// Shortest distance between 2 notes (either upwards or downwards)
	const fromIdx = scale.indexOf(from.toUpperCase());
	const toIdx = scale.indexOf(to.toUpperCase());
	if (fromIdx === -1 || toIdx === -1) return 3;
	const forward = (toIdx - fromIdx + 7) % 7;
	const backward = (fromIdx - toIdx + 7) % 7;
	return Math.min(forward, backward);
}

// Favour small steps for musicality
function pickMelodyLetter(
	scaleLetters: string[],
	preferredLetters: string[],
	prevLetter: string | null
): string {
	const weights = scaleLetters.map((letter) => {
		let w = 1;
		if (preferredLetters.includes(letter)) w *= 2.2;
		if (prevLetter) {
			const distance = scaleDistance(scaleLetters, prevLetter, letter);
			if (distance === 0) w = 0; // No repeated notes
			else if (distance === 1) w *= 1.4;
			else if (distance === 2) w *= 0.9;
			else if (distance === 3) w *= 0.4;
			else w *= 0.2;
		}
		return w;
	});

	return pickFromWeightedMap(scaleLetters, weights);
}

function beatIndexForUnits(unitsIntoBar: number, unitsPerBeat: number): number {
	return Math.floor(unitsIntoBar / unitsPerBeat) + 1;
}

function makeBars(
	notePool: string[],
	durations: Duration[],
	unitsPerBar: number,
	bars: number,
	chordDegrees: ChordDegree[],
	tonicLetter: string,
	meterNum: number,
	strongBeats: number[],
	secondaryBeats: number[]
): string[] {
	const out: string[] = [];
	const minUnits = Math.min(...durations.map(d => d.units));
	const maxSmallRun = 3;
	const maxConsecutiveRests = 1; // Never have two rests in a row
	const scaleLetters = diatonicLettersFrom(tonicLetter);
	let prevLetter: string | null = null;
	const unitsPerBeat = unitsPerBar / meterNum;
	for (let b = 0; b < bars; b++) {
		let used = 0;
		let runSmall = 0;
		let hasNonSmall = false;
		let consecutiveRests = 0;
		const chordLetters = triadForDegree(chordDegrees[b] ?? 1, tonicLetter);
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
				const beatIndex = beatIndexForUnits(used, unitsPerBeat);
				const isStrong = strongBeats.includes(beatIndex);
				const isSecondary = secondaryBeats.includes(beatIndex);
				const preferChord = isStrong || (isSecondary && Math.random() < 0.6);
				const preferred = preferChord ? chordLetters : scaleLetters;
				const letter = pickMelodyLetter(scaleLetters, preferred, prevLetter);
				const note = pickNoteFromPoolByLetter(notePool, letter) ?? notePool[Math.floor(Math.random() * notePool.length)];
				tokens.push(`${note}${d.token}`);
				consecutiveRests = 0;
				prevLetter = letter;
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

function buildBarFromDurations(
	durations: Duration[],
	unitsPerBar: number,
	pickNote: () => string
): string {
	const tokens: string[] = [];
	let used = 0;
	let hadRest = false;
	while (used < unitsPerBar) {
		const remaining = unitsPerBar - used;
		const candidates = durations.filter(d => d.units <= remaining);
		const pickList = candidates.length ? candidates : durations;
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
			const n = pickNote();
			tokens.push(`${n}${d.token}`);
			hadRest = false;
		}
		used += d.units;
	}
	return tokens.join(' ');
}

function makeLeftHandBars(
	style: LHStyle,
	notePool: string[],
	unitsPerBar: number,
	bars: number,
	chordDegrees: ChordDegree[],
	tonicLetter: string
): string[] {
	if (style === 'none') {
		const rest = `z${tokenFromUnits(unitsPerBar)}`;
		return Array.from({ length: bars }, () => rest);
	}

	const out: string[] = [];
	for (let b = 0; b < bars; b++) {
		const chordLetters = triadForDegree(chordDegrees[b] ?? 1, tonicLetter);
		
		// Chord tones with weighted probability: root most common, then fifth, then third
		const pickChordNote = () => {
			const toneWeights: [string, number][] = [
				[chordLetters[0], 3.0],  // Root - most common for bass
				[chordLetters[2], 1.5],  // Fifth - good for bass movement
				[chordLetters[1], 0.8],  // Third - occasional color
			];
			const totalWeight = toneWeights.reduce((sum, [, w]) => sum + w, 0);
			let r = Math.random() * totalWeight;
			let chosenLetter = chordLetters[0];
			for (const [letter, weight] of toneWeights) {
				r -= weight;
				if (r <= 0) {
					chosenLetter = letter;
					break;
				}
			}
			return pickNoteFromPoolByLetter(notePool, chosenLetter, true)
				|| notePool[Math.floor(Math.random() * notePool.length)];
		};

		if (style === 'drone') {
			// Grade 3: whole bar sustained note
			out.push(`${pickChordNote()}${tokenFromUnits(unitsPerBar)}`);
			continue;
		}

		if (style === 'halves') {
			// Grade 4: prefer longer notes - half notes dominant, some quarters
			const lhDurations: Duration[] = [
				{ token: '4', units: 4, weight: 0.55 },  // Half note - primary
				{ token: '2', units: 2, weight: 0.25 },  // Quarter note - secondary
				{ token: '4', units: 4, weight: 0.12, isRest: true },  // Half rest
				{ token: '2', units: 2, weight: 0.08, isRest: true },  // Quarter rest
			];
			out.push(buildBarFromDurations(lhDurations, unitsPerBar, pickChordNote));
			continue;
		}

		if (style === 'quarters') {
			// Only grade 5: still favor longer notes for bass stability
			// Much higher weight on half notes, reduced eighths
			const lhDurations: Duration[] = [
				{ token: '4', units: 4, weight: 0.40 },  // Half note - strong preference
				{ token: '3', units: 3, weight: 0.15 },  // Dotted quarter
				{ token: '2', units: 2, weight: 0.30 },  // Quarter note
				{ token: '', units: 1, weight: 0.05 },   // Eighth note - rare
				{ token: '4', units: 4, weight: 0.05, isRest: true },  // Half rest
				{ token: '2', units: 2, weight: 0.04, isRest: true },  // Quarter rest
				{ token: '', units: 1, weight: 0.01, isRest: true },   // Eighth rest - very rare
			];
			out.push(buildBarFromDurations(lhDurations, unitsPerBar, pickChordNote));
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

export function getPreset(grade: number, totalBars: number, barsPerLine: number): Preset {
	const g = clamp(grade, 1, 5);
	const keyDef = pickKeyForGrade(g);
	const key = keyDef.label;
	const keyHardness = Math.abs(keyDef.acc) / 7;

	const baseComplexity = (g - 1) / 4; // 0 to 1 for grades 1-5
	const effComplexity = clamp(baseComplexity - 0.35 * keyHardness + rand(-0.03, 0.03), 0, 0.85);

	const [tMin, tMax] = tempoRangeForGrade(g);
	const tempoScale = 1 - 0.15 * keyHardness;
	const tempo = Math.round(rand(Math.round(tMin * tempoScale), Math.round(tMax * tempoScale)));

	const meterOpt = pickMeterForGrade(g);
	const { meter, num: meterNum, den: meterDen, strongBeats, secondaryBeats } = meterOpt;

	const { noteLength, durations } = planDurations(effComplexity, meterDen, g);
	// Base unit is always 1/8, so calculate units per bar accordingly
	const unitsPerBar = meterNum * (8 / meterDen);

	// RH note pool: Start with notes around middle C, spanning both below and above
	// ABC octaves: C = C3, c = C4 (middle C), c' = C5
	// Base range: G3 to G4 (comfortable treble clef range centered on middle C)
	// Weight notes toward the middle of the staff - add duplicates for center notes
	const notePoolRH: string[] = ['G', 'A', 'B', 'B', 'c', 'c', 'c', 'd', 'd', 'd', 'e', 'e', 'f', 'g'];
	// Add higher notes at increased complexity (higher thresholds, fewer duplicates)
	if (effComplexity >= 0.5) notePoolRH.push('a', 'b');
	if (effComplexity >= 0.7) notePoolRH.push("c'");
	if (effComplexity >= 0.85) notePoolRH.push("d'");

	// LH note pool: Bass clef range
	const notePoolLH: string[] = ['C,', 'D,', 'E,', 'F,', 'G,', 'A,', 'B,'];
	if (effComplexity >= 0.5) notePoolLH.push('C', 'D', 'E', 'F', 'G', 'A', 'B');

	// LH style based on grade:
	// G1: five-finger position, no chords
	// G2: two-note chords appear
	// G3: three-note chords
	// G4-5: more complex chords
	let lhStyle: LHStyle = 'none';
	if (g === 1) lhStyle = 'none';
	else if (g === 2) lhStyle = 'drone';      // Two-note chords
	else if (g === 3) lhStyle = 'halves';     // Three-note chords
	else if (g >= 4) lhStyle = 'quarters';    // More complex

	// Feature flags based on grade
	const features: Preset['features'] = {
		// G1: p, f | G2+: +mp, mf | G4+: +ff
		dynamics: g >= 4 ? ['p', 'mp', 'mf', 'f', 'ff'] 
		        : g >= 2 ? ['p', 'mp', 'mf', 'f'] 
		        : ['p', 'f'],
		useCrescendo: true, // All grades get crescendo/diminuendo
	};

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
		features,
	};
}

export function generateAbcForPreset(preset: Preset): string {
	const { bars, unitsPerBar, durations, notePoolRH, notePoolLH, key, noteLength, lhStyle, meter, barsPerLine } = preset;
	const chordDegrees = buildChordPlan(bars, preset.grade);

	const { tonicLetter } = parseKeyLabel(key);
	const rhBars = makeBars(
		notePoolRH,
		durations,
		unitsPerBar,
		bars,
		chordDegrees,
		tonicLetter,
		preset.meterNum,
		preset.strongBeats,
		preset.secondaryBeats
	);
	const lhBars = makeLeftHandBars(
		lhStyle,
		notePoolLH,
		unitsPerBar,
		bars,
		chordDegrees,
		tonicLetter
	);

	// RH ending: use the tonic
	const lastIdx = bars - 1;
	const rhLastTokens = rhBars[lastIdx].trim().split(/\s+/);
	const rhLastDur = extractDurationToken(rhLastTokens[rhLastTokens.length - 1]);
	const rhLastNote = pickNoteFromPoolByLetter(notePoolRH, tonicLetter, false) || rhLastTokens[rhLastTokens.length - 1];
	rhLastTokens[rhLastTokens.length - 1] = `${rhLastNote}${rhLastDur}`;
	rhBars[lastIdx] = rhLastTokens.join(' ');

	// LH ending: use the tonic
	if (preset.grade > 2) {
		const lhLastTokens = lhBars[lastIdx].trim().split(/\s+/);
		const lhLastDur = extractDurationToken(lhLastTokens[lhLastTokens.length - 1]);
		const lhLastNote = pickNoteFromPoolByLetter(notePoolLH, tonicLetter, true) || lhLastTokens[lhLastTokens.length - 1];
		lhLastTokens[lhLastTokens.length - 1] = `${lhLastNote}${lhLastDur}`;
		lhBars[lastIdx] = lhLastTokens.join(' ');
	}

	// ============ DYNAMICS ============
	// Add dynamic marking at the start, and optionally at mid-point for longer pieces
	const { dynamics, useCrescendo } = preset.features;
	
	// Opening dynamic
	const openingDynamic = dynamics[Math.floor(Math.random() * dynamics.length)];
	rhBars[0] = `!${openingDynamic}!` + rhBars[0];
	
	// Mid-piece dynamic change for pieces with 4+ bars (50% chance)
	// Must be different from opening dynamic
	if (bars >= 4 && Math.random() < 0.5) {
		const midBar = Math.floor(bars / 2);
		const availableDynamics = dynamics.filter(d => d !== openingDynamic);
		if (availableDynamics.length > 0) {
			const midDynamic = availableDynamics[Math.floor(Math.random() * availableDynamics.length)];
			rhBars[midBar] = `!${midDynamic}!` + rhBars[midBar];
		}
	}
	
	// Crescendo or diminuendo (40% chance, spanning 1-2 bars)
	if (useCrescendo && bars >= 4 && Math.random() < 0.4) {
		// Start between bar 1 and third-to-last bar (avoid bar 0 which has opening dynamic)
		const crescStart = 1 + Math.floor(Math.random() * (bars - 3));
		// Randomly span 1 bar (50%) or 2 bars (50%)
		const spanTwoBars = Math.random() < 0.5;
		const crescEnd = spanTwoBars ? crescStart + 1 : crescStart;
		const isCrescendo = Math.random() < 0.5;
		// Start marker at beginning of start bar
		rhBars[crescStart] = (isCrescendo ? '!<(!' : '!>(!') + rhBars[crescStart];
		// End marker must be attached to the last note token in the bar
		const endTokens = rhBars[crescEnd].trim().split(/\s+/);
		endTokens[endTokens.length - 1] = endTokens[endTokens.length - 1] + (isCrescendo ? '!<)!' : '!>)!');
		rhBars[crescEnd] = endTokens.join(' ');
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
