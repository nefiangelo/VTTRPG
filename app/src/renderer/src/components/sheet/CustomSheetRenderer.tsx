import React, { useState, useEffect } from 'react'
import type {
  SheetCustomSection,
  SheetCustomField,
  RpgSystemFull,
  SystemContentEntry,
  ContentType
} from '../../../../preload/index.d'
import { getWidthColClass } from '../../utils/sheetLayoutUtils'
import { Dice5 } from 'lucide-react'

interface CustomSheetRendererProps {
  sections: SheetCustomSection[]
  system: RpgSystemFull | null
  values: Record<string, string | number | boolean>
  canEdit: boolean
  onChangeValue: (key: string, value: string | number | boolean) => void
  onRollField?: (label: string, value: string | number | boolean, formula?: string) => void
}

const DEFAULT_REFERENCE_SUGGESTIONS: Record<string, string[]> = {
  class: [
    'Bárbaro',
    'Bardo',
    'Bruxo',
    'Clérigo',
    'Druida',
    'Feiticeiro',
    'Guerreiro',
    'Ladino',
    'Mago',
    'Monge',
    'Paladino',
    'Patrulheiro'
  ],
  race: [
    'Humano',
    'Elfo',
    'Anão',
    'Halfling',
    'Draconato',
    'Gnomo',
    'Meio-Elfo',
    'Meio-Orc',
    'Tiefling',
    'Golias',
    'Aasimar'
  ],
  subclass: [
    'Campeão',
    'Mestre de Batalha',
    'Evocador',
    'Assassino',
    'Ladrão',
    'Devoção',
    'Vingança',
    'Vida',
    'Guerra'
  ],
  background: [
    'Acólito',
    'Artesão de Guilda',
    'Charlatão',
    'Criminoso',
    'Eremita',
    'Forasteiro',
    'Herói do Povo',
    'Marinheiro',
    'Nobre',
    'Órfão',
    'Sábio',
    'Soldado'
  ]
}

