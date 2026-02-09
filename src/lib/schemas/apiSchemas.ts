/**
 * Schemas Zod para validação de respostas da API.
 * Garante que os dados recebidos do backend respeitam o contrato esperado.
 */

import { z } from 'zod';

const userStatusSchema = z.enum(['A', 'I']);
const userProfileSchema = z.enum(['A', 'O', 'V']);

/** Schema para a entidade Usuario (resposta /auth/me e dentro de AuthResponse) */
export const usuarioSchema = z.object({
  id: z.number(),
  nome: z.string(),
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  perfil: userProfileSchema,
  status: userStatusSchema,
});

/** Schema para a resposta de login (POST /auth/login) */
export const authResponseSchema = z.object({
  token: z.string().min(1, 'Token não recebido'),
  usuario: usuarioSchema,
  expiresIn: z.number(),
});

export type UsuarioFromSchema = z.infer<typeof usuarioSchema>;
export type AuthResponseFromSchema = z.infer<typeof authResponseSchema>;
