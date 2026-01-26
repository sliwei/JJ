import { X } from 'lucide-react'
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  showCloseButton?: boolean
  className?: string
  overlayClassName?: string
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, showCloseButton = true, className = '', overlayClassName = '' }) => {
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const content = (
    <div
      className={`fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md transition-opacity duration-300 ${overlayClassName}`}
      onClick={onClose}
    >
      <div
        className={`relative max-w-full max-h-full flex items-center justify-center transition-transform duration-300 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            className="absolute -top-12 right-0 md:-top-2 md:-right-12 p-2 text-white/50 hover:text-white transition-colors z-1001"
            onClick={onClose}
          >
            <X className="text-white" size={28} />
          </button>
        )}
        {children}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export default Modal