export default function CustomSheetRenderer({
  sections,
  system,
  values,
  canEdit,
  onChangeValue,
  onRollField
}: CustomSheetRendererProps): React.JSX.Element {
  // Cache de opções carregadas do banco para tipos de conteúdo referenciados (classes, raças, etc.)
  const [referenceOptions, setReferenceOptions] = useState<Record<string, string[]>>({})

  useEffect(() => {
    let isMounted = true

    const loadContentOptions = async (): Promise<void> => {
      // Coleta todos os tipos referenciados nas seções
      const refTypes = new Set<ContentType>()
      sections.forEach((sec) => {
        sec.fields.forEach((f) => {
          if (f.type === 'reference' && f.referenceType && f.referenceType !== 'custom') {
            refTypes.add(f.referenceType as ContentType)
          }
        })
      })

      const loaded: Record<string, string[]> = {}

      for (const ct of refTypes) {
        let entries: SystemContentEntry[] = []
        if (system?.id && window.api?.content?.getBySystem) {
          try {
            entries = await window.api.content.getBySystem(system.id, ct)
          } catch (err) {
            console.error(`Erro ao buscar conteúdo para ${ct}:`, err)
          }
        }

        const namesFromDb = entries.map((e) => e.name).filter(Boolean)
        const defaults = DEFAULT_REFERENCE_SUGGESTIONS[ct] || []

        // Une os nomes do banco com os defaults padrão sem duplicados
        const combined = Array.from(new Set([...namesFromDb, ...defaults]))
        loaded[ct] = combined
      }

      if (isMounted) {
        setReferenceOptions(loaded)
      }
    }

    loadContentOptions()

    return () => {
      isMounted = false
    }
  }, [sections, system?.id])

  const handleRoll = (field: SheetCustomField, val: string | number | boolean): void => {
    if (!onRollField) return
    onRollField(field.label || field.key, val, field.formula)
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-10">
      {sections.map((section) => (
        <div
          key={section.id}
          className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 shadow-sm"
        >
          {/* Cabeçalho da Seção */}
          <div className="border-b border-neutral-800/80 pb-2.5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-cinzel tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-vtt-golden shadow-sm" />
                <span>{section.title}</span>
              </h3>
              {section.description && (
                <p className="text-xs text-neutral-400 mt-0.5">{section.description}</p>
              )}
            </div>
          </div>

          {/* Grid de Campos Responsivo */}
          <div className="grid grid-cols-12 gap-3.5 sm:gap-4">
            {section.fields.map((field) => {
              const colClass = getWidthColClass(field.width)
              const rawValue = values[field.key]
              const val =
                rawValue !== undefined
                  ? rawValue
                  : field.defaultValue !== undefined
                    ? field.defaultValue
                    : ''

              const datalistId = `ref-list-${field.id}`
              const options =
                field.type === 'reference'
                  ? referenceOptions[field.referenceType || 'class'] ||
                    DEFAULT_REFERENCE_SUGGESTIONS[field.referenceType || ''] ||
                    []
                  : field.options || []

              return (
                <div
                  key={field.id}
                  className={`${colClass} flex flex-col gap-1.5 bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 sm:p-3.5 focus-within:border-vtt-golden/60 transition-all shadow-inner`}
                >
                  {/* Topo do Campo: Label e Botão de Rolagem */}
                  <div className="flex items-center justify-between gap-1">
                    <label
                      className="text-xs font-bold text-neutral-300 font-cinzel truncate"
                      title={field.label}
                    >
                      {field.label}
                    </label>

                    {field.isModifier && (
                      <button
                        type="button"
                        onClick={() => handleRoll(field, val)}
                        className="flex items-center gap-1 text-[10px] text-vtt-golden bg-vtt-golden/10 hover:bg-vtt-golden/20 px-2 py-0.5 rounded-md border border-vtt-golden/30 transition-colors cursor-pointer shrink-0"
                        title={`Rolar teste com d20 para ${field.label}`}
                      >
                        <Dice5 className="w-3 h-3" />
                        <span>d20</span>
                      </button>
                    )}
                  </div>

                  {/* Input do Campo */}
                  {field.type === 'textarea' ? (
                    <textarea
                      disabled={!canEdit}
                      rows={3}
                      value={String(val)}
                      onChange={(e) => onChangeValue(field.key, e.target.value)}
                      placeholder={field.placeholder || `Digite ${field.label}...`}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-vtt-golden resize-none leading-relaxed disabled:opacity-60"
                    />
                  ) : field.type === 'number' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        disabled={!canEdit}
                        value={val === '' ? '' : Number(val)}
                        onChange={(e) => {
                          const n = e.target.value === '' ? '' : Number(e.target.value)
                          onChangeValue(field.key, n)
                        }}
                        placeholder={field.placeholder || '0'}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-vtt-golden disabled:opacity-60"
                      />
                      {field.isModifier && typeof val === 'number' && (
                        <span className="text-xs font-bold font-mono text-vtt-golden shrink-0 px-2 py-1 rounded bg-black/40 border border-neutral-800">
                          {val >= 0 ? `+${val}` : `${val}`}
                        </span>
                      )}
                    </div>
                  ) : field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2.5 py-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={Boolean(val)}
                        onChange={(e) => onChangeValue(field.key, e.target.checked)}
                        className="w-4 h-4 accent-vtt-golden rounded cursor-pointer disabled:opacity-60"
                      />
                      <span className="text-xs text-neutral-300">
                        {val ? 'Sim / Ativado' : 'Não / Desativado'}
                      </span>
                    </label>
                  ) : field.type === 'reference' ? (
                    <div className="relative">
                      <input
                        list={datalistId}
                        disabled={!canEdit}
                        value={String(val)}
                        onChange={(e) => onChangeValue(field.key, e.target.value)}
                        placeholder={field.placeholder || `Selecione ou digite ${field.label}...`}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-vtt-golden disabled:opacity-60"
                      />
                      <datalist id={datalistId}>
                        {options.map((opt) => (
                          <option key={opt} value={opt} />
                        ))}
                      </datalist>
                    </div>
                  ) : field.type === 'select' ? (
                    <select
                      disabled={!canEdit}
                      value={String(val)}
                      onChange={(e) => onChangeValue(field.key, e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-vtt-golden cursor-pointer disabled:opacity-60"
                    >
                      <option value="">Selecione...</option>
                      {options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={String(val)}
                      onChange={(e) => onChangeValue(field.key, e.target.value)}
                      placeholder={field.placeholder || `Digite ${field.label}...`}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-vtt-golden disabled:opacity-60"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
