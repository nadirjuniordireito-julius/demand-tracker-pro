import React from 'react';
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Svg,
  Rect,
  Line,
  pdf,
} from '@react-pdf/renderer';
import type { DemandaExecucaoGanttDTO, DemandaExecucaoGanttTarefaDTO } from '@/modules/execucaoDemanda/types';

type ExecucaoGanttReportLabels = {
  title: string;
  subtitle: string;
  generatedAt: string;
  summaryTitle: string;
  summaryTotalTasks: string;
  summaryAverageProgress: string;
  summaryTotalEstimateHours: string;
  summaryPlannedRange: string;
  summaryRealRange: string;
  sequence: string;
  task: string;
  status: string;
  priority: string;
  progress: string;
  estimateHours: string;
  plannedPeriod: string;
  realPeriod: string;
  resources: string;
  gantt: string;
  plannedLegend: string;
  realLegend: string;
  notStartedLegend: string;
  noResources: string;
  pageOf: (page: number, total: number) => string;
};

const PAGE_ROWS = 16;
const GANTT_W = 256;
const GANTT_H = 18;

const styles = StyleSheet.create({
  page: { padding: 20, fontFamily: 'Helvetica', fontSize: 8 },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  subtitle: { fontSize: 9, color: '#334155', marginBottom: 2 },
  generatedAt: { fontSize: 8, color: '#64748b', marginBottom: 8 },
  summaryBox: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    padding: 6,
    marginBottom: 8,
  },
  summaryTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 2, columnGap: 12 },
  summaryItem: { width: '32%' },
  legendRow: { flexDirection: 'row', gap: 12, marginBottom: 8, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatchPlanned: { width: 10, height: 6, backgroundColor: '#5eead4' },
  legendSwatchReal: { width: 10, height: 6, backgroundColor: '#e0782c' },
  legendSwatchNotStarted: { width: 10, height: 6, backgroundColor: '#cbd5e1' },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingVertical: 4,
    fontFamily: 'Helvetica-Bold',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 3,
    minHeight: 28,
  },
  colSeq: { width: 24, paddingHorizontal: 2 },
  colTask: { width: 118, paddingHorizontal: 2 },
  colStatus: { width: 52, paddingHorizontal: 2 },
  colPriority: { width: 34, paddingHorizontal: 2, textAlign: 'center' },
  colProgress: { width: 38, paddingHorizontal: 2, textAlign: 'right' },
  colEstimate: { width: 42, paddingHorizontal: 2, textAlign: 'right' },
  colPlanned: { width: 62, paddingHorizontal: 2 },
  colReal: { width: 62, paddingHorizontal: 2 },
  colResources: { width: 82, paddingHorizontal: 2 },
  colGantt: { width: 260, paddingHorizontal: 2 },
  colGanttNoPadding: { width: 260 },
  cellMuted: { color: '#64748b' },
  dateStack: { lineHeight: 1.2 },
  ganttHeaderWrap: { width: GANTT_W, backgroundColor: '#f8fafc' },
  ganttMonthsRow: { flexDirection: 'row', height: 8 },
  ganttMonthCell: {
    justifyContent: 'center',
    borderLeftWidth: 0.8,
    borderLeftColor: '#94a3b8',
    paddingLeft: 2,
  },
  ganttMonthText: { fontSize: 7, color: '#1f2937', fontFamily: 'Helvetica-Bold' },
  ganttDaysRow: {
    flexDirection: 'row',
    height: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
  },
  ganttDayCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 0.4,
    borderLeftColor: '#e2e8f0',
  },
  ganttDayCellMonthStart: {
    borderLeftWidth: 0.8,
    borderLeftColor: '#94a3b8',
  },
  ganttDayText: { fontSize: 6, color: '#334155' },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    textAlign: 'right',
    fontSize: 8,
    color: '#64748b',
  },
});

function toDateOnly(value?: string | null): string | null {
  if (!value) return null;
  return String(value).split('T')[0] || null;
}

function parseDate(value?: string | null): Date | null {
  const part = toDateOnly(value);
  if (!part) return null;
  const [y, m, d] = part.split('-').map(Number);
  if ([y, m, d].some(Number.isNaN)) return null;
  return new Date(y, m - 1, d);
}

