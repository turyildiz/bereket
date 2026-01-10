'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// Role type definition
type UserRole = 'superadmin' | 'admin' | 'user';

interface Market {
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

interface TeamMember {
    id: string;
    email: string;
    role: UserRole;
    created_at: string;
}

interface DashboardClientProps {
    initialMarkets: Market[];
    userEmail: string;
    initialTotalCount: number;
    userRole: UserRole;
    userId: string;
    initialTeamMembers: TeamMember[];
}

const ITEMS_PER_PAGE = 15;

// Tab type for navigation
type DashboardTab = 'markets' | 'team';

export default function DashboardClient({
    initialMarkets,
    userEmail,
    initialTotalCount,
    userRole,
    userId,
    initialTeamMembers
}: DashboardClientProps) {
    const [markets, setMarkets] = useState<Market[]>(initialMarkets);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);

    // Tab navigation state
    const [activeTab, setActiveTab] = useState<DashboardTab>('markets');

    // Team management state (only for superadmin)
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
    const [promoteEmail, setPromoteEmail] = useState('');
    const [promotingUser, setPromotingUser] = useState(false);
    const [demoteConfirm, setDemoteConfirm] = useState<string | null>(null);

    // Search and Pagination state
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [searchLoading, setSearchLoading] = useState(false);

