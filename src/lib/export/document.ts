import type { Page, TiptapDoc, TiptapNode } from '../../types'
import { getPageIconText } from '../icons/pageIconText'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeAttribute(value: unknown) {
  return escapeHtml(String(value ?? ''))
}

function escapeMarkdown(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('`', '\\`')
    .replaceAll('*', '\\*')
    .replaceAll('_', '\\_')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replaceAll('|', '\\|')
}

function attrsToStyle(attrs?: Record<string, unknown>) {
  const styles: string[] = []
  if (typeof attrs?.color === 'string' && attrs.color) styles.push(`color:${attrs.color}`)
  if (typeof attrs?.backgroundColor === 'string' && attrs.backgroundColor) styles.push(`background-color:${attrs.backgroundColor}`)
  return styles.length ? ` style="${styles.join(';')}"` : ''
}

function renderHtmlChildren(node?: TiptapNode) {
  return node?.content?.map(renderHtmlNode).join('') ?? ''
}

function renderHtmlText(node: TiptapNode) {
  let html = escapeHtml(node.text ?? '')

  node.marks?.forEach((mark) => {
    if (mark.type === 'bold') html = `<strong>${html}</strong>`
    if (mark.type === 'italic') html = `<em>${html}</em>`
    if (mark.type === 'underline') html = `<u>${html}</u>`
    if (mark.type === 'strike') html = `<s>${html}</s>`
    if (mark.type === 'code') html = `<code>${html}</code>`
    if (mark.type === 'link') html = `<a href="${escapeAttribute(mark.attrs?.href)}">${html}</a>`
    if (mark.type === 'textStyle') html = `<span${attrsToStyle(mark.attrs)}>${html}</span>`
    if (mark.type === 'highlight') html = `<mark style="background:${escapeAttribute(mark.attrs?.color ?? '#d8c6a5')}">${html}</mark>`
  })

  return html
}

function renderHtmlNode(node: TiptapNode): string {
  if (node.type === 'text') return renderHtmlText(node)
  if (node.type === 'paragraph') return `<p>${renderHtmlChildren(node) || '<br />'}</p>`
  if (node.type === 'heading') {
    const level = Math.min(3, Math.max(1, Number(node.attrs?.level ?? 1)))
    return `<h${level}>${renderHtmlChildren(node)}</h${level}>`
  }
  if (node.type === 'bulletList') return `<ul>${renderHtmlChildren(node)}</ul>`
  if (node.type === 'orderedList') return `<ol>${renderHtmlChildren(node)}</ol>`
  if (node.type === 'listItem') return `<li>${renderHtmlChildren(node)}</li>`
  if (node.type === 'taskList') return `<ul class="task-list">${renderHtmlChildren(node)}</ul>`
  if (node.type === 'taskItem') {
    const checked = node.attrs?.checked ? ' checked' : ''
    return `<li class="task-item"><input type="checkbox"${checked} disabled /> ${renderHtmlChildren(node)}</li>`
  }
  if (node.type === 'blockquote') return `<blockquote>${renderHtmlChildren(node)}</blockquote>`
  if (node.type === 'codeBlock') {
    const language = escapeAttribute(node.attrs?.language)
    const text = escapeHtml(node.content?.map((child) => child.text ?? '').join('') ?? '')
    return `<pre><code${language ? ` data-language="${language}"` : ''}>${text}</code></pre>`
  }
  if (node.type === 'horizontalRule') return '<hr />'
  if (node.type === 'image') {
    const src = escapeAttribute(node.attrs?.src)
    const alt = escapeAttribute(node.attrs?.alt ?? node.attrs?.title)
    return src ? `<img src="${src}" alt="${alt}" />` : ''
  }
  if (node.type === 'table') return `<table>${renderHtmlChildren(node)}</table>`
  if (node.type === 'tableRow') return `<tr>${renderHtmlChildren(node)}</tr>`
  if (node.type === 'tableCell') return `<td>${renderHtmlChildren(node)}</td>`
  if (node.type === 'tableHeader') return `<th>${renderHtmlChildren(node)}</th>`
  if (node.type === 'mediaBlock') {
    const kind = escapeAttribute(node.attrs?.kind ?? 'file')
    const src = escapeAttribute(node.attrs?.src)
    const name = escapeAttribute(node.attrs?.name ?? node.attrs?.label ?? 'Attachment')
    const mime = escapeAttribute(node.attrs?.mime)

    if (kind === 'video') {
      return `<figure class="media-block"><video src="${src}" controls></video><figcaption>${name}</figcaption></figure>`
    }

    return `<aside class="media-card"><span>${mime || kind}</span><strong>${name}</strong>${src ? `<a href="${src}">${src}</a>` : ''}</aside>`
  }

  return renderHtmlChildren(node)
}

