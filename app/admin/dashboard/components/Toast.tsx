'use client';

import { ToastState } from './types';

interface ToastProps {
    toast: ToastState | null;
    onClose: () => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
    if (!toast) return null;

    return (
        <div className="fixed top-4 right-4 z-[100]" style={{ animation: 'slideInRight 0.3s ease-out' }}>
            <div
                className="glass-card px-5 py-3 flex items-center gap-3 shadow-lg"
                style={{
                    background: toast.type === 'success' ? 'linear-gradient(135deg, var(--mint) 0%, rgba(107, 142, 122, 0.15) 100%)' : 'rgba(255, 255, 255, 0.95)',
                    borderLeft: `4px solid ${toast.type === 'success' ? 'var(--cardamom)' : 'var(--terracotta)'}`,
                    minWidth: '300px'
                }}
            >
                {toast.type === 'success' ? (
                    <div className="p-1.5 rounded-full" style={{ background: 'var(--cardamom)' }}>
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="white" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                ) : (
                    <div className="p-1.5 rounded-full" style={{ background: 'var(--terracotta)' }}>
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="white" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                )}
                <span style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)', fontSize: '14px', fontWeight: 500 }}>
                    {toast.message}
                </span>
                <button onClick={onClose} className="ml-auto p-1 rounded hover:opacity-70 transition-opacity cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="var(--warm-gray)" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
