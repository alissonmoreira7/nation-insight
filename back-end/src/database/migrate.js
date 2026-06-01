const pool = require('./connection');

async function migrate() {
  const conn = await pool.getConnection();
  console.log('🔄 Criando banco NationInsight...\n');

  try {

    // ── 1. tab_usuario ──────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tab_usuario (
        IdCod_usu         INT AUTO_INCREMENT PRIMARY KEY,
        Nome_usu          VARCHAR(100)  NOT NULL,
        Email_usu         VARCHAR(150)  UNIQUE NOT NULL,
        senha_usu         VARCHAR(255)  NOT NULL,
        perfilacesso_usu  ENUM('colaborador','gestor','admin') NOT NULL DEFAULT 'colaborador',
        saldoPontos_usu   INT           DEFAULT 0,
        urlfoto_usu       VARCHAR(255)  DEFAULT NULL,
        created_at        DATETIME      DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ tab_usuario');

    // ── 2. tab_cat_ideia ─────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tab_cat_ideia (
        IdCod_cat  INT AUTO_INCREMENT PRIMARY KEY,
        Nome_cat   VARCHAR(100) NOT NULL UNIQUE,
        Desc_cat   TEXT
      )
    `);
    await conn.query(`
      INSERT IGNORE INTO tab_cat_ideia (Nome_cat) VALUES
        ('Tecnologia'),
        ('Processos'),
        ('Análise de Dados'),
        ('RH'),
        ('Financeiro'),
        ('Marketing'),
        ('Operações')
    `);
    console.log('✅ tab_cat_ideia + seeds');

    // ── 3. tab_ideia ──────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tab_ideia (
        IdCod_ide          INT AUTO_INCREMENT PRIMARY KEY,
        Titulo_ide         VARCHAR(100) NOT NULL,
        Descricao_ide      TEXT         NOT NULL,
        Status_ide         ENUM('Pendente','Em Análise','Aprovada','Rejeitada') DEFAULT 'Pendente',
        Prazo_ide          VARCHAR(50),
        Recursos_ide       VARCHAR(100),
        Impacto_ide        ENUM('Alto','Médio','Baixo') DEFAULT NULL,
        Visualizacoes_ide  INT          DEFAULT 0,
        Comentarios_ide    INT          DEFAULT 0,
        Pontos_ide         INT          DEFAULT NULL,
        Feedback_ide       TEXT         DEFAULT NULL,
        DataCadastro_ide   DATE         DEFAULT (CURRENT_DATE),
        IdCod_usu          INT          NOT NULL,
        IdCod_cat          INT,
        FOREIGN KEY (IdCod_usu) REFERENCES tab_usuario(IdCod_usu) ON DELETE CASCADE,
        FOREIGN KEY (IdCod_cat) REFERENCES tab_cat_ideia(IdCod_cat) ON DELETE SET NULL
      )
    `);
    console.log('✅ tab_ideia');

    // ── 4. tab_recompensa ─────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tab_recompensa (
        IdCod_rec      INT AUTO_INCREMENT PRIMARY KEY,
        Nome_rec       VARCHAR(100) NOT NULL,
        Icone_rec      VARCHAR(10),
        Custo_rec      INT          NOT NULL,
        Descricao_rec  TEXT,
        Quantidade_rec INT          DEFAULT 0
      )
    `);
    await conn.query(`
      INSERT IGNORE INTO tab_recompensa (IdCod_rec, Nome_rec, Icone_rec, Custo_rec, Descricao_rec, Quantidade_rec) VALUES
        (1, 'Vale-Presente Amazon',    '🎁', 100, 'Voucher de R$ 100 para compras na Amazon',    25),
        (2, 'Day Off Extra',           '🌴', 200, 'Um dia de folga remunerada adicional',         10),
        (3, 'Curso Online Udemy',      '📚', 150, 'Acesso a qualquer curso da plataforma Udemy', 15),
        (4, 'Vale-Presente iFood',     '🍔',  80, 'Voucher de R$ 80 para pedidos no iFood',      30),
        (5, 'Equipamento Home Office', '📦', 500, 'Cadeira ergonômica ou monitor adicional',      5),
        (6, 'Troféu Inovador do Mês',  '🏆', 800, 'Reconhecimento especial e troféu físico',      2)
    `);
    console.log('✅ tab_recompensa + seeds');

    // ── 5. rel_usuario_recompensa ─────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS rel_usuario_recompensa (
        IdCod_uur       INT AUTO_INCREMENT PRIMARY KEY,
        IdCod_usu       INT      NOT NULL,
        IdCod_rec       INT      NOT NULL,
        DataResgate_uur DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (IdCod_usu) REFERENCES tab_usuario(IdCod_usu) ON DELETE CASCADE,
        FOREIGN KEY (IdCod_rec) REFERENCES tab_recompensa(IdCod_rec)
      )
    `);
    console.log('✅ rel_usuario_recompensa');

    console.log('\n🎉 Banco pronto! Execute: npm run dev\n');

  } catch (err) {
    console.error('\n❌ Erro na migração:', err.message);
    console.error(err);
  } finally {
    conn.release();
    process.exit();
  }
}

migrate();