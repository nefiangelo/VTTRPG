import React from 'react'
import type { Campaign } from '../../../../preload/index.d'

interface Props {
  campaign: Campaign
  onClick?: () => void
}

const STATUS_LABEL: Record<Campaign['status'], string> = {
  active:   'Ativa',
  paused:   'Pausada',
  finished: 'Finalizada',
}

const STATUS_COLOR: Record<Campaign['status'], string> = {
  active:   'bg-green-600',
  paused:   'bg-yellow-600',
  finished: 'bg-neutral-500',
}

export default function CampaignCard({ campaign, onClick }: Props): React.JSX.Element {
  return (
    <article
      onClick={onClick}
      className='group relative w-60 h-72 rounded-xl overflow-hidden cursor-pointer
                 border border-vtt-dark-gray bg-vtt-dark
                 hover:border-vtt-red transition-all duration-300
                 hover:shadow-[0_0_24px_rgba(211,47,47,0.25)]
                 hover:-translate-y-1 flex flex-col select-none'
    >
      {/* Decorative gradient banner */}
      <div className='h-28 bg-gradient-to-br from-vtt-dark-gray via-vtt-light-gray to-vtt-dark
                      flex items-center justify-center text-5xl shrink-0'>
        ??
      </div>

      {/* Content */}
      <div className='flex flex-col gap-2 p-4 flex-1'>
        <span className={`self-start text-[10px] font-semibold uppercase tracking-widest
                          px-2 py-0.5 rounded-full text-white ${STATUS_COLOR[campaign.status]}`}>
          {STATUS_LABEL[campaign.status]}
        </span>
        <h3 className='text-base font-bold text-vtt-light leading-snug line-clamp-2 group-hover:text-white'>
          {campaign.title}
        </h3>
        {campaign.description && (
          <p className='text-xs text-neutral-400 line-clamp-3 leading-relaxed'>
            {campaign.description}
          </p>
        )}
      </div>

      {/* Bottom accent line */}
      <div className='h-0.5 w-0 group-hover:w-full bg-vtt-red transition-all duration-500' />
    </article>
  )
}
