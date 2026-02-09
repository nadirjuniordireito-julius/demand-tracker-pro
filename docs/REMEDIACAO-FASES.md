# Remediação – Fases 1 a 5

## Fase 1 — Segurança ✅

### Arquivos alterados
- `src/services/api.ts`
- `src/features/avaliacao-demanda/avaliacaoDemandaDocService.ts`
- `src/services/termoDocService.ts`
- `src/services/templateDemandaService.ts`
- `src/services/projetoDocService.ts`
- `src/services/usuarioFotoService.ts`
- `src/services/termoService.ts`
- `src/components/ui/chart.tsx`
- `src/i18n/index.ts`
- `src/contexts/AuthContext.tsx`
- `src/services/authService.ts`
- `src/pages/LoginPage.tsx`
- `src/components/layout/Header.tsx`
- `src/pages/NotFound.tsx`
- `src/features/avaliacao-demanda/AvaliacaoDemandaPage.tsx`

### Decisões técnicas

1. **Token em memória**  
   Removido uso de `localStorage` para o token. O token fica apenas na variável do módulo `api.ts`. Ao recarregar a página o usuário precisa fazer login novamente (trade-off de segurança).

2. **Centralização do token**  
   Todos os serviços que faziam `localStorage.getItem('authToken')` passaram a usar `getAuthToken()` de `@/services/api`.

3. **Logs sensíveis**  
   Todos os `console.error`/`console.warn` que expunham objetos de erro ou dados sensíveis foram condicionados a `import.meta.env.DEV`.

4. **dangerouslySetInnerHTML**  
   No `chart.tsx`, o CSS passou a ser injetado como filho de `<style>{cssText}</style>` em vez de `dangerouslySetInnerHTML`, eliminando risco de XSS.

5. **i18n**  
   `escapeValue` alterado para `true` para escapar interpolações e reduzir risco de XSS.

### Antes / Depois

**api.ts – token**
```ts
// Antes
let authToken = localStorage.getItem('authToken');
export const setAuthToken = (token) => {
  authToken = token;
  if (token) localStorage.setItem('authToken', token);
  else localStorage.removeItem('authToken');
};
export const getAuthToken = () => {
  const storedToken = localStorage.getItem('authToken');
  if (storedToken !== authToken) authToken = storedToken;
  return authToken;
};

// Depois
let authToken: string | null = null;
export const setAuthToken = (token: string | null): void => { authToken = token; };
export const getAuthToken = (): string | null => authToken;
```

**chart.tsx**
```tsx
// Antes
<style dangerouslySetInnerHTML={{ __html: Object.entries(THEMES).map(...).join("\n") }} />

// Depois
const cssText = Object.entries(THEMES).map(...).filter(Boolean).join('\n');
return <style>{cssText}</style>;
```

---

## Fase 2 (parcial) — Arquitetura ✅

### Arquivos alterados
- `src/services/api.ts` – adicionados `uploadFile`, `downloadBlob` e tratamento de 401.
- `src/features/avaliacao-demanda/avaliacaoDemandaDocService.ts` – passou a usar o cliente centralizado.

### Decisões técnicas
- Cliente HTTP único para upload (POST/PUT) e download de blob, usando `getAuthToken()` e o mesmo tratamento de 401 do `api`.
- `avaliacaoDemandaDocService` deixou de ter `fetch` próprio e passou a usar `uploadFile`, `downloadBlob`, `api.get` e `api.delete`.

### Antes / Depois (avaliacaoDemandaDocService)
```ts
// Antes: fetch manual em cada função, getAuthToken() repetido
async function uploadFile(endpoint, formData) {
  const token = getAuthToken();
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
  ...
}

// Depois: uso do cliente centralizado
import api, { uploadFile, downloadBlob } from '@/services/api';
upload(demandaId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return uploadFile(base(demandaId), formData, 'POST');
}
download(demandaId) { return downloadBlob(downloadEndpoint(demandaId)); }
```

---

## Fase 3 — React ✅

### Arquivos alterados
- `src/components/common/ErrorBoundary.tsx` (novo)
- `src/App.tsx`
- `src/pages/demandas/TermoEncerramentoPage.tsx`
- `src/pages/demandas/TermoPlanejamentoPage.tsx`

### Decisões técnicas
- **ErrorBoundary:** Componente de classe com `getDerivedStateFromError` e `componentDidCatch`; fallback com botão "Recarregar página"; em DEV exibe a mensagem do erro.
- **Lazy + Suspense:** Rotas protegidas e NotFound passaram a usar `React.lazy()`; app envolve as rotas em `<Suspense fallback={<PageFallback />}>` (PageFallback usa `LoadingSpinner`). LoginPage permanece import estático.
- **Keys estáveis:** Nas listas de custos em TermoEncerramento e TermoPlanejamento, `key={index}` foi substituído por `key={'id' in custo && custo.id != null ? custo.id : \`custo-${index}\`}`.

