import React, { useState, useId } from 'react'
import type {
  SheetLayoutConfig,
  SheetLayoutPin,
  AttributeGroup
} from '../../../../preload/index.d'
import SheetPinOverlay from './SheetPinOverlay'
import { convertFileToPages, loadSampleDndPdf } from '../../utils/pdfLoader'
import {
  Upload,
  FileText,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Layers,
  Settings2
} from 'lucide-react'

interface SheetLayoutBuilderProps {
  sheetLayout: SheetLayoutConfig
  attributeGroups: AttributeGroup[]
  onChangeLayout: (layout: SheetLayoutConfig) => void
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

/**
 * Pinos pré-configurados para a primeira página do D&D 2024 Character Sheet
 * Alinhados visualmente com os campos do PDF oficial
 */
const DND_2024_DEFAULT_PINS: SheetLayoutPin[] = [
  // Cabeçalho
  { id: 'pin-name', key: 'character_name', label: 'Nome do Personagem', type: 'text', page: 1, x: 7.2, y: 7.2, w: 26.5, h: 2.8, fontSize: 14, textAlign: 'left' },
  { id: 'pin-class', key: 'class', label: 'Classe', type: 'text', page: 1, x: 35.5, y: 7.2, w: 18.0, h: 2.8, fontSize: 13, textAlign: 'left' },
  { id: 'pin-subclass', key: 'subclass', label: 'Subclasse', type: 'text', page: 1, x: 55.0, y: 7.2, w: 18.0, h: 2.8, fontSize: 13, textAlign: 'left' },
  { id: 'pin-level', key: 'level', label: 'Nível', type: 'number', page: 1, x: 74.5, y: 7.2, w: 7.5, h: 2.8, fontSize: 14, textAlign: 'center' },
  { id: 'pin-species', key: 'species', label: 'Espécie / Raça', type: 'text', page: 1, x: 7.2, y: 11.2, w: 26.5, h: 2.6, fontSize: 12, textAlign: 'left' },
  { id: 'pin-background', key: 'background', label: 'Antecedente', type: 'text', page: 1, x: 35.5, y: 11.2, w: 22.0, h: 2.6, fontSize: 12, textAlign: 'left' },
  { id: 'pin-prof-bonus', key: 'prof_bonus', label: 'Proficiência', type: 'number', page: 1, x: 83.5, y: 7.2, w: 8.5, h: 2.8, fontSize: 14, textAlign: 'center', isModifier: true },

  // Atributos Principais (Scores & Modifiers)
  { id: 'pin-str-mod', key: 'strength_mod', label: 'Mod Força', type: 'number', page: 1, x: 8.5, y: 18.5, w: 8.0, h: 4.2, fontSize: 20, textAlign: 'center', isModifier: true },
  { id: 'pin-str-score', key: 'strength_score', label: 'Força (Score)', type: 'number', page: 1, x: 10.0, y: 23.3, w: 5.0, h: 2.2, fontSize: 12, textAlign: 'center' },

  { id: 'pin-dex-mod', key: 'dexterity_mod', label: 'Mod Destreza', type: 'number', page: 1, x: 8.5, y: 27.5, w: 8.0, h: 4.2, fontSize: 20, textAlign: 'center', isModifier: true },
  { id: 'pin-dex-score', key: 'dexterity_score', label: 'Destreza (Score)', type: 'number', page: 1, x: 10.0, y: 32.3, w: 5.0, h: 2.2, fontSize: 12, textAlign: 'center' },

  { id: 'pin-con-mod', key: 'constitution_mod', label: 'Mod Constituição', type: 'number', page: 1, x: 8.5, y: 36.5, w: 8.0, h: 4.2, fontSize: 20, textAlign: 'center', isModifier: true },
  { id: 'pin-con-score', key: 'constitution_score', label: 'Constituição (Score)', type: 'number', page: 1, x: 10.0, y: 41.3, w: 5.0, h: 2.2, fontSize: 12, textAlign: 'center' },

  { id: 'pin-int-mod', key: 'intelligence_mod', label: 'Mod Inteligência', type: 'number', page: 1, x: 8.5, y: 45.5, w: 8.0, h: 4.2, fontSize: 20, textAlign: 'center', isModifier: true },
  { id: 'pin-int-score', key: 'intelligence_score', label: 'Inteligência (Score)', type: 'number', page: 1, x: 10.0, y: 50.3, w: 5.0, h: 2.2, fontSize: 12, textAlign: 'center' },

  { id: 'pin-wis-mod', key: 'wisdom_mod', label: 'Mod Sabedoria', type: 'number', page: 1, x: 8.5, y: 54.5, w: 8.0, h: 4.2, fontSize: 20, textAlign: 'center', isModifier: true },
  { id: 'pin-wis-score', key: 'wisdom_score', label: 'Sabedoria (Score)', type: 'number', page: 1, x: 10.0, y: 59.3, w: 5.0, h: 2.2, fontSize: 12, textAlign: 'center' },

  { id: 'pin-cha-mod', key: 'charisma_mod', label: 'Mod Carisma', type: 'number', page: 1, x: 8.5, y: 63.5, w: 8.0, h: 4.2, fontSize: 20, textAlign: 'center', isModifier: true },
  { id: 'pin-cha-score', key: 'charisma_score', label: 'Carisma (Score)', type: 'number', page: 1, x: 10.0, y: 68.3, w: 5.0, h: 2.2, fontSize: 12, textAlign: 'center' },

  // Combate & Defesas
  { id: 'pin-ac', key: 'armor_class', label: 'CA', type: 'number', page: 1, x: 38.0, y: 18.0, w: 9.0, h: 4.5, fontSize: 18, textAlign: 'center' },
  { id: 'pin-initiative', key: 'initiative', label: 'Iniciativa', type: 'number', page: 1, x: 49.5, y: 18.0, w: 9.0, h: 4.5, fontSize: 18, textAlign: 'center', isModifier: true },
  { id: 'pin-speed', key: 'speed', label: 'Deslocamento', type: 'text', page: 1, x: 61.0, y: 18.0, w: 9.0, h: 4.5, fontSize: 15, textAlign: 'center' },

  // Pontos de Vida (HP)
  { id: 'pin-hp-max', key: 'hp_max', label: 'PV Máximo', type: 'number', page: 1, x: 42.0, y: 25.0, w: 12.0, h: 3.2, fontSize: 16, textAlign: 'center' },
  { id: 'pin-hp-current', key: 'hp_current', label: 'PV Atual', type: 'number', page: 1, x: 42.0, y: 30.5, w: 16.0, h: 4.0, fontSize: 20, textAlign: 'center' },
  { id: 'pin-hp-temp', key: 'hp_temp', label: 'PV Temporário', type: 'number', page: 1, x: 60.5, y: 30.5, w: 10.0, h: 4.0, fontSize: 18, textAlign: 'center' }
]

export default function SheetLayoutBuilder({
  sheetLayout,
  attributeGroups,
  onChangeLayout
}: SheetLayoutBuilderProps): React.JSX.Element {
  const fileInputId = useId()
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  const [zoom, setZoom] = useState(1.0)
  const [activeBuilderSubTab, setActiveBuilderSubTab] = useState<'pins' | 'modular'>('pins')

  const pages = sheetLayout.pages || []
  const pins = sheetLayout.pins || []
  const modularSections = sheetLayout.modularSections || []
  const currentPin = pins.find((p) => p.id === selectedPinId)

  // Manipulador de Upload de Arquivo (PDF ou Imagens)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoadingFile(true)
    try {
      const result = await convertFileToPages(file)
      onChangeLayout({
        ...sheetLayout,
        pages: result.pages
      })
      setCurrentPage(1)
    } catch (err: unknown) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Falha ao processar arquivo.')
    } finally {
      setIsLoadingFile(false)
      e.target.value = ''
    }
  }

  // Manipulador para carregar o arquivo oficial D&D 2024
  const handleLoadSamplePdf = async (): Promise<void> => {
    setIsLoadingFile(true)
    try {
      const result = await loadSampleDndPdf()
      onChangeLayout({
        ...sheetLayout,
        pages: result.pages
      })
      setCurrentPage(1)
    } catch (err: unknown) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Erro ao carregar PDF de exemplo.')
    } finally {
      setIsLoadingFile(false)
    }
  }

  // Aplicar Preset de Pinos D&D 2024
  const handleApplyDndPreset = (): void => {
    if (pins.length > 0) {
      const ok = confirm(
        'Você já possui campos posicionados nesta ficha. Deseja substituí-los pelo preset D&D 2024?'
      )
      if (!ok) return
    }
    onChangeLayout({
      ...sheetLayout,
      pins: DND_2024_DEFAULT_PINS
    })
    setSelectedPinId(null)
  }

  // Adicionar um novo pino na página atual
  const handleAddPin = (field: { key: string; label: string; type?: string }): void => {
    const newPin: SheetLayoutPin = {
      id: uid(),
      key: field.key,
      label: field.label,
      type: (field.type as SheetLayoutPin['type']) || 'text',
      page: currentPage,
      x: 35.0,
      y: 35.0,
      w: 16.0,
      h: 3.5,
      fontSize: 14,
      textAlign: 'center'
    }

    onChangeLayout({
      ...sheetLayout,
      pins: [...pins, newPin]
    })
    setSelectedPinId(newPin.id)
  }

  // Atualizar propriedades de um pino existente
  const handleUpdatePin = (updated: SheetLayoutPin): void => {
    onChangeLayout({
      ...sheetLayout,
      pins: pins.map((p) => (p.id === updated.id ? updated : p))
    })
  }

  // Excluir um pino
  const handleDeletePin = (id: string): void => {
    onChangeLayout({
      ...sheetLayout,
      pins: pins.filter((p) => p.id !== id)
    })
    if (selectedPinId === id) setSelectedPinId(null)
  }

  // Alternar seção modular (Inventário, Magias, etc.)
  const handleToggleModular = (id: string): void => {
    onChangeLayout({
      ...sheetLayout,
      modularSections: modularSections.map((sec) =>
        sec.id === id ? { ...sec, enabled: !sec.enabled } : sec
      )
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── BARRA SUPERIOR DE AÇÕES & ARQUIVOS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-vtt-dark border border-vtt-dark-gray p-3.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Input de Arquivo oculto */}
          <input
            id={fileInputId}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          <label
            htmlFor={fileInputId}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 hover:border-vtt-golden transition-colors cursor-pointer shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-vtt-golden" />
            <span>{pages.length > 0 ? 'Trocar PDF / Imagem' : 'Fazer Upload (PDF ou Imagem)'}</span>
          </label>

          {/* Botão de Exemplo D&D 2024 */}
          <button
            type="button"
            disabled={isLoadingFile}
            onClick={handleLoadSamplePdf}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-vtt-golden/10 hover:bg-vtt-golden/20 text-vtt-golden border border-vtt-golden/40 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isLoadingFile ? 'Carregando...' : 'Carregar Exemplo D&D 2024 (PDF)'}</span>
          </button>

          {pages.length > 0 && (
            <button
              type="button"
              onClick={handleApplyDndPreset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition-colors cursor-pointer"
              title="Aplica coordenadas padrões dos atributos D&D 2024"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Aplicar Preset D&D 2024</span>
            </button>
          )}
        </div>

        {/* Controles de Página & Zoom */}
        {pages.length > 0 && (
          <div className="flex items-center gap-4">
            {/* Navegador de Páginas */}
            <div className="flex items-center gap-1.5 bg-neutral-900 px-2 py-1 rounded-lg border border-neutral-800">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1))
                  setSelectedPinId(null)
                }}
                className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold text-neutral-200 px-1.5">
                Página {currentPage} de {pages.length}
              </span>

              <button
                type="button"
                disabled={currentPage >= pages.length}
                onClick={() => {
                  setCurrentPage((p) => Math.min(pages.length, p + 1))
                  setSelectedPinId(null)
                }}
                className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
                className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                title="Reduzir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-neutral-300 w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.4, Math.round((z + 0.1) * 10) / 10))}
                className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(0.85)}
                className="px-2 py-0.5 text-[11px] font-semibold text-neutral-300 hover:text-vtt-golden rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Ajustar largura à tela"
              >
                Ajustar
              </button>
              <button
                type="button"
                onClick={() => setZoom(1.0)}
                className="p-1 text-neutral-400 hover:text-white cursor-pointer ml-1"
                title="Tamanho original 100%"
              >
                <Maximize className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── ÁREA PRINCIPAL: CANVAS VISUAL + PAINEL LATERAL DE FERRAMENTAS ── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        {/* COLUNA ESQUERDA: CANVAS COM OVERLAY DO PDF */}
        <div className="flex-1 min-w-0 bg-neutral-950/80 rounded-2xl border border-neutral-800 p-4 min-h-[550px] max-h-[760px] flex flex-col items-center justify-start overflow-auto [scrollbar-color:#3a3a3a_transparent] scrollbar-thin shadow-inner w-full">
          {isLoadingFile ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 text-neutral-400">
              <div className="w-8 h-8 border-2 border-vtt-golden border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold">Renderizando páginas do PDF...</span>
            </div>
          ) : pages.length > 0 ? (
            <SheetPinOverlay
              pageImage={pages[currentPage - 1]}
              pins={pins}
              currentPage={currentPage}
              isDesignerMode={true}
              selectedPinId={selectedPinId}
              onSelectPin={setSelectedPinId}
              onUpdatePin={handleUpdatePin}
              onDeletePin={handleDeletePin}
              zoom={zoom}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-28 gap-4 text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-vtt-golden">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white mb-1">Nenhum arquivo de ficha carregado</h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Faça o upload do PDF oficial da sua ficha ou de uma imagem de alta resolução para começar a posicionar os campos interativos.
                </p>
              </div>
              <div className="flex gap-3">
                <label
                  htmlFor={fileInputId}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-vtt-golden text-neutral-950 hover:bg-[#FBE8A6] cursor-pointer shadow"
                >
                  Fazer Upload de Arquivo
                </label>
                <button
                  type="button"
                  onClick={handleLoadSamplePdf}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 cursor-pointer"
                >
                  Carregar Exemplo D&D 2024
                </button>
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: PAINEL DE CONTROLE (CAMPOS, INSPETOR E SEÇÕES MODULARES) */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4">
          {/* Alternador de Abas do Painel */}
          <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveBuilderSubTab('pins')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeBuilderSubTab === 'pins'
                  ? 'bg-neutral-800 text-vtt-golden shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Campos & Pinos ({pins.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveBuilderSubTab('modular')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeBuilderSubTab === 'modular'
                  ? 'bg-neutral-800 text-vtt-golden shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Abas Dinâmicas</span>
            </button>
          </div>

          {activeBuilderSubTab === 'pins' ? (
            <div className="flex flex-col gap-4">
              {/* INSPETOR DO PINO SELECIONADO */}
              {currentPin ? (
                <div className="bg-neutral-900/90 border border-vtt-golden/40 rounded-xl p-4 shadow-md flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-[11px] font-bold text-vtt-golden uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      Inspetor do Campo
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeletePin(currentPin.id)}
                      className="text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Excluir este campo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-neutral-400 font-semibold uppercase">Rótulo / Nome</span>
                    <input
                      type="text"
                      value={currentPin.label}
                      onChange={(e) => handleUpdatePin({ ...currentPin, label: e.target.value })}
                      className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-vtt-golden"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase">Tipo</span>
                      <select
                        value={currentPin.type}
                        onChange={(e) =>
                          handleUpdatePin({
                            ...currentPin,
                            type: e.target.value as SheetLayoutPin['type']
                          })
                        }
                        className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-vtt-golden cursor-pointer"
                      >
                        <option value="number">Número</option>
                        <option value="text">Texto</option>
                        <option value="checkbox">Caixa (Check)</option>
                        <option value="textarea">Área de Texto</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase">Tamanho Fonte</span>
                      <select
                        value={currentPin.fontSize || 14}
                        onChange={(e) =>
                          handleUpdatePin({ ...currentPin, fontSize: Number(e.target.value) })
                        }
                        className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-vtt-golden cursor-pointer"
                      >
                        <option value={10}>10 px</option>
                        <option value={12}>12 px</option>
                        <option value={14}>14 px</option>
                        <option value={16}>16 px</option>
                        <option value={18}>18 px</option>
                        <option value={22}>22 px</option>
                        <option value={26}>26 px</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase">Alinhamento</span>
                      <select
                        value={currentPin.textAlign || 'center'}
                        onChange={(e) =>
                          handleUpdatePin({
                            ...currentPin,
                            textAlign: e.target.value as SheetLayoutPin['textAlign']
                          })
                        }
                        className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-vtt-golden cursor-pointer"
                      >
                        <option value="left">Esquerda</option>
                        <option value="center">Centro</option>
                        <option value="right">Direita</option>
                      </select>
                    </label>

                    <label className="flex items-center gap-2 pt-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(currentPin.isModifier)}
                        onChange={(e) =>
                          handleUpdatePin({ ...currentPin, isModifier: e.target.checked })
                        }
                        className="w-3.5 h-3.5 accent-vtt-golden rounded cursor-pointer"
                      />
                      <span className="text-[11px] text-neutral-300">Modificador (+/-)</span>
                    </label>
                  </div>

                  <div className="text-[10px] text-neutral-500 font-mono pt-1 border-t border-neutral-800/80">
                    Posição: X={currentPin.x}% Y={currentPin.y}% | W={currentPin.w}% H={currentPin.h}%
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-900/60 border border-dashed border-neutral-800 rounded-xl p-3.5 text-center text-xs text-neutral-400">
                  Clique em um campo na ficha para inspecionar ou redimensionar.
                </div>
              )}

              {/* PALETA DE CAMPOS DEFINIDOS NO SISTEMA */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                  Adicionar Campos à Página
                </span>

                <div className="max-h-[360px] overflow-y-auto flex flex-col gap-3 pr-1.5 [scrollbar-color:#404040_transparent] scrollbar-thin">
                  {/* Campos dos Grupos de Atributos do Sistema */}
                  {attributeGroups.map((group) => (
                    <div key={group.id} className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-vtt-golden uppercase tracking-wider">
                        {group.label}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {group.fields.map((f) => (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() => handleAddPin(f)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 hover:border-vtt-golden text-neutral-200 border border-neutral-700 text-xs transition-colors cursor-pointer"
                            title={`Adicionar ${f.label} na página atual`}
                          >
                            <Plus className="w-3 h-3 text-vtt-golden" />
                            <span>{f.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Campos Básicos se não houver grupos */}
                  {attributeGroups.length === 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">
                        Campos Básicos Sugeridos
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { key: 'name', label: 'Nome' },
                          { key: 'level', label: 'Nível', type: 'number' },
                          { key: 'hp', label: 'PV', type: 'number' },
                          { key: 'ac', label: 'CA', type: 'number' },
                          { key: 'str', label: 'Força', type: 'number' },
                          { key: 'dex', label: 'Destreza', type: 'number' },
                          { key: 'con', label: 'Constituição', type: 'number' },
                          { key: 'int', label: 'Inteligência', type: 'number' },
                          { key: 'wis', label: 'Sabedoria', type: 'number' },
                          { key: 'cha', label: 'Carisma', type: 'number' }
                        ].map((f) => (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() => handleAddPin(f)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-vtt-golden" />
                            <span>{f.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* CONFIGURAÇÃO DAS ABAS MODULARES DINÂMICAS */
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3.5">
              <div>
                <h5 className="text-xs font-bold text-white mb-1">Abas Modulares Dinâmicas</h5>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Selecione quais listas dinâmicas estarão disponíveis para os personagens neste sistema:
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {modularSections.map((sec) => (
                  <label
                    key={sec.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={() => handleToggleModular(sec.id)}
                        className="w-4 h-4 accent-vtt-golden cursor-pointer rounded"
                      />
                      <span className="text-xs font-semibold text-neutral-200">{sec.title}</span>
                    </div>

                    {sec.contentType && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-vtt-golden font-mono">
                        {sec.contentType}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
