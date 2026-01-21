// =====================================================
// TYPES - Entidades do Sistema de Demandas Técnicas
// Baseado no modelo de dados ORM especificado
// =====================================================

// Enum para status de usuário
export type UserStatus = 'A' | 'I'; // A = Ativo, I = Inativo

// Enum para perfil de usuário
export type UserProfile = 'A' | 'O' | 'V'; // A = Admin, O = Operador, V = Visualizador

// Enum para status da demanda
export type DemandStatus = 'opened' | 'inPlanning' | 'inExecution' | 'closed';

// =====================================================
// Entidade: Usuario
// =====================================================
export interface Usuario {
  id: number;
  nome: string;
  email?: string;
  password?: string; // Opcional no retorno da API
  perfil: UserProfile;
  status: UserStatus;
}

export interface UsuarioCreateDTO {
  nome: string;
  password: string;
  perfil: UserProfile;
  status: UserStatus;
}

export interface UsuarioUpdateDTO {
  nome?: string;
  password?: string;
  perfil?: UserProfile;
  status?: UserStatus;
}

// =====================================================
// Entidade: Projeto
// =====================================================
export interface Projeto {
  id: number;
  nome: string;
  codTed: string;
  termoInicial: string; // ISO date string
  termoFinal: string; // ISO date string
  dataUpdate: string; // ISO datetime string
  usuarioId: number;
  usuario?: Usuario; // Relacionamento opcional
}

export interface ProjetoCreateDTO {
  nome: string;
  codTed: string;
  termoInicial: string;
  termoFinal: string;
  usuarioId: number;
}

export interface ProjetoUpdateDTO {
  nome?: string;
  codTed?: string;
  termoInicial?: string;
  termoFinal?: string;
  usuarioId?: number;
}

// =====================================================
// Entidade: Perfil (Perfil de custo/hora)
// =====================================================
export interface Perfil {
  id: number;
  nome: string;
  codTed: string;
  termoInicial: string;
  termoFinal: string;
  dataUpdate: string;
  usuarioId: number;
  usuario?: Usuario;
}

export interface PerfilCreateDTO {
  nome: string;
  codTed: string;
  termoInicial: string;
  termoFinal: string;
  usuarioId: number;
}

export interface PerfilUpdateDTO {
  nome?: string;
  codTed?: string;
  termoInicial?: string;
  termoFinal?: string;
  usuarioId?: number;
}

// =====================================================
// Entidade: DemandaTecnica
// =====================================================
export interface DemandaTecnica {
  id: number;
  projetoId: number;
  codigo: string;
  nome: string;
  dataAbertura: string;
  usuarioId: number;
  projeto?: Projeto;
  usuario?: Usuario;
  termoAbertura?: TermoAbertura;
  termoPlanejamento?: TermoPlanejamento;
  termoEncerramento?: TermoEncerramento;
  status?: DemandStatus; // Calculado no frontend
}

export interface DemandaTecnicaCreateDTO {
  projetoId: number;
  codigo: string;
  nome: string;
  usuarioId: number;
}

export interface DemandaTecnicaUpdateDTO {
  projetoId?: number;
  codigo?: string;
  nome?: string;
}

// =====================================================
// Entidade: TermoAbertura
// =====================================================
export interface TermoAbertura {
  id: number;
  demandaTecnicaId: number;
  descricao: string;
  dataAbertura: string;
  usuarioId: number;
  dataAssinatura?: string | null;
  demandaTecnica?: DemandaTecnica;
  usuario?: Usuario;
}

export interface TermoAberturaCreateDTO {
  demandaTecnicaId: number;
  descricao: string;
  usuarioId: number;
}

export interface TermoAberturaUpdateDTO {
  descricao?: string;
}

// =====================================================
// Entidade: TermoPlanejamento
// =====================================================
export interface TermoPlanejamento {
  id: number;
  demandaTecnicaId: number;
  especificacao: string;
  cronograma: string;
  resultadoEsperado: string;
  dataAbertura: string;
  usuarioId: number;
  dataAssinatura?: string | null;
  demandaTecnica?: DemandaTecnica;
  usuario?: Usuario;
  custos?: TermoPlanejamentoCusto[];
}

export interface TermoPlanejamentoCreateDTO {
  demandaTecnicaId: number;
  especificacao: string;
  cronograma: string;
  resultadoEsperado: string;
  usuarioId: number;
  custos?: TermoPlanejamentoCustoCreateDTO[];
}

export interface TermoPlanejamentoUpdateDTO {
  especificacao?: string;
  cronograma?: string;
  resultadoEsperado?: string;
  custos?: TermoPlanejamentoCustoCreateDTO[];
}

// =====================================================
// Entidade: TermoPlanejamentoCusto
// =====================================================
export interface TermoPlanejamentoCusto {
  id: number;
  termoPlanejamentoId: number;
  perfilId: number;
  qtdeHora: number;
  valorHora: number;
  perfil?: Perfil;
}

export interface TermoPlanejamentoCustoCreateDTO {
  perfilId: number;
  qtdeHora: number;
  valorHora: number;
}

// =====================================================
// Entidade: TermoEncerramento
// =====================================================
export interface TermoEncerramento {
  id: number;
  demandaTecnicaId: number;
  resultadoEntregue: string;
  dataTermo: string;
  usuarioId: number;
  dataAssinatura?: string | null;
  demandaTecnica?: DemandaTecnica;
  usuario?: Usuario;
  custos?: TermoEncerramentoCusto[];
}

export interface TermoEncerramentoCreateDTO {
  demandaTecnicaId: number;
  resultadoEntregue: string;
  usuarioId: number;
  custos?: TermoEncerramentoCustoCreateDTO[];
}

export interface TermoEncerramentoUpdateDTO {
  resultadoEntregue?: string;
  custos?: TermoEncerramentoCustoCreateDTO[];
}

// =====================================================
// Entidade: TermoEncerramentoCusto
// =====================================================
export interface TermoEncerramentoCusto {
  id: number;
  termoEncerramentoId: number;
  perfilId: number;
  qtdeHora: number;
  valorHora: number;
  perfil?: Perfil;
}

export interface TermoEncerramentoCustoCreateDTO {
  perfilId: number;
  qtdeHora: number;
  valorHora: number;
}

// =====================================================
// Tipos auxiliares para API
// =====================================================
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // página atual (0-indexed)
  first: boolean;
  last: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  timestamp: string;
  errors?: Record<string, string>;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
  expiresIn: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// =====================================================
// Tipos para Dashboard
// =====================================================
export interface DashboardStats {
  totalDemandas: number;
  demandasAbertas: number;
  demandasEncerradas: number;
  custosPlanejados: number;
  custosRealizados: number;
}

export interface DemandaPorProjeto {
  projetoNome: string;
  quantidade: number;
}

export interface DemandaPorStatus {
  status: DemandStatus;
  quantidade: number;
}

// =====================================================
// Tipos para Mensagens/Notificações
// =====================================================
export interface Mensagem {
  id: number;
  titulo: string;
  conteudo: string;
  lida: boolean;
  dataCriacao: string;
  usuarioId: number;
}
