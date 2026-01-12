'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'bereket_fav_markets';

/**
 * A robust React hook to manage favorite market IDs in LocalStorage.
 * Provides reactive state that syncs across browser tabs via storage events.
 */
export function useFavorites() {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Track if the change originated from this hook instance
    const isLocalUpdate = useRef(false);

    // Load favorites from localStorage on mount
    useEffect(() => {
        const loadFavorites = () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        setFavorites(parsed);
                    }
                }
            } catch (error) {
                console.warn('Failed to load favorites from localStorage:', error);
            }
            setIsLoaded(true);
        };

        loadFavorites();

        // Listen for storage changes (sync across tabs)
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === STORAGE_KEY) {
                loadFavorites();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Persist favorites to localStorage and broadcast AFTER state updates
    useEffect(() => {
        // Skip the initial load
        if (!isLoaded) return;

        // Only persist/broadcast if this was a local update
        if (isLocalUpdate.current) {
            isLocalUpdate.current = false;

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
                // Use setTimeout to defer the event dispatch outside of React's render cycle
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('favorites-updated', { detail: favorites }));
                }, 0);
            } catch (error) {
                console.warn('Failed to persist favorites to localStorage:', error);
            }
        }
    }, [favorites, isLoaded]);

    // Listen for custom event for same-tab updates (from other components)
    useEffect(() => {
        const handleCustomUpdate = (event: CustomEvent<string[]>) => {
            // Only update if the data is different to avoid loops
            setFavorites((current) => {
                const newFavs = event.detail;
                // Check if arrays are equal
                if (current.length === newFavs.length &&
                    current.every((id, idx) => id === newFavs[idx])) {
                    return current;
                }
                return newFavs;
            });
        };

        window.addEventListener('favorites-updated', handleCustomUpdate as EventListener);
        return () => window.removeEventListener('favorites-updated', handleCustomUpdate as EventListener);
    }, []);

    /**
     * Toggles a market ID in the favorites array.
     * Adds it if not present, removes it if already present.
     */
    const toggleFavorite = useCallback((id: string) => {
        isLocalUpdate.current = true;
        setFavorites((prev) => {
            return prev.includes(id)
                ? prev.filter((favId) => favId !== id)
                : [...prev, id];
        });
    }, []);

    /**
     * Checks if a market ID is in the favorites array.
     */
    const isFavorite = useCallback((id: string): boolean => {
        return favorites.includes(id);
    }, [favorites]);

    /**
     * Adds a market ID to favorites if not already present.
     */
    const addFavorite = useCallback((id: string) => {
        isLocalUpdate.current = true;
        setFavorites((prev) => {
            if (prev.includes(id)) return prev;
            return [...prev, id];
        });
    }, []);

    /**
     * Removes a market ID from favorites.
     */
    const removeFavorite = useCallback((id: string) => {
        isLocalUpdate.current = true;
        setFavorites((prev) => {
            return prev.filter((favId) => favId !== id);
        });
    }, []);

    /**
     * Clears all favorites.
     */
    const clearFavorites = useCallback(() => {
        isLocalUpdate.current = true;
        setFavorites([]);
    }, []);

    return {
        favorites,
        isLoaded,
        toggleFavorite,
        isFavorite,
        addFavorite,
        removeFavorite,
        clearFavorites,
        hasFavorites: favorites.length > 0,
    };
}

export default useFavorites;
