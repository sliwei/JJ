#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基金API Blueprint
提供基金列表、基金数据、基金信息等接口
"""

import os
import traceback
from datetime import datetime

import akshare as ak
import pandas as pd
from flask import Blueprint, request, jsonify, send_from_directory

from config import FRONTEND_DIST_DIR
from services.fund_cache import fund_cache

# 创建Blueprint
fund_bp = Blueprint('fund', __name__)


@fund_bp.route('/api/fund_list', methods=['GET'])
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
        
        if not fund_cache.is_available:
            return jsonify({
                'success': False,
                'error': '基金列表数据正在加载中，请稍后重试'
            }), 503
        
        fund_list, cache_timestamp = fund_cache.get_fund_list()
        result_funds = fund_cache.search_funds(query, limit)
        
        return jsonify({
            'success': True,
            'data': {
                'funds': result_funds,
                'total_count': len(fund_list) if fund_list else 0,
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


@fund_bp.route('/api/fund_data', methods=['GET'])
def get_fund_data():
    """
    获取基金历史数据
    参数:
        code: 基金代码 (必需)
        start_date: 开始日期，格式YYYYMMDD (可选，默认为一年前)
        end_date: 结束日期，格式YYYYMMDD (可选，默认为今天)
    """
    try:
        fund_code = request.args.get('code')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not fund_code:
            return jsonify({
                'success': False,
                'error': '基金代码不能为空'
            }), 400
        
        if not start_date:
            start_date = '20230101'
        if not end_date:
            end_date = datetime.now().strftime('%Y%m%d')
        
        print(f"正在获取基金 {fund_code} 从 {start_date} 到 {end_date} 的数据...")
        
        try:
            fund_data = ak.fund_open_fund_info_em(symbol=fund_code)
        except Exception as e:
            print(f"获取开放式基金数据失败: {e}")
            try:
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
        
        # 查找日期列
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
        
        # 查找日增长率列
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
        
        mask = (fund_data[date_column] >= start_dt) & (fund_data[date_column] <= end_dt)
        filtered_data = fund_data[mask].copy()
        
        if filtered_data.empty:
            return jsonify({
                'success': False,
                'error': '在指定日期范围内没有找到数据'
            }), 404
        
        filtered_data = filtered_data.sort_values(date_column)
        
        result_data = []
        for _, row in filtered_data.iterrows():
            item = {
                'date': row[date_column].strftime('%Y-%m-%d'),
                'daily_growth': float(row[growth_column]) if pd.notna(row[growth_column]) else 0.0
            }
            
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


@fund_bp.route('/api/fund_info', methods=['GET'])
def get_fund_info():
    """获取基金基本信息"""
    try:
        fund_code = request.args.get('code')
        
        if not fund_code:
            return jsonify({
                'success': False,
                'error': '基金代码不能为空'
            }), 400
        
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


# ============== 静态文件服务 ==============

@fund_bp.route('/')
def index_page():
    """主页入口"""
    try:
        if not os.path.exists(FRONTEND_DIST_DIR):
            return jsonify({
                'success': False,
                'error': '前端构建文件不存在，请先运行 cd frontend && yarn build'
            }), 404
        
        return send_from_directory(FRONTEND_DIST_DIR, 'index.html')
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'页面加载失败: {str(e)}'
        }), 500


@fund_bp.route('/assets/<path:filename>')
def serve_assets(filename):
    """提供前端静态资源文件"""
    try:
        assets_dir = os.path.join(FRONTEND_DIST_DIR, 'assets')
        return send_from_directory(assets_dir, filename)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'静态资源加载失败: {str(e)}'
        }), 404


@fund_bp.route('/<path:filename>')
def serve_static_files(filename):
    """提供其他静态文件（SPA路由支持）"""
    try:
        file_path = os.path.join(FRONTEND_DIST_DIR, filename)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(FRONTEND_DIST_DIR, filename)
        else:
            # SPA路由回退到index.html
            return send_from_directory(FRONTEND_DIST_DIR, 'index.html')
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'文件加载失败: {str(e)}'
        }), 404

