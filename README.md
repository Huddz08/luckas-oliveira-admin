# Studio Admin — Luckas Oliveira Fotografia

Painel administrativo do portfólio de Luckas Oliveira, hospedado separadamente no GitHub Pages.

## Acesso

- Página: `https://huddz08.github.io/luckas-oliveira-admin/`
- Entre com Google, usando uma das contas previamente autorizadas no Cloudflare Worker.
- A identidade é verificada pelo endpoint privado `GET /api/admin/me` da API `luckas-fotografia-api.hudsonamorim08.workers.dev`.
- O token de login não é salvo no armazenamento do navegador.

### Ativação do GitHub Pages

No repositório GitHub, abra **Settings → Pages → Build and deployment**, escolha **Deploy from a branch**, selecione **main** e **/(root)**, e salve. Aguarde a publicação.

## Etapa atual

O **login é real**. Serviços, preços e promoções já podem ser publicados via Workers KV. A nova seção **Fotografias do site** permite enviar fotografias próprias e usá-las na capa, nos portfólios, na biografia, nas campanhas e nos depoimentos, assim que o R2 estiver conectado.

Galerias privadas, seleção de fotos e entrega pelo Drive permanecem demonstrações. Os depoimentos fictícios do site são exemplos; para substituir fotos por imagens reais, primeiro cadastre um relato autêntico e confirme a autorização da pessoa. **Não** cadastre senhas reais, dados particulares de clientes ou links de pastas privadas nas partes de demonstração.

Os arquivos estáticos ficam em repositório público, portanto a tela de login não torna o código secreto. A API autentica cada gravação; `/api/content` é somente leitura pública e jamais contém links privados ou credenciais.

### Ativar publicação de conteúdo (sem banco tradicional)

1. Cloudflare → **Workers & Pages → KV**: crie um namespace, por exemplo `luckas-site-content`.
2. No Worker `luckas-fotografia-api`, acesse **Settings → Bindings → Add binding → KV namespace**, escolha o namespace criado e use **`SITE_CONTENT`** como nome da variável.
3. No editor do Worker, substitua o código pelo arquivo `worker.js` fornecido separadamente ao responsável pela Cloudflare (não publicado neste repositório), mantendo as variáveis existentes `GOOGLE_CLIENT_ID` e `ADMIN_ORIGIN` nas configurações. Clique **Deploy**.
4. Abra o painel com sua conta Google e edite um preço. Clique **Publicar alterações**. Abra o portfólio público para conferir. A propagação do KV pode levar até aproximadamente 1 minuto.

### Ativar envio de fotografias reais do Luckas

1. Cloudflare → **R2 Object Storage → Create bucket**. Crie `luckas-public-images` com a classe **Standard**. O R2 pode solicitar ativação de faturamento; confira os limites e preços antes de confirmar.
2. Abra o Worker existente `luckas-fotografia-api` → **Settings → Bindings → Add → R2 bucket**. Use **Variable name: `PUBLIC_IMAGES`**, selecionando o bucket **`luckas-public-images`**. Implante essa vinculação.
3. No editor do Worker, substitua o código pela **nova versão do arquivo `worker.js` guardada de maneira privada**, mantendo os bindings `SITE_CONTENT` e `PUBLIC_IMAGES` e as variáveis `GOOGLE_CLIENT_ID` e `ADMIN_ORIGIN`. Clique em **Deploy**.
4. No painel, abra **Fotografias do site**, clique em **Enviar minha foto**, escolha imagens próprias em JPG/PNG/WebP e aguarde o upload. Depois clique em **Publicar alterações** para que apareçam no site público.

O navegador cria cópias otimizadas de no máximo 2.400 pixels no maior lado, convertidas para WebP. Cada imagem enviada deve ter no máximo 8 MB após otimização, e cada serviço pode exibir até 30 imagens neste estágio. Os originais permanecem no computador ou no Drive do Luckas.

**Privacidade:** fotos enviadas ao R2 por esta ferramenta são destinadas a páginas públicas e possuem links diretos acessíveis. Não envie ensaios privados, arquivos confidenciais ou imagens sem consentimento. Remover uma foto de uma página não apaga seu arquivo do R2; isso evita exclusões acidentais e permite recuperação futura.

Não é necessário inserir uma chave de API da Cloudflare no site. Os vínculos `SITE_CONTENT` e `PUBLIC_IMAGES` são gerenciados pela própria plataforma.

## Próximos passos

1. Testar a publicação de serviços, promoções e imagem principal.
2. Testar o upload e a troca de fotografias autorais com a vinculação do R2.
3. Obter autorização específica para o Google Drive de Luckas, sem expor pastas ou credenciais no frontend.
4. Criar galerias reais com modo de seleção ou entrega final, senha validada pela API e downloads controlados.

## Separação de responsabilidades

- `index.html`, `styles.css`, `media.css`, `app.js`, `media.js`: interface e editor de imagens públicas.
- `auth.css`, `auth.js`: bloqueio visual, login Google e verificação na API.
- Cloudflare Worker (código entregue de forma privada): autenticação autorizada no servidor. **Não** incluir esse código ou chaves privadas no GitHub público.
