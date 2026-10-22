/* Login do painel: verificação real via Cloudflare Worker; sem armazenar tokens no navegador. */
(() => {
  'use strict';

  const GOOGLE_CLIENT_ID = '404922926099-o3nd9068cmii3sao5vv486otni6h959u.apps.googleusercontent.com';
  const API_ME = 'https://luckas-fotografia-api.hudsonamorim08.workers.dev/api/admin/me';
  const loginStatus = document.getElementById('loginStatus');
  const loginGate = document.getElementById('loginGate');
  const buttonHolder = document.getElementById('googleSignInButton');
  const logoutButton = document.getElementById('logoutButton');
  let currentToken = null;
  let lastVerification = 0;
  let verificationInProgress = false;

  function showStatus(message, isError = false) {
    loginStatus.textContent = message;
    loginStatus.classList.toggle('is-error', isError);
  }

  function lockPanel(message = 'Entre com uma conta Google autorizada.') {
    currentToken = null;
    lastVerification = 0;
    document.documentElement.classList.add('auth-locked');
    loginGate.removeAttribute('hidden');
    showStatus(message);
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  }

  async function checkToken(token) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(API_ME, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Esta conta Google não está autorizada. Use o e-mail de Luckas ou Hudson.');
        }
        throw new Error('Não foi possível verificar o acesso no servidor. Tente novamente.');
      }
      const result = await response.json();
      if (result.authenticated !== true || !result.account?.email) throw new Error('O servidor não confirmou sua identidade.');
      return result.account;
    } finally {
      clearTimeout(timeout);
    }
  }

  function unlockPanel(account, token) {
    currentToken = token;
    lastVerification = Date.now();
    document.getElementById('adminName').textContent = account.name || 'Administrador';
    document.getElementById('adminEmail').textContent = account.email;
    document.getElementById('adminAvatar').textContent = (account.name || account.email)
      .trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    document.documentElement.classList.remove('auth-locked');
    loginGate.setAttribute('hidden', '');
    document.dispatchEvent(new CustomEvent('luckas:authenticated', {detail:{email:account.email}}));
  }

  async function handleCredential({ credential }) {
    if (verificationInProgress || !credential) return;
    verificationInProgress = true;
    showStatus('Verificando sua conta Google…');
    try {
      const account = await checkToken(credential);
      unlockPanel(account, credential);
    } catch (error) {
      lockPanel(error.message || 'Falha ao verificar o acesso.');
      showStatus(error.message || 'Falha ao verificar o acesso.', true);
    } finally {
      verificationInProgress = false;
    }
  }

  function loadGoogle() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve();
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('O login Google não carregou. Confira sua conexão e bloqueadores de scripts.'));
      document.head.append(script);
    });
  }

  async function start() {
    try {
      await loadGoogle();
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(buttonHolder, {
        theme: 'outline', size: 'large', type: 'standard',
        text: 'signin_with', shape: 'pill', width: 290,
      });
      showStatus('Use a conta Google de Luckas ou Hudson.');
    } catch (error) {
      showStatus(error.message || 'Não foi possível carregar o login.', true);
    }
  }

  logoutButton.addEventListener('click', () => {
    lockPanel('Você saiu do painel. Entre novamente para continuar.');
    window.scrollTo(0, 0);
  });

  // Token disponível apenas em memória; o Worker revalida cada publicação.
  window.LuckasAdminAuth = Object.freeze({
    async uploadImage(file) {
      if (!currentToken) throw new Error('Entre com Google antes de enviar fotos.');
      const form = new FormData();
      form.append('image',file,file.name);
      const response = await fetch('https://luckas-fotografia-api.hudsonamorim08.workers.dev/api/admin/images', {
        method:'POST',cache:'no-store',
        headers:{Authorization:`Bearer ${currentToken}`},
        body:form,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Falha ao enviar imagem (HTTP ${response.status}).`);
      return result;
    },
    async publish(content, expectedRevision) {
      if (!currentToken) throw new Error('Entre com Google antes de publicar.');
      const response = await fetch('https://luckas-fotografia-api.hudsonamorim08.workers.dev/api/admin/content', {
        method:'PUT', cache:'no-store',
        headers:{Authorization:`Bearer ${currentToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({content, expectedRevision}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Não foi possível publicar (HTTP ${response.status}).`);
      return result;
    },
  });

  // Se a aba ficou aberta, a API verifica novamente a validade do token.
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !currentToken || verificationInProgress || Date.now() - lastVerification < 5 * 60 * 1000) return;
    verificationInProgress = true;
    try {
      const account = await checkToken(currentToken);
      lastVerification = Date.now();
      document.getElementById('adminEmail').textContent = account.email;
    } catch (_) {
      lockPanel('Sua sessão expirou ou não pôde ser verificada. Entre novamente.');
    } finally {
      verificationInProgress = false;
    }
  });

  start();
})();
