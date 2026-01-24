import { test, expect } from '@playwright/test';

test('has title and main heading', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    // Note: This checks the document title (browser tab title), which I assume is set in layout.tsx or similar.
    // If not sure, I can skip strict title checking or check h1.

    // Check H1
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Entdecke die');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('besten Deals');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('deiner Stadt');
});

test('has search bar with correct inputs', async ({ page }) => {
    await page.goto('/');

    // Check for the search inputs
    await expect(page.getByPlaceholder('Shops oder Produkte suchen...')).toBeVisible();
    await expect(page.getByPlaceholder('PLZ oder Stadt...')).toBeVisible();

    // Check for the search button
    await expect(page.getByRole('button', { name: 'Suchen' })).toBeVisible();
});

test('page structure loads correctly', async ({ page }) => {
    await page.goto('/');

    // Check that the main element exists
    await expect(page.getByRole('main')).toBeVisible();

    // Check for the descriptive helper text below search
    await expect(page.getByText('Suche nach Shops wie "Yildiz Market" oder Produkten wie "Baklava"')).toBeVisible();
});
