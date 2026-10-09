import React from 'react'
import type { SheetFieldWidth } from '../../../preload/index.d'

export const WIDTH_OPTIONS: { value: SheetFieldWidth; label: string; desc: string; colClass: string; percent: number }[] = [
  { value: '1/4', label: '1/4 (25%)', desc: 'Compacto', colClass: 'col-span-12 sm:col-span-6 md:col-span-3', percent: 25 },
  { value: '1/3', label: '1/3 (33%)', desc: 'Pequeno', colClass: 'col-span-12 sm:col-span-6 md:col-span-4', percent: 33.333 },
  { value: '1/2', label: '1/2 (50%)', desc: 'Médio', colClass: 'col-span-12 sm:col-span-6', percent: 50 },
  { value: '2/3', label: '2/3 (67%)', desc: 'Médio-Largo', colClass: 'col-span-12 md:col-span-8', percent: 66.666 },
  { value: '3/4', label: '3/4 (75%)', desc: 'Largo', colClass: 'col-span-12 md:col-span-9', percent: 75 },
  { value: 'full', label: '100% (Cheio)', desc: 'Largura total', colClass: 'col-span-12', percent: 100 }
]

export function parseWidthPercent(width?: SheetFieldWidth | string, customWidth?: number): number {
  if (typeof customWidth === 'number' && !isNaN(customWidth) && customWidth >= 10 && customWidth <= 100) {
    return Math.round(customWidth)
  }
  if (!width) return 100
  if (width === '1/4') return 25
  if (width === '1/3') return 33.333
  if (width === '1/2') return 50
  if (width === '2/3') return 66.666
  if (width === '3/4') return 75
  if (width === 'full') return 100
  const parsed = parseFloat(width)
  if (!isNaN(parsed) && parsed >= 10 && parsed <= 100) return parsed
  return 100
}

/**
 * Retorna o estilo CSS flexível para qualquer largura e altura de campo
 * Deduz a proporção correta do espaçamento horizontal (gap: 12px)
 */
export function getFieldStyle(
  width?: SheetFieldWidth | string,
  customWidth?: number,
  customHeight?: number
): React.CSSProperties {
  const percent = parseWidthPercent(width, customWidth)
  const style: React.CSSProperties = {
    boxSizing: 'border-box'
  }

  if (typeof customHeight === 'number' && customHeight > 0) {
    style.minHeight = `${Math.round(customHeight)}px`
  }

  if (percent >= 98) {
    return {
      ...style,
      width: '100%',
      flex: '0 0 100%',
      maxWidth: '100%',
      minWidth: 0
    }
  }

  const gapPx = 12
  const deduction = ((100 - percent) / 100) * gapPx + 1
  const calcWidth = `calc(${percent}% - ${deduction.toFixed(2)}px)`

  return {
    ...style,
    width: calcWidth,
    flex: `0 0 ${calcWidth}`,
    maxWidth: calcWidth,
    minWidth: 0
  }
}

/**
 * Retorna o estilo CSS flexível para qualquer largura e altura de seção (permite seções lado a lado perfeitamente)
 * Deduz a proporção correta do espaçamento horizontal (gap: 16px) com margem para subpixel rendering
 */
export function getSectionStyle(
  width?: SheetFieldWidth | string,
  customWidth?: number,
  customHeight?: number
): React.CSSProperties {
  const percent = parseWidthPercent(width, customWidth)
  const style: React.CSSProperties = {
    boxSizing: 'border-box'
  }

  if (typeof customHeight === 'number' && customHeight > 0) {
    style.minHeight = `${Math.round(customHeight)}px`
  }

  if (percent >= 98) {
    return {
      ...style,
      width: '100%',
      flex: '0 0 100%',
      maxWidth: '100%',
      minWidth: 0
    }
  }

  const gapPx = 16
  // Para 50%: ((100 - 50) / 100) * 16 = 8px.
  // Adiciona margem de 1.5px: dedução de 9.5px.
  // 2 seções de 50%: (50% - 9.5px) + 16px + (50% - 9.5px) = 100% - 3px <= 100%.
  // Ficam perfeitamente lado a lado sem quebra acidental por subpixels!
  const deduction = ((100 - percent) / 100) * gapPx + 1.5
  const calcWidth = `calc(${percent}% - ${deduction.toFixed(2)}px)`

  return {
    ...style,
    width: calcWidth,
    flex: `0 0 ${calcWidth}`,
    maxWidth: calcWidth,
    minWidth: 0
  }
}

export function getWidthColClass(width: SheetFieldWidth): string {
  const match = WIDTH_OPTIONS.find((w) => w.value === width)
  return match ? match.colClass : 'col-span-12 sm:col-span-6'
}
