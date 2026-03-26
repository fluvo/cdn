/**
 * Fluv Countdown Timer System
 * @description 倒數計時器 - 支援一般模式與 Evergreen 模式
 * @version 1.0.0
 * @author Fluv Team
 *
 * Usage:
 *   <div id="fluv-countdown-{COUNTDOWN_ID}"></div>
 *   <script src="https://cdn.fluv.com/fluv-countdown.js?id={COUNTDOWN_ID}"></script>
 */
(function () {
  // ===== 1) 從 script src 取得 ID =====
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var src = currentScript.getAttribute('src') || '';
  var match = src.match(/[?&]id=([^&]+)/);
  if (!match) return;
  var countdownId = match[1];

  // ===== 2) 環境判斷 =====
  var hostname = window.location.hostname;
  var apiBase =
    hostname === 'localhost' || hostname.includes('dev.fluv') || hostname.includes('staging')
      ? 'https://api-dev.fluv.com'
      : 'https://api-prod.fluv.com';

  // ===== 3) 找到目標 div =====
  var targetDiv = document.getElementById('fluv-countdown-' + countdownId);
  if (!targetDiv) return;

  // ===== 4) 注入動畫 keyframes（每頁只注入一次）=====
  if (!document.getElementById('fluv-countdown-animations')) {
    var styleEl = document.createElement('style');
    styleEl.id = 'fluv-countdown-animations';
    styleEl.textContent =
      '@keyframes fluv-cd-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}' +
      '@keyframes fluv-cd-flip{0%{transform:rotateX(0)}50%{transform:rotateX(-90deg)}51%{transform:rotateX(90deg)}100%{transform:rotateX(0)}}';
    document.head.appendChild(styleEl);
  }

  // ===== 5) Fetch 倒數資料 =====
  fetch(apiBase + '/countdown?id=' + encodeURIComponent(countdownId))
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var cd = data.data || data;
      if (!cd) return;

      // ===== 6) 計算剩餘秒數 =====
      var getRemainingSeconds = function () {
        if (cd.isEvergreen) {
          var storageKey = 'fluv_countdown_evergreen_' + countdownId;
          var stored = localStorage.getItem(storageKey);
          var startTime;
          if (!stored) {
            startTime = Date.now();
            localStorage.setItem(storageKey, String(startTime));
          } else {
            startTime = Number(stored);
          }
          var elapsed = (Date.now() - startTime) / 1000;
          return Math.max(0, (cd.evergreenDuration || 0) - elapsed);
        } else {
          var target = new Date(cd.targetTime).getTime();
          return Math.max(0, (target - Date.now()) / 1000);
        }
      };

      // 初始檢查
      if (getRemainingSeconds() <= 0) {
        targetDiv.style.display = 'none';
        return;
      }

      // ===== 7) 樣式設定 =====
      var styles = cd.style || {};
      var labels = cd.label || {};
      var labelDay = labels.days || '天';
      var labelHour = labels.hours || '時';
      var labelMin = labels.minutes || '分';
      var labelSec = labels.seconds || '秒';
      var animation = styles.animation || 'none';

      var fontFamily = styles.fontFamily || 'Arial, sans-serif';
      var fontSize = styles.fontSize || '28px';
      var color = styles.color || '#333333';
      var backgroundColor = styles.backgroundColor || '#ffffff';
      var backgroundImage = styles.backgroundImage || '';
      var borderRadius = styles.borderRadius || '8px';
      var padding = styles.padding || '16px 24px';
      var labelColor = styles.labelColor || '#666666';
      var separatorColor = styles.separatorColor || '#999999';
      var digitBackground = styles.digitBackground || '#f5f5f5';
      var textShadow = styles.textShadow || 'none';
      var headlineGap = styles.headlineGap || '12';
      var letterSpacing = styles.letterSpacing || '0';
      var digitGap = styles.digitGap || '8';

      // 動畫 CSS
      var animationCss = '';
      if (animation === 'pulse') {
        animationCss = 'animation:fluv-cd-pulse 1s ease-in-out infinite;';
      } else if (animation === 'flip') {
        animationCss = 'animation:fluv-cd-flip 0.6s ease-in-out;';
      }

      // ===== 8) 文案 =====
      var headline = cd.headline || '';

      // ===== 9) 容器樣式 =====
      var bgStyle = backgroundImage
        ? 'background-image:url(' + backgroundImage + ');background-size:cover;background-position:center;'
        : 'background-color:' + backgroundColor + ';';

      targetDiv.style.cssText =
        'text-align:center;' +
        'font-family:' + fontFamily + ';' +
        bgStyle +
        'border-radius:' + borderRadius + ';' +
        'padding:' + padding + ';' +
        'box-sizing:border-box;' +
        'letter-spacing:' + letterSpacing + 'px;';

      // ===== 10) 響應式樣式 =====
      var responsiveId = 'fluv-cd-responsive-' + countdownId;
      if (!document.getElementById(responsiveId)) {
        var respStyle = document.createElement('style');
        respStyle.id = responsiveId;
        respStyle.textContent =
          '.fluv-cd-digit-' + countdownId + '{background:' + digitBackground + ';color:' + color + ';font-weight:bold;border-radius:8px;text-align:center;line-height:1.2;text-shadow:' + textShadow + ';' + animationCss + '}' +
          '.fluv-cd-label-' + countdownId + '{color:' + labelColor + ';font-weight:500;text-shadow:' + textShadow + ';}' +
          '.fluv-cd-sep-' + countdownId + '{color:' + separatorColor + ';font-weight:bold;text-shadow:' + textShadow + ';}' +
          '.fluv-cd-headline-' + countdownId + '{color:' + color + ';font-weight:bold;text-shadow:' + textShadow + ';}' +
          '@media(min-width:768px){' +
            '.fluv-cd-digit-' + countdownId + '{font-size:' + (parseFloat(fontSize) * 1.6) + 'px;padding:16px 24px;min-width:80px;}' +
            '.fluv-cd-label-' + countdownId + '{font-size:16px;}' +
            '.fluv-cd-sep-' + countdownId + '{font-size:' + (parseFloat(fontSize) * 1.6) + 'px;padding-top:16px;}' +
            '.fluv-cd-headline-' + countdownId + '{font-size:' + (parseFloat(fontSize) * 1.4) + 'px;margin-bottom:' + headlineGap + 'px;}' +
            '.fluv-cd-digits-' + countdownId + '{gap:' + digitGap + 'px;}' +
          '}' +
          '@media(max-width:767px){' +
            '.fluv-cd-digit-' + countdownId + '{font-size:' + fontSize + ';padding:8px 12px;min-width:48px;}' +
            '.fluv-cd-label-' + countdownId + '{font-size:12px;}' +
            '.fluv-cd-sep-' + countdownId + '{font-size:' + fontSize + ';padding-top:8px;}' +
            '.fluv-cd-headline-' + countdownId + '{font-size:' + fontSize + ';margin-bottom:' + headlineGap + 'px;}' +
            '.fluv-cd-digits-' + countdownId + '{gap:' + digitGap + 'px;}' +
          '}';
        document.head.appendChild(respStyle);
      }

      // ===== 11) 建立 digit group =====
      var createGroup = function (id, label) {
        return (
          '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">' +
            '<div id="fluv-cd-' + countdownId + '-' + id + '" class="fluv-cd-digit-' + countdownId + '">00</div>' +
            '<span class="fluv-cd-label-' + countdownId + '">' + label + '</span>' +
          '</div>'
        );
      };

      var separator = '<span class="fluv-cd-sep-' + countdownId + '" style="align-self:flex-start;">:</span>';

      var headlineHtml = headline
        ? '<div class="fluv-cd-headline-' + countdownId + '">' + headline + '</div>'
        : '';

      var digitsHtml =
        '<div class="fluv-cd-digits-' + countdownId + '" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;">' +
        createGroup('d', labelDay) + separator +
        createGroup('h', labelHour) + separator +
        createGroup('m', labelMin) + separator +
        createGroup('s', labelSec) +
        '</div>';

      targetDiv.innerHTML = headlineHtml + digitsHtml;

      // 取得 digit 元素
      var elD = document.getElementById('fluv-cd-' + countdownId + '-d');
      var elH = document.getElementById('fluv-cd-' + countdownId + '-h');
      var elM = document.getElementById('fluv-cd-' + countdownId + '-m');
      var elS = document.getElementById('fluv-cd-' + countdownId + '-s');

      // ===== 10) 更新倒數 =====
      var pad = function (n) { return n < 10 ? '0' + n : String(n); };

      var prevS = -1;

      var update = function () {
        var remaining = getRemainingSeconds();

        if (remaining <= 0) {
          targetDiv.style.display = 'none';
          clearInterval(timer);
          return;
        }

        var totalSec = Math.floor(remaining);
        var d = Math.floor(totalSec / 86400);
        var h = Math.floor((totalSec % 86400) / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;

        if (elD) elD.textContent = pad(d);
        if (elH) elH.textContent = pad(h);
        if (elM) elM.textContent = pad(m);
        if (elS) {
          elS.textContent = pad(s);

          // flip 動畫：每秒觸發
          if (animation === 'flip' && s !== prevS) {
            elS.style.animation = 'none';
            // 強制 reflow
            void elS.offsetHeight;
            elS.style.animation = 'fluv-cd-flip 0.6s ease-in-out';
          }
        }
        prevS = s;
      };

      // 立即更新一次，然後每秒更新
      update();
      var timer = setInterval(update, 1000);
    })
    .catch(function () {
      // API 失敗時靜默處理
    });
})();
