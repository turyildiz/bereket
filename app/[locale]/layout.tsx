import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Playfair_Display, Outfit } from "next/font/google";
import LayoutWrapper from '../components/LayoutWrapper';
import '../globals.css';

const playfair = Playfair_Display({
    subsets: ["latin"],
    variable: '--font-playfair',
    display: 'swap',
});

const outfit = Outfit({
    subsets: ["latin"],
    variable: '--font-outfit',
    display: 'swap',
});

type Props = {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;

    // Ensure that the incoming `locale` is valid
    if (!routing.locales.includes(locale as 'de' | 'tr')) {
        notFound();
    }

    // Enable static rendering
    setRequestLocale(locale);

    // Providing all messages to the client
    const messages = await getMessages();

    return (
        <html lang={locale} className={`${playfair.variable} ${outfit.variable}`}>
            <body className="antialiased" style={{ fontFamily: 'var(--font-outfit)' }}>
                <NextIntlClientProvider messages={messages}>
                    <LayoutWrapper locale={locale}>
                        {children}
                    </LayoutWrapper>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
