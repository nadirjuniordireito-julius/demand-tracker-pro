# Termo de Planejamento — Status da demanda e regras do frontend

Referência para habilitar/desabilitar ações na tela de Termo de Planejamento, alinhada ao backend.

## Status da demanda técnica

| Código | Descrição |
|--------|-----------|
| A | Em elaboração |
| B | Em abertura |
| C | Aberta e assinada |
| D | Em planejamento |
| E | Planejado e assinado |
| F | Em encerramento |
| G | Encerrado e assinado |
| Z | Cancelada |

## Endpoints principais

| Método | Endpoint | Uso |
|--------|----------|-----|
| GET | `/api/termos-planejamento/demanda/{demandaId}` | Buscar termo; **404 = sem termo** (não é erro de sistema) |
| POST | `/api/termos-planejamento` | Criar termo |
| PUT | `/api/termos-planejamento/{id}` | Atualizar termo |
| DELETE | `/api/termos-planejamento/{id}` | Excluir termo |
| POST/PUT/DELETE | `/api/termos-planejamento-doc/...` | CRUD do PDF |
| PUT | `/api/termos-planejamento-doc/{id}/assinar` | Assinatura eletrônica do PDF |
| POST | `/api/demandas-execucao` | Criar execução — **somente com demanda.status = E** |

## Transições de status (backend)

- Após **salvar** planejamento (POST/PUT): demanda deve ficar em **D**.
- Após **assinar** o PDF do planejamento: demanda passa para **E**.
- O frontend **não** deve alterar `demanda.status` manualmente nesses fluxos.

## Matriz de ações na UI

Legenda: **Sim** = habilitado, **Não** = desabilitado, **—** = irrelevante.

### Edição do termo e documento (POST/PUT termo + CRUD doc)

Permitido quando `demanda.status` ∈ **B, C, D**:

| Ação | A | B | C | D | E | F | G | Z |
|------|---|---|---|---|---|---|---|---|
| Criar termo (POST) | Não | Sim | Sim | Sim | Não | Não | Não | Não |
| Salvar termo (PUT) | Não | Sim | Sim | Sim | Não | Não | Não | Não |
| Gerar PDF / upload / substituir doc | Não | Sim | Sim | Sim | Não | Não | Não | Não |
| Excluir documento (não assinado) | Não | Sim | Sim | Sim | Não | Não | Não | Não |
| Excluir termo | Não | Sim | Sim | Sim | Não | Não | Não | Não |

### Assinar PDF (`PUT .../assinar`)

Permitido quando `demanda.status` ∈ **C, D** **e**:

- Existe documento anexado ao termo
- Documento ainda **não** assinado (`!dataAssinatura`)
- Termo possui **ao menos um custo**
- **Termo de Abertura** já está assinado

| Ação | A | B | C | D | E | F | G | Z |
|------|---|---|---|---|---|---|---|---|
| Assinar PDF | Não | Não* | Sim** | Sim** | Não | Não | Não | Não |

\* Em B o planejamento pode ser editado, mas a abertura normalmente ainda não está assinada.  
\** Requer custos + abertura assinada + documento presente.

### Execução

| Ação | E |
|------|---|
| POST `/api/demandas-execucao` | Sim |
| Outros status | Não |

## Erros HTTP

- **400**: exibir `message` / `detail` do backend ao usuário (toast).
- **404** em GET por demanda: tratar como “sem termo”, formulário em branco.

## Implementação no código

- Regras: `src/lib/demandaStatus.ts` (`canEditTermoPlanejamento`, `canAssinarTermoPlanejamentoDoc`, `canCreateDemandaExecucao`)
- Tela: `src/pages/demandas/TermoPlanejamentoPage.tsx`
- Serviço: `src/services/termoService.ts` → `findByDemandaId` com `allow404: true`
