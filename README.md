# English for ALL — banco de questões de inglês

Site de questões de inglês de vestibular e ENEM, com gabarito comentado, guia de
gramática por nível CEFR, montador de provas em PDF/Word e simulado oficial
semanal para alunos cadastrados.

No ar em **https://ingles.destruitor.com.br**

---

## Para quem chega agora (ou volta depois de um tempo)

Estes três arquivos, juntos, contam a história inteira do projeto. Leia nesta ordem:

| arquivo | o que responde |
|---|---|
| **`README.md`** (este) | o que o projeto é, como rodar, como está organizado |
| **`ESTADO-CURADORIA.md`** | em que pé está a revisão do acervo e como se roda um lote |
| **`PADRAO-EDITORIAL.md`** | **por que** cada decisão editorial foi tomada — 14 seções, com os casos concretos |

O `PADRAO-EDITORIAL.md` é o mais importante dos três. Ele não é um manual de
estilo genérico: cada regra ali nasceu de um defeito real encontrado no acervo, e
está registrada com a questão que a motivou. Antes de "corrigir" qualquer coisa
que pareça errada, procure ali — há boa chance de já ter sido analisada e a
aparência de erro ser intencional.

---

## O que existe hoje

**Acervo: 1.063 questões, 1.053 publicadas.** Provas do ENEM, Fuvest, ITA, PUC
Minas, vestibulares de medicina e simulados próprios, mais duas coleções autorais
(`reading` e `use-of-english`). Cada questão tem texto-base, alternativas,
gabarito e comentário explicando por que cada distrator cai.

**A curadoria terminou.** As 1.063 questões passaram, uma a uma, por 33 lotes de
revisão. O que foi encontrado e corrigido está no `PADRAO-EDITORIAL.md`; o
resumo do percurso, no `ESTADO-CURADORIA.md`.

### Funcionalidades

- **Banco público** (`/questoes`, `/medicina`, `/reading`, `/use-of-english`) —
  navegação livre com filtros por nível, tema, tipo, prova e ano.
- **Guia de gramática** (`/gramatica`) e **exercícios** (`/exercicios`), A1 a C2.
- **Montador de provas** (`/prova`) — seleção de questões e exportação em PDF e
  DOCX, com cabeçalho da escola e folha de gabarito. Exige conta.
- **Simulado oficial semanal** (`/simulado`) — cinco questões por semana,
  sorteadas por usuário. Exige conta. Detalhado abaixo.
- **Painel do professor** (`/admin`) — cadastro de questões, acompanhamento dos
  alunos, lista de e-mails capturados.

---

## Simulado oficial semanal

É um modo **separado** do treino livre. As questões que o aluno responde
navegando pelo banco não contam para nada: só o simulado oficial entra no
histórico e no desempenho.

**Como funciona**

- Cinco questões por semana, sorteadas individualmente para cada usuário.
- Só de **ENEM e vestibulares de medicina**, sem itens de gramática e sem as
  coleções autorais (que são justamente o material de Use of English).
- Prioriza o que o aluno nunca viu. Com 110 questões elegíveis, são 22 semanas
  sem repetir.
- **Sem correção na hora**: nada de gabarito, comentário ou indicação de acerto
  durante o simulado.
- **O gabarito comentado abre 24 horas depois** da conclusão.
- Uma resposta enviada **não muda mais**.

**Onde as regras são garantidas de verdade** (e não só prometidas na interface):

- Dois simulados na mesma semana são impedidos pelo `UNIQUE (usuario_id, semana)`
  do banco, não só pela checagem em código — duas abas abertas não furam.
- Antes das 24 horas o servidor **nem carrega** gabarito e comentário do banco:
  o que não é enviado não pode ser lido no HTML.
- O prazo é calculado com o `datetime` do SQLite. Mudar o relógio do aparelho
  não adianta.
- Toda rota confere o dono antes de responder: simulado de outro usuário dá 404.
- Simulado inacabado nunca é substituído, mesmo virando a semana.

**Desempenho.** Média, melhor e pior resultado, variação do último, sequência de
melhora ou queda, e aproveitamento por tema, nível e tipo — com gráficos em SVG
inline, sem biblioteca externa. Cada recorte só aparece a partir de **três**
questões respondidas nele: abaixo disso o percentual descreve o sorteio, não o
aluno.

