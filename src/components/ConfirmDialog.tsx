import { answer, useConfirmStore, type ConfirmRequest } from './confirm'
import { useDialog } from './useDialog'

// App の最後に1つだけ置く。ほかのダイアログより手前に出す
export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request)
  return request ? <ConfirmBox request={request} /> : null
}

function ConfirmBox({ request }: { request: ConfirmRequest }) {
  const dialogRef = useDialog(() => answer(false))
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/30 px-4" onClick={() => answer(false)}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-label={request.message}
        className="outline-none w-full max-w-sm rounded-[var(--radius-card)] bg-cream p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base leading-relaxed">{request.message}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => answer(false)} className="min-h-11 flex-1 rounded-full bg-white">
            やめる
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => answer(true)}
            className={`min-h-11 flex-1 rounded-full font-bold text-ink-strong ${request.danger ? 'bg-alert' : 'bg-coral'}`}
          >
            {request.okLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
