import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useCampaigns } from '../context/CampaignContext'

export default function NewCampaignPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { createCampaign, systems } = useCampaigns()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [systemId, setSystemId] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!systemId) { setError('Selecione um sistema RPG.'); return }

    setError(null)
    setLoading(true)
    const err = await createCampaign({
      title,
      description: description || undefined,
      rpg_system_id: Number(systemId),
      owner_id: user.id,
    })
    setLoading(false)
    if (err) { setError(err); return }
    navigate('/home')
  }

  return (
    <div className='flex flex-row h-screen overflow-hidden'>
      <Sidebar />

      <main className='flex-1 overflow-y-auto flex items-start justify-center p-10'>
        <div className='w-full max-w-lg'>

          {/* Header */}
          <div className='mb-8'>
            <button
              type='button'
              onClick={() => navigate('/home')}
              className='text-neutral-400 hover:text-vtt-light text-sm flex items-center gap-1.5
                         mb-6 transition-colors'
            >
              « Voltar
            </button>
            <h1 className='text-3xl font-bold text-vtt-light'>Nova Campanha</h1>
            <p className='text-neutral-400 text-sm mt-1'>
              Configure sua campanha. Você será o Mestre automaticamente.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className='flex flex-col gap-6 bg-vtt-dark border border-vtt-dark-gray
                       rounded-xl p-8'
          >
            {error && (
              <div className='bg-red-950/60 border border-red-700/50 text-red-400 text-sm
                              rounded-lg px-4 py-3'>
                {error}
              </div>
            )}

            {/* Title */}
            <label className='flex flex-col gap-1.5'>
              <span className='text-xs font-semibold uppercase tracking-widest text-neutral-400'>
                Título *
              </span>
              <input
                type='text'
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='Ex: A Maldição de Strahd'
                required
                maxLength={120}
                className='bg-transparent border-b border-vtt-light-gray text-vtt-light
                           placeholder:text-neutral-600 py-2 text-sm outline-none
                           focus:border-vtt-red transition-colors'
              />
            </label>

            {/* Description */}
            <label className='flex flex-col gap-1.5'>
              <span className='text-xs font-semibold uppercase tracking-widest text-neutral-400'>
                Descrição <span className='normal-case tracking-normal text-neutral-600'>(opcional)</span>
              </span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder='Uma breve sinopse da campanha...'
                rows={3}
                maxLength={500}
                className='bg-transparent border border-vtt-light-gray rounded-lg text-vtt-light
                           placeholder:text-neutral-600 p-3 text-sm outline-none resize-none
                           focus:border-vtt-red transition-colors'
              />
            </label>

            {/* RPG System */}
            <label className='flex flex-col gap-1.5'>
              <span className='text-xs font-semibold uppercase tracking-widest text-neutral-400'>
                Sistema RPG *
              </span>
              {systems.length === 0 ? (
                <div className='text-sm text-neutral-500 py-2 border-b border-vtt-light-gray'>
                  Nenhum sistema disponível. Adicione um sistema primeiro.
                </div>
              ) : (
                <select
                  value={systemId}
                  onChange={e => setSystemId(Number(e.target.value))}
                  required
                  className='bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-vtt-light
                             py-2 px-3 text-sm outline-none focus:border-vtt-red transition-colors
                             cursor-pointer'
                >
                  <option value='' disabled>Selecione um sistema...</option>
                  {systems.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.genre ? ` � ${s.genre}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </label>

            {/* Actions */}
            <div className='flex gap-3 pt-2'>
              <button
                type='button'
                onClick={() => navigate('/home')}
                className='flex-1 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300
                           text-sm font-semibold hover:border-vtt-red hover:text-vtt-light
                           transition-colors'
              >
                Cancelar
              </button>
              <button
                type='submit'
                disabled={loading || systems.length === 0}
                className='flex-1 py-2.5 rounded-lg bg-vtt-red text-white text-sm font-semibold
                           hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {loading ? 'Criando...' : 'Criar Campanha'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
