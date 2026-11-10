(function () {
  if (window.__modssUnlockOnce) return;
  window.__modssUnlockOnce = true;

  var BUNDLE_URLS = ['https://lampa.stream/modss?__unlock=1', 'https://modss.tv?__unlock=1'];
  var b64 = '';
  try { b64 = (window.Lampa && Lampa.Base64 && Lampa.Base64.encode) ? Lampa.Base64.encode(window.location.origin) : ''; } catch (e) {}
  var devId = '';
  try { devId = localStorage.getItem('modss_device_id') || ''; } catch (e2) {}
  var body = JSON.parse(JSON.stringify({
    user_id: '', uid: '', ips: '', cas: b64, cache: false, id: '', or: '', auth: false, device_id: devId
  }));
  console.log('Modss', 'UNLOCK', 'live loader start, device_id=' + (devId || '-'), 'origin=' + window.location.origin);

  function applyPatch(code) {
    var logCount = 0;
    var labels = [];
    var missing = [];
    var rep = function (label, find, to) {
      var n = code.split(find).length - 1;
      if (!n) { missing.push(label); console.log('Modss', 'UNLOCK', 'SKIP anchor not found:', label); return; }
      code = code.split(find).join(to);
      labels.push(label + ' x' + n);
      logCount++;
      console.log('Modss', 'UNLOCK', 'patched:', label, 'x' + n);
    };
    var BLOCK = [
      "window.MODSS_UNLOCK = true;",
      "try { Lampa.Storage.set('pro_pub', 'true'); vip = true; leftVipD = ''; console.log('Modss', 'UNLOCK', 'vip patch applied'); } catch (eU) { console.error('Modss', 'UNLOCK', 'error', eU && eU.message); }",
      "setTimeout(function () { modssPatch(0); }, 120);",
      "function modssPatch(n) {",
      "  try {",
      "    if (typeof Modss === 'undefined') throw new Error('Modss ещё не объявлен');",
      "    Modss.isSessionInactive = function () { return false; };",
      "    Modss.isSessionsFull = function () { return false; };",
      "    Modss.titleSuffix = function () { return ''; };",
      "    Modss.sessionNotice = function () { return ''; };",
      "    Modss.showModssVip = function () { };",
      "    vip = true;",
      "    leftVipD = '';",
      "    console.log('Modss', 'UNLOCK', 'modss methods patched, pass ' + n);",
      "  } catch (eP) {",
      "    if (n < 12) setTimeout(function () { modssPatch(n + 1); }, 400);",
      "    else console.error('Modss', 'UNLOCK', 'methods patch failed', eP && eP.message);",
      "  }",
      "}"
    ].join('\n');

    if (localStorage.getItem('modss_unlock_disable') === '1') {
      console.log('Modss', 'UNLOCK', 'CONTROLLED RUN: патчи выключены флагом modss_unlock_disable');
    } else {
      rep('unlock block', 'modss_device_id = pluginSetup.resolveDeviceId(modss_device_id);', 'modss_device_id = pluginSetup.resolveDeviceId(modss_device_id);\n' + BLOCK);
      rep('vip assign', 'vip = json.data && json.data.vip;', 'vip = true; /* UNLOCK */');
      rep('isVipBal', 'var isVipBal = 5;', 'var isVipBal = 99; /* UNLOCK */');
      rep('ads banner', "if(e.name == 'select' && !vip) {", "if(false /* UNLOCK */ && e.name == 'select' && !vip) {");
      rep('build persist', 'modss_build = result.build;', "modss_build = result.build; try { localStorage.setItem('modss_build_live', modss_build); } catch (eB) { }");
      // crowd-сегменты (аналог SponsorBlock): балансеры теряют поле segments при копировании полей элемента
      rep('segments episode', 'subtitles: episode.subtitles,', 'subtitles: episode.subtitles, segments: episode.segments,');
      rep('segments voice', 'subtitles: voice.subtitles,', 'subtitles: voice.subtitles, segments: voice.segments,');
      rep('segments item', 'subtitles: item.subtitles,', 'subtitles: item.subtitles, segments: item.segments,');
      rep('segments element', 'subtitles: element.subtitles,', 'subtitles: element.subtitles, segments: element.segments,');
    }

    var build = (code.match(/modss_build = '([0-9a-f]+)'/) || [null, ''])[1];
    try {
      localStorage.setItem('modss_unlock_state', JSON.stringify({
        patches: logCount, labels: labels, missing: missing, len: code.length,
        control: localStorage.getItem('modss_unlock_disable') === '1', at: Date.now()
      }));
    } catch (eS) { }
    new Function(code + '\n//# sourceURL=' + window.location.origin + '/plugin_modss_unlocked.js')();
    console.log('Modss', 'UNLOCK', 'live bundle loaded, patches=' + logCount + ', len=' + code.length + ', build=' + build.slice(0, 24));
  }

  function accept(text, from) {
    if (window.__modssUnlockLoaded) return true;
    if (!text || text.length < 100000) { console.log('Modss', 'UNLOCK', 'bundle too small from', from, text ? text.length : 0); return false; }
    try {
      window.__modssUnlockLoaded = true;
      applyPatch(text);
      return true;
    } catch (eRun) {
      window.__modssUnlockLoaded = false;
      console.error('Modss', 'UNLOCK', 'bundle exec error from', from, eRun && eRun.message);
      return false;
    }
  }

  // 1) так же, как это делает официальный лоадер MODS: Lampa.Reguest (работает на ТВ-сборках Lampa)
  function viaLampa(url, next) {
    if (!window.Lampa || !Lampa.Reguest) { next(); return; }
    try {
      var net = new Lampa.Reguest();
      net.timeout(15000);
      net.silent(url, function (text) {
        if (accept(text, 'Lampa.Reguest ' + url)) return;
        next();
      }, function (a, c) {
        var msg = net && net.errorDecode ? net.errorDecode(a, c) : '';
        console.log('Modss', 'UNLOCK', 'Lampa.Reguest error', url, a, msg);
        next();
      }, body, { dataType: 'text' });
    } catch (eL) {
      console.log('Modss', 'UNLOCK', 'Lampa.Reguest throw', eL && eL.message);
      next();
    }
  }

  // 2) запасной путь: fetch/XHR (браузерные сборки Lampa)
  function viaFetch(i) {
    if (i >= BUNDLE_URLS.length) {
      viaXhr(0);
      return;
    }
    var url = BUNDLE_URLS[i];
    if (!window.fetch) { viaXhr(0); return; }
    fetch(url, {
      // lampa.stream отвечает Access-Control-Allow-Origin: *, поэтому credentials быть не должно
      method: 'POST', credentials: 'omit',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/javascript, text/javascript, */*' },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.text();
    }).then(function (code) {
      if (accept(code, 'fetch ' + url)) return;
      viaFetch(i + 1);
    }).catch(function (e) {
      console.log('Modss', 'UNLOCK', 'fetch error', url, e && e.message);
      viaFetch(i + 1);
    });
  }

  function viaXhr(i) {
    if (i >= BUNDLE_URLS.length) {
      window.__modssUnlockOnce = false;
      console.error('Modss', 'UNLOCK', 'все способы загрузки бандла исчерпаны');
      try { localStorage.setItem('modss_unlock_state', JSON.stringify({ patches: 0, labels: [], missing: ['bundle fetch'], at: Date.now() })); } catch (eS2) { }
      return;
    }
    var url = BUNDLE_URLS[i];
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'application/javascript, text/javascript, */*');
      xhr.withCredentials = false;
      xhr.timeout = 15000;
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300 && accept(xhr.responseText, 'xhr ' + url)) return;
        viaXhr(i + 1);
      };
      xhr.onerror = function () { viaXhr(i + 1); };
      xhr.ontimeout = function () { viaXhr(i + 1); };
      xhr.send(JSON.stringify(body));
    } catch (eX) {
      console.log('Modss', 'UNLOCK', 'xhr error', url, eX && eX.message);
      viaXhr(i + 1);
    }
  }

  viaLampa(BUNDLE_URLS[0], function () { viaFetch(1); });
})();
