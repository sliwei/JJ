#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bili Monitor API服务
提供设置、UP主、动态、评论的CRUD接口，以及后台轮询服务
"""

import os

# 加载环境变量 (开发环境从 .env 文件读取)
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

import json
import time
import hashlib
import threading
import traceback
import requests
from datetime import datetime
from typing import Optional, List, Dict, Any
from urllib.parse import urlencode

from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
from pymysql.cursors import DictCursor
from dbutils.pooled_db import PooledDB


# ============== WBI签名 ==============
MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
    26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
    20, 34, 44, 52
]

# WBI密钥缓存
wbi_keys_cache = {
    'img_key': None,
    'sub_key': None,
    'last_cookie': None
}


def get_mixin_key(orig: str) -> str:
    """获取混合密钥"""
    return ''.join([orig[i] for i in MIXIN_KEY_ENC_TAB])[:32]


def enc_wbi(params: dict, img_key: str, sub_key: str) -> dict:
    """WBI签名"""
    mixin_key = get_mixin_key(img_key + sub_key)
    curr_time = int(time.time())
    params['wts'] = curr_time
    
    # 按key排序并过滤特殊字符
    params = dict(sorted(params.items()))
    params = {
        k: ''.join(c for c in str(v) if c not in "!'()*")
        for k, v in params.items()
    }
    
    query = urlencode(params)
    wbi_sign = hashlib.md5((query + mixin_key).encode()).hexdigest()
    params['w_rid'] = wbi_sign
    return params


def refresh_wbi_keys(cookie: str) -> bool:
    """刷新WBI密钥"""
    global wbi_keys_cache
    try:
        headers = {
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.bilibili.com'
        }
        resp = requests.get('https://api.bilibili.com/x/web-interface/nav', headers=headers, timeout=10)
        data = resp.json()
        
        if data.get('code') != 0:
            print(f"刷新WBI密钥失败: {data.get('message')}")
            return False
        
        wbi_img = data.get('data', {}).get('wbi_img', {})
        img_url = wbi_img.get('img_url', '')
        sub_url = wbi_img.get('sub_url', '')
        
        wbi_keys_cache['img_key'] = img_url.split('/')[-1].split('.')[0]
        wbi_keys_cache['sub_key'] = sub_url.split('/')[-1].split('.')[0]
        wbi_keys_cache['last_cookie'] = cookie
        
        print(f"✓ WBI密钥已刷新")
        return True
    except Exception as e:
        print(f"刷新WBI密钥异常: {e}")
        return False


def get_signed_params(params: dict, cookie: str) -> dict:
    """获取带签名的参数"""
    # 检查是否需要刷新密钥
    if not wbi_keys_cache['img_key'] or wbi_keys_cache['last_cookie'] != cookie:
        refresh_wbi_keys(cookie)
    
    if wbi_keys_cache['img_key'] and wbi_keys_cache['sub_key']:
        return enc_wbi(params, wbi_keys_cache['img_key'], wbi_keys_cache['sub_key'])
    return params

# ============== 配置 ==============
# 数据库配置从环境变量读取，无默认值（强制配置）
DB_CONFIG = {
    'host': os.environ.get('DB_HOST'),
    'port': int(os.environ.get('DB_PORT', 3306)),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'database': os.environ.get('DB_NAME'),
    'charset': 'utf8mb4',
    'cursorclass': DictCursor
}

# 验证必要的环境变量
_required_env = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
_missing_env = [k for k in _required_env if not os.environ.get(k)]
if _missing_env:
    print(f"⚠️ 缺少必要的环境变量: {', '.join(_missing_env)}")
    print("请配置 .env 文件或设置环境变量")

# 数据库连接池
db_pool = PooledDB(
    creator=pymysql,
    maxconnections=10,
    mincached=2,
    maxcached=5,
    blocking=True,
    **DB_CONFIG
)

app = Flask(__name__)
CORS(app)

# ============== 数据库操作辅助函数 ==============

def get_db_connection():
    """获取数据库连接"""
    return db_pool.connection()


def execute_query(sql: str, params: tuple = None, fetch_one: bool = False) -> Any:
    """执行查询SQL"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            if fetch_one:
                return cursor.fetchone()
            return cursor.fetchall()
    finally:
        conn.close()


