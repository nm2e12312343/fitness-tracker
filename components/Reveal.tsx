'use client'

import { useEffect, useRef } from 'react'

interface RevealProps {
  children: React.ReactNode
  /** 'up' = rise+fade, 'wipe' = top-down clip reveal (headlines), 'stagger' = children rise sequentially */
  variant?: 'up' | 'wipe' | 'stagger'
  /** extra transition delay in ms */
  delay?: number
  className?: string
}

// Adds .in-view once the element scrolls into the viewport; CSS in globals.css does the rest.
export default function Reveal({ children, variant = 'up', delay = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in-view')
          io.disconnect()
        }
      },
      // low threshold: tall elements (long lists) can never reach high ratios
      { threshold: 0.05, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-reveal={variant}
      className={className}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
