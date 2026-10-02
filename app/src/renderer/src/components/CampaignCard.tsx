import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Campaign } from '../../../preload/index.d'


interface Props {
  campaign?: Campaign
  onClick?: () => void
}

export const STATUS_LABEL: Record<Campaign['status'], string> = {
  active: 'Ativa',
  paused: 'Pausada',
  finished: 'Finalizada',
}

export const STATUS_COLOR: Record<Campaign['status'], string> = {
  active: 'bg-green-600',
  paused: 'bg-yellow-600',
  finished: 'bg-neutral-500',
}

export default function CampaignCard({ campaign, onClick }: Props): React.JSX.Element {
  const navigate = useNavigate()

  if (campaign == undefined) {
    return (
      <article
        onClick={onClick}
        className='group flex justify-center items-center relative w-60 h-72 rounded-xl overflow-hidden cursor-pointer
                 border border-vtt-dark-gray bg-vtt-dark
                 hover:border-vtt-red transition-all duration-300
                 hover:shadow-[0_0_24px_rgba(211,47,47,0.25)]
                 hover:-translate-y-1 select-none'
      >
        {/* Content */}
        <div className='flex flex-col justify-center items-center'>
          <div
            className='w-fit px-5 py-2.5 rounded-lg bg-vtt-green text-white text-sm font-semibold
                      hover:bg-vtt-light-green transition-colors'
          >
            +
          </div>
          Nova Campanha
        </div>
      </article>
    )
  }

  const handleCardClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigate(`/campaigns/${campaign.id}/sessions`)
    }
  }

  const handleAccessClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/campaigns/${campaign.id}/sessions`)
  }

  return (
    <article
      onClick={handleCardClick}
      className='group relative w-60 h-72 rounded-xl overflow-hidden
                 border border-vtt-dark-gray bg-vtt-dark
                 hover:border-vtt-red transition-all duration-300
                 hover:shadow-[0_0_24px_rgba(211,47,47,0.25)]
                 hover:-translate-y-1 flex flex-col  select-none cursor-pointer'
    >
      {/* Decorative gradient banner */}
      <div className='h-3/4  bg-linear-to-b from-vtt-dark-gray via-vtt-light-gray to-vtt-dark
                      flex items-end justify-center text-5xl shrink-0'>
        <h3 className='mb-2 text-center text-base font-bold text-vtt-light leading-snug line-clamp-2 group-hover:text-white'>
          {campaign.title}
        </h3>
      </div>

      {/* RED DIVISOR */}
      <div className='w-full flex justify-center'>
        <div className='w-9/10 border-b-2 border-vtt-dark-red'></div>
      </div>

      {/* Content */}
      <div className='flex gap-2 justify-center items-center h-full p-4'>
        <div className='w-1/3 h-full flex flex-col gap-2 justify-center'>
          <button
            type='button'
            onClick={handleAccessClick}
            className='w-full min-h-full rounded-lg bg-vtt-dark-gray hover:bg-vtt-light-gray transition-all duration-200 cursor-pointer text-xs'
            title='Ver Sessões e Detalhes'
          >
            Editar
          </button>
        </div>
        <div className='w-2/3 h-full'>
          <button
            type='button'
            onClick={handleAccessClick}
            className='w-full min-h-full rounded-lg bg-vtt-green hover:bg-vtt-light-green transition-all duration-200 cursor-pointer font-semibold text-xs'
            title='Acessar Sessões da Campanha'
          >
            Acessar
          </button>
        </div>

      </div>
    </article>
  )
}