### Antes / Depois (App.tsx)
```tsx
// Antes: imports estáticos, sem ErrorBoundary
import DashboardPage from '@/pages/DashboardPage';
// ...
<Routes>...</Routes>

// Depois: lazy + ErrorBoundary + Suspense
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
// ...
<ErrorBoundary>
  <Suspense fallback={<PageFallback />}>
    <Routes>...</Routes>
  </Suspense>
</ErrorBoundary>
```

---

## Fase 4 — TypeScript ✅ (parcial)

### Arquivos alterados
- `src/types/index.ts` – adicionado `username?: string` em `Usuario`.
- `src/components/layout/Header.tsx` – removido `user as any` em `getUserLogin()`; `catch (error: any)` trocado por `error: unknown` com cast seguro para status/message.

### Decisões técnicas
- Uso de `user?.username ?? user?.email ?? ''` evita cast de usuário.
- Erros em catch tipados como `unknown`; uso de tipo auxiliar para acessar `status`/`message` quando necessário.
- **Pendente (opcional):** Substituir demais `catch (err: any)` e `as any` no projeto (ProjetoMetaPage, Termo*Pages, ProfilePage, TemplatesPage, DataTable, etc.) por `unknown` + type guards.

---

## Fase 5 — Acessibilidade ✅

### Arquivos alterados
- `src/components/layout/Header.tsx` – `aria-label` em botões de trocar projeto, mensagens e notificações.
- `src/components/layout/Sidebar.tsx` – `aria-label` no botão expandir/recolher.
- `src/components/common/PageComponents.tsx` – `aria-label` em botão de refresh e em todos os botões de paginação (primeira, anterior, página N, próxima, última).
- `src/components/common/DataTable.tsx` – `aria-label={defaultActionsLabel}` no trigger do menu de ações.
- `src/components/project/ProjectDocumentsModal.tsx` – `aria-label` em botões de download e excluir documento.
- `src/components/ui/rich-text-editor.tsx` – `aria-label` em todos os botões de formatação (negrito, itálico, alinhamento, listas, desfazer/refazer), usando o mesmo texto do `title`.
- `src/pages/ProfilePage.tsx` – `aria-label` em upload/remover foto e nos três botões de mostrar/ocultar senha (com `profile.showPassword` / `profile.hidePassword`).
- `src/pages/demandas/TermoAberturaPage.tsx`, `TermoPlanejamentoPage.tsx`, `TermoEncerramentoPage.tsx` – `aria-label` em visualizar documento, excluir documento e remover custo (usando chaves i18n existentes e `common.remove`).
- `src/pages/demandas/DemandasPage.tsx` – `aria-label` no botão expandir/recolher detalhes da demanda.
- `src/pages/cadastros/ProjetoMetaPage.tsx` – `aria-label` no botão expandir/recolher linha e nos dois menus de ações (Ações).
- `src/i18n/locales/pt.json`, `en.json`, `es.json` – novas chaves: `pagination.pageNumber`, `pagination.first/last/next/previous` (ajustadas para “página”), `profile.showPassword`, `profile.hidePassword`, `common.expandDetails`, `common.collapseDetails`.

### Decisões técnicas
- Todo botão somente com ícone passou a ter `aria-label` (ou nome acessível equivalente) para leitores de tela.
- Onde já existia `title`, o `aria-label` foi definido com o mesmo texto ou com chave i18n correspondente.
- Botões de paginação e de detalhes (expandir/recolher) usam chaves i18n para manter consistência e suporte a múltiplos idiomas.

### Antes / Depois
```tsx
// Antes (exemplo PageComponents)
<Button variant="outline" size="icon" onClick={onRefresh} title={t('common.refresh')}>
  <RefreshCw className="h-4 w-4" />
</Button>

// Depois
<Button variant="outline" size="icon" onClick={onRefresh} title={t('common.refresh')} aria-label={t('common.refresh')}>
  <RefreshCw className="h-4 w-4" />
</Button>
```

---

## Resumo final e checklist

| Categoria        | Itens tratados |
|------------------|----------------|
| **Segurança**    | Token em memória; token centralizado no ApiClient; logs só em DEV; chart sem dangerouslySetInnerHTML; i18n escapeValue true. |
| **Arquitetura**  | uploadFile/downloadBlob no api.ts; avaliacaoDemandaDocService, termoDocService, templateDemandaService, projetoDocService, usuarioFotoService usando cliente centralizado; schemas Zod para auth e usuário; validação opcional no ApiClient. |
| **React**        | ErrorBoundary global; rotas com React.lazy + Suspense; keys estáveis nas listas de custos. |
| **TypeScript**   | Usuario.username; Header sem any; todos os catch com `unknown` e getErrorMessage/getErrorStatus; remoção de `as any` (DataTable, AvaliacaoDemandaPage, BubbleChart, TemplatesPage). |
| **Acessibilidade** | aria-label em botões só com ícone (Header, Sidebar, PageComponents, DataTable, ProjectDocumentsModal, rich-text-editor, ProfilePage, Termo*Pages, DemandasPage, ProjetoMetaPage); i18n para labels de a11y. |

