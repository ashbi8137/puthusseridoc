'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AvatarUploaderProps {
  memberId: string
  memberSlug: string
  displayName: string
  signedAvatarUrl?: string | null
  themeAvatarBg: string
}

export default function AvatarUploader({
  memberId,
  memberSlug,
  displayName,
  signedAvatarUrl,
  themeAvatarBg,
}: AvatarUploaderProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const inputId = `avatar-upload-${memberSlug}`
  
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(signedAvatarUrl || null)

  // Crop State
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const imageRef = useRef<HTMLImageElement>(null)

  const CROP_BOX_SIZE = 260 // Visible square crop viewport in px

  useEffect(() => {
    if (signedAvatarUrl) {
      setPreviewUrl(signedAvatarUrl)
    }
  }, [signedAvatarUrl])

  // Handle user selecting a photo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file (JPG or PNG).')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('Photo is too large. Maximum size is 20MB.')
      return
    }

    // Clean up previous image URL if any
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc)
    }

    const objectUrl = URL.createObjectURL(file)
    setSelectedImageSrc(objectUrl)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setCropModalOpen(true)
  }

  // Reset positioning helpers
  const handleResetPosition = (type: 'center' | 'zoom-in' | 'zoom-out') => {
    if (type === 'center') {
      setPan({ x: 0, y: 0 })
      setZoom(1)
    } else if (type === 'zoom-in') {
      setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(1)))
    } else if (type === 'zoom-out') {
      setZoom((z) => Math.max(1, +(z - 0.2).toFixed(1)))
    }
  }

  // Touch and Mouse Dragging
  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true)
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      panX: pan.x,
      panY: pan.y,
    }
  }

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return
    const deltaX = clientX - dragStartRef.current.x
    const deltaY = clientY - dragStartRef.current.y
    setPan({
      x: dragStartRef.current.panX + deltaX,
      y: dragStartRef.current.panY + deltaY,
    })
  }, [isDragging])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Cancel Crop Modal
  const handleCancelCrop = () => {
    setCropModalOpen(false)
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc)
      setSelectedImageSrc(null)
    }
  }

  // Crop to 512x512 Canvas and Upload
  const handleSaveCrop = async () => {
    const img = imageRef.current
    if (!img) return

    setIsUploading(true)

    try {
      const naturalW = img.naturalWidth || 500
      const naturalH = img.naturalHeight || 500

      // Base scale to fill crop box
      const baseScale = Math.max(CROP_BOX_SIZE / naturalW, CROP_BOX_SIZE / naturalH)
      const scale = baseScale * zoom
      const renderW = naturalW * scale
      const renderH = naturalH * scale

      const offsetX = (CROP_BOX_SIZE - renderW) / 2 + pan.x
      const offsetY = (CROP_BOX_SIZE - renderH) / 2 + pan.y

      // Output 512x512 square avatar
      const OUTPUT_SIZE = 512
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext('2d')

      if (!ctx) throw new Error('Could not create canvas context')

      const factor = OUTPUT_SIZE / CROP_BOX_SIZE
      ctx.drawImage(
        img,
        offsetX * factor,
        offsetY * factor,
        renderW * factor,
        renderH * factor
      )

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create image blob'))),
          'image/jpeg',
          0.9
        )
      })

      const filePath = `avatars/${memberSlug}.jpg`

      // 1. Upload to Supabase Storage bucket with upsert
      const { error: uploadError } = await supabase.storage
        .from('family-documents')
        .upload(filePath, blob, { 
          upsert: true,
          contentType: 'image/jpeg',
        })

      if (uploadError) throw uploadError

      // 2. Safely try database update if column exists
      try {
        await supabase
          .from('family_members')
          .update({ avatar_url: filePath })
          .eq('id', memberId)
      } catch {
        // Safe to ignore
      }

      // 3. Update preview immediately
      const newLocalUrl = URL.createObjectURL(blob)
      setPreviewUrl(newLocalUrl)
      setCropModalOpen(false)

      if (selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc)
        setSelectedImageSrc(null)
      }

      // 4. Sync server components
      router.refresh()
    } catch (err: any) {
      console.error('Crop save error:', err)
      alert(err.message || 'Failed to save cropped photo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      {/* Hidden File Input — triggered natively via <label htmlFor> */}
      <input
        id={inputId}
        type="file"
        key={cropModalOpen ? 'opened' : 'closed'} // Reset input on each modal close
        onChange={handleFileChange}
        onClick={(e) => {
          // Reset value on click so selecting the same file triggers onChange
          (e.target as HTMLInputElement).value = ''
        }}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="sr-only"
        disabled={isUploading}
      />

      {/* Avatar Display & Native Label Trigger */}
      <div className="relative flex-shrink-0">
        <label
          htmlFor={inputId}
          title="Tap to change profile photo"
          className="relative block w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden focus:outline-none ring-2 ring-white/60 shadow-sm cursor-pointer active:scale-95 transition-transform bg-slate-100 select-none"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={displayName}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className={`w-full h-full ${themeAvatarBg} font-extrabold text-xl sm:text-2xl flex items-center justify-center`}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Uploading Spinner */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
        </label>

        {/* Small Camera Badge Button */}
        <label
          htmlFor={inputId}
          title="Change photo"
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer select-none"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </label>
      </div>

      {/* Simple, Intuitive Crop Modal */}
      {cropModalOpen && selectedImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-5 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Adjust Profile Photo</h3>
                <p className="text-[11px] text-slate-400">Drag to center your face inside the circle</p>
              </div>
              <button
                type="button"
                onClick={handleCancelCrop}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Circular Crop Preview Viewport */}
            <div className="flex justify-center">
              <div
                style={{ width: `${CROP_BOX_SIZE}px`, height: `${CROP_BOX_SIZE}px` }}
                className="relative overflow-hidden rounded-2xl bg-slate-950 select-none shadow-inner touch-none cursor-move border border-slate-800"
                onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={(e) => {
                  if (e.touches[0]) handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
                }}
                onTouchMove={(e) => {
                  if (e.touches[0]) handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
                }}
                onTouchEnd={handleDragEnd}
              >
                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={selectedImageSrc}
                  alt="Crop viewport"
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    maxWidth: 'none',
                    maxHeight: 'none',
                  }}
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Circular Profile Mask Guide */}
                <div className="absolute inset-0 rounded-full border-2 border-white/80 pointer-events-none shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]" />
              </div>
            </div>

            {/* Simple Zoom & Position Bar */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleResetPosition('zoom-out')}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer transition-colors"
                  title="Zoom out"
                >
                  −
                </button>
                <span className="text-xs font-semibold text-slate-600 w-9 text-center">
                  {zoom.toFixed(1)}x
                </span>
                <button
                  type="button"
                  onClick={() => handleResetPosition('zoom-in')}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer transition-colors"
                  title="Zoom in"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleResetPosition('center')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
              >
                Reset Center
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelCrop}
                disabled={isUploading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCrop}
                disabled={isUploading}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isUploading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Photo</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
