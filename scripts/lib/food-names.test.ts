import { describe, expect, it } from 'vitest'
import { makeDisplayName, synonymTerms, toHiragana } from './food-names'

describe('表示名', () => {
  it.each([
    ['こめ　［水稲めし］　精白米　うるち米', 'こめ 水稲めし 精白米 うるち米'],
    ['こむぎ　［パン類］　角形食パン　食パン', 'こむぎ 角形食パン 食パン'],
    ['＜畜肉類＞　ぶた　［ハム類］　ロースハム　ロースハム', 'ぶた ロースハム'],
    ['（キャベツ類）　キャベツ　結球葉　生', 'キャベツ 結球葉 生'],
    ['（だいこん類）　漬物　みそ漬', 'だいこん 漬物 みそ漬'],
    ['＜魚類＞　（まぐろ類）　缶詰　水煮　フレーク　ホワイト', 'まぐろ 缶詰 水煮 フレーク ホワイト'],
    ['バナナ　生', 'バナナ 生'],
  ])('%s → %s', (name, expected) => {
    expect(makeDisplayName(name)).toBe(expected)
  })
})

describe('同義語', () => {
  const synonyms = [
    { match: '水稲めし', add: ['ごはん', 'ライス'] },
    { match: 'かき', add: ['柿'], group: '07' },
    { match: 'かき', add: ['牡蠣'], group: '10' },
    { match: 'まぐろ類） 缶詰', add: ['ツナ'] },
  ]
  it('食品名に含まれる語の同義語を足す', () => {
    expect(synonymTerms('こめ　［水稲めし］　精白米', '01', synonyms)).toEqual(['ごはん', 'ライス'])
  })
  it('食品群の指定があればその群だけ', () => {
    expect(synonymTerms('かき　甘がき　生', '07', synonyms)).toEqual(['柿'])
    expect(synonymTerms('＜貝類＞　かき　養殖　生', '10', synonyms)).toEqual(['牡蠣'])
  })
  it('全角空白の食品名でも空白を揃えて照合する', () => {
    expect(synonymTerms('＜魚類＞　（まぐろ類）　缶詰　水煮', '10', synonyms)).toEqual(['ツナ'])
  })
  it('カタカナをひらがなにする', () => {
    expect(toHiragana('セイハクマイ')).toBe('せいはくまい')
  })
})
