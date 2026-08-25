# Bot de ofertas Mercado Livre → Telegram

Detecta quedas de preço reais em produtos do Mercado Livre e posta automaticamente num canal de Telegram com link de afiliado. Roda sozinho via GitHub Actions (cron), sem depender do seu PC ligado.

Plano de arquitetura completo em `C:\Users\gigil\.claude\plans\mighty-swimming-blanket.md`.

## Aviso de segurança

O `refresh_token` do Mercado Livre fica salvo, **criptografado** (AES-256-GCM), em `data/ml-token.enc` e é commitado no repositório a cada execução (ele muda a cada uso — é assim que a API do ML funciona). A criptografia evita que um vazamento do repositório sozinho comprometa sua conta, mas mesmo assim: **o repositório precisa ser privado** no GitHub, como camada extra de proteção.

## Setup (passo a passo)

### 1. Telegram
1. Fale com [@BotFather](https://t.me/BotFather), rode `/newbot` e guarde o token gerado.
2. Crie o canal onde as ofertas vão ser postadas e adicione o bot como administrador com permissão de postar mensagens.
3. Pegue o `chat_id` do canal: se for público, é `@seucanal`; se for privado, encaminhe uma mensagem do canal para [@JsonDumpBot](https://t.me/JsonDumpBot) e leia o `id` numérico (geralmente negativo, tipo `-100...`).

### 2. Mercado Livre — afiliados
1. Cadastre-se no [Portal de Afiliados](https://afiliados.mercadolivre.com.br).
2. Gere **um** link de teste para qualquer produto pelo painel.
3. Abra a URL gerada e copie os valores dos parâmetros `matt_word` e `matt_tool` — são fixos pra sua conta e o bot vai reusar eles em todo link que gerar.

### 3. Mercado Livre — aplicação/API
1. Crie uma aplicação em [developers.mercadolivre.com.br](https://developers.mercadolivre.com.br), anote o **Client ID** e o **Client Secret**.
2. Cadastre `http://localhost:8734/callback` como redirect URI da aplicação.
   - Se o Mercado Livre recusar por exigir HTTPS, use um túnel local (ex: `ngrok http 8734`) e ajuste `REDIRECT_URI` em `scripts/setup-ml-oauth.ts` para a URL do túnel — isso só precisa ser validado uma vez, no primeiro login.
3. Copie `.env.example` para `.env` e preencha `ML_CLIENT_ID`, `ML_CLIENT_SECRET`.
4. Gere a chave de criptografia local e cole em `ML_TOKEN_ENCRYPTION_KEY` no `.env`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
5. Rode `npm install` e depois `npm run setup:ml-oauth` — abre uma URL de autorização, você faz login/autoriza no navegador, e o script salva `data/ml-token.enc` automaticamente.

### 4. Repositório e GitHub Actions
1. Crie o repositório no GitHub como **privado**.
2. Em Settings → Secrets and variables → Actions, cadastre:
   - **Secrets**: `TELEGRAM_BOT_TOKEN`, `ML_CLIENT_ID`, `ML_CLIENT_SECRET`, `ML_TOKEN_ENCRYPTION_KEY`.
   - **Variables**: `TELEGRAM_CHANNEL_ID`, `ML_AFFILIATE_MATT_WORD`, `ML_AFFILIATE_MATT_TOOL`.
3. Faça commit e push do projeto, incluindo `data/ml-token.enc` gerado no passo anterior.
4. Em Actions → run-bot, dispare manualmente (`Run workflow`) uma vez pra validar antes de confiar no cron.

### 5. Curadoria
Preencha `config/watchlist.json` com os produtos que quer acompanhar:

```json
{
  "itemIds": ["MLB1234567890"],
  "searchQueries": ["fone bluetooth"]
}
```

`itemIds` é a fonte principal e estável (o ID aparece na URL do produto, formato `MLB...`). `searchQueries` é best-effort — se a busca por palavra-chave falhar ou ficar instável, o bot ignora e segue só com `itemIds` (não derruba a execução).

O limiar de queda pra considerar "oferta real" é `DISCOUNT_THRESHOLD_PERCENT` no `.env`/Secrets (padrão 15%).

## Rodando localmente

```bash
npm install
npm run typecheck
npm test
npm run bot
```

`npm run bot` usa o `.env` local e posta de verdade no canal configurado — use um canal de teste até validar o pipeline.

## Pontos a confirmar na primeira execução real

A pesquisa técnica por trás deste projeto encontrou relatos de instabilidade recente no endpoint de busca do Mercado Livre (`/sites/MLB/search`), por isso ele é tratado como best-effort e isolado. Vale confirmar na prática, no primeiro `npm run bot`:
- Se `/items/{id}` retorna o campo `thumbnail` como documentado — se o nome do campo mudou, o bot continua funcionando, só sem imagem na mensagem (campo é opcional no schema).
- Se a busca por palavra-chave funciona com o seu token ou cai no fallback de log-e-segue.

## Escopo

- **v1 (este projeto)**: Mercado Livre + Telegram.
- **v2 (futuro, sob demanda)**: Shopee — tem API de afiliados real, mas exige aprovação prévia no programa.
- **Fora de escopo, por design**: Amazon (PA-API exige vendas prévias, inviável pra canal novo) e automação de WhatsApp Channels (sem API oficial da Meta — as alternativas não-oficiais violam os termos do WhatsApp e arriscam banir o número).
