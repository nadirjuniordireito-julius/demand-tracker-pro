// =====================================================
// Usuario Foto Service
// Serviços para upload/download/remoção de foto do usuário
// =====================================================

import api, { uploadFile, downloadBlob } from './api';

const ENDPOINTS = {
  base: '/usuario-foto',
  byUsuario: (usuarioId: number) => `/usuario-foto/usuario/${usuarioId}`,
  download: (usuarioId: number) => `/usuario-foto/usuario/${usuarioId}/download`,
  exists: (usuarioId: number) => `/usuario-foto/usuario/${usuarioId}/exists`,
};

export const usuarioFotoService = {
  /**
   * Faz upload de uma foto para um usuário
   * O backend pode esperar apenas o arquivo no FormData com o nome 'foto'
   */
  async upload(usuarioId: number, file: File): Promise<void> {
    const formData = new FormData();
    // Adiciona o arquivo com o nome 'foto' (nome esperado pelo backend baseado na entidade)
    formData.append('foto', file);
    // Adiciona usuarioId caso o backend espere no FormData
    formData.append('usuarioId', String(usuarioId));
    
    await uploadFile<void>(ENDPOINTS.base, formData, 'POST');
  },

  /**
   * Atualiza a foto de um usuário
   */
  async update(usuarioId: number, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('foto', file);
    
    await uploadFile<void>(ENDPOINTS.byUsuario(usuarioId), formData, 'PUT');
  },

  /**
   * Faz download da foto de um usuário
   */
  async download(usuarioId: number): Promise<Blob> {
    return downloadBlob(ENDPOINTS.download(usuarioId));
  },


  /**
   * Remove a foto de um usuário
   */
  async delete(usuarioId: number): Promise<void> {
    return api.delete(ENDPOINTS.byUsuario(usuarioId));
  },
};

export default usuarioFotoService;
