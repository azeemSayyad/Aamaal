import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { NamazPage } from './pages/NamazPage'
import { QuranHomePage } from './pages/QuranHomePage'
import { QuranReaderPage } from './pages/QuranPage'

// Only used for loading the bundled Mushaf file
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: 1 } } })

const router = createBrowserRouter([
  { path: '/namaz', element: <NamazPage /> },
  { path: '/quran', element: <QuranHomePage /> },
  { path: '/quran/read', element: <QuranReaderPage /> },
  { path: '*', element: <Navigate to="/namaz" replace /> },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton duration={2500} />
    </QueryClientProvider>
  )
}
