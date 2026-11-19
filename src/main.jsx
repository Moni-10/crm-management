import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/pages.css'
import './styles/dashboard.css'
import './styles/company.css'
import './styles/company-footer.css'
import './styles/company-profile.css'
import './styles/company-team-overrides.css'
import App from './app/App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
