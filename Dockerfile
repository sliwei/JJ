# 使用Python 3.11官方镜像
FROM python:3.11-slim

# 设置时区
ENV TZ "Asia/Shanghai"

# 设置工作目录
WORKDIR /app

# 复制依赖文件并安装依赖
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目文件
COPY fund_api.py .
COPY start_api.py .
COPY test_api.py .
COPY index.html .

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["python", "fund_api.py"]