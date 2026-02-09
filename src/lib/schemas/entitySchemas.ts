/**
 * Schemas Zod para entidades de negócio (respostas da API).
 * Usados para validar dados recebidos além de auth/usuário.
 */

import { z } from 'zod';

// --- Enums e reutilizáveis ---
const userStatusSchema = z.enum(['A', 'I']);
const userProfileSchema = z.enum(['A', 'O', 'V']);
const demandStatusSchema = z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Z']);

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
export const paginatedProjetoSchema = paginatedSchema(projetoSchema);
export const paginatedDemandaTecnicaSchema = paginatedSchema(demandaTecnicaSchema);
export const paginatedTermoAberturaSchema = paginatedSchema(termoAberturaSchema);
export const paginatedTermoPlanejamentoSchema = paginatedSchema(termoPlanejamentoSchema);
export const paginatedTermoEncerramentoSchema = paginatedSchema(termoEncerramentoSchema);
