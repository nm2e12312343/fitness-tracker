import ParticlesBackground from '@/components/ParticlesBackground'
import LoginForm from './LoginForm'
import { Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ParticlesBackground />

      <div className="relative z-10 w-full max-w-sm px-6 animate-fade-in">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2.5 bg-zinc-800 rounded-xl border border-zinc-700">
              <Activity className="w-5 h-5 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">FitTrack</h1>
          <p className="mt-2 text-zinc-500 text-sm">Fitness & Kalorien verfolgen</p>
        </div>

        <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
