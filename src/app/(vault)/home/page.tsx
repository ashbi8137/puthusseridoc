import { createClient } from '@/lib/supabase/server'
import { APP_NAME } from '@/lib/constants'
import Link from 'next/link'
import SearchSection from '@/components/SearchSection'
import MemberGrid from '@/components/MemberGrid'

export const revalidate = 30

function getGreeting() {
  const options = { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false } as const
  const hour = parseInt(new Intl.DateTimeFormat('en-US', options).format(new Date()))
  
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

const MEMBER_THEMES: Record<string, {
  cardBg: string
  borderColor: string
  avatarBg: string
  accentColor: string
}> = {
  ashbin: {
    cardBg: 'bg-gradient-to-br from-white via-sky-50/40 to-blue-50/70',
    borderColor: 'border-blue-100/90 hover:border-blue-300',
    avatarBg: 'bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-xs shadow-blue-300',
    accentColor: 'text-blue-700',
  },
  abdurahiman: {
    cardBg: 'bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/70',
    borderColor: 'border-emerald-100/90 hover:border-emerald-300',
    avatarBg: 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs shadow-emerald-300',
    accentColor: 'text-emerald-700',
  },
  shareena: {
    cardBg: 'bg-gradient-to-br from-white via-rose-50/40 to-pink-50/70',
    borderColor: 'border-rose-100/90 hover:border-rose-300',
    avatarBg: 'bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-xs shadow-rose-300',
    accentColor: 'text-rose-700',
  },
  shamil: {
    cardBg: 'bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/70',
    borderColor: 'border-indigo-100/90 hover:border-indigo-300',
    avatarBg: 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xs shadow-indigo-300',
    accentColor: 'text-indigo-700',
  },
}

export default async function HomePage() {
  const supabase = await createClient()

  // Run ALL database queries and storage listing in a single parallel burst!
  const [
    { data: { user } },
    { data: rawFamilyMembers },
    { data: rawRecentDocs },
    { data: avatarFiles },
    { count: rawCommonCount }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('family_members').select('*, documents(id)').order('created_at'),
    supabase.from('documents').select('id, document_name, document_type, file_path, file_name, file_type, file_size, created_at, family_members(display_name, slug)').order('created_at', { ascending: false }).limit(3),
    supabase.storage.from('family-documents').list('avatars'),
    supabase.from('documents').select('id', { count: 'exact', head: true }).or('document_type.eq.common_document,document_type.eq.common'),
  ])

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const userEmail = user?.email || ''

  const members = rawFamilyMembers || []
  const avatars = avatarFiles || []
  const recentRaw = rawRecentDocs || []
  const commonDocCount = rawCommonCount || 0

  // Collect all paths to sign in a single batch:
  // 1. Member avatars
  // 2. Recent documents
  const pathsToSign: string[] = []
  members.forEach(m => {
    const matched = avatars.find(f => f.name.startsWith(`${m.slug}.`))
    const path = matched ? `avatars/${matched.name}` : m.avatar_url
    if (path) pathsToSign.push(path)
  })
  recentRaw.forEach(d => {
    if (d.file_path) pathsToSign.push(d.file_path)
  })

  // Single batch signed URLs call for everything on the home page!
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

  const familyMembers = members.map(m => {
    const matched = avatars.find(f => f.name.startsWith(`${m.slug}.`))
    const path = matched ? `avatars/${matched.name}` : m.avatar_url
    return {
      ...m,
      signed_avatar_url: path ? (urlMap.get(path) || null) : null
    }
  })

  // Only the 4 individual family members in the 2x2 grid
  const individualMembers = familyMembers.filter(m => 
    ['ashbin', 'abdurahiman', 'shareena', 'shamil'].includes(m.slug)
  )

  const recentDocs = recentRaw.map(d => ({
    ...d,
    signed_url: urlMap.get(d.file_path) || null
  }))

  const totalDocuments = individualMembers.reduce((acc, m) => acc + ((m.documents as any[])?.length || 0), 0) + commonDocCount
  const greeting = getGreeting()

  // Find current user's family member record for personalized hero card
  const normalizedEmail = userEmail.trim().toLowerCase()
  let currentMember = members.find(m => m.email?.toLowerCase() === normalizedEmail)

  // Fallback mapping to guarantee 100% accurate family name resolution
  if (!currentMember) {
    if (normalizedEmail.includes('shareena') || normalizedEmail === 'shareena432@gmail.com') {
      currentMember = members.find(m => m.slug === 'shareena')
    } else if (normalizedEmail.includes('ashbin') || normalizedEmail.includes('ashputhusseri')) {
      currentMember = members.find(m => m.slug === 'ashbin')
    } else if (normalizedEmail.includes('parahiman') || normalizedEmail.includes('abdurahiman')) {
      currentMember = members.find(m => m.slug === 'abdurahiman')
    } else if (normalizedEmail.includes('shamil')) {
      currentMember = members.find(m => m.slug === 'shamil')
    }
  }

  // Auto-sync email in database if empty
  if (currentMember && !currentMember.email && normalizedEmail) {
    supabase.from('family_members').update({ email: normalizedEmail }).eq('id', currentMember.id).then()
  }

  const displayName = currentMember?.display_name || currentMember?.name || (firstName && firstName.length > 1 ? firstName : 'Family')
  const displayInitial = displayName.charAt(0).toUpperCase()

  let userAvatarUrl: string | null = null
  if (currentMember) {
    const matched = avatarFiles?.find(f => f.name.startsWith(`${currentMember.slug}.`))
    if (matched) {
      try {
        const { data } = await supabase.storage
          .from('family-documents')
          .createSignedUrl(`avatars/${matched.name}`, 3600)
        userAvatarUrl = data?.signedUrl || null
      } catch {
        userAvatarUrl = null
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Clean Executive Hero Card */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl shadow-indigo-950/20 border border-slate-800/80">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-center justify-between gap-3.5">
          {/* Left Side: Person's Profile Avatar + Greeting and Name */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {userAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatarUrl}
                alt={displayName}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ring-white/20 shadow-md flex-shrink-0 bg-slate-800"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-extrabold text-lg sm:text-xl flex items-center justify-center ring-2 ring-white/20 shadow-md flex-shrink-0">
                {displayInitial}
              </div>
            )}

            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-400 block leading-tight">
                {greeting},
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight mt-0.5 truncate">
                {displayName}
              </h1>
            </div>
          </div>

          {/* Right Side: Total Document Count */}
          <div className="flex-shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-2 rounded-2xl text-center shadow-xs">
              <span className="text-base sm:text-lg font-black text-white block leading-none">
                {totalDocuments}
              </span>
              <span className="text-[9px] font-bold text-indigo-200 uppercase tracking-wider block mt-1">
                {totalDocuments === 1 ? 'Doc' : 'Docs'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Integrated Search Input */}
      <SearchSection />

      {/* Section Subhead (without '4 Folders') */}
      <div className="px-1 pt-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Family Members
        </h2>
      </div>

      {/* 2x2 Mobile Grid with Instant Tap Feedback */}
      <MemberGrid familyMembers={individualMembers} themes={MEMBER_THEMES} />

      {/* 📁 COMMON DOCUMENTS SECTION */}
      <section className="space-y-2 pt-1">
        <div className="px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <span>Common Documents</span>
          </h2>
        </div>

        <Link
          href="/common"
          prefetch={true}
          className="group bg-gradient-to-br from-white via-slate-50 to-indigo-50/25 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 border border-slate-200/90 hover:border-slate-300 p-3.5 sm:p-4 flex items-center justify-between gap-3 active:scale-[0.98] cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight group-hover:text-black transition-colors">
                  Common Documents
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 border border-slate-200/70 text-slate-600 shadow-2xs">
                  {commonDocCount === 0 ? 'Empty' : `${commonDocCount} doc${commonDocCount > 1 ? 's' : ''}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Shared family documents
              </p>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 group-hover:text-slate-900 transition-colors flex-shrink-0">
            <span>View documents</span>
            <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </section>

      {/* Recently Added Section (Solves below white space beautifully) */}
      {recentDocs.length > 0 && (
        <section className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Recently Uploaded
            </h2>
            <span className="text-[11px] font-semibold text-indigo-600">
              Latest
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
            {recentDocs.map((doc: any) => {
              const isImage = doc.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.file_name)
              const memberName = doc.family_members?.display_name || 'Family'

              return (
                <Link
                  key={doc.id}
                  href={`/view/${doc.id}`}
                  prefetch={true}
                  className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Thumbnail */}
                    {isImage && doc.signed_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={doc.signed_url}
                        alt={doc.document_name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs flex-shrink-0 bg-slate-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-50 to-red-100 border border-red-200/70 flex flex-col items-center justify-center text-rose-600 shadow-2xs flex-shrink-0">
                        <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-[8px] font-black uppercase text-rose-700">PDF</span>
                      </div>
                    )}

                    {/* Title & Metadata */}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {doc.document_name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                          {memberName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* View Arrow */}
                  <div className="w-7 h-7 rounded-lg bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center transition-colors flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Reassuring Security & Privacy Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-indigo-500/10 rounded-2xl p-3 sm:p-3.5 border border-emerald-100/90 flex items-center gap-3 shadow-2xs">
        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <p className="text-xs text-slate-600 font-medium">
          Safe and private for our family only.
        </p>
      </div>
    </div>
  )
}
