#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
轮询服务模块
B站动态和评论的后台轮询
"""

import json
import time
import threading
import traceback
import requests
from datetime import datetime
from typing import Optional, List, Dict, Any

from services.database import db
from utils.wbi import get_signed_params


class PollingService:
    """后台轮询服务"""
    
    _instance: Optional['PollingService'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_init_done') and self._init_done:
            return
        
        self.dynamic_timer: Optional[threading.Timer] = None
        self.comment_timer: Optional[threading.Timer] = None
        self.is_polling_dynamics = False
        self.is_polling_comments = False
        self._running = False
        self._init_done = True
    
    def start(self):
        """启动轮询服务"""
        if self._running:
            return
        
        if not db.is_available:
            print("⚠️ 数据库不可用，轮询服务未启动")
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
        row = db.execute_query(sql, fetch_one=True)
        return row if row else {}
    
    def _get_ups(self) -> List[Dict]:
        """获取UP列表"""
        sql = "SELECT mid, name, face FROM bi_ups"
        return db.execute_query(sql)
    
    def _schedule_dynamic_poll(self):
        """调度动态轮询"""
        if not self._running:
            return
        
        settings = self._get_settings()
        interval = int(settings.get('dynamic_polling_interval', 5)) * 60
        def poll_task():
            # 每次执行时重新读取设置，确保开关状态是最新的
            current_settings = self._get_settings()
            if self._running and current_settings.get('enable_dynamic_polling'):
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
        interval = int(settings.get('comment_polling_interval', 5)) * 60
        
        def poll_task():
            # 每次执行时重新读取设置，确保开关状态是最新的
            current_settings = self._get_settings()
            if self._running and current_settings.get('enable_comment_polling'):
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
                            if settings.get('dingtalk_access_token'):
                                self._send_dingtalk(
                                    type_='新动态',
                                    up_name=up['name'],
                                    content=d.get('title') or d.get('description', ''),
                                    jump_url=d.get('jumpUrl', ''),
                                    timestamp=int(d.get('timestamp', time.time())),
                                    settings=settings
                                )
                except Exception as e:
                    print(f"轮询UP {up['name']} 动态失败: {e}")
                    traceback.print_exc()
            
            # self._log_poll('dynamic', 'success', f'轮询完成，新增{new_count}条动态', new_count)
            
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
            time_limit = int(settings.get('comment_time_range', 48)) * 3600
            
            sql = """
                SELECT dynamic_id, mid, comment_oid, comment_type, title, description, jump_url
                FROM bi_dynamics WHERE timestamp > %s
            """
            dynamics = db.execute_query(sql, (now - time_limit,))
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
                            if settings.get('dingtalk_access_token'):
                                self._send_dingtalk(
                                    type_='新评论',
                                    up_name=up_name,
                                    content=c.get('content', ''),
                                    jump_url=d['jump_url'] or '',
                                    timestamp=int(c.get('timestamp', time.time())),
                                    settings=settings
                                )
                        
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
                                        timestamp=int(reply.get('timestamp', time.time())),
                                        settings=settings
                                    )
                except Exception as e:
                    print(f"轮询动态 {d['dynamic_id']} 评论失败: {e}")
            
            # self._log_poll('comment', 'success', f'轮询完成，新增{new_count}条UP主评论', new_count)
            
        except Exception as e:
            print(f"评论轮询失败: {e}")
            traceback.print_exc()
            self._log_poll('comment', 'failed', str(e), 0)
        finally:
            self.is_polling_comments = False
    
    def _fetch_dynamics(self, mid: str, cookie: str) -> List[Dict]:
        """从B站API获取动态"""
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
                elif major_type == 'MAJOR_TYPE_OPUS':
                    opus = major.get('opus', {})
                    d['title'] = opus.get('title', '')
                    pics = opus.get('pics', [])
                    d['cover'] = pics[0].get('url', '') if pics else ''
                    d['jumpUrl'] = opus.get('jump_url', d['jumpUrl'])
                    # opus.summary.text
                    d['description'] = opus.get('summary', {}).get('text', '')
                    d['commentType'] = 13

            basic = item.get('basic', {})
            if basic.get('comment_id_str'):
                d['commentOid'] = basic.get('comment_id_str')
            if basic.get('comment_type'):
                d['commentType'] = basic.get('comment_type')
            
            dynamics.append(d)
        
        return dynamics
    
    def _fetch_comments(self, oid: str, type_: int, cookie: str) -> List[Dict]:
        """从B站API获取评论"""
        if not oid:
            return []
        
        # 不使用 WBI 签名的评论接口
        params = {
            'oid': str(oid),
            'type': int(type_),
            'mode': 3,
            'ps': 20,
            'pn': 1
        }
        
        headers = {
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
            'Referer': 'https://www.bilibili.com',
            'Origin': 'https://www.bilibili.com'
        }
        
        # 使用旧版评论接口（不需要WBI签名）
        resp = requests.get(
            'https://api.bilibili.com/x/v2/reply',
            params=params,
            headers=headers,
            timeout=10
        )
        data = resp.json()

        if data.get('code') != 0:
            return []
        
        replies = data.get('data', {}).get('replies') or []
        top = data.get('data', {}).get('top')
        top_upper = top.get('upper') if top else None
        comments = []
        
        if top_upper:
            pinned = self._parse_reply(top_upper, cookie, oid, type_, is_pinned=True)
            comments.append(pinned)
        
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
        
        inline_replies = r.get('replies', []) or []
        
        if reply_count > 0 and len(inline_replies) < reply_count:
            try:
                sub_replies = self._fetch_sub_replies(oid, type_, root_id, cookie)
                comment['replies'] = sub_replies
            except Exception as e:
                print(f"获取子回复失败: {e}")
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
        """获取子回复"""
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
            
            if len(replies) < ps:
                break
            
            pn += 1
            if pn > 5:
                break
        
        return all_replies
    
    def _save_dynamic(self, dynamic: Dict, up: Dict) -> bool:
        """保存动态，返回是否为新动态"""
        sql = "SELECT 1 FROM bi_dynamics WHERE dynamic_id = %s"
        exists = db.execute_query(sql, (dynamic['id'],), fetch_one=True)
        
        if exists:
            return False
        
        is_read = db.execute_query(
            "SELECT 1 FROM bi_read_ids WHERE item_id = %s",
            (dynamic['id'],), fetch_one=True
        ) is not None
        
        sql = """
            INSERT INTO bi_dynamics (dynamic_id, mid, timestamp, title, description, cover,
                images, jump_url, comment_oid, comment_type, is_read)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        db.execute_modify(sql, (
            dynamic['id'],
            dynamic['mid'],
            int(dynamic['timestamp']),
            dynamic.get('title', ''),
            dynamic.get('description', ''),
            dynamic.get('cover'),
            json.dumps(dynamic.get('images', [])),
            dynamic.get('jumpUrl', ''),
            dynamic.get('commentOid', ''),
            int(dynamic.get('commentType', 0)),
            1 if is_read else 0
        ))
        
        return True
    
    def _save_comment(self, comment: Dict, dynamic_id: str, parent_id: str = None) -> bool:
        """保存评论，返回是否为新评论"""
        sql = "SELECT 1 FROM bi_comments WHERE comment_id = %s AND dynamic_id = %s"
        exists = db.execute_query(sql, (comment['id'], dynamic_id), fetch_one=True)
        
        if exists:
            return False
        
        is_read = db.execute_query(
            "SELECT 1 FROM bi_read_ids WHERE item_id = %s",
            (comment['id'],), fetch_one=True
        ) is not None
        
        sql = """
            INSERT INTO bi_comments (comment_id, dynamic_id, parent_id, root_id, content,
                timestamp, user_name, user_face, is_pinned, reply_count, is_read)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        db.execute_modify(sql, (
            comment['id'],
            dynamic_id,
            parent_id,
            comment.get('rootId'),
            comment.get('content', ''),
            int(comment.get('timestamp', 0)),
            comment.get('userName', ''),
            comment.get('userFace', ''),
            1 if comment.get('isPinned') else 0,
            int(comment.get('replyCount', 0)),
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
        # jump_url = //www.bilibili.com/opus/1160909203205783557
        jump_url = jump_url.replace('//www.bilibili.com', 'https://www.bilibili.com')
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
            db.execute_modify(sql, (poll_type, status, message, new_count))
        except:
            pass


# 全局轮询服务实例
polling_service = PollingService()

