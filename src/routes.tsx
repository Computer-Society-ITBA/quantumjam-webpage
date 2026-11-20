import { createBrowserRouter } from 'react-router'

import { RootLayout } from './layouts/RootLayout'
import AdminPage from './pages/AdminPage'
import JamMarketPage from './pages/JamMarketPage'
import JamRulesPage from './pages/JamRulesPage'
import LandingPage from './pages/LandingPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterSelectPage from './pages/RegisterSelectPage'
import RegisterWorkshopsPage from './pages/RegisterWorkshopsPage'
import RegisterCompetitionPage from './pages/RegisterCompetitionPage'
import SponsorInquiryPage from './pages/SponsorInquiryPage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/register', element: <RegisterSelectPage /> },
      { path: '/register/workshops', element: <RegisterWorkshopsPage /> },
      { path: '/register/competition', element: <RegisterCompetitionPage /> },
      { path: '/sponsor', element: <SponsorInquiryPage /> },
      { path: '/jam', element: <JamMarketPage /> },
      { path: '/jam/reglas', element: <JamRulesPage /> },
      { path: '/admin', element: <AdminPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
