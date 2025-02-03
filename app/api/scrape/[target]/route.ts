// app/api/scrape/[target]/route.ts
import chromium from '@sparticuz/chromium';
import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Page } from 'puppeteer-core';

type Content =
  | {
      tag: string;
      text: string;
      attributes?: Record<string, string>;
      src?: string;
      alt?: string;
      href?: string;
      children: Content[];
    }
  | null;

const isDev = process.env.NODE_ENV === 'development';

async function createBrowserAndPage() {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process',
    ],
    defaultViewport: {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
    },
    executablePath: isDev
      ? process.env.CHROME_PATH
      : await chromium.executablePath(),
    headless: true,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(30000);
  await page.setDefaultTimeout(30000);

  return { browser, page };
}

async function waitForSelector(page: Page, selector: string, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    console.error(`Selector "${selector}" not found within ${timeout}ms`, error);
    return false;
  }
}

type ScrapeResult = {
  url: string;
  title: string;
  targetSelector: string;
  content: Content;
  duration?: number;
  timestamp?: string;
  error?: string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ target: string }> }
): Promise<Response> {
  // API Key validation
  const apiKey = request.headers.get('x-api-key');
  const validKey = process.env.NEXT_PUBLIC_BUEN_SCRAPER_API_KEY;

  if (!apiKey || apiKey !== validKey) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid API key' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  let browser = null;
  let page = null;

  try {
    const { target } = await context.params;
    const selector = request.nextUrl.searchParams.get('selector') || 'body';

    // Decode the URL and validate it.
    const targetUrl = decodeURIComponent(target);
    const url = new URL(targetUrl);
    if (!url.protocol.startsWith('http')) {
      throw new Error('Invalid URL protocol. Must be http or https.');
    }

    console.log('[Status] Starting browser session...');
    const session = await createBrowserAndPage();
    browser = session.browser;
    page = session.page;

    console.log(`[Status] Navigating to ${targetUrl}...`);
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    if (!response?.ok()) {
      throw new Error(`Failed to load page: ${response?.status()}`);
    }

    console.log('[Status] Waiting for selector...');
    const selectorFound = await waitForSelector(page, selector);
    if (!selectorFound) {
      throw new Error(`Selector not found: ${selector}`);
    }

    // Additional wait after navigation
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('[Status] Evaluating page content...');
    const scrapedData = await page.evaluate(
      (selector: string): ScrapeResult => {
        const getSectionContent = (element: Element): Content => {
          // Skip if element is SVG.
          if (element instanceof SVGElement) {
            return null;
          }

          const content: {
            tag: string;
            text: string;
            attributes?: Record<string, string>;
            src?: string;
            alt?: string;
            href?: string;
            children: Content[];
          } = {
            tag: element.tagName.toLowerCase(),
            text: element.textContent?.trim() || '',
            children: [],
          };

          // Get attributes (excluding style)
          const attrs = element.attributes;
          if (attrs.length > 0) {
            content.attributes = {};
            for (let i = 0; i < attrs.length; i++) {
              if (attrs[i].name !== 'style') {
                content.attributes[attrs[i].name] = attrs[i].value;
              }
            }
          }

          // Special handling for specific elements.
          if (element instanceof HTMLImageElement) {
            content.src = element.src;
            content.alt = element.alt;
          } else if (element instanceof HTMLAnchorElement) {
            content.href = element.href;
          }

          // Process child elements.
          Array.from(element.children)
            .map(child => getSectionContent(child))
            .filter(child => child !== null) // Remove null entries (SVGs).
            .forEach(child => content.children.push(child));

          return content;
        };

        const targetElement = document.querySelector(selector);
        if (!targetElement) {
          return {
            url: window.location.href,
            title: document.title,
            targetSelector: selector,
            content: null,
            error: `Element not found: ${selector}`
          };
        }

        return {
          url: window.location.href,
          title: document.title,
          targetSelector: selector,
          content: getSectionContent(targetElement),
        };
      },
      selector
    );

    const duration = Date.now() - startTime;
    console.log(`[Status] Scraping successful (${duration}ms)`);

    return NextResponse.json(
      { ...scrapedData, duration, timestamp: new Date().toISOString() } as ScrapeResult,
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Detailed scraping error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } finally {
    if (page || browser) {
      console.log('Cleaning up browser session...');
      try {
        if (page) await page.close().catch(() => {});
        if (browser) await browser.close().catch(() => {});
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }
  }
}
