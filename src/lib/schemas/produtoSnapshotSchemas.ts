/**
 * Schemas Zod — Produto snapshot mensal + ações + relatório gestor.
 */
import { z } from 'zod';

export const statusProdutoMesSchema = z.enum(['V', 'A', 'R']);
export const tipoAcaoProdutoSchema = z.enum(['PREVENTIVA', 'CORRETIVA', 'CONTINGENCIA']);
export const impactoAcaoSchema = z.enum(['B', 'M', 'A']);
export const statusAcaoProdutoSchema = z.enum(['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA']);

/** Aceita número, null ou ausência (API Spring / JSON variável). */
const numNullish = z.number().nullish();

export const produtoSnapshotMensalSchema = z
  .object({
    id: z.number(),
    metaProdutoId: z.number(),
    metaProduto: z.unknown().optional().nullable(),
    ano: z.number(),
    mes: z.number(),
    statusProdutoMes: statusProdutoMesSchema,
    situacao: z.string().nullable().optional(),
    valorTotalOrcamento: numNullish,
    valorTotalEmExecucao: numNullish,
    valorTotalExecutado: numNullish,
    percentualExecucao: numNullish,
    valorMediaEntregaPrevistaMensal: numNullish,
    valorMediaEntregaRealMensal: numNullish,
    resumoAnalitico: z.string().nullable().optional(),
    fechado: z.boolean(),
    dataFechamento: z.string().nullable().optional(),
    usuarioFechamentoId: z.number().nullable().optional(),
    usuarioFechamentoNome: z.string().nullable().optional(),
    dataRegistro: z.string(),
    dataUpdate: z.string(),
  })
  .passthrough();

export const produtoSnapshotAcaoSchema = z
  .object({
    id: z.number(),
    snapshotId: z.number(),
    tipoAcao: tipoAcaoProdutoSchema,
    descricao: z.string(),
    responsavelId: z.number().nullable().optional(),
    responsavelNome: z.string().nullable().optional(),
    prazo: z.string(),
    impacto: impactoAcaoSchema,
    statusAcao: statusAcaoProdutoSchema,
    dataStatus: z.string(),
    observacaoStatus: z.string().nullable().optional(),
    dataCriacao: z.string(),
    dataUpdate: z.string(),
  })
  .passthrough();

export const paginatedProdutoSnapshotMensalSchema = z.object({
  content: z.array(produtoSnapshotMensalSchema),
  totalElements: z.number(),
  totalPages: z.number(),
  size: z.number(),
  number: z.number(),
  first: z.boolean().optional(),
  last: z.boolean().optional(),
});

const relatorioItemSchema = z
  .object({
    snapshotId: z.number(),
    metaProdutoId: z.number(),
    codigoProduto: z.string(),
    nomeProduto: z.string(),
    projetoMetaId: z.number(),
    codigoMeta: z.string(),
    nomeMeta: z.string(),
    projetoId: z.number(),
    nomeProjeto: z.string(),
    ano: z.number(),
    mes: z.number(),
    statusProdutoMes: statusProdutoMesSchema,
    fechado: z.boolean(),
    percentualExecucao: numNullish,
    valorTotalOrcamento: numNullish,
    valorTotalEmExecucao: numNullish,
    valorTotalExecutado: numNullish,
    totalAcoes: z.number(),
    acoesAbertas: z.number(),
    acoesEmAndamento: z.number(),
    acoesConcluidas: z.number(),
    acoesCanceladas: z.number(),
    acoesVencidas: z.number(),
    acoesImpactoAlto: z.number(),
  })
  .passthrough();

const relatorioResumoSchema = z
  .object({
    totalProdutos: z.number(),
    produtosVerde: z.number(),
    produtosAmarelo: z.number(),
    produtosVermelho: z.number(),
    snapshotsFechados: z.number(),
    snapshotsAbertos: z.number(),
    totalAcoes: z.number(),
    acoesAbertas: z.number(),
    acoesEmAndamento: z.number(),
    acoesConcluidas: z.number(),
    acoesCanceladas: z.number(),
    acoesVencidas: z.number(),
    acoesImpactoAlto: z.number(),
    somaValorTotalExecutado: z.number(),
    somaValorTotalOrcamento: z.number(),
    percentualExecucaoConsolidado: z.number(),
  })
  .passthrough();

export const produtoSnapshotRelatorioGestorSchema = z
  .object({
    ano: z.number(),
    mes: z.number(),
    projetoId: z.number().nullable().optional(),
    resumo: relatorioResumoSchema,
    produtos: z.array(relatorioItemSchema),
    acoesVencidas: z.array(produtoSnapshotAcaoSchema),
    produtosCriticos: z.array(relatorioItemSchema),
  })
  .passthrough();

export type ProdutoSnapshotMensalFromSchema = z.infer<typeof produtoSnapshotMensalSchema>;
export type ProdutoSnapshotAcaoFromSchema = z.infer<typeof produtoSnapshotAcaoSchema>;
export type ProdutoSnapshotRelatorioGestorFromSchema = z.infer<typeof produtoSnapshotRelatorioGestorSchema>;
