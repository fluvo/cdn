/**
 * Fluv Popup System
 * @description 彈窗管理系統 - 支援圖片彈窗和 Email 收集彈窗
 * @version 2.0.0
 * @author Fluv Team
 */
(function () {
  const hostname = window.location.hostname;
  const STORAGE_KEY = 'fluv_popup_closed';

  // 檢查是否應該顯示 popup（基於 localStorage）
  const checkIsShowPopup = (popup) => {
    if (!popup) return false;
    const { popupLogic, id } = popup;

    // 從 localStorage 取得已關閉的 popup 記錄
    const closedPopups = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    if (popupLogic === 'show-once') {
      // 只顯示一次：如果已經關閉過，就不再顯示
      return !closedPopups[id];
    } else if (popupLogic === 'oneday-show-once') {
      // 每天只顯示一次
      const lastClosed = closedPopups[id];
      if (!lastClosed) return true;

      const lastClosedDate = new Date(lastClosed).toDateString();
      const today = new Date().toDateString();
      return lastClosedDate !== today;
    }

    return true;
  };

  // 標記 popup 為已關閉
  const markPopupClosed = (popupId) => {
    const closedPopups = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    closedPopups[popupId] = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(closedPopups));
  };

  const checkHostName = (hostname, popup) => {
    if (!popup) return false;
    const { html } = popup;
    if (!html) return false;
    try {
      const allow = JSON.parse(html).allow;
      return allow.includes(hostname);
    } catch (e) {
      return false;
    }
  };

  function getPopupForHost(popups, hostname) {
    const filtered = popups.filter(popup => {
      if (!checkHostName(hostname, popup)) return false;
      return true;
    });
    if (filtered.length === 0) return null;
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return filtered[0];
  }

  let currentPopup = null;

  const closePopup = () => {
    if (currentPopup) {
      markPopupClosed(currentPopup.id);
    }
    hidePopup();
    showReopenButton();
  };

  const isTestMode = () => {
    const params = new URLSearchParams(window.location.search);
    return params.has('test') || params.size === 1;
  };

  // 根據網址路徑判斷地區
  const detectRegionFromPath = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/jp/')) return 2;
    if (path.includes('/hk/')) return 3;
    if (path.includes('/tw/')) return 1;
    return 1;
  };

  const urlRegion = detectRegionFromPath();
  const userRegion = urlRegion || Number(localStorage.getItem('region')) || 1;

  const testParam = isTestMode() ? '&test=true' : '';
  fetch(`https://api-prod.fluv.com/popups/active?region=${userRegion}${testParam}`)
    .then(response => response.json())
    .then(data => {
      const popup = getPopupForHost(data.data, hostname);
      if (!popup) return;

      currentPopup = popup;

      // 測試模式：忽略 localStorage，直接顯示
      if (isTestMode()) {
        console.log("🧪 測試模式 - popup:", popup);
        createPopup(popup);
        createReopenButton(popup);
        showPopup();
        hideReopenButton();
      } else {
        // 正式模式：檢查 localStorage
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

      // 綁定事件
      document.getElementById('popup-image-link')?.addEventListener('click', closePopup);
      document.getElementById('close-popup')?.addEventListener('click', closePopup);
      document.getElementById('reopen-popup')?.addEventListener('click', () => {
        showPopup();
        hideReopenButton();
      });

      // Email 表單提交
      document.getElementById('popup-email-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('popup-email-input');
        const submitBtn = document.getElementById('popup-submit-btn');
        const email = emailInput?.value;

        if (!email) return;

        // 禁用按鈕
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = '送出中...';
        }

        try {
          const response = await fetch(`https://api-prod.fluv.com/popups/${popup.id}/submit-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });

          const result = await response.json();

          if (result.success) {
            markPopupClosed(popup.id);

            if (result.successAction === 'close') {
              hidePopup();
              showReopenButton();
            } else {
              // 顯示成功訊息
              const formContainer = document.getElementById('popup-form-container');
              if (formContainer) {
                formContainer.innerHTML = `
                  <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                    <div style="font-size: 16px; color: #333;">${result.message}</div>
                  </div>
                `;
              }
              // 3 秒後自動關閉
              setTimeout(() => {
                hidePopup();
                showReopenButton();
              }, 3000);
            }
          } else {
            alert(result.error || '送出失敗，請稍後再試');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = popup.submitButtonText || '訂閱';
            }
          }
        } catch (error) {
          console.error('Email 提交錯誤:', error);
          alert('送出失敗，請稍後再試');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = popup.submitButtonText || '訂閱';
          }
        }
      });
    });

  function createPopup(popup) {
    if (!popup) return;

    // 建立 overlay
    const overlay = document.createElement('div');
    overlay.id = 'fluv-popup-overlay';
    overlay.style.cssText = `
      display: none;
      position: fixed;
      top: 0; left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
    `;
    document.body.appendChild(overlay);

    // 建立彈窗容器
    const popupElement = document.createElement('div');
    popupElement.id = 'fluv-popup';
    popupElement.style.cssText = `
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

    // 根據 popupType 建立不同內容
    if (popup.popupType === 'email-collector') {
      popupElement.innerHTML = createEmailCollectorContent(popup);
    } else {
      popupElement.innerHTML = createImagePopupContent(popup);
    }

    document.body.appendChild(popupElement);
  }

  function createImagePopupContent(popup) {
    const { imageLink, image } = popup;
    if (!imageLink || !image) return '';

    return `
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
        bottom: 0px;
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
    `;
  }

  function createEmailCollectorContent(popup) {
    const { content, submitButtonText = '訂閱' } = popup;

    return `
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
        bottom: 0px;
        left: -34px;
        transform: translateX(-50%);
        width: 200px;
        height: auto;
        z-index: 1;
      " alt="Popup Cat">

      <div id="popup-form-container" style="margin-top: 20px;">
        <div style="
          font-size: 16px;
          line-height: 1.6;
          color: #333;
          margin-bottom: 20px;
          white-space: pre-wrap;
          text-align: left;
          padding: 0 10px;
        ">${content}</div>

        <form id="popup-email-form" style="display: flex; flex-direction: column; gap: 12px;">
          <input
            type="email"
            id="popup-email-input"
            placeholder="請輸入您的 Email"
            required
            style="
              padding: 12px 16px;
              border: 1px solid #ddd;
              border-radius: 8px;
              font-size: 14px;
              outline: none;
              transition: border-color 0.2s;
            "
            onfocus="this.style.borderColor='#007bff'"
            onblur="this.style.borderColor='#ddd'"
          />
          <button
            type="submit"
            id="popup-submit-btn"
            style="
              padding: 12px 24px;
              background-color: #007bff;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              cursor: pointer;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.backgroundColor='#0056b3'"
            onmouseout="this.style.backgroundColor='#007bff'"
          >${submitButtonText}</button>
        </form>
      </div>
    `;
  }

  function createReopenButton(popup) {
    if (!popup) return;
    const { reopenImage } = popup;
    const image = reopenImage || 'https://edm.fluv.com/wp-content/uploads/sites/3/2025/06/gift.gif';

    const btn = document.createElement('button');
    btn.id = 'reopen-popup';
    btn.style.cssText = `
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
    btn.innerHTML = `<img src="${image}" style="width: 100%; height: 100%; object-fit: contain;" alt="reopen gif" />`;
    document.body.appendChild(btn);
  }

  function showPopup() {
    const popup = document.getElementById('fluv-popup');
    const overlay = document.getElementById('fluv-popup-overlay');
    if (popup) popup.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
    hideReopenButton();
  }

  function hidePopup() {
    const popup = document.getElementById('fluv-popup');
    const overlay = document.getElementById('fluv-popup-overlay');
    if (popup) popup.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
  }

  function showReopenButton() {
    const btn = document.getElementById('reopen-popup');
    if (btn) btn.style.display = 'block';
  }

  function hideReopenButton() {
    const btn = document.getElementById('reopen-popup');
    if (btn) btn.style.display = 'none';
  }
})();
