import { createContext, useContext } from 'react'

// データ（料理・食材・市販品）を読み込めなかったときの案内に使う。
// 読み込めなかったデータは空として扱うので、そのままだと一覧や検索が「見つかりませんでした」になる。
// ないのではなく読み込めていないことと、もう一度読み込む方法を伝える（App.tsx が配り、LoadProblemNote.tsx などが読む）
export type LoadProblem = {
  // 読み込めなかったデータの呼び名（「料理」「食材」「コンビニ・メーカーの商品」など）
  failed: string[]
  retry: () => void
  retrying: boolean
}

export const LoadProblemContext = createContext<LoadProblem | null>(null)

// 読み込めなかったデータがあるか
export const useLoadFailed = (): boolean => (useContext(LoadProblemContext)?.failed.length ?? 0) > 0

export const loadProblemText = (failed: string[]): string => `${failed.join('・')}のデータを読み込めませんでした。`
