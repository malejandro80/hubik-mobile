export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const inRange = (index: number) => index >= 0 && index < list.length;
  if (from === to || !inRange(from) || !inRange(to)) return next;

  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function isSamePhotoSet(current: string[], proposed: string[]): boolean {
  if (current.length !== proposed.length) return false;
  const counts = new Map<string, number>();
  current.forEach((uri) => counts.set(uri, (counts.get(uri) ?? 0) + 1));
  for (const uri of proposed) {
    const remaining = counts.get(uri) ?? 0;
    if (remaining === 0) return false;
    counts.set(uri, remaining - 1);
  }
  return true;
}
