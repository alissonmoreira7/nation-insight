function carregarComponente(url, containerId, activeLinkId = null) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            // Injeta o HTML no container escolhido
            document.getElementById(containerId).innerHTML = data;

            // Se foi passado um ID de link ativo, procura ele e adiciona a classe
            if (activeLinkId) {
                const linkAtivo = document.getElementById(activeLinkId);
                if (linkAtivo) {
                    linkAtivo.classList.add('active');
                }
            }
        })
        .catch(error => console.error(`Erro ao carregar o componente ${url}:`, error));
}