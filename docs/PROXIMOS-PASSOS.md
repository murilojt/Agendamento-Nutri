# Próximos passos (ideias combinadas, ainda não feitas)

Lista viva do que foi conversado e fica para depois. Atualize conforme for feito.

## Anotados para executar em seguida

1. **Link da videochamada nas consultas online**: campo para a nutricionista colar o link (por consulta, ou um link fixo da clínica) e mostrar ao paciente em **Minhas consultas**. Hoje a página só diz "Consulta online".
2. **Questionário e orientações antes da primeira consulta**, dentro da área do paciente (sem e-mail por enquanto):
   - questionário pré-consulta, com a anamnese que já existe na ficha como base, para a nutricionista ver na ficha;
   - orientações para a consulta (como funciona, exames a trazer, avaliação física, pagamento e remarcação), escritas uma vez pela nutricionista e exibidas ao paciente que tem consulta marcada.

3. **Acompanhamento diário personalizado para casos específicos** (ideia da nutricionista): quando o paciente tem uma condição específica (por exemplo, pós-cirurgia bariátrica), a nutricionista monta um **acompanhamento diário sob medida** que o paciente preenche na área dele. Pontos combinados:
   - **Metas do dia definidas por ela**, por paciente: por exemplo, X copos de água, e o paciente marca quantos tomou.
   - **Refeições**: o paciente marca se fez cada refeição do plano.
   - **Questionário diário de como está se sentindo**: enjoo, cansaço, fome etc.
   - A nutricionista **escolhe quais itens valem para cada paciente**, e não é igual para todos.
   - Ela vê o **resumo na ficha** (dias preenchidos, tendência de sintomas, adesão), para decidir ajustes.
   - A ideia do **check-in diário da dieta** (abaixo, em "Outras ideias") faz parte deste mesmo recurso e deve ser construída junto.
   - Perguntas em aberto para quando formos fazer: modelos prontos por condição (bariátrica, diabetes etc.) ou tudo montado do zero; se o paciente recebe lembrete (depende de e-mail/notificação); e sintomas que indiquem alerta (por exemplo, enjoo forte repetido) devem avisar a nutricionista.

## Fluxo da primeira consulta (descrito no texto "Como funcionam meus atendimentos?")

O texto da home promete o seguinte; o sistema ainda **não** tem isso:

1. **Informações de preparo após o agendamento**: como funciona a consulta, quais exames trazer, orientações para a avaliação física, pagamento e como solicitar remarcação.
2. **Questionário pré-consulta**: o paciente responde antes da primeira consulta para a nutricionista conhecer a saúde e os objetivos dele (a anamnese que já existe na ficha pode ser a base).
3. **Questionário de avaliação do atendimento** depois da consulta, com opção de resposta **anônima**.
4. ~~Pedido de remarcação pelo paciente~~ (feito: ver passo 8j do guia de implantação).
5. ~~Escolha da modalidade ao agendar~~ (feito). Falta, para consultas online, um campo com o link da videochamada.
6. **Contato pelo WhatsApp com prazo de resposta de até dois dias úteis**: hoje o contato é só por mensagens enviadas pela nutricionista na área do paciente.

Dependência: os itens 1, 2 e 3 precisam de **e-mail (SMTP)** para serem enviados sozinhos (ex.: Resend ou Brevo). Sem e-mail, dá para mostrar o conteúdo dentro da área do paciente.

## Outras ideias já listadas

- Convite por e-mail para o paciente criar a senha, e confirmação/lembrete de consulta por e-mail (etapa 3 do agendamento).
- Check-in diário da dieta, com a adesão da semana na ficha (será construído junto com o acompanhamento diário personalizado, item 3 acima).
- Paciente registrar o próprio peso e medidas.
- Consultas completas na área do paciente (adicionar à agenda, histórico).
- Instalar como aplicativo no celular (PWA).
- Medidas caseiras também nos substitutos e na lista de marmitas.
- Lista de compras e marmitas com quantidade crua (exige fator de cozimento por alimento).
- Marcações da lista de compras sincronizadas entre aparelhos (hoje ficam só no aparelho).
