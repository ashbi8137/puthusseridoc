'use client'

import { useState, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants'

interface CommonUploadModalProps {
  isOpen: boolean
  onClose: () => void
  memberId: string
}

export default function CommonUploadModal({ isOpen, onClose, memberId }: CommonUploadModalProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [documentName, setDocumentName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    if (isUploading) return
    setDocumentName('')
    setFile(null)
    setFileError(null)
    setUploadError(null)
    setSuccess(false)
    onClose()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (!ALLOWED_FILE_TYPES.includes(selected.type)) {
        setFileError('Please select a PDF, JPG, or PNG file.')
        return
      }
      if (selected.size > MAX_FILE_SIZE) {
        setFileError('File is too large. Maximum size is 10MB.')
        return
      }
      setFile(selected)
      // Auto-suggest document name from file name if empty
      if (!documentName.trim()) {
        const baseName = selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
        // Capitalize first letter of words
        const formatted = baseName.replace(/\b\w/g, l => l.toUpperCase())
        setDocumentName(formatted)
      }
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!documentName.trim()) {
      setFileError('Please enter a document name.')
      return
    }
    if (!file) {
      setFileError('Please choose a file to upload.')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated. Please log in.')

      const fileExt = file.name.split('.').pop()
      const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `common/${cleanFileName}`

      // 1. Upload to private Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('family-documents')
        .upload(filePath, file)

      if (storageError) throw storageError

      // 2. Insert document record in PostgreSQL
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          family_member_id: memberId,
          document_type: 'common_document',
          document_name: documentName.trim(),
          is_common_document: true,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        })

      if (dbError) throw dbError

      setSuccess(true)
      setTimeout(() => {
        handleClose()
        router.refresh()
      }, 1000)
    } catch (err: any) {
      console.error('Upload error:', err)
      setUploadError(err.message || 'Failed to upload document. Please try again.')
      setIsUploading(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={handleClose}
    >
      <div 
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-250"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Upload Common Document</h3>
            <p className="text-xs text-slate-500">Shared family documents</p>
          </div>
          <button 
            type="button"
            onClick={handleClose} 
            disabled={isUploading}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200/60 transition-colors cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {success ? (
            <div className="py-6 flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-slate-900">Document Uploaded Successfully</h4>
              <p className="text-xs text-slate-500">Now visible to all family members.</p>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-4">
              {/* Document Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Document Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={documentName}
                  onChange={e => setDocumentName(e.target.value)}
                  placeholder="e.g. Family Property Document, Ration Card..."
                  disabled={isUploading}
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                  required
                />
              </div>

              {/* Choose File */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Choose File <span className="text-rose-500">*</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept="application/pdf,image/jpeg,image/png,image/jpg"
                  className="hidden"
                  disabled={isUploading}
                />

                {file ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                        {file.type === 'application/pdf' ? 'PDF' : 'IMG'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer flex-shrink-0"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30"
                  >
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs font-semibold text-slate-700">Select PDF or Image</span>
                    <span className="text-[10px] text-slate-400">PDF, JPG, PNG (Max 10MB)</span>
                  </button>
                )}
              </div>

              {/* Errors */}
              {fileError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {fileError}
                </div>
              )}
              {uploadError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {uploadError}
                </div>
              )}

              {/* Upload Button */}
              <button
                type="submit"
                disabled={isUploading || !file || !documentName.trim()}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Uploading Document...</span>
                  </>
                ) : (
                  <span>Upload Document</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
