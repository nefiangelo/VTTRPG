import React, { useRef, useState, useCallback, useEffect } from 'react'
import type { SheetLayoutPin } from '../../../../preload/index.d'
import { Trash2, Maximize2, Dices } from 'lucide-react'

interface SheetPinOverlayProps {
  pageImage: string
  pins: SheetLayoutPin[]
  currentPage: number
  values?: Record<string, string | number | boolean>
  isDesignerMode?: boolean
  selectedPinId?: string | null
  onSelectPin?: (id: string | null) => void
  onUpdatePin?: (updated: SheetLayoutPin) => void
  onDeletePin?: (id: string) => void
  onChangeValue?: (key: string, value: string | number | boolean) => void
  onRollField?: (pin: SheetLayoutPin, value: string | number | boolean) => void
  zoom?: number
}

interface DragState {
  type: 'move' | 'resize'
  pinId: string
  startX: number
  startY: number
  initialX: number
  initialY: number
  initialW: number
  initialH: number
}

export default function SheetPinOverlay({
  pageImage,
  pins,
  currentPage,
  values = {},
  isDesignerMode = false,
  selectedPinId = null,
  onSelectPin,
  onUpdatePin,
  onDeletePin,
  onChangeValue,
  onRollField,
  zoom = 1
}: SheetPinOverlayProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)

  // Filtra apenas os pinos que pertencem à página atual
  const currentPagePins = pins.filter((p) => (p.page || 1) === currentPage)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, pin: SheetLayoutPin, mode: 'move' | 'resize') => {
      if (!isDesignerMode) return
      e.stopPropagation()
      e.preventDefault()

      onSelectPin?.(pin.id)

      const container = containerRef.current
      if (!container) return

      setDragState({
        type: mode,
        pinId: pin.id,
        startX: e.clientX,
        startY: e.clientY,
        initialX: pin.x,
        initialY: pin.y,
        initialW: pin.w,
        initialH: pin.h
      })
    },
    [isDesignerMode, onSelectPin]
  )

  useEffect(() => {
    if (!dragState) return

    const handlePointerMove = (e: PointerEvent): void => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const deltaXPercent = ((e.clientX - dragState.startX) / rect.width) * 100
      const deltaYPercent = ((e.clientY - dragState.startY) / rect.height) * 100

      const currentPin = pins.find((p) => p.id === dragState.pinId)
      if (!currentPin) return

      if (dragState.type === 'move') {
        const newX = Math.max(0, Math.min(100 - currentPin.w, dragState.initialX + deltaXPercent))
        const newY = Math.max(0, Math.min(100 - currentPin.h, dragState.initialY + deltaYPercent))

        onUpdatePin?.({
          ...currentPin,
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10
        })
      } else if (dragState.type === 'resize') {
        const newW = Math.max(2, Math.min(100 - currentPin.x, dragState.initialW + deltaXPercent))
        const newH = Math.max(1.5, Math.min(100 - currentPin.y, dragState.initialH + deltaYPercent))

        onUpdatePin?.({
          ...currentPin,
          w: Math.round(newW * 10) / 10,
          h: Math.round(newH * 10) / 10
        })
      }
    }

    const handlePointerUp = (): void => {
      setDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragState, pins, onUpdatePin])

  const baseWidth = Math.round(820 * zoom)

  return (
    <div
      className="relative select-none flex justify-center w-full"
      onClick={() => {
        if (isDesignerMode) onSelectPin?.(null)
      }}
    >
      <div
        ref={containerRef}
        className="relative shadow-2xl bg-white border border-neutral-700 rounded-sm overflow-hidden inline-block transition-all duration-150"
        style={{ width: `${baseWidth}px`, maxWidth: '100%' }}
      >
        {/* Imagem do Background da Ficha */}
        <img
          src={pageImage}
          alt={`Página ${currentPage}`}
          className="block w-full h-auto pointer-events-none select-none"
          draggable={false}
        />

        {/* Overlay dos Campos Pinned */}
        {currentPagePins.map((pin) => {
          const isSelected = isDesignerMode && selectedPinId === pin.id
          const rawValue = values[pin.key]
          const displayValue = rawValue !== undefined && rawValue !== null ? String(rawValue) : ''

          if (isDesignerMode) {
            return (
              <div
                key={pin.id}
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  width: `${pin.w}%`,
                  height: `${pin.h}%`
                }}
                className={`absolute group cursor-move transition-shadow rounded ${
                  isSelected
                    ? 'border-2 border-vtt-golden bg-vtt-golden/25 shadow-lg z-30'
                    : 'border border-blue-500/80 bg-blue-500/15 hover:border-vtt-golden hover:bg-vtt-golden/15 z-10'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectPin?.(pin.id)
                }}
                onPointerDown={(e) => handlePointerDown(e, pin, 'move')}
              >
                {/* Badge com Nome do Campo */}
                <div
                  className={`absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap shadow pointer-events-none ${
                    isSelected
                      ? 'bg-vtt-golden text-neutral-950 ring-1 ring-black/40'
                      : 'bg-neutral-900/90 text-blue-300 border border-neutral-700'
                  }`}
                >
                  {pin.label || pin.key}
                </div>

                {/* Pré-visualização do conteúdo do campo */}
                <div
                  className="w-full h-full flex items-center justify-center p-0.5 overflow-hidden text-neutral-900 font-bold"
                  style={{
                    fontSize: `${pin.fontSize || 13}px`,
                    justifyContent:
                      pin.textAlign === 'left'
                        ? 'flex-start'
                        : pin.textAlign === 'right'
                          ? 'flex-end'
                          : 'center'
                  }}
                >
                  {pin.type === 'checkbox' ? (
                    <div className="w-3.5 h-3.5 rounded border border-neutral-800 bg-neutral-100 flex items-center justify-center text-[9px] text-vtt-red font-bold">
                      ✓
                    </div>
                  ) : (
                    <span className="truncate opacity-75">{pin.label || pin.key}</span>
                  )}
                </div>

                {/* Botões de Ação Rápida quando Selecionado */}
                {isSelected && (
                  <>
                    <button
                      type="button"
                      title="Excluir este campo"
                      className="absolute -top-3 -right-3 p-1 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md cursor-pointer z-40 transition-transform hover:scale-110"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeletePin?.(pin.id)
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    {/* Alça de Redimensionamento no Canto Inferior Direito */}
                    <div
                      title="Redimensionar campo"
                      className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-vtt-golden border border-black rounded-sm cursor-nwse-resize z-40 flex items-center justify-center shadow"
                      onPointerDown={(e) => handlePointerDown(e, pin, 'resize')}
                    >
                      <Maximize2 className="w-2.5 h-2.5 text-neutral-900" />
                    </div>
                  </>
                )}
              </div>
            )
          }

          // MODO JOGADOR / VISUALIZADOR DE FICHA (Inputs interativos funcionais)
          return (
            <div
              key={pin.id}
              style={{
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                width: `${pin.w}%`,
                height: `${pin.h}%`
              }}
              className="absolute group z-10 flex items-center justify-center"
            >
              {pin.type === 'checkbox' ? (
                <label className="w-full h-full flex items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(rawValue)}
                    onChange={(e) => onChangeValue?.(pin.key, e.target.checked)}
                    className="w-4 h-4 accent-vtt-red cursor-pointer rounded border-neutral-700"
                  />
                </label>
              ) : pin.type === 'textarea' ? (
                <textarea
                  value={displayValue}
                  placeholder={pin.label}
                  onChange={(e) => onChangeValue?.(pin.key, e.target.value)}
                  style={{
                    fontSize: `${pin.fontSize || 12}px`,
                    textAlign: pin.textAlign || 'left'
                  }}
                  className="w-full h-full resize-none bg-black/5 hover:bg-black/10 focus:bg-white/95 focus:text-neutral-950 focus:ring-1 focus:ring-vtt-golden rounded p-1 text-neutral-900 font-semibold outline-none transition-colors border border-transparent focus:border-vtt-golden"
                />
              ) : (
                <div className="relative w-full h-full flex items-center">
                  <input
                    type={pin.type === 'number' ? 'number' : 'text'}
                    value={displayValue}
                    placeholder={pin.label}
                    onChange={(e) =>
                      onChangeValue?.(
                        pin.key,
                        pin.type === 'number' ? Number(e.target.value) || 0 : e.target.value
                      )
                    }
                    style={{
                      fontSize: `${pin.fontSize || 14}px`,
                      textAlign: pin.textAlign || 'center'
                    }}
                    className="w-full h-full bg-black/5 hover:bg-black/10 focus:bg-white/95 focus:text-neutral-950 focus:ring-2 focus:ring-vtt-golden/60 rounded px-1 text-neutral-900 font-extrabold outline-none transition-colors border border-transparent focus:border-vtt-golden tracking-tight"
                  />

                  {/* Botão de Rolar Dado no Hover (para modificadores ou fórmulas) */}
                  {onRollField && (pin.type === 'number' || pin.isModifier || pin.formula) && (
                    <button
                      type="button"
                      title={`Rolar teste de ${pin.label || pin.key}`}
                      onClick={() => onRollField(pin, rawValue ?? 0)}
                      className="absolute right-0 top-0 bottom-0 px-1 opacity-0 group-hover:opacity-100 bg-vtt-dark/80 hover:bg-vtt-red text-vtt-golden hover:text-white rounded-r transition-all flex items-center justify-center cursor-pointer shadow"
                    >
                      <Dices className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
