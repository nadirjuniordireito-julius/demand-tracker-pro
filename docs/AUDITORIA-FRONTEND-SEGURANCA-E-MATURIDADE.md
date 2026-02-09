# Auditoria Frontend – Segurança, Boas Práticas e Maturidade

**Projeto:** Demand Tracker Pro (React + TypeScript + Vite)  
**Data:** Fevereiro 2026  
**Escopo:** Varredura completa em segurança, React, TypeScript, arquitetura, performance e acessibilidade.

---

## 1. Tabela de Problemas Encontrados

| # | Arquivo | Linha aprox. | Tipo | Descrição | Risco | Sugestão | Exemplo corrigido |
|---|---------|--------------|------|-----------|-------|----------|-------------------|
| 1 | `src/components/ui/chart.tsx` | 70 | Segurança | Uso de `dangerouslySetInnerHTML` para injetar CSS gerado a partir de configuração de tema. Se `THEMES`/`colorConfig` vierem de fonte não confiável, há risco de XSS. | Médio | Garantir que o conteúdo é sempre gerado internamente (não de API). Preferir CSS-in-JS ou classes dinâmicas em vez de HTML bruto. | Usar `<style>` com variáveis CSS via `style={{ ['--color-'+key]: color } as React.CSSProperties}` ou biblioteca (e.g. styled-components). |
| 2 | `src/services/api.ts` | 9, 14–16, 23 | Segurança | Token JWT armazenado em `localStorage`: vulnerável a XSS (script rouba token). | Alto | Preferir `httpOnly` cookie para token (backend envia Set-Cookie) ou, se manter localStorage, mitigar XSS (CSP, sanitização, não usar escapeValue:false com conteúdo dinâmico). | Backend: enviar token em cookie `HttpOnly; Secure; SameSite=Strict`. Front: não armazenar token; usar `credentials: 'include'`. |
| 3 | `src/features/avaliacao-demanda/avaliacaoDemandaDocService.ts` | 14, 42, 70, 117, 140, 161 | Segurança | Múltiplos acessos diretos a `localStorage.getItem('authToken')` fora da camada centralizada (`api.ts`). Duplicação e mesmo risco de token em localStorage. | Médio | Usar `getAuthToken()` de `@/services/api` (ou um hook/contexto de auth) em vez de ler localStorage diretamente. | `import { getAuthToken } from '@/services/api'; const token = getAuthToken();` |
| 4 | `src/services/termoDocService.ts`, `templateDemandaService.ts`, `projetoDocService.ts`, `usuarioFotoService.ts`, `termoService.ts` | Várias | Segurança | Idem: leitura direta de `localStorage.getItem('authToken')` em serviços de upload/download. | Médio | Centralizar em `getAuthToken()` (api.ts) e reutilizar em todos os serviços. | Idem item 3. |
| 5 | `src/i18n/index.ts` | 29 | Segurança | `interpolation: { escapeValue: false }` desativa escape de interpolação no i18n. Strings vindas do backend ou de traduções não confiáveis podem ser interpretadas como HTML e causar XSS. | Alto | Usar `escapeValue: true` (padrão). Se precisar de HTML em traduções, usar apenas chaves conhecidas e conteúdo controlado (não usuário/API). | `interpolation: { escapeValue: true }` e revisar chaves que precisam de HTML. |
| 6 | `src/App.tsx` | 14–29 | Performance / Arquitetura | Todas as rotas importadas de forma síncrona; não há `React.lazy` nem `Suspense`. Aumenta bundle inicial e tempo de carregamento. | Médio | Aplicar lazy loading nas páginas (rotas) e envolver em `<Suspense>`. | `const DemandasPage = lazy(() => import('./pages/demandas/DemandasPage'));` e `<Suspense fallback={<PageLoader />}><Routes>...</Routes></Suspense>`. |
| 7 | `src/App.tsx` | 34–76 | Arquitetura | Ausência de Error Boundary. Qualquer erro não tratado em árvore de componentes derruba a app inteira sem fallback. | Alto | Adicionar um Error Boundary (classe ou lib) envolvendo as rotas e exibindo UI de erro + opção de recarregar. | `<ErrorBoundary fallback={<ErrorFallback />}><Routes>...</Routes></ErrorBoundary>`. |
| 8 | `src/services/api.ts` | 31–41 | Segurança | Headers não incluem proteção explícita contra CSRF (ex.: X-CSRF-TOKEN). Depende de backend usar SameSite cookie ou outro mecanismo. | Baixo | Se o backend usar cookies para sessão/CSRF, enviar header CSRF se exigido pela API. Caso contrário, documentar que a defesa é stateless (Bearer only). | Se backend exigir: `headers['X-CSRF-TOKEN'] = getCsrfToken();` (token obtido do backend/cookie). |
| 9 | Múltiplos (ProjetoMetaPage, Termo*, ProfilePage, TemplatesPage, Header) | Várias | TypeScript | Uso de `catch (err: any)` ou `as any` (ex.: `user as any` no Header). Perde type-safety e pode mascarar bugs. | Médio | Tipar erros como `unknown` e usar type guards; evitar `as any` criando tipos corretos (ex.: `Usuario` com `username?: string`). | `catch (err: unknown) { const message = err instanceof Error ? err.message : 'Erro'; }` e `interface Usuario { username?: string; email?: string; ... }`. |
| 10 | `src/components/common/DataTable.tsx` | 90 | TypeScript | `getRowId = (item) => (item as any).id` assume que todo item tem `id`; sem tipo genérico pode quebrar em runtime. | Baixo | Usar genérico `DataTable<T extends { id: number | string }>` e tipar `getRowId`. | `getRowId = (item: T) => item.id`. |
| 11 | `src/components/tedHealthMap/BubbleChart.tsx` | 128 | TypeScript | `(root as any)` para passar ao D3. Cast perigoso; pode esconder incompatibilidade de tipos. | Baixo | Definir tipo mínimo para o objeto D3 (interface ou tipo do @types/d3) e usar asserção apenas onde necessário. | `(root as D3Selection)` com tipo importado/declarado. |
| 12 | `src/features/avaliacao-demanda/avaliacaoDemandaPdf.tsx` | 176–180 | React | Uso de `key={idx}` e `key={rIdx}` em listas de seções/rows. Índice como key pode causar re-renders incorretos se a ordem mudar. | Baixo | Preferir IDs estáveis (ex.: `section.sectionTitle + idx` ou id único se existir). | `key={\`section-${idx}-${section.sectionTitle}\`}` ou `key={row.label + rIdx}`. |
| 13 | `src/pages/demandas/TermoEncerramentoPage.tsx`, `TermoPlanejamentoPage.tsx` | 785, 824 | React | `custos.map((custo, index) => ... key={index})`. Listas dinâmicas (add/remove/reorder) com key=index causam bugs de estado e acessibilidade. | Médio | Usar `custo.id` (ou id estável) como key. | `key={custo.id}` (garantir que custos tenham id ao criar). |
| 14 | `src/pages/cadastros/ProjetoMetaPage.tsx` | 637 | React | `actions.map((action, index) => ... key={index})`. Se actions forem estáticas, index é aceitável; se dinâmicas, preferir id/name. | Baixo | Se action tiver id ou nome estável: `key={action.id}` ou `key={action.name}`. | Depende do modelo de `actions`. |
| 15 | `src/components/layout/Header.tsx` | 76–77 | React | eslint-disable para react-hooks/exhaustive-deps em useEffect que usa `user?.id`. Pode esconder dependências faltantes. | Baixo | Incluir todas as dependências ou extrair `loadUserFoto` para função estável (useCallback) e listar deps corretas. | `useEffect(() => { ... }, [user?.id]);` ou useCallback(loadUserFoto, [user?.id]). |
| 16 | `src/contexts/ProjectContext.tsx` | 39–47, 71, 92 | Segurança / Boas práticas | Dados de projeto (JSON) em localStorage sem validação. Objeto malformado ou manipulado pode quebrar a app. | Médio | Validar com Zod (ou schema) ao ler do localStorage e tratar falha com fallback (null/remover). | `const parsed = projectSchema.safeParse(JSON.parse(saved)); if (!parsed.success) { localStorage.removeItem(...); return; }` |
| 17 | Vários (api.ts, LoginPage, AuthContext, ProfilePage, etc.) | Várias | Segurança / Boas práticas | Uso de `console.error`/`console.warn` com mensagens ou objetos de erro. Em produção pode vazar stack traces ou dados sensíveis. | Médio | Remover ou condicionar a `import.meta.env.DEV`; em prod usar serviço de logging sem dados sensíveis. | `if (import.meta.env.DEV) console.error('...', err);` ou logger que não loga em prod. |
| 18 | `src/pages/LoginPage.tsx` | 52 | Segurança | `console.error('Login failed:', error)` pode expor detalhes de erro (ex.: resposta da API) ao usuário com DevTools aberto. | Médio | Não logar o objeto `error` em produção; logar apenas mensagem genérica ou usar logger condicional. | Idem item 17. |
| 19 | `src/pages/NotFound.tsx` | 8 | Segurança | `console.error("404 ...", location.pathname)` expõe pathname; risco baixo mas desnecessário em produção. | Baixo | Remover ou condicionar a DEV. | `if (import.meta.env.DEV) console.error(...)`. |
| 20 | Backend response em vários serviços | - | Segurança / Arquitetura | Respostas da API são usadas diretamente (ex.: `response.json()`) sem validação com Zod/schema. Dados malformados ou inesperados podem causar erros ou exibir dados incorretos. | Alto | Validar DTOs críticos (login, usuário, demanda, avaliação) com schemas Zod após `response.json()`. | `const data = await response.json(); const parsed = userSchema.safeParse(data); if (!parsed.success) throw new ApiError('Resposta inválida', 422);` |
| 21 | `src/components/ui/chart.tsx` | 70 | Acessibilidade | Conteúdo injetado via `dangerouslySetInnerHTML` em `<style>` não é acessível; não é conteúdo de leitura. N/A para leitores de tela, mas reforça evitar uso para conteúdo dinâmico de usuário. | Baixo | Manter apenas para CSS gerado internamente; garantir que não há conteúdo de usuário. | - |
| 22 | Botões só com ícone (ex.: Header, Sidebar) | Várias | Acessibilidade | Botões que têm apenas ícone (Printer, etc.) podem não ter `aria-label` ou texto alternativo. | Médio | Garantir `aria-label` ou `title` em todos os botões só-ícone. | `<Button aria-label={t('avaliacaoDemanda.printPdfTitle')} ...>` (já feito em alguns; auditar todos). |
| 23 | Formulários (FormField + FormLabel) | Várias | Acessibilidade | Uso de FormLabel/Form sem `id` explícito em alguns campos pode prejudicar associação label-input. Shadcn/Form geralmente associa; verificar casos sem label. | Baixo | Revisar campos sem label visível e garantir que têm aria-label ou label associado. | - |
| 24 | `src/services/api.ts` | 6 | Segurança | `API_BASE_URL` com fallback `http://localhost:8080/api`. Em build de produção, se `VITE_API_URL` não estiver definido, pode vazar para localhost. | Baixo | Em build prod, falhar ou usar variável obrigatória; não fallback para localhost em prod. | `export const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:8080/api');` e validar em prod. |
| 25 | Páginas (Termo*Abertura*, *Planejamento*, *Encerramento*, DemandasPage) | - | Arquitetura | Páginas muito grandes (muitas linhas) com lógica de negócio, estado e UI misturados. Dificulta manutenção e testes. | Médio | Extrair hooks (useTermoAbertura, useDemandasList), serviços e subcomponentes; manter página como orquestração. | Criar `useTermoAbertura(demandaId)`, `TermoAberturaForm`, etc. |
| 26 | Chamadas HTTP em serviços (api.get/post, fetch direto) | - | Arquitetura | Boa centralização em `api.ts` para JSON; uploads/downloads usam `fetch` direto em termoDocService, projetoDocService, etc. Sem interceptors únicos para token/erro. | Médio | Unificar: usar um único cliente (ex.: wrapper em api.ts) que adiciona token e trata 401/erro, e chamar esse cliente nos uploads. | Função `fetchWithAuth(url, { method, body })` em api.ts que usa getAuthToken() e trata 401. |
| 27 | Repetição de padrão try/catch + toast em páginas | - | Boas práticas | Muito try/catch repetido com toast e setLoading. Pode ser abstraído em hook (useApiMutation) ou wrapper. | Baixo | Hook que recebe função async e trata loading/erro/toast; páginas chamam o hook. | `const { mutate, isPending } = useApiMutation(avaliacaoDemandaService.create, { successMessage: '...' });` |

