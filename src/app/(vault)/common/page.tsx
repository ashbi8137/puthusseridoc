import { createClient } from '@/lib/supabase/server'
import BackButton from '@/components/BackButton'
import DocumentItem from '@/components/DocumentItem'
import CommonPageClient from '@/components/CommonPageClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CommonDocumentsPage() {
  const supabase = await createClient()

  // 1. Fetch all members and current authenticated user in parallel
  const [
    { data: { user } },
    { data: rawMembers },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('family_members').select('*'),
  ])

  const members = rawMembers || []
  const userEmail = user?.email?.trim().toLowerCase() || ''

  // Find user's member record for fallback memberId if 'common' member does not exist in table
  const currentMember = members.find(m => m.email?.toLowerCase() === userEmail) || members[0]
  const commonMember = members.find(m => m.slug === 'common')
  const targetMemberId = commonMember?.id || currentMember?.id || ''

  // 2. Fetch all shared/common documents
  // Matches documents marked as common_document or belonging to common member
  const { data: rawDocuments } = await supabase
    .from('documents')
    .select('*, family_members(display_name, slug)')
    .or(`document_type.eq.common_document,document_type.eq.common${commonMember ? `,family_member_id.eq.${commonMember.id}` : ''}`)
    .order('created_at', { ascending: false })

  const rawDocs = rawDocuments || []

  // 3. Batch sign URLs for document thumbnails
  const pathsToSign = rawDocs.map(d => d.file_path).filter(Boolean)
  const urlMap = new Map<string, string>()

  if (pathsToSign.length > 0) {
    try {
      const { data: signedResults } = await supabase.storage
        .from('family-documents')
        .createSignedUrls(pathsToSign, 3600)

      signedResults?.forEach(item => {
        if (item?.path && item?.signedUrl) {
          urlMap.set(item.path, item.signedUrl)
        }
      })
    } catch {
      // Fallback
    }
  }

  // 4. Natural case-insensitive alphabetical sort (A → Z)
  const sortAlphabetically = (a: any, b: any) => {
    const nameA = (a.document_name || a.name || '').trim()
    const nameB = (b.document_name || b.name || '').trim()
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' })
  }

  const sortedDocs = rawDocs.map(doc => ({
    ...doc,
    signed_url: urlMap.get(doc.file_path) || null,
  })).sort(sortAlphabetically)

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-indigo-50/60 via-slate-50 to-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <BackButton fallbackHref="/home" label="Back to Home" />
          <span className="text-xs font-medium text-slate-400">
            {sortedDocs.length} total document{sortedDocs.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex items-center gap-3.5 pt-1">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Common Documents
            </h1>
          </div>
        </div>

        <CommonPageClient memberId={targetMemberId} />
      </div>

      {/* Shared Documents List (Alphabetical A → Z) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Shared Documents
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            {sortedDocs.length} uploaded
          </span>
        </div>

        {sortedDocs.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 divide-y divide-slate-100">
            {sortedDocs.map(doc => (
              <DocumentItem key={doc.id} document={doc} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50/70 rounded-2xl p-8 text-center border border-slate-200/60 border-dashed space-y-1.5">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold text-xs sm:text-sm">No shared documents uploaded yet</p>
            <p className="text-slate-400 text-xs max-w-xs mx-auto">
              Upload property records, family certificates, ration card, insurance, or legal documents.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
