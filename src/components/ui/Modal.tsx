import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/utils/cn'

type ModalProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, children, className }: ModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-start justify-center bg-black/20 px-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className={cn('w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-calm', className)}
            initial={{ y: 16, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.16 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
