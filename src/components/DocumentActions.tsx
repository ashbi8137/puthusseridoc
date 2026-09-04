'use client'

import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { showToast } from './Toast'

interface DocumentActionsProps {
  document: {
    id: string
    document_name: string
    document_type: string
    file_path: string
    file_name: string
    is_common_document?: boolean
    [key: string]: any
  }
}

export default function DocumentActions({ document: doc }: DocumentActionsProps) {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [isDownloading, setIsDownloading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Rename state
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [newName, setNewName] = useState(doc.document_name || '')
  const [isRenaming, setIsRenaming] = useState(false)

  // Delete state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Move category state
  const [isMoving, setIsMoving] = useState(false)

  // Category determination
  const isCommonDoc = doc.document_type === 'common_document' || doc.document_type === 'common'
  const isPersonalDoc = !isCommonDoc
  const isImportant = Boolean(doc.is_common_document)

  // 1. Download Handler
  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const { data, error } = await supabase
        .storage
        .from('family-documents')
        .createSignedUrl(doc.file_path, 120, { download: doc.file_name })

      if (error) throw error
      if (data?.signedUrl) {
        try {
          // Fetch as blob for instant direct download into device Downloads folder
          const response = await fetch(data.signedUrl)
          if (!response.ok) throw new Error('Download failed')
          const blob = await response.blob()
          const blobUrl = window.URL.createObjectURL(blob)

          const link = window.document.createElement('a')
          link.href = blobUrl
          link.download = doc.file_name
          window.document.body.appendChild(link)
          link.click()
          window.document.body.removeChild(link)
          window.URL.revokeObjectURL(blobUrl)
        } catch {
          const link = window.document.createElement('a')
          link.href = data.signedUrl
          link.download = doc.file_name
          window.document.body.appendChild(link)
          link.click()
          window.document.body.removeChild(link)
        }
      }
    } catch (error) {
      console.error('Error downloading:', error)
      alert('Unable to download the document. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  // 2. Category Move Handler
  const handleToggleCategory = async () => {
    setIsMoving(true)
    try {
      const nextIsImportant = !isImportant
      const { error } = await supabase
        .from('documents')
        .update({
          is_common_document: nextIsImportant,
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id)

      if (error) throw error

      showToast('✅ Document moved successfully')
      router.refresh()
    } catch (err: any) {
      console.error('Failed to move category:', err)
      alert('Failed to move document category. Please try again.')
    } finally {
      setIsMoving(false)
    }
  }

  // 3. Rename Handler
  const handleSaveRename = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return

    setIsRenaming(true)
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          document_name: trimmed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id)

      if (error) throw error

      setIsRenaming(false)
      setIsRenameOpen(false)
      showToast('✅ Document renamed successfully')
      router.refresh()
    } catch (err: any) {
      console.error('Rename error:', err)
      alert('Failed to rename document. Please try again.')
      setIsRenaming(false)
    }
  }

  // 4. Delete Handler
  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      if (doc.file_path) {
        await supabase.storage.from('family-documents').remove([doc.file_path])
      }

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (dbError) throw dbError

      setIsDeleting(false)
      setIsDeleteOpen(false)
      showToast('✅ Document deleted successfully')
      router.refresh()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Failed to delete document. Please try again.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
      {/* View Button */}
      <Link 
        href={`/view/${doc.id}`}
        prefetch={true}
        className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center min-h-[30px] sm:min-h-[32px]"
      >
        View
      </Link>

      {/* Download Button */}
      <button 
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1 min-h-[30px] sm:min-h-[32px]"
        title="Download document"
      >
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>{isDownloading ? 'Saving...' : 'Download'}</span>
      </button>

      {/* Three-Dot Options Button */}
      <div className="relative">
        <button 
          type="button"
          onClick={() => {
            setNewName(doc.document_name || '')
            setIsMenuOpen(!isMenuOpen)
          }}
          className="p-1 sm:p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer flex items-center justify-center min-w-[28px] min-h-[30px] sm:min-h-[32px]"
          title="Document options"
          aria-label="Document options"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {/* Dropdown / Popup Menu */}
        {isMenuOpen && (
          <>
            {/* Backdrop for click outside */}
            <div 
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs" 
              onClick={() => setIsMenuOpen(false)} 
            />

            {/* Desktop Dropdown (sm and above) */}
            <div className="hidden sm:block absolute right-0 top-full mt-1.5 z-50 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 animate-in fade-in zoom-in-95 duration-150">
              {/* Option 1: Rename */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false)
                  setIsRenameOpen(true)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 active:bg-slate-200/70 transition-colors cursor-pointer"
              >
                <span className="text-sm">✏️</span>
                <span>Rename</span>
              </button>

              {/* Option 2: Move Category (Personal Documents Only) */}
              {isPersonalDoc && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false)
                    handleToggleCategory()
                  }}
                  disabled={isMoving}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 active:bg-slate-200/70 transition-colors cursor-pointer"
                >
                  <span className="text-sm">{isImportant ? '📁' : '⭐'}</span>
                  <span>{isImportant ? 'Move to Other Documents' : 'Move to Important Documents'}</span>
                </button>
              )}

              <div className="h-px bg-slate-100 my-1" />

              {/* Option 3: Delete */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false)
                  setIsDeleteOpen(true)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 active:bg-rose-100/70 transition-colors cursor-pointer"
              >
                <span className="text-sm">🗑️</span>
                <span>Delete</span>
              </button>
            </div>

            {/* Mobile Action Sheet (below sm screens) */}
            <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl p-4 shadow-2xl border-t border-slate-200 space-y-1.5 animate-in slide-in-from-bottom-5 duration-200">
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2" />
              
              <div className="px-2 pb-2 mb-1 border-b border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Document Options</p>
                <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{doc.document_name}</p>
              </div>

              {/* Rename */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false)
                  setIsRenameOpen(true)
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left text-sm font-semibold text-slate-700 active:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="text-base">✏️</span>
                <span>Rename</span>
              </button>

              {/* Move Category (Personal Documents Only) */}
              {isPersonalDoc && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false)
                    handleToggleCategory()
                  }}
                  disabled={isMoving}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left text-sm font-semibold text-slate-700 active:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span className="text-base">{isImportant ? '📁' : '⭐'}</span>
                  <span>{isImportant ? 'Move to Other Documents' : 'Move to Important Documents'}</span>
                </button>
              )}

              {/* Delete */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false)
                  setIsDeleteOpen(true)
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left text-sm font-semibold text-rose-600 active:bg-rose-50 transition-colors cursor-pointer"
              >
                <span className="text-base">🗑️</span>
                <span>Delete</span>
              </button>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full py-3 text-center text-sm font-semibold text-slate-600 bg-slate-100 rounded-2xl active:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Rename Dialog */}
      {isRenameOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => !isRenaming && setIsRenameOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>✏️</span>
                <span>Rename Document</span>
              </h3>
              <button 
                type="button"
                onClick={() => !isRenaming && setIsRenameOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">
                Document Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter document name"
                autoFocus
                disabled={isRenaming}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveRename()
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRenameOpen(false)}
                disabled={isRenaming}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                disabled={isRenaming || !newName.trim()}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isRenaming ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => !isDeleting && setIsDeleteOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>⚠️</span>
                <span>Delete Document?</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-900">&ldquo;{doc.document_name}&rdquo;</span>?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
