import { createBrowserRouter } from 'react-router'

import { RootLayout } from './layouts/RootLayout'
import LandingPage from './pages/LandingPage'
import RegisterSelectPage from './pages/RegisterSelectPage'
import RegisterWorkshopsPage from './pages/RegisterWorkshopsPage'
import RegisterCompetitionPage from './pages/RegisterCompetitionPage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/register', element: <RegisterSelectPage /> },
      { path: '/register/workshops', element: <RegisterWorkshopsPage /> },
      { path: '/register/competition', element: <RegisterCompetitionPage /> },
    ],
  },
])