**Painel do professor.** Em `/admin/usuarios`, uma linha por aluno com
instituição, simulados concluídos, média, última nota e data do último. A ficha
individual traz o gráfico de evolução e cada simulado aberto questão a questão —
o que o aluno marcou, a correta, se acertou. O professor vê a correção **sem
esperar as 24 horas**: o prazo existe para o aluno não conferir o gabarito na
hora, não para escondê-lo de quem corrige.

---

## Rodando o projeto

```bash
npm install
cp .env.example .env     # e preencha as variáveis
npm run senha "sua senha do painel"   # gera o hash para ADMIN_SENHA_HASH
npm start                # http://127.0.0.1:8098
```

`npm run dev` sobe com `--watch`.

### Variáveis do `.env`

| variável | para quê |
|---|---|
| `PORT` | porta do servidor (padrão 8098) |
| `SITE_URL` | URL pública, usada em canonical, sitemap e Open Graph |
| `SESSION_SECRET` | segredo do cookie de sessão |
| `ADMIN_SENHA_HASH` | hash bcrypt da senha do painel — gere com `npm run senha` |
| `DB_PATH` | caminho do banco (padrão `dados/banco.db`) |
| `SESSIONS_PATH` | caminho das sessões (padrão `dados/sessoes.db`) |
| `NODE_ENV` | `production` liga o cookie `secure` |

### Pilha

Node + Express 5, EJS, SQLite via `better-sqlite3`, sessão em SQLite
(`better-sqlite3-session-store`), bcrypt, `pdfkit` e `docx` para exportação. Sem
build, sem framework de front: CSS e JS servidos direto de `public/`.

---

## Como o código está organizado

```
src/
  server.js              rotas, sessão, middlewares globais
  db/
    schema.sql           todas as tabelas (idempotente, roda a cada boot)
    index.js             consultas e escrita; migrações de coluna no topo
  routes/
    publico.js           páginas abertas: acervo, coleções, sitemap, robots
    conta.js             cadastro, login e logout do aluno
    simulado.js          simulado, histórico e desempenho (exige login)
    prova.js             montador de provas (exige login)
    admin.js             painel (senha própria)
    exercicios.js        testes de gramática
  lib/
    simulado.js          geração semanal, resposta, prazo de 24 h
    desempenho.js        estatísticas do aluno e visão da turma
    realce.js            marcação [[trecho]] -> <u>, com escape antes
    medicina.js          quais instituições contam como vestibular de medicina
    menu.js              contagens do menu, com cache curto
    colecoes.js          reading e use-of-english
    gramatica.js         conteúdo do guia
    redirecionamentos.js slugs de duplicatas -> a versão que ficou (301)
    prova-pdf.js         exportação em PDF
    prova-docx.js        exportação em Word
views/                   EJS: publico/, admin/, partials/
public/                  css, js, img, uploads
scripts/                 verificadores e utilitários (ver abaixo)
conteudo/                fonte do guia de gramática e das coleções
dados/                   banco.db, sessoes.db e backups (fora do git)
```

### Detalhes que economizam tempo

- **`schema.sql` roda a cada boot**, com `CREATE TABLE IF NOT EXISTS`. Colunas
  novas em tabelas antigas vão no topo de `db/index.js`, com `ALTER TABLE`
  condicional — foi assim com `questoes.colecao` e `usuarios.instituicao`.
- **`[[trecho]]`** no banco vira `<u>` na tela (`lib/realce.js`). O escape roda
  **antes** da substituição, então conteúdo do banco não injeta HTML. Na
  exportação para PDF e DOCX os marcadores são removidos.
- **`redirecionamentos.js`** guarda os slugs de questões despublicadas por serem
  duplicata, cada um com 301 para a versão que ficou. **Consulte este arquivo
  antes de republicar qualquer questão** — uma questão fora do ar costuma ter
  motivo, e ele está documentado ali ou no `PADRAO-EDITORIAL.md`.
- **Poema e letra** recebem `texto-base--verso` no blockquote, que preserva a
  quebra de verso. Prosa não recebe: ali a quebra de linha costuma ser resíduo
  da extração do PDF.
