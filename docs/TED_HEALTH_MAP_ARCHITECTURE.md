# TED Health Map — Arquitetura da Solução

## Painel Cognitivo do Projeto

**Objetivo:** Visualização semântica e hierárquica que permite ao coordenador perceber risco, atraso e desequilíbrio em poucos segundos, com zoom progressivo em bolhas.

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TED Health Map Page                                    │
├──────────────┬────────────────────────────────────────────┬─────────────────┤
│   Filtros    │         Mapa de Bolhas (Canvas/SVG)         │  Painel         │
│   (Left)     │         + Header com Termômetro             │  Detalhes       │
│              │                                              │  (Right)        │
│  - Meta      │  [TED] → [Metas] → [Produtos] → [Demandas]   │  - Planejado x  │
│  - Produto   │  Zoom progressivo + transições               │    Realizado    │
│  - Perfil    │                                              │  - Desvio custo │
│  - Status    │                                              │  - Timeline     │
│  - Período   │                                              │  - Status fluxo │
└──────────────┴────────────────────────────────────────────┴─────────────────┘
```

---

## 2. Stack Técnico

| Tecnologia | Uso |
|------------|-----|
| **React + TypeScript** | Base do projeto (Vite) |
| **Tailwind CSS** | Layout, filtros, painel lateral |
| **d3-hierarchy** | Cálculo do layout circle packing (leve, ~15kb) |
| **Framer Motion** | Animações de zoom, morph, fade entre níveis |
| **Recharts** | Gráficos no painel de detalhes (já no projeto) |

**Nota:** O projeto atual usa Vite + React Router (não Next.js). A solução será adaptada para esse stack.

---

## 3. Modelo de Dados do Frontend

### 3.1 Hierarquia para Circle Packing

```typescript
// Nó genérico para qualquer nível da hierarquia
interface BubbleNode {
  id: string;
  name: string;
  level: 'ted' | 'meta' | 'produto' | 'demanda';
  value: number;                    // Peso financeiro (para tamanho da bolha)
  fillPercent?: number;             // % execução física (0-100)
  scheduleDeviationDays?: number;   // Dias de atraso/adiantamento (positivo = atraso)
  effortDeviationHours?: number;    // Horas reais − planejadas (positivo = over)
  financialDeviation?: number;     // Custo real − planejado (positivo = over)
  riskTrend?: {
    last7Days: number;   // Variação do desvio nos últimos 7 dias
    last30Days: number;  // Variação do desvio nos últimos 30 dias
  };
  children?: BubbleNode[];
  raw?: Projeto | ProjetoMeta | MetaProduto | DemandaTecnica;
}

// Cor derivada por regra (não armazenada no nó)
// scheduleDeviationDays > 7  → vermelho (atraso crítico)
// scheduleDeviationDays > 0  → amarelo (atraso leve)
// scheduleDeviationDays <= 0 → verde (no prazo ou adiantado)
```

### 3.2 Mapeamento Entidades → Níveis

| Nível | Entidade | Agregação |
|-------|----------|-----------|
| TED | Projeto | Soma de todas as metas |
| Meta | ProjetoMeta | Soma dos produtos |
| Produto | MetaProduto | Soma das demandas |
| Demanda | DemandaTecnica | Item folha |

### 3.3 Métricas por Nível

- **value (tamanho):** valor financeiro planejado/comprometido
- **fillPercent:** (valor realizado / valor planejado) × 100
- **scheduleDeviationDays:** dias de atraso ou adiantamento em relação ao cronograma
- **effortDeviationHours:** horas realizadas − horas planejadas (esforço)
- **financialDeviation:** custo realizado − custo planejado (valor financeiro)
- **riskTrend:** variação temporal do desvio (last7Days, last30Days) para pulsação

---

## 4. Arquitetura de Componentes

```
pages/
  TedHealthMapPage.tsx          # Página principal, orquestra layout

components/
  tedHealthMap/
    TedHealthMapHeader.tsx      # Nome TED, termômetro, burn rate, tendência
    TedHealthMapFilters.tsx     # Filtros (meta, produto, perfil, status, período)
    TedHealthMapBubbles.tsx     # Container do mapa de bolhas
    BubbleChart.tsx             # Lógica D3 + renderização SVG/React
    BubbleNode.tsx              # Bolha individual (Framer Motion)
    TedHealthMapDetailPanel.tsx # Painel lateral direito
    TedHealthMapDetailContent.tsx # Conteúdo dinâmico do painel
```

### 4.1 Fluxo de Dados

```
Mock / API
    ↓
useTedHealthMapData()  ← hook que transforma dados em BubbleNode[]
    ↓
TedHealthMapPage (estado: selectedNode, zoomLevel, filters)
    ↓
BubbleChart (recebe nodes, selectedNode, onNodeClick)
    ↓
