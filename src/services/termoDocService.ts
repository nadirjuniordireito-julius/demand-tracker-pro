// =====================================================
// Termos Documentos Service
// Serviços para upload/download de documentos PDF dos termos
// =====================================================

import api, { uploadFile, downloadBlob } from './api';
import type { TermoAberturaDocResponseDTO, TermoPlanejamentoDocResponseDTO, TermoEncerramentoDocResponseDTO } from '@/types';

// =====================================================
// Termo de Abertura Doc
// =====================================================
const ABERTURA_DOC_ENDPOINTS = {
  base: '/termos-abertura-doc',
  byId: (id: number) => `/termos-abertura-doc/${id}`,
  byTermo: (termoAberturaId: number) => `/termos-abertura-doc/termo/${termoAberturaId}`,
  download: (id: number) => `/termos-abertura-doc/${id}/download`,
  downloadByTermo: (termoAberturaId: number) => `/termos-abertura-doc/termo/${termoAberturaId}/download`,
  exists: (termoAberturaId: number) => `/termos-abertura-doc/termo/${termoAberturaId}/exists`,
};

export const termoAberturaDocService = {
  /**
   * Faz upload de um documento PDF para um Termo de Abertura
   */
  async upload(termoAberturaId: number, file: File): Promise<TermoAberturaDocResponseDTO> {
    const formData = new FormData();
    formData.append('termoAberturaId', String(termoAberturaId));
    formData.append('arquivoPdf', file);
    
    return uploadFile<TermoAberturaDocResponseDTO>(ABERTURA_DOC_ENDPOINTS.base, formData, 'POST');
  },

  /**
   * Atualiza o documento PDF de um Termo de Abertura
   */
  async update(id: number, file: File): Promise<TermoAberturaDocResponseDTO> {
    const formData = new FormData();
    formData.append('arquivoPdf', file);
    
    return uploadFile<TermoAberturaDocResponseDTO>(ABERTURA_DOC_ENDPOINTS.byId(id), formData, 'PUT');
  },

  /**
   * Busca informações do documento por ID
   */
  async findById(id: number): Promise<TermoAberturaDocResponseDTO> {
    return api.get<TermoAberturaDocResponseDTO>(ABERTURA_DOC_ENDPOINTS.byId(id));
  },

  /**
   * Busca informações do documento pelo ID do Termo de Abertura
   */
  async findByTermoAberturaId(termoAberturaId: number): Promise<TermoAberturaDocResponseDTO | null> {
    try {
      return await api.get<TermoAberturaDocResponseDTO>(ABERTURA_DOC_ENDPOINTS.byTermo(termoAberturaId), { allow404: true });
    } catch {
      return null;
    }
  },

  /**
   * Faz download do PDF por ID do documento
   */
  async downloadById(id: number): Promise<Blob> {
    return downloadBlob(ABERTURA_DOC_ENDPOINTS.download(id));
  },

  /**
   * Faz download do PDF pelo ID do Termo de Abertura
   */
  async downloadByTermoAberturaId(termoAberturaId: number): Promise<Blob> {
    return downloadBlob(ABERTURA_DOC_ENDPOINTS.downloadByTermo(termoAberturaId));
  },

  /**
   * Verifica se existe documento para um Termo de Abertura
   */
  async exists(termoAberturaId: number): Promise<boolean> {
    try {
      return await api.get<boolean>(ABERTURA_DOC_ENDPOINTS.exists(termoAberturaId));
    } catch {
      return false;
    }
  },

  /**
   * Deleta o documento
   */
  async delete(id: number): Promise<void> {
    return api.delete(ABERTURA_DOC_ENDPOINTS.byId(id));
  },
};

// =====================================================
// Termo de Planejamento Doc
// =====================================================
const PLANEJAMENTO_DOC_ENDPOINTS = {
  base: '/termos-planejamento-doc',
  byId: (id: number) => `/termos-planejamento-doc/${id}`,
  byTermo: (termoPlanejamentoId: number) => `/termos-planejamento-doc/termo/${termoPlanejamentoId}`,
  download: (id: number) => `/termos-planejamento-doc/${id}/download`,
  downloadByTermo: (termoPlanejamentoId: number) => `/termos-planejamento-doc/termo/${termoPlanejamentoId}/download`,
  exists: (termoPlanejamentoId: number) => `/termos-planejamento-doc/termo/${termoPlanejamentoId}/exists`,
};

