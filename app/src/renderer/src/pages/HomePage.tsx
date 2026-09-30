import React from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import CampaignCard from '../components/Sidebar/CampaignCard'
import { useCampaigns } from '../context/CampaignContext'
import type { Campaign } from '../../../preload/index.d'

/* --- Empty state ------------------------------------------- */
function EmptyState(): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <div className='flex flex-col items-center justify-center gap-6 py-24 text-center'>
      <span className='text-7xl select-none'>???</span>
      <div>
        <h2 className='text-2xl font-bold text-vtt-light mb-2'>Nenhuma campanha ainda</h2>
        <p className='text-neutral-400 text-sm max-w-xs'>
          Crie sua primeira campanha ou peça para um GM te convidar para uma.
        </p>
      </div>
      <div className='flex gap-3'>
        <button
          onClick={() => navigate('/new-campaign')}
          className='px-5 py-2.5 rounded-lg bg-vtt-red text-white text-sm font-semibold
                     hover:bg-red-700 transition-colors'
        >
          + Nova Campanha
        </button>
        <button
          onClick={() => navigate('/join-campaign')}
          className='px-5 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm
                     font-semibold hover:border-vtt-red hover:text-vtt-light transition-colors'
        >
          Entrar em Campanha
        </button>
      </div>
    </div>
  )
}

/* --- Loading skeleton -------------------------------------- */
function SkeletonCard(): React.JSX.Element {
  return (
    <div className='w-60 h-72 rounded-xl bg-vtt-dark border border-vtt-dark-gray animate-pulse' />
  )
}

/* --- Page -------------------------------------------------- */
export default function HomePage(): React.JSX.Element {
  const navigate = useNavigate()
  const { campaigns, isLoading } = useCampaigns()

  const active = campaigns.filter((c: Campaign) => c.status === 'active')
  const others = campaigns.filter((c: Campaign) => c.status !== 'active')

  return (
    <div className='flex flex-row h-screen overflow-hidden'>
      <Sidebar />

      <main className='flex-1 overflow-y-auto p-10 flex flex-col gap-8'>
        {/* Header */}
        <header className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-vtt-light'>Campanhas</h1>
          </div>
        </header>

        {/* Divider */}
        <div className='h-px bg-vtt-dark-gray' />

        {/* Content */}
        {isLoading ? (
          <section className='flex flex-wrap gap-5'>
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </section>
        ) : campaigns.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {active.length > 0 && (
              <section>
                <h2 className='text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4'>
                  Ativas
                </h2>
                <div className='flex flex-wrap gap-5'>
                  {active.map((c: Campaign) => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
                      onClick={() => navigate('/session')}
                    />
                  ))}
                </div>
              </section>
            )}
            {others.length > 0 && (
              <section>
                <h2 className='text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4'>
                  Outras
                </h2>
                <div className='flex flex-wrap gap-5'>
                  {others.map((c: Campaign) => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
                      onClick={() => navigate('/session')}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
