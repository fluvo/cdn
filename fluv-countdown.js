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
  // Security: only allow safe id chars to prevent CSS/HTML attribute breakout.
  // MongoDB ObjectId is 24-hex; we accept any alphanumeric/dash/underscore up
  // to 64 chars to leave headroom for future ID schemes without losing the
  // safety guarantee. A bad id silently aborts — never inject into DOM/CSS.
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(countdownId)) return;

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
  // Both digit keyframes (fluv-cd-*) and CTA keyframes (fluv-cta-*) live
  // in the same <style> so we don't need to manage two registrations.
  if (!document.getElementById('fluv-countdown-animations')) {
    var styleEl = document.createElement('style');
    styleEl.id = 'fluv-countdown-animations';
    styleEl.textContent =
      '@keyframes fluv-cd-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}' +
      '@keyframes fluv-cd-flip{0%{transform:rotateX(0)}50%{transform:rotateX(-90deg)}51%{transform:rotateX(90deg)}100%{transform:rotateX(0)}}' +
      '@keyframes fluv-cta-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}' +
      '@keyframes fluv-cta-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}' +
      '@keyframes fluv-cta-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
      '@keyframes fluv-cta-wobble{0%,100%{transform:rotate(0)}25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}}' +
      '@keyframes fluv-cta-glow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.2)}}';
    document.head.appendChild(styleEl);
  }

  // ===== 4.1) HTML escape helper + CTA preset table =====
  // Keep this in sync with the admin (list-countdown.js CTA_PRESETS).
  var escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  };

  // Security: URL protocol whitelist. We render admin-supplied URLs into
  // <a href>; without this check a malicious admin could store
  // `javascript:alert(1)` and turn the link into stored XSS on every
  // partner site that embeds the countdown. Allowed: absolute http(s),
  // mailto, tel, and root-relative paths. Everything else → empty (link
  // not rendered).
  var sanitizeUrl = function (url) {
    if (!url) return '';
    var s = String(url).trim();
    if (!s) return '';
    if (/^(https?:\/\/|mailto:|tel:|\/[^\/])/i.test(s)) return s;
    return '';
  };

  var CTA_PRESETS = {
    'solid-pink':    'background:#FF6B9D;color:#fff;border:none;border-radius:6px;font-weight:bold;box-shadow:0 2px 6px rgba(255,107,157,0.35);',
    'solid-red':     'background:#E63946;color:#fff;border:none;border-radius:6px;font-weight:bold;box-shadow:0 2px 6px rgba(230,57,70,0.35);',
    'solid-orange':  'background:#FF8C42;color:#fff;border:none;border-radius:6px;font-weight:bold;box-shadow:0 2px 6px rgba(255,140,66,0.35);',
    'gradient-warm': 'background:linear-gradient(45deg,#FF6B9D,#FFC371);color:#fff;border:none;border-radius:6px;font-weight:bold;box-shadow:0 2px 8px rgba(255,107,157,0.35);',
    'outline-dark':  'background:transparent;color:#222;border:2px solid #222;border-radius:6px;font-weight:bold;',
    'pill-black':    'background:#111;color:#fff;border:none;border-radius:999px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.25);'
  };

  var CTA_ANIMATIONS = {
    shake:  'animation:fluv-cta-shake 0.8s ease-in-out infinite;',
    pulse:  'animation:fluv-cta-pulse 1.2s ease-in-out infinite;',
    bounce: 'animation:fluv-cta-bounce 1s ease-in-out infinite;',
    wobble: 'animation:fluv-cta-wobble 1s ease-in-out infinite;',
    glow:   'animation:fluv-cta-glow 1.5s ease-in-out infinite;'
  };

  var CTA_PLACEHOLDER = '{點我}';

  // Build the CTA <a> string from a cta object. Returns '' if disabled.
  // URL is run through sanitizeUrl — if rejected, the button renders as
  // a non-link span (still styled like the button, just not clickable).
  var buildCtaHtml = function (cta) {
    if (!cta || !cta.enabled || !cta.text) return '';
    var preset = CTA_PRESETS[cta.preset] || CTA_PRESETS['solid-pink'];
    var anim = CTA_ANIMATIONS[cta.animation] || '';
    var base = 'display:inline-block;padding:8px 18px;margin:0 4px;font-size:14px;line-height:1.2;text-decoration:none;cursor:pointer;white-space:nowrap;vertical-align:middle;';
    var safeUrl = sanitizeUrl(cta.url);
    var safeText = escapeHtml(cta.text);
    if (!safeUrl) {
      return '<span style="' + base + preset + anim + '">' + safeText + '</span>';
    }
    return '<a href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noopener noreferrer" style="' + base + preset + anim + '">' + safeText + '</a>';
  };

  // Wrap a chunk of headline text as either a link or a plain span. URL is
  // sanitized; a rejected URL falls back to plain span (no underline).
  var wrapHeadlineChunk = function (text, url) {
    if (!text) return '';
    var safe = escapeHtml(text);
    var safeUrl = sanitizeUrl(url);
    if (!safeUrl) return '<span>' + safe + '</span>';
    return '<a href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;">' + safe + '</a>';
  };

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
      var lineHeight = styles.lineHeight || '1.4';

      // 動畫 CSS
      var animationCss = '';
      if (animation === 'pulse') {
        animationCss = 'animation:fluv-cd-pulse 1s ease-in-out infinite;';
      } else if (animation === 'flip') {
        animationCss = 'animation:fluv-cd-flip 0.6s ease-in-out;';
      }

      // ===== 8) 文案 + 連結 + CTA 按鈕 =====
      var headline = cd.headline || '';
      var headlineUrl = cd.headlineUrl || '';
      var cta = cd.cta || null;
      var ctaHtml = buildCtaHtml(cta);

      // If CTA enabled AND headline contains {點我}, inline the button at
      // that position. Otherwise the button (if any) gets appended after
      // the digits in step 11.
      var headlineInner;
      var ctaInlined = false;
      if (ctaHtml && headline.indexOf(CTA_PLACEHOLDER) >= 0) {
        var idx = headline.indexOf(CTA_PLACEHOLDER);
        var before = headline.slice(0, idx);
        var after = headline.slice(idx + CTA_PLACEHOLDER.length);
        headlineInner =
          wrapHeadlineChunk(before, headlineUrl) +
          ctaHtml +
          wrapHeadlineChunk(after, headlineUrl);
        ctaInlined = true;
      } else {
        headlineInner = wrapHeadlineChunk(headline, headlineUrl);
      }

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

      // ===== 10) 樣式（WYSIWYG，桌機/手機尺寸一致） =====
      // 改動歷史：原本桌機把字放大 1.4x / 1.6x，但 admin 預覽沒放大，
      // 造成「預覽看到 24px、線上桌機看到 38px」這種錯位。改成兩邊都直接
      // 使用 admin 選的 fontSize；要更大就調 fontSize，要更小就調小。
      //
      // 另外，天/時/分/秒 label 改放在白色 digit box 內（跟預覽一致）。
      var responsiveId = 'fluv-cd-responsive-' + countdownId;
      if (!document.getElementById(responsiveId)) {
        var respStyle = document.createElement('style');
        respStyle.id = responsiveId;
        respStyle.textContent =
          '.fluv-cd-digit-' + countdownId + '{background:' + digitBackground + ';color:' + color + ';font-weight:bold;border-radius:4px;text-align:center;line-height:1.2;text-shadow:' + textShadow + ';font-size:' + fontSize + ';padding:8px 12px;min-width:48px;display:inline-flex;flex-direction:column;align-items:center;gap:2px;' + animationCss + '}' +
          '.fluv-cd-label-' + countdownId + '{color:' + labelColor + ';font-weight:normal;text-shadow:' + textShadow + ';font-size:10px;}' +
          '.fluv-cd-sep-' + countdownId + '{color:' + separatorColor + ';font-weight:bold;text-shadow:' + textShadow + ';font-size:' + fontSize + ';}' +
          '.fluv-cd-headline-' + countdownId + '{color:' + color + ';font-weight:bold;text-shadow:' + textShadow + ';font-size:' + fontSize + ';line-height:' + lineHeight + ';margin-bottom:' + headlineGap + 'px;}' +
          '.fluv-cd-digits-' + countdownId + '{gap:' + digitGap + 'px;}';
        document.head.appendChild(respStyle);
      }

      // ===== 11) 建立 digit group =====
      // Label sits INSIDE the white box (matches admin preview).
      var createGroup = function (id, label) {
        return (
          '<div id="fluv-cd-' + countdownId + '-' + id + '" class="fluv-cd-digit-' + countdownId + '">' +
            '<span>00</span>' +
            '<span class="fluv-cd-label-' + countdownId + '">' + label + '</span>' +
          '</div>'
        );
      };

      var separator = '<span class="fluv-cd-sep-' + countdownId + '">:</span>';

      var headlineHtml = headlineInner
        ? '<div class="fluv-cd-headline-' + countdownId + '">' + headlineInner + '</div>'
        : '';

      var digitsHtml =
        '<div class="fluv-cd-digits-' + countdownId + '" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;">' +
        createGroup('d', labelDay) + separator +
        createGroup('h', labelHour) + separator +
        createGroup('m', labelMin) + separator +
        createGroup('s', labelSec) +
        '</div>';

      // If CTA exists but wasn't inlined into the headline, place it
      // beneath the digits as its own row.
      var ctaBelowHtml = (ctaHtml && !ctaInlined)
        ? '<div style="text-align:center;margin-top:12px;">' + ctaHtml + '</div>'
        : '';

      targetDiv.innerHTML = headlineHtml + digitsHtml + ctaBelowHtml;

      // 取得 digit 數字 span（label 在同一個 box 內，不能用 textContent
      // 直接寫整個 box，會把 label 一併蓋掉）
      var pickNumSpan = function (id) {
        var box = document.getElementById('fluv-cd-' + countdownId + '-' + id);
        return box ? box.firstElementChild : null;
      };
      var elD = pickNumSpan('d');
      var elH = pickNumSpan('h');
      var elM = pickNumSpan('m');
      var elS = pickNumSpan('s');
      var elSBox = document.getElementById('fluv-cd-' + countdownId + '-s');

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

          // flip 動畫：每秒觸發（套在外層 box）
          if (animation === 'flip' && s !== prevS && elSBox) {
            elSBox.style.animation = 'none';
            // 強制 reflow
            void elSBox.offsetHeight;
            elSBox.style.animation = 'fluv-cd-flip 0.6s ease-in-out';
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