function renderMarkdownInline(node?: TiptapNode) {
  return node?.content?.map(renderMarkdownNode).join('') ?? ''
}

function renderMarkdownText(node: TiptapNode) {
  let value = escapeMarkdown(node.text ?? '')

  node.marks?.forEach((mark) => {
    if (mark.type === 'bold') value = `**${value}**`
    if (mark.type === 'italic') value = `_${value}_`
    if (mark.type === 'underline') value = `<u>${value}</u>`
    if (mark.type === 'strike') value = `~~${value}~~`
    if (mark.type === 'code') value = `\`${value}\``
    if (mark.type === 'link') value = `[${value}](${String(mark.attrs?.href ?? '#')})`
    if (mark.type === 'textStyle') {
      value = `<span${attrsToStyle(mark.attrs)}>${value}</span>`
    }
    if (mark.type === 'highlight') value = `<mark style="background:${escapeAttribute(mark.attrs?.color ?? '#d8c6a5')}">${value}</mark>`
  })

  return value
}

function indentMarkdown(value: string, spaces: number) {
  const prefix = ' '.repeat(spaces)
  return value
    .split('\n')
    .map((line) => (line ? `${prefix}${line}` : line))
    .join('\n')
}

function renderListItem(node: TiptapNode, marker: string, depth: number) {
  const content = node.content ?? []
  const parts: string[] = []
  let firstLine = ''

  content.forEach((child) => {
    if (child.type === 'paragraph') {
      const text = renderMarkdownInline(child).trim()
      if (!firstLine) firstLine = text
      else parts.push(indentMarkdown(text, depth + 2))
      return
    }

    parts.push(indentMarkdown(renderMarkdownNode(child, depth + 2).trim(), depth + 2))
  })

  return `${' '.repeat(depth)}${marker} ${firstLine}${parts.length ? `\n${parts.join('\n')}` : ''}`
}

function renderTableMarkdown(node: TiptapNode) {
  const rows = node.content ?? []
  const renderedRows = rows.map((row) =>
    (row.content ?? []).map((cell) => renderMarkdownInline(cell).trim().replaceAll('\n', '<br>') || ' '),
  )

  if (renderedRows.length === 0) return ''

  const header = renderedRows[0]
  const separator = header.map(() => '---')
  const body = renderedRows.slice(1)
  return [header, separator, ...body].map((row) => `| ${row.join(' | ')} |`).join('\n')
}

