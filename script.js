// --- 載入 CV.txt (一行一筆, 開頭4位數字為年份) ---
// 想更新經歷, 直接編輯同資料夾的 CV.txt 即可
document.addEventListener('DOMContentLoaded', () => {
    const cvList = document.getElementById('cv-list');
    if (!cvList) return;

    fetch('CV.txt?v=' + Date.now())
        .then((res) => {
            if (!res.ok) throw new Error('CV.txt not found');
            return res.text();
        })
        .then((text) => {
            const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
            if (lines.length === 0) return; // 空檔就保留後備內容
            cvList.innerHTML = '';
            lines.forEach((line) => {
                const p = document.createElement('p');
                p.className = 'cv-entry';
                const match = line.match(/^(\d{4})\s*(.*)$/);
                if (match) {
                    const year = document.createElement('span');
                    year.className = 'cv-year';
                    year.textContent = match[1];
                    p.appendChild(year);
                    p.appendChild(document.createTextNode(' ' + match[2]));
                } else {
                    p.textContent = line;
                }
                cvList.appendChild(p);
            });
        })
        .catch(() => {
            /* 載入失敗 (例如以 file:// 直接開啟) 就保留 HTML 內的後備內容 */
        });
});

// --- 像素點陣過場(固定疊層) + 塔羅齒輪: 共用一個捲動迴圈 ---
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('pixelOverlay');
    const grid = document.getElementById('pixelGrid');
    const cv = document.getElementById('cvSection');
    const stage = document.getElementById('tarotStage');

    // 降低動態偏好: 交給 CSS 降級, 不跑 JS
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // 鋪滿視窗的點陣
    function buildGrid() {
        if (!grid) return;
        const cell = 34; // 每格目標像素
        const cols = Math.max(8, Math.min(40, Math.round(window.innerWidth / cell)));
        const rows = Math.max(10, Math.min(40, Math.round(window.innerHeight / cell)));
        grid.style.setProperty('--cols', cols);
        grid.style.setProperty('--rows', rows);
        const frag = document.createDocumentFragment();
        for (let r = 0; r < rows; r++) {
            // 由下往上: 最底排門檻最小(最先出現)
            const base = rows > 1 ? (rows - 1 - r) / (rows - 1) : 0;
            for (let c = 0; c < cols; c++) {
                const dot = document.createElement('div');
                dot.className = 'pixel-dot';
                // 位置門檻(下→上) + dithering 雜訊邊緣
                let t = base + (Math.random() - 0.5) * 0.16;
                t = Math.max(0, Math.min(1, t));
                dot.style.setProperty('--t', t.toFixed(3));
                frag.appendChild(dot);
            }
        }
        grid.innerHTML = '';
        grid.appendChild(frag);
    }

    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    let ticking = false;

    function update() {
        const vh = window.innerHeight;
        const scrollY = window.scrollY;

        // 像素進度 p: 錨點從 CV 區段開始, 到塔羅齒輪登場結束
        if (overlay && cv && stage) {
            const cvAbs = cv.getBoundingClientRect().top + scrollY;
            const stageAbs = stage.getBoundingClientRect().top + scrollY;
            const start = cvAbs - vh * 0.35;  // 起算點 (CV 在畫面 ~35% 高度)
            const end = stageAbs + vh * 0.1;  // 延後到塔羅台已進來一些, 退場更慢、清空時揭示齒輪
            const p = clamp01((scrollY - start) / Math.max(1, end - start));
            overlay.style.setProperty('--p', p.toFixed(4));
        }

        // 塔羅齒輪轉動: 依舞台在視窗內的進度, 左右反向
        if (stage) {
            const rect = stage.getBoundingClientRect();
            const prog = (vh - (rect.top + rect.height / 2)) / vh;
            const rot = prog * 260; // 轉動幅度(度)
            stage.style.setProperty('--rot-l', rot.toFixed(1) + 'deg');
            stage.style.setProperty('--rot-r', (-rot).toFixed(1) + 'deg');

            // 圓心隨「釘住捲動進度」上升: 越往下捲, 圓心越往上抬, 露出更多圓
            const pinProg = clamp01(-rect.top / Math.max(1, rect.height - vh));
            const rise = pinProg * vh * 0.35; // 最多上抬 35% 螢幕高
            stage.style.setProperty('--rise', (-rise).toFixed(1) + 'px');
        }
        ticking = false;
    }

    function onScroll() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }

    buildGrid();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            buildGrid();
            update();
        }, 200);
    });
});

