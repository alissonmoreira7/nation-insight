# NationInsight Backend
> Apenas para as telas: **ideias.html** e **recompensas.html**

---

## 1. Instalar e configurar

```bash
npm install
cp .env.example .env
```

Edite o `.env`:
```
DB_USER=root
DB_PASS=sua_senha_do_mysql
```

---

## 2. Criar o banco e as tabelas

No MySQL:
```sql
CREATE DATABASE nationinsight;
```

Rodar a migration:
```bash
npm run migrate
```

---

## 3. Criar usuário de teste (Ana Costa)

```bash
npm run dev
```

Com o servidor rodando, faça um POST (Insomnia, Postman ou curl):
```
POST http://localhost:3000/api/auth/registrar
Content-Type: application/json

{
  "nome": "Ana Costa",
  "email": "ana@nationcapital.com",
  "senha": "123456",
  "cargo": "Análise de Dados",
  "departamento": "Dados"
}
```

---

## 4. Integrar o Front-End

### 4.1 — Copiar o arquivo api.js

```
front-end-api.js  →  front-end/js/api.js
```

### 4.2 — Importar no HTML (ANTES dos outros scripts)

**ideias.html:**
```html
<script src="js/api.js"></script>      ← adicionar aqui
<script src="js/injetahtml.js"></script>
<script src="js/sidebar.js"></script>
<script src="js/ideias.js"></script>
```

**recompensas.html:**
```html
<script src="js/api.js"></script>      ← adicionar aqui
<script src="js/injetahtml.js"></script>
<script src="js/sidebar.js"></script>
<script src="js/recompensas.js"></script>
```

---

## 5. Mudanças em ideias.js

### 5.1 — Apagar getState() e saveState()
Apague essas duas funções e a linha `let state = getState()`.

### 5.2 — Trocar o início do arquivo

Adicione no topo (onde estava `let state = getState()`):
```js
checkAuth();
let state = {
  usuario: getUsuario(),
  ideias:  []
};
```

### 5.3 — Trocar o render() do início

Apague a linha `render();` do final do arquivo e substitua por:
```js
async function init() {
  try {
    state.ideias = await Ideias.minhas();
    // Busca pontos atualizados do usuário logado
    const usuario = getUsuario();
    if (usuario) state.usuario = usuario;
    render();
  } catch (err) {
    console.error('Erro ao carregar:', err.message);
  }
}
init();
```

### 5.4 — Trocar salvarIdeia()

Substitua a função inteira:
```js
async function salvarIdeia() {
  const titulo    = document.getElementById('fTitulo').value.trim();
  const categoria = document.getElementById('fCategoria').value;
  const desc      = document.getElementById('fDesc').value.trim();
  const prazo     = document.getElementById('fPrazo').value;
  const recursos  = document.getElementById('fRecursos').value;

  if (!titulo)    { toast('⚠ Informe o título da ideia'); return; }
  if (!categoria) { toast('⚠ Selecione uma categoria');   return; }
  if (!desc)      { toast('⚠ Adicione uma descrição');    return; }

  try {
    if (editandoId) {
      await Ideias.editar(editandoId, { titulo, categoria, desc, prazo, recursos });
      const idx = state.ideias.findIndex(x => x.id === editandoId);
      if (idx !== -1)
        state.ideias[idx] = { ...state.ideias[idx], titulo, categoria, desc, prazo, recursos };
      toast('✅ Ideia atualizada com sucesso!');
    } else {
      const resultado = await Ideias.criar({ titulo, categoria, desc, prazo, recursos });
      state.ideias.unshift(resultado.ideia);
      state.usuario.pontos = resultado.pontos; // atualiza saldo
      toast('💡 Ideia submetida! +50 pontos adicionados');
    }
    fecharModal('modalForm');
    render();
  } catch (err) {
    toast('❌ ' + err.message);
  }
}
```

### 5.5 — Trocar confirmarExclusao()

```js
async function confirmarExclusao() {
  if (!excluindoId) return;
  try {
    await Ideias.excluir(excluindoId);
    state.ideias = state.ideias.filter(x => x.id !== excluindoId);
    fecharModal('modalExcluir');
    excluindoId = null;
    render();
    toast('🗑️ Ideia excluída.');
  } catch (err) {
    toast('❌ ' + err.message);
  }
}
```

---

## 6. Mudanças em recompensas.js

### 6.1 — Apagar getState() e saveState()
Apague essas duas funções e a linha `let state = getState()`.

