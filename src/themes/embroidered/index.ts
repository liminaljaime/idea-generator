import './style.css'
import type { Theme } from '../types'
import { renderBasic } from '../bare/render'

// Embroidered arcade: a 90s fruit machine imagined by a textile artist.
// Starts from the basic markup; pieces are replaced as the design is built.
let cleanup = () => {}

const theme: Theme = {
  mount(root, machine) {
    document.documentElement.dataset.theme = 'embroidered'
    cleanup = renderBasic(root, machine)
  },
  unmount() {
    cleanup()
    delete document.documentElement.dataset.theme
  },
}

export default theme