export const termoPlanejamentoDocService = {
  /**
   * Faz upload de um documento PDF para um Termo de Planejamento
   */
  async upload(termoPlanejamentoId: number, file: File): Promise<TermoPlanejamentoDocResponseDTO> {
    const formData = new FormData();
    formData.append('termoPlanejamentoId', String(termoPlanejamentoId));
    formData.append('arquivoPdf', file);
    
    return uploadFile<TermoPlanejamentoDocResponseDTO>(PLANEJAMENTO_DOC_ENDPOINTS.base, formData, 'POST');
  },

  /**
   * Atualiza o documento PDF de um Termo de Planejamento
   */
  async update(id: number, file: File): Promise<TermoPlanejamentoDocResponseDTO> {
    const formData = new FormData();
    formData.append('arquivoPdf', file);
    
    return uploadFile<TermoPlanejamentoDocResponseDTO>(PLANEJAMENTO_DOC_ENDPOINTS.byId(id), formData, 'PUT');
  },

  /**
   * Busca informações do documento por ID
   */
  async findById(id: number): Promise<TermoPlanejamentoDocResponseDTO> {
    return api.get<TermoPlanejamentoDocResponseDTO>(PLANEJAMENTO_DOC_ENDPOINTS.byId(id));
  },

  /**
   * Busca informações do documento pelo ID do Termo de Planejamento
   */
  async findByTermoPlanejamentoId(termoPlanejamentoId: number): Promise<TermoPlanejamentoDocResponseDTO | null> {
    try {
      return await api.get<TermoPlanejamentoDocResponseDTO>(PLANEJAMENTO_DOC_ENDPOINTS.byTermo(termoPlanejamentoId), { allow404: true });
    } catch {
      return null;
    }
  },

  /**
   * Faz download do PDF por ID do documento
   */
  async downloadById(id: number): Promise<Blob> {
    return downloadBlob(PLANEJAMENTO_DOC_ENDPOINTS.download(id));
  },

  /**
   * Faz download do PDF pelo ID do Termo de Planejamento
   */
  async downloadByTermoPlanejamentoId(termoPlanejamentoId: number): Promise<Blob> {
    return downloadBlob(PLANEJAMENTO_DOC_ENDPOINTS.downloadByTermo(termoPlanejamentoId));
  },

  /**
   * Verifica se existe documento para um Termo de Planejamento
   */
  async exists(termoPlanejamentoId: number): Promise<boolean> {
    try {
      return await api.get<boolean>(PLANEJAMENTO_DOC_ENDPOINTS.exists(termoPlanejamentoId));
    } catch {
      return false;
    }
  },

  /**
   * Deleta o documento
   */
  async delete(id: number): Promise<void> {
    return api.delete(PLANEJAMENTO_DOC_ENDPOINTS.byId(id));
  },
};

// =====================================================
// Termo de Encerramento Doc
// =====================================================
const ENCERRAMENTO_DOC_ENDPOINTS = {
  base: '/termos-encerramento-doc',
  byId: (id: number) => `/termos-encerramento-doc/${id}`,
  byTermo: (termoEncerramentoId: number) => `/termos-encerramento-doc/termo/${termoEncerramentoId}`,
  download: (id: number) => `/termos-encerramento-doc/${id}/download`,
  downloadByTermo: (termoEncerramentoId: number) => `/termos-encerramento-doc/termo/${termoEncerramentoId}/download`,
  exists: (termoEncerramentoId: number) => `/termos-encerramento-doc/termo/${termoEncerramentoId}/exists`,
};

export const termoEncerramentoDocService = {
  /**
   * Faz upload de um documento PDF para um Termo de Encerramento
   */
  async upload(termoEncerramentoId: number, file: File): Promise<TermoEncerramentoDocResponseDTO> {
    const formData = new FormData();
    formData.append('termoEncerramentoId', String(termoEncerramentoId));
    formData.append('arquivoPdf', file);
    
    return uploadFile<TermoEncerramentoDocResponseDTO>(ENCERRAMENTO_DOC_ENDPOINTS.base, formData, 'POST');
  },

  /**
   * Atualiza o documento PDF de um Termo de Encerramento
   */
  async update(id: number, file: File): Promise<TermoEncerramentoDocResponseDTO> {
    const formData = new FormData();
    formData.append('arquivoPdf', file);
    
    return uploadFile<TermoEncerramentoDocResponseDTO>(ENCERRAMENTO_DOC_ENDPOINTS.byId(id), formData, 'PUT');
  },

  /**
   * Busca informações do documento por ID
   */
  async findById(id: number): Promise<TermoEncerramentoDocResponseDTO> {
    return api.get<TermoEncerramentoDocResponseDTO>(ENCERRAMENTO_DOC_ENDPOINTS.byId(id));
  },

  /**
   * Busca informações do documento pelo ID do Termo de Encerramento
   */
  async findByTermoEncerramentoId(termoEncerramentoId: number): Promise<TermoEncerramentoDocResponseDTO | null> {
    try {
      return await api.get<TermoEncerramentoDocResponseDTO>(ENCERRAMENTO_DOC_ENDPOINTS.byTermo(termoEncerramentoId), { allow404: true });
    } catch {
      return null;
    }
  },

  /**
   * Faz download do PDF por ID do documento
   */
  async downloadById(id: number): Promise<Blob> {
    return downloadBlob(ENCERRAMENTO_DOC_ENDPOINTS.download(id));
  },

  /**
   * Faz download do PDF pelo ID do Termo de Encerramento
   */
  async downloadByTermoEncerramentoId(termoEncerramentoId: number): Promise<Blob> {
    return downloadBlob(ENCERRAMENTO_DOC_ENDPOINTS.downloadByTermo(termoEncerramentoId));
  },

  /**
   * Verifica se existe documento para um Termo de Encerramento
   */
  async exists(termoEncerramentoId: number): Promise<boolean> {
    try {
      return await api.get<boolean>(ENCERRAMENTO_DOC_ENDPOINTS.exists(termoEncerramentoId));
    } catch {
      return false;
    }
  },

  /**
   * Deleta o documento
   */
  async delete(id: number): Promise<void> {
    return api.delete(ENCERRAMENTO_DOC_ENDPOINTS.byId(id));
  },
};
