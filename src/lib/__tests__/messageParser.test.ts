import { parseMessageParagraphs } from '../messageParser';

describe('messageParser library', () => {
  it('returns empty array for empty or falsy text', () => {
    expect(parseMessageParagraphs('')).toEqual([]);
  });

  it('parses plain text without bolding into a single segment', () => {
    const result = parseMessageParagraphs('Hola, ¿cómo estás?');
    expect(result).toHaveLength(1);
    expect(result[0].segments).toEqual([{ text: 'Hola, ¿cómo estás?', isBold: false }]);
  });

  it('splits paragraphs by double newline', () => {
    const text = 'Párrafo 1\n\nPárrafo 2';
    const result = parseMessageParagraphs(text);
    expect(result).toHaveLength(2);
    expect(result[0].segments).toEqual([{ text: 'Párrafo 1', isBold: false }]);
    expect(result[1].segments).toEqual([{ text: 'Párrafo 2', isBold: false }]);
  });

  it('parses markdown bold markers within paragraphs', () => {
    const text = 'Hola **Juan**, tienes **3** propiedades disponibles.';
    const result = parseMessageParagraphs(text);
    expect(result).toHaveLength(1);
    expect(result[0].segments).toEqual([
      { text: 'Hola ', isBold: false },
      { text: 'Juan', isBold: true },
      { text: ', tienes ', isBold: false },
      { text: '3', isBold: true },
      { text: ' propiedades disponibles.', isBold: false },
    ]);
  });
});
