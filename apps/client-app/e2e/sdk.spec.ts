import { test, expect } from '@playwright/test';
import { IngestPayloadV1In, IngestPayloadV1Schema } from 'cwv-monitor-contracts';
import { ArkErrors } from 'arktype';

const TEST_CASES = [
  { name: 'App Router', path: '/', blogPath: '/blog/hello-world', expectedRoute: '/blog/[slug]' },
  {
    name: 'Pages Router',
    path: '/pages-router',
    blogPath: '/pages-router/blog/hello-world',
    expectedRoute: '/pages-router/blog/[slug]'
  }
];

const validatePayload = (data: unknown) => {
  const out = IngestPayloadV1Schema(data);
  if (out instanceof ArkErrors) {
    throw new TypeError(`Contract Violation: ${out.summary}\nData: ${JSON.stringify(data, null, 2)}`);
  }
  return out;
};

for (const suite of TEST_CASES) {
  test.describe(`SDK ${suite.name} Integration`, () => {
    let payloads: IngestPayloadV1In[] = [];

    test.beforeEach(async ({ page }) => {
      payloads = [];
      await page.route('**/api/ingest', async (route) => {
        const request = route.request();
        let json = request.postDataJSON();

        if (!json) {
          try {
            const buffer = await request.postDataBuffer();
            if (buffer) {
              json = JSON.parse(buffer.toString('utf8'));
            }
          } catch (error) {
            console.warn('Failed to parse request body from buffer:', error);
          }
        }
        if (json) {
          payloads.push(json);
        }

        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      });
    });

    test('captures $page_view and custom events with correct metadata', async ({ page }) => {
      await page.goto(suite.path);

      await expect.poll(() => payloads.some((p) => p.customEvents?.some((e) => e.name === '$page_view'))).toBeTruthy();

      await page
        .getByRole('button', { name: /subscribe/i })
        .first()
        .click();

      await expect
        .poll(() => payloads.some((p) => p.customEvents?.some((e) => e.name.toLowerCase().includes('subscribe'))))
        .toBeTruthy();

      const latest = payloads.find((p) => p.customEvents?.length);
      const validated = validatePayload(latest);

      expect(validated.projectId).toBeDefined();
      expect(validated.customEvents?.[0].path).toBe(suite.path);
    });

    test('performs route normalization on dynamic paths', async ({ page }) => {
      await page.goto(suite.blogPath);

      await page
        .getByRole('button', { name: /subscribe/i })
        .first()
        .click();

      await expect
        .poll(() => payloads.some((p) => p.customEvents?.some((e) => e.path === suite.blogPath)))
        .toBeTruthy();

      const batch = payloads.find((p) => p.customEvents?.some((e) => e.path === suite.blogPath));
      const event = batch?.customEvents?.find((e) => e.path === suite.blogPath);

      expect(event?.path).toBe(suite.blogPath);
      expect(event?.route).toBe(suite.expectedRoute);
    });

    test('rotates sessionId on client-side navigation', async ({ page }) => {
      await page.goto(suite.path);

      await expect.poll(() => payloads.length, { timeout: 10_000 }).toBeGreaterThan(0);
      const firstSessionId = payloads[0].events?.[0].sessionId || payloads[0].customEvents?.[0].sessionId;

      const navLink =
        suite.name === 'App Router'
          ? page.getByRole('link', { name: /explore the blog/i })
          : page.getByRole('link', { name: /go to pages blog/i });

      await navLink.click();

      await page
        .getByRole('button', { name: /subscribe/i })
        .first()
        .click();

      await expect
        .poll(() => payloads.some((p) => p.customEvents?.some((e) => e.path?.includes('/blog'))))
        .toBeTruthy();

      const secondSessionId = payloads
        .flatMap((p) => [...(p.events || []), ...(p.customEvents || [])])
        .find((e) => e.path?.includes('/blog'))?.sessionId;

      expect(secondSessionId).toBeDefined();
      expect(secondSessionId).not.toBe(firstSessionId);
    });

    test('collects and flushes web-vitals on page hide', async ({ page }) => {
      await page.goto(suite.path);
      await page.mouse.wheel(0, 500);
      await page.locator('h1').click();

      const initialCount = payloads.length;

      await page.evaluate(async () => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
        document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
      });

      await page.waitForTimeout(500);

      await expect
        .poll(() => payloads.length, {
          timeout: 15_000,
          intervals: [500, 1000]
        })
        .toBeGreaterThan(initialCount);

      const data = payloads.at(-1);
      validatePayload(data);

      expect(data?.events?.length).toBeGreaterThan(0);
    });

    test('handles ingestion failures gracefully (retries/no-crash)', async ({ page }) => {
      let attemptCount = 0;
      await page.route('**/api/ingest', async (route) => {
        attemptCount++;
        if (attemptCount <= 2) {
          return route.abort('failed');
        }
        return route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
      });

      await page.goto(suite.path);
      await page
        .getByRole('button', { name: /subscribe/i })
        .first()
        .click();

      await expect
        .poll(() => attemptCount, {
          message: 'SDK should retry failed requests at least twice',
          timeout: 20_000,
          intervals: [1000, 2000, 5000]
        })
        .toBeGreaterThan(2);
    });
  });
}
