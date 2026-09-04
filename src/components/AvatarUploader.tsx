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

interface CropBox {
  x: number
  y: number
  size: number
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

  // Crop Screen State
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
  const [imageDims, setImageDims] = useState<{ naturalWidth: number; naturalHeight: number; dispWidth: number; dispHeight: number } | null>(null)
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, size: 100 })

  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Drag tracking ref
  const dragRef = useRef<{
    mode: 'move' | 'se' | 'sw' | 'ne' | 'nw'
    startX: number
    startY: number
    initX: number
    initY: number
    initSize: number
  } | null>(null)

  useEffect(() => {
    if (signedAvatarUrl) {
      setPreviewUrl(signedAvatarUrl)
    }
  }, [signedAvatarUrl])

  // When user picks an image from their gallery/camera
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP).')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('Photo is too large. Maximum size is 20MB.')
      return
    }

    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc)
    }

    const objectUrl = URL.createObjectURL(file)
    setSelectedImageSrc(objectUrl)
    setImageDims(null)
    setCropModalOpen(true)
  }

  // When the selected image loads, calculate display dimensions and center initial crop square
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const natW = img.naturalWidth || 400
    const natH = img.naturalHeight || 400

    // Available viewport space on mobile/tablet (max 280px wide x 340px high)
    const maxW = typeof window !== 'undefined' ? Math.min(290, window.innerWidth - 64) : 280
    const maxH = 340

    const scale = Math.min(maxW / natW, maxH / natH)
    const dispW = Math.max(120, Math.round(natW * scale))
    const dispH = Math.max(120, Math.round(natH * scale))

    setImageDims({
      naturalWidth: natW,
      naturalHeight: natH,
      dispWidth: dispW,
      dispHeight: dispH,
    })

    // Center an initial square crop box covering ~80% of the smaller dimension
    const initialSize = Math.max(70, Math.round(Math.min(dispW, dispH) * 0.8))
    const initialX = Math.max(0, Math.round((dispW - initialSize) / 2))
    const initialY = Math.max(0, Math.round((dispH - initialSize) / 2))

    setCropBox({
      x: initialX,
      y: initialY,
      size: initialSize,
    })
  }

  // Helper to clamp values
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

  // Pointer Down: start moving or resizing
  const handlePointerDown = (
    mode: 'move' | 'se' | 'sw' | 'ne' | 'nw',
    e: React.PointerEvent
  ) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initX: cropBox.x,
      initY: cropBox.y,
      initSize: cropBox.size,
    }
  }

  // Pointer Move: update crop square position or size smoothly
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !imageDims) return
    e.preventDefault()

    const { mode, startX, startY, initX, initY, initSize } = dragRef.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const { dispWidth: W, dispHeight: H } = imageDims
    const minSize = 60 // Minimum crop square size

    if (mode === 'move') {
      // Move crop square within image boundaries
      const newX = clamp(initX + dx, 0, W - cropBox.size)
      const newY = clamp(initY + dy, 0, H - cropBox.size)
      setCropBox(prev => ({ ...prev, x: newX, y: newY }))
    } else if (mode === 'se') {
      // Bottom-Right handle
      const delta = Math.max(dx, dy)
      const maxSize = Math.min(W - initX, H - initY)
      const newSize = clamp(initSize + delta, minSize, maxSize)
      setCropBox({ x: initX, y: initY, size: newSize })
    } else if (mode === 'nw') {
      // Top-Left handle
      const delta = Math.min(dx, dy)
      const maxExpand = Math.min(initX, initY)
      const newSize = clamp(initSize - delta, minSize, initSize + maxExpand)
      const diff = newSize - initSize
      setCropBox({ x: initX - diff, y: initY - diff, size: newSize })
    } else if (mode === 'ne') {
      // Top-Right handle
      const delta = Math.max(dx, -dy)
      const maxExpand = Math.min(W - (initX + initSize), initY)
      const newSize = clamp(initSize + delta, minSize, initSize + maxExpand)
      const diff = newSize - initSize
      setCropBox({ x: initX, y: initY - diff, size: newSize })
    } else if (mode === 'sw') {
      // Bottom-Left handle
      const delta = Math.max(-dx, dy)
      const maxExpand = Math.min(initX, H - (initY + initSize))
      const newSize = clamp(initSize + delta, minSize, initSize + maxExpand)
      const diff = newSize - initSize
      setCropBox({ x: initX - diff, y: initY, size: newSize })
    }
  }, [imageDims, cropBox.size])

  // Pointer Up: finish drag
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
      dragRef.current = null
    }
  }, [])

  // Cancel
  const handleCancel = () => {
    setCropModalOpen(false)
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc)
      setSelectedImageSrc(null)
    }
    setImageDims(null)
  }

  // Done: Crop square & save
  const handleDone = async () => {
    const img = imageRef.current
    if (!img || !imageDims) return

    setIsUploading(true)

    try {
      const { naturalWidth: natW, dispWidth: dispW } = imageDims
      const scale = natW / dispW

      const cropNatX = Math.round(cropBox.x * scale)
      const cropNatY = Math.round(cropBox.y * scale)
      const cropNatSize = Math.round(cropBox.size * scale)

      // Create crisp 512x512 canvas output
      const OUTPUT_SIZE = 512
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext('2d')

      if (!ctx) throw new Error('Canvas context could not be created')

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(
        img,
        cropNatX,
        cropNatY,
        cropNatSize,
        cropNatSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      )

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          b => (b ? resolve(b) : reject(new Error('Failed to generate image blob'))),
          'image/jpeg',
          0.92
        )
      })

      const filePath = `avatars/${memberSlug}.jpg`

      // 1. Upload to Supabase Storage with upsert
      const { error: uploadError } = await supabase.storage
        .from('family-documents')
        .upload(filePath, blob, {
          upsert: true,
          contentType: 'image/jpeg',
        })

      if (uploadError) throw uploadError

      // 2. Safe DB update if column exists
      try {
        await supabase
          .from('family_members')
          .update({ avatar_url: filePath })
          .eq('id', memberId)
      } catch {}

      // 3. Immediately display new cropped avatar
      const newPreview = URL.createObjectURL(blob)
      setPreviewUrl(newPreview)
      setCropModalOpen(false)

      if (selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc)
        setSelectedImageSrc(null)
      }
      setImageDims(null)

      // 4. Refresh server state
      router.refresh()
    } catch (err: any) {
      console.error('Save photo error:', err)
      alert(err.message || 'Failed to save photo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      {/* Hidden native file input */}
      <input
        id={inputId}
        type="file"
        key={cropModalOpen ? 'modal-open' : 'modal-closed'}
        onChange={handleFileChange}
        onClick={e => {
          ;(e.target as HTMLInputElement).value = ''
        }}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="sr-only"
        disabled={isUploading}
      />

      {/* Avatar Display & Tap Trigger */}
      <div className="relative flex-shrink-0">
        <label
          htmlFor={inputId}
          title="Tap to change profile photo"
          className="relative block w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden ring-2 ring-white/70 shadow-xs cursor-pointer active:scale-95 transition-transform bg-slate-100 select-none"
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

        {/* Small Camera Badge */}
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

      {/* Completely Simplified Profile Crop Screen: Choose Photo -> Adjust Square -> Done */}
      {cropModalOpen && selectedImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-5 space-y-4">
            
            {/* Clean Header */}
            <div className="text-center pb-1 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Adjust your photo</h3>
              <p className="text-xs text-slate-400 mt-0.5">Move or resize the square box to frame your face</p>
            </div>

            {/* Selected Image with Adjustable Square Crop Box */}
            <div className="flex justify-center items-center select-none py-1">
              <div
                ref={containerRef}
                style={{
                  width: imageDims ? `${imageDims.dispWidth}px` : '280px',
                  height: imageDims ? `${imageDims.dispHeight}px` : '280px',
                }}
                className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-inner flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={selectedImageSrc}
                  alt="Select area to crop"
                  onLoad={handleImageLoaded}
                  draggable={false}
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Adjustable Square Crop Box */}
                {imageDims && (
                  <div
                    style={{
                      left: `${cropBox.x}px`,
                      top: `${cropBox.y}px`,
                      width: `${cropBox.size}px`,
                      height: `${cropBox.size}px`,
                      boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
                    }}
                    onPointerDown={e => handlePointerDown('move', e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="absolute cursor-move touch-none border-2 border-white select-none transition-shadow"
                  >
                    {/* Circular avatar preview guideline inside the square */}
                    <div className="absolute inset-0 rounded-full border border-white/50 pointer-events-none" />

                    {/* Corner 1: Top-Left Handle */}
                    <div
                      onPointerDown={e => handlePointerDown('nw', e)}
                      className="absolute -top-2.5 -left-2.5 w-6 h-6 flex items-center justify-center cursor-nwse-resize touch-none z-10"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs shadow-sm" />
                    </div>

                    {/* Corner 2: Top-Right Handle */}
                    <div
                      onPointerDown={e => handlePointerDown('ne', e)}
                      className="absolute -top-2.5 -right-2.5 w-6 h-6 flex items-center justify-center cursor-nesw-resize touch-none z-10"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs shadow-sm" />
                    </div>

                    {/* Corner 3: Bottom-Left Handle */}
                    <div
                      onPointerDown={e => handlePointerDown('sw', e)}
                      className="absolute -bottom-2.5 -left-2.5 w-6 h-6 flex items-center justify-center cursor-nesw-resize touch-none z-10"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs shadow-sm" />
                    </div>

                    {/* Corner 4: Bottom-Right Handle */}
                    <div
                      onPointerDown={e => handlePointerDown('se', e)}
                      className="absolute -bottom-2.5 -right-2.5 w-6 h-6 flex items-center justify-center cursor-nwse-resize touch-none z-10"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs shadow-sm" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Exactly 2 Buttons: Cancel and Done */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isUploading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDone}
                disabled={isUploading}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
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
                  <span>Done</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
