#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WBI签名工具模块
用于B站API请求签名
"""

import time
import hashlib
import requests
from urllib.parse import urlencode


# WBI混淆密钥表
MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
    26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
    20, 34, 44, 52
]

# WBI密钥缓存
_wbi_keys_cache = {
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
    global _wbi_keys_cache
    try:
        headers = {
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.bilibili.com'
        }
        resp = requests.get(
            'https://api.bilibili.com/x/web-interface/nav',
            headers=headers,
            timeout=10
        )
        data = resp.json()
        
        if data.get('code') != 0:
            print(f"刷新WBI密钥失败: {data.get('message')}")
            return False
        
        wbi_img = data.get('data', {}).get('wbi_img', {})
        img_url = wbi_img.get('img_url', '')
        sub_url = wbi_img.get('sub_url', '')
        
        _wbi_keys_cache['img_key'] = img_url.split('/')[-1].split('.')[0]
        _wbi_keys_cache['sub_key'] = sub_url.split('/')[-1].split('.')[0]
        _wbi_keys_cache['last_cookie'] = cookie
        
        print("✓ WBI密钥已刷新")
        return True
    except Exception as e:
        print(f"刷新WBI密钥异常: {e}")
        return False


def get_signed_params(params: dict, cookie: str) -> dict:
    """获取带签名的参数"""
    # 检查是否需要刷新密钥
    if not _wbi_keys_cache['img_key'] or _wbi_keys_cache['last_cookie'] != cookie:
        refresh_wbi_keys(cookie)
    
    if _wbi_keys_cache['img_key'] and _wbi_keys_cache['sub_key']:
        return enc_wbi(params, _wbi_keys_cache['img_key'], _wbi_keys_cache['sub_key'])
    return params

