import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { trackCampaignClick } from './campaign'

const TOKEN = 'a'.repeat(32)

describe('trackCampaignClick', () => {
  const images: { src: string; onerror: (() => void) | null }[] = []

  beforeEach(() => {
    images.length = 0
    vi.stubGlobal(
      'Image',
      class {
        src = ''
        onerror: (() => void) | null = null
        constructor() {
          images.push(this)
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('records the click and removes the token from the URL', () => {
    window.history.replaceState(null, '', `/register?x=1&c=${TOKEN}`)
    trackCampaignClick()

    expect(images[0].src).toContain(`e=click&t=${TOKEN}`)
    expect(window.location.pathname + window.location.search).toBe(
      '/register?x=1',
    )
  })

  it('retries once when the request fails', () => {
    window.history.replaceState(null, '', `/register?c=${TOKEN}`)
    trackCampaignClick()

    images[0].onerror?.()
    expect(images[0].src).toContain('retry=1')
    expect(images[0].onerror).toBeNull()
  })

  it('never throws, so the site still loads', () => {
    window.history.replaceState(null, '', `/register?c=${TOKEN}`)
    vi.stubGlobal('Image', function () {
      throw new Error('boom')
    })

    expect(() => trackCampaignClick()).not.toThrow()
  })

  it('does nothing without a token', () => {
    window.history.replaceState(null, '', '/register')
    trackCampaignClick()

    expect(images).toHaveLength(0)
  })

  it('drops a malformed token without recording it', () => {
    window.history.replaceState(null, '', '/register?c=nope')
    trackCampaignClick()

    expect(images).toHaveLength(0)
    expect(window.location.search).toBe('')
  })
})
