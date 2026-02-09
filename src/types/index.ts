// =====================================================
// TYPES - Entidades da plataforma Julius
// Baseado no modelo de dados ORM especificado
// =====================================================

// Enum para status de usuário
export type UserStatus = 'A' | 'I'; // A = Ativo, I = Inativo

// Enum para perfil de usuário
export type UserProfile = 'A' | 'O' | 'V'; // A = Admin, O = Operador, V = Visualizador

// Enum para status da demanda técnica (políticas de segurança)
// A=Em elaboração, B=Em abertura, C=Aberta e assinada, D=Em planejamento,
// E=Planejado e assinado, F=Em encerramento, G=Encerrado e assinado, Z=Cancelada
export type DemandStatus = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'Z';

// =====================================================
// Entidade: Usuario
// =====================================================
export interface Usuario {
  id: number;
  nome: string;
  email?: string;
  username?: string;
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
  email?: string;
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
  dataEfetivaInicio?: string; // ISO date string - data efetiva de início
  dataUpdate: string; // ISO datetime string
  usuarioId: number;
  usuario?: Usuario; // Relacionamento opcional
}

export interface ProjetoCreateDTO {
  nome: string;
  codTed: string;
  termoInicial: string;
  termoFinal: string;
  dataEfetivaInicio?: string;
  usuarioId: number;
}

export interface ProjetoUpdateDTO {
  nome?: string;
  codTed?: string;
  termoInicial?: string;
  termoFinal?: string;
  dataEfetivaInicio?: string;
  usuarioId?: number;
}

// =====================================================
// Entidade: UsuarioProjeto (vínculo usuário x projeto)
// =====================================================
export interface UsuarioProjeto {
  id: number;
  usuarioId: number;
  projetoId: number;
  usuario?: Usuario;
  projeto?: Projeto;
}

// =====================================================
// Entidade: ProjetoDoc (documentos do projeto)
// =====================================================
export interface ProjetoDoc {
  id: number;
  projetoId: number;
  nome: string;
  nomeArquivo?: string;
  tipoConteudo?: string;
  tamanhoArquivo?: number;
  projeto?: Projeto;
}

// =====================================================
// Entidade: ProjetoMeta
// =====================================================
export interface ProjetoMeta {
  id: number;
  projetoId: number;
  codigo: string;
  nome: string;
  descricao?: string;
  status: 'A' | 'I'; // A = Ativo, I = Inativo
  dataUpdate: string;
  projeto?: Projeto;
}

export interface ProjetoMetaCreateDTO {
  projetoId: number;
  codigo: string;
  nome: string;
  descricao?: string;
  status: 'A' | 'I';
}

export interface ProjetoMetaUpdateDTO {
  codigo?: string;
  nome?: string;
  descricao?: string;
  status?: 'A' | 'I';
  projetoId?: number;
}

// =====================================================
// Entidade: MetaProduto
// =====================================================
export interface MetaProduto {
  id: number;
  projetoMetaId: number;
  codigo: string;
  nome: string;
  descricao?: string;
  unidadeMedida: string;
  quantidade: number;
  valorUnitario: number;
  inicio: number;
  fim: number;
  status: 'A' | 'I';
  projetoMeta?: ProjetoMeta;
}

export interface MetaProdutoCreateDTO {
  projetoMetaId: number;
  codigo: string;
  nome: string;
  descricao?: string;
  unidadeMedida: string;
  quantidade: number;
  valorUnitario: number;
  inicio: number;
  fim: number;
  status: 'A' | 'I';
}

export interface MetaProdutoUpdateDTO {
  codigo?: string;
  nome?: string;
  descricao?: string;
  unidadeMedida?: string;
  quantidade?: number;
  valorUnitario?: number;
  inicio?: number;
  fim?: number;
  status?: 'A' | 'I';
  projetoMetaId?: number;
}

// =====================================================
// Entidade: Perfil (Perfil de custo/hora)
// =====================================================
export interface Perfil {
  id: number;
  nome: string;
  termoInicial: string;
  termoFinal: string;
  dataUpdate: string;
  valor: number; // BigDecimal no backend (precision 18, scale 2)
  usuarioId: number;
  projetoId: number;
  usuario?: Usuario;
  projeto?: Projeto;
}

export interface PerfilCreateDTO {
  nome: string;
  termoInicial: string;
  termoFinal: string;
  valor: number; // BigDecimal no backend (precision 18, scale 2)
  usuarioId: number;
  projetoId: number;
}

export interface PerfilUpdateDTO {
  nome?: string;
  termoInicial?: string;
  termoFinal?: string;
  valor?: number; // BigDecimal no backend (precision 18, scale 2)
  usuarioId?: number;
  projetoId?: number;
}

// =====================================================
// Entidade: DemandaTecnica
// =====================================================
export interface DemandaTecnica {
  id: number;
  projetoId: number;
  metaProdutoId?: number | null;
  codigo: string;
  nome: string;
  dataAbertura: string;
  usuarioId: number;
  descricao?: string; // Campo opcional para teste com editor de texto rico (HTML)
  projeto?: Projeto;
  usuario?: Usuario;
  metaProduto?: MetaProduto | null;
  termoAbertura?: TermoAbertura;
  termoPlanejamento?: TermoPlanejamento;
  termoEncerramento?: TermoEncerramento;
  status?: DemandStatus; // Enviado pelo backend
  situacao?: string; // Alternativa: backend pode retornar "situacao" em vez de "status"
  /** Avaliação de qualidade (preenchida quando demanda encerrada); null = pendente */
  avaliacao?: Record<string, unknown> | null;
}

