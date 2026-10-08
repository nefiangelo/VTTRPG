import React, { useState } from 'react'
import type { ConnectedParticipant } from '../../../../preload/index.d'

interface ParticipantsTabProps {
  accessCode: string
  serverUrl: string
  serverPort: number
  localAddresses: string[]
  participants: ConnectedParticipant[]
  isConnected: boolean
  currentPing: number | null
  syncStatus: string
  lastSyncTime: string | null
  onPing: () => void
  onSync: () => void
  isGM: boolean
}

export default function ParticipantsTab({
  accessCode,
  serverPort,
  localAddresses,
  participants,
  isConnected,
  currentPing,
  syncStatus,
  lastSyncTime,
  onPing,
  onSync,
  isGM
}: ParticipantsTabProps): React.JSX.Element {
  const [copiedCodeToast, setCopiedCodeToast] = useState(false)
  const [copiedLinkToast, setCopiedLinkToast] = useState(false)

  const handleCopyCode = () => {
    if (!accessCode) return
    navigator.clipboard.writeText(accessCode)
    setCopiedCodeToast(true)
    setTimeout(() => setCopiedCodeToast(false), 2000)
  }

  const handleCopyLink = () => {
    const primaryIp = localAddresses.find((ip) => ip !== '127.0.0.1') || 'localhost'
    const fullLink = `${primaryIp}:${serverPort}#${accessCode}`
    navigator.clipboard.writeText(fullLink)
    setCopiedLinkToast(true)
    setTimeout(() => setCopiedLinkToast(false), 2000)
  }

  return (
    <div className='flex flex-col h-full overflow-y-auto p-4 gap-4 text-xs select-none text-vtt-light bg-vtt-dark'>
      {/* Código da Sessão */}
      <div className='bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-xl p-3.5 flex flex-col gap-2.5'>
        <div className='flex items-center justify-between'>
          <span className='text-[10px] font-bold uppercase tracking-wider text-vtt-golden font-cinzel'>
            Código de Acesso
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
        </div>

        <div className='flex items-center justify-between bg-vtt-dark p-2.5 rounded-lg border border-vtt-light-gray/30'>
          <span className='text-xl font-bold tracking-widest text-white font-mono'>
            {accessCode || '------'}
          </span>
          <button
            type='button'
            onClick={handleCopyCode}
            disabled={!accessCode}
            className='px-2.5 py-1 rounded bg-vtt-red hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow'
          >
            {copiedCodeToast ? 'Copiado!' : 'Copiar'}
          </button>
        </div>

        {isGM && (
          <div className='flex items-center justify-between pt-1 text-[11px] text-neutral-400'>
            <span>Porta: <strong className='text-white'>{serverPort}</strong></span>
            <button
              type='button'
              onClick={handleCopyLink}
              className='text-vtt-golden hover:underline cursor-pointer'
            >
              {copiedLinkToast ? 'Link copiado!' : 'Copiar link completo'}
            </button>
          </div>
        )}
      </div>

      {/* Latência e Sincronização */}
      <div className='bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-xl p-3 flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <span className='text-neutral-400'>Latência:</span>
          <div className='flex items-center gap-2'>
            <span className='font-mono font-bold text-neutral-200'>
              {currentPing !== null ? `${currentPing} ms` : '--'}
            </span>
            <button
              type='button'
              onClick={onPing}
              disabled={!isConnected}
              className='px-2 py-0.5 rounded bg-vtt-dark hover:bg-neutral-800 text-[10px] text-neutral-300 cursor-pointer border border-vtt-light-gray/30'
            >
              Ping
            </button>
          </div>
        </div>

        <div className='flex items-center justify-between pt-1 border-t border-vtt-dark'>
          <div className='flex flex-col'>
            <span className='text-neutral-400'>Sincronização:</span>
            <span className='text-[10px] text-neutral-500'>
              {lastSyncTime ? `Última: ${lastSyncTime}` : 'Pendente'}
            </span>
          </div>

          <button
            type='button'
            onClick={onSync}
            disabled={!isConnected || syncStatus === 'syncing'}
            className='px-2.5 py-1 rounded bg-vtt-dark hover:bg-neutral-800 text-[11px] text-neutral-200 cursor-pointer border border-vtt-light-gray/30'
          >
            {syncStatus === 'syncing' ? 'Sincronizando...' : 'Verificar'}
          </button>
        </div>
      </div>

      {/* Participantes Conectados */}
      <div className='flex flex-col gap-2'>
        <span className='text-[11px] font-bold text-vtt-golden uppercase tracking-wide font-cinzel'>
          Conectados Agora ({participants.length})
        </span>

        <div className='flex flex-col gap-1.5'>
          {participants.length === 0 ? (
            <div className='p-3 text-center text-neutral-500 italic bg-vtt-dark-gray rounded-lg'>
              Nenhum participante conectado.
            </div>
          ) : (
            participants.map((p) => {
              const isParticipantGM = p.role === 'gm'
              return (
                <div
                  key={p.socketId}
                  className='p-2 rounded-lg bg-vtt-dark-gray border border-vtt-light-gray/30 flex items-center justify-between'
                >
                  <div className='flex items-center gap-2 min-w-0'>
                    <span>{isParticipantGM ? '👑' : '🛡️'}</span>
                    <span className='font-semibold text-white text-xs truncate'>{p.username}</span>
                  </div>
                  <span className='text-[10px] text-neutral-400 font-mono'>
                    {p.pingMs !== undefined ? `${p.pingMs}ms` : 'online'}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
