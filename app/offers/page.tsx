import { Metadata } from 'next';
import OffersClient from './OffersClient';

export const metadata: Metadata = {
    title: 'Alle Angebote | Bereket Market',
    description: 'Stöbere durch aktuelle Angebote von türkischen und orientalischen Supermärkten in deiner Nähe. Obst, Gemüse, Fleisch und mehr.',
    openGraph: {
        title: 'Alle Angebote | Bereket Market',
        description: 'Stöbere durch aktuelle Angebote von türkischen und orientalischen Supermärkten in deiner Nähe.',
    }
};

export default function OffersPage() {
    return <OffersClient />;
}
