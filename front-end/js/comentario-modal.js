// front-end/js/comentarios-modal.js
// Reutilizável: importar em gestao-ideias.html e ideias.html (colaborador)
// Requer: api.js carregado antes. Requer #listaComentarios e #modalVerComentarios no HTML.

async function abrirModalComentarios(ideiaId, tituloIdeia) {
  const modal = document.getElementById('modalVerComentarios');
  const lista = document.getElementById('listaComentarios');
  const titulo = document.getElementById('modalComentariosTitulo');

  if (titulo) titulo.textContent = tituloIdeia || 'Comentários';
  lista.innerHTML = '<p class="coment-loading">Carregando...</p>';
  modal.classList.add('aberto');

  try {
    const comentarios = await api('GET', `/ideias/${ideiaId}/comentarios`);
    renderizarComentarios(comentarios);
  } catch (err) {
    lista.innerHTML = `<p class="coment-erro">Erro ao carregar: ${err.message}</p>`;
  }
}

function renderizarComentarios(lista) {
  const el = document.getElementById('listaComentarios');

  if (!lista.length) {
    el.innerHTML = '<p class="coment-vazio">Nenhum comentário ainda.</p>';
    return;
  }

  el.innerHTML = lista.map(c => {
    const data = c.data
      ? new Date(c.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : '';
    return `
      <div class="coment-item">
        <div class="coment-header">
          <span class="coment-autor">${escapeHtml(c.autorNome)}</span>
          <span class="coment-data">${data}</span>
        </div>
        <p class="coment-texto">${escapeHtml(c.texto)}</p>
      </div>`;
  }).join('');
}

function fecharModalComentarios() {
  document.getElementById('modalVerComentarios').classList.remove('aberto');
}

// Fecha ao clicar no backdrop
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modalVerComentarios');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target.id === 'modalVerComentarios') fecharModalComentarios();
    });
  }
});

// Utilitário (caso não exista no escopo)
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}