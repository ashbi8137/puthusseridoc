import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DownloadButton from '@/components/DownloadButton'
import BackButton from '@/components/BackButton'
import DocumentViewer from '@/components/DocumentViewer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ViewDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch document with member
  const { data: doc, error } = await supabase
    .from('documents')
    .select('*, family_members(*)')
    .eq('id', id)
    .single()

  if (error || !doc) {
    notFound()
  }

  const member = doc.family_members

  // Create preview and download signed URLs in PARALLEL in a single roundtrip
  const [signedUrlRes, downloadUrlRes] = await Promise.all([
    supabase.storage.from('family-documents').createSignedUrl(doc.file_path, 300),
    supabase.storage.from('family-documents').createSignedUrl(doc.file_path, 300, { download: doc.file_name })
  ])

  const signedUrl = signedUrlRes.data?.signedUrl
  const downloadUrl = downloadUrlRes.data?.signedUrl || signedUrl

  if (signedUrlRes.error || !signedUrl) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl border border-stone-100">
        <p className="text-stone-700 font-medium">Unable to load document preview.</p>
        <p className="text-stone-400 text-sm mt-2">Please try again later.</p>
      </div>
    )
  }

  const isPdf = doc.file_type === 'application/pdf' || doc.file_name.toLowerCase().endsWith('.pdf')
  const isCommon = doc.document_type === 'common_document' || doc.document_type === 'common' || member?.slug === 'common'
  const fallbackHref = isCommon ? '/common' : `/family/${member?.slug || 'home'}`
  const backLabel = isCommon ? 'Back to Common Documents' : `Back to ${member?.display_name || 'Family'}`

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <BackButton fallbackHref={fallbackHref} label={backLabel} />
          
          <DownloadButton
            downloadUrl={downloadUrl}
            fileName={doc.file_name}
          />
        </div>
        
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">
            {doc.document_name}
          </h1>
          <div className="flex items-center gap-2 text-stone-500 text-sm mt-1">
            <span className="font-medium text-stone-700">
              {isCommon ? 'Common Document' : (member?.display_name || 'Family')}
            </span>
            <span>•</span>
            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      {/* Document Viewer: 100% Fit Width by Default + Interactive Zoom Controls */}
      <DocumentViewer
        url={signedUrl}
        downloadUrl={downloadUrl}
        title={doc.document_name}
        fileName={doc.file_name}
        fileType={doc.file_type}
        isPdf={isPdf}
      />
    </div>
  )
}
