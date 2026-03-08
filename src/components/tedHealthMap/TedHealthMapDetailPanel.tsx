/**
 * TedHealthMapDetailPanel - Painel lateral de detalhes
 * Para Meta e Produto: tabela (código, descrição, total previsto/executado, % execução) + gráfico pizza 3D.
 * Para Demanda: tabela (Meta, Produto, Código, Descrição, Total previsto, Total executado, Status).
 * TED: nome, badge, valor, desvios, status.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Chart } from 'react-google-charts';
import type { BubbleNode } from '@/types/tedHealthMap';
import { getScheduleStatusColor } from '@/types/tedHealthMap';
import { getDemandaStatusLabelKey, normalizeDemandaStatus } from '@/lib/demandaStatus';
import { termoAberturaService, termoEncerramentoService, termoPlanejamentoService } from '@/services/termoService';
import { termoAberturaDocService, termoPlanejamentoDocService, termoEncerramentoDocService } from '@/services/termoDocService';
import type { TermoEncerramento, TermoEncerramentoCusto, TermoPlanejamento, TermoPlanejamentoCusto } from '@/types';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BalloonTooltip } from '@/components/tedHealthMap/BalloonTooltip';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { useToast } from '@/hooks/use-toast';
import { Info, FilePlus, FileCheck, FileX, ClipboardList, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { avaliacaoDemandaService } from '@/features/avaliacao-demanda/avaliacaoDemandaService';
import { avaliacaoDemandaDocService } from '@/features/avaliacao-demanda/avaliacaoDemandaDocService';
import type { DemandaAvaliacaoResponse } from '@/features/avaliacao-demanda/types';
import type { ReactGoogleChartEvent } from 'react-google-charts';
import { DemandaTimelineModal } from '@/components/demandas/DemandaTimelineModal';

const formatCurrency = (value: number | undefined | null) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
};

const formatPercent = (value: number | undefined | null) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 100);
};

type ZoomLevel = 'ted' | 'meta' | 'produto';

interface TedHealthMapDetailPanelProps {
  node: BubbleNode | null;
  zoomLevel?: ZoomLevel;
  onClose?: () => void;
  /** Valor total previsto do produto ao qual a demanda pertence (para tooltip % no sidebar de demanda) */
  productValorPrevisto?: number;
  /** Código da meta quando o nó exibido é um produto (exibido acima do código do produto) */
  parentMetaCode?: string;
  /** className aplicada ao Card raiz (ex.: background do sidebar no health-map) */
  cardClassName?: string;
}

const colorMap = {
  green: 'bg-success/20 text-success',
  yellow: 'bg-warning/20 text-warning',
  red: 'bg-destructive/20 text-destructive',
};

function getStatusLabelFallback(node: BubbleNode): 'OK' | 'RISCO' | 'CRITICO' {
  if (node.statusLabel) return node.statusLabel;
  const prazo = node.desvioPrazoDias ?? 0;
  const esforco = Math.abs(node.desvioEsforcoHoras ?? 0);
  const financeiro = Math.abs(node.desvioFinanceiro ?? 0);
  const valor = (typeof node.valor === 'number' && Number.isFinite(node.valor) && node.valor > 0)
    ? node.valor
    : 1;
  if (prazo > 7 || esforco > 30 || financeiro / valor > 0.15) return 'CRITICO';
  if (prazo > 0 || esforco > 20 || financeiro / valor > 0.1) return 'RISCO';
  return 'OK';
}

const statusStyle = {
  OK: 'bg-success/20 text-success',
  RISCO: 'bg-warning/20 text-warning',
  CRITICO: 'bg-destructive/20 text-destructive',
};

type DemandTermDoc = { termoId: number | null; hasDoc: boolean };

type TermDocType = 'abertura' | 'planejamento' | 'encerramento';

