import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { HomePage, AboutPage } from '@/pages'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout appName="Sketcher" />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },
    ],
  },
])
