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
from datetime import datetime
import traceback
import os

app = Flask(__name__)
CORS(app)  # 允许跨域请求

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
            'data': result_data,
            'fund_code': fund_code,
            'start_date': start_date,
            'end_date': end_date,
            'count': len(result_data)
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
        # 获取当前脚本所在目录
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # 发送index.html文件
        return send_from_directory(current_dir, 'index.html')
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'页面加载失败: {str(e)}'
        }), 500

if __name__ == '__main__':
    print("启动基金数据API服务...")
    print("请确保已安装依赖: pip install akshare flask flask-cors pandas")
    # 生产环境建议使用: gunicorn -w 4 -b 0.0.0.0:8080 fund_api:app
    app.run(host='0.0.0.0', port=8080, debug=False) 