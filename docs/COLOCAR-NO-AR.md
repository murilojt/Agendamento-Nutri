# Passo a passo para colocar o site no ar (de graça)

Faça na ordem. Tempo total: cerca de 1 hora na primeira vez. Você vai precisar de contas gratuitas no **Supabase**, no **Google Cloud** e na **Vercel** (entre na Vercel com o seu GitHub).

> Dica: abra um bloco de notas e vá colando lá os valores que cada passo mostra (URL, chaves, ID da agenda). Você vai usá-los no passo 4.

---

## Passo 1. Banco de dados (Supabase)

1. Entre em https://supabase.com, clique em **Start your project** e crie uma conta.
2. **New project**: escolha um nome (ex.: `ayllus`), crie uma **senha do banco** (guarde) e a região **South America (São Paulo)**. Aguarde uns 2 minutos.
3. No menu da esquerda, abra **SQL Editor**. Para cada arquivo da pasta `supabase/` deste repositório, **na ordem 01, 02, 03, 04, 05**:
   - clique em **New query**, cole o conteúdo do arquivo e clique em **Run**;
   - deve aparecer "Success". Se um deles der erro, pare e me mande a mensagem.
   - A ordem importa: o `03` depende de uma tabela criada no `02`. Rodar fora de ordem dá erro.
   - Os comentários (`--`) no final dos arquivos podem ser ignorados; a promoção da conta da nutricionista é feita no passo 2.
4. Copie as 3 chaves, em **Project Settings → API** (ou **API Keys**):
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **anon / publishable key** (pública)
   - **service_role / secret key** (secreta, clique em "Reveal")

   > A chave secreta ignora todas as regras de acesso. Nunca envie por e-mail, WhatsApp nem GitHub.

> **Já tem o site no ar e só está atualizando?** Rode apenas o `06-montador-de-dietas.sql` (e, se quiser testar, o `07-alimentos-de-referencia.sql`) e faça um Redeploy. Sem o 06, a ficha do paciente mostra um aviso de erro.

## Passo 2. Criar a conta da nutricionista

1. No Supabase: **Authentication → Users → Add user → Create new user**.
2. Informe o e-mail e uma senha da nutricionista e marque **Auto Confirm User**. Clique em **Create user**.
3. Volte ao **SQL Editor**, cole e rode (troque o e-mail e o nome):

```sql
update public.profiles
set role = 'nutritionist', full_name = 'Dra. Nome Sobrenome'
where id = (select id from auth.users where email = 'email-da-nutricionista@exemplo.com');
```

Deve aparecer "Success. 1 row affected". Se aparecer 0 rows, o e-mail está diferente do cadastrado.

## Passo 3. Google Agenda (opcional agora)

Sem isso o site roda com uma **agenda de teste**: os agendamentos somem quando o servidor reinicia. Antes de divulgar o site para pacientes, faça este passo.

Siga o arquivo [`configurar-google-agenda.md`](configurar-google-agenda.md) até o passo 3. Ao final você terá:
- o **e-mail da conta de serviço** (`GOOGLE_CLIENT_EMAIL`);
- a **chave privada** do arquivo JSON baixado (`GOOGLE_PRIVATE_KEY`);
- o **ID da agenda** (`GOOGLE_CALENDAR_ID`).

## Passo 4. Publicar na Vercel

1. Entre em https://vercel.com com o GitHub e clique em **Add New → Project**.
2. Escolha o repositório **Agendamento-Nutri** e clique em **Import**. A Vercel reconhece o Next.js sozinha, não mude nada no build.
3. Abra **Environment Variables** e cadastre (um por vez, nome e valor):

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_NOME_CLINICA` | `Ayllus Nutrição` |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do passo 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key do passo 1 |
| `SUPABASE_SECRET_KEY` | service_role / secret key do passo 1 |
| `GOOGLE_CLIENT_EMAIL` | do passo 3 |
| `GOOGLE_PRIVATE_KEY` | do passo 3, entre aspas, mantendo os `\n` |
| `GOOGLE_CALENDAR_ID` | do passo 3 |

   As três do Google podem ficar de fora por enquanto (agenda de teste).
4. Clique em **Deploy**. Em cerca de 1 minuto sai o endereço, algo como `agendamento-nutri.vercel.app`. Anote.

## Passo 5. Avisar o Supabase qual é o endereço do site

Sem isso, o e-mail de "esqueci minha senha" não volta para o seu site.

1. No Supabase: **Authentication → URL Configuration**.
2. **Site URL**: `https://SEU-ENDERECO.vercel.app`
3. **Redirect URLs → Add URL**: `https://SEU-ENDERECO.vercel.app/redefinir-senha`
4. **Save**.

## Passo 6. Testar (5 minutos)

1. Abra o site, clique em **Agendar consulta**, escolha um horário e confirme. Deve aparecer "Consulta marcada".
2. Clique no ícone de pessoa no topo e entre com a conta da nutricionista. Você deve cair em **/admin**.
3. **Novo paciente**: cadastre um paciente de teste (e-mail, senha provisória). Abra a ficha dele, preencha **Editar dados** (peso e altura), clique em **Criar dieta**, defina o **Protocolo nutricional** e monte uma refeição com alimentos.
4. Saia, entre com o paciente de teste e confira se aparecem a dieta e a mensagem. Se enviou uma mensagem pela ficha, ela aparece em **/paciente**.
5. Agende com o e-mail do paciente de teste e confira, em **/admin → Consultas**, se a consulta aparece ligada a ele ("Paciente: ...").
6. Na ficha do paciente com a dieta montada, clique em **Exportar PDF**, escolha o conteúdo e **Gerar PDF**. O arquivo baixa na hora, com o logo e as cores da Ayllus.
7. Teste **Esqueci minha senha** com o e-mail do paciente de teste.

