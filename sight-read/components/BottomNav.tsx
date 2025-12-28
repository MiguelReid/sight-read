'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Music, Settings, Play, Square, Sparkles } from 'lucide-react';
import { usePlayback } from '@/lib/playback';

const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/generate', label: 'Practice', icon: Music },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
    const pathname = usePathname();
    const isGeneratePage = pathname === '/generate';
    
    // Use shared playback service
    const { isPlaying, canPlay, play, stop, requestGenerate } = usePlayback();

    return (
        <nav className="btmnav" aria-label="Mobile navigation">
            <div className="btmnav-inner">
                {/* Navigation items */}
                {navItems.map((item) => {
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
                })}

                {/* Playback controls - only shown on generate page */}
                {isGeneratePage && (
                    <div className="btmnav-playback">
                        <button
                            onClick={requestGenerate}
                            className="btmnav-btn btmnav-btn-generate"
                            title="Generate new"
                        >
                            <Sparkles size={20} />
                        </button>
                        <button
                            onClick={play}
                            disabled={!canPlay || isPlaying}
                            className={`btmnav-btn btmnav-btn-play ${isPlaying ? 'btmnav-btn-disabled' : ''}`}
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
