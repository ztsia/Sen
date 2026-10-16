import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import type { Metric, MetricName } from '../../../qa/limits';
import type { Finding } from './checks';

// What the lived-in journeys (lived.spec.ts) share: how a phone leaves and comes back, a screen with a
// half-typed form, a mark that tells a reload from no reload, and the metrics they write.

/** Adds one measurement to `<QA_METRICS>/lived.jsonl`, for qa-diff to judge (qa/limits.ts). Without QA_METRICS it does nothing. */
export function recordMetric(key: string, metric: MetricName, value: number) {
  const dir = process.env.QA_METRICS;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  const line: Metric = { key, metric, value: Math.round(value * 10) / 10 };
  appendFileSync(join(dir, 'lived.jsonl'), JSON.stringify(line) + '\n');
}

/**
 * Marks this document, so a later `reloaded` can tell a reload from none: a reload makes a new document,
 * and the mark goes with the old one.
 */
export async function markPage(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __lived?: number }).__lived = 1;
  });
}
export const reloaded = async (page: Page) =>
  page.evaluate(() => (window as unknown as { __lived?: number }).__lived !== 1).catch(() => true);

/**
 * Makes the page's visibility something a journey can change (headless Chromium is always visible). The
 * page reports `visible` until `leave` says otherwise. Call once, after the page has loaded.
 */
export async function makeVisibilityHonest(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __vis?: 'visible' | 'hidden' };
    w.__vis = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => w.__vis });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => w.__vis === 'hidden' });
  });
}

/** The app goes to the background, the way Android's WebView says so: hidden, and the page-lifecycle freeze. */
export async function leave(page: Page, how: 'visibility' | 'pagehide') {
  await page.evaluate((how) => {
    const w = window as unknown as { __vis?: 'visible' | 'hidden' };
    w.__vis = 'hidden';
    if (how === 'visibility') document.dispatchEvent(new Event('visibilitychange'));
    else {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      document.dispatchEvent(new Event('visibilitychange'));
    }
  }, how);
}

/** …and comes back: visible again, with Capacitor's `resume` (or the browser's `pageshow`) on top. */
export async function comeBack(page: Page, how: 'visibility' | 'pagehide') {
  await page.evaluate((how) => {
    const w = window as unknown as { __vis?: 'visible' | 'hidden' };
    w.__vis = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    if (how === 'visibility') document.dispatchEvent(new Event('resume'));
    else window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  }, how);
}

/** Text a person would take for a failure: the app's own error screens and the browser's. */
export async function noErrorShown(page: Page) {
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/something went wrong|couldn't load|can't be reached|unexpected error|not built yet/i);
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
}

/** Opens the Shopping budget's sheet over Budgets and types half an amount into it: a form mid-way. */
export async function halfTypedBudget(page: Page, typed = '250') {
  await page.goto('/s/budgets');
  await expect(page.getByRole('button', { name: /Shopping/ }).first()).toBeVisible();
  await page
    .getByRole('button', { name: /Shopping/ })
    .first()
    .click();
  const sheet = page.getByRole('dialog', { name: 'Shopping' });
  await expect(sheet).toBeVisible();
  const field = sheet.getByLabel('Budget each cycle');
  await field.fill(typed);
  return { sheet, field, value: await field.inputValue() };
}

/** What text scaling and small phones break, from the scripted checks: nothing may be clipped, overlapped or covered. */
export const LAYOUT_CHECKS: ReadonlySet<Finding['check']> = new Set(['clipped', 'overlap', 'covered']);

/** The page, or a scroll area in it, wider than the screen: a person would have to scroll sideways. */
export const sidewaysScroll = (page: Page) =>
  page.evaluate(() => {
    const wide: string[] = [];
    const w = window.innerWidth;
    if (document.documentElement.scrollWidth > w) wide.push(`page ${document.documentElement.scrollWidth} > ${w}`);
    for (const el of document.querySelectorAll<HTMLElement>('main, [role="dialog"]')) {
      if (el.scrollWidth > el.clientWidth + 1) {
        wide.push(
          `${el.tagName.toLowerCase()}${el.getAttribute('role') ? '[dialog]' : ''} ${el.scrollWidth} > ${el.clientWidth}`,
        );
      }
    }
    return wide;
  });
