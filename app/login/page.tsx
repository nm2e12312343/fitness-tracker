import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <main className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm px-6 animate-fade-in">
        {/* Editorial headline */}
        <div className="mb-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/35 mb-5">
            Performance Tracking
          </p>
          <h1 className="text-[72px] font-bold leading-none tracking-tighter text-white">
            Fit<br />Track
          </h1>
          <p className="mt-5 text-sm text-white/35 leading-relaxed">
            Kalorien, Training & Progress —<br />alles an einem Ort.
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white/20">
          Powered by Supabase
        </p>
      </div>
    </main>
  )
}
