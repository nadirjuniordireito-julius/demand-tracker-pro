// =====================================================
// Termo Encerramento Anexo Service
// CRUD e upload/download de anexos do termo de encerramento (status E)
// =====================================================

import api, { uploadFile, downloadBlob } from './api';
import type { TermoEncerramentoAnexoResponseDTO } from '@/types';

const ENDPOINTS = {
  base: '/termos-encerramento-anexos',
  byId: (id: number) => `/termos-encerramento-anexos/${id}`,
  byTermo: (termoEncerramentoId: number) =>
    `/termos-encerramento-anexos/termo/${termoEncerramentoId}`,
  download: (id: number) => `/termos-encerramento-anexos/${id}/download`,
};

export const termoEncerramentoAnexoService = {
  /**
   * Lista anexos de um termo de encerramento
   */
  async findByTermoEncerramentoId(
    termoEncerramentoId: number
  ): Promise<TermoEncerramentoAnexoResponseDTO[]> {
    try {
      const result = await api.get<TermoEncerramentoAnexoResponseDTO[]>(
        ENDPOINTS.byTermo(termoEncerramentoId),
        { allow404: true, silent: true }
      );
      return Array.isArray(result) ? result : [];
    } catch {
      return [];
    }
  },

  /**
   * Busca anexo por ID
   */
  async findById(id: number): Promise<TermoEncerramentoAnexoResponseDTO> {
    return api.get<TermoEncerramentoAnexoResponseDTO>(ENDPOINTS.byId(id));
  },

  /**
   * Upload de anexo (qualquer tipo de arquivo).
   * Backend espera: termoEncerramentoId, arquivo, usuarioId (opcional).
   * tipoConteudo é definido no backend a partir do arquivo.
   */
  async upload(
    termoEncerramentoId: number,
    file: File,
    usuarioId?: number
  ): Promise<TermoEncerramentoAnexoResponseDTO> {
    const formData = new FormData();
    formData.append('termoEncerramentoId', String(termoEncerramentoId));
    formData.append('arquivo', file);
    if (usuarioId != null) formData.append('usuarioId', String(usuarioId));
    return uploadFile<TermoEncerramentoAnexoResponseDTO>(ENDPOINTS.base, formData, 'POST');
  },

  /**
   * Download do arquivo (blob)
   */
  async download(id: number): Promise<Blob> {
    return downloadBlob(ENDPOINTS.download(id));
  },

  /**
   * Remove um anexo (somente se demanda estiver com status E)
   */
  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },
};

export default termoEncerramentoAnexoService;
