# 使用Python 3.11官方镜像
FROM python:3.11-slim

# 设置时区
ENV TZ "Asia/Shanghai"

# 设置工作目录
WORKDIR /app

# 复制依赖文件并安装依赖
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 创建日志目录
RUN mkdir -p /app/logs

# 复制后端项目文件
COPY backend/app.py .
COPY backend/config.py .
COPY backend/gunicorn.conf.py .
COPY backend/blueprints blueprints/
COPY backend/services services/
COPY backend/utils utils/

# 创建前端目录结构并复制构建产物
RUN mkdir -p /frontend
COPY frontend/dist /frontend/dist

# 暴露端口
EXPOSE 8080

# 使用gunicorn启动应用 (生产环境)
CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]
