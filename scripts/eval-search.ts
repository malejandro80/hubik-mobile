import dotenv from 'dotenv';
import { SEARCH_EVAL_CASES, SearchExpectation } from './eval/searchEvalCases';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

interface Row {
  title: string;
  price: number;
  amenities: string[] | null;
}

async function search(query: string): Promise<Row[]> {
  const res = await fetch(`${supabaseUrl}/functions/v1/chat-query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: query }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return body.data ?? [];
}

function passes(rows: Row[], expect: SearchExpectation): boolean {
  const titles = rows.map((row) => row.title);
  switch (expect.kind) {
    case 'topIncludes':
      return expect.titles.every((title) => titles.slice(0, expect.within).includes(title));
    case 'first':
      return titles[0] === expect.title;
    case 'topHaveAmenity':
      return rows.length >= expect.within && rows.slice(0, expect.within).every((row) => row.amenities?.includes(expect.amenity));
    case 'empty':
      return rows.length === 0;
    case 'minCount':
      return rows.length >= expect.count;
  }
}

async function main() {
  let passed = 0;
  for (const testCase of SEARCH_EVAL_CASES) {
    const rows = await search(testCase.query);
    const ok = passes(rows, testCase.expect);
    if (ok) passed += 1;
    const top = rows.slice(0, 3).map((row) => row.title).join(' | ');
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${testCase.query}  →  ${rows.length} · ${top}`);
  }
  console.log(`\n${passed}/${SEARCH_EVAL_CASES.length} casos`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
