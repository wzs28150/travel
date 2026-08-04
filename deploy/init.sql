-- 猫途迹旅行 H5 数据库初始化
-- 编码：utf8mb4

CREATE DATABASE IF NOT EXISTS `travel_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `travel_db`;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(50)  NOT NULL COMMENT '登录账号',
  `password`   VARCHAR(100) NOT NULL COMMENT 'bcrypt 哈希',
  `nickname`   VARCHAR(50)  DEFAULT '' COMMENT '昵称',
  `avatar`     VARCHAR(255) DEFAULT '' COMMENT '头像 URL',
  `signature`  VARCHAR(200) DEFAULT '' COMMENT '个性签名',
  `gender`     VARCHAR(10)  DEFAULT '' COMMENT '性别',
  `city`       VARCHAR(50)  DEFAULT '' COMMENT '所在城市',
  `storage_limit` BIGINT UNSIGNED NOT NULL DEFAULT 2147483648 COMMENT '存储空间上限(字节)，默认 2GB',
  `is_admin`    TINYINT      NOT NULL DEFAULT 0 COMMENT '是否管理员(0否/1是)',
  `created_at` DATETIME     DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 存储扩容申请（普通用户提交，管理员后台审批通过后生效）
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

-- 旅行表（行程/行李/待办/预算/相册以 JSON 存于 content 字段）
CREATE TABLE IF NOT EXISTS `travels` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL COMMENT '所属用户',
  `title`      VARCHAR(100) NOT NULL DEFAULT '' COMMENT '旅行名称',
  `destination` VARCHAR(100) DEFAULT '' COMMENT '目的地',
  `start_date` DATE         DEFAULT NULL COMMENT '开始日期',
  `end_date`   DATE         DEFAULT NULL COMMENT '结束日期',
  `status`     VARCHAR(20)  NOT NULL DEFAULT 'planning' COMMENT 'planning/ongoing/done',
  `cover`      VARCHAR(255) DEFAULT '' COMMENT '封面 URL',
  `content`    JSON         NULL COMMENT '行程/行李/待办/预算/相册等结构化数据',
  `created_at` DATETIME     DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_travel_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='旅行表';