---

## 2. Checklist Final

### Segurança
- [ ] Remover ou condicionar todos os `console.*` em produção.
- [ ] Revisar `escapeValue: false` no i18n e garantir que não há interpolação de conteúdo não confiável.
- [ ] Considerar migração de token de localStorage para cookie HttpOnly (backend + front).
- [ ] Centralizar leitura do token em `getAuthToken()` em todos os serviços.
- [ ] Validar respostas críticas da API com Zod (ou equivalente).
- [ ] Garantir que `dangerouslySetInnerHTML` no chart usa apenas dados internos (documentar).
- [ ] Em produção, não usar fallback de API_BASE_URL para localhost.

### React
- [ ] Substituir `key={index}` por IDs estáveis onde a lista é dinâmica (custos, etc.).
- [ ] Adicionar Error Boundary na raiz das rotas.
- [ ] Revisar useEffect com exhaustive-deps desabilitado (Header) e corrigir deps ou useCallback.

### TypeScript
- [ ] Substituir `catch (err: any)` por `unknown` + type guard em todos os arquivos.
- [ ] Remover `as any` desnecessários (Header getUserLogin: tipar Usuario com username?).
- [ ] Tipar genérico do DataTable e getRowId.

### Arquitetura
- [ ] Implementar lazy loading das rotas (React.lazy + Suspense).
- [ ] Unificar chamadas HTTP (incluindo multipart) em um único cliente com token e tratamento de erro.
- [ ] Extrair lógica de páginas grandes para hooks e subcomponentes.

