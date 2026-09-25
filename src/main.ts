import './style.css'
import data from './data/reels.json'

type Reel = { name: string; items: string[] }
const reels: Reel[] = data.reels

function pick<T>(items: T[]): T {
  const [n] = crypto.getRandomValues(new Uint32Array(1))
  return items[n % items.length]
}

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <main class="machine">
    <div class="reels">
      ${reels.map((r) => `<div class="reel" aria-label="${r.name}"><span>?</span></div>`).join('')}
    </div>
    <button class="spin" type="button">Spin</button>
  </main>
`

const windows = [...app.querySelectorAll<HTMLSpanElement>('.reel span')]
const button = app.querySelector<HTMLButtonElement>('.spin')!

button.addEventListener('click', () => {
  button.disabled = true
  const results = reels.map((r) => pick(r.items))
  windows.forEach((el, i) => {
    const ticker = setInterval(() => (el.textContent = pick(reels[i].items)), 60)
    setTimeout(() => {
      clearInterval(ticker)
      el.textContent = results[i]
      if (i === windows.length - 1) button.disabled = false
    }, 800 + i * 500)
  })
})
