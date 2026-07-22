/**
 * Schemas Zod para entidades de negócio (respostas da API).
 * Usados para validar dados recebidos além de auth/usuário.
 */

import { z } from 'zod';

// --- Enums e reutilizáveis ---
const userStatusSchema = z.enum(['A', 'I']);
const userProfileSchema = z.enum(['A', 'O', 'V']);
const demandStatusSchema = z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Z']);
const semaforoNivelSchema = z.enum(['PROJETO', 'META', 'PRODUTO', 'DEMANDA']);
const semaforoStatusSchema = z.enum(['VERDE', 'AMARELO', 'VERMELHO', 'CINZA']);

const usuarioRefSchema = z.object({
  id: z.number(),
  nome: z.string(),
  email: z.string().optional(),
  username: z.string().optional(),
  perfil: userProfileSchema,
  status: userStatusSchema,
}).partial({ email: true, username: true });

// --- Perfil ---
export const perfilSchema = z.object({
  id: z.number(),
  nome: z.string(),
  termoInicial: z.string(),
  termoFinal: z.string(),
  dataUpdate: z.string(),
  valor: z.number(),
  usuarioId: z.number(),
  projetoId: z.number(),
  usuario: usuarioRefSchema.optional(),
  projeto: z.unknown().optional(),
});

// --- Projeto (resposta lista/detalhe) ---
export const projetoSchema = z.object({
  id: z.number(),
  nome: z.string(),
  codTed: z.string(),
  termoInicial: z.string(),
  termoFinal: z.string(),
  dataEfetivaInicio: z.string().optional(),
  dataUpdate: z.string(),
  usuarioId: z.number(),
  usuario: usuarioRefSchema.optional(),
});

// --- Desembolso ---
export const desembolsoSchema = z.object({
  id: z.number(),
  documento: z.string().nullable().optional(),
  valorPrevisto: z.number(),
  valor: z.number(),
  dataDesembolso: z.string(),
  dataPrevistaDesembolso: z.string(),
  projetoId: z.number(),
  projeto: projetoSchema.optional(),
});

// --- DemandaTecnica (campos principais; relacionamentos como objeto genérico para evitar ciclo) ---
export const demandaTecnicaSchema = z.object({
  id: z.number(),
  projetoId: z.number(),
  metaProdutoId: z.number().nullable().optional(),
  codigo: z.string(),
  nome: z.string(),
  dataAbertura: z.string(),
  usuarioId: z.number(),
  descricao: z.string().optional(),
  status: demandStatusSchema.optional(),
  situacao: z.string().optional(),
  projeto: projetoSchema.optional(),
  usuario: usuarioRefSchema.optional(),
  metaProduto: z.unknown().optional().nullable(),
  termoAbertura: z.unknown().optional().nullable(),
  termoPlanejamento: z.unknown().optional().nullable(),
  termoEncerramento: z.unknown().optional().nullable(),
  avaliacao: z.record(z.unknown()).nullable().optional(),
  totalExecutadoProduto: z.number().nullable().optional(),
});

// --- TermoAbertura (sem demandaTecnica aninhada para evitar ciclo) ---
export const termoAberturaSchema = z.object({
  id: z.number(),
  demandaTecnicaId: z.number(),
  descricao: z.string(),
  dataAbertura: z.string(),
  usuarioId: z.number(),
  dataAssinatura: z.string().nullable().optional(),
  demandaTecnica: z.unknown().optional(),
  usuario: usuarioRefSchema.optional(),
});

// --- TermoPlanejamentoCusto ---
const termoPlanejamentoCustoSchema = z.object({
  id: z.number(),
  termoPlanejamentoId: z.number(),
  perfilId: z.number(),
  qtdeHora: z.number(),
  valorHora: z.number(),
  perfil: perfilSchema.optional(),
});

// --- TermoPlanejamento ---
export const termoPlanejamentoSchema = z.object({
  id: z.number(),
  demandaTecnicaId: z.number(),
  especificacao: z.string(),
  cronograma: z.string(),
  resultadoEsperado: z.string(),
  dataAbertura: z.string(),
  dataInicioExecucao: z.string().nullable().optional(),
  dataFimExecucao: z.string().nullable().optional(),
  usuarioId: z.number(),
  dataAssinatura: z.string().nullable().optional(),
  demandaTecnica: z.unknown().optional(),
  usuario: usuarioRefSchema.optional(),
  custos: z.array(termoPlanejamentoCustoSchema).optional(),
});

// --- TermoEncerramentoCusto ---
const termoEncerramentoCustoSchema = z.object({
  id: z.number(),
  termoEncerramentoId: z.number(),
  perfilId: z.number(),
  qtdeHora: z.number(),
  valorHora: z.number(),
  perfil: perfilSchema.optional(),
});

// --- TermoEncerramento ---
export const termoEncerramentoSchema = z.object({
  id: z.number(),
  demandaTecnicaId: z.number(),
  resultadoEntregue: z.string(),
  dataTermo: z.string(),
  dataInicioExecucao: z.string().nullable().optional(),
  dataFimExecucao: z.string().nullable().optional(),
  usuarioId: z.number(),
  dataAssinatura: z.string().nullable().optional(),
  demandaTecnica: z.unknown().optional(),
  usuario: usuarioRefSchema.optional(),
  custos: z.array(termoEncerramentoCustoSchema).optional(),
});

