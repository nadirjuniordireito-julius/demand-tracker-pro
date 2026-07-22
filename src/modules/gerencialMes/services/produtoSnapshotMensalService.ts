import { z } from 'zod';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import api from '@/services/api';
import i18n from '@/i18n';
import {
  paginatedProdutoSnapshotMensalSchema,
  produtoSnapshotAcaoSchema,
  produtoSnapshotMensalSchema,
  produtoSnapshotRelatorioGestorSchema,
} from '@/lib/schemas';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { ReportProdutoMesInner } from '@/reports/GerencialMes/ReportProdutoMes';
import { APP_VERSION } from '@/constants/appInfo';
import type {
  PaginatedResponse,
  DemandaProdutoViewDTO,
  ProdutoResumoDTO,
  ProdutoSnapshotAcaoCreateDTO,
  ProdutoSnapshotAcaoDTO,
  ProdutoSnapshotAcaoUpdateDTO,
  ProdutoSnapshotAcaoUpdateStatusDTO,
  ProdutoSnapshotMensalCreateDTO,
  ProdutoSnapshotMensalDTO,
  ProdutoSnapshotMensalUpdateDTO,
  ProdutoSnapshotRelatorioGestorDTO,
} from '@/types';

const BASE = '/produtos-snapshots-mensais';

const ENDPOINTS = {
  base: BASE,
  byId: (id: number) => `${BASE}/${id}`,
  fechar: (id: number) => `${BASE}/${id}/fechar`,
  reabrir: (id: number) => `${BASE}/${id}/reabrir`,
  relatorioGestor: `${BASE}/relatorio-gestor`,
  relatorioGestorUltimo: `${BASE}/relatorio-gestor/ultimo`,
  acoes: (snapshotId: number) => `${BASE}/${snapshotId}/acoes`,
  acaoById: (snapshotId: number, acaoId: number) => `${BASE}/${snapshotId}/acoes/${acaoId}`,
  acaoStatus: (snapshotId: number, acaoId: number) => `${BASE}/${snapshotId}/acoes/${acaoId}/status`,
};

export interface ProdutoSnapshotMensalFilters {
  metaProdutoId?: number;
  ano?: number;
  mes?: number;
  page?: number;
  size?: number;
  sort?: string;
}

function formatDateByLocale(value: string, locale: string): string {
  const [y, m, d] = value.split('-').map(Number);
  if ([y, m, d].some((n) => Number.isNaN(n))) return value;
  return new Date(y, m - 1, d).toLocaleDateString(locale);
}

