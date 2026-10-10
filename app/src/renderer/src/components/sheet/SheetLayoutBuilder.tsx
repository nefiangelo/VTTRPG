import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type {
  SheetLayoutConfig,
  CanvasSheetLayout,
  CanvasElement,
  CanvasElementType
} from '../../../../preload/index.d'
import {
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_GRID_SIZE,
  COMPONENT_CATALOG,
  snap,
  slugify,
  createDefaultCanvasElement,
  createDnd5eCanvasPreset,
  convertSectionsToCanvas,
  syncCanvasToSections
} from '../../utils/sheetLayoutUtils'
import {
  Dices,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Layers,
  Settings,
  Sparkles,
  Check
} from 'lucide-react'

interface SheetLayoutBuilderProps {
  sheetLayout?: SheetLayoutConfig
  onChangeLayout: (layout: SheetLayoutConfig) => void
}

type ActiveTool = 'select' | CanvasElementType

type ResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export default function SheetLayoutBuilder({
  sheetLayout,
  onChangeLayout
}: SheetLayoutBuilderProps): React.JSX.Element {
  // Inicializa o layout da tela Canvas livre
  const initialCanvas: CanvasSheetLayout = useMemo(() => {
    if (sheetLayout?.canvasLayout && sheetLayout.canvasLayout.elements.length > 0) {
      return sheetLayout.canvasLayout
    }
    if (sheetLayout?.sections && sheetLayout.sections.length > 0) {
      return convertSectionsToCanvas(sheetLayout.sections)
    }
    return createDnd5eCanvasPreset()
  }, [])

  const [canvas, setCanvas] = useState<CanvasSheetLayout>(initialCanvas)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<ActiveTool>('select')
  const [zoom, setZoom] = useState<number>(1)
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true)
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false)
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({})
  const [showPresetsMenu, setShowPresetsMenu] = useState<boolean>(false)
  const [showLayersPanel] = useState<boolean>(true)

  // Referências para o Canvas e Drag/Resize
  const canvasRef = useRef<HTMLDivElement>(null)
  const [drawingRect, setDrawingRect] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)

  const [draggingItem, setDraggingItem] = useState<{
    id: string
    startX: number
    startY: number
    elemOrigX: number
    elemOrigY: number
    childOffsets?: { id: string; x: number; y: number }[]
  } | null>(null)

  const [resizingItem, setResizingItem] = useState<{
    id: string
    direction: ResizeDirection
    startX: number
    startY: number
    origX: number
    origY: number
    origW: number
    origH: number
  } | null>(null)

  // Atualiza pai com sincronização dupla (canvasLayout + sections legadas sincronizadas)
  const commitCanvas = useCallback(
    (newCanvas: CanvasSheetLayout) => {
      setCanvas(newCanvas)
      const syncedSections = syncCanvasToSections(newCanvas)
      onChangeLayout({
        ...(sheetLayout || { modularSections: [] }),
        type: 'canvas',
        canvasLayout: newCanvas,
        sections: syncedSections
      })
    },
    [onChangeLayout, sheetLayout]
  )

  // Elemento selecionado atualmente
  const selectedElement = useMemo(() => {
    return canvas.elements.find((e) => e.id === selectedId) || null
  }, [canvas.elements, selectedId])

  // Modifica propriedades do elemento selecionado
  const updateElement = useCallback(
    (id: string, patch: Partial<CanvasElement>) => {
      const nextElements = canvas.elements.map((el) => {
        if (el.id !== id) return el
        return { ...el, ...patch }
      })
      commitCanvas({ ...canvas, elements: nextElements })
    },
    [canvas, commitCanvas]
  )

  // Deleta o elemento selecionado e seus filhos
  const deleteElement = useCallback(
    (id: string) => {
      const nextElements = canvas.elements.filter((el) => el.id !== id && el.parentId !== id)
      commitCanvas({ ...canvas, elements: nextElements })
      if (selectedId === id) setSelectedId(null)
    },
    [canvas, commitCanvas, selectedId]
  )

  // Duplica o elemento selecionado
  const duplicateElement = useCallback(
    (id: string) => {
      const target = canvas.elements.find((e) => e.id === id)
      if (!target) return
      const newId = `${target.type}_${Math.random().toString(36).substr(2, 7)}`
      const offset = 24

      const duplicated: CanvasElement = {
        ...target,
        id: newId,
        name: `${target.name} (Cópia)`,
        x: target.x + offset,
        y: target.y + offset,
        key: target.key ? `${target.key}_copia` : undefined
      }

      // Se for um frame, duplica os filhos também
      let childrenCopies: CanvasElement[] = []
      if (target.type === 'frame') {
        const children = canvas.elements.filter((e) => e.parentId === target.id)
        childrenCopies = children.map((c) => ({
          ...c,
          id: `${c.type}_${Math.random().toString(36).substr(2, 7)}`,
          parentId: newId,
          key: c.key ? `${c.key}_copia` : undefined
        }))
      }

      commitCanvas({
        ...canvas,
        elements: [...canvas.elements, duplicated, ...childrenCopies]
      })
      setSelectedId(newId)
    },
    [canvas, commitCanvas]
  )

  // Atalhos de teclado (Figma standard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ignorar se estiver digitando em um input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return
      }

      if (e.key === 'v' || e.key === 'V') setActiveTool('select')
      else if (e.key === 'f' || e.key === 'F') setActiveTool('frame')
      else if (e.key === 't' || e.key === 'T') setActiveTool('text_field')
      else if (e.key === 'l' || e.key === 'L') setActiveTool('label')
      else if (e.key === 's' || e.key === 'S') setActiveTool('stat')
      else if (e.key === 'a' || e.key === 'A') setActiveTool('textarea')
      else if (e.key === 'd' || e.key === 'D') setActiveTool('dots')
      else if (e.key === 'c' || e.key === 'C') setActiveTool('checkbox')
      else if (e.key === 'r' || e.key === 'R') setActiveTool('divider')
      else if (e.key === 'Escape') {
        setActiveTool('select')
        setSelectedId(null)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) deleteElement(selectedId)
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        if (selectedId) duplicateElement(selectedId)
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedId) {
        e.preventDefault()
        const step = e.shiftKey ? 8 : 1
        const elem = canvas.elements.find((el) => el.id === selectedId)
        if (elem && !elem.locked) {
          let nx = elem.x
          let ny = elem.y
          if (e.key === 'ArrowUp') ny -= step
          if (e.key === 'ArrowDown') ny += step
          if (e.key === 'ArrowLeft') nx -= step
          if (e.key === 'ArrowRight') nx += step
          updateElement(selectedId, { x: Math.max(0, nx), y: Math.max(0, ny) })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, canvas.elements, deleteElement, duplicateElement, updateElement])

  // Mouse Handlers para Criação / Drag / Resize
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (isPreviewMode) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const rawX = (e.clientX - rect.left) / zoom
    const rawY = (e.clientY - rect.top) / zoom
    const clickX = snap(rawX, canvas.gridSize, snapEnabled)
    const clickY = snap(rawY, canvas.gridSize, snapEnabled)

    // Se estiver com ferramenta de criação ativa
    if (activeTool !== 'select') {
      setDrawingRect({
        startX: clickX,
        startY: clickY,
        currentX: clickX,
        currentY: clickY
      })
      return
    }

    // Clique no fundo limpa a seleção
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvasBg) {
      setSelectedId(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (isPreviewMode) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const currentX = (e.clientX - rect.left) / zoom
    const currentY = (e.clientY - rect.top) / zoom

    // 1. Desenhando novo elemento por drag
    if (drawingRect) {
      setDrawingRect((prev) => (prev ? { ...prev, currentX, currentY } : null))
      return
    }

    // 2. Redimensionando elemento selecionado
    if (resizingItem) {
      const { id, direction, startX, startY, origX, origY, origW, origH } = resizingItem
      const dx = currentX - startX
      const dy = currentY - startY

      let newX = origX
      let newY = origY
      let newW = origW
      let newH = origH

      if (direction.includes('e')) newW = Math.max(40, origW + dx)
      if (direction.includes('s')) newH = Math.max(24, origH + dy)
      if (direction.includes('w')) {
        const potentialW = origW - dx
        if (potentialW >= 40) {
          newW = potentialW
          newX = origX + dx
        }
      }
      if (direction.includes('n')) {
        const potentialH = origH - dy
        if (potentialH >= 24) {
          newH = potentialH
          newY = origY + dy
        }
      }

      if (snapEnabled) {
        newX = snap(newX, canvas.gridSize)
        newY = snap(newY, canvas.gridSize)
        newW = snap(newW, canvas.gridSize)
        newH = snap(newH, canvas.gridSize)
      }

      updateElement(id, { x: newX, y: newY, width: newW, height: newH })
      return
    }

    // 3. Arrastando elemento na tela livre
    if (draggingItem) {
      const { id, startX, startY, elemOrigX, elemOrigY } = draggingItem
      const dx = currentX - startX
      const dy = currentY - startY

      let nx = elemOrigX + dx
      let ny = elemOrigY + dy

      if (snapEnabled) {
        nx = snap(nx, canvas.gridSize)
        ny = snap(ny, canvas.gridSize)
      }

      updateElement(id, { x: Math.max(0, nx), y: Math.max(0, ny) })
    }
  }

  const handleMouseUp = (): void => {
    // 1. Finaliza criação de novo elemento desenhado
    if (drawingRect && activeTool !== 'select') {
      const { startX, startY, currentX, currentY } = drawingRect
      let x = Math.min(startX, currentX)
      let y = Math.min(startY, currentY)
      let w = Math.abs(currentX - startX)
      let h = Math.abs(currentY - startY)

      const cat = COMPONENT_CATALOG.find((c) => c.type === activeTool)
      // Se deu apenas um clique (sem arrastar muito), usa dimensões padrão
      if (w < 20 || h < 20) {
        w = cat?.defaultWidth || 200
        h = cat?.defaultHeight || 52
      }

      if (snapEnabled) {
        x = snap(x, canvas.gridSize)
        y = snap(y, canvas.gridSize)
        w = snap(w, canvas.gridSize)
        h = snap(h, canvas.gridSize)
      }

      // Se foi criado sobre um Frame existente (e não é um Frame), adiciona como filho do Frame
      let parentFrameId: string | null = null
      let relativeX = x
      let relativeY = y

      if (activeTool !== 'frame') {
        const targetFrame = canvas.elements.find(
          (e) =>
            e.type === 'frame' &&
            !e.parentId &&
            x >= e.x &&
            x <= e.x + e.width &&
            y >= e.y &&
            y <= e.y + e.height
        )

        if (targetFrame) {
          parentFrameId = targetFrame.id
          relativeX = Math.max(8, x - targetFrame.x)
          relativeY = Math.max(38, y - targetFrame.y)
        }
      }

      const newElem = createDefaultCanvasElement(activeTool, relativeX, relativeY, parentFrameId)
      newElem.width = w
      newElem.height = h

      commitCanvas({
        ...canvas,
        elements: [...canvas.elements, newElem]
      })

      setSelectedId(newElem.id)
      setActiveTool('select') // Retorna automaticamente para o ponteiro de seleção (Figma standard)
      setDrawingRect(null)
      return
    }

    // 2. Finaliza drag e verifica se elemento caiu dentro de um Frame
    if (draggingItem) {
      const target = canvas.elements.find((e) => e.id === draggingItem.id)
      if (target && target.type !== 'frame') {
        // Posição absoluta do elemento na tela
        const currentAbsoluteX = target.parentId
          ? (canvas.elements.find((e) => e.id === target.parentId)?.x || 0) + target.x
          : target.x
        const currentAbsoluteY = target.parentId
          ? (canvas.elements.find((e) => e.id === target.parentId)?.y || 0) + target.y
          : target.y

        // Encontra se está dentro de algum Frame
        const dropFrame = canvas.elements.find(
          (e) =>
            e.type === 'frame' &&
            !e.parentId &&
            currentAbsoluteX >= e.x &&
            currentAbsoluteX <= e.x + e.width &&
            currentAbsoluteY >= e.y &&
            currentAbsoluteY <= e.y + e.height
        )

        if (dropFrame) {
          // Converte para coordenadas relativas ao novo Frame
          const relX = snap(currentAbsoluteX - dropFrame.x, canvas.gridSize, snapEnabled)
          const relY = snap(currentAbsoluteY - dropFrame.y, canvas.gridSize, snapEnabled)
          updateElement(target.id, {
            parentId: dropFrame.id,
            x: Math.max(8, relX),
            y: Math.max(36, relY)
          })
        } else if (target.parentId) {
          // Foi arrastado para fora de um Frame para o Canvas livre
          updateElement(target.id, {
            parentId: null,
            x: currentAbsoluteX,
            y: currentAbsoluteY
          })
        }
      }
      setDraggingItem(null)
    }

    if (resizingItem) setResizingItem(null)
    if (drawingRect) setDrawingRect(null)
  }

  // Organização dos elementos: Frames e elementos avulsos
  const frames = useMemo(() => {
    return canvas.elements.filter((e) => e.type === 'frame' && !e.parentId)
  }, [canvas.elements])

  const looseElements = useMemo(() => {
    return canvas.elements.filter((e) => e.type !== 'frame' && !e.parentId)
  }, [canvas.elements])

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[680px] bg-neutral-950 text-neutral-100 select-none overflow-hidden rounded-xl border border-neutral-800 shadow-2xl relative">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP FLOATING FIGMA TOOLBAR
      ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 shadow-[0_12px_32px_rgba(0,0,0,0.7)] backdrop-blur-md">
        {/* Tool: Select / Cursor */}
        <button
          type="button"
          onClick={() => setActiveTool('select')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTool === 'select'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
          }`}
          title="Selecionar / Mover (V)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 3l14 10.5-6.5 1.5 4 7-2.5 1.5-4-7-5 4.5z" />
          </svg>
          <span className="hidden sm:inline">Mover</span>
        </button>

        {/* Tool: Frame (Container) */}
        <button
          type="button"
          onClick={() => setActiveTool('frame')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTool === 'frame'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
          }`}
          title="Quadro / Frame para admitir campos (F)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18M15 3v18M3 9h18M3 15h18" strokeDasharray="2 2" />
          </svg>
          <span className="hidden sm:inline">Frame</span>
        </button>

        {/* Tool: Text Field (Input Text / Number) */}
        <button
          type="button"
          onClick={() => setActiveTool('text_field')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTool === 'text_field'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
          }`}
          title="Campo de Entrada (Texto ou Número) (T)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M7 12h10" />
          </svg>
          <span className="hidden sm:inline">Campo</span>
        </button>

        {/* Tool: Label (Display Text) */}
        <button
          type="button"
          onClick={() => setActiveTool('label')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTool === 'label'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
          }`}
          title="Rótulo / Texto Estático (L)"
        >
          <span className="text-sm font-serif font-black">Tt</span>
          <span className="hidden sm:inline">Texto</span>
        </button>

        {/* Tool: Stat Box (RPG Ability / Mod) */}
        <button
          type="button"
          onClick={() => setActiveTool('stat')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTool === 'stat'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
          }`}
          title="Box de Atributo D&D / RPG (S)"
        >
          <Dices className="w-4 h-4" />
          <span className="hidden sm:inline">Atributo</span>
        </button>

        {/* Tool: Textarea (Multi-line Notes) */}
        <button
          type="button"
          onClick={() => setActiveTool('textarea')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTool === 'textarea'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
          }`}
          title="Área de Texto Multilinha (A)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        </button>

        {/* Tool: Dot Track (VTM / Pips) */}
        <button
          type="button"
          onClick={() => setActiveTool('dots')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTool === 'dots'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
          }`}
          title="Trilha de Pontos / Marcadores (D)"
        >
          <span className="text-xs tracking-tighter">●●●</span>
        </button>

        {/* Tool: Checkbox */}
        <button
          type="button"
          onClick={() => setActiveTool('checkbox')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTool === 'checkbox'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
          }`}
          title="Marcador / Checkbox (C)"
        >
          <Check className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-neutral-700 mx-1" />

        {/* Toggle Snap to Grid */}
        <button
          type="button"
          onClick={() => setSnapEnabled(!snapEnabled)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
            snapEnabled
              ? 'text-vtt-golden bg-vtt-golden/10 border border-vtt-golden/30'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
          title="Encaixe Magnético na Grade (Snap 8px)"
        >
          #{canvas.gridSize}px
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 text-xs text-neutral-400 bg-neutral-800/80 px-2 py-1 rounded-lg">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
            className="hover:text-white font-mono px-1"
            title="Reduzir Zoom"
          >
            -
          </button>
          <span className="font-mono text-[11px] min-w-[34px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(1))))}
            className="hover:text-white font-mono px-1"
            title="Aumentar Zoom"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="text-[10px] text-neutral-400 hover:text-vtt-golden ml-1 border-l border-neutral-700 pl-1"
            title="Restaurar 100%"
          >
            1:1
          </button>
        </div>

        {/* Presets Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPresetsMenu(!showPresetsMenu)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Carregar Modelos / Presets"
          >
            <Sparkles className="w-3.5 h-3.5 text-vtt-golden" />
            <span className="hidden md:inline">Modelos</span>
          </button>

          {showPresetsMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase px-2 py-1">
                Presets de Ficha
              </span>
              <button
                type="button"
                onClick={() => {
                  commitCanvas(createDnd5eCanvasPreset())
                  setShowPresetsMenu(false)
                }}
                className="text-left px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 rounded-lg flex items-center justify-between"
              >
                <span>D&D 5ª Edição Oficial</span>
                <span className="text-[10px] text-vtt-golden font-mono">1000px</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  commitCanvas({
                    width: DEFAULT_CANVAS_WIDTH,
                    height: 1200,
                    elements: [],
                    snapToGrid: true,
                    gridSize: DEFAULT_GRID_SIZE
                  })
                  setShowPresetsMenu(false)
                  setSelectedId(null)
                }}
                className="text-left px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950/30 rounded-lg flex items-center justify-between"
              >
                <span>Tela em Branco (Limpar)</span>
                <span className="text-[10px] text-red-400 font-mono">Vazio</span>
              </button>
            </div>
          )}
        </div>

        {/* Toggle Live Preview vs Design Mode */}
        <button
          type="button"
          onClick={() => {
            setIsPreviewMode(!isPreviewMode)
            setSelectedId(null)
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isPreviewMode
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
          }`}
          title="Alternar entre modo de Edição e Pré-Visualização Interativa"
        >
          {isPreviewMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{isPreviewMode ? 'Testar Ficha' : 'Design'}</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. WORKSPACE: LAYERS (LEFT) | CANVAS (CENTER) | INSPECTOR (RIGHT)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ── PAINEL DA ESQUERDA: CAMADAS / LAYERS (FIGMA STYLE) ── */}
        {showLayersPanel && (
          <aside className="w-64 border-r border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md flex flex-col z-20 shrink-0">
            <div className="p-3 border-b border-neutral-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-vtt-golden" />
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Camadas
                </span>
              </div>
              <span className="text-[11px] font-mono text-neutral-500">
                {canvas.elements.length} itens
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* Frames e seus filhos */}
              {frames.map((frame) => {
                const children = canvas.elements.filter((e) => e.parentId === frame.id)
                const isSelected = selectedId === frame.id

                return (
                  <div key={frame.id} className="space-y-0.5">
                    {/* Frame Item */}
                    <div
                      onClick={() => setSelectedId(frame.id)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors group ${
                        isSelected
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : 'text-neutral-300 hover:bg-neutral-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-vtt-golden font-bold text-[11px]">#</span>
                        <span className="truncate font-medium">{frame.title || frame.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateElement(frame.id, { locked: !frame.locked })
                          }}
                          className={`p-1 rounded hover:text-white ${frame.locked ? 'text-amber-400 opacity-100' : 'text-neutral-500'}`}
                          title={frame.locked ? 'Destravar' : 'Travar'}
                        >
                          🔒
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteElement(frame.id)
                          }}
                          className="p-1 rounded text-neutral-500 hover:text-red-400"
                          title="Excluir Frame"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Children of Frame */}
                    {children.length > 0 && (
                      <div className="pl-4 border-l border-neutral-800 ml-3 space-y-0.5">
                        {children.map((child) => {
                          const isChildSelected = selectedId === child.id
                          return (
                            <div
                              key={child.id}
                              onClick={() => setSelectedId(child.id)}
                              className={`flex items-center justify-between px-2 py-1 rounded text-[11px] cursor-pointer transition-colors group ${
                                isChildSelected
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                  : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-neutral-500 font-mono text-[9px]">
                                  {child.type === 'text_field'
                                    ? 'T'
                                    : child.type === 'stat'
                                      ? 'S'
                                      : child.type === 'label'
                                        ? 'L'
                                        : '•'}
                                </span>
                                <span className="truncate">{child.label || child.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteElement(child.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-500 hover:text-red-400"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Elementos Soltos (Sem Frame pai) */}
              {looseElements.length > 0 && (
                <div className="pt-2 border-t border-neutral-800/80">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase px-2 mb-1 block">
                    Elementos Livres
                  </span>
                  {looseElements.map((elem) => {
                    const isSelected = selectedId === elem.id
                    return (
                      <div
                        key={elem.id}
                        onClick={() => setSelectedId(elem.id)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors group ${
                          isSelected
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                        }`}
                      >
                        <span className="truncate">{elem.label || elem.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteElement(elem.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ── CENTRO: ÁREA DE DESENHO LIVRE (ARTBOARD CANVAS) ── */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`flex-1 overflow-auto bg-neutral-950 p-12 flex justify-center items-start relative ${
            activeTool !== 'select' ? 'cursor-crosshair' : 'cursor-default'
          }`}
          style={{
            backgroundImage: `radial-gradient(#26262e 1.5px, transparent 1.5px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`
          }}
          data-canvas-bg="true"
        >
          {/* ARTBOARD DA FICHA */}
          <div
            className="relative bg-neutral-900/90 rounded-2xl border border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-transform origin-top"
            style={{
              width: canvas.width,
              height: canvas.height,
              transform: `scale(${zoom})`,
              transformOrigin: 'top center'
            }}
          >
            {/* Rótulo superior do Artboard Figma */}
            <div className="absolute -top-7 left-0 flex items-center gap-2 text-xs text-neutral-500 font-mono">
              <span className="font-semibold text-neutral-400">Ficha Livre Canvas</span>
              <span>•</span>
              <span>
                {canvas.width} × {canvas.height} px
              </span>
            </div>

            {/* 1. RENDERIZAÇÃO DOS FRAMES (CONTAINERS) */}
            {frames.map((frame) => {
              const isSelected = selectedId === frame.id && !isPreviewMode
              const children = canvas.elements.filter((e) => e.parentId === frame.id)

              return (
                <div
                  key={frame.id}
                  onClick={(e) => {
                    if (isPreviewMode) return
                    e.stopPropagation()
                    setSelectedId(frame.id)
                  }}
                  onMouseDown={(e) => {
                    if (isPreviewMode || frame.locked) return
                    e.stopPropagation()
                    setSelectedId(frame.id)
                    const rect = canvasRef.current?.getBoundingClientRect()
                    if (!rect) return
                    const currentX = (e.clientX - rect.left) / zoom
                    const currentY = (e.clientY - rect.top) / zoom
                    setDraggingItem({
                      id: frame.id,
                      startX: currentX,
                      startY: currentY,
                      elemOrigX: frame.x,
                      elemOrigY: frame.y
                    })
                  }}
                  className={`absolute transition-shadow ${
                    isSelected
                      ? 'ring-2 ring-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.25)] z-20'
                      : 'hover:border-neutral-600/80'
                  }`}
                  style={{
                    left: frame.x,
                    top: frame.y,
                    width: frame.width,
                    height: frame.height,
                    backgroundColor: frame.backgroundColor || 'rgba(23, 23, 28, 0.85)',
                    borderColor: frame.borderColor || '#374151',
                    borderWidth: frame.borderWidth ?? 1,
                    borderRadius: frame.borderRadius ?? 12,
                    borderStyle: 'solid'
                  }}
                >
                  {/* Cabeçalho do Frame */}
                  {frame.showHeader !== false && (
                    <div className="px-4 py-2.5 border-b border-neutral-800/80 flex items-center justify-between">
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
                      <span className="text-[10px] text-neutral-600 font-mono">
                        {children.length} itens
                      </span>
                    </div>
                  )}

                  {/* Filhos renderizados dentro do Frame (coordenadas relativas ao frame) */}
                  {children.map((child) => (
                    <CanvasElementView
                      key={child.id}
                      element={child}
                      isSelected={selectedId === child.id && !isPreviewMode}
                      isPreviewMode={isPreviewMode}
                      previewValues={previewValues}
                      onChangePreview={(key, val) =>
                        setPreviewValues((prev) => ({ ...prev, [key]: val }))
                      }
                      onSelect={(e) => {
                        if (isPreviewMode) return
                        e.stopPropagation()
                        setSelectedId(child.id)
                      }}
                      onMouseDownDrag={(e) => {
                        if (isPreviewMode || child.locked) return
                        e.stopPropagation()
                        setSelectedId(child.id)
                        const rect = canvasRef.current?.getBoundingClientRect()
                        if (!rect) return
                        const currentX = (e.clientX - rect.left) / zoom
                        const currentY = (e.clientY - rect.top) / zoom
                        setDraggingItem({
                          id: child.id,
                          startX: currentX,
                          startY: currentY,
                          elemOrigX: child.x,
                          elemOrigY: child.y
                        })
                      }}
                      onStartResize={(dir, e) => {
                        e.stopPropagation()
                        const rect = canvasRef.current?.getBoundingClientRect()
                        if (!rect) return
                        setResizingItem({
                          id: child.id,
                          direction: dir,
                          startX: (e.clientX - rect.left) / zoom,
                          startY: (e.clientY - rect.top) / zoom,
                          origX: child.x,
                          origY: child.y,
                          origW: child.width,
                          origH: child.height
                        })
                      }}
                    />
                  ))}

                  {/* Gizmo de Seleção e Redimensionamento do Frame */}
                  {isSelected && (
                    <>
                      <div className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-sky-500 text-white font-mono text-[10px] flex items-center gap-1 shadow">
                        <span>Frame: {frame.title || frame.name}</span>
                        <span>•</span>
                        <span>
                          {frame.width} × {frame.height}
                        </span>
                      </div>
                      {/* 8 Alças de Redimensionamento do Frame */}
                      {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeDirection[]).map(
                        (dir) => (
                          <div
                            key={dir}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              const rect = canvasRef.current?.getBoundingClientRect()
                              if (!rect) return
                              setResizingItem({
                                id: frame.id,
                                direction: dir,
                                startX: (e.clientX - rect.left) / zoom,
                                startY: (e.clientY - rect.top) / zoom,
                                origX: frame.x,
                                origY: frame.y,
                                origW: frame.width,
                                origH: frame.height
                              })
                            }}
                            className={`absolute w-2.5 h-2.5 bg-white border border-sky-500 rounded-sm z-30 ${getHandlePositionClass(
                              dir
                            )} ${getHandleCursorClass(dir)}`}
                          />
                        )
                      )}
                    </>
                  )}
                </div>
              )
            })}

            {/* 2. RENDERIZAÇÃO DOS ELEMENTOS LIVRES (FORA DE FRAMES) */}
            {looseElements.map((elem) => (
              <CanvasElementView
                key={elem.id}
                element={elem}
                isSelected={selectedId === elem.id && !isPreviewMode}
                isPreviewMode={isPreviewMode}
                previewValues={previewValues}
                onChangePreview={(key, val) =>
                  setPreviewValues((prev) => ({ ...prev, [key]: val }))
                }
                onSelect={(e) => {
                  if (isPreviewMode) return
                  e.stopPropagation()
                  setSelectedId(elem.id)
                }}
                onMouseDownDrag={(e) => {
                  if (isPreviewMode || elem.locked) return
                  e.stopPropagation()
                  setSelectedId(elem.id)
                  const rect = canvasRef.current?.getBoundingClientRect()
                  if (!rect) return
                  const currentX = (e.clientX - rect.left) / zoom
                  const currentY = (e.clientY - rect.top) / zoom
                  setDraggingItem({
                    id: elem.id,
                    startX: currentX,
                    startY: currentY,
                    elemOrigX: elem.x,
                    elemOrigY: elem.y
                  })
                }}
                onStartResize={(dir, e) => {
                  e.stopPropagation()
                  const rect = canvasRef.current?.getBoundingClientRect()
                  if (!rect) return
                  setResizingItem({
                    id: elem.id,
                    direction: dir,
                    startX: (e.clientX - rect.left) / zoom,
                    startY: (e.clientY - rect.top) / zoom,
                    origX: elem.x,
                    origY: elem.y,
                    origW: elem.width,
                    origH: elem.height
                  })
                }}
              />
            ))}

            {/* Retângulo dinâmico enquanto desenha com a ferramenta */}
            {drawingRect && (
              <div
                className="absolute border-2 border-dashed border-sky-400 bg-sky-500/20 rounded pointer-events-none z-50 flex items-center justify-center"
                style={{
                  left: Math.min(drawingRect.startX, drawingRect.currentX),
                  top: Math.min(drawingRect.startY, drawingRect.currentY),
                  width: Math.abs(drawingRect.currentX - drawingRect.startX),
                  height: Math.abs(drawingRect.currentY - drawingRect.startY)
                }}
              >
                <span className="text-[10px] text-sky-200 font-mono bg-sky-950/80 px-1 rounded">
                  {Math.round(Math.abs(drawingRect.currentX - drawingRect.startX))} ×{' '}
                  {Math.round(Math.abs(drawingRect.currentY - drawingRect.startY))}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── PAINEL DA DIREITA: INSPETOR DE PROPRIEDADES (FIGMA STYLE) ── */}
        <aside className="w-72 border-l border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md flex flex-col z-20 shrink-0 overflow-y-auto">
          {selectedElement ? (
            <div className="p-4 space-y-4">
              {/* Header do Inspetor */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    {selectedElement.type === 'frame'
                      ? 'Frame'
                      : selectedElement.type === 'text_field'
                        ? 'Campo'
                        : selectedElement.type === 'stat'
                          ? 'Atributo'
                          : selectedElement.type === 'label'
                            ? 'Texto'
                            : selectedElement.type}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => duplicateElement(selectedElement.id)}
                    className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    title="Duplicar (Ctrl+D)"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteElement(selectedElement.id)}
                    className="p-1.5 rounded hover:bg-red-950 text-neutral-400 hover:text-red-400"
                    title="Excluir Elemento (Del)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Transform / Dimensões (X, Y, W, H) */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Posição & Dimensões
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center bg-neutral-800/80 rounded px-2 py-1 border border-neutral-700/60">
                    <span className="text-neutral-500 font-mono w-4">X</span>
                    <input
                      type="number"
                      value={selectedElement.x}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { x: Number(e.target.value) || 0 })
                      }
                      className="w-full bg-transparent outline-none text-right font-mono text-neutral-200"
                    />
                  </div>
                  <div className="flex items-center bg-neutral-800/80 rounded px-2 py-1 border border-neutral-700/60">
                    <span className="text-neutral-500 font-mono w-4">Y</span>
                    <input
                      type="number"
                      value={selectedElement.y}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { y: Number(e.target.value) || 0 })
                      }
                      className="w-full bg-transparent outline-none text-right font-mono text-neutral-200"
                    />
                  </div>
                  <div className="flex items-center bg-neutral-800/80 rounded px-2 py-1 border border-neutral-700/60">
                    <span className="text-neutral-500 font-mono w-4">L</span>
                    <input
                      type="number"
                      value={selectedElement.width}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          width: Math.max(20, Number(e.target.value) || 20)
                        })
                      }
                      className="w-full bg-transparent outline-none text-right font-mono text-neutral-200"
                    />
                  </div>
                  <div className="flex items-center bg-neutral-800/80 rounded px-2 py-1 border border-neutral-700/60">
                    <span className="text-neutral-500 font-mono w-4">A</span>
                    <input
                      type="number"
                      value={selectedElement.height}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          height: Math.max(20, Number(e.target.value) || 20)
                        })
                      }
                      className="w-full bg-transparent outline-none text-right font-mono text-neutral-200"
                    />
                  </div>
                </div>
              </div>

              {/* PROPRIEDADES ESPECÍFICAS DE CADA TIPO */}
              {/* 1. SE FOR FRAME */}
              {selectedElement.type === 'frame' && (
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Configuração do Frame
                  </span>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Título do Quadro</label>
                    <input
                      type="text"
                      value={selectedElement.title || ''}
                      onChange={(e) => updateElement(selectedElement.id, { title: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Subtítulo / Descrição</label>
                    <input
                      type="text"
                      value={selectedElement.subtitle || ''}
                      onChange={(e) => updateElement(selectedElement.id, { subtitle: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="text-xs text-neutral-300">Exibir Cabeçalho</label>
                    <input
                      type="checkbox"
                      checked={selectedElement.showHeader !== false}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { showHeader: e.target.checked })
                      }
                      className="rounded accent-sky-500"
                    />
                  </div>
                </div>
              )}

              {/* 2. SE FOR TEXT_FIELD */}
              {selectedElement.type === 'text_field' && (
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Configuração do Campo
                  </span>
                  {/* Tipo de estilo: Texto vs Número */}
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1.5">Estilo do Campo</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateElement(selectedElement.id, { inputType: 'text' })}
                        className={`py-1.5 rounded text-xs font-semibold ${
                          selectedElement.inputType !== 'number'
                            ? 'bg-sky-500 text-white'
                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Texto
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElement(selectedElement.id, { inputType: 'number' })}
                        className={`py-1.5 rounded text-xs font-semibold ${
                          selectedElement.inputType === 'number'
                            ? 'bg-sky-500 text-white'
                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Número
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Rótulo / Nome</label>
                    <input
                      type="text"
                      value={selectedElement.label || ''}
                      onChange={(e) => {
                        const newLabel = e.target.value
                        const autoSlug = slugify(newLabel)
                        updateElement(selectedElement.id, {
                          label: newLabel,
                          key: selectedElement.key ? selectedElement.key : autoSlug
                        })
                      }}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      Chave / Slug da Variável
                    </label>
                    <input
                      type="text"
                      value={selectedElement.key || ''}
                      onChange={(e) => updateElement(selectedElement.id, { key: slugify(e.target.value) })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-300 font-mono outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Dica (Placeholder)</label>
                    <input
                      type="text"
                      value={selectedElement.placeholder || ''}
                      onChange={(e) => updateElement(selectedElement.id, { placeholder: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-sky-500"
                    />
                  </div>

                  {selectedElement.inputType === 'number' && (
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">
                        Fórmula de Rolagem (Opcional)
                      </label>
                      <input
                        type="text"
                        value={selectedElement.formula || ''}
                        placeholder="ex: 1d20+@{forca}"
                        onChange={(e) => updateElement(selectedElement.id, { formula: e.target.value })}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-300 font-mono outline-none focus:border-sky-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 3. SE FOR LABEL / TEXTO */}
              {selectedElement.type === 'label' && (
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Tipografia & Conteúdo
                  </span>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Texto de Exibição</label>
                    <textarea
                      rows={2}
                      value={selectedElement.textContent || ''}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { textContent: e.target.value })
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-sky-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Tamanho</label>
                      <select
                        value={selectedElement.fontSize || 16}
                        onChange={(e) =>
                          updateElement(selectedElement.id, { fontSize: Number(e.target.value) })
                        }
                        className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 outline-none"
                      >
                        <option value={12}>12px (Pequeno)</option>
                        <option value={14}>14px (Normal)</option>
                        <option value={16}>16px (Médio)</option>
                        <option value={20}>20px (Grande)</option>
                        <option value={24}>24px (Título)</option>
                        <option value={32}>32px (Destaque)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Estilo</label>
                      <select
                        value={selectedElement.fontFamily || 'cinzel'}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            fontFamily: e.target.value as CanvasElement['fontFamily']
                          })
                        }
                        className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 outline-none"
                      >
                        <option value="cinzel">Cinzel RPG</option>
                        <option value="sans">Inter Sans</option>
                        <option value="mono">Mono</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1.5">Cor do Texto</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['#E9D180', '#FFFFFF', '#9CA3AF', '#EF4444', '#10B981', '#38BDF8'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateElement(selectedElement.id, { textColor: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            selectedElement.textColor === c
                              ? 'scale-110 border-white shadow'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. SE FOR STAT (ATRIBUTO D&D) */}
              {selectedElement.type === 'stat' && (
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Atributo & Rolagem
                  </span>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Nome do Atributo</label>
                    <input
                      type="text"
                      value={selectedElement.statLabel || ''}
                      onChange={(e) => updateElement(selectedElement.id, { statLabel: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Chave / Slug</label>
                    <input
                      type="text"
                      value={selectedElement.statKey || ''}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { statKey: slugify(e.target.value) })
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-300 font-mono outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Valor Base Inicial</label>
                    <input
                      type="number"
                      value={selectedElement.statScore ?? 10}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { statScore: Number(e.target.value) || 10 })
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="text-xs text-neutral-300">Exibir Modificador (+2)</label>
                    <input
                      type="checkbox"
                      checked={selectedElement.showModifier !== false}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { showModifier: e.target.checked })
                      }
                      className="rounded accent-sky-500"
                    />
                  </div>
                </div>
              )}

              {/* 5. SE FOR TEXTAREA */}
              {selectedElement.type === 'textarea' && (
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Área de Texto
                  </span>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Rótulo</label>
                    <input
                      type="text"
                      value={selectedElement.label || ''}
                      onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Chave / Slug</label>
                    <input
                      type="text"
                      value={selectedElement.key || ''}
                      onChange={(e) => updateElement(selectedElement.id, { key: slugify(e.target.value) })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-300 font-mono outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}

              {/* 6. SE FOR DOTS */}
              {selectedElement.type === 'dots' && (
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Trilha de Pontos
                  </span>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Rótulo</label>
                    <input
                      type="text"
                      value={selectedElement.label || ''}
                      onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Total de Pontos (Máx)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={selectedElement.maxDots ?? 5}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          maxDots: Math.max(1, Math.min(12, Number(e.target.value) || 5))
                        })
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* CONFIGURAÇÕES GERAIS DA TELA CANVAS (QUANDO NADA ESTÁ SELECIONADO) */
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
                <Settings className="w-4 h-4 text-vtt-golden" />
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Configurações da Ficha
                </span>
              </div>

              <div className="space-y-3">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Área da Ficha (Artboard)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-500 block mb-1">Largura (px)</label>
                    <input
                      type="number"
                      value={canvas.width}
                      onChange={(e) =>
                        commitCanvas({ ...canvas, width: Math.max(600, Number(e.target.value) || 1000) })
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-200 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-500 block mb-1">Altura (px)</label>
                    <input
                      type="number"
                      value={canvas.height}
                      onChange={(e) =>
                        commitCanvas({
                          ...canvas,
                          height: Math.max(600, Number(e.target.value) || 1200)
                        })
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-200 font-mono text-right"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-neutral-800/40 border border-neutral-800 rounded-xl space-y-2 text-xs text-neutral-400">
                <p className="font-semibold text-neutral-300">Dica de Modelagem:</p>
                <p>
                  Arraste ferramentas da barra superior para desenhar quadros e campos livremente
                  na tela.
                </p>
                <p>
                  Campos soltos colocados sobre um <strong className="text-vtt-golden">Frame</strong>{' '}
                  são automaticamente agrupados e se movem com ele.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SUB-COMPONENTE: RENDERIZADOR VISUAL DE UM ELEMENTO NO CANVAS
───────────────────────────────────────────────────────────── */
interface CanvasElementViewProps {
  element: CanvasElement
  isSelected: boolean
  isPreviewMode: boolean
  previewValues: Record<string, any>
  onChangePreview: (key: string, value: any) => void
  onSelect: (e: React.MouseEvent) => void
  onMouseDownDrag: (e: React.MouseEvent) => void
  onStartResize: (dir: ResizeDirection, e: React.MouseEvent) => void
}

function CanvasElementView({
  element,
  isSelected,
  isPreviewMode,
  previewValues,
  onChangePreview,
  onSelect,
  onMouseDownDrag,
  onStartResize
}: CanvasElementViewProps): React.JSX.Element {
  const isInputStyleNumber = element.inputType === 'number'
  const valKey = element.key || element.id
  const currentVal = previewValues[valKey] ?? element.defaultValue ?? ''

  // Calcula modificador dinâmico no Stat Box
  const statScore =
    previewValues[element.statKey || element.id] ?? element.statScore ?? 10
  const statMod = Math.floor((Number(statScore) - 10) / 2)
  const statSign = statMod >= 0 ? `+${statMod}` : `${statMod}`

  return (
    <div
      onClick={onSelect}
      onMouseDown={onMouseDownDrag}
      className={`absolute select-none transition-shadow ${
        isSelected
          ? 'ring-2 ring-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.35)] z-30'
          : 'hover:ring-1 hover:ring-neutral-500/50'
      }`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height
      }}
    >
      {/* ── 1. CAMPO DE ENTRADA (TEXT OU NUMBER) ── */}
      {element.type === 'text_field' && (
        <div className="w-full h-full flex flex-col justify-between bg-neutral-900/90 border border-neutral-700/80 rounded-lg p-1.5 focus-within:border-vtt-golden transition-colors">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate px-1">
            {element.label || 'Campo'}
          </span>
          <div className="flex items-center gap-1">
            <input
              type={isInputStyleNumber ? 'number' : 'text'}
              disabled={!isPreviewMode}
              value={currentVal}
              onChange={(e) => onChangePreview(valKey, e.target.value)}
              placeholder={element.placeholder || '...'}
              className={`w-full bg-transparent text-xs text-neutral-100 font-medium px-1 outline-none ${
                isInputStyleNumber ? 'font-mono text-center' : ''
              } ${!isPreviewMode ? 'pointer-events-none' : ''}`}
            />
            {isInputStyleNumber && element.formula && (
              <span className="text-[9px] font-mono text-vtt-golden bg-vtt-golden/10 px-1 py-0.5 rounded border border-vtt-golden/30 shrink-0">
                d20
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 2. RÓTULO / TEXTO ESTÁTICO (LABEL) ── */}
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
        <div className="w-full h-full flex flex-col items-center justify-between bg-neutral-900/95 border border-neutral-700 rounded-xl p-1.5 text-center shadow-lg relative group">
          <span className="text-[10px] font-bold text-vtt-golden uppercase tracking-wider font-cinzel truncate w-full">
            {element.statLabel || 'FOR'}
          </span>

          {element.showModifier !== false && (
            <div className="text-base font-extrabold text-white font-mono leading-none py-0.5">
              {statSign}
            </div>
          )}

          <div className="w-full flex items-center justify-center">
            {isPreviewMode ? (
              <input
                type="number"
                value={statScore}
                onChange={(e) =>
                  onChangePreview(element.statKey || element.id, Number(e.target.value) || 10)
                }
                className="w-10 bg-neutral-800 rounded text-center text-xs text-neutral-300 font-mono py-0.5 border border-neutral-700 outline-none"
              />
            ) : (
              <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded-full border border-neutral-700">
                {statScore}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 4. ÁREA DE TEXTO MULTILINHA (TEXTAREA) ── */}
      {element.type === 'textarea' && (
        <div className="w-full h-full flex flex-col bg-neutral-900/90 border border-neutral-700/80 rounded-lg p-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 truncate">
            {element.label || 'Anotações'}
          </span>
          <textarea
            disabled={!isPreviewMode}
            value={currentVal}
            onChange={(e) => onChangePreview(valKey, e.target.value)}
            placeholder={element.placeholder || '...'}
            className={`flex-1 w-full bg-transparent text-xs text-neutral-200 outline-none resize-none ${
              !isPreviewMode ? 'pointer-events-none' : ''
            }`}
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
              const currentFilled = Number(currentVal) || 0
              const isFilled = i < currentFilled
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (!isPreviewMode) return
                    const nextVal = isFilled && i === currentFilled - 1 ? i : i + 1
                    onChangePreview(valKey, nextVal)
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
        <label className="w-full h-full flex items-center gap-2 bg-neutral-900/90 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 cursor-pointer">
          <input
            type="checkbox"
            disabled={!isPreviewMode}
            checked={Boolean(currentVal)}
            onChange={(e) => onChangePreview(valKey, e.target.checked)}
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

      {/* ── GIZMO DE SELEÇÃO E 8 ALÇAS DE REDIMENSIONAMENTO ── */}
      {isSelected && (
        <>
          <div className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-sky-500 text-white font-mono text-[9px] flex items-center gap-1 shadow pointer-events-none">
            <span>
              {element.width} × {element.height}
            </span>
          </div>

          {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeDirection[]).map((dir) => (
            <div
              key={dir}
              onMouseDown={(e) => onStartResize(dir, e)}
              className={`absolute w-2 h-2 bg-white border border-sky-500 rounded-sm z-40 ${getHandlePositionClass(
                dir
              )} ${getHandleCursorClass(dir)}`}
            />
          ))}
        </>
      )}
    </div>
  )
}

function getHandlePositionClass(dir: ResizeDirection): string {
  switch (dir) {
    case 'nw':
      return '-top-1 -left-1'
    case 'n':
      return '-top-1 left-1/2 -translate-x-1/2'
    case 'ne':
      return '-top-1 -right-1'
    case 'e':
      return 'top-1/2 -translate-y-1/2 -right-1'
    case 'se':
      return '-bottom-1 -right-1'
    case 's':
      return '-bottom-1 left-1/2 -translate-x-1/2'
    case 'sw':
      return '-bottom-1 -left-1'
    case 'w':
      return 'top-1/2 -translate-y-1/2 -left-1'
  }
}

function getHandleCursorClass(dir: ResizeDirection): string {
  switch (dir) {
    case 'nw':
    case 'se':
      return 'cursor-nwse-resize'
    case 'ne':
    case 'sw':
      return 'cursor-nesw-resize'
    case 'n':
    case 's':
      return 'cursor-ns-resize'
    case 'e':
    case 'w':
      return 'cursor-ew-resize'
  }
}
