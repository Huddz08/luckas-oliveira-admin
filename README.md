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

O **login é real**. O restante é um protótipo navegável: serviços, preços, campanhas, aparência, relatos e galerias são dados de exemplo e **não são gravados no Drive nem publicados no portfólio**.

Não cadastre senhas reais, dados particulares de clientes ou links de pastas privadas neste protótipo. A interface e os arquivos estáticos ficam em um repositório **público**, portanto a tela de login não deve ser confundida com sigilo do código ou dos exemplos. A proteção efetiva dos futuros dados privados deve ser feita na API a cada requisição.

## Próximos passos

1. Persistir serviços e promoções para refletirem no site público.
2. Obter autorização específica para o Google Drive de Luckas, sem expor pastas ou credenciais no frontend.
3. Criar galerias reais com modo de seleção ou entrega final, senha validada pela API e downloads controlados.

## Separação de responsabilidades

- `index.html`, `styles.css`, `app.js`: interface e simulação de dados.
- `auth.css`, `auth.js`: bloqueio visual, login Google e verificação na API.
- Cloudflare Worker (repositório separado): autenticação autorizada no servidor. **Não** incluir chaves privadas no GitHub.
