# Ayllus Agendamentos

Site da clínica com agendamento online integrado ao Google Agenda da nutricionista.
Next.js + TypeScript + Zod.

## Páginas
- `/` — página inicial com informações da clínica (textos fictícios em `src/app/page.tsx`)
- `/agendar` — calendário do mês com horários livres e preenchidos + formulário

## Rodando localmente
```bash
cp .env.example .env
npm install
npm run dev     # http://localhost:3000
```
Sem as variáveis do Google preenchidas, o site roda com uma **agenda simulada** (em memória) para testes.
Para conectar à agenda real, siga [docs/configurar-google-agenda.md](docs/configurar-google-agenda.md).

## Ajustes rápidos
Horários de atendimento, duração da consulta, antecedência mínima e quantos dias à frente
podem ser agendados ficam em `src/core/config.ts`.

## Estrutura pensada para unir com o app Expo e o painel
- `src/core/` — regras da agenda, tipos (Zod) e cliente da API. Não depende de Next.js:
  pode ser copiado para o app ou virar um pacote compartilhado.
- `src/lib/calendario.ts` — integração com o Google Agenda.
- `src/app/api/` — API usada pelo site (e, no futuro, pelo app):

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/disponibilidade?mes=2026-10` | Horários do mês, cada um com `livre: true/false` |
| POST | `/api/agendamentos` | `{ inicio, nome, sobrenome, celular, email }` → cria o evento na agenda |
