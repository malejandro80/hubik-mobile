import { countWords, revealParagraphs } from '../typewriter';
import { parseMessageParagraphs } from '../messageParser';

const text = 'Hay **9 pisos** en Valencia.\n\nDesde 350 USD.';
const paragraphs = parseMessageParagraphs(text);

const plain = (items: ReturnType<typeof revealParagraphs>) =>
  items.map((paragraph) => paragraph.segments.map((segment) => segment.text).join('')).join('\n\n');

describe('countWords', () => {
  it('counts words across segments and paragraphs', () => {
    expect(countWords(paragraphs)).toBe(8);
  });

  it('is zero for an empty message', () => {
    expect(countWords(parseMessageParagraphs(''))).toBe(0);
  });
});

describe('revealParagraphs', () => {
  it('reveals nothing at zero words', () => {
    expect(revealParagraphs(paragraphs, 0)).toEqual([]);
  });

  it('reveals whole words in order, without trailing spaces', () => {
    expect(plain(revealParagraphs(paragraphs, 1))).toBe('Hay');
    expect(plain(revealParagraphs(paragraphs, 2))).toBe('Hay 9');
  });

  it('keeps a partly revealed bold segment bold, never exposing its markers', () => {
    const revealed = revealParagraphs(paragraphs, 2);

    expect(revealed[0].segments).toEqual([
      { text: 'Hay ', isBold: false },
      { text: '9', isBold: true },
    ]);
  });

  it('starts the next paragraph only after the previous one is complete', () => {
    expect(revealParagraphs(paragraphs, 5)).toHaveLength(1);
    expect(plain(revealParagraphs(paragraphs, 6))).toBe('Hay 9 pisos en Valencia.\n\nDesde');
  });

  it('returns every paragraph unchanged once all words are revealed', () => {
    expect(revealParagraphs(paragraphs, 8)).toEqual(paragraphs);
    expect(revealParagraphs(paragraphs, 100)).toEqual(paragraphs);
  });
});
