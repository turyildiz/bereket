'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export default function LanguageSwitcher() {
    const t = useTranslations('languageSwitcher');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const switchLocale = (newLocale: string) => {
        if (newLocale === locale) return;

        startTransition(() => {
            // Remove current locale prefix if present
            let newPath = pathname;

            // If current path starts with /tr, remove it
            if (pathname.startsWith('/tr')) {
                newPath = pathname.replace(/^\/tr/, '') || '/';
            }

            // If switching to Turkish, add /tr prefix
            if (newLocale === 'tr') {
                newPath = `/tr${newPath === '/' ? '' : newPath}`;
            }

            router.push(newPath);
            router.refresh();
        });
    };

    const languages = [
        { code: 'de', label: t('german'), flag: '🇩🇪' },
        { code: 'tr', label: t('turkish'), flag: '🇹🇷' },
    ];

    return (
        <div className="flex items-center gap-1">
            {languages.map((lang, index) => (
                <div key={lang.code} className="flex items-center">
                    {index > 0 && (
                        <span className="mx-1 text-white/30">|</span>
                    )}
                    <button
                        onClick={() => switchLocale(lang.code)}
                        disabled={isPending}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                            locale === lang.code
                                ? 'bg-white/20 text-white'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                        } ${isPending ? 'opacity-50' : ''}`}
                    >
                        <span className="text-base">{lang.flag}</span>
                        <span className="hidden sm:inline">{lang.label}</span>
                    </button>
                </div>
            ))}
        </div>
    );
}
