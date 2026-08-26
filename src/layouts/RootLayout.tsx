import { Outlet, ScrollRestoration } from 'react-router'

import { ScrollbarOverlay } from '@/components/ScrollbarOverlay'

export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <ScrollbarOverlay />
      <Outlet />
    </>
  )
}
