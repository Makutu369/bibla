export interface VerseWord {
  text: string;
  strongNumber: string | null;
}

export function parseVerseWords(text: string): VerseWord[] {
  let clean = text;
  clean = clean.replace(/<pb\/>/g, '');
  clean = clean.replace(/<f>\[?\d+\]?<\/f>/g, '');
  // Strip everything EXCEPT <S> tags
  clean = clean.replace(/<(?!\/?S\b)[^>]+>/g, '');

  const words: VerseWord[] = [];
  const tokens = clean.split(/(\s+)/);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (/^\s+$/.test(token)) {
      words.push({ text: token, strongNumber: null });
      continue;
    }

    // Standalone <S>NUMBER</S> — attach to previous word
    const standalone = token.match(/^<S>(\d+)<\/S>$/);
    if (standalone) {
      if (words.length > 0) {
        const last = words[words.length - 1];
        if (last.strongNumber === null) {
          words[words.length - 1] = { text: last.text, strongNumber: standalone[1] };
        }
      }
      continue;
    }

    // Embedded: word<S>NUMBER</S>
    const embedded = token.match(/^(.*?)<S>(\d+)<\/S>(.*)$/);
    if (embedded) {
      const [, before, num, after] = embedded;
      if (before) words.push({ text: before, strongNumber: num });
      if (after) words.push({ text: after, strongNumber: null });
      continue;
    }

    // Next token is standalone <S> — attach to this word
    const next = tokens[i + 1];
    if (next) {
      const m = next.match(/^<S>(\d+)<\/S>$/);
      if (m) {
        words.push({ text: token, strongNumber: m[1] });
        i++; // skip the <S> token
        continue;
      }
    }

    if (token) {
      words.push({ text: token, strongNumber: null });
    }
  }

  return words;
}

export function cleanVerseText(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/<pb\/>/g, '');
  cleaned = cleaned.replace(/<f>\[?\d+\]?<\/f>/g, '');
  cleaned = cleaned.replace(/<S>\d+<\/S>/g, '');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  return cleaned.trim();
}

export function getBookTestament(bookNumber: number): 'ot' | 'nt' {
  return bookNumber < 470 ? 'ot' : 'nt';
}

export function getTestamentName(testament: 'ot' | 'nt'): string {
  return testament === 'ot' ? 'Old Testament' : 'New Testament';
}
