import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './LoginPage.module.css'

export default function SignUpPage(): React.JSX.Element {
    const { register } = useAuth()
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const [email, setEmail]       = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm]   = useState('')
    const [error, setError]       = useState<string | null>(null)
    const [loading, setLoading]   = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirm) {
            setError('As senhas não coincidem.')
            return
        }

        setLoading(true)
        const err = await register(username, password, email || undefined)
        setLoading(false)
        if (err) { setError(err); return }
        navigate('/home')
    }

    return (
        <main className={styles.mainContainer}>
            <div className={styles.loginCard}>

                {/* Ícone de Usuário */}
                <div className={styles.userIcon}>
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                </div>

                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    {error && <p style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{error}</p>}

                    <div className={styles.inputGroup}>
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Usuário"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            minLength={3}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <input
                            type="email"
                            className={styles.inputField}
                            placeholder="E-mail (opcional)"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <input
                            type="password"
                            className={styles.inputField}
                            placeholder="Senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <input
                            type="password"
                            className={styles.inputField}
                            placeholder="Confirmar senha"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className={styles.btnPrimary} disabled={loading}>
                        {loading ? 'Criando conta...' : 'Cadastrar-se'}
                    </button>
                </form>

                <span className={styles.registerText}>Já tem cadastro?</span>

                <button type="button" className={styles.btnPrimary} onClick={() => navigate('/login')}>
                    Fazer login
                </button>

            </div>
        </main>
    )
}
