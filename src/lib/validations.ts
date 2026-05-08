import { z } from 'zod';

/**
 * Maior valor monetário aceito (DECIMAL(18,2) no backend).
 * Em IEEE-754 isto é exatamente representável (1e16),
 * evitando o lint `no-loss-of-precision`.
 */
const MAX_DECIMAL_18_2 = 1e16;

// ==================== Usuario ====================
export const usuarioSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, { message: 'validation.nameRequired' })
    .max(100, { message: 'validation.nameMax100' }),
  email: z
    .string()
    .trim()
    .email({ message: 'validation.emailInvalid' })
    .max(255, { message: 'validation.emailMax255' })
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(6, { message: 'validation.passwordMin6' })
    .max(50, { message: 'validation.passwordMax50' })
    .optional()
    .or(z.literal('')),
  perfil: z.enum(['A', 'O', 'V'], { 
    required_error: 'validation.profileRequired' 
  }),
  status: z.enum(['A', 'I'], { 
    required_error: 'validation.statusRequired' 
  }),
});

export const usuarioCreateSchema = usuarioSchema.extend({
  password: z
    .string()
    .min(6, { message: 'validation.passwordMin6' })
    .max(50, { message: 'validation.passwordMax50' }),
});

export type UsuarioFormData = z.infer<typeof usuarioSchema>;
export type UsuarioCreateFormData = z.infer<typeof usuarioCreateSchema>;

// ==================== Projeto ====================
export const projetoSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, { message: 'validation.nameRequired' })
    .max(150, { message: 'validation.nameMax150' }),
  codTed: z
    .string()
    .trim()
    .min(1, { message: 'validation.codTedRequired' })
    .max(50, { message: 'validation.codTedMax50' }),
  termoInicial: z.date({
    required_error: 'validation.dateInitialRequired',
    invalid_type_error: 'validation.dateInitialInvalid',
  }),
  termoFinal: z.date({
    required_error: 'validation.dateFinalRequired',
    invalid_type_error: 'validation.dateFinalInvalid',
  }),
  dataEfetivaInicio: z.date().optional().nullable(),
}).refine((data) => data.termoFinal >= data.termoInicial, {
  message: 'validation.dateFinalGteInitial',
  path: ['termoFinal'],
});

export type ProjetoFormData = z.infer<typeof projetoSchema>;

// ==================== ProjetoMeta ====================
export const projetoMetaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, { message: 'validation.codeRequired' })
    .max(50, { message: 'validation.codeMax50' }),
  nome: z
    .string()
    .trim()
    .min(1, { message: 'validation.nameRequired' })
    .max(150, { message: 'validation.nameMax150' }),
  descricao: z
    .string()
    .optional()
    .or(z.literal('')),
  status: z
    .enum(['A', 'I'], {
      required_error: 'validation.statusRequired',
      invalid_type_error: 'validation.statusInvalid',
    }),
});

export type ProjetoMetaFormData = z.infer<typeof projetoMetaSchema>;

// ==================== MetaProduto ====================
export const metaProdutoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, { message: 'validation.codeRequired' })
    .max(10, { message: 'validation.codeMax10' }),
  nome: z
    .string()
    .trim()
    .min(1, { message: 'validation.nameRequired' })
    .max(500, { message: 'validation.nameMax500' }),
  descricao: z
    .string()
    .optional()
    .or(z.literal('')),
  unidadeMedida: z
    .string()
    .trim()
    .min(1, { message: 'validation.unitMeasureRequired' })
    .max(100, { message: 'validation.unitMeasureMax100' }),
  quantidade: z
    .number({
      required_error: 'validation.quantityRequired',
      invalid_type_error: 'validation.quantityNumber',
    })
    .int({ message: 'validation.quantityInteger' })
    .positive({ message: 'validation.quantityPositive' }),
  valorUnitario: z
    .number({
      required_error: 'validation.unitValueRequired',
      invalid_type_error: 'validation.unitValueNumber',
    })
    .positive({ message: 'validation.unitValuePositive' })
    .max(MAX_DECIMAL_18_2, { message: 'validation.unitValueTooLarge' }),
  inicio: z
    .number({
      required_error: 'validation.startRequired',
      invalid_type_error: 'validation.startNumber',
    })
    .int({ message: 'validation.startInteger' })
    .min(0, { message: 'validation.startMinZero' }),
  fim: z
    .number({
      required_error: 'validation.endRequired',
      invalid_type_error: 'validation.endNumber',
    })
    .int({ message: 'validation.endInteger' })
    .min(0, { message: 'validation.endMinZero' }),
  status: z
    .enum(['A', 'I'], {
      required_error: 'validation.statusRequired',
      invalid_type_error: 'validation.statusInvalid',
    }),
}).refine((data) => data.fim >= data.inicio, {
  message: 'validation.endGteStart',
  path: ['fim'],
});

