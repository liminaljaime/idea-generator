import { Machine } from './engine/machine'
import { reels, voiceBrief } from './data/reels'
import { attachShell } from './shell/controls'
import { attachThemeSwitcher } from './shell/theme-switcher'
import { themes, defaultTheme } from './themes/types'
import './shell/base.css'

const params = new URLSearchParams(location.search)
const root = document.querySelector<HTMLElement>('#app')!

if (params.get('view') === 'badges') {
  import('./themes/embroidered/gallery').then(({ mountGallery }) => mountGallery(root))
} else {
  const name = themes[params.get('theme') ?? ''] ? params.get('theme')! : defaultTheme
  themes[name].load().then(({ default: theme }) => {
    const machine = new Machine(reels, voiceBrief(theme.voice))
    attachShell(machine)
    theme.mount(root, machine)
    attachThemeSwitcher(name)
  })
}
