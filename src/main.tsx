import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from "react-router";
import { ThemeProvider } from './components/theme-provider.tsx';
import { Main, Settings} from './pages';
import { Toaster } from './components/ui/sonner.tsx';
import './index.css'
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App>
      <ThemeProvider storageKey="vite-ui-theme">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Main />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ThemeProvider>
    </App>
  </StrictMode>,
)
