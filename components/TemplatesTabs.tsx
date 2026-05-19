import Link from 'next/link'

interface Props {
  activeTab: string
}

const tabs = [
  { id: 'templates', label: 'Vorlagen' },
  { id: 'library', label: 'Ubungs-Datenbank' },
]

export default function TemplatesTabs({ activeTab }: Props) {
  return (
    <div className="flex gap-1 p-1 bg-zinc-900/60 border border-white/5 rounded-lg w-fit">
      {tabs.map(t => (
        <Link
          key={t.id}
          href={`?tab=${t.id}`}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === t.id
              ? 'bg-white/10 text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
