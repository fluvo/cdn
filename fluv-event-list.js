/**
 * Fluv Event List System (WordPress)
 * @description 活動列表系統 - 支援活動卡片顯示、選單更新、地區篩選
 * @version 1.0.0
 * @author Fluv Team
 */
(async function loadEventList() {
  // ===== 0) 檢查 staging flag =====
  const urlParams = new URLSearchParams(window.location.search);
  const isTestMode = urlParams.has('test');

  // 如果沒有 ?test 參數，直接返回不顯示活動列表
  if (!isTestMode) {
    return;
  }

  // ===== 1) 隱藏舊的活動列表 =====
  const oldEventList = document.getElementById('old-event-list');
  if (oldEventList) {
    oldEventList.style.display = 'none';
  }

  // ===== 2) 檢查是否在 event-list 頁面 =====
  const path = location.pathname.toLowerCase();
  const isEventListPage = path.includes('/event-list/') || path.endsWith('/event-list');

  if (!isEventListPage) {
    return;
  }

  // ===== 3) 依網址判斷 region =====
  let region =
    path.startsWith('/tw/') ? 1 :
    path.startsWith('/jp/') ? 2 :
    path.startsWith('/hk/') ? 3 :
    1; // 預設台灣

  // ===== 4) 抓 DOM =====
  const eventListContainer = document.getElementById('event-list');
  if (!eventListContainer) {
    console.warn('event-list container not found');
    return;
  }

  // ===== 5) 工具：挑「目前有效」的所有活動 =====
  const pickActiveEvents = (events) => {
    const now = Date.now();
    const active = events.filter(e => {
      if (+e.region !== region) return false;
      const s  = new Date(e.startTime).getTime();
      const ed = new Date(e.endTime).getTime();
      return Number.isFinite(s) && Number.isFinite(ed) && s <= now && now <= ed;
    });
    // 依開始時間排序（最新的優先）
    active.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    return active;
  };

  // ===== 6) 取 API =====
  let activeEvents = [];
  try {
    const res = await fetch(`https://api-prod.fluv.com/events?limit=100&region=${region}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const events = Array.isArray(data?.events) ? data.events :
                   Array.isArray(data) ? data : [];
    activeEvents = pickActiveEvents(events);
  } catch (err) {
    console.warn('events fetch failed:', err);
  }

  // ===== 7) 更新選單的 sub-menu =====
  const eventMenuItem = document.getElementById('menu-item-11090');
  if (eventMenuItem && activeEvents.length > 0) {
    const subMenu = eventMenuItem.querySelector('.sub-menu');
    if (subMenu) {
      // 清空原有的選單項目
      subMenu.innerHTML = '';

      // 為每個活動建立選單項目
      activeEvents.forEach((event) => {
        const menuItem = document.createElement('li');
        menuItem.className = 'menu-item menu-item-type-custom menu-item-object-custom';

        menuItem.innerHTML = `
          <a href="${event.barUtmLink || event.eventPageUtmLink || '#'}" itemprop="url" target="_blank" rel="noopener">
            <span class="avia-bullet"></span>
            <span class="avia-menu-text">${event.tabName || event.title || '優惠活動'}</span>
          </a>
        `;

        subMenu.appendChild(menuItem);
      });
    }
  }

  // ===== 8) 動態生成活動卡片（每行三個）=====
  if (activeEvents.length === 0) {
    eventListContainer.innerHTML = '<p style="text-align: center; padding: 40px;">目前沒有進行中的活動</p>';
    return;
  }

  // 清空容器
  eventListContainer.innerHTML = '';

  // 建立 flex 容器（每行三個）
  const flexContainer = document.createElement('div');
  flexContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 20px; padding: 20px 0;';

  activeEvents.forEach((event) => {
    // 格式化日期時間
    const formatDateTime = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    };

    const startTime = formatDateTime(event.startTime);
    const endTime = formatDateTime(event.endTime);

    // 建立卡片容器
    const card = document.createElement('div');
    card.className = 'flex_column av-2l33k6-c1b2e98299ab399017f8f1f77a9d9eba av_one_third avia-builder-el-1 el_after_av_heading avia-builder-el-last first av-break-at-tablet flex_column_div';
    card.style.cssText = 'flex: 0 0 calc(33.333% - 14px); box-sizing: border-box; border: 2px solid #59A7AE; border-radius: 30px; padding: 20px; background: #fff;';

    // 建立卡片內容
    card.innerHTML = `
      <section class="av_textblock_section" itemscope="itemscope" itemtype="https://schema.org/CreativeWork">
        <div class="avia_textblock" itemprop="text">
          <p>
            <img class="alignnone wp-image-11080 size-large"
                 src="${event.mobileImageLink || ''}"
                 alt="${event.title || '優惠活動'}"
                 style="width: 100%; height: auto;">
          </p>
          <h2>${event.title || '優惠活動'}</h2>
          <p>${event.description || ''}</p>
          <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
            <strong>活動時間：</strong><br>
            ${startTime} ~ ${endTime}
          </p>
        </div>
      </section>
      <div class="avia-button-wrap avia-button-right avia-builder-el-3 el_after_av_textblock avia-builder-el-last">
        <a href="${event.eventPageUtmLink || '#'}"
           class="avia-button av-mgg1j4xc-32515f019d91e1eca8a19b892c0a2b1f avia-icon_select-yes-left-icon avia-size-medium avia-position-right avia-color-theme-color"
           target="_blank"
           rel="noopener noreferrer">
          <span class="avia_button_icon avia_button_icon_left" aria-hidden="true" data-av_icon="" data-av_iconfont="entypo-fontello"></span>
          <span class="avia_iconbox_title">立即預約</span>
        </a>
      </div>
    `;

    flexContainer.appendChild(card);
  });

  eventListContainer.appendChild(flexContainer);

  // ===== 9) 響應式處理（手機版改為單欄）=====
  const handleResize = () => {
    const cards = flexContainer.querySelectorAll('.flex_column');
    const isMobile = window.innerWidth <= 768;

    cards.forEach((card) => {
      if (isMobile) {
        card.style.flex = '0 0 100%';
      } else {
        card.style.flex = '0 0 calc(33.333% - 14px)';
      }
    });
  };

  // 初始調整
  handleResize();

  // 監聽視窗大小變化
  window.addEventListener('resize', handleResize);
})();
