import { Machine } from './engine/machine'
import { reels, artDirectorBrief } from './data/reels'
import { attachShell } from './shell/controls'
import { themes, defaultTheme } from './themes/types'
import './shell/base.css'

const params = new URLSearchParams(location.search)
const root = document.querySelector<HTMLElement>('#app')!

if (params.get('view') === 'badges') {
  import('./themes/embroidered/gallery').then(({ mountGallery }) => mountGallery(root))
} else {
  const machine = new Machine(reels, artDirectorBrief)
  attachShell(machine)
  const load = themes[params.get('theme') ?? defaultTheme] ?? themes[defaultTheme]
  load().then(({ default: theme }) => theme.mount(root, machine))
}
