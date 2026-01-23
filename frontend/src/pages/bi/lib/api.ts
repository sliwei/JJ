import axios from 'axios'
import { md5 } from 'js-md5'

import type { Comment, DynamicContent, UP } from '../types'
import * as mock from './mock'
import { getSettings } from './storage'

const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16,
  24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
]

const getMixinKey = (orig: string) =>
  mixinKeyEncTab
    .map((n) => orig[n])
    .join('')
    .slice(0, 32)

export const encWbi = (params: Record<string, string | number>, img_key: string, sub_key: string) => {
  const mixin_key = getMixinKey(img_key + sub_key)
  const curr_params: Record<string, string | number> = { ...params, wts: Math.round(Date.now() / 1000) }
  const sorted_params: Record<string, string> = Object.keys(curr_params)
    .sort()
    .reduce((prev: Record<string, string>, curr) => {
      let val = curr_params[curr].toString()
      // Remove special characters
      val = val.replace(/[!'()*]/g, '')
      prev[curr] = val
      return prev
    }, {})

  const query = new URLSearchParams(sorted_params).toString()
  const w_rid = md5(query + mixin_key)
  return { ...sorted_params, w_rid }
}

// State to store wbi keys
let wbiKeys: { img_key: string; sub_key: string } | null = null
let lastCookie = ''

async function refreshWbiKeys(cookie: string) {
  try {
    const res = await axios.get('/bili/x/web-interface/nav', {
      headers: { 'X-Bili-Cookie': cookie }
    })
    const { img_url, sub_url } = res.data.data.wbi_img
    wbiKeys = {
      img_key: img_url.split('/').pop()!.split('.')[0],
      sub_key: sub_url.split('/').pop()!.split('.')[0]
    }
    lastCookie = cookie
  } catch (error) {
    console.error('Failed to refresh WBI keys', error)
  }
}

const ensureHttps = (url: string) => {
  if (!url) return url
  return url.startsWith('//') ? `https:${url}` : url
}

interface SearchResult {
  mid: number
  uname: string
  upic: string
}

export async function searchUP(keyword: string, cookie: string): Promise<UP[]> {
  if (getSettings().useMock) return mock.mockSearchUP(keyword)
  if (!wbiKeys || cookie !== lastCookie) await refreshWbiKeys(cookie)

  const params = {
    keyword,
    search_type: 'bili_user',
    page: 1
  }

  const signedParams = wbiKeys ? encWbi(params, wbiKeys.img_key, wbiKeys.sub_key) : params

  try {
    const res = await axios.get('/bili/x/web-interface/wbi/search/type', {
      params: signedParams,
      headers: {
        'X-Bili-Cookie': cookie,
        Referer: 'https://search.bilibili.com/'
      }
    })

    if (res.data.code !== 0) return []

    const result: SearchResult[] = res.data.data.result || []
    return result.map((item: SearchResult) => ({
      mid: item.mid.toString(),
      name: item.uname,
      face: ensureHttps(item.upic)
    }))
  } catch (error) {
    console.error(`Failed to search UP with keyword ${keyword}`, error)
    return []
  }
}

export async function fetchUPInfo(mid: string, cookie: string): Promise<UP | null> {
  if (getSettings().useMock) return mock.mockFetchUPInfo(mid)
  try {
    const res = await axios.get('/bili/x/space/wbi/acc/info', {
      params: { mid },
      headers: { 'X-Bili-Cookie': cookie }
    })
    if (res.data.code !== 0) return null
    const { name, face } = res.data.data
    return { mid, name, face: ensureHttps(face) }
  } catch (error) {
    console.error(`Failed to fetch UP info for ${mid}`, error)
    return null
  }
}

interface DynamicItem {
  id_str: string
  basic?: {
    comment_id_str: string
    comment_type: number
  }
  modules: {
    module_author: {
      mid: number
      pub_ts: number
      name: string
      face: string
    }
    module_dynamic: {
      major?: {
        type: string
        opus?: { title?: string; summary: { text: string }; pics: { url: string }[] }
        archive?: { title: string; desc: string; cover: string }
        draw?: { items: { src: string }[] }
      }
      desc?: { text: string }
    }
  }
}

export async function fetchDynamics(mid: string, cookie: string): Promise<DynamicContent[]> {
  if (getSettings().useMock) return mock.mockFetchDynamics(mid)
  if (!wbiKeys || cookie !== lastCookie) await refreshWbiKeys(cookie)

  const params = {
    host_mid: mid,
    platform: 'web',
    features:
      'itemOpusStyle,listOnlyfans,opusBigCover,onlyfansVote,forwardListHidden,decorationCard,commentsNewVersion,onlyfansAssetsV2,ugcDelete,onlyfansQaCard,avatarAutoTheme,sunflowerStyle,cardsEnhance,eva3CardOpus,eva3CardVideo,eva3CardComment,eva3CardUser',
    web_location: '333.1387'
  }

  const signedParams = wbiKeys ? encWbi(params, wbiKeys.img_key, wbiKeys.sub_key) : params

  try {
    const res = await axios.get('/bili/x/polymer/web-dynamic/v1/feed/space', {
      params: signedParams,
      headers: { 'X-Bili-Cookie': cookie }
    })

    if (res.data.code !== 0) throw new Error(res.data.message)

    return res.data.data.items.map((item: DynamicItem) => {
      const { id_str, modules } = item
      const moduleAuthor = modules.module_author
      const moduleDynamic = modules.module_dynamic

      let title = ''
      let description = ''
      let cover = ''
      let images: string[] = []

      if (moduleDynamic.major) {
        const major = moduleDynamic.major
        if (major.type === 'MAJOR_TYPE_OPUS') {
          title = major.opus?.title || ''
          description = major.opus?.summary.text || ''
          images = major.opus?.pics.map((p: { url: string }) => p.url) || []
        } else if (major.type === 'MAJOR_TYPE_ARCHIVE') {
          title = major.archive?.title || ''
          description = major.archive?.desc || ''
          cover = major.archive?.cover || ''
        } else if (major.type === 'MAJOR_TYPE_DRAW') {
          description = moduleDynamic.desc?.text || ''
          images = major.draw?.items.map((p: { src: string }) => p.src) || []
        }
      } else {
        description = moduleDynamic.desc?.text || ''
      }

      return {
        id: id_str,
        mid: moduleAuthor.mid.toString(),
        timestamp: moduleAuthor.pub_ts,
        title,
        description,
        cover,
        images,
        jumpUrl: `https://t.bilibili.com/${id_str}`,
        commentOid: item.basic?.comment_id_str || id_str,
        commentType: item.basic?.comment_type || 17
      }
    })
  } catch (error) {
    console.error(`Failed to fetch dynamics for ${mid}`, error)
    return []
  }
}

interface ReplyItem {
  rpid_str: string
  content: { message: string }
  ctime: number
  member: { uname: string; avatar: string }
  rcount: number
  reply_control?: {
    sub_reply_entry_text?: string
  }
  replies?: ReplyItem[]
}

export async function fetchComments(oid: string, type: number, cookie: string): Promise<Comment[]> {
  if (getSettings().useMock) return mock.mockFetchComments(oid)
  const params = {
    oid,
    type,
    mode: 3,
    pagination_str: JSON.stringify({ offset: '' }),
    plat: 1,
    web_location: '1315875'
  }

  if (!wbiKeys || cookie !== lastCookie) await refreshWbiKeys(cookie)
  const signedParams = wbiKeys ? encWbi(params, wbiKeys.img_key, wbiKeys.sub_key) : params

  try {
    const res = await axios.get('/bili/x/v2/reply/wbi/main', {
      params: signedParams,
      headers: { 'X-Bili-Cookie': cookie }
    })

    if (res.data.code !== 0) return []

    const mapReply = (reply: ReplyItem, isPinned = false, rootId?: string): Comment => ({
      id: reply.rpid_str,
      content: reply.content.message,
      timestamp: reply.ctime,
      userName: reply.member.uname,
      userFace: reply.member.avatar,
      isPinned,
      replyCount: reply.rcount,
      rootId: rootId || reply.rpid_str,
      replies: reply.replies ? reply.replies.map((r) => mapReply(r, false, rootId || reply.rpid_str)) : undefined
    })

    const replies = (res.data.data.replies || []).map((r: ReplyItem) => mapReply(r, false))
    const topUpper = res.data.data.top?.upper

    if (topUpper) {
      const pinnedComment = mapReply(topUpper, true)
      return [pinnedComment, ...replies]
    }

    return replies
  } catch (error) {
    console.error(`Failed to fetch comments for ${oid}`, error)
    return []
  }
}

export async function fetchSubReplies(oid: string, type: number, root: string, cookie: string, ps = 50, pn = 1): Promise<Comment[]> {
  try {
    const res = await axios.get('/bili/x/v2/reply/reply', {
      params: {
        oid,
        type,
        root,
        ps,
        pn,
        web_location: '333.1368'
      },
      headers: { 'X-Bili-Cookie': cookie }
    })

    if (res.data.code !== 0) return []

    const mapReply = (reply: ReplyItem): Comment => ({
      id: reply.rpid_str,
      content: reply.content.message,
      timestamp: reply.ctime,
      userName: reply.member.uname,
      userFace: reply.member.avatar,
      replyCount: reply.rcount,
      rootId: root,
      replies: reply.replies ? reply.replies.map(mapReply) : undefined
    })

    return (res.data.data.replies || []).map(mapReply)
  } catch (error) {
    console.error(`Failed to fetch sub-replies for root ${root}`, error)
    return []
  }
}