function formatDateBr(value?: string | null): string {
  const d = parseDate(value);
  if (!d) return '—';
  return formatDateBrFromDate(d);
}

function formatDateBrFromDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function diffDaysInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function buildTimelineDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const finish = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (current.getTime() <= finish.getTime()) {
    days.push(new Date(current.getTime()));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function formatMonthLabel(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function resolveChartBounds(tasks: DemandaExecucaoGanttTarefaDTO[]) {
  const today = new Date();
  let min: Date | null = null;
  let max: Date | null = null;
  for (const t of tasks) {
    const plannedStart = parseDate(t.dataInicioPlanejada);
    const plannedEnd = parseDate(t.dataFimPlanejada);
    const realStart = parseDate(t.dataInicioReal);
    const realEnd = parseDate(t.dataFimReal);
    const effectiveRealEnd = realEnd ?? (realStart && Number(t.percentualProgresso) < 100 ? today : null);
    const candidates = [plannedStart, plannedEnd, realStart, effectiveRealEnd].filter(Boolean) as Date[];
    for (const c of candidates) {
      min = !min || c < min ? c : min;
      max = !max || c > max ? c : max;
    }
  }
  if (!min || !max) {
    const base = new Date();
    return { min: base, max: base };
  }
  return { min, max };
}

function GanttCell({
  tarefa,
  chartMin,
  chartTotalDays,
  timelineDays,
}: {
  tarefa: DemandaExecucaoGanttTarefaDTO;
  chartMin: Date;
  chartTotalDays: number;
  timelineDays: Date[];
}) {
  const plannedStart = parseDate(tarefa.dataInicioPlanejada);
  const plannedEnd = parseDate(tarefa.dataFimPlanejada);
  const realStart = parseDate(tarefa.dataInicioReal);
  const realEndRaw = parseDate(tarefa.dataFimReal);
  const realEnd = realEndRaw ?? (realStart && Number(tarefa.percentualProgresso) < 100 ? new Date() : null);

  const x = (d: Date) =>
    ((d.getTime() - chartMin.getTime()) / 86_400_000 / Math.max(1, chartTotalDays)) * GANTT_W;
  const w = (s: Date, e: Date) =>
    Math.max(2, (diffDaysInclusive(s, e) / Math.max(1, chartTotalDays)) * GANTT_W);
  const dayWidth = GANTT_W / Math.max(1, timelineDays.length);

  return (
    <Svg width={GANTT_W} height={GANTT_H}>
      <Rect x={0} y={0} width={GANTT_W} height={GANTT_H} fill="#ffffff" />
      {timelineDays.map((day, idx) => {
        const xLine = idx * dayWidth;
        const isMonthStart = day.getDate() === 1;
        return (
          <Line
            key={`grid-${day.getTime()}`}
            x1={xLine}
            y1={0}
            x2={xLine}
            y2={GANTT_H}
            stroke={isMonthStart ? '#94a3b8' : '#e2e8f0'}
            strokeWidth={isMonthStart ? 0.8 : 0.4}
          />
        );
      })}
      {plannedStart && plannedEnd && (
        <Rect x={x(plannedStart)} y={3} width={w(plannedStart, plannedEnd)} height={5} fill="#5eead4" />
      )}
      {realStart && realEnd ? (
        <Rect x={x(realStart)} y={10} width={w(realStart, realEnd)} height={5} fill="#e0782c" />
      ) : (
        <Line x1={0} y1={12} x2={GANTT_W} y2={12} stroke="#cbd5e1" strokeWidth={0.8} />
      )}
    </Svg>
  );
}

function GanttHeaderCell({ timelineDays }: { timelineDays: Date[] }) {
  if (timelineDays.length === 0) {
    return <View style={styles.ganttHeaderWrap} />;
  }
  const dayWidth = GANTT_W / Math.max(1, timelineDays.length);
  const monthChunks: Array<{ label: string; w: number }> = [];

  let chunkStart = 0;
  let currentKey = `${timelineDays[0]?.getFullYear()}-${timelineDays[0]?.getMonth()}`;
  for (let i = 1; i < timelineDays.length; i++) {
    const key = `${timelineDays[i].getFullYear()}-${timelineDays[i].getMonth()}`;
    if (key !== currentKey) {
      monthChunks.push({
        label: formatMonthLabel(timelineDays[chunkStart]),
        w: (i - chunkStart) * dayWidth,
      });
      chunkStart = i;
      currentKey = key;
    }
  }
  if (timelineDays.length > 0) {
    monthChunks.push({
      label: formatMonthLabel(timelineDays[chunkStart]),
      w: (timelineDays.length - chunkStart) * dayWidth,
    });
  }

  /*
  let debugStartX = 0;
  monthChunks.forEach((chunk, idx) => {
    console.log('[ExecucaoGanttReport][HeaderMonth]', {
      index: idx,
      monthYear: chunk.label,
      startX: Number(debugStartX.toFixed(2)),
      width: Number(chunk.w.toFixed(2)),
      endX: Number((debugStartX + chunk.w).toFixed(2)),
    });
    debugStartX += chunk.w;
  });
*/
  return (
    <View style={styles.ganttHeaderWrap}>
      <View style={styles.ganttMonthsRow}>
        {monthChunks.map((chunk, idx) => (
          <View key={`month-${idx}`} style={[styles.ganttMonthCell, { width: chunk.w }]}>
            <Text style={styles.ganttMonthText}>{chunk.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.ganttDaysRow}>
        {timelineDays.map((day, idx) => {
          const dayOfMonth = day.getDate();
          const showDayLabel = dayOfMonth === 1 || dayOfMonth === 8 || dayOfMonth === 15 || dayOfMonth === 22;
          const isMonthStart = day.getDate() === 1;
          return (
            <View
              key={`day-${day.getTime()}`}
              style={[
                styles.ganttDayCell,
                isMonthStart ? styles.ganttDayCellMonthStart : null,
                { width: dayWidth },
                idx === 0 ? { borderLeftWidth: 0 } : null,
              ]}
            >
              <Text style={styles.ganttDayText}>
                {showDayLabel ? String(dayOfMonth).padStart(2, '0') : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ExecucaoGanttReportDocument({
  data,
  labels,
}: {
  data: DemandaExecucaoGanttDTO;
  labels: ExecucaoGanttReportLabels;
}) {
  const orderedTasks = [...(data.tarefas ?? [])].sort((a, b) => (a.sequencia ?? 0) - (b.sequencia ?? 0));
  const pages = chunks(orderedTasks, PAGE_ROWS);
  const { min, max } = resolveChartBounds(orderedTasks);
  const timelineDays = buildTimelineDays(min, max);
  const chartTotalDays = diffDaysInclusive(min, max);
  const generatedAt = new Date().toLocaleString('pt-BR');
  const totalTasks = orderedTasks.length;
  const averageProgress =
    totalTasks > 0
      ? orderedTasks.reduce((acc, t) => acc + (Number(t.percentualProgresso) || 0), 0) / totalTasks
      : 0;
  const totalEstimateHours = orderedTasks.reduce((acc, t) => acc + (Number(t.estimativaHoras) || 0), 0);
  const plannedStarts = orderedTasks.map((t) => parseDate(t.dataInicioPlanejada)).filter(Boolean) as Date[];
  const plannedEnds = orderedTasks.map((t) => parseDate(t.dataFimPlanejada)).filter(Boolean) as Date[];
  const realStarts = orderedTasks.map((t) => parseDate(t.dataInicioReal)).filter(Boolean) as Date[];
  const realEnds = orderedTasks.map((t) => parseDate(t.dataFimReal)).filter(Boolean) as Date[];
  const plannedRange =
    plannedStarts.length && plannedEnds.length
      ? `${formatDateBrFromDate(
          new Date(Math.min(...plannedStarts.map((d) => d.getTime()))),
        )} - ${formatDateBrFromDate(new Date(Math.max(...plannedEnds.map((d) => d.getTime()))))}`
      : '—';
  const realRange =
    realStarts.length && realEnds.length
      ? `${formatDateBrFromDate(
          new Date(Math.min(...realStarts.map((d) => d.getTime()))),
        )} - ${formatDateBrFromDate(new Date(Math.max(...realEnds.map((d) => d.getTime()))))}`
      : '—';

  return (
    <Document>
      {pages.map((pageTasks, pageIndex) => (
        <Page key={pageIndex} size="A4" orientation="landscape" style={styles.page}>
          <Text style={styles.title}>{labels.title}</Text>
          <Text style={styles.subtitle}>
            {labels.subtitle}: {data.demandaTecnicaCodigo} - {data.demandaTecnicaNome}
          </Text>
          <Text style={styles.generatedAt}>
            {labels.generatedAt}: {generatedAt}
          </Text>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>{labels.summaryTitle}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryItem}>
                {labels.summaryTotalTasks}: {totalTasks}
              </Text>
              <Text style={styles.summaryItem}>
                {labels.summaryAverageProgress}: {averageProgress.toFixed(1)}%
              </Text>
              <Text style={styles.summaryItem}>
                {labels.summaryTotalEstimateHours}: {totalEstimateHours.toFixed(1)}h
              </Text>
              <Text style={styles.summaryItem}>
                {labels.summaryPlannedRange}: {plannedRange}
              </Text>
              <Text style={styles.summaryItem}>
                {labels.summaryRealRange}: {realRange}
              </Text>
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={styles.legendSwatchPlanned} />
              <Text>{labels.plannedLegend}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendSwatchReal} />
              <Text>{labels.realLegend}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendSwatchNotStarted} />
              <Text>{labels.notStartedLegend}</Text>
            </View>
          </View>

          <View style={styles.tableHeader}>
            <Text style={styles.colSeq}>{labels.sequence}</Text>
            <Text style={styles.colTask}>{labels.task}</Text>
            <Text style={styles.colStatus}>{labels.status}</Text>
            <Text style={styles.colPriority}>{labels.priority}</Text>
            <Text style={styles.colProgress}>{labels.progress}</Text>
            <Text style={styles.colEstimate}>{labels.estimateHours}</Text>
            <Text style={styles.colPlanned}>{labels.plannedPeriod}</Text>
            <Text style={styles.colReal}>{labels.realPeriod}</Text>
            <Text style={styles.colResources}>{labels.resources}</Text>
            <View style={styles.colGanttNoPadding}>
              <GanttHeaderCell timelineDays={timelineDays} />
            </View>
          </View>

          {pageTasks.map((task) => {
            const resourceText =
              task.recursos && task.recursos.length > 0
                ? task.recursos.map((r) => `${r.nome} (${Number(r.horasPlanejadas).toFixed(1)}h)`).join(', ')
                : labels.noResources;
            return (
              <View key={task.id} style={styles.row}>
                <Text style={styles.colSeq}>{String(task.sequencia ?? '—')}</Text>
                <Text style={styles.colTask}>{task.titulo}</Text>
                <Text style={styles.colStatus}>{task.status}</Text>
                <Text style={styles.colPriority}>{task.prioridade}</Text>
                <Text style={styles.colProgress}>{`${Number(task.percentualProgresso).toFixed(0)}%`}</Text>
                <Text style={styles.colEstimate}>{Number(task.estimativaHoras).toFixed(1)}</Text>
                <Text style={styles.colPlanned}>
                  <Text style={styles.dateStack}>
                    {formatDateBr(task.dataInicioPlanejada)}
                    {'\n'}
                    {formatDateBr(task.dataFimPlanejada)}
                  </Text>
                </Text>
                <Text style={styles.colReal}>
                  <Text style={styles.dateStack}>
                    {formatDateBr(task.dataInicioReal)}
                    {'\n'}
                    {formatDateBr(task.dataFimReal)}
                  </Text>
                </Text>
                <Text style={[styles.colResources, styles.cellMuted]}>{resourceText}</Text>
                <View style={styles.colGantt}>
                  <GanttCell
                    tarefa={task}
                    chartMin={min}
                    chartTotalDays={chartTotalDays}
                    timelineDays={timelineDays}
                  />
                </View>
              </View>
            );
          })}

          <Text
            style={styles.footer}
            render={({ pageNumber, totalPages }) => labels.pageOf(pageNumber, totalPages)}
            fixed
          />
        </Page>
      ))}
    </Document>
  );
}

export async function generateExecucaoGanttPdfBlob(
  data: DemandaExecucaoGanttDTO,
  labels: ExecucaoGanttReportLabels,
): Promise<Blob> {
  const doc = <ExecucaoGanttReportDocument data={data} labels={labels} />;
  return pdf(doc).toBlob();
}

