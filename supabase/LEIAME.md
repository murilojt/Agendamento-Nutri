# Banco de dados (Supabase)

Rode os scripts **nesta ordem exata** no SQL Editor do Supabase (cada um é incremental):

1. `01-schema.sql`: perfis, dietas e refeições, com RLS.
2. `02-mensagens-e-push.sql`: mensagens da nutricionista para o paciente (cria a tabela `messages`).
3. `03-painel-da-nutricionista.sql`: permissões da nutricionista. Precisa vir depois do 02, que cria a tabela de mensagens.
4. `04-seguranca.sql`: impede o paciente de mudar o próprio `role`.
5. `05-agendamentos.sql`: e-mail no perfil e a tabela `appointments`, que liga cada consulta do site ao paciente.

Instalação nova: rode todos. Banco que já tinha 01 a 04 (do app e do painel antigos): rode só o 05.
