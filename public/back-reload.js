// 食品のページ（/foods/natto/ など）だけが読む、小さなプログラム。
// アプリで食品の栄養素の窓をひらくと、アドレスがこのページのものになる。そのまま読みこみ直すと、このページが出る。
// そのあと「戻る」を押すと、ブラウザはアドレスだけを前のもの（アプリの画面）に変えて、中身はこのページのままにする
// （アプリの中の移動として覚えているため）。そこで、アドレスが別のページに変わったら、読みこみ直してそのページを出す。
// ページの中の移動（#nutrition など）では何もしない
;(function () {
  var path = location.pathname
  addEventListener('popstate', function () {
    if (location.pathname !== path) location.reload()
  })
})()
