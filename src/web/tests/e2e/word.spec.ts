/**
 * End-to-end tests for word generation functionality
 * Version: 1.0.0
 * 
 * Tests word generation, validation, and management functionality with
 * comprehensive performance metrics and multi-language support.
 */

import { test, expect, describe, beforeEach, afterEach } from 'vitest'; // ^0.34.0
import { Page } from 'playwright'; // ^1.39.0
import { performance } from 'perf_hooks';
import { WordService } from '../../src/services/word.service';
import { SUPPORTED_LANGUAGES } from '../../src/constants/languages';

// Test configuration constants
const GENERATION_TIME_LIMIT = 2000; // 2 seconds
const VALIDATION_TIME_LIMIT = 1000; // 1 second
const UI_RESPONSE_LIMIT = 100; // 100ms
const TEST_VIEWPORT = { width: 1280, height: 720 };

// Test data
const TEST_INPUTS = {
    short: 'cat',
    medium: 'elephant',
    long: 'constellation'
};

let page: Page;
let wordService: WordService;

beforeEach(async () => {
    // Initialize page with custom viewport
    page = await browser.newPage();
    await page.setViewportSize(TEST_VIEWPORT);

    // Initialize word service
    wordService = new WordService();

    // Set default language
    await page.evaluate(() => {
        localStorage.setItem('language', SUPPORTED_LANGUAGES.ENGLISH);
    });

    // Navigate to word generation page
    await page.goto('/word-generator');
    await page.waitForLoadState('networkidle');

    // Clear any existing state
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
});

afterEach(async () => {
    // Clean up
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await page.close();
});

/**
 * Utility function to measure performance
 */
async function measurePerformance(
    callback: () => Promise<void>,
    maxDuration: number
): Promise<void> {
    const start = performance.now();
    await callback();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(maxDuration);
    console.log(`Operation completed in ${duration}ms`);
}

describe('Word Generation Performance Tests', () => {
    test('should generate words within 2 second limit', async () => {
        for (const [inputSize, chars] of Object.entries(TEST_INPUTS)) {
            await measurePerformance(async () => {
                // Input characters
                await page.fill('[data-testid="word-input"]', chars);
                await page.click('[data-testid="generate-button"]');

                // Wait for results
                await page.waitForSelector('[data-testid="results-panel"]');

                // Verify results are displayed
                const results = await page.$$('[data-testid="word-result"]');
                expect(results.length).toBeGreaterThan(0);
            }, GENERATION_TIME_LIMIT);
        }
    });

    test('should validate words within 1 second', async () => {
        const testWord = 'test';
        
        await measurePerformance(async () => {
            const isValid = await wordService.validateWord(testWord, SUPPORTED_LANGUAGES.ENGLISH);
            expect(typeof isValid).toBe('boolean');
        }, VALIDATION_TIME_LIMIT);
    });

    test('should maintain performance under load', async () => {
        const iterations = 5;
        const results = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            
            await wordService.generateWords({
                characters: TEST_INPUTS.medium,
                language: SUPPORTED_LANGUAGES.ENGLISH,
                minLength: 3,
                maxLength: 8,
                showDefinitions: true
            });

            results.push(performance.now() - start);
        }

        const averageTime = results.reduce((a, b) => a + b) / results.length;
        expect(averageTime).toBeLessThan(GENERATION_TIME_LIMIT);
    });
});

describe('Multi-language Support Tests', () => {
    test('should support all required languages', async () => {
        for (const language of Object.values(SUPPORTED_LANGUAGES)) {
            await measurePerformance(async () => {
                // Set language
                await page.selectOption('[data-testid="language-select"]', language);

                // Generate words
                await page.fill('[data-testid="word-input"]', TEST_INPUTS.medium);
                await page.click('[data-testid="generate-button"]');

                // Verify results
                const results = await page.$$('[data-testid="word-result"]');
                expect(results.length).toBeGreaterThan(0);

                // Verify definitions are in correct language
                const definition = await page.$eval(
                    '[data-testid="word-definition"]',
                    el => el.textContent
                );
                expect(definition).toBeTruthy();
            }, GENERATION_TIME_LIMIT);
        }
    });

    test('should handle language switching correctly', async () => {
        await measurePerformance(async () => {
            // Switch language
            await page.selectOption('[data-testid="language-select"]', SUPPORTED_LANGUAGES.SPANISH);

            // Verify UI updates
            const placeholder = await page.$eval(
                '[data-testid="word-input"]',
                el => el.getAttribute('placeholder')
            );
            expect(placeholder).toContain('Ingrese letras');
        }, UI_RESPONSE_LIMIT);
    });
});

describe('Word Definition Display Tests', () => {
    test('should display word definitions with complexity ratings', async () => {
        await page.fill('[data-testid="word-input"]', TEST_INPUTS.medium);
        await page.click('[data-testid="show-definitions-checkbox"]');
        await page.click('[data-testid="generate-button"]');

        await page.waitForSelector('[data-testid="word-result"]');

        const definitions = await page.$$('[data-testid="word-definition"]');
        const complexityRatings = await page.$$('[data-testid="complexity-rating"]');

        expect(definitions.length).toBeGreaterThan(0);
        expect(complexityRatings.length).toEqual(definitions.length);

        // Verify complexity ratings are valid
        for (const rating of complexityRatings) {
            const value = await rating.getAttribute('data-value');
            expect(Number(value)).toBeGreaterThanOrEqual(0);
            expect(Number(value)).toBeLessThanOrEqual(100);
        }
    });
});