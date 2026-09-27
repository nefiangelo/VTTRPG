import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import HomePage from './pages/HomePage'
import NewCampaignPage from './pages/NewCampaignPage'
import JoinCampaignPage from './pages/JoinCampaignPage'
import GameSessionPage from './pages/GameSessionPage'

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* App */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/new-campaign" element={<NewCampaignPage />} />
        <Route path="/join-campaign" element={<JoinCampaignPage />} />
        <Route path="/session" element={<GameSessionPage />} />

        {/* Default */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  )
}
