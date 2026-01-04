
# Documentação de Referência API (football-data.org) - PT-BR

Este documento serve como referência central para a integração com a API externa, traduzida e adaptada para o contexto do projeto Futbolão.

## 1. Visão Geral (Overview)

A versão utilizada é a **v4**. Esta versão foca em consistência e estruturas de dados mais planas ("flattened").

### Regras de URI
*   **Recursos:** Sempre em letras minúsculas (ex: `/teams`, `/matches`).
*   **Filtros:** Parâmetros de consulta usam `camelCase` (ex: `dateFrom`, `stage`).
*   **Listas vs Único:**
    *   `/teams` -> Retorna lista de times.
    *   `/teams/19` -> Retorna um único time (ID 19).
*   **Sub-recursos:** Permite acessar dados relacionados diretamente.
    *   Exemplo: `/teams/5/matches` (Todos os jogos do time ID 5).

### Mudanças Importantes na v4 (Changelog)
*   **Placar (`score`):** A estrutura mudou. Agora contém `winner`, `duration`, `fullTime`, `halfTime`. Pênaltis e prorrogação são atributos extras se necessário.
*   **Times no Placar:** Referenciados estritamente como `home` (Casa) e `away` (Fora).
*   **Capitães:** O campo `captain` foi removido.
*   **Temporada (Season) e Rodada (Matchday):** Agora são atributos de um jogo ou competição, não recursos separados hierárquicos.

---

## 2. Recursos (Resources)

### Área (`Area`)
Representa um país, continente ou região geográfica. Útil para filtrar competições por país.

*   **Endpoint:** `/v4/areas` ou `/v4/areas/{id}`
*   **Estrutura do Objeto:**
    ```json
    {
        "id": 2077,
        "name": "Europe",
        "code": "EUR",
        "flag": "https://crests.football-data.org/EUR.svg",
        "parentAreaId": 2267,
        "parentArea": "World",
        "childAreas": [ ... ]
    }
    ```

### Filtros e Consultas (Querying)
A API segue o padrão "Query-String". Você pode combinar filtros para refinar os dados.
*   **Encadeamento:** Use `?` para o primeiro parâmetro e `&` para os seguintes.
    *   Ex: `/matches?dateFrom=2024-01-01&dateTo=2024-01-10`
*   **Filtros Automáticos:** Alguns endpoints aplicam filtros padrão se você não especificar.
    *   Exemplo: `/teams/5/matches` pode retornar apenas jogos *agendados* ou da *temporada atual* se não for especificado o contrário.

### Sub-recursos (Subresources)
Recursos principais (como `Teams`) possuem sub-recursos lógicos que não fazem sentido sozinhos.
*   **Exemplo:** `/teams/5/matches`
    *   Isso não é um recurso isolado, mas uma visão filtrada do recurso principal `Matches`.
    *   O retorno é um ` resultSet` contendo metadados (contagem, datas, filtros aplicados) e a lista de jogos.

### Paginação e Limites
*   **Limites:** Por padrão, listas longas retornam um número limitado de itens (ex: 100).
*   **Evite Loops:** A documentação alerta estritamente contra fazer loops de requests (ex: iterar ID de 0 a 1000). Isso causa banimento (Erro 429 permanente ou temporário).
*   **Cabeçalhos:** Respostas incluem cabeçalhos indicando o total de itens e páginas disponíveis (`X-Auth-Token` não é paginação, mas autenticação).

---

## 3. Exemplos Práticos (Sample Requests)

Abaixo estão padrões comuns de uso (traduzidos para lógica de fetch):

*   **Próximo jogo de um time (ex: Magpies/Newcastle - ID 67):**
    `GET /teams/67/matches?status=SCHEDULED&limit=1`
*   **Todos os jogos de hoje (suas competições):**
    `GET /matches` (Sem filtros, retorna o padrão de hoje/recente).
*   **Jogos da Champions League (CL):**
    `GET /competitions/CL/matches`
*   **Tabela da Eredivisie (DED):**
    `GET /competitions/DED/standings`

## 4. Códigos de Erro (Errors)

