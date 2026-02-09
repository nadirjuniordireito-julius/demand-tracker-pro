/**
 * TED Health Map — Serviço de API
 * GET /api/ted/{id}/health — retorna hierarquia BubbleNode
 */

import { api } from './api';
import type { BubbleNode } from '@/types/tedHealthMap';

export async function fetchTedHealth(tedId: string | number): Promise<BubbleNode> {
  return api.get<BubbleNode>(`/ted/${tedId}/health`);
}
