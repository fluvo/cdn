/**
 * Fluv Popup System
 * @description 彈窗管理系統 - 支援地區篩選、測試模式、Cookie 控制
 * @version 1.0.0
 * @author Fluv Team
 */
(function () {
  const hostname = window.location.hostname;
  const checkIsShowPopup = (popup) => {
    if (!popup) return false;
    const { popupLogic, html } = popup;

    //使用 cookie 判斷是否顯示過 每天只顯示一次，如果點擊叉叉或是圖片連結，則設定 cookie 為下次顯示時間
    const popupShown = getCookie('popup_shown  ');
    const now = new Date().getTime();
    const nextShowTime = popupShown;
    if (now < nextShowTime) return false;
    return true;
  }

  const checkHostName = (hostname, popup) => {
    if (!popup) return false;
    const { html } = popup;
    const allow = JSON.parse(html).allow;
    return allow.includes(hostname);
  }

  function getPopupForHost(popups, hostname) {
    const filtered = popups.filter(popup => {
      if (!checkHostName(hostname, popup)) return false;
      return true;
    });
    if (filtered.length === 0) return null;
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return filtered[0];
  }

  const closePopup = () => {
    setCookie('popup_shown', new Date().toISOString(), 1);
    hidePopup();
    showReopenButton();
  }

  const isTestMode = () => {
    const params = new URLSearchParams(window.location.search);
    return params.size === 1;
  }

  // 根據網址路徑判斷地區：/jp/ -> 日本(2)，/tw/ -> 台灣(1)，/hk/ -> 香港(3)
  const detectRegionFromPath = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/jp/')) {
      return 2;
    }
    if (path.includes('/hk/')) {
      return 3;
    }
    if (path.includes('/tw/')) {
      return 1;
    }
    return 1; // 預設台灣
  };

  // 取得使用的 region（優先用網址，其次 localStorage，預設 1）
  const urlRegion = detectRegionFromPath();
  const userRegion = urlRegion || Number(localStorage.getItem('region')) || 1;

  // 統一使用 /popups/active endpoint，測試模式會傳 test=true 參數
  const testParam = isTestMode() ? '&test=true' : '';
  fetch(`https://api-prod.fluv.com/popups/active?region=${userRegion}${testParam}`)
    .then(response => response.json())
    .then(data => {
      const popup = getPopupForHost(data.data, hostname);
      if (!popup) return;

      // 測試模式：忽略 cookie，直接顯示
      if (isTestMode()) {
        console.log("🧪 測試模式 - popup:", popup);
        createPopup(popup);
        createReopenButton(popup);
        showPopup();
        hideReopenButton();
      } else {
        // 正式模式：檢查 cookie
        if (checkIsShowPopup(popup)) {
          createPopup(popup);
          createReopenButton(popup);
          showPopup();
          hideReopenButton();
        } else {
          createPopup(popup);
          createReopenButton(popup);
          hidePopup();
          showReopenButton();
        }
      }

      document.getElementById('popup-image-link')?.addEventListener('click', closePopup);
      document.getElementById('close-popup')?.addEventListener('click', closePopup);
      document.getElementById('reopen-popup')?.addEventListener('click', showPopup);
    });

  function createPopup(popup) {
    if (!popup) return;
    const { imageLink, image } = popup;
    if (!imageLink || !image) return;
    const overlay = document.createElement('div');
    overlay.id = 'email-overlay';
    overlay.style = `
      display: none;
      position: fixed;
      top: 0; left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
    `;
    document.body.appendChild(overlay);

    const popupElement = document.createElement('div');
    popupElement.id = 'email-popup';
    popupElement.style = `
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px 20px 20px;
      border-radius: 12px;
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.18);
      z-index: 9999;
      width: 420px;
      max-width: 95%;
      text-align: center;
    `;
    popupElement.innerHTML = `
      <button id="close-popup" style="
        position: absolute;
        top: 15px;
        right: 15px;
        width: 30px;
        height: 30px;
        padding: unset;
        border-radius: 50%;
        background: transparent;
        border: none;
        font-size: 20px;
        cursor: pointer;
        z-index: 2;
      ">✖️</button>

      <img src="https://edm.fluv.com/wp-content/uploads/sites/3/2025/06/cat-2.png" style="
        position: absolute;
        bottom : 0px;
        left: -34px;
        transform: translateX(-50%);
        width: 200px;
        height: auto;
        z-index: 1;
      " alt="Popup Cat">
      <a id="popup-image-link" href="${imageLink}" target="_blank" style="display:block; margin-top: 20px;">
        <img src="${image}" style="
          width: 100%;
          height: auto;
          border-radius: 10px;
          cursor: pointer;
        " alt="Popup Main">
      </a>
      </div>
    `;
    document.body.appendChild(popupElement);
  }

  function createReopenButton(popup) {
    if (!popup) return;
    const { reopenImage } = popup;
    const image = reopenImage || 'https://edm.fluv.com/wp-content/uploads/sites/3/2025/06/gift.gif';
    if (!image) return;
    const btn = document.createElement('button');
    btn.id = 'reopen-popup';
    btn.style = `
      display: none;
      position: fixed;
      right: 20px;
      bottom: 80px;
      width: 120px;
      height: 120px;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      z-index: 10000;
    `;
    btn.innerHTML = `
      <img src="${image}" style="width: 100%; height: 100%; object-fit: contain;" alt="reopen gif" />
    `;
    document.body.appendChild(btn);
  }

  function showPopup() {
    document.getElementById('email-popup').style.display = 'block';
    document.getElementById('email-overlay').style.display = 'block';
    hideReopenButton();
  }

  function hidePopup() {
    document.getElementById('email-popup').style.display = 'none';
    document.getElementById('email-overlay').style.display = 'none';
    showReopenButton();
  }

  function showReopenButton() {
    const btn = document.getElementById('reopen-popup');
    if (btn) btn.style.display = 'block';
  }

  function hideReopenButton() {
    const btn = document.getElementById('reopen-popup');
    if (btn) btn.style.display = 'none';
  }

  function setCookie(name, value, days) {
    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = date.getTime();
    }
    document.cookie = name + "=" + expires;
  }

  function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }
})();
