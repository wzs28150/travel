-- 旅迹 增量更新脚本（兼容「已有数据的老库」升级）
-- 用法（任选其一）：
--   docker exec -i travel_mysql mysql -uroot -prootpass travel_db < update-schema.sql
-- 说明：
--   1) 本项目后端启动时也会自动执行等效逻辑（server/src/index.js 的 ensureSchema），
--      本文件仅为「手动/透明控制」提供，不执行也能增量更新。
--   2) 所有语句幂等，可重复执行；只补缺失的列/表，不会删除或修改已有数据。
--   3) 建议在更新前先做数据库备份（见下方注释）。

-- ========== 更新前备份（示例，取消注释按需执行）==========
-- docker exec travel_mysql mysqldump -uroot -prootpass travel_db > /root/travel_db_backup_$(date +%Y%m%d_%H%M%S).sql

-- ① 为 users 表补 is_admin 列（若不存在）
SET @db = DATABASE();
SET @has_col = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = @db AND table_name = 'users' AND column_name = 'is_admin'
);
SET @stmt = IF(@has_col = 0,
  'ALTER TABLE users ADD COLUMN is_admin TINYINT NOT NULL DEFAULT 0 COMMENT ''是否管理员(0否/1是)'' AFTER storage_limit',
  'SELECT 1 AS skipped'
);
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

-- ② 建 storage_requests 表（若不存在）
CREATE TABLE IF NOT EXISTS `storage_requests` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      INT UNSIGNED NOT NULL COMMENT '申请人',
  `requested_gb` INT UNSIGNED NOT NULL COMMENT '申请增加的空间(GB)',
  `reason`       VARCHAR(255) DEFAULT '' COMMENT '申请理由',
  `status`       VARCHAR(20)  NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  `admin_id`     INT UNSIGNED DEFAULT NULL COMMENT '处理人(管理员)',
  `admin_note`   VARCHAR(255) DEFAULT '' COMMENT '处理备注',
  `created_at`   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_sr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='存储扩容申请';

-- ③ 可选：将某个已有账号提升为管理员（去掉前导 -- 并改成你的账号）
-- UPDATE users SET is_admin = 1 WHERE username = 'admin';
