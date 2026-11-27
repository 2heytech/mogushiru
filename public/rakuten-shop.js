// 成分のページ（/nutrients/<成分>/）の「楽天市場でさがす」の欄だけが読む、小さなプログラム：
// 食品ごとに、楽天市場の商品の例を画像つきで出す（楽天ウェブサービスの「楽天市場商品検索 API」を、見ている人のブラウザから呼ぶ）。
// - 呼ぶのは、欄が画面に近づいたときだけ。食品ごとに1回ずつ、間をあけて順に呼ぶ
// - はじめの data-rows 個の食品は自動で、のこりは「ほかの食品の商品も見る」を押したときに呼ぶ
// - 取れない・商品が見つからない食品は、もとの文字のリンクのまま
// - 楽天から来た字は textContent で入れる（HTML として読まない）。リンクと画像は、https の楽天のアドレスだけを通す
// 見た目（クラス）は、ページに書いてあるひな形（template）と、食品（li）に付ける data-shop-row の印（wait：読みこみ中、on：商品あり）で決める（決めているのは src/pages/nutrientPages.tsx）。
// このプログラムが動かないときは、文字のリンクがそのまま出る
;(function () {
  var ENDPOINT = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701'
  // API からもらう数と、1つの食品に出す数（同じ商品・使えない商品をのぞくので、多めにもらう）
  var HITS = 10
  var SHOW = 6
  // 出すのは、商品が MIN 個以上あるときだけ（1個だけの行は出さず、文字のリンクのままにする）
  var MIN = 2
  // 呼び出しの間（ミリ秒）と、混んでいる（429）ときに待つ時間。やり直しは1回だけ
  var GAP = 400
  var RETRY_WAIT = 1500
  // 画像の大きさ（幅130pxほどの枠に、きれいに出る大きさ）
  var IMAGE_SIZE = '240x240'
  // 画像を読みこんでよい場所（public/_headers の img-src と同じ）
  var IMAGE_HOSTS = ['thumbnail.image.rakuten.co.jp']

  // 楽天市場商品検索 API のアドレス。conf：{ app, key, aff, mid }（アプリ ID・アクセスキー・アフィリエイトの ID・計測 ID の文字。mid は API には送らない）
  function searchUrl(conf, word, genre) {
    var q = [
      ['applicationId', conf.app],
      ['accessKey', conf.key],
      ['affiliateId', conf.aff],
      ['format', 'json'],
      ['formatVersion', '2'],
      ['keyword', word],
      ['hits', String(HITS)],
      // 画像のある商品だけ・売り切れていない商品だけ
      ['imageFlag', '1'],
      ['availability', '1'],
    ]
    if (genre) q.push(['genreId', genre])
    return (
      ENDPOINT +
      '?' +
      q
        .map(function (p) {
          return p[0] + '=' + encodeURIComponent(p[1])
        })
        .join('&')
    )
  }

  // https の、決まった場所のアドレスだけを通す（ちがえば空）
  function safeUrl(value, allowed) {
    var m = /^https:\/\/([a-z0-9.-]+)(?::443)?(?:\/[^\s"'<>\\]*)?$/i.exec(typeof value === 'string' ? value : '')
    return m && allowed(m[1].toLowerCase()) ? value : ''
  }
  function rakutenHost(host) {
    return host === 'rakuten.co.jp' || /\.rakuten\.co\.jp$/.test(host)
  }
  function imageHost(host) {
    return IMAGE_HOSTS.indexOf(host) >= 0
  }

  // 計測 ID の文字（conf.mid。成果をサイトごとに分けて見るための印）を、API がくれたアフィリエイトのリンクに入れる。
  // 入れるのは、リンクが「…/hgc/<アフィリエイトの ID>/?…」の形のときだけ（文字のリンクと同じ場所：ID のすぐあと）。ちがう形なら、そのまま
  function tagUrl(href, conf) {
    if (!conf || !conf.aff || !/^[0-9A-Za-z_-]{1,40}$/.test(conf.mid || '')) return href
    var head = 'https://hb.afl.rakuten.co.jp/hgc/' + conf.aff + '/'
    return href.indexOf(head + '?') === 0 ? head + conf.mid + href.slice(head.length) : href
  }

  // API の答えから、出す商品を選ぶ：名前・値段・楽天へのリンク・楽天の画像がそろった商品を、上から max 個。同じ商品（同じ名前・同じ画像）は1つだけ。
  // conf（{ aff, mid }）があれば、リンクに計測 ID の文字を入れる
  function pickItems(data, max, conf) {
    var raw = (data && (data.Items || data.items)) || []
    var out = []
    var seen = {}
    for (var i = 0; i < raw.length && out.length < max; i++) {
      var it = raw[i] && raw[i].Item ? raw[i].Item : raw[i]
      if (!it || typeof it !== 'object') continue
      var name = String(it.itemName || '')
        .replace(/\s+/g, ' ')
        .trim()
      var price = Number(it.itemPrice)
      var href = safeUrl(it.affiliateUrl, rakutenHost) || safeUrl(it.itemUrl, rakutenHost)
      var first = it.mediumImageUrls && it.mediumImageUrls[0]
      var image = safeUrl(first && typeof first === 'object' ? first.imageUrl : first, imageHost)
      if (!name || !(price > 0) || !isFinite(price) || !href || !image) continue
      var stars = Number(it.reviewAverage)
      var reviews = Number(it.reviewCount)
      var file = 'image ' + image.split('?')[0]
      if (seen[file] || seen['name ' + name]) continue
      seen[file] = seen['name ' + name] = true
      out.push({
        name: name,
        price: Math.round(price),
        href: tagUrl(href, conf),
        image: /[?&]_ex=\d+x\d+/.test(image) ? image.replace(/([?&]_ex=)\d+x\d+/, '$1' + IMAGE_SIZE) : image,
        // 送料がこみの商品（postageFlag が 0）
        free: it.postageFlag === 0 || it.postageFlag === '0',
        // レビューの平均（「4.6」の形）と件数。レビューがなければ出さない
        stars: reviews > 0 && stars > 0 && stars <= 5 ? stars.toFixed(1) : '',
        reviews: reviews > 0 && isFinite(reviews) ? Math.round(reviews) : 0,
      })
    }
    return out
  }

  // 「1,280」の形
  function yen(n) {
    return String(n).replace(/\B(?=(\d{3})+$)/g, ',')
  }

  // テスト（src/pages/rakutenShop.test.ts）から、上の計算だけを使えるようにする。ブラウザでは module がないので、何もしない
  if (typeof module === 'object' && module && module.exports) module.exports = { searchUrl: searchUrl, pickItems: pickItems, yen: yen }
  if (typeof document === 'undefined') return

  var box = document.querySelector('section[data-shop]')
  var card = box && box.querySelector('template[data-shop-card]')
  if (!card || !card.content || !window.fetch || !window.IntersectionObserver) return
  var conf = {
    app: box.getAttribute('data-app') || '',
    key: box.getAttribute('data-key') || '',
    aff: box.getAttribute('data-aff') || '',
    mid: box.getAttribute('data-mid') || '',
  }
  if (!conf.app || !conf.key || !conf.aff) return

  var list = function (nodes) {
    return Array.prototype.slice.call(nodes)
  }
  var foods = list(box.querySelectorAll('[data-shop-food]'))
  var auto = Math.max(0, Number(box.getAttribute('data-rows')) || 0)
  var more = box.querySelector('[data-shop-more]')
  var queue = []
  var busy = false
  // dead：設定がちがう（このサイトから呼べない・キーがちがう）と分かったら、それより先は呼ばない
  var dead = false
  var shown = 0
  // 混んでいて、やり直すときの印
  var RETRY = {}

  var itemsOf = function (li) {
    return li.querySelector('[data-shop-items]')
  }
  // 行にする（読みこみ中）。商品の場所をあけておく
  function wait(li) {
    li.setAttribute('data-shop-row', 'wait')
    itemsOf(li).hidden = false
  }
  // もとの文字のリンクにもどす
  function fail(li) {
    var ul = itemsOf(li)
    ul.hidden = true
    ul.textContent = ''
    li.removeAttribute('data-shop-row')
  }
  function show(li, items) {
    var ul = itemsOf(li)
    ul.textContent = ''
    items.forEach(function (it) {
      var node = card.content.firstElementChild.cloneNode(true)
      var img = node.querySelector('img')
      var free = node.querySelector('[data-shop-free]')
      var review = node.querySelector('[data-shop-review]')
      node.querySelector('a').href = it.href
      img.src = it.image
      // 画像を読みこめなかったら、こわれた印を出さず、名前と値段だけにする
      img.addEventListener('error', function () {
        img.hidden = true
      })
      node.querySelector('[data-shop-name]').textContent = it.name
      node.querySelector('[data-shop-price]').textContent = yen(it.price)
      if (free && it.free) free.hidden = false
      if (review && it.stars) {
        review.querySelector('[data-shop-stars]').textContent = it.stars
        review.querySelector('[data-shop-reviews]').textContent = yen(it.reviews)
        review.hidden = false
      }
      ul.appendChild(node)
    })
    li.setAttribute('data-shop-row', 'on')
    // はじめて商品を出したら、説明の文を「商品を出したあと」のものに切りかえ、楽天ウェブサービスのクレジットを見せる
    if (shown++ === 0) {
      list(box.querySelectorAll('[data-shop-on]')).forEach(function (el) {
        el.hidden = false
      })
      list(box.querySelectorAll('[data-shop-off]')).forEach(function (el) {
        el.hidden = true
      })
    }
  }

  function load(li, tries) {
    fetch(searchUrl(conf, li.getAttribute('data-word') || '', li.getAttribute('data-genre') || ''), { credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' })
      .then(function (res) {
        if (res.status === 429 && tries < 1) return RETRY
        if (res.status === 401 || res.status === 403) dead = true
        if (!res.ok) throw new Error('status ' + res.status)
        return res.json()
      })
      .then(function (data) {
        if (data === RETRY) {
          setTimeout(function () {
            load(li, tries + 1)
          }, RETRY_WAIT)
          return
        }
        var items = pickItems(data, SHOW, conf)
        if (items.length >= MIN) show(li, items)
        else fail(li)
        step()
      })
      .catch(function () {
        fail(li)
        step()
      })
  }
  function step() {
    if (dead) {
      queue.forEach(fail)
      queue = []
    }
    if (queue.length === 0) {
      busy = false
      finish()
      return
    }
    var li = queue.shift()
    setTimeout(function () {
      load(li, 0)
    }, GAP)
  }
  // 順番に呼ぶ。行にしてから（場所をあけてから）呼ぶ
  function start(lis) {
    lis.forEach(wait)
    queue = queue.concat(lis)
    if (busy || queue.length === 0) return
    busy = true
    load(queue.shift(), 0)
  }
  // まだ文字のリンクのままで、試していない食品
  function rest() {
    return foods.filter(function (li) {
      return !li.hasAttribute('data-shop-row') && !li.hasAttribute('data-shop-tried')
    })
  }
  // ひととおり終わったら、のこりの食品があって、1つでも商品を出せたときだけ「ほかの食品の商品も見る」を出す
  function finish() {
    if (more) more.hidden = dead || shown === 0 || rest().length === 0
  }
  function run(lis) {
    lis.forEach(function (li) {
      li.setAttribute('data-shop-tried', '')
    })
    start(lis)
  }

  if (more) {
    more.addEventListener('click', function () {
      more.hidden = true
      run(rest())
    })
  }

  // 欄が画面に近づいたら（下に 800px まで来たら）、はじめの食品から呼ぶ。欄が画面より上にあるときは呼ばない（読んでいるところが下へずれるため）
  var io = new IntersectionObserver(
    function (entries) {
      if (
        !entries.some(function (e) {
          return e.isIntersecting
        })
      )
        return
      io.disconnect()
      run(foods.slice(0, auto))
    },
    { rootMargin: '0px 0px 800px 0px' },
  )
  io.observe(box)
})()
