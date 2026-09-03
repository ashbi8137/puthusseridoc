'use client'

import { useState, useRef, useEffect } from 'react'
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

  useEffect(() => {
    if (signedAvatarUrl) {
      setPreviewUrl(signedAvatarUrl)
    }
  }, [signedAvatarUrl])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP).')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Photo is too large. Maximum size is 10MB.')
      return
    }

    setIsUploading(true)

    try {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const filePath = `avatars/${memberSlug}.${fileExt}`

      // 1. Upload to Supabase Storage with upsert (replaces existing if any)
      const { error: uploadError } = await supabase.storage
        .from('family-documents')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      // 2. Optionally update database column if it exists (safe fallback)
      try {
        await supabase
          .from('family_members')
          .update({ avatar_url: filePath })
          .eq('id', memberId)
      } catch {
        // Safe to ignore if column doesn't exist
      }

      // 3. Immediately set local preview so UI updates instantly
      const localUrl = URL.createObjectURL(file)
      setPreviewUrl(localUrl)

      // 4. Refresh router in background to sync server state
      router.refresh()
    } catch (err: any) {
      console.error('Avatar upload error:', err)
      alert(err.message || 'Failed to upload photo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="relative group flex-shrink-0">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
      />

      {/* Avatar Container */}
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

      {/* Small camera badge button at bottom-right corner */}
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
  )
}
