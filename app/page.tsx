"use client";
import { useEffect, useState } from "react";
import { CopyButton } from "./components/CopyButton";
import { JsonView } from "./components/JsonView";

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
  const [url, setUrl] = useState<string>("");
  const [selector, setSelector] = useState<string>("");
  const [results, setResults] = useState<ScrapeResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [debugUrl, setDebugUrl] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get("url");
    const selectorParam = params.get("selector");

    if (urlParam) {
      try {
        const decodedUrl = decodeURIComponent(urlParam);
        setUrl(decodedUrl);
      } catch (e) {
        console.error("Failed to decode URL parameter:", e);
      }
    }

    if (selectorParam) {
      try {
        const decodedSelector = decodeURIComponent(selectorParam);
        setSelector(decodedSelector);
      } catch (e) {
        console.error("Failed to decode selector parameter:", e);
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

  const ensureHttps = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("https://")) return trimmed;
    // Fix http and common https typos: htpps, htps, htp, htttp, ttps, hhtps, https:/, https:, etc.
    const protocolMatch = trimmed.match(/^[a-zA-Z]+:\/*/);
    if (protocolMatch) {
      const rest = trimmed.slice(protocolMatch[0].length).replace(/^\/+/, "");
      return "https://" + rest;
    }
    return "https://" + trimmed;
  };

  const handleUrlBlur = () => {
    if (url.trim()) {
      setUrl(ensureHttps(url));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus("Initializing...");
    setStartTime(Date.now());
    setResults(null);

    // Update URL with current parameters without reloading
    const urlToScrape = ensureHttps(url);
    const params = new URLSearchParams();
    if (urlToScrape) params.set("url", urlToScrape);
    if (selector) params.set("selector", selector);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`,
    );

    try {
      const encodedUrl = encodeURIComponent(urlToScrape);
      const encodedSelector = encodeURIComponent(selector.trim());
      const apiUrl = `/api/scrape/${encodedUrl}?selector=${encodedSelector}`;
      setDebugUrl(apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "x-api-key": process.env.NEXT_PUBLIC_BUEN_SCRAPER_API_KEY || "",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
      setStatus("Complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch results");
      setStatus("Failed");
    } finally {
      setLoading(false);
      setStartTime(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-12">
      <main className="w-full max-w-xl space-y-10">
        <header className="space-y-1">
          <h1 className="font-sans uppercase tracking-wider text-foreground">
            @muybuen/scraper
          </h1>
          <p className="font-sans text-foreground/70">
            An API to scrape the internet. Enter a URL and optional CSS
            selector.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="https://example.com"
            pattern="https://.*"
            title="URL must start with https://"
            className="w-full px-4 py-3 rounded-lg bg-background text-foreground placeholder:text-[#ffff00]/40 border-2 border-accent outline-none focus:outline-2 focus:outline-accent focus:outline-offset-2 transition-colors font-mono text-sm"
            required
          />
          <input
            type="text"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            placeholder="CSS selector (optional)"
            className="w-full px-4 py-3 rounded-lg bg-background text-foreground placeholder:text-[#ffff00]/40 border-2 border-accent outline-none focus:outline-2 focus:outline-accent focus:outline-offset-2 transition-colors font-mono text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2 font-mono text-sm"
          >
            {loading ? (
              <>
                <span>{status}</span>
                <span className="font-mono text-sm opacity-80">
                  {(duration / 1000).toFixed(1)}s
                </span>
              </>
            ) : status === "Complete" ? (
              <>
                <span>{status}</span>
                <span className="font-mono text-sm opacity-80">
                  {(duration / 1000).toFixed(1)}s
                </span>
                <span className="text-accent-foreground" aria-hidden>
                  {/* ✓ */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              </>
            ) : (
              "Scrape URL"
            )}
          </button>
        </form>

        {debugUrl && (
          <div className="p-4 rounded-lg bg-accent/10 border-2 border-accent">
            <div className="relative flex justify-between items-center mb-2">
              <span className="text-xs uppercase tracking-wider text-foreground/60">
                API Call
              </span>
              <CopyButton
                text={debugUrl}
                className="absolute top-0 right-0 z-10"
              />
            </div>
            <code className="font-mono text-sm break-all text-foreground/80 block">
              {debugUrl}
            </code>
          </div>
        )}

        {error && <div className="text-sm text-red-500/90">{error}</div>}

        {results && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs uppercase tracking-wider">Results</h2>
              <CopyButton text={JSON.stringify(results, null, 2)} />
            </div>
            <div className="p-4 rounded-lg bg-accent/10 border-2 border-accent overflow-auto max-h-[50vh]">
              <JsonView data={results} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
