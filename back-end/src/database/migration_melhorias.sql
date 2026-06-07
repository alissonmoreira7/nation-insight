-- ============================================================
--  NationInsight — Migration de melhorias
--  Execute este script no banco antes de subir o back-end.
-- ============================================================

-- 1. Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS tab_log (
  IdCod_log    INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  IdCod_usu    INT          NOT NULL,
  acao_log     VARCHAR(100) NOT NULL,
  entidade_log VARCHAR(50)  DEFAULT NULL,
  entidade_id  INT          DEFAULT NULL,
  detalhe_log  TEXT         DEFAULT NULL,
  DataHora_log DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_usuario
    FOREIGN KEY (IdCod_usu) REFERENCES tab_usuario(IdCod_usu) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Colunas para recuperação de senha em tab_usuario
ALTER TABLE tab_usuario
  ADD COLUMN IF NOT EXISTS reset_token_usu  VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reset_expira_usu DATETIME    DEFAULT NULL;
