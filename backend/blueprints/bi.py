#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bili Monitor API Blueprint
提供设置、UP主、动态、评论的CRUD接口
"""

import json
import traceback
import requests
from typing import List, Dict

from flask import Blueprint, request, jsonify

from services.database import db
from services.polling import polling_service
from utils.wbi import get_signed_params

# 创建Blueprint
bi_bp = Blueprint('bi', __name__, url_prefix='/api/bi')


def _check_db():
    """检查数据库是否可用"""
    if not db.is_available:
        return jsonify({
            'success': False,
            'error': '数据库服务不可用，请检查数据库配置'
        }), 503
    return None


# ============== Settings API ==============

@bi_bp.route('/settings', methods=['GET'])
def get_settings():
    """获取设置"""
    err = _check_db()
    if err:
        return err
    
    try:
        sql = "SELECT * FROM bi_settings WHERE id = 1"
        row = db.execute_query(sql, fetch_one=True)
        
        if not row:
            return jsonify({
                'success': True,
                'data': {
                    'cookie': '',
                    'refreshInterval': 5,
                    'enableNotifications': True,
                    'enableDynamicPolling': False,
                    'dynamicPollingInterval': 5,
                    'enableCommentPolling': False,
                    'commentPollingInterval': 5,
                    'commentTimeRange': 48,
                    'dingtalkAccessToken': '',
                    'dingtalkKeyword': '动态'
                }
            })
        
        return jsonify({
            'success': True,
            'data': {
                'cookie': row['cookie'] or '',
                'refreshInterval': row['refresh_interval'],
                'enableNotifications': bool(row['enable_notifications']),
                'enableDynamicPolling': bool(row['enable_dynamic_polling']),
                'dynamicPollingInterval': row['dynamic_polling_interval'],
                'enableCommentPolling': bool(row['enable_comment_polling']),
                'commentPollingInterval': row['comment_polling_interval'],
                'commentTimeRange': row['comment_time_range'],
                'dingtalkAccessToken': row['dingtalk_access_token'] or '',
                'dingtalkKeyword': row['dingtalk_keyword'] or '动态'
            }
        })
    except Exception as e:
        print(f"获取设置失败: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@bi_bp.route('/settings', methods=['POST'])
def save_settings():
    """保存设置"""
    err = _check_db()
    if err:
        return err
    
    try:
        data = request.json
        sql = """
            INSERT INTO bi_settings (id, cookie, refresh_interval, enable_notifications,
                enable_dynamic_polling, dynamic_polling_interval, enable_comment_polling,
                comment_polling_interval, comment_time_range, dingtalk_access_token, dingtalk_keyword)
            VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                cookie = VALUES(cookie),
                refresh_interval = VALUES(refresh_interval),
                enable_notifications = VALUES(enable_notifications),
                enable_dynamic_polling = VALUES(enable_dynamic_polling),
                dynamic_polling_interval = VALUES(dynamic_polling_interval),
                enable_comment_polling = VALUES(enable_comment_polling),
                comment_polling_interval = VALUES(comment_polling_interval),
                comment_time_range = VALUES(comment_time_range),
                dingtalk_access_token = VALUES(dingtalk_access_token),
                dingtalk_keyword = VALUES(dingtalk_keyword)
        """
        params = (
            data.get('cookie', ''),
            data.get('refreshInterval', 5),
            1 if data.get('enableNotifications', True) else 0,
            1 if data.get('enableDynamicPolling', False) else 0,
            data.get('dynamicPollingInterval', 5),
            1 if data.get('enableCommentPolling', False) else 0,
            data.get('commentPollingInterval', 5),
            data.get('commentTimeRange', 48),
            data.get('dingtalkAccessToken', ''),
            data.get('dingtalkKeyword', '动态')
        )
        db.execute_modify(sql, params)
        
        # 重启轮询服务
        polling_service.restart()
        
        return jsonify({'success': True, 'message': '设置已保存'})
    except Exception as e:
        print(f"保存设置失败: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============== UPs API ==============

@bi_bp.route('/ups', methods=['GET'])
def get_ups():
    """获取UP主列表"""
    err = _check_db()
    if err:
        return err
    
    try:
        sql = "SELECT mid, name, face FROM bi_ups ORDER BY created_at"
        rows = db.execute_query(sql)
        return jsonify({
            'success': True,
            'data': [{'mid': r['mid'], 'name': r['name'], 'face': r['face']} for r in rows]
        })
    except Exception as e:
        print(f"获取UP列表失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bi_bp.route('/ups', methods=['POST'])
def add_up():
    """添加UP主"""
    err = _check_db()
    if err:
        return err
    
    try:
        data = request.json
        sql = """
            INSERT INTO bi_ups (mid, name, face)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE name = VALUES(name), face = VALUES(face)
        """
        db.execute_modify(sql, (data['mid'], data['name'], data.get('face', '')))
        return jsonify({'success': True, 'message': 'UP主已添加'})
    except Exception as e:
        print(f"添加UP主失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bi_bp.route('/ups/<mid>', methods=['DELETE'])
def remove_up(mid: str):
    """删除UP主"""
    err = _check_db()
    if err:
        return err
    
    try:
        db.execute_modify("DELETE FROM bi_ups WHERE mid = %s", (mid,))
        return jsonify({'success': True, 'message': 'UP主已删除'})
    except Exception as e:
        print(f"删除UP主失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bi_bp.route('/ups/search', methods=['GET'])
def search_up():
    """搜索UP主（从B站API）"""
    err = _check_db()
    if err:
        return err
    
    try:
        keyword = request.args.get('keyword', '')
        if not keyword:
            return jsonify({'success': False, 'error': '关键词不能为空'}), 400
        
        settings = db.execute_query("SELECT cookie FROM bi_settings WHERE id = 1", fetch_one=True)
        cookie = settings.get('cookie') if settings else ''
        
        if not cookie:
            return jsonify({'success': False, 'error': '请先配置Cookie'}), 400
        
        params = {
            'keyword': keyword,
            'search_type': 'bili_user',
            'page': 1
        }
        signed_params = get_signed_params(params, cookie)
        
        headers = {
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://search.bilibili.com/'
        }
        
        resp = requests.get(
            'https://api.bilibili.com/x/web-interface/wbi/search/type',
            params=signed_params,
            headers=headers,
            timeout=10
        )
        data = resp.json()
        
        if data.get('code') != 0:
            return jsonify({'success': False, 'error': data.get('message', 'B站API错误')}), 500
        
        result = data.get('data', {}).get('result', []) or []
        ups = []
        for item in result:
            face = item.get('upic', '')
            if face and face.startswith('//'):
                face = 'https:' + face
            ups.append({
                'mid': str(item.get('mid', '')),
                'name': item.get('uname', ''),
                'face': face
            })
        
        return jsonify({'success': True, 'data': ups})
    except Exception as e:
        print(f"搜索UP主失败: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============== Dynamics API ==============

def get_comments_for_dynamic(dynamic_id: str) -> List[Dict]:
    """获取动态的评论列表（包含嵌套回复）"""
    sql = """
        SELECT comment_id, dynamic_id, parent_id, root_id, content, timestamp,
               user_name, user_face, is_pinned, reply_count, is_read
        FROM bi_comments WHERE dynamic_id = %s ORDER BY timestamp
    """
    rows = db.execute_query(sql, (dynamic_id,))
    
    comments_map = {}
    root_comments = []
    
    for r in rows:
        comment = {
            'id': r['comment_id'],
            'content': r['content'] or '',
            'timestamp': r['timestamp'],
            'userName': r['user_name'] or '',
            'userFace': r['user_face'] or '',
            'isPinned': bool(r['is_pinned']),
            'replyCount': r['reply_count'] or 0,
            'rootId': r['root_id'],
            'isRead': bool(r['is_read']),
            'replies': []
        }
        comments_map[r['comment_id']] = comment
        
        if not r['parent_id']:
            root_comments.append(comment)
    
    for r in rows:
        if r['parent_id'] and r['parent_id'] in comments_map:
            parent = comments_map[r['parent_id']]
            parent['replies'].append(comments_map[r['comment_id']])
    
    return root_comments


@bi_bp.route('/dynamics', methods=['GET'])
def get_dynamics():
    """获取动态列表"""
    err = _check_db()
    if err:
        return err
    
    try:
        mid = request.args.get('mid')
        
        if mid:
            sql = """
                SELECT dynamic_id, mid, timestamp, title, description, cover, 
                       images, jump_url, comment_oid, comment_type, is_read
                FROM bi_dynamics WHERE mid = %s ORDER BY timestamp DESC
            """
            rows = db.execute_query(sql, (mid,))
        else:
            sql = """
                SELECT dynamic_id, mid, timestamp, title, description, cover, 
                       images, jump_url, comment_oid, comment_type, is_read
                FROM bi_dynamics ORDER BY timestamp DESC LIMIT 100
            """
            rows = db.execute_query(sql)
        
        dynamics = []
        for r in rows:
            dynamic = {
                'id': r['dynamic_id'],
                'mid': r['mid'],
                'timestamp': r['timestamp'],
                'title': r['title'] or '',
                'description': r['description'] or '',
                'cover': r['cover'],
                'images': json.loads(r['images']) if r['images'] else [],
                'jumpUrl': r['jump_url'] or '',
                'commentOid': r['comment_oid'] or '',
                'commentType': r['comment_type'] or 0,
                'isRead': bool(r['is_read'])
            }
            dynamic['comments'] = get_comments_for_dynamic(r['dynamic_id'])
            dynamics.append(dynamic)
        
        if not mid:
            grouped = {}
            for d in dynamics:
                if d['mid'] not in grouped:
                    grouped[d['mid']] = []
                grouped[d['mid']].append(d)
            return jsonify({'success': True, 'data': grouped})
        
        return jsonify({'success': True, 'data': dynamics})
    except Exception as e:
        print(f"获取动态失败: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@bi_bp.route('/dynamics/grouped', methods=['GET'])
def get_dynamics_grouped():
    """获取按UP主分组的动态"""
    err = _check_db()
    if err:
        return err
    
    try:
        sql = """
            SELECT d.dynamic_id, d.mid, d.timestamp, d.title, d.description, d.cover, 
                   d.images, d.jump_url, d.comment_oid, d.comment_type, d.is_read,
                   u.name as up_name, u.face as up_face
            FROM bi_dynamics d
            LEFT JOIN bi_ups u ON d.mid = u.mid
            ORDER BY d.timestamp DESC
        """
        rows = db.execute_query(sql)
        
        grouped = {}
        for r in rows:
            mid = r['mid']
            if mid not in grouped:
                grouped[mid] = []
            
            dynamic = {
                'id': r['dynamic_id'],
                'mid': mid,
                'timestamp': r['timestamp'],
                'title': r['title'] or '',
                'description': r['description'] or '',
                'cover': r['cover'],
                'images': json.loads(r['images']) if r['images'] else [],
                'jumpUrl': r['jump_url'] or '',
                'commentOid': r['comment_oid'] or '',
                'commentType': r['comment_type'] or 0,
                'isRead': bool(r['is_read']),
                'comments': get_comments_for_dynamic(r['dynamic_id'])
            }
            grouped[mid].append(dynamic)
        
        return jsonify({'success': True, 'data': grouped})
    except Exception as e:
        print(f"获取分组动态失败: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============== Read Status API ==============

@bi_bp.route('/read', methods=['POST'])
def mark_as_read():
    """标记为已读"""
    err = _check_db()
    if err:
        return err
    
    try:
        data = request.json
        item_id = data.get('id')
        item_type = data.get('type', 'dynamic')
        
        sql = """
            INSERT INTO bi_read_ids (item_id, item_type)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE item_id = item_id
        """
        db.execute_modify(sql, (item_id, item_type))
        
        if item_type == 'dynamic':
            db.execute_modify("UPDATE bi_dynamics SET is_read = 1 WHERE dynamic_id = %s", (item_id,))
        else:
            db.execute_modify("UPDATE bi_comments SET is_read = 1 WHERE comment_id = %s", (item_id,))
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"标记已读失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bi_bp.route('/read/<item_id>', methods=['GET'])
def check_read_status(item_id: str):
    """检查是否已读"""
    err = _check_db()
    if err:
        return err
    
    try:
        sql = "SELECT 1 FROM bi_read_ids WHERE item_id = %s"
        result = db.execute_query(sql, (item_id,), fetch_one=True)
        return jsonify({'success': True, 'isRead': result is not None})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============== 健康检查 ==============

@bi_bp.route('/health', methods=['GET'])
def bi_health():
    """Bili Monitor健康检查"""
    if not db.is_available:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': '数据库服务不可用'
        }), 503
    
    try:
        if db.health_check():
            return jsonify({
                'success': True,
                'status': 'healthy',
                'message': 'Bili Monitor API服务运行正常'
            })
        else:
            return jsonify({
                'success': False,
                'status': 'unhealthy',
                'error': '数据库连接失败'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 500

