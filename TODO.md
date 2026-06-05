# Backlog & Próximos Passos (Futebolão)

## 🛠️ Correções e Ajustes Críticos
- [ ] **Euro 2021:** Fazer a correção do histórico com calma, validando placares e pontuações consolidadas.

## 🏆 Melhorias de UX/UI (Gamificação)
- [ ] **Banner "SEGUE O LÍDER":** 
  - **O que é:** Quando um campeonato começar (cronômetro sumir do Dashboard), substituir a área por um banner dinâmico do líder atual.
  - **Texto Obrigatório:** Deve conter o bordão **"SEGUE O LÍDER"**.
  - **Design:** Criar algo visualmente luxuoso, mostrando a foto, nome e pontuação do primeiro colocado no ranking para estimular a rivalidade.

## 👻 Inteligência Artificial (Projeto "Loia Eterno")
- [ ] **Implementar IA Preditiva Gratuita:**
  - **Identidade:** Conta de usuário real para o Lindoaldo (Apelido: "Loia").
  - **Motor:** Google Gemini API (Tier Gratuito).
  - **Estrutura (Cron Job):**
    1. Criar um Endpoint `/api/cron/loia-predictions` rodando na Vercel diariamente.
    2. O script busca jogos agendados (`scheduled`) das próximas 24h/48h.
    3. O script puxa o Ranking Atual para saber a posição do Loia.
    4. Constrói um Prompt Inteligente injetando a personalidade dele:
       - **Preferências:** Ele prefere a Argentina ao Brasil.
       - **Estratégia de Risco:** Se ele for o Líder, a IA é instruída a jogar na segurança (placares lógicos e magros para proteger a liderança). Se ele estiver muito atrás, a IA é instruída a arriscar placares mais "zebras" ou elásticos para tentar "buchas" e subir na tabela.
    5. Envia esse contexto para a API do Gemini pedir a previsão.
    6. Insere o resultado na tabela `predictions` associado ao ID do Loia.
  - **Transparência e Trava (Regra de Ouro):**
    - Assim que a IA salvar o placar, o script é travado para nunca alterar aquela aposta.
    - O frontend será modificado para abrir uma **exceção de privacidade apenas para o Loia**: os palpites dele ficarão visíveis para todos os usuários imediatamente (antes mesmo do jogo começar), garantindo 100% de transparência. Os palpites dos usuários humanos continuam secretos até o apito inicial.
  - **Botão do Pânico (Kill Switch):**
    - Adicionar um botão dedicado nas configurações do campeonato: *"Ativar IA (Loia)"*.
    - Se a galera reclamar e der muito "choro", basta você desligar esse botão.
    - **O que acontece ao desligar:** A IA para de apostar, os palpites antigos do Loia desaparecem dos cards dos jogos e o nome dele some instantaneamente do Ranking. Tudo volta ao normal como se ele nunca tivesse participado.
