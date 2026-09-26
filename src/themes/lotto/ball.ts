// Shared ball rendering, used by both the drum's own canvas (the swirling pile) and the
// overlay canvas (pedestal balls and the one ball currently in flight), so every ball in
// the machine looks identical regardless of which canvas is drawing it.

export function ballGradient(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r)
  g.addColorStop(0, '#fff')
  g.addColorStop(0.55, colour)
  g.addColorStop(1, shade(colour, -0.35))
  return g
}

// Darkens (negative amount) or lightens a hex colour by roughly `amount` (-1..1).
export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, v))
  const r = c(((n >> 16) & 255) + 255 * amount)
  const g = c(((n >> 8) & 255) + 255 * amount)
  const b = c((n & 255) + 255 * amount)
  return `rgb(${r | 0} ${g | 0} ${b | 0})`
}

/** Greedy word-wrap for canvas text, sized to fit within `maxWidth`. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

export type BallLook = {
  x: number
  y: number
  r: number
  colour: string
  /** A plain cosmetic number, shown only while tumbling in the pile. */
  number?: number
  /** The drawn result, shown once the ball is big enough to carry it. */
  text?: string
  textOpacity?: number
  /** Squash the ball vertically for a landing bounce (1 = no squash). */
  squash?: number
}

export function drawBall(ctx: CanvasRenderingContext2D, ball: BallLook) {
  const { x, y, r, colour, squash = 1 } = ball
  ctx.save()
  if (squash !== 1) {
    ctx.translate(x, y)
    ctx.scale(1, squash)
    ctx.translate(-x, -y)
  }
  ctx.beginPath()
  ctx.fillStyle = ballGradient(ctx, x, y, r, colour)
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (ball.text && (ball.textOpacity ?? 1) > 0.02) {
    ctx.save()
    ctx.globalAlpha = ball.textOpacity ?? 1
    ctx.fillStyle = 'rgb(30 15 45 / 0.92)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // Shrink to fit: start at a comfortable size and step down until the longest item
    // wraps to 3 lines or fewer, so it stays readable whatever the ball's actual size.
    const text = ball.text.toUpperCase()
    const maxWidth = r * 1.7
    let fontPx = Math.max(9, r * 0.26)
    ctx.font = `800 ${fontPx}px 'Baloo 2', sans-serif`
    let lines = wrapText(ctx, text, maxWidth)
    while (lines.length > 3 && fontPx > 9) {
      fontPx -= 1
      ctx.font = `800 ${fontPx}px 'Baloo 2', sans-serif`
      lines = wrapText(ctx, text, maxWidth)
    }
    const lineHeight = fontPx * 1.16
    const startY = y - ((lines.length - 1) * lineHeight) / 2
    lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lineHeight))
    ctx.restore()
  } else if (ball.number !== undefined) {
    ctx.fillStyle = 'rgb(0 0 0 / 0.45)'
    ctx.font = `700 ${Math.round(r * 0.7)}px 'Baloo 2', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(ball.number), x, y + 1)
  }
}
