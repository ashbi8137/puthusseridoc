'use client'

import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

interface DocumentActionsProps {
  document: {
    id: string
    file_path: string
    file_name: string
    [key: string]: any
  }
}

export default function DocumentActions({ document: doc }: DocumentActionsProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

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
          // Fetch as blob to force same-origin browser download into local device Downloads storage
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
          // Fallback: direct download link navigation (Supabase attachment header)
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) return

    setIsDeleting(true)
    try {
      await supabase
        .storage
        .from('family-documents')
        .remove([doc.file_path])

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (dbError) throw dbError

      router.refresh()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Failed to delete document. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <Link 
        href={`/view/${doc.id}`}
        className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 rounded-lg transition-colors cursor-pointer"
      >
        View
      </Link>
      <button 
        onClick={handleDownload}
        disabled={isDownloading}
        className="px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>{isDownloading ? 'Saving...' : 'Download'}</span>
      </button>
      <button 
        onClick={handleDelete}
        disabled={isDeleting}
        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50 cursor-pointer"
        title="Delete document"
      >
        <span className="sr-only">Delete</span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
