'use client';
import React from 'react';

export function Toast({
    title,
    description,
    variant = 'default',
    onClose,
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'success' | 'error';
    onClose?: () => void;
}) {
    const bgClass = {
        default: 'bg-slate-900 border-slate-800',
        success: 'bg-indigo-900/50 border-indigo-500/30',
        error: 'bg-red-900/50 border-red-500/30',
    }[variant];

    const iconColor = {
        default: 'text-indigo-400',
        success: 'text-green-400',
        error: 'text-red-400',
    }[variant];

    return (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl border ${bgClass} shadow-xl max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300`}>
            <div className="flex gap-3">
                {variant === 'success' && (
                    <svg className={`shrink-0 w-5 h-5 ${iconColor} mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
                {variant === 'error' && (
                    <svg className={`shrink-0 w-5 h-5 ${iconColor} mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
                {variant === 'default' && (
                    <svg className={`shrink-0 w-5 h-5 ${iconColor} mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                    {description && <p className="mt-1 text-sm text-slate-300">{description}</p>}
                </div>
                {onClose && (
                    <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}

// Simple toast manager
let toastListeners: ((toast: { title: string; description?: string; variant?: 'default' | 'success' | 'error'; id: number } | null) => void)[] = [];

export const toast = {
    show: (title: string, options?: { description?: string; variant?: 'default' | 'success' | 'error' }) => {
        const id = Date.now();
        toastListeners.forEach(listener => listener({ title, ...options, id }));
        setTimeout(() => {
            toastListeners.forEach(listener => listener(null));
        }, 5000);
    },
    success: (title: string, description?: string) => toast.show(title, { description, variant: 'success' }),
    error: (title: string, description?: string) => toast.show(title, { description, variant: 'error' }),
};

export function ToastProvider() {
    const [currentToast, setCurrentToast] = React.useState<{ title: string; description?: string; variant?: 'default' | 'success' | 'error'; id: number } | null>(null);

    React.useEffect(() => {
        const listener = (t: typeof currentToast) => setCurrentToast(t);
        toastListeners.push(listener);
        return () => {
            toastListeners = toastListeners.filter(l => l !== listener);
        };
    }, []);

    if (!currentToast) return null;

    return (
        <Toast
            title={currentToast.title}
            description={currentToast.description}
            variant={currentToast.variant}
            onClose={() => setCurrentToast(null)}
        />
    );
}
