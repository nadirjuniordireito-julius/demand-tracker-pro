// =====================================================
// Services Index
// Exporta todos os serviços para uso na aplicação
// =====================================================

export { default as api, setAuthToken, getAuthToken } from './api';
export { default as authService } from './authService';
export { default as usuarioService } from './usuarioService';
export { default as usuarioFotoService } from './usuarioFotoService';
export { default as usuarioProjetoService } from './usuarioProjetoService';
export { default as projetoService } from './projetoService';
export { default as projetoDocService } from './projetoDocService';
export { default as projetoMetaService } from './projetoMetaService';
export { default as metaProdutoService } from './metaProdutoService';
export { default as perfilService } from './perfilService';
export { default as demandaService } from './demandaService';
export { 
  termoAberturaService, 
  termoPlanejamentoService, 
  termoEncerramentoService 
} from './termoService';
export { default as dashboardService } from './dashboardService';
