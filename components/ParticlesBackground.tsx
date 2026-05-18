'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
}

export default function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isMobile = window.innerWidth < 768
    const COUNT = isMobile ? 30 : 130
    const LINK_DIST = isMobile ? 100 : 130
    const GRAB_DIST = 180
    const SPEED = isMobile ? 0.25 : 0.4
    const COLOR = '#555555'

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    const mouse = { x: -9999, y: -9999 }
    let animId: number

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
    }))

    const onResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }

    const onMouseLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2)
        ctx.fillStyle = COLOR
        ctx.fill()
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < LINK_DIST) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(85,85,85,${0.5 * (1 - dist / LINK_DIST)})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      if (!isMobile) {
        for (const p of particles) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < GRAB_DIST) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.strokeStyle = `rgba(0,242,254,${0.3 * (1 - dist / GRAB_DIST)})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', onResize)
    if (!isMobile) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseleave', onMouseLeave)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  )
}
