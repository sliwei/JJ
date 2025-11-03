#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基金数据API服务
使用AKShare获取基金历史数据
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import akshare as ak
import pandas as pd
from datetime import datetime, timedelta
import traceback
import os
import json
import time
import threading

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 基金列表缓存
fund_list_cache = {
    'data': None,
    'timestamp': 0
}

# 锁，用于线程安全
cache_lock = threading.Lock()

# 初始化标志，确保只初始化一次
_initialized = False


def init_fund_cache():
    """
    初始化基金缓存：立即抓取一次数据，并启动定时任务
    """
    global _initialized
    if _initialized:
        return
    
    _initialized = True
    
    # 启动时立即抓取一次数据
    print("=" * 60)
    print("🚀 初始化基金列表缓存...")
    print("=" * 60)
    success = fetch_fund_list()
    if success:
        print("✓ 基金列表缓存初始化完成")
    else:
        print("⚠ 基金列表缓存初始化失败，将在定时任务中重试")
    
    # 启动定时任务，每天0点自动抓取
    schedule_daily_fetch()
    print("✓ 已启动每日0点自动更新任务")
    print("=" * 60)


def fetch_fund_list():
    """
    抓取基金列表数据并更新缓存
    使用 fund_name_em 获取所有基金的基本信息（包含几万条数据）
    """
    try:
        print("正在获取基金列表数据...")
        # 使用fund_name_em获取所有基金的基本信息（包含几万条数据）
        # 参考: https://akshare.akfamily.xyz/data/fund/fund_public.html#id14
        fund_df = ak.fund_name_em()
        
        if fund_df.empty:
            print("警告: 获取到的基金列表数据为空")
            return False
        
        print(f"从AKShare获取到 {len(fund_df)} 条原始数据，正在处理...")
        
        # 处理数据格式，提取需要的字段
        fund_list = []
        for _, row in fund_df.iterrows():
            try:
                fund_info = {
                    'code': str(row.get('基金代码', '')).strip(),
                    'name': str(row.get('基金简称', '')).strip(),
                    'type': str(row.get('基金类型', '')).strip() if pd.notna(row.get('基金类型')) else '',
                    # 注意: fund_name_em不包含实时净值数据，这些字段暂时设为0
                    # 如需实时数据，可以在查询时单独获取
                    'net_value': 0,
                    'daily_growth': 0,
                    'total_value': 0
                }
                
                # 过滤掉无效数据
                if fund_info['code'] and fund_info['name']:
                    fund_list.append(fund_info)
            except Exception as e:
                # 跳过有问题的数据行
                continue
        
        # 线程安全地更新缓存
        with cache_lock:
            fund_list_cache['data'] = fund_list
            fund_list_cache['timestamp'] = time.time()
        
        print(f"成功获取 {len(fund_list)} 只基金数据，缓存更新时间: {datetime.fromtimestamp(fund_list_cache['timestamp']).strftime('%Y-%m-%d %H:%M:%S')}")
        return True
        
    except Exception as e:
        print(f"获取基金列表失败: {e}")
        print(traceback.format_exc())
        return False


def schedule_daily_fetch():
    """
    定时任务：计算到下一个0点的时间，然后设置定时器
    """
    now = datetime.now()
    # 计算下一个0点的时间
    next_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 如果当前时间已经过了今天的0点，下一个0点就是明天
    if now >= next_midnight:
        next_midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 计算需要等待的秒数
    seconds_until_midnight = (next_midnight - now).total_seconds()
    
    print(f"下次自动抓取时间: {next_midnight.strftime('%Y-%m-%d %H:%M:%S')}，距离现在还有 {seconds_until_midnight:.0f} 秒")
    
    def task():
        # 执行抓取任务
        fetch_fund_list()
        # 设置下一个定时任务（每天执行一次）
        schedule_daily_fetch()
    
    # 设置定时器
    timer = threading.Timer(seconds_until_midnight, task)
    timer.daemon = True  # 设置为守护线程，主线程退出时自动退出
    timer.start()


@app.route('/api/fund_list', methods=['GET'])
def get_fund_list():
    """
    获取开放式基金列表，支持模糊搜索
    参数:
        query: 搜索关键词，支持基金代码或基金名称模糊匹配 (可选)
        limit: 返回结果数量限制，默认20，最大100 (可选)
    """
    try:
        query = request.args.get('query', '').strip()
        limit = min(int(request.args.get('limit', 20)), 100)
        
        # 从缓存中获取数据（如果缓存为空，返回错误）
        with cache_lock:
            fund_list = fund_list_cache['data']
            cache_timestamp = fund_list_cache['timestamp']
        
        if fund_list is None:
            return jsonify({
                'success': False,
                'error': '基金列表数据正在加载中，请稍后重试'
            }), 503
        
        # 如果有搜索查询，进行模糊匹配
        if query:
            query_lower = query.lower()
            filtered_funds = []
            
            for fund in fund_list:
                # 匹配基金代码或基金名称
                if (query_lower in fund['code'].lower() or 
                    query_lower in fund['name'].lower()):
                    filtered_funds.append(fund)
            
            # 按匹配度排序：代码完全匹配 > 代码开头匹配 > 名称开头匹配 > 其他匹配
            def sort_key(fund):
                code_lower = fund['code'].lower()
                name_lower = fund['name'].lower()
                
                if code_lower == query_lower:
                    return (0, fund['code'])  # 代码完全匹配
                elif code_lower.startswith(query_lower):
                    return (1, fund['code'])  # 代码开头匹配
                elif name_lower.startswith(query_lower):
                    return (2, fund['name'])  # 名称开头匹配
                else:
                    return (3, fund['name'])  # 其他匹配
            
            filtered_funds.sort(key=sort_key)
            result_funds = filtered_funds[:limit]
        else:
            # 没有查询条件，返回前limit个基金
            result_funds = fund_list[:limit]
        
        return jsonify({
            'success': True,
            'data': {
                'funds': result_funds,
                'total_count': len(fund_list),
                'returned_count': len(result_funds),
                'cache_time': datetime.fromtimestamp(cache_timestamp).strftime('%Y-%m-%d %H:%M:%S')
            },
        })
        
    except Exception as e:
        print(f"基金列表API错误: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': f'服务器内部错误: {str(e)}'
        }), 500

@app.route('/api/fund_data', methods=['GET'])
def get_fund_data():
    """
    获取基金历史数据
    参数:
        code: 基金代码 (必需)
        start_date: 开始日期，格式YYYYMMDD (可选，默认为一年前)
        end_date: 结束日期，格式YYYYMMDD (可选，默认为今天)
    """
    try:
        # 获取请求参数
        fund_code = request.args.get('code')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not fund_code:
            return jsonify({
                'success': False,
                'error': '基金代码不能为空'
            }), 400
        
        # 设置默认日期
        if not start_date:
            start_date = '20230101'
        if not end_date:
            end_date = datetime.now().strftime('%Y%m%d')
        
        print(f"正在获取基金 {fund_code} 从 {start_date} 到 {end_date} 的数据...")
        
        # 调用AKShare API获取开放式基金历史数据
        # 根据AKShare文档，我们需要使用fund_open_fund_info_em接口
        try:
            # 首先尝试获取开放式基金数据
            fund_data = ak.fund_open_fund_info_em(symbol=fund_code)
        except Exception as e:
            print(f"获取开放式基金数据失败: {e}")
            try:
                # 如果失败，尝试获取ETF基金数据
                fund_data = ak.fund_etf_fund_info_em(fund=fund_code, start_date=start_date, end_date=end_date)
            except Exception as e2:
                print(f"获取ETF基金数据也失败: {e2}")
                return jsonify({
                    'success': False,
                    'error': f'无法获取基金 {fund_code} 的数据，请检查基金代码是否正确'
                }), 404
        
        if fund_data.empty:
            return jsonify({
                'success': False,
                'error': f'基金 {fund_code} 没有找到数据'
            }), 404
        
        # 数据处理
        # 确保日期列存在并转换格式
        date_column = None
        for col in ['净值日期', '日期', 'date']:
            if col in fund_data.columns:
                date_column = col
                break
        
        if not date_column:
            return jsonify({
                'success': False,
                'error': '数据中没有找到日期列'
            }), 500
        
        # 确保日增长率列存在
        growth_column = None
        for col in ['日增长率', 'daily_growth', '涨跌幅']:
            if col in fund_data.columns:
                growth_column = col
                break
        
        if not growth_column:
            return jsonify({
                'success': False,
                'error': '数据中没有找到日增长率列'
            }), 500
        
        # 净值列
        net_value_column = None
        for col in ['单位净值', 'net_value', '收盘']:
            if col in fund_data.columns:
                net_value_column = col
                break
        
        # 转换日期格式并筛选日期范围
        fund_data[date_column] = pd.to_datetime(fund_data[date_column])
        start_dt = pd.to_datetime(start_date, format='%Y%m%d')
        end_dt = pd.to_datetime(end_date, format='%Y%m%d')
        
        # 筛选日期范围
        mask = (fund_data[date_column] >= start_dt) & (fund_data[date_column] <= end_dt)
        filtered_data = fund_data[mask].copy()
        
        if filtered_data.empty:
            return jsonify({
                'success': False,
                'error': f'在指定日期范围内没有找到数据'
            }), 404
        
        # 按日期排序
        filtered_data = filtered_data.sort_values(date_column)
        
        # 构造返回数据
        result_data = []
        for _, row in filtered_data.iterrows():
            item = {
                'date': row[date_column].strftime('%Y-%m-%d'),
                'daily_growth': float(row[growth_column]) if pd.notna(row[growth_column]) else 0.0
            }
            
            # 添加净值数据（如果存在）
            if net_value_column and pd.notna(row[net_value_column]):
                item['net_value'] = float(row[net_value_column])
            
            result_data.append(item)
        
        print(f"成功获取 {len(result_data)} 条数据")
        
        return jsonify({
            'success': True,
            'data': {
                'list': result_data,
                'fund_code': fund_code,
                'start_date': start_date,
                'end_date': end_date,
                'count': len(result_data)
            }
        })
        
    except Exception as e:
        print(f"API错误: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': f'服务器内部错误: {str(e)}'
        }), 500

