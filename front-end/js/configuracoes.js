async function initConfiguracoes() {
    checkAuth();
    await carregarDadosUsuario();
}

async function carregarDadosUsuario() {
    try {
        const usuario = await Auth.obterPerfil();
        
        // Preenche campos do formulário
        document.getElementById('nome').value = usuario.nome || '';
        document.getElementById('email').value = usuario.email || '';
        document.getElementById('cargo').value = usuario.cargo || '';
        
        // Preenche permissões de notificação
        document.getElementById('notifEmail').checked = !!usuario.notifEmail;
        document.getElementById('notifPush').checked = !!usuario.notifPush;
        document.getElementById('notifNovidades').checked = !!usuario.notifNovidades;

        // Atualiza cabeçalho visual da página
        atualizarVisualUsuario(usuario);
        
    } catch (err) {
        console.error('Erro ao carregar dados do perfil:', err);
        toast('❌ Não foi possível carregar os dados atualizados do servidor.', 'erro');
        
        // Fallback usando localStorage
        const localUser = getUsuario();
        if (localUser) {
            document.getElementById('nome').value = localUser.nome || '';
            document.getElementById('email').value = localUser.email || '';
            document.getElementById('cargo').value = localUser.cargo || 'Colaborador';
            atualizarVisualUsuario(localUser);
        }
    }
}

function atualizarVisualUsuario(usuario) {
    const iniciais = usuario.iniciais || usuario.nome.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
    
    // Atualiza elementos da própria página de configurações
    const avatar = document.getElementById('perfAvatarIniciais');
    const nomeLabel = document.getElementById('perfNomeLabel');
    const cargoLabel = document.getElementById('perfCargoLabel');
    
    if (avatar) avatar.textContent = iniciais;
    if (nomeLabel) nomeLabel.textContent = usuario.nome || 'Usuário';
    if (cargoLabel) cargoLabel.textContent = usuario.cargo || 'Colaborador';

    // Sincroniza com a sidebar instantaneamente
    const elSidebarNome = document.getElementById('sidebarNome');
    const elSidebarCargo = document.getElementById('sidebarCargo');
    const elSidebarAvatarIniciais = document.getElementById('sidebarAvatarIniciais');

    if (elSidebarNome) elSidebarNome.textContent = usuario.nome || 'Usuário';
    if (elSidebarCargo) elSidebarCargo.textContent = usuario.cargo || 'Colaborador';
    if (elSidebarAvatarIniciais) elSidebarAvatarIniciais.textContent = iniciais;
}

// Salva dados cadastrais (nome, email, cargo, senha)
async function salvarPerfil(event) {
    event.preventDefault();
    
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const cargo = document.getElementById('cargo').value.trim();
    const senha = document.getElementById('senha').value;

    if (!nome || !email) {
        toast('⚠️ Nome e e-mail são obrigatórios!', 'alerta');
        return;
    }

    const payload = { nome, email, cargo };
    if (senha) {
        if (senha.length < 6) {
            toast('⚠️ A senha deve ter no mínimo 6 caracteres!', 'alerta');
            return;
        }
        payload.senha = senha;
    }

    const btnSubmit = document.querySelector('#formPerfil button[type="submit"]');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    try {
        const resultado = await Auth.atualizarPerfil(payload);
        toast('✅ Perfil atualizado com sucesso!', 'sucesso');
        
        // Limpa campo de senha
        document.getElementById('senha').value = '';
        
        // Atualiza a UI visual
        atualizarVisualUsuario(resultado.usuario);
        
    } catch (err) {
        console.error('Erro ao salvar perfil:', err);
        toast('❌ Erro ao atualizar perfil: ' + err.message, 'erro');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
    }
}

// Salva preferências de notificação
async function salvarNotificacoes() {
    const notifEmail = document.getElementById('notifEmail').checked;
    const notifPush = document.getElementById('notifPush').checked;
    const notifNovidades = document.getElementById('notifNovidades').checked;

    const btnSave = document.querySelector('.config-card button[onclick="salvarNotificacoes()"]');
    const originalText = btnSave.innerHTML;
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';

    try {
        const resultado = await Auth.atualizarPerfil({ notifEmail, notifPush, notifNovidades });
        toast('🔔 Preferências de notificação salvas!', 'sucesso');
        
        // Atualiza a UI visual
        atualizarVisualUsuario(resultado.usuario);
        
    } catch (err) {
        console.error('Erro ao salvar preferências de notificação:', err);
        toast('❌ Erro ao salvar notificações: ' + err.message, 'erro');
    } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = originalText;
    }
}

function toast(msg, tipo = 'sucesso') {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    
    const el = document.createElement('div');
    el.className = 'toast';
    
    let icon = '⚙️';
    if (tipo === 'erro') icon = '❌';
    if (tipo === 'alerta') icon = '⚠️';
    if (tipo === 'sucesso') icon = '✅';
    
    el.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// Inicia a execução do controller de configurações
document.addEventListener('DOMContentLoaded', initConfiguracoes);
if (document.readyState !== 'loading') {
    initConfiguracoes();
}
