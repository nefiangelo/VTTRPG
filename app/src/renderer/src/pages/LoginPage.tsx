import React, { useState } from 'react';
import styles from "./LoginPage.module.css";

function LoginPage(): React.JSX.Element {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.SubmitEvent) => {
        e.preventDefault();
        console.log('Tentando logar com:', username, password);
        // Lógica de login do Electron aqui
    };

    const handleRegister = () => {
        console.log('Redirecionar para registro');
    };

    return (
        <main className={styles.mainContainer}>
            <div className={styles.loginCard}>

                {/* Ícone de Usuário */}
                <div className={styles.userIcon}>
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                </div>

                <form onSubmit={handleLogin} style={{ width: '100%' }}>
                    <div className={styles.inputGroup}>
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Usuário"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
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
                        />
                    </div>

                    <button type="submit" className={styles.btnPrimary}>
                        Acessar
                    </button>
                </form>

                <span className={styles.registerText}>Não tem cadastro ainda?</span>

                <button type="button" className={styles.btnPrimary} onClick={handleRegister}>
                    Cadastrar-se
                </button>

            </div>
        </main>
    );
}

export default LoginPage;
