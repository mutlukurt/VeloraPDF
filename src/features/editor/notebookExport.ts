import { MIN_PAGE_COUNT, type PaperState, type PaperStroke, readNotebookPaper } from './NotebookPaper'
import { downloadBlob } from '../../lib/utils/files'

type NotebookExportTarget = {
  id: string
  title: string
}

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function strokeSvg(stroke: PaperStroke) {
  const points = stroke.points.map((point) => `${point.x * 794},${point.y * 1123}`).join(' ')
  return `<polyline points="${points}" fill="none" stroke="${escapeXml(stroke.color)}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${stroke.width}" opacity="${stroke.opacity}" />`
}

function pageSvg(state: PaperState, page: number) {
  const strokes = state.strokes.filter((stroke) => stroke.page === page).map(strokeSvg).join('')
  const recordings = state.recordings
    .filter((recording) => recording.page === page)
    .map((recording) => `<g transform="translate(${recording.x * 794} ${recording.y * 1123})"><circle r="15" fill="#5b4dff" opacity=".95"/><text x="0" y="5" text-anchor="middle" font-size="17" fill="#fff">♪</text></g>`)
    .join('')
  const lines = Array.from({ length: 29 }, (_, index) => {
    const y = 82 + index * 34
    return `<line x1="54" x2="740" y1="${y}" y2="${y}" stroke="#dfe3ee" stroke-width="1" />`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" viewBox="0 0 794 1123"><rect width="794" height="1123" fill="#fffef9"/>${lines}${strokes}${recordings}</svg>`
}

function svgToImage(svg: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not render notebook page.'))
    }
    image.src = url
  })
}

async function pagePngDataUrl(state: PaperState, page: number) {
  const image = await svgToImage(pageSvg(state, page))
  const canvas = document.createElement('canvas')
  canvas.width = 794
  canvas.height = 1123
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare notebook PDF.')
  context.drawImage(image, 0, 0, 794, 1123)
  return canvas.toDataURL('image/png')
}

export async function exportNotebookPdf(target: NotebookExportTarget) {
  const [{ jsPDF }] = await Promise.all([import('jspdf')])
  const state = readNotebookPaper(target.id)
  const pageCount = Math.max(MIN_PAGE_COUNT, state.pageCount)
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true })
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()

  for (let page = 1; page <= pageCount; page += 1) {
    if (page > 1) pdf.addPage('a4', 'portrait')
    pdf.addImage(await pagePngDataUrl(state, page), 'PNG', 0, 0, pdfWidth, pdfHeight)
  }

  const safeName = (target.title || 'Velora Notebook').trim().replace(/[^\w\s.-]/g, '').replace(/\s+/g, '-').slice(0, 56) || 'Velora-Notebook'
  await downloadBlob(pdf.output('blob'), `${safeName}.pdf`)
}
