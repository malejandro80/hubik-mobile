import { WHITESPACE_ONLY_PATTERN, WORD_SEPARATOR_PATTERN } from '../constants/typewriter';
import { MessageParagraph, MessageSegment } from './messageParser';

const wordsIn = (text: string): number => text.split(WORD_SEPARATOR_PATTERN).filter((token) => token && !WHITESPACE_ONLY_PATTERN.test(token)).length;

export function countWords(paragraphs: MessageParagraph[]): number {
  return paragraphs.reduce(
    (total, paragraph) => total + paragraph.segments.reduce((sum, segment) => sum + wordsIn(segment.text), 0),
    0
  );
}

export function revealParagraphs(paragraphs: MessageParagraph[], words: number): MessageParagraph[] {
  if (words >= countWords(paragraphs)) return paragraphs;

  let remaining = words;
  const revealed: MessageParagraph[] = [];

  for (const paragraph of paragraphs) {
    if (remaining <= 0) break;
    const segments: MessageSegment[] = [];

    for (const segment of paragraph.segments) {
      if (remaining <= 0) break;
      let text = '';
      let pendingSpace = '';

      for (const token of segment.text.split(WORD_SEPARATOR_PATTERN)) {
        if (!token) continue;
        if (WHITESPACE_ONLY_PATTERN.test(token)) {
          pendingSpace += token;
          continue;
        }
        if (remaining <= 0) break;
        text += pendingSpace + token;
        pendingSpace = '';
        remaining -= 1;
      }

      if (remaining > 0) text += pendingSpace;
      if (text) segments.push({ text, isBold: segment.isBold });
    }

    if (segments.length > 0) revealed.push({ segments });
  }

  return revealed;
}
