// 料理の一覧（/dishes/）だけが読む、小さなプログラム：名前の検索・しぼりこみ・並べかえ。
// 料理の行（li）の data-key（名前と読み）・data-kcal・data-protein・data-salt・data-min を読んで、行をかくす・並べなおす。
// しぼりこみの数字と並べかえの順は、フォームの data-* と value に書いてある（決めているのは src/pages/dishPages.tsx）。
// 条件は、フォームの値からそのつど読む（料理のページから「戻る」で帰ってきたとき、ブラウザが元にもどした値のとおりに出す）。
// このプログラムが動かないときは、一覧がそのまま出る
;(function () {
  var root = document.querySelector('[data-dish-index]')
  var form = root && root.querySelector('[data-dish-filter]')
  if (!form) return
  var list = function (nodes) {
    return Array.prototype.slice.call(nodes)
  }
  var query = form.elements.q
  var sort = form.elements.sort
  var boxes = list(form.querySelectorAll('input[type=checkbox]'))
  var count = form.querySelector('[data-dish-count]')
  var reset = form.querySelector('[data-dish-reset]')
  var jumps = root.querySelector('[data-dish-jumps]')
  var results = root.querySelector('[data-dish-results]')
  var flat = results.querySelector('ul')
  var empty = root.querySelector('[data-dish-empty]')
  var total = count.getAttribute('data-total')

  var rows = []
  var sections = list(root.querySelectorAll('[data-dish-section]')).map(function (el) {
    var section = { el: el, list: el.querySelector('ul'), jump: jumps.querySelector('[data-jump="' + el.id + '"]'), rows: [] }
    list(section.list.children).forEach(function (li) {
      var row = { el: li, order: rows.length, key: li.getAttribute('data-key') || '' }
      ;['kcal', 'protein', 'salt', 'min'].forEach(function (k) {
        row[k] = Number(li.getAttribute('data-' + k))
      })
      rows.push(row)
      section.rows.push(row)
    })
    return section
  })

  // 全角半角をそろえ、カタカナをひらがなに、英字を小文字にする（src/domain/search.ts の normalizeForSearch と同じ）
  var fold = function (s) {
    return s
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[ァ-ヶ]/g, function (c) {
        return String.fromCharCode(c.charCodeAt(0) - 0x60)
      })
      .replace(/・/g, '')
  }
  var limit = function (box, name) {
    var v = box.getAttribute(name)
    return v === null ? null : Number(v)
  }
  var mark = function (name, on) {
    if (on) root.setAttribute(name, '')
    else root.removeAttribute(name)
  }

  var wasFlat = false
  function render() {
    var words = fold(query.value).split(/\s+/).filter(Boolean)
    var limits = boxes
      .filter(function (b) {
        return b.checked
      })
      .map(function (b) {
        return { key: b.getAttribute('data-key'), min: limit(b, 'data-min'), max: limit(b, 'data-max') }
      })
    var by = sort.value.split(':')
    var isFlat = by[0] !== ''
    var uses = function (key) {
      return (
        by[0] === key ||
        limits.some(function (l) {
          return l.key === key
        })
      )
    }
    var hits = rows.filter(function (r) {
      r.hit =
        words.every(function (w) {
          return r.key.indexOf(w) >= 0
        }) &&
        limits.every(function (l) {
          return (l.min === null || r[l.key] >= l.min) && (l.max === null || r[l.key] <= l.max)
        })
      r.el.hidden = !r.hit
      return r.hit
    })

    // 並べかえをやめたら、行をもとの種類のところへ、もとの順でもどす
    if (wasFlat) {
      sections.forEach(function (s) {
        s.rows.forEach(function (r) {
          s.list.appendChild(r.el)
        })
      })
    }
    if (isFlat) {
      var sign = by[1] === 'desc' ? -1 : 1
      hits
        .slice()
        .sort(function (a, b) {
          return sign * (a[by[0]] - b[by[0]]) || a.order - b.order
        })
        .forEach(function (r) {
          flat.appendChild(r.el)
        })
    }
    wasFlat = isFlat

    sections.forEach(function (s) {
      var n = s.rows.filter(function (r) {
        return r.hit
      }).length
      s.el.hidden = isFlat || n === 0
      s.jump.hidden = n === 0
      s.jump.querySelector('[data-n]').textContent = n
    })
    jumps.hidden = isFlat
    results.hidden = !isFlat || hits.length === 0
    empty.hidden = hits.length > 0
    // 食塩・時間は、それでしぼりこむ・並べかえる間だけ行に書き足す
    mark('data-salt', uses('salt'))
    mark('data-min', uses('min'))
    var text = hits.length === rows.length ? total + '品' : total + '品のうち ' + hits.length + '品'
    if (count.textContent !== text) count.textContent = text
    reset.hidden = words.length === 0 && limits.length === 0 && !isFlat
  }

  form.addEventListener('input', render)
  form.addEventListener('change', render)
  form.addEventListener('reset', function () {
    setTimeout(render, 0)
  })
  // Enter では送らない。スマホでは、キーボードをとじて結果を見せる
  form.addEventListener('submit', function (e) {
    e.preventDefault()
    query.blur()
  })
  addEventListener('pageshow', render)
  render()
})()
