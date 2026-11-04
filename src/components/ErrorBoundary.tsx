import { Component, type ErrorInfo, type ReactNode } from 'react'

// 思わぬ不具合で画面が描けなくなったとき、真っ白にせず「読み込み直す」を出す。
// 保存した食事やプロフィールはブラウザに残っているので、読み込み直せば続きから使える
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('画面を表示できませんでした', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div role="alert" className="w-full rounded-[var(--radius-card)] bg-white/80 p-6 shadow-sm">
          <p className="text-lg font-bold">うまく表示できませんでした</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            ごめんなさい。読み込み直すと、たいていは元に戻ります。入れた食事やプロフィールはこの端末に残っています。
          </p>
          <button type="button" onClick={() => location.reload()} className="mt-5 min-h-11 w-full rounded-full bg-coral font-bold text-white hover:bg-coral-dark">
            読み込み直す
          </button>
        </div>
      </div>
    )
  }
}
