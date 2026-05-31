function carregarComponente(url, containerId, activeLinkId = null) {
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            return response.text();
        })
        .then(html => {
            const container = document.getElementById(containerId);
            container.innerHTML = html;

            container.querySelectorAll('script').forEach(oldScript => {
                const newScript = document.createElement('script');
                newScript.textContent = oldScript.textContent;
                document.body.appendChild(newScript);
            });

            // Marca link ativo se informado
            if (activeLinkId) {
                const linkAtivo = document.getElementById(activeLinkId);
                if (linkAtivo) linkAtivo.classList.add('active');
            }

            if (containerId === 'sidebar-container' && typeof initSidebar === 'function') {
                initSidebar();
            }
        })
        .catch(error => console.error(`Erro ao carregar o componente ${url}:`, error)
    );
}