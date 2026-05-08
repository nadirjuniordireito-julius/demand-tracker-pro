/**
 * TED Health Map — Serviço de API
 * GET /api/ted/{id}/health — retorna hierarquia BubbleNode
 */

import { api } from './api';
import type { ApiNode } from '@/lib/tedHealthMapNormalize';

export async function fetchTedHealth(tedId: string | number): Promise<ApiNode> {
  return api.get<ApiNode>(`/ted/${tedId}/health`, { allow404: false, silent: true });
}