@app.route('/api/fund_info', methods=['GET'])
def get_fund_info():
    """
    获取基金基本信息
    """
    try:
        fund_code = request.args.get('code')
        
        if not fund_code:
            return jsonify({
                'success': False,
                'error': '基金代码不能为空'
            }), 400
        
        # 获取基金名称等基本信息
        try:
            fund_names = ak.fund_name_em()
            fund_info = fund_names[fund_names['基金代码'] == fund_code]
            
            if fund_info.empty:
                return jsonify({
                    'success': False,
                    'error': f'未找到基金代码 {fund_code}'
                }), 404
            
            fund_row = fund_info.iloc[0]
            return jsonify({
                'success': True,
                'data': {
                    'code': fund_code,
                    'name': fund_row['基金简称'],
                    'type': fund_row['基金类型']
                }
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'获取基金信息失败: {str(e)}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'服务器内部错误: {str(e)}'
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'status': 'healthy',
        'message': '基金数据API服务运行正常'
    })

@app.route('/')
def jj_page():
    """JJ Simulator页面入口"""
    try:
        # 获取项目根目录
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)  # 上一级目录
        dist_dir = os.path.join(project_root, 'frontend', 'dist')

        # 检查dist目录是否存在
        if not os.path.exists(dist_dir):
            return jsonify({
                'success': False,
                'error': '前端构建文件不存在，请先运行 cd frontend && npm run build'
            }), 404

        # 发送index.html文件
        return send_from_directory(dist_dir, 'index.html')
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'页面加载失败: {str(e)}'
        }), 500

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    """提供前端静态资源文件"""
    try:
        # 获取项目根目录
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        assets_dir = os.path.join(project_root, 'frontend', 'dist', 'assets')

        return send_from_directory(assets_dir, filename)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'静态资源加载失败: {str(e)}'
        }), 404

@app.route('/<path:filename>')
def serve_static_files(filename):
    """提供其他静态文件（如vite.svg等）"""
    try:
        # 获取项目根目录
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        dist_dir = os.path.join(project_root, 'frontend', 'dist')

        # 检查文件是否存在
        file_path = os.path.join(dist_dir, filename)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(dist_dir, filename)
        else:
            # 如果文件不存在，返回index.html（用于SPA路由）
            return send_from_directory(dist_dir, 'index.html')
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'文件加载失败: {str(e)}'
        }), 404

# 模块导入时自动初始化（适用于gunicorn等场景）
init_fund_cache()

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("📊 启动基金数据API服务")
    print("=" * 60)
    print("请确保已安装依赖: pip install akshare flask flask-cors pandas")
    print("=" * 60 + "\n")
    
    # 初始化已完成（在模块导入时执行）
    # 如果使用 gunicorn，请使用: gunicorn -w 4 -b 0.0.0.0:8080 fund_api:app
    app.run(host='0.0.0.0', port=8080, debug=False) 