import './style.css'
import type { Theme } from '../types'
import { renderBasic } from './render'

// Unstyled reference theme: proves the contract and doubles as a debugging view.
let cleanup = () => {}

const theme: Theme = {
  mount(root, machine) {
    cleanup = renderBasic(root, machine)
  },
  unmount() {
    cleanup()
  },
}

export default theme
