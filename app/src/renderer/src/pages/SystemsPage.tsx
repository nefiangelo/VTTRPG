import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilterContent } from '../components/FilterContent'
import Sidebar from '../components/Sidebar/Sidebar'
import { useCampaigns } from '../context/CampaignContext'
import type { RpgSystemFull } from '../../../preload/index.d'



/* ─── System Banner (Ýcones sem letras e com traço mais grosso) ────────────────────────────── */
function SystemBanner({ genre }: { genre?: string | null; systemName?: string }): React.JSX.Element {
  const lower = genre?.toLowerCase() || ''

  // O strokeWidth foi alterado para "2" em todos os SVGs para deixar as linhas mais marcantes e visíveis.
  let BigIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <line x1="12" y1="22" x2="12" y2="15.5" />
      <polyline points="22 8.5 12 15.5 2 8.5" />
      <polyline points="2 15.5 12 8.5 22 15.5" />
      <line x1="12" y1="2" x2="12" y2="8.5" />
    </svg> // D20 (Padrão)
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
      </svg> // Espadas Cruzadas
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
      </svg> // Microchip
    )
  } else if (lower.includes('horror')) {
    BigIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <circle cx="9" cy="12" r="1" />
        <circle cx="15" cy="12" r="1" />
        <path d="M8 20v2h8v-2" />
        <path d="M12.5 17l-.5-1-.5 1h1z" />
        <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
      </svg> // Caveira
    )
  } else if (lower.includes('western')) {
    BigIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </svg> // Mira / Crosshair
    )
  } else if (lower.includes('post-apocalyptic')) {
    BigIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <path d="M12 12h.01" />
        <path d="M7.5 4.2c-.3-.5-.9-.7-1.3-.4C3.9 5.5 2 9.2 2 13c0 .5.4 1 1 1h5c.5 0 1-.4 1-1 0-1.8.8-3.4 2-4.5" />
        <path d="M21 13c0-3.8-1.9-7.5-4.2-9.2-.4-.3-1-.1-1.3.4l-2.4 4.1c1.2 1.1 2 2.7 2 4.5 0 .5.4 1 1 1h5c.5 0 1-.4 1-1Z" />
        <path d="M8.2 15.5c-.4.4-.5 1-.2 1.4 1.8 3.1 5.3 4.9 8.5 3.9.5-.1.8-.7.6-1.1l-2.7-4c-.9.9-2.2 1.4-3.6 1.4-1.2 0-2.3-.4-3.2-1-.4-.3-1-.2-1.4.2Z" />
      </svg> // Radiação
    )
  }

  return (
    <div className="w-full h-24 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] relative shrink-0 border-b border-vtt-dark-gray overflow-hidden">
      {/* Ýcone Único 
          - Tamanho mantido w-28 h-28
          - No hover, ganha cor dourada e brilho sutil */}
      <div className="absolute -right-4 -bottom-4 w-28 h-28 text-[#262626] transition-all duration-300 ease-in-out group-hover:text-vtt-golden group-hover:drop-shadow-[0_0_8px_rgba(233,209,128,0.3)] pointer-events-none">
        {BigIcon}
      </div>
    </div>
  )
}


/* ─── Icons ──────────────────────────────────────────────────── */
const IconPlus = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
const IconDice = (): React.JSX.Element => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm8 8a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-4-4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-4 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm8-8a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" /></svg>
)

const IconGears = (): React.JSX.Element => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const IconScroll = (): React.JSX.Element => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
)

// IMPORTAR SISTEMAS A PARTIR DE ARQUIVOS
const IconFileImport = (): React.JSX.Element => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M12 12v6" />
    <path d="M9 15l3 3 3-3" />
  </svg>
)



