'use client';

type TokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'whitespace';

type Token = {
  type: TokenType;
  value: string;
};

function tokenize(json: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const patterns = [
    { type: 'whitespace' as const, regex: /^\s+/ },
    { type: 'key' as const, regex: /^"(?:[^"\\]|\\.)*"(?=\s*:)/ },
    { type: 'string' as const, regex: /^"(?:[^"\\]|\\.)*"/ },
    { type: 'number' as const, regex: /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/ },
    { type: 'boolean' as const, regex: /^(?:true|false)\b/ },
    { type: 'null' as const, regex: /^null\b/ },
    { type: 'punctuation' as const, regex: /^[{}\[\],:]/ },
  ];

  while (i < json.length) {
    const rest = json.slice(i);

    let matched = false;
    for (const { type, regex } of patterns) {
      const match = rest.match(regex);
      if (match) {
        tokens.push({ type, value: match[0] });
        i += match[0].length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      tokens.push({ type: 'punctuation' as const, value: rest[0] ?? '' });
      i += 1;
    }
  }

  return tokens;
}

const tokenColors: Record<TokenType, string> = {
  key: 'text-foreground',
  string: 'text-foreground/90',
  number: 'text-foreground/80',
  boolean: 'text-foreground/70',
  null: 'text-foreground/60',
  punctuation: 'text-foreground/50',
  whitespace: 'text-foreground',
};

export function JsonView({ data }: { data: object }) {
  let content: React.ReactNode;
  try {
    const json = JSON.stringify(data, null, 2);
    const tokens = tokenize(json);
    content = tokens.map((token, i) => (
      <span key={i} className={tokenColors[token.type]}>
        {token.value}
      </span>
    ));
  } catch {
    content = String(data);
  }

  return (
    <pre className="font-mono text-sm leading-relaxed">
      {content}
    </pre>
  );
}
