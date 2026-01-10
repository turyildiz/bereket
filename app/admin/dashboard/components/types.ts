// Shared types for dashboard components

export type UserRole = 'superadmin' | 'admin' | 'user';

export interface Market {
    id: string;
    name: string;
    city: string;
    location: string;
    full_address: string;
    latitude: number | null;
    longitude: number | null;
    customer_phone: string | null;
    whatsapp_numbers: string[];
    header_url: string | null;
    logo_url: string | null;
    about_text: string | null;
    features: string[] | null;
    opening_hours: { day: string; time: string }[] | null;
    is_premium: boolean;
    created_at: string;
}

export interface TeamMember {
    id: string;
    email: string;
    role: UserRole;
    created_at: string;
}

export interface MarketFormData {
    name: string;
    city: string;
    full_address: string;
    latitude: string;
    longitude: string;
    customer_phone: string;
    whatsapp_numbers: string[];
    header_url: string;
    logo_url: string;
    about_text: string;
    features: string[];
    opening_hours: { day: string; time: string }[];
    is_premium: boolean;
}

export interface ToastState {
    message: string;
    type: 'success' | 'error';
}
