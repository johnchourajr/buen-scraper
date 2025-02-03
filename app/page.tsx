'use client';
import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [selector, setSelector] = useState('#storefront-container > div > div:nth-child(2)');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugUrl, setDebugUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch results');
    } finally {
      setLoading(false);
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
            placeholder="Enter CSS selector"
            className="w-full p-2 border text-black rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Scraping...' : 'Scrape URL'}
          </button>
        </form>

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