## Passo 7. Banco de alimentos (antes de atender pacientes de verdade)

O montador de dietas calcula tudo a partir do banco de alimentos (valores por 100 g). Os 30 alimentos do script `07` são **aproximados e só servem para testar**.

**Rode também o `08-categoria-dos-alimentos.sql`** (categoria e favoritos).

Você pode importar tabelas oficiais em **Alimentos → Importar tabela de alimentos**:

| Tabela | Arquivo | Observação |
|---|---|---|
| **TBCA** (USP) | `.txt` ou `.json`, um alimento por linha (`codigo`, `classe`, `descricao`, `nutrientes`) | Usa **energia em kcal** e **carboidrato total** (como a TACO); a fibra fica separada. |
| **TACO** (Unicamp) | `.csv` da planilha completa ou simples | Usa *Descrição dos alimentos*, *Energia (kcal)*, *Proteína*, *Lipídeos*, *Carboidrato*, *Fibra* e *Categoria*. |

Como importar:
1. Escolha o arquivo. O sistema mostra uma **prévia**: quantos alimentos, quantas categorias, avisos (nomes repetidos, valores impossíveis) e as categorias com a contagem de cada uma.
2. Marque **só as categorias que você usa**. O botão **Só alimentos do dia a dia** deixa de fora "Alimentos para fins especiais", "industrializados", "fast food" e similares. A TBCA tem mais de 5.600 itens, e a maioria são preparações específicas.
3. Clique em **Importar**. "Tr", "NA" e vazio viram zero. Nomes que já existem são ignorados.
4. Se a importação saiu errada, use **Apagar os N importados da TBCA/TACO (refazer importação)** e importe de novo.
5. Alimentos de referência (script `07`) com o mesmo nome de um importado fazem o importado ser ignorado. **Apague a referência antes de importar.**

**Deixe a busca do jeito que você usa (leva 10 minutos):** a TBCA tem dezenas de variações de "arroz" e "feijão". Em **Alimentos**, busque o que você usa no dia a dia e marque com **★**. Na hora de montar a dieta, os **favoritos** aparecem primeiro na busca, depois os **mais usados** nas suas dietas, e só então os demais. Você também pode **Editar** qualquer alimento para dar um nome mais curto (por exemplo, "Arroz integral cozido").

Alimentos que não estão em nenhuma tabela (marcas, receitas) você cadastra à mão em **+ Novo alimento**. Confira os termos de uso da TACO e da TBCA antes de importar.

## Passo 8. Assinatura e rodapé do PDF

1. No Supabase, rode **`09-assinatura-e-rodape-do-pdf.sql`**.
2. No painel, abra **Assinatura e PDF** (menu lateral).
3. Clique em **Escolher imagem** e envie a assinatura (PNG, JPG ou WebP; fundo branco ou transparente). Ela é reduzida automaticamente.
4. Confira os dados do rodapé (já vêm preenchidos com o padrão da clínica: *Clínica Ayllus | Nutricionista Mariana Fernandes*, CRN, telefone e e-mail) e clique em **Salvar**.

No PDF da dieta, em **todas as páginas**, o texto da clínica sai no canto inferior esquerdo e a assinatura no canto inferior direito. Cada nutricionista tem a própria assinatura e os próprios dados.

## Passo 9. Segurança (não pule)

- O repositório antigo **Ayllus-admin** tem a chave secreta do Supabase no histórico. No Supabase, vá em **Project Settings → API** e **gere uma nova chave secreta** (revogando a antiga). Se você criou o projeto novo no passo 1, a chave de lá é nova e só vale a regra: nunca versionar.
- Se algum repositório for público, torne-o privado (GitHub → Settings → Danger Zone → Change visibility).
- Nunca cole `.env` ou chaves no GitHub.

---

## Mudou uma variável na Vercel e nada aconteceu?

As variáveis só valem no próximo deploy: **Deployments → ⋯ no último → Redeploy**.

## Domínio próprio (opcional)

Na Vercel: **Settings → Domains → Add**, digite o domínio (ex.: `ayllus.com.br`) e siga as instruções de DNS. Depois troque o endereço no **passo 5**.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "A área de contas ainda não foi configurada" | faltam `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` na Vercel (ou falta redeploy) |
| Entra no painel mas volta para a área do paciente | a conta ainda não foi promovida (passo 2, comando SQL) |
| "Não foi possível carregar as consultas" no painel | o script `05` não foi rodado |
| Não consegue cadastrar paciente / "servidor sem Supabase" | falta `SUPABASE_SECRET_KEY` na Vercel |
| Horários não aparecem como ocupados na agenda real | o passo 3 não foi concluído, ou a agenda não foi compartilhada com a conta de serviço |
| O link do e-mail de senha abre erro | o passo 5 não foi feito |
| Os e-mails de recuperação demoram ou caem no spam | o Supabase gratuito limita e-mails; para uso real, configure um SMTP próprio em **Authentication → SMTP Settings** |
