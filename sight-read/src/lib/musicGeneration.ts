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

const CHORD_PROGRESSIONS: ChordDegree[][] = [
	[1, 4, 5, 1],
	[1, 5, 1],
	[1, 6, 4, 5],
	[1, 2, 5, 1],
	[1, 4, 2, 5],
];

function allowedChordDegrees(grade: number): ChordDegree[] {
	if (grade <= 3) return [1, 4, 5];
	if (grade <= 5) return [1, 2, 4, 5, 6];
	return [1, 2, 3, 4, 5, 6];
}

function buildChordPlan(bars: number, grade: number): ChordDegree[] {
	if (bars <= 1) return [1];
	const cadential: ChordDegree[] = bars >= 2 ? [5, 1] : [1];
	const allowed = allowedChordDegrees(grade);
	const availableProgressions = CHORD_PROGRESSIONS.filter((prog) => prog.every(d => allowed.includes(d)));
	const progressions = availableProgressions.length ? availableProgressions : [[1, 5, 1]];

	const degrees: ChordDegree[] = [];
	const targetLength = Math.max(0, bars - cadential.length);
	while (degrees.length < targetLength) {
		const next = pickWeightedRandom(progressions, (prog) => prog.length <= 3 ? 1.2 : 1);
		degrees.push(...next);
	}

	return [...degrees.slice(0, targetLength), ...cadential].slice(0, bars);
}

function scaleDistance(scale: string[], from: string, to: string): number {
	const fromIdx = scale.indexOf(from.toUpperCase());
	const toIdx = scale.indexOf(to.toUpperCase());
	if (fromIdx === -1 || toIdx === -1) return 3;
	const forward = (toIdx - fromIdx + 7) % 7;
	const backward = (fromIdx - toIdx + 7) % 7;
	return Math.min(forward, backward);
}

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
			if (distance === 0) w *= 1.6;
			else if (distance === 1) w *= 1.4;
			else if (distance === 2) w *= 0.9;
			else if (distance === 3) w *= 0.5;
			else w *= 0.3;
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
		// For grades 1-2 we still render LH staff but fill with full-bar rests.
		const rest = `z${tokenFromUnits(unitsPerBar)}`;
		return Array.from({ length: bars }, () => rest);
	}

	const out: string[] = [];
	for (let b = 0; b < bars; b++) {
		const chordLetters = triadForDegree(chordDegrees[b] ?? 1, tonicLetter);
		const pickChordNote = () => pickNoteFromPoolByLetter(notePool, pickSpecificChordTone(chordLetters, 'root'), true)
			|| pickNoteFromPoolByLetter(notePool, chordLetters[0], true)
			|| notePool[Math.floor(Math.random() * notePool.length)];

		if (style === 'drone') {
			// Grade 3: whole bar sustained note
			out.push(`${pickChordNote()}${tokenFromUnits(unitsPerBar)}`);
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
			out.push(buildBarFromDurations(lhDurations, unitsPerBar, pickChordNote));
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

	const endDegree = chordDegrees[chordDegrees.length - 1] ?? 1;

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
