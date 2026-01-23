-- Bili Monitor 数据库表结构
-- 数据库: bdm296810572_db
-- 创建时间: 2026-01-23

-- 设置表
CREATE TABLE IF NOT EXISTS `bi_settings` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `cookie` TEXT COMMENT 'Bilibili Cookie',
    `refresh_interval` INT DEFAULT 5 COMMENT '刷新间隔(分钟)',
    `enable_notifications` TINYINT(1) DEFAULT 1 COMMENT '启用通知',
    `use_mock` TINYINT(1) DEFAULT 1 COMMENT '使用Mock模式',
    `enable_dynamic_polling` TINYINT(1) DEFAULT 0 COMMENT '启用动态轮询',
    `dynamic_polling_interval` INT DEFAULT 5 COMMENT '动态轮询间隔(分钟)',
    `enable_comment_polling` TINYINT(1) DEFAULT 0 COMMENT '启用评论轮询',
    `comment_polling_interval` INT DEFAULT 5 COMMENT '评论轮询间隔(分钟)',
    `comment_time_range` INT DEFAULT 48 COMMENT '评论时间范围(小时)',
    `dingtalk_access_token` VARCHAR(255) DEFAULT '' COMMENT '钉钉AccessToken',
    `dingtalk_keyword` VARCHAR(50) DEFAULT '动态' COMMENT '钉钉关键词',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bili Monitor设置表';

-- 插入默认设置
INSERT INTO `bi_settings` (`id`, `cookie`, `refresh_interval`, `enable_notifications`, `use_mock`, 
    `enable_dynamic_polling`, `dynamic_polling_interval`, `enable_comment_polling`, 
    `comment_polling_interval`, `comment_time_range`, `dingtalk_access_token`, `dingtalk_keyword`)
VALUES (1, '', 5, 1, 1, 0, 5, 0, 5, 48, '', '动态')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- UP主表
CREATE TABLE IF NOT EXISTS `bi_ups` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `mid` VARCHAR(50) NOT NULL UNIQUE COMMENT 'UP主ID',
    `name` VARCHAR(100) NOT NULL COMMENT 'UP主昵称',
    `face` VARCHAR(500) COMMENT '头像URL',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_mid` (`mid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='UP主列表';

-- 动态表
CREATE TABLE IF NOT EXISTS `bi_dynamics` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `dynamic_id` VARCHAR(50) NOT NULL UNIQUE COMMENT '动态ID',
    `mid` VARCHAR(50) NOT NULL COMMENT 'UP主ID',
    `timestamp` BIGINT NOT NULL COMMENT '发布时间戳',
    `title` VARCHAR(500) COMMENT '标题',
    `description` TEXT COMMENT '描述内容',
    `cover` VARCHAR(500) COMMENT '封面图URL',
    `images` JSON COMMENT '图片列表JSON',
    `jump_url` VARCHAR(500) COMMENT '跳转链接',
    `comment_oid` VARCHAR(50) COMMENT '评论区OID',
    `comment_type` INT COMMENT '评论区类型',
    `is_read` TINYINT(1) DEFAULT 0 COMMENT '是否已读',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_dynamic_id` (`dynamic_id`),
    INDEX `idx_mid` (`mid`),
    INDEX `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='动态内容表';

-- 评论表（支持嵌套回复）
CREATE TABLE IF NOT EXISTS `bi_comments` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `comment_id` VARCHAR(50) NOT NULL COMMENT '评论ID',
    `dynamic_id` VARCHAR(50) NOT NULL COMMENT '所属动态ID',
    `parent_id` VARCHAR(50) DEFAULT NULL COMMENT '父评论ID(NULL表示根评论)',
    `root_id` VARCHAR(50) DEFAULT NULL COMMENT '根评论ID',
    `content` TEXT COMMENT '评论内容',
    `timestamp` BIGINT NOT NULL COMMENT '评论时间戳',
    `user_name` VARCHAR(100) COMMENT '评论者昵称',
    `user_face` VARCHAR(500) COMMENT '评论者头像',
    `is_pinned` TINYINT(1) DEFAULT 0 COMMENT '是否置顶',
    `reply_count` INT DEFAULT 0 COMMENT '回复数量',
    `is_read` TINYINT(1) DEFAULT 0 COMMENT '是否已读',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_comment_dynamic` (`comment_id`, `dynamic_id`),
    INDEX `idx_dynamic_id` (`dynamic_id`),
    INDEX `idx_parent_id` (`parent_id`),
    INDEX `idx_root_id` (`root_id`),
    INDEX `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论表';

-- 已读ID表
CREATE TABLE IF NOT EXISTS `bi_read_ids` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `item_id` VARCHAR(50) NOT NULL UNIQUE COMMENT '已读项目ID(动态ID或评论ID)',
    `item_type` ENUM('dynamic', 'comment') DEFAULT 'dynamic' COMMENT '类型',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_item_id` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='已读记录表';

-- 轮询日志表（可选，用于调试和监控）
CREATE TABLE IF NOT EXISTS `bi_polling_logs` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `poll_type` ENUM('dynamic', 'comment') NOT NULL COMMENT '轮询类型',
    `status` ENUM('success', 'failed') NOT NULL COMMENT '状态',
    `message` TEXT COMMENT '日志消息',
    `new_count` INT DEFAULT 0 COMMENT '新增数量',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='轮询日志表';
