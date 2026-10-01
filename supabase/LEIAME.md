# Banco de dados (Supabase)

Rode os scripts **nesta ordem exata** no SQL Editor do Supabase (cada um é incremental):

1. `01-schema.sql`: perfis, dietas e refeições, com RLS.
2. `02-mensagens-e-push.sql`: mensagens da nutricionista para o paciente (cria a tabela `messages`).
3. `03-painel-da-nutricionista.sql`: permissões da nutricionista. Precisa vir depois do 02, que cria a tabela de mensagens.
4. `04-seguranca.sql`: impede o paciente de mudar o próprio `role`.
5. `05-agendamentos.sql`: e-mail no perfil e a tabela `appointments`, que liga cada consulta do site ao paciente.
6. `06-montador-de-dietas.sql`: alimentos, alimentos de cada refeição, refeições favoritas, anamnese, dados do paciente (peso, altura) e metas da dieta.
7. `08-categoria-dos-alimentos.sql`: categoria e favorito (★) dos alimentos. Sem ele tudo funciona, só que sem filtro por categoria e sem favoritos.
8. `07-alimentos-de-referencia.sql` (**opcional**, pode rodar em qualquer ponto depois do 06): 30 alimentos com valores **aproximados**, só para testar. Para uso real, importe a TACO em `/admin/alimentos` e apague estes.

Instalação nova: rode todos. Banco que já tinha 01 a 04 (do app e do painel antigos): rode o 05, o 06 e, se quiser testar, o 07. Banco que já está no ar com o 05: rode o 06 e o 08 (e o 07, se quiser testar).
