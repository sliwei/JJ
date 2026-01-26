#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bili Monitor API Blueprint
提供设置、UP主、动态、评论的CRUD接口
"""

import json
import traceback
import requests
import hashlib
from datetime import datetime, timedelta
from functools import wraps
from typing import List, Dict

import jwt
from flask import Blueprint, request, jsonify

from config import Config
from services.database import db
from services.polling import polling_service
from utils.wbi import get_signed_params

# 创建Blueprint
bi_bp = Blueprint('bi', __name__, url_prefix='/api/bi')


# ============== JWT 认证 ==============

def generate_token(user_id: int, username: str) -> str:
    """生成JWT Token"""
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(days=Config.JWT_EXPIRES_DAYS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')


def verify_token(token: str) -> dict:
    """验证JWT Token，返回payload或None"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def require_token(f):
    """Token校验装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header:
            return jsonify({'success': False, 'error': '未提供认证令牌'}), 401
        
        # 支持 "Bearer <token>" 格式
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'success': False, 'error': '认证令牌无效或已过期'}), 401
        
        # 将用户信息存入请求上下文
        request.current_user = payload
        return f(*args, **kwargs)
    
    return decorated


def md5_hash(text: str) -> str:
    """MD5加密"""
    return hashlib.md5(text.encode('utf-8')).hexdigest()


# ============== 登录接口 ==============

@bi_bp.route('/login', methods=['POST'])
def login():
    """用户登录"""
    err = _check_db()
    if err:
        return err
    
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({'success': False, 'error': '用户名和密码不能为空'}), 400
        
        # 查询用户
        sql = "SELECT id, name, user, password, allow FROM bstu_user WHERE user = %s"
        user = db.execute_query(sql, (username,), fetch_one=True)
        
        if not user:
            return jsonify({'success': False, 'error': '用户名或密码错误'}), 401
        
        # 检查是否允许登录
        if not user.get('allow'):
            return jsonify({'success': False, 'error': '账号已被禁用'}), 403
        
        # 验证密码（支持明文和MD5两种方式）
        stored_password = user.get('password', '')
        password_valid = (
            stored_password == password or  # 明文比对
            stored_password == md5_hash(password)  # MD5比对
        )
        
        if not password_valid:
            return jsonify({'success': False, 'error': '用户名或密码错误'}), 401
        
        # 更新最近登录时间
        db.execute_modify(
            "UPDATE bstu_user SET newly_login = NOW() WHERE id = %s",
            (user['id'],)
        )
        
        # 生成Token
        token = generate_token(user['id'], user['user'])
        
        return jsonify({
            'success': True,
            'data': {
                'token': token,
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'username': user['user']
                }
            }
        })
    except Exception as e:
        print(f"登录失败: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


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
@require_token
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
                    'commentTimeRange': 5,
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
@require_token
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
            data.get('commentTimeRange', 5),
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
@require_token
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
@require_token
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
@require_token
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
@require_token
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

def _build_comment_tree(rows: List[Dict]) -> List[Dict]:
    """构建评论树结构（从评论列表构建嵌套回复）"""
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


def get_comments_for_dynamic(dynamic_id: str) -> List[Dict]:
    """获取动态的评论列表（包含嵌套回复）"""
    sql = """
        SELECT comment_id, dynamic_id, parent_id, root_id, content, timestamp,
               user_name, user_face, is_pinned, reply_count, is_read
        FROM bi_comments WHERE dynamic_id = %s ORDER BY timestamp
    """
    rows = db.execute_query(sql, (dynamic_id,))
    return _build_comment_tree(rows)


def get_comments_batch(dynamic_ids: List[str]) -> Dict[str, List[Dict]]:
    """批量获取多个动态的评论列表（避免N+1查询问题）"""
    if not dynamic_ids:
        return {}
    
    # 使用 IN 查询一次性获取所有评论
    placeholders = ','.join(['%s'] * len(dynamic_ids))
    sql = f"""
        SELECT comment_id, dynamic_id, parent_id, root_id, content, timestamp,
               user_name, user_face, is_pinned, reply_count, is_read
        FROM bi_comments 
        WHERE dynamic_id IN ({placeholders})
        ORDER BY dynamic_id, timestamp
    """
    rows = db.execute_query(sql, tuple(dynamic_ids))
    
    # 按 dynamic_id 分组
    comments_by_dynamic = {}
    for r in rows:
        dynamic_id = r['dynamic_id']
        if dynamic_id not in comments_by_dynamic:
            comments_by_dynamic[dynamic_id] = []
        comments_by_dynamic[dynamic_id].append(r)
    
    # 为每个动态构建评论树
    result = {}
    for dynamic_id, comment_rows in comments_by_dynamic.items():
        result[dynamic_id] = _build_comment_tree(comment_rows)
    
    # 确保所有 dynamic_id 都有对应的空列表（即使没有评论）
    for dynamic_id in dynamic_ids:
        if dynamic_id not in result:
            result[dynamic_id] = []
    
    return result


@bi_bp.route('/dynamics', methods=['GET'])
@require_token
def get_dynamics():
    """获取动态列表"""
    err = _check_db()
    if err:
        return err
    
    try:
        mid = request.args.get('mid')
        limit = request.args.get('limit', 100, type=int)
        limit = min(max(limit, 1), 1000)  # 限制在1-1000之间
        
        if mid:
            sql = """
                SELECT dynamic_id, mid, timestamp, title, description, cover, 
                       images, jump_url, comment_oid, comment_type, is_read
                FROM bi_dynamics WHERE mid = %s ORDER BY timestamp DESC LIMIT %s
            """
            rows = db.execute_query(sql, (mid, limit))
        else:
            sql = """
                SELECT dynamic_id, mid, timestamp, title, description, cover, 
                       images, jump_url, comment_oid, comment_type, is_read
                FROM bi_dynamics ORDER BY timestamp DESC LIMIT %s
            """
            rows = db.execute_query(sql, (limit,))
        
        # 收集所有 dynamic_id，用于批量查询评论
        dynamic_ids = [r['dynamic_id'] for r in rows]
        
        # 批量获取所有评论（避免N+1查询问题）
        comments_by_dynamic = get_comments_batch(dynamic_ids)
        
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
                'isRead': bool(r['is_read']),
                'comments': comments_by_dynamic.get(r['dynamic_id'], [])
            }
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
@require_token
def get_dynamics_grouped():
    """获取按UP主分组的动态"""
    err = _check_db()
    if err:
        return err
    
    try:
        # 获取限制数量（默认100，最大1000）
        limit = request.args.get('limit', 100, type=int)
        limit = min(max(limit, 1), 1000)  # 限制在1-1000之间
        
        sql = """
            SELECT d.dynamic_id, d.mid, d.timestamp, d.title, d.description, d.cover, 
                   d.images, d.jump_url, d.comment_oid, d.comment_type, d.is_read,
                   u.name as up_name, u.face as up_face
            FROM bi_dynamics d
            LEFT JOIN bi_ups u ON d.mid = u.mid
            ORDER BY d.timestamp DESC
            LIMIT %s
        """
        rows = db.execute_query(sql, (limit,))
        
        # 收集所有 dynamic_id，用于批量查询评论
        dynamic_ids = [r['dynamic_id'] for r in rows]
        
        # 批量获取所有评论（避免N+1查询问题）
        comments_by_dynamic = get_comments_batch(dynamic_ids)
        
        # 构建分组结果
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
                'comments': comments_by_dynamic.get(r['dynamic_id'], [])
            }
            grouped[mid].append(dynamic)
        
        return jsonify({'success': True, 'data': grouped})
    except Exception as e:
        print(f"获取分组动态失败: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============== Read Status API ==============

@bi_bp.route('/read', methods=['POST'])
@require_token
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
@require_token
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

