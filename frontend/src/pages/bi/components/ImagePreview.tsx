import { ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useState } from 'react'

import Modal from './Modal'

interface ImagePreviewProps {
  images: string[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ images, initialIndex = 0, isOpen, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  if (!images.length) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} overlayClassName="cursor-zoom-out" showCloseButton={true}>
      <div className="relative flex items-center justify-center">
        {images.length > 1 && (
          <>
            <button
              className="absolute -left-16 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all hidden md:block"
              onClick={prevImg}
            >
              <ChevronLeft size={32} />
            </button>
            <button
              className="absolute -right-16 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all hidden md:block"
              onClick={nextImg}
            >
              <ChevronRight size={32} />
            </button>

            {/* Mobile controls */}
            <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-start pl-4 md:hidden" onClick={prevImg} />
            <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-end pr-4 md:hidden" onClick={nextImg} />

            <div className="absolute -bottom-10 text-white text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}

        <img
          src={images[currentIndex]}
          className="max-w-full max-h-[85vh] object-contain rounded-sm shadow-2xl transition-all"
          alt="preview-enlarged"
          onClick={onClose}
          referrerPolicy="no-referrer"
        />
      </div>
    </Modal>
  )
}

export default ImagePreview
