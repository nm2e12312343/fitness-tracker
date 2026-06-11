'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Flame, Dumbbell, LayoutTemplate, TrendingUp, LogOut, BookOpen, CheckSquare } from 'lucide-react'
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
  { href: '/dashboard/habits', label: 'Habits', icon: CheckSquare },
  { href: '/dashboard/templates', label: 'Bibliothek', icon: LayoutTemplate },
  { href: '/dashboard/progress', label: 'Progress', icon: TrendingUp },
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
    <nav className="fixed left-0 right-0 top-0 z-20 border-b border-chalk/15 bg-asphalt/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <Link href="/dashboard" className="mr-6 font-display text-xl leading-none tracking-wide text-chalk">
            FITTRACK<span className="text-blaze">.</span>
          </Link>
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`group relative flex items-center gap-1.5 px-2.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                  active ? 'text-blaze' : 'text-chalk/45 hover:text-chalk'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden md:inline">{label}</span>
                <span
                  className={`absolute -bottom-px left-2.5 right-2.5 h-[2px] transition-opacity ${
                    active ? 'bg-blaze opacity-100' : 'bg-chalk opacity-0 group-hover:opacity-30'
                  }`}
                />
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden max-w-[160px] truncate font-mono text-[10px] uppercase tracking-[0.15em] text-chalk/30 lg:block">
            {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-chalk/45 transition-colors hover:text-blaze"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Abmelden</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
