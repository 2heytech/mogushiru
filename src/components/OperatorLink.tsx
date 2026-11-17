import { OPERATOR_NAME, OPERATOR_URL } from '../site'

// 運営者の名前。運営者のサイトを新しいタブでひらく。
// 運営者のサイトなので、どこから来たか（このサイトのアドレスの頭だけ）は伝える（noreferrer はつけない）
export function OperatorLink({ className }: { className: string }) {
  return (
    <a href={OPERATOR_URL} target="_blank" rel="noopener" className={className}>
      {OPERATOR_NAME}
    </a>
  )
}
