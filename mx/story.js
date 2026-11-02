/* 文案与排版样稿 story.js
   原则：故事只做引子和串线，主角仍然是项目、成绩和联系方式。
   三档对比（切换条「文案」按钮或 S 键循环）：
   - 旧：线上原文；
   - 新：衬线标题、开场三句、章节标题改写、项目一句话、HUD、页脚说明；
   - 大胆：在「新」的基础上，开场三句改成一屏一句的大字；线框体停在右侧陪读，到作品区才缩成徽章；
     页面从「墨夜」滚到「纸本」（从底层到结果）；章节号做成巨大的描边数字。 */
(() => {
  'use strict';
  const root = document.documentElement;
  const KEY = 'mx-story';
  const MODES = ['off', 'on', 'bold'];
  const NAMES = { off: '旧', on: '新', bold: '大胆' };
  const PROD = root.hasAttribute('data-mx-prod');   /* 正式版：固定档位，不显示切换按钮 */
  let mode = PROD ? root.dataset.mxStory : new URLSearchParams(location.search).get('story');
  if (!PROD && !MODES.includes(mode)) { try { mode = localStorage.getItem(KEY); } catch (e) { mode = null; } }
  if (!MODES.includes(mode)) mode = 'bold';
  root.dataset.story = mode === 'off' ? 'off' : 'on';
  root.dataset.bold = mode === 'bold' ? 'on' : 'off';

  const HEADINGS = {
    'experience-title': '换一门语言，照样把事做完。',
    'skills-title': '工具箱里的每一样，都有项目作证。',
    'honors-title': '成绩，是打底的那一层。',
    'notes-title': '学会的东西，要能讲给别人听。',
    'contact-title': '聊聊吧。'
  };
  const TAGLINES = {
    'json-rpc': '像调用本地函数一样，调用远程服务。',
    'memory-pool': '多个线程同时要内存，不必排队等锁。',
    'interview': '大一，用 AI 把求职这件事跑通。',
    'ai-learning': '让学过的东西，下次还找得到。',
    'reactor-calculator': '一个线程，同时照看多路连接。',
    'technical-video': '把「计算机如何工作」讲清楚。'
  };

  /* 用户在切换条里选的配色（大胆模式会临时把开头改成墨夜，离开后还原） */
  let userPalette = (PROD ? root.dataset.mxPalette : root.dataset.palette) || 'a';
  let arcDark = null;

  function build() {
    const works = document.getElementById('works');

    /* 开场三句：插在章节导航和 01 成果之间 */
    if (works && !document.querySelector('.mx-prologue')) {
      const pro = document.createElement('section');
      pro.className = 'mx-prologue';
      pro.setAttribute('aria-label', '引子');
      pro.innerHTML =
        '<p class="mx-pl-kicker">00 / PROLOGUE</p>' +
        '<p class="mx-pl-line">程序需要记忆，<br><em>我写过<b class="k">内存池</b>，替它管好每一块内存。</em></p>' +
        '<p class="mx-pl-line">我也需要记忆，<br><em>就用 <b class="k">AI</b> 搭了自己的知识库。</em></p>' +
        '<p class="mx-pl-line">下一步，<br><em>把天天在用的 AI 工作流，做成<b class="k">开源工具</b>。</em></p>' +
        '<p class="mx-pl-line mx-pl-last">下面，是到目前为止做出来的<b class="k">结果</b><span aria-hidden="true">↓</span></p>';
      works.before(pro);
      const io = new IntersectionObserver((ents) => ents.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      }), { threshold: .5 });
      pro.querySelectorAll('.mx-pl-line').forEach((el, i) => { el.style.transitionDelay = i * 140 + 'ms'; io.observe(el); });
    }

    /* 章节标题：保存原文，按模式切换 */
    Object.entries(HEADINGS).forEach(([id, txt]) => {
      const h = document.getElementById(id);
      if (h && !h.dataset.orig) { h.dataset.orig = h.textContent; h.dataset.story = txt; }
    });

    /* 巨大的描边章节号（只在大胆模式显示） */
    document.querySelectorAll('.chapter-section').forEach((sec) => {
      const no = sec.querySelector('.chapter-number');
      if (no && !sec.querySelector('.mx-bignum')) {
        const big = document.createElement('span');
        big.className = 'mx-bignum';
        big.setAttribute('aria-hidden', 'true');
        big.textContent = no.textContent.trim();
        sec.prepend(big);
      }
    });

    /* 项目卡一句话 */
    document.querySelectorAll('.evidence-card[data-project]').forEach((card) => {
      const t = TAGLINES[card.dataset.project];
      const h3 = card.querySelector('h3');
      if (t && h3 && !card.querySelector('.mx-tagline')) {
        const p = document.createElement('p');
        p.className = 'mx-tagline';
        p.textContent = t;
        h3.after(p);
      }
    });

    /* HUD：滚动时浮现，停下 1.2 秒后淡出 */
    const hud = document.createElement('div');
    hud.className = 'mx-hud';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = 'HEAP · FRAG <b>38.2%</b>';
    document.body.appendChild(hud);
    const hudVal = hud.querySelector('b');
    const hero = document.querySelector('.evidence-hero');
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const k = max > 0 ? Math.min(1, scrollY / max) : 0;
      const frag = 38.2 * Math.pow(1 - k, 1.6);
      hudVal.textContent = k > .995 ? '0.0% · CLEAN' : frag.toFixed(1) + '%';
      const past = !!hero && scrollY > hero.offsetTop + hero.offsetHeight * .6;
      hud.classList.toggle('is-on', past);
      clearTimeout(hud._t);
      if (past) hud._t = setTimeout(() => hud.classList.remove('is-on'), 1200);
      arc();
    };
    addEventListener('scroll', onScroll, { passive: true });

    /* 页脚手艺说明 */
    const mid = document.querySelector('.site-footer > span:nth-of-type(2)');
    if (mid && !mid.querySelector('.mx-colophon')) {
      const c = document.createElement('span');
      c.className = 'mx-colophon';
      c.textContent = ' 线框图形由 Canvas 实时计算，不是图片。';
      mid.appendChild(c);
    }

    /* 衬线字体：本地托管的子集，见 fonts/serif.css 和 tools/subset_font.py（改了文案要重新生成） */

    /* 记住用户在切换条里选的配色 */
    document.addEventListener('click', (e) => {
      const b = e.target.closest('.pal-switch [data-pal]');
      if (b) { userPalette = b.dataset.pal; setTimeout(() => arc(true), 0); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
      if (!PROD && /^[1-4]$/.test(e.key)) { userPalette = ['now', 'a', 'b', 'c'][+e.key - 1]; setTimeout(() => arc(true), 0); }
      if (!PROD && (e.key === 's' || e.key === 'S')) cycle();
    });

    /* 切换器：加「文案」按钮 */
    const addToggle = () => {
      const bar = !PROD && document.querySelector('.pal-switch');
      if (!bar || bar.querySelector('[data-story-toggle]')) return;
      const sep = document.createElement('span');
      sep.className = 'pal-sep';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.storyToggle = '';
      btn.innerHTML = '文案 <b></b><kbd>S</kbd>';
      btn.addEventListener('click', cycle);
      bar.append(sep, btn);
      apply(mode);
    };
    addToggle();
    /* palette.js 会在 DOMContentLoaded 时写入用户配色，之后要重新套一次「墨夜→纸本」 */
    document.addEventListener('DOMContentLoaded', () => { addToggle(); arc(true); });
    apply(mode);
  }

  function cycle() { apply(MODES[(MODES.indexOf(mode) + 1) % MODES.length]); }

  /* 大胆模式：作品区之前是墨夜，之后回到用户选的配色 */
  function arc(force) {
    const works = document.getElementById('works');
    let dark = false;
    if (mode === 'bold' && works) dark = works.getBoundingClientRect().top > innerHeight * .55;
    if (!force && dark === arcDark) return;
    const target = dark ? 'b' : userPalette;
    if (root.dataset.palette !== target) {
      if (arcDark !== null && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        root.classList.add('mx-pal-anim', 'mx-arc-anim');
        clearTimeout(arc._t);
        arc._t = setTimeout(() => root.classList.remove('mx-pal-anim', 'mx-arc-anim'), 950);
      }
      root.dataset.palette = target;
    }
    arcDark = dark;
  }

  function apply(m) {
    mode = m;
    root.dataset.story = m === 'off' ? 'off' : 'on';
    root.dataset.bold = m === 'bold' ? 'on' : 'off';
    if (!PROD) {
      try { localStorage.setItem(KEY, m); } catch (e) { /* 忽略 */ }
      const url = new URL(location.href);
      url.searchParams.set('story', m);
      history.replaceState(null, '', url);
    }
    Object.keys(HEADINGS).forEach((id) => {
      const h = document.getElementById(id);
      if (h && h.dataset.orig) h.textContent = m === 'off' ? h.dataset.orig : h.dataset.story;
    });
    const btn = document.querySelector('[data-story-toggle]');
    if (btn) {
      btn.querySelector('b').textContent = NAMES[m];
      btn.setAttribute('aria-pressed', String(m !== 'off'));
    }
    arc(true);
    window.dispatchEvent(new Event('resize'));   /* 让线框体按新布局重新定位 */
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
