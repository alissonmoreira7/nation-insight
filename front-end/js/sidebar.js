function initSidebar() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    console.log('URL detectada:', currentPage);

    const navMap = {
        'dashboard.html':  0,
        'index.html':      0,
        'ideias.html':     1,
        'explorar.html':   2,
        'recompensas.html':3,
        'progresso.html':  4,
    };

    const navItems = document.querySelectorAll('.sidebar .nav-item');
    
    navItems.forEach(item => item.classList.remove('active'));

    // Aplica o active correto
    const activeIndex = navMap[currentPage];
    if (activeIndex !== undefined && navItems[activeIndex]) {
        navItems[activeIndex].classList.add('active');
    }

    // Logout
    const logout = document.querySelector('.chip-logout');
    if (logout) {
        logout.addEventListener('click', () => {
        if (confirm('Deseja sair da sua conta?')) {
            window.location.href = 'login.html';
        }
        });
    }

    navItems.forEach(item => {
    item.addEventListener('mousedown', function() {
        this.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
    });
    item.addEventListener('mouseup', function() {
        this.style.backgroundColor = '';
    });
    });
}