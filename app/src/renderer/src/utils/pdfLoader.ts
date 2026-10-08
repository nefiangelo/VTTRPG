import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configura o worker do PDF.js utilizando a URL do Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export interface PdfDocumentInfo {
  numPages: number
  renderPage: (pageNumber: number, scale?: number) => Promise<string>
  renderAllPages: (scale?: number) => Promise<string[]>
}

/**
 * Carrega um documento PDF a partir de um ArrayBuffer ou Uint8Array
 * e disponibiliza funções para renderizar páginas como imagens WebP/PNG de alta resolução.
 */
export async function loadPdf(source: ArrayBuffer | Uint8Array): Promise<PdfDocumentInfo> {
  const loadingTask = pdfjsLib.getDocument({
    data: source instanceof Uint8Array ? source : new Uint8Array(source),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true
  })

  const pdfDoc = await loadingTask.promise
  const numPages = pdfDoc.numPages

  const renderPage = async (pageNumber: number, scale = 1.8): Promise<string> => {
    const page = await pdfDoc.getPage(pageNumber)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Falha ao obter contexto 2d do canvas')
    }

    // Renderiza fundo branco para páginas com transparência
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({
      canvasContext: context,
      viewport
    }).promise

    // Exporta imagem em WebP para alta qualidade com compressão eficiente
    return canvas.toDataURL('image/webp', 0.9)
  }

  const renderAllPages = async (scale = 1.8): Promise<string[]> => {
    const pages: string[] = []
    for (let i = 1; i <= numPages; i++) {
      const img = await renderPage(i, scale)
      pages.push(img)
    }
    return pages
  }

  return {
    numPages,
    renderPage,
    renderAllPages
  }
}

/**
 * Converte um arquivo enviado pelo usuário (File) em páginas de imagem.
 * Se for imagem (PNG/JPG/WebP), retorna diretamente em array de 1 imagem.
 * Se for PDF, renderiza as páginas em imagens.
 */
export async function convertFileToPages(file: File): Promise<{ pages: string[]; fileType: 'pdf' | 'image' }> {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve({
          pages: [reader.result as string],
          fileType: 'image'
        })
      }
      reader.onerror = () => reject(new Error('Erro ao ler imagem'))
      reader.readAsDataURL(file)
    })
  }

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer()
    const pdfInfo = await loadPdf(arrayBuffer)
    const pages = await pdfInfo.renderAllPages()
    return {
      pages,
      fileType: 'pdf'
    }
  }

  throw new Error('Formato de arquivo não suportado. Envie um PDF ou imagem (PNG, JPG, WebP).')
}

import sampleDndPdfUrl from './DnD_2024_Character-Sheet.pdf?url'

/**
 * Carrega o arquivo de exemplo DnD_2024_Character-Sheet.pdf disponibilizado no projeto
 */
export async function loadSampleDndPdf(): Promise<{ pages: string[]; fileType: 'pdf' }> {
  const response = await fetch(sampleDndPdfUrl)
  if (!response.ok) {
    throw new Error(`Falha ao carregar PDF de exemplo: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const pdfInfo = await loadPdf(arrayBuffer)
  const pages = await pdfInfo.renderAllPages()
  return {
    pages,
    fileType: 'pdf'
  }
}