export type MetaProdutoFormData = z.infer<typeof metaProdutoSchema>;

// ==================== Perfil ====================
export const perfilSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, { message: 'validation.nameRequired' })
    .max(150, { message: 'validation.nameMax150' }),
  termoInicial: z.date({ 
    required_error: 'validation.dateInitialRequired',
    invalid_type_error: 'validation.dateInitialInvalid',
  }),
  termoFinal: z.date({ 
    required_error: 'validation.dateFinalRequired',
    invalid_type_error: 'validation.dateFinalInvalid',
  }),
  valor: z
    .number({
      required_error: 'validation.valueRequired',
      invalid_type_error: 'validation.valueNumber',
    })
    .positive({ message: 'validation.valuePositive' })
    .max(MAX_DECIMAL_18_2, { message: 'validation.valueTooLarge' }), // Limite baseado em precision 18, scale 2
}).refine((data) => data.termoFinal >= data.termoInicial, {
  message: 'validation.dateFinalGteInitial',
  path: ['termoFinal'],
});

export type PerfilFormData = z.infer<typeof perfilSchema>;

// ==================== Profissional ====================
export const profissionalSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, { message: 'validation.nameRequired' })
    .max(500, { message: 'validation.nameMax500' }),
  tipoPessoa: z.enum(['F', 'J'], { required_error: 'validation.tipoPessoaRequired' }),
  documento: z
    .string()
    .trim()
    .min(1, { message: 'validation.documentRequired' })
    .max(100, { message: 'validation.documentMax100' }),
  funcao: z
    .string()
    .trim()
    .max(255, { message: 'validation.funcaoMax255' })
    .optional()
    .or(z.literal('')),
  valorHora: z
    .number({
      required_error: 'validation.valueRequired',
      invalid_type_error: 'validation.valueNumber',
    })
    .positive({ message: 'validation.valuePositive' }),
  custoTotalMensal: z
    .number({
      required_error: 'validation.custoTotalMensalRequired',
      invalid_type_error: 'validation.custoTotalMensalNumber',
    })
    .positive({ message: 'validation.custoTotalMensalPositive' }),
  dataInicioAtividade: z.date({
    required_error: 'validation.dateRequired',
    invalid_type_error: 'validation.dateInvalid',
  }),
  projetoId: z.number({ required_error: 'validation.projectRequired' }).positive(),
  perfilId: z
    .number({
      required_error: 'validation.profileRequired',
      invalid_type_error: 'validation.valueNumber',
    })
    .positive({ message: 'validation.profileRequired' }),
});

export type ProfissionalFormData = z.infer<typeof profissionalSchema>;

// ==================== Desembolso ====================
export const desembolsoSchema = z.object({
  documento: z
    .string()
    .trim()
    .max(500, { message: 'validation.documentMax500' })
    .optional()
    .or(z.literal('')),
  valorPrevisto: z
    .number({
      required_error: 'validation.valueRequired',
      invalid_type_error: 'validation.valueNumber',
    })
    .max(MAX_DECIMAL_18_2, { message: 'validation.valueTooLarge' }),
  valor: z
    .number({
      required_error: 'validation.valueRequired',
      invalid_type_error: 'validation.valueNumber',
    })
    .max(MAX_DECIMAL_18_2, { message: 'validation.valueTooLarge' }),
  dataDesembolso: z.date({
    required_error: 'validation.dateRequired',
    invalid_type_error: 'validation.dateInvalid',
  }),
  dataPrevistaDesembolso: z.date({
    required_error: 'validation.dateRequired',
    invalid_type_error: 'validation.dateInvalid',
  }),
});

export type DesembolsoFormData = z.infer<typeof desembolsoSchema>;