**Build:** Todas as alterações foram validadas com `npm run build` (sucesso).

---

## Fase 2 (continuação) — Zod, uploads centralizados e TypeScript ✅

### Schemas Zod para respostas da API
- **Arquivos:** `src/lib/schemas/apiSchemas.ts`, `src/lib/schemas/index.ts`
- **Conteúdo:** `usuarioSchema` e `authResponseSchema` (Zod) para validar respostas de `/auth/me` e `/auth/login`.
- **Integração:** Em `api.ts` a função `request` aceita opção `schema?: z.ZodType<unknown>`; quando presente, o body é validado com `schema.parse(data)` antes de retornar. `authService.login` e `authService.getCurrentUser` passam a usar `schema: authResponseSchema` e `schema: usuarioSchema`.

### Migração de uploads para o cliente centralizado
- **termoDocService:** Removidas as funções locais `uploadFile`, `updateFile` e `downloadFile`; passou a usar `uploadFile` e `downloadBlob` de `@/services/api` (POST/PUT e GET blob), com 401 tratado no cliente.
- **templateDemandaService:** Mesma migração (upload/update/download via api).
- **projetoDocService:** Removidas funções locais; usa `uploadFile` e `downloadBlob` de api.
- **usuarioFotoService:** Removidas funções locais; usa `uploadFile` e `downloadBlob` de api.

### Remoção de `any` (TypeScript)
- **Helpers:** Em `apiErrorHandler.ts` foram adicionados `getErrorMessage(error: unknown)` e `getErrorStatus(error: unknown)` para uso em blocos `catch`.
- **Páginas:** ProfilePage, TermoAberturaPage, TermoPlanejamentoPage, TermoEncerramentoPage, ProjetoMetaPage, TemplatesPage: todos os `catch (err: any)` / `catch (error: any)` e callbacks `onError={(err: any) => ...}` foram trocados por `catch (err: unknown)` e uso de `getErrorMessage`/`getErrorStatus` onde necessário.
- **Componentes:** DataTable — `getRowId` default passou de `(item as any).id` para `(item as { id?: string | number }).id ?? ''`. AvaliacaoDemandaPage — `opt.value as any` substituído por `opt.value as TipoRisco`. BubbleChart — `root as any` substituído por `root as HierarchyNode<...>`. TemplatesPage — `arquivoDocx: undefined as any` substituído por `arquivoDocx: undefined`.

### Antes / Depois (exemplo)
```ts
// Antes (authService)
const response = await api.post<AuthResponse>(...);
if (!response.token) throw new ApiError(...);

// Depois
const response = await api.post<AuthResponse>(..., { schema: authResponseSchema });
setAuthToken(response.token);
```

```ts
// Antes (termoDocService)
const response = await fetch(url, { method: 'POST', headers, body: formData });
if (!response.ok) { const errorText = await response.text(); ... }

// Depois
return uploadFile<...>(ENDPOINTS.base, formData, 'POST');
```

**Maturidade:** Com Zod em auth/usuário, uploads centralizados e remoção dos `any` restantes, o projeto atende aos itens pendentes desta etapa.

---

## Melhorias adicionais (pós-auditoria) ✅

### 1. Zod expandido para entidades de negócio
- **Arquivo:** `src/lib/schemas/entitySchemas.ts` — schemas para Perfil, Projeto, DemandaTecnica, TermoAbertura, TermoPlanejamento, TermoEncerramento e helpers `paginatedSchema(...)`.
- **Uso:** `perfilService` (findAll, findById), `projetoService` (findAll, findById), `demandaService` (findAll, findById), `termoService` (findAll/findById dos três termos) passam a usar `schema: ...` nas chamadas `api.get`, validando resposta no cliente.

### 2. Fetch diretos consolidados em termoService
- **Alteração:** Os três métodos `gerarPdf` (Termo Abertura, Planejamento, Encerramento) deixaram de usar `fetch` local com `getAuthToken()` e parsing manual de erro; passaram a usar `downloadBlob(endpoint)` de `@/services/api`, com 401 e erro padronizados.

### 3. Code splitting interno (Dashboard e TedHealthMap)
- **Dashboard:** Gráficos (BarChart, PieChart — recharts) extraídos para `DashboardCharts.tsx` e carregados com `React.lazy` + `Suspense`; o chunk principal da Dashboard fica menor e o de gráficos (~400 kB) carrega sob demanda.
- **TedHealthMap:** `BubbleChart` e `TedHealthMapDetailPanel` passaram a ser importados com `React.lazy`; a área do mapa + painel é envolvida em `Suspense` com fallback em skeleton. Chunk principal da página reduzido; BubbleChart e DetailPanel em chunks separados.
