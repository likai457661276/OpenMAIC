import { test, expect } from '../fixtures/base';
import { HomePage } from '../pages/home.page';
import { createSettingsStorage } from '../fixtures/test-data/settings';
import type { Page } from '@playwright/test';

// Inject settings with modelId so the "enter classroom" button works
const SETTINGS_STORAGE = createSettingsStorage();

interface BodySpacing {
  paddingRight: string;
  marginRight: string;
}

async function readBodySpacing(page: Page): Promise<BodySpacing> {
  return page.evaluate(() => {
    const styles = getComputedStyle(document.body);
    return {
      paddingRight: styles.paddingRight,
      marginRight: styles.marginRight,
    };
  });
}

async function expectBodyScrollState(page: Page, initialSpacing: BodySpacing, locked: boolean) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        locked: document.body.hasAttribute('data-scroll-locked'),
        paddingRight: getComputedStyle(document.body).paddingRight,
        marginRight: getComputedStyle(document.body).marginRight,
      })),
    )
    .toEqual({
      locked,
      paddingRight: initialSpacing.paddingRight,
      marginRight: initialSpacing.marginRight,
    });
}

test.describe('Home → Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((settings) => {
      localStorage.setItem('settings-storage', settings);
      localStorage.setItem('locale', 'en-US');
    }, SETTINGS_STORAGE);
  });

  test('home page loads with core UI elements and submits requirement', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // Core elements visible
    await expect(home.logo).toBeVisible();
    await expect(home.textarea).toBeVisible();
    await expect(home.enterButton).toBeDisabled();
    await expect(home.interactiveModeToggle).toBeVisible();
    await expect(home.speechButton).toBeVisible();
    await expect(home.vocationalModeToggle).toBeVisible();

    // Type requirement → button activates
    await home.fillRequirement('讲解光合作用');
    await expect(home.enterButton).toBeEnabled();

    // Submit → navigate to generation-preview
    await home.submit();
    await page.waitForURL(/\/generation-preview/);
    expect(page.url()).toContain('/generation-preview');
  });

  test('persists interactive mode and includes it in the generation session', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.interactiveModeToggle.click();
    await expect(home.interactiveModeToggle).toHaveAttribute('aria-checked', 'true');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('interactiveModeEnabled')))
      .toBe('true');

    await page.reload();
    await expect(home.interactiveModeToggle).toHaveAttribute('aria-checked', 'true');

    await home.fillRequirement('设计一个深度互动的光合作用课堂');
    await home.submit();
    await page.waitForURL(/\/generation-preview/);

    const interactiveMode = await page.evaluate(() => {
      const session = JSON.parse(sessionStorage.getItem('generationSession') ?? '{}');
      return session.requirements?.interactiveMode;
    });
    expect(interactiveMode).toBe(true);
  });

  test('enables vocational task generation from the input toolbar', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.vocationalModeToggle.click();
    await expect(home.vocationalModeToggle).toHaveAttribute('aria-checked', 'true');

    await home.fillRequirement('生成汽车发动机拆装实操训练');
    await home.submit();
    await page.waitForURL(/\/generation-preview/);

    const requirements = await page.evaluate(() => {
      const session = JSON.parse(sessionStorage.getItem('generationSession') ?? '{}');
      return session.requirements;
    });
    expect(requirements.interactiveMode).toBe(true);
    expect(requirements.taskEngineMode).toBe(true);
  });

  test('does not expose student interaction controls on the teacher homepage', async ({ page }) => {
    const home = new HomePage(page);
    await page.goto('/bingo-agent-class/teacher');

    await expect(page.getByLabel('宾果AI互动课件')).toBeVisible();
    await expect(home.interactiveModeToggle).toHaveCount(0);
    await expect(home.speechButton).toHaveCount(0);
  });

  test('keeps body spacing stable when the settings dialog opens', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(home.logo).toBeVisible();

    const initialBodySpacing = await readBodySpacing(page);

    await page.locator('button:has(svg.lucide-settings)').first().click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await expectBodyScrollState(page, initialBodySpacing, true);
  });
});
