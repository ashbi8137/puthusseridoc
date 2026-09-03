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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(signedAvatarUrl || null)

  // Crop Modal States
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const imageRef = useRef<HTMLImageElement>(null)

  const CROP_FRAME_SIZE = 260 // Crop box width/height in px

  useEffect(() => {
    if (signedAvatarUrl) {
      setPreviewUrl(signedAvatarUrl)
    }
  }, [signedAvatarUrl])

  // When a user selects a file, open crop modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP).')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('Photo is too large. Maximum size is 15MB.')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setImageSrc(objectUrl)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setCropModalOpen(true)
    // Clear input value so same file can be re-selected if needed
    e.target.value = ''
  }

  // Mouse & Touch Pan Handling
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true)
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      panX: pan.x,
      panY: pan.y,
    }
  }

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return
    const deltaX = clientX - dragStartRef.current.x
    const deltaY = clientY - dragStartRef.current.y
    setPan({
      x: dragStartRef.current.panX + deltaX,
      y: dragStartRef.current.panY + deltaY,
    })
  }, [isDragging])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Crop & Upload to Supabase Storage
  const handleSaveCrop = async () => {
    const img = imageRef.current
    if (!img) return

    setIsUploading(true)

    try {
      const naturalW = img.naturalWidth
      const naturalH = img.naturalHeight

      // Base scale to cover the square crop frame
      const baseScale = Math.max(CROP_FRAME_SIZE / naturalW, CROP_FRAME_SIZE / naturalH)
      const scale = baseScale * zoom
      const renderW = naturalW * scale
      const renderH = naturalH * scale

      const offsetX = (CROP_FRAME_SIZE - renderW) / 2 + pan.x
      const offsetY = (CROP_FRAME_SIZE - renderH) / 2 + pan.y

      // Output canvas of 512x512 pixels
      const OUTPUT_SIZE = 512
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext('2d')

      if (!ctx) throw new Error('Canvas context not available')

      const factor = OUTPUT_SIZE / CROP_FRAME_SIZE
      ctx.drawImage(
        img,
        offsetX * factor,
        offsetY * factor,
        renderW * factor,
        renderH * factor
      )

      // Convert canvas to JPEG blob
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create image blob'))),
          'image/jpeg',
          0.92
        )
      })

      const filePath = `avatars/${memberSlug}.jpg`

      // 1. Upload cropped image directly to Supabase Storage with upsert
      const { error: uploadError } = await supabase.storage
        .from('family-documents')
        .upload(filePath, blob, { 
          upsert: true,
          contentType: 'image/jpeg',
        })

      if (uploadError) throw uploadError

      // 2. Optionally update database column if exists
      try {
        await supabase
          .from('family_members')
          .update({ avatar_url: filePath })
          .eq('id', memberId)
      } catch {
        // Safe to ignore
      }

      // 3. Immediately update UI preview
      const localPreview = URL.createObjectURL(blob)
      setPreviewUrl(localPreview)
      setCropModalOpen(false)

      // 4. Sync server state
      router.refresh()
    } catch (err: any) {
      console.error('Photo crop/upload error:', err)
      alert(err.message || 'Failed to save cropped photo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <div className="relative group flex-shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,image/jpg"
          className="hidden"
        />

        {/* Avatar Trigger Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Tap to change profile photo"
          className="relative block w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-transform active:scale-95 cursor-pointer shadow-sm bg-slate-100"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full ${themeAvatarBg} font-extrabold text-xl sm:text-2xl flex items-center justify-center`}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Hover / Loading Overlay */}
          <div className={`absolute inset-0 bg-black/35 flex items-center justify-center transition-opacity ${
            isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            {isUploading ? (
              <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </div>
        </button>

        {/* Small Camera Button Badge */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
          title="Change photo"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Profile Crop Modal */}
      {cropModalOpen && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 space-y-4 p-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Crop Profile Photo</h3>
                <p className="text-xs text-slate-400">Drag to center • Use slider to zoom</p>
              </div>
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Crop Interactive Viewport */}
            <div className="flex justify-center">
              <div
                style={{ width: `${CROP_FRAME_SIZE}px`, height: `${CROP_FRAME_SIZE}px` }}
                className="relative overflow-hidden rounded-3xl bg-slate-950 select-none shadow-inner touch-none cursor-move border-2 border-indigo-500"
                onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={(e) => {
                  if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)
                }}
                onTouchMove={(e) => {
                  if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
                }}
                onTouchEnd={handlePointerUp}
              >
                {/* User Image being transformed */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    maxWidth: 'none',
                    maxHeight: 'none',
                  }}
                  className="w-full h-full object-contain pointer-events-none transition-transform duration-75"
                />

                {/* Circular profile crop guideline */}
                <div className="absolute inset-0 rounded-full border-2 border-white/60 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              </div>
            </div>

            {/* Zoom Slider Controls */}
            <div className="space-y-1.5 px-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Zoom</span>
                <span>{zoom.toFixed(1)}x</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(1)))}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                >
                  −
                </button>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                disabled={isUploading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCrop}
                disabled={isUploading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
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
                  <span>Crop & Save</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