def execute_modify(sql: str, params: tuple = None) -> int:
    """执行修改SQL，返回受影响行数"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            result = cursor.execute(sql, params)
            conn.commit()
            return result
    finally:
        conn.close()


def execute_insert(sql: str, params: tuple = None) -> int:
    """执行插入SQL，返回自增ID"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            conn.commit()
            return cursor.lastrowid
    finally:
        conn.close()


# ============== Settings API ==============

@app.route('/api/bi/settings', methods=['GET'])
def get_settings():
    """获取设置"""
    try:
        sql = "SELECT * FROM bi_settings WHERE id = 1"
        row = execute_query(sql, fetch_one=True)
        
        if not row:
            # 返回默认设置
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


@app.route('/api/bi/settings', methods=['POST'])
def save_settings():
    """保存设置"""
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
        execute_modify(sql, params)
        
        # 重启轮询服务
        polling_service.restart()
        
        return jsonify({'success': True, 'message': '设置已保存'})
    except Exception as e:
        print(f"保存设置失败: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============== UPs API ==============

@app.route('/api/bi/ups', methods=['GET'])
def get_ups():
    """获取UP主列表"""
    try:
        sql = "SELECT mid, name, face FROM bi_ups ORDER BY created_at"
        rows = execute_query(sql)
        return jsonify({
            'success': True,
            'data': [{'mid': r['mid'], 'name': r['name'], 'face': r['face']} for r in rows]
        })
    except Exception as e:
        print(f"获取UP列表失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/bi/ups', methods=['POST'])
def add_up():
    """添加UP主"""
    try:
        data = request.json
        sql = """
            INSERT INTO bi_ups (mid, name, face)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE name = VALUES(name), face = VALUES(face)
        """
        execute_modify(sql, (data['mid'], data['name'], data.get('face', '')))
        return jsonify({'success': True, 'message': 'UP主已添加'})
    except Exception as e:
        print(f"添加UP主失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/bi/ups/<mid>', methods=['DELETE'])
def remove_up(mid: str):
    """删除UP主"""
    try:
        execute_modify("DELETE FROM bi_ups WHERE mid = %s", (mid,))
        return jsonify({'success': True, 'message': 'UP主已删除'})
    except Exception as e:
        print(f"删除UP主失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/bi/ups/search', methods=['GET'])
def search_up():
    """搜索UP主（从B站API）"""
    try:
        keyword = request.args.get('keyword', '')
        if not keyword:
            return jsonify({'success': False, 'error': '关键词不能为空'}), 400
        
        # 从数据库获取cookie
        settings = execute_query("SELECT cookie FROM bi_settings WHERE id = 1", fetch_one=True)
        cookie = settings.get('cookie') if settings else ''
        
        if not cookie:
            return jsonify({'success': False, 'error': '请先配置Cookie'}), 400
        
        # 使用WBI签名搜索
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

@app.route('/api/bi/dynamics', methods=['GET'])
def get_dynamics():
    """获取动态列表"""
    try:
        mid = request.args.get('mid')
        
        if mid:
            sql = """
                SELECT dynamic_id, mid, timestamp, title, description, cover, 
                       images, jump_url, comment_oid, comment_type, is_read
                FROM bi_dynamics WHERE mid = %s ORDER BY timestamp DESC
            """
            rows = execute_query(sql, (mid,))
        else:
            sql = """
                SELECT dynamic_id, mid, timestamp, title, description, cover, 
                       images, jump_url, comment_oid, comment_type, is_read
                FROM bi_dynamics ORDER BY timestamp DESC LIMIT 100
            """
            rows = execute_query(sql)
        
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
            # 获取评论
            dynamic['comments'] = get_comments_for_dynamic(r['dynamic_id'])
            dynamics.append(dynamic)
        
        # 按mid分组
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


def get_comments_for_dynamic(dynamic_id: str) -> List[Dict]:
    """获取动态的评论列表（包含嵌套回复）"""
    sql = """
        SELECT comment_id, dynamic_id, parent_id, root_id, content, timestamp,
               user_name, user_face, is_pinned, reply_count, is_read
        FROM bi_comments WHERE dynamic_id = %s ORDER BY timestamp
    """
    rows = execute_query(sql, (dynamic_id,))
    
    # 构建评论树
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
    
    # 组装回复
    for r in rows:
        if r['parent_id'] and r['parent_id'] in comments_map:
            parent = comments_map[r['parent_id']]
            parent['replies'].append(comments_map[r['comment_id']])
    
    return root_comments


@app.route('/api/bi/dynamics/grouped', methods=['GET'])
def get_dynamics_grouped():
    """获取按UP主分组的动态（供前端轮询使用）"""
    try:
        sql = """
            SELECT d.dynamic_id, d.mid, d.timestamp, d.title, d.description, d.cover, 
                   d.images, d.jump_url, d.comment_oid, d.comment_type, d.is_read,
                   u.name as up_name, u.face as up_face
            FROM bi_dynamics d
            LEFT JOIN bi_ups u ON d.mid = u.mid
            ORDER BY d.timestamp DESC
        """
        rows = execute_query(sql)
        
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

@app.route('/api/bi/read', methods=['POST'])
def mark_as_read():
    """标记为已读"""
    try:
        data = request.json
        item_id = data.get('id')
        item_type = data.get('type', 'dynamic')
        
        # 插入已读记录
        sql = """
            INSERT INTO bi_read_ids (item_id, item_type)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE item_id = item_id
        """
        execute_modify(sql, (item_id, item_type))
        
        # 更新对应表的is_read字段
        if item_type == 'dynamic':
            execute_modify("UPDATE bi_dynamics SET is_read = 1 WHERE dynamic_id = %s", (item_id,))
        else:
            execute_modify("UPDATE bi_comments SET is_read = 1 WHERE comment_id = %s", (item_id,))
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"标记已读失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/bi/read/<item_id>', methods=['GET'])
def check_read_status(item_id: str):
    """检查是否已读"""
    try:
        sql = "SELECT 1 FROM bi_read_ids WHERE item_id = %s"
        result = execute_query(sql, (item_id,), fetch_one=True)
        return jsonify({'success': True, 'isRead': result is not None})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============== 轮询服务 ==============

class PollingService:
    """后台轮询服务"""
    
    def __init__(self):
        self.dynamic_timer: Optional[threading.Timer] = None
        self.comment_timer: Optional[threading.Timer] = None
        self.is_polling_dynamics = False
        self.is_polling_comments = False
        self._running = False
    
    def start(self):
        """启动轮询服务"""
        if self._running:
            return
        self._running = True
        self._schedule_dynamic_poll()
        self._schedule_comment_poll()
        print("✓ 轮询服务已启动")
    
    def stop(self):
        """停止轮询服务"""
        self._running = False
        if self.dynamic_timer:
            self.dynamic_timer.cancel()
            self.dynamic_timer = None
        if self.comment_timer:
            self.comment_timer.cancel()
            self.comment_timer = None
        print("✓ 轮询服务已停止")
    
    def restart(self):
        """重启轮询服务"""
        self.stop()
        self.start()
    
    def _get_settings(self) -> Dict:
        """获取设置"""
        sql = "SELECT * FROM bi_settings WHERE id = 1"
        row = execute_query(sql, fetch_one=True)
        return row if row else {}
    
    def _get_ups(self) -> List[Dict]:
        """获取UP列表"""
        sql = "SELECT mid, name, face FROM bi_ups"
        return execute_query(sql)
    
    def _schedule_dynamic_poll(self):
        """调度动态轮询"""
        if not self._running:
            return
        
        settings = self._get_settings()
        if not settings.get('enable_dynamic_polling'):
            return
        
        interval = settings.get('dynamic_polling_interval', 5) * 60  # 转换为秒
        
        def poll_task():
            if self._running and settings.get('enable_dynamic_polling'):
                self._poll_dynamics()
            self._schedule_dynamic_poll()
        
        self.dynamic_timer = threading.Timer(interval, poll_task)
        self.dynamic_timer.daemon = True
        self.dynamic_timer.start()
    
    def _schedule_comment_poll(self):
        """调度评论轮询"""
        if not self._running:
            return
        
        settings = self._get_settings()
        if not settings.get('enable_comment_polling'):
            return
        
        interval = settings.get('comment_polling_interval', 5) * 60
        
        def poll_task():
            if self._running and settings.get('enable_comment_polling'):
                self._poll_comments()
            self._schedule_comment_poll()
        
        self.comment_timer = threading.Timer(interval, poll_task)
        self.comment_timer.daemon = True
        self.comment_timer.start()
    
    def _poll_dynamics(self):
        """轮询动态"""
        if self.is_polling_dynamics:
            return
        
        settings = self._get_settings()
        cookie = settings.get('cookie')
        if not cookie:
            return
        
        self.is_polling_dynamics = True
        try:
            ups = self._get_ups()
            new_count = 0
            
            for up in ups:
                try:
                    dynamics = self._fetch_dynamics(up['mid'], cookie)
                    for d in dynamics:
                        if self._save_dynamic(d, up):
                            new_count += 1
                            # 发送钉钉通知
                            if settings.get('dingtalk_access_token'):
                                self._send_dingtalk(
                                    type_='新动态',
                                    up_name=up['name'],
                                    content=d.get('title') or d.get('description', ''),
                                    jump_url=d.get('jumpUrl', ''),
                                    timestamp=d.get('timestamp', int(time.time())),
                                    settings=settings
                                )
                except Exception as e:
                    print(f"轮询UP {up['name']} 动态失败: {e}")
            
            # 记录日志
            self._log_poll('dynamic', 'success', f'轮询完成，新增{new_count}条动态', new_count)
            
        except Exception as e:
            print(f"动态轮询失败: {e}")
            traceback.print_exc()
            self._log_poll('dynamic', 'failed', str(e), 0)
        finally:
            self.is_polling_dynamics = False
    
    def _poll_comments(self):
        """轮询评论"""
        if self.is_polling_comments:
            return
        
        settings = self._get_settings()
        cookie = settings.get('cookie')
        if not cookie:
            return
        
        self.is_polling_comments = True
        try:
            ups = self._get_ups()
            ups_map = {u['mid']: u for u in ups}
            
            now = time.time()
            time_limit = settings.get('comment_time_range', 48) * 3600
            
            # 获取时间范围内的动态
            sql = """
                SELECT dynamic_id, mid, comment_oid, comment_type, title, description, jump_url
                FROM bi_dynamics WHERE timestamp > %s
            """
            dynamics = execute_query(sql, (now - time_limit,))
            
            new_count = 0
            for d in dynamics:
                try:
                    up = ups_map.get(d['mid'], {})
                    up_name = up.get('name', '')
                    
                    comments = self._fetch_comments(d['comment_oid'], d['comment_type'], cookie)
                    
                    for c in comments:
                        is_new = self._save_comment(c, d['dynamic_id'])
                        if is_new and c.get('userName') == up_name:
                            new_count += 1
                            # UP主的新评论，发送通知
                            if settings.get('dingtalk_access_token'):
                                self._send_dingtalk(
                                    type_='新评论',
                                    up_name=up_name,
                                    content=c.get('content', ''),
                                    jump_url=d['jump_url'] or '',
                                    timestamp=c.get('timestamp', int(time.time())),
                                    settings=settings
                                )
                        
                        # 处理回复
                        for reply in c.get('replies', []):
                            is_new_reply = self._save_comment(reply, d['dynamic_id'], c['id'])
                            if is_new_reply and reply.get('userName') == up_name:
                                new_count += 1
                                if settings.get('dingtalk_access_token'):
                                    self._send_dingtalk(
                                        type_='新回复',
                                        up_name=up_name,
                                        content=reply.get('content', ''),
                                        jump_url=d['jump_url'] or '',
                                        timestamp=reply.get('timestamp', int(time.time())),
                                        settings=settings
                                    )
                except Exception as e:
                    print(f"轮询动态 {d['dynamic_id']} 评论失败: {e}")
            
            self._log_poll('comment', 'success', f'轮询完成，新增{new_count}条UP主评论', new_count)
            
        except Exception as e:
            print(f"评论轮询失败: {e}")
            traceback.print_exc()
            self._log_poll('comment', 'failed', str(e), 0)
        finally:
            self.is_polling_comments = False
    
    def _fetch_dynamics(self, mid: str, cookie: str) -> List[Dict]:
        """从B站API获取动态（带WBI签名）"""
        params = {
            'host_mid': mid,
            'platform': 'web',
            'features': 'itemOpusStyle,listOnlyfans,opusBigCover,onlyfansVote,forwardListHidden,decorationCard,commentsNewVersion,onlyfansAssetsV2,ugcDelete,onlyfansQaCard,avatarAutoTheme,sunflowerStyle,cardsEnhance',
            'web_location': '333.1387'
        }
        signed_params = get_signed_params(params, cookie)
        
        headers = {
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://space.bilibili.com'
        }
        
        resp = requests.get(
            'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space',
            params=signed_params,
            headers=headers,
            timeout=10
        )
        data = resp.json()
        
        if data.get('code') != 0:
            raise Exception(f"API错误: {data.get('message')}")
        
        items = data.get('data', {}).get('items', [])
        dynamics = []
        
        for item in items:
            modules = item.get('modules', {})
            author = modules.get('module_author', {})
            dynamic = modules.get('module_dynamic', {})
            
            # 提取内容
            desc = dynamic.get('desc', {})
            major = dynamic.get('major', {})
            
            d = {
                'id': item.get('id_str', ''),
                'mid': mid,
                'timestamp': author.get('pub_ts', 0),
                'title': '',
                'description': desc.get('text', '') if desc else '',
                'cover': '',
                'images': [],
                'jumpUrl': f"https://t.bilibili.com/{item.get('id_str', '')}",
                'commentOid': '',
                'commentType': 17
            }
            
            # 处理不同类型的动态
            if major:
                major_type = major.get('type')
                if major_type == 'MAJOR_TYPE_ARCHIVE':
                    archive = major.get('archive', {})
                    d['title'] = archive.get('title', '')
                    d['cover'] = archive.get('cover', '')
                    d['jumpUrl'] = archive.get('jump_url', d['jumpUrl'])
                    d['commentOid'] = archive.get('aid', '')
                    d['commentType'] = 1
                elif major_type == 'MAJOR_TYPE_DRAW':
                    draw = major.get('draw', {})
                    d['images'] = [img.get('src', '') for img in draw.get('items', [])]
                    d['commentOid'] = str(draw.get('id', ''))
                    d['commentType'] = 11
                elif major_type == 'MAJOR_TYPE_ARTICLE':
                    article = major.get('article', {})
                    d['title'] = article.get('title', '')
                    d['cover'] = article.get('covers', [''])[0] if article.get('covers') else ''
                    d['jumpUrl'] = article.get('jump_url', d['jumpUrl'])
                    d['commentOid'] = str(article.get('id', ''))
                    d['commentType'] = 12
            
            # 获取评论OID
            basic = item.get('basic', {})
            if basic.get('comment_id_str'):
                d['commentOid'] = basic.get('comment_id_str')
            if basic.get('comment_type'):
                d['commentType'] = basic.get('comment_type')
            
            dynamics.append(d)
        
        return dynamics
    
    def _fetch_comments(self, oid: str, type_: int, cookie: str) -> List[Dict]:
        """从B站API获取评论（带WBI签名）"""
        if not oid:
            return []
        
        params = {
            'oid': oid,
            'type': type_,
            'mode': 3,
            'pagination_str': json.dumps({'offset': ''}),
            'plat': 1,
            'web_location': '1315875'
        }
        signed_params = get_signed_params(params, cookie)
        
        headers = {
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.bilibili.com'
        }
        
        resp = requests.get(
            'https://api.bilibili.com/x/v2/reply/wbi/main',
            params=signed_params,
            headers=headers,
            timeout=10
        )
        data = resp.json()
        
        if data.get('code') != 0:
            return []
        
        replies = data.get('data', {}).get('replies', []) or []
        top_upper = data.get('data', {}).get('top', {}).get('upper')
        comments = []
        
        # 处理置顶评论
        if top_upper:
            pinned = self._parse_reply(top_upper, cookie, oid, type_, is_pinned=True)
            comments.append(pinned)
        
        # 处理普通评论
        for r in replies:
            comment = self._parse_reply(r, cookie, oid, type_)
            comments.append(comment)
        
        return comments
    
    def _parse_reply(self, r: dict, cookie: str, oid: str, type_: int, is_pinned: bool = False) -> Dict:
        """解析评论数据"""
        root_id = str(r.get('rpid', ''))
        reply_count = r.get('rcount', 0)
        
        comment = {
            'id': root_id,
            'content': r.get('content', {}).get('message', ''),
            'timestamp': r.get('ctime', 0),
            'userName': r.get('member', {}).get('uname', ''),
            'userFace': r.get('member', {}).get('avatar', ''),
            'isPinned': is_pinned,
            'replyCount': reply_count,
            'rootId': root_id,
            'replies': []
        }
        
        # 获取子回复
        # 如果内嵌的回复数量小于总回复数，需要调用专门的子回复API
        inline_replies = r.get('replies', []) or []
        
        if reply_count > 0 and len(inline_replies) < reply_count:
            # 调用子回复API获取完整回复
            try:
                sub_replies = self._fetch_sub_replies(oid, type_, root_id, cookie)
                comment['replies'] = sub_replies
            except Exception as e:
                print(f"获取子回复失败: {e}")
                # 降级使用内嵌的回复
                for sr in inline_replies:
                    comment['replies'].append({
                        'id': str(sr.get('rpid', '')),
                        'content': sr.get('content', {}).get('message', ''),
                        'timestamp': sr.get('ctime', 0),
                        'userName': sr.get('member', {}).get('uname', ''),
                        'userFace': sr.get('member', {}).get('avatar', ''),
                        'rootId': root_id
                    })
        else:
            # 使用内嵌的回复
            for sr in inline_replies:
                comment['replies'].append({
                    'id': str(sr.get('rpid', '')),
                    'content': sr.get('content', {}).get('message', ''),
                    'timestamp': sr.get('ctime', 0),
                    'userName': sr.get('member', {}).get('uname', ''),
                    'userFace': sr.get('member', {}).get('avatar', ''),
                    'rootId': root_id
                })
        
        return comment
    
    def _fetch_sub_replies(self, oid: str, type_: int, root: str, cookie: str, ps: int = 50) -> List[Dict]:
        """获取子回复（楼中楼）"""
        headers = {
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.bilibili.com'
        }
        
        all_replies = []
        pn = 1
        
        while True:
            params = {
                'oid': oid,
                'type': type_,
                'root': root,
                'ps': ps,
                'pn': pn,
                'web_location': '333.1368'
            }
            
            resp = requests.get(
                'https://api.bilibili.com/x/v2/reply/reply',
                params=params,
                headers=headers,
                timeout=10
            )
            data = resp.json()
            
            if data.get('code') != 0:
                break
            
            replies = data.get('data', {}).get('replies', []) or []
            if not replies:
                break
            
            for sr in replies:
                all_replies.append({
                    'id': str(sr.get('rpid', '')),
                    'content': sr.get('content', {}).get('message', ''),
                    'timestamp': sr.get('ctime', 0),
                    'userName': sr.get('member', {}).get('uname', ''),
                    'userFace': sr.get('member', {}).get('avatar', ''),
                    'rootId': root
                })
            
            # 如果返回的数量小于请求的数量，说明没有更多了
            if len(replies) < ps:
                break
            
            pn += 1
            
            # 最多获取5页，避免请求过多
            if pn > 5:
                break
        
        return all_replies
    
    def _save_dynamic(self, dynamic: Dict, up: Dict) -> bool:
        """保存动态，返回是否为新动态"""
        # 检查是否已存在
        sql = "SELECT 1 FROM bi_dynamics WHERE dynamic_id = %s"
        exists = execute_query(sql, (dynamic['id'],), fetch_one=True)
        
        if exists:
            return False
        
        # 检查是否已读
        is_read = execute_query(
            "SELECT 1 FROM bi_read_ids WHERE item_id = %s",
            (dynamic['id'],), fetch_one=True
        ) is not None
        
        sql = """
            INSERT INTO bi_dynamics (dynamic_id, mid, timestamp, title, description, cover,
                images, jump_url, comment_oid, comment_type, is_read)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        execute_modify(sql, (
            dynamic['id'],
            dynamic['mid'],
            dynamic['timestamp'],
            dynamic.get('title', ''),
            dynamic.get('description', ''),
            dynamic.get('cover'),
            json.dumps(dynamic.get('images', [])),
            dynamic.get('jumpUrl', ''),
            dynamic.get('commentOid', ''),
            dynamic.get('commentType', 0),
            1 if is_read else 0
        ))
        
        return True
    
    def _save_comment(self, comment: Dict, dynamic_id: str, parent_id: str = None) -> bool:
        """保存评论，返回是否为新评论"""
        # 检查是否已存在
        sql = "SELECT 1 FROM bi_comments WHERE comment_id = %s AND dynamic_id = %s"
        exists = execute_query(sql, (comment['id'], dynamic_id), fetch_one=True)
        
        if exists:
            return False
        
        is_read = execute_query(
            "SELECT 1 FROM bi_read_ids WHERE item_id = %s",
            (comment['id'],), fetch_one=True
        ) is not None
        
        sql = """
            INSERT INTO bi_comments (comment_id, dynamic_id, parent_id, root_id, content,
                timestamp, user_name, user_face, is_pinned, reply_count, is_read)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        execute_modify(sql, (
            comment['id'],
            dynamic_id,
            parent_id,
            comment.get('rootId'),
            comment.get('content', ''),
            comment.get('timestamp', 0),
            comment.get('userName', ''),
            comment.get('userFace', ''),
            1 if comment.get('isPinned') else 0,
            comment.get('replyCount', 0),
            1 if is_read else 0
        ))
        
        return True
    
    def _send_dingtalk(self, type_: str, up_name: str, content: str, 
                       jump_url: str, timestamp: int, settings: Dict):
        """发送钉钉通知"""
        access_token = settings.get('dingtalk_access_token')
        if not access_token:
            return
        
        keyword = settings.get('dingtalk_keyword', '动态')
        time_str = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
        
        markdown = {
            'title': f'{keyword}更新: {up_name}',
            'text': (
                f'### {keyword}更新通知\n\n'
                f'**UP主**: {up_name}\n\n'
                f'**类型**: {type_}\n\n'
                f'**时间**: {time_str}\n\n'
                f'**内容**: {content[:100]}{"..." if len(content) > 100 else ""}\n\n'
                f'[点击查看详情]({jump_url})'
            )
        }
        
        url = f'https://oapi.dingtalk.com/robot/send?access_token={access_token}'
        
        try:
            requests.post(url, json={'msgtype': 'markdown', 'markdown': markdown}, timeout=10)
        except Exception as e:
            print(f"发送钉钉通知失败: {e}")
    
    def _log_poll(self, poll_type: str, status: str, message: str, new_count: int):
        """记录轮询日志"""
        try:
            sql = """
                INSERT INTO bi_polling_logs (poll_type, status, message, new_count)
                VALUES (%s, %s, %s, %s)
            """
            execute_modify(sql, (poll_type, status, message, new_count))
        except:
            pass


# 创建全局轮询服务实例
polling_service = PollingService()


# ============== 健康检查 ==============

@app.route('/api/bi/health', methods=['GET'])
def bi_health():
    """健康检查"""
    try:
        execute_query("SELECT 1", fetch_one=True)
        return jsonify({
            'success': True,
            'status': 'healthy',
            'message': 'Bili Monitor API服务运行正常'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 500


# ============== 启动 ==============

def init_polling():
    """初始化轮询服务"""
    print("=" * 60)
    print("🚀 初始化 Bili Monitor 轮询服务...")
    print("=" * 60)
    polling_service.start()


# 模块导入时自动初始化
init_polling()


if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("📺 启动 Bili Monitor API服务")
    print("=" * 60)
    print(f"数据库: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    print("=" * 60 + "\n")
    
    app.run(host='0.0.0.0', port=8081, debug=False)
