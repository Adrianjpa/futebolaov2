# 🚀 Guia de Migração: Firebase -> Supabase (FuteBolão v2)

Este documento serve como um "testamento técnico" para o Agente de IA que assumirá a refatoração deste projeto.

## 📋 Contexto
Este projeto é um clone exato do `FuteBolão Pro` (originalmente em Firebase). O objetivo desta nova versão (`futbolao-supabase`) é migrar TOTALMENTE o backend para **Supabase (PostgreSQL)** para resolver problemas de escalabilidade e custos de leitura.

## 🎯 Objetivos Principais
1.  **Auth**: Trocar Firebase Auth por **Supabase Auth**.
2.  **Database**: Migrar Firestore (NoSQL) para **PostgreSQL**.
3.  **Performance**: Substituir cálculos manuais de Ranking (JS) por **Views/Queries SQL**.

## 🏗️ Estrutura de Dados Atual (Firestore) -> Para (SQL)
O banco atual usa as seguintes coleções principais. Elas devem virar Tabelas:

| Coleção Firestore | Sugestão Tabela SQL | Obs |
| :--- | :--- | :--- |
| `users` | `profiles` | Vinculada à tabela `auth.users` do Supabase. |
| `championships` | `championships` | `id`, `name`, `status` ('ativo', 'finalizado'), `legacy_import`. |
| `matches` | `matches` | `round`, `date`, `status`, `home_team`, `away_team`, `score_home`, `score_away`. |
| `predictions` | `predictions` | `user_id`, `match_id`, `home_score`, `away_score`, `points` (calculado). |
| `legacy_history` | `legacy_stats` | Tabelão de histórico estático (Euro 2012, etc). |

## 🧠 Lógica de Ranking (O Pulo do Gato)
**HOJE (Firebase):** O código frontend lê todos os palpites, soma pontos na memória ou lê campos desnormalizados. Ineficiente.
**NOVO (Supabase):**
- Criar uma **VIEW** ou **Materialized View** chamada `ranking_live`.
- A query deve agrupar `predictions` por `user_id` e somar pontos.
- O frontend apenas faz `select * from ranking_live order by points desc`.

## 🔄 Cron & Updates
- O projeto usa `cron-job.org` chamando endpoints de API (`/api/cron/...`).
- Manter essa lógica, mas a API deve fazer `UPDATE` no SQL em vez de `setDoc` no Firestore.
- Verificar a possibilidade de usar **pg_cron** nativo do Supabase se simplificar.

## 🛡️ Segurança (RLS)
- Habilitar **Row Level Security (RLS)** em todas as tabelas.
- `profiles`: Público para leitura (rankings), restrito para edição (apenas o dono).
- `matches`: Público para leitura, Admin para escrita.
- `predictions`: Usuário vê todos (para ranking) mas só edita o seu. **IMPORTANTE:** Bloquear edição após o início do jogo (usar Trigger ou RLS com check de data).

## ⚠️ Pontos de Atenção
1.  **Imagens:** Atualmente hospedadas no Firebase Storage? Se sim, migrar para **Supabase Storage** (Buckets).
2.  **Admin:** A flag de admin hoje é um campo string `funcao: 'admin'` no documento do usuário. Manter ou usar Claims do Supabase.

---
**Boa sorte, Agente! Transforme esse Fusca num Tanque de Guerra!** 🚜💨
