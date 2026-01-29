import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    // A list of all locales that are supported
    locales: ['de', 'tr'],

    // Used when no locale matches
    defaultLocale: 'de',

    // Don't add prefix for default locale (German)
    // /shops → German, /tr/shops → Turkish
    localePrefix: 'as-needed'
});

export type Locale = (typeof routing.locales)[number];
