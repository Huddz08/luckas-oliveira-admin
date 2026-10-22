/* Fotografias autorais no site público. Os arquivos são enviados ao R2 via API autenticada. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const editor = window.LuckasSiteEditor;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[c]));
  let pending = null;
  let busy = false;
  const DEFAULT_COVER = '/assets/portrait.webp';
  const MAX_PHOTOS = 30;

  function status(message) {
    $('mediaUploadStatus').textContent = message;
  }
  function preview(path) {
    return safe(editor.imageUrl(path || DEFAULT_COVER));
  }
  function assetCard(title, hint, path, target, shape = '') {
    return `<article class="media-feature">
      <img class="media-feature-photo ${shape}" src="${preview(path)}" alt="${safe(title)}">
      <div class="media-feature-details"><strong>${safe(title)}</strong><small>${safe(hint)}</small></div>
      <button type="button" class="media-action" data-media-upload="${target}">Enviar minha foto</button>
    </article>`;
  }
  function render() {
    const content = editor.getContent();
    if (!content) return;
    const appearance = content.appearance || {};
    $('mediaAppearance').innerHTML = [
      assetCard('Foto principal','Destaque no alto do site',appearance.heroImage,'hero'),
      assetCard('Imagem de apoio','Faixa visual da página',appearance.storyImage,'story'),
      assetCard('Foto do Luckas','Retrato da biografia',content.about.portrait,'about','portrait'),
      assetCard('Foto da promoção','Aparece se houver campanha ativa',content.promotion.image || appearance.storyImage,'promotion'),
    ].join('');
    $('mediaPortfolio').innerHTML = content.services.map(service => {
      const album = content.portfolio.find(a => a.serviceId === service.id);
      const photos = album?.photos || [];
      return `<article class="media-album">
        <div class="media-album-header">
          <img src="${preview(album?.cover)}" alt="Capa de ${safe(service.title)}">
          <div><small>${safe(service.category)}</small><h3>${safe(service.title)}</h3>
            <p>${photos.length} de ${MAX_PHOTOS} fotografias no portfólio</p>
          </div>
          <button type="button" class="media-action" data-media-upload="cover" data-media-service="${safe(service.id)}">Substituir capa</button>
          <button type="button" class="media-action primary" data-media-upload="album" data-media-service="${safe(service.id)}" ${photos.length >= MAX_PHOTOS ? 'disabled' : ''}>+ Adicionar fotos</button>
        </div>
        <div class="media-photo-row">${photos.map((photo,i) => `
          <div class="media-photo-item">
            <img src="${preview(photo.image)}" alt="${safe(photo.caption || service.title)}" loading="lazy">
            <label class="media-photo-caption">Legenda<input data-media-caption data-media-service="${safe(service.id)}" data-media-index="${i}" maxlength="120" value="${safe(photo.caption || '')}"></label>
            <div class="media-photo-actions">
              <button type="button" data-media-cover="${safe(service.id)}" data-media-index="${i}" title="Usar como capa">Capa</button>
              <button type="button" data-media-move="${safe(service.id)}" data-media-index="${i}" data-direction="-1" ${i===0?'disabled':''} title="Mover para a esquerda">←</button>
              <button type="button" data-media-move="${safe(service.id)}" data-media-index="${i}" data-direction="1" ${i===photos.length-1?'disabled':''} title="Mover para a direita">→</button>
              <button type="button" data-media-remove="${safe(service.id)}" data-media-index="${i}" title="Retirar do portfólio">Retirar</button>
            </div>
          </div>`).join('') || '<p class="media-empty">Adicione fotografias feitas por Luckas para montar este portfólio.</p>'}
        </div>
      </article>`;
    }).join('');
    $('mediaTestimonials').innerHTML = content.testimonials.map((t,i) => `
      <article class="media-feature testimonial">
        <img class="media-feature-photo portrait" src="${preview(t.image)}" alt="Retrato de ${safe(t.name)}">
        <div class="media-feature-details"><strong>${safe(t.name)}</strong><small>${t.verified ? 'Depoimento marcado como real' : 'Exemplo fictício — substitua pelo relato verdadeiro'}</small></div>
        <label class="media-testimonial-field">Nome do cliente<input data-testimonial-name="${i}" maxlength="80" value="${safe(t.name)}"></label>
        <label class="media-testimonial-field">Tipo de serviço<input data-testimonial-type="${i}" maxlength="110" value="${safe(t.type)}"></label>
        <label class="media-testimonial-field">Relato<textarea data-testimonial-quote="${i}" maxlength="900" rows="3">${safe(t.quote)}</textarea></label>
        <label class="media-confirm"><input type="checkbox" data-testimonial-verified="${i}" ${t.verified===true?'checked':''}> Confirme que este relato é verdadeiro e que o cliente autorizou o uso da imagem.</label>
        <button type="button" class="media-action" data-media-save-testimonial="${i}">Guardar relato para publicação</button>
        <button type="button" class="media-action" data-media-upload="testimonial" data-media-index="${i}" ${t.verified!==true?'disabled title="Primeiro salve um relato verdadeiro e autorizado"':''}>Enviar foto autorizada</button>
      </article>`).join('');
  }
  function getAlbum(content, id) {
    let album = content.portfolio.find(item => item.serviceId === id);
    if (!album) {
      album = {serviceId:id,cover:DEFAULT_COVER,visible:true,photos:[]};
      content.portfolio.push(album);
    }
    return album;
  }
  async function optimize(file) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      throw new Error('Envie fotos JPG, PNG ou WebP. Outros formatos ainda não são aceitos.');
    }
    if (file.size > 25 * 1024 * 1024) throw new Error('Arquivo muito grande. Exporte uma versão de até 25 MB.');
    const bitmap = await createImageBitmap(file).catch(() => {throw new Error('Não foi possível ler esta imagem.');});
    try {
      const scale = Math.min(1, 2400/Math.max(bitmap.width,bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1,Math.round(bitmap.width*scale));
      canvas.height = Math.max(1,Math.round(bitmap.height*scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Seu navegador não conseguiu preparar a fotografia.');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/webp',0.87));
      if (!blob) throw new Error('Não foi possível preparar a foto para a web.');
      if (blob.size > 8 * 1024 * 1024) throw new Error('A imagem ainda ficou acima de 8 MB. Exporte uma versão menor.');
      return new File([blob],'fotografia-luckas.webp',{type:'image/webp'});
    } finally {
      bitmap.close();
    }
  }
  function applyImage(target, url, fileName) {
    editor.update(content => {
      if (target.type==='hero') content.appearance.heroImage = url;
      else if (target.type==='story') content.appearance.storyImage = url;
      else if (target.type==='about') {
        content.about.portrait = url;
        content.about.portraitIsIllustrative = false;
        content.about.portraitCaption = 'LUCKAS OLIVEIRA · FOTOGRAFIA';
      } else if (target.type==='promotion') content.promotion.image = url;
      else if (target.type==='testimonial') content.testimonials[target.index].image = url;
      else if (['album','cover'].includes(target.type)) {
        const album = getAlbum(content,target.id);
        if (target.type==='cover') album.cover = url;
        if (!album.photos.some(p=>p.image===url) && album.photos.length < MAX_PHOTOS) {
          album.photos.push({image:url,caption:'Fotografia autoral de Luckas Oliveira'});
        }
      }
    });
    render();
  }
  function mutateAlbum(id, change) {
    editor.update(content => {
      const album = getAlbum(content,id);
      change(album);
    });
    render();
  }
  document.addEventListener('click', e => {
    if (e.target.closest('#appearanceToMedia')) {
      document.querySelector('[data-view="media"]').click();
      return;
    }
    if (busy) return;
    const saveTestimonial = e.target.closest('[data-media-save-testimonial]');
    if (saveTestimonial) {
      const index = Number(saveTestimonial.dataset.mediaSaveTestimonial);
      const card = saveTestimonial.closest('.media-feature');
      const name = card.querySelector('[data-testimonial-name]').value.trim();
      const type = card.querySelector('[data-testimonial-type]').value.trim();
      const quote = card.querySelector('[data-testimonial-quote]').value.trim();
      const verified = card.querySelector('[data-testimonial-verified]').checked;
      if (!name || !type || !quote) return status('Preencha o nome, serviço e depoimento.');
      editor.update(content => Object.assign(content.testimonials[index],{name,type,quote,verified}));
      render();
      status(verified ? 'Relato real preparado. Agora você pode enviar a foto autorizada e publicar.' : 'Rascunho ilustrativo guardado. Confirme a autorização antes de usar fotos reais.');
      return;
    }
    const upload = e.target.closest('[data-media-upload]');
    if (upload) {
      if (!editor.getContent()) return status('Aguarde carregar os dados do site.');
      pending = {type:upload.dataset.mediaUpload,id:upload.dataset.mediaService,index:Number(upload.dataset.mediaIndex)};
      if (pending.type==='testimonial' && editor.getContent().testimonials[pending.index]?.verified !== true) {
        return status('Primeiro cadastre e confirme a autorização do depoimento real.');
      }
      const input = $('mediaFileInput');
      input.value = '';
      input.multiple = pending.type === 'album';
      input.click();
      return;
    }
    const cover = e.target.closest('[data-media-cover]');
    if (cover) {
      mutateAlbum(cover.dataset.mediaCover,album=>{
        album.cover = album.photos[Number(cover.dataset.mediaIndex)].image;
      });
    }
    const move = e.target.closest('[data-media-move]');
    if (move) {
      mutateAlbum(move.dataset.mediaMove,album=>{
        const from=Number(move.dataset.mediaIndex),to=from+Number(move.dataset.direction);
        if(to>=0 && to<album.photos.length) [album.photos[from],album.photos[to]]=[album.photos[to],album.photos[from]];
      });
    }
    const remove = e.target.closest('[data-media-remove]');
    if (remove) {
      mutateAlbum(remove.dataset.mediaRemove,album=>{
        const [old] = album.photos.splice(Number(remove.dataset.mediaIndex),1);
        if (old && album.cover === old.image) album.cover = album.photos[0]?.image || DEFAULT_COVER;
      });
    }
  });
  document.addEventListener('change', e => {
    const input=e.target.closest('[data-media-caption]');
    if (!input) return;
    const id=input.dataset.mediaService, index=Number(input.dataset.mediaIndex);
    mutateAlbum(id,album=>{
      if(album.photos[index]) album.photos[index].caption=input.value.trim().slice(0,120);
    });
  });
  $('mediaFileInput').addEventListener('change', async e => {
    if (!pending || busy) return;
    const target = pending;
    const files = [...e.target.files];
    if (!files.length) return;
    const content = editor.getContent();
    if (target.type==='album') {
      const album=content.portfolio.find(p=>p.serviceId===target.id);
      if ((album?.photos.length || 0) + files.length > MAX_PHOTOS) {
        return status(`Limite de ${MAX_PHOTOS} fotos por portfólio. Retire algumas antes de adicionar outras.`);
      }
    }
    busy = true;
    try {
      for (let i=0;i<files.length;i++) {
        status(`Preparando e enviando foto ${i+1} de ${files.length}…`);
        const prepared = await optimize(files[i]);
        const result = await window.LuckasAdminAuth.uploadImage(prepared);
        applyImage(target,result.url,files[i].name);
      }
      status('Fotos enviadas! Clique em “Publicar alterações” para atualizar o site.');
    } catch (error) {
      status('Falha no envio: '+error.message);
    } finally {
      busy = false;
      pending = null;
      e.target.value = '';
    }
  });
  document.addEventListener('luckas:contentloaded',render);
})();
