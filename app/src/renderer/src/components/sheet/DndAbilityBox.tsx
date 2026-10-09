import React from 'react'
import { Dice5 } from 'lucide-react'

interface DndAbilityBoxProps {
  label: string
  score: number | string
  canEdit?: boolean
  onChangeScore?: (newScore: number) => void
  onRoll?: (label: string, modifier: number) => void
  isBuilderMode?: boolean
}

export function calcDndModifier(score: number | string): number {
  const num = typeof score === 'number' ? score : parseInt(String(score), 10)
  if (isNaN(num)) return 0
  return Math.floor((num - 10) / 2)
}

export function formatDndModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

/**
 * Caixa oficial de Atributo de D&D 5e / 2024
 * Apresenta o nome do atributo no topo, o valor base grande no centro e
 * a cápsula oval com o modificador calculado (+3) na base, clicável para rolar d20.
 */
export default function DndAbilityBox({
  label,
  score,
  canEdit = true,
  onChangeScore,
  onRoll,
  isBuilderMode = false
}: DndAbilityBoxProps): React.JSX.Element {
  const numScore = typeof score === 'number' ? score : parseInt(String(score), 10) || 10
  const modifier = calcDndModifier(numScore)
  const modString = formatDndModifier(modifier)

  const handleRollClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (!onRoll) return
    onRoll(label, modifier)
  }

  return (
    <div className="flex flex-col items-center justify-between bg-[#fcfbf7] border-2 border-stone-400 rounded-lg p-2.5 shadow-sm hover:border-stone-600 transition-all text-center relative group/box">
      {/* Moldura dupla sutil interna */}
      <div className="absolute inset-1 pointer-events-none border border-stone-300/80 rounded" />

      {/* Rótulo Superior (Small Caps Espaçado) */}
      <span
        className="text-[10px] font-bold font-sans tracking-[0.2em] text-stone-700 uppercase truncate max-w-full px-1 select-none z-10"
        title={label}
      >
        {label}
      </span>

      {/* Valor do Atributo no Centro */}
      <div className="my-1 z-10">
        {canEdit || isBuilderMode ? (
          <input
            type="number"
            value={numScore}
            onChange={(e) => {
              const val = e.target.value === '' ? 10 : Number(e.target.value)
              onChangeScore?.(val)
            }}
            className="w-14 text-center font-serif text-2xl font-black text-stone-900 bg-transparent outline-none focus:ring-1 focus:ring-stone-400 rounded transition-all"
            title={`Valor base de ${label}`}
          />
        ) : (
          <span className="font-serif text-2xl font-black text-stone-900">{numScore}</span>
        )}
      </div>

      {/* Cápsula Oval Inferior com o Modificador (+3) e Botão de Rolagem d20 */}
      <button
        type="button"
        onClick={handleRollClick}
        className="z-10 flex items-center justify-center gap-1 px-3 py-0.5 rounded-full bg-stone-200 hover:bg-stone-300 border border-stone-400 text-stone-900 shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95"
        title={`Rolar teste de ${label} com d20 (${modString})`}
      >
        <Dice5 className="w-3 h-3 text-stone-700 shrink-0" />
        <span className="font-serif font-black text-xs">{modString}</span>
      </button>
    </div>
  )
}
