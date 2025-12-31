/**
 * Fluv Event Banner System
 * @description 活動橫幅系統 - 支援旋轉木馬、地區篩選、測試模式
 * @version 1.0.0
 * @author Fluv Team
 */
(async function loadEventUI() {
  // ===== 0) 檢查 staging flag =====
  const urlParams = new URLSearchParams(window.location.search);
  const isTestMode = urlParams.has('test');

  // 如果沒有 ?test 參數，直接返回不顯示 banner
  if (!isTestMode) {
    return;
  }

  // ===== 1) 依網址判斷 region =====
  const path = location.pathname.toLowerCase();
  const region =
    path.startsWith('/tw/') ? 1 :
    path.startsWith('/jp/') ? 2 :
    path.startsWith('/hk/') ? 3 :
    1; // 預設台灣

  // ===== 2) 抓 DOM =====
  const bannerRoot  = document.getElementById('event-banner');
  const desktopWrap = document.getElementById('event-banner-image-dasktop'); // ← 保留原本拼字
  const mobileWrap  = document.getElementById('event-banner-image-mobile');

  const dropdownList   = document.getElementById('events-dropdown-list');
  const dropdownButton = document.getElementById('events-dropdown-button');

  // ===== 3) 工具：挑「目前有效」的所有活動 =====
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

  // ===== 4) 取 API（一次就好，兩邊共用）=====
  let activeEvents = [];
  try {
    const res = await fetch('https://api-prod.fluv.com/events?limit=100&region=' + region, {
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

  // ===== 5) 更新 Banner（旋轉木馬）=====
  if (bannerRoot) {
    if (activeEvents.length === 0) {
      bannerRoot.style.display = 'none';
    } else {
      bannerRoot.style.display = 'block';

      // 建立旋轉木馬容器
      bannerRoot.innerHTML = `
        <div style="position: relative; width: 100%; overflow: hidden;">
          <div id="carousel-track" style="display: flex; transition: transform 0.5s ease-in-out; width: 100%;"></div>
          ${activeEvents.length > 1 ? `
            <button id="carousel-prev" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); z-index: 10; background: rgba(0,0,0,0.2); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px; transition: background 0.3s;">&#8249;</button>
            <button id="carousel-next" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); z-index: 10; background: rgba(0,0,0,0.2); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px; transition: background 0.3s;">&#8250;</button>
            <div id="carousel-dots" style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; gap: 8px;"></div>
          ` : ''}
        </div>
      `;

      const track = document.getElementById('carousel-track');
      const dotsContainer = document.getElementById('carousel-dots');
      // 只有多個活動時才從 1 開始（因為會在前後各加一個複製項）
      let currentIndex = activeEvents.length > 1 ? 1 : 0;
      let isTransitioning = false;

      // 為了無限循環，在開頭和結尾各加一個複製的項目
      const createSlide = (event) => {
        const item = document.createElement('div');
        item.style.cssText = 'min-width: 100%; width: 100%; flex-shrink: 0;';
        item.innerHTML = `
          <a href="${event.homeBannerUtmLink || '#'}" target="_blank" rel="noopener" style="display: block; width: 100%;">
            <picture>
              <source media="(max-width: 767px)" srcset="${event.mobileImageLink || ''}">
              <img src="${event.desktopImageLink || ''}" alt="${event.title || ''}" style="width: 100%; height: auto; display: block;" loading="eager">
            </picture>
          </a>
        `;
        return item;
      };

      // 加入最後一個項目的複製（放在最前面）- 只有多個活動時才需要
      if (activeEvents.length > 1) {
        track.appendChild(createSlide(activeEvents[activeEvents.length - 1]));
      }

      // 加入所有實際項目
      activeEvents.forEach((event, index) => {
        track.appendChild(createSlide(event));

        // 建立指示點
        if (activeEvents.length > 1 && dotsContainer) {
          const dot = document.createElement('button');
          dot.style.cssText = 'width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; background: transparent; cursor: pointer; padding: 0; transition: background 0.3s;';
          dot.onclick = () => showSlide(index + 1, true);
          dotsContainer.appendChild(dot);
        }
      });

      // 加入第一個項目的複製（放在最後面）- 只有多個活動時才需要
      if (activeEvents.length > 1) {
        track.appendChild(createSlide(activeEvents[0]));
      }

      // 顯示指定的幻燈片
      const showSlide = (index, smooth = true) => {
        const dots = dotsContainer?.children || [];

        // 控制是否有動畫
        track.style.transition = smooth ? 'transform 0.5s ease-in-out' : 'none';
        track.style.transform = `translateX(-${index * 100}%)`;

        // 只有多個活動時才更新指示點
        if (activeEvents.length > 1) {
          // 更新指示點（實際項目的索引）
          const realIndex = index - 1;
          for (let i = 0; i < dots.length; i++) {
            if (dots[i]) {
              dots[i].style.background = i === realIndex ? 'white' : 'transparent';
            }
          }
        }
        currentIndex = index;

        // 如果沒有動畫，立即釋放鎖定
        if (!smooth) {
          setTimeout(() => {
            isTransitioning = false;
          }, 50);
        }
      };

      // 處理循環邊界
      const handleTransitionEnd = () => {
        // 如果到了複製的最後一張，立即跳回真正的第一張（無動畫）
        if (currentIndex === activeEvents.length + 1) {
          currentIndex = 1;
          showSlide(currentIndex, false);
        }
        // 如果到了複製的第一張，立即跳回真正的最後一張（無動畫）
        else if (currentIndex === 0) {
          currentIndex = activeEvents.length;
          showSlide(currentIndex, false);
        } else {
          // 正常情況下釋放鎖定
          isTransitioning = false;
        }
      };

      track.addEventListener('transitionend', handleTransitionEnd);

      // 下一張
      const nextSlide = () => {
        if (isTransitioning) return;
        isTransitioning = true;
        currentIndex++;
        showSlide(currentIndex, true);
      };

      // 上一張
      const prevSlide = () => {
        if (isTransitioning) return;
        isTransitioning = true;
        currentIndex--;
        showSlide(currentIndex, true);
      };

      // 綁定按鈕事件
      const prevBtn = document.getElementById('carousel-prev');
      const nextBtn = document.getElementById('carousel-next');
      if (prevBtn) {
        prevBtn.onclick = prevSlide;
        prevBtn.onmouseenter = () => prevBtn.style.background = 'rgba(0,0,0,0.4)';
        prevBtn.onmouseleave = () => prevBtn.style.background = 'rgba(0,0,0,0.2)';
      }
      if (nextBtn) {
        nextBtn.onclick = nextSlide;
        nextBtn.onmouseenter = () => nextBtn.style.background = 'rgba(0,0,0,0.4)';
        nextBtn.onmouseleave = () => nextBtn.style.background = 'rgba(0,0,0,0.2)';
      }

      // 顯示第一張
      // 多個活動時從索引 1 開始（因為 0 是複製的最後一張）
      // 單個活動時從索引 0 開始
      showSlide(currentIndex, false);

      // 自動輪播（每 5 秒）- 只有多個活動時才啟用
      if (activeEvents.length > 1) {
        setInterval(nextSlide, 5000);
      }
    }
  }

  // ===== 6) 更新 Nav Bar 下拉選單（顯示所有活動）=====
  if (dropdownList) {
    if (activeEvents.length === 0) {
      // 沒有活動時隱藏整個下拉選單
      dropdownList.style.display = 'none';
      const dropdownContainer = document.getElementById('events-dropdown');
      if (dropdownContainer) {
        dropdownContainer.style.display = 'none';
      }
    } else {
      // 清空並重建下拉選單
      dropdownList.innerHTML = '';

      activeEvents.forEach((event) => {
        const link = document.createElement('a');

        // 複製原有的 class 和屬性
        link.className = 'dropdown-link-home w-dropdown-link';
        link.href = event.barUtmLink || '#';
        link.target = '_blank';
        link.rel = 'noopener';
        link.tabIndex = 0;

        // 設置文字
        link.textContent = event.tabName || event.title || '優惠活動';

        // 添加 hover 效果（保持原有樣式）
        link.addEventListener('mouseenter', function() {
          this.style.color = 'rgb(89, 167, 174)';
          this.style.backgroundColor = 'rgb(255, 255, 255)';
        });
        link.addEventListener('mouseleave', function() {
          this.style.color = '';
          this.style.backgroundColor = '';
        });

        dropdownList.appendChild(link);
      });

      // 確保下拉選單顯示
      const dropdownContainer = document.getElementById('events-dropdown');
      if (dropdownContainer && dropdownContainer.style.display === 'none') {
        dropdownContainer.style.display = '';
      }
    }
  }
})();
