/**
 * Geração de PDF do Relatório de Avaliação da Demanda
 * Usa @react-pdf/renderer para produzir o documento.
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type { DemandaAvaliacaoResponse } from './types';

// Estilos do documento
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
  },
  subtitle: {
    fontSize: 9,
    color: '#666',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '40%',
    color: '#444',
  },
  value: {
    width: '60%',
  },
  contextBlock: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    marginBottom: 16,
    borderRadius: 2,
  },
  contextRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  contextLabel: {
    width: 140,
    color: '#555',
  },
  textBlock: {
    marginBottom: 8,
  },
  textLabel: {
    fontSize: 9,
    color: '#444',
    marginBottom: 2,
  },
  textValue: {
    fontSize: 9,
    minHeight: 24,
  },
});

export interface AvaliacaoPdfContext {
  projetoNome: string;
  metaCodigo: string;
  metaNome: string;
  produtoCodigo: string;
  produtoNome: string;
  demandaCodigo: string;
  demandaNome: string;
  dataHoraPreenchimento?: string;
  usuarioNome?: string;
}

export interface AvaliacaoPdfSection {
  sectionTitle: string;
  rows: Array<{ label: string; value: string }>;
}

/** Rótulos do PDF (i18n aplicado na página e repassado aqui) */
export interface AvaliacaoPdfLabels {
  reportTitle: string;
  reportSubtitle: string;
  contextTitle: string;
  labelProjeto: string;
  labelMetaCodeName: string;
  labelProdutoCodeName: string;
  labelDemandaCodeName: string;
  labelDataHoraPreenchimento: string;
  labelPreenchidoPor: string;
}

export interface AvaliacaoDemandaPdfData {
  labels: AvaliacaoPdfLabels;
  context: AvaliacaoPdfContext;
  sections: AvaliacaoPdfSection[];
}

interface AvaliacaoDemandaPdfDocumentProps {
  data: AvaliacaoDemandaPdfData;
}

