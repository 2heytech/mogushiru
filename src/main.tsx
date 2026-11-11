import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 書体はこのサイトから配信する（外部の Google Fonts に接続しない）。文字の範囲ごとに分かれていて、使う字のファイルだけが読まれる
import '@fontsource/zen-maru-gothic/500.css'
import '@fontsource/zen-maru-gothic/700.css'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
