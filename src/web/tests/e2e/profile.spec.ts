import { test, expect } from 'vitest'; // ^0.32.0
import { Page } from '@playwright/test'; // ^1.35.0
import { AuthService } from '../../src/services/auth.service';
import { StorageService } from '../../src/services/storage.service';
import { LoadingState, ErrorState, Theme, Difficulty } from '../../src/types/common.types';
import { SUPPORTED_LANGUAGES } from '../../src/constants/languages';

/**
 * Page object model for profile page E2E testing
 * Implements comprehensive test coverage for user profile functionality
 */
class ProfilePage {
  private readonly page: Page;
  private readonly authService: AuthService;
  private readonly storageService: StorageService;
  private readonly selectors = {
    statisticsPanel: '[data-testid="statistics-panel"]',
    progressChart: '[data-testid="progress-chart"]',
    achievementsSection: '[data-testid="achievements-section"]',
    wordsFoundCount: '[data-testid="words-found-count"]',
    successRate: '[data-testid="success-rate"]',
    favoritesCount: '[data-testid="favorites-count"]',
    progressBars: {
      beginner: '[data-testid="progress-beginner"]',
      intermediate: '[data-testid="progress-intermediate"]',
      advanced: '[data-testid="progress-advanced"]'
    },
    achievementCard: '[data-testid="achievement-card"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
    errorMessage: '[data-testid="error-message"]'
  };

  constructor(page: Page) {
    this.page = page;
    this.authService = new AuthService();
    this.storageService = new StorageService(
      localStorage,
      'profile_test',
      this.handleQuotaExceeded
    );
  }

  /**
   * Navigates to profile page and validates initial state
   */
  public async navigateToProfile(): Promise<void> {
    await this.page.goto('/profile');
    await this.page.waitForSelector(this.selectors.statisticsPanel);
    
    // Verify all critical sections are visible
    await expect(
      this.page.locator(this.selectors.statisticsPanel)
    ).toBeVisible();
    await expect(
      this.page.locator(this.selectors.progressChart)
    ).toBeVisible();
    await expect(
      this.page.locator(this.selectors.achievementsSection)
    ).toBeVisible();
  }

  /**
   * Verifies statistics panel data accuracy and display
   */
  public async verifyStatisticsPanel(): Promise<void> {
    // Wait for statistics to load
    await this.page.waitForSelector(this.selectors.wordsFoundCount);

    // Get displayed statistics
    const wordsFound = await this.page.textContent(this.selectors.wordsFoundCount);
    const successRate = await this.page.textContent(this.selectors.successRate);
    const favorites = await this.page.textContent(this.selectors.favoritesCount);

    // Verify data format and ranges
    expect(Number(wordsFound)).toBeGreaterThanOrEqual(0);
    expect(Number(successRate?.replace('%', ''))).toBeGreaterThanOrEqual(0);
    expect(Number(successRate?.replace('%', ''))).toBeLessThanOrEqual(100);
    expect(Number(favorites)).toBeGreaterThanOrEqual(0);

    // Verify data persistence
    const storedStats = await this.storageService.getItem('userStatistics');
    expect(storedStats).toBeDefined();
    expect(storedStats.wordsFound).toBe(Number(wordsFound));
  }

  /**
   * Tests progress chart functionality and data accuracy
   */
  public async verifyProgressChart(): Promise<void> {
    // Wait for progress chart to load
    await this.page.waitForSelector(this.selectors.progressChart);

    // Verify progress bars for each difficulty level
    for (const difficulty of Object.values(Difficulty)) {
      const progressBar = this.selectors.progressBars[difficulty.toLowerCase()];
      await this.page.waitForSelector(progressBar);

      const progress = await this.page.$eval(progressBar, 
        el => el.getAttribute('aria-valuenow')
      );

      // Validate progress value
      expect(Number(progress)).toBeGreaterThanOrEqual(0);
      expect(Number(progress)).toBeLessThanOrEqual(100);
    }

    // Test chart interactivity
    await this.page.hover(this.selectors.progressChart);
    await expect(
      this.page.locator('[data-testid="progress-tooltip"]')
    ).toBeVisible();
  }

  /**
   * Comprehensive testing of achievements section
   */
  public async verifyAchievements(): Promise<void> {
    // Wait for achievements to load
    await this.page.waitForSelector(this.selectors.achievementCard);

    // Get all achievement cards
    const achievements = await this.page.$$eval(
      this.selectors.achievementCard,
      cards => cards.map(card => ({
        title: card.getAttribute('data-achievement-title'),
        progress: card.getAttribute('data-achievement-progress'),
        unlocked: card.hasAttribute('data-achievement-unlocked')
      }))
    );

    // Verify achievement structure
    expect(achievements.length).toBeGreaterThan(0);
    achievements.forEach(achievement => {
      expect(achievement.title).toBeDefined();
      expect(Number(achievement.progress)).toBeGreaterThanOrEqual(0);
      expect(Number(achievement.progress)).toBeLessThanOrEqual(100);
    });

    // Test achievement interaction
    await this.page.click(`${this.selectors.achievementCard}:first-child`);
    await expect(
      this.page.locator('[data-testid="achievement-details"]')
    ).toBeVisible();
  }

  /**
   * Handles storage quota exceeded errors
   */
  private handleQuotaExceeded(error: ErrorState): void {
    console.error('Storage quota exceeded:', error);
    // Implement cleanup logic if needed
  }
}

// Test suite setup
let profilePage: ProfilePage;

test.beforeEach(async ({ page }) => {
  profilePage = new ProfilePage(page);
  
  // Set up test user and authentication
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Initialize test data
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    lastLogin: new Date().toISOString()
  };

  await page.evaluate((user) => {
    localStorage.setItem('user', JSON.stringify(user));
  }, testUser);

  await profilePage.navigateToProfile();
});

test.afterEach(async ({ page }) => {
  // Clean up test data
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

// Test cases
test('displays user statistics accurately', async () => {
  await profilePage.verifyStatisticsPanel();
});

test('shows progress chart with correct data', async () => {
  await profilePage.verifyProgressChart();
});

test('displays and interacts with achievements correctly', async () => {
  await profilePage.verifyAchievements();
});

test('handles loading states appropriately', async ({ page }) => {
  // Simulate slow network
  await page.route('**/api/profile/**', route => 
    setTimeout(() => route.continue(), 1000)
  );

  await profilePage.navigateToProfile();
  
  // Verify loading indicators
  await expect(
    page.locator(profilePage['selectors'].loadingSpinner)
  ).toBeVisible();
  
  // Verify content appears after loading
  await expect(
    page.locator(profilePage['selectors'].statisticsPanel)
  ).toBeVisible();
});

test('handles error states correctly', async ({ page }) => {
  // Simulate API error
  await page.route('**/api/profile/**', route => 
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    })
  );

  await profilePage.navigateToProfile();
  
  // Verify error message
  await expect(
    page.locator(profilePage['selectors'].errorMessage)
  ).toBeVisible();
});

test('maintains data consistency across page reloads', async ({ page }) => {
  // Record initial statistics
  const initialStats = await page.textContent(
    profilePage['selectors'].wordsFoundCount
  );

  // Reload page
  await page.reload();

  // Verify statistics persistence
  const reloadedStats = await page.textContent(
    profilePage['selectors'].wordsFoundCount
  );
  expect(reloadedStats).toBe(initialStats);
});