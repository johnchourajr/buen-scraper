'use client';

import { useState } from 'react';

type CopyButtonProps = {
  text: string;
  className?: string;
};

export function CopyButton({ text, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`px-3 py-1.5 text-xs font-medium rounded border-2 border-accent bg-accent/10 text-foreground hover:bg-accent/20 transition-colors ${className}`}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
