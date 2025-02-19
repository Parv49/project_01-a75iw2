import { test, expect } from '@playwright/test';
import { GameMode, GameDifficulty, GameStatus } from '../../src/types/game.types';

/**
 * End-to-end test suite for the word generation game
 * @version 1.0.0
 */

test.describe('Game Page E2E Tests', () => {
  let page: any;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/game');
    await page.evaluate(() => window.localStorage.clear());
    await page.waitForSelector('[data-testid="game-container"]');
    // Set default game settings
    await page.evaluate(() => {
      localStorage.setItem('gameSettings', JSON.stringify({
        timeLimit: 0,
        minWordLength: 3,
        maxWordLength: 8,
        hintsAllowed: 3,
        language: 'en',
        maxCombinations: 100000,
        processingTimeout: 2000
      }));
    });
  });

  test.afterEach(async () => {
    await page.evaluate(() => {
      window.localStorage.clear();
      const gameState = document.querySelector('[data-testid="game-state"]');
      if (gameState?.textContent.includes('PLAYING')) {
        document.querySelector('[data-testid="end-game-btn"]')?.click();
      }
    });
  });

  test('game initialization across browsers', async () => {
    // Verify initial game state
    const gameState = await page.getAttribute('[data-testid="game-state"]', 'data-status');
    expect(gameState).toBe(GameStatus.IDLE);

    // Check default settings
    const difficulty = await page.getAttribute('[data-testid="difficulty-selector"]', 'value');
    expect(difficulty).toBe(GameDifficulty.MEDIUM);

    const mode = await page.getAttribute('[data-testid="game-mode-selector"]', 'value');
    expect(mode).toBe(GameMode.PRACTICE);

    // Verify responsive layout
    await page.setViewportSize({ width: 1920, height: 1080 });
    expect(await page.isVisible('[data-testid="desktop-controls"]')).toBeTruthy();

    await page.setViewportSize({ width: 375, height: 667 });
    expect(await page.isVisible('[data-testid="mobile-controls"]')).toBeTruthy();
  });

  test('game modes functionality', async () => {
    // Test PRACTICE mode
    await page.selectOption('[data-testid="game-mode-selector"]', GameMode.PRACTICE);
    await page.click('[data-testid="start-game-btn"]');
    expect(await page.isVisible('[data-testid="timer-display"]')).toBeFalsy();

    // Test TIMED mode
    await page.click('[data-testid="end-game-btn"]');
    await page.selectOption('[data-testid="game-mode-selector"]', GameMode.TIMED);
    await page.fill('[data-testid="time-limit-input"]', '60');
    await page.click('[data-testid="start-game-btn"]');
    
    const initialTime = await page.textContent('[data-testid="timer-display"]');
    expect(initialTime).toBe('60');

    // Test CHALLENGE mode
    await page.click('[data-testid="end-game-btn"]');
    await page.selectOption('[data-testid="game-mode-selector"]', GameMode.CHALLENGE);
    await page.click('[data-testid="start-game-btn"]');
    expect(await page.isVisible('[data-testid="challenge-rules"]')).toBeTruthy();
  });

  test('word submission and validation', async () => {
    await page.click('[data-testid="start-game-btn"]');

    // Test valid word submission
    await page.fill('[data-testid="word-input"]', 'test');
    await page.click('[data-testid="submit-word-btn"]');
    
    const wordList = await page.textContent('[data-testid="found-words-list"]');
    expect(wordList).toContain('test');

    // Test invalid word
    await page.fill('[data-testid="word-input"]', 'xyz123');
    await page.click('[data-testid="submit-word-btn"]');
    
    const errorMessage = await page.textContent('[data-testid="error-message"]');
    expect(errorMessage).toContain('Invalid word');

    // Test duplicate word
    await page.fill('[data-testid="word-input"]', 'test');
    await page.click('[data-testid="submit-word-btn"]');
    expect(await page.textContent('[data-testid="error-message"]')).toContain('Word already found');
  });

  test('game controls and state management', async () => {
    await page.click('[data-testid="start-game-btn"]');

    // Test pause functionality
    await page.click('[data-testid="pause-game-btn"]');
    expect(await page.getAttribute('[data-testid="game-state"]', 'data-status')).toBe(GameStatus.PAUSED);

    // Test hint system
    const initialHints = await page.textContent('[data-testid="hints-remaining"]');
    await page.click('[data-testid="use-hint-btn"]');
    const remainingHints = await page.textContent('[data-testid="hints-remaining"]');
    expect(Number(remainingHints)).toBe(Number(initialHints) - 1);

    // Test keyboard shortcuts
    await page.keyboard.press('Escape');
    expect(await page.getAttribute('[data-testid="game-state"]', 'data-status')).toBe(GameStatus.PAUSED);
  });

  test('scoring system', async () => {
    await page.selectOption('[data-testid="difficulty-selector"]', GameDifficulty.HARD);
    await page.click('[data-testid="start-game-btn"]');

    // Submit a word and verify scoring
    await page.fill('[data-testid="word-input"]', 'testing');
    await page.click('[data-testid="submit-word-btn"]');
    
    const score = await page.textContent('[data-testid="current-score"]');
    expect(Number(score)).toBeGreaterThan(0);

    // Verify difficulty multiplier
    const multiplier = await page.textContent('[data-testid="score-multiplier"]');
    expect(Number(multiplier)).toBeGreaterThan(1);
  });

  test('performance requirements', async () => {
    // Measure word generation time
    const startTime = Date.now();
    await page.click('[data-testid="start-game-btn"]');
    await page.waitForSelector('[data-testid="game-ready"]');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000); // 2s SLA target

    // Test under load
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(page.fill('[data-testid="word-input"]', `test${i}`));
      promises.push(page.click('[data-testid="submit-word-btn"]'));
    }
    const submissionStartTime = Date.now();
    await Promise.all(promises);
    const submissionTime = Date.now() - submissionStartTime;
    expect(submissionTime).toBeLessThan(2000);

    // Verify UI responsiveness
    await page.click('[data-testid="pause-game-btn"]');
    const pauseResponse = await page.getAttribute('[data-testid="game-state"]', 'data-status');
    expect(pauseResponse).toBe(GameStatus.PAUSED);
  });
});