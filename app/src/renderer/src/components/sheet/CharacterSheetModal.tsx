import React, { useState, useMemo } from 'react'
import type {
  CharacterEntry,
  RpgSystemFull,
  SheetLayoutConfig,
  DynamicListItem,
  CharacterSheetData,
  SheetLayoutPin
} from '../../../../preload/index.d'
import SheetPinOverlay from './SheetPinOverlay'
import DynamicListTab from './DynamicListTab'
import {
  FileText,
  Package,
  Sparkles,
  Sword,
  Scroll,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  User,
  Heart,
  Shield,
  CheckCircle2
} from 'lucide-react'

interface CharacterSheetModalProps {
  character: CharacterEntry
  system: RpgSystemFull | null
  isGM?: boolean
  canEdit?: boolean
  onClose: () => void
  onSave?: (updatedCharacter: CharacterEntry) => Promise<void>
  onRoll?: (formula: string, label: string) => void
}

export default function CharacterSheetModal({
  character,
  system,
  isGM: _isGM = false,
  canEdit = true,
  onClose,
  onSave,
  onRoll
}: CharacterSheetModalProps): React.JSX.Element {
  // Configuração do layout definida no sistema RPG
  const sheetLayout: SheetLayoutConfig = useMemo(() => {
    return (
      system?.structure?.sheetLayout ?? {
        type: 'hybrid',
        pages: [],
        pins: [],
        modularSections: [
          { id: 'inventory', title: 'Inventário & Itens', contentType: 'item', enabled: true },
          { id: 'spells', title: 'Grimório de Magias', contentType: 'spell', enabled: true },
          { id: 'features', title: 'Habilidades & Talentos', contentType: 'feat', enabled: true },
          { id: 'notes', title: 'Biografia & Anotações', enabled: true }
        ]
      }
    )
  }, [system])

  // Inicializa dados da ficha
  const initialData: CharacterSheetData = useMemo(() => {
    const raw = character.sheet_data || {}
    const attributes = (raw.attributes as Record<string, string | number | boolean>) || {}
    const lists = (raw.lists as Record<string, DynamicListItem[]>) || {}
    const notes = typeof raw.notes === 'string' ? raw.notes : ''

    // Se for formato antigo plano (ex: { hp: 20 }), migra suavemente para attributes
    Object.keys(raw).forEach((k) => {
      if (k !== 'attributes' && k !== 'lists' && k !== 'notes') {
        const val = raw[k]
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          if (attributes[k] === undefined) attributes[k] = val
        }
      }
    })

    return { attributes, lists, notes }
  }, [character])

  const [attributes, setAttributes] = useState<Record<string, string | number | boolean>>(
    initialData.attributes
  )
  const [lists, setLists] = useState<Record<string, DynamicListItem[]>>(initialData.lists)
  const [characterName, setCharacterName] = useState(character.name)
  const [characterNotes, setCharacterNotes] = useState(initialData.notes || '')

  const [activeTab, setActiveTab] = useState<string>('sheet')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [zoom, setZoom] = useState<number>(1.0)
  const [isSaving, setIsSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  const pages = sheetLayout.pages || []
  const pins = sheetLayout.pins || []
  const modularSections = (sheetLayout.modularSections || []).filter((s) => s.enabled)

  // Salvar Ficha
  const handleSave = async (): Promise<void> => {
    if (!canEdit) return
    setIsSaving(true)

    const updatedSheetData: CharacterSheetData = {
      attributes,
      lists,
      notes: characterNotes
    }

    const updatedChar: CharacterEntry = {
      ...character,
      name: characterName.trim() || character.name,
      sheet_data: updatedSheetData as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString()
    }

    try {
      if (onSave) {
        await onSave(updatedChar)
      } else {
        await window.api.characters.save({
          id: character.id,
          campaign_id: character.campaign_id,
          user_id: character.user_id,
          name: updatedChar.name,
          avatar_url: character.avatar_url,
          role: character.role,
          sheet_data: updatedSheetData
        })
      }

      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 2000)
    } catch (err) {
      console.error('Erro ao salvar ficha:', err)
      alert('Erro ao salvar ficha.')
    } finally {
      setIsSaving(false)
    }
  }

  // Modificar um atributo fixo (vindo do overlay ou cabeçalho)
  const handleUpdateAttribute = (key: string, value: string | number | boolean): void => {
    setAttributes((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  // Modificar itens de uma lista modular
  const handleUpdateList = (sectionId: string, newItems: DynamicListItem[]): void => {
    setLists((prev) => ({
      ...prev,
      [sectionId]: newItems
    }))
  }

  // Rolar teste / atributo com d20
  const handleRollField = (pin: SheetLayoutPin, value: string | number | boolean): void => {
    const num = Number(value) || 0
    const sign = num >= 0 ? `+${num}` : `${num}`
    const formula = `1d20${sign}`
    onRoll?.(formula, `Teste de ${pin.label || pin.key}`)
  }

  // Atributos de atalho para o topo (HP, CA, Nível)
  const hpCurrent = Number(attributes['hp_current'] ?? attributes['hp'] ?? 10)
  const hpMax = Number(attributes['hp_max'] ?? 10)
  const armorClass = Number(attributes['armor_class'] ?? attributes['ac'] ?? 10)
  const charLevel = Number(attributes['level'] ?? 1)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-6xl h-[92vh] bg-vtt-dark border border-neutral-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-vtt-light">
        {/* ── CABEÇALHO DA FICHA ── */}
        <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-b border-neutral-800 p-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            {/* Avatar do Personagem */}
            <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 shadow">
              {character.avatar_url ? (
                <img
                  src={character.avatar_url}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-vtt-golden" />
              )}
            </div>

            {/* Nome e Role */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled={!canEdit}
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-vtt-golden text-lg font-bold font-cinzel text-white outline-none px-1 transition-colors"
                />
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-vtt-golden border border-neutral-700">
                  {character.role === 'pc' ? 'Jogador' : character.role === 'npc' ? 'NPC' : 'Monstro'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                <span>Sistema: <strong className="text-neutral-200">{system?.name || 'Personalizado'}</strong></span>
                <span>• Nível: <strong className="text-vtt-golden">{charLevel}</strong></span>
              </div>
            </div>
          </div>

          {/* Mini Status Cards (PV e CA) */}
          <div className="flex items-center gap-3">
            {/* Pontos de Vida (HP) */}
            <div className="flex items-center gap-2 bg-neutral-900/90 border border-red-900/40 px-3 py-1.5 rounded-xl shadow-sm">
              <Heart className="w-4 h-4 text-red-500 fill-red-500/20" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-red-400 font-bold">
                  Pontos de Vida
                </span>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <input
                    type="number"
                    value={hpCurrent}
                    onChange={(e) => handleUpdateAttribute('hp_current', Number(e.target.value) || 0)}
                    className="w-10 bg-transparent text-white font-bold text-center border-b border-neutral-700 focus:border-red-500 outline-none"
                  />
                  <span className="text-neutral-500">/</span>
                  <input
                    type="number"
                    value={hpMax}
                    onChange={(e) => handleUpdateAttribute('hp_max', Number(e.target.value) || 0)}
                    className="w-10 bg-transparent text-neutral-400 text-center border-b border-transparent focus:border-neutral-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Classe de Armadura (CA) */}
            <div className="flex items-center gap-2 bg-neutral-900/90 border border-amber-900/40 px-3 py-1.5 rounded-xl shadow-sm">
              <Shield className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold">CA</span>
                <input
                  type="number"
                  value={armorClass}
                  onChange={(e) => handleUpdateAttribute('armor_class', Number(e.target.value) || 0)}
                  className="w-8 bg-transparent text-white font-bold text-center font-mono border-b border-neutral-700 focus:border-amber-500 outline-none text-xs"
                />
              </div>
            </div>

            {/* Botão de Salvar & Fechar */}
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
              {canEdit && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-vtt-golden text-neutral-950 hover:bg-[#FBE8A6] transition-colors cursor-pointer shadow"
                >
                  {savedToast ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-900" />
                      <span>Salvo!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Fechar ficha"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── BARRA DE ABAS DA FICHA (HÍBRIDA) ── */}
        <div className="bg-neutral-950 border-b border-neutral-800 px-4 flex items-center justify-between shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1 py-1.5">
            {/* Aba da Ficha Visual (Backdrop PDF / Imagem) */}
            <button
              type="button"
              onClick={() => setActiveTab('sheet')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'sheet'
                  ? 'bg-neutral-800 text-vtt-golden shadow border border-vtt-golden/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Scroll className="w-4 h-4" />
              <span>Ficha Visual</span>
              {pages.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                  {pages.length}p
                </span>
              )}
            </button>

            {/* Abas Modulares Dinâmicas */}
            {modularSections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveTab(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === sec.id
                    ? 'bg-neutral-800 text-vtt-golden shadow border border-vtt-golden/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                {sec.id === 'inventory' ? (
                  <Package className="w-4 h-4 text-amber-400" />
                ) : sec.id === 'spells' ? (
                  <Sparkles className="w-4 h-4 text-purple-400" />
                ) : sec.id === 'features' ? (
                  <Sword className="w-4 h-4 text-blue-400" />
                ) : (
                  <FileText className="w-4 h-4 text-emerald-400" />
                )}
                <span>{sec.title}</span>
                {lists[sec.id]?.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                    {lists[sec.id].length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Controles da Ficha Visual (Páginas e Zoom) */}
          {activeTab === 'sheet' && pages.length > 0 && (
            <div className="flex items-center gap-3 py-1">
              {/* Navegação de Páginas */}
              <div className="flex items-center gap-1 bg-neutral-900 px-2 py-1 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-neutral-200 px-1">
                  Pág {currentPage} / {pages.length}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= pages.length}
                  onClick={() => setCurrentPage((p) => Math.min(pages.length, p + 1))}
                  className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Controles de Zoom */}
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
                  className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-neutral-300 w-9 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.5, z + 0.15))}
                  className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1.0)}
                  className="p-1 text-neutral-400 hover:text-white cursor-pointer ml-1"
                >
                  <Maximize className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── CONTEÚDO PRINCIPAL (SCROLLÁVEL) ── */}
        <div className="flex-1 overflow-auto bg-neutral-950/90 p-4 sm:p-6 flex flex-col">
          {/* ABA: FICHA VISUAL INTERATIVA */}
          {activeTab === 'sheet' && (
            <div className="flex-1 flex flex-col items-center justify-start">
              {pages.length > 0 ? (
                <SheetPinOverlay
                  pageImage={pages[currentPage - 1]}
                  pins={pins}
                  currentPage={currentPage}
                  values={attributes}
                  isDesignerMode={false}
                  onChangeValue={handleUpdateAttribute}
                  onRollField={handleRollField}
                  zoom={zoom}
                />
              ) : (
                /* Fallback caso o sistema ainda não tenha feito upload do PDF/Imagem */
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center max-w-md">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-vtt-golden">
                    <Scroll className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">
                      Nenhum layout de ficha em PDF/Imagem configurado
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      O criador deste sistema ainda não configurou um PDF ou imagem de fundo para a ficha visual. Você pode usar as abas modulares acima (Inventário, Magias, etc.) para gerenciar seu personagem normalmente.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABAS MODULARES DINÂMICAS (INVENTÁRIO, MAGIAS, TALENTOS, NOTAS) */}
          {modularSections.map((sec) => {
            if (activeTab !== sec.id) return null

            if (sec.id === 'notes') {
              return (
                <div key={sec.id} className="flex-1 flex flex-col gap-3">
                  <span className="text-xs font-bold text-vtt-golden uppercase tracking-wider">
                    Biografia, Notas e Histórico de Aventura
                  </span>
                  <textarea
                    rows={16}
                    value={characterNotes}
                    onChange={(e) => setCharacterNotes(e.target.value)}
                    placeholder="Escreva a biografia, anotações de sessão, histórico ou detalhes adicionais..."
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-xs text-neutral-200 outline-none focus:border-vtt-golden leading-relaxed resize-none"
                  />
                </div>
              )
            }

            return (
              <DynamicListTab
                key={sec.id}
                sectionId={sec.id}
                title={sec.title}
                contentType={sec.contentType}
                systemId={system?.id}
                items={lists[sec.id] || []}
                onChangeItems={(newItems) => handleUpdateList(sec.id, newItems)}
                onRoll={onRoll}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
