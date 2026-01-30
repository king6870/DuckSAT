"use client"

import { useState, useRef } from 'react'

interface ImageUploadProps {
  imageUrl?: string
  onImageUpload: (imageUrl: string) => void
  onImageRemove: () => void
}

export default function ImageUpload({ imageUrl, onImageUpload, onImageRemove }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      alert('Please select a PNG or JPEG image')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        onImageUpload(data.imageUrl)
      } else {
        alert('Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    onImageRemove()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-4">Diagram Image</h4>
      
      {!imageUrl ? (
        <div className="text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {uploading ? 'Uploading...' : 'Upload Image'}
          </label>
          <p className="text-xs text-gray-500 mt-2">
            PNG or JPEG, max 5MB
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <img
              src={imageUrl}
              alt="Diagram"
              className="max-w-full h-auto rounded border shadow-sm"
              style={{ maxHeight: '300px' }}
            />
          </div>
          <div className="flex space-x-2">
            <label
              htmlFor="image-upload"
              className="cursor-pointer inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              {uploading ? 'Uploading...' : 'Replace'}
            </label>
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center px-3 py-1 border border-red-300 rounded text-sm text-red-700 bg-white hover:bg-red-50"
            >
              Remove
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
          />
        </div>
      )}
    </div>
  )
}