BubbleNode (renderiza bolha, anima com Framer Motion)
    ↓
onNodeClick → atualiza selectedNode, zoomLevel
    ↓
TedHealthMapDetailPanel (recebe selectedNode, exibe detalhes)
```

---

## 5. Lógica de Zoom e Transições

### 5.1 Estados de Zoom

| Estado | Nível visível | Ação ao clicar |
|--------|---------------|----------------|
| `zoomedOut` | TED (1 bolha) | Zoom nas metas |
| `meta` | Metas | Zoom nos produtos da meta |
| `produto` | Produtos | Zoom nas demandas do produto |
| `demanda` | Demandas | Abre painel de detalhes (sem zoom) |

### 5.2 Transições (Framer Motion)

- **Zoom in:** `scale` + `opacity` + `layoutId` para morph suave
- **Zoom out:** botão "Voltar" ou clique em área vazia
- **Troca de nível:** `AnimatePresence` para fade entre conjuntos de bolhas

### 5.3 Cálculo do Layout (d3-hierarchy)

```javascript
import { hierarchy, pack } from 'd3-hierarchy';

const root = hierarchy(nodes)
  .sum(d => d.value)
  .sort((a, b) => b.value - a.value);

pack()
  .size([width, height])
  .padding(2)(root);
```

---

## 6. Metáfora Visual (Bolhas)

| Atributo | Significado | Implementação |
|----------|-------------|---------------|
| **Tamanho** | Peso financeiro | `pack().sum(d => d.value)` |
| **Preenchimento** | % execução física | Gradiente radial ou `fill-opacity` |
| **Cor** | Situação de prazo | Derivada de `scheduleDeviationDays`: >7 vermelho, >0 amarelo, ≤0 verde |
| **Halo** | Desvio esforço + financeiro | `effortDeviationHours` e `financialDeviation` (intensidade do halo) |
| **Pulsação** | Tendência de risco | `riskTrend.last7Days` e `riskTrend.last30Days` → `scale` animado |

### 6.1 Regra de Cor (derivada)

```
scheduleDeviationDays > 7  → vermelho (atraso crítico)
scheduleDeviationDays > 0  → amarelo (atraso leve)
scheduleDeviationDays <= 0 → verde (no prazo ou adiantado)
```

---

## 7. Layout da Tela (Detalhado)

### 7.1 Header (Topo)

- Nome do projeto / TED
- Termômetro de saúde (0–100%)
- Valor executado x valor comprometido
- Burn rate
- Indicador de tendência (↑ ↓ →)

### 7.2 Filtros (Lateral Esquerda)

- Meta (select)
- Produto (select)
- **Perfil profissional (select)** — ver detalhe abaixo
- Status (select)
- Período (date range)

**Comportamento do filtro por perfil:** As bolhas **não são ocultadas**. Ao selecionar um perfil, apenas `effortDeviationHours` e `financialDeviation` são recalculados considerando apenas as horas/custos daquele perfil. O mapa mantém todas as bolhas visíveis; o halo e os indicadores de desvio passam a refletir a visão filtrada por perfil.

### 7.3 Centro

- Mapa de bolhas com transições suaves
- **Breadcrumb narrativo** — em vez de "TED > Meta X > Produto Y", exibir mensagem contextual, por exemplo:
  - *"O atraso do TED vem da Meta X, causado pelo Produto Y."*
  - *"O TED está no prazo."*
  - *"O desvio financeiro concentra-se na Meta Z."*
- Botão "Voltar" para zoom out

### 7.4 Painel de Detalhes (Lateral Direita)

- Planejado x realizado por perfil (gráfico de barras)
- Desvio de custo
- Linha do tempo da demanda
- Status do fluxo (planejada, em execução, encerrada)

---

## 8. Mock de Dados

Estrutura inicial com 1 TED, 2 metas, 3 produtos por meta, 2–4 demandas por produto. Valores e percentuais fictícios para demonstrar cenários de risco, atraso e desequilíbrio.

---

## 9. Roteamento e Permissões

- **Rota:** `/ted-health-map` ou `/demandas/health-map`
- **Perfil:** Coordenador (ou perfil com permissão específica)
- **Projeto:** Usa `ProjectContext` para TED selecionado

---

## 10. Ordem de Implementação

1. Tipos e modelo de dados (`BubbleNode`, mapeamento)
2. Mock de dados
3. `TedHealthMapPage` com layout (header, filtros, centro, painel)
4. `BubbleChart` com d3-hierarchy
5. `BubbleNode` com Framer Motion
6. Lógica de zoom e seleção
7. `TedHealthMapDetailPanel` com conteúdo dinâmico
8. `TedHealthMapHeader` (termômetro, burn rate)
9. `TedHealthMapFilters` (integração com estado)
10. i18n e rota no App/Sidebar
