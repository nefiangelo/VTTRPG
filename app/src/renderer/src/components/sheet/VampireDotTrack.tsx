import React from 'react'
import { Dice6 } from 'lucide-react'

interface VampireDotTrackProps {
  label: string
  value: number
  maxDots?: number
  minDots?: number
  canEdit?: boolean
  onChangeValue?: (newValue: number) => void
  onRoll?: (label: string, diceCount: number) => void
  isBuilderMode?: boolean
}

/**
 * Componente oficial de Trilha de Pontos (Dot Track) para Vampiro: A Máscara (VTM / White Wolf)
 * Reproduz fielmente a estética de círculos (● e ○) com 8 posições conforme a ficha oficial.
 */
export default function VampireDotTrack({
  label,
  value,
  maxDots = 8,
  minDots = 0,
  canEdit = true,
  onChangeValue,
  onRoll,
  isBuilderMode = false
}: VampireDotTrackProps): React.JSX.Element {
  const currentVal = Math.max(minDots, Math.min(maxDots, typeof value === 'number' ? value : Number(value) || minDots))

  const handleDotClick = (dotIndex: number): void => {
    if (!canEdit && !isBuilderMode) return
    if (!onChangeValue) return

    // Se clicar no ponto atual ativo, reduz em 1 (ou volta para minDots)
    if (dotIndex === currentVal) {
      const next = currentVal > minDots ? currentVal - 1 : minDots
      onChangeValue(next)
    } else {
      onChangeValue(dotIndex)
    }
  }

  const handleRollClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (!onRoll) return
    const pool = Math.max(1, currentVal)
    onRoll(label, pool)
  }

  return (
    <div className="flex items-center justify-between gap-1 w-full py-0.5 select-none group/trait">
      {/* Rótulo da Característica */}
      <span
        className="text-xs font-serif font-bold text-black truncate shrink-0 max-w-[120px] sm:max-w-[150px]"
        title={label}
      >
        {label}
      </span>

      {/* Linha guia pontilhada / tracejada até os círculos (conforme a ficha impressa) */}
      <div className="flex-1 border-b border-dotted border-black/40 mx-2 self-end mb-1" />

      {/* Trilha de 8 círculos interativos (● ● ● ○ ○ ○ ○ ○) */}
      <div className="flex items-center gap-1 shrink-0">
        {Array.from({ length: maxDots }, (_, i) => {
          const dotNumber = i + 1
          const isFilled = dotNumber <= currentVal

          return (
            <button
              key={dotNumber}
              type="button"
              disabled={!canEdit && !isBuilderMode}
              onClick={() => handleDotClick(dotNumber)}
              className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer focus:outline-none ${
                isFilled
                  ? 'bg-black border border-black shadow-sm hover:scale-110'
                  : 'bg-white border-[1.5px] border-black hover:bg-neutral-300 hover:scale-110'
              } disabled:cursor-default`}
              title={`${label}: ${dotNumber} ponto(s)`}
            />
          )
        })}

        {/* Botão de Rolagem d10 da Parada de Dados (Storyteller System) */}
        {onRoll && (
          <button
            type="button"
            onClick={handleRollClick}
            className="ml-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-none bg-black text-white hover:bg-neutral-800 text-[10px] font-serif font-black uppercase transition-colors cursor-pointer shrink-0 shadow-sm"
            title={`Rolar parada de dados de ${label} (${Math.max(1, currentVal)}d10, dif 6)`}
          >
            <Dice6 className="w-2.5 h-2.5" />
            <span>{Math.max(1, currentVal)}d10</span>
          </button>
        )}
      </div>
    </div>
  )
}
