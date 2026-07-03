import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { TemplatesProvider } from './context/TemplatesContext'
import { InstancesProvider } from './context/InstancesContext'
import { TemplatesListPage } from './pages/TemplatesListPage'
import { BuilderPage } from './pages/BuilderPage'
import { FillPage } from './pages/FillPage'

function App() {
  return (
    <TemplatesProvider>
      <InstancesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TemplatesListPage />} />
            <Route path="/builder/new" element={<BuilderPage />} />
            <Route path="/builder/:templateId" element={<BuilderPage />} />
            <Route path="/fill/:templateId" element={<FillPage />} />
          </Routes>
        </BrowserRouter>
      </InstancesProvider>
    </TemplatesProvider>
  )
}

export default App
