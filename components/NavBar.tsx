'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Flame, Dumbbell, LayoutTemplate, TrendingUp, LogOut, BookOpen, Library } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface NavBarProps {
  user: User
}

const NAV_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/calories', label: 'Kalorien', icon: Flame },
  { href: '/dashboard/workout', label: 'Training', icon: Dumbbell },
  { href: '/dashboard/history', label: 'Logbuch', icon: BookOpen },
  { href: '/dashboard/templates', label: 'Vorlagen', icon: LayoutTemplate },
  { href: '/dashboard/progress', label: 'Progress', icon: TrendingUp },
  { href: '/dashboard/exercises', label: 'Übungen', icon: Library },
]

export default function NavBar({ user }: NavBarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-20 bg-black/60 backdrop-blur-2xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <span className="text-sm font-bold text-white tracking-tight mr-4">FitTrack</span>
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all border ${
                  active
                    ? 'bg-white/8 border-white/10 text-white'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600 hidden lg:block truncate max-w-[160px]">
            {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 px-2.5 py-1.5 rounded-md border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Abmelden</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
