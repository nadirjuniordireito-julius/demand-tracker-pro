/**
 * useTedHealthMapApi — Hook que busca dados do TED Health Map via API
 * GET /api/ted/{id}/health
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchTedHealth } from '@/services/tedHealthMapService';
import type { BubbleNode } from '@/types/tedHealthMap';
import { normalizeBubbleNode } from '@/lib/tedHealthMapNormalize';

export interface UseTedHealthMapSourceResult {
  data: BubbleNode | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTedHealthMapApi(tedId: string | number | null): UseTedHealthMapSourceResult {
  const [data, setData] = useState<BubbleNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tedId) {
      setData(null);
      setLoading(false);
      setError('Selecione um projeto.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchTedHealth(tedId);
      const normalized = normalizeBubbleNode(result);
      setData(normalized);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do TED Health Map.');
    } finally {
      setLoading(false);
    }
  }, [tedId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    error,
    refetch: load,
  };
}
