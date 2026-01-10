'use client';

import { useState } from 'react';

export default function ShopShareButton() {
    const [showToast, setShowToast] = useState(false);

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        } catch (err) {
            console.error('Failed to copy info: ', err);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleShare}
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors text-white cursor-pointer"
                aria-label="Link teilen"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
            </button>

            {showToast && (
                <div className="absolute top-12 right-0 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap animate-fade-in backdrop-blur-sm">
                    Link kopiert!
                </div>
            )}
        </div>
    );
}
