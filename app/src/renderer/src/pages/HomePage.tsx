import React from 'react'
import Sidebar from '../components/Sidebar/Sidebar'
import CampaignCard from '@renderer/components/Sidebar/CampaignCard'

export default function HomePage(): React.JSX.Element {
  return (
    /* Full-screen flex row: sidebar + page content side by side */
    <div className='flex flex-row'>
      <Sidebar />

      <main className='p-10 w-full flex flex-col items-center justify-start'>
        {/* Header and filters */}
        <section className='flex flex-col w-full'>
          <div>
            <h1 className='w-fit h-12 text-3xl mb-4'>Campanhas</h1>
          </div>
          <div className='flex justify-center h-10 mb-2.5 mb-2.5 border-vtt-red border-b'>
            filtros
          </div>
        </section>

        {/* Campaigns Cards List */}
        <section className='w-full px-14 flex justify-start items-start'>
          <CampaignCard campaignName='Campanha 1'></CampaignCard>
        </section>
      </main>
    </div>
  )
}
