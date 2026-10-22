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

O **login é real**. Serviços, preços, promoções e a imagem principal podem ser publicados no portfólio quando o **Workers KV** estiver conectado ao Worker e o novo código estiver implantado.

Galerias privadas, seleção de fotos, entrega pelo Drive e depoimentos permanecem demonstrações. **Não** cadastre senhas reais, dados particulares de clientes ou links de pastas privadas nelas.

Os arquivos estáticos ficam em repositório público, portanto a tela de login não torna o código secreto. A API autentica cada gravação; `/api/content` é somente leitura pública e jamais contém links privados ou credenciais.

### Ativar publicação de conteúdo (sem banco tradicional)

1. Cloudflare → **Workers & Pages → KV**: crie um namespace, por exemplo `luckas-site-content`.
2. No Worker `luckas-fotografia-api`, acesse **Settings → Bindings → Add binding → KV namespace**, escolha o namespace criado e use **`SITE_CONTENT`** como nome da variável.
3. No editor do Worker, substitua o código pelo arquivo `worker.js` fornecido separadamente ao responsável pela Cloudflare (não publicado neste repositório), mantendo as variáveis existentes `GOOGLE_CLIENT_ID` e `ADMIN_ORIGIN` nas configurações. Clique **Deploy**.
4. Abra o painel com sua conta Google e edite um preço. Clique **Publicar alterações**. Abra o portfólio público para conferir. A propagação do KV pode levar até aproximadamente 1 minuto.

Não é necessário inserir uma chave de API do Cloudflare no site. O vínculo `SITE_CONTENT` é gerenciado pela própria plataforma.

## Próximos passos

1. Testar a publicação de serviços, promoções e imagem principal.
2. Implementar a edição das fotos reais e portfólios com armazenamento apropriado.
3. Obter autorização específica para o Google Drive de Luckas, sem expor pastas ou credenciais no frontend.
4. Criar galerias reais com modo de seleção ou entrega final, senha validada pela API e downloads controlados.

## Separação de responsabilidades

- `index.html`, `styles.css`, `app.js`: interface e simulação de dados.
- `auth.css`, `auth.js`: bloqueio visual, login Google e verificação na API.
- Cloudflare Worker (código entregue de forma privada): autenticação autorizada no servidor. **Não** incluir esse código ou chaves privadas no GitHub público.