### 6.2 — Trocar o início

Onde estava `let state = getState()`:
```js
checkAuth();
let state = { pontos: 0, recompensas: [], historico: [] };
```

### 6.3 — Trocar o render() do final

Apague `render();` e substitua por:
```js
async function init() {
  try {
    const data      = await Recompensas.catalogo();
    state.pontos      = data.pontos;
    state.recompensas = data.recompensas;

    state.historico = await Recompensas.historico();
    render();
  } catch (err) {
    console.error('Erro ao carregar recompensas:', err.message);
  }
}
init();
```

### 6.4 — Trocar confirmarResgate()

```js
async function confirmarResgate() {
  if (!resgateAtual) return;
  try {
    const resultado = await Recompensas.resgatar(resgateAtual.id);
    state.pontos = resultado.pontos;

    const r = state.recompensas.find(r => r.id === resgateAtual.id);
    if (r) r.disponiveis = Math.max(0, r.disponiveis - 1);

    state.historico.unshift(resultado.resgate);

    fecharModal();
    document.getElementById('modalSucessoDesc').textContent =
      `"${resgateAtual.nome}" resgatado! Você usou ${resgateAtual.pts} pts e agora tem ${resultado.pontos} pts.`;
    document.getElementById('modalSucesso').classList.add('open');
    render();
  } catch (err) {
    fecharModal();
    toast('❌ ' + err.message);
  }
}
```

---

## 7. Criar login.html

Crie o arquivo `front-end/login.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>NationInsight — Login</title>
  <script src="js/api.js"></script>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:sans-serif; background:#0A2540; display:flex;
           align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#fff; border-radius:16px; padding:40px; width:360px; }
    h2 { color:#0A2540; margin-bottom:6px; }
    p  { color:#888; font-size:13px; margin-bottom:24px; }
    label { font-size:12px; font-weight:600; color:#555; display:block; margin-bottom:4px; }
    input { width:100%; padding:10px 12px; margin-bottom:16px;
            border:1.5px solid #ddd; border-radius:8px; font-size:14px; outline:none; }
    input:focus { border-color:#D4AF37; }
    button { width:100%; padding:12px; background:#D4AF37; border:none;
             border-radius:8px; font-size:15px; font-weight:700;
             color:#0A2540; cursor:pointer; }
    .erro { color:red; font-size:12px; margin-top:8px; text-align:center; }
  </style>
</head>
<body>
  <div class="card">
    <h2>NationInsight</h2>
    <p>Entre com suas credenciais para acessar o portal</p>
    <label>E-mail</label>
    <input type="email" id="email" placeholder="seu@email.com">
    <label>Senha</label>
    <input type="password" id="senha" placeholder="••••••">
    <button onclick="entrar()">Entrar</button>
    <div class="erro" id="erroMsg"></div>
  </div>
  <script>
    if (localStorage.getItem('ni_token')) window.location.href = 'ideias.html';

    async function entrar() {
      const email = document.getElementById('email').value.trim();
      const senha = document.getElementById('senha').value;
      const erroEl = document.getElementById('erroMsg');
      erroEl.textContent = '';
      if (!email || !senha) { erroEl.textContent = 'Preencha e-mail e senha.'; return; }
      try {
        await Auth.login(email, senha);
        window.location.href = 'ideias.html';
      } catch (err) {
        erroEl.textContent = err.message;
      }
    }
  </script>
</body>
</html>
```

---

## 8. Problema da topbar

O arquivo `components/topbar.html` tem `<script src="js/recompensas.js">` dentro do `<header>`.
**Remova essa linha** — o script não deve estar dentro do componente.

---

## Checklist

- [ ] `npm install`
- [ ] `.env` configurado
- [ ] Banco `nationinsight` criado no MySQL
- [ ] `npm run migrate` — sem erros
- [ ] `npm run dev` — servidor no ar
- [ ] POST `/api/auth/registrar` — usuário criado
- [ ] `front-end-api.js` copiado para `front-end/js/api.js`
- [ ] `<script src="js/api.js">` adicionado em `ideias.html` e `recompensas.html`
- [ ] 5 mudanças em `ideias.js`
- [ ] 4 mudanças em `recompensas.js`
- [ ] `login.html` criado
- [ ] `<script src="js/recompensas.js">` removido do `topbar.html`
- [ ] Testou login → redireciona para `ideias.html`
- [ ] Testou criar ideia → aparece na lista
- [ ] Testou resgatar recompensa → pontos debitam
