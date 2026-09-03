import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

export default async function VaultLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const userEmail = user.email?.trim().toLowerCase()
  const { data: familyMember } = await supabase
    .from('family_members')
    .select('id')
    .ilike('email', userEmail || '')
    .maybeSingle()

  if (!familyMember) {
    await supabase.auth.signOut()
    redirect('/?error=unauthorized')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-stone-50/80 to-blue-50/20 text-slate-900 pb-16">
      <div className="max-w-md mx-auto w-full px-4 pt-4 sm:pt-8">
        {children}
      </div>
    </div>
  )
}
