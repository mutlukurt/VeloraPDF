import type { Page, TiptapDoc, TiptapNode } from '../../types'
import { db } from '../db/client'
import { getPageIconText } from '../icons/pageIconText'
import { downloadBlob, safeFileName } from '../utils/files'

const pageStyle = `
  .kairnly-pdf-page {
    width: 794px;
    min-height: 1123px;
    box-sizing: border-box;
    padding: 72px;
    background: #fffdf8;
    color: #1f1f1c;
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.7;
    font-size: 15px;
  }
  .kairnly-pdf-title {
    margin: 0 0 28px;
    font-size: 38px;
    line-height: 1.15;
    letter-spacing: 0;
  }
  .kairnly-pdf-meta {
    margin-bottom: 18px;
    color: #8a8275;
    font-size: 12px;
  }
  .kairnly-pdf-page h1 { margin: 28px 0 10px; font-size: 28px; line-height: 1.2; }
  .kairnly-pdf-page h2 { margin: 24px 0 8px; font-size: 22px; line-height: 1.25; }
  .kairnly-pdf-page h3 { margin: 20px 0 6px; font-size: 18px; line-height: 1.3; }
  .kairnly-pdf-page p { margin: 9px 0; }
  .kairnly-pdf-page ul, .kairnly-pdf-page ol { margin: 10px 0; padding-left: 26px; }
  .kairnly-pdf-page li { margin: 4px 0; }
  .kairnly-pdf-page blockquote {
    margin: 16px 0;
    padding: 12px 16px;
    border-left: 4px solid #8b6f47;
    border-radius: 0 10px 10px 0;
    background: #f0ebe2;
  }
  .kairnly-pdf-page pre {
    margin: 16px 0;
    padding: 14px;
    border: 1px solid #e2dace;
    border-radius: 10px;
    overflow: hidden;
    background: #f0ebe2;
    white-space: pre-wrap;
    font-size: 12px;
    line-height: 1.55;
  }
  .kairnly-pdf-page code {
    padding: 2px 5px;
    border-radius: 5px;
    background: #f0ebe2;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .kairnly-pdf-page pre code { padding: 0; background: transparent; }
  .kairnly-pdf-page hr { margin: 26px 0; border: 0; border-top: 1px solid #e2dace; }
  .kairnly-pdf-page img {
    display: block;
    max-width: 100%;
    max-height: 620px;
    margin: 16px 0;
    border-radius: 12px;
    border: 1px solid #e2dace;
  }
  .kairnly-pdf-page table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  .kairnly-pdf-page td, .kairnly-pdf-page th { border: 1px solid #e2dace; padding: 8px; vertical-align: top; }
  .kairnly-pdf-page th { background: #f0ebe2; }
  .kairnly-pdf-media {
    margin: 16px 0;
    padding: 14px;
    border: 1px solid #e2dace;
    border-radius: 12px;
    background: #ffffff;
  }
  .kairnly-pdf-media small { display: block; color: #8a8275; margin-bottom: 5px; }
  .kairnly-pdf-media strong { display: block; }
  .kairnly-pdf-media span { display: block; overflow-wrap: anywhere; color: #6f6a60; font-size: 12px; }
`

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function attrsToStyle(attrs?: Record<string, unknown>) {
  const styles: string[] = []
  if (typeof attrs?.color === 'string') styles.push(`color:${attrs.color}`)
  if (typeof attrs?.backgroundColor === 'string') styles.push(`background-color:${attrs.backgroundColor}`)
  return styles.length ? ` style="${styles.join(';')}"` : ''
}

function renderChildren(node?: TiptapNode) {
  return node?.content?.map(renderNode).join('') ?? ''
}

function renderText(node: TiptapNode) {
  let html = escapeHtml(node.text ?? '')
  node.marks?.forEach((mark) => {
    if (mark.type === 'bold') html = `<strong>${html}</strong>`
    if (mark.type === 'italic') html = `<em>${html}</em>`
    if (mark.type === 'underline') html = `<u>${html}</u>`
    if (mark.type === 'strike') html = `<s>${html}</s>`
    if (mark.type === 'code') html = `<code>${html}</code>`
    if (mark.type === 'link') html = `<a href="${escapeHtml(String(mark.attrs?.href ?? '#'))}">${html}</a>`
    if (mark.type === 'textStyle') html = `<span${attrsToStyle(mark.attrs)}>${html}</span>`
    if (mark.type === 'highlight') html = `<mark style="background:${escapeHtml(String(mark.attrs?.color ?? '#d8c6a5'))}">${html}</mark>`
  })
  return html
}

function renderNode(node: TiptapNode): string {
  if (node.type === 'text') return renderText(node)
  if (node.type === 'paragraph') return `<p>${renderChildren(node) || '&nbsp;'}</p>`
  if (node.type === 'heading') {
    const level = Number(node.attrs?.level ?? 1)
    const tag = level === 2 ? 'h2' : level === 3 ? 'h3' : 'h1'
    return `<${tag}>${renderChildren(node)}</${tag}>`
  }
  if (node.type === 'bulletList') return `<ul>${renderChildren(node)}</ul>`
  if (node.type === 'orderedList') return `<ol>${renderChildren(node)}</ol>`
  if (node.type === 'listItem') return `<li>${renderChildren(node)}</li>`
  if (node.type === 'taskList') return `<ul>${renderChildren(node)}</ul>`
  if (node.type === 'taskItem') {
    const checked = node.attrs?.checked ? '☑' : '☐'
    return `<li>${checked} ${renderChildren(node)}</li>`
  }
  if (node.type === 'blockquote') return `<blockquote>${renderChildren(node)}</blockquote>`
  if (node.type === 'codeBlock') return `<pre><code>${escapeHtml(node.content?.map((child) => child.text ?? '').join('') ?? '')}</code></pre>`
  if (node.type === 'horizontalRule') return '<hr />'
  if (node.type === 'image') {
    const src = escapeHtml(String(node.attrs?.src ?? ''))
    const alt = escapeHtml(String(node.attrs?.alt ?? ''))
    return src ? `<img src="${src}" alt="${alt}" />` : ''
  }
  if (node.type === 'table') return `<table>${renderChildren(node)}</table>`
  if (node.type === 'tableRow') return `<tr>${renderChildren(node)}</tr>`
  if (node.type === 'tableCell') return `<td>${renderChildren(node)}</td>`
  if (node.type === 'tableHeader') return `<th>${renderChildren(node)}</th>`
  if (node.type === 'mediaBlock') {
    const kind = escapeHtml(String(node.attrs?.kind ?? 'file'))
    const name = escapeHtml(String(node.attrs?.name ?? node.attrs?.label ?? 'Attachment'))
    const src = escapeHtml(String(node.attrs?.src ?? ''))
    if (kind === 'video') {
      return `<div class="kairnly-pdf-media"><small>Video</small><strong>${name}</strong><span>Video file is included in the workspace, but PDF export shows it as an attachment card.</span></div>`
    }
    return `<div class="kairnly-pdf-media"><small>${kind}</small><strong>${name}</strong><span>${src}</span></div>`
  }
  return renderChildren(node)
}

function renderPageHtml(page: Page, doc: TiptapDoc) {
  const body = doc.content?.map(renderNode).join('') || '<p></p>'
  return `
    <style>${pageStyle}</style>
    <article class="kairnly-pdf-page">
      <div class="kairnly-pdf-meta">${escapeHtml(getPageIconText(page.icon))} · Kairnly · ${new Date(page.updatedAt).toLocaleString()}</div>
      <h1 class="kairnly-pdf-title">${escapeHtml(page.title || 'Untitled')}</h1>
      ${body}
    </article>
  `
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || 'untitled'
  )
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
      })
    }),
  )
}

function collectPdfCutPositions(root: HTMLElement) {
  const rootRect = root.getBoundingClientRect()
  const cuts = new Set<number>([0, root.scrollHeight])

  root.querySelectorAll('*').forEach((element) => {
    const rect = element.getBoundingClientRect()
    const bottom = Math.round(rect.bottom - rootRect.top)
    if (bottom > 0) cuts.add(bottom + 4)
  })

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const textNode = walker.currentNode
    if (!textNode.textContent?.trim()) continue

    const range = document.createRange()
    range.selectNodeContents(textNode)
    Array.from(range.getClientRects()).forEach((rect) => {
      const bottom = Math.round(rect.bottom - rootRect.top)
      if (bottom > 0) cuts.add(bottom + 4)
    })
    range.detach()
  }

  return Array.from(cuts).sort((a, b) => a - b)
}

function findPdfCut(cuts: number[], from: number, desired: number, max: number) {
  if (desired >= max) return max

  const minimumProgress = from + 120
  let best = 0
  for (const cut of cuts) {
    if (cut <= from || cut > desired) continue
    if (cut >= minimumProgress) best = cut
  }

  return best || Math.min(desired, max)
}

function makePdfPageCanvas(source: HTMLCanvasElement, sourceY: number, sourceHeight: number, pageHeight: number, destinationY: number) {
  const page = document.createElement('canvas')
  page.width = source.width
  page.height = pageHeight

  const context = page.getContext('2d')
  if (!context) throw new Error('Could not prepare PDF page canvas.')

  context.fillStyle = '#fffdf8'
  context.fillRect(0, 0, page.width, page.height)
  context.drawImage(source, 0, sourceY, source.width, sourceHeight, 0, destinationY, source.width, sourceHeight)

  return page
}

async function htmlToPdfBlob(html: string) {
  const [html2canvasModule, jspdfModule] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ])

  type PdfDocument = {
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } }
    addImage: (imageData: string, format: string, x: number, y: number, width: number, height: number) => void
    addPage: () => void
    output: (type: 'blob') => Blob
  }
  type JsPdfConstructor = new (orientation: 'p', unit: 'mm', format: 'a4') => PdfDocument

  const html2canvas = html2canvasModule.default || html2canvasModule
  const jsPdfExports = jspdfModule as { jsPDF?: JsPdfConstructor; default?: JsPdfConstructor }
  const jsPDF = jsPdfExports.jsPDF ?? jsPdfExports.default

  if (!jsPDF) {
    throw new Error('PDF export library could not be loaded.')
  }

  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-10000px'
  host.style.top = '0'
  host.style.width = '794px'
  host.innerHTML = html
  document.body.appendChild(host)

  try {
    await waitForImages(host)

    const targetEl = host.querySelector('.kairnly-pdf-page') as HTMLElement
    if (!targetEl) {
      throw new Error('PDF page element not found in HTML template')
    }

    const canvas = await html2canvas(targetEl, {
      scale: 2,
      width: 794,
      height: targetEl.scrollHeight,
      windowWidth: 794,
      windowHeight: targetEl.scrollHeight,
      backgroundColor: '#fffdf8',
      useCORS: true,
      allowTaint: true,
      logging: false,
    })

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const pageHeightCss = 1123
    const pageMarginCss = 72
    const contentHeightCss = pageHeightCss - pageMarginCss * 2
    const scale = canvas.width / targetEl.offsetWidth
    const cuts = collectPdfCutPositions(targetEl)

    let y = 0
    let pageIndex = 0
    while (y < targetEl.scrollHeight) {
      const desiredY = pageIndex === 0 ? y + pageHeightCss - pageMarginCss : y + contentHeightCss
      const nextY = findPdfCut(cuts, y, desiredY, targetEl.scrollHeight)
      const sourceY = Math.round(y * scale)
      const sourceHeight = Math.max(1, Math.round((nextY - y) * scale))
      const destinationY = pageIndex === 0 ? 0 : Math.round(pageMarginCss * scale)
      const pageCanvas = makePdfPageCanvas(canvas, sourceY, sourceHeight, Math.round(pageHeightCss * scale), destinationY)

      if (pageIndex > 0) pdf.addPage()
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageWidth, pageHeight)

      y = nextY
      pageIndex += 1
    }

    return pdf.output('blob')
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  } finally {
    if (host.parentNode) {
      document.body.removeChild(host)
    }
  }
}

export function collectPageFamily(rootId: string, pages: Page[]) {
  const out: Page[] = []
  const visit = (pageId: string) => {
    const page = pages.find((item) => item.id === pageId)
    if (!page) return
    out.push(page)
    pages
      .filter((item) => item.parentId === pageId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((child) => visit(child.id))
  }
  visit(rootId)
  return out
}

export async function exportPagePdf(page: Page, doc?: TiptapDoc) {
  const pageDoc = doc ?? (await db.loadPageContent(page.id))
  const blob = await htmlToPdfBlob(renderPageHtml(page, pageDoc))
  await downloadBlob(blob, `${slugify(page.title)}.pdf`)
}

export async function exportPagesAsPdfZip(pages: Page[], filename: string) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const page of pages) {
    const doc = await db.loadPageContent(page.id)
    const blob = await htmlToPdfBlob(renderPageHtml(page, doc))
    zip.file(`${slugify(page.title)}-${page.id.slice(0, 6)}.pdf`, blob)
  }
  const archive = await zip.generateAsync({ type: 'blob' })
  await downloadBlob(archive, safeFileName(filename, 'kairnly-pdfs.zip'))
}
