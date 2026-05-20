import React from 'react';
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { ExecucaoDemandaReportData } from '@/modules/execucaoDemanda/services/execucaoDemandaReportService';
import type { DemandaExecucaoTarefaDTO } from '@/modules/execucaoDemanda/types';
import {
  buildExecucaoGanttReportPages,
  type ExecucaoGanttReportLabels,
  type ExecucaoReportFooterConfig,
} from '@/reports/ExecucaoGantt/ExecucaoGanttReport';
import { formatDateBr, formatDateTimeBr } from '@/reports/shared/pdfDateUtils';

export type ExecucaoDemandaReportLabels = {
  documentTitle: string;
  demandSection: string;
  executionSection: string;
  demandCodeName: string;
  demandId: string;
  executionId: string;
  status: string;
  situacao: string;
  progress: string;
  plannedStart: string;
  plannedEnd: string;
  realStart: string;
  realEnd: string;
  createdAt: string;
  responsible: string;
  sectionTasks: string;
  sectionDependencies: string;
  sectionResources: string;
  sectionProfissionalMes: string;
  sectionApontamentos: string;
  sectionGantt: string;
  emptySection: string;
  colSeq: string;
  colTitle: string;
  colDescription: string;
  colStatus: string;
  colPriority: string;
  colProgress: string;
  colEstimateHours: string;
  colPlannedStart: string;
  colPlannedEnd: string;
  colRealStart: string;
  colRealEnd: string;
  colTaskDest: string;
  colTaskOrig: string;
  colTask: string;
  colProfessional: string;
  colProfile: string;
  colHoursPlanned: string;
  colHoursExecuted: string;
  colMonthYear: string;
  colDate: string;
  colComment: string;
  ganttEmpty: string;
  appName: string;
  appNameDesc: string;
  generatedBy: (user: string, at: string) => string;
  pageOf: (page: number, total: number) => string;
  gantt: ExecucaoGanttReportLabels;
};

const TASK_SEQ_W = 26;

const styles = StyleSheet.create({
  portraitPage: {
    paddingTop: 108,
    paddingBottom: 52,
    paddingHorizontal: 32,
    fontFamily: 'Helvetica',
    fontSize: 8,
  },
  fixedHeader: {
    position: 'absolute',
    top: 16,
    left: 32,
    right: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 6,
  },
  docTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  headerGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  headerCol: { flex: 1 },
  headerSectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
    color: '#334155',
  },
  headerRow: { flexDirection: 'row', marginBottom: 2 },
  headerLabel: { width: 88, color: '#64748b' },
  headerValue: { flex: 1 },
  headerDemandLine: { flexDirection: 'row', marginBottom: 2 },
  headerDemandValue: { flex: 1, fontFamily: 'Helvetica-Bold' },
  fixedFooter: {
    position: 'absolute',
    bottom: 12,
    left: 32,
    right: 32,
    fontSize: 7,
    color: '#64748b',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
  },
  footerLine: { marginBottom: 2 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginTop: 8,
    marginBottom: 4,
    color: '#0f172a',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
  },
  emptyText: { color: '#64748b', fontStyle: 'italic', marginBottom: 6 },
  table: { borderWidth: 0.5, borderColor: '#cbd5e1', marginBottom: 2 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 0.5,
    borderColor: '#cbd5e1',
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#e2e8f0',
    paddingVertical: 2,
    minHeight: 12,
    alignItems: 'center',
  },
  cell: { paddingHorizontal: 3 },
  cellOneLine: { paddingHorizontal: 3, flexWrap: 'nowrap' },
  taskBlock: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  taskSeqCell: {
    width: TASK_SEQ_W,
    borderRightWidth: 0.5,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  taskSeqText: { textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  taskBody: { flex: 1 },
  taskRow1: { flexDirection: 'row', paddingVertical: 2, alignItems: 'center' },
  mb10: { marginBottom: 10, marginTop: 5},
  taskRow2: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderColor: '#e2e8f0',
    paddingVertical: 2,
    paddingHorizontal: 3,
    backgroundColor: '#fafafa',
  },
  taskDescLabel: { fontFamily: 'Helvetica-Bold', marginRight: 4, color: '#64748b' },
  taskColStandard: { width: '100%' },
  taskColTitle: { width: '20%' },
  taskColStatus: { width: '11%' },
  taskColPriority: { width: '9%' },
  taskColProgress: { width: '8%', textAlign: 'right' },
  taskColEstimate: { width: '9%', textAlign: 'right' },
  taskColDate: { width: '15%' },
  depColDest: { width: '50%' },
  depColOrig: { width: '50%' },
  resTaskGroupTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginTop: 6,
    marginBottom: 3,
    color: '#334155',
  },
  resColProf: { width: '34%' },
  resColProfile: { width: '22%' },
  resColHours: { width: '22%', textAlign: 'right' },
  aptColTask: { width: '28%' },
  aptColDate: { width: '14%' },
  aptColProgress: { width: '10%', textAlign: 'right' },
  aptColComment: { width: '48%' },
  profMesColProf: { width: '42%' },
  profMesColMes: { width: '22%' },
  profMesColHours: { width: '36%', textAlign: 'right' },
});

function formatSeqTitulo(seq: number | null, titulo: string): string {
  const s = seq != null && !Number.isNaN(seq) ? String(seq) : '—';
  return `${s} — ${titulo}`;
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ReportFixedHeader({
  data,
  labels,
}: {
  data: ExecucaoDemandaReportData;
  labels: ExecucaoDemandaReportLabels;
}) {
  const { execucao, demanda } = data;
  const demandCode = demanda?.codigo?.trim() || '—';
  const demandName = demanda?.nome?.trim() || '—';
  const demandCodeName = `${demandCode} — ${demandName}`;
  const responsible =
    execucao.usuario?.nome?.trim() ||
    (execucao.usuarioId != null ? `#${execucao.usuarioId}` : '—');
  const responsibleEmail = execucao.usuario?.email?.trim();

  return (
    <View style={styles.fixedHeader} fixed>
      <Text style={styles.docTitle}>{labels.documentTitle}</Text>
      <View style={styles.headerDemandLine}>
          <Text style={styles.headerLabel}>{labels.demandCodeName}</Text>
          <Text style={styles.headerDemandValue}>{demandCodeName}</Text>
      </View>

      <View style={styles.headerGrid}>

        <View style={styles.headerCol}>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>{labels.executionId}</Text>
            <Text style={styles.headerValue}>{String(execucao.id)}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>{labels.status}</Text>
            <Text style={styles.headerValue}>{execucao.status}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>{labels.situacao}</Text>
            <Text style={styles.headerValue}>{execucao.situacao?.trim() || '—'}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>{labels.progress}</Text>
            <Text style={styles.headerValue}>{`${Number(execucao.percentualProgresso).toFixed(0)}%`}</Text>
          </View>
        </View>
        <View style={styles.headerCol}>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>{labels.plannedStart}</Text>
            <Text style={styles.headerValue}>{formatDateBr(execucao.dataInicioPlanejada)}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>{labels.plannedEnd}</Text>
            <Text style={styles.headerValue}>{formatDateBr(execucao.dataFimPlanejada)}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>{labels.realStart}</Text>
            <Text style={styles.headerValue}>{formatDateBr(execucao.dataInicioReal)}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>{labels.realEnd}</Text>
            <Text style={styles.headerValue}>{formatDateBr(execucao.dataFimReal)}</Text>
          </View>
        </View>
        <View style={styles.headerCol}>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>{labels.createdAt}</Text>
            <Text style={styles.headerValue}>
              {formatDateTimeBr(execucao.dataCriacaoExecucao)}
            </Text>
          </View>
          
        </View>
      </View>
    </View>
  );
}

function ReportFixedFooter({
  labels,
  data,
}: {
  labels: ExecucaoDemandaReportLabels;
  data: ExecucaoDemandaReportData;
}) {
  const generatedByText = labels.generatedBy(data.meta.usuarioNome, data.meta.generatedAt);
  return (
    <View style={styles.fixedFooter} fixed>
      <Text style={styles.footerLine}>
        {labels.appName} — {labels.appNameDesc}
      </Text>
      <Text style={styles.footerLine}>{generatedByText}</Text>
      <Text render={({ pageNumber, totalPages }) => labels.pageOf(pageNumber, totalPages)} />
    </View>
  );
}

function TasksTableHeader({ labels }: { labels: ExecucaoDemandaReportLabels }) {
  return (
    <View style={[styles.tableHeader, { flexDirection: 'row' }]}>
      <View style={{ width: TASK_SEQ_W, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={[styles.cell, { textAlign: 'center' }]}>{labels.colSeq}</Text>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        
        <Text style={[styles.cell, styles.taskColStatus]}>{labels.colStatus}</Text>
        <Text style={[styles.cell, styles.taskColStatus]}>{labels.colPriority}</Text>
        <Text style={[styles.cell, styles.taskColStatus]}>{labels.colProgress}</Text>
        <Text style={[styles.cell, styles.taskColStatus]}>{labels.colEstimateHours}</Text>
        <Text style={[styles.cell, styles.taskColDate]}>{labels.colPlannedStart}</Text>
        <Text style={[styles.cell, styles.taskColDate]}>{labels.colPlannedEnd}</Text>
        <Text style={[styles.cell, styles.taskColDate]}>{labels.colRealStart}</Text>
        <Text style={[styles.cell, styles.taskColDate]}>{labels.colRealEnd}</Text>
      </View>
    </View>
  );
}

function TaskRowBlock({ t, labels }: { t: DemandaExecucaoTarefaDTO; labels: ExecucaoDemandaReportLabels }) {
  const desc = t.descricao?.trim() || '—';
  return (
    <View style={styles.taskBlock} wrap={false}>
      <View style={styles.taskSeqCell}>
        <Text style={styles.taskSeqText}>{String(t.sequencia ?? '—')}</Text>
      </View>
      <View style={styles.taskBody}>
        
        <View style={styles.taskRow1}>
          <Text style={styles.taskDescLabel}>{labels.colTitle}:</Text>
          <Text style={{ flex: 1}}>{t.titulo}</Text>
        </View>
        
        <View style={[styles.taskRow1]}>          
          <Text style={styles.taskDescLabel}>{labels.colDescription}:</Text>
          <Text style={{ flex: 1 }}>{desc}</Text>
        </View>

        <View style={[styles.mb10, styles.taskRow1]}>
          
          <Text style={[styles.cell, styles.taskColStatus]}>{t.status}</Text>
          <Text style={[styles.cell, styles.taskColStatus]}>{t.prioridade}</Text>
          <Text style={[styles.cell, styles.taskColStatus]}>
            {`${Number(t.percentualProgresso).toFixed(0)}`}
          </Text>
          <Text style={[styles.cell, styles.taskColEstimate]}>
            {Number(t.estimativaHoras).toFixed(1)}
          </Text>
          <Text style={[styles.cell, styles.taskColDate]}>
            {formatDateBr(t.dataInicioPlanejada)}
          </Text>
          <Text style={[styles.cell, styles.taskColDate]}>{formatDateBr(t.dataFimPlanejada)}</Text>
          <Text style={[styles.cell, styles.taskColDate]}>{formatDateBr(t.dataInicioReal)}</Text>
          <Text style={[styles.cell, styles.taskColDate]}>{formatDateBr(t.dataFimReal)}</Text>
        </View>
        
      </View>
    </View>
  );
}

function TasksSection({
  data,
  labels,
}: {
  data: ExecucaoDemandaReportData;
  labels: ExecucaoDemandaReportLabels;
}) {
  if (data.tarefas.length === 0) {
    return (
      <View>
        <SectionTitle>{labels.sectionTasks}</SectionTitle>
        <Text style={styles.emptyText}>{labels.emptySection}</Text>
      </View>
    );
  }

  return (
    <View>
      <SectionTitle>{labels.sectionTasks}</SectionTitle>
      <View style={styles.table}>
        <View wrap={false}>
          <TasksTableHeader labels={labels} />
        </View>
        {data.tarefas.map((t) => (
          <TaskRowBlock key={t.id} t={t} labels={labels} />
        ))}
      </View>
    </View>
  );
}

function DependenciesTableHeader({ labels }: { labels: ExecucaoDemandaReportLabels }) {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.cell, styles.depColDest]}>{labels.colTaskDest}</Text>
      <Text style={[styles.cell, styles.depColOrig]}>{labels.colTaskOrig}</Text>
    </View>
  );
}

function DependenciesSection({
  data,
  labels,
}: {
  data: ExecucaoDemandaReportData;
  labels: ExecucaoDemandaReportLabels;
}) {
  if (data.dependencias.length === 0) {
    return (
      <View>
        <SectionTitle>{labels.sectionDependencies}</SectionTitle>
        <Text style={styles.emptyText}>{labels.emptySection}</Text>
      </View>
    );
  }

  return (
    <View>
      <SectionTitle>{labels.sectionDependencies}</SectionTitle>
      <View style={styles.table}>
        <View wrap={false}>
          <DependenciesTableHeader labels={labels} />
        </View>
        {data.dependencias.map((d) => (
          <View key={d.id} style={styles.tableRow} wrap={false}>
            <Text style={[styles.cellOneLine, styles.depColDest]}>
              {formatSeqTitulo(d.tarefaDestinoSequencia, d.tarefaDestinoTitulo)}
            </Text>
            <Text style={[styles.cellOneLine, styles.depColOrig]}>
              {formatSeqTitulo(d.tarefaOrigemSequencia, d.tarefaOrigemTitulo)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ResourcesTableHeader({ labels }: { labels: ExecucaoDemandaReportLabels }) {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.cell, styles.resColProf]}>{labels.colProfessional}</Text>
      <Text style={[styles.cell, styles.resColProfile]}>{labels.colProfile}</Text>
      <Text style={[styles.cell, styles.resColHours]}>{labels.colHoursPlanned}</Text>
      <Text style={[styles.cell, styles.resColHours]}>{labels.colHoursExecuted}</Text>
    </View>
  );
}

function groupRecursosByTarefa(
  data: ExecucaoDemandaReportData,
): Array<{ tarefa: DemandaExecucaoTarefaDTO; recursos: typeof data.recursos }> {
  const byTarefaId = new Map<number, typeof data.recursos>();
  for (const r of data.recursos) {
    const list = byTarefaId.get(r.tarefaId) ?? [];
    list.push(r);
    byTarefaId.set(r.tarefaId, list);
  }
  return data.tarefas
    .filter((t) => (byTarefaId.get(t.id)?.length ?? 0) > 0)
    .map((tarefa) => ({
      tarefa,
      recursos: byTarefaId.get(tarefa.id) ?? [],
    }));
}

function ResourcesSection({
  data,
  labels,
}: {
  data: ExecucaoDemandaReportData;
  labels: ExecucaoDemandaReportLabels;
}) {
  const grupos = groupRecursosByTarefa(data);

  return (
    <View>
      <SectionTitle>{labels.sectionResources}</SectionTitle>
      {grupos.length === 0 ? (
        <Text style={styles.emptyText}>{labels.emptySection}</Text>
      ) : (
        grupos.map(({ tarefa, recursos }) => (
          <View key={tarefa.id} style={{ marginBottom: 6 }}>
            <Text style={styles.resTaskGroupTitle}>
              {formatSeqTitulo(
                tarefa.sequencia != null ? Number(tarefa.sequencia) : null,
                tarefa.titulo,
              )}
            </Text>
            <Text style={styles.resTaskGroupTitle}>
              {`${formatDateBr(tarefa.dataInicioReal ?? tarefa.dataInicioPlanejada)} — ${formatDateBr(tarefa.dataFimReal ?? tarefa.dataFimPlanejada)}`}
            </Text>
            <View style={styles.table}>
              <View wrap={false}>
                <ResourcesTableHeader labels={labels} />
              </View>
              {recursos.map((r, i) => (
                <View key={i} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.cellOneLine, styles.resColProf]}>{r.profissionalNome}</Text>
                  <Text style={[styles.cellOneLine, styles.resColProfile]}>{r.perfilNome}</Text>
                  <Text style={[styles.cellOneLine, styles.resColHours]}>
                    {r.horasPlanejadas.toFixed(1)}
                  </Text>
                  <Text style={[styles.cellOneLine, styles.resColHours]}>
                    {r.horasExecutadas != null ? r.horasExecutadas.toFixed(1) : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function ProfissionalMesTableHeader({ labels }: { labels: ExecucaoDemandaReportLabels }) {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.cell, styles.profMesColProf]}>{labels.colProfessional}</Text>
      <Text style={[styles.cell, styles.profMesColMes]}>{labels.colMonthYear}</Text>
      <Text style={[styles.cell, styles.profMesColHours]}>{labels.colHoursExecuted}</Text>
    </View>
  );
}

function ProfissionalMesSection({
  data,
  labels,
}: {
  data: ExecucaoDemandaReportData;
  labels: ExecucaoDemandaReportLabels;
}) {
  return (
    <View>
      <SectionTitle>{labels.sectionProfissionalMes}</SectionTitle>
      {data.profissionalMes.length === 0 ? (
        <Text style={styles.emptyText}>{labels.emptySection}</Text>
      ) : (
        <View style={styles.table}>
          <View wrap={false}>
            <ProfissionalMesTableHeader labels={labels} />
          </View>
          {data.profissionalMes.map((row, i) => (
            <View key={i} style={styles.tableRow} wrap={false}>
              <Text style={[styles.cellOneLine, styles.profMesColProf]}>{row.profissionalNome}</Text>
              <Text style={[styles.cellOneLine, styles.profMesColMes]}>{row.mesAno}</Text>
              <Text style={[styles.cellOneLine, styles.profMesColHours]}>
                {row.horasExecutadas.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ApontamentosTableHeader({ labels }: { labels: ExecucaoDemandaReportLabels }) {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.cell, styles.aptColTask]}>{labels.colTask}</Text>
      <Text style={[styles.cell, styles.aptColDate]}>{labels.colDate}</Text>
      <Text style={[styles.cell, styles.aptColProgress]}>{labels.colProgress}</Text>
      <Text style={[styles.cell, styles.aptColComment]}>{labels.colComment}</Text>
    </View>
  );
}

function ApontamentosSection({
  data,
  labels,
}: {
  data: ExecucaoDemandaReportData;
  labels: ExecucaoDemandaReportLabels;
}) {
  if (data.apontamentos.length === 0) {
    return (
      <View>
        <SectionTitle>{labels.sectionApontamentos}</SectionTitle>
        <Text style={styles.emptyText}>{labels.emptySection}</Text>
      </View>
    );
  }

  return (
    <View>
      <SectionTitle>{labels.sectionApontamentos}</SectionTitle>
      <View style={styles.table}>
        <View wrap={false}>
          <ApontamentosTableHeader labels={labels} />
        </View>
        {data.apontamentos.map((a, i) => (
          <View key={i} style={styles.tableRow} wrap={false}>
            <Text style={[styles.cellOneLine, styles.aptColTask]}>
              {formatSeqTitulo(a.tarefaSequencia, a.tarefaTitulo)}
            </Text>
            <Text style={[styles.cellOneLine, styles.aptColDate]}>{formatDateBr(a.data)}</Text>
            <Text style={[styles.cellOneLine, styles.aptColProgress]}>
              {`${a.percentual.toFixed(0)}%`}
            </Text>
            <Text style={[styles.cellOneLine, styles.aptColComment]}>{a.comentario}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function GanttEmptySection({ labels }: { labels: ExecucaoDemandaReportLabels }) {
  return (
    <View>
      <SectionTitle>{labels.sectionGantt}</SectionTitle>
      <Text style={styles.emptyText}>{labels.ganttEmpty}</Text>
    </View>
  );
}

function ExecucaoDemandaReportDocument({
  data,
  labels,
}: {
  data: ExecucaoDemandaReportData;
  labels: ExecucaoDemandaReportLabels;
}) {
  const footerConfig: ExecucaoReportFooterConfig = {
    appName: labels.appName,
    appNameDesc: labels.appNameDesc,
    generatedBy: labels.generatedBy(data.meta.usuarioNome, data.meta.generatedAt),
    pageOf: labels.pageOf,
  };

  const ganttPages = buildExecucaoGanttReportPages(data.gantt, labels.gantt, {
    footerConfig,
    generatedAtDisplay: data.meta.generatedAt,
    sectionTitle: labels.sectionGantt,
  });

  const hasGantt = ganttPages.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.portraitPage} wrap>
        <ReportFixedHeader data={data} labels={labels} />
        <TasksSection data={data} labels={labels} />
        <DependenciesSection data={data} labels={labels} />
        <View>
          <ResourcesSection data={data} labels={labels} />
        </View>
        <ProfissionalMesSection data={data} labels={labels} />
        <ApontamentosSection data={data} labels={labels} />
        {!hasGantt ? <GanttEmptySection labels={labels} /> : null}
        <ReportFixedFooter labels={labels} data={data} />
      </Page>
      {ganttPages}
    </Document>
  );
}

export async function generateExecucaoDemandaReportPdfBlob(
  data: ExecucaoDemandaReportData,
  labels: ExecucaoDemandaReportLabels,
): Promise<Blob> {
  const doc = <ExecucaoDemandaReportDocument data={data} labels={labels} />;
  return pdf(doc).toBlob();
}
