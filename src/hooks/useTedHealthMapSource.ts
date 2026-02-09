/**
 * useTedHealthMapSource — Fonte de dados do TED Health Map via API
 * GET /api/ted/{id}/health
 */

import { useTedHealthMapApi } from './useTedHealthMapApi';
import type { UseTedHealthMapSourceResult } from './useTedHealthMapApi';

export type { UseTedHealthMapSourceResult };

export function useTedHealthMapSource(tedId: string | number | null): UseTedHealthMapSourceResult {
  return useTedHealthMapApi(tedId);
}