### Performance
- [ ] Lazy load de rotas (já citado).
- [ ] Revisar imports pesados (ex.: libs de gráfico) e usar dynamic import se aplicável.

### Acessibilidade
- [ ] Garantir `aria-label` em todos os botões só-ícone.
- [ ] Revisar associação label/input em formulários.

---

## 3. Nota Geral de Maturidade (0–10)

**Nota: 6,5 / 10**

- **Pontos fortes:** TypeScript em boa parte do código, uso de Zod em formulários (Login, Avaliação), API centralizada para JSON, tratamento de erro com ApiError e toast, estrutura de pastas (features, services, contexts, hooks), uso de react-hook-form + resolver.
- **Pontos fracos:** Token em localStorage, ausência de Error Boundary e lazy loading, validação de resposta da API inexistente, uso de `any` e keys instáveis, logs em produção, e algumas páginas monolíticas.

---

## 4. Os 3 Maiores Riscos do Projeto

1. **Token em localStorage + XSS**  
   Se um atacante conseguir executar JS na página (XSS), pode roubar o token e assumir a sessão. Mitigações: migrar para cookie HttpOnly, endurecer CSP e revisar `escapeValue: false` no i18n.

2. **Ausência de validação das respostas da API**  
   Dados malformados ou maliciosos do backend podem quebrar a UI ou levar a exibição de dados incorretos. Mitigação: validar DTOs críticos (usuário, demanda, avaliação) com Zod após cada resposta.

3. **Falha não tratada derruba a aplicação inteira**  
   Qualquer erro não capturado em qualquer componente resulta em tela branca, sem Error Boundary. Mitigação: implementar Error Boundary global e, se possível, por rota.

---

*Documento gerado com base em varredura estática no código-fonte. Recomenda-se revisão humana e testes de segurança (ex.: OWASP ZAP, análise de dependências) para complementar.*