export function TedHealthMapDetailPanel({ node, zoomLevel = 'ted', onClose, productValorPrevisto, parentMetaCode, cardClassName }: TedHealthMapDetailPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [termoEncerramento, setTermoEncerramento] = useState<TermoEncerramento | null>(null);
  const [termoPlanejamento, setTermoPlanejamento] = useState<TermoPlanejamento | null>(null);
  const [demandTermDocs, setDemandTermDocs] = useState<{
    abertura: DemandTermDoc;
    planejamento: DemandTermDoc;
    encerramento: DemandTermDoc;
  } | null>(null);
  const [viewDocState, setViewDocState] = useState<{ type: TermDocType; termoId: number } | null>(null);
  const [avaliacaoDemanda, setAvaliacaoDemanda] = useState<DemandaAvaliacaoResponse | null>(null);
  const [viewAvaliacaoPdfOpen, setViewAvaliacaoPdfOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const demandNormalizedStatus = node?.level === 'demanda'
    ? normalizeDemandaStatus(
        node?.status ?? (node?.raw as unknown as Record<string, unknown> | undefined)?.status as string ?? (node?.raw as unknown as Record<string, unknown> | undefined)?.situacao as string
      )
    : undefined;
  const isDemandaStatusG = demandNormalizedStatus === 'G';
  const isDemandaStatusE = demandNormalizedStatus === 'E';

  useEffect(() => {
    if (!isDemandaStatusG || !node?.id) {
      setTermoEncerramento(null);
      return;
    }
    const demandaId = Number(node.id);
    if (!Number.isFinite(demandaId)) {
      setTermoEncerramento(null);
      return;
    }
    termoEncerramentoService.findByDemandaId(demandaId).then(setTermoEncerramento).catch(() => setTermoEncerramento(null));
  }, [isDemandaStatusG, node?.id]);

  useEffect(() => {
    if (!isDemandaStatusE || !node?.id) {
      setTermoPlanejamento(null);
      return;
    }
    const demandaId = Number(node.id);
    if (!Number.isFinite(demandaId)) {
      setTermoPlanejamento(null);
      return;
    }
    termoPlanejamentoService.findByDemandaId(demandaId).then(setTermoPlanejamento).catch(() => setTermoPlanejamento(null));
  }, [isDemandaStatusE, node?.id]);

  useEffect(() => {
    if (node?.level !== 'demanda' || !node?.id) {
      setDemandTermDocs(null);
      setAvaliacaoDemanda(null);
      return;
    }
    const demandaId = Number(node.id);
    if (!Number.isFinite(demandaId)) {
      setDemandTermDocs(null);
      setAvaliacaoDemanda(null);
      return;
    }
    Promise.all([
      termoAberturaService.findByDemandaId(demandaId).then(async (t) => ({
        termoId: t?.id ?? null,
        hasDoc: t ? await termoAberturaDocService.exists(t.id) : false,
      })),
      termoPlanejamentoService.findByDemandaId(demandaId).then(async (t) => ({
        termoId: t?.id ?? null,
        hasDoc: t ? await termoPlanejamentoDocService.exists(t.id) : false,
      })),
      termoEncerramentoService.findByDemandaId(demandaId).then(async (t) => ({
        termoId: t?.id ?? null,
        hasDoc: t ? await termoEncerramentoDocService.exists(t.id) : false,
      })),
    ])
      .then(([abertura, planejamento, encerramento]) =>
        setDemandTermDocs({ abertura, planejamento, encerramento })
      )
      .catch(() => setDemandTermDocs(null));
    avaliacaoDemandaService.get(demandaId).then(setAvaliacaoDemanda).catch(() => setAvaliacaoDemanda(null));
  }, [node?.level, node?.id]);

  const fetchTermDocBlob = (type: TermDocType, termoId: number) => {
    return type === 'abertura'
      ? termoAberturaDocService.downloadByTermoAberturaId(termoId)
      : type === 'planejamento'
        ? termoPlanejamentoDocService.downloadByTermoPlanejamentoId(termoId)
        : termoEncerramentoDocService.downloadByTermoEncerramentoId(termoId);
  };

  const getTermDocDialogTitle = (type: TermDocType) => {
    return type === 'abertura'
      ? t('healthMapDetail.docTermAbertura')
      : type === 'planejamento'
        ? t('healthMapDetail.docTermPlanejamento')
        : t('healthMapDetail.docTermEncerramento');
  };

  if (!node) {
    return (
      <Card className={cn('h-full', cardClassName)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">{t('healthMapDetail.clickBubble')}</p>
        </CardContent>
      </Card>
    );
  }

  const color = node.statusColor ?? getScheduleStatusColor(node.desvioPrazoDias);
  const status = getStatusLabelFallback(node);
  const codigo = node.codigo ?? (node.raw as { codigo?: string } | undefined)?.codigo;

  const rawMeta = node.level === 'meta' ? (node.raw as unknown as Record<string, unknown> | undefined) : undefined;
  const rawProduto = node.level === 'produto' ? (node.raw as unknown as Record<string, unknown> | undefined) : undefined;
  const rawDetail = rawMeta ?? rawProduto;
  const valorPrevisto = rawDetail?.valorTotalPrevisto != null ? Number(rawDetail.valorTotalPrevisto) : (node.valor ?? undefined);
  const valorExecutado = rawDetail?.valorTotalExecutado != null ? Number(rawDetail.valorTotalExecutado) : undefined;
  const percentualRaw = rawDetail?.percentualExecucao != null ? Number(rawDetail.percentualExecucao) : undefined;
  const percentualExecucao =
    percentualRaw != null && Number.isFinite(percentualRaw)
      ? percentualRaw
      : valorPrevisto != null && valorExecutado != null && Number.isFinite(valorPrevisto) && valorPrevisto > 0
        ? (valorExecutado / valorPrevisto) * 100
        : undefined;
  const descricaoDetail = rawDetail?.descricao != null ? String(rawDetail.descricao) : rawDetail?.nome != null ? String(rawDetail.nome) : undefined;

  const rawDemanda = node.level === 'demanda' ? (node.raw as unknown as Record<string, unknown> | undefined) : undefined;
  const metaProduto = rawDemanda?.metaProduto as unknown as Record<string, unknown> | undefined;
  const codigoMeta = rawDemanda?.codigoMeta != null ? String(rawDemanda.codigoMeta) : (metaProduto?.projetoMeta as Record<string, unknown> | undefined)?.codigo != null ? String((metaProduto.projetoMeta as Record<string, unknown>).codigo) : undefined;
  const codigoProduto = rawDemanda?.codigoProduto != null ? String(rawDemanda.codigoProduto) : metaProduto?.codigo != null ? String(metaProduto.codigo) : undefined;
  const codigoDemanda = codigo ?? (rawDemanda?.codigo != null ? String(rawDemanda.codigo) : undefined);
  const descricaoDemanda = rawDemanda?.descricao != null ? String(rawDemanda.descricao) : rawDemanda?.nome != null ? String(rawDemanda.nome) : node.name;
  const totalPrevistoDemanda = rawDemanda?.valorTotalPrevisto != null ? Number(rawDemanda.valorTotalPrevisto) : (node.valor ?? undefined);
  const totalExecutadoDemanda = rawDemanda?.valorTotalExecutado != null ? Number(rawDemanda.valorTotalExecutado) : undefined;
  const statusDemanda = node.status ?? (rawDemanda?.status != null ? String(rawDemanda.status) : rawDemanda?.situacao != null ? String(rawDemanda.situacao) : undefined);
  const statusDemandaLabelKey = getDemandaStatusLabelKey(statusDemanda);

  return (
    <>
    <Card className={cardClassName}>
      <CardHeader className="pb-2">
        {(node.level !== 'meta' && node.level !== 'produto' && node.level !== 'demanda') && (
          <CardTitle className="text-base font-normal">
            {codigo && <span className="text-muted-foreground font-medium">{codigo}</span>}
            {codigo && ' — '}
            {node.name}
          </CardTitle>
        )}
        {(node.level !== 'meta' && node.level !== 'produto' && node.level !== 'demanda') && (
          <Badge className={cn('w-fit', colorMap[color])}>
            {node.level === 'ted' ? t('healthMapDetail.levelTed') : t('healthMapDetail.levelDemand')}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {(node.level === 'meta' || node.level === 'produto') && (
          <Table>
            <TableBody>
              {node.level === 'produto' && parentMetaCode != null && parentMetaCode !== '' && (
                <TableRow>
                  <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.metaCode')}</TableCell>
                  <TableCell className="py-1.5">{parentMetaCode}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">
                  {node.level === 'meta' ? t('healthMapDetail.metaCode') : t('healthMapDetail.productCode')}
                </TableCell>
                <TableCell className="py-1.5">{codigo ?? '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.description')}</TableCell>
                <TableCell className="py-1.5">{descricaoDetail ?? node.name ?? '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.totalValuePlanned')}</TableCell>
                <TableCell className="py-1.5">{formatCurrency(valorPrevisto)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.totalValueExecuted')}</TableCell>
                <TableCell className="py-1.5">{formatCurrency(valorExecutado)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.executionPercent')}</TableCell>
                <TableCell className="py-1.5">{formatPercent(percentualExecucao)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        {node.level === 'demanda' && (
          <>
            <div className="flex items-center gap-2 pb-2 border-b">
              <TooltipProvider delayDuration={200}>
                {(['abertura', 'planejamento', 'encerramento'] as const).map((type) => {
                  const doc = demandTermDocs?.[type];
                  const hasDoc = doc?.termoId != null && doc.hasDoc;
                  const label =
                    type === 'abertura'
                      ? t('healthMapDetail.docTermAbertura')
                      : type === 'planejamento'
                        ? t('healthMapDetail.docTermPlanejamento')
                        : t('healthMapDetail.docTermEncerramento');
                  const labelNoDoc =
                    type === 'abertura'
                      ? t('healthMapDetail.docTermAberturaNoDoc')
                      : type === 'planejamento'
                        ? t('healthMapDetail.docTermPlanejamentoNoDoc')
                        : t('healthMapDetail.docTermEncerramentoNoDoc');
                  const Icon =
                    type === 'abertura'
                      ? FilePlus
                      : type === 'planejamento'
                        ? FileCheck
                        : FileX;
                  return (
                    <BalloonTooltip
                      key={type}
                      content={hasDoc ? label : labelNoDoc}
                      side="bottom"
                    >
                      <button
                        type="button"
                        onClick={() => hasDoc && doc.termoId != null && setViewDocState({ type, termoId: doc.termoId })}
                        disabled={!hasDoc}
                        className={cn(
                          'p-1.5 rounded transition-colors text-[#6B2D3C]',
                          hasDoc
                            ? 'hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-neutral-800'
                            : 'opacity-70 cursor-default'
                        )}
                        aria-label={hasDoc ? label : labelNoDoc}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.25} />
                      </button>
                    </BalloonTooltip>
                  );
                })}
                <BalloonTooltip
                  content={avaliacaoDemanda ? t('healthMapDetail.docAvaliacao') : t('healthMapDetail.docAvaliacaoNoDoc')}
                  side="bottom"
                >
                  <button
                    type="button"
                    onClick={() => avaliacaoDemanda && setViewAvaliacaoPdfOpen(true)}
                    disabled={!avaliacaoDemanda}
                    className={cn(
                      'p-1.5 rounded transition-colors text-[#6B2D3C]',
                      avaliacaoDemanda
                        ? 'hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-neutral-800'
                        : 'opacity-70 cursor-default'
                    )}
                    aria-label={avaliacaoDemanda ? t('healthMapDetail.docAvaliacao') : t('healthMapDetail.docAvaliacaoNoDoc')}
                  >
                    <ClipboardList className="h-4 w-4" strokeWidth={1.25} />
                  </button>
                </BalloonTooltip>
                <BalloonTooltip content={t('healthMapDetail.docTimeline')} side="bottom">
                  <button
                    type="button"
                    onClick={() => setTimelineOpen(true)}
                    className="p-1.5 rounded transition-colors text-[#6B2D3C] hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-neutral-800"
                    aria-label={t('healthMapDetail.docTimeline')}
                  >
                    <History className="h-4 w-4" strokeWidth={1.25} />
                  </button>
                </BalloonTooltip>
              </TooltipProvider>
            </div>
            <Table>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.metaCode')}</TableCell>
                <TableCell className="py-1.5">{codigoMeta ?? '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.productCode')}</TableCell>
                <TableCell className="py-1.5">{codigoProduto ?? '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.demandCode')}</TableCell>
                <TableCell className="py-1.5 font-bold">{codigoDemanda ?? '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.description')}</TableCell>
                <TableCell className="py-1.5">{descricaoDemanda ?? '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.productTotalPlanned')}</TableCell>
                <TableCell className="py-1.5">{formatCurrency(productValorPrevisto)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.totalValuePlanned')}</TableCell>
                <TableCell className="py-1.5">{formatCurrency(totalPrevistoDemanda)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.totalValueExecuted')}</TableCell>
                <TableCell className="py-1.5 font-bold">
                  <span className="inline-flex items-center gap-1.5 font-bold">
                    {formatCurrency(totalExecutadoDemanda)}
                    {node.level === 'demanda' &&
                      productValorPrevisto != null &&
                      Number(productValorPrevisto) > 0 &&
                      totalExecutadoDemanda != null &&
                      Number.isFinite(Number(totalExecutadoDemanda)) && (
                        <TooltipProvider delayDuration={200}>
                          <BalloonTooltip
                            content={t('healthMapDetail.demandExecutedPercentOfProduct', {
                              percent: new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
                                Number(totalExecutadoDemanda) / Number(productValorPrevisto)
                              ),
                            })}
                            side="top"
                          >
                            <button
                              type="button"
                              className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                              aria-label={t('healthMapDetail.demandExecutedPercentOfProduct', {
                                percent: new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
                                  Number(totalExecutadoDemanda) / Number(productValorPrevisto)
                                ),
                              })}
                            >
                              <Info className="h-3.5 w-3.5 shrink-0" />
                            </button>
                          </BalloonTooltip>
                        </TooltipProvider>
                      )}
                  </span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground py-1.5 font-bold">{t('healthMapDetail.statusLabel')}</TableCell>
                <TableCell className="py-1.5 text-[#1e3a5f] font-medium">{statusDemandaLabelKey ? t(statusDemandaLabelKey) : (statusDemanda ?? '—')}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          </>
        )}

        {node.level === 'demanda' && isDemandaStatusG && termoEncerramento?.custos && termoEncerramento.custos.length > 0 && (
          <div className="space-y-2 w-full min-w-0 max-w-full overflow-hidden">
            <p className="text-xs font-medium text-muted-foreground">{t('healthMapDetail.costCompositionTitle')}</p>
            <div className="w-full min-w-0 max-w-full overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground font-medium py-1.5 w-[35%] min-w-0 max-w-[8rem]">{t('healthMapDetail.costProfile')}</TableHead>
                    <TableHead className="text-muted-foreground font-medium py-1.5 w-14 shrink-0">{t('healthMapDetail.costHours')}</TableHead>
                    <TableHead className="text-muted-foreground font-medium py-1.5 w-20 shrink-0">{t('healthMapDetail.costUnitValue')}</TableHead>
                    <TableHead className="text-muted-foreground font-medium py-1.5 w-20 shrink-0">{t('healthMapDetail.costTotal')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {termoEncerramento.custos.map((custo: TermoEncerramentoCusto) => {
                    const total = (custo.qtdeHora ?? 0) * (custo.valorHora ?? 0);
                    return (
                      <TableRow key={custo.id}>
                        <TableCell className="py-1.5 min-w-0 max-w-[8rem] truncate" title={custo.perfil?.nome}>{custo.perfil?.nome ?? '—'}</TableCell>
                        <TableCell className="py-1.5 whitespace-nowrap">{Number(custo.qtdeHora ?? 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="py-1.5 whitespace-nowrap text-xs">{formatCurrency(custo.valorHora)}</TableCell>
                        <TableCell className="py-1.5 whitespace-nowrap text-xs">{formatCurrency(total)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {node.level === 'demanda' && isDemandaStatusE && termoPlanejamento?.custos && termoPlanejamento.custos.length > 0 && (
          <div className="space-y-2 w-full min-w-0 max-w-full overflow-hidden">
            <p className="text-xs font-medium text-muted-foreground">{t('healthMapDetail.costCompositionTitlePlanning')}</p>
            <div className="w-full min-w-0 max-w-full overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground font-medium py-1.5 w-[35%] min-w-0 max-w-[8rem]">{t('healthMapDetail.costProfile')}</TableHead>
                    <TableHead className="text-muted-foreground font-medium py-1.5 w-14 shrink-0">{t('healthMapDetail.costHours')}</TableHead>
                    <TableHead className="text-muted-foreground font-medium py-1.5 w-20 shrink-0">{t('healthMapDetail.costUnitValue')}</TableHead>
                    <TableHead className="text-muted-foreground font-medium py-1.5 w-20 shrink-0">{t('healthMapDetail.costTotal')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {termoPlanejamento.custos.map((custo: TermoPlanejamentoCusto) => {
                    const total = (custo.qtdeHora ?? 0) * (custo.valorHora ?? 0);
                    return (
                      <TableRow key={custo.id}>
                        <TableCell className="py-1.5 min-w-0 max-w-[8rem] truncate" title={custo.perfil?.nome}>{custo.perfil?.nome ?? '—'}</TableCell>
                        <TableCell className="py-1.5 whitespace-nowrap">{Number(custo.qtdeHora ?? 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="py-1.5 whitespace-nowrap text-xs">{formatCurrency(custo.valorHora)}</TableCell>
                        <TableCell className="py-1.5 whitespace-nowrap text-xs">{formatCurrency(total)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {(node.level === 'meta' || node.level === 'produto') && (() => {
          const prev = rawDetail?.valorTotalPrevisto != null ? Number(rawDetail.valorTotalPrevisto) : 0;
          const exec = Math.max(0, rawDetail?.valorTotalExecutado != null ? Number(rawDetail.valorTotalExecutado) : 0);
          const restante = Math.max(0, prev - exec);
          const total = exec + restante;
          if (total <= 0 || (prev === 0 && exec === 0)) return null;
          const chartData = [
            ['', t('healthMapDetail.valueLabel')],
            [t('healthMapDetail.chartExecuted'), exec],
            [t('healthMapDetail.chartPlannedRemaining'), restante],
          ];

          const chartEvents: ReactGoogleChartEvent[] = [
            {
              eventName: 'ready',
              callback: (args) => {
                if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
          
                const chartWrapper =
                  args && typeof args === 'object' && 'chartWrapper' in args
                    ? (args as { chartWrapper: { getContainer?: () => HTMLElement } }).chartWrapper
                    : args;
          
                const container = (chartWrapper as { getContainer?: () => HTMLElement })?.getContainer?.();
                const wrapper = (container?.closest?.('.health-map-pie-chart-wrapper') ??
                  document.querySelector('.health-map-pie-chart-wrapper')) as HTMLElement | null;
          
                if (!wrapper) return;
          
                const repositionTooltip = () => {
                  const tooltip = document.querySelector('.google-visualization-tooltip') as HTMLElement | null;
                  if (!tooltip) return;
          
                  const rect = wrapper.getBoundingClientRect();
          
                  tooltip.style.setProperty('position', 'fixed', 'important');
                  tooltip.style.setProperty('left', `${rect.right + 12}px`, 'important');
                  tooltip.style.setProperty(
                    'top',
                    `${rect.top + rect.height / 2 - tooltip.offsetHeight / 2}px`,
                    'important'
                  );
                };
          
                const observer = new MutationObserver(() => {
                  requestAnimationFrame(repositionTooltip);
                });
          
                observer.observe(document.body, { childList: true, subtree: true });
              },
            },
          ];

          
          return (
            <div className="w-full min-w-0 max-w-full overflow-visible -mt-2" style={{ contain: 'layout' }}>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 health-map-pie-chart-wrapper relative overflow-visible flex items-center justify-center" style={{ width: 220, height: 220 }}>
                  <Chart
                    chartType="PieChart"
                    data={chartData}
                    chartEvents={chartEvents}
                    options={{
                      title: '',
                      pieSliceText: 'percentage',
                      pieSliceTextStyle: { fontSize: 12 },
                      legend: { position: 'none' },
                      colors: ['#22c55e', '#1e3a5f'],
                      chartArea: { width: '75%', height: '75%', left: '15%', top: '15%', right: '10%', bottom: '10%' },
                      backgroundColor: 'transparent',
                    }}
                    width={180}
                    height={180}
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-xs shrink-0 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full h-2.5 w-2.5 shrink-0 bg-[#22c55e]" aria-hidden />
                    <span className="break-words">{t('healthMapDetail.chartExecuted')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full h-2.5 w-2.5 shrink-0 bg-[#1e3a5f]" aria-hidden />
                    <span className="break-words">{t('healthMapDetail.chartPlannedRemaining')}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {(node.level !== 'meta' && node.level !== 'produto' && node.level !== 'demanda') && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('healthMapDetail.valueLabel')}</p>
            <p className="text-sm font-normal">{formatCurrency(node.valor ?? 0)}</p>
          </div>
        )}

        {node.desvioEsforcoHoras != null && node.desvioEsforcoHoras !== 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('healthMapDetail.hoursDeviation')}</p>
            <p className={cn(
              'text-sm font-normal',
              node.desvioEsforcoHoras > 0 ? 'text-destructive' : 'text-success'
            )}>
              {node.desvioEsforcoHoras > 0 ? '+' : ''}{node.desvioEsforcoHoras}h
            </p>
          </div>
        )}

        {(node.level !== 'meta' && node.level !== 'produto' && node.level !== 'demanda') && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('healthMapDetail.statusLabel')}</p>
            <Badge className={cn('w-fit', statusStyle[status])}>{status}</Badge>
          </div>
        )}

        {node.desvioPrazoDias != null && node.desvioPrazoDias !== 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('healthMapDetail.scheduleDeviation')}</p>
            <p className={cn(
              'text-sm font-normal',
              node.desvioPrazoDias > 0 ? 'text-destructive' : 'text-success'
            )}>
              {node.desvioPrazoDias > 0 ? '+' : ''}{node.desvioPrazoDias} dias
            </p>
          </div>
        )}

        {node.desvioFinanceiro != null && node.desvioFinanceiro !== 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('healthMapDetail.financialDeviation')}</p>
            <p className={cn(
              'text-sm font-normal',
              node.desvioFinanceiro > 0 ? 'text-destructive' : 'text-success'
            )}>
              {node.desvioFinanceiro > 0 ? '+' : ''}{formatCurrency(node.desvioFinanceiro)}
            </p>
          </div>
        )}

        {node.level !== 'demanda' && node.status && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('healthMapDetail.demandStatus')}</p>
            <p className="text-sm font-normal">{node.status}</p>
          </div>
        )}

        {node.perfisEnvolvidos && node.perfisEnvolvidos.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('healthMapDetail.profilesInvolved')}</p>
            <p className="text-sm font-normal">{node.perfisEnvolvidos.join(', ')}</p>
          </div>
        )}
      </CardContent>
    </Card>

    {viewDocState && (
      <PdfPreviewDialog
        open={true}
        onOpenChange={(open) => !open && setViewDocState(null)}
        title={getTermDocDialogTitle(viewDocState.type)}
        fetchPdf={() => fetchTermDocBlob(viewDocState.type, viewDocState.termoId)}
        loadingLabel={t('common.loading')}
        errorMessage={t('healthMapDetail.documentViewError')}
        closeLabel={t('common.close')}
        onError={() =>
          toast({
            title: t('common.error'),
            description: t('healthMapDetail.documentViewError'),
            variant: 'destructive',
          })
        }
      />
    )}

    {viewAvaliacaoPdfOpen && node?.level === 'demanda' && node?.id && (
      <PdfPreviewDialog
        open={true}
        onOpenChange={(open) => !open && setViewAvaliacaoPdfOpen(false)}
        title={t('healthMapDetail.docAvaliacao')}
        fetchPdf={() => avaliacaoDemandaDocService.download(Number(node.id))}
        loadingLabel={t('avaliacaoDemanda.pdfLoading')}
        errorMessage={t('avaliacaoDemanda.pdfNotAvailable')}
        closeLabel={t('common.close')}
        onError={() =>
          toast({
            title: t('common.error'),
            description: t('avaliacaoDemanda.pdfNotAvailable'),
            variant: 'destructive',
          })
        }
      />
    )}

    <DemandaTimelineModal
      demandaId={node?.level === 'demanda' && node?.id != null ? Number(node.id) : null}
      open={timelineOpen}
      onOpenChange={setTimelineOpen}
    />
  </>
  );
}
