import React, { useState, useEffect, useCallback } from 'react'
import { FilterContent } from '../components/FilterContent'
import Sidebar from '../components/Sidebar/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useCampaigns } from '../context/CampaignContext'
import CharacterSheetModal from '../components/sheet/CharacterSheetModal'
import type { CharacterEntry, RpgSystemFull, Campaign } from '../../../preload/index.d'

/* ─── Genre Banner Icons (Idêntico ao SystemsPage.tsx) ────────── */
function SystemBanner({ genre }: { genre?: string | null }): React.JSX.Element {
  const lower = genre?.toLowerCase() || ''

  let BigIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <line x1="12" y1="22" x2="12" y2="15.5" />
      <polyline points="22 8.5 12 15.5 2 8.5" />
      <polyline points="2 15.5 12 8.5 22 15.5" />
      <line x1="12" y1="2" x2="12" y2="8.5" />
    </svg>
  )

  if (lower.includes('fantasy') || lower.includes('medieval')) {
    BigIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
        <line x1="13" y1="19" x2="19" y2="13" />
        <line x1="16" y1="16" x2="20" y2="20" />
        <line x1="19" y1="21" x2="21" y2="19" />
        <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
        <line x1="5" y1="14" x2="9" y2="18" />
        <line x1="7" y1="17" x2="4" y2="20" />
        <line x1="3" y1="19" x2="5" y2="21" />
      </svg>
    )
  } else if (lower.includes('cyberpunk') || lower.includes('sci-fi')) {
    BigIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </svg>
    )
  } else if (lower.includes('horror')) {
    BigIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <circle cx="9" cy="12" r="1" />
        <circle cx="15" cy="12" r="1" />
        <path d="M8 20v2h8v-2" />
        <path d="M12.5 17l-.5-1-.5 1h1z" />
        <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
      </svg>
    )
  } else if (lower.includes('western')) {
    BigIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </svg>
    )
  }

  return (
    <div className="w-full h-24 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] relative shrink-0 border-b border-vtt-dark-gray overflow-hidden">
      <div className="absolute -right-4 -bottom-4 w-28 h-28 text-[#262626] transition-all duration-300 ease-in-out group-hover:text-vtt-golden group-hover:drop-shadow-[0_0_8px_rgba(233,209,128,0.3)] pointer-events-none">
        {BigIcon}
      </div>
    </div>
  )
}

/* ─── Icons (Idênticos aos de SystemsPage.tsx) ─────────────────── */
const IconPlus = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
const IconTrash = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)
const IconDice = (): React.JSX.Element => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm8 8a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-4-4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-4 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm8-8a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" /></svg>
)
const IconScroll = (): React.JSX.Element => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
)
const IconFileImport = (): React.JSX.Element => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M12 12v6" />
    <path d="M9 15l3 3 3-3" />
  </svg>
)

/* ─── Delete Modal (Idêntico ao DeleteModal de SystemsPage.tsx) ─ */
function DeleteModal({
  character,
  onClose,
  onDeleted
}: {
  character: CharacterEntry
  onClose: () => void
  onDeleted: () => void
}): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (): Promise<void> => {
    setLoading(true)
    const res = await window.api.characters.delete(character.id, character.user_id)
    if (!res.success) {
      setError(res.error ?? 'Erro ao excluir.')
      setLoading(false)
      return
    }
    onDeleted()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-vtt-dark border border-vtt-dark-gray rounded-2xl p-8 shadow-2xl flex flex-col gap-5">
        <h2 className="text-lg font-bold text-vtt-light">Excluir Ficha</h2>
        <p className="text-neutral-400 text-sm">
          Tem certeza que deseja excluir <span className="text-vtt-light font-semibold">{character.name}</span>? Esta ação não pode ser desfeita.
        </p>
        {error && <div className="bg-red-950/60 border border-red-700/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-neutral-400 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-vtt-red text-white text-sm font-semibold hover:bg-vtt-dark-red transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Modal Importar para Campanha ────────────────────────────── */
function ImportToCampaignModal({
  character,
  userId,
  campaigns,
  systems,
  onClose,
  onSuccess
}: {
  character: CharacterEntry
  userId: number
  campaigns: Campaign[]
  systems: RpgSystemFull[]
  onClose: () => void
  onSuccess: (targetCampaign: Campaign) => void
}): React.JSX.Element {
  const [selectedCampaignId, setSelectedCampaignId] = useState<number>(campaigns[0]?.id || 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const charSystem = systems.find(s => s.id === character.rpg_system_id) || null

  const handleImport = async (): Promise<void> => {
    if (!selectedCampaignId) {
      setError('Selecione uma campanha para importar.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await window.api.characters.importToCampaign({
        characterId: character.id,
        characterUuid: character.uuid,
        campaignId: selectedCampaignId,
        userId
      })

      if (res.success) {
        const camp = campaigns.find(c => c.id === selectedCampaignId)
        if (camp) onSuccess(camp)
        onClose()
      } else {
        setError(res.error || 'Erro ao importar ficha para a campanha.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-vtt-dark border border-vtt-dark-gray rounded-2xl p-8 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-vtt-dark-gray pb-3">
          <h2 className="text-lg font-bold text-vtt-golden flex items-center gap-2">
            <IconFileImport /> Importar Ficha para Campanha
          </h2>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-vtt-light transition-colors text-xl cursor-pointer">✕</button>
        </div>

        <p className="text-neutral-400 text-sm">
          Importando a ficha <span className="text-vtt-light font-semibold">{character.name}</span> ({character.system_name || charSystem?.name || 'Sistema Padrão'}).
        </p>

        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300 block mb-1">Cópia Independente (Snapshot):</strong>
          Uma vez importada para a campanha, a ficha pertence à campanha. Alterações feitas fora da campanha não refletirão na versão da mesa, e as edições na mesa não alterarão o seu cofre.
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-700/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1.5">
            Campanha de Destino
          </label>
          {campaigns.length === 0 ? (
            <div className="text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-center">
              Você ainda não participa de nenhuma campanha ativa.
            </div>
          ) : (
            <select
              value={selectedCampaignId}
              onChange={e => setSelectedCampaignId(Number(e.target.value))}
              className="w-full bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-vtt-light py-2 px-3 text-sm outline-none focus:border-vtt-golden transition-colors cursor-pointer"
            >
              {campaigns.map(camp => {
                const matchesSystem = character.rpg_system_id && camp.rpg_system_id === character.rpg_system_id
                return (
                  <option key={camp.id} value={camp.id}>
                    {camp.title} {matchesSystem ? '★ (Mesmo Sistema)' : ''}
                  </option>
                )
              })}
            </select>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-neutral-400 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || campaigns.length === 0}
            className="flex-1 py-2.5 rounded-lg bg-vtt-dark-green/30 border border-vtt-green/40 text-vtt-light-green text-sm font-semibold hover:bg-vtt-green hover:text-vtt-light transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Importando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Modal Nova Ficha ────────────────────────────────────────── */
function CreateSheetModal({
  systems,
  userId,
  onClose,
  onCreated
}: {
  systems: RpgSystemFull[]
  userId: number
  onClose: () => void
  onCreated: (newChar: CharacterEntry) => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [systemId, setSystemId] = useState<number>(systems[0]?.id || 0)
  const [role, setRole] = useState<'pc' | 'npc' | 'enemy'>('pc')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedSys = systems.find(s => s.id === systemId)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Por favor, informe o nome do personagem.')
      return
    }
    if (!systemId) {
      setError('Por favor, selecione um sistema de RPG.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await window.api.characters.save({
        user_id: userId,
        campaign_id: null,
        rpg_system_id: systemId,
        system_slug: selectedSys?.slug,
        name: name.trim(),
        avatar_url: avatarUrl.trim() || null,
        role,
        sheet_data: {
          attributes: {},
          lists: {},
          notes: notes.trim()
        }
      })

      if (res.success && res.character) {
        onCreated(res.character)
      } else {
        setError(res.error || 'Erro ao criar ficha.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl bg-vtt-dark border border-vtt-dark-gray rounded-2xl flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-8 py-4 border-b border-vtt-dark-gray shrink-0 bg-vtt-dark z-20">
          <h2 className="text-xl font-bold text-vtt-golden">Nova Ficha de Personagem</h2>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-vtt-light transition-colors text-xl cursor-pointer">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-5 p-6 sm:p-8">
          {error && (
            <div className="bg-red-950/60 border border-red-700/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5">
              Nome do Personagem *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Aldor Ventobravo, Nyx..."
              required
              className="w-full bg-transparent border-b border-vtt-light-gray text-vtt-light placeholder:text-neutral-600 py-1.5 text-sm outline-none focus:border-vtt-golden transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5">
              Sistema RPG *
            </label>
            {systems.length === 0 ? (
              <div className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/50 p-2.5 rounded-lg">
                Nenhum sistema cadastrado ainda. Crie um sistema em <strong>Sistemas RPG</strong> primeiro para definir a estrutura da ficha.
              </div>
            ) : (
              <select
                value={systemId}
                onChange={e => setSystemId(Number(e.target.value))}
                className="w-full bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-vtt-light py-2 px-3 text-sm outline-none focus:border-vtt-golden transition-colors cursor-pointer"
              >
                {systems.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.genre ? `(${s.genre})` : ''}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-neutral-500 mt-1">
              O sistema determina a estrutura de dados, atributos e o modelo visual da ficha.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5">
                Tipo
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'pc' | 'npc' | 'enemy')}
                className="w-full bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-vtt-light py-2 px-3 text-sm outline-none focus:border-vtt-golden transition-colors cursor-pointer"
              >
                <option value="pc">Personagem de Jogador (PC)</option>
                <option value="npc">NPC</option>
                <option value="enemy">Monstro / Inimigo</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5">
                URL do Avatar (Opcional)
              </label>
              <input
                type="text"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-transparent border-b border-vtt-light-gray text-vtt-light placeholder:text-neutral-600 py-1.5 text-sm outline-none focus:border-vtt-golden transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5">
              Conceito / Biografia Inicial (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Anotações e conceito do personagem..."
              className="w-full bg-transparent border border-vtt-light-gray rounded-lg p-2.5 text-xs text-vtt-light placeholder:text-neutral-600 outline-none focus:border-vtt-golden transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-8 py-4 border-t border-vtt-dark-gray bg-vtt-dark">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-neutral-400 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || systems.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-vtt-dark-green/30 border border-vtt-green/40 text-vtt-light-green text-sm font-semibold 
                       hover:bg-vtt-green hover:text-vtt-light transition-all duration-200 cursor-pointer
                       hover:shadow-[0_0_24px_rgba(67,161,93,0.4)] disabled:opacity-50"
          >
            <IconPlus /> {loading ? 'Criando...' : 'Criar Ficha'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── Card de Ficha (Idêntico ao SystemCard de SystemsPage.tsx) ─── */
function SheetCard({
  character,
  systemName,
  genre,
  onOpen,
  onImport,
  onDelete
}: {
  character: CharacterEntry
  systemName?: string
  genre?: string | null
  onOpen: () => void
  onImport: () => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <article
      className="group relative bg-vtt-dark rounded-xl flex flex-col select-none
                  border border-vtt-dark-gray hover:border-vtt-red/60 
                  transition-all duration-300 shadow-md hover:shadow-[0_4px_24px_rgba(211,47,47,0.15)]
                  hover:-translate-y-1 hover:scale-[1.02]
                  overflow-hidden"
    >
      <div className="absolute -right-4 -bottom-4 w-28 h-28 text-[#262626] transition-all duration-300 ease-in-out group-hover:text-vtt-golden group-hover:drop-shadow-[0_0_8px_rgba(233,209,128,0.3)] pointer-events-none" />

      <SystemBanner genre={genre} />

      {/* Corpo de Informações */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Topo: Nome e Sistema */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-vtt-golden group-hover:text-[#FBE8A6] font-bold text-lg leading-tight truncate drop-shadow-sm transition-colors duration-300">
                {character.name}
              </h3>

              {systemName && (
                <span className="shrink-0 text-[10px] text-vtt-light/70 font-mono bg-vtt-dark-gray/40 px-1.5 py-0.5 rounded border border-vtt-light/5 mt-0.5">
                  {systemName}
                </span>
              )}
            </div>

            <span className="text-[10px] text-neutral-400 mt-0.5">
              {character.role === 'pc' ? 'Personagem de Jogador' : character.role === 'npc' ? 'NPC' : 'Inimigo'}
            </span>
          </div>
        </div>

        {/* Botões de Ação (Proporção idêntica ao SystemCard) */}
        <div className="flex gap-2 pt-1 border-t border-vtt-dark-gray/50 mt-auto">
          <button
            type="button"
            onClick={onImport}
            className="w-1/4 flex items-center justify-center gap-1 py-2 px-3 rounded-lg
                       bg-transparent hover:bg-vtt-dark-gray/50 border border-transparent hover:border-vtt-light-gray
                       text-vtt-light-gray hover:text-vtt-golden transition-all duration-200 cursor-pointer group/import"
            title="Importar para Campanha"
          >
            <div className="transform group-hover/import:scale-110 transition-all duration-300 shrink-0 flex items-center justify-center">
              <IconFileImport />
            </div>
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="w-1/4 flex items-center justify-center gap-1 py-2 px-3 rounded-lg
                       bg-transparent hover:bg-red-950/40 border border-transparent hover:border-vtt-red/50
                       text-neutral-500 hover:text-vtt-red transition-all duration-200 cursor-pointer group/trash"
            title="Excluir Ficha"
          >
            <IconTrash />
          </button>

          <button
            type="button"
            onClick={onOpen}
            className="w-2/4 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg
                       bg-vtt-dark-green/30 border border-vtt-green/40 text-vtt-light-green text-xs font-semibold 
                       hover:bg-vtt-green hover:text-vtt-light transition-all duration-200 cursor-pointer"
          >
            <IconScroll /> Ficha
          </button>
        </div>
      </div>
    </article>
  )
}

/* ─── Página Principal de Fichas ──────────────────────────────── */
export default function SheetsPage(): React.JSX.Element {
  const { user } = useAuth()
  const { campaigns } = useCampaigns()
  const [characters, setCharacters] = useState<CharacterEntry[]>([])
  const [systems, setSystems] = useState<RpgSystemFull[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [importTargetChar, setImportTargetChar] = useState<CharacterEntry | null>(null)
  const [deleting, setDeleting] = useState<CharacterEntry | null>(null)
  const [activeSheetCharacter, setActiveSheetCharacter] = useState<CharacterEntry | null>(null)

  const [search, setSearch] = useState('')

  const load = useCallback(async (): Promise<void> => {
    if (!user) return
    setLoading(true)
    try {
      const [chars, sysList] = await Promise.all([
        window.api.characters.getVault(user.id),
        window.api.systems.getAll()
      ])
      setCharacters(chars || [])
      setSystems(sysList || [])
    } catch (err) {
      console.error('Erro ao carregar fichas:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = (): void => setShowCreate(true)
  const closeCreate = (): void => setShowCreate(false)

  const filteredCharacters = characters.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const currentSheetSystem = activeSheetCharacter?.rpg_system_id
    ? systems.find(s => s.id === activeSheetCharacter.rpg_system_id) || null
    : null

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-vtt-golden">Fichas</h1>
          </div>
        </div>

        {/* BARRA DE BUSCA E BOTÕES DE AÇÃO (Exatamente idêntico a SystemsPage.tsx) */}
        <div className="flex items-center justify-between mb-2">
          <FilterContent search={search} setSearch={setSearch} />

          {/* Wrapper para deixar os botões lado a lado */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                         bg-vtt-dark-green/30 border border-vtt-green/40 text-vtt-light-green text-sm font-semibold 
                         hover:bg-vtt-green hover:text-vtt-light transition-all duration-200 cursor-pointer
                         hover:shadow-[0_0_24px_rgba(67,161,93,0.4)]"
            >
              <IconPlus /> Nova Ficha
            </button>
          </div>
        </div>

        {/* Linha fina vermelha dividindo o cabeçalho do corpo */}
        <div className="w-full h-px bg-vtt-red mb-8" />

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-vtt-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="text-6xl opacity-20"><IconDice /></div>
            <p className="text-neutral-500 text-sm">Nenhuma ficha cadastrada ainda.</p>
            <button
              type="button"
              onClick={openCreate}
              className="px-6 py-2.5 rounded-xl bg-vtt-green text-white text-sm font-semibold hover:bg-vtt-light-green transition-colors cursor-pointer"
            >
              Criar primeira ficha
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCharacters.map(char => {
              const charSys = systems.find(s => s.id === char.rpg_system_id)
              return (
                <SheetCard
                  key={char.id}
                  character={char}
                  systemName={char.system_name || charSys?.name}
                  genre={char.genre || charSys?.genre}
                  onOpen={() => setActiveSheetCharacter(char)}
                  onImport={() => setImportTargetChar(char)}
                  onDelete={() => setDeleting(char)}
                />
              )
            })}

            {filteredCharacters.length === 0 && search !== '' && (
              <div className="col-span-full mt-8 flex justify-center w-full">
                <p className="text-neutral-400">Nenhuma ficha encontrada com "{search}".</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Criar Ficha */}
      {showCreate && user && (
        <CreateSheetModal
          systems={systems}
          userId={user.id}
          onClose={closeCreate}
          onCreated={newChar => {
            closeCreate()
            load()
            setActiveSheetCharacter(newChar)
          }}
        />
      )}

      {/* Modal Importar para Campanha */}
      {importTargetChar && user && (
        <ImportToCampaignModal
          character={importTargetChar}
          userId={user.id}
          campaigns={campaigns}
          systems={systems}
          onClose={() => setImportTargetChar(null)}
          onSuccess={() => {
            setImportTargetChar(null)
          }}
        />
      )}

      {/* Modal Excluir */}
      {deleting && (
        <DeleteModal
          character={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null)
            load()
          }}
        />
      )}

      {/* Editor Completo da Ficha de Personagem */}
      {activeSheetCharacter && (
        <CharacterSheetModal
          character={activeSheetCharacter}
          system={currentSheetSystem}
          isGM={true}
          canEdit={true}
          onClose={() => setActiveSheetCharacter(null)}
          onSave={async updated => {
            const res = await window.api.characters.save({
              id: updated.id,
              uuid: updated.uuid,
              campaign_id: null,
              user_id: updated.user_id,
              rpg_system_id: updated.rpg_system_id,
              system_slug: updated.system_slug,
              name: updated.name,
              avatar_url: updated.avatar_url,
              role: updated.role,
              sheet_data: updated.sheet_data
            })
            if (res.success && res.character) {
              setCharacters(prev => prev.map(c => (c.id === updated.id ? res.character! : c)))
              setActiveSheetCharacter(res.character)
            }
          }}
        />
      )}
    </div>
  )
}
