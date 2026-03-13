import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
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
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

/** Cor da barra do período planejado (teal). */
const BAR_PLANNED_COLOR = '#5eead4';
const BAR_PLANNED_PROGRESS = '#0d9488';

/** Cor de abóbora para a barra do período de execução REAL. */
const BAR_REAL_BG = '#e0782c';
const BAR_REAL_PROGRESS = '#c2611e';

const COLUMN_WIDTH = 50;
/** Linha mais alta para caber barra teal + margem + barra laranja (mesma altura que a teal). */
const ROW_HEIGHT = 60;
/** Altura da barra teal em % da linha; com ROW_HEIGHT 60, deixa espaço para teal + gap + laranja (mesma altura). */
const BAR_FILL_PERCENT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Retorna o início do dia em hora local. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Grid start igual ao do gantt-task-react (Day view): início do primeiro dia das tarefas menos preStepsCount (1) dia. */
function getGridStartDayView(minTaskStart: Date, preStepsCount = 1): Date {
  const start = startOfDay(minTaskStart);
  start.setDate(start.getDate() - preStepsCount);
  return start;
}

/**
 * Converte data em x na grade, replicando a lógica de taskXCoordinate do gantt-task-react:
 * index = findIndex(d >= date) - 1, x = index * columnWidth + percentOfInterval * columnWidth.
 */
function dateToX(date: Date, dates: Date[], columnWidth: number): number {
  const idx = dates.findIndex((d) => d.getTime() >= date.getTime()) - 1;
  const i = Math.max(0, idx);
  const d0 = dates[i];
  const d1 = dates[i + 1];
  if (!d1) return i * columnWidth;
  const remainderMillis = date.getTime() - d0.getTime();
  const intervalMs = d1.getTime() - d0.getTime();
  const percentOfInterval = intervalMs > 0 ? remainderMillis / intervalMs : 0;
  return i * columnWidth + percentOfInterval * columnWidth;
}

/** Converte data fim (fim do dia) em x: mesma lógica que a biblioteca para o fim da barra. */
function dateToXEnd(date: Date, dates: Date[], columnWidth: number): number {
  return dateToX(date, dates, columnWidth);
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

/** Filtra apenas dias úteis (segunda a sexta); domingo = 0, sábado = 6. */
function filterWeekdays(dates: Date[]): Date[] {
  return dates.filter((d) => {
    const day = d.getDay();
    return day !== 0 && day !== 6;
  });
}

/** Ajusta data que cai em fim de semana para o dia útil mais próximo (para grade só com dias úteis). */
function toWeekdayForGrid(d: Date, asEnd: boolean): Date {
  const day = d.getDay();
  if (day === 0) return asEnd ? addDays(d, -2) : addDays(d, 1); // domingo: fim -> sexta, início -> segunda
  if (day === 6) return asEnd ? addDays(d, -1) : addDays(d, 2); // sábado: fim -> sexta, início -> segunda
  return d;
}
function addDays(d: Date, n: number): Date {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + n);
  return out;
}