function AvaliacaoDemandaPdfDocument({ data }: AvaliacaoDemandaPdfDocumentProps) {
  const { labels, context, sections } = data;
  const formatDateTime = (s?: string) => {
    if (!s) return '—';
    try {
      const d = new Date(s);
      return Number.isFinite(d.getTime()) ? d.toLocaleString('pt-BR') : s;
    } catch {
      return s;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{labels.reportTitle}</Text>
        <Text style={styles.subtitle}>{labels.reportSubtitle}</Text>

        <View style={styles.contextBlock}>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>{labels.contextTitle}</Text>
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>{labels.labelProjeto}</Text>
            <Text>{context.projetoNome || '—'}</Text>
          </View>
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>{labels.labelMetaCodeName}</Text>
            <Text>
              {[context.metaCodigo, context.metaNome].filter(Boolean).join(' — ') || '—'}
            </Text>
          </View>
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>{labels.labelProdutoCodeName}</Text>
            <Text>
              {[context.produtoCodigo, context.produtoNome].filter(Boolean).join(' — ') || '—'}
            </Text>
          </View>
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>{labels.labelDemandaCodeName}</Text>
            <Text>{context.demandaCodigo} — {context.demandaNome}</Text>
          </View>
          {context.dataHoraPreenchimento != null && (
            <View style={styles.contextRow}>
              <Text style={styles.contextLabel}>{labels.labelDataHoraPreenchimento}</Text>
              <Text>{formatDateTime(context.dataHoraPreenchimento)}</Text>
            </View>
          )}
          {context.usuarioNome != null && context.usuarioNome !== '' && (
            <View style={styles.contextRow}>
              <Text style={styles.contextLabel}>{labels.labelPreenchidoPor}</Text>
              <Text>{context.usuarioNome}</Text>
            </View>
          )}
        </View>

        {sections.map((section, idx) => (
          <View key={idx}>
            <Text style={styles.sectionTitle}>{section.sectionTitle}</Text>
            {section.rows.map((row, rIdx) => (
              <View key={rIdx} style={styles.row}>
                <Text style={styles.label}>{row.label}</Text>
                <Text style={styles.value}>{row.value}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

/**
 * Gera o PDF da avaliação e retorna um Blob para preview/download.
 */
export async function generateAvaliacaoDemandaPdfBlob(
  data: AvaliacaoDemandaPdfData
): Promise<Blob> {
  const doc = <AvaliacaoDemandaPdfDocument data={data} />;
  return await pdf(doc).toBlob();
}

/** Opções de risco e chaves de label para montar o PDF a partir da resposta da API */
const TIPO_RISCO_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: 'FALHA_REQUISITOS', labelKey: 'avaliacaoDemanda.riscoFalhaRequisitos' },
  { value: 'MUDANCA_ESCOPO', labelKey: 'avaliacaoDemanda.riscoMudancaEscopo' },
  { value: 'COMUNICACAO', labelKey: 'avaliacaoDemanda.riscoComunicacao' },
  { value: 'TERCEIROS', labelKey: 'avaliacaoDemanda.riscoTerceiros' },
  { value: 'FALTA_RECURSOS', labelKey: 'avaliacaoDemanda.riscoFaltaRecursos' },
  { value: 'FALTA_COMPETENCIA', labelKey: 'avaliacaoDemanda.riscoFaltaCompetencia' },
  { value: 'INFRAESTRUTURA', labelKey: 'avaliacaoDemanda.riscoInfraestrutura' },
  { value: 'GOVERNANCA', labelKey: 'avaliacaoDemanda.riscoGovernanca' },
  { value: 'OUTROS', labelKey: 'avaliacaoDemanda.riscoOutros' },
];
const QUALIDADE_LABEL_KEYS: Record<string, string> = {
  atendimentoRequisitos: 'avaliacaoDemanda.labelAtendimentoRequisitos',
  estabilidade: 'avaliacaoDemanda.labelEstabilidade',
  retrabalho: 'avaliacaoDemanda.labelRetrabalho',
  satisfacaoUsuario: 'avaliacaoDemanda.labelSatisfacaoUsuario',
  clarezaRequisitos: 'avaliacaoDemanda.labelClarezaRequisitos',
};
const MATURIDADE_LABEL_KEYS: Record<string, string> = {
  qualidadePlanejamento: 'avaliacaoDemanda.labelQualidadePlanejamento',
  aderenciaCronograma: 'avaliacaoDemanda.labelAderenciaCronograma',
  comunicacao: 'avaliacaoDemanda.labelComunicacao',
};
const LICOES_LABEL_KEYS: Record<string, string> = {
  causaAtraso: 'avaliacaoDemanda.labelCausaAtraso',
  causaCusto: 'avaliacaoDemanda.labelCausaCusto',
  gargalo: 'avaliacaoDemanda.labelGargalo',
  impactoEquipe: 'avaliacaoDemanda.labelImpactoEquipe',
  correcoes: 'avaliacaoDemanda.labelCorrecoes',
  licoesPositivas: 'avaliacaoDemanda.labelLicoesPositivas',
  licoesNegativas: 'avaliacaoDemanda.labelLicoesNegativas',
  melhorias: 'avaliacaoDemanda.labelMelhorias',
};

export type TFunction = (key: string) => string;

/**
 * Monta AvaliacaoDemandaPdfData a partir da resposta da API (para visualização no health map, etc.).
 */
export function buildAvaliacaoDemandaPdfDataFromResponse(
  avaliacao: DemandaAvaliacaoResponse,
  context: AvaliacaoPdfContext,
  t: TFunction
): AvaliacaoDemandaPdfData {
  const v = avaliacao;
  const labels: AvaliacaoPdfLabels = {
    reportTitle: t('avaliacaoDemanda.pdfReportTitle'),
    reportSubtitle: t('avaliacaoDemanda.pdfReportSubtitle'),
    contextTitle: t('avaliacaoDemanda.pdfContextTitle'),
    labelProjeto: t('avaliacaoDemanda.pdfLabelProjeto'),
    labelMetaCodeName: t('avaliacaoDemanda.pdfLabelMetaCodeName'),
    labelProdutoCodeName: t('avaliacaoDemanda.pdfLabelProdutoCodeName'),
    labelDemandaCodeName: t('avaliacaoDemanda.pdfLabelDemandaCodeName'),
    labelDataHoraPreenchimento: t('avaliacaoDemanda.pdfLabelDataHoraPreenchimento'),
    labelPreenchidoPor: t('avaliacaoDemanda.pdfLabelPreenchidoPor'),
  };
  const simNao = (b: boolean) => (b ? t('common.yes') : t('common.no'));
  const reutilizacaoLabel = (r: string) => {
    if (r === 'BAIXA') return t('avaliacaoDemanda.reutilizacaoBaixa');
    if (r === 'MEDIA') return t('avaliacaoDemanda.reutilizacaoMedia');
    if (r === 'ALTA') return t('avaliacaoDemanda.reutilizacaoAlta');
    return r;
  };
  const riscosLabels = (v.riscos ?? [])
    .map((r) => TIPO_RISCO_OPTIONS.find((o) => o.value === r)?.labelKey ?? r)
    .map((key) => t(key));
  const textos = (v.textos ?? {}) as Record<string, string>;
  const sections: AvaliacaoPdfSection[] = [
    {
      sectionTitle: t('avaliacaoDemanda.stepPrazoCusto'),
      rows: [
        { label: t('avaliacaoDemanda.labelAtraso'), value: simNao(v.atraso) },
        { label: t('avaliacaoDemanda.labelImpactoAtraso'), value: String(v.impactoAtraso) },
        { label: t('avaliacaoDemanda.labelDesvioPrazo'), value: `${v.desvioPrazoPercentual}%` },
        { label: t('avaliacaoDemanda.labelDesvioCusto'), value: `${v.desvioCustoPercentual}%` },
        { label: t('avaliacaoDemanda.labelImpactoFinanceiro'), value: String(v.impactoFinanceiro) },
      ],
    },
    {
      sectionTitle: t('avaliacaoDemanda.stepQualidade'),
      rows: [
        { label: t(QUALIDADE_LABEL_KEYS.atendimentoRequisitos), value: String(v.atendimentoRequisitos) },
        { label: t(QUALIDADE_LABEL_KEYS.estabilidade), value: String(v.estabilidade) },
        { label: t(QUALIDADE_LABEL_KEYS.retrabalho), value: String(v.retrabalho) },
        { label: t(QUALIDADE_LABEL_KEYS.satisfacaoUsuario), value: String(v.satisfacaoUsuario) },
        { label: t(QUALIDADE_LABEL_KEYS.clarezaRequisitos), value: String(v.clarezaRequisitos) },
      ],
    },
    {
      sectionTitle: t('avaliacaoDemanda.stepMaturidade'),
      rows: [
        { label: t(MATURIDADE_LABEL_KEYS.qualidadePlanejamento), value: String(v.qualidadePlanejamento) },
        { label: t(MATURIDADE_LABEL_KEYS.aderenciaCronograma), value: String(v.aderenciaCronograma) },
        { label: t(MATURIDADE_LABEL_KEYS.comunicacao), value: String(v.comunicacao) },
      ],
    },
    {
      sectionTitle: t('avaliacaoDemanda.stepRiscos'),
      rows: [
        { label: t('avaliacaoDemanda.labelRiscosIdentificados'), value: riscosLabels.length ? riscosLabels.join(', ') : '—' },
      ],
    },
    {
      sectionTitle: t('avaliacaoDemanda.stepEquipe'),
      rows: [
        { label: t('avaliacaoDemanda.labelCapacidadeEquipe'), value: String(v.capacidadeEquipe) },
        { label: t('avaliacaoDemanda.labelDisponibilidadeEquipe'), value: String(v.disponibilidadeEquipe) },
        { label: t('avaliacaoDemanda.labelPossuiBackupCritico'), value: simNao(v.possuiBackupCritico) },
        { label: t('avaliacaoDemanda.labelRotatividadeImpactou'), value: simNao(v.rotatividadeImpactou) },
      ],
    },
    {
      sectionTitle: t('avaliacaoDemanda.stepImpacto'),
      rows: [
        { label: t('avaliacaoDemanda.labelValorPercebido'), value: String(v.valorPercebido) },
        { label: t('avaliacaoDemanda.labelAlinhamentoMeta'), value: String(v.alinhamentoMeta) },
        { label: t('avaliacaoDemanda.labelReutilizacao'), value: reutilizacaoLabel(v.reutilizacao) },
        { label: t('avaliacaoDemanda.labelAvaliacaoGeral'), value: String(v.avaliacaoGeral) },
        { label: t('avaliacaoDemanda.labelRepetiriaModelo'), value: simNao(v.repetiriaModelo) },
      ],
    },
    {
      sectionTitle: t('avaliacaoDemanda.stepLicoes'),
      rows: [
        ...(v.atraso ? [{ label: t(LICOES_LABEL_KEYS.causaAtraso), value: textos['causaAtraso'] ?? '—' }] : []),
        { label: t(LICOES_LABEL_KEYS.causaCusto), value: textos['causaCusto'] ?? '—' },
        { label: t(LICOES_LABEL_KEYS.gargalo), value: textos['gargalo'] ?? '—' },
        { label: t(LICOES_LABEL_KEYS.impactoEquipe), value: textos['impactoEquipe'] ?? '—' },
        { label: t(LICOES_LABEL_KEYS.correcoes), value: textos['correcoes'] ?? '—' },
        { label: t(LICOES_LABEL_KEYS.licoesPositivas), value: textos['licoesPositivas'] ?? '—' },
        { label: t(LICOES_LABEL_KEYS.licoesNegativas), value: textos['licoesNegativas'] ?? '—' },
        { label: t(LICOES_LABEL_KEYS.melhorias), value: textos['melhorias'] ?? '—' },
      ],
    },
  ];
  return { labels, context, sections };
}
