import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CampaignProvider } from './context/CampaignContext'

import LoginPage        from './pages/LoginPage'
import SignUpPage       from './pages/SignUpPage'
import HomePage         from './pages/HomePage'
import NewCampaignPage  from './pages/NewCampaignPage'
import JoinCampaignPage from './pages/JoinCampaignPage'
import GameSessionPage  from './pages/GameSessionPage'

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
      <Route path="/join-campaign" element={<PrivateRoute><JoinCampaignPage /></PrivateRoute>} />
      <Route path="/session"       element={<PrivateRoute><GameSessionPage /></PrivateRoute>} />

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
