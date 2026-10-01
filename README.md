# Ayllus

Um único site Next.js com tudo da clínica: página pública, agendamento online, área do paciente e painel da nutricionista.
Next.js 16 + TypeScript + Zod + Supabase, com a identidade visual do brandbook Ayllus 2026.

## Páginas

| Rota | Quem usa | O que é |
|---|---|---|
| `/` | todos | página inicial da clínica |
| `/agendar` | todos | calendário do mês com horários livres e formulário de agendamento |
| `/entrar` | paciente e nutricionista | login único; cada um é levado à própria área |
| `/esqueci-senha`, `/redefinir-senha` | todos | recuperação de senha por e-mail |
| `/paciente` | paciente | dieta, mensagens da nutricionista e próximas consultas |
| `/admin` | nutricionista | lista de pacientes |
| `/admin/pacientes/novo` | nutricionista | cadastra paciente (cria o login dele) |
| `/admin/pacientes/[id]` | nutricionista | **montador de dietas**: refeições com alimentos e macros, protocolo e metas, análise de nutrientes, favoritas, lista de compras, anamnese, consultas e mensagens |
| `/admin/alimentos` | nutricionista | banco de alimentos: cadastro, edição e importação de CSV (TACO) |
| `/admin/consultas` | nutricionista | consultas marcadas pelo site, com o paciente vinculado |

## Como o agendamento se liga ao paciente

A **Google Agenda continua mandando na disponibilidade** (horários livres e ocupados). Quando alguém agenda:

1. O site descobre quem é o paciente: se a pessoa está logada, é ela; senão, procura um paciente com o mesmo e-mail do formulário.
2. O evento do Google nasce com o id do paciente em `extendedProperties.private.pacienteId`.
3. A consulta é gravada na tabela `appointments` do Supabase (`patient_id`, `google_event_id`, horário, contato).
4. Quem marca sem ter cadastro fica com `patient_id` vazio e aparece como "Sem cadastro no sistema" no painel.

Se o Supabase estiver fora do ar ou não configurado, o agendamento na Google Agenda funciona do mesmo jeito.

> **Quer colocar no ar? Siga [docs/COLOCAR-NO-AR.md](docs/COLOCAR-NO-AR.md).**

## Rodando localmente

```bash
cp .env.example .env.local
npm install
npm run dev     # http://localhost:3000
```

- Sem as variáveis do **Google** preenchidas, o site usa uma **agenda simulada** (em memória). Para a agenda real: [docs/configurar-google-agenda.md](docs/configurar-google-agenda.md).
- Sem as variáveis do **Supabase**, o site público e o agendamento funcionam; a área de contas mostra um aviso de que não foi configurada.

## Banco de dados (Supabase)

Rode os scripts de [`supabase/`](supabase/LEIAME.md) na ordem (01 a 06; o 07 é opcional, só para testes). Depois, para a sua conta virar nutricionista, siga o passo 2 de [docs/COLOCAR-NO-AR.md](docs/COLOCAR-NO-AR.md).

## Variáveis de ambiente

| Variável | Onde aparece | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_NOME_CLINICA` | site | não (padrão: Ayllus Nutrição) |
| `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID` | servidor | não (sem elas: agenda simulada) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador (chaves públicas) | para a área de contas |
| `SUPABASE_SECRET_KEY` | **só servidor** | para cadastrar pacientes, enviar mensagens e gravar consultas |

> `SUPABASE_SECRET_KEY` ignora todas as regras de acesso. Nunca coloque em arquivo versionado nem em variável `NEXT_PUBLIC_`.

## Publicar (Vercel, plano gratuito)

Passo a passo completo em [docs/COLOCAR-NO-AR.md](docs/COLOCAR-NO-AR.md). Resumo: importe o repositório na Vercel e cadastre as variáveis acima em **Settings → Environment Variables**. No Supabase, em **Authentication → URL Configuration**, adicione o endereço do site em *Site URL* e em *Redirect URLs* (`https://SEU-SITE/redefinir-senha`), senão o link de "esqueci a senha" não volta para cá.

## Estrutura

```
src/app/(site)/    site público (CSS próprio, tema Ayllus)
src/app/(conta)/   entrar, paciente, admin (Tailwind + os mesmos tokens da marca)
src/app/api/       agendamentos, disponibilidade, patients, send-message
src/styles/marca.css   tokens de cor, fontes e tema claro/escuro (compartilhado)
src/core/          regras da agenda e tipos (Zod); não depende do Next
src/lib/nutricao.ts   cálculos da dieta (macros, metas, lista de compras, CSV); testes em tests/ (npm test)
src/components/dieta/ telas do montador de dietas
src/lib/           Google Agenda, Supabase (cliente) e servidor/ (chave de serviço, só no servidor)
supabase/          scripts SQL
public/marca/      logotipo e isotipo em SVG
```

Horários de atendimento, duração da consulta, antecedência mínima e quantos dias à frente se pode agendar ficam em `src/core/config.ts`.

## API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/disponibilidade?mes=2026-10` | horários do mês, cada um com `livre: true/false` |
| POST | `/api/agendamentos` | `{ inicio, nome, sobrenome, celular, email }` cria o evento; com `Authorization: Bearer <token>` vincula ao paciente logado |
| POST | `/api/patients` | nutricionista cria paciente |
| POST | `/api/send-message` | nutricionista envia mensagem (e push, se o paciente tiver token) |
