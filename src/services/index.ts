// =====================================================
// Services Index
// Exporta todos os serviços para uso na aplicação
// =====================================================

export { default as api, setAuthToken, getAuthToken } from './api';
export { default as authService } from './authService';
export { default as usuarioService } from './usuarioService';
export { default as projetoService } from './projetoService';
export { default as perfilService } from './perfilService';
export { default as demandaService } from './demandaService';
export { 
  termoAberturaService, 
  termoPlanejamentoService, 
  termoEncerramentoService 
} from './termoService';
export { default as dashboardService } from './dashboardService';
