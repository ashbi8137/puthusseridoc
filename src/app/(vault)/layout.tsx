import { ReactNode } from 'react'

export default function VaultLayout({
  children,
}: {
  children: ReactNode
}) {
  // Authentication is already securely handled at the edge by middleware.
  // Removing redundant database roundtrips here makes page transitions instant.
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-stone-50/80 to-blue-50/20 text-slate-900 pb-16">
      <div className="max-w-md mx-auto w-full px-4 pt-4 sm:pt-8">
        {children}
      </div>
    </div>
  )
}
