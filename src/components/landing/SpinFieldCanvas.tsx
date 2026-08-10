import { useEffect, useRef } from 'react'

const SPACING = 42
const ARROW_LENGTH = 9
const MOUSE_INFLUENCE = 210

type Arrow = {
  x: number
  y: number
  angle: number
  speed: number
  up: boolean
}

export function SpinFieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const mouse = { x: -9999, y: -9999 }
    let arrows: Arrow[] = []
    let width = 0
    let height = 0
    let frame = 0

    const build = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      arrows = []
      for (let y = SPACING / 2; y < height; y += SPACING) {
        for (let x = SPACING / 2; x < width; x += SPACING) {
          arrows.push({
            x: x + (Math.random() * 10 - 5),
            y: y + (Math.random() * 10 - 5),
            angle: Math.random() * Math.PI * 2,
            speed:
              (Math.random() * 0.4 + 0.08) * (Math.random() > 0.5 ? 1 : -1),
            up: Math.random() > 0.5,
          })
        }
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      for (const a of arrows) {
        const dx = mouse.x - a.x
        const dy = mouse.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MOUSE_INFLUENCE) {
          const target = Math.atan2(dx, -dy)
          let diff = target - a.angle
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          const strength = (1 - dist / MOUSE_INFLUENCE) * 0.18
          a.angle += diff * strength
        } else if (!reduced) {
          a.angle += a.speed * 0.02
        }

        ctx.save()
        ctx.translate(a.x, a.y)
        ctx.rotate(a.angle)
        ctx.strokeStyle = a.up
          ? 'rgba(240, 201, 136, 0.4)'
          : 'rgba(126, 196, 221, 0.32)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, ARROW_LENGTH / 2)
        ctx.lineTo(0, -ARROW_LENGTH / 2)
        ctx.moveTo(0, -ARROW_LENGTH / 2)
        ctx.lineTo(
          -ARROW_LENGTH * 0.28,
          -ARROW_LENGTH / 2 + ARROW_LENGTH * 0.38,
        )
        ctx.moveTo(0, -ARROW_LENGTH / 2)
        ctx.lineTo(ARROW_LENGTH * 0.28, -ARROW_LENGTH / 2 + ARROW_LENGTH * 0.38)
        ctx.stroke()
        ctx.restore()
      }
      if (!reduced) frame = requestAnimationFrame(draw)
    }

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    const onResize = () => build()

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('resize', onResize)
    build()
    draw()

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  )
}