export interface DemandaTecnicaCreateDTO {
  projetoId: number;
  metaProdutoId?: number | null;
  codigo: string;
  nome: string;
  usuarioId: number;
  descricao?: string; // Campo opcional para teste com editor de texto rico (HTML)
}

export interface DemandaTecnicaUpdateDTO {
  projetoId?: number;
  metaProdutoId?: number | null;
  codigo?: string;
  nome?: string;
  descricao?: string; // Campo opcional para teste com editor de texto rico (HTML)
  status?: DemandStatus; // Atualização de status (políticas de segurança)
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
  dataAbertura: string; // ISO date string (YYYY-MM-DD)
  usuarioId: number;
}

export interface TermoAberturaUpdateDTO {
  descricao?: string;
  dataAbertura?: string; // ISO date string (YYYY-MM-DD)
}

// =====================================================
// Entidade: TemplateDemanda
// =====================================================
export interface TemplateDemanda {
  id: number;
  projetoId: number;
  tipo: 'A' | 'P' | 'E'; // A = Abertura, P = Planejamento, E = Encerramento
  nomeArquivo: string;
  tipoConteudo: string;
  tamanhoArquivo: number;
  projeto?: Projeto;
}

export interface TemplateDemandaResponseDTO {
  id: number;
  projetoId: number;
  tipo: 'A' | 'P' | 'E';
  nomeArquivo: string;
  tipoConteudo: string;
  tamanhoArquivo: number;
}

export interface TemplateDemandaCreateDTO {
  projetoId: number;
  tipo: 'A' | 'P' | 'E';
  arquivoDocx: File;
}

export interface TemplateDemandaUpdateDTO {
  tipo?: 'A' | 'P' | 'E';
  arquivoDocx?: File;
}

// =====================================================
// Entidade: TermoAberturaDoc
// =====================================================
export interface TermoAberturaDoc {
  id: number;
  termoAberturaId: number;
  dataAssinatura: string | null;
  nomeArquivo: string;
  tipoConteudo: string;
  tamanhoArquivo: number;
}

export interface TermoAberturaDocResponseDTO {
  id: number;
  termoAberturaId: number;
  dataAssinatura: string | null;
  nomeArquivo: string;
  tipoConteudo: string;
  tamanhoArquivo: number;
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
  dataInicioExecucao?: string | null; // ISO date string (YYYY-MM-DD)
  dataFimExecucao?: string | null; // ISO date string (YYYY-MM-DD)
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
  dataAbertura: string; // ISO date string (YYYY-MM-DD)
  dataInicioExecucao?: string; // ISO date string (YYYY-MM-DD)
  dataFimExecucao?: string; // ISO date string (YYYY-MM-DD)
  usuarioId: number;
  custos?: TermoPlanejamentoCustoCreateDTO[];
}

export interface TermoPlanejamentoUpdateDTO {
  especificacao?: string;
  cronograma?: string;
  resultadoEsperado?: string;
  dataAbertura?: string; // ISO date string (YYYY-MM-DD)
  dataInicioExecucao?: string; // ISO date string (YYYY-MM-DD)
  dataFimExecucao?: string; // ISO date string (YYYY-MM-DD)
  custos?: TermoPlanejamentoCustoCreateDTO[];
}

// =====================================================
// Entidade: TermoPlanejamentoDoc
// =====================================================
export interface TermoPlanejamentoDoc {
  id: number;
  termoPlanejamentoId: number;
  dataAssinatura: string | null;
  nomeArquivo: string;
  tipoConteudo: string;
  tamanhoArquivo: number;
}

export interface TermoPlanejamentoDocResponseDTO {
  id: number;
  termoPlanejamentoId: number;
  dataAssinatura: string | null;
  nomeArquivo: string;
  tipoConteudo: string;
  tamanhoArquivo: number;
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
  dataInicioExecucao?: string | null; // ISO date string (YYYY-MM-DD)
  dataFimExecucao?: string | null; // ISO date string (YYYY-MM-DD)
  usuarioId: number;
  dataAssinatura?: string | null;
  demandaTecnica?: DemandaTecnica;
  usuario?: Usuario;
  custos?: TermoEncerramentoCusto[];
}

export interface TermoEncerramentoCreateDTO {
  demandaTecnicaId: number;
  resultadoEntregue: string;
  dataTermo: string; // ISO date string (YYYY-MM-DD)
  dataInicioExecucao?: string; // ISO date string (YYYY-MM-DD)
  dataFimExecucao?: string; // ISO date string (YYYY-MM-DD)
  usuarioId: number;
  custos?: TermoEncerramentoCustoCreateDTO[];
}

export interface TermoEncerramentoUpdateDTO {
  resultadoEntregue?: string;
  dataTermo?: string; // ISO date string (YYYY-MM-DD)
  dataInicioExecucao?: string; // ISO date string (YYYY-MM-DD)
  dataFimExecucao?: string; // ISO date string (YYYY-MM-DD)
  custos?: TermoEncerramentoCustoCreateDTO[];
}

// =====================================================
// Entidade: TermoEncerramentoDoc
// =====================================================
export interface TermoEncerramentoDoc {
  id: number;
  termoEncerramentoId: number;
  dataAssinatura: string | null;
  nomeArquivo: string;
  tipoConteudo: string;
  tamanhoArquivo: number;
}

export interface TermoEncerramentoDocResponseDTO {
  id: number;
  termoEncerramentoId: number;
  dataAssinatura: string | null;
  nomeArquivo: string;
  tipoConteudo: string;
  tamanhoArquivo: number;
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
  name: string;
  value: number;
  color: string;
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