function monthYearLabel(ano: number, mes: number, locale: string): string {
  try {
    return new Date(ano, mes - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  } catch {
    return `${mes}/${ano}`;
  }
}

function formatLongDate(locale: string): string {
  try {
    const now = new Date();
    const datePart = now.toLocaleDateString(locale || 'pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timePart = now.toTimeString().slice(0, 8);
    return `${datePart} ${timePart}`;
  } catch {
    const now = new Date();
    return `${now.toLocaleDateString('pt-BR')} ${now.toTimeString().slice(0, 8)}`;
  }
}

function buildListQuery(filters: ProdutoSnapshotMensalFilters): string {
  const params = new URLSearchParams();
  if (filters.metaProdutoId != null) params.append('metaProdutoId', String(filters.metaProdutoId));
  if (filters.ano != null) params.append('ano', String(filters.ano));
  if (filters.mes != null) params.append('mes', String(filters.mes));
  if (filters.page !== undefined) params.append('page', String(filters.page));
  if (filters.size !== undefined) params.append('size', String(filters.size));
  if (filters.sort) params.append('sort', filters.sort);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export const produtoSnapshotMensalService = {
  async findPage(filters: ProdutoSnapshotMensalFilters = {}): Promise<PaginatedResponse<ProdutoSnapshotMensalDTO>> {
    const raw = await api.get<unknown>(`${ENDPOINTS.base}${buildListQuery(filters)}`);
    const parsed = paginatedProdutoSnapshotMensalSchema.parse(raw);
    return {
      content: parsed.content as ProdutoSnapshotMensalDTO[],
      totalElements: parsed.totalElements,
      totalPages: parsed.totalPages,
      size: parsed.size,
      number: parsed.number,
      first: parsed.first ?? parsed.number === 0,
      last: parsed.last ?? parsed.number >= parsed.totalPages - 1,
    };
  },

  async findById(id: number): Promise<ProdutoSnapshotMensalDTO> {
    const raw = await api.get<unknown>(ENDPOINTS.byId(id));
    return produtoSnapshotMensalSchema.parse(raw) as ProdutoSnapshotMensalDTO;
  },


  async create(data: ProdutoSnapshotMensalCreateDTO): Promise<ProdutoSnapshotMensalDTO> {
    const raw = await api.post<unknown>(ENDPOINTS.base, data);
    return produtoSnapshotMensalSchema.parse(raw) as ProdutoSnapshotMensalDTO;
  },

  async update(id: number, data: ProdutoSnapshotMensalUpdateDTO): Promise<ProdutoSnapshotMensalDTO> {
    const raw = await api.put<unknown>(ENDPOINTS.byId(id), data);
    return produtoSnapshotMensalSchema.parse(raw) as ProdutoSnapshotMensalDTO;
  },

  async delete(id: number): Promise<void> {
    await api.delete(ENDPOINTS.byId(id));
  },

  async fechar(id: number): Promise<ProdutoSnapshotMensalDTO> {
    const raw = await api.post<unknown>(ENDPOINTS.fechar(id));
    return produtoSnapshotMensalSchema.parse(raw) as ProdutoSnapshotMensalDTO;
  },

  async reabrir(id: number): Promise<ProdutoSnapshotMensalDTO> {
    const raw = await api.post<unknown>(ENDPOINTS.reabrir(id));
    return produtoSnapshotMensalSchema.parse(raw) as ProdutoSnapshotMensalDTO;
  },

  async listAcoes(snapshotId: number): Promise<ProdutoSnapshotAcaoDTO[]> {
    const raw = await api.get<unknown>(ENDPOINTS.acoes(snapshotId));
    const arr = z.array(produtoSnapshotAcaoSchema).parse(raw);
    return arr as ProdutoSnapshotAcaoDTO[];
  },

  async createAcao(snapshotId: number, data: ProdutoSnapshotAcaoCreateDTO): Promise<ProdutoSnapshotAcaoDTO> {
    const raw = await api.post<unknown>(ENDPOINTS.acoes(snapshotId), data);
    return produtoSnapshotAcaoSchema.parse(raw) as ProdutoSnapshotAcaoDTO;
  },

  async updateAcao(
    snapshotId: number,
    acaoId: number,
    data: ProdutoSnapshotAcaoUpdateDTO,
  ): Promise<ProdutoSnapshotAcaoDTO> {
    const raw = await api.put<unknown>(ENDPOINTS.acaoById(snapshotId, acaoId), data);
    return produtoSnapshotAcaoSchema.parse(raw) as ProdutoSnapshotAcaoDTO;
  },

  async updateAcaoStatus(
    snapshotId: number,
    acaoId: number,
    data: ProdutoSnapshotAcaoUpdateStatusDTO,
  ): Promise<ProdutoSnapshotAcaoDTO> {
    const raw = await api.put<unknown>(ENDPOINTS.acaoStatus(snapshotId, acaoId), data);
    return produtoSnapshotAcaoSchema.parse(raw) as ProdutoSnapshotAcaoDTO;
  },

  async deleteAcao(snapshotId: number, acaoId: number): Promise<void> {
    await api.delete(ENDPOINTS.acaoById(snapshotId, acaoId));
  },

  async getRelatorioGestor(params: {
    ano: number;
    mes: number;
    projetoId?: number | null;
  }): Promise<ProdutoSnapshotRelatorioGestorDTO> {
    const sp = new URLSearchParams();
    sp.append('ano', String(params.ano));
    sp.append('mes', String(params.mes));
    if (params.projetoId != null && params.projetoId !== undefined) {
      sp.append('projetoId', String(params.projetoId));
    }
    const raw = await api.get<unknown>(`${ENDPOINTS.relatorioGestor}?${sp.toString()}`);
    return produtoSnapshotRelatorioGestorSchema.parse(raw) as ProdutoSnapshotRelatorioGestorDTO;
  },

  async getUltimoRelatorioGestor(projetoId: number): Promise<ProdutoSnapshotRelatorioGestorDTO | null> {
    const sp = new URLSearchParams();
    sp.append('projetoId', String(projetoId));
    const raw = await api.get<unknown>(`${ENDPOINTS.relatorioGestorUltimo}?${sp.toString()}`, {
      allow404: true,
      silent: true,
    });
    if (raw == null) return null;
    return produtoSnapshotRelatorioGestorSchema.parse(raw) as ProdutoSnapshotRelatorioGestorDTO;
  },

  async gerarReportProdutoMesPdf(args: {
    snapshot: ProdutoSnapshotMensalDTO;
    resumo: ProdutoResumoDTO | null;
    acoes: ProdutoSnapshotAcaoDTO[];
    demandas: DemandaProdutoViewDTO[];
    locale: string;
  }): Promise<Blob> {
    const { snapshot, resumo, acoes, demandas, locale } = args;
    const labels = {
      title: i18n.t('gerencialMes.reportProdutoMes.title'),
      subtitle: i18n.t('gerencialMes.reportProdutoMes.subtitle'),
      period: i18n.t('gerencialMes.reportProdutoMes.period'),
      metricsTitle: i18n.t('gerencialMes.reportProdutoMes.metricsTitle'),
      diagnosisTitle: i18n.t('gerencialMes.reportProdutoMes.diagnosisTitle'),
      actionsTitle: i18n.t('gerencialMes.reportProdutoMes.actionsTitle'),
      demandsTitle: i18n.t('gerencialMes.productDemandsTitle'),
      budgeted: i18n.t('gerencialMes.budgeted'),
      inExecution: i18n.t('gerencialMes.inExecution'),
      executed: i18n.t('gerencialMes.executed'),
      executionPercent: i18n.t('gerencialMes.executionPercent'),
      avgPlanned: i18n.t('gerencialMes.avgPlannedMonthly'),
      avgReal: i18n.t('gerencialMes.avgRealMonthly'),
      statusMonth: i18n.t('gerencialMes.statusMonth'),
      situation: i18n.t('gerencialMes.situation'),
      analyticSummary: i18n.t('gerencialMes.analyticSummary'),
      empty: '—',
      actionType: i18n.t('gerencialMes.acaoTipo'),
      actionDescription: i18n.t('gerencialMes.acaoDesc'),
      actionResponsible: i18n.t('gerencialMes.responsibleUser'),
      actionDueDate: i18n.t('gerencialMes.acaoPrazo'),
      actionImpact: i18n.t('gerencialMes.acaoImpact'),
      actionStatus: i18n.t('gerencialMes.acaoStatus'),
      demandaCodigo: i18n.t('gerencialMes.demandaCodigo'),
      demandaNome: i18n.t('gerencialMes.demandaNome'),
      demandaStatus: i18n.t('gerencialMes.demandaStatus'),
      demandaTotalPrevisto: i18n.t('gerencialMes.demandaTotalPrevisto'),
      demandaTotalExecutado: i18n.t('gerencialMes.demandaTotalExecutado'),
      pageOf: (page: number, total: number) => i18n.t('gerencialMes.reportProdutoMes.pageOf', { page, total }),
    };

    const doc = React.createElement(ReportProdutoMesInner, {
      produtoCodigo: resumo?.codigoProduto ?? snapshot.metaProduto?.codigo ?? '—',
      produtoNome: resumo?.nomeProduto ?? snapshot.metaProduto?.nome ?? i18n.t('gerencialMes.product'),
      produtoDescricao: snapshot.metaProduto?.descricao ?? labels.subtitle,
      periodoLabel: monthYearLabel(snapshot.ano, snapshot.mes, locale),
      valorTotalOrcamento: formatCurrency(snapshot.valorTotalOrcamento),
      valorTotalEmExecucao: formatCurrency(snapshot.valorTotalEmExecucao),
      valorTotalExecutado: formatCurrency(snapshot.valorTotalExecutado),
      percentualExecucao: formatPercent(snapshot.percentualExecucao ?? 0),
      valorMediaEntregaPrevistaMensal: formatCurrency(snapshot.valorMediaEntregaPrevistaMensal),
      valorMediaEntregaRealMensal: formatCurrency(snapshot.valorMediaEntregaRealMensal),
      statusProdutoMes: i18n.t(`gerencialMes.statusMes.${snapshot.statusProdutoMes}`),
      situacao: snapshot.situacao ?? '—',
      resumoAnalitico: snapshot.resumoAnalitico ?? '—',
      impressaoRodape: `Impresso em ${formatLongDate(locale)} por © Julius - Todos os Direitos reservados - V. ${APP_VERSION}`,
      demandas: demandas.map((d) => ({
        codigo: d.codigo,
        nome: d.nome,
        status: i18n.t(`demands.status${d.status}`),
        totalPrevisto: formatCurrency(d.totalPrevisto),
        totalExecutado: formatCurrency(d.totalExecutado),
      })),
      acoes: acoes.map((a) => ({
        tipo: i18n.t(`gerencialMes.tipoAcao.${a.tipoAcao}`),
        descricao: a.descricao,
        responsavel: a.responsavelNome ?? (a.responsavelId != null ? String(a.responsavelId) : '—'),
        prazo: formatDateByLocale(a.prazo, locale),
        impacto: i18n.t(`gerencialMes.impacto.${a.impacto}`),
        status: i18n.t(`gerencialMes.statusAcao.${a.statusAcao}`),
      })),
      labels,
    });

    return pdf(doc as React.ReactElement).toBlob();
  },
};
