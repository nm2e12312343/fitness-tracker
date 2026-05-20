'use client'

import { useEffect } from 'react'

// Unregisters any previously installed service workers
export default function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistrations().then(regs =>
      regs.forEach(r => r.unregister())
    )
  }, [])

  return null
}