function renderMarkdownNode(node: TiptapNode, depth = 0): string {
  if (node.type === 'text') return renderMarkdownText(node)
  if (node.type === 'paragraph') return renderMarkdownInline(node)
  if (node.type === 'heading') return `${'#'.repeat(Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1))))} ${renderMarkdownInline(node)}`
  if (node.type === 'bulletList') {
    return (node.content ?? []).map((child) => renderListItem(child, '-', depth)).join('\n')
  }
  if (node.type === 'orderedList') {
    return (node.content ?? []).map((child, index) => renderListItem(child, `${index + 1}.`, depth)).join('\n')
  }
  if (node.type === 'taskList') {
    return (node.content ?? []).map((child) => renderListItem(child, child.attrs?.checked ? '- [x]' : '- [ ]', depth)).join('\n')
  }
  if (node.type === 'blockquote') return indentMarkdown(renderMarkdownInline(node), 0).split('\n').map((line) => `> ${line}`).join('\n')
  if (node.type === 'codeBlock') {
    const language = typeof node.attrs?.language === 'string' ? node.attrs.language : ''
    const text = node.content?.map((child) => child.text ?? '').join('') ?? ''
    return `\`\`\`${language}\n${text}\n\`\`\``
  }
  if (node.type === 'horizontalRule') return '---'
  if (node.type === 'image') {
    const src = String(node.attrs?.src ?? '')
    const alt = escapeMarkdown(String(node.attrs?.alt ?? node.attrs?.title ?? 'Image'))
    return src ? `![${alt}](${src})` : ''
  }
  if (node.type === 'table') return renderTableMarkdown(node)
  if (node.type === 'tableRow' || node.type === 'tableCell' || node.type === 'tableHeader') return renderMarkdownInline(node)
  if (node.type === 'mediaBlock') {
    const kind = String(node.attrs?.kind ?? 'file')
    const name = escapeMarkdown(String(node.attrs?.name ?? node.attrs?.label ?? 'Attachment'))
    const src = String(node.attrs?.src ?? '')
    return src ? `> ${kind}: [${name}](${src})` : `> ${kind}: ${name}`
  }

  return renderMarkdownInline(node)
}

export function exportPageMarkdown(page: Page, doc: TiptapDoc) {
  const body = doc.content?.map((node) => renderMarkdownNode(node).trim()).filter(Boolean).join('\n\n') ?? ''
  return `# ${escapeMarkdown(page.title || 'Untitled')}\n\n${body}\n`
}

export function exportPageHtml(page: Page, doc: TiptapDoc) {
  const body = doc.content?.map(renderHtmlNode).join('\n') || '<p></p>'

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(page.title || 'Untitled')} - Kairnly</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; background: #f7f3eb; color: #1f1f1c; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.7; }
    article { box-sizing: border-box; width: min(860px, calc(100% - 32px)); margin: 48px auto; padding: 56px; border: 1px solid #e2dace; border-radius: 8px; background: #fffdf8; }
    h1, h2, h3 { line-height: 1.2; }
    h1.title { margin: 0 0 28px; font-size: 40px; }
    .meta { margin-bottom: 12px; color: #8a8275; font-size: 13px; }
    blockquote { margin: 16px 0; padding: 12px 16px; border-left: 4px solid #8b6f47; background: #f0ebe2; }
    pre { overflow-x: auto; padding: 14px; border: 1px solid #e2dace; border-radius: 8px; background: #f0ebe2; }
    code { padding: 2px 5px; border-radius: 5px; background: #f0ebe2; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    pre code { padding: 0; background: transparent; }
    img, video { max-width: 100%; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td, th { border: 1px solid #e2dace; padding: 8px; vertical-align: top; }
    th { background: #f0ebe2; }
    .task-list { list-style: none; padding-left: 0; }
    .task-item { display: flex; gap: 8px; align-items: flex-start; }
    .media-card, .media-block { display: block; margin: 16px 0; padding: 14px; border: 1px solid #e2dace; border-radius: 8px; background: #fff; }
    .media-card span, .media-card a { display: block; overflow-wrap: anywhere; color: #6f6a60; font-size: 13px; }
  </style>
</head>
<body>
  <article>
    <div class="meta">${escapeHtml(getPageIconText(page.icon))} · Kairnly · ${new Date(page.updatedAt).toLocaleString()}</div>
    <h1 class="title">${escapeHtml(page.title || 'Untitled')}</h1>
    ${body}
  </article>
</body>
</html>
`
}
