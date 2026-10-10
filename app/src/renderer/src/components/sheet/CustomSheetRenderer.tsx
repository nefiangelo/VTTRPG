import React, { useState, useMemo } from 'react'
import type {
  SheetCustomSection,
  RpgSystemFull,
  CanvasSheetLayout,
  CanvasElement
} from '../../../../preload/index.d'
import {
  convertSectionsToCanvas,
  createDnd5eCanvasPreset
} from '../../utils/sheetLayoutUtils'
import { Dices } from 'lucide-react'

interface CustomSheetRendererProps {
  sections: SheetCustomSection[]
  system: RpgSystemFull | null
  values: Record<string, string | number | boolean>
  canEdit: boolean
  onChangeValue: (key: string, value: string | number | boolean) => void
  onRollField?: (label: string, value: string | number | boolean, formula?: string) => void
  theme?: string
}

export default function CustomSheetRenderer({
  sections,
  system,
  values,
  canEdit,
  onChangeValue,
  onRollField,
  theme: _theme
}: CustomSheetRendererProps): React.JSX.Element {
  // Escala de visualização da ficha (Zoom para caber na tela do jogador)
  const [zoom, setZoom] = useState<number>(1)

  // Obtém o layout livre em canvas do sistema, ou converte as seções existentes
  const canvasLayout: CanvasSheetLayout = useMemo(() => {
    if (system?.structure?.sheetLayout?.canvasLayout?.elements?.length) {
      return system.structure.sheetLayout.canvasLayout
    }
    if (sections && sections.length > 0) {
      return convertSectionsToCanvas(sections)
    }
    return createDnd5eCanvasPreset()
  }, [system?.structure?.sheetLayout?.canvasLayout, sections])

  // Separação de Frames e elementos avulsos
  const frames = useMemo(() => {
    return canvasLayout.elements.filter((e) => e.type === 'frame' && !e.parentId)
  }, [canvasLayout.elements])

  const looseElements = useMemo(() => {
    return canvasLayout.elements.filter((e) => e.type !== 'frame' && !e.parentId)
  }, [canvasLayout.elements])

  return (
    <div className="flex flex-col w-full h-full min-h-[600px] select-none relative bg-neutral-950/60 rounded-xl overflow-hidden">
      {/* ── BARRA SUPERIOR DE CONTROLE DE ESCALA / ZOOM ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800/80 bg-neutral-900/70 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-vtt-golden uppercase tracking-wider font-cinzel">
            {system?.name || 'Ficha de Personagem'}
          </span>
          <span className="text-[11px] font-mono text-neutral-500">
            • {canvasLayout.width} × {canvasLayout.height} px
          </span>
        </div>

        {/* Controles de Escala / Zoom da Ficha */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800/80 px-2 py-1 rounded-lg">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
            className="hover:text-white font-mono px-1.5 py-0.5 rounded hover:bg-neutral-700/60"
            title="Reduzir Tamanho"
          >
            -
          </button>
          <span className="font-mono text-[11px] min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))))}
            className="hover:text-white font-mono px-1.5 py-0.5 rounded hover:bg-neutral-700/60"
            title="Aumentar Tamanho"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="text-[10px] text-neutral-400 hover:text-vtt-golden ml-1 border-l border-neutral-700 pl-1.5 font-medium"
            title="Restaurar tamanho padrão 100%"
          >
            Padrão
          </button>
        </div>
      </div>

      {/* ── ARTBOARD LIVRE DA FICHA DO PERSONAGEM (SCROLLÁVEL) ── */}
      <div
        className="flex-1 overflow-auto p-8 flex justify-center items-start bg-neutral-950"
        style={{
          backgroundImage: `radial-gradient(#26262e 1.5px, transparent 1.5px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`
        }}
      >
        <div
          className="relative bg-neutral-900/90 rounded-2xl border border-neutral-800/90 shadow-[0_25px_60px_rgba(0,0,0,0.85)] origin-top transition-transform"
          style={{
            width: canvasLayout.width,
            height: canvasLayout.height,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center'
          }}
        >
          {/* 1. FRAMES COM SEUS CAMPOS FILHOS */}
          {frames.map((frame) => {
            const children = canvasLayout.elements.filter((e) => e.parentId === frame.id)

            return (
              <div
                key={frame.id}
                className="absolute transition-all overflow-hidden"
                style={{
                  left: frame.x,
                  top: frame.y,
                  width: frame.width,
                  height: frame.height,
                  backgroundColor: frame.backgroundColor || 'rgba(23, 23, 28, 0.9)',
                  borderColor: frame.borderColor || '#374151',
                  borderWidth: frame.borderWidth ?? 1,
                  borderRadius: frame.borderRadius ?? 12,
                  borderStyle: 'solid'
                }}
              >
                {/* Cabeçalho do Frame */}
                {frame.showHeader !== false && (
                  <div className="px-4 py-2.5 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-950/40">
                    <div>
                      <h4 className="text-xs font-bold text-vtt-golden uppercase tracking-wider font-cinzel">
                        {frame.title || frame.name}
                      </h4>
                      {frame.subtitle && (
                        <p className="text-[10px] text-neutral-400 leading-tight">
                          {frame.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Campos dentro do Frame */}
                {children.map((child) => (
                  <RenderInteractiveElement
                    key={child.id}
                    element={child}
                    values={values}
                    canEdit={canEdit}
                    onChangeValue={onChangeValue}
                    onRollField={onRollField}
                  />
                ))}
              </div>
            )
          })}

          {/* 2. ELEMENTOS SOLTOS NA TELA LIVRE */}
          {looseElements.map((elem) => (
            <RenderInteractiveElement
              key={elem.id}
              element={elem}
              values={values}
              canEdit={canEdit}
              onChangeValue={onChangeValue}
              onRollField={onRollField}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SUB-COMPONENTE: RENDERIZA O ELEMENTO INTERATIVO DA FICHA
───────────────────────────────────────────────────────────── */
interface RenderInteractiveElementProps {
  element: CanvasElement
  values: Record<string, string | number | boolean>
  canEdit: boolean
  onChangeValue: (key: string, value: string | number | boolean) => void
  onRollField?: (label: string, value: string | number | boolean, formula?: string) => void
}

function RenderInteractiveElement({
  element,
  values,
  canEdit,
  onChangeValue,
  onRollField
}: RenderInteractiveElementProps): React.JSX.Element {
  const valKey = element.key || element.id
  const rawValue = values[valKey]
  const currentValue =
    rawValue !== undefined ? rawValue : element.defaultValue !== undefined ? element.defaultValue : ''

  const isNumberStyle = element.inputType === 'number'

  // Para Stat Box (D&D Ability)
  const statKey = element.statKey || element.id
  const rawScore = values[statKey]
  const currentScore =
    rawScore !== undefined
      ? Number(rawScore)
      : element.statScore !== undefined
        ? Number(element.statScore)
        : 10
  const statModifier = Math.floor((currentScore - 10) / 2)
  const modSign = statModifier >= 0 ? `+${statModifier}` : `${statModifier}`

  return (
    <div
      className="absolute"
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height
      }}
    >
      {/* ── 1. CAMPO DE ENTRADA (TEXTO OU NÚMERO) ── */}
      {element.type === 'text_field' && (
        <div className="w-full h-full flex flex-col justify-between bg-neutral-900/90 border border-neutral-700/80 rounded-lg p-1.5 focus-within:border-vtt-golden focus-within:ring-1 focus-within:ring-vtt-golden transition-all">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate px-1">
            {element.label || 'Campo'}
          </span>
          <div className="flex items-center gap-1">
            <input
              type={isNumberStyle ? 'number' : 'text'}
              disabled={!canEdit}
              value={currentValue as string | number}
              onChange={(e) =>
                onChangeValue(valKey, isNumberStyle ? Number(e.target.value) || 0 : e.target.value)
              }
              placeholder={element.placeholder || '...'}
              className={`w-full bg-transparent text-xs text-neutral-100 font-medium px-1 outline-none ${
                isNumberStyle ? 'font-mono text-center font-bold' : ''
              } ${!canEdit ? 'opacity-80' : ''}`}
            />
            {/* Botão de rolagem se for número e possuir fórmula */}
            {isNumberStyle && (
              <button
                type="button"
                onClick={() => {
                  const formula = element.formula || `1d20${Number(currentValue) >= 0 ? `+${currentValue}` : currentValue}`
                  onRollField?.(element.label || valKey, currentValue, formula)
                }}
                className="text-neutral-400 hover:text-vtt-golden p-1 rounded hover:bg-neutral-800 transition-colors"
                title={`Rolar ${element.label || valKey}`}
              >
                <Dices className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 2. RÓTULO ESTÁTICO (LABEL) ── */}
      {element.type === 'label' && (
        <div
          className={`w-full h-full flex items-center overflow-hidden ${
            element.fontFamily === 'cinzel' ? 'font-cinzel' : ''
          }`}
          style={{
            fontSize: `${element.fontSize || 16}px`,
            color: element.textColor || '#E9D180',
            fontWeight: element.fontWeight || 'bold',
            justifyContent:
              element.textAlign === 'center'
                ? 'center'
                : element.textAlign === 'right'
                  ? 'flex-end'
                  : 'flex-start'
          }}
        >
          <span className="truncate">{element.textContent || 'Texto de Exibição'}</span>
        </div>
      )}

      {/* ── 3. BOX DE ATRIBUTO CLÁSSICO D&D (STAT) ── */}
      {element.type === 'stat' && (
        <div className="w-full h-full flex flex-col items-center justify-between bg-neutral-900/95 border border-neutral-700/90 rounded-xl p-1.5 text-center shadow-lg group hover:border-vtt-golden transition-colors relative">
          <span className="text-[10px] font-bold text-vtt-golden uppercase tracking-wider font-cinzel truncate w-full">
            {element.statLabel || 'FOR'}
          </span>

          {element.showModifier !== false && (
            <button
              type="button"
              onClick={() => {
                const formula = `1d20${statModifier >= 0 ? `+${statModifier}` : statModifier}`
                onRollField?.(element.statLabel || statKey, statModifier, formula)
              }}
              className="text-base font-black text-white font-mono hover:text-vtt-golden hover:scale-110 transition-transform cursor-pointer"
              title={`Rolar teste de ${element.statLabel || statKey} (1d20${modSign})`}
            >
              {modSign}
            </button>
          )}

          <div className="w-full flex items-center justify-center">
            {canEdit ? (
              <input
                type="number"
                value={currentScore}
                onChange={(e) => onChangeValue(statKey, Number(e.target.value) || 10)}
                className="w-10 bg-neutral-800 rounded text-center text-xs text-neutral-300 font-mono py-0.5 border border-neutral-700 outline-none focus:border-vtt-golden"
              />
            ) : (
              <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded-full border border-neutral-700">
                {currentScore}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 4. ÁREA DE TEXTO MULTILINHA (TEXTAREA) ── */}
      {element.type === 'textarea' && (
        <div className="w-full h-full flex flex-col bg-neutral-900/90 border border-neutral-700/80 rounded-lg p-2 focus-within:border-vtt-golden transition-colors">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 truncate">
            {element.label || 'Anotações'}
          </span>
          <textarea
            disabled={!canEdit}
            value={currentValue as string}
            onChange={(e) => onChangeValue(valKey, e.target.value)}
            placeholder={element.placeholder || '...'}
            className="flex-1 w-full bg-transparent text-xs text-neutral-200 outline-none resize-none"
          />
        </div>
      )}

      {/* ── 5. TRILHA DE PONTOS (DOTS) ── */}
      {element.type === 'dots' && (
        <div className="w-full h-full flex flex-col justify-between bg-neutral-900/90 border border-neutral-700/80 rounded-lg p-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate">
            {element.label || 'Pontos'}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from({ length: element.maxDots || 5 }).map((_, i) => {
              const currentFilled = Number(currentValue) || 0
              const isFilled = i < currentFilled
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => {
                    if (!canEdit) return
                    const nextVal = isFilled && i === currentFilled - 1 ? i : i + 1
                    onChangeValue(valKey, nextVal)
                  }}
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    isFilled
                      ? 'bg-vtt-golden border-vtt-golden shadow-[0_0_8px_rgba(233,209,128,0.5)]'
                      : 'bg-neutral-800 border-neutral-600 hover:border-neutral-400'
                  }`}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* ── 6. MARCADOR / CHECKBOX ── */}
      {element.type === 'checkbox' && (
        <label className="w-full h-full flex items-center gap-2 bg-neutral-900/90 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-neutral-500 transition-colors">
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={Boolean(currentValue)}
            onChange={(e) => onChangeValue(valKey, e.target.checked)}
            className="rounded accent-vtt-golden w-4 h-4"
          />
          <span className="text-xs text-neutral-200 font-medium truncate">
            {element.label || 'Opção'}
          </span>
        </label>
      )}

      {/* ── 7. DIVISOR / LINHA ── */}
      {element.type === 'divider' && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full h-[2px] bg-neutral-700 rounded-full" />
        </div>
      )}
    </div>
  )
}
