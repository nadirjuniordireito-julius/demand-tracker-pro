import { z } from 'zod';

// ==================== Usuario ====================
export const usuarioSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, { message: 'Nome é obrigatório' })
    .max(100, { message: 'Nome deve ter no máximo 100 caracteres' }),
  password: z
    .string()
    .min(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
    .max(50, { message: 'Senha deve ter no máximo 50 caracteres' })
    .optional()
    .or(z.literal('')),
  perfil: z.enum(['A', 'O', 'V'], { 
    required_error: 'Perfil é obrigatório' 
  }),
  status: z.enum(['A', 'I'], { 
    required_error: 'Status é obrigatório' 
  }),
});

export const usuarioCreateSchema = usuarioSchema.extend({
  password: z
    .string()
    .min(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
    .max(50, { message: 'Senha deve ter no máximo 50 caracteres' }),
});

export type UsuarioFormData = z.infer<typeof usuarioSchema>;
export type UsuarioCreateFormData = z.infer<typeof usuarioCreateSchema>;

// ==================== Projeto ====================
export const projetoSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, { message: 'Nome é obrigatório' })
    .max(150, { message: 'Nome deve ter no máximo 150 caracteres' }),
  codTed: z
    .string()
    .trim()
    .min(1, { message: 'Código TED é obrigatório' })
    .max(50, { message: 'Código TED deve ter no máximo 50 caracteres' }),
  termoInicial: z.date({ 
    required_error: 'Data inicial é obrigatória',
    invalid_type_error: 'Data inicial inválida',
  }),
  termoFinal: z.date({ 
    required_error: 'Data final é obrigatória',
    invalid_type_error: 'Data final inválida',
  }),
}).refine((data) => data.termoFinal >= data.termoInicial, {
  message: 'Data final deve ser maior ou igual à data inicial',
  path: ['termoFinal'],
});

export type ProjetoFormData = z.infer<typeof projetoSchema>;

// ==================== Perfil ====================
export const perfilSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, { message: 'Nome é obrigatório' })
    .max(150, { message: 'Nome deve ter no máximo 150 caracteres' }),
  termoInicial: z.date({ 
    required_error: 'Data inicial é obrigatória',
    invalid_type_error: 'Data inicial inválida',
  }),
  termoFinal: z.date({ 
    required_error: 'Data final é obrigatória',
    invalid_type_error: 'Data final inválida',
  }),
}).refine((data) => data.termoFinal >= data.termoInicial, {
  message: 'Data final deve ser maior ou igual à data inicial',
  path: ['termoFinal'],
});

export type PerfilFormData = z.infer<typeof perfilSchema>;

// ==================== Demanda ====================
export const demandaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, { message: 'Código é obrigatório' })
    .max(50, { message: 'Código deve ter no máximo 50 caracteres' }),
  nome: z
    .string()
    .trim()
    .min(1, { message: 'Nome é obrigatório' })
    .max(200, { message: 'Nome deve ter no máximo 200 caracteres' }),
  projetoId: z
    .string()
    .min(1, { message: 'Projeto é obrigatório' }),
});

export type DemandaFormData = z.infer<typeof demandaSchema>;

// ==================== Termo de Abertura ====================
export const termoAberturaSchema = z.object({
  demandaTecnicaId: z
    .string()
    .min(1, { message: 'Demanda é obrigatória' }),
  descricao: z
    .string()
    .trim()
    .min(10, { message: 'Descrição deve ter no mínimo 10 caracteres' })
    .max(2000, { message: 'Descrição deve ter no máximo 2000 caracteres' }),
});

export type TermoAberturaFormData = z.infer<typeof termoAberturaSchema>;

// ==================== Termo de Planejamento ====================
export const termoPlanejamentoCustoSchema = z.object({
  perfilId: z.string().min(1, { message: 'Perfil é obrigatório' }),
  qtdeHora: z
    .string()
    .min(1, { message: 'Quantidade de horas é obrigatória' })
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Quantidade de horas deve ser maior que zero',
    }),
  valorHora: z
    .string()
    .min(1, { message: 'Valor hora é obrigatório' })
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Valor hora deve ser maior que zero',
    }),
});

export const termoPlanejamentoSchema = z.object({
  demandaTecnicaId: z
    .string()
    .min(1, { message: 'Demanda é obrigatória' }),
  especificacao: z
    .string()
    .trim()
    .min(10, { message: 'Especificação deve ter no mínimo 10 caracteres' })
    .max(5000, { message: 'Especificação deve ter no máximo 5000 caracteres' }),
  cronograma: z
    .string()
    .trim()
    .min(10, { message: 'Cronograma deve ter no mínimo 10 caracteres' })
    .max(2000, { message: 'Cronograma deve ter no máximo 2000 caracteres' }),
  resultadoEsperado: z
    .string()
    .trim()
    .min(10, { message: 'Resultado esperado deve ter no mínimo 10 caracteres' })
    .max(2000, { message: 'Resultado esperado deve ter no máximo 2000 caracteres' }),
});

export type TermoPlanejamentoFormData = z.infer<typeof termoPlanejamentoSchema>;
export type TermoPlanejamentoCustoFormData = z.infer<typeof termoPlanejamentoCustoSchema>;

// ==================== Termo de Encerramento ====================
export const termoEncerramentoSchema = z.object({
  demandaTecnicaId: z
    .string()
    .min(1, { message: 'Demanda é obrigatória' }),
  resultadoEntregue: z
    .string()
    .trim()
    .min(10, { message: 'Resultado entregue deve ter no mínimo 10 caracteres' })
    .max(5000, { message: 'Resultado entregue deve ter no máximo 5000 caracteres' }),
});

export type TermoEncerramentoFormData = z.infer<typeof termoEncerramentoSchema>;
