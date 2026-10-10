// 保存するときの名前の初期値。今日の日付を入れ、同じ名前があれば番号を付けて上書きにならないようにする
export function defaultMenuName(names: string[], today: Date): string {
  const base = `${today.getMonth() + 1}月${today.getDate()}日の食事`
  if (!names.includes(base)) return base
  for (let n = 2; ; n++) if (!names.includes(`${base} ${n}`)) return `${base} ${n}`
}
