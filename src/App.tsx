import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './fields'
import { TemplatesProvider } from './context/TemplatesContext'
import { ResponsesProvider } from './context/ResponsesContext'
import { TemplatesListPage } from './pages/TemplatesListPage'
import { BuilderPage } from './pages/BuilderPage'
import { FillPage } from './pages/FillPage'
import { ResponsesPage } from './pages/ResponsesPage'

function App() {
  return (
    <TemplatesProvider>
      <ResponsesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TemplatesListPage />} />
            <Route path="/builder/new" element={<BuilderPage />} />
            <Route path="/builder/:templateId" element={<BuilderPage />} />
            <Route path="/fill/:templateId" element={<FillPage />} />
            <Route path="/template/:templateId/responses" element={<ResponsesPage />} />
          </Routes>
        </BrowserRouter>
      </ResponsesProvider>
    </TemplatesProvider>
  )
}

export default App
