# Conectar o site ao Google Agenda da nutricionista

Feito uma única vez. Leva uns 15 minutos.

## 1. Criar o projeto no Google Cloud
1. Acesse https://console.cloud.google.com e crie um projeto (ex.: `allyus-agendamentos`).
2. Em **APIs e serviços > Biblioteca**, procure **Google Calendar API** e clique em **Ativar**.

## 2. Criar a conta de serviço (o "robô" que escreve na agenda)
1. Em **IAM e administrador > Contas de serviço**, clique em **Criar conta de serviço**.
2. Dê um nome (ex.: `agendamentos-site`) e conclua. Não precisa dar papéis.
3. Abra a conta criada > aba **Chaves** > **Adicionar chave > Criar nova chave > JSON**.
   Um arquivo `.json` será baixado. **Guarde-o com cuidado e nunca suba para o GitHub.**

## 3. Compartilhar a agenda com a conta de serviço
1. No Google Agenda da nutricionista, passe o mouse na agenda > **⋮ > Configurações e compartilhamento**.
2. Em **Compartilhar com pessoas específicas**, adicione o e-mail da conta de serviço
   (algo como `agendamentos-site@allyus-agendamentos.iam.gserviceaccount.com`)
   com a permissão **Fazer alterações nos eventos**.
3. Na mesma página, em **Integrar agenda**, copie o **ID da agenda**
   (para a agenda principal, é o próprio e-mail da nutricionista).

## 4. Preencher as variáveis
Na Vercel, cadastre-as em **Settings → Environment Variables** (veja [COLOCAR-NO-AR.md](COLOCAR-NO-AR.md)). Para rodar no seu computador, copie `.env.example` para `.env.local` e preencha com os dados do JSON baixado:

```
GOOGLE_CLIENT_EMAIL=<campo "client_email" do JSON>
GOOGLE_PRIVATE_KEY="<campo "private_key" do JSON, entre aspas, mantendo os \n>"
GOOGLE_CALENDAR_ID=<ID da agenda do passo 3>
```

No computador, reinicie o `npm run dev`; na Vercel, faça um **Redeploy**. Pronto: os horários passam a vir da agenda real.

## Como o bloqueio de horários funciona
- O calendário do site consulta a agenda (horários livres/ocupados) e se atualiza sozinho a cada 30 segundos.
- Qualquer compromisso na agenda da nutricionista, inclusive pessoal, aparece como **Preenchido** no site.
- Antes de salvar, o site confere de novo se o horário está livre.
- Cada horário gera sempre o mesmo id de evento no Google. Se duas pessoas enviarem ao mesmo tempo,
  o Google aceita só a primeira, e a segunda recebe "Esse horário acabou de ser preenchido".
- Se a nutricionista cancelar a consulta no Google Agenda, o horário volta a ficar livre no site.
