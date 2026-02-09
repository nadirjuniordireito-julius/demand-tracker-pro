// =====================================================
// Termos Service
// Serviços de CRUD para TermoAbertura, TermoPlanejamento e TermoEncerramento
// =====================================================

import api, { downloadBlob } from './api';
import {
  termoAberturaSchema,
  termoPlanejamentoSchema,
  termoEncerramentoSchema,
  paginatedTermoAberturaSchema,
  paginatedTermoPlanejamentoSchema,
  paginatedTermoEncerramentoSchema,
} from '@/lib/schemas';
import type { 
  TermoAbertura, 
  TermoAberturaCreateDTO, 
  TermoAberturaUpdateDTO,
  TermoPlanejamento,
  TermoPlanejamentoCreateDTO,
  TermoPlanejamentoUpdateDTO,
  TermoEncerramento,
  TermoEncerramentoCreateDTO,
  TermoEncerramentoUpdateDTO,
  PaginatedResponse 
} from '@/types';

// =====================================================
// Termo de Abertura
// =====================================================
const ABERTURA_ENDPOINTS = {
  base: '/termos-abertura',
  byId: (id: number) => `/termos-abertura/${id}`,
  byDemanda: (demandaId: number) => `/termos-abertura/demanda/${demandaId}`,
  sign: (id: number) => `/termos-abertura/${id}/assinar`,
};

