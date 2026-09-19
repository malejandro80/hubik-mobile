export interface MessageSegment {
  text: string;
  isBold: boolean;
}

export interface MessageParagraph {
  segments: MessageSegment[];
}

export function parseMessageParagraphs(text: string): MessageParagraph[] {
  if (!text) return [];
  const paragraphs = text.split('\n\n');
  return paragraphs.map((para) => {
    if (!para.includes('**')) {
      return { segments: [{ text: para, isBold: false }] };
    }
    const parts = para.split(/(\*\*[^*]+\*\*)/g);
    const segments = parts.map((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return { text: part.slice(2, -2), isBold: true };
      }
      return { text: part, isBold: false };
    });
    return { segments };
  });
}
