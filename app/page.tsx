'use client';
import { useEffect, useState } from 'react';

type ScrapeResult = {
  url: string;
  title: string;
  targetSelector: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any; // You can make this more specific if needed
  duration?: number;
  timestamp?: string;
  error?: string;
};

export default function Home() {
  const [url, setUrl] = useState<string>('');
  const [selector, setSelector] = useState<string>('');
  const [results, setResults] = useState<ScrapeResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [debugUrl, setDebugUrl] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    const selectorParam = params.get('selector');

    if (urlParam) {
      try {
        const decodedUrl = decodeURIComponent(urlParam);
        setUrl(decodedUrl);
      } catch (e) {
        console.error('Failed to decode URL parameter:', e);
      }
    }

    if (selectorParam) {
      try {
        const decodedSelector = decodeURIComponent(selectorParam);
        setSelector(decodedSelector);
      } catch (e) {
        console.error('Failed to decode selector parameter:', e);
      }
    }
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (loading && startTime) {
      intervalId = setInterval(() => {
        setDuration(Date.now() - startTime);
      }, 100);
    }
    return () => clearInterval(intervalId);
  }, [loading, startTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus('Initializing...');
    setStartTime(Date.now());
    setResults(null);

    // Update URL with current parameters without reloading
    const params = new URLSearchParams();
    if (url) params.set('url', url);
    if (selector) params.set('selector', selector);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);

    try {
      const encodedUrl = encodeURIComponent(url.trim());
      const encodedSelector = encodeURIComponent(selector.trim());
      const apiUrl = `/api/scrape/${encodedUrl}?selector=${encodedSelector}`;
      setDebugUrl(apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_BUEN_SCRAPER_API_KEY || ''
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
      setStatus('Complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch results');
      setStatus('Failed');
    } finally {
      setLoading(false);
      setStartTime(null);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-2xl">
        <h1 className="text-3xl font-bold">URL Scraper</h1>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to scrape"
            className="w-full p-2 border text-black rounded"
            required
          />
          <input
            type="text"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            placeholder="Enter CSS selector (optional)"
            className="w-full p-2 border text-black rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? status : 'Scrape URL'}
            {loading && <span className="font-mono">
                {(duration / 1000).toFixed(1)}s
              </span>}
          </button>
        </form>

        {(status === 'Complete') && (
          <div className="w-full p-4 bg-gray-100 text-black rounded">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{status}</span>
              <span className="font-mono">
                {(duration / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        )}

        {debugUrl && (
          <div className="w-full p-4 bg-gray-100 rounded text-sm font-mono break-all text-gray-500">
            <div className="font-semibold mb-1">Debug - API Call:</div>
            {debugUrl}
          </div>
        )}

        {error && (
          <div className="text-red-500">{error}</div>
        )}

        {results && (
          <div className="w-full space-y-4">
            <h2 className="text-xl font-semibold">Results</h2>
            <pre className="bg-gray-100 text-black p-4 rounded overflow-auto max-h-svh">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
