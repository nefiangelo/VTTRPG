import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CampaignProvider } from './context/CampaignContext'

import LoginPage        from './pages/LoginPage'
import SignUpPage       from './pages/SignUpPage'
import HomePage         from './pages/HomePage'
import NewCampaignPage  from './pages/NewCampaignPage'
import JoinCampaignPage from './pages/JoinCampaignPage'
import GameSessionPage  from './pages/GameSessionPage'
import CampaignSessionsPage from './pages/CampaignSessionsPage'
import SystemsPage      from './pages/SystemsPage'
import SystemEditorPage  from './pages/SystemEditorPage'
import SystemContentPage from './pages/SystemContentPage'
import SheetsPage       from './pages/SheetsPage'
import ProfilePage      from './pages/ProfilePage'

// Redirect logged-in users away from auth pages
function PublicRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { user, isLoading } = useAuth()
  if (isLoading) return <></>
  if (user) return <Navigate to="/home" replace />
  return <>{children}</>
}

// Redirect unauthenticated users to login
function PrivateRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { user, isLoading } = useAuth()
  if (isLoading) return <></>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />

      {/* App */}
      <Route path="/home"          element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/new-campaign"  element={<PrivateRoute><NewCampaignPage /></PrivateRoute>} />
      <Route path="/campaigns/:id/sessions" element={<PrivateRoute><CampaignSessionsPage /></PrivateRoute>} />
      <Route path="/join-campaign" element={<PrivateRoute><JoinCampaignPage /></PrivateRoute>} />
      <Route path="/session"       element={<PrivateRoute><GameSessionPage /></PrivateRoute>} />
      <Route path="/sessions/:id"  element={<PrivateRoute><GameSessionPage /></PrivateRoute>} />
      <Route path="/systems"       element={<PrivateRoute><SystemsPage /></PrivateRoute>} />
      <Route path="/systems/new"   element={<PrivateRoute><SystemEditorPage /></PrivateRoute>} />
      <Route path="/systems/:id/edit" element={<PrivateRoute><SystemEditorPage /></PrivateRoute>} />
      <Route path="/systems/:id/content" element={<PrivateRoute><SystemContentPage /></PrivateRoute>} />
      <Route path="/sheets"        element={<PrivateRoute><SheetsPage /></PrivateRoute>} />
      <Route path="/profile"       element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

      {/* Default */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <AuthProvider>
        <CampaignProvider>
          <AppRoutes />
        </CampaignProvider>
      </AuthProvider>
    </HashRouter>
  )
}
