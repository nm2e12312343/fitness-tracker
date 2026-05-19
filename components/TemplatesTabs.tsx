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
    <div className="flex gap-2">
      {tabs.map(t => (
        <Link
          key={t.id}
          href={`?tab=${t.id}`}
          className={`px-5 py-2 rounded-xl text-sm font-semibold border transition-all ${
            activeTab === t.id
              ? 'bg-[#00f2fe]/15 border-[#00f2fe]/40 text-[#00f2fe]'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