    // Edit mode state
    const [editingMarket, setEditingMarket] = useState<Market | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        city: '',
        full_address: '',
        latitude: '',
        longitude: '',
        customer_phone: '',
        whatsapp_numbers: [''],
        header_url: '',
        logo_url: '',
        about_text: '',
        features: [''],
        opening_hours: [{ day: '', time: '' }],
        is_premium: false,
    });

    // File upload state
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [headerFile, setHeaderFile] = useState<File | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingHeader, setUploadingHeader] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const headerInputRef = useRef<HTMLInputElement>(null);

    // Toast notification state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Seed confirmation state
    const [showSeedConfirm, setShowSeedConfirm] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    // Auto-hide toast after 3 seconds
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            setCurrentPage(1); // Reset to first page on new search
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch markets with search and pagination
    const fetchMarkets = useCallback(async (query: string, page: number) => {
        setSearchLoading(true);

        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE - 1;

        try {
            let dataQuery = supabase
                .from('markets')
                .select('*', { count: 'exact' });

            // Apply search filter using ilike for fuzzy matching
            // Note: For pg_trgm, you would need to set up a database function
            // Here we use ilike which works well for most cases
            if (query.trim()) {
                dataQuery = dataQuery.or(`name.ilike.%${query}%,city.ilike.%${query}%`);
            }

            // Order by premium first, then by created_at
            dataQuery = dataQuery
                .order('is_premium', { ascending: false })
                .order('created_at', { ascending: false })
                .range(start, end);

            const { data, error, count } = await dataQuery;

            if (error) {
                console.error('Error fetching markets:', error);
                showToast('Fehler beim Laden der Märkte: ' + error.message, 'error');
            } else {
                setMarkets(data || []);
                setTotalCount(count || 0);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setSearchLoading(false);
        }
    }, [supabase]);

    // Track if initial load has been done
    const isInitialMount = useRef(true);

    // Fetch markets when debounced query or page changes
    useEffect(() => {
        // Skip the first render since we have initial data from server
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        fetchMarkets(debouncedQuery, currentPage);
    }, [debouncedQuery, currentPage, fetchMarkets]);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    // Pagination handlers
    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const goToPreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
        setDebouncedQuery('');
        setCurrentPage(1);
    };

    // Team Management Functions (Superadmin only)
    const handlePromoteToAdmin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!promoteEmail.trim()) {
            showToast('Bitte geben Sie eine E-Mail-Adresse ein.', 'error');
            return;
        }

        setPromotingUser(true);

        // First, find the user by email
        const { data: existingUser, error: findError } = await supabase
            .from('profiles')
            .select('id, email, role, is_admin')
            .eq('email', promoteEmail.trim().toLowerCase())
            .single();

        if (findError || !existingUser) {
            showToast('Benutzer mit dieser E-Mail nicht gefunden.', 'error');
            setPromotingUser(false);
            return;
        }

        if (existingUser.is_admin && existingUser.role === 'admin') {
            showToast('Dieser Benutzer ist bereits ein Admin.', 'error');
            setPromotingUser(false);
            return;
        }

        if (existingUser.role === 'superadmin') {
            showToast('Dieser Benutzer ist bereits ein Superadmin.', 'error');
            setPromotingUser(false);
            return;
        }

        // Update the user to admin role
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ is_admin: true, role: 'admin' })
            .eq('id', existingUser.id);

        if (updateError) {
            showToast('Fehler beim Hochstufen: ' + updateError.message, 'error');
            setPromotingUser(false);
            return;
        }

        // Add to local team members list
        const newMember: TeamMember = {
            id: existingUser.id,
            email: existingUser.email,
            role: 'admin',
            created_at: new Date().toISOString()
        };
        setTeamMembers(prev => [...prev, newMember]);
        setPromoteEmail('');
        showToast('✅ Benutzer erfolgreich zum Admin hochgestuft!', 'success');
        setPromotingUser(false);
    };

    const handleDemoteAdmin = async (memberId: string) => {
        if (memberId === userId) {
            showToast('Sie können sich nicht selbst herabstufen.', 'error');
            setDemoteConfirm(null);
            return;
        }

        const member = teamMembers.find(m => m.id === memberId);
        if (member?.role === 'superadmin') {
            showToast('Superadmins können nicht herabgestuft werden.', 'error');
            setDemoteConfirm(null);
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ is_admin: false, role: 'user' })
            .eq('id', memberId);

        if (error) {
            showToast('Fehler beim Herabstufen: ' + error.message, 'error');
        } else {
            setTeamMembers(prev => prev.filter(m => m.id !== memberId));
            showToast('✅ Admin-Rechte erfolgreich entzogen.', 'success');
        }
        setDemoteConfirm(null);
    };

    const handlePromoteToSuperadmin = async (memberId: string) => {
        if (memberId === userId) {
            showToast('Sie sind bereits Superadmin.', 'error');
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ role: 'superadmin' })
            .eq('id', memberId);

        if (error) {
            showToast('Fehler beim Hochstufen: ' + error.message, 'error');
        } else {
            setTeamMembers(prev =>
                prev.map(m => m.id === memberId ? { ...m, role: 'superadmin' as UserRole } : m)
            );
            showToast('✅ Benutzer zum Superadmin hochgestuft!', 'success');
        }
    };

    // Refresh team members list
    const refreshTeamMembers = async () => {
        const { data: team } = await supabase
            .from('profiles')
            .select('id, email, role, created_at')
            .eq('is_admin', true)
            .order('role', { ascending: false })
            .order('created_at', { ascending: false });

        if (team) {
            setTeamMembers(team as TeamMember[]);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handleAddWhatsApp = () => {
        setFormData(prev => ({
            ...prev,
            whatsapp_numbers: [...prev.whatsapp_numbers, '']
        }));
    };

    const handleRemoveWhatsApp = (index: number) => {
        setFormData(prev => ({
            ...prev,
            whatsapp_numbers: prev.whatsapp_numbers.filter((_, i) => i !== index)
        }));
    };

    const handleWhatsAppChange = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            whatsapp_numbers: prev.whatsapp_numbers.map((num, i) => i === index ? value : num)
        }));
    };

    // Features handlers
    const handleAddFeature = () => {
        setFormData(prev => ({
            ...prev,
            features: [...prev.features, '']
        }));
    };

    const handleRemoveFeature = (index: number) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };

    const handleFeatureChange = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.map((feat, i) => i === index ? value : feat)
        }));
    };

    // Opening Hours handlers
    const handleAddOpeningHour = () => {
        setFormData(prev => ({
            ...prev,
            opening_hours: [...prev.opening_hours, { day: '', time: '' }]
        }));
    };

    const handleRemoveOpeningHour = (index: number) => {
        setFormData(prev => ({
            ...prev,
            opening_hours: prev.opening_hours.filter((_, i) => i !== index)
        }));
    };

    const handleOpeningHourChange = (index: number, field: 'day' | 'time', value: string) => {
        setFormData(prev => ({
            ...prev,
            opening_hours: prev.opening_hours.map((hour, i) =>
                i === index ? { ...hour, [field]: value } : hour
            )
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const filteredNumbers = formData.whatsapp_numbers.filter(num => num.trim() !== '');
        const filteredFeatures = formData.features.filter(feat => feat.trim() !== '');
        const filteredOpeningHours = formData.opening_hours.filter(hour => hour.day.trim() !== '' && hour.time.trim() !== '');

        // Handle file uploads if files are selected
        let finalLogoUrl = formData.logo_url || null;
        let finalHeaderUrl = formData.header_url || null;

        if (logoFile) {
            setUploadingLogo(true);
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('market-assets')
                .upload(fileName, logoFile);

            if (uploadError) {
                showToast('Fehler beim Logo-Upload: ' + uploadError.message, 'error');
                setLoading(false);
                setUploadingLogo(false);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('market-assets')
                .getPublicUrl(uploadData.path);
            finalLogoUrl = publicUrlData.publicUrl;
            setUploadingLogo(false);
        }

        if (headerFile) {
            setUploadingHeader(true);
            const fileExt = headerFile.name.split('.').pop();
            const fileName = `header-${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('market-assets')
                .upload(fileName, headerFile);

            if (uploadError) {
                showToast('Fehler beim Header-Upload: ' + uploadError.message, 'error');
                setLoading(false);
                setUploadingHeader(false);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('market-assets')
                .getPublicUrl(uploadData.path);
            finalHeaderUrl = publicUrlData.publicUrl;
            setUploadingHeader(false);
        }

        // Prepare market data
        const marketData = {
            name: formData.name,
            city: formData.city,
            location: formData.full_address,
            full_address: formData.full_address,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            customer_phone: formData.customer_phone || null,
            whatsapp_numbers: filteredNumbers,
            header_url: finalHeaderUrl,
            logo_url: finalLogoUrl,
            about_text: formData.about_text || null,
            features: filteredFeatures.length > 0 ? filteredFeatures : null,
            opening_hours: filteredOpeningHours.length > 0 ? filteredOpeningHours : null,
            is_premium: formData.is_premium,
        };

        // Check if editing or creating
        if (editingMarket) {
            // UPDATE existing market
            const { error } = await supabase
                .from('markets')
                .update(marketData)
                .eq('id', editingMarket.id)
                .select()
                .single();

            if (error) {
                showToast('Fehler beim Speichern: ' + error.message, 'error');
            } else {
                // Refresh the markets list
                await fetchMarkets(debouncedQuery, currentPage);
                resetForm();
                showToast('✅ Änderungen erfolgreich gespeichert!', 'success');
            }
        } else {
            // INSERT new market
            const { error } = await supabase
                .from('markets')
                .insert(marketData)
                .select()
                .single();

            if (error) {
                showToast('Fehler beim Erstellen: ' + error.message, 'error');
            } else {
                // Refresh the markets list and go to first page
                setCurrentPage(1);
                await fetchMarkets(debouncedQuery, 1);
                resetForm();
                showToast('✅ Markt erfolgreich erstellt!', 'success');
            }
        }
        setLoading(false);
    };

    // Reset form helper
    const resetForm = () => {
        setFormData({
            name: '',
            city: '',
            full_address: '',
            latitude: '',
            longitude: '',
            customer_phone: '',
            whatsapp_numbers: [''],
            header_url: '',
            logo_url: '',
            about_text: '',
            features: [''],
            opening_hours: [{ day: '', time: '' }],
            is_premium: false,
        });
        setLogoFile(null);
        setHeaderFile(null);
        setEditingMarket(null);
        setShowCreateForm(false);
    };

    // Handle edit button click
    const handleEditMarket = (market: Market) => {
        setEditingMarket(market);
        setFormData({
            name: market.name,
            city: market.city || '',
            full_address: market.full_address || '',
            latitude: market.latitude?.toString() || '',
            longitude: market.longitude?.toString() || '',
            customer_phone: market.customer_phone || '',
            whatsapp_numbers: market.whatsapp_numbers?.length > 0 ? market.whatsapp_numbers : [''],
            header_url: market.header_url || '',
            logo_url: market.logo_url || '',
            about_text: market.about_text || '',
            features: market.features?.length ? market.features : [''],
            opening_hours: market.opening_hours?.length ? market.opening_hours : [{ day: '', time: '' }],
            is_premium: market.is_premium || false,
        });
        setLogoFile(null);
        setHeaderFile(null);
        setShowCreateForm(true);
    };

    const handleDeleteMarket = async (id: string) => {
        const { error } = await supabase
            .from('markets')
            .delete()
            .eq('id', id);

        if (error) {
            showToast('Fehler beim Löschen: ' + error.message, 'error');
        } else {
            // Refresh the markets list
            await fetchMarkets(debouncedQuery, currentPage);
            showToast('✅ Markt erfolgreich gelöscht!', 'success');
        }
        setDeleteConfirm(null);
    };

    const handleSeedData = async () => {
        setShowSeedConfirm(false);
        setSeeding(true);

        // 6 Sample Markets with all complete field mappings
        const sampleMarkets = [
            {
                name: 'Yildiz Market',
                city: 'Frankfurt',
                location: 'Musterstraße 123, 60311 Frankfurt',
                full_address: 'Musterstraße 123, 60311 Frankfurt',
                latitude: 50.1109,
                longitude: 8.6821,
                customer_phone: '+49 69 12345678',
                whatsapp_numbers: ['+49 151 12345678', '+49 151 87654321'],
                logo_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
                header_url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&h=400&fit=crop',
                about_text: 'Willkommen bei Yildiz Market! Seit über 20 Jahren versorgen wir unsere Kunden mit frischen Lebensmitteln aus der Türkei.',
                features: ['Halal-zertifiziert', 'Frische Backwaren täglich', 'Parkmöglichkeit'],
                opening_hours: [
                    { day: 'Montag - Freitag', time: '08:00 - 20:00' },
                    { day: 'Samstag', time: '08:00 - 18:00' },
                    { day: 'Sonntag', time: 'Geschlossen' }
                ],
                is_premium: true
            },
            {
                name: 'Bereket Feinkost',
                city: 'Berlin',
                location: 'Kottbusser Damm 78, 10967 Berlin',
                full_address: 'Kottbusser Damm 78, 10967 Berlin',
                latitude: 52.4934,
                longitude: 13.4184,
                customer_phone: '+49 30 11223344',
                whatsapp_numbers: ['+49 152 11223344'],
                logo_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=200&h=200&fit=crop',
                header_url: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1200&h=400&fit=crop',
                about_text: 'Bereket Feinkost bietet authentische orientalische Spezialitäten im Herzen von Kreuzberg.',
                features: ['Bio-Produkte', 'Lieferservice', 'Großhandel möglich'],
                opening_hours: [
                    { day: 'Montag - Samstag', time: '07:00 - 21:00' },
                    { day: 'Sonntag', time: '09:00 - 18:00' }
                ],
                is_premium: true
            },
            {
                name: 'Istanbul Supermarkt',
                city: 'München',
                location: 'Goethestraße 15, 80336 München',
                full_address: 'Goethestraße 15, 80336 München',
                latitude: 48.1351,
                longitude: 11.5820,
                customer_phone: '+49 89 55667788',
                whatsapp_numbers: ['+49 153 55667788', '+49 153 99887766'],
                logo_url: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=200&h=200&fit=crop',
                header_url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=1200&h=400&fit=crop',
                about_text: 'Der größte türkische Supermarkt in München mit über 5000 Produkten.',
                features: ['Halal-Fleischtheke', 'Frisches Gemüse', 'Türkische Süßwaren', 'Parkhaus'],
                opening_hours: [
                    { day: 'Montag - Freitag', time: '08:00 - 20:00' },
                    { day: 'Samstag', time: '08:00 - 18:00' },
                    { day: 'Sonntag', time: 'Geschlossen' }
                ],
                is_premium: true
            },
            {
                name: 'Anatolien Markt',
                city: 'Hamburg',
                location: 'Steindamm 63, 20099 Hamburg',
                full_address: 'Steindamm 63, 20099 Hamburg',
                latitude: 53.5511,
                longitude: 10.0006,
                customer_phone: '+49 40 44556677',
                whatsapp_numbers: ['+49 154 44556677'],
                logo_url: 'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=200&h=200&fit=crop',
                header_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=400&fit=crop',
                about_text: 'Familienbetrieb seit 1995. Wir bringen den Geschmack Anatoliens nach Hamburg.',
                features: ['Täglich frisches Brot', 'Oliven-Bar', 'Käse-Spezialitäten'],
                opening_hours: [
                    { day: 'Montag - Samstag', time: '07:30 - 20:00' },
                    { day: 'Sonntag', time: '10:00 - 16:00' }
                ],
                is_premium: false
            },
            {
                name: 'Özlem Lebensmittel',
                city: 'Köln',
                location: 'Keupstraße 28, 51063 Köln',
                full_address: 'Keupstraße 28, 51063 Köln',
                latitude: 50.9375,
                longitude: 6.9603,
                customer_phone: '+49 221 33445566',
                whatsapp_numbers: ['+49 155 33445566', '+49 155 77889900'],
                logo_url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop',
                header_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=400&fit=crop',
                about_text: 'In der berühmten Keupstraße gelegen - das Herz der türkischen Kultur in Köln.',
                features: ['Sucuk-Spezialitäten', 'Gewürze aus aller Welt', 'Café-Ecke'],
                opening_hours: [
                    { day: 'Montag - Freitag', time: '09:00 - 19:00' },
                    { day: 'Samstag', time: '09:00 - 17:00' },
                    { day: 'Sonntag', time: 'Geschlossen' }
                ],
                is_premium: false
            },
            {
                name: 'Sultan Basar',
                city: 'Stuttgart',
                location: 'Marienstraße 12, 70178 Stuttgart',
                full_address: 'Marienstraße 12, 70178 Stuttgart',
                latitude: 48.7758,
                longitude: 9.1829,
                customer_phone: '+49 711 22334455',
                whatsapp_numbers: ['+49 156 22334455'],
                logo_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=200&h=200&fit=crop',
                header_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=400&fit=crop',
                about_text: 'Ihr Basar für orientalische Köstlichkeiten in Stuttgart.',
                features: ['Baklava-Manufaktur', 'Tee-Auswahl', 'Geschenkkörbe'],
                opening_hours: [
                    { day: 'Montag - Samstag', time: '08:00 - 19:00' },
                    { day: 'Sonntag', time: 'Geschlossen' }
                ],
                is_premium: false
            }
        ];

        // Insert all 6 Markets
        const { data: insertedMarkets, error: marketError } = await supabase
            .from('markets')
            .insert(sampleMarkets)
            .select();

        if (marketError) {
            showToast('Fehler beim Einfügen der Märkte: ' + marketError.message, 'error');
            setSeeding(false);
            return;
        }

        if (!insertedMarkets || insertedMarkets.length === 0) {
            showToast('Keine Märkte wurden eingefügt.', 'error');
            setSeeding(false);
            return;
        }

        // Create 9 offers (3 per first 3 markets)
        const sampleOffers = [
            { market_id: insertedMarkets[0].id, product_name: 'Frische Granatäpfel', price: '1.49€', original_price: '2.49€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop' },
            { market_id: insertedMarkets[0].id, product_name: 'Türkischer Honig', price: '8.99€', original_price: '12.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop' },
            { market_id: insertedMarkets[0].id, product_name: 'Fladenbrot 3er Pack', price: '1.99€', original_price: '2.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop' },
            { market_id: insertedMarkets[1].id, product_name: 'Sucuk 500g', price: '5.99€', original_price: '7.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop' },
            { market_id: insertedMarkets[1].id, product_name: 'Weißer Käse', price: '4.49€', original_price: '5.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop' },
            { market_id: insertedMarkets[1].id, product_name: 'Oliven Mix 1kg', price: '6.99€', original_price: '9.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb5?w=400&h=300&fit=crop' },
            { market_id: insertedMarkets[2].id, product_name: 'Baklava 1kg', price: '12.99€', original_price: '18.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400&h=300&fit=crop' },
            { market_id: insertedMarkets[2].id, product_name: 'Ayran 10er Pack', price: '3.99€', original_price: '5.49€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop' },
            { market_id: insertedMarkets[2].id, product_name: 'Gewürzmischung Köfte', price: '2.99€', original_price: '4.49€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop' },
        ];

        const { error: offerError } = await supabase
            .from('offers')
            .insert(sampleOffers);

        if (offerError) {
            showToast('Märkte erstellt, aber Fehler bei Angeboten: ' + offerError.message, 'error');
        } else {
            showToast('✅ Erfolgreich: 6 Märkte und 9 Angebote eingefügt!', 'success');
        }

        // Refresh markets list
        setCurrentPage(1);
        await fetchMarkets(debouncedQuery, 1);
        setSeeding(false);
    };

    return (
        <div className="min-h-screen" style={{ background: 'var(--gradient-earth)' }}>
            {/* Toast Notification - Styled with mint and cardamom */}
            {toast && (
                <div
                    className="fixed top-4 right-4 z-[100]"
                    style={{
                        animation: 'slideInRight 0.3s ease-out'
                    }}
                >
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
                        <button
                            onClick={() => setToast(null)}
                            className="ml-auto p-1 rounded hover:opacity-70 transition-opacity cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="var(--warm-gray)" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Seed Data Confirmation Modal */}
            {showSeedConfirm && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(44, 40, 35, 0.6)' }}>
                    <div className="glass-card p-6 max-w-md w-full animate-scale-in">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(107, 142, 122, 0.15)' }}>
                                <svg className="w-6 h-6" fill="none" stroke="var(--cardamom)" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    Beispieldaten einfügen?
                                </h3>
                                <p className="text-sm mb-4" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                    Es werden 6 Beispiel-Märkte mit vollständigem Profil und 9 Angebote in die Datenbank eingefügt.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowSeedConfirm(false)}
                                        className="flex-1 py-2.5 rounded-xl font-semibold transition-all hover:opacity-70 cursor-pointer"
                                        style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                    >
                                        Abbrechen
                                    </button>
                                    <button
                                        onClick={handleSeedData}
                                        className="flex-1 btn-primary py-2.5 cursor-pointer"
                                        style={{ fontFamily: 'var(--font-outfit)' }}
                                    >
                                        Einfügen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: 'rgba(250, 247, 242, 0.9)', borderColor: 'var(--sand)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl" style={{ background: 'var(--gradient-warm)' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="font-bold text-lg" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    Admin Dashboard
                                </h1>
                                <p className="text-xs" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                    Bereket Market
                                </p>
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--sand)' }}>
                                {/* Role Badge */}
                                <span
                                    className="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                                    style={{
                                        background: userRole === 'superadmin' ? 'var(--saffron)' : 'var(--warm-gray)',
                                        color: 'white',
                                        fontFamily: 'var(--font-outfit)',
                                        letterSpacing: '0.05em'
                                    }}
                                >
                                    {userRole === 'superadmin' ? 'Superadmin' : 'Admin'}
                                </span>
                                <span className="text-sm font-medium" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>{userEmail}</span>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 cursor-pointer"
                                style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)', fontFamily: 'var(--font-outfit)' }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span className="hidden sm:inline">Abmelden</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tab Navigation - Only show if superadmin */}
            {userRole === 'superadmin' && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('markets')}
                            className="px-5 py-2.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-2"
                            style={{
                                background: activeTab === 'markets' ? 'var(--gradient-warm)' : 'var(--glass-bg)',
                                color: activeTab === 'markets' ? 'white' : 'var(--charcoal)',
                                fontFamily: 'var(--font-outfit)',
                                border: activeTab === 'markets' ? 'none' : '1px solid var(--glass-border)'
                            }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Market Manager
                        </button>
                        <button
                            onClick={() => setActiveTab('team')}
                            className="px-5 py-2.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-2"
                            style={{
                                background: activeTab === 'team' ? 'var(--gradient-warm)' : 'var(--glass-bg)',
                                color: activeTab === 'team' ? 'white' : 'var(--charcoal)',
                                fontFamily: 'var(--font-outfit)',
                                border: activeTab === 'team' ? 'none' : '1px solid var(--glass-border)'
                            }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Team Verwaltung
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Market Manager Tab Content */}
                {activeTab === 'markets' && (
                    <>
                        {/* Page Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    Market Manager
                                </h2>
                                <p style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                    {totalCount} {totalCount === 1 ? 'Markt' : 'Märkte'} registriert
                                    {debouncedQuery && ` • Suche: "${debouncedQuery}"`}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                        {/* Seed Sample Data Button */}
                        <button
                            onClick={() => setShowSeedConfirm(true)}
                            disabled={seeding}
                            className="glass-card px-5 py-3 flex items-center gap-2 text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                            style={{ color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}
                        >
                            {seeding ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Wird geladen...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                    </svg>
                                    <span>Seed Sample Data</span>
                                </>
                            )}
                        </button>

                        {/* Create New Market Button */}
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="btn-primary px-6 py-3 flex items-center gap-2 cursor-pointer"
                            style={{ fontFamily: 'var(--font-outfit)' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Neuen Markt erstellen</span>
                        </button>
                    </div>
                </div>

                {/* Search Bar - Saffron-bordered */}
                <div className="mb-8">
                    <div
                        className="relative glass-card overflow-hidden"
                        style={{
                            border: '2px solid var(--saffron)',
                            boxShadow: '0 0 20px rgba(230, 168, 69, 0.15)'
                        }}
                    >
                        <div className="flex items-center">
                            {/* Search Icon */}
                            <div className="pl-5 pr-3">
                                {searchLoading ? (
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--saffron)' }}>
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--saffron)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                )}
                            </div>

                            {/* Search Input */}
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Nach Marktname oder Stadt suchen..."
                                className="flex-1 py-4 pr-4 bg-transparent outline-none"
                                style={{
                                    color: 'var(--charcoal)',
                                    fontFamily: 'var(--font-outfit)',
                                    fontSize: '16px'
                                }}
                            />

                            {/* Clear Button */}
                            {searchQuery && (
                                <button
                                    onClick={clearSearch}
                                    className="px-4 py-2 mr-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 cursor-pointer flex items-center gap-2"
                                    style={{
                                        background: 'rgba(230, 168, 69, 0.1)',
                                        color: 'var(--saffron-dark)',
                                        fontFamily: 'var(--font-outfit)'
                                    }}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Löschen
                                </button>
                            )}
                        </div>

                        {/* Saffron accent line at bottom */}
                        <div
                            className="absolute bottom-0 left-0 right-0 h-0.5"
                            style={{ background: 'var(--gradient-warm)' }}
                        />
                    </div>
                </div>

                {/* Create/Edit Form Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(44, 40, 35, 0.6)' }}>
                        <div className="glass-card w-full max-w-3xl p-6 sm:p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    {editingMarket ? 'Markt bearbeiten' : 'Neuen Markt erstellen'}
                                </h3>
                                <button
                                    onClick={resetForm}
                                    className="p-2 rounded-xl hover:opacity-70 transition-opacity cursor-pointer hover:bg-opacity-80"
                                    style={{ background: 'var(--sand)' }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--charcoal)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Market Name */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Marktname *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="z.B. Istanbul Supermarkt"
                                        required
                                        className="w-full px-4 py-3 rounded-xl transition-all"
                                        style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                    />
                                </div>

                                {/* City */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Stadt *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                        placeholder="z.B. Frankfurt"
                                        required
                                        className="w-full px-4 py-3 rounded-xl transition-all"
                                        style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                    />
                                </div>

                                {/* Full Address */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Vollständige Adresse *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.full_address}
                                        onChange={(e) => setFormData(prev => ({ ...prev, full_address: e.target.value }))}
                                        placeholder="z.B. Musterstraße 123, 60311 Frankfurt"
                                        required
                                        className="w-full px-4 py-3 rounded-xl transition-all"
                                        style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                    />
                                </div>

                                {/* Latitude & Longitude - 2 Column Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                            Breitengrad (Latitude)
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.latitude}
                                            onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                                            placeholder="z.B. 50.1109"
                                            className="w-full px-4 py-3 rounded-xl transition-all"
                                            style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                        />
                                        <p className="text-xs mt-1" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                            Für Kartenanzeige
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                            Längengrad (Longitude)
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.longitude}
                                            onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                                            placeholder="z.B. 8.6821"
                                            className="w-full px-4 py-3 rounded-xl transition-all"
                                            style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                        />
                                        <p className="text-xs mt-1" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                            Für Kartenanzeige
                                        </p>
                                    </div>
                                </div>

                                {/* Premium Partner Toggle */}
                                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: formData.is_premium ? 'rgba(232, 170, 66, 0.1)' : 'var(--sand)' }}>
                                    <div>
                                        <label className="block text-sm font-semibold" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                            Premium Partner
                                        </label>
                                        <p className="text-xs" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                            Premium-Badge und bevorzugte Anzeige
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, is_premium: !prev.is_premium }))}
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 cursor-pointer`}
                                        style={{
                                            background: formData.is_premium ? 'var(--saffron)' : 'var(--warm-gray)'
                                        }}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${formData.is_premium ? 'translate-x-6' : 'translate-x-1'}`}
                                        />
                                    </button>
                                </div>

                                {/* Customer Contact Phone */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Kunden-Telefon
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.customer_phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                                        placeholder="+49 69 12345678"
                                        className="w-full px-4 py-3 rounded-xl transition-all"
                                        style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                    />
                                    <p className="text-xs mt-1" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        Separate Kontaktnummer für Kunden
                                    </p>
                                </div>

                                {/* About Text */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Über uns
                                    </label>
                                    <textarea
                                        value={formData.about_text}
                                        onChange={(e) => setFormData(prev => ({ ...prev, about_text: e.target.value }))}
                                        placeholder="Beschreiben Sie Ihren Markt..."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl transition-all resize-none"
                                        style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                    />
                                </div>

                                {/* Features */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Features / Besonderheiten
                                    </label>
                                    <div className="space-y-2">
                                        {formData.features.map((feat, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={feat}
                                                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                                                    placeholder="z.B. Frische Backwaren, Halal-Produkte"
                                                    className="flex-1 px-4 py-3 rounded-xl transition-all"
                                                    style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                                />
                                                {formData.features.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFeature(index)}
                                                        className="p-3 rounded-xl hover:opacity-70 transition-opacity cursor-pointer"
                                                        style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)' }}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddFeature}
                                        className="mt-2 flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-70 cursor-pointer"
                                        style={{ color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Weitere Feature hinzufügen
                                    </button>
                                </div>

                                {/* Opening Hours */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Öffnungszeiten
                                    </label>
                                    <div className="space-y-2">
                                        {formData.opening_hours.map((hour, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={hour.day}
                                                    onChange={(e) => handleOpeningHourChange(index, 'day', e.target.value)}
                                                    placeholder="z.B. Montag-Freitag"
                                                    className="flex-1 px-4 py-3 rounded-xl transition-all"
                                                    style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                                />
                                                <input
                                                    type="text"
                                                    value={hour.time}
                                                    onChange={(e) => handleOpeningHourChange(index, 'time', e.target.value)}
                                                    placeholder="08:00 - 20:00"
                                                    className="flex-1 px-4 py-3 rounded-xl transition-all"
                                                    style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                                />
                                                {formData.opening_hours.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveOpeningHour(index)}
                                                        className="p-3 rounded-xl hover:opacity-70 transition-opacity cursor-pointer"
                                                        style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)' }}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddOpeningHour}
                                        className="mt-2 flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-70 cursor-pointer"
                                        style={{ color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Weitere Öffnungszeit hinzufügen
                                    </button>
                                </div>

                                {/* WhatsApp Numbers */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        WhatsApp Nummern
                                    </label>
                                    <div className="space-y-2">
                                        {formData.whatsapp_numbers.map((num, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={num}
                                                    onChange={(e) => handleWhatsAppChange(index, e.target.value)}
                                                    placeholder="+49 123 456789"
                                                    className="flex-1 px-4 py-3 rounded-xl transition-all"
                                                    style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                                />
                                                {formData.whatsapp_numbers.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveWhatsApp(index)}
                                                        className="p-3 rounded-xl hover:opacity-70 transition-opacity cursor-pointer"
                                                        style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)' }}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddWhatsApp}
                                        className="mt-2 flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-70 cursor-pointer"
                                        style={{ color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Weitere Nummer hinzufügen
                                    </button>
                                </div>

                                {/* Header Image - URL or Upload */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Header Bild
                                    </label>
                                    <div className="space-y-3">
                                        {/* URL Input */}
                                        <div>
                                            <p className="text-xs mb-1" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>URL eingeben:</p>
                                            <input
                                                type="url"
                                                value={formData.header_url}
                                                onChange={(e) => {
                                                    setFormData(prev => ({ ...prev, header_url: e.target.value }));
                                                    setHeaderFile(null);
                                                }}
                                                placeholder="https://example.com/header.jpg"
                                                className="w-full px-4 py-3 rounded-xl transition-all"
                                                style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                                disabled={!!headerFile}
                                            />
                                        </div>
                                        <div className="text-center text-xs" style={{ color: 'var(--warm-gray)' }}>oder</div>
                                        {/* File Upload */}
                                        <div>
                                            <input
                                                ref={headerInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        setHeaderFile(e.target.files[0]);
                                                        setFormData(prev => ({ ...prev, header_url: '' }));
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => headerInputRef.current?.click()}
                                                className="w-full px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                style={{
                                                    background: headerFile ? 'rgba(107, 142, 122, 0.1)' : 'white',
                                                    border: `2px dashed ${headerFile ? 'var(--cardamom)' : 'var(--sand)'}`,
                                                    color: headerFile ? 'var(--cardamom)' : 'var(--warm-gray)',
                                                    fontFamily: 'var(--font-outfit)'
                                                }}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {headerFile ? headerFile.name : 'Datei hochladen'}
                                            </button>
                                            {headerFile && (
                                                <button
                                                    type="button"
                                                    onClick={() => setHeaderFile(null)}
                                                    className="text-xs mt-1 hover:opacity-70 cursor-pointer"
                                                    style={{ color: 'var(--terracotta)' }}
                                                >
                                                    Datei entfernen
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs mt-2" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        Optional - Banner-Bild für die Shop-Seite (empfohlen: 1200x400px)
                                    </p>
                                </div>

                                {/* Logo Image - URL or Upload */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Logo
                                    </label>
                                    <div className="space-y-3">
                                        {/* URL Input */}
                                        <div>
                                            <p className="text-xs mb-1" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>URL eingeben:</p>
                                            <input
                                                type="url"
                                                value={formData.logo_url}
                                                onChange={(e) => {
                                                    setFormData(prev => ({ ...prev, logo_url: e.target.value }));
                                                    setLogoFile(null);
                                                }}
                                                placeholder="https://example.com/logo.png"
                                                className="w-full px-4 py-3 rounded-xl transition-all"
                                                style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                                disabled={!!logoFile}
                                            />
                                        </div>
                                        <div className="text-center text-xs" style={{ color: 'var(--warm-gray)' }}>oder</div>
                                        {/* File Upload */}
                                        <div>
                                            <input
                                                ref={logoInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        setLogoFile(e.target.files[0]);
                                                        setFormData(prev => ({ ...prev, logo_url: '' }));
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => logoInputRef.current?.click()}
                                                className="w-full px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                style={{
                                                    background: logoFile ? 'rgba(107, 142, 122, 0.1)' : 'white',
                                                    border: `2px dashed ${logoFile ? 'var(--cardamom)' : 'var(--sand)'}`,
                                                    color: logoFile ? 'var(--cardamom)' : 'var(--warm-gray)',
                                                    fontFamily: 'var(--font-outfit)'
                                                }}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {logoFile ? logoFile.name : 'Datei hochladen'}
                                            </button>
                                            {logoFile && (
                                                <button
                                                    type="button"
                                                    onClick={() => setLogoFile(null)}
                                                    className="text-xs mt-1 hover:opacity-70 cursor-pointer"
                                                    style={{ color: 'var(--terracotta)' }}
                                                >
                                                    Datei entfernen
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs mt-2" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        Optional - Logo des Marktes (empfohlen: 200x200px)
                                    </p>
                                </div>

                                {/* Submit Button */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 py-3 rounded-xl font-semibold transition-all hover:opacity-70 cursor-pointer"
                                        style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                    >
                                        Abbrechen
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                                        style={{ fontFamily: 'var(--font-outfit)' }}
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                <span>{editingMarket ? 'Wird gespeichert...' : 'Wird erstellt...'}</span>
                                            </>
                                        ) : (
                                            <span>{editingMarket ? 'Änderungen speichern' : 'Markt erstellen'}</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Markets Grid - Glass Card Style */}
                {markets.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        {debouncedQuery ? (
                            // No search results state
                            <>
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(230, 168, 69, 0.1)' }}>
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--saffron)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    Keine Märkte gefunden
                                </h3>
                                <p className="mb-6" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                    Keine Ergebnisse für &ldquo;{debouncedQuery}&rdquo;. Versuchen Sie einen anderen Suchbegriff.
                                </p>
                                <button
                                    onClick={clearSearch}
                                    className="px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-80 cursor-pointer inline-flex items-center gap-2"
                                    style={{
                                        background: 'rgba(230, 168, 69, 0.1)',
                                        color: 'var(--saffron-dark)',
                                        fontFamily: 'var(--font-outfit)'
                                    }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Suche zurücksetzen</span>
                                </button>
                            </>
                        ) : (
                            // No markets at all state
                            <>
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--sand)' }}>
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--warm-gray)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    Keine Märkte vorhanden
                                </h3>
                                <p className="mb-6" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                    Erstellen Sie Ihren ersten Markt, um loszulegen.
                                </p>
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="btn-primary px-6 py-3 inline-flex items-center gap-2 cursor-pointer"
                                    style={{ fontFamily: 'var(--font-outfit)' }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>Ersten Markt erstellen</span>
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {markets.map((market) => (
                            <div key={market.id} className="glass-card hover-lift overflow-hidden">
                                {/* Card Header */}
                                <div className="h-24 relative" style={{ background: 'var(--gradient-warm)' }}>
                                    {market.header_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={market.header_url}
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    )}
                                    {/* Logo Badge */}
                                    <div className="absolute -bottom-6 left-4">
                                        <div
                                            className="w-14 h-14 rounded-xl shadow-lg flex items-center justify-center overflow-hidden"
                                            style={{ background: 'white', border: '3px solid white' }}
                                        >
                                            {market.logo_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={market.logo_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--saffron)' }}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 pt-8">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-lg font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                            {market.name}
                                        </h4>
                                        {market.is_premium && (
                                            <span
                                                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                                style={{
                                                    background: 'linear-gradient(135deg, var(--saffron), #d4a12a)',
                                                    color: 'white',
                                                    fontFamily: 'var(--font-outfit)'
                                                }}
                                            >
                                                ⭐ Premium
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-sm mb-4" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{market.full_address}</span>
                                    </div>

                                    {/* WhatsApp Numbers */}
                                    {market.whatsapp_numbers && market.whatsapp_numbers.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                                WhatsApp ({market.whatsapp_numbers.length})
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {market.whatsapp_numbers.slice(0, 2).map((num, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="text-xs px-2 py-1 rounded-lg"
                                                        style={{ background: 'rgba(107, 142, 122, 0.1)', color: 'var(--cardamom-dark)', fontFamily: 'var(--font-outfit)' }}
                                                    >
                                                        {num}
                                                    </span>
                                                ))}
                                                {market.whatsapp_numbers.length > 2 && (
                                                    <span
                                                        className="text-xs px-2 py-1 rounded-lg"
                                                        style={{ background: 'var(--sand)', color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}
                                                    >
                                                        +{market.whatsapp_numbers.length - 2} weitere
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-3 border-t relative" style={{ borderColor: 'var(--sand)' }}>
                                        {/* Ansehen Button - Opens shop in new tab */}
                                        <a
                                            href={`/shop/${market.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="py-2 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[rgba(107,142,122,0.2)]"
                                            style={{ background: 'rgba(107, 142, 122, 0.1)', color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Ansehen
                                        </a>

                                        {/* Bearbeiten Button */}
                                        <button
                                            onClick={() => handleEditMarket(market)}
                                            className="flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[#e8e4dc]"
                                            style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Bearbeiten
                                        </button>

                                        {/* Delete Button with Inline Confirmation */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setDeleteConfirm(deleteConfirm === market.id ? null : market.id)}
                                                className="py-2 px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer hover:bg-[rgba(216,99,78,0.2)]"
                                                style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)' }}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>

                                            {/* Inline Delete Confirmation Bubble */}
                                            {deleteConfirm === market.id && (
                                                <div
                                                    className="absolute bottom-full right-0 mb-2 glass-card p-3 shadow-lg z-10"
                                                    style={{ minWidth: '180px' }}
                                                >
                                                    <p className="text-xs mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                                        Wirklich löschen?
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setDeleteConfirm(null)}
                                                            className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all hover:opacity-70 cursor-pointer"
                                                            style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                                        >
                                                            Nein
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMarket(market.id)}
                                                            className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 cursor-pointer"
                                                            style={{ background: 'var(--terracotta)', color: 'white', fontFamily: 'var(--font-outfit)' }}
                                                        >
                                                            Ja, löschen
                                                        </button>
                                                    </div>
                                                    {/* Triangle pointer */}
                                                    <div
                                                        className="absolute -bottom-1.5 right-4 w-3 h-3 rotate-45"
                                                        style={{ background: 'white' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                                {/* Page Info */}
                                <div
                                    className="text-sm"
                                    style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}
                                >
                                    Seite {currentPage} von {totalPages}
                                    <span className="mx-2">•</span>
                                    Zeige {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} von {totalCount}
                                </div>

                                {/* Navigation Buttons */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={goToPreviousPage}
                                        disabled={currentPage === 1}
                                        className="px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{
                                            background: currentPage === 1 ? 'var(--sand)' : 'white',
                                            color: 'var(--charcoal)',
                                            border: '2px solid var(--sand)',
                                            fontFamily: 'var(--font-outfit)'
                                        }}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Zurück
                                    </button>

                                    {/* Page Numbers (show up to 5 pages) */}
                                    <div className="hidden sm:flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum: number;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className="w-10 h-10 rounded-xl font-semibold transition-all cursor-pointer"
                                                    style={{
                                                        background: currentPage === pageNum ? 'var(--gradient-warm)' : 'transparent',
                                                        color: currentPage === pageNum ? 'white' : 'var(--charcoal)',
                                                        fontFamily: 'var(--font-outfit)'
                                                    }}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={goToNextPage}
                                        disabled={currentPage === totalPages}
                                        className="px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{
                                            background: currentPage === totalPages ? 'var(--sand)' : 'var(--gradient-warm)',
                                            color: currentPage === totalPages ? 'var(--charcoal)' : 'white',
                                            fontFamily: 'var(--font-outfit)'
                                        }}
                                    >
                                        Weiter
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
                    </>
                )}

                {/* Team Verwaltung Tab Content - Superadmin Only */}
                {activeTab === 'team' && userRole === 'superadmin' && (
                    <>
                        {/* Page Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    Team Verwaltung
                                </h2>
                                <p style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                    {teamMembers.length} {teamMembers.length === 1 ? 'Teammitglied' : 'Teammitglieder'}
                                </p>
                            </div>
                            <button
                                onClick={refreshTeamMembers}
                                className="glass-card px-5 py-3 flex items-center gap-2 text-sm font-semibold transition-all hover:opacity-80 cursor-pointer"
                                style={{ color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Aktualisieren
                            </button>
                        </div>

                        {/* Promote User Form */}
                        <div className="glass-card p-6 mb-8">
                            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                Benutzer zum Admin hochstufen
                            </h3>
                            <form onSubmit={handlePromoteToAdmin} className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <input
                                        type="email"
                                        value={promoteEmail}
                                        onChange={(e) => setPromoteEmail(e.target.value)}
                                        placeholder="E-Mail-Adresse des Benutzers"
                                        className="w-full px-4 py-3 rounded-xl transition-all"
                                        style={{
                                            background: 'white',
                                            border: '2px solid var(--sand)',
                                            color: 'var(--charcoal)',
                                            fontFamily: 'var(--font-outfit)'
                                        }}
                                    />
                                    <p className="text-xs mt-2" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        Der Benutzer muss bereits ein Konto bei Bereket Market haben.
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={promotingUser || !promoteEmail.trim()}
                                    className="btn-primary px-6 py-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                                    style={{ fontFamily: 'var(--font-outfit)' }}
                                >
                                    {promotingUser ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>Wird hochgestuft...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                            </svg>
                                            <span>Zum Admin hochstufen</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Team Members List */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                Aktuelle Teammitglieder
                            </h3>

                            {teamMembers.length === 0 ? (
                                <div className="glass-card p-12 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--sand)' }}>
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--warm-gray)' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                        Keine Teammitglieder
                                    </h3>
                                    <p style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        Stufen Sie Benutzer hoch, um Ihr Team aufzubauen.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {teamMembers.map((member) => (
                                        <div key={member.id} className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                {/* Avatar */}
                                                <div
                                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                                                    style={{
                                                        background: member.role === 'superadmin' ? 'var(--gradient-warm)' : 'var(--warm-gray)',
                                                        fontFamily: 'var(--font-outfit)'
                                                    }}
                                                >
                                                    {member.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-semibold" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                                            {member.email}
                                                        </span>
                                                        {/* Role Badge */}
                                                        <span
                                                            className="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                                                            style={{
                                                                background: member.role === 'superadmin' ? 'var(--saffron)' : 'var(--warm-gray)',
                                                                color: 'white',
                                                                fontFamily: 'var(--font-outfit)',
                                                                letterSpacing: '0.05em'
                                                            }}
                                                        >
                                                            {member.role === 'superadmin' ? 'Superadmin' : 'Admin'}
                                                        </span>
                                                        {member.id === userId && (
                                                            <span
                                                                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                                                style={{
                                                                    background: 'rgba(107, 142, 122, 0.15)',
                                                                    color: 'var(--cardamom)',
                                                                    fontFamily: 'var(--font-outfit)'
                                                                }}
                                                            >
                                                                Sie
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                                        Beigetreten: {new Date(member.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Buttons - Only for other users, not yourself */}
                                            {member.id !== userId && member.role !== 'superadmin' && (
                                                <div className="flex items-center gap-2">
                                                    {/* Promote to Superadmin */}
                                                    <button
                                                        onClick={() => handlePromoteToSuperadmin(member.id)}
                                                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer hover:opacity-80"
                                                        style={{
                                                            background: 'rgba(230, 168, 69, 0.1)',
                                                            color: 'var(--saffron-dark)',
                                                            fontFamily: 'var(--font-outfit)'
                                                        }}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                                        </svg>
                                                        Zu Superadmin
                                                    </button>

                                                    {/* Demote / Remove Admin */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setDemoteConfirm(demoteConfirm === member.id ? null : member.id)}
                                                            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer hover:opacity-80"
                                                            style={{
                                                                background: 'rgba(216, 99, 78, 0.1)',
                                                                color: 'var(--terracotta)',
                                                                fontFamily: 'var(--font-outfit)'
                                                            }}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                                            </svg>
                                                            Entfernen
                                                        </button>

                                                        {/* Demote Confirmation Popup */}
                                                        {demoteConfirm === member.id && (
                                                            <div
                                                                className="absolute bottom-full right-0 mb-2 glass-card p-3 shadow-lg z-10"
                                                                style={{ minWidth: '200px' }}
                                                            >
                                                                <p className="text-xs mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                                                    Admin-Rechte entziehen?
                                                                </p>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => setDemoteConfirm(null)}
                                                                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all hover:opacity-70 cursor-pointer"
                                                                        style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                                                    >
                                                                        Abbrechen
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDemoteAdmin(member.id)}
                                                                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 cursor-pointer"
                                                                        style={{ background: 'var(--terracotta)', color: 'white', fontFamily: 'var(--font-outfit)' }}
                                                                    >
                                                                        Ja, entfernen
                                                                    </button>
                                                                </div>
                                                                {/* Triangle pointer */}
                                                                <div
                                                                    className="absolute -bottom-1.5 right-4 w-3 h-3 rotate-45"
                                                                    style={{ background: 'white' }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
