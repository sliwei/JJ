import dayjs from 'dayjs'
import { CheckCircle } from 'lucide-react'
import type { FC, ReactNode } from 'react'

import type { Comment as BiliComment } from '../types'

// B站表情静态映射表
const EMOTE_MAP: Record<string, string> = {
  '[doge_金箍]': 'https://i1.hdslb.com/bfs/emote/aadaca1895e09c5596fc6365192ec93a23718cf0.png',
  '[笑哭]': 'https://i1.hdslb.com/bfs/emote/c3043ba94babf824dea03ce500d0e73763bf4f40.png',
  '[蹲蹲]': 'https://i1.hdslb.com/bfs/emote/878f1dfac79622050f730d1fee5f7b1a55951c74.png',
  '[星星眼]': 'https://i1.hdslb.com/bfs/emote/63c9d1a31c0da745b61cdb35e0ecb28635675db2.png',
  '[微笑]': 'https://i1.hdslb.com/bfs/emote/685612eadc33f6bc233776c6241813385844f182.png',
  '[吃瓜]': 'https://i1.hdslb.com/bfs/emote/4191ce3c44c2b3df8fd97c33f85d3ab15f4f3c84.png',
  '[打call]': 'https://i1.hdslb.com/bfs/emote/431432c43da3ee5aab5b0e4f8931953e649e9975.png',
  '[OK]': 'https://i1.hdslb.com/bfs/emote/4683fd9ffc925fa6423110979d7dcac5eda297f4.png',
  '[doge]': 'https://i1.hdslb.com/bfs/emote/3087d273a78ccaff4bb1e9972e2ba2a7583c9f11.png',
  '[大哭]': 'https://i1.hdslb.com/bfs/emote/2caafee2e5db4db72104650d87810cc2c123fc86.png',
  '[辣眼睛]': 'https://i1.hdslb.com/bfs/emote/35d62c496d1e4ea9e091243fa812866f5fecc101.png',
  '[滑稽]': 'https://i1.hdslb.com/bfs/emote/d15121545a99ac46774f1f4465b895fe2d1411c3.png',
  '[喜极而泣]': 'https://i1.hdslb.com/bfs/emote/485a7e0c01c2d70707daae53bee4a9e2e31ef1ed.png',
  '[呲牙]': 'https://i1.hdslb.com/bfs/emote/b5a5898491944a4268360f2e7a84623149672eb6.png',
  '[歪嘴]': 'https://i1.hdslb.com/bfs/emote/4384050fbab0586259acdd170b510fe262f08a17.png',
  '[调皮]': 'https://i1.hdslb.com/bfs/emote/8290b7308325e3179d2154327c85640af1528617.png',
  '[妙啊]': 'https://i1.hdslb.com/bfs/emote/b4cb77159d58614a9b787b91b1cd22a81f383535.png',
  '[嗑瓜子]': 'https://i1.hdslb.com/bfs/emote/28a91da1685d90124cfeead74622e1ebb417c0eb.png',
  '[藏狐]': 'https://i1.hdslb.com/bfs/emote/ba0937ef6f3ccca85e2e0047e6263f3b4da37201.png',
  '[脱单doge]': 'https://i1.hdslb.com/bfs/emote/bf7e00ecab02171f8461ee8cf439c73db9797748.png',
  '[笑]': 'https://i1.hdslb.com/bfs/emote/81edf17314cea3b48674312b4364df44d5c01f17.png',
  '[给心心]': 'https://i1.hdslb.com/bfs/emote/1597302b98827463f5b75c7cac1f29ea6ce572c4.png',
  '[脸红]': 'https://i1.hdslb.com/bfs/emote/0922c375da40e6b69002bd89b858572f424dcfca.png',
  '[嘟嘟]': 'https://i1.hdslb.com/bfs/emote/abd7404537d8162720ccbba9e0a8cdf75547e07a.png',
  '[哦呼]': 'https://i1.hdslb.com/bfs/emote/362bded07ea5434886271d23fa25f5d85d8af06c.png',
  '[喜欢]': 'https://i1.hdslb.com/bfs/emote/8a10a4d73a89f665feff3d46ca56e83dc68f9eb8.png',
  '[酸了]': 'https://i1.hdslb.com/bfs/emote/92b1c8cbceea3ae0e8e32253ea414783e8ba7806.png',
  '[害羞]': 'https://i1.hdslb.com/bfs/emote/9d2ec4e1fbd6cb1b4d12d2bbbdd124ccb83ddfda.png',
  '[嫌弃]': 'https://i1.hdslb.com/bfs/emote/de4c0783aaa60ec03de0a2b90858927bfad7154b.png',
  '[疑惑]': 'https://i1.hdslb.com/bfs/emote/b7840db4b1f9f4726b7cb23c0972720c1698d661.png',
  '[偷笑]': 'https://i1.hdslb.com/bfs/emote/6c49d226e76c42cd8002abc47b3112bc5a92f66a.png',
  '[惊讶]': 'https://i1.hdslb.com/bfs/emote/f8e9a59cad52ae1a19622805696a35f0a0d853f3.png',
  '[捂脸]': 'https://i1.hdslb.com/bfs/emote/6921bb43f0c634870b92f4a8ad41dada94a5296d.png',
  '[阴险]': 'https://i1.hdslb.com/bfs/emote/ba8d5f8e7d136d59aab52c40fd3b8a43419eb03c.png',
  '[呆]': 'https://i1.hdslb.com/bfs/emote/33ad6000d9f9f168a0976bc60937786f239e5d8c.png',
  '[抠鼻]': 'https://i1.hdslb.com/bfs/emote/cb89184c97e3f6bc233776c6241813385844f182.png',
  '[大笑]': 'https://i1.hdslb.com/bfs/emote/ca94ad1c7e6dac895eb5b33b7836b634c614d1c0.png',
  '[惊喜]': 'https://i1.hdslb.com/bfs/emote/0afecaf3a3499479af946f29749e1a6c285b6f65.png',
  '[点赞]': 'https://i1.hdslb.com/bfs/emote/1a67265993913f4c35d15a6028a30724e83e7d35.png',
  '[无语]': 'https://i1.hdslb.com/bfs/emote/44667b7d9349957e903b1b62cb91fb9b13720f04.png',
  '[鼓掌]': 'https://i1.hdslb.com/bfs/emote/895d1fc616b4b6c830cf96012880818c0e1de00d.png',
  '[尴尬]': 'https://i1.hdslb.com/bfs/emote/cb321684ed5ce6eacdc2699092ab8fe7679e4fda.png',
  '[灵魂出窍]': 'https://i1.hdslb.com/bfs/emote/43d3db7d97343c01b47e22cfabeca84b4459ed4a.png',
  '[傲娇]': 'https://i1.hdslb.com/bfs/emote/010540d0f61220a0db4922e4a679a1d8eca94f4e.png',
  '[委屈]': 'https://i1.hdslb.com/bfs/emote/d2f26cbdd6c96960320af03f5514c5b524990840.png',
  '[疼]': 'https://i1.hdslb.com/bfs/emote/905fd9a99ec316e353b9bd4ecd49a5f0a301eabf.png',
  '[冷]': 'https://i1.hdslb.com/bfs/emote/cb0ebbd0668640f07ebfc0e03f7a18a8cd00b4ed.png',
  '[热]': 'https://i1.hdslb.com/bfs/emote/4e58a2a6f5f1580ac33df2d2cf7ecad7d9ab3635.png',
  '[生病]': 'https://i1.hdslb.com/bfs/emote/0f25ce04ae1d7baf98650986454c634f6612cb76.png',
  '[生气]': 'https://i1.hdslb.com/bfs/emote/3195714219c4b582a4fb02033dd1519913d0246d.png',
  '[爱心]': 'https://i1.hdslb.com/bfs/emote/ed04066ea7124106d17ffcaf75600700e5442f5c.png',
  '[胜利]': 'https://i1.hdslb.com/bfs/emote/b49fa9f4b1e7c3477918153b82c60b114d87347c.png',
  '[加油]': 'https://i1.hdslb.com/bfs/emote/c7aaeacb21e107292d3bb053e5abde4a4459ed30.png',
  '[抱拳]': 'https://i1.hdslb.com/bfs/emote/89516218158dbea18ab78e8873060bf95d33bbbe.png',
  '[响指]': 'https://i1.hdslb.com/bfs/emote/1b5c53cf14336903e1d2ae3527ca380a1256a077.png',
  '[保佑]': 'https://i1.hdslb.com/bfs/emote/fafe8d3de0dc139ebe995491d2dac458a865fb30.png',
  '[福]': 'https://i1.hdslb.com/bfs/emote/802429a301ac5b35a0480d9526a070ce67cd8097.png',
  '[支持]': 'https://i1.hdslb.com/bfs/emote/3c210366a5585706c09d4c686a9d942b39feeb50.png',
  '[拥抱]': 'https://i1.hdslb.com/bfs/emote/41780a4254750cdaaccb20735730a36044e98ef3.png',
  '[跪了]': 'https://i1.hdslb.com/bfs/emote/f2b3aee7e521de7799d4e3aa379b01be032698ac.png',
  '[怪我咯]': 'https://i1.hdslb.com/bfs/emote/07cc6077f7f7d75b8d2c722dd9d9828a9fb9e46d.png'
}