A API retorna mensagens JSON explicativas quando algo dá errado.
*   **400 Bad Request:** Filtro mal formatado ou tipo de dado errado.
*   **403 Restricted Resource:**
    *   O recurso existe, mas sua chave (Token) não tem permissão.
    *   Comum no "Free Tier" ao tentar acessar ligas pagas.
*   **404 Not Found:** O recurso (ID do jogo, time ou competição) não existe.
*   **429 Too Many Requests:** 🚨 **CRÍTICO**
    *   Você excedeu o limite de velocidade.
    *   Limite Grátis: ~10 requisições/minuto.
    *   Aguarde 60 segundos antes de tentar novamente.

## 5. Políticas da API (API Policies)

### Rate Limiting (Throttling)
*   **Clientes não autenticados:** Bloqueados a 10 reqs/dia (inútil).
*   **Token Grátis:** 10 reqs/minuto.
*   **Padrão (Pago):** 30 reqs/minuto ou mais.
*   **Dica:** Se receber um 429, pare imediatamente. Não faça "retries" agressivos.

### Tratamento de Dados
*   **Nulos (`null`):** Campos não disponíveis (ex: minutagem de um jogo que não começou) retornam `null`. O sistema deve estar pronto para isso.
*   **Timezone:** Tudo é retornado em **UTC**. O cliente (frontend) deve converter para o horário local do usuário.
*   **Rodada Atual (Current Matchday):** Calculada algoritmicamente. Se a diferença entre o último e o próximo jogo for > 60h, a rodada vira.

### Otimização (Automatic Folding)
Para economizar banda, a v4 esconde detalhes profundos por padrão (ex: escalações, gols individuais).
*   Para forçar a vinda desses dados, use Headers HTTP:
    *   `X-Unfold-Lineups: true`
    *   `X-Unfold-Goals: true`

## 6. Recurso: Pessoa (Person)
Representa Jogadores ou Técnicos. Útil para artilharia ou elencos.
*   **Endpoint:** `/persons/{id}`
*   **Sub-recurso:** `/persons/{id}/matches` (Jogos que a pessoa participou).

*(Fim da Referência Base)*

## 7. Tabelas de Referência (Lookup Tables)

Valores padronizados usados em toda a API. Use estes códigos exatos para filtros e comparações.

### Status do Jogo (`status`)
*   **Agendados:**
    *   `SCHEDULED`: Data e hora marcadas.
    *   `TIMED`: Sem data fixa ainda (TBD).
*   **Ao Vivo:**
    *   `IN_PLAY`: Jogo rolando (tempo normal).
    *   `PAUSED`: Intervalo.
    *   `EXTRA_TIME`: Prorrogação em andamento.
    *   `PENALTY_SHOOTOUT`: Pênaltis em andamento.
*   **Encerrados:**
    *   `FINISHED`: Acabou normalmente.
    *   `SUSPENDED`: Suspenso (pode ser retomado).
    *   `POSTPONED`: Adiado.
    *   `CANCELLED`: Cancelado.
    *   `AWARDED`: Vitória atribuída por W.O. ou decisão administrativa.

### Duração (`duration`)
*   `REGULAR`: 90 minutos.
*   `EXTRA_TIME`: Com prorrogação.
*   `PENALTY_SHOOTOUT`: Decidido nos pênaltis.

### Códigos de Ligas (League Codes)
Use estes códigos para filtrar `/matches?competitions={CODE}`.

*   **Mundial:** `WC` (Copa do Mundo)
*   **Europa:** `CL` (Champions League), `EC` (Eurocopa).
*   **Inglaterra:** `PL` (Premier League), `ELC` (Championship).
*   **Espanha:** `PD` (La Liga).
*   **Alemanha:** `BL1` (Bundesliga).
*   **Itália:** `SA` (Serie A).
*   **França:** `FL1` (Ligue 1).
*   **Portugal:** `PPL` (Primeira Liga).
*   **Brasil:** `BSA` (Brasileirão Série A).
*   **Holanda:** `DED` (Eredivisie).

---
**Fim da Documentação.**
Estes dados devem guiar qualquer lógica de `switch/case` no Sync Service para garantir integridade.
