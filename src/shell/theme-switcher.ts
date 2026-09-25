import { themes } from '../themes/types'

/** A small shared control for moving between themes. Each theme styles it via .theme-switcher. */
export function attachThemeSwitcher(current: string) {
  const nav = document.createElement('nav')
  nav.className = 'theme-switcher'
  nav.setAttribute('aria-label', 'Choose a theme')
  nav.innerHTML = Object.entries(themes)
    .filter(([, t]) => !t.hidden)
    .map(([key, t]) => {
      const url = new URL(location.href)
      url.searchParams.set('theme', key)
      return key === current
        ? `<a aria-current="page" href="${url.search}">${t.label}</a>`
        : `<a href="${url.search}">${t.label}</a>`
    })
    .join('')
  document.body.prepend(nav)
}
