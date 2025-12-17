import { test, expect } from '@playwright/test';

test.describe('Game Hub', () => {
    test('should navigate to game hub', async ({ page }) => {
        await page.goto('/');

        // Wait for intro or skip
        await page.waitForURL('/hub', { timeout: 10000 });

        // Check game cards are visible
        await expect(page.locator('text=LOS CHATETAS')).toBeVisible();
        await expect(page.locator('text=ADIVINA EL JUGADOR')).toBeVisible();
    });

    test('should navigate to Los Chatetas', async ({ page }) => {
        await page.goto('/hub');
        await page.click('text=JUGAR AHORA >> nth=0');
        await expect(page).toHaveURL(/\/chatetas\/menu/);
    });

    test('should navigate to Guess Who', async ({ page }) => {
        await page.goto('/hub');
        await page.click('text=JUGAR AHORA >> nth=1');
        await expect(page).toHaveURL(/\/guess-who\/menu/);
    });
});

test.describe('Los Chatetas Flow', () => {
    test('should create room', async ({ page }) => {
        await page.goto('/chatetas/menu');

        // Fill player name
        await page.fill('input[placeholder*="nombre"]', 'TestPlayer');

        // Create room
        await page.click('text=Crear Sala');

        // Should redirect to lobby
        await expect(page).toHaveURL(/\/chatetas\/lobby\//);

        // Room code should be visible
        await expect(page.locator('text=/[A-Z0-9]{6}/')).toBeVisible();
    });
});

test.describe('Guess Who Flow', () => {
    test('should start AI game', async ({ page }) => {
        await page.goto('/guess-who/menu');

        // Fill name
        await page.fill('input[type="text"]', 'TestPlayer');

        // Click VS AI
        await page.click('text=VS COMPUTADORA');

        // Should redirect to game
        await expect(page).toHaveURL('/guess-who/game');

        // Player selection should be visible
        await expect(page.locator('text=Selecciona tu jugador secreto')).toBeVisible();
    });

    test('should select player and start game', async ({ page }) => {
        await page.goto('/guess-who/game');

        // Click first player card
        await page.click('[class*="playerGrid"] > div:first-child');

        // Game should start
        await expect(page.locator('text=Mi Tablero')).toBeVisible();
        await expect(page.locator('text=/Tu Turno|Turno IA/')).toBeVisible();
    });
});

test.describe('PWA', () => {
    test('should have PWA manifest', async ({ page }) => {
        await page.goto('/');
        const manifest = await page.locator('link[rel="manifest"]');
        await expect(manifest).toHaveAttribute('href', '/manifest.json');
    });

    test('should have service worker', async ({ page }) => {
        await page.goto('/');
        const sw = await page.evaluate(() => 'serviceWorker' in navigator);
        expect(sw).toBeTruthy();
    });
});
