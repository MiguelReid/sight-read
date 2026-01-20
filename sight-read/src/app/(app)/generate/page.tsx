'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import abcjs from 'abcjs';
import { Clock } from 'lucide-react';
import { usePlayback, useGenerateListener } from '@/lib/playback';
import { generateAbcForPreset, getPreset, type Preset } from '@/lib/musicGeneration';

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

export default function Generate() {
	const containerRef = useRef<HTMLDivElement | null>(null);

	const [grade, setGrade] = useState<number>(1);
	const [abc, setAbc] = useState<string>('');
	const [lastPreset, setLastPreset] = useState<Preset | null>(null);
	const [visualObj, setVisualObj] = useState<unknown | null>(null);
	const [layoutConfig, setLayoutConfig] = useState({ totalBars: 18, barsPerLine: 6 });
	
	// Use shared playback service (BPM is now managed there)
	const { isPlaying, canPlay, play, stop, setMusic, bpm, setBpm, resetBpm } = usePlayback();

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
				tempo: lastPreset.tempo,
				meterNum: lastPreset.meterNum,
				meterDen: lastPreset.meterDen,
			});
		} else {
			setMusic(null);
		}
	}, [visualObj, lastPreset, setMusic]);

	const handleGenerate = useCallback(() => {
		stop(); // Stop any current playback
		const p = getPreset(grade, layoutConfig.totalBars, layoutConfig.barsPerLine);
		setLastPreset(p);
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
		<div className="generate-page p-3 md:p-5 lg:p-8">
			{/* Settings Panel - top bar on mobile, left side on desktop */}
			<div className="no-print settings-panel">
				{/* Grade selector */}
				<select
					id="grade-select"
					value={grade}
					onChange={(e) => setGrade(parseInt(e.target.value, 10))}
					className="p-2 md:p-2.5 rounded-lg border border-gray-300 bg-white text-black text-sm min-w-[100px] md:w-full"
					aria-label="Select difficulty grade"
				>
					{Array.from({ length: 8 }, (_, i) => i + 1).map((g) => (
						<option key={g} value={g}>Grade {g}</option>
					))}
				</select>

				{/* Key display */}
				<div className="text-gray-600 text-xs md:text-sm whitespace-nowrap">
					Key: <span className="font-medium text-gray-800">{lastPreset ? lastPreset.key : '—'}</span>
				</div>

				{/* Desktop only: BPM control */}
				<div className="hidden md:block mt-2">
					<div className="bpm-control">
						<button
							type="button"
							className="bpm-icon"
							onClick={resetBpm}
							aria-label="Reset tempo"
							title="Reset tempo to generated value"
						>
							<Clock size={20} />
						</button>
						<button
							type="button"
							className="bpm-step"
							onClick={() => setBpm(bpm - 2)}
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
							onClick={() => setBpm(bpm + 2)}
							aria-label="Increase tempo"
						>
							+
						</button>
						<span className="bpm-label">BPM</span>
					</div>
				</div>

				{/* Desktop only: Generate/Play/Stop buttons */}
				<div className="hidden md:flex flex-col gap-2 pt-3 mt-3 border-t border-gray-200">
					<button
						onClick={handleGenerate}
						className="w-full px-3 py-2 bg-blue-500 text-white text-sm font-medium border-none rounded-lg cursor-pointer hover:bg-blue-600 active:bg-blue-700 transition-colors"
					>
						Generate
					</button>
					<div className="flex gap-2">
						<button
							onClick={play}
							disabled={!canPlay || isPlaying}
							className={`flex-1 px-3 py-2 text-white text-sm font-medium border-none rounded-lg transition-colors ${
								isPlaying ? 'bg-green-300 cursor-default' : 'bg-green-600 cursor-pointer hover:bg-green-700 active:bg-green-800'
							}`}
							title="Play"
						>
							Play
						</button>
						<button
							onClick={stop}
							disabled={!isPlaying}
							className={`flex-1 px-3 py-2 text-white text-sm font-medium border-none rounded-lg transition-colors ${
								!isPlaying ? 'bg-red-300 cursor-default' : 'bg-red-600 cursor-pointer hover:bg-red-700 active:bg-red-800'
							}`}
							title="Stop"
						>
							Stop
						</button>
					</div>
				</div>
			</div>

			{/* Sheet music display */}
			<div className="min-w-0 bg-white rounded-xl shadow-sm p-2 md:p-4 overflow-auto border border-gray-100">
				<div className="w-full [&_svg]:w-full [&_svg]:h-auto">
					<div className="score-wrap">
						<div ref={containerRef} className="score-surface" />
					</div>
				</div>
			</div>
		</div>
	);
}