/* ─── Import System Modal (EM DEV) ──────────────────────────── */
function ImportModal({ onClose }: { onClose: () => void }): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md bg-vtt-dark border border-vtt-dark-gray rounded-2xl p-8 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-vtt-dark-gray pb-3">
          <h2 className="text-lg font-bold text-vtt-golden flex items-center gap-2">
            <IconFileImport /> Importar Sistema
          </h2>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-vtt-light transition-colors text-xl cursor-pointer">✕</button>
        </div>

        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-vtt-dark-gray rounded-xl bg-vtt-dark-gray/20">
          <div className="text-vtt-golden/50 mb-3 transform scale-150">
            <IconFileImport />
          </div>
          <p className="text-neutral-400 text-sm text-center px-4">
            A importação de sistemas (JSON) estará disponível em atualizações futuras.
          </p>
        </div>

        <div className="flex justify-end mt-2">
          <button type="button" onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-vtt-golden hover:text-vtt-golden transition-colors cursor-pointer">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}



/* ─── Delete Confirm Modal ────────────────────────────────────── */
function DeleteModal({ system, onClose, onDeleted }: { system: RpgSystemFull; onClose: () => void; onDeleted: () => void }): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (): Promise<void> => {
    setLoading(true)
    const res = await window.api.systems.delete(system.id)
    if (!res.success) { setError(res.error ?? 'Erro ao excluir.'); setLoading(false); return }
    onDeleted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md bg-vtt-dark border border-vtt-dark-gray rounded-2xl p-8 shadow-2xl flex flex-col gap-5">
        <h2 className="text-lg font-bold text-vtt-light">Excluir Sistema</h2>
        <p className="text-neutral-400 text-sm">Tem certeza que deseja excluir <span className="text-vtt-light font-semibold">{system.name}</span>? Esta ação não pode ser desfeita e removerá todo o conteúdo associado.</p>
        {error && <div className="bg-red-950/60 border border-red-700/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-neutral-400 transition-colors cursor-pointer">Cancelar</button>
          <button type="button" onClick={handleDelete} disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-vtt-red text-white text-sm font-semibold hover:bg-vtt-dark-red transition-colors disabled:opacity-50 cursor-pointer">
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ??? System Card ????????????????????????????????? */
function SystemCard({ system, onEdit, onView }: {
  system: RpgSystemFull
  onEdit: () => void
  onDelete?: () => void
  onView: () => void
}): React.JSX.Element {

  return (
    <article className="group relative bg-vtt-dark rounded-xl flex flex-col select-none
                        border border-vtt-dark-gray hover:border-vtt-red/60 
                        transition-all duration-300 shadow-md hover:shadow-[0_4px_24px_rgba(211,47,47,0.15)]
                        hover:-translate-y-1 hover:scale-[1.02]
                        overflow-hidden">

      <div className="absolute -right-4 -bottom-4 w-28 h-28 text-[#262626] transition-all duration-300 ease-in-out group-hover:text-vtt-golden group-hover:drop-shadow-[0_0_8px_rgba(233,209,128,0.3)] pointer-events-none" />

      <SystemBanner genre={system.genre} />

      {/* Corpo de Informacoes */}
      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Topo: Nome e Versao */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-vtt-golden group-hover:text-[#FBE8A6] font-bold text-lg leading-tight truncate drop-shadow-sm transition-colors duration-300">
                {system.name}
              </h3>

              {system.version && (
                <span className="shrink-0 text-[10px] text-vtt-light/70 font-mono bg-vtt-dark-gray/40 px-1.5 py-0.5 rounded border border-vtt-light/5 mt-0.5">
                  v{system.version}
                </span>
              )}

              {system.is_downloaded && (
                <span className="shrink-0 text-[10px] text-blue-300 font-semibold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/60 mt-0.5">
                  Baixado
                </span>
              )}
            </div>
          </div>
        </div>


        {/* Botoes de Acao (Proporcao 2/3 e 1/3) */}
        <div className="flex gap-2 pt-1 border-t border-vtt-dark-gray/50 mt-auto">
          <button type="button" onClick={onEdit}
            className="w-1/3 flex items-center justify-center gap-1 py-2 px-3 rounded-lg
                        bg-transparent hover:bg-vtt-dark-gray/50 border border-transparent hover:border-vtt-light-gray
                        text-vtt-light-gray hover:text-vtt-golden transition-all duration-200 cursor-pointer group/edit"
            title={system.is_downloaded ? "Visualizar Sistema (Somente Leitura)" : "Editar"}>
            <div className="transform group-hover/edit:rotate-45 transition-all duration-300 shrink-0 flex items-center justify-center">
              <IconGears />
            </div>
          </button>
          <button type="button" onClick={onView}
            className="w-2/3 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg
                       bg-vtt-dark-green/30 border border-vtt-green/40 text-vtt-light-green text-xs font-semibold 
                       hover:bg-vtt-green hover:text-vtt-light transition-all duration-200 cursor-pointer">
            <IconScroll /> Conteudo
          </button>
        </div>
      </div>
    </article>
  )
}

export default function SystemsPage(): React.JSX.Element {
  const { fetchSystems } = useCampaigns()
  const navigate = useNavigate()
  const [systems, setSystems] = useState<RpgSystemFull[]>([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [deleting, setDeleting] = useState<RpgSystemFull | undefined>(undefined)

  const [search, setSearch] = useState('')

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    const data = await window.api.systems.getAll()
    setSystems(data)
    fetchSystems()
    setLoading(false)
  }, [fetchSystems])

  useEffect(() => { load() }, [load])

  const openCreate = (): void => { navigate('/systems/new') }
  const openEdit = (s: RpgSystemFull): void => { navigate(`/systems/${s.id}/edit`) }
  const onDeleted = (): void => { setDeleting(undefined); load() }

  // LÓGICA DO FILTRO: Cria a lista filtrada baseada no estado 'search'
  const filteredSystems = systems.filter((system) =>
    system.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-vtt-golden">Sistemas RPG</h1>
          </div>
        </div>

        {/* BARRA DE BUSCA E BOTÕES DE AÇÃO */}
        <div className="flex items-center justify-between mb-2">
          <FilterContent search={search} setSearch={setSearch} />

          {/* Wrapper para deixar os botões lado a lado */}
          <div className="flex items-center gap-3">
            {/* Botão de Importar Sistema (Golden) */}
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="flex items-center justify-center p-2.5 rounded-xl
                         bg-vtt-dark border border-vtt-dark-gray text-vtt-light-gray 
                         hover:bg-vtt-dark-gray/50 hover:text-vtt-golden hover:border-vtt-golden/50 
                         transition-all duration-200 cursor-pointer shadow-md"
              title="Importar Sistema"
            >
              <IconFileImport />
            </button>

            <button type="button" onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                         bg-vtt-dark-green/30 border border-vtt-green/40 text-vtt-light-green text-sm font-semibold 
                         hover:bg-vtt-green hover:text-vtt-light transition-all duration-200 cursor-pointer
                         hover:shadow-[0_0_24px_rgba(67,161,93,0.4)]">
              <IconPlus /> Novo Sistema
            </button>
          </div>
        </div>

        <div className="w-full h-px bg-vtt-red mb-8" />

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-vtt-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : systems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="text-6xl opacity-20"><IconDice /></div>
            <p className="text-neutral-500 text-sm">Nenhum sistema cadastrado ainda.</p>
            <button type="button" onClick={openCreate}
              className="px-6 py-2.5 rounded-xl bg-vtt-green text-white text-sm font-semibold hover:bg-vtt-light-green transition-colors cursor-pointer">
              Criar primeiro sistema
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSystems.map(s => (
              <SystemCard
                key={s.id}
                system={s}
                onEdit={() => openEdit(s)}
                onDelete={() => setDeleting(s)}
                onView={() => navigate(`/systems/${s.id}/content`)}
              />
            ))}

            {filteredSystems.length === 0 && search !== '' && (
              <div className="col-span-full mt-8 flex justify-center w-full">
                <p className="text-neutral-400">Nenhum sistema encontrado com "{search}".</p>
              </div>
            )}
          </div>
        )}
      </main>

      {deleting && (
        <DeleteModal
          system={deleting}
          onClose={() => setDeleting(undefined)}
          onDeleted={onDeleted}
        />
      )}

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
