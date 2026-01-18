import { Page, expect } from '@playwright/test';

/**
 * Helper utilities for setting up and navigating the game in E2E tests.
 */

/**
 * Navigate to the game's home page
 */
export async function navigateToHome(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * Start System Mode from the main menu
 */
export async function startSystemMode(page: Page) {
  await navigateToHome(page);

  // Wait for the main menu or game interface to load
  // This may vary depending on your game's UI structure
  await page.waitForTimeout(1000);

  // Click System Mode button (adjust selector based on actual UI)
  const systemModeButton = page.getByRole('button', { name: /system mode/i });
  await expect(systemModeButton).toBeVisible();
  await systemModeButton.click();

  // Wait for System Mode to initialize
  await page.waitForTimeout(2000);
}

/**
 * Start Rogue Employee Mode from the main menu
 */
export async function startRogueEmployeeMode(page: Page) {
  await navigateToHome(page);

  // Wait for the main menu
  await page.waitForTimeout(1000);

  // Click Rogue Employee Mode button (adjust selector based on actual UI)
  const rogueButton = page.getByRole('button', { name: /rogue employee|abuse mode/i });
  await expect(rogueButton).toBeVisible();
  await rogueButton.click();

  // Wait for mode to initialize
  await page.waitForTimeout(2000);
}

/**
 * Wait for the game to fully load (Phaser ready)
 */
export async function waitForGameReady(page: Page) {
  // Wait for Phaser canvas to be present
  await page.waitForSelector('canvas', { timeout: 10000 });

  // Wait a bit more for game assets to load
  await page.waitForTimeout(2000);
}

/**
 * Close any open modals or dialogs
 */
export async function closeModals(page: Page) {
  // Look for close buttons (adjust selectors as needed)
  const closeButtons = page.locator('[aria-label="Close"], .modal-close, .close-button');
  const count = await closeButtons.count();

  for (let i = 0; i < count; i++) {
    const button = closeButtons.nth(i);
    if (await button.isVisible()) {
      await button.click();
      await page.waitForTimeout(500);
    }
  }
}
