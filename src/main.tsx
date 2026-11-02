import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './i18n'
import './index.css'
import { trackCampaignClick } from './lib/campaign'
import { router } from './routes'

trackCampaignClick()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
