const TOKEN_RE = /^[a-f0-9]{32}$/

/**
 * Records a click on a campaign email link, identified by the `c` query param.
 * It loads as an image so it needs no CORS, and a failure never reaches the
 * visitor. The param is dropped from the URL so a shared link doesn't count
 * as the original recipient's click.
 */
export function trackCampaignClick(): void {
  // Runs before the app renders: nothing here may stop the site from loading.
  try {
    const url = new URL(window.location.href)
    const token = url.searchParams.get('c')
    if (!token) return

    url.searchParams.delete('c')
    window.history.replaceState(window.history.state, '', url)
    if (!TOKEN_RE.test(token)) return

    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
    const endpoint = `https://us-central1-${projectId}.cloudfunctions.net/campaignEvent?e=click&t=${token}`

    // One retry: Cloud Functions in this project intermittently 500 before
    // reaching the container.
    const image = new Image()
    image.onerror = () => {
      image.onerror = null
      image.src = `${endpoint}&retry=1`
    }
    image.src = endpoint
  } catch {
    return
  }
}
