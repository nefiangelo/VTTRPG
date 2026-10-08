import React, { useState, useEffect } from 'react'
import type {
  DynamicListItem,
  ContentType,
  SystemContentEntry
} from '../../../../preload/index.d'
import {
  Plus,
  Trash2,
  Search,
  BookOpen,
  Dices,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface DynamicListTabProps {
  sectionId: string
  title: string
  contentType?: ContentType
  systemId?: number
  items: DynamicListItem[]
  onChangeItems: (items: DynamicListItem[]) => void
  onRoll?: (formula: string, label: string) => void
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

export default function DynamicListTab({
  sectionId,
  title,
  contentType,
  systemId,
  items,
  onChangeItems,
  onRoll
}: DynamicListTabProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [showCompendium, setShowCompendium] = useState(false)
  const [compendiumEntries, setCompendiumEntries] = useState<SystemContentEntry[]>([])
  const [compendiumLoading, setCompendiumLoading] = useState(false)
  const [compendiumSearch, setCompendiumSearch] = useState('')

  // Carrega itens do compêndio do sistema quando abre a gaveta
  useEffect(() => {
    if (!showCompendium || !systemId || !contentType) return

    let cancelled = false
    setCompendiumLoading(true)

    window.api.content
      .getBySystem(systemId, contentType)
      .then((entries) => {
        if (!cancelled && entries) {
          setCompendiumEntries(entries)
        }
      })
      .catch((err) => console.error('Erro ao carregar compêndio:', err))
      .finally(() => {
        if (!cancelled) setCompendiumLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [showCompendium, systemId, contentType])

  // Adicionar item em branco
  const handleAddCustomItem = (): void => {
    const newItem: DynamicListItem = {
      id: uid(),
      name: contentType === 'spell' ? 'Nova Magia' : contentType === 'item' ? 'Novo Item' : 'Nova Habilidade',
      description: '',
      quantity: 1,
      weight: 0,
      equipped: false,
      level: contentType === 'spell' ? 1 : undefined
    }

    onChangeItems([...items, newItem])
    setExpandedItemId(newItem.id)
  }

  // Adicionar item do compêndio
  const handleAddFromCompendium = (entry: SystemContentEntry): void => {
    const entryData = entry.data || {}
    const newItem: DynamicListItem = {
      id: uid(),
      name: entry.name,
      description: String(entryData.description || ''),
      quantity: 1,
      weight: Number(entryData.weight) || 0,
      equipped: false,
      level: Number(entryData.level) || 0,
      data: entryData
    }

    onChangeItems([...items, newItem])
    setShowCompendium(false)
    setExpandedItemId(newItem.id)
  }

  // Atualizar propriedades do item
  const handleUpdateItem = (id: string, updates: Partial<DynamicListItem>): void => {
    onChangeItems(
      items.map((it) => (it.id === id ? { ...it, ...updates } : it))
    )
  }

  // Excluir item
  const handleDeleteItem = (id: string): void => {
    onChangeItems(items.filter((it) => it.id !== id))
    if (expandedItemId === id) setExpandedItemId(null)
  }

  // Filtra itens por busca
  const filteredItems = items.filter((it) =>
    it.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const isSpellList = sectionId === 'spells' || contentType === 'spell'
  const isInventoryList = sectionId === 'inventory' || contentType === 'item'

  // Total de peso no inventário
  const totalWeight = isInventoryList
    ? items.reduce((acc, it) => acc + (it.weight || 0) * (it.quantity || 1), 0)
    : 0

  return (
    <div className="flex flex-col gap-4 text-xs text-vtt-light">
      {/* ── BARRA DE CONTROLE & AÇÕES ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 p-3 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Buscar em ${title.toLowerCase()}...`}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-vtt-golden"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Se houver tipo de conteúdo configurado no sistema, permite puxar do compêndio */}
          {contentType && systemId && (
            <button
              type="button"
              onClick={() => setShowCompendium(!showCompendium)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-vtt-golden border border-neutral-700 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Compêndio</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddCustomItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-vtt-golden text-neutral-950 hover:bg-[#FBE8A6] transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
        </div>
      </div>

      {/* ── GAVETA DO COMPÊNDIO DA BIBLIOTECA ── */}
      {showCompendium && (
        <div className="bg-neutral-950 border border-vtt-golden/30 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="font-bold text-vtt-golden flex items-center gap-2 text-xs">
              <Sparkles className="w-4 h-4" />
              Selecionar {title} da Biblioteca do Sistema
            </span>
            <button
              type="button"
              onClick={() => setShowCompendium(false)}
              className="text-neutral-500 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>

          <input
            type="text"
            value={compendiumSearch}
            onChange={(e) => setCompendiumSearch(e.target.value)}
            placeholder="Pesquisar entrada no compêndio..."
            className="bg-neutral-900 border border-neutral-800 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-vtt-golden"
          />

          {compendiumLoading ? (
            <div className="text-center py-6 text-neutral-400">Carregando dados...</div>
          ) : (
            <div className="max-h-56 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {compendiumEntries
                .filter((en) =>
                  en.name.toLowerCase().includes(compendiumSearch.toLowerCase())
                )
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/80 transition-colors"
                  >
                    <div>
                      <span className="font-bold text-neutral-200 block">{entry.name}</span>
                      {entry.data && (
                        <span className="text-[11px] text-neutral-400 line-clamp-1">
                          {String(entry.data.description || entry.data.damage || '')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddFromCompendium(entry)}
                      className="px-2.5 py-1 rounded bg-vtt-golden/10 hover:bg-vtt-golden text-vtt-golden hover:text-neutral-950 border border-vtt-golden/30 font-bold text-xs transition-colors cursor-pointer"
                    >
                      + Pegar
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── LISTA DE ITENS ── */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-neutral-500 bg-neutral-900/30 rounded-xl border border-dashed border-neutral-800">
          Nenhum item adicionado ainda em {title}.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredItems.map((item) => {
            const isExpanded = expandedItemId === item.id
            const itemDamage = String(item.data?.damage || '')

            return (
              <div
                key={item.id}
                className="bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 rounded-xl overflow-hidden transition-all shadow-sm"
              >
                {/* Linha Principal do Item */}
                <div
                  className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      className="text-neutral-400 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedItemId(isExpanded ? null : item.id)
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {/* Checkbox de Equipado para itens de inventário */}
                    {isInventoryList && (
                      <button
                        type="button"
                        title={item.equipped ? 'Equipado' : 'Desequipado'}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUpdateItem(item.id, { equipped: !item.equipped })
                        }}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          item.equipped
                            ? 'text-emerald-400 bg-emerald-950/50'
                            : 'text-neutral-600 hover:text-neutral-400'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <span className="font-bold text-neutral-100 text-sm truncate">
                      {item.name}
                    </span>

                    {/* Nível de Magia se for grimório */}
                    {isSpellList && item.level !== undefined && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-vtt-golden font-mono">
                        {item.level === 0 ? 'Truque' : `${item.level}º Círculo`}
                      </span>
                    )}
                  </div>

                  {/* Detalhes à direita (Quantidade, Peso, Rolagem e Ações) */}
                  <div
                    className="flex items-center gap-3 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isInventoryList && (
                      <div className="flex items-center gap-2 text-neutral-400">
                        <label className="flex items-center gap-1 font-mono">
                          <span>Qtd:</span>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity ?? 1}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                quantity: Math.max(1, Number(e.target.value) || 1)
                              })
                            }
                            className="w-12 bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5 text-center text-xs text-white"
                          />
                        </label>

                        {item.weight !== undefined && (
                          <span className="font-mono text-neutral-500">
                            {((item.weight || 0) * (item.quantity || 1)).toFixed(1)} kg
                          </span>
                        )}
                      </div>
                    )}

                    {/* Botão de Rolagem se houver dano ou fórmula */}
                    {onRoll && (itemDamage || isSpellList) && (
                      <button
                        type="button"
                        title="Rolar dano / teste no chat da sessão"
                        onClick={() =>
                          onRoll(itemDamage || '1d20', `Rolagem de ${item.name}`)
                        }
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/60 hover:bg-vtt-red text-red-300 hover:text-white border border-red-900/50 transition-colors cursor-pointer"
                      >
                        <Dices className="w-3.5 h-3.5" />
                        <span className="font-mono text-[11px] font-bold">
                          {itemDamage || 'Rolar'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      title="Excluir item"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Área Expansível para Edição de Detalhes */}
                {isExpanded && (
                  <div className="p-4 bg-neutral-950/80 border-t border-neutral-800 flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] text-neutral-400 font-semibold uppercase">
                          Nome
                        </span>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                          className="bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-vtt-golden"
                        />
                      </label>

                      {isSpellList && (
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] text-neutral-400 font-semibold uppercase">
                            Círculo / Nível da Magia
                          </span>
                          <select
                            value={item.level ?? 1}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { level: Number(e.target.value) })
                            }
                            className="bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-vtt-golden"
                          >
                            <option value={0}>0 (Truque)</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl}º Círculo
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      {isInventoryList && (
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] text-neutral-400 font-semibold uppercase">
                            Peso Unitário (kg / lb)
                          </span>
                          <input
                            type="number"
                            step="0.1"
                            value={item.weight ?? 0}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { weight: Number(e.target.value) || 0 })
                            }
                            className="bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-vtt-golden"
                          />
                        </label>
                      )}
                    </div>

                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase">
                        Descrição / Efeitos
                      </span>
                      <textarea
                        rows={3}
                        value={item.description || ''}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { description: e.target.value })
                        }
                        placeholder="Detalhes, regras ou efeitos..."
                        className="bg-neutral-900 border border-neutral-800 rounded p-2 text-xs text-white outline-none focus:border-vtt-golden resize-y"
                      />
                    </label>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Rodapé com Estatísticas */}
      {isInventoryList && items.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/80 text-neutral-400 font-mono text-[11px]">
          <span>Total de Itens: <strong className="text-white">{items.length}</strong></span>
          <span>Peso Total: <strong className="text-vtt-golden">{totalWeight.toFixed(1)} kg</strong></span>
        </div>
      )}
    </div>
  )
}
