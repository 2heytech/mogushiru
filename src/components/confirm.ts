import { create } from 'zustand'

// ブラウザ標準の window.confirm は、埋め込み表示（sandbox の iframe）では出ずに false を返すため、アプリ内の確認ダイアログを使う
type Request = { message: string; okLabel: string; danger: boolean; resolve: (ok: boolean) => void }

export const useConfirmStore = create<{ request: Request | null }>(() => ({ request: null }))

export function confirmDialog(message: string, { okLabel = 'OK', danger = false }: { okLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().request?.resolve(false)
    useConfirmStore.setState({ request: { message, okLabel, danger, resolve } })
  })
}

export const answer = (ok: boolean) => {
  const r = useConfirmStore.getState().request
  useConfirmStore.setState({ request: null })
  r?.resolve(ok)
}
