import React from 'react'

export default function CampaignCard(props: { campaignName: string }): React.JSX.Element {
    const campaignName: string = props.campaignName

    return (
        <div className='flex flex-col bg-vtt-dark w-64 h-68 rounded-lg shadow-lg/30'>
            {/* !Add background image! */}
            <div className='h-4/5 rounded-t-lg'>

                <h3 className=' text-vtt-light'>{campaignName}</h3>
            </div>
            <div className='w-full'>
                <div className='border border-vtt-red'  ></div>
            </div>
            <div className='flex justify-around'>
                botoes
            </div>
        </div>
    )
} 