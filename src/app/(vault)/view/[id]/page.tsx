import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DownloadButton from '@/components/DownloadButton'
import BackButton from '@/components/BackButton'

export const revalidate = 30

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

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <BackButton fallbackHref={`/family/${member.slug}`} label={`Back to ${member.display_name}`} />
          
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
            <span className="font-medium text-stone-700">{member.display_name}</span>
            <span>•</span>
            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {isPdf ? (
          <iframe 
            src={`${signedUrl}#view=FitH`} 
            className="w-full h-[70vh] min-h-[500px]" 
            title={doc.document_name}
          />
        ) : (
          <div className="flex justify-center bg-stone-50 p-4 sm:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={signedUrl} 
              alt={doc.document_name}
              className="max-w-full rounded-xl shadow-sm border border-stone-200"
            />
          </div>
        )}
      </div>
    </div>
  )
}
