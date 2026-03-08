/**
 * Serviço do documento PDF da Avaliação da Demanda (DemandaAvaliacaoDoc).
 * API: /api/demandas/{demandaId}/avaliacao/doc
 * Usa cliente HTTP centralizado (api.uploadFile, api.downloadBlob, api.get, api.delete).
 */

import api, { uploadFile, downloadBlob } from '@/services/api';

const base = (demandaId: number) => `/demandas/${demandaId}/avaliacao/doc`;
const downloadEndpoint = (demandaId: number) => `/demandas/${demandaId}/avaliacao/doc/download`;
const existsEndpoint = (demandaId: number) => `/demandas/${demandaId}/avaliacao/doc/exists`;

/** Metadados do doc (ajuste conforme o DTO do backend) */
export interface DemandaAvaliacaoDocMeta {
  id?: number;
  demandaTecnicaId?: number;
  [key: string]: unknown;
}

export const avaliacaoDemandaDocService = {
  /** POST (multipart): upload do PDF da avaliação */
  upload(demandaId: number, file: File): Promise<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    return uploadFile(base(demandaId), formData, 'POST');
  },

  /** PUT (multipart): atualizar o PDF da avaliação */
  update(demandaId: number, file: File): Promise<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    return uploadFile(base(demandaId), formData, 'PUT');
  },

  /** GET: metadados do doc da avaliação da demanda */
  async get(demandaId: number): Promise<DemandaAvaliacaoDocMeta | null> {
    try {
      return await api.get<DemandaAvaliacaoDocMeta>(base(demandaId), { allow404: false, silent: true });
    } catch {
      return null;
    }
  },

  /** GET /download: download do PDF */
  download(demandaId: number): Promise<Blob> {
    return downloadBlob(downloadEndpoint(demandaId));
  },

  /** DELETE: remover doc */
  delete(demandaId: number): Promise<void> {
    return api.delete(base(demandaId));
  },

  /** GET /exists: verificar se existe doc para a demanda */
  async exists(demandaId: number): Promise<boolean> {
    try {
      const data = await api.get<boolean | { exists?: boolean }>(existsEndpoint(demandaId), { allow404: false, silent: true });
      return data === true || (typeof data === 'object' && data?.exists === true);
    } catch {
      return false;
    }
  },
};
