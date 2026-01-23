import type { Comment } from '../types'
import { fetchComments, fetchDynamics, fetchSubReplies } from './api'
import { getSettings, getStoredDynamics, getUPs, isMarkedRead, saveStoredDynamics } from './storage'

// 发送钉钉 webhook 通知
async function sendDingTalkNotification(params: {
  type: '新动态' | '新评论' | '新回复'
  upName: string
  content: string
  jumpUrl: string
  timestamp: number
}) {
  const settings = getSettings()

  // 如果没有配置 access_token，跳过通知
  if (!settings.dingtalkAccessToken) return

  const { type, upName, content, jumpUrl, timestamp } = params
  const timeStr = new Date(timestamp * 1000).toLocaleString('zh-CN')
  const keyword = settings.dingtalkKeyword || '动态'

  // 消息必须包含配置的关键词
  const markdown = {
    title: `${keyword}更新: ${upName}`,
    text:
      `### ${keyword}更新通知\n\n` +
      `**UP主**: ${upName}\n\n` +
      `**类型**: ${type}\n\n` +
      `**时间**: ${timeStr}\n\n` +
      `**内容**: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}\n\n` +
      `[点击查看详情](${jumpUrl})`
  }

  // 通过 Vite 代理转发，避免 CORS 问题
  const webhookUrl = `/dingtalk/robot/send?access_token=${settings.dingtalkAccessToken}`

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'markdown', markdown })
    })
  } catch (e) {
    console.error('发送钉钉通知失败:', e)
  }
}

type Listener = () => void

class PollingService {
  private dynamicTimer: ReturnType<typeof setInterval> | null = null
  private commentTimer: ReturnType<typeof setInterval> | null = null
  private listeners: Set<Listener> = new Set()
  private isPollingDynamics = false
  private isPollingComments = false

