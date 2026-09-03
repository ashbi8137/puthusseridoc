import { createClient } from '@/lib/supabase/server'
import { COMMON_DOCUMENT_TYPES } from '@/lib/constants'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MemberPageClient from '@/components/MemberPageClient'
import DocumentItem from '@/components/DocumentItem'
import AvatarUploader from '@/components/AvatarUploader'

export const revalidate = 0

const MEMBER_THEMES: Record<string, {
  headerBg: string
  avatarBg: string
}> = {
  ashbin: {
    headerBg: 'bg-gradient-to-br from-blue-50/70 via-sky-50/40 to-white',
    avatarBg: 'bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-sm shadow-blue-200',
  },
  abdurahiman: {
    headerBg: 'bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white',
    avatarBg: 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-sm shadow-emerald-200',
  },
  shareena: {
    headerBg: 'bg-gradient-to-br from-rose-50/70 via-pink-50/40 to-white',
    avatarBg: 'bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-sm shadow-rose-200',
  },
  shamil: {
    headerBg: 'bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white',
    avatarBg: 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-sm shadow-indigo-200',
  },
}

export default async function FamilyMemberPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: member, error: memberError } = await supabase
    .from('family_members')
    .select('*')
    .eq('slug', slug)
    .single()

  if (memberError || !member) {
    notFound()
  }

  // Get signed URL for profile avatar from storage or database
  let signedAvatarUrl: string | null = null
  try {
    const { data: avatarFiles } = await supabase.storage
      .from('family-documents')
      .list('avatars')

    const matchedAvatar = avatarFiles?.find(f => 
      f.name.startsWith(`${member.slug}.`)
    )

    if (matchedAvatar) {
      const { data } = await supabase.storage
        .from('family-documents')
        .createSignedUrl(`avatars/${matchedAvatar.name}`, 3600)
      signedAvatarUrl = data?.signedUrl || null
    } else if (member.avatar_url) {
      const { data } = await supabase.storage
        .from('family-documents')
        .createSignedUrl(member.avatar_url, 3600)
      signedAvatarUrl = data?.signedUrl || null
    }
  } catch {
    signedAvatarUrl = null
  }

  const { data: rawDocuments } = await supabase
    .from('documents')
    .select('*')
    .eq('family_member_id', member.id)
    .order('created_at', { ascending: false })

  const rawDocs = rawDocuments || []

  // Generate signed URLs for thumbnail previews
  const docs = await Promise.all(
    rawDocs.map(async (doc) => {
      try {
        const { data } = await supabase.storage
          .from('family-documents')
          .createSignedUrl(doc.file_path, 3600)
        return {
          ...doc,
          signed_url: data?.signedUrl || null,
        }
      } catch {
        return { ...doc, signed_url: null }
      }
    })
  )
  
  const importantDocs = docs.filter(d => d.is_common_document)
  const otherDocs = docs.filter(d => !d.is_common_document)

  const coreTypes = COMMON_DOCUMENT_TYPES.map(t => t.type)
  const extraImportantDocs = importantDocs.filter(d => !coreTypes.includes(d.document_type))

  const theme = MEMBER_THEMES[member.slug] || {
    headerBg: 'bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white',
    avatarBg: 'bg-gradient-to-tr from-slate-800 to-indigo-700 text-white',
  }

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className={`${theme.headerBg} rounded-3xl p-5 border border-slate-200/70 shadow-xs space-y-4`}>
        <div className="flex items-center justify-between">
          <Link 
            href="/home" 
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors text-xs font-semibold bg-white/80 px-3 py-1.5 rounded-full border border-slate-200/60 shadow-2xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Home</span>
          </Link>
          <span className="text-xs font-medium text-slate-400">
            {docs.length} total document{docs.length === 1 ? '' : 's'}
          </span>
        </div>
        
        <div className="flex items-center gap-3.5 pt-1">
          <AvatarUploader
            memberId={member.id}
            memberSlug={member.slug}
            displayName={member.display_name}
            avatarUrl={member.avatar_url}
            signedAvatarUrl={signedAvatarUrl}
            themeAvatarBg={theme.avatarBg}
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {member.display_name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Personal Document Vault</p>
          </div>
        </div>

        <MemberPageClient 
          memberSlug={member.slug} 
          memberId={member.id} 
          existingDocs={docs} 
        />
      </div>

      {/* Important Documents Section */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Important Documents
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            {importantDocs.length} uploaded
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
          {/* Core tracked documents (checklist) */}
          {COMMON_DOCUMENT_TYPES.map(docType => {
            const doc = importantDocs.find(d => d.document_type === docType.type)
            
            if (doc) {
              return <DocumentItem key={doc.id} document={doc} />
            }

            return (
              <div key={docType.type} className="p-3 sm:p-3.5 flex items-center justify-between gap-3 bg-white hover:bg-slate-50/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-100/90 border border-slate-200/60 border-dashed flex items-center justify-center text-slate-400 flex-shrink-0">
                    <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-semibold text-xs sm:text-sm text-slate-700 block">{docType.name}</span>
                    <span className="text-[11px] text-amber-700/80 bg-amber-50 px-1.5 py-0.5 rounded-md font-medium inline-block mt-0.5">
                      Not uploaded yet
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Any other documents saved under Important */}
          {extraImportantDocs.map(doc => (
            <DocumentItem key={doc.id} document={doc} />
          ))}
        </div>
      </section>

      {/* Other Documents Section */}
      <section className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Other Documents
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            {otherDocs.length} uploaded
          </span>
        </div>
        
        {otherDocs.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
            {otherDocs.map(doc => (
              <DocumentItem key={doc.id} document={doc} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50/70 rounded-2xl p-6 text-center border border-slate-200/60 border-dashed">
            <p className="text-slate-500 font-medium text-xs sm:text-sm">No other documents uploaded yet</p>
            <p className="text-slate-400 text-xs mt-0.5">Insurance, certificates, agreements, etc.</p>
          </div>
        )}
      </section>
    </div>
  )
}