export const termoAberturaService = {
  async findAll(page = 0, size = 10): Promise<PaginatedResponse<TermoAbertura>> {
    return api.get<PaginatedResponse<TermoAbertura>>(
      `${ABERTURA_ENDPOINTS.base}?page=${page}&size=${size}`,
      { schema: paginatedTermoAberturaSchema }
    );
  },

  async findById(id: number): Promise<TermoAbertura> {
    return api.get<TermoAbertura>(ABERTURA_ENDPOINTS.byId(id), { schema: termoAberturaSchema });
  },

  async findByDemandaId(demandaId: number): Promise<TermoAbertura | null> {
    try {
      return await api.get<TermoAbertura>(ABERTURA_ENDPOINTS.byDemanda(demandaId));
    } catch {
      return null;
    }
  },

  async create(data: TermoAberturaCreateDTO): Promise<TermoAbertura> {
    return api.post<TermoAbertura>(ABERTURA_ENDPOINTS.base, data);
  },

  async update(id: number, data: TermoAberturaUpdateDTO): Promise<TermoAbertura> {
    return api.put<TermoAbertura>(ABERTURA_ENDPOINTS.byId(id), data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(ABERTURA_ENDPOINTS.byId(id));
  },

  async sign(id: number): Promise<TermoAbertura> {
    return api.post<TermoAbertura>(ABERTURA_ENDPOINTS.sign(id));
  },

  /**
   * Gera PDF do Termo de Abertura a partir do template DOCX (cliente HTTP centralizado).
   */
  async gerarPdf(id: number, projetoId: number, tipo: 'A' | 'P' | 'E'): Promise<Blob> {
    return downloadBlob(`/termos-abertura/${id}/gerar-pdf?projetoId=${projetoId}&tipo=${tipo}`);
  },
};

// =====================================================
// Termo de Planejamento
// =====================================================
const PLANEJAMENTO_ENDPOINTS = {
  base: '/termos-planejamento',
  byId: (id: number) => `/termos-planejamento/${id}`,
  byDemanda: (demandaId: number) => `/termos-planejamento/demanda/${demandaId}`,
  sign: (id: number) => `/termos-planejamento/${id}/assinar`,
};

export const termoPlanejamentoService = {
  async findAll(page = 0, size = 10): Promise<PaginatedResponse<TermoPlanejamento>> {
    return api.get<PaginatedResponse<TermoPlanejamento>>(
      `${PLANEJAMENTO_ENDPOINTS.base}?page=${page}&size=${size}`,
      { schema: paginatedTermoPlanejamentoSchema }
    );
  },

  async findById(id: number): Promise<TermoPlanejamento> {
    return api.get<TermoPlanejamento>(PLANEJAMENTO_ENDPOINTS.byId(id), { schema: termoPlanejamentoSchema });
  },

  async findByDemandaId(demandaId: number): Promise<TermoPlanejamento | null> {
    try {
      return await api.get<TermoPlanejamento>(PLANEJAMENTO_ENDPOINTS.byDemanda(demandaId), { allow404: true });
    } catch {
      return null;
    }
  },

  async create(data: TermoPlanejamentoCreateDTO): Promise<TermoPlanejamento> {
    return api.post<TermoPlanejamento>(PLANEJAMENTO_ENDPOINTS.base, data);
  },

  async update(id: number, data: TermoPlanejamentoUpdateDTO): Promise<TermoPlanejamento> {
    return api.put<TermoPlanejamento>(PLANEJAMENTO_ENDPOINTS.byId(id), data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(PLANEJAMENTO_ENDPOINTS.byId(id));
  },

  async sign(id: number): Promise<TermoPlanejamento> {
    return api.post<TermoPlanejamento>(PLANEJAMENTO_ENDPOINTS.sign(id));
  },

  /**
   * Gera PDF do Termo de Planejamento (cliente HTTP centralizado).
   */
  async gerarPdf(id: number, projetoId: number, tipo: 'A' | 'P' | 'E'): Promise<Blob> {
    return downloadBlob(`/termos-planejamento/${id}/gerar-pdf?projetoId=${projetoId}&tipo=${tipo}`);
  },
};

// =====================================================
// Termo de Encerramento
// =====================================================
const ENCERRAMENTO_ENDPOINTS = {
  base: '/termos-encerramento',
  byId: (id: number) => `/termos-encerramento/${id}`,
  byDemanda: (demandaId: number) => `/termos-encerramento/demanda/${demandaId}`,
  sign: (id: number) => `/termos-encerramento/${id}/assinar`,
};

export const termoEncerramentoService = {
  async findAll(page = 0, size = 10): Promise<PaginatedResponse<TermoEncerramento>> {
    return api.get<PaginatedResponse<TermoEncerramento>>(
      `${ENCERRAMENTO_ENDPOINTS.base}?page=${page}&size=${size}`,
      { schema: paginatedTermoEncerramentoSchema }
    );
  },

  async findById(id: number): Promise<TermoEncerramento> {
    return api.get<TermoEncerramento>(ENCERRAMENTO_ENDPOINTS.byId(id), { schema: termoEncerramentoSchema });
  },

  async findByDemandaId(demandaId: number): Promise<TermoEncerramento | null> {
    try {
      return await api.get<TermoEncerramento>(ENCERRAMENTO_ENDPOINTS.byDemanda(demandaId), { allow404: true });
    } catch {
      return null;
    }
  },

  async create(data: TermoEncerramentoCreateDTO): Promise<TermoEncerramento> {
    return api.post<TermoEncerramento>(ENCERRAMENTO_ENDPOINTS.base, data);
  },

  async update(id: number, data: TermoEncerramentoUpdateDTO): Promise<TermoEncerramento> {
    return api.put<TermoEncerramento>(ENCERRAMENTO_ENDPOINTS.byId(id), data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(ENCERRAMENTO_ENDPOINTS.byId(id));
  },

  async sign(id: number): Promise<TermoEncerramento> {
    return api.post<TermoEncerramento>(ENCERRAMENTO_ENDPOINTS.sign(id));
  },

  /**
   * Gera PDF do Termo de Encerramento (cliente HTTP centralizado).
   */
  async gerarPdf(id: number, projetoId: number, tipo: 'A' | 'P' | 'E'): Promise<Blob> {
    return downloadBlob(`/termos-encerramento/${id}/gerar-pdf?projetoId=${projetoId}&tipo=${tipo}`);
  },
};
