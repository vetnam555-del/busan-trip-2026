(function () {
  'use strict';
  // On the rainy morning of 10/2 the family moved Kamakura to 10/3 for good, so the page
  // itself now shows that plan. Links and saved choices from the old date switch are cleared.
  var url = new URL(location.href);
  if (url.searchParams.has('kamakura') || url.searchParams.has('pick')) {
    url.searchParams.delete('kamakura');
    url.searchParams.delete('pick');
    try { history.replaceState(null, '', url); } catch (_) {}
  }
  try { localStorage.removeItem('tokyo.kamakura.final'); } catch (_) {}
})();