// --- 卡片點開: 浮在正中央 + 文字說明 (lightbox) ---
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('cardModal');
    const modalImg = document.getElementById('cardModalImg');
    const modalTitle = document.getElementById('cardModalTitle');
    const modalMeta = document.getElementById('cardModalMeta');
    const modalDesc = document.getElementById('cardModalDesc');
    if (!modal) return;

    // 作品文案 (取自 BAY 2/works.json 的 title / mainLabel / date / body)
    // 以「圖檔名」為 key
    const WORKS = {
        'windowsuni-2024-9497.webp': { title: '窗邊的小贖鼠', main: '平面', date: '2024-01-01', body: '今天是什麼天氣呢？\n\n似乎容易下意識的期待\n如果是藍天白雲的話\n\n我會特別雀躍於美好的今天到來' },
        'wearealian-2024-0239.webp': { title: '外星同類', main: '平面', date: '2024-01-01', body: '茫茫人海裡遇到你這個和我一樣的外星同類，是多幸運的一件事。\n\n就算我們都跟大多數人不一樣而感到格格不入，終有一刻可以遇到同類的！' },
        'the-house-of-no-time-2024-8255.webp': { title: '精神時光屋', main: '立體', date: '2024-01-01', body: '躲在這裡，我擁有的時間和別人不一樣\n\n留在這裡，我能夠築起夢想\n\n\n我這麼相信著。' },
        'onlyplace-2024-1047.webp': { title: '避世小屋', main: '平面', date: '2024-01-01', body: '回到自己的辟世小屋裡頭。\n是個在靈魂世界堆砌好的一座堅固房間，\n即便私密又充滿許許多多的自我提問，細看確實是豐盛的。\n這沿路琢磨的美好和那些堆積成山的的總總理想，\n\n在打開大門那一刻向你說聲「Mi casa su casa 歡迎來我家。」' },
        'nemasdesuni-2024-6498.webp': { title: '鼠尼小屋', main: '平面', date: '2024-01-01', body: '相信的事物，重複的練習。\n\n信仰的純粹也需要雕琢。\n\n偶爾會不小心忘記原本相信著的原則，告訴自己做得到！\n把它琢磨的閃閃發光吧！' },
        'mi-casa-su-casa-2024-0029.webp': { title: 'mi casa su casa', main: '立體', date: '2024-01-01', body: '逐步建構了精神小屋，那是一個純淨但需要細心照顧的地方。\n\n安靜的時刻，偶爾聽見雨滴沖刷屋簷、偶爾收到雜訊。\n想像理想在眼前注成一道光球，再把他收到胸前的抽屜裡，將它釀成你的閃亮訊號。' },
        'me-time-2024-2319.webp': { title: 'Me Time', main: '平面', date: '2024-01-01', body: '切勿打擾！\n我保留下的珍貴時光\n\n是為了要好好的⋯⋯' },
        'inner-heart-2024-3543.webp': { title: 'Inner heart', main: '立體', date: '2024-01-01', body: '心的深處有什麼呢？\n\n你有仔細挖掘過嗎？\n\n比內心深處更深的地方\n是什麼樣子的呢？' },
        'demon-chu-2024-5812.webp': { title: '小惡魔球', main: '平面', date: '2024-01-01', body: '閃過調皮的念頭，\n小小惡作劇、微微的搗蛋，\n他們覺得這才是有點個性。' },
        'angel-chu-2024-2959.webp': { title: '小天使球', main: '平面', date: '2024-01-01', body: '冒出來的小善良體貼，\n滿滿的共感和同理、\n輕輕一點感受就能觸發。' },
        '1decade-cake-2024-0331.webp': { title: '10週年蛋糕', main: '立體', date: '2024-01-01', body: '請不要唱生日歌，不算生日吧！\n\n但是我們還是必須慶祝\n慶祝方式也由我們定義。\n\n因為週年紀念是我們獨有的節日♥' },
        'suni-icecream-shop-2026-0232.webp': { title: '鼠尼冰淇淋店', main: '立體', date: '2026-03-19', body: '鼠尼冰淇淋店 開張！\n口味很多，獨家研發，主廚特別愛吃！' },
        'catgrass-2019-5223.webp': { title: '貓草專賣攤', main: '平面', date: '2019-01-28', body: '保證新鮮\n保證ㄎㄧㄤ\n貓貓不愛保證退錢' },
        'the-silent-goddess-2025-4396.webp': { title: '寂靜女神', main: '立體', date: '2025-01-01', body: '靈感源於台灣的年度盛事「媽祖進香」。雖然我並不特別隸屬於某個信仰派系，卻被這個傳承百年的宗教儀式深深感動。在時間的洪流中，這份信仰早已在台灣土地上生根茁壯，而我想用自己的風格記錄下那份感動和鼓舞的瞬間。\n我創造的女神雕像戴著全罩式耳機，俏皮地凝視著一旁，彷彿正在思索著什麼。她的胸口刻著階梯與拱門，象徵求知的渴望與時間的流逝。對我而言，真正的信仰不在於外在的儀式或喧囂，而是一個向內探索的寧靜過程。\n這件作品試圖捕捉信仰的本質：在集體的熱鬧中找到個人的寧靜，在傳統的莊嚴中保持現代的思辨，在向外的膜拜中轉向內在的省思。' },
        'no-rush-2025-9751.webp': { title: '夢裡沒有人催促，我躲在這', main: '平面', date: '2025-01-01', body: '躲在這裡，有些話不用說就能懂。\n藏在此處，有些感受不用開口就能歌唱。\n我喜歡在這裡的樣子，即便有些刺眼、有些滾燙。\n\n-\n\n這張畫在說關於夢想：\n每一道閃光，都是身邊那些人的「夢想」在發亮。當我們看到別人盡情閃耀時，是要躲起來？還是急著想展現自己？或是刺眼到裝作沒看見呢？\n發現自己現在都不是這些情緒了。我躲在這些閃耀之中，即使刺目，卻可以靜靜待著，看別人發光就為他鼓掌，順便琢磨他是怎麼亮起來的。我不急著從裡頭尋求誰的目光，只是在這光芒裡，試著發出屬於自己的不一樣的光。\n也許最溫柔的姿態，就是在萬千星火中不爭不搶，只是安靜地燃著自己的那一束微光。不為誰而亮，也不因誰而暗，就這樣在光的森林裡，做一個默默的觀者，偶爾也成為被凝視的那道光。' },
        'island-2025-4197.webp': { title: '發現了內在群島', main: '平面', date: '2025-01-01', body: '土質、風景、誰住在上面\n窗戶、密道、又有什麼秘密？\n\n這裡很值得探索，而我已經慢慢蓋得越來越美，\n但只提供給靈魂契合的旅客登島遊玩。' },
        'inner-room-2025-4043.webp': { title: '心裡的房間', main: '平面', date: '2025-01-01', body: '這幅畫的靈感來自一種「內在解剖式的觀看」。把自己想像成一個拆開來的玩具屋，用我最愛的玩具為靈感，每個房間代表一種情緒狀態，有的角色藏起來偷看、有的在角落努力點燃什麼、有的在邊緣跳舞、有的則整個泡在情緒的泳池裡。這些狀態看起來都可愛、柔軟，像花、像閃光球球，但其實都指向一些更深的內部動力。\n畫面上方像是一個機器或控制板，我一直在想──人是不是應該常常回頭看看自己核心那台正在運作的機器？上面顯示的，是「LOVE」嗎？還是其實一直在閃爍著別的訊號，只是我們沒注意到？\n這不是一張負面的畫，我反而是想用一種甜甜的語言談那些複雜又難以命名的情緒。' },
        'flu-2025-8945.webp': { title: '內在燃料', main: '平面', date: '2025-01-01', body: '在觀察當代人類的生存狀態時，我發現一個深刻矛盾：大腦進化速度遠未跟上現代生活的複雜性，使我們缺乏順暢的應對機制，這種失衡最明顯體現在情緒層面。\n透過研究，我重新定義情緒的本質，認為最純粹的情緒並非傳統的喜怒哀樂，而是喜、悲、怒、厭、懼、驚六種狀態。這些情緒如雙面刃，既可能成為推動前進的動力燃料，也可能轉化為毀滅性能量，更可能成為滋養內在精神花園的養分。\n我用視覺轉譯的方式，將那些從未真正正視的「情緒」透過畫筆轉化為可見形象，讓色彩與線條成為情感語言。這不僅是對個人內在世界的探索，更是對時代精神狀態的觀察與回應。希望透過作品邀請觀者重新審視與情緒的關係，在快速變遷的時代中找到與內在世界和諧共處的可能。' },
        'pocket-heart-suni-2026-1796.webp': { title: '愛心口袋屋-鼠尼', main: '立體', date: '2026-04-30', body: '' },
        'atta-2026-5688.webp': { title: '閣樓', main: '立體', date: '2026-03-23', body: '' },
        'unicorn-icecream-2026-3954.webp': { title: '吃冰淇淋獨角獸機', main: '立體', date: '2026-03-06', body: '' },
        'mehero-2024-3946.webp': { title: '我是我的超人', main: '平面', date: '2024-03-27', body: '' },
        'wishofshootingstar-2024-5669.webp': { title: '流星的願望', main: '平面', date: '2024-01-01', body: '' },
        'midwaylifesjourney-2024-9705.webp': { title: '人生旅途中', main: '平面', date: '2024-01-01', body: '' }
    };
    function infoFor(src) {
        const name = decodeURIComponent(src.split('/').pop());
        return WORKS[name] || { title: name.replace(/\.\w+$/, ''), main: '', date: '', body: '' };
    }

    function openModal(src) {
        const info = infoFor(src);
        modalImg.src = src;
        modalTitle.textContent = info.title;
        modalMeta.textContent = [info.main, info.date].filter(Boolean).join('  ·  ');
        // body 以換行呈現
        modalDesc.innerHTML = '';
        (info.body || '').split('\n').forEach((line, i) => {
            if (i > 0) modalDesc.appendChild(document.createElement('br'));
            modalDesc.appendChild(document.createTextNode(line));
        });
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }
    function closeModal() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    document.querySelectorAll('.tarot-card').forEach((card) => {
        card.addEventListener('click', () => {
            const img = card.querySelector('img');
            if (img) openModal(img.src);
        });
    });

    modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
});

// --- 載入 About.txt (空行分段落, 段內換行保留) ---
// 想更新介紹, 直接編輯同資料夾的 About.txt 即可
document.addEventListener('DOMContentLoaded', () => {
    const aboutEl = document.getElementById('about-list');
    if (!aboutEl) return;

    fetch('About.txt?v=' + Date.now())
        .then((res) => {
            if (!res.ok) throw new Error('About.txt not found');
            return res.text();
        })
        .then((text) => {
            const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.length > 0);
            if (blocks.length === 0) return; // 空檔就保留後備內容
            aboutEl.innerHTML = '';
            blocks.forEach((block) => {
                const p = document.createElement('p');
                block.split('\n').forEach((line, i) => {
                    if (i > 0) p.appendChild(document.createElement('br'));
                    p.appendChild(document.createTextNode(line));
                });
                aboutEl.appendChild(p);
            });
        })
        .catch(() => {
            /* 載入失敗 (例如以 file:// 直接開啟) 就保留 HTML 內的後備內容 */
        });
});

document.addEventListener('DOMContentLoaded', () => {
    const pet = document.getElementById('pet');
    const container = document.body; // Use body as boundary

    // State
    let isDragging = false;
    let currentX = window.innerWidth / 2;
    let currentY = window.innerHeight * 0.8;
    let targetX = currentX;
    let targetY = currentY;
    let velocityX = 0;
    let velocityY = 0;
    let moveInterval;
    let idleTimeout;

    // Initial Position
    updatePetPosition();

    // --- Dragging Logic ---
    let startX, startY, initialPetX, initialPetY;

    pet.addEventListener('mousedown', startDrag);
    pet.addEventListener('touchstart', startDrag, { passive: false });

    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });

    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);

    function startDrag(e) {
        isDragging = true;
        pet.style.transition = 'none'; // Disable transition for direct control

        // Change to grabbed state
        pet.src = 'assets/pet_grab.gif?v=1';

        // Get input coordinates
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        startX = clientX;
        startY = clientY;

        // Get current pet position (parsed from style or current vars)
        initialPetX = currentX;
        initialPetY = currentY;

        // Stop autonomous movement
        clearInterval(moveInterval);
        clearTimeout(idleTimeout);

        // Prevent default to stop scrolling on mobile
        if (e.type === 'touchstart') e.preventDefault();

        updatePetPosition();
    }

    function drag(e) {
        if (!isDragging) return;
        if (e.type === 'touchmove') e.preventDefault();

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        currentX = initialPetX + deltaX;
        currentY = initialPetY + deltaY;

        updatePetPosition();
    }

    function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        pet.style.transition = 'transform 0.2s ease-out'; // Smooth release

        // Revert to normal state
        pet.src = 'assets/pet.gif?v=1';

        // Start wandering again after a delay
        startWandering();
    }

    // --- Movement Logic ---
    function updatePetPosition() {
        // Boundary checks
        const padding = 40;
        const maxX = window.innerWidth - padding;
        const maxY = window.innerHeight - padding;
        const minX = padding;
        const minY = padding;

        if (!isDragging) {
            // Keep within bounds if it drifted out
            if (currentX < minX) currentX = minX;
            if (currentX > maxX) currentX = maxX;
            if (currentY < minY) currentY = minY;
            if (currentY > maxY) currentY = maxY;
        }

        pet.style.left = `${currentX}px`;
        pet.style.top = `${currentY}px`;

        if (isDragging) {
            // Offset to bottom-left to avoid blocking cursor
            pet.style.transform = 'translate(-80%, 20%) scale(1.1)';
        } else {
            // Flip sprite based on direction
            if (targetX > currentX) {
                pet.style.transform = 'translate(-50%, -50%) scaleX(1)'; // Face right (flipped)
            } else {
                pet.style.transform = 'translate(-50%, -50%) scaleX(-1)'; // Face left (original)
            }
        }
    }

    function pickNewTarget() {
        const padding = 50;
        targetX = Math.random() * (window.innerWidth - padding * 2) + padding;
        targetY = Math.random() * (window.innerHeight - padding * 2) + padding;
    }

    function moveStep() {
        if (isDragging) return;

        const speed = 2; // Pixels per frame
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            // Reached target, wait a bit then pick new one
            clearInterval(moveInterval);
            idleTimeout = setTimeout(startWandering, Math.random() * 2000 + 1000);
            return;
        }

        // Normalize and move
        velocityX = (dx / distance) * speed;
        velocityY = (dy / distance) * speed;

        currentX += velocityX;
        currentY += velocityY;

        updatePetPosition();
    }

    function startWandering() {
        pickNewTarget();
        clearInterval(moveInterval);
        moveInterval = setInterval(moveStep, 20); // 50fps
    }

    // Handle Window Resize
    window.addEventListener('resize', () => {
        // Keep pet on screen
        currentX = Math.min(currentX, window.innerWidth - 40);
        currentY = Math.min(currentY, window.innerHeight - 40);
        updatePetPosition();
    });

    // Start!
    startWandering();
});
