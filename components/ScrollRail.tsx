'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// Signature element: a fixed rail on the left edge that fills with blaze as you
// scroll. Sections marked with data-rail="Label" get a plate dot; the active one
// lights up. On smaller screens it collapses to a 2px progress bar under the nav.
export default function ScrollRail() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [sections, setSections] = useState<string[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-rail]'))

    let raf = 0
    const measure = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
      const probe = window.scrollY + window.innerHeight * 0.4
      let idx = 0
      els.forEach((el, i) => {
        if (el.offsetTop <= probe) idx = i
      })
      setActive(idx)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    raf = requestAnimationFrame(() => {
      setSections(els.map((el) => el.dataset.rail ?? ''))
      measure()
    })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [pathname])

  return (
    <>
      {/* Desktop rail */}
      <div
        aria-hidden
        className="fixed bottom-10 left-7 top-28 z-10 hidden w-6 xl:flex flex-col items-center"
      >
        <div className="relative h-full w-px bg-chalk/15">
          <div
            className="absolute left-0 top-0 w-px bg-blaze"
            style={{ height: `${progress * 100}%` }}
          />
        </div>
        {sections.length > 1 && (
          <div className="absolute inset-0 flex flex-col items-center justify-between py-1">
            {sections.map((label, i) => (
              <div key={`${label}-${i}`} className="group relative flex items-center">
                <span
                  className={`block rounded-full border transition-all duration-500 ${
                    i === active
                      ? 'h-3 w-3 border-blaze bg-blaze'
                      : 'h-2 w-2 border-chalk/30 bg-asphalt'
                  }`}
                />
                <span
                  className={`absolute left-5 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.25em] transition-colors duration-500 ${
                    i === active ? 'text-blaze' : 'text-chalk/25'
                  }`}
                  style={{ writingMode: 'vertical-rl' }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile / tablet: thin progress bar under the navbar */}
      <div
        aria-hidden
        className="fixed left-0 right-0 top-16 z-20 h-[2px] origin-left bg-blaze xl:hidden"
        style={{ transform: `scaleX(${progress})` }}
      />
    </>
  )
}
