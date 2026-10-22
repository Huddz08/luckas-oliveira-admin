/* Edição do site público via Worker. Galerias privadas seguem em modo de demonstração. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const formatMoney = value => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(Number(value));
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const demoFolder = 'https://drive.google.com/drive/folders/EXEMPLO';
  const assets = {
    studio:'https://huddz08.github.io/Luckas-oliveira-fotografo-teste/assets/portfolio-estudio.webp', couple:'https://huddz08.github.io/Luckas-oliveira-fotografo-teste/assets/portfolio-casal.webp', party:'https://huddz08.github.io/Luckas-oliveira-fotografo-teste/assets/portfolio-festa.webp',
    child:'https://huddz08.github.io/Luckas-oliveira-fotografo-teste/assets/portfolio-infantil.webp', business:'https://huddz08.github.io/Luckas-oliveira-fotografo-teste/assets/portfolio-corporativo.webp', food:'https://huddz08.github.io/Luckas-oliveira-fotografo-teste/assets/portfolio-gastronomia.webp'
  };
  const services = [
    {id:1,name:'Ensaio externo feminino',price:350,image:assets.studio,details:['50 fotos tratadas','90 a 120 minutos de ensaio','Até 2 trocas de looks','Maquiagem e locomoção não inclusas']},
    {id:2,name:'Ensaio em estúdio',price:300,image:assets.studio,details:['25 fotos tratadas','90 minutos de ensaio','3 looks']},
    {id:3,name:'Cobertura de festas de pequeno porte',price:200,image:assets.party,details:['4 horas de cobertura','Sem limite de fotos','Entrega em 7 dias']},
    {id:4,name:'Ensaio corporativo gastronômico',price:350,image:assets.food,details:['120 minutos','Até 50 fotos tratadas','Entrega em 7 dias']},
    {id:5,name:'Casamento',price:800,image:assets.couple,details:['Dia da noiva, cerimônia, festa e civil','Consultar pacote']},
    {id:6,name:'Ensaio externo de casal',price:250,image:assets.couple,details:['30 fotos tratadas','90 minutos de ensaio','Até 1 troca de look','Transporte não incluso']},
    {id:7,name:'Cobertura de festa infantil',price:300,image:assets.child,details:['Até 4 horas de cobertura','Fotos ilimitadas','Entrega em 7 dias']},
    {id:8,name:'Fotografia corporativa externa',price:250,image:assets.business,details:['Para marcas, roupas e acessórios','90 minutos','Sem limite de fotos','Entrega em 7 dias']}
  ];
  const galleries = [
    {id:1,title:'Ensaio da Marina',client:'Marina Costa',serviceId:1,mode:'final',limit:50,expiry:30,created:'18 out 2026',image:assets.studio,pass:'MARINA2026',sample:true},
    {id:2,title:'Ana & Pedro',client:'Ana e Pedro',serviceId:6,mode:'selection',limit:30,expiry:15,created:'16 out 2026',image:assets.couple,pass:'CASAL2026',sample:true},
    {id:3,title:'Aniversário da Sofia',client:'Família da Sofia',serviceId:7,mode:'final',limit:0,expiry:30,created:'12 out 2026',image:assets.child,pass:'SOFIA2026',sample:true}
  ];
  const promotions = [{id:1,name:'Condição especial de primavera',serviceId:'all',discount:10,end:'',sample:true}];
  const testimonials = [
    {id:1,name:'Marina C.',service:'Ensaio individual',text:'O ensaio foi leve e muito natural. Me senti à vontade do começo ao fim e amei cada fotografia.'},
    {id:2,name:'Ana & Pedro',service:'Ensaio de casal',text:'Luckas conseguiu registrar os pequenos momentos que fazem a nossa história ser tão nossa.'},
    {id:3,name:'Camila R.',service:'Fotografia de evento',text:'As imagens trouxeram de volta a energia da festa. Foi especial rever todos aqueles detalhes.'}
  ];
  const names = {overview:'Visão geral',galleries:'Galerias de clientes',create:'Nova galeria',catalog:'Serviços e pacotes',promotions:'Promoções',appearance:'Aparência do site',testimonials:'Depoimentos',settings:'Configurações'};
  let filter = 'all', lastCreated = null, previewGallery = null, selectedPhotos = new Set(), toastTimer = null;
  const CONTENT_API = 'https://luckas-fotografia-api.hudsonamorim08.workers.dev/api/content';
  const PUBLIC_CONTENT = 'https://huddz08.github.io/Luckas-oliveira-fotografo-teste/content/';
  const CONTENT_NAMES = ['services','portfolio','testimonials','about','appearance','promotion'];
  let currentContent = null;
  let currentRevision = null;
  let contentReady = false;
  let dirty = false;
  function setSyncMessage(message) { $('syncStatus').textContent = message; }
  function setDirty() {
    dirty = true;
    $('publishChanges').disabled = !contentReady;
    setSyncMessage('Alterações pendentes. Clique em “Publicar alterações” para atualizar o portfólio.');
  }
  async function loadContent() {
    setSyncMessage('Buscando conteúdo e configurações do site…');
    try {
      const response = await fetch(CONTENT_API, {cache:'no-store'});
      if (!response.ok) throw new Error('A API não respondeu corretamente.');
      const live = await response.json();
      currentRevision = live.revision || null;
      if (live.configured && live.content) {
        currentContent = live.content;
      } else {
        const data = await Promise.all(CONTENT_NAMES.map(async name => {
          const item = await fetch(PUBLIC_CONTENT + name + '.json', {cache:'no-store'});
          if (!item.ok) throw new Error('Não foi possível ler o conteúdo inicial: ' + name);
          return item.json();
        }));
        currentContent = Object.fromEntries(CONTENT_NAMES.map((name,i)=>[name,data[i]]));
      }
      services.splice(0, services.length, ...currentContent.services.map((s,i) => {
        const album = currentContent.portfolio.find(p=>p.serviceId===s.id);
        const cover = album?.cover || '/assets/portrait.webp';
        return {id:i+1,publicId:s.id,name:s.title,category:s.category,description:s.description,
          price:s.price,details:[...s.details],visible:s.visible,promotion:{...s.promotion},
          image:cover.startsWith('/') ? 'https://huddz08.github.io/Luckas-oliveira-fotografo-teste'+cover : cover};
      }));
      promotions.splice(0,promotions.length);
      const global = currentContent.promotion;
      if (global.active && global.applyToAll && global.discountPercent > 0) {
        promotions.push({id:'global',name:global.title || global.label || 'Campanha especial',serviceId:'all',discount:global.discountPercent,end:global.validUntil || ''});
      }
      services.forEach(s=>{
        if (s.promotion.active && s.promotion.price > 0 && s.promotion.price < s.price) {
          promotions.push({id:'service-'+s.id,name:s.promotion.label || 'Oferta especial',serviceId:String(s.id),
            discount:Math.round((1-s.promotion.price/s.price)*10000)/100,end:s.promotion.validUntil || ''});
        }
      });
      $('appearanceOptions').querySelectorAll('button').forEach(button => {
        const path = '/assets/'+button.dataset.image.split('/assets/').pop();
        button.classList.toggle('selected',currentContent.appearance.heroImage === path);
        if (currentContent.appearance.heroImage === path) $('appearancePreview').src = button.dataset.image;
      });
      contentReady = true; dirty = false;
      $('publishChanges').disabled = true;
      setSyncMessage(live.configured ? 'Conteúdo carregado da Cloudflare. Tudo atualizado.' : 'Conteúdo inicial carregado. Você pode editar e publicar quando o KV estiver configurado.');
      renderServices();renderPromotions();renderGalleries();
    } catch (error) {
      contentReady = false;
      $('publishChanges').disabled = true;
      setSyncMessage('Falha ao carregar dados reais: '+error.message);
      toast('Não foi possível conectar o painel ao conteúdo público.');
    }
  }
  function validPromotion(p) { return !p.end || p.end >= new Date().toISOString().slice(0,10); }
  function buildContentForPublishing() {
    const next = JSON.parse(JSON.stringify(currentContent));
    next.services = services.map(s=>({
      id:s.publicId,title:s.name,category:s.category||'ENSAIOS',description:s.description||'',
      details:s.details,price:s.price,visible:s.visible !== false,
      promotion:{active:false,label:'',price:0}
    }));
    next.portfolio = next.portfolio.filter(p=>services.some(s=>s.publicId===p.serviceId));
    services.forEach(s=>{
      if (!next.portfolio.some(p=>p.serviceId===s.publicId)) {
        next.portfolio.push({serviceId:s.publicId,cover:'/assets/portrait.webp',visible:true,
          photos:[{image:'/assets/portrait.webp',caption:'Imagem ilustrativa — aguarda fotos de Luckas'}]});
      }
    });
    next.promotion = {active:false,label:'',title:'',description:'',applyToAll:false,discountPercent:0};
    [...promotions].reverse().filter(validPromotion).forEach(p=>{
      if (p.serviceId==='all') {
        next.promotion = {active:true,label:p.name,title:p.name,
          description:`Condição especial de ${p.discount}% nos serviços participantes. Consulte a disponibilidade.`,
          applyToAll:true,discountPercent:p.discount,validUntil:p.end || null};
      } else {
        const service = next.services.find(s=>s.id===getService(p.serviceId)?.publicId);
        if (service) service.promotion = {active:true,label:p.name,
          price:Math.round(service.price*(1-p.discount/100)*100)/100,validUntil:p.end || null};
      }
    });
    return next;
  }
  async function publishChanges() {
    if (!contentReady || !dirty) return;
    const button = $('publishChanges');
    button.disabled = true; setSyncMessage('Publicando alterações…');
    try {
      const payload = buildContentForPublishing();
      const result = await window.LuckasAdminAuth.publish(payload,currentRevision);
      currentRevision = result.revision;
      currentContent = payload;
      dirty = false;
      setSyncMessage('Publicado! O site público pode levar até cerca de 1 minuto para atualizar.');
      toast('Alterações enviadas ao site público. Abra o portfólio para conferir.');
    } catch (error) {
      setSyncMessage('Falha ao publicar: '+error.message);
      toast('Não foi possível publicar: '+error.message);
      button.disabled = false;
    }
  }
  const getService = id => services.find(service => service.id === Number(id));
  const typeName = mode => mode === 'selection' ? 'Seleção de fotos' : 'Entrega final';
  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 4300);
  }
  function randomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const values = new Uint8Array(9);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(values);
    else values.forEach((_,i) => values[i] = Math.floor(Math.random() * 256));
    return 'LO-' + [...values].map(n => chars[n % chars.length]).join('');
  }
  function showView(id) {
    if (!names[id]) return;
    document.querySelectorAll('.view').forEach(el => el.classList.toggle('current', el.id === 'view-' + id));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === id || (id === 'create' && el.dataset.view === 'galleries')));
    $('breadcrumb').textContent = names[id];
    $('sidebar').classList.remove('open');
    document.body.classList.remove('sidebar-open');
    window.scrollTo({top:0,behavior:'instant'});
    if (id === 'create') resetCreateForm();
  }
  function renderOverview() {
    $('statTotal').textContent = String(galleries.length).padStart(2,'0');
    $('statSelection').textContent = String(galleries.filter(g => g.mode === 'selection').length).padStart(2,'0');
    $('statDelivery').textContent = String(galleries.filter(g => g.mode === 'final').length).padStart(2,'0');
    $('statServices').textContent = String(services.length).padStart(2,'0');
    $('navGalleryCount').textContent = String(galleries.length).padStart(2,'0');
    $('recentGalleries').innerHTML = galleries.slice(0,4).map(g => `
      <div class="mini-gallery"><img src="${safe(g.image)}" alt="Imagem ilustrativa"><div class="mini-info"><strong>${safe(g.title)}</strong><small>${safe(g.client)} · ${typeName(g.mode)} · DEMO</small></div><button data-preview="${g.id}" aria-label="Visualizar exemplo de ${safe(g.title)}"><svg><use href="#i-arrow"/></svg></button></div>`).join('');
  }
  function renderGalleries() {
    const query = $('gallerySearch').value.toLocaleLowerCase('pt-BR').trim();
    const shown = galleries.filter(g => (filter === 'all' || filter === g.mode) && (g.title+' '+g.client).toLocaleLowerCase('pt-BR').includes(query));
    $('galleryList').innerHTML = shown.length ? shown.map(g => `
      <div class="gallery-row"><div class="gallery-info"><img src="${safe(g.image)}" alt="Imagem de exemplo"><div><strong>${safe(g.title)}</strong><small>${safe(g.client)} · ${safe(g.created)} · DEMO</small></div></div><span><span class="status-pill ${g.mode}">${typeName(g.mode)}</span></span><div class="gallery-meta"><strong>${g.mode === 'selection' ? `${g.limit} fotos` : 'Arquivos finais'}</strong><small>${g.expiry ? `${g.expiry} dias de validade` : 'Sem prazo'}</small></div><button class="small-icon-button" data-preview="${g.id}" aria-label="Ver galeria de demonstração"><svg><use href="#i-eye"/></svg></button></div>`).join('') : '<div class="empty-state">Nenhuma galeria de demonstração encontrada.</div>';
    renderOverview();
  }
  function renderServices() {
    $('servicesList').innerHTML = services.map(s => `
      <div class="service-row"><div class="service-main"><img src="${safe(s.image)}" alt="Imagem ilustrativa"><div><strong>${safe(s.name)}</strong><small>${s.details.map(safe).join(' · ')}</small></div></div><span class="service-price">${formatMoney(s.price)}</span><button class="service-edit" data-edit-service="${s.id}">Editar</button></div>`).join('');
    populateServiceOptions();
    renderOverview();
  }
  function populateServiceOptions() {
    const currentGallery = $('galleryService').value;
    $('galleryService').innerHTML = `<option value="">Escolha o tipo de ensaio</option>` + services.map(s => `<option value="${s.id}">${safe(s.name)}</option>`).join('');
    if (services.some(s => String(s.id) === currentGallery)) $('galleryService').value = currentGallery;
    const currentPromo = $('promoService').value;
    $('promoService').innerHTML = '<option value="all">Todos os serviços</option>' + services.map(s => `<option value="${s.id}">${safe(s.name)}</option>`).join('');
    if (currentPromo && (currentPromo === 'all' || services.some(s => String(s.id) === currentPromo))) $('promoService').value = currentPromo;
  }
  function renderPromotions() {
    $('promotionsList').innerHTML = promotions.length ? promotions.map(p => `<div class="promo-item"><div><strong>${safe(p.name)}</strong><small>${p.serviceId === 'all' ? 'Todos os serviços' : safe(getService(p.serviceId)?.name || 'Serviço personalizado')} ${p.end ? ' · até '+safe(p.end.split('-').reverse().join('/')) : ''} ${!validPromotion(p) ? ' · EXPIRADA' : ''}</small></div><span class="promo-percent">−${p.discount}%</span><button class="service-edit" type="button" data-remove-promo="${safe(p.id)}" aria-label="Remover promoção ${safe(p.name)}">Remover</button></div>`).join('') : '<p class="empty-state">Nenhuma campanha cadastrada.</p>';
  }
  function renderTestimonials() {
    $('testimonialsList').innerHTML = testimonials.map(t => `<article class="panel testimonial-item"><span class="quote-mark">“</span><blockquote>${safe(t.text)}</blockquote><strong>${safe(t.name)}</strong><small>${safe(t.service)} · RELATO FICTÍCIO</small></article>`).join('');
  }
  function updateMode() {
    const selection = document.querySelector('input[name=deliveryMode]:checked')?.value !== 'final';
    $('modeSelectionCard').classList.toggle('selected', selection);
    $('modeFinalCard').classList.toggle('selected', !selection);
    $('selectionLimitWrap').hidden = !selection;
    $('selectionLimit').required = selection;
    updateSummary();
  }
  function updateSummary() {
    $('summaryName').textContent = $('galleryTitle').value.trim() || 'Sua galeria especial';
    $('summaryClient').textContent = $('galleryClient').value.trim() || 'Personalizada para cada cliente';
    const selection = document.querySelector('input[name=deliveryMode]:checked')?.value !== 'final';
    $('summaryMode').textContent = selection ? 'Seleção de fotos' : 'Entrega final';
    $('summaryLimit').textContent = selection ? `${$('selectionLimit').value || '—'} favoritas` : 'Fotos prontas';
    const expiry = $('galleryExpiry').value;
    $('summaryExpiry').textContent = expiry === '0' ? 'Sem prazo' : expiry + ' dias';
    const service = getService($('galleryService').value);
    document.querySelector('.preview-cover img').src = service?.image || assets.couple;
  }
  function resetCreateForm() {
    $('galleryForm').reset();
    $('driveFolder').value = '';
    $('galleryPassword').value = randomPassword();
    $('galleryExpiry').value = '30';
    $('selectionLimit').value = '30';
    updateMode();
  }
  function preparePreview(gallery) {
    previewGallery = gallery;
    selectedPhotos = new Set();
    $('clientPreviewTitle').textContent = gallery.title || 'Seu ensaio';
    $('clientPreviewSubtitle').textContent = `Uma prévia criada para ${gallery.client || 'o cliente'} · Demonstração`;
    $('clientModeBadge').textContent = typeName(gallery.mode);
    $('clientModeBadge').className = 'status-pill ' + gallery.mode;
    $('clientModeHelp').textContent = gallery.mode === 'selection'
      ? 'Toque nas fotos para marcar as favoritas. Esta é apenas uma simulação.'
      : 'As imagens estariam prontas para visualizar e baixar. Downloads reais ainda não estão conectados.';
    $('completeSelection').innerHTML = gallery.mode === 'selection'
      ? 'Finalizar seleção de exemplo <svg><use href="#i-check"/></svg>'
      : 'Simular download <svg><use href="#i-download"/></svg>';
    $('clientActionNotice').textContent = 'Fotografias meramente ilustrativas.';
    const main = gallery.image || assets.couple;
    const photos = [main,main,main,main,main,main];
    $('clientPhotos').innerHTML = photos.map((photo,i) => gallery.mode === 'selection'
      ? `<button class="client-photo" data-photo="${i}" aria-pressed="false" aria-label="Selecionar fotografia ${i+1}"><img src="${safe(photo)}" alt="Fotografia ilustrativa ${i+1}" style="object-position:${35+i*8}% center"><span class="check-indicator"><svg><use href="#i-check"/></svg></span></button>`
      : `<div class="client-photo"><img src="${safe(photo)}" alt="Fotografia ilustrativa ${i+1}" style="object-position:${35+i*8}% center"></div>`).join('');
    updateSelectionCount();
    $('clientPreview').showModal();
  }
  function updateSelectionCount() {
    const selection = previewGallery?.mode === 'selection';
    $('selectedCounter').textContent = selection ? `${selectedPhotos.size} / ${previewGallery.limit || 30} selecionadas` : 'Galeria de exemplo';
  }
  function previewFromForm() {
    const service = getService($('galleryService').value);
    preparePreview({title:$('galleryTitle').value.trim() || 'Seu ensaio especial',client:$('galleryClient').value.trim() || 'Cliente',mode:document.querySelector('input[name=deliveryMode]:checked').value,limit:Number($('selectionLimit').value) || 30,image:service?.image || assets.couple});
  }
  function createGallery(event) {
    event.preventDefault();
    const form = $('galleryForm');
    if (!form.reportValidity()) return;
    if ($('driveFolder').value.trim() !== demoFolder) {
      toast('Use somente a pasta fictícia pelo botão “Usar exemplo”. Ainda não é seguro cadastrar links reais.');
      $('driveFolder').focus();
      return;
    }
    const pass = $('galleryPassword').value.trim();
    if (galleries.some(g => g.pass.toUpperCase() === pass.toUpperCase())) {
      toast('Escolha uma palavra-passe diferente para cada galeria de demonstração.');
      $('galleryPassword').focus();return;
    }
    const service = getService($('galleryService').value);
    const mode = document.querySelector('input[name=deliveryMode]:checked').value;
    const record = {id:Date.now(),title:$('galleryTitle').value.trim(),client:$('galleryClient').value.trim(),serviceId:Number(service.id),mode,limit:mode==='selection'?Number($('selectionLimit').value):0,expiry:Number($('galleryExpiry').value),created:new Date().toLocaleDateString('pt-BR'),image:service.image,pass,sample:true};
    galleries.unshift(record);
    lastCreated = record;
    renderGalleries();
    $('successDescription').textContent = `A galeria ilustrativa “${record.title}” foi criada apenas nesta sessão do painel. Nenhum arquivo foi publicado.`;
    $('successPassword').textContent = pass;
    $('invitationText').value = `DEMONSTRAÇÃO — NÃO ENVIAR AO CLIENTE\n\nOlá, ${record.client}! Sua galeria ${record.title} está pronta para ${record.mode==='selection'?'seleção das favoritas':'visualização e download'}.\n\nLink: [será gerado após a integração com o site real]\nPalavra-passe: ${pass}\nValidade: ${record.expiry ? record.expiry+' dias' : 'sem prazo'}\n\n— Luckas Oliveira Fotografia`;
    $('gallerySuccess').showModal();
  }
  function openServiceEditor(id) {
    const service = getService(id);
    $('serviceEditId').value = service?.id || '';
    $('serviceDialogTitle').innerHTML = service ? 'Editar <em>serviço.</em>' : 'Novo <em>serviço.</em>';
    $('serviceName').value = service?.name || '';
    $('serviceCategory').value = service?.category || 'ENSAIOS';
    $('serviceDescription').value = service?.description || '';
    $('servicePrice').value = service?.price ?? '';
    $('serviceDetails').value = service?.details.join('\n') || '';
    $('serviceDialog').showModal();
  }
  function saveService(event) {
    event.preventDefault();
    if (!$('serviceForm').reportValidity()) return;
    const id = Number($('serviceEditId').value);
    const name = $('serviceName').value.trim();
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'ensaio';
    const service = getService(id) || {
      id:Math.max(0,...services.map(s=>s.id))+1,
      publicId:slug+'-'+Date.now().toString(36),image:assets.studio,
      promotion:{active:false,label:'',price:0},visible:true,
    };
    service.name = name;
    service.category = $('serviceCategory').value;
    service.description = $('serviceDescription').value.trim();
    service.price = Number($('servicePrice').value);
    service.details = $('serviceDetails').value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,15).map(x=>x.slice(0,200));
    if (!getService(id)) services.push(service);
    renderServices(); $('serviceDialog').close(); setDirty(); toast('Serviço alterado. Clique em Publicar alterações para atualizar o site.');
  }
  function createPromotion(event) {
    event.preventDefault();
    if (!$('promotionForm').reportValidity()) return;
    promotions.unshift({id:Date.now(),name:$('promoName').value.trim(),serviceId:$('promoService').value,discount:Number($('promoDiscount').value),end:$('promoEnd').value,sample:true});
    $('promotionForm').reset(); renderPromotions(); setDirty(); toast('Promoção preparada. Clique em Publicar alterações.');
  }
  function createTestimonial(event) {
    event.preventDefault();
    if (!$('testimonialForm').reportValidity()) return;
    testimonials.unshift({id:Date.now(),name:$('testimonialName').value.trim(),service:$('testimonialService').value.trim(),text:$('testimonialText').value.trim()});
    $('testimonialDialog').close(); $('testimonialForm').reset(); renderTestimonials(); toast('Relato fictício adicionado somente a esta prévia.');
  }
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-view]');
    if (target) showView(target.dataset.view);
    const galleryTarget = e.target.closest('[data-preview]');
    if (galleryTarget) {const g = galleries.find(g=>String(g.id)===galleryTarget.dataset.preview);if(g)preparePreview(g);}
    const serviceTarget = e.target.closest('[data-edit-service]');
    if (serviceTarget) openServiceEditor(serviceTarget.dataset.editService);
    const removePromo = e.target.closest('[data-remove-promo]');
    if (removePromo) {
      const index = promotions.findIndex(p=>String(p.id)===removePromo.dataset.removePromo);
      if (index !== -1) { promotions.splice(index,1); renderPromotions();setDirty();toast('Promoção removida. Publique para atualizar o site.'); }
    }
    const photoTarget = e.target.closest('[data-photo]');
    if (photoTarget && previewGallery?.mode==='selection') {
      const n=Number(photoTarget.dataset.photo);
      if(selectedPhotos.has(n)){selectedPhotos.delete(n)}else if(selectedPhotos.size<(previewGallery.limit||30)){selectedPhotos.add(n)}else {toast('Você atingiu o limite de favoritas definido para a galeria.');return;}
      photoTarget.classList.toggle('chosen',selectedPhotos.has(n));photoTarget.setAttribute('aria-pressed',String(selectedPhotos.has(n)));updateSelectionCount();
    }
    const close = e.target.closest('[data-close]');if(close)$(close.dataset.close)?.close();
  });
  ['newFromOverview','newFromFlow','newFromGalleries'].forEach(id=>$(id).addEventListener('click',()=>showView('create')));
  $('mobileMenu').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  document.querySelectorAll('[data-gallery-filter]').forEach(el=>el.addEventListener('click',()=>{
    filter=el.dataset.galleryFilter;
    document.querySelectorAll('[data-gallery-filter]').forEach(btn=>btn.classList.toggle('selected',btn===el));
    renderGalleries();
  }));
  $('gallerySearch').addEventListener('input',renderGalleries);
  document.querySelectorAll('input[name=deliveryMode]').forEach(el=>el.addEventListener('change',updateMode));
  ['galleryTitle','galleryClient','galleryService','selectionLimit','galleryExpiry'].forEach(id=>$(id).addEventListener('input',updateSummary));
  $('generatePassword').addEventListener('click',()=>{$('galleryPassword').value=randomPassword();toast('Nova palavra-passe fictícia gerada.');});
  $('useDemoFolder').addEventListener('click',()=>{$('driveFolder').value=demoFolder;toast('Pasta de exemplo preenchida. Nenhuma conexão com o Drive foi feita.');});
  $('galleryForm').addEventListener('submit',createGallery);
  $('openSamplePreview').addEventListener('click',previewFromForm);
  $('viewCreatedGallery').addEventListener('click',()=>{if(lastCreated){$('gallerySuccess').close();preparePreview(lastCreated);}});
  $('copyInvitation').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText($('invitationText').value);toast('Texto de demonstração copiado. Não envie a clientes reais.');}
    catch{toast('O navegador não permitiu copiar automaticamente. Selecione o texto para copiar.');}
  });
  $('completeSelection').addEventListener('click',()=>{
    if (previewGallery?.mode==='selection') toast(`Simulação: ${selectedPhotos.size} foto(s) selecionada(s). Nada foi salvo no Drive nem enviado ao Luckas.`);
    else toast('O download real será habilitado após a integração segura com o Google Drive.');
  });
  $('addService').addEventListener('click',()=>openServiceEditor(null));
  $('serviceForm').addEventListener('submit',saveService);
  $('promotionForm').addEventListener('submit',createPromotion);
  $('addTestimonial').addEventListener('click',()=>$('testimonialDialog').showModal());
  $('testimonialForm').addEventListener('submit',createTestimonial);
  document.querySelectorAll('#appearanceOptions button').forEach(el=>el.addEventListener('click',()=>{
    document.querySelectorAll('#appearanceOptions button').forEach(b=>b.classList.toggle('selected',b===el));
    $('appearancePreview').src=el.dataset.image;
    if (currentContent) currentContent.appearance.heroImage = '/assets/'+el.dataset.image.split('/assets/').pop();
    setDirty();toast('Imagem principal alterada. Publique para atualizar o site.');
  }));
  $('publishChanges').addEventListener('click',publishChanges);
  document.addEventListener('luckas:authenticated',loadContent);
  renderServices();renderGalleries();renderPromotions();renderTestimonials();resetCreateForm();
})();
