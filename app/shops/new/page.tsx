import { Metadata } from 'next';
import NewShopsClient from './NewShopsClient';

export const metadata: Metadata = {
    title: 'Neue Märkte | Bereket Market',
    description: 'Entdecke die neuesten Supermärkte und Shops in der Bereket Community.',
    openGraph: {
        title: 'Neue Märkte | Bereket Market',
        description: 'Entdecke die neuesten Supermärkte und Shops in der Bereket Community.',
    }
}

export default function NewShopsPage() {
    return <NewShopsClient />
}
