# Padrões e qualidade do projeto

Este documento resume as práticas adotadas após a auditoria de frontend e segurança. **Todas as alterações no código devem seguir estes critérios.**

---

## 1. Segurança

- **Token de autenticação:** mantido apenas em memória (nunca em `localStorage`). Acesso somente via `getAuthToken()` / `setAuthToken()` em `src/services/api.ts`.
- **Variáveis de ambiente:** arquivos `.env` e `.env.*.local` não devem ser commitados. Usar `.env.example` como modelo sem valores reais.
- **XSS:** não usar `dangerouslySetInnerHTML` com conteúdo dinâmico; i18n com `escapeValue: true`.
- **Logs:** não logar dados sensíveis em produção; usar `import.meta.env.DEV` quando necessário para debug.
- **HTTP:** todas as chamadas de rede (incluindo upload/download) devem usar o cliente centralizado em `api.ts` (`api.get/post/put/delete`, `uploadFile`, `downloadBlob`).

---

## 2. Arquitetura

- **Validação de API:** respostas críticas validadas com schemas Zod; passar `schema` nas opções de `api.get`/`api.post` quando houver schema em `src/lib/schemas`.
- **Serviços:** lógica de negócio e chamadas HTTP nos serviços; páginas e componentes apenas orquestram e exibem.
- **Tipos:** DTOs e entidades em `src/types`; evitar tipos soltos em arquivos de página.

---

## 3. React

- **Keys:** listas devem usar keys estáveis (id, ou combinação única), nunca apenas `key={index}` para itens reordenáveis.
- **Error Boundary:** conteúdo principal da app dentro de `ErrorBoundary`; rotas pesadas com `React.lazy` e `Suspense`.
- **Componentes:** manter coesos e, quando possível, extrair trechos grandes para subcomponentes ou lazy chunks.

---

## 4. TypeScript

- **Evitar `any`:** usar `unknown` em `catch` e acessar propriedades via type guards ou helpers (`getErrorMessage`, `getErrorStatus`).
- **Casts:** preferir tipos específicos ou `unknown`; evitar `as any`; em libs externas (ex.: D3) usar o mínimo de cast necessário e documentar.
- **Tipos de API:** manter interfaces em `src/types` alinhadas aos schemas Zod quando houver validação.

---

## 5. Acessibilidade

- **Botões só com ícone:** sempre fornecer `aria-label` (ou `title` com mesmo texto) para leitores de tela.
- **Formulários:** inputs associados a labels (`FormLabel` + `htmlFor` ou `FormField`).
- **Navegação:** não remover outline de foco; usar componentes que suportem teclado (Radix/shadcn).

---

## 6. Performance

- **Code splitting:** páginas pesadas (Dashboard, TedHealthMap, etc.) podem lazy-loadar subcomponentes (gráficos, mapas) com `React.lazy` + `Suspense`.
- **Re-renders:** usar `useMemo`/`useCallback` onde listas ou callbacks são repassados a filhos e a referência importa.

---

## Referências

- Auditoria: `docs/AUDITORIA-FRONTEND-SEGURANCA-E-MATURIDADE.md`
- Remediação (fases): `docs/REMEDIACAO-FASES.md`
