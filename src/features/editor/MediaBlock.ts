import { mergeAttributes, Node } from '@tiptap/core'

export const MediaBlock = Node.create({
  name: 'mediaBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      kind: { default: 'file' },
      src: { default: '' },
      name: { default: '' },
      mime: { default: '' },
      label: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-kairnly-media]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const kind = HTMLAttributes.kind || 'file'
    const src = HTMLAttributes.src || ''
    const name = HTMLAttributes.name || HTMLAttributes.label || 'Untitled attachment'
    const mime = HTMLAttributes.mime || ''
    const label = HTMLAttributes.label || name

    if (kind === 'video') {
      return [
        'figure',
        mergeAttributes(HTMLAttributes, { 'data-kairnly-media': 'video', class: 'kairnly-media-block' }),
        ['video', { src, controls: 'true', class: 'kairnly-media-video' }],
        ['figcaption', {}, label],
      ]
    }

    if (kind === 'embed' || kind === 'bookmark') {
      return [
        'div',
        mergeAttributes(HTMLAttributes, { 'data-kairnly-media': kind, class: 'kairnly-media-block kairnly-media-card' }),
        ['span', { class: 'kairnly-media-kicker' }, kind === 'bookmark' ? 'Bookmark' : 'Embed'],
        ['strong', {}, label || src],
        ['span', { class: 'kairnly-media-url' }, src],
      ]
    }

    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-kairnly-media': 'file', class: 'kairnly-media-block kairnly-media-card' }),
      ['span', { class: 'kairnly-media-kicker' }, mime || 'Local file'],
      ['a', { href: src, download: name }, name],
      ['span', { class: 'kairnly-media-url' }, 'Stored in this workspace backup'],
    ]
  },
})
