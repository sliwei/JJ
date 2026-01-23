import dayjs from 'dayjs'
import { CheckCircle, MessageSquare } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import type { Comment, DynamicContent } from '../types'
import CommentSection from './CommentSection'
import ImagePreview from './ImagePreview'

interface DynamicCardProps {
  dynamic: DynamicContent
  upName?: string
  onMarkRead?: (id: string, isDynamic?: boolean) => void
  onlyShowUP?: boolean
}

const DynamicCard: React.FC<DynamicCardProps> = ({ dynamic, upName, onMarkRead, onlyShowUP }) => {
  const [showComments, setShowComments] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [currentImgIndex, setCurrentImgIndex] = useState(0)

  const images = dynamic.cover ? [dynamic.cover, ...dynamic.images] : dynamic.images
  const formattedTime = dayjs(dynamic.timestamp * 1000).format('YYYY年MM月DD日 HH时mm分ss秒')

  // Calculate unread UP comments
  const countUnread = (comments: Comment[]): number => {
    let count = 0
    comments?.forEach((c) => {
      if (upName && c.userName === upName && !c.isRead) count++
      if (c.replies) count += countUnread(c.replies)
    })
    return count
  }
  const unreadCommentCount = countUnread(dynamic.comments || [])
  const isDynamicUnread = !dynamic.isRead

  const openPreview = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    setCurrentImgIndex(index)
    setIsPreviewOpen(true)
  }

  const handleMarkRead = () => {
    if (onMarkRead) onMarkRead(dynamic.id, true)
  }

  const handleTitleClick = () => {
    window.open(dynamic.jumpUrl, '_blank')
    handleMarkRead()
  }

  const allCommentCount = useMemo(() => {
    let len = dynamic.comments?.length || 0
    dynamic.comments?.forEach((c) => {
      len += c.replies?.length || 0
    })
    return len
  }, [dynamic.comments])

  return (
    <div
      className={`bg-card border rounded-xl mb-3 md:mb-4 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 shadow-sm ${isDynamicUnread ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'}`}
    >
      <div className="px-3 md:px-4 py-2 border-b border-border text-[0.7rem] md:text-[0.75rem] flex justify-between bg-black/5 dark:bg-black/10">
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className="hidden md:inline">{formattedTime}</span>
          <span className="md:hidden">{dayjs(dynamic.timestamp * 1000).format('MM-DD HH:mm')}</span>
          {isDynamicUnread && <span className="text-primary font-bold text-[0.65rem] md:text-[0.7rem] bg-primary/10 px-1 md:px-1.5 rounded">NEW</span>}
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {isDynamicUnread && onMarkRead && (
            <button
              onClick={handleMarkRead}
              className="flex items-center hover:text-primary! transition-colors cursor-pointer"
              title="标记动态为已读"
            >
              <CheckCircle size={12} className="mr-0.5 md:mr-1" />
              <span className="hidden md:inline">已读</span>
            </button>
          )}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center text-text-secondary hover:text-primary! transition-colors relative cursor-pointer"
          >
            <MessageSquare size={12} className="mr-0.5 md:mr-1" />
            <span className="hidden md:inline">评论</span>{allCommentCount}
            {unreadCommentCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[0.6rem] px-1 rounded-full min-w-3.5 text-center h-3.5 leading-tight flex items-center justify-center">
                {unreadCommentCount}
              </span>
            )}
          </button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row p-3 md:p-4">
        {images.length > 0 && (
          <div className="w-full md:w-36 mb-3 md:mb-0 md:mr-4 shrink-0">
            <div
              className="relative group cursor-zoom-in aspect-video rounded-md overflow-hidden bg-black/5 dark:bg-black/20"
              onClick={(e) => openPreview(e, 0)}
            >
              <img src={images[0]} alt="preview" className="w-full h-full object-cover transition-opacity group-hover:opacity-80" referrerPolicy="no-referrer" />
              {images.length > 1 && (
                <div className="absolute right-1 bottom-1 px-1 py-0.5 bg-black/60 text-white text-[0.6rem] rounded backdrop-blur-sm">
                  {images.length}张
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col">
          <h3
            className={`text-[0.95rem] md:text-base font-semibold mb-1.5 md:mb-2 text-text-primary line-clamp-2 md:line-clamp-1 cursor-pointer hover:text-primary transition-colors ${isDynamicUnread ? 'text-primary' : ''}`}
            onClick={handleTitleClick}
          >
            {dynamic.title}
          </h3>
          {dynamic.description && (
            <div className="text-text-secondary text-[0.75rem] md:text-[0.8rem] line-clamp-3 md:line-clamp-none">
              {dynamic.description}
            </div>
          )}
          <div onClick={() => setShowComments(!showComments)} className="cursor-pointer flex-1"></div>
        </div>
      </div>
      {showComments && (
        <CommentSection
          oid={dynamic.commentOid}
          type={dynamic.commentType}
          comments={dynamic.comments}
          upName={upName}
          onMarkRead={onMarkRead}
          onlyShowUP={onlyShowUP}
        />
      )}

      <ImagePreview images={images} isOpen={isPreviewOpen} initialIndex={currentImgIndex} onClose={() => setIsPreviewOpen(false)} />
    </div>
  )
}

export default DynamicCard
