# Configuração do Google OAuth

Para ativar o login com Google no seu projeto Supabase, você precisa criar um projeto no **Google Cloud Console** e obter as credenciais (Client ID e Client Secret).

## Passo 1: Criar Projeto no Google Cloud
1.  Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2.  Faça login com sua conta Google (de preferência a mesma do Supabase/Vercel).
3.  No topo da página, ao lado do logo "Google Cloud", clique no seletor de projetos.
4.  Clique em **"New Project"** (Novo Projeto).
5.  Nome do projeto: `Futebaolao` (ou o que preferir).
6.  Clique em **Create**.

## Passo 2: Configurar a Tela de Consentimento (OAuth Consent Screen)
1.  No menu lateral esquerdo, vá em **APIs & Services** > **OAuth consent screen**.
2.  Selecione **External** (Externo) e clique em **Create**.
3.  Preencha as informações obrigatórias:
    *   **App Name:** FuteBolão
    *   **User Support Email:** Seu e-mail.
    *   **Developer Contact Information:** Seu e-mail novamente.
4.  Clique em **Save and Continue** (pode pular as etapas de Escopos e Usuários de Teste por enquanto).
5.  No final, clique em **Back to Dashboard**.

## Passo 3: Criar as Credenciais (Client ID e Secret)
1.  No menu lateral esquerdo, clique em **Credentials**.
2.  Clique em **+ CREATE CREDENTIALS** (no topo) > **OAuth client ID**.
3.  Em **Application type**, selecione **Web application**.
4.  Em **Name**, coloque algo como `Supabase Auth`.
5.  Agora a parte crucial: **Authorized redirect URIs**.
    *   Clique em **+ ADD URI**.
    *   Você precisa pegar essa URL no seu painel do Supabase:
        1.  Vá no Supabase > Authentication > Providers > Google.
        2.  Copie a **Callback URL (for OAuth)** (algo como `https://<seu-projeto>.supabase.co/auth/v1/callback`).
    *   Cole essa URL no campo do Google Cloud.
6.  Clique em **Create**.

## Passo 4: Copiar e Colar no Supabase
1.  Uma janela vai abrir com o **Your Client ID** e **Your Client Secret**.
2.  Copie esses dois valores.
3.  Volte no painel do Supabase (Authentication > Providers > Google).
4.  Cole nos campos respectivos.
5.  Ative a opção **Enable Google**.
6.  Clique em **Save**.

Pronto! Agora o login deve funcionar.
