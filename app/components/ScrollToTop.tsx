'use client';

import { useState, useEffect } from 'react';

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            // Show button when page is scrolled down 300px
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);

        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <button
            onClick={scrollToTop}
            className={`fixed bottom-8 right-6 md:right-10 z-[100] p-4 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 focus:outline-none cursor-pointer group ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'
                }`}
            style={{
                background: 'var(--charcoal)',
                color: 'var(--saffron)',
                border: '1px solid var(--saffron-dark)'
            }}
            aria-label="Nach oben scrollen"
        >
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity bg-[var(--saffron)]"></div>
            <svg
                className="w-6 h-6 transform group-hover:-translate-y-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
        </button>
    );
}
