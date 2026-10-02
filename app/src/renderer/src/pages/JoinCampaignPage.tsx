import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useCampaigns } from '../context/CampaignContext'
import type { SessionBundleResult } from '../../../preload/index.d'

export default function JoinCampaignPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { fetchMyCampaigns, fetchSystems } = useCampaigns()

  const [inputCode, setInputCode] = useState('')
  const [serverUrl, setServerUrl] = useState('http://localhost:3001')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Status de conexão e download
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [stepStatus, setStepStatus] = useState<string>('')
  const [downloadedBundle, setDownloadedBundle] = useState<SessionBundleResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Processa texto colado ou digitado no formato IP:PORTA#CODIGO ou URL
  const processInputString = (text: string) => {
    const raw = text.trim()
    setErrorMessage(null)

    // Formato 1: IP:PORTA#CODIGO ou http://IP:PORTA#CODIGO
    if (raw.includes('#')) {
      const [hostPart, codePart] = raw.split('#')
      if (hostPart) {
        const fullHost = hostPart.startsWith('http') ? hostPart : `http://${hostPart}`
        setServerUrl(fullHost.replace(/\/$/, ''))
      }
      if (codePart) {
        setInputCode(codePart.trim().toUpperCase().slice(0, 10))
        return
      }
    }

    // Formato 2: URL com query param ?code=
    if (raw.includes('?code=')) {
      const [hostPart, queryPart] = raw.split('?code=')
      if (hostPart) {
        const fullHost = hostPart.startsWith('http') ? hostPart : `http://${hostPart}`
        setServerUrl(fullHost.replace(/\/$/, ''))
      }
      if (queryPart) {
        setInputCode(queryPart.trim().toUpperCase().slice(0, 10))
        return
      }
    }

    // Formato 3: IP:PORTA/CODIGO (sem protocolo)
    if (raw.includes('/') && !raw.startsWith('http')) {
      const [hostPart, codePart] = raw.split('/')
      if (hostPart && codePart) {
        setServerUrl(`http://${hostPart}`)
        setInputCode(codePart.trim().toUpperCase().slice(0, 10))
        return
      }
    }

    // Se colou apenas uma URL ou endereço IP com porta (sem código)
    if (raw.startsWith('http://') || raw.startsWith('https://') || (/^[\d.]+(:\d+)?$/.test(raw) && raw.includes(':'))) {
      const fullHost = raw.startsWith('http') ? raw : `http://${raw}`
      setServerUrl(fullHost.replace(/\/$/, ''))
      setShowAdvanced(true)
      return
    }

    // Caso padrão: Apenas o código de acesso (limita a 10 caracteres)
    setInputCode(raw.toUpperCase().slice(0, 10))
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processInputString(e.target.value)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (pasted.includes('#') || pasted.includes('?code=') || pasted.includes(':')) {
      e.preventDefault()
      processInputString(pasted)
    }
  }

  // Executa o fluxo: 1. Baixar conteúdo via HTTP -> 2. Verificar dados -> 3. Ir para a sessão
  const handleStartDownloadAndJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const cleanCode = inputCode.trim().toUpperCase()
    if (!cleanCode) {
      setErrorMessage('Por favor, informe o código de acesso da sessão.')
      return
    }

    let cleanServer = serverUrl.trim()
    if (!cleanServer.startsWith('http://') && !cleanServer.startsWith('https://')) {
      cleanServer = `http://${cleanServer}`
    }

    setIsProcessing(true)
    setCurrentStep(1)
    setStepStatus('Conectando ao servidor do Mestre...')

    try {
      // ETAPA 1: Conexão HTTP com o Servidor do Mestre
      await new Promise(r => setTimeout(r, 300))
      setCurrentStep(1)
      setStepStatus('Conectando ao servidor do Mestre...')

      const playerUsername = user?.username ? encodeURIComponent(user.username) : ''
      const urlWithUser = `${cleanServer}/api/session/bundle?code=${encodeURIComponent(cleanCode)}${playerUsername ? `&username=${playerUsername}` : ''}`

      const response = await fetch(urlWithUser, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(user?.username ? { 'x-player-username': user.username } : {})
        }
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => null)
        throw new Error(errJson?.error || `Servidor respondeu com status ${response.status}. Verifique o código e o endereço.`)
      }

      // ETAPA 2: Download do Pacote
      setCurrentStep(2)
      setStepStatus('Baixando pacote da sessão (Regras do Sistema, Fichas e Catálogo de Conteúdo)...')

      const bundle: SessionBundleResult = await response.json()

      if (!bundle.success) {
        throw new Error(bundle.error || 'Código de sessão inválido ou sessão não encontrada.')
      }

      // ETAPA 3: Sincronização e Preenchimento das Tabelas Locais (SQLite)
      setCurrentStep(3)
      setStepStatus('Preenchendo banco local: gravando sistema RPG, catálogo, campanha e sessões...')

      if (user?.id) {
        const importRes = await window.api.sessions.importBundle({
          bundle,
          userId: user.id,
          serverUrl: cleanServer
        })

        if (!importRes.success) {
          throw new Error(importRes.error || 'Falha ao sincronizar os dados locais no banco de dados.')
        }

        // Atualiza contextos globais de campanhas e sistemas para refletir na navegação
        await Promise.all([
          fetchMyCampaigns(),
          fetchSystems()
        ])
      }

      // ETAPA 4: Concluído
      setDownloadedBundle(bundle)
      setCurrentStep(4)
      setStepStatus('✓ Conteúdo baixado e tabelas sincronizadas! Pronto para entrar na sala!')
    } catch (err: unknown) {
      console.error('Erro ao acessar sessão:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
      setCurrentStep(0)
    } finally {
      setIsProcessing(false)
    }
  }

  // Navega para a tela da sessão conectada passando o pacote baixado
  const handleEnterSessionRoom = () => {
    if (!downloadedBundle) return

    let cleanServer = serverUrl.trim()
    if (!cleanServer.startsWith('http://') && !cleanServer.startsWith('https://')) {
      cleanServer = `http://${cleanServer}`
    }

    navigate(`/sessions/${downloadedBundle.session.id}`, {
      state: {
        isPlayer: true,
        downloadedBundle: downloadedBundle,
        serverUrl: cleanServer,
        accessCode: inputCode.trim().toUpperCase()
      }
    })
  }

  return (
    <div className='flex flex-row h-screen overflow-hidden bg-vtt-dark-gray text-vtt-light'>
      <Sidebar />

      <main className='flex-1 overflow-y-auto p-10 flex flex-col gap-8'>
        {/* Header */}
        <div className='flex flex-col gap-2 border-b border-vtt-light-gray/40 pb-6'>
          <div className='flex items-center gap-3'>
            <span className='px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-vtt-red/20 text-vtt-light-red border border-vtt-red/40'>
              Acesso do Jogador
            </span>
            <span className='text-xs text-neutral-400'>
              Node.js Express + Socket.io
            </span>
          </div>
          <h1 className='text-3xl font-bold tracking-tight text-white'>Acessar Sessão de Jogo</h1>
          <p className='text-sm text-neutral-400 max-w-2xl leading-relaxed'>
            Informe o código de 6 dígitos gerado pelo Mestre da mesa. O sistema baixará automaticamente o
            sistema de RPG e todo o catálogo de conteúdo necessário antes de estabelecer a conexão em tempo real.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className='bg-red-950/70 border border-red-700 text-red-200 text-sm rounded-xl p-4 flex items-start justify-between shadow-md'>
            <div className='flex items-center gap-3'>
              <span className='text-xl'>⚠️</span>
              <div>
                <strong className='font-semibold'>Falha ao conectar: </strong>
                <span>{errorMessage}</span>
              </div>
            </div>
            <button
              type='button'
              onClick={() => setErrorMessage(null)}
              className='text-red-400 hover:text-red-200 text-sm font-bold cursor-pointer ml-4'
            >
              ✕
            </button>
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>
          {/* Card de Entrada do Código */}
          <div className='lg:col-span-6 bg-vtt-dark border border-vtt-light-gray/40 rounded-2xl p-7 shadow-lg flex flex-col gap-6'>
            <div className='flex items-center justify-between'>
              <h2 className='text-xl font-bold text-white flex items-center gap-2'>
                <span>🔑</span>
                <span>Código de Acesso</span>
              </h2>
              <span className='text-xs text-neutral-400'>
                Usuário: <strong className='text-white'>{user?.username || 'Você'}</strong>
              </span>
            </div>

            <form onSubmit={handleStartDownloadAndJoin} className='flex flex-col gap-5'>
              <div>
                <label className='block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2'>
                  Código da Sessão ou Convite Completo:
                </label>
                <div className='relative'>
                  <input
                    type='text'
                    value={inputCode}
                    onChange={handleCodeChange}
                    onPaste={handlePaste}
                    placeholder='Ex: K8N2XP ou IP:3001#CÓDIGO'
                    disabled={isProcessing}
                    className='w-full px-5 py-4 bg-vtt-dark-gray border border-vtt-light-gray/60 rounded-xl text-2xl font-mono font-bold text-center tracking-widest text-white uppercase focus:outline-none focus:border-vtt-red transition-all'
                  />
                  {inputCode && (
                    <button
                      type='button'
                      onClick={() => setInputCode('')}
                      className='absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs bg-vtt-dark px-2 py-1 rounded cursor-pointer'
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {serverUrl && serverUrl !== 'http://localhost:3001' && (
                  <div className='mt-2.5 flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg px-3 py-2'>
                    <div className='flex items-center gap-2'>
                      <span>🌐 Servidor detectado:</span>
                      <strong className='font-mono text-white'>{serverUrl}</strong>
                    </div>
                    <button
                      type='button'
                      onClick={() => setServerUrl('http://localhost:3001')}
                      className='text-neutral-400 hover:text-white underline cursor-pointer text-[11px]'
                    >
                      Restaurar padrão
                    </button>
                  </div>
                )}

                <p className='text-xs text-neutral-500 mt-2'>
                  Dica: Você pode digitar o código ou colar o convite gerado pelo Mestre (ex: <code className='text-neutral-400'>192.168.1.X:3001#CÓDIGO</code>).
                </p>
              </div>

              {/* Opções avançadas de servidor */}
              <div className='border-t border-vtt-light-gray/30 pt-4'>
                <button
                  type='button'
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className='text-xs text-neutral-400 hover:text-vtt-light flex items-center gap-1.5 transition-colors cursor-pointer'
                >
                  <span>{showAdvanced ? '▼' : '►'}</span>
                  <span>Opções Avançadas de Servidor (IP / Porta)</span>
                </button>

                {showAdvanced && (
                  <div className='mt-3 p-4 bg-vtt-dark-gray/60 rounded-xl flex flex-col gap-3 border border-vtt-light-gray/30'>
                    <label className='block text-xs text-neutral-300 font-medium'>
                      Endereço do Servidor do Mestre:
                    </label>
                    <input
                      type='text'
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder='http://localhost:3001 ou http://192.168.1.X:3001'
                      className='w-full px-3 py-2 bg-vtt-dark border border-vtt-light-gray/40 rounded-lg text-sm text-white focus:outline-none focus:border-vtt-red'
                    />
                    <div className='flex gap-2 text-xs'>
                      <button
                        type='button'
                        onClick={() => setServerUrl('http://localhost:3001')}
                        className='px-2.5 py-1 rounded bg-vtt-dark border border-vtt-light-gray/40 text-neutral-300 hover:text-white cursor-pointer'
                      >
                        Localhost (Porta 3001)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Ação */}
              <button
                type='submit'
                disabled={isProcessing || !inputCode.trim()}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                  isProcessing || !inputCode.trim()
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                    : 'bg-vtt-red hover:bg-red-700 text-white shadow-red-950/40'
                }`}
              >
                {isProcessing ? (
                  <>
                    <span className='animate-spin'>⏳</span>
                    <span>{stepStatus || 'Processando...'}</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>1. Baixar Conteúdo e Conectar</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card de Progresso e Resumo do Conteúdo */}
          <div className='lg:col-span-6 flex flex-col gap-6'>
            {/* Visualizador dos Passos do Fluxo */}
            <div className='bg-vtt-dark border border-vtt-light-gray/40 rounded-2xl p-7 shadow-lg flex flex-col gap-5'>
              <h2 className='text-lg font-bold text-white flex items-center gap-2'>
                <span>📡</span>
                <span>Fluxo de Entrada e Download</span>
              </h2>

              <div className='flex flex-col gap-3.5'>
                {/* Passo 1 */}
                <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  currentStep >= 1 ? 'bg-vtt-dark-gray/80 border-emerald-500/50 text-white' : 'bg-vtt-dark-gray/30 border-vtt-light-gray/20 text-neutral-500'
                }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    currentStep > 1 ? 'bg-emerald-600 text-white' : currentStep === 1 ? 'bg-amber-600 text-white animate-pulse' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {currentStep > 1 ? '✓' : '1'}
                  </span>
                  <div>
                    <h3 className='text-sm font-semibold'>Conexão HTTP com Servidor</h3>
                    <p className='text-xs text-neutral-400 mt-0.5'>
                      Localiza o servidor do mestre e valida o código de acesso.
                    </p>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  currentStep >= 2 ? 'bg-vtt-dark-gray/80 border-emerald-500/50 text-white' : 'bg-vtt-dark-gray/30 border-vtt-light-gray/20 text-neutral-500'
                }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    currentStep > 2 ? 'bg-emerald-600 text-white' : currentStep === 2 ? 'bg-amber-600 text-white animate-pulse' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {currentStep > 2 ? '✓' : '2'}
                  </span>
                  <div>
                    <h3 className='text-sm font-semibold'>Download do Pacote da Sessão</h3>
                    <p className='text-xs text-neutral-400 mt-0.5'>
                      Recebe as regras do sistema, catálogo de classes/magias/itens e dados da campanha.
                    </p>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  currentStep >= 3 ? 'bg-vtt-dark-gray/80 border-emerald-500/50 text-white' : 'bg-vtt-dark-gray/30 border-vtt-light-gray/20 text-neutral-500'
                }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    currentStep > 3 ? 'bg-emerald-600 text-white' : currentStep === 3 ? 'bg-amber-600 text-white animate-pulse' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {currentStep > 3 ? '✓' : '3'}
                  </span>
                  <div>
                    <h3 className='text-sm font-semibold'>Sincronização no SQLite Local</h3>
                    <p className='text-xs text-neutral-400 mt-0.5'>
                      Grava o sistema RPG, catálogo, campanha e sessões nas tabelas locais do seu usuário.
                    </p>
                  </div>
                </div>

                {/* Passo 4 */}
                <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  currentStep >= 4 ? 'bg-vtt-dark-gray/80 border-emerald-500/50 text-white' : 'bg-vtt-dark-gray/30 border-vtt-light-gray/20 text-neutral-500'
                }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    currentStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {currentStep >= 4 ? '✓' : '4'}
                  </span>
                  <div>
                    <h3 className='text-sm font-semibold'>Pronto para Conexão em Tempo Real</h3>
                    <p className='text-xs text-neutral-400 mt-0.5'>
                      Comunicação bidirecional via Socket.io com o Mestre e demais jogadores.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumo do Conteúdo Baixado (Quando Completo) */}
            {downloadedBundle && (
              <div className='bg-linear-to-b from-emerald-950/40 to-vtt-dark border-2 border-emerald-500/60 rounded-2xl p-6 shadow-xl flex flex-col gap-4 animate-in fade-in duration-300'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='w-3 h-3 rounded-full bg-emerald-400 animate-pulse'></span>
                    <span className='text-xs font-bold uppercase tracking-wider text-emerald-400'>
                      Conteúdo Baixado e Validado
                    </span>
                  </div>
                  <span className='text-xs text-neutral-400'>
                    Código: <strong className='text-white font-mono'>{downloadedBundle.session.access_code}</strong>
                  </span>
                </div>

                <div>
                  <h3 className='text-xl font-bold text-white'>
                    {downloadedBundle.session.title || 'Sessão de Jogo'}
                  </h3>
                  <p className='text-xs text-neutral-300 mt-1'>
                    Campanha: <strong className='text-white'>{downloadedBundle.campaign.title}</strong>
                    {downloadedBundle.campaign.owner_username && (
                      <span className='text-neutral-400 ml-2'>(Mestre: {downloadedBundle.campaign.owner_username})</span>
                    )}
                  </p>
                </div>

                {/* Grid de Estatísticas do Pacote */}
                <div className='grid grid-cols-2 gap-3 pt-2 border-t border-emerald-900/40 text-xs'>
                  <div className='bg-vtt-dark/80 p-3 rounded-lg border border-emerald-900/60'>
                    <span className='text-neutral-400 block mb-1'>Sistema de Regras:</span>
                    <strong className='text-emerald-300 text-sm'>
                      {downloadedBundle.system ? downloadedBundle.system.name : 'Personalizado'}
                    </strong>
                    {downloadedBundle.system?.genre && (
                      <span className='text-neutral-500 block text-[11px] mt-0.5'>Gênero: {downloadedBundle.system.genre}</span>
                    )}
                  </div>

                  <div className='bg-vtt-dark/80 p-3 rounded-lg border border-emerald-900/60'>
                    <span className='text-neutral-400 block mb-1'>Catálogo de Conteúdo:</span>
                    <strong className='text-emerald-300 text-sm'>
                      {downloadedBundle.stats.totalContentItems} itens carregados
                    </strong>
                    <span className='text-neutral-500 block text-[11px] mt-0.5'>
                      {downloadedBundle.stats.attributeGroupsCount} grupos de atributos
                    </span>
                  </div>
                </div>

                {/* Confirmação de Gravação Local */}
                <div className='p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-[11px] text-emerald-300 flex items-center justify-between'>
                  <span className='flex items-center gap-1.5'>
                    <span>💾</span>
                    <span>Tabelas locais sincronizadas: Sistema, Catálogo, Campanha e Sessões gravados!</span>
                  </span>
                  <span className='font-mono font-bold text-white'>SQLite OK</span>
                </div>

                {/* Botão de Entrar na Sala */}
                <button
                  type='button'
                  onClick={handleEnterSessionRoom}
                  className='w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2 mt-2'
                >
                  <span>Entrar na Sala da Sessão</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
