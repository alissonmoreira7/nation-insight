    let modoAtual = 'login'; // 'login' | 'cadastro'

    // Permite Enter para submeter
    document.addEventListener('keydown', e => {
    if (e.key === 'Enter') submeter();
});

    function alternarModo(e) {
    e.preventDefault();
    modoAtual = modoAtual === 'login' ? 'cadastro' : 'login';
    limparAlertas();

    const ehCadastro = modoAtual === 'cadastro';
    document.getElementById('formTitulo').textContent  = ehCadastro ? 'Criar conta' : 'Bem-vindo de volta';
    document.getElementById('formSub').textContent     = ehCadastro ? 'Preencha os dados para se registrar' : 'Entre com sua conta para continuar';
    document.getElementById('btnSubmit').textContent   = ehCadastro ? 'Criar conta' : 'Entrar';
    document.getElementById('campoNome').style.display = ehCadastro ? 'block' : 'none';
    document.getElementById('footerTexto').textContent = ehCadastro ? 'Já tem conta?' : 'Não tem conta?';
    document.getElementById('btnAlternar').textContent = ehCadastro ? 'Entrar' : 'Criar conta';
}

    async function submeter() {
    limparAlertas();

    const email = document.getElementById('fEmail').value.trim();
    const senha = document.getElementById('fSenha').value.trim();
    const nome  = document.getElementById('fNome').value.trim();

    // Validação básica
    let valido = true;
    if (!email || !email.includes('@')) {
    document.getElementById('fEmail').classList.add('erro');
    document.getElementById('errEmail').classList.add('visivel');
    valido = false;
}
    if (!senha) {
    document.getElementById('fSenha').classList.add('erro');
    document.getElementById('errSenha').classList.add('visivel');
    valido = false;
}
    if (modoAtual === 'cadastro' && !nome) {
    document.getElementById('fNome').classList.add('erro');
    document.getElementById('errNome').classList.add('visivel');
    valido = false;
}
    if (!valido) return;

    const btn = document.getElementById('btnSubmit');
    btn.disabled = true;
    btn.textContent = ' Aguarde...';

    try {
    if (modoAtual === 'cadastro') {
    // Cria conta
    const res = await fetch('http://localhost:3000/api/auth/registrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, senha })
});
    const data = await res.json();

    if (!res.ok) {
    mostrarAlerta('erro', data.erro || 'Erro ao criar conta');
    return;
}

    mostrarAlerta('sucesso', ' Conta criada! Fazendo login...');
    setTimeout(() => alternarModo({ preventDefault: () => {} }), 800);

} else {
    // Login
    const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
});
    const data = await res.json();

    if (!res.ok) {
    mostrarAlerta('erro', data.erro || 'E-mail ou senha incorretos');
    return;
}

    // Salva sessão e redireciona
    localStorage.setItem('ni_token', data.token);
    localStorage.setItem('ni_usuario', JSON.stringify(data.usuario));
    mostrarAlerta('sucesso', ' Login realizado! Redirecionando...');
    setTimeout(() => { window.location.href = 'ideias.html'; }, 600);
}

} catch (err) {
    mostrarAlerta('erro', ' Não foi possível conectar ao servidor. Verifique se o back-end está rodando.');
} finally {
    btn.disabled = false;
    btn.textContent = modoAtual === 'cadastro' ? 'Criar conta' : 'Entrar';
}
}

    function mostrarAlerta(tipo, msg) {
    const el = document.getElementById('alerta');
    el.className = 'alerta ' + tipo;
    el.textContent = msg;
}

    function limparAlertas() {
    document.getElementById('alerta').className = 'alerta';
    ['fEmail','fSenha','fNome'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('erro');
});
    ['errEmail','errSenha','errNome'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('visivel');
});
}

    // Se já tiver token válido, vai direto para ideias
    if (localStorage.getItem('ni_token')) {
    window.location.href = 'ideias.html';
}