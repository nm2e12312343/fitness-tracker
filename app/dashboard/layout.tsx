import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ParticlesBackground from '@/components/ParticlesBackground'
import NavBar from '@/components/NavBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="relative min-h-screen">
      <ParticlesBackground />
      <NavBar user={user} />
      <div className="relative z-20 bg-red-600 text-white text-center text-xs py-1 font-bold tracking-widest" style={{marginTop: '56px'}}>
        ✓ NEUE VERSION GELADEN — v{Date.now().toString().slice(-4)}
      </div>
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8 pt-4">
        {children}
      </main>
    </div>
  )
}
