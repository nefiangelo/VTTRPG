import React, { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Copy,
  Check,
  Info,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  ExternalLink
} from 'lucide-react'

interface MarkdownViewerProps {
  markdown: string
  className?: string
}

// Helper to extract text from React children for copying code
function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (!node) return ''
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && 'props' in node && node.props) {
    const props = node.props as { children?: React.ReactNode }
    return extractText(props.children)
  }
  return ''
}

// Code block with copy button and language tag
function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const language = className ? className.replace(/language-/, '') : ''
  const codeText = extractText(children).trimEnd()

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(codeText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Falha ao copiar:', err)
    }
  }

  return (
    <div className='relative my-3 rounded-xl overflow-hidden border border-vtt-light-gray/40 bg-neutral-950/90 group shadow-md'>
      <div className='flex items-center justify-between px-3 py-1.5 bg-neutral-900/90 border-b border-vtt-light-gray/30 text-[11px] text-neutral-400 select-none'>
        <span className='font-mono font-semibold uppercase text-neutral-300'>
          {language || 'código'}
        </span>
        <button
          type='button'
          onClick={handleCopy}
          className='flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer text-[11px]'
          title='Copiar código'
        >
          {copied ? (
            <>
              <Check className='w-3.5 h-3.5 text-emerald-400' />
              <span className='text-emerald-400 font-medium'>Copiado</span>
            </>
          ) : (
            <>
              <Copy className='w-3.5 h-3.5' />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <div className='p-3.5 overflow-x-auto text-xs font-mono text-emerald-300/95 leading-relaxed selection:bg-emerald-950 selection:text-white'>
        <pre className='!m-0 !p-0 !bg-transparent font-mono'>{children}</pre>
      </div>
    </div>
  )
}

// Special callout or styled blockquote
function CustomBlockquote({ children }: { children: React.ReactNode }): React.JSX.Element {
  const rawText = extractText(children).trim()

  // Match callout syntax: [!NOTE], [!TIP], [!WARNING], [!GM], [!SECRET], [!INFO]
  const calloutMatch = rawText.match(/^\[!(NOTE|INFO|TIP|WARNING|CAUTION|GM|SECRET)\](?:\s*(.*))?/i)

  if (calloutMatch) {
    const type = calloutMatch[1].toUpperCase()
    let borderColor = 'border-sky-700/60'
    let bgColor = 'bg-sky-950/20'
    let textColor = 'text-sky-300'
    let title = 'Nota'
    let icon = <Info className='w-4 h-4 shrink-0 text-sky-400' />

    if (type === 'TIP') {
      borderColor = 'border-emerald-700/60'
      bgColor = 'bg-emerald-950/25'
      textColor = 'text-emerald-300'
      title = 'Dica'
      icon = <Lightbulb className='w-4 h-4 shrink-0 text-emerald-400' />
    } else if (type === 'WARNING' || type === 'CAUTION') {
      borderColor = 'border-amber-700/60'
      bgColor = 'bg-amber-950/25'
      textColor = 'text-amber-300'
      title = 'Aviso'
      icon = <AlertTriangle className='w-4 h-4 shrink-0 text-amber-400' />
    } else if (type === 'GM' || type === 'SECRET') {
      borderColor = 'border-purple-700/60'
      bgColor = 'bg-purple-950/25'
      textColor = 'text-purple-300'
      title = 'Segredo do Mestre'
      icon = <Sparkles className='w-4 h-4 shrink-0 text-purple-400' />
    }

    // Strip the "[!KEYWORD]" tag from the displayed text
    const displayContent = rawText.replace(/^\[!(NOTE|INFO|TIP|WARNING|CAUTION|GM|SECRET)\]\s*/i, '')

    return (
      <div className={`my-3 p-3.5 rounded-xl border ${borderColor} ${bgColor} shadow-sm select-text`}>
        <div className={`flex items-center gap-2 font-cinzel font-bold text-xs ${textColor} mb-1.5`}>
          {icon}
          <span>{title}</span>
        </div>
        <div className='text-xs text-neutral-200 leading-relaxed pl-6'>
          {displayContent || children}
        </div>
      </div>
    )
  }

  return (
    <blockquote className='border-l-4 border-vtt-golden/70 bg-black/30 rounded-r-xl px-4 py-3 my-3 italic text-neutral-300 text-xs shadow-inner select-text'>
      {children}
    </blockquote>
  )
}

export default function MarkdownViewer({ markdown, className = '' }: MarkdownViewerProps): React.JSX.Element {
  if (!markdown || !markdown.trim()) {
    return (
      <div className='flex flex-col items-center justify-center py-12 px-4 text-center text-neutral-400 select-none'>
        <div className='w-12 h-12 rounded-full bg-vtt-dark-gray flex items-center justify-center mb-3 text-neutral-500'>
          <Info className='w-6 h-6' />
        </div>
        <p className='text-xs font-semibold text-neutral-300 font-cinzel'>Nenhum conteúdo nesta nota</p>
        <p className='text-[11px] text-neutral-500 mt-1'>
          Use a aba &quot;Editar&quot; para adicionar texto, títulos, tabelas e anotações.
        </p>
      </div>
    )
  }

  return (
    <div
      className={`markdown-content select-text leading-relaxed text-xs text-neutral-200 ${className}`}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }): React.JSX.Element => (
            <h1 className='text-lg font-bold text-vtt-golden font-cinzel tracking-wide border-b border-vtt-golden/30 pb-2 mt-4 mb-3 first:mt-1 flex items-center gap-2'>
              <span className='w-1.5 h-4 rounded-full bg-vtt-golden shrink-0 inline-block' />
              {children}
            </h1>
          ),
          h2: ({ children }): React.JSX.Element => (
            <h2 className='text-base font-bold text-neutral-100 font-cinzel tracking-wide border-b border-vtt-light-gray/40 pb-1 mt-4 mb-2 flex items-center gap-2'>
              <span className='w-1 h-3 rounded-full bg-vtt-red shrink-0 inline-block' />
              {children}
            </h2>
          ),
          h3: ({ children }): React.JSX.Element => (
            <h3 className='text-sm font-semibold text-amber-200/90 font-cinzel mt-3 mb-1.5'>
              {children}
            </h3>
          ),
          h4: ({ children }): React.JSX.Element => (
            <h4 className='text-xs font-semibold uppercase tracking-wider text-neutral-300 mt-3 mb-1 font-cinzel'>
              {children}
            </h4>
          ),
          h5: ({ children }): React.JSX.Element => (
            <h5 className='text-xs font-semibold text-neutral-400 mt-2 mb-1'>
              {children}
            </h5>
          ),
          h6: ({ children }): React.JSX.Element => (
            <h6 className='text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mt-2 mb-1'>
              {children}
            </h6>
          ),
          p: ({ children }): React.JSX.Element => (
            <p className='my-2 text-xs text-neutral-200 leading-relaxed'>
              {children}
            </p>
          ),
          strong: ({ children }): React.JSX.Element => (
            <strong className='font-bold text-amber-200'>
              {children}
            </strong>
          ),
          em: ({ children }): React.JSX.Element => (
            <em className='italic text-neutral-300'>
              {children}
            </em>
          ),
          del: ({ children }): React.JSX.Element => (
            <del className='line-through text-neutral-500'>
              {children}
            </del>
          ),
          blockquote: ({ children }): React.JSX.Element => <CustomBlockquote>{children}</CustomBlockquote>,
          ul: ({ children }): React.JSX.Element => (
            <ul className='list-disc list-outside pl-5 space-y-1 my-2 text-neutral-200 marker:text-vtt-golden'>
              {children}
            </ul>
          ),
          ol: ({ children }): React.JSX.Element => (
            <ol className='list-decimal list-outside pl-5 space-y-1 my-2 text-neutral-200 marker:text-vtt-golden'>
              {children}
            </ol>
          ),
          li: ({ children }): React.JSX.Element => (
            <li className='leading-relaxed'>
              {children}
            </li>
          ),
          table: ({ children }): React.JSX.Element => (
            <div className='my-3 overflow-x-auto rounded-xl border border-vtt-light-gray/40 bg-neutral-950/50 shadow-inner'>
              <table className='min-w-full divide-y divide-vtt-light-gray/40 text-left text-xs'>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }): React.JSX.Element => (
            <thead className='bg-neutral-900/90 text-vtt-golden font-cinzel font-semibold text-[11px] uppercase tracking-wider'>
              {children}
            </thead>
          ),
          tbody: ({ children }): React.JSX.Element => (
            <tbody className='divide-y divide-vtt-light-gray/20'>
              {children}
            </tbody>
          ),
          tr: ({ children }): React.JSX.Element => (
            <tr className='odd:bg-neutral-900/40 even:bg-neutral-900/10 hover:bg-neutral-800/50 transition-colors'>
              {children}
            </tr>
          ),
          th: ({ children }): React.JSX.Element => (
            <th className='px-3.5 py-2 font-bold'>
              {children}
            </th>
          ),
          td: ({ children }): React.JSX.Element => (
            <td className='px-3.5 py-2 text-neutral-200'>
              {children}
            </td>
          ),
          pre: ({ children }): React.JSX.Element => {
            const firstChild = React.Children.toArray(children)[0]
            if (React.isValidElement(firstChild) && firstChild.type === 'code') {
              const codeProps = firstChild.props as { className?: string; children?: React.ReactNode }
              return <CodeBlock className={codeProps.className}>{codeProps.children}</CodeBlock>
            }
            return <CodeBlock>{children}</CodeBlock>
          },
          code: ({ className, children }): React.JSX.Element => {
            return (
              <code className={`px-1.5 py-0.5 rounded bg-black/60 border border-neutral-700/60 text-amber-300 font-mono text-[11px] ${className || ''}`}>
                {children}
              </code>
            )
          },
          hr: (): React.JSX.Element => (
            <div className='my-5 relative flex items-center justify-center select-none'>
              <div className='w-full h-px bg-gradient-to-r from-transparent via-vtt-golden/40 to-transparent' />
              <span className='absolute px-2.5 bg-vtt-dark text-vtt-golden/60 text-[10px]'>✦</span>
            </div>
          ),
          a: ({ href, children }): React.JSX.Element => (
            <a
              href={href}
              target='_blank'
              rel='noreferrer'
              className='text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors inline-flex items-center gap-1 cursor-pointer'
            >
              {children}
              <ExternalLink className='w-3 h-3 inline-block shrink-0 opacity-70' />
            </a>
          ),
          img: ({ src, alt }): React.JSX.Element => (
            <span className='block my-3 text-center'>
              <img
                src={src}
                alt={alt || ''}
                className='max-h-72 max-w-full rounded-xl mx-auto border border-vtt-light-gray/40 shadow-lg object-contain bg-black/40'
              />
              {alt && <span className='block text-[11px] text-neutral-400 italic mt-1.5'>{alt}</span>}
            </span>
          ),
          input: ({ type, checked, disabled }): React.JSX.Element => {
            if (type === 'checkbox') {
              return (
                <input
                  type='checkbox'
                  checked={checked}
                  disabled={disabled}
                  readOnly
                  className='mr-2 align-middle accent-vtt-red rounded cursor-default'
                />
              )
            }
            return <input type={type} />
          }
        }}
      >
        {markdown}
      </Markdown>
    </div>
  )
}