  constructor() {
    // Initial check on load
    this.restart()
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  notify() {
    this.listeners.forEach((l) => l())
  }

  restart() {
    this.stop()
    this.start()
  }

  stop() {
    if (this.dynamicTimer) {
      clearInterval(this.dynamicTimer)
      this.dynamicTimer = null
    }
    if (this.commentTimer) {
      clearInterval(this.commentTimer)
      this.commentTimer = null
    }
  }

  start() {
    const settings = getSettings()

    // Dynamic Polling
    if (settings.enableDynamicPolling && settings.dynamicPollingInterval > 0) {
      this.dynamicTimer = setInterval(
        () => {
          // 每次执行时重新检查设置，确保轮询关闭后不再执行
          const currentSettings = getSettings()
          if (currentSettings.enableDynamicPolling) {
            this.pollDynamics()
          }
        },
        settings.dynamicPollingInterval * 60 * 1000
      )
    }

    // Comment Polling
    if (settings.enableCommentPolling && settings.commentPollingInterval > 0) {
      this.commentTimer = setInterval(
        () => {
          // 每次执行时重新检查设置，确保轮询关闭后不再执行
          const currentSettings = getSettings()
          if (currentSettings.enableCommentPolling) {
            this.pollComments()
          }
        },
        settings.commentPollingInterval * 60 * 1000
      )
    }
  }

  async forceRefreshDynamics() {
    await this.pollDynamics()
  }

  private async pollDynamics() {
    if (this.isPollingDynamics) return
    const settings = getSettings()
    if (!settings.cookie) return

    this.isPollingDynamics = true
    try {
      const ups = getUPs()
      const currentDynamicsMap = getStoredDynamics()
      let hasChanges = false

      for (const up of ups) {
        try {
          const fetchedDynamics = await fetchDynamics(up.mid, settings.cookie)

          if (fetchedDynamics.length > 0) {
            const existingDynamics = currentDynamicsMap[up.mid] || []
            const existingIds = new Set(existingDynamics.map((d) => d.id))

            // Process fetched dynamics
            const newDynamics = fetchedDynamics.map((d) => ({
              ...d,
              isRead: isMarkedRead(d.id)
            }))

            // Check for NEW dynamics for notification
            // We only notify if it's NOT in existingIds
            const latestDynamic = newDynamics[0]
            if (latestDynamic && !existingIds.has(latestDynamic.id)) {
              if (settings.enableNotifications && Notification.permission === 'granted') {
                new Notification(`Bili Monitor: ${up.name} 发布了新动态`, {
                  body: latestDynamic.title || latestDynamic.description || '点击查看',
                  icon: up.face
                })
                // 发送钉钉通知
                sendDingTalkNotification({
                  type: '新动态',
                  upName: up.name,
                  content: latestDynamic.title || latestDynamic.description || '',
                  jumpUrl: latestDynamic.jumpUrl,
                  timestamp: latestDynamic.timestamp
                })
              }
            }

            // Update map - we replace the list with new fetch but preserve strictly older ones if we wanted to keep history?
            // The current logic "replaces" the list with fetched list. `fetchDynamics` usually returns latest 12.
            // If we want to keep history we should merge.
            // For now, I will just replace as per previous logic but respecting `isRead`.

            // Actually, we should preserve `comments` if we already fetched them!
            // `fetchDynamics` does NOT return comments. `pollComments` fills them.
            // So we MUST merge: if ID exists in `existingDynamics`, copy `comments` from it.

            const mergedDynamics = newDynamics.map((nd) => {
              const existing = existingDynamics.find((ed) => ed.id === nd.id)
              if (existing) {
                return {
                  ...nd,
                  // Preserve comments from existing
                  comments: existing.comments,
                  // Preserve isRead if existing has it true (backup if isMarkedRead fails or race condition)
                  isRead: nd.isRead || existing.isRead
                }
              }
              return nd
            })

            currentDynamicsMap[up.mid] = mergedDynamics
            hasChanges = true
          }
        } catch (e) {
          console.error(`Failed to poll dynamics for ${up.name}`, e)
        }
      }

      if (hasChanges) {
        saveStoredDynamics(currentDynamicsMap)
        this.notify()
      }
    } finally {
      this.isPollingDynamics = false
    }
  }

  private async pollComments() {
    if (this.isPollingComments) return
    const settings = getSettings()
    if (!settings.cookie) return

    this.isPollingComments = true
    try {
      const dynamicsMap = getStoredDynamics()
      const ups = getUPs()
      let hasChanges = false
      const now = Date.now() / 1000
      const timeLimitSeconds = settings.commentTimeRange * 3600

      for (const mid in dynamicsMap) {
        const up = ups.find((u) => u.mid === mid)
        const upName = up ? up.name : '' // We use name for matching UP comments if mid is missing in comment

        const dynamics = dynamicsMap[mid]

        for (const dynamic of dynamics) {
          // Check time range
          if (now - dynamic.timestamp > timeLimitSeconds) continue

          // Fetch comments
          try {
            const comments = await fetchComments(dynamic.commentOid, dynamic.commentType, settings.cookie)

            // Fetch sub-replies
            for (const comment of comments) {
              const replen = comment.replies?.length || 0
              if (comment.replyCount && comment.replyCount > 0 && replen < comment.replyCount) {
                const subReplies = await fetchSubReplies(
                  dynamic.commentOid,
                  dynamic.commentType,
                  comment.rootId || comment.id,
                  settings.cookie
                )
                if (subReplies.length > 0) {
                  comment.replies = subReplies
                }
              }
            }

            // Inject isRead
            const existingComments = dynamic.comments || []
            const existingCommentsMap = new Map<string, Comment>()
            const buildMap = (list: Comment[]) => {
              list.forEach((c) => {
                existingCommentsMap.set(c.id, c)
                if (c.replies) buildMap(c.replies)
              })
            }
            buildMap(existingComments)

            const processComment = (c: Comment) => {
              const existing = existingCommentsMap.get(c.id)
              c.isRead = isMarkedRead(c.id) || (existing && existing.isRead)
              if (c.replies) c.replies.forEach(processComment)
            }
            comments.forEach(processComment)

            // Notification Logic for UP's comments/replies
            if (settings.enableNotifications && upName) {
              const existingComments = dynamic.comments || []
              const existingIds = new Set<string>()
              const collectIds = (c: Comment) => {
                existingIds.add(c.id)
                if (c.replies) c.replies.forEach(collectIds)
              }
              existingComments.forEach(collectIds)

              // Check for new comments from UP
              const newUpComments: { comment: Comment; isReply: boolean }[] = []
              const checkNewUpComment = (c: Comment, isReply = false) => {
                if (!existingIds.has(c.id) && c.userName === upName) {
                  newUpComments.push({ comment: c, isReply })
                }
                if (c.replies) c.replies.forEach((r) => checkNewUpComment(r, true))
              }
              comments.forEach((c) => checkNewUpComment(c, false))

              if (newUpComments.length > 0 && Notification.permission === 'granted') {
                new Notification(`Bili Monitor: ${upName} 回复了评论`, {
                  body: `在动态 "${dynamic.title || dynamic.description.substring(0, 20)}..." 下`,
                  icon: up?.face
                })
                // 发送钉钉通知（每条新评论/回复都发送）
                for (const { comment, isReply } of newUpComments) {
                  sendDingTalkNotification({
                    type: isReply ? '新回复' : '新评论',
                    upName: upName,
                    content: comment.content,
                    jumpUrl: dynamic.jumpUrl, // 评论和回复的跳转地址为动态的地址
                    timestamp: comment.timestamp
                  })
                }
              }
            }

            dynamic.comments = comments
            hasChanges = true
          } catch (e) {
            console.error(`Failed to poll comments for dynamic ${dynamic.id}`, e)
          }
        }
      }

      if (hasChanges) {
        saveStoredDynamics(dynamicsMap)
        this.notify()
      }
    } finally {
      this.isPollingComments = false
    }
  }
}

export const pollingService = new PollingService()
