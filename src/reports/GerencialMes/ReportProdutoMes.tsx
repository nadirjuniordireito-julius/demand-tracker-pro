import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export type ReportProdutoMesAcaoItem = {
  tipo: string;
  descricao: string;
  responsavel: string;
  prazo: string;
  impacto: string;
  status: string;
};

export type ReportProdutoMesDemandaItem = {
  codigo: string;
  nome: string;
  status: string;
  totalPrevisto: string;
  totalExecutado: string;
};

export type ReportProdutoMesLabels = {
  title: string;
  subtitle: string;
  period: string;
  metricsTitle: string;
  diagnosisTitle: string;
  demandsTitle: string;
  actionsTitle: string;
  budgeted: string;
  inExecution: string;
  executed: string;
  executionPercent: string;
  avgPlanned: string;
  avgReal: string;
  statusMonth: string;
  situation: string;
  analyticSummary: string;
  empty: string;
  actionType: string;
  actionDescription: string;
  actionResponsible: string;
  actionDueDate: string;
  actionImpact: string;
  actionStatus: string;
  demandaCodigo: string;
  demandaNome: string;
  demandaStatus: string;
  demandaTotalPrevisto: string;
  demandaTotalExecutado: string;
  pageOf: (page: number, total: number) => string;
};

export type ReportProdutoMesProps = {
  produtoCodigo: string;
  produtoNome: string;
  produtoDescricao: string;
  periodoLabel: string;
  valorTotalOrcamento: string;
  valorTotalEmExecucao: string;
  valorTotalExecutado: string;
  percentualExecucao: string;
  valorMediaEntregaPrevistaMensal: string;
  valorMediaEntregaRealMensal: string;
  statusProdutoMes: string;
  situacao: string;
  resumoAnalitico: string;
  demandas: ReportProdutoMesDemandaItem[];
  acoes: ReportProdutoMesAcaoItem[];
  impressaoRodape: string;
  labels: ReportProdutoMesLabels;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 32,
    paddingHorizontal: 28,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.3,
  },
  title: {
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
  },
  product: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
  },
  subtitle: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'Helvetica-Oblique',
    color: '#475569',
  },
  period: {
    marginTop: 6,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
  },
  card: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    padding: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    fontSize: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
    columnGap: 8,
  },
  metricItem: {
    width: '31%',
  },
  metricLabel: {
    color: '#475569',
    fontSize: 8,
  },
  metricValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  diagnosisRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  diagnosisLabel: {
    width: 100,
    fontFamily: 'Helvetica-Bold',
  },
  diagnosisValue: {
    flex: 1,
  },
  diagnosisSummary: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  row: {
    flexDirection: 'row',
  },
  headCell: {
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#f1f5f9',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 3,
    paddingVertical: 4,
    fontSize: 8,
  },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 3,
    paddingVertical: 4,
    fontSize: 8,
  },
  colTipo: { width: '12%' },
  colDescricao: { width: '34%' },
  colResponsavel: { width: '16%' },
  colPrazo: { width: '12%' },
  colImpacto: { width: '10%' },
  colStatus: { width: '16%' },
  colCodigo: { width: '18%' },
  colNome: { width: '34%' },
  colDemStatus: { width: '14%' },
  colTotalPrev: { width: '17%' },
  colTotalExec: { width: '17%' },
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 28,
    right: 28,
    textAlign: 'right',
    fontSize: 8,
    color: '#64748b',
  },
  printNote: {
    marginTop: 6,
    fontSize: 8,
    fontFamily: 'Helvetica-Oblique',
    color: '#334155',
    textAlign: 'left',
  },
});

function softText(value: string): string {
  return value.trim() || '—';
}

