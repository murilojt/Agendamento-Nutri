# Próximos passos (ideias combinadas, ainda não feitas)

Lista viva do que foi conversado e fica para depois. Atualize conforme for feito.

## Fluxo da primeira consulta (descrito no texto "Como funcionam meus atendimentos?")

O texto da home promete o seguinte; o sistema ainda **não** tem isso:

1. **Informações de preparo após o agendamento**: como funciona a consulta, quais exames trazer, orientações para a avaliação física, pagamento e como solicitar remarcação.
2. **Questionário pré-consulta**: o paciente responde antes da primeira consulta para a nutricionista conhecer a saúde e os objetivos dele (a anamnese que já existe na ficha pode ser a base).
3. **Questionário de avaliação do atendimento** depois da consulta, com opção de resposta **anônima**.
4. **Pedido de remarcação pelo paciente**: hoje só a nutricionista remarca (em Consultas → Remarcar); o paciente avisa por mensagem.
5. **Contato pelo WhatsApp com prazo de resposta de até dois dias úteis**: hoje o contato é só por mensagens enviadas pela nutricionista na área do paciente.

Dependência: os itens 1, 2 e 3 precisam de **e-mail (SMTP)** para serem enviados sozinhos (ex.: Resend ou Brevo). Sem e-mail, dá para mostrar o conteúdo dentro da área do paciente.

## Outras ideias já listadas

- Convite por e-mail para o paciente criar a senha, e confirmação/lembrete de consulta por e-mail (etapa 3 do agendamento).
- Check-in diário da dieta, com a adesão da semana na ficha.
- Paciente registrar o próprio peso e medidas.
- Consultas completas na área do paciente (adicionar à agenda, histórico).
- Instalar como aplicativo no celular (PWA).
- Medidas caseiras também nos substitutos e na lista de marmitas.
- Lista de compras e marmitas com quantidade crua (exige fator de cozimento por alimento).
- Marcações da lista de compras sincronizadas entre aparelhos (hoje ficam só no aparelho).