// 解析评论内容中的表情，将 [表情名] 替换为图片
const parseEmoteContent = (content: string): ReactNode => {
  // 匹配 [xxx] 格式的表情
  const emoteRegex = /\[[^[\]]+\]/g
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match
  let keyIndex = 0

  while ((match = emoteRegex.exec(content)) !== null) {
    // 添加表情前的普通文本
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    const emoteKey = match[0] // e.g., "[doge]"
    const emoteUrl = EMOTE_MAP[emoteKey]

    if (emoteUrl) {
      // 找到对应的表情，渲染为图片
      parts.push(
        <img
          key={`emote-${keyIndex++}`}
          src={emoteUrl}
          alt={emoteKey}
          title={emoteKey}
          className="inline-block align-middle h-[1.25em] w-auto mx-0.5"
          referrerPolicy="no-referrer"
        />
      )
    } else {
      // 没找到表情映射，保留原文本
      parts.push(emoteKey)
    }

    lastIndex = match.index + match[0].length
  }

  // 添加最后剩余的文本
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts.length > 0 ? parts : content
}

interface CommentSectionProps {
  oid: string
  type: number
  comments?: BiliComment[]
  upName?: string
  onMarkRead?: (id: string, isDynamic?: boolean) => void
  onlyShowUP?: boolean
}