function normalizeRichText(input: string): string {
  if (!input) return '';
  let text = input;
  const decodeEntities = (value: string) =>
    value
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");

  // Caso venha HTML escapado (&lt;div&gt;...), decodifica antes de remover tags.
  text = decodeEntities(text);
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<li[^>]*>/gi, '- ');
  text = text.replace(/<\/?[^>]+>/g, '');
  // Rodada extra: se alguma entidade escapar da primeira limpeza.
  text = decodeEntities(text);
  // Segurança final: remove tags que possam ter surgido após decode.
  text = text.replace(/<\/?[^>]+>/g, '');
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function normalizeDescriptionText(input: string): string {
  let text = normalizeRichText(input);
  // Recompõe palavras quebradas por hifenização de cópia: "col-\nor" => "color".
  text = text.replace(/([A-Za-zÀ-ÖØ-öø-ÿ])-\s*\n\s*([A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1$2');
  // Preserva quebras de linha do conteúdo original.
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function ReportProdutoMesInner(props: ReportProdutoMesProps) {
  const { labels: L } = props;
  const produtoCodigo = softText(normalizeRichText(props.produtoCodigo));
  const produtoNome = softText(normalizeRichText(props.produtoNome));
  const produtoDescricao = softText(normalizeDescriptionText(props.produtoDescricao));
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>{L.title}</Text>
        <Text style={styles.product}>{`${produtoCodigo} - ${produtoNome}`}</Text>
        <Text style={styles.subtitle}>{produtoDescricao}</Text>
        <Text style={styles.period}>Ref. {props.periodoLabel}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{L.metricsTitle}</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{L.budgeted}</Text>
              <Text style={styles.metricValue}>{softText(props.valorTotalOrcamento)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{L.inExecution}</Text>
              <Text style={styles.metricValue}>{softText(props.valorTotalEmExecucao)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{L.executed}</Text>
              <Text style={styles.metricValue}>{softText(props.valorTotalExecutado)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{L.executionPercent}</Text>
              <Text style={styles.metricValue}>{softText(props.percentualExecucao)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{L.avgPlanned}</Text>
              <Text style={styles.metricValue}>{softText(props.valorMediaEntregaPrevistaMensal)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{L.avgReal}</Text>
              <Text style={styles.metricValue}>{softText(props.valorMediaEntregaRealMensal)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{L.diagnosisTitle}</Text>
          
          <View style={styles.diagnosisRow}>
            <Text style={styles.diagnosisLabel}>{L.situation}</Text>
            <Text style={styles.diagnosisValue}>{softText(props.situacao)}</Text>
          </View>
          <Text style={styles.diagnosisLabel}>{L.analyticSummary}</Text>
          <View style={styles.diagnosisSummary}>
            <Text>{softText(props.resumoAnalitico)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{L.demandsTitle}</Text>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.headCell, styles.colCodigo]}>{L.demandaCodigo}</Text>
              <Text style={[styles.headCell, styles.colNome]}>{L.demandaNome}</Text>
              <Text style={[styles.headCell, styles.colDemStatus]}>{L.demandaStatus}</Text>
              <Text style={[styles.headCell, styles.colTotalPrev]}>{L.demandaTotalPrevisto}</Text>
              <Text style={[styles.headCell, styles.colTotalExec, { borderRightWidth: 0 }]}>{L.demandaTotalExecutado}</Text>
            </View>
            {(props.demandas.length > 0
              ? props.demandas
              : [{ codigo: L.empty, nome: L.empty, status: L.empty, totalPrevisto: L.empty, totalExecutado: L.empty }]).map((item, idx) => (
              <View style={styles.row} key={`${item.codigo}-${idx}`}>
                <Text style={[styles.cell, styles.colCodigo]}>{softText(item.codigo)}</Text>
                <Text style={[styles.cell, styles.colNome]}>{softText(item.nome)}</Text>
                <Text style={[styles.cell, styles.colDemStatus]}>{softText(item.status)}</Text>
                <Text style={[styles.cell, styles.colTotalPrev]}>{softText(item.totalPrevisto)}</Text>
                <Text style={[styles.cell, styles.colTotalExec, { borderRightWidth: 0 }]}>{softText(item.totalExecutado)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{L.actionsTitle}</Text>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.headCell, styles.colTipo]}>{L.actionType}</Text>
              <Text style={[styles.headCell, styles.colDescricao]}>{L.actionDescription}</Text>
              <Text style={[styles.headCell, styles.colResponsavel]}>{L.actionResponsible}</Text>
              <Text style={[styles.headCell, styles.colPrazo]}>{L.actionDueDate}</Text>
              <Text style={[styles.headCell, styles.colImpacto]}>{L.actionImpact}</Text>
              <Text style={[styles.headCell, styles.colStatus, { borderRightWidth: 0 }]}>{L.actionStatus}</Text>
            </View>
            {(props.acoes.length > 0 ? props.acoes : [{ tipo: L.empty, descricao: L.empty, responsavel: L.empty, prazo: L.empty, impacto: L.empty, status: L.empty }]).map((item, idx) => (
              <View style={styles.row} key={`${item.descricao}-${idx}`}>
                <Text style={[styles.cell, styles.colTipo]}>{softText(item.tipo)}</Text>
                <Text style={[styles.cell, styles.colDescricao]}>{softText(item.descricao)}</Text>
                <Text style={[styles.cell, styles.colResponsavel]}>{softText(item.responsavel)}</Text>
                <Text style={[styles.cell, styles.colPrazo]}>{softText(item.prazo)}</Text>
                <Text style={[styles.cell, styles.colImpacto]}>{softText(item.impacto)}</Text>
                <Text style={[styles.cell, styles.colStatus, { borderRightWidth: 0 }]}>{softText(item.status)}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.printNote}>{props.impressaoRodape}</Text>

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => L.pageOf(pageNumber, totalPages)} />
      </Page>
    </Document>
  );
}
