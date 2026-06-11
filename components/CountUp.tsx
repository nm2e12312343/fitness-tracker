'use client'

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  decimals?: number
  duration?: number
  className?: string
}

// Counts from 0 to value once scrolled into view; jumps straight to value with reduced motion.
export default function CountUp({ value, decimals = 0, duration = 1400, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [started, setStarted] = useState(false)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          io.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [value])

  useEffect(() => {
    if (!started) return
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 4)
      setDisplay(value * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, value, duration])

  return (
    <span ref={ref} className={className}>
      {display.toFixed(decimals)}
    </span>
  )
}
