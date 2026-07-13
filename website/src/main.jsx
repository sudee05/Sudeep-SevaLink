import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Provider as ReduxProvider } from 'react-redux'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/contexts/theme-provider'
import { AuthListener } from '@/components/common/auth-listener'
import { store } from '@/store'
import { queryClient } from '@/services/queryClient'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ReduxProvider store={store}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthListener>
              <App />
            </AuthListener>
            <Toaster richColors position="top-right" />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ReduxProvider>
  </StrictMode>,
)