/** Overlay que desenha as barras do período REAL na metade inferior de cada linha (mesma linha da tarefa). */
function RealBarsOverlay({
  width,
  height,
  tasks,
  tarefas,
  columnWidth,
  rowHeight,
  barFillPercent,
}: {
  width: number;
  height: number;
  tasks: Task[];
  tarefas: DemandaExecucaoGanttTarefaDTO[];
  columnWidth: number;
  rowHeight: number;
  barFillPercent: number;
}) {
  if (tasks.length === 0 || tarefas.length === 0) return null;
  const taskHeight = (rowHeight * barFillPercent) / 100;
  // Margem entre as barras e margem bottom na barra laranja (mesmo valor)
  const gap = 2;
  const barYOffset = (rowHeight - taskHeight) / 2 + taskHeight + gap;
  const barHeight = taskHeight - gap;

  const minStart = new Date(Math.min(...tasks.map((t) => t.start.getTime())));
  const maxEnd = new Date(Math.max(...tasks.map((t) => t.end.getTime())));
  // Mesmo gridStart do gantt-task-react (Day view): 1 dia antes do primeiro dia das tarefas
  const gridStart = getGridStartDayView(minStart);
  const gridEnd = new Date(startOfDay(maxEnd).getTime());
  gridEnd.setDate(gridEnd.getDate() + 20); // biblioteca usa +19 dias no Day view
  const datesAll = buildDatesDayView(gridStart, gridEnd);
  const dates = filterWeekdays(datesAll);

  const rects: { x: number; width: number; y: number; height: number; percentual: number }[] = [];
  tarefas.forEach((t, i) => {
    const startStr = t.dataInicioReal ?? null;
    const endStr = t.dataFimReal ?? null;
    if (!startStr || !endStr) return;
    let startDate = parseDateForGanttBar(startStr);
    let endDate = parseEndDateForGanttBar(endStr);
    startDate = toWeekdayForGrid(startDate, false);
    endDate = toWeekdayForGrid(endDate, true);
    let x1 = dateToX(startDate, dates, columnWidth);
    let x2 = dateToXEnd(endDate, dates, columnWidth);
    x1 = Math.max(0, x1);
    x2 = Math.min(width, Math.max(x1 + 2, x2));
    const y = i * rowHeight + barYOffset;
    const percentual = Math.min(100, Math.max(0, Number(t.percentualProgresso) ?? 0));
    rects.push({ x: x1, width: x2 - x1, y, height: barHeight, percentual });
  });

  if (rects.length === 0) return null;

  const labelPadding = 4;
  const fontSize = 10;

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', pointerEvents: 'none' }}
      className="absolute left-0 top-0"
    >
      {rects.map((r, idx) => (
        <g key={idx}>
          <rect
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            rx={4}
            ry={4}
            fill={BAR_REAL_BG}
          />
          <text
            x={r.x + labelPadding}
            y={r.y + r.height / 2}
            textAnchor="start"
            dominantBaseline="middle"
            fontSize={fontSize}
            fill="#fff"
            fontWeight="500"
          >
            {`${r.percentual.toFixed(0)}%`}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ganttTarefaToTask(t: DemandaExecucaoGanttTarefaDTO): Task {
  const start = parseDateForGanttBar(t.dataInicioPlanejada);
  const end = parseEndDateForGanttBar(t.dataFimPlanejada);
  return {
    id: String(t.id),
    name: t.titulo,
    type: 'task',
    start,
    end,
    progress: Math.min(100, Math.max(0, Number(t.percentualProgresso) ?? 0)),
    dependencies: (t.predecessorIds ?? []).map(String),
    isDisabled: true,
    styles: {
      backgroundColor: BAR_PLANNED_COLOR,
      progressColor: BAR_PLANNED_PROGRESS,
    },
  };
}

export default function ExecucaoGanttPage() {
  const { t } = useTranslation();
  const { demandaTecnicaId } = useParams<{ demandaTecnicaId: string }>();
  const navigate = useNavigate();
  const id = demandaTecnicaId ? Number(demandaTecnicaId) : NaN;

  const [data, setData] = useState<DemandaExecucaoGanttDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apontamentosByTaskId, setApontamentosByTaskId] = useState<
    Record<string, DemandaExecucaoTarefaApontamentoProgressoDTO[] | undefined>
  >({});
  const [loadingApontamentosFor, setLoadingApontamentosFor] = useState<string | null>(null);

  const ganttWrapperRef = useRef<HTMLDivElement>(null);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);
  const [overlayContainer, setOverlayContainer] = useState<HTMLDivElement | null>(null);
  const [overlayDimensions, setOverlayDimensions] = useState<{ width: number; height: number } | null>(null);

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

  // Injeta overlay das barras reais na área do grid (mesma linha, segunda “faixa”).
  useEffect(() => {
    if (!data?.tarefas?.length || tasks.length === 0) {
      overlayContainerRef.current?.remove();
      overlayContainerRef.current = null;
      setOverlayContainer(null);
      setOverlayDimensions(null);
      return;
    }
    const timer = setTimeout(() => {
      const wrapper = ganttWrapperRef.current;
      if (!wrapper) return;
      const svgs = wrapper.querySelectorAll('svg');
      if (svgs.length < 2) return;
      const gridSvg = svgs[1] as SVGElement;
      const parent = gridSvg.parentElement;
      if (!parent) return;
      const w = parseInt(gridSvg.getAttribute('width') ?? '0', 10);
      const h = parseInt(gridSvg.getAttribute('height') ?? '0', 10);
      if (!w || !h) return;
      const existing = parent.querySelector('[data-real-bars-overlay]');
      if (existing) existing.remove();
      overlayContainerRef.current?.remove();
      // Garante que o overlay (position:absolute) seja posicionado em relação ao container do grid,
      // e não a um ancestral que inclui o cabeçalho do Gantt.
      const prevPosition = (parent as HTMLElement).style.position;
      (parent as HTMLElement).style.position = 'relative';
      const div = document.createElement('div');
      div.setAttribute('data-real-bars-overlay', 'true');
      div.style.cssText = `position:absolute;top:0;left:0;width:${w}px;height:${h}px;pointer-events:none;z-index:1`;
      parent.appendChild(div);
      overlayContainerRef.current = div;
      setOverlayContainer(div);
      setOverlayDimensions({ width: w, height: h });
      const restoreParentPosition = () => {
        (parent as HTMLElement).style.position = prevPosition || '';
      };
      const observer = new MutationObserver(() => {
        if (!parent.contains(div)) {
          restoreParentPosition();
          observer.disconnect();
        }
      });
      observer.observe(parent, { childList: true });
      const cleanupOverlay = () => {
        observer.disconnect();
        restoreParentPosition();
        overlayContainerRef.current?.remove();
        overlayContainerRef.current = null;
        setOverlayContainer(null);
        setOverlayDimensions(null);
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
      }
    };
  }, [data?.tarefas, tasks.length]);

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

  const formatDayLabel = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const d = parseLocalDate(dateStr);
    return format(d, 'EEE, dd/MM/yyyy', { locale: ptBR });
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
          return (
            <div key={task.id} className="border-b border-border/70">
              <div
                className="flex items-center px-2 text-xs cursor-pointer hover:bg-muted/60"
                style={{ height: rowHeight }}
                onClick={() => setSelectedTask(task.id)}
              >
                <span className="w-28 text-left font-medium">{task.name}</span>
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
                            <span className="text-foreground">{r.nome}</span>
                            <span className="text-muted-foreground">
                              {Number(r.horasPlanejadas).toFixed(1)} h
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
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>
        <p className="text-destructive">{error ?? t('execucao.notFound', 'Execução não encontrada.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>
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
        `}</style>
        <Gantt
          tasks={tasks}
          viewMode={ViewMode.Day}
          listCellWidth="100%"
          columnWidth={COLUMN_WIDTH}
          rowHeight={ROW_HEIGHT}
          barFill={BAR_FILL_PERCENT}
          barCornerRadius={4}
          barProgressColor="#0d9488"
          barBackgroundColor="#5eead4"
          fontSize="10px"
          locale="pt-BR"
          {...({ excludeWeekends: true } as { excludeWeekends?: boolean })}
          TooltipContent={TooltipContent}
          TaskListHeader={CustomTaskListHeader}
          TaskListTable={CustomTaskListTable}
        />
        {overlayContainer &&
          overlayDimensions &&
          createPortal(
            <RealBarsOverlay
              width={overlayDimensions.width}
              height={overlayDimensions.height}
              tasks={tasks}
              tarefas={data?.tarefas ?? []}
              columnWidth={COLUMN_WIDTH}
              rowHeight={ROW_HEIGHT}
              barFillPercent={BAR_FILL_PERCENT}
            />,
            overlayContainer
          )}
      </div>
    </div>
  );
}
