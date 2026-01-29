import { Metadata } from 'next';
import AllShopsClient from './ShopsClient';

export const metadata: Metadata = {
    title: 'Alle Märkte | Bereket Market',
    description: 'Finde türkische, arabische und persische Supermärkte in deiner Stadt. Vergleiche Öffnungszeiten, Angebote und Bewertungen.',
    openGraph: {
        title: 'Alle Märkte | Bereket Market',
        description: 'Finde türkische, arabische und persische Supermärkte in deiner Stadt. Vergleiche Öffnungszeiten, Angebote und Bewertungen.',
    }
}

export default function ShopsPage() {
    return <AllShopsClient />
}
