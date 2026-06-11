import Link from 'next/link'

interface Props {
  activeTab: string
}

const tabs = [
  { id: 'templates', label: 'Vorlagen' },
  { id: 'library', label: 'Übungs-Datenbank' },
]

export default function TemplatesTabs({ activeTab }: Props) {
  return (
    <div className="flex gap-1 border-b border-chalk/10 pb-0">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={`?tab=${t.id}`}
          className={`relative px-4 pb-3 text-[11px] font-semibold font-mono uppercase tracking-[0.15em] transition-colors ${
            activeTab === t.id
              ? 'text-chalk'
              : 'text-chalk/35 hover:text-chalk/70'
          }`}
        >
          {t.label}
          {activeTab === t.id && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-blaze" />
          )}
        </Link>
      ))}
    </div>
  )
}
