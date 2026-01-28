'use client';

import { ChevronUp } from 'lucide-react';
import type { MetronomeBeatState } from '@/lib/playback';

interface MetronomePatternProps {
  pattern: MetronomeBeatState[];
  onChange: (index: number, state: MetronomeBeatState) => void;
  className?: string;
}

const beatLabel = (state: MetronomeBeatState) => {
  switch (state) {
    case 'accent':
      return 'Accent beat';
    case 'mute':
      return 'Muted beat';
    default:
      return 'Normal beat';
  }
};

const nextState = (state: MetronomeBeatState): MetronomeBeatState => {
  switch (state) {
    case 'normal':
      return 'mute';
    case 'mute':
      return 'accent';
    default:
      return 'normal';
  }
};

export default function MetronomePattern({ pattern, onChange, className }: MetronomePatternProps) {
  if (!pattern.length) return null;

  return (
    <div className={`metronome-pattern ${className ?? ''}`.trim()}>
      {pattern.map((state, index) => (
        <button
          key={`${state}-${index}`}
          type="button"
          className="metronome-beat"
          data-state={state}
          onClick={() => onChange(index, nextState(state))}
          aria-label={`${beatLabel(state)} for beat ${index + 1}`}
          title={`Beat ${index + 1}: ${beatLabel(state)}`}
        >
          {state === 'accent' && <ChevronUp size={18} strokeWidth={2.5} />}
        </button>
      ))}
    </div>
  );
}
