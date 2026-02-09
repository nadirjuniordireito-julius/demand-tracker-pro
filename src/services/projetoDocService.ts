// =====================================================
// ProjetoDoc Service
// CRUD e upload/download de documentos do projeto
// =====================================================

import api, { uploadFile, downloadBlob } from './api';
import type { ProjetoDoc } from '@/types';

const ENDPOINTS = {
  base: '/projeto-docs',
  byId: (id: number) => `/projeto-docs/${id}`,
  download: (id: number) => `/projeto-docs/${id}/download`,
};

export const projetoDocService = {
  /**
   * Lista documentos de um projeto
   */
  async findByProjeto(projetoId: number): Promise<ProjetoDoc[]> {
    try {
      const result = await api.get<ProjetoDoc[]>(`${ENDPOINTS.base}/projeto/${projetoId}`, { allow404: true });
      return Array.isArray(result) ? result : [];
    } catch {
      return [];
    }
  },

  /**
   * Envia um documento para o projeto (multipart: projetoId, file, nome opcional)
   */
  async upload(projetoId: number, file: File, nome?: string): Promise<ProjetoDoc> {
    const formData = new FormData();
    formData.append('projetoId', String(projetoId));
    formData.append('documento', file);
    if (nome?.trim()) formData.append('nome', nome.trim());
    return uploadFile<ProjetoDoc>(ENDPOINTS.base, formData, 'POST');
  },

  /**
   * Download do arquivo (blob)
   */
  async download(id: number): Promise<Blob> {
    return downloadBlob(ENDPOINTS.download(id));
  },

  /**
   * Remove um documento
   */
  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },
};

export default projetoDocService;
