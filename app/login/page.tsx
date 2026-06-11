import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-asphalt">
      {/* Hairline grid, warm */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(237,230,216,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(237,230,216,0.05) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />
      {/* Blaze edge */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-blaze sm:w-1.5" />

      <div className="animate-fade-in relative z-10 w-full max-w-sm px-6">
        <div className="mb-12">
          <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.35em] text-chalk/40">
            Performance Tracking
          </p>
          <h1 className="font-display text-[96px] uppercase leading-[0.82] text-chalk">
            Fit
            <br />
            Track
            <span className="text-blaze">.</span>
          </h1>
          <p className="mt-6 font-mono text-xs leading-relaxed text-chalk/40">
            Kalorien, Training & Progress —<br />
            alles an einem Ort.
          </p>
        </div>

        <div className="border border-chalk/15 bg-rubber p-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-chalk/20">
          Powered by Supabase
        </p>
      </div>
    </main>
  )
}
