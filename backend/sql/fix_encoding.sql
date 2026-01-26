-- ============================================
-- 清理错误编码数据脚本
-- 用途：修复数据库中无法用 UTF-8 解码的数据
-- 创建时间：2026-01-26
-- ============================================
-- 
-- 使用说明：
-- 1. 建议先执行检测查询，查看有多少数据需要清理
-- 2. 在生产环境执行前，请先备份数据库
-- 3. 可以分步执行，先执行检测，确认后再执行清理
-- 4. 清理操作会将无法解码的内容设置为空字符串
--
-- ============================================

-- ============================================
-- 第一部分：检测错误编码数据
-- ============================================

-- 检测 bi_comments 表中的错误编码数据
SELECT 
    'bi_comments' AS table_name,
    'content' AS column_name,
    COUNT(*) AS error_count
FROM bi_comments
WHERE content IS NOT NULL 
  AND CONVERT(content USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_comments' AS table_name,
    'user_name' AS column_name,
    COUNT(*) AS error_count
FROM bi_comments
WHERE user_name IS NOT NULL 
  AND CONVERT(user_name USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_comments' AS table_name,
    'user_face' AS column_name,
    COUNT(*) AS error_count
FROM bi_comments
WHERE user_face IS NOT NULL 
  AND CONVERT(user_face USING utf8mb4) IS NULL
UNION ALL
-- 检测 bi_dynamics 表
SELECT 
    'bi_dynamics' AS table_name,
    'title' AS column_name,
    COUNT(*) AS error_count
FROM bi_dynamics
WHERE title IS NOT NULL 
  AND CONVERT(title USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_dynamics' AS table_name,
    'description' AS column_name,
    COUNT(*) AS error_count
FROM bi_dynamics
WHERE description IS NOT NULL 
  AND CONVERT(description USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_dynamics' AS table_name,
    'cover' AS column_name,
    COUNT(*) AS error_count
FROM bi_dynamics
WHERE cover IS NOT NULL 
  AND CONVERT(cover USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_dynamics' AS table_name,
    'jump_url' AS column_name,
    COUNT(*) AS error_count
FROM bi_dynamics
WHERE jump_url IS NOT NULL 
  AND CONVERT(jump_url USING utf8mb4) IS NULL
UNION ALL
-- 检测 bi_ups 表
SELECT 
    'bi_ups' AS table_name,
    'name' AS column_name,
    COUNT(*) AS error_count
FROM bi_ups
WHERE name IS NOT NULL 
  AND CONVERT(name USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_ups' AS table_name,
    'face' AS column_name,
    COUNT(*) AS error_count
FROM bi_ups
WHERE face IS NOT NULL 
  AND CONVERT(face USING utf8mb4) IS NULL
UNION ALL
-- 检测 bi_settings 表
SELECT 
    'bi_settings' AS table_name,
    'cookie' AS column_name,
    COUNT(*) AS error_count
FROM bi_settings
WHERE cookie IS NOT NULL 
  AND CONVERT(cookie USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_settings' AS table_name,
    'dingtalk_keyword' AS column_name,
    COUNT(*) AS error_count
FROM bi_settings
WHERE dingtalk_keyword IS NOT NULL 
  AND CONVERT(dingtalk_keyword USING utf8mb4) IS NULL;

-- ============================================
-- 第二部分：清理错误编码数据
-- ============================================
-- 注意：执行清理前请先备份数据库！
-- 建议在事务中执行，确认无误后再提交

START TRANSACTION;

-- 清理 bi_comments 表的 content 字段
UPDATE bi_comments
SET content = ''
WHERE content IS NOT NULL 
  AND CONVERT(content USING utf8mb4) IS NULL;

-- 清理 bi_comments 表的 user_name 字段
UPDATE bi_comments
SET user_name = ''
WHERE user_name IS NOT NULL 
  AND CONVERT(user_name USING utf8mb4) IS NULL;

-- 清理 bi_comments 表的 user_face 字段
UPDATE bi_comments
SET user_face = ''
WHERE user_face IS NOT NULL 
  AND CONVERT(user_face USING utf8mb4) IS NULL;

-- 清理 bi_dynamics 表的 title 字段
UPDATE bi_dynamics
SET title = ''
WHERE title IS NOT NULL 
  AND CONVERT(title USING utf8mb4) IS NULL;

-- 清理 bi_dynamics 表的 description 字段
UPDATE bi_dynamics
SET description = ''
WHERE description IS NOT NULL 
  AND CONVERT(description USING utf8mb4) IS NULL;

-- 清理 bi_dynamics 表的 cover 字段
UPDATE bi_dynamics
SET cover = ''
WHERE cover IS NOT NULL 
  AND CONVERT(cover USING utf8mb4) IS NULL;

-- 清理 bi_dynamics 表的 jump_url 字段
UPDATE bi_dynamics
SET jump_url = ''
WHERE jump_url IS NOT NULL 
  AND CONVERT(jump_url USING utf8mb4) IS NULL;

-- 清理 bi_ups 表的 name 字段
UPDATE bi_ups
SET name = '未知用户'
WHERE name IS NOT NULL 
  AND CONVERT(name USING utf8mb4) IS NULL;

-- 清理 bi_ups 表的 face 字段
UPDATE bi_ups
SET face = ''
WHERE face IS NOT NULL 
  AND CONVERT(face USING utf8mb4) IS NULL;

-- 清理 bi_settings 表的 cookie 字段（谨慎操作，可能影响功能）
-- 注意：如果 cookie 字段有错误编码，建议手动检查并重新设置
-- UPDATE bi_settings
-- SET cookie = ''
-- WHERE cookie IS NOT NULL 
--   AND CONVERT(cookie USING utf8mb4) IS NULL;

-- 清理 bi_settings 表的 dingtalk_keyword 字段
UPDATE bi_settings
SET dingtalk_keyword = '动态'
WHERE dingtalk_keyword IS NOT NULL 
  AND CONVERT(dingtalk_keyword USING utf8mb4) IS NULL;

-- 查看受影响的行数
SELECT ROW_COUNT() AS affected_rows;

-- 如果确认无误，执行 COMMIT；否则执行 ROLLBACK
-- COMMIT;
-- ROLLBACK;

-- ============================================
-- 第三部分：验证清理结果
-- ============================================

-- 再次检测，确认所有错误编码数据已清理
SELECT 
    'bi_comments' AS table_name,
    'content' AS column_name,
    COUNT(*) AS remaining_errors
FROM bi_comments
WHERE content IS NOT NULL 
  AND CONVERT(content USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_comments' AS table_name,
    'user_name' AS column_name,
    COUNT(*) AS remaining_errors
FROM bi_comments
WHERE user_name IS NOT NULL 
  AND CONVERT(user_name USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_comments' AS table_name,
    'user_face' AS column_name,
    COUNT(*) AS remaining_errors
FROM bi_comments
WHERE user_face IS NOT NULL 
  AND CONVERT(user_face USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_dynamics' AS table_name,
    'title' AS column_name,
    COUNT(*) AS remaining_errors
FROM bi_dynamics
WHERE title IS NOT NULL 
  AND CONVERT(title USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_dynamics' AS table_name,
    'description' AS column_name,
    COUNT(*) AS remaining_errors
FROM bi_dynamics
WHERE description IS NOT NULL 
  AND CONVERT(description USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_dynamics' AS table_name,
    'cover' AS column_name,
    COUNT(*) AS remaining_errors
FROM bi_dynamics
WHERE cover IS NOT NULL 
  AND CONVERT(cover USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_dynamics' AS table_name,
    'jump_url' AS column_name,
    COUNT(*) AS remaining_errors
FROM bi_dynamics
WHERE jump_url IS NOT NULL 
  AND CONVERT(jump_url USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_ups' AS table_name,
    'name' AS column_name,
    COUNT(*) AS remaining_errors
FROM bi_ups
WHERE name IS NOT NULL 
  AND CONVERT(name USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_ups' AS table_name,
    'face' AS column_name,
    COUNT(*) AS remaining_errors
FROM bi_ups
WHERE face IS NOT NULL 
  AND CONVERT(face USING utf8mb4) IS NULL
UNION ALL
SELECT 
    'bi_settings' AS table_name,
    'dingtalk_keyword' AS column_name,
    COUNT(*) AS remaining_errors
FROM bi_settings
WHERE dingtalk_keyword IS NOT NULL 
  AND CONVERT(dingtalk_keyword USING utf8mb4) IS NULL;

-- ============================================
-- 使用说明
-- ============================================
-- 
-- 执行步骤：
-- 1. 先执行"第一部分：检测错误编码数据"，查看需要清理的数据量
-- 2. 如果检测到错误数据，执行"第二部分：清理错误编码数据"
--    - 注意：清理操作在事务中，需要手动执行 COMMIT 或 ROLLBACK
-- 3. 执行"第三部分：验证清理结果"，确认所有错误数据已清理
-- 
-- 安全提示：
-- - 执行清理前请先备份数据库
-- - 建议在测试环境先验证脚本
-- - 清理操作会将无法解码的内容设置为空字符串（bi_ups.name 设置为'未知用户'）
-- - bi_settings.cookie 字段的清理已注释，如需清理请手动取消注释
--
-- ============================================
