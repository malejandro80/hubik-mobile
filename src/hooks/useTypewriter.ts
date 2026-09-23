import { useEffect, useMemo, useRef, useState } from 'react';
import { TYPEWRITER_WORD_INTERVAL_MS } from '../constants/typewriter';
import { MessageParagraph } from '../lib/messageParser';
import { countWords, revealParagraphs } from '../lib/typewriter';

export function useTypewriter(
  paragraphs: MessageParagraph[],
  animate: boolean,
  onDone?: () => void,
  onProgress?: () => void
): { visible: MessageParagraph[]; done: boolean } {
  const total = useMemo(() => countWords(paragraphs), [paragraphs]);
  const [count, setCount] = useState(0);
  const callbacks = useRef({ onDone, onProgress });
  const reportedDone = useRef(false);

  useEffect(() => {
    callbacks.current = { onDone, onProgress };
  });

  const done = !animate || count >= total;

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setCount((current) => current + 1), TYPEWRITER_WORD_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [done]);

  useEffect(() => {
    if (animate && count > 0) callbacks.current.onProgress?.();
  }, [animate, count]);

  useEffect(() => {
    if (!animate || !done || reportedDone.current) return;
    reportedDone.current = true;
    callbacks.current.onDone?.();
  }, [animate, done]);

  const visible = useMemo(
    () => (done ? paragraphs : revealParagraphs(paragraphs, count)),
    [done, paragraphs, count]
  );

  return { visible, done };
}
