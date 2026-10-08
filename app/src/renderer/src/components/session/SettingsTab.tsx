import React from 'react'
import type { Session, CampaignWithDetails, RpgSystemFull } from '../../../../preload/index.d'

interface SettingsTabProps {
  session: Session | null
  campaign: CampaignWithDetails | null
  system: RpgSystemFull | null
  isGM: boolean
  onEndSession: () => void
  onLeaveSession: () => void
  onMarkEnded?: () => void
}

export default function SettingsTab({
  session,
  campaign,
  system,
  isGM,
  onEndSession,
  onLeaveSession,
  onMarkEnded
}: SettingsTabProps): React.JSX.Element {
  return (
    <div className='flex flex-col h-full overflow-y-auto p-4 gap-4 text-xs text-vtt-light select-none bg-vtt-dark'>
      {/* Informações da Sessão */}
      <div className='bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-xl p-3.5 flex flex-col gap-2.5'>
        <span className='text-[10px] font-bold uppercase tracking-wider text-vtt-golden font-cinzel'>
          Dados da Sessão
        </span>

        <div className='flex flex-col gap-1.5'>
          <span className='text-sm font-bold text-white'>{session?.title || 'Sessão em Andamento'}</span>
          <span className='text-neutral-400'>
            Campanha: <strong className='text-neutral-200'>{campaign?.title || 'Campanha'}</strong>
          </span>
          <span className='text-neutral-400'>
            Sistema: <strong className='text-neutral-200'>{system?.name || 'Sistema Customizado'}</strong>
          </span>
          <span className='text-neutral-400'>
            Status: <strong className='text-emerald-400 uppercase'>{session?.status || 'Ativa'}</strong>
          </span>
        </div>
      </div>

      {/* Ações da Sessão */}
      <div className='flex flex-col gap-2.5'>
        <span className='text-[10px] font-bold uppercase tracking-wider text-vtt-golden font-cinzel'>
          Controles
        </span>

        {/* Sair da sala */}
        <button
          type='button'
          onClick={onLeaveSession}
          className='w-full py-2 px-3 rounded-lg bg-vtt-dark-gray hover:bg-neutral-700 text-neutral-200 font-semibold cursor-pointer border border-vtt-light-gray/40 transition-colors flex items-center justify-center gap-2'
        >
          <span>🚪</span>
          <span>Desconectar e Sair da Sala</span>
        </button>

        {/* GM: Encerrar Sessão */}
        {isGM ? (
          <div className='mt-1 p-3 rounded-xl bg-vtt-dark-gray border border-vtt-red/40 flex flex-col gap-2'>
            <span className='font-bold text-red-400'>Zona do Mestre:</span>
            <p className='text-[11px] text-neutral-400 leading-relaxed'>
              Ao encerrar a sessão, todos os jogadores serão desconectados e o status será marcado como concluído.
            </p>
            <button
              type='button'
              onClick={onEndSession}
              className='w-full py-2 px-3 rounded-lg bg-vtt-red hover:bg-vtt-dark-red text-white font-semibold cursor-pointer transition-colors shadow flex items-center justify-center gap-2'
            >
              <span>🛑</span>
              <span>Encerrar Sessão Definitivamente</span>
            </button>
          </div>
        ) : (
          onMarkEnded && (
            <button
              type='button'
              onClick={onMarkEnded}
              className='w-full py-2 px-3 rounded-lg border border-amber-700/60 text-amber-300 hover:bg-amber-950/40 font-semibold cursor-pointer transition-colors text-[11px]'
            >
              Marcar como Encerrada Localmente
            </button>
          )
        )}
      </div>
    </div>
  )
}
