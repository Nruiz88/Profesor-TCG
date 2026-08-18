'use client'

import { useEffect, useRef } from 'react'

const KOFI_SCRIPT = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js'

export default function KofiButton() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Avoid loading the script multiple times
    if (document.querySelector(`script[src="${KOFI_SCRIPT}"]`)) {
      // Script already loaded — just re-draw in case the widget container is new
      initWidget()
      return
    }

    const script = document.createElement('script')
    script.src = KOFI_SCRIPT
    script.async = true
    script.onload = () => initWidget()
    document.body.appendChild(script)

    function initWidget() {
      const kofi = (window as any).kofiwidget2
      if (kofi && containerRef.current) {
        // Clear previous widget if any
        containerRef.current.innerHTML = ''
        kofi.init('Invitame un café ☕', '#72a4f2', 'O6W625B65J')
        kofi.draw(containerRef.current)
      }
    }
  }, [])

  return <div ref={containerRef} className="inline-block" />
}
