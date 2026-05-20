// =====================================================
// Termos Service
// Serviços de CRUD para TermoAbertura, TermoPlanejamento e TermoEncerramento
// =====================================================

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api, { downloadBlob } from './api';
import { termoAberturaDocService, termoPlanejamentoDocService, termoEncerramentoDocService } from './termoDocService';
import { demandaService } from './demandaService';
import { projetoService } from './projetoService';
import i18n from '@/i18n';
import { TermoAberturaReportInner } from '@/reports/TermoAbertura/TermoAberturaReport';
import { TermoPlanejamentoReportInner } from '@/reports/TermoAbertura/TermoPlanejamentoReport';
import { TermoEncerramentoReportInner } from '@/reports/TermoAbertura/TermoEncerramentoReport';
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
import { validatePdfTree } from "@/helpers/validatePdfStyles";

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
      return await api.get<TermoAbertura>(ABERTURA_ENDPOINTS.byDemanda(demandaId), { allow404: false, silent: true });
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

  /**
   * Gera o PDF do termo de abertura usando TermoAberturaReport, grava em TermoAberturaDoc e retorna o blob para preview.
   * @param options.logoUfla - URL do logo UFLA (use import de asset, ex.: import ufla from '@/assets/ufla1.png', para aparecer no PDF)
   * @param options.logoIbama - URL do logo Ibama (opcional)
   */
  async gerarTermoAssinatura(
    id: number,
    projetoId: number,
    _tipo: 'A' | 'P' | 'E',
    options?: { logoIbama?: string; logoUfla?: string }
  ): Promise<Blob> {
    const termo = await this.findById(id);
    const demanda = await demandaService.findById(termo.demandaTecnicaId);
    const projeto = await projetoService.findById(projetoId);

    const stripHtml = (s: string | null | undefined) =>
      (s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const dataAberturaFormatada =
      termo.dataAbertura &&
      (termo.dataAbertura.includes('T')
        ? format(parseISO(termo.dataAbertura), 'dd/MM/yyyy', { locale: ptBR })
        : format(new Date(termo.dataAbertura + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }));

    const descricaoTexto =stripHtml (termo.descricao ?? '');

    const reportProps = {
      PROJETO_COD_TED: projeto.codTed ?? '',
      PROJETO_NOME: projeto.nome ?? '',
      DEMANDA_CODIGO: demanda.codigo ?? '',
      DATA_ABERTURA: dataAberturaFormatada ?? '',
      TERMO_DESCRICAO: descricaoTexto || '',
      ...options,
      labels: {
        documentTitle: i18n.t('openingTerm.report.documentTitle'),
        demandNumber: i18n.t('openingTerm.report.demandNumber'),
        demandDate: i18n.t('openingTerm.report.demandDate'),
        descriptivo: i18n.t('openingTerm.report.descriptivo'),
        signature: i18n.t('openingTerm.report.signature'),
        signatureNote: i18n.t('openingTerm.report.signatureNote'),
        signerName: i18n.t('openingTerm.report.signerName'),
        signerRole: i18n.t('openingTerm.report.signerRole'),
        unidadeDescentralizadora: i18n.t('common.unidadeDescentralizadora'),
        unidadeDescentralizada: i18n.t('common.unidadeDescentralizada'),
        pageOf: (page: number, total: number) => i18n.t('openingTerm.report.pageOf', { page, total }),
      },
    };

    const doc = React.createElement(TermoAberturaReportInner, reportProps);

    // TermoAberturaReportInner é puro (sem hooks), evitando useSyncExternalStore no contexto do react-pdf
    const blob = await pdf(doc as React.ReactElement).toBlob();

    validatePdfTree(doc);

    const file = new File([blob], `termo-abertura-${id}.pdf`, { type: 'application/pdf' });

    const docExists = await termoAberturaDocService.exists(id);
    
    if (docExists) {
      const existing = await termoAberturaDocService.findByTermoAberturaId(id);
      if (existing) await termoAberturaDocService.update(existing.id, file);
    } else {
      await termoAberturaDocService.upload(id, file);
    }
    
    return blob;
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
    return api.get<TermoPlanejamento>(PLANEJAMENTO_ENDPOINTS.byDemanda(demandaId), {
      allow404: true,
      silent: true,
    });
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

  /**
   * Gera o PDF do termo de planejamento usando TermoPlanejamentoReport, grava em TermoPlanejamentoDoc e retorna o blob para preview.
   * @param options.logoUfla - URL do logo UFLA (use import de asset para aparecer no PDF)
   * @param options.logoIbama - URL do logo Ibama (opcional)
   */
  async gerarTermoAssinatura(
    id: number,
    projetoId: number,
    _tipo: 'A' | 'P' | 'E',
    options?: { logoIbama?: string; logoUfla?: string }
  ): Promise<Blob> {
    const termo = await this.findById(id);
    const demanda = await demandaService.findById(termo.demandaTecnicaId);
    const projeto = await projetoService.findById(projetoId);

    const stripHtml = (s: string | null | undefined) =>
      (s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const dataFormatada =
      termo.dataAbertura &&
      (termo.dataAbertura.includes('T')
        ? format(parseISO(termo.dataAbertura), 'dd/MM/yyyy', { locale: ptBR })
        : format(new Date(termo.dataAbertura + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }));

    const CUSTOS_DETALHADOS = (termo.custos ?? []).map((c) => ({
      perfil: c.perfil?.nome ?? '-',
      horas: Number(c.qtdeHora) || 0,
      valorHora: Number(c.valorHora) || 0,
    }));
    const totalGeral = CUSTOS_DETALHADOS.reduce(
      (acc, item) => acc + item.horas * item.valorHora,
      0
    );

  
    const reportProps = {
      PROJETO_COD_TED: projeto.codTed ?? '',
      PROJETO_NOME: projeto.nome ?? '',
      DEMANDA_CODIGO: demanda.codigo ?? '',
      DATA_ABERTURA: dataFormatada ?? '',
      ESPECIFICACAO: termo.especificacao,
      CRONOGRAMA: termo.cronograma,
      RESULTADO_ESPERADO: termo.resultadoEsperado,
      CUSTOS_DETALHADOS,
      totalGeral,
      ...options,
      labels: {
        documentTitle: i18n.t('planningTerm.report.documentTitle'),
        demandNumber: i18n.t('planningTerm.report.demandNumber'),
        planningDate: i18n.t('planningTerm.report.planningDate'),
        specification: i18n.t('planningTerm.report.specification'),
        schedule: i18n.t('planningTerm.report.schedule'),
        expectedResult: i18n.t('planningTerm.report.expectedResult'),
        costs: i18n.t('planningTerm.report.costs'),
        signature: i18n.t('planningTerm.report.signature'),
        signatureNote: i18n.t('planningTerm.report.signatureNote'),
        signerName: i18n.t('planningTerm.report.signerName'),
        signerRole: i18n.t('planningTerm.report.signerRole'),
        unidadeDescentralizadora: i18n.t('common.unidadeDescentralizadora'),
        unidadeDescentralizada: i18n.t('common.unidadeDescentralizada'),
        pageOf: (page: number, total: number) => i18n.t('planningTerm.report.pageOf', { page, total }),
      },
    };

    const doc = React.createElement(TermoPlanejamentoReportInner, reportProps);
  
    validatePdfTree(doc);
  
    const blob = await pdf(doc as React.ReactElement).toBlob();
    const file = new File([blob], `termo-planejamento-${id}.pdf`, { type: 'application/pdf' });

    const docExists = await termoPlanejamentoDocService.exists(id);
    if (docExists) {
      const existing = await termoPlanejamentoDocService.findByTermoPlanejamentoId(id);
      if (existing) await termoPlanejamentoDocService.update(existing.id, file);
    } else {
      await termoPlanejamentoDocService.upload(id, file);
    }

    return blob;
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
      return await api.get<TermoEncerramento>(ENCERRAMENTO_ENDPOINTS.byDemanda(demandaId), { allow404: false, silent: true });
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

  /**
   * Gera o PDF do termo de encerramento usando TermoEncerramentoReport, grava em TermoEncerramentoDoc e retorna o blob para preview.
   * @param options.logoUfla - URL do logo UFLA (use import de asset para aparecer no PDF)
   * @param options.logoIbama - URL do logo Ibama (opcional)
   */
  async gerarTermoAssinatura(
    id: number,
    projetoId: number,
    _tipo: 'A' | 'P' | 'E',
    options?: { logoIbama?: string; logoUfla?: string }
  ): Promise<Blob> {
    const termo = await this.findById(id);
    const demanda = await demandaService.findById(termo.demandaTecnicaId);
    const projeto = await projetoService.findById(projetoId);

    const stripHtml = (s: string | null | undefined) =>
      (s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const dataFormatada =
      termo.dataTermo &&
      (termo.dataTermo.includes('T')
        ? format(parseISO(termo.dataTermo), 'dd/MM/yyyy', { locale: ptBR })
        : format(new Date(termo.dataTermo + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }));
    
    const CUSTOS = (termo.custos || []).map((c) => ({
      perfil: c.perfil?.nome ?? `Perfil ${c.perfilId}`,
      horas: Number(c.qtdeHora),
      valorHora: Number(c.valorHora),
    }));

    const reportProps = {
      PROJETO_COD_TED: projeto.codTed ?? '',
      PROJETO_NOME: projeto.nome ?? '',
      DEMANDA_CODIGO: demanda.codigo ?? '',
      DATA_ABERTURA: dataFormatada ?? '',
      RESULTADO_ENTREGUE: stripHtml(termo.resultadoEntregue),
      CUSTOS_DETALHADOS : CUSTOS,
      totalGeral: termo.custos?.reduce((acc, c) => acc + (c.qtdeHora ?? 0) * (c.valorHora ?? 0), 0) ?? 0,
      ...options,
      labels: {
        documentTitle: i18n.t('closingTerm.report.documentTitle'),
        demandNumber: i18n.t('closingTerm.report.demandNumber'),
        planningDate: i18n.t('closingTerm.report.closingDate'),
        resultsDelivered: i18n.t('closingTerm.report.resultsDelivered'),
        costs: i18n.t('closingTerm.report.costs'),
        signature: i18n.t('closingTerm.report.signature'),
        signatureNote: i18n.t('closingTerm.report.signatureNote'),
        signerName: i18n.t('closingTerm.report.signerName'),
        signerRole: i18n.t('closingTerm.report.signerRole'),
        pageOf: (page: number, total: number) => i18n.t('closingTerm.report.pageOf', { page, total }),
      },
    };

    const doc = React.createElement(TermoEncerramentoReportInner, reportProps);
    const blob = await pdf(doc as React.ReactElement).toBlob();
    const file = new File([blob], `termo-encerramento-${id}.pdf`, { type: 'application/pdf' });

    const docExists = await termoEncerramentoDocService.exists(id);
    if (docExists) {
      const existing = await termoEncerramentoDocService.findByTermoEncerramentoId(id);
      if (existing) await termoEncerramentoDocService.update(existing.id, file);
    } else {
      await termoEncerramentoDocService.upload(id, file);
    }

    return blob;
  },

};