// ==================== Demanda ====================
// codigo é opcional na inclusão: o backend calcula automaticamente (sem min(1))
export const demandaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .max(50, { message: 'validation.codeMax50' }),
  nome: z
    .string()
    .trim()
    .min(1, { message: 'validation.nameRequired' })
    .max(200, { message: 'validation.nameMax200' }),
  projetoId: z
    .string()
    .min(1, { message: 'validation.projectRequired' }),
  descricao: z
    .string()
    .optional(), // Campo opcional para teste com editor de texto rico
  metaProdutoId: z
    .string()
    .optional()
    .or(z.literal('')), // Produto vinculado à meta do projeto (opcional)
});

export type DemandaFormData = z.infer<typeof demandaSchema>;

// =====================================================
// Template Demanda Schema
// =====================================================
// Nota: arquivoDocx é opcional no schema (será validado no componente)
// Na criação é obrigatório, na edição é opcional
export const templateDemandaSchema = z.object({
  projetoId: z
    .string()
    .min(1, { message: 'validation.projectRequired' }),
  tipo: z
    .enum(['A', 'P', 'E'], {
      required_error: 'validation.typeRequired',
      invalid_type_error: 'validation.typeInvalid',
    }),
  arquivoDocx: z
    .instanceof(File, { message: 'validation.fileDocxRequired' })
    .refine((file) => {
      if (!file) return false;
      return file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }, {
      message: 'validation.fileMustBeDocx',
    })
    .optional()
    .or(z.undefined()),
});

export type TemplateDemandaFormData = z.infer<typeof templateDemandaSchema>;

// ==================== Termo de Abertura ====================
export const termoAberturaSchema = z.object({
  demandaTecnicaId: z
    .string()
    .min(1, { message: 'validation.demandRequired' }),
  dataAbertura: z.date({
    required_error: 'validation.openingDateRequired',
    invalid_type_error: 'validation.openingDateInvalid',
  }),
  descricao: z
    .string()
    .trim()
    .min(10, { message: 'validation.descriptionMin10' })
    .max(2000, { message: 'validation.descriptionMax2000' }),
});

export type TermoAberturaFormData = z.infer<typeof termoAberturaSchema>;

// ==================== Termo de Planejamento ====================
export const termoPlanejamentoCustoSchema = z.object({
  perfilId: z.string().min(1, { message: 'validation.profileRequired' }),
  qtdeHora: z
    .string()
    .min(1, { message: 'validation.hoursRequired' })
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'validation.hoursPositive',
    }),
  valorHora: z
    .string()
    .min(1, { message: 'validation.hourValueRequired' })
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'validation.hourValuePositive',
    }),
});

export const termoPlanejamentoSchema = z.object({
  demandaTecnicaId: z
    .string()
    .min(1, { message: 'validation.demandRequired' }),
  dataAbertura: z.date({
    required_error: 'validation.openingDateRequired',
    invalid_type_error: 'validation.openingDateInvalid',
  }),
  especificacao: z
    .string()
    .trim()
    .min(10, { message: 'validation.specMin10' })
    .max(5000, { message: 'validation.specMax5000' }),
  cronograma: z
    .string()
    .trim()
    .min(10, { message: 'validation.scheduleMin10' })
    .max(2000, { message: 'validation.scheduleMax2000' }),
  dataInicioExecucao: z.date().optional().nullable(),
  dataFimExecucao: z.date().optional().nullable(),
  resultadoEsperado: z
    .string()
    .trim()
    .min(10, { message: 'validation.expectedResultMin10' })
    .max(2000, { message: 'validation.expectedResultMax2000' }),
});

export type TermoPlanejamentoFormData = z.infer<typeof termoPlanejamentoSchema>;
export type TermoPlanejamentoCustoFormData = z.infer<typeof termoPlanejamentoCustoSchema>;

// ==================== Termo de Encerramento ====================
export const termoEncerramentoSchema = z.object({
  demandaTecnicaId: z
    .string()
    .min(1, { message: 'validation.demandRequired' }),
  dataTermo: z.date({
    required_error: 'validation.termDateRequired',
    invalid_type_error: 'validation.termDateInvalid',
  }),
  dataInicioExecucao: z.date().optional().nullable(),
  dataFimExecucao: z.date().optional().nullable(),
  resultadoEntregue: z
    .string()
    .trim()
    .min(10, { message: 'validation.deliveredResultMin10' })
    .max(5000, { message: 'validation.deliveredResultMax5000' }),
});

export type TermoEncerramentoFormData = z.infer<typeof termoEncerramentoSchema>;
