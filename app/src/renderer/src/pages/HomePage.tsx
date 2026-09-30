import React from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import CampaignCard from '../components/CampaignCard'
import { useCampaigns } from '../context/CampaignContext'
import type { Campaign } from '../../../preload/index.d'

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
        ) : (
          <>
            {campaigns.length > 0 && (
              <section className='flex flex-wrap gap-10'>
                <CampaignCard onClick={() => navigate('/new-campaign')} campaign={undefined} />

                <div className='flex flex-wrap gap-5'>
                  {campaigns.map((c: Campaign) => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
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
