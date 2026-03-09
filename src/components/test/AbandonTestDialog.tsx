"use client"

import { useEffect, useRef } from 'react'

interface AbandonTestDialogProps {
  isOpen: boolean
  onConfirmAbandon: () => void
  onCancel: () => void
}

export default function AbandonTestDialog({
  isOpen,
  onConfirmAbandon,
  onCancel,
}: AbandonTestDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Auto-focus the "Continue Test" button when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => cancelRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="abandon-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border-2 border-red-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">⚠️</div>
          <h2
            id="abandon-title"
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            Abandon Test?
          </h2>
          <p className="text-gray-600 leading-relaxed">
            All your progress on this test will be{' '}
            <span className="font-semibold text-red-600">
              permanently deleted
            </span>
            . This cannot be undone.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Continue Test
          </button>
          <button
            onClick={onConfirmAbandon}
            className="w-full py-3 rounded-xl font-bold text-lg bg-red-100 text-red-700 hover:bg-red-200 border-2 border-red-300 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            Yes, Abandon Test
          </button>
        </div>
      </div>
    </div>
  )
}
