import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function HomePage(): React.JSX.Element {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = (): void => {
    logout()
    navigate('/login')
  }

  return (
    <main>
      <h1>Home</h1>
      <p>Página inicial (construindo)</p>
      <button onClick={handleLogout}>Logout</button>
    </main>
  )
}
