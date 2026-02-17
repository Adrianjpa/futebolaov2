# Regra de Ouro: Prioridade de Bandeiras (Highlander)

Esta documentação descreve a lógica **IMUTÁVEL** para o destaque de bandeiras de seleções nos Cards de Jogo e na Página de Ranking.

## 1. Princípio Fundamental
O sistema deve destacar **apenas** o(s) usuário(s) que fez(izeram) a "melhor escolha possível", baseada estritamente na hierarquia do Ranking Oficial definido pelo Admin.

## 2. Algoritmo de Decisão

O algoritmo segue os seguintes passos rigorosos:

1.  **Iteração Oficial:** O sistema percorre a lista de classificação oficial definida pelo Admin, do 1º ao último lugar.
2.  **Busca pelo Primeiro Time com Palpites (Trava):**
    *   Para cada time na ordem oficial (ex: 1º Espanha, 2º Itália...), o sistema verifica: *"Algum usuário apostou neste time em QUALQUER uma das suas 3 opções?"*
    *   **Se SIM:** Este time é declarado o **Time Vencedor da Rodada**. O sistema **PARA** imediatamente de verificar os times seguintes do ranking oficial (ex: se achou apostas na Espanha [1º], a Itália [2º] é irrelevante para fins de destaque principal).
    *   **Se NÃO:** O sistema avança para o próximo time do ranking oficial.
3.  **Filtro de Prioridade do Usuário:**
    *   Considerando *apenas* os usuários que apostaram no **Time Vencedor da Rodada**:
    *   O sistema identifica qual foi a **Melhor Prioridade** utilizada (1ª Opção > 2ª Opção > 3ª Opção).
    *   *Exemplo:* Se João escolheu Espanha na Opção 1 e Maria escolheu Espanha na Opção 2 -> A "Melhor Prioridade" é a Opção 1.
4.  **Definição dos Vencedores Absolutos:**
    *   São destacados **APENAS** os usuários que combinaram:
        *   O **Time Vencedor da Rodada**
        *   Na **Melhor Prioridade Identificada**
    *   Todos os outros palpites (incluindo apostas no mesmo time em prioriodades inferiores) são visualmente ofuscados (dimmed/grayscale).

## 3. Exemplo Prático

**Cenário:**
*   **Ranking Oficial:** 1º Espanha, 2º Itália.
*   **Usuário A:** 1. Itália, 2. Alemanha, 3. França.
*   **Usuário B:** 1. Brasil, 2. Espanha, 3. Argentina.
*   **Usuário C:** 1. Espanha, 2. Brasil, 3. Holanda.

**Execução:**
1.  Sistema olha o 1º Oficial: **Espanha**.
2.  Alguém apostou na Espanha? **Sim** (Usuário B e Usuário C). -> **Espanha é o Time Vencedor. Itália é ignorada.**
3.  Dentre B e C, qual a melhor prioridade?
    *   Usuário B: Opção 2.
    *   Usuário C: Opção 1.
    *   **Vencedor:** Opção 1 (Menor índice).
4.  **Resultado:**
    *   **Usuário C** (Espanha na Opção 1): **DESTACADO (Líder Absoluto)**.
    *   Usuário B (Espanha na Opção 2): Ofuscado (Superado pela hierarquia).
    *   Usuário A (Itália na Opção 1): Ofuscado (Itália nem foi considerada pois a Espanha já "venceu" a rodada).

---
**NOTA:** Esta lógica não deve ser alterada a menos que explicitamente solicitado para implementar regras opcionais de desempate.