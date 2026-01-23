import type { Comment, DynamicContent, UP } from '../types'

const MOCK_STORAGE_KEY = 'bili_monitor_mock_dynamics'

const MOCK_UPS: UP[] = [
  { mid: '1', name: '老番茄', face: 'https://i0.hdslb.com/bfs/face/5c0d64d7c80778f691df41d7d0a514d026f861b5.jpg' },
  { mid: '2', name: '某幻君', face: 'https://i0.hdslb.com/bfs/face/ebef474b5c7f89b96434442a59f5188e7b9e7dec.jpg' },
  { mid: '3', name: '花少北', face: 'https://i0.hdslb.com/bfs/face/1f81d89855b72e519c5c1626083049b4931fb377.jpg' }
]

const MOCK_TITLES = [
  '这是一条模拟动态标题',
  '新视频投递：关于 Mock 接口的那些事',
  '粉丝勋章升级啦！',
  '今天的直播延期到晚上八点',
  '分享一张最近拍的照片'
]

const MOCK_DESCS = [
  '这是一段非常长的模拟描述文字，用于测试 UI 的折行和布局表现。B 站的动态通常包含很多文字内容，我们需要确保 Mock 数据也能真实反映这一点。',
  '大家快来看我的新视频！点赞投币收藏三连支持一下~',
  '生活不易，猫猫叹气。',
  '下周准备做一期特别企划，敬请期待。',
  'Mock 数据支持增量更新，每次刷新都可能看到我哦！'
]

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export const mockSearchUP = async (keyword: string): Promise<UP[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return MOCK_UPS.filter((up) => up.name.includes(keyword) || up.mid.includes(keyword))
}

export const mockFetchUPInfo = async (mid: string): Promise<UP | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return MOCK_UPS.find((up) => up.mid === mid) || { mid, name: `模拟用户 ${mid}`, face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' }
}

export const mockFetchDynamics = async (mid: string): Promise<DynamicContent[]> => {
  await new Promise((resolve) => setTimeout(resolve, 800))

  // Load mock data from localStorage to persist mock increments
  const saved = localStorage.getItem(`${MOCK_STORAGE_KEY}_${mid}`)
  let dynamics: DynamicContent[] = saved ? JSON.parse(saved) : []

  // Simulate incremental update: 50% chance to add a new dynamic if called
  if (dynamics.length === 0 || Math.random() > 0.5) {
    const newId = Date.now().toString()
    const newDyn: DynamicContent = {
      id: newId,
      mid,
      timestamp: Math.floor(Date.now() / 1000),
      title: getRandomItem(MOCK_TITLES),
      description: getRandomItem(MOCK_DESCS),
      images: Math.random() > 0.3 ? ['https://i0.hdslb.com/bfs/archive/09eb69260c6d70d740c5678393e87779f0450552.jpg'] : [],
      jumpUrl: `https://t.bilibili.com/${newId}`,
      commentOid: newId,
      commentType: 17
    }
    dynamics = [newDyn, ...dynamics].slice(0, 20) // Keep max 20
    localStorage.setItem(`${MOCK_STORAGE_KEY}_${mid}`, JSON.stringify(dynamics))
  }
  console.log('mockFetchDynamics', dynamics)
  return dynamics
}

export const mockFetchComments = async (_oid: string): Promise<Comment[]> => {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return [
    {
      id: 'c1',
      content: '沙发！支持 UP 主！',
      timestamp: Math.floor(Date.now() / 1000) - 3600,
      userName: '模拟路人甲',
      userFace: 'https://i0.hdslb.com/bfs/face/member/noface.jpg',
      replyCount: 2,
      replies: [
        {
          id: 'c1-1',
          content: '你是真快啊',
          timestamp: Math.floor(Date.now() / 1000) - 3500,
          userName: '模拟路人乙',
          userFace: 'https://i0.hdslb.com/bfs/face/member/noface.jpg',
          rootId: 'c1'
        }
      ]
    },
    {
      id: 'c2',
      content: 'Mock 数据真好用，再也不怕被封号了。',
      timestamp: Math.floor(Date.now() / 1000) - 7200,
      userName: '开发人员',
      userFace: 'https://i0.hdslb.com/bfs/face/member/noface.jpg',
      isPinned: true
    }
  ]
}
