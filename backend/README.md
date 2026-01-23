# JJ Simulator Backend

基于 Flask 框架的后端服务，提供基金数据 API 和 Bili Monitor 功能。

## 目录结构

```
backend/
├── app.py                 # 主入口文件
├── config.py              # 配置管理
├── gunicorn.conf.py       # Gunicorn生产配置
├── requirements.txt       # Python依赖
├── blueprints/            # Flask Blueprints
│   ├── fund.py            # 基金API
│   └── bi.py              # Bili Monitor API
├── services/              # 业务服务
│   ├── database.py        # 数据库连接池
│   ├── fund_cache.py      # 基金缓存服务
│   └── polling.py         # B站轮询服务
├── utils/                 # 工具模块
│   └── wbi.py             # B站WBI签名
└── sql/                   # SQL脚本
    └── bi_tables.sql      # Bili Monitor表结构
```

## 快速开始

### 1. 环境准备

```bash
# 创建虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 2. 环境变量配置

在项目根目录创建 `.env` 文件：

```env
# Flask配置
FLASK_DEBUG=false
APP_PORT=8080

# 数据库配置（Bili Monitor功能需要）
DB_HOST=your_mysql_host
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database

# 数据库连接池配置（可选）
DB_POOL_SIZE=10
DB_POOL_MIN_CACHED=2
DB_POOL_MAX_CACHED=5
```

> **注意**：如果不配置数据库，Bili Monitor 功能将不可用，但基金 API 功能正常。

### 3. 启动服务

**开发模式**：

```bash
cd backend
python3 app.py
```

**生产模式**（使用 Gunicorn）：

```bash
cd backend
gunicorn --config gunicorn.conf.py app:app
```

服务启动后访问：
- 主页: http://localhost:8080
- 健康检查: http://localhost:8080/health
- Bili Monitor: http://localhost:8080/api/bi/health

## API 文档

### 基金 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/fund_list` | GET | 获取基金列表，支持模糊搜索 |
| `/api/fund_data` | GET | 获取基金历史数据 |
| `/api/fund_info` | GET | 获取基金基本信息 |

**示例**：

```bash
# 搜索基金
curl "http://localhost:8080/api/fund_list?query=沪深300&limit=10"

# 获取基金数据
curl "http://localhost:8080/api/fund_data?code=000001&start_date=20240101"

# 获取基金信息
curl "http://localhost:8080/api/fund_info?code=000001"
```

### Bili Monitor API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/bi/settings` | GET/POST | 获取/保存设置 |
| `/api/bi/ups` | GET/POST | 获取/添加UP主 |
| `/api/bi/ups/<mid>` | DELETE | 删除UP主 |
| `/api/bi/ups/search` | GET | 搜索UP主 |
| `/api/bi/dynamics` | GET | 获取动态列表 |
| `/api/bi/dynamics/grouped` | GET | 获取分组动态 |
| `/api/bi/read` | POST | 标记已读 |
| `/api/bi/health` | GET | 健康检查 |

### 健康检查

```bash
# 全局健康检查
curl http://localhost:8080/health

# Bili Monitor健康检查
curl http://localhost:8080/api/bi/health
```

## Docker 部署

### 构建镜像

```bash
docker build -t jj-simulator .
```

### 使用 docker-compose

```yaml
services:
  jj-serve:
    image: jj-simulator
    environment:
      - TZ=Asia/Shanghai
      - APP_PORT=8080
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT:-3306}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
    ports:
      - "8080:8080"
```

## 功能说明

### 基金数据服务

- 使用 AKShare 获取基金数据
- 基金列表每日0点自动更新缓存
- 支持开放式基金和ETF基金

### Bili Monitor 服务

- B站UP主动态监控
- 评论轮询和通知
- 钉钉机器人推送
- 需要配置 MySQL 数据库

## 数据库初始化

如需使用 Bili Monitor 功能，请先执行数据库初始化：

```bash
mysql -u your_username -p your_database < sql/bi_tables.sql
```

## 开发说明

### 添加新的 Blueprint

1. 在 `blueprints/` 目录创建新模块
2. 在 `app.py` 中注册 Blueprint：

```python
from blueprints.your_module import your_bp
app.register_blueprint(your_bp)
```

### 添加新的服务

1. 在 `services/` 目录创建服务模块
2. 使用单例模式管理服务实例
3. 在 `app.py` 的 `init_services()` 中初始化

## 常见问题

### Q: 基金数据加载失败？

A: 检查网络连接，AKShare 需要访问外网获取数据。首次启动需要等待基金列表加载完成。

### Q: Bili Monitor 功能不可用？

A: 检查数据库配置是否正确，确保 `.env` 文件中配置了 DB_HOST、DB_USER、DB_PASSWORD、DB_NAME。

### Q: 如何查看日志？

A: 开发模式下日志输出到控制台。生产模式可配置 Gunicorn 日志路径：

```bash
gunicorn --access-logfile /var/log/jj/access.log \
         --error-logfile /var/log/jj/error.log \
         --config gunicorn.conf.py app:app
```

## License

MIT

