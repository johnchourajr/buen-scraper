// app/api/scrape/[target]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Browser } from 'puppeteer';

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

  let browser: Browser | null = null;

  try {
    const { target } = await context.params;
    const selector = request.nextUrl.searchParams.get('selector') || 'body';

    // Decode the URL and validate it.
    const targetUrl = decodeURIComponent(target);
    const url = new URL(targetUrl);
    if (!url.protocol.startsWith('http')) {
      throw new Error('Invalid URL protocol. Must be http or https.');
    }

    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ]
    });

    console.log('Creating new page...');
    const page = await browser.newPage();

    // Set navigation and general timeouts.
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('Evaluating page content...');
    const scrapedData = await page.evaluate(
      (selector: string): unknown => {
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
          return { error: `Element not found: ${selector}` };
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

    console.log('Scraping successful');
    return NextResponse.json(scrapedData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
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
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}
