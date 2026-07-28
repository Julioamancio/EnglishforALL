# Banco de Questões de Inglês

Aplicação Node + SQLite para cadastrar questões de inglês estilo ENEM, publicar
um site otimizado para busca orgânica e montar provas em PDF e Word.

Sem framework de front-end, sem JavaScript no cliente, sem build. Você edita um
arquivo, reinicia o serviço, pronto.

## O que ela faz

- **Painel** protegido por senha para cadastrar, editar e excluir questões
- **Upload de imagem** (tirinha, charge, cartum, anúncio, cartaz) com descrição obrigatória
- **Rascunho e publicada** — a questão só vai ao ar quando você decidir
- **Validação ao publicar**: 5 alternativas, gabarito válido, fonte citada, texto ou imagem, meta description entre 50 e 160 caracteres
- **Site público** com filtro por tipo, nível CEFR, tema e gênero textual
- **Gabarito comentado** em `<details>`, sem JavaScript
- **JSON-LD `Quiz`** em cada questão, para resultado aprimorado no Google
- **Sitemap e robots** gerados automaticamente
- **Montador de provas**: filtra, marca as questões, gera PDF pronto para imprimir ou DOCX editável, com cabeçalho da escola e folha de gabarito
- **Captura de e-mail** na página pública, guardada no banco

## Estrutura

```
banco-questoes/
├── src/
│   ├── server.js              # Express, sessão, rotas
│   ├── db/
│   │   ├── schema.sql         # tabelas
│   │   └── index.js           # todas as queries
│   ├── routes/
│   │   ├── publico.js         # site, sitemap, robots
│   │   ├── admin.js           # painel, upload, validação
│   │   └── prova.js           # montador e downloads
│   └── lib/
│       ├── prova-pdf.js       # geração do PDF
│       └── prova-docx.js      # geração do Word
├── views/                     # EJS
├── public/
│   ├── css/estilo.css
│   └── uploads/               # imagens enviadas
├── scripts/
│   ├── senha.js               # gera o hash da senha do painel
│   └── seed.js                # 2 questões de exemplo
├── deploy/
│   ├── nginx.conf
│   └── banco-questoes.service
├── dados/                     # banco SQLite (criado sozinho)
└── .env.example
```

## Instalar no VPS

```bash
# 1. Node 22 (se ainda não tiver)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs unzip

# 2. Colocar o projeto no lugar
mkdir -p /var/www
cd /var/www
unzip -q /root/banco-questoes.zip
cd banco-questoes
npm install --omit=dev

# 3. Configurar
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # SESSION_SECRET
npm run senha "a senha que você quer"                                       # ADMIN_SENHA_HASH
nano .env    # colar os dois valores, conferir SITE_URL e PORT=8098

# 4. Questões de exemplo (opcional)
npm run seed

# 5. Permissões
chown -R www-data:www-data /var/www/banco-questoes

# 6. Serviço
cp deploy/banco-questoes.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now banco-questoes
systemctl status banco-questoes

# 7. nginx
cp deploy/nginx.conf /etc/nginx/sites-available/ingles-destruitor
ln -sf /etc/nginx/sites-available/ingles-destruitor /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 8. HTTPS
certbot --nginx -d ingles.destruitor.com.br
```

Se você já tinha subido a versão estática, remova o link antigo antes do passo 7:

```bash
rm -f /etc/nginx/sites-enabled/ingles-destruitor
```

## Uso diário

1. Entre em `https://ingles.destruitor.com.br/admin`
2. **+ Nova questão**, preencha, deixe em **Rascunho** enquanto trabalha
3. Quando estiver pronta, mude para **Publicada** e salve
4. Para montar prova: **Montar prova** → filtre → marque → **Gerar PDF** ou **Gerar Word**

Nada de reiniciar serviço para publicar questão — o conteúdo vem do banco.
Só reinicie (`systemctl restart banco-questoes`) se mudar código ou `.env`.

## Backup

O banco inteiro é um arquivo. Guarde os dois caminhos:

```bash
tar czf backup-$(date +%F).tar.gz dados/ public/uploads/
```

Vale colocar isso num cron semanal.

## Aviso sobre as questões de exemplo

`npm run seed` cria duas questões com texto de demonstração e fonte
`example.com`. Servem para você ver o sistema funcionando. **Apague pelo painel
antes de o Google indexar** — questão com fonte fictícia não pode ir ao ar.

## Depois de publicar

1. Google Search Console → adicionar a propriedade → enviar `/sitemap.xml`
2. Testar uma questão no teste de resultados aprimorados do Google
3. Publicar com constância: 2 questões por dia útil
