'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Home, Music, Settings, Play, Square, Sparkles, Minus, Plus, Clock } from 'lucide-react';
import { usePlayback } from '@/lib/playback';

const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/generate', label: 'Practice', icon: Music },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
    const pathname = usePathname();
    const isGeneratePage = pathname === '/generate';
    const [showBpmPopup, setShowBpmPopup] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    
    // Use shared playback service
    const { isPlaying, canPlay, play, stop, requestGenerate, bpm, setBpm, resetBpm } = usePlayback();

    // Close popup when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setShowBpmPopup(false);
            }
        }
        if (showBpmPopup) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showBpmPopup]);

    return (
        <nav className="btmnav" aria-label="Mobile navigation">
            <div className={`btmnav-inner ${isGeneratePage ? 'btmnav-inner-spread' : ''}`}>
                {/* On generate page: just Home link. Otherwise: all nav items */}
                {isGeneratePage ? (
                    <Link href="/" className="btmnav-item">
                        <Home size={24} strokeWidth={2} />
                        <span className="btmnav-label">Home</span>
                    </Link>
                ) : (
                    navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`btmnav-item ${isActive ? 'btmnav-item-active' : ''}`}
                            >
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="btmnav-label">{item.label}</span>
                            </Link>
                        );
                    })
                )}

                {/* Playback controls - only shown on generate page */}
                {/* Order: Generate, BPM, Play, Stop */}
                {isGeneratePage && (
                    <div className="btmnav-playback">
                        <button
                            onClick={requestGenerate}
                            className="btmnav-btn btmnav-btn-generate"
                            title="Generate new"
                        >
                            <Sparkles size={20} />
                        </button>

                        {/* BPM Control */}
                        <div className="btmnav-bpm-wrapper" ref={popupRef}>
                            <button
                                onClick={() => setShowBpmPopup(!showBpmPopup)}
                                className="btmnav-btn btmnav-btn-bpm"
                                title="Tempo"
                                aria-expanded={showBpmPopup}
                            >
                                <Clock size={20} />
                            </button>

                            {/* BPM Popup */}
                            {showBpmPopup && (
                                <div className="btmnav-bpm-popup">
                                    <button
                                        onClick={() => setBpm(bpm - 2)}
                                        className="btmnav-bpm-step"
                                        aria-label="Decrease tempo"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <button
                                        onClick={resetBpm}
                                        className="btmnav-bpm-value"
                                        title="Reset to original tempo"
                                    >
                                        {bpm}
                                    </button>
                                    <button
                                        onClick={() => setBpm(bpm + 2)}
                                        className="btmnav-bpm-step"
                                        aria-label="Increase tempo"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={play}
                            disabled={!canPlay || isPlaying}
                            className={`btmnav-btn btmnav-btn-play ${!canPlay || isPlaying ? 'btmnav-btn-disabled' : ''}`}
                            title="Play"
                        >
                            <Play size={20} fill="currentColor" />
                        </button>
                        <button
                            onClick={stop}
                            disabled={!isPlaying}
                            className={`btmnav-btn btmnav-btn-stop ${!isPlaying ? 'btmnav-btn-disabled' : ''}`}
                            title="Stop"
                        >
                            <Square size={20} fill="currentColor" />
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}
