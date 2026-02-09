// =====================================================
// Template Demanda Service
// Serviços para CRUD de templates de demanda (DOCX)
// =====================================================

import api, { uploadFile, downloadBlob } from './api';
import type { TemplateDemandaResponseDTO } from '@/types';

// =====================================================
// Template Demanda Service
// =====================================================
const TEMPLATE_ENDPOINTS = {
  base: '/templates-demanda',
  byId: (id: number) => `/templates-demanda/${id}`,
  byProjeto: (projetoId: number) => `/templates-demanda/projeto/${projetoId}`,
  byProjetoAndTipo: (projetoId: number, tipo: string) => `/templates-demanda/projeto/${projetoId}/tipo/${tipo}`,
  download: (id: number) => `/templates-demanda/${id}/download`,
  downloadByProjetoAndTipo: (projetoId: number, tipo: string) => `/templates-demanda/projeto/${projetoId}/tipo/${tipo}/download`,
  exists: (projetoId: number, tipo: string) => `/templates-demanda/projeto/${projetoId}/tipo/${tipo}/exists`,
};

export const templateDemandaService = {
  /**
   * Lista todos os templates
   */
  async findAll(): Promise<TemplateDemandaResponseDTO[]> {
    return api.get<TemplateDemandaResponseDTO[]>(TEMPLATE_ENDPOINTS.base);
  },

  /**
   * Busca template por ID
   */
  async findById(id: number): Promise<TemplateDemandaResponseDTO> {
    return api.get<TemplateDemandaResponseDTO>(TEMPLATE_ENDPOINTS.byId(id));
  },

  /**
   * Busca templates por ID do Projeto
   */
  async findByProjetoId(projetoId: number): Promise<TemplateDemandaResponseDTO[]> {
    try {
      const result = await api.get<TemplateDemandaResponseDTO[]>(TEMPLATE_ENDPOINTS.byProjeto(projetoId), { allow404: true });
      return Array.isArray(result) ? result : [];
    } catch {
      return [];
    }
  },

  /**
   * Busca template por ID do Projeto e Tipo
   */
  async findByProjetoIdAndTipo(projetoId: number, tipo: 'A' | 'P' | 'E'): Promise<TemplateDemandaResponseDTO | null> {
    try {
      return await api.get<TemplateDemandaResponseDTO>(TEMPLATE_ENDPOINTS.byProjetoAndTipo(projetoId, tipo), { allow404: true });
    } catch {
      return null;
    }
  },

  /**
   * Cria um novo template
   */
  async create(projetoId: number, tipo: 'A' | 'P' | 'E', file: File): Promise<TemplateDemandaResponseDTO> {
    const formData = new FormData();
    formData.append('projetoId', String(projetoId));
    formData.append('tipo', tipo);
    formData.append('arquivoDocx', file);
    
    return uploadFile<TemplateDemandaResponseDTO>(TEMPLATE_ENDPOINTS.base, formData, 'POST');
  },

  /**
   * Atualiza um template
   */
  async update(id: number, tipo?: 'A' | 'P' | 'E', file?: File): Promise<TemplateDemandaResponseDTO> {
    const formData = new FormData();
    if (tipo) {
      formData.append('tipo', tipo);
    }
    if (file) {
      formData.append('arquivoDocx', file);
    }
    
    return uploadFile<TemplateDemandaResponseDTO>(TEMPLATE_ENDPOINTS.byId(id), formData, 'PUT');
  },

  /**
   * Deleta um template
   */
  async delete(id: number): Promise<void> {
    return api.delete(TEMPLATE_ENDPOINTS.byId(id));
  },

  /**
   * Faz download do DOCX por ID
   */
  async downloadById(id: number): Promise<Blob> {
    return downloadBlob(TEMPLATE_ENDPOINTS.download(id));
  },

  /**
   * Faz download do DOCX por Projeto e Tipo
   */
  async downloadByProjetoIdAndTipo(projetoId: number, tipo: 'A' | 'P' | 'E'): Promise<Blob> {
    return downloadBlob(TEMPLATE_ENDPOINTS.downloadByProjetoAndTipo(projetoId, tipo));
  },

  /**
   * Verifica se existe template para um Projeto e Tipo
   */
  async exists(projetoId: number, tipo: 'A' | 'P' | 'E'): Promise<boolean> {
    try {
      return await api.get<boolean>(TEMPLATE_ENDPOINTS.exists(projetoId, tipo));
    } catch {
      return false;
    }
  },
};