const CommentItem: FC<{
  comment: BiliComment
  isSub?: boolean
  upName?: string
  onMarkRead?: (id: string, isDynamic?: boolean) => void
  onlyShowUP?: boolean
}> = ({ comment, isSub, upName, onMarkRead, onlyShowUP }) => {
  const allSubReplies = comment.replies || []
  const subReplies = onlyShowUP ? allSubReplies.filter((r) => upName && r.userName === upName) : allSubReplies
  const isUp = upName && comment.userName === upName
  const isUnread = isUp && !comment.isRead

  return (
    <div className={`flex ${isSub ? 'mt-1.5 md:mt-2' : 'mt-2.5 md:mt-3'} ${isUnread ? 'bg-primary/5 p-1.5 md:p-2 rounded-lg border border-primary/20' : ''}`}>
      <img src={comment.userFace} alt={comment.userName} className={`${isSub ? 'w-5 h-5' : 'w-6 md:w-7 h-6 md:h-7'} rounded-full mr-2 md:mr-2.5 shrink-0`} referrerPolicy="no-referrer" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap md:flex-nowrap justify-between mb-0.5 items-start gap-1">
          <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
            <span className={`font-semibold ${isSub ? 'text-[0.7rem] md:text-[0.75rem]' : 'text-[0.75rem] md:text-[0.8rem]'}`}>{comment.userName}</span>
            {comment.isPinned && (
              <span className="text-[0.6rem] md:text-[0.65rem] text-primary bg-primary/10 px-1 py-0.5 rounded border border-primary shrink-0">置顶</span>
            )}
            {isUp && <span className="text-[0.6rem] md:text-[0.65rem] text-white bg-primary px-1 py-0.5 rounded shrink-0">UP</span>}
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="text-[0.65rem] md:text-[0.7rem] text-text-secondary! whitespace-nowrap">
              {dayjs(comment.timestamp * 1000).format('MM-DD HH:mm')}
            </span>
            {isUnread && onMarkRead && (
              <button
                onClick={() => onMarkRead(comment.id, false)}
                className="flex items-center text-[0.6rem] md:text-[0.65rem] hover:text-primary! hover:bg-primary/10 px-1 md:px-1.5 py-0.5 rounded border border-primary transition-colors cursor-pointer"
                title="标记为已读"
              >
                <CheckCircle size={10} className="mr-0.5 md:mr-1" />
                <span className="hidden md:inline">已读</span>
                <span className="md:hidden">✓</span>
              </button>
            )}
          </div>
        </div>
        <div className={`text-text-primary leading-snug ${isSub ? 'text-[0.75rem] md:text-[0.8rem]' : 'text-[0.8rem] md:text-[0.85rem]'}`}>
          {parseEmoteContent(comment.content)}
        </div>

        {subReplies.length > 0 && (
          <div className="mt-1.5">
            {subReplies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isSub={true} upName={upName} onMarkRead={onMarkRead} onlyShowUP={onlyShowUP} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const CommentSection: FC<CommentSectionProps> = ({ comments, upName, onMarkRead, onlyShowUP }) => {
  if (!comments || comments.length === 0) return <div className="p-2 text-[0.7rem] md:text-[0.75rem] text-text-secondary">暂无评论或数据未更新</div>

  // 过滤评论：只看UP时，只显示UP主的评论或包含UP主回复的评论
  const filteredComments = onlyShowUP
    ? comments.filter((c) => {
        const isUp = upName && c.userName === upName
        const hasUpReply = c.replies?.some((r) => upName && r.userName === upName)
        return isUp || hasUpReply
      })
    : comments

  if (onlyShowUP && filteredComments.length === 0) {
    return <div className="p-2 text-[0.7rem] md:text-[0.75rem] text-text-secondary">该动态下暂无UP主的评论</div>
  }

  return (
    <div className="px-3 md:px-4 pb-3 md:pb-4 border-t border-border bg-black/5 dark:bg-black/10">
      {filteredComments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} upName={upName} onMarkRead={onMarkRead} onlyShowUP={onlyShowUP} />
      ))}
    </div>
  )
}

export default CommentSection
