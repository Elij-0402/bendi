import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ProjectList } from './features/project/ProjectList'
import { ProjectWorkspace } from './features/project/ProjectWorkspace'
import { SettingsPage } from './features/settings/SettingsPage'

function App(): React.ReactElement {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/project/:projectId" element={<AppLayout />}>
          <Route index element={<ProjectWorkspace />} />
        </Route>
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </HashRouter>
  )
}

export default App
