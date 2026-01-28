import { Metadata } from 'next';
import PremiumShopsClient from './PremiumShopsClient';

export const metadata: Metadata = {
    title: 'Premium Partner | Bereket Market',
    description: 'Unsere Premium-Partner: Handverlesene Supermärkte mit erstklassigem Sortiment und Service.',
    openGraph: {
        title: 'Premium Partner | Bereket Market',
        description: 'Unsere Premium-Partner: Handverlesene Supermärkte mit erstklassigem Sortiment und Service.',
    }
}

export default function PremiumShopsPage() {
    return <PremiumShopsClient />
}
