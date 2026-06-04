function initSidebar() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const navMap = {
        'dashboard.html':  'nav-dashboard',
        'index.html':      'nav-dashboard',
        'ideias.html':     'nav-ideias',
        'explorar.html':   'nav-explorar',
        'recompensas.html':'nav-recompensas',
        'progresso.html':  'nav-progresso',
    };

    // Ripple nos itens de navegação
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
        item.addEventListener('mousedown', function() { this.style.backgroundColor = 'rgba(0,0,0,0.15)'; });
        item.addEventListener('mouseup',   function() { this.style.backgroundColor = ''; });
        item.addEventListener('mouseleave',function() { this.style.backgroundColor = ''; });
    });
}
