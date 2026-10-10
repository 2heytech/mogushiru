import { describe, expect, it } from 'vitest'
import { answer, confirmDialog, useConfirmStore } from './confirm'

describe('アプリ内の確認ダイアログ', () => {
  it('答えた内容で解決し、閉じる', async () => {
    const yes = confirmDialog('空にしますか？')
    expect(useConfirmStore.getState().request?.message).toBe('空にしますか？')
    answer(true)
    await expect(yes).resolves.toBe(true)
    expect(useConfirmStore.getState().request).toBeNull()
    const no = confirmDialog('削除しますか？')
    answer(false)
    await expect(no).resolves.toBe(false)
  })

  it('前の確認が残っていたら、やめた扱いにして新しい確認に替える', async () => {
    const first = confirmDialog('1つめ')
    const second = confirmDialog('2つめ')
    await expect(first).resolves.toBe(false)
    answer(true)
    await expect(second).resolves.toBe(true)
  })
})
