/* 配色切换器（样稿工具）：左下角切换 现在 / A / B / C，数字键 1–4 也可以切。
   选择会记在地址栏 ?palette= 和本机浏览器里，刷新后保留。
   正式版：<html data-mx-prod data-mx-palette="a"> 时固定配色，不显示切换条、不写地址栏和本地存储。 */
(() => {
  'use strict';
  const PALETTES = [
    { id: 'now', name: '现在', sw: ['#f7f4ec', '#506341', '#926c55'] },
    { id: 'a', name: 'A 朱砂', sw: ['#f7f4ec', '#506341', '#c8502d'] },
    { id: 'b', name: 'B 墨夜', sw: ['#141813', '#a8c47e', '#e8774f'] },
    { id: 'c', name: 'C 钴蓝', sw: ['#f3f3f0', '#1c1f22', '#2f55d4'] }
  ];
  const root = document.documentElement;
  const ids = PALETTES.map((p) => p.id);
  const KEY = 'mx-palette';
  const PROD = root.hasAttribute('data-mx-prod');

  let initial = PROD ? root.dataset.mxPalette : new URLSearchParams(location.search).get('palette');
  if (!PROD && !ids.includes(initial)) { try { initial = localStorage.getItem(KEY); } catch (e) { initial = null; } }
  if (!ids.includes(initial)) initial = 'b';   /* 已选定：墨夜 */
  root.dataset.palette = initial;
  /* 正式版大胆模式：首屏先画成墨夜，避免加载时先闪一下纸本（story.js 随后按滚动位置校正） */
  if (PROD && root.dataset.mxStory === 'bold') root.dataset.palette = 'b';

  const metaTheme = () => document.querySelector('meta[name="theme-color"]');

  function apply(id, animate) {
    if (!ids.includes(id)) return;
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('mx-pal-anim');
      clearTimeout(apply._t);
      apply._t = setTimeout(() => root.classList.remove('mx-pal-anim'), 650);
    }
    root.dataset.palette = id;
    if (!PROD) {
      try { localStorage.setItem(KEY, id); } catch (e) { /* 隐私模式下忽略 */ }
      const url = new URL(location.href);
      url.searchParams.set('palette', id);
      history.replaceState(null, '', url);
    }
    const m = metaTheme();
    if (m) m.content = getComputedStyle(root).getPropertyValue('--paper').trim() || m.content;
    document.querySelectorAll('.pal-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pal === id)));
  }

  function build() {
    addSeal();
    if (PROD) { apply(initial, false); return; }
    const bar = document.createElement('div');
    bar.className = 'pal-switch';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', '配色样稿切换');
    bar.innerHTML = '<span class="pal-title">配色</span>' + PALETTES.map((p, i) =>
      `<button type="button" data-pal="${p.id}" aria-pressed="${p.id === root.dataset.palette}">` +
      `<span class="sw" aria-hidden="true">${p.sw.map((c) => `<i style="background:${c}"></i>`).join('')}</span>${p.name}<kbd>${i + 1}</kbd></button>`
    ).join('');
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-pal]');
      if (b) apply(b.dataset.pal, true);
    });
    document.body.appendChild(bar);

    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
      const k = Number(e.key);
      if (k >= 1 && k <= PALETTES.length) apply(PALETTES[k - 1].id, true);
    });

    apply(initial, false);   /* 用用户的选择，不用被「大胆模式」临时改掉的值 */
  }

  /* 页脚小印章（只在 A 配色显示，样式见 palette.css） */
  function addSeal() {
    const foot = document.querySelector('.site-footer > span');
    if (foot && !foot.querySelector('.mx-seal')) {
      const seal = document.createElement('span');
      seal.className = 'mx-seal';
      seal.setAttribute('aria-hidden', 'true');
      seal.textContent = '柴辰';
      foot.prepend(seal);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
