import type { CSSProperties } from 'react';
import { Fragment, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bed, CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { demandaExecucaoService } from '../services/demandaExecucaoService';
import { apontamentoService } from '../services/apontamentoService';
import type {
  DemandaExecucaoGanttDTO,
  DemandaExecucaoGanttTarefaDTO,
  DemandaExecucaoTarefaApontamentoProgressoDTO,
} from '../types';
import { generateExecucaoGanttPdfBlob } from '@/reports/ExecucaoGantt/ExecucaoGanttReport';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ExecucaoGanttPageProps {
  demandaTecnicaId?: number;
  embedded?: boolean;
}

/** Parsea "YYYY-MM-DD" como data local (para exibição em tabela/labels). */
function parseLocalDate(dateStr: string): Date {
  const part = String(dateStr).split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Início do dia (00:00) para a barra do Gantt começar na borda esquerda da coluna do dia.
 */
function parseDateForGanttBar(dateStr: string): Date {
  const part = String(dateStr).split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Data fim da barra: fim do dia (23:59:59.999) para a barra cobrir o dia inteiro na grade.
 */
function parseEndDateForGanttBar(dateStr: string): Date {
  const part = String(dateStr).split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

function percentualOfGanttTarefa(t: DemandaExecucaoGanttTarefaDTO): number {
  return Math.min(100, Math.max(0, Number(t.percentualProgresso) ?? 0));
}

/** Fim do dia atual (local), quando a execução ainda não tem data fim informada. */
function endOfConsultationDay(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59, 999);
}

/**
 * Data fim para a barra de execução: a informada pelo usuário; se ausente e progresso &lt; 100%,
 * usa o fim do dia da consulta.
 */
function resolveRealExecutionEndForGanttBar(t: DemandaExecucaoGanttTarefaDTO): Date | null {
  if (t.dataFimReal) {
    return parseEndDateForGanttBar(t.dataFimReal);
  }
  if (percentualOfGanttTarefa(t) < 100) {
    return endOfConsultationDay();
  }
  return null;
}

/** Cor da barra do período planejado (teal). */
const BAR_PLANNED_COLOR = '#5eead4';
const BAR_PLANNED_PROGRESS = '#0d9488';

/** Cor de abóbora para a barra do período de execução REAL. */
const BAR_REAL_BG = '#e0782c';
const BAR_REAL_PROGRESS = '#c2611e';

const COLUMN_WIDTH = 50;
/** Igual ao default do Gantt (`headerHeight`), usado para alinhar overlays ao cabeçalho. */
const GANTT_HEADER_HEIGHT = 50;
/** Linha mais alta para caber barra teal + margem + barra laranja (mesma altura que a teal). */
const ROW_HEIGHT = 60;
/** Altura da barra teal em % da linha; com ROW_HEIGHT 60, deixa espaço para teal + gap + laranja (mesma altura). */
const BAR_FILL_PERCENT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_HEADER_HEIGHT = 18;
/** Faixa dos rótulos do dia (abaixo do mês/ano), alinhada às colunas. */
const WEEKDAY_ROW_HEIGHT = 18;
/** `preStepsCount` default do gantt-task-react (um dia antes do primeiro dia das tarefas). */
const GANTT_PRE_STEPS_DAY = 1;
const AUTO_SCROLL_START_PADDING_PX = COLUMN_WIDTH * 1.25;
const AUTO_SCROLL_START_NEAR_LEFT_PX = COLUMN_WIDTH * 1.75;

/** Fundo listrado visível sobre o branco/cinza da grade nativa do gantt-task-react. */
const GANTT_WEEKEND_HATCH: CSSProperties = {
  backgroundColor: 'rgba(203, 213, 225, 0.45)',
  backgroundImage: `repeating-linear-gradient(
    -45deg,
    rgba(255, 255, 255, 0.12) 0px,
    rgba(255, 255, 255, 0.12) 4px,
    rgba(71, 85, 105, 0.2) 4px,
    rgba(71, 85, 105, 0.2) 5px
  )`,
};

/** Retorna o início do dia em hora local. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Grid start igual ao do gantt-task-react (Day view): início do primeiro dia das tarefas menos preStepsCount dias. */
function getGridStartDayView(minTaskStart: Date, preStepsCount: number): Date {
  const start = startOfDay(minTaskStart);
  start.setDate(start.getDate() - preStepsCount);
  return start;
}

/**
 * Fim exclusivo da sequência `seedDates` em modo Day, igual a `ganttDateRange`:
 * início do dia do maior `task.end` + 19 dias (o loop da lib é `while (current < endDate)`).
 */
function ganttDayViewSeedEndExclusive(maxTaskEnd: Date): Date {
  const d = startOfDay(maxTaskEnd);
  d.setDate(d.getDate() + 19);
  return d;
}

/**
 * Datas das colunas do Gantt em modo Day (todos os dias) — alinhado a `ganttDateRange` + `seedDates`.
 */
function buildWeekdayColumnDatesFromBounds(minTaskStart: Date, maxTaskEnd: Date): Date[] {
  const gridStart = getGridStartDayView(minTaskStart, GANTT_PRE_STEPS_DAY);
  const gridEndExclusive = ganttDayViewSeedEndExclusive(maxTaskEnd);
  return buildDatesDayView(gridStart, gridEndExclusive);
}

/**
 * Espelha `taskXCoordinate` do gantt-task-react (após correção): posição X ao longo do eixo de
 * colunas (uma por dia). Usa intervalos [dates[i], dates[i+1]) em tempo.
 */
function computeTaskX(xDate: Date, dates: Date[], columnWidth: number): number {
  if (dates.length === 0) return 0;
  const t = xDate.getTime();
  if (dates.length === 1) {
    const d0 = dates[0].getTime();
    const synth = d0 + DAY_MS;
    const p0 = Math.max(0, Math.min(1, (t - d0) / (synth - d0)));
    return p0 * columnWidth;
  }
  for (let i = 0; i < dates.length - 1; i++) {
    const dA = dates[i].getTime();
    const dB = dates[i + 1].getTime();
    if (t >= dA && t < dB) {
      const denom = dB - dA;
      const pct = denom > 0 ? (t - dA) / denom : 0;
      return i * columnWidth + pct * columnWidth;
    }
  }
  if (t < dates[0].getTime()) {
    const denom2 = dates[1].getTime() - dates[0].getTime();
    const pct2 = denom2 > 0 ? (t - dates[0].getTime()) / denom2 : 0;
    return Math.max(0, pct2 * columnWidth);
  }
  const lastIdx = dates.length - 1;
  const dLast = dates[lastIdx].getTime();
  if (t >= dLast) {
    const dayAfterLast = dLast + DAY_MS;
    const denom3 = dayAfterLast - dLast;
    const pct3 = Math.min(1, denom3 > 0 ? (t - dLast) / denom3 : 1);
    return lastIdx * columnWidth + pct3 * columnWidth;
  }
  return (dates.length - 1) * columnWidth;
}

/** Gera array de datas (uma por dia) como seedDates do gantt-task-react em modo Day. */
function buildDatesDayView(startDate: Date, endDate: Date): Date[] {
  const start = new Date(startDate.getTime());
  const dates: Date[] = [new Date(start.getTime())];
  let current = new Date(start.getTime());
  while (current.getTime() < endDate.getTime()) {
    current = new Date(current.getTime() + DAY_MS);
    dates.push(new Date(current.getTime()));
  }
  return dates;
}

/** `getDay()`: 0=dom … 6=sáb — três letras, como o cabeçalho Day da lib (`weekday: short` em pt-BR). */
const WEEKDAY_SHORT_3_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

function formatGanttDayHeaderLabel(d: Date): string {
  return `${WEEKDAY_SHORT_3_PT[d.getDay()]}, ${d.getDate()}`;
}

function capitalizeFirstLetter(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}


/** Hachura nas colunas de sábado e domingo (HTML + gradiente; fica acima da grade SVG da lib). */
function WeekendColumnHatchOverlay({
  width,
  height,
  displayDates,
  columnWidth,
}: {
  width: number;
  height: number;
  displayDates: Date[];
  columnWidth: number;
}) {
  if (displayDates.length === 0 || width <= 0 || height <= 0) return null;

  const weekendIndices: number[] = [];
  displayDates.forEach((d, i) => {
    const day = d.getDay();
    if (day === 0 || day === 6) weekendIndices.push(i);
  });
  if (weekendIndices.length === 0) return null;

  return (
    <div
      className="absolute left-0 top-0 pointer-events-none"
      style={{ width, height, zIndex: 12 }}
      aria-hidden
    >
      {weekendIndices.map((i) => (
        <div
          key={i}
          className="absolute top-0"
          style={{
            left: i * columnWidth,
            width: columnWidth,
            height,
            ...GANTT_WEEKEND_HATCH,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Overlay: rótulo i18n na barra de previsão (teal, metade superior) e retângulo + rótulo na execução real (laranja).
 */
function PlannedAndRealBarsOverlay({
  width,
  height,
  tasks,
  tarefas,
  displayDates,
  columnWidth,
  rowHeight,
  barFillPercent,
  forecastLabel,
  formatExecutedLabel,
}: {
  width: number;
  height: number;
  tasks: Task[];
  tarefas: DemandaExecucaoGanttTarefaDTO[];
  displayDates: Date[];
  columnWidth: number;
  rowHeight: number;
  barFillPercent: number;
  forecastLabel: string;
  formatExecutedLabel: (percent: number) => string;
}) {
  if (tasks.length === 0 || displayDates.length === 0) return null;
  const taskHeight = (rowHeight * barFillPercent) / 100;
  const gap = 2;
  const yPlannedBarTop = (i: number) => i * rowHeight + (rowHeight - taskHeight) / 2;
  const barYOffsetReal = (i: number) => i * rowHeight + (rowHeight - taskHeight) / 2 + taskHeight + gap;
  const barHeight = taskHeight - gap;
  const labelPadding = 4;
  const fontSize = 10;
  /** Texto legível sobre o fundo teal da lib */
  const plannedTextFill = '#115e59';

  const plannedTexts: { key: string; x: number; y: number }[] = [];
  tasks.forEach((task, i) => {
    let x1 = computeTaskX(task.start, displayDates, columnWidth);
    let x2 = computeTaskX(task.end, displayDates, columnWidth);
    x1 = Math.max(0, x1);
    x2 = Math.min(width, Math.max(x1 + 2, x2));
    const y = yPlannedBarTop(i) + taskHeight / 2;
    plannedTexts.push({ key: `plan-${task.id}`, x: x1 + labelPadding, y });
  });

  const realBars: {
    key: string;
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
  }[] = [];
  tarefas.forEach((t, i) => {
    const startStr = t.dataInicioReal ?? null;
    if (!startStr) return;
    const endDate = resolveRealExecutionEndForGanttBar(t);
    if (!endDate) return;
    const startDate = parseDateForGanttBar(startStr);
    let x1 = computeTaskX(startDate, displayDates, columnWidth);
    let x2 = computeTaskX(endDate, displayDates, columnWidth);
    x1 = Math.max(0, x1);
    x2 = Math.min(width, Math.max(x1 + 2, x2));
    const y = barYOffsetReal(i);
    const percentual = percentualOfGanttTarefa(t);
    realBars.push({
      key: `real-${t.id}`,
      x: x1,
      y,
      w: x2 - x1,
      h: barHeight,
      label: formatExecutedLabel(percentual),
    });
  });

  if (plannedTexts.length === 0 && realBars.length === 0) return null;

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', pointerEvents: 'none', zIndex: 20 }}
      className="absolute left-0 top-0"
    >
      {plannedTexts.map((p) => (
        <text
          key={p.key}
          x={p.x}
          y={p.y}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={fontSize}
          fill={plannedTextFill}
          fontWeight="600"
        >
          {forecastLabel}
        </text>
      ))}
      {realBars.map((r) => (
        <g key={r.key}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={4} ry={4} fill={BAR_REAL_BG} />
          <text
            x={r.x + labelPadding}
            y={r.y + r.h / 2}
            textAnchor="start"
            dominantBaseline="middle"
            fontSize={fontSize}
            fill="#fff"
            fontWeight="500"
          >
            {r.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Caminha na faixa da barra de execução (laranja) em colunas de sábado e domingo. */
function WeekendBedIconsOverlay({
  width,
  height,
  tarefas,
  displayDates,
  columnWidth,
  rowHeight,
  barFillPercent,
}: {
  width: number;
  height: number;
  tarefas: DemandaExecucaoGanttTarefaDTO[];
  displayDates: Date[];
  columnWidth: number;
  rowHeight: number;
  barFillPercent: number;
}) {
  if (displayDates.length === 0 || width <= 0 || height <= 0 || tarefas.length === 0) return null;

  const taskHeight = (rowHeight * barFillPercent) / 100;
  const gap = 2;
  const barYOffsetReal = (row: number) =>
    row * rowHeight + (rowHeight - taskHeight) / 2 + taskHeight + gap;
  const barHeight = taskHeight - gap;

  const weekendCols: Array<{ index: number; startX: number; endX: number }> = [];
  displayDates.forEach((d, i) => {
    if (d.getDay() === 0 || d.getDay() === 6) {
      const startX = i * columnWidth;
      weekendCols.push({ index: i, startX, endX: startX + columnWidth });
    }
  });
  if (weekendCols.length === 0) return null;

  const iconPositions: Array<{ key: string; left: number; top: number }> = [];
  tarefas.forEach((t, row) => {
    const startStr = t.dataInicioReal ?? null;
    if (!startStr) return;
    const endDate = resolveRealExecutionEndForGanttBar(t);
    if (!endDate) return;
    const startDate = parseDateForGanttBar(startStr);
    let x1 = computeTaskX(startDate, displayDates, columnWidth);
    let x2 = computeTaskX(endDate, displayDates, columnWidth);
    x1 = Math.max(0, x1);
    x2 = Math.min(width, Math.max(x1 + 2, x2));
    if (x2 <= x1) return;

    for (const col of weekendCols) {
      const overlap = Math.min(x2, col.endX) - Math.max(x1, col.startX);
      if (overlap > 0) {
        iconPositions.push({
          key: `bed-${t.id}-${col.index}`,
          left: col.startX,
          top: barYOffsetReal(row),
        });
      }
    }
  });
  if (iconPositions.length === 0) return null;

  return (
    <div
      className="absolute left-0 top-0 pointer-events-none"
      style={{ width, height, zIndex: 21 }}
      aria-hidden
    >
      {iconPositions.map((icon) => (
        <div
          key={icon.key}
          className="absolute flex items-center justify-center"
          style={{
            left: icon.left,
            width: columnWidth,
            top: icon.top,
            height: barHeight,
          }}
          title="Fim de semana"
        >
          <Bed
            className="h-3.5 w-3.5 shrink-0 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            strokeWidth={2.25}
            aria-hidden
          />
        </div>
      ))}
    </div>
  );
}

/** Faixa superior customizada com mês/ano (ex.: Abril/2026) alinhada às colunas do Gantt. */
function MonthYearTopOverlay({
  width,
  displayDates,
  columnWidth,
}: {
  width: number;
  displayDates: Date[];
  columnWidth: number;
}) {
  if (displayDates.length === 0 || width <= 0) return null;

  const chunks: { label: string; x: number; w: number }[] = [];
  let chunkStart = 0;
  let currentKey = `${displayDates[0].getFullYear()}-${displayDates[0].getMonth()}`;

  for (let i = 1; i < displayDates.length; i++) {
    const key = `${displayDates[i].getFullYear()}-${displayDates[i].getMonth()}`;
    if (key !== currentKey) {
      const columns = i - chunkStart;
      chunks.push({
        label: capitalizeFirstLetter(format(displayDates[chunkStart], 'MMMM/yyyy', { locale: ptBR })),
        x: chunkStart * columnWidth,
        w: columns * columnWidth,
      });
      chunkStart = i;
      currentKey = key;
    }
  }
  chunks.push({
    label: capitalizeFirstLetter(format(displayDates[chunkStart], 'MMMM/yyyy', { locale: ptBR })),
    x: chunkStart * columnWidth,
    w: (displayDates.length - chunkStart) * columnWidth,
  });

  return (
    <div
      className="absolute left-0 top-0 z-[3] pointer-events-none border-b border-border/70 bg-background/95"
      style={{ width, height: MONTH_HEADER_HEIGHT }}
    >
      {chunks.map((chunk, idx) => (
        <div
          key={`${chunk.label}-${idx}`}
          className="absolute top-0 h-full border-r border-border/60 px-1 text-[10px] font-bold text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ left: chunk.x, width: chunk.w }}
          title={chunk.label}
        >
          {chunk.label}
        </div>
      ))}
    </div>
  );
}

/** Rótulos do dia por coluna. Substitui o texto do SVG do calendário, que fica oculto via CSS. */
function WeekdayDayOverlay({
  width,
  displayDates,
  columnWidth,
}: {
  width: number;
  displayDates: Date[];
  columnWidth: number;
}) {
  if (displayDates.length === 0 || width <= 0) return null;
  return (
    <div
      className="absolute left-0 z-[3] pointer-events-none border-b border-border/50"
      style={{ top: MONTH_HEADER_HEIGHT, width, height: WEEKDAY_ROW_HEIGHT }}
    >
      {displayDates.map((d, i) => {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        return (
          <div
            key={d.getTime()}
            className={cn(
              'absolute top-0 flex h-full items-center justify-center border-r border-border/40 px-0.5 text-[10px] tabular-nums',
              isWeekend ? 'text-muted-foreground' : 'text-muted-foreground bg-background/95',
            )}
            style={{
              left: i * columnWidth,
              width: columnWidth,
              ...(isWeekend ? GANTT_WEEKEND_HATCH : undefined),
            }}
            title={format(d, 'EEEE, dd/MM/yyyy', { locale: ptBR })}
          >
            {formatGanttDayHeaderLabel(d)}
          </div>
        );
      })}
    </div>
  );
}

function ganttTarefaToTask(t: DemandaExecucaoGanttTarefaDTO): Task {
  const start = parseDateForGanttBar(t.dataInicioPlanejada);
  const end = parseEndDateForGanttBar(t.dataFimPlanejada);
  const taskName = typeof t.sequencia === 'number' ? `${t.sequencia} - ${t.titulo}` : t.titulo;
  return {
    id: String(t.id),
    name: taskName,
    type: 'task',
    start,
    end,
    progress: Math.min(100, Math.max(0, Number(t.percentualProgresso) ?? 0)),
    dependencies: (t.predecessorIds ?? []).map(String),
    isDisabled: true,
    styles: {
      backgroundColor: BAR_PLANNED_COLOR,
      progressColor: BAR_PLANNED_PROGRESS,
      /* Mesmas cores com e sem seleção — clique na linha não altera a barra de previsão */
      backgroundSelectedColor: BAR_PLANNED_COLOR,
      progressSelectedColor: BAR_PLANNED_PROGRESS,
    },
  };
}

export default function ExecucaoGanttPage({
  demandaTecnicaId: demandaTecnicaIdProp,
  embedded = false,
}: ExecucaoGanttPageProps = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const { demandaTecnicaId } = useParams<{ demandaTecnicaId: string }>();
  const navigate = useNavigate();
  const id =
    typeof demandaTecnicaIdProp === 'number' && Number.isFinite(demandaTecnicaIdProp)
      ? demandaTecnicaIdProp
      : demandaTecnicaId
        ? Number(demandaTecnicaId)
        : NaN;

  const [data, setData] = useState<DemandaExecucaoGanttDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apontamentosByTaskId, setApontamentosByTaskId] = useState<
    Record<string, DemandaExecucaoTarefaApontamentoProgressoDTO[] | undefined>
  >({});
  const [loadingApontamentosFor, setLoadingApontamentosFor] = useState<string | null>(null);

  const ganttWrapperRef = useRef<HTMLDivElement>(null);
  const chartViewportRef = useRef<HTMLElement | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const isDraggingViewportRef = useRef(false);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);
  const monthHeaderContainerRef = useRef<HTMLDivElement | null>(null);
  const [overlayContainer, setOverlayContainer] = useState<HTMLDivElement | null>(null);
  const [monthHeaderContainer, setMonthHeaderContainer] = useState<HTMLDivElement | null>(null);
  const [overlayDimensions, setOverlayDimensions] = useState<{ width: number; height: number } | null>(null);
  const [monthHeaderWidth, setMonthHeaderWidth] = useState<number | null>(null);
  const [chartViewportElement, setChartViewportElement] = useState<HTMLElement | null>(null);
  const [viewDate, setViewDate] = useState<Date | undefined>(undefined);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleBack = useCallback(() => {
    const params = new URLSearchParams(location.search);
    const returnTo = params.get('returnTo');
    if (returnTo && returnTo.startsWith('/')) {
      navigate(returnTo);
      return;
    }
    navigate(-1);
  }, [location.search, navigate]);

  const handleExportPdf = useCallback(async () => {
    if (!data) return;
    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
      window.alert(
        t(
          'execucao.gantt.exportPdfPopupBlocked',
          'O navegador bloqueou a abertura do PDF. Permita popups para continuar.',
        ),
      );
      return;
    }

    pdfWindow.document.title = t('execucao.gantt.exportingPdf', 'Gerando PDF...');
    pdfWindow.document.body.innerHTML = `<div style="font-family: Arial, sans-serif; padding: 16px;">${t(
      'execucao.gantt.exportingPdf',
      'Gerando PDF...',
    )}</div>`;

    setExportingPdf(true);
    try {
      const blob = await generateExecucaoGanttPdfBlob(data, {
        title: t('execucao.gantt.reportTitle', 'Relatorio do Gantt de Execucao'),
        subtitle: t('execucao.gantt.reportSubtitle', 'Demanda tecnica'),
        generatedAt: t('execucao.gantt.generatedAt', 'Gerado em'),
        summaryTitle: t('execucao.gantt.reportSummaryTitle', 'Resumo executivo'),
        summaryTotalTasks: t('execucao.gantt.reportSummaryTotalTasks', 'Total de tarefas'),
        summaryAverageProgress: t(
          'execucao.gantt.reportSummaryAverageProgress',
          'Progresso medio',
        ),
        summaryTotalEstimateHours: t(
          'execucao.gantt.reportSummaryTotalEstimateHours',
          'Total estimado (h)',
        ),
        summaryPlannedRange: t('execucao.gantt.reportSummaryPlannedRange', 'Faixa planejada'),
        summaryRealRange: t('execucao.gantt.reportSummaryRealRange', 'Faixa real'),
        sequence: t('execucao.taskSequence', 'Seq.'),
        task: t('execucao.gantt.task', 'Tarefa'),
        status: t('execucao.taskStatus', 'Status'),
        priority: t('execucao.priority', 'Prioridade'),
        progress: t('execucao.percentualProgresso', 'Progresso'),
        estimateHours: t('execucao.estimativaHoras', 'Est. horas'),
        plannedPeriod: t('execucao.gantt.planning', 'Planejamento'),
        realPeriod: t('execucao.gantt.execution', 'Execucao'),
        resources: t('execucao.professional', 'Recursos'),
        gantt: t('execucao.gantt.reportGantt', 'Gantt'),
        plannedLegend: t('execucao.gantt.reportLegendPlanned', 'Barra planejada'),
        realLegend: t('execucao.gantt.reportLegendReal', 'Barra real'),
        notStartedLegend: t('execucao.gantt.reportLegendNotStarted', 'Sem inicio real'),
        noResources: t('execucao.noResourcesInTask', 'Nenhum recurso'),
        pageOf: (page, total) =>
          t('execucao.gantt.reportPageOf', 'Pagina {{page}} de {{total}}', {
            page,
            total,
          }),
      });

      const url = URL.createObjectURL(blob);
      pdfWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      pdfWindow.close();
      console.error('Erro ao exportar Gantt para PDF:', error);
      window.alert(
        t(
          'execucao.gantt.exportPdfError',
          'Nao foi possivel gerar o PDF do Gantt. Tente novamente.',
        ),
      );
    } finally {
      setExportingPdf(false);
    }
  }, [data, t]);

  const loadGantt = useCallback(async () => {
    if (!id || Number.isNaN(id)) {
      setError(t('execucao.invalidId', 'ID da demanda inválido'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ganttData = await demandaExecucaoService.getGanttByDemandaId(id);
      setData(ganttData);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? t('common.errorMessage');
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadGantt();
  }, [loadGantt]);

  const tarefaById = useMemo(() => {
    const map = new Map<string, DemandaExecucaoGanttTarefaDTO>();
    if (data?.tarefas) {
      for (const t of data.tarefas) {
        map.set(String(t.id), t);
      }
    }
    return map;
  }, [data]);

  /** Uma tarefa por demanda (só barra planejada); barra real é desenhada em overlay na mesma linha. */
  const tasks: Task[] = useMemo(
    () => (data?.tarefas ?? []).map(ganttTarefaToTask),
    [data?.tarefas]
  );

  /**
   * Mesmo intervalo lógico do gráfico: menor início e maior fim entre planejado e real (para a grade
   * e as barras coincidirem com `chartRangeBounds` na lib).
   */
  const chartRangeBounds = useMemo(() => {
    if (!data?.tarefas?.length) return undefined;
    let minMs = Infinity;
    let maxMs = -Infinity;
    for (const tf of data.tarefas) {
      minMs = Math.min(minMs, parseDateForGanttBar(tf.dataInicioPlanejada).getTime());
      maxMs = Math.max(maxMs, parseEndDateForGanttBar(tf.dataFimPlanejada).getTime());
      if (tf.dataInicioReal) {
        minMs = Math.min(minMs, parseDateForGanttBar(tf.dataInicioReal).getTime());
        const realEnd = resolveRealExecutionEndForGanttBar(tf);
        if (realEnd) {
          maxMs = Math.max(maxMs, realEnd.getTime());
        }
      }
    }
    if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) return undefined;
    return { min: new Date(minMs), max: new Date(maxMs) };
  }, [data?.tarefas]);

  /** Colunas do gráfico (calendário dia a dia), alinhadas à grade interna do Gantt. */
  const ganttDisplayDates = useMemo(() => {
    if (!chartRangeBounds) return [];
    return buildWeekdayColumnDatesFromBounds(chartRangeBounds.min, chartRangeBounds.max);
  }, [chartRangeBounds]);

  // Injeta overlay das barras reais na área do grid (mesma linha, segunda “faixa”).
  useEffect(() => {
    if (!data?.tarefas?.length || tasks.length === 0) {
      overlayContainerRef.current?.remove();
      overlayContainerRef.current = null;
      setOverlayContainer(null);
      setOverlayDimensions(null);
      chartViewportRef.current = null;
      setChartViewportElement(null);
      monthHeaderContainerRef.current?.remove();
      monthHeaderContainerRef.current = null;
      setMonthHeaderContainer(null);
      setMonthHeaderWidth(null);
      return;
    }
    const timer = setTimeout(() => {
      const wrapper = ganttWrapperRef.current;
      if (!wrapper) return;
      const svgs = wrapper.querySelectorAll('svg');
      if (svgs.length < 2) return;
      const calendarSvg = svgs[0] as SVGElement;
      const gridSvg = svgs[1] as SVGElement;
      const calendarParent = calendarSvg.parentElement;
      const parent = gridSvg.parentElement;
      if (!parent || !calendarParent) return;
      chartViewportRef.current = parent.parentElement as HTMLElement | null;
      setChartViewportElement(chartViewportRef.current);
      const w = parseInt(gridSvg.getAttribute('width') ?? '0', 10);
      const h = parseInt(gridSvg.getAttribute('height') ?? '0', 10);
      const headerW = parseInt(calendarSvg.getAttribute('width') ?? '0', 10);
      if (!w || !h || !headerW) return;
      const existing = parent.querySelector('[data-real-bars-overlay]');
      if (existing) existing.remove();
      const existingHeader = calendarParent.querySelector('[data-gantt-calendar-overlays]');
      if (existingHeader) existingHeader.remove();
      overlayContainerRef.current?.remove();
      monthHeaderContainerRef.current?.remove();
      // Garante que o overlay (position:absolute) seja posicionado em relação ao container do grid,
      // e não a um ancestral que inclui o cabeçalho do Gantt.
      const prevPosition = (parent as HTMLElement).style.position;
      (parent as HTMLElement).style.position = 'relative';
      const prevCalendarPosition = (calendarParent as HTMLElement).style.position;
      (calendarParent as HTMLElement).style.position = 'relative';
      const div = document.createElement('div');
      div.setAttribute('data-real-bars-overlay', 'true');
      div.style.cssText = `position:absolute;top:0;left:0;width:${w}px;height:${h}px;pointer-events:none;z-index:12`;
      parent.appendChild(div);
      overlayContainerRef.current = div;
      setOverlayContainer(div);
      setOverlayDimensions({ width: w, height: h });
      const monthDiv = document.createElement('div');
      monthDiv.setAttribute('data-gantt-calendar-overlays', 'true');
      monthDiv.style.cssText = `position:absolute;top:0;left:0;width:${headerW}px;height:${
        MONTH_HEADER_HEIGHT + WEEKDAY_ROW_HEIGHT
      }px;pointer-events:none;z-index:3`;
      calendarParent.appendChild(monthDiv);
      monthHeaderContainerRef.current = monthDiv;
      setMonthHeaderContainer(monthDiv);
      setMonthHeaderWidth(headerW);
      const restoreParentPosition = () => {
        (parent as HTMLElement).style.position = prevPosition || '';
      };
      const restoreCalendarPosition = () => {
        (calendarParent as HTMLElement).style.position = prevCalendarPosition || '';
      };
      const observer = new MutationObserver(() => {
        if (!parent.contains(div)) {
          restoreParentPosition();
          observer.disconnect();
        }
      });
      observer.observe(parent, { childList: true });
      const headerObserver = new MutationObserver(() => {
        if (!calendarParent.contains(monthDiv)) {
          restoreCalendarPosition();
          headerObserver.disconnect();
        }
      });
      headerObserver.observe(calendarParent, { childList: true });
      const cleanupOverlay = () => {
        observer.disconnect();
        headerObserver.disconnect();
        restoreParentPosition();
        restoreCalendarPosition();
        overlayContainerRef.current?.remove();
        overlayContainerRef.current = null;
        setOverlayContainer(null);
        setOverlayDimensions(null);
        chartViewportRef.current = null;
        setChartViewportElement(null);
        monthHeaderContainerRef.current?.remove();
        monthHeaderContainerRef.current = null;
        setMonthHeaderContainer(null);
        setMonthHeaderWidth(null);
      };
      (div as unknown as { _cleanup?: () => void })._cleanup = cleanupOverlay;
    }, 50);
    return () => {
      clearTimeout(timer);
      const div = overlayContainerRef.current;
      if (div && (div as unknown as { _cleanup?: () => void })._cleanup) {
        (div as unknown as { _cleanup: () => void })._cleanup();
      } else {
        overlayContainerRef.current?.remove();
        overlayContainerRef.current = null;
        setOverlayContainer(null);
        setOverlayDimensions(null);
        chartViewportRef.current = null;
        setChartViewportElement(null);
        monthHeaderContainerRef.current?.remove();
        monthHeaderContainerRef.current = null;
        setMonthHeaderContainer(null);
        setMonthHeaderWidth(null);
      }
    };
  }, [data?.tarefas, tasks.length]);

  useEffect(() => {
    const viewport = chartViewportElement;
    if (!viewport) return;

    viewport.style.cursor = 'grab';

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'button,a,input,textarea,select,[role="button"],[data-no-drag-scroll="true"]',
        )
      ) {
        return;
      }
      isDraggingViewportRef.current = true;
      dragStartXRef.current = event.clientX;
      dragStartScrollLeftRef.current = viewport.scrollLeft;
      viewport.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      event.preventDefault();
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDraggingViewportRef.current) return;
      const dx = event.clientX - dragStartXRef.current;
      viewport.scrollLeft = dragStartScrollLeftRef.current - dx;
      event.preventDefault();
    };

    const stopDragging = () => {
      if (!isDraggingViewportRef.current) return;
      isDraggingViewportRef.current = false;
      viewport.style.cursor = 'grab';
      document.body.style.userSelect = '';
    };

    viewport.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('mouseleave', stopDragging);

    return () => {
      viewport.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('mouseleave', stopDragging);
      viewport.style.cursor = '';
      document.body.style.userSelect = '';
      isDraggingViewportRef.current = false;
    };
  }, [chartViewportElement]);

  // Tooltip simples apenas com o nome da tarefa; detalhes vão para a lista lateral com acordeão.
  const TooltipContent = ({ task }: { task: Task; fontSize: string; fontFamily: string }) => {
    return (
      <div className="rounded-md bg-popover px-3 py-2 text-xs shadow-md">
        <div className="font-medium text-foreground">{task.name}</div>
      </div>
    );
  };

  // Estado para acordeão de detalhes (recursos x progresso) por tarefa
  const [expandedByTaskId, setExpandedByTaskId] = useState<Record<string, 'resources' | 'progress' | null>>({});

  const handleTaskRowSelect = useCallback(
    (taskId: string, setSelectedTask: (taskId: string) => void) => {
      setSelectedTask(taskId);

      const selectedTask = tasks.find((t) => t.id === taskId);
      if (!selectedTask || ganttDisplayDates.length < 2) return;

      const startX = computeTaskX(selectedTask.start, ganttDisplayDates, COLUMN_WIDTH);
      const currentScrollLeft = chartViewportRef.current?.scrollLeft ?? 0;
      const distanceFromLeft = startX - currentScrollLeft;

      // Se já está visualmente próximo à esquerda, mantém a posição atual.
      if (distanceFromLeft >= 0 && distanceFromLeft <= AUTO_SCROLL_START_NEAR_LEFT_PX) return;

      const targetLeft = Math.max(0, startX - AUTO_SCROLL_START_PADDING_PX);
      const targetDateIndex = Math.max(
        0,
        Math.min(ganttDisplayDates.length - 1, Math.floor(targetLeft / COLUMN_WIDTH)),
      );
      const targetDate = ganttDisplayDates[targetDateIndex];

      if (targetDate) {
        setViewDate(targetDate);
      }
    },
    [ganttDisplayDates, tasks],
  );

  const toggleSection = (taskId: string, section: 'resources' | 'progress') => {
    setExpandedByTaskId((prev) => {
      const current = prev[taskId] ?? null;
      const next = current === section ? null : section;
      return { ...prev, [taskId]: next };
    });

    // Lazy-load apontamentos quando abrir a seção de progresso pela primeira vez
    if (section === 'progress') {
      const alreadyLoaded = apontamentosByTaskId[taskId] !== undefined;
      if (!alreadyLoaded) {
        const tarefa = tarefaById.get(taskId);
        if (!tarefa) return;
        setLoadingApontamentosFor(taskId);
        apontamentoService
          .listByTarefaId(tarefa.id)
          .then((items) => {
            setApontamentosByTaskId((prev) => ({ ...prev, [taskId]: items }));
          })
          .catch(() => {
            setApontamentosByTaskId((prev) => ({ ...prev, [taskId]: [] }));
          })
          .finally(() => {
            setLoadingApontamentosFor((prev) => (prev === taskId ? null : prev));
          });
      }
    }
  };

  /** Mesmo padrão do cabeçalho do gráfico: dia com 3 letras (seg, ter, qua…) + data. */
  const formatDayLabel = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const d = parseLocalDate(dateStr);
    return `${WEEKDAY_SHORT_3_PT[d.getDay()]}, ${format(d, 'dd/MM/yyyy')}`;
  };

  const CustomTaskListHeader: React.FC<{
    headerHeight: number;
    rowWidth: string;
    fontFamily: string;
    fontSize: string;
  }> = ({ headerHeight, rowWidth }) => {
    return (
      <div style={{ height: headerHeight, width: rowWidth }} className="border-b border-border bg-muted px-2">
        <div className="flex items-center h-1/2 text-[11px] font-medium text-muted-foreground">
          <span className="w-28 text-left" />
          <span className="w-20 text-left" />
          <span className="w-28 text-right pr-2">{t('execucao.gantt.planning', 'Planejamento')}</span>
          <span className="w-28 text-right pr-2" />
          <span className="w-28 text-right pr-2">{t('execucao.gantt.execution', 'Execução')}</span>
          <span className="w-28 text-right pr-2" />
        </div>
        <div className="flex items-center h-1/2 text-[11px] text-muted-foreground">
          <span className="font-medium w-28 text-left">{t('execucao.gantt.task', 'Tarefa')}</span>
          <span className="font-medium w-28 text-right pr-2">{t('execucao.gantt.start', 'Início')}</span>
          <span className="font-medium w-28 text-right pr-2">{t('execucao.gantt.end', 'Fim')}</span>
          <span className="font-medium w-28 text-right pr-2">{t('execucao.gantt.start', 'Início')}</span>
          <span className="font-medium w-28 text-right pr-2">{t('execucao.gantt.end', 'Fim')}</span>
          <span className="w-14" />
        </div>
      </div>
    );
  };

  const CustomTaskListTable: React.FC<{
    rowHeight: number;
    rowWidth: string;
    fontFamily: string;
    fontSize: string;
    locale: string;
    tasks: Task[];
    selectedTaskId: string;
    setSelectedTask: (taskId: string) => void;
    onExpanderClick: (task: Task) => void;
  }> = ({ rowHeight, rowWidth, tasks, selectedTaskId, setSelectedTask }) => {
    return (
      <div style={{ width: rowWidth }} className="border-r border-border bg-card">
        {tasks.map((task) => {
          const ganttTask = tarefaById.get(task.id);
          const expanded = expandedByTaskId[task.id] ?? null;
          const isSelected = selectedTaskId === task.id;
          return (
            <div key={task.id} className="border-b border-border/70">
              <div
                className={cn(
                  'flex items-center px-2 text-xs cursor-pointer transition-[background-color,box-shadow] duration-150 hover:bg-muted/60',
                  isSelected && 'bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]',
                )}
                style={{ height: rowHeight }}
                onClick={() => handleTaskRowSelect(task.id, setSelectedTask)}
                aria-selected={isSelected}
              >
                <span className={cn('w-28 text-left font-medium', isSelected && 'border-l-4 border-primary pl-2')}>
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    <Popover>
                      <PopoverTrigger asChild>
                        <span className="block min-w-0 max-w-[90px] truncate cursor-pointer" title={task.name}>
                          {task.name}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 max-w-[75vw] break-words text-xs">
                        {task.name}
                      </PopoverContent>
                    </Popover>
                  </span>
                </span>
                <span className="w-28 text-right pr-2 text-muted-foreground">
                  {ganttTask ? formatDayLabel(ganttTask.dataInicioPlanejada) : '-'}
                </span>
                <span className="w-28 text-right pr-2 text-muted-foreground">
                  {ganttTask ? formatDayLabel(ganttTask.dataFimPlanejada) : '-'}
                </span>
                <span className="w-28 text-right pr-2 text-muted-foreground">
                  {ganttTask ? formatDayLabel(ganttTask.dataInicioReal) : '-'}
                </span>
                <span className="w-28 text-right pr-2 text-muted-foreground">
                  {ganttTask ? formatDayLabel(ganttTask.dataFimReal) : '-'}
                </span>
                <div className="w-14 flex items-center justify-center gap-1 ml-1">
                  <button
                    type="button"
                    className={`h-6 w-6 rounded-sm border text-[10px] flex items-center justify-center ${
                      expanded === 'resources' ? 'bg-emerald-600 text-emerald-50 border-emerald-700' : 'border-border text-emerald-700'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection(task.id, 'resources');
                    }}
                    aria-label={t('execucao.professional', 'Recursos')}
                  >
                    R
                  </button>
                  <button
                    type="button"
                    className={`h-6 w-6 rounded-sm border text-[10px] flex items-center justify-center ${
                      expanded === 'progress' ? 'bg-sky-600 text-sky-50 border-sky-700' : 'border-border text-sky-700'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection(task.id, 'progress');
                    }}
                    aria-label={t('execucao.percentualProgresso', 'Progresso')}
                  >
                    P
                  </button>
                </div>
              </div>
              {expanded && ganttTask && (
                <div className="bg-muted px-3 py-2 text-[11px] border-t border-border/60">
                  {expanded === 'resources' ? (
                    ganttTask.recursos && ganttTask.recursos.length > 0 ? (
                      <ul className="space-y-0.5">
                        {ganttTask.recursos.map((r) => (
                          <li key={r.id} className="flex justify-between gap-2">
                            <span className="text-foreground">
                              {r.nome}
                              {r.perfilNome ? ` (${r.perfilNome})` : ''}
                            </span>
                            <span className="text-muted-foreground">
                              {Number(r.horasPlanejadas).toFixed(1)} h /{' '}
                              {r.horasExecutadas != null ? Number(r.horasExecutadas).toFixed(1) : '—'} h
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">
                        {t('execucao.noResourcesInTask', 'Nenhum recurso associado a esta tarefa.')}
                      </span>
                    )
                  ) : (
                    <div className="space-y-1">
                      {loadingApontamentosFor === task.id && (
                        <span className="text-muted-foreground">
                          {t('common.loadingData', 'Carregando dados...')}
                        </span>
                      )}
                      {loadingApontamentosFor !== task.id && (
                        <>
                          {(() => {
                            const apontamentos = apontamentosByTaskId[task.id];
                            if (!apontamentos || apontamentos.length === 0) {
                              return (
                                <span className="text-muted-foreground">
                                  {t(
                                    'execucao.noApontamentos',
                                    'Nenhum apontamento de progresso para esta tarefa.'
                                  )}
                                </span>
                              );
                            }
                            return (
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="border-b border-border/60 text-muted-foreground">
                                    <th className="text-left font-medium pb-1">
                                      {t('execucao.date', 'Data')}
                                    </th>
                                    <th className="text-left font-medium pb-1">
                                      {t('execucao.percentualProgresso', 'Progresso (%)')}
                                    </th>
                                    <th className="text-left font-medium pb-1">
                                      {t('execucao.comment', 'Comentário')}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {apontamentos.map((a) => (
                                    <tr key={a.id} className="border-t border-border/40">
                                      <td className="py-0.5 pr-2">
                                        {formatDayLabel(a.data)}
                                      </td>
                                      <td className="py-0.5 pr-2">
                                        {Number(a.percentual).toFixed(1)}%
                                      </td>
                                      <td className="py-0.5">
                                        {a.comentario || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 p-4">
        {!embedded && (
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
        )}
        <p className="text-destructive">{error ?? t('execucao.notFound', 'Execução não encontrada.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {!embedded && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exportingPdf || !data}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            {exportingPdf
              ? t('execucao.gantt.exportingPdf', 'Gerando PDF...')
              : t('execucao.gantt.exportPdf', 'Exportar PDF')}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{data.demandaTecnicaCodigo}</span>
          {' — '}
          {data.demandaTecnicaNome}
        </div>
      </div>

      <div ref={ganttWrapperRef} className="gantt-container overflow-x-auto border rounded-lg bg-card relative">
        <style>{`
          /* Remove o label (nome da tarefa) da barra teal */
          .gantt-container g.bar text { display: none; }
          /* Desabilita clique/seleção na barra teal (sem mudança de cor ao clicar) */
          .gantt-container g.bar { pointer-events: none; }
          /* Rótulos “dia, nº” do SVG: ocultos; usamos WeekdayDayOverlay */
          .gantt-container svg g.calendar > text {
            opacity: 0 !important;
            pointer-events: none;
          }
        `}</style>
        <Gantt
          tasks={tasks}
          viewMode={ViewMode.Day}
          headerHeight={GANTT_HEADER_HEIGHT}
          preStepsCount={GANTT_PRE_STEPS_DAY}
          listCellWidth="100%"
          columnWidth={COLUMN_WIDTH}
          rowHeight={ROW_HEIGHT}
          barFill={BAR_FILL_PERCENT}
          barCornerRadius={4}
          barProgressColor="#0d9488"
          barBackgroundColor="#5eead4"
          barProgressSelectedColor="#0d9488"
          barBackgroundSelectedColor="#5eead4"
          fontSize="10px"
          locale="pt-BR"
          chartRangeBounds={chartRangeBounds}
          viewDate={viewDate}
          TooltipContent={TooltipContent}
          TaskListHeader={CustomTaskListHeader}
          TaskListTable={CustomTaskListTable}
        />
        {overlayContainer &&
          overlayDimensions &&
          createPortal(
            <Fragment>
              <WeekendColumnHatchOverlay
                width={overlayDimensions.width}
                height={overlayDimensions.height}
                displayDates={ganttDisplayDates}
                columnWidth={COLUMN_WIDTH}
              />
              <PlannedAndRealBarsOverlay
                width={overlayDimensions.width}
                height={overlayDimensions.height}
                tasks={tasks}
                tarefas={data?.tarefas ?? []}
                displayDates={ganttDisplayDates}
                columnWidth={COLUMN_WIDTH}
                rowHeight={ROW_HEIGHT}
                barFillPercent={BAR_FILL_PERCENT}
                forecastLabel={t('execucao.gantt.barForecast', 'Previsão')}
                formatExecutedLabel={(pct) =>
                  t('execucao.gantt.barExecutedWithPercent', 'Executado ({{percent}}%)', {
                    percent: pct.toFixed(0),
                  })
                }
              />
              <WeekendBedIconsOverlay
                width={overlayDimensions.width}
                height={overlayDimensions.height}
                tarefas={data?.tarefas ?? []}
                displayDates={ganttDisplayDates}
                columnWidth={COLUMN_WIDTH}
                rowHeight={ROW_HEIGHT}
                barFillPercent={BAR_FILL_PERCENT}
              />
            </Fragment>,
            overlayContainer
          )}
        {monthHeaderContainer &&
          monthHeaderWidth &&
          createPortal(
            <Fragment>
              <MonthYearTopOverlay
                width={monthHeaderWidth}
                displayDates={ganttDisplayDates}
                columnWidth={COLUMN_WIDTH}
              />
              <WeekdayDayOverlay
                width={monthHeaderWidth}
                displayDates={ganttDisplayDates}
                columnWidth={COLUMN_WIDTH}
              />
            </Fragment>,
            monthHeaderContainer
          )}
      </div>
    </div>
  );
}
