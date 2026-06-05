const pool = require('../database/connection');

// ── Paleta de cores fixa para categorias ─────────────────────────────────────
const CORES_CATEGORIAS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#059669',
  '#F59E0B', '#EF4444', '#6366F1', '#EC4899',
  '#14B8A6', '#6B7280',
];

// ── Cor por status (mesma lógica do front-end) ───────────────────────────────
function statusCor(status) {
  const mapa = {
    'Pendente':    '#6B7280',
    'Em Análise':  '#F59E0B',
    'Aprovada':    '#3B82F6',
    'Rejeitada':   '#EF4444',
  };
  return mapa[status] || '#6B7280';
}

// ── Gera slug a partir do nome da categoria ──────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ── Gera iniciais (até 2 letras) ─────────────────────────────────────────────
function iniciais(nome) {
  return nome
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

// GET /api/dashboard
async function getDashboard(req, res) {
  try {
    // ── 1. KPIs ────────────────────────────────────────────────────────────
    const [kpiRows] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM tab_ideia)                                          AS total_ideias,
        (SELECT COUNT(*) FROM tab_ideia WHERE Status_ide = 'Aprovada')            AS aprovadas,
        (SELECT COUNT(*) FROM tab_ideia WHERE Status_ide = 'Rejeitada')           AS rejeitadas,
        (SELECT COUNT(*) FROM tab_usuario)                                        AS colaboradores,
        (SELECT COALESCE(SUM(saldoPontos_usu), 0) FROM tab_usuario)              AS pontos
    `);

    const kpi = kpiRows[0];
    const taxa_aprovacao = kpi.total_ideias > 0
      ? parseFloat(((kpi.aprovadas / kpi.total_ideias) * 100).toFixed(1))
      : 0;

    const kpis = {
      total_ideias:    kpi.total_ideias,
      aprovadas:       kpi.aprovadas,
      implementadas:   kpi.aprovadas,     // ideias aprovadas contam como implementadas
      colaboradores:   kpi.colaboradores,
      pontos:          kpi.pontos,
      taxa_aprovacao,
    };

    // ── 2. Gráfico Mensal (últimos 7 meses) ────────────────────────────────
    const [mensalRows] = await pool.query(`
      SELECT
        DATE_FORMAT(DataCadastro_ide, '%Y-%m') AS periodo,
        COUNT(*)                               AS enviadas,
        SUM(CASE WHEN Status_ide = 'Aprovada' THEN 1 ELSE 0 END) AS aprovadas
      FROM tab_ideia
      WHERE DataCadastro_ide >= DATE_SUB(CURDATE(), INTERVAL 7 MONTH)
      GROUP BY periodo
      ORDER BY periodo ASC
    `);

    // Preenche os 7 últimos meses (mesmo sem dados)
    const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const hoje = new Date();
    const graficoMensal = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = mensalRows.find(r => r.periodo === chave);
      graficoMensal.push({
        mes:       mesesNomes[d.getMonth()],
        enviadas:  found ? Number(found.enviadas)  : 0,
        aprovadas: found ? Number(found.aprovadas) : 0,
      });
    }

    // ── 3. Categorias ──────────────────────────────────────────────────────
    const [catRows] = await pool.query(`
      SELECT
        c.Nome_cat  AS nome,
        COUNT(i.IdCod_ide) AS total
      FROM tab_cat_ideia c
      LEFT JOIN tab_ideia i ON i.IdCod_cat = c.IdCod_cat
      GROUP BY c.IdCod_cat, c.Nome_cat
      HAVING total > 0
      ORDER BY total DESC
    `);

    const categorias = catRows.map((c, idx) => ({
      nome:  c.nome,
      slug:  slugify(c.nome),
      total: Number(c.total),
      cor:   CORES_CATEGORIAS[idx % CORES_CATEGORIAS.length],
    }));

    // ── 4. Ideias Recentes (4 mais recentes, de todos os usuários) ─────────
    const [recentRows] = await pool.query(`
      SELECT
        i.IdCod_ide        AS id,
        i.Titulo_ide       AS titulo,
        u.Nome_usu         AS autor,
        i.DataCadastro_ide AS created_at,
        i.Status_ide       AS status,
        i.Pontos_ide       AS pts
      FROM tab_ideia i
      JOIN tab_usuario u ON i.IdCod_usu = u.IdCod_usu
      ORDER BY i.DataCadastro_ide DESC, i.IdCod_ide DESC
      LIMIT 4
    `);

    const ideiasRecentes = recentRows.map(r => ({
      id:     r.id,
      titulo: r.titulo,
      autor:  r.autor,
      data:   r.created_at
                ? new Date(r.created_at).toLocaleDateString('pt-BR')
                : '',
      status: r.status,
      pts:    r.pts || 0,
      cor:    statusCor(r.status),
    }));

    // ── 5. Top Colaboradores (5 maiores pontuações) ────────────────────────
    const [topRows] = await pool.query(`
      SELECT
        Nome_usu          AS nome,
        perfilacesso_usu  AS perfil,
        saldoPontos_usu   AS pts
      FROM tab_usuario
      WHERE saldoPontos_usu > 0
      ORDER BY saldoPontos_usu DESC
      LIMIT 5
    `);

    const bgCores = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

    const topColaboradores = topRows.map((c, idx) => ({
      nome:     c.nome,
      dept:     c.perfil.charAt(0).toUpperCase() + c.perfil.slice(1),
      pts:      c.pts,
      iniciais: iniciais(c.nome),
      bg:       bgCores[idx % bgCores.length],
    }));

    // ── Resposta ───────────────────────────────────────────────────────────
    return res.json({
      kpis,
      graficoMensal,
      categorias,
      ideiasRecentes,
      topColaboradores,
    });

  } catch (err) {
    console.error('Erro no dashboard:', err);
    return res.status(500).json({ erro: 'Erro ao carregar dados do dashboard' });
  }
}

module.exports = { getDashboard };