// --- Semáforo de Projeto (árvore PROJETO → META → PRODUTO → DEMANDA) ---
export const semaforoNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    id: z.number(),
    nivel: semaforoNivelSchema,
    codigo: z.string(),
    nome: z.string(),
    status: semaforoStatusSchema,
    dataInicio: z.string().nullable().optional(),
    dataFim: z.string().nullable().optional(),
    percentualExecutado: z.number().nullable().optional(),
    qtdDemandas: z.number().nullable().optional(),
    qtdDemandasEncerradas: z.number().nullable().optional(),
    valorTotalPrevisto: z.number().nullable().optional(),
    valorTotalExecutado: z.number().nullable().optional(),
    statusDemanda: z.string().nullable().optional(),
    status_demanda: z.string().nullable().optional(),
    situacao: z.string().nullable().optional(),
    children: z.array(semaforoNodeSchema),
  })
);

// --- Resumo de Produto por Meta (endpoint /meta-produtos/resumo?idMeta=...) ---
export const produtoResumoSchema = z.object({
  idMeta: z.number(),
  codigoMeta: z.string(),
  nomeMeta: z.string(),
  idProduto: z.number(),
  codigoProduto: z.string(),
  nomeProduto: z.string(),
  situacao: z.string().nullable().optional(),
  inicioPrevisaoExecucao: z.string().nullable().optional(),
  inicioRealExecucao: z.string().nullable().optional(),
  fimPrevisaoExecucao: z.string().nullable().optional(),
  mesesPrevistosExecucao: z.number().nullable().optional(),
  valorTotalOrcamento: z.number().nullable().optional(),
  valorTotalEmExecucao: z.number().nullable().optional(),
  valorTotalExecutado: z.number().nullable().optional(),
  percentualExecucao: z.number().nullable().optional(),
  percentualExecutado: z.number().nullable().optional(),
  valorMediaEntregaPrevistaMensal: z.number().nullable().optional(),
  valorMediaEntregaRealMensal: z.number().nullable().optional(),
});

// --- PaginatedResponse helper ---
export function paginatedSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    content: z.array(itemSchema),
    totalElements: z.number(),
    totalPages: z.number(),
    size: z.number(),
    number: z.number(),
    first: z.boolean(),
    last: z.boolean(),
  });
}

export const paginatedPerfilSchema = paginatedSchema(perfilSchema);

// --- Profissional ---
export const profissionalSchema = z.object({
  id: z.number(),
  nome: z.string(),
  tipoPessoa: z.enum(['F', 'J']),
  documento: z.string(),
  funcao: z.string().nullable().optional(),
  valorHora: z.number(),
  custoTotalMensal: z.number(),
  dataInicioAtividade: z.string(),
  projetoId: z.number(),
  perfilId: z.number(),
  projeto: z.unknown().optional(),
});

export const paginatedProfissionalSchema = paginatedSchema(profissionalSchema);
export const paginatedProjetoSchema = paginatedSchema(projetoSchema);
export const paginatedDemandaTecnicaSchema = paginatedSchema(demandaTecnicaSchema);
export const paginatedTermoAberturaSchema = paginatedSchema(termoAberturaSchema);
export const paginatedTermoPlanejamentoSchema = paginatedSchema(termoPlanejamentoSchema);
export const paginatedTermoEncerramentoSchema = paginatedSchema(termoEncerramentoSchema);
export const paginatedDesembolsoSchema = paginatedSchema(desembolsoSchema);

// --- Dia Não Útil ---
export const diaNaoUtilSchema = z.object({
  id: z.number(),
  data: z.string(),
  descricao: z.string(),
});

export const paginatedDiaNaoUtilSchema = paginatedSchema(diaNaoUtilSchema);

export const profissionalAnaliseResumidaItemSchema = z.object({
  profissional: z
    .object({
      id: z.number(),
      nome: z.string(),
    })
    .passthrough(),
  ano: z.number(),
  mes: z.number(),
  horasExecutadas: z.number(),
  valorPerfilMes: z.number(),
  valorCustoMes: z.number(),
});

export const profissionalAnaliseResumidaListSchema = z.array(profissionalAnaliseResumidaItemSchema);

export const profissionalDemandaTecnicaItemSchema = z.object({
  demandaTecnicaId: z.number(),
  demandaCodigo: z.string(),
  demandaNome: z.string(),
  demandaStatus: z.string(),
  totalHorasExecutadas: z.number(),
  totalHorasPlanejadas: z.number(),
  totalHorasUteisPeriodo: z.number(),
  totaisMensais: z
    .array(
      z.object({
        ano: z.number(),
        mes: z.number(),
        totalPlanejado: z.number(),
        totalExecutado: z.number(),
      }),
    )
    .optional()
    .default([]),
  dataInicioExecucao: z.string(),
  dataFimExecucao: z.string(),
});

export const profissionalDemandaTecnicaResumoMensalSchema = z.object({
  ano: z.number(),
  mes: z.number(),
  totalPlanejado: z.number(),
  totalExecutado: z.number(),
  valorCustoPerfil: z.number(),
  valorCustoMensal: z.number(),
});

export const profissionalDemandasTecnicasResponseSchema = z.object({
  demandasTecnicas: z.array(profissionalDemandaTecnicaItemSchema).default([]),
  resumoMensal: z.array(profissionalDemandaTecnicaResumoMensalSchema).default([]),
});
