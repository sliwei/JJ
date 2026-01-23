#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基金缓存服务模块
管理基金列表的缓存和定时更新
"""

import time
import threading
import traceback
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

import akshare as ak
import pandas as pd


class FundCacheService:
    """基金缓存服务类"""
    
    _instance: Optional['FundCacheService'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        self._cache: Dict[str, Any] = {
            'data': None,
            'timestamp': 0
        }
        self._lock = threading.Lock()
        self._initialized = False
        self._timer: Optional[threading.Timer] = None
    
    def init(self) -> bool:
        """初始化基金缓存服务"""
        if self._initialized:
            return True
        
        print("=" * 60)
        print("🚀 初始化基金列表缓存...")
        print("=" * 60)
        
        success = self._fetch_fund_list()
        if success:
            print("✓ 基金列表缓存初始化完成")
        else:
            print("⚠ 基金列表缓存初始化失败，将在定时任务中重试")
        
        # 启动定时任务
        self._schedule_daily_fetch()
        print("✓ 已启动每日0点自动更新任务")
        print("=" * 60)
        
        self._initialized = True
        return success
    
    def _fetch_fund_list(self) -> bool:
        """抓取基金列表数据并更新缓存"""
        try:
            print("正在获取基金列表数据...")
            fund_df = ak.fund_name_em()
            
            if fund_df.empty:
                print("警告: 获取到的基金列表数据为空")
                return False
            
            print(f"从AKShare获取到 {len(fund_df)} 条原始数据，正在处理...")
            
            fund_list = []
            for _, row in fund_df.iterrows():
                try:
                    fund_info = {
                        'code': str(row.get('基金代码', '')).strip(),
                        'name': str(row.get('基金简称', '')).strip(),
                        'type': str(row.get('基金类型', '')).strip() if pd.notna(row.get('基金类型')) else '',
                        'net_value': 0,
                        'daily_growth': 0,
                        'total_value': 0
                    }
                    
                    if fund_info['code'] and fund_info['name']:
                        fund_list.append(fund_info)
                except:
                    continue
            
            with self._lock:
                self._cache['data'] = fund_list
                self._cache['timestamp'] = time.time()
            
            print(f"成功获取 {len(fund_list)} 只基金数据，"
                  f"缓存更新时间: {datetime.fromtimestamp(self._cache['timestamp']).strftime('%Y-%m-%d %H:%M:%S')}")
            return True
            
        except Exception as e:
            print(f"获取基金列表失败: {e}")
            print(traceback.format_exc())
            return False
    
    def _schedule_daily_fetch(self):
        """定时任务：每天0点自动抓取"""
        now = datetime.now()
        next_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        if now >= next_midnight:
            next_midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        seconds_until_midnight = (next_midnight - now).total_seconds()
        
        print(f"下次自动抓取时间: {next_midnight.strftime('%Y-%m-%d %H:%M:%S')}，"
              f"距离现在还有 {seconds_until_midnight:.0f} 秒")
        
        def task():
            self._fetch_fund_list()
            self._schedule_daily_fetch()
        
        self._timer = threading.Timer(seconds_until_midnight, task)
        self._timer.daemon = True
        self._timer.start()
    
    @property
    def is_available(self) -> bool:
        """检查缓存是否可用"""
        with self._lock:
            return self._cache['data'] is not None
    
    def get_fund_list(self) -> tuple:
        """获取基金列表和缓存时间戳"""
        with self._lock:
            return self._cache['data'], self._cache['timestamp']
    
    def search_funds(self, query: str = '', limit: int = 20) -> List[Dict]:
        """搜索基金"""
        fund_list, _ = self.get_fund_list()
        
        if fund_list is None:
            return []
        
        if not query:
            return fund_list[:limit]
        
        query_lower = query.lower()
        filtered_funds = []
        
        for fund in fund_list:
            if (query_lower in fund['code'].lower() or 
                query_lower in fund['name'].lower()):
                filtered_funds.append(fund)
        
        # 按匹配度排序
        def sort_key(fund):
            code_lower = fund['code'].lower()
            name_lower = fund['name'].lower()
            
            if code_lower == query_lower:
                return (0, fund['code'])
            elif code_lower.startswith(query_lower):
                return (1, fund['code'])
            elif name_lower.startswith(query_lower):
                return (2, fund['name'])
            else:
                return (3, fund['name'])
        
        filtered_funds.sort(key=sort_key)
        return filtered_funds[:limit]


# 全局基金缓存服务实例
fund_cache = FundCacheService()

