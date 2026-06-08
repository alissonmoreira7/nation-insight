let modoAtual = 'login'; // 'login' | 'cadastro'

// Permite Enter para submeter
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') submeter();
});

function alternarModo(e) {
    if (e) e.preventDefault();
    modoAtual = modoAtual === 'login' ? 'cadastro' : 'login';
    limparAlertas();

    const ehCadastro = modoAtual === 'cadastro';
    
    const elTitulo = document.getElementById('formTitulo');
    if (elTitulo) elTitulo.textContent = ehCadastro ? 'Criar conta' : 'Bem-vindo de volta';
    
    const elSub = document.getElementById('formSub');
    if (elSub) elSub.textContent = ehCadastro ? 'Preencha os dados para se registrar' : 'Entre com sua conta para continuar';
    
    const btnSubmit = document.getElementById('btnSubmit');
    if (btnSubmit) btnSubmit.textContent = ehCadastro ? 'Criar conta' : 'Entrar';
    
    const elCampoNome = document.getElementById('campoNome');
    if (elCampoNome) elCampoNome.style.display = ehCadastro ? 'block' : 'none';

    // Oculta o link "Esqueci minha senha" no modo cadastro
    const elOpcoes = document.getElementById('opcoesLogin');
    if (elOpcoes) elOpcoes.style.display = ehCadastro ? 'none' : 'flex';
    
    const elFooter = document.getElementById('footerTexto');
    if (elFooter) elFooter.textContent = ehCadastro ? 'Já tem conta?' : 'Não tem conta?';
    
    const btnAlternar = document.getElementById('btnAlternar');
    if (btnAlternar) btnAlternar.textContent = ehCadastro ? 'Entrar' : 'Criar conta';
}

// ── RECUPERAÇÃO DE SENHA ──────────────────────────────────────────────────────

function abrirRecuperacao(e) {
    if (e) e.preventDefault();
    document.getElementById('recEmail').value = '';
    document.getElementById('alertaRec').className = 'alerta';
    document.getElementById('alertaRec').textContent = '';
    document.getElementById('recPasso1').style.display = 'block';
    document.getElementById('recPasso2').style.display = 'none';
    document.getElementById('modalRecuperacao').classList.add('open');
}

function fecharRecuperacao(e) {
    // Fecha só se clicar no overlay ou no botão de fechar (não dentro da box)
    if (e && e.target !== document.getElementById('modalRecuperacao')) return;
    document.getElementById('modalRecuperacao').classList.remove('open');
}

async function enviarRecuperacao() {
    const email = document.getElementById('recEmail').value.trim();
    const alertaEl = document.getElementById('alertaRec');

    alertaEl.className = 'alerta';
    alertaEl.textContent = '';

    if (!email || !email.includes('@')) {
        alertaEl.className = 'alerta erro';
        alertaEl.textContent = 'Informe um e-mail válido.';
        return;
    }

    const btn = document.getElementById('btnEnviarRec');
    btn.disabled = true;
    btn.textContent = '⏳ Enviando...';

    try {
        const res = await fetch(`${backend}/api/recuperar-senha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await res.json();

        if (!res.ok) {
            alertaEl.className = 'alerta erro';
            alertaEl.textContent = data.erro || 'Erro ao processar solicitação.';
            return;
        }

        // Exibe passo 2 (confirmação)
        document.getElementById('recEmailConfirm').textContent = email;
        document.getElementById('recPasso1').style.display = 'none';
        document.getElementById('recPasso2').style.display = 'block';

    } catch {
        alertaEl.className = 'alerta erro';
        alertaEl.textContent = 'Não foi possível conectar ao servidor.';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar instruções';
    }
}

async function submeter() {
    limparAlertas();

    const elEmail = document.getElementById('fEmail');
    const elSenha = document.getElementById('fSenha');
    const elNome = document.getElementById('fNome');

    // AQUI ESTAVA O ERRO! Agora estamos capturando o nome corretamente:
    const email = elEmail ? elEmail.value.trim() : '';
    const senha = elSenha ? elSenha.value.trim() : '';
    const nome = elNome ? elNome.value.trim() : '';

    // Validação básica
    let valido = true;
    
    if (!email || !email.includes('@')) {
        if (elEmail) elEmail.classList.add('erro');
        const errEmail = document.getElementById('errEmail');
        if (errEmail) errEmail.classList.add('visivel');
        valido = false;
    }
    
    if (!senha) {
        if (elSenha) elSenha.classList.add('erro');
        const errSenha = document.getElementById('errSenha');
        if (errSenha) errSenha.classList.add('visivel');
        valido = false;
    }
    
    if (modoAtual === 'cadastro' && !nome) {
        if (elNome) elNome.classList.add('erro');
        const errNome = document.getElementById('errNome');
        if (errNome) errNome.classList.add('visivel');
        valido = false;
    }
    
    if (!valido) return;

    const btn = document.getElementById('btnSubmit');
    if (btn) {
        btn.disabled = true;
        btn.textContent = ' Aguarde...';
    }

    try {
        if (modoAtual === 'cadastro') {
            // Cria conta
            const res = await fetch(`${backend}/api/auth/registrar`, {
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
            setTimeout(() => alternarModo(), 800);

        } else {
            // Login
            const res = await fetch(`${backend}/api/auth/login`, {
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

            const ROTAS_POR_PERFIL = {
                colaborador: 'pages/dashboard-colaborador.html',
                gestor:      'pages/dashboard.html',
                admin:       'pages/dashboard.html',
            };
            const destino = ROTAS_POR_PERFIL[data.usuario.tipo] || 'pages/dashboard.html';
            setTimeout(() => { window.location.href = destino; }, 600);
        }

    } catch (err) {
        mostrarAlerta('erro', ' Não foi possível conectar ao servidor. Verifique se o back-end está rodando.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = modoAtual === 'cadastro' ? 'Criar conta' : 'Entrar';
        }
    }
}

function mostrarAlerta(tipo, msg) {
    const el = document.getElementById('alerta');
    if (el) {
        el.className = 'alerta ' + tipo;
        el.textContent = msg;
    }
}

function limparAlertas() {
    const elAlerta = document.getElementById('alerta');
    if (elAlerta) elAlerta.className = 'alerta';
    
    ['fEmail', 'fSenha', 'fNome'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('erro');
    });
    
    ['errEmail', 'errSenha', 'errNome'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('visivel');
    });
}

// Se já tiver token válido, vai direto para ideias
if (localStorage.getItem('ni_token')) {
    window.location.href = 'ideias.html';
}