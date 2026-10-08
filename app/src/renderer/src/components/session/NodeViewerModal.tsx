import React, { useState, useRef, useMemo } from 'react'
import type { CampaignNode } from '../../../../preload/index.d'
import MarkdownViewer from './MarkdownViewer'
import {
  FileText,
  Folder,
  User,
  Image as ImageIcon,
  Eye,
  Edit3,
  Columns,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Download,
  Tv,
  X,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  ListTodo,
  Table as TableIcon,
  Code,
  Minus,
  Sparkles,
  Save,
  Trash2,
  Scroll
} from 'lucide-react'
import type { RpgSystemFull, CharacterEntry } from '../../../../preload/index.d'
import CharacterSheetModal from '../sheet/CharacterSheetModal'

interface NodeViewerModalProps {
  node: CampaignNode | null
  isOpen: boolean
  onClose: () => void
  isGM: boolean
  system?: RpgSystemFull | null
  onRoll?: (formula: string, label: string) => void
  onUpdate: (payload: { id: string; name?: string; description?: string | null; data?: Record<string, unknown> }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onShowToTable?: (node: CampaignNode) => void
}

interface NodeViewerDialogProps {
  node: CampaignNode
  onClose: () => void
  isGM: boolean
  system?: RpgSystemFull | null
  onRoll?: (formula: string, label: string) => void
  onUpdate: (payload: { id: string; name?: string; description?: string | null; data?: Record<string, unknown> }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onShowToTable?: (node: CampaignNode) => void
}

function NodeViewerDialog({
  node,
  onClose,
  isGM,
  system,
  onRoll,
  onUpdate,
  onDelete,
  onShowToTable
}: NodeViewerDialogProps): React.JSX.Element {
  const isNote = node.type === 'note'
  const canEdit = isGM || node.permission === 'edit'

  const initialMarkdown = typeof node.data?.markdown === 'string' ? node.data.markdown : ''

  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'split'>('view')
  const [name, setName] = useState<string>(node.name)
  const [description, setDescription] = useState<string>(node.description || '')
  const [noteMarkdown, setNoteMarkdown] = useState<string>(initialMarkdown)
  const [originalMarkdown, setOriginalMarkdown] = useState<string>(initialMarkdown)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [copiedNote, setCopiedNote] = useState<boolean>(false)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const isDirty = useMemo((): boolean => {
    return noteMarkdown !== originalMarkdown || name !== node.name || description !== (node.description || '')
  }, [noteMarkdown, originalMarkdown, name, description, node])

  const [showCharacterSheet, setShowCharacterSheet] = useState(false)

  const characterEntry: CharacterEntry = useMemo(() => {
    return {
      id: typeof node.data?.characterId === 'number' ? node.data.characterId : 0,
      campaign_id: 0,
      user_id: 0,
      name: node.name,
      avatar_url: (node.data?.avatar_url as string) || null,
      role: (node.data?.role as 'pc' | 'npc' | 'enemy') || 'pc',
      sheet_data: (node.data?.sheet_data as Record<string, unknown>) || node.data || {},
      created_at: '',
      updated_at: ''
    }
  }, [node])

  const handleSaveCharacterSheet = async (updated: CharacterEntry): Promise<void> => {
    const rawAttrs = (updated.sheet_data as { attributes?: Record<string, unknown> })?.attributes || {}
    const hpCur = Number(rawAttrs.hp_current ?? rawAttrs.hp ?? 20)
    const hpMaxVal = Number(rawAttrs.hp_max ?? 20)
    const acVal = Number(rawAttrs.armor_class ?? rawAttrs.ac ?? 10)

    await onUpdate({
      id: node.id,
      name: updated.name,
      data: {
        ...node.data,
        role: updated.role,
        sheet_data: updated.sheet_data,
        hp: { current: hpCur, max: hpMaxVal },
        ac: acVal
      }
    })
  }

  // Estatísticas da nota Markdown
  const stats = useMemo((): { words: number; chars: number; lines: number; readTimeMinutes: number } => {
    const trimmed = noteMarkdown.trim()
    if (!trimmed) return { words: 0, chars: 0, lines: 0, readTimeMinutes: 1 }
    const words = trimmed.split(/\s+/).filter(Boolean).length
    const chars = trimmed.length
    const lines = trimmed.split('\n').length
    const readTimeMinutes = Math.max(1, Math.ceil(words / 200))
    return { words, chars, lines, readTimeMinutes }
  }, [noteMarkdown])

  const handleSave = async (): Promise<void> => {
    if (!canEdit) return
    setIsSaving(true)
    try {
      const updatedData = { ...node.data }
      if (isNote) {
        updatedData.markdown = noteMarkdown
      }
      await onUpdate({
        id: node.id,
        name: name.trim() || node.name,
        description: description.trim() || null,
        data: updatedData
      })
      setOriginalMarkdown(noteMarkdown)
      if (activeTab === 'edit') {
        setActiveTab('view')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar alterações.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    try {
      await onDelete(node.id)
      onClose()
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir item.')
    }
  }

  const handleCopyMarkdown = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(noteMarkdown)
      setCopiedNote(true)
      setTimeout((): void => setCopiedNote(false), 2000)
    } catch (err) {
      console.error('Falha ao copiar markdown:', err)
    }
  }

  const handleDownloadMarkdown = (): void => {
    try {
      const blob = new Blob([noteMarkdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const fileName = name.trim().endsWith('.md') ? name.trim() : `${name.trim() || 'nota'}.md`
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Falha ao baixar arquivo .md:', err)
    }
  }

  // Inserção de formatação Markdown no textarea
  const insertFormatting = (prefix: string, suffix = '', defaultText = ''): void => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = noteMarkdown.substring(start, end)
    const replacement = selectedText ? `${prefix}${selectedText}${suffix}` : `${prefix}${defaultText}${suffix}`

    const newContent = noteMarkdown.substring(0, start) + replacement + noteMarkdown.substring(end)
    setNoteMarkdown(newContent)

    setTimeout((): void => {
      textarea.focus()
      const newCursorPos = selectedText
        ? start + replacement.length
        : start + prefix.length + defaultText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Atalhos de teclado (Ctrl+S para salvar, Tab para indentação)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = noteMarkdown.substring(0, start) + '  ' + noteMarkdown.substring(end)
      setNoteMarkdown(newContent)
      setTimeout((): void => {
        textarea.setSelectionRange(start + 2, start + 2)
      }, 0)
    }
  }

  // Distintivo com o tipo do nó
  const renderTypeBadge = (): React.JSX.Element => {
    switch (node.type) {
      case 'folder':
        return (
          <span className='inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700'>
            <Folder className='w-3 h-3 text-amber-400' />
            Pasta
          </span>
        )
      case 'character':
        return (
          <span className='inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700'>
            <User className='w-3 h-3 text-cyan-400' />
            Ficha
          </span>
        )
      case 'image':
        return (
          <span className='inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700'>
            <ImageIcon className='w-3 h-3 text-emerald-400' />
            Imagem
          </span>
        )
      case 'note':
      default:
        return (
          <span className='inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-950/40 text-vtt-golden border border-amber-800/50'>
            <FileText className='w-3 h-3 text-vtt-golden' />
            Nota (.md)
          </span>
        )
    }
  }

  // Dimensão dinâmica do modal
  const modalSizeClasses = isExpanded
    ? 'w-[96vw] h-[92vh] max-w-none'
    : isNote
      ? 'max-w-4xl w-full max-h-[88vh] h-[780px]'
      : 'max-w-xl w-full max-h-[90vh]'

  return (
    <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-in fade-in duration-150'>
      <div
        className={`bg-vtt-dark border border-vtt-light-gray/50 rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5 overflow-hidden transition-all duration-200 ${modalSizeClasses}`}
      >
        {/* Header */}
        <div className='flex items-center justify-between border-b border-vtt-dark-gray pb-3 gap-3'>
          <div className='flex items-center gap-2.5 min-w-0'>
            {renderTypeBadge()}
            <h2 className='text-base font-bold text-white truncate font-cinzel tracking-wide' title={node.name}>
              {node.name}
            </h2>
            {isDirty && isNote && (
              <span className='w-2 h-2 rounded-full bg-amber-400 animate-pulse' title='Alterações não salvas' />
            )}
          </div>

          <div className='flex items-center gap-1.5 shrink-0'>
            {/* Apresentar na Mesa */}
            {onShowToTable && (node.type === 'image' || isNote) && (
              <button
                type='button'
                onClick={(): void => onShowToTable(node)}
                className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-950 border border-green-800 text-green-300 hover:bg-green-900 hover:border-green-700 text-xs font-semibold cursor-pointer transition-colors shadow-sm'
                title='Apresentar aos jogadores na mesa virtual'
              >
                <Tv className='w-3.5 h-3.5' />
                <span className='hidden sm:inline'>Apresentar na Mesa</span>
              </button>
            )}

            {/* Ações de Nota (.md) */}
            {isNote && (
              <>
                <button
                  type='button'
                  onClick={handleCopyMarkdown}
                  className='flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-vtt-dark-gray hover:bg-neutral-700 text-neutral-300 hover:text-white border border-vtt-light-gray/30 text-xs font-semibold cursor-pointer transition-colors'
                  title='Copiar conteúdo Markdown bruto'
                >
                  {copiedNote ? (
                    <>
                      <Check className='w-3.5 h-3.5 text-emerald-400' />
                      <span className='text-emerald-400 text-[11px]'>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className='w-3.5 h-3.5' />
                      <span className='hidden md:inline text-[11px]'>Copiar .md</span>
                    </>
                  )}
                </button>

                <button
                  type='button'
                  onClick={handleDownloadMarkdown}
                  className='p-1.5 rounded-lg bg-vtt-dark-gray hover:bg-neutral-700 text-neutral-300 hover:text-white border border-vtt-light-gray/30 text-xs cursor-pointer transition-colors'
                  title='Baixar arquivo .md'
                >
                  <Download className='w-3.5 h-3.5' />
                </button>

                <button
                  type='button'
                  onClick={(): void => setIsExpanded(!isExpanded)}
                  className='p-1.5 rounded-lg bg-vtt-dark-gray hover:bg-neutral-700 text-neutral-300 hover:text-white border border-vtt-light-gray/30 text-xs cursor-pointer transition-colors'
                  title={isExpanded ? 'Restaurar tamanho padrão' : 'Expandir tela cheia'}
                >
                  {isExpanded ? <Minimize2 className='w-3.5 h-3.5' /> : <Maximize2 className='w-3.5 h-3.5' />}
                </button>
              </>
            )}

            <button
              type='button'
              onClick={onClose}
              className='text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-vtt-dark-gray cursor-pointer transition-colors'
              title='Fechar'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        {/* Abas para notas: Leitura vs Dividido vs Editor */}
        {isNote && (
          <div className='flex items-center justify-between border-b border-vtt-dark-gray pb-2.5'>
            <div className='flex items-center gap-1 bg-neutral-900/80 p-1 rounded-xl border border-vtt-light-gray/30'>
              <button
                type='button'
                onClick={(): void => setActiveTab('view')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'view'
                    ? 'bg-vtt-dark-gray text-vtt-golden border border-vtt-light-gray/40 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Eye className='w-3.5 h-3.5' />
                <span>Leitura</span>
              </button>

              {canEdit && (
                <>
                  <button
                    type='button'
                    onClick={(): void => setActiveTab('split')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      activeTab === 'split'
                        ? 'bg-vtt-dark-gray text-vtt-golden border border-vtt-light-gray/40 shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title='Editor e Pré-visualização lado a lado'
                  >
                    <Columns className='w-3.5 h-3.5' />
                    <span>Dividido</span>
                  </button>

                  <button
                    type='button'
                    onClick={(): void => setActiveTab('edit')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      activeTab === 'edit'
                        ? 'bg-vtt-dark-gray text-vtt-golden border border-vtt-light-gray/40 shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Edit3 className='w-3.5 h-3.5' />
                    <span>Editor</span>
                  </button>
                </>
              )}
            </div>

            {/* Status bar / Estatísticas no cabeçalho */}
            <div className='hidden sm:flex items-center gap-3 text-[11px] text-neutral-400'>
              <span>
                <strong className='text-neutral-300 font-mono'>{stats.words}</strong> palavras
              </span>
              <span>•</span>
              <span>
                <strong className='text-neutral-300 font-mono'>{stats.lines}</strong> linhas
              </span>
              <span>•</span>
              <span title='Tempo estimado de leitura'>
                ~{stats.readTimeMinutes} min de leitura
              </span>
            </div>
          </div>
        )}

        {/* Toolbar de Formatação Markdown (Quando em modo Edit ou Split) */}
        {isNote && canEdit && (activeTab === 'edit' || activeTab === 'split') && (
          <div className='flex flex-wrap items-center gap-1 p-1.5 bg-neutral-900/90 border border-vtt-light-gray/30 rounded-xl text-neutral-300 select-none'>
            <button
              type='button'
              onClick={(): void => insertFormatting('**', '**', 'texto')}
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Negrito (**texto**)'
            >
              <Bold className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={(): void => insertFormatting('*', '*', 'texto')}
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Itálico (*texto*)'
            >
              <Italic className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={(): void => insertFormatting('~~', '~~', 'texto')}
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Tachado (~~texto~~)'
            >
              <Strikethrough className='w-3.5 h-3.5' />
            </button>

            <div className='w-px h-4 bg-neutral-700 mx-1' />

            <button
              type='button'
              onClick={(): void => insertFormatting('# ', '', 'Título')}
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Título 1 (# )'
            >
              <Heading1 className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={(): void => insertFormatting('## ', '', 'Subtítulo')}
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Título 2 (## )'
            >
              <Heading2 className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={(): void => insertFormatting('### ', '', 'Seção')}
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Título 3 (### )'
            >
              <Heading3 className='w-3.5 h-3.5' />
            </button>

            <div className='w-px h-4 bg-neutral-700 mx-1' />

            <button
              type='button'
              onClick={(): void => insertFormatting('> ', '', 'Citação')}
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Citação (> )'
            >
              <Quote className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={(): void => insertFormatting('> [!GM] ', '\n> ', 'Segredo do Mestre')}
              className='flex items-center gap-1 px-1.5 py-1 rounded hover:bg-purple-950/60 hover:text-purple-300 text-purple-400 transition-colors cursor-pointer text-[11px]'
              title='Callout: Segredo do Mestre'
            >
              <Sparkles className='w-3.5 h-3.5' />
              <span className='font-cinzel font-semibold'>GM</span>
            </button>

            <div className='w-px h-4 bg-neutral-700 mx-1' />

            <button
              type='button'
              onClick={(): void => insertFormatting('- ', '', 'Item da lista')}
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Lista de marcadores (- )'
            >
              <List className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={(): void => insertFormatting('1. ', '', 'Item numerado')}
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Lista numerada (1. )'
            >
              <ListOrdered className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={(): void => insertFormatting('- [ ] ', '', 'Tarefa a realizar')}
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Lista de tarefas (- [ ] )'
            >
              <ListTodo className='w-3.5 h-3.5' />
            </button>

            <div className='w-px h-4 bg-neutral-700 mx-1' />

            <button
              type='button'
              onClick={(): void =>
                insertFormatting(
                  '\n| Item | Descrição | Valor |\n|---|---|---|\n| ',
                  ' | Detalhe | 10 po |\n',
                  'Espada'
                )
              }
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Inserir tabela Markdown'
            >
              <TableIcon className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={(): void => insertFormatting('```markdown\n', '\n```', 'código')}
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Bloco de código (```)'
            >
              <Code className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={(): void => insertFormatting('\n---\n', '', '')}
              className='p-1.5 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer'
              title='Divisor horizontal (---)'
            >
              <Minus className='w-3.5 h-3.5' />
            </button>

            <div className='ml-auto hidden sm:flex items-center text-[10px] text-neutral-500 font-mono pr-1'>
              Ctrl+S salva
            </div>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className='flex-1 min-h-0 overflow-hidden flex flex-col'>
          {isNote && (
            <>
              {/* Modo 1: Leitura (Preview Completo) */}
              {activeTab === 'view' && (
                <div className='flex-1 overflow-y-auto pr-2 rounded-xl bg-vtt-dark-gray/60 border border-vtt-light-gray/30 p-5 shadow-inner'>
                  <MarkdownViewer markdown={noteMarkdown} />
                </div>
              )}

              {/* Modo 2: Dividido (Editor + Preview em tempo real) */}
              {activeTab === 'split' && (
                <div className='flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0'>
                  {/* Editor à esquerda */}
                  <div className='flex flex-col min-h-0 h-full'>
                    <div className='text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 px-1 flex items-center justify-between'>
                      <span>Código Markdown</span>
                      <span className='text-neutral-500 font-mono'>{stats.chars} caracteres</span>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={noteMarkdown}
                      onChange={(e): void => setNoteMarkdown(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder='Escreva seu documento em Markdown...'
                      className='flex-1 w-full p-4 bg-vtt-dark-gray/90 border border-vtt-light-gray/40 rounded-xl text-neutral-100 font-mono text-xs focus:outline-none focus:border-vtt-golden resize-none leading-relaxed selection:bg-vtt-red/40 overflow-y-auto'
                    />
                  </div>

                  {/* Pré-visualização à direita */}
                  <div className='flex flex-col min-h-0 h-full'>
                    <div className='text-[10px] font-semibold text-vtt-golden uppercase tracking-wider mb-1 px-1 flex items-center gap-1.5'>
                      <Sparkles className='w-3 h-3' />
                      <span>Pré-visualização em Tempo Real</span>
                    </div>
                    <div className='flex-1 overflow-y-auto pr-2 rounded-xl bg-vtt-dark-gray/50 border border-vtt-light-gray/30 p-4 shadow-inner'>
                      <MarkdownViewer markdown={noteMarkdown} />
                    </div>
                  </div>
                </div>
              )}

              {/* Modo 3: Editor Completo */}
              {activeTab === 'edit' && (
                <div className='flex-1 flex flex-col min-h-0 gap-2'>
                  <div className='flex items-center gap-2'>
                    <input
                      type='text'
                      value={name}
                      onChange={(e): void => setName(e.target.value)}
                      placeholder='Título da Nota'
                      className='flex-1 px-3 py-2 bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-xl text-white font-cinzel font-bold text-sm focus:outline-none focus:border-vtt-golden'
                    />
                    <input
                      type='text'
                      value={description}
                      onChange={(e): void => setDescription(e.target.value)}
                      placeholder='Descrição breve (opcional)'
                      className='flex-1 px-3 py-2 bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-xl text-neutral-300 text-xs focus:outline-none focus:border-vtt-golden'
                    />
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={noteMarkdown}
                    onChange={(e): void => setNoteMarkdown(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Escreva em Markdown...'
                    className='flex-1 w-full p-4 bg-vtt-dark-gray/90 border border-vtt-light-gray/40 rounded-xl text-neutral-100 font-mono text-xs focus:outline-none focus:border-vtt-golden resize-none leading-relaxed selection:bg-vtt-red/40 overflow-y-auto'
                  />
                </div>
              )}
            </>
          )}

          {/* Outros tipos de nós: Imagem */}
          {node.type === 'image' && (
            <div className='flex-1 overflow-y-auto flex flex-col items-center justify-center gap-3 p-4 bg-vtt-dark-gray/40 rounded-xl border border-vtt-light-gray/30'>
              <div className='max-h-96 w-full flex items-center justify-center bg-black/60 rounded-xl overflow-hidden p-3 shadow-inner'>
                <img
                  src={String(node.data?.url || '')}
                  alt={node.name}
                  className='max-h-80 max-w-full object-contain rounded-lg shadow-md'
                  onError={(e): void => {
                    ;(e.target as HTMLImageElement).src =
                      'https://via.placeholder.com/600x400?text=Imagem+N%C3%A3o+Encontrada'
                  }}
                />
              </div>
              {node.description && (
                <p className='text-neutral-300 text-xs italic text-center max-w-md bg-neutral-900/60 px-4 py-2 rounded-lg border border-vtt-light-gray/30'>
                  {node.description}
                </p>
              )}
            </div>
          )}

          {/* Outros tipos de nós: Personagem */}
          {node.type === 'character' && (
            <div className='flex-1 overflow-y-auto flex flex-col gap-3 p-5 bg-vtt-dark-gray/50 rounded-xl border border-vtt-light-gray/30'>
              <div className='flex items-center justify-between border-b border-vtt-light-gray/30 pb-3'>
                <span className='font-bold text-white text-base font-cinzel'>{node.name}</span>
                <span className='px-2.5 py-0.5 rounded text-[11px] uppercase font-bold bg-neutral-800 text-vtt-golden border border-neutral-700'>
                  {String(node.data?.role || 'Personagem')}
                </span>
              </div>

              {/* Botão de Destaque: Abrir Ficha Completa Híbrida */}
              <button
                type='button'
                onClick={() => setShowCharacterSheet(true)}
                className='flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-vtt-golden text-neutral-950 hover:bg-[#FBE8A6] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:shadow-vtt-golden/20'
              >
                <Scroll className='w-4 h-4' />
                <span>Abrir Ficha de Personagem (Layout PDF + Listas)</span>
              </button>

              <div className='flex gap-6 text-xs bg-neutral-900/60 p-3.5 rounded-xl border border-vtt-light-gray/20'>
                <div>
                  <span className='text-neutral-400'>Pontos de Vida (HP):</span>{' '}
                  <strong className='text-red-400 font-mono text-sm ml-1'>
                    {(node.data?.hp as { current?: number })?.current ?? 20} /{' '}
                    {(node.data?.hp as { max?: number })?.max ?? 20}
                  </strong>
                </div>
                <div>
                  <span className='text-neutral-400'>Classe de Armadura (CA):</span>{' '}
                  <strong className='text-amber-400 font-mono text-sm ml-1'>{Number(node.data?.ac ?? 10)}</strong>
                </div>
              </div>
              {node.description && (
                <div className='mt-2'>
                  <span className='text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-1'>
                    Notas & Descrição:
                  </span>
                  <div className='p-3.5 bg-neutral-900/40 rounded-xl text-neutral-300 text-xs leading-relaxed border border-vtt-light-gray/20 select-text'>
                    {node.description}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Outros tipos de nós: Pasta */}
          {node.type === 'folder' && (
            <div className='flex-1 flex flex-col items-center justify-center p-8 text-neutral-400 text-center gap-2'>
              <Folder className='w-12 h-12 text-amber-500/80 mb-2' />
              <p className='text-sm font-bold text-white font-cinzel'>{node.name}</p>
              <p className='text-xs text-neutral-400'>
                {node.description || 'Esta pasta organiza outros documentos e recursos da campanha.'}
              </p>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className='flex items-center justify-between border-t border-vtt-dark-gray pt-3 gap-3'>
          {/* Ações de GM (Excluir) */}
          {isGM ? (
            showConfirmDelete ? (
              <div className='flex items-center gap-2'>
                <span className='text-red-400 text-xs font-bold'>Confirmar exclusão?</span>
                <button
                  type='button'
                  onClick={handleDelete}
                  className='px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm'
                >
                  Sim, Excluir
                </button>
                <button
                  type='button'
                  onClick={(): void => setShowConfirmDelete(false)}
                  className='px-2 py-1.5 text-neutral-400 hover:text-white text-xs cursor-pointer'
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type='button'
                onClick={(): void => setShowConfirmDelete(true)}
                className='flex items-center gap-1.5 text-neutral-400 hover:text-red-400 text-xs cursor-pointer transition-colors px-2 py-1.5 rounded hover:bg-neutral-800/60'
              >
                <Trash2 className='w-3.5 h-3.5' />
                <span>Excluir</span>
              </button>
            )
          ) : (
            <div />
          )}

          {/* Botões do lado direito */}
          <div className='flex items-center gap-2'>
            {isNote && canEdit && (activeTab === 'edit' || activeTab === 'split') && (
              <button
                type='button'
                onClick={handleSave}
                disabled={isSaving}
                className='flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-vtt-red hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm disabled:opacity-50'
              >
                <Save className='w-3.5 h-3.5' />
                <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            )}

            <button
              type='button'
              onClick={onClose}
              className='px-4 py-1.5 rounded-lg bg-vtt-dark-gray hover:bg-neutral-700 text-white text-xs font-semibold cursor-pointer transition-colors border border-vtt-light-gray/30'
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal da Ficha de Personagem Híbrida (PDF + Listas Dinâmicas) */}
      {showCharacterSheet && (
        <CharacterSheetModal
          character={characterEntry}
          system={system || null}
          isGM={isGM}
          canEdit={canEdit}
          onClose={() => setShowCharacterSheet(false)}
          onSave={handleSaveCharacterSheet}
          onRoll={onRoll}
        />
      )}
    </div>
  )
}

export default function NodeViewerModal(props: NodeViewerModalProps): React.JSX.Element | null {
  if (!props.isOpen || !props.node) return null
  return <NodeViewerDialog key={props.node.id} {...props} node={props.node} />
}
