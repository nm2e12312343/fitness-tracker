import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'
import ScrollRail from '@/components/ScrollRail'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="relative min-h-screen bg-asphalt">
      <NavBar user={user} />
      <ScrollRail />
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20" style={{ paddingTop: '88px' }}>
        {children}
      </main>
    </div>
  )
}
