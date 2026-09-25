import { Machine } from './engine/machine'
import { reels } from './data/reels'
import { attachShell } from './shell/controls'
import { themes, defaultTheme } from './themes/types'
import './shell/base.css'

const machine = new Machine(reels)
attachShell(machine)

const requested = new URLSearchParams(location.search).get('theme') ?? defaultTheme
const load = themes[requested] ?? themes[defaultTheme]
load().then(({ default: theme }) => theme.mount(document.querySelector('#app')!, machine))
