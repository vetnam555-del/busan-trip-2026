(function () {
  'use strict';
  var root = document.documentElement;
  var url = new URL(location.href);
  var saved = null;
  try { saved = localStorage.getItem('tokyo.kamakura.final'); } catch (_) {}
  // Every page view writes ?kamakura= into the address, so a 10/2 value in a link is
  // usually just the old default; it must not undo a 10/3 choice made on this device.
  // A 10/3 link is always someone's choice: keep it here, so the home-screen icon
  // (which opens without the parameter) shows the same plan.
  var param = url.searchParams.get('kamakura');
  if (param === '2026-10-03') {
    try { localStorage.setItem('tokyo.kamakura.final', param); } catch (_) {}
  }
  var requested = param === '2026-10-03' ? param : saved || param;
  var selected = requested === '2026-10-03' ? requested : '2026-10-02';
  root.dataset.kamakura = selected;
  url.searchParams.set('kamakura', selected);
  try { history.replaceState(null, '', url); } catch (_) {}

  if (selected === '2026-10-03') {
    // Swap the complete route, then restore chronological day/date labels.
    var a = document.getElementById('d2');
    var b = document.getElementById('d3');
    var content = a.innerHTML;
    a.innerHTML = b.innerHTML;
    b.innerHTML = content;
    a.dataset.wx = 'tokyo';
    b.dataset.wx = 'kamakura';
    [a, b].forEach(function (section, i) {
      section.querySelector('.dn').textContent = 'DAY ' + (i + 2);
      section.querySelector('.dd').textContent = i ? '10.03 SAT' : '10.02 FRI';
    });
    // Evening plans belong to the calendar date, not to the route (10/2 shoe
    // shopping and an early dinner, 10/3 the Unafuji booking): move them back.
    var eveA = a.querySelectorAll('li[data-fixed]'), eveB = b.querySelectorAll('li[data-fixed]');
    Array.prototype.forEach.call(eveA, function (li) { b.querySelector('ol.stops').appendChild(li); });
    Array.prototype.forEach.call(eveB, function (li) { a.querySelector('ol.stops').appendChild(li); });
    // Keep each day in time order; the trip-day "now / next" bar relies on it.
    [a, b].forEach(function (section) {
      var list = section.querySelector('ol.stops');
      Array.prototype.slice.call(list.children).sort(function (x, y) {
        var tx = x.querySelector('.t').textContent, ty = y.querySelector('.t').textContent;
        return tx < ty ? -1 : tx > ty ? 1 : 0;
      }).forEach(function (li) { list.appendChild(li); });
    });
    ['.st[data-t="d2"] b', '#i-overview a[href="#d2"] .s'].forEach(function (selector, i) {
      var other = i ? '#i-overview a[href="#d3"] .s' : '.st[data-t="d3"] b';
      var x = document.querySelector(selector), y = document.querySelector(other);
      var value = x.innerHTML;
      x.innerHTML = y.innerHTML;
      y.innerHTML = value;
    });
  }
  document.getElementById('calendar-download').href = selected === '2026-10-03'
    ? 'tokyo-2026-kamakura-oct3.ics' : 'tokyo-2026.ics';
  document.querySelectorAll('[data-kama]').forEach(function (button) {
    button.setAttribute('aria-pressed', String(button.dataset.kama === selected));
    button.addEventListener('click', function () {
      try { localStorage.setItem('tokyo.kamakura.final', button.dataset.kama); } catch (_) {}
      var next = new URL(location.href);
      next.searchParams.set('kamakura', button.dataset.kama);
      next.hash = 'i-choice';
      location.assign(next.href);
    });
  });

  var lastWeather = null, failed = false;
  function words(ko, ja) { return root.dataset.lang === 'ja' ? ja : ko; }
  function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
  function number(value, suffix) { return finite(value) ? value.toFixed(1).replace(/\.0$/, '') + suffix : words('미확인', '未確認'); }
  function paintComparison() {
    var box = document.getElementById('kama-compare');
    box.replaceChildren();
    var kama = lastWeather && lastWeather.data[1];
    ['2026-10-02', '2026-10-03'].forEach(function (date, i) {
      var row = document.createElement('p');
      var title = i ? words('10/3 토', '10/3 土') : words('10/2 금', '10/2 金');
      var hourly = kama && kama.hourly;
      var indices = [];
      if (hourly && Array.isArray(hourly.time)) hourly.time.forEach(function (time, j) {
        if (time.slice(0, 10) === date && Number(time.slice(11, 13)) >= 9 && Number(time.slice(11, 13)) <= 16) indices.push(j);
      });
      function values(key) { return indices.map(function (j) { return hourly[key] && hourly[key][j]; }); }
      function aggregate(key, sum) {
        var xs = values(key);
        if (xs.length !== 8 || !xs.every(finite)) return null;
        return sum ? xs.reduce(function (n, x) { return n + x; }, 0) : Math.max.apply(null, xs);
      }
      if (indices.length === 8) {
        row.textContent = title + ' · 09–16h · ' + words('시간대 최대 강수확률 ', '時間帯の最大降水確率 ')
          + number(aggregate('precipitation_probability'), '%') + ' · ' + words('예상 강수량 합 ', '予想降水量合計 ')
          + number(aggregate('precipitation', true), 'mm') + ' · ' + words('최대 풍속 ', '最大風速 ')
          + number(aggregate('wind_speed_10m'), 'km/h');
      } else {
        row.textContent = title + ' · ' + words('9~16시 예보 미확인. 아래 기상 링크에서 확인하세요.', '9〜16時の予報未確認。下の気象リンクで確認。');
      }
      box.appendChild(row);
    });
    var note = document.createElement('p');
    var at = lastWeather && lastWeather.at;
    note.textContent = at
      ? words('조회 ', '取得 ') + new Date(at).toLocaleString(words('ko-KR', 'ja-JP'), {timeZone:'Asia/Tokyo', month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'}) + ' JST · Open-Meteo · '
        + ((failed || Date.now() - at > 3 * 3600000) ? words('저장된 이전 예보. 최신 예보를 다시 확인하세요.', '保存済みの古い予報。最新予報を再確認。') : words('예보이며 확정 날씨가 아닙니다.', '予報であり確定ではありません。'))
      : words('예보를 가져오지 못하면 기상 링크로 확인하세요. 날씨를 0으로 표시하지 않습니다.', '取得できない場合は気象リンクで確認。欠測値は0として表示しません。');
    box.appendChild(note);
  }
  window.addEventListener('tokyo-weather', function (event) {
    // A language switch re-sends the same cached forecast; only a new fetch clears the failure note.
    if (!lastWeather || event.detail.at !== lastWeather.at) failed = false;
    lastWeather = event.detail;
    paintComparison();
  });
  window.addEventListener('tokyo-weather-error', function () { failed = true; paintComparison(); });
  new MutationObserver(paintComparison).observe(root, {attributes:true, attributeFilter:['data-lang']});
  paintComparison();
})();