- **Sessão em arquivo próprio** (`dados/sessoes.db`), separado do acervo, para
  que limpeza de sessão nunca encoste nas questões. Reiniciar o serviço não
  desloga ninguém.

---

## Verificadores

Sete scripts de leitura que checam o acervo inteiro. **Todos devem fechar em
zero**; rode depois de qualquer alteração em conteúdo:

```bash
for s in linhas paragrafos imagens copias sanidade acentos aspas; do
  node scripts/audita-$s.js
done
node scripts/progresso-curadoria.js
```

| script | o que garante |
|---|---|
| `audita-linhas.js` | toda citação "(linha n)" cai na linha certa do texto |
| `audita-paragrafos.js` | todo "segundo parágrafo" existe no texto |
| `audita-imagens.js` | nenhuma descrição órfã, nenhuma imagem sem descrição |
| `audita-copias.js` | cópias do mesmo texto não divergem entre si |
| `audita-sanidade.js` | integridade do item, campos obrigatórios, metadados |
| `audita-acentos.js` | nenhum campo nosso sem acentuação |
| `audita-aspas.js` | nenhum campo mistura aspa reta com curva |

Alguns deles são mais espertos do que parecem, e por bons motivos:

- O `audita-linhas.js` **deduz** onde está a linha 1 a partir de qualquer
  marcador, porque quatro convenções de numeração convivem no acervo — o ITA
  numera a partir de 1, a Fuvest de 5 em 5 sem imprimir o 1, e a Fuvest 2021
  numera à direita.
- O `audita-acentos.js` procura por **sufixo** (`-ção`, `-ável`, `-ência`), não
  por lista de palavras — lista sempre deixa passar a próxima palavra. E ignora
  `comentario` e `imagem_alt`, que citam o texto original em inglês.
- O `audita-aspas.js` só acusa **fechamento sobrando**, nunca abertura: o inglês
  cita em vários parágrafos abrindo aspas em cada um e fechando só no último.

---

## Cuidados ao mexer no acervo

Escritos depois de errar cada um deles:

1. **Todo script de correção tem `--dry` e transação.** Rode o dry-run, leia a
   saída inteira, e só então grave. Qualquer inconsistência derruba tudo com
   ROLLBACK.
2. **Verifique que só mudou o que devia.** O padrão do projeto é comparar o
   multiconjunto de palavras antes e depois (`chave()`); para mexidas de acento,
   comparar os textos sem diacríticos.
3. **Nunca use `git add -A`.** A árvore costuma ter alterações não commitadas
   alheias ao que você está fazendo. Adicione arquivo por arquivo.
4. **Texto-base é compartilhado.** Várias questões apontam para o mesmo texto;
   ao corrigir um, atualize o grupo inteiro (`WHERE texto_base = ?`).
5. **Antes de republicar, leia `redirecionamentos.js`.** Questão fora do ar
   costuma ter motivo documentado.
6. **Um lote limpo não é um lote terminado.** Quando o dry-run dá zero, a
   pergunta seguinte não é "qual o próximo", e sim "o que eu ainda não estou
   verificando". Foi assim que nasceram os verificadores de sanidade, acentos e
   aspas.

### Rodando no servidor

O `node` padrão é v22 e quebra o `better-sqlite3` compilado. Use sempre:

```bash
cd /var/www/banco-questoes
NODE_PATH=/var/www/banco-questoes/node_modules /usr/local/bin/node20 scripts/audita-sanidade.js
```

Depois de gravar no banco: `systemctl restart banco-questoes`.

---

## O que ficou em aberto

- **Questões 105 e 112** (Viva la Vida, War) estão despublicadas porque o
  `texto_base` está vazio e não há imagem — a questão não se responde. Para
  publicá-las, é preciso importar a letra da prova original.
- **Contas criadas antes da coluna `instituicao`** ficam com o campo em branco.
  Não quebra nada; se quiser preencher, é edição direta no banco.

---

## Licença e conteúdo de terceiros

Os textos-base pertencem aos veículos citados em cada questão, e a fonte está
preenchida em todas. O uso é didático, com atribuição — o mesmo que as provas de
origem fazem. As questões de prova são de domínio das bancas (ENEM, Fuvest, ITA,
PUC Minas e demais); os comentários e as coleções autorais são conteúdo próprio.
