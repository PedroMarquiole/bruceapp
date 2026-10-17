import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type SheetProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Folha modal que sobe da base (usa <dialog> nativo: foco preso e Esc fecham por padrão). */
export function Sheet({ open, title, onClose, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal()
      else d.setAttribute('open', '')
    }
    if (!open && d.open) {
      if (typeof d.close === 'function') d.close()
      else d.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[var(--radius-panel)] border-t border-line bg-obsidian p-0 text-ink backdrop:bg-black/70 sm:mx-auto sm:max-w-xl"
    >
      {open ? (
        <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-line" />
          <div className="mt-3 flex items-center justify-between gap-4">
            <h2 className="type-section">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="-mr-2 grid size-11 place-items-center rounded-full text-ink-muted hover:text-ink"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      ) : null}
    </dialog>
  )
}
