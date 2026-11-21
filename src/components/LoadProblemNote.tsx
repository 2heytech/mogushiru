import { useContext } from 'react'
import { LoadProblemContext, loadProblemText } from './loadProblemContext'

// データを読み込めなかったときの案内（もう一度読み込むボタンつき）。読み込めなかったデータがなければ、何も出さない
export function LoadProblemNote({ className = '' }: { className?: string }) {
  const problem = useContext(LoadProblemContext)
  if (!problem || problem.failed.length === 0) return null
  return (
    <div role="alert" className={`rounded-2xl bg-caution/20 px-4 py-3 text-left text-sm leading-relaxed text-ink ${className}`}>
      <p>
        <strong>{loadProblemText(problem.failed)}</strong>
        通信の状態を確かめて、もう一度読み込んでください。直らないときは、ページを読み込み直してください。
      </p>
      <button
        type="button"
        onClick={problem.retry}
        disabled={problem.retrying}
        className="mt-2 min-h-11 rounded-full bg-white px-4 text-sm font-bold text-coral-ink shadow-sm transition hover:bg-coral/5 disabled:text-ink-soft"
      >
        {problem.retrying ? '読み込んでいます…' : 'もう一度読み込む'}
      </button>
    </div>
  )
}
