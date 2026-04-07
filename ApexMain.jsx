import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ApexApp from './ApexApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ApexApp />
  </StrictMode>
)
