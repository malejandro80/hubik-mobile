import { useEffect, useState } from 'react';
import { CLIENT_SEARCH_DEBOUNCE_MS } from '../constants/clientSearch';
import { normalizeClientQuery, RateLimitedError, shouldSearchClients } from '../lib/clientSearch';
import { searchAgentCandidates } from '../services/authApi';
import { ClientCandidate } from '../types/auth';

export type ClientSearchStatus = 'idle' | 'loading' | 'ready' | 'rate_limited' | 'error';

export interface ClientSearchResult {
  status: ClientSearchStatus;
  results: ClientCandidate[];
}

interface Settled {
  id: number;
  status: 'ready' | 'rate_limited' | 'error';
  results: ClientCandidate[];
}

const IDLE: ClientSearchResult = { status: 'idle', results: [] };
const LOADING: ClientSearchResult = { status: 'loading', results: [] };

export function useClientSearch(
  query: string,
  search: (text: string) => Promise<ClientCandidate[]> = searchAgentCandidates
): ClientSearchResult {
  const normalized = normalizeClientQuery(query);
  const searchable = shouldSearchClients(query);
  const [settledQuery, setSettledQuery] = useState({ id: 0, query: '' });
  const [outcome, setOutcome] = useState<Settled | null>(null);

  useEffect(() => {
    if (!searchable) return;
    const timer = setTimeout(
      () => setSettledQuery((previous) => ({ id: previous.id + 1, query: normalized })),
      CLIENT_SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [normalized, searchable]);

  useEffect(() => {
    if (settledQuery.id === 0) return;
    let active = true;
    const { id, query: text } = settledQuery;

    search(text)
      .then((results) => {
        if (active) setOutcome({ id, status: 'ready', results });
      })
      .catch((error: unknown) => {
        if (active) {
          setOutcome({ id, status: error instanceof RateLimitedError ? 'rate_limited' : 'error', results: [] });
        }
      });

    return () => {
      active = false;
    };
  }, [settledQuery, search]);

  if (!searchable) return IDLE;
  if (settledQuery.query === normalized && outcome?.id === settledQuery.id) {
    return { status: outcome.status, results: outcome.results };
  }
  return LOADING;
}
