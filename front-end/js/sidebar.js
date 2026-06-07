(function initSidebar() {
    try {
        const usu = JSON.parse(localStorage.getItem('ni_usuario') || 'null');
        if (!usu) return;
        const el = (id) => document.getElementById(id);
        
        if (el('sidebarNome'))           el('sidebarNome').textContent           = usu.nome     || 'Usuário';
        if (el('sidebarCargo'))          el('sidebarCargo').textContent          = usu.cargo    || 'Colaborador';
        if (el('sidebarAvatarIniciais')) el('sidebarAvatarIniciais').textContent = usu.iniciais || '?';
        
        // A CORREÇÃO ESTÁ AQUI: Convertendo para minúsculo por segurança
        const perfil = String(usu.tipo || usu.perfilacesso_usu || usu.perfil || '').toLowerCase();

        // Libera Gestão de Usuários para Admin e Gestor
        if (perfil === 'admin' || perfil === 'gestor') {
            const a = el('nav-admin');
            if (a) a.style.display = 'flex';
        }

        // Esconde "Minhas Ideias" se for Gestor
        if (usu.perfilacesso_usu === 'admin') {
            const navIdeias = el('nav-ideias');
            if (navIdeias) navIdeias.style.display = 'none';
        }

    } catch(e) { console.error('Sidebar init error:', e); }
})();