import React, { useState } from 'react'
import Sidebar from '../components/Sidebar/Sidebar'
import { useAuth } from '../context/AuthContext'

const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-vtt-dark border border-vtt-dark-gray text-vtt-light ' +
  'placeholder-neutral-500 focus:outline-none focus:border-vtt-golden transition-colors'
const labelClass = 'block text-sm text-neutral-400 mb-1.5'
const cardClass = 'bg-vtt-dark/70 border border-vtt-dark-gray rounded-2xl p-6 flex flex-col gap-4'
const btnClass =
  'self-start px-6 py-2.5 rounded-xl bg-vtt-golden text-black font-semibold ' +
  'hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer'

type Feedback = { type: 'success' | 'error'; text: string } | null

function FeedbackMsg({ feedback }: { feedback: Feedback }): React.JSX.Element | null {
  if (!feedback) return null
  return (
    <p className={`text-sm ${feedback.type === 'success' ? 'text-green-400' : 'text-[#ff6b6b]'}`}>
      {feedback.text}
    </p>
  )
}

export default function ProfilePage(): React.JSX.Element {
  const { user, updateProfile } = useAuth()

  /* Dados da conta */
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [infoPassword, setInfoPassword] = useState('')
  const [infoFeedback, setInfoFeedback] = useState<Feedback>(null)
  const [infoLoading, setInfoLoading] = useState(false)

  /* Senha */
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwFeedback, setPwFeedback] = useState<Feedback>(null)
  const [pwLoading, setPwLoading] = useState(false)

  const handleInfoSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setInfoFeedback(null)
    setInfoLoading(true)
    const err = await updateProfile({
      currentPassword: infoPassword,
      username: username.trim(),
      email: email.trim() || null
    })
    setInfoLoading(false)
    if (err) {
      setInfoFeedback({ type: 'error', text: err })
      return
    }
    setInfoPassword('')
    setInfoFeedback({ type: 'success', text: 'Dados atualizados com sucesso.' })
  }

  const handlePasswordSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setPwFeedback(null)
    if (newPassword !== confirmPassword) {
      setPwFeedback({ type: 'error', text: 'As senhas não coincidem.' })
      return
    }
    setPwLoading(true)
    const err = await updateProfile({ currentPassword, newPassword })
    setPwLoading(false)
    if (err) {
      setPwFeedback({ type: 'error', text: err })
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPwFeedback({ type: 'success', text: 'Senha alterada com sucesso.' })
  }

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-10">
        <h1 className="text-3xl font-bold text-vtt-golden mb-8">Perfil</h1>

        <div className="flex flex-col gap-8 max-w-xl">
          <form onSubmit={handleInfoSubmit} className={cardClass}>
            <h2 className="text-xl font-semibold text-vtt-light">Dados da conta</h2>
            <div>
              <label className={labelClass} htmlFor="profile-username">Nome de usuário</label>
              <input
                id="profile-username"
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="profile-email">E-mail</label>
              <input
                id="profile-email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="profile-info-password">
                Senha atual (para confirmar)
              </label>
              <input
                id="profile-info-password"
                type="password"
                className={inputClass}
                value={infoPassword}
                onChange={(e) => setInfoPassword(e.target.value)}
                required
              />
            </div>
            <FeedbackMsg feedback={infoFeedback} />
            <button type="submit" className={btnClass} disabled={infoLoading}>
              {infoLoading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>

          <form onSubmit={handlePasswordSubmit} className={cardClass}>
            <h2 className="text-xl font-semibold text-vtt-light">Alterar senha</h2>
            <div>
              <label className={labelClass} htmlFor="profile-current-password">Senha atual</label>
              <input
                id="profile-current-password"
                type="password"
                className={inputClass}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="profile-new-password">Nova senha</label>
              <input
                id="profile-new-password"
                type="password"
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="profile-confirm-password">
                Confirmar nova senha
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <FeedbackMsg feedback={pwFeedback} />
            <button type="submit" className={btnClass} disabled={pwLoading}>
              {pwLoading ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
