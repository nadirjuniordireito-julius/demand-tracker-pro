/**
 * Validação (Zod) do formulário de Avaliação de Qualidade da Demanda
 * Quando atraso = false, impactoAtraso e desvioPrazoPercentual devem ser 0.
 * Quando atraso = true, impactoAtraso é obrigatório (1-5) e desvioPrazoPercentual (0-100).
 */

import { z } from 'zod';

const escala1a5 = z.number().min(1, 'validation.avaliacao.min1').max(5, 'validation.avaliacao.max5');
/** 0 quando atraso=false; 1-5 quando atraso=true (validado via refine) */
const impactoAtrasoField = z.number().min(0).max(5);
const desvioPrazoField = z.number().min(0).max(100);

const TIPO_RISCO = [
  'FALHA_REQUISITOS',
  'MUDANCA_ESCOPO',
  'COMUNICACAO',
  'TERCEIROS',
  'FALTA_RECURSOS',
  'FALTA_COMPETENCIA',
  'INFRAESTRUTURA',
  'GOVERNANCA',
  'OUTROS',
] as const;

export const avaliacaoDemandaSchema = z
  .object({
    atraso: z.boolean(),
    impactoAtraso: impactoAtrasoField,
    desvioPrazoPercentual: desvioPrazoField,
  desvioCustoPercentual: z.number().min(0).max(100),
  impactoFinanceiro: escala1a5,
  atendimentoRequisitos: escala1a5,
  estabilidade: escala1a5,
  retrabalho: escala1a5,
  satisfacaoUsuario: escala1a5,
  clarezaRequisitos: escala1a5,
  qualidadePlanejamento: escala1a5,
  aderenciaCronograma: escala1a5,
  comunicacao: escala1a5,
  capacidadeEquipe: escala1a5,
  disponibilidadeEquipe: escala1a5,
  possuiBackupCritico: z.boolean(),
  rotatividadeImpactou: z.boolean(),
  valorPercebido: escala1a5,
  alinhamentoMeta: escala1a5,
  reutilizacao: z.enum(['BAIXA', 'MEDIA', 'ALTA']),
  avaliacaoGeral: escala1a5,
  repetiriaModelo: z.boolean(),
  riscos: z.array(z.enum(TIPO_RISCO)),
  textos: z.object({
    causaAtraso: z.string(),
    causaCusto: z.string(),
    gargalo: z.string(),
    impactoEquipe: z.string(),
    correcoes: z.string(),
    licoesPositivas: z.string(),
    licoesNegativas: z.string(),
    melhorias: z.string(),
  }),
})
  .refine(
    (data) => !data.atraso || (data.impactoAtraso >= 1 && data.impactoAtraso <= 5),
    { message: 'validation.avaliacao.min1', path: ['impactoAtraso'] }
  )
  .refine(
    (data) => data.atraso || (data.impactoAtraso === 0 && data.desvioPrazoPercentual === 0),
    { message: 'validation.avaliacao.zeroWhenNoDelay', path: ['impactoAtraso'] }
  );

export type AvaliacaoDemandaFormData = z.infer<typeof avaliacaoDemandaSchema>;
