/* 动效层 motion.js
   1. 线框体：首屏很大、很淡地铺在标题后面；往下滚动时缩小，停到右下角变成徽章，
      读到哪一章就变成对应形态。首屏中，鼠标会让它倾斜，也会把线条推开；
      徽章可以拖动旋转，点击回到顶部。
   2. 标题逐字浮现、首屏依次进入、数字计数、深色卡柔光、按钮磁吸。
   系统开启「减少动态效果」时，只画静态线框，其余动效全部关闭。
   不依赖任何第三方库。 */
(() => {
  'use strict';

  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  let still = RM.matches;
  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  /* ================= 形态库：每个函数把 (u, v, 时间) 映射成三维点，半径约为 1 ================= */
  const SHAPES = {
    /* 序章：有机的花苞 */
    bloom(u, v, t, o) {
      const th = u * TAU, ph = v * PI;
      let r = 1 + .2 * Math.sin(4 * ph + 2 * th + t * 1.1) + .12 * Math.sin(6 * ph + t * .8) * Math.cos(3 * th + t * .5);
      r *= .8;
      const s = Math.sin(ph);
      o.x = r * s * Math.cos(th);
      o.z = r * s * Math.sin(th);
      o.y = r * Math.cos(ph) + .1 * Math.sin(5 * th + 3 * ph + t * .6);
    },
    /* 01 内存池：三层缓存（ThreadCache / CentralCache / PageCache），各层反向转动 */
    tiers(u, v, t, o) {
      const k = Math.min(2, Math.floor(v * 3)), w = v * 3 - k;
      const R = [.98, .7, .44][k], yc = [-.58, 0, .56][k], sp = [.22, -.4, .65][k];
      const th = u * TAU + t * sp, a = w * TAU;
      const tube = .12 + .035 * Math.sin(th * 8 - t * 2.4 * (k - 1 || 1));
      const rr = R + tube * Math.cos(a);
      o.x = rr * Math.cos(th);
      o.z = rr * Math.sin(th);
      o.y = yc + tube * .8 * Math.sin(a);
    },
    /* 02 两个方向：两团相连、交替起伏 */
    twin(u, v, t, o) {
      const th = u * TAU, ph = v * PI;
      const c = Math.cos(th);
      let r = .4 + .55 * Math.pow(Math.abs(c), 1.3);
      r *= 1 + .07 * Math.sin(8 * ph + t * 1.5) + .1 * Math.sin(t * 1.1) * Math.sign(c);
      const s = Math.sin(ph);
      o.x = r * s * c * 1.08;
      o.z = r * s * Math.sin(th) * .9;
      o.y = r * Math.cos(ph) * .82 + .08 * Math.sin(2 * th + t * .7);
    },
    /* 03 事件循环：环面，上面有「事件」在绕圈跑 */
    torus(u, v, t, o) {
      const th = u * TAU, a2 = v * TAU;
      const ev = Math.exp(-6 * (1 - Math.cos(th - t * 1.7))) + .7 * Math.exp(-9 * (1 - Math.cos(th + PI - t * 1.7)));
      const a = .26 * (1 + .55 * ev);
      const R = .7;
      o.x = (R + a * Math.cos(a2)) * Math.cos(th);
      o.z = (R + a * Math.cos(a2)) * Math.sin(th);
      o.y = a * Math.sin(a2);
    },
    /* 04 工具箱：扭转的方柱 */
    stack(u, v, t, o) {
      const th = u * TAU;
      const ct = Math.cos(th), st = Math.sin(th);
      const rs = Math.pow(Math.pow(Math.abs(ct), 4) + Math.pow(Math.abs(st), 4), -.25);
      const s = .56 * (1 - .16 * Math.cos(v * TAU)) * (1 + .03 * Math.sin(v * 18 - t * 2));
      const tw = (v - .5) * 2.4 * Math.sin(t * .45) + t * .15;
      const x0 = rs * ct * s, z0 = rs * st * s;
      o.x = x0 * Math.cos(tw) - z0 * Math.sin(tw);
      o.z = x0 * Math.sin(tw) + z0 * Math.cos(tw);
      o.y = (v - .5) * 1.75;
    },
    /* 05 荣誉：六棱晶体 */
    crystal(u, v, t, o) {
      const ph = v * PI;
      const tw = ph * .5 * Math.sin(t * .5);
      const th = u * TAU + tw;
      const seg = PI / 3;
      const m = ((u * TAU) % seg + seg) % seg;
      const rh = Math.cos(seg / 2) / Math.cos(m - seg / 2);
      let r = .82 * Math.pow(Math.sin(ph), .7) * rh;
      r *= 1 + .035 * Math.sin(10 * ph - t * 3);
      o.x = r * Math.cos(th);
      o.z = r * Math.sin(th);
      o.y = Math.cos(ph) * (ph < PI * .38 ? .62 : 1.02);
    },
    /* 06 知识：从一极向外扩散的涟漪球 */
    ripple(u, v, t, o) {
      const th = u * TAU, ph = v * PI;
      const s = Math.sin(ph);
      const r = .84 * (1 + .09 * Math.sin(12 * ph - t * 2.2) * s + .04 * Math.sin(5 * th + t));
      o.x = r * s * Math.cos(th);
      o.z = r * s * Math.sin(th);
      o.y = r * Math.cos(ph);
    },
    /* 07 联系：缓慢翻转的莫比乌斯环 */
    mobius(u, v, t, o) {
      const th = u * TAU, s = (v - .5) * .78;
      const h = th / 2 + t * .3;
      const R = .74 + s * Math.cos(h);
      o.x = R * Math.cos(th);
      o.z = R * Math.sin(th);
      o.y = s * Math.sin(h) + .05 * Math.sin(3 * th - t);
    }
  };
  const SHAPE_FNS = Object.values(SHAPES);
  const SHAPE_ID = Object.fromEntries(Object.keys(SHAPES).map((k, i) => [k, i]));

  const CHAPTERS = [
    { sel: null, shape: 'bloom', no: '00', name: 'ORIGIN' },
    { sel: '#works', shape: 'tiers', no: '01', name: 'MEMORY POOL' },
    { sel: '#about', shape: 'twin', no: '02', name: 'TWO DIRECTIONS' },
    { sel: '#experience', shape: 'torus', no: '03', name: 'EVENT LOOP' },
    { sel: '#skills', shape: 'stack', no: '04', name: 'TOOLBOX' },
    { sel: '#honors', shape: 'crystal', no: '05', name: 'HONORS' },
    { sel: '#notes', shape: 'ripple', no: '06', name: 'KNOWLEDGE' },
    { sel: '#contact', shape: 'mobius', no: '07', name: 'CONNECT' }
  ];

  /* ================= 颜色：读站点主题变量，换主题时自动跟随 ================= */
  function rgbOf(c, fb) {
    c = (c || '').trim();
    if (c[0] === '#') {
      if (c.length === 4) c = '#' + [...c.slice(1)].map((x) => x + x).join('');
      const n = parseInt(c.slice(1, 7), 16);
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    const m = c.match(/[\d.]+/g);
    return m && m.length >= 3 ? m.slice(0, 3).map(Number) : fb;
  }
  let INK = [80, 99, 65], SIG = [200, 80, 45];
  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    INK = rgbOf(cs.getPropertyValue('--wire') || cs.getPropertyValue('--accent'), INK);
    SIG = rgbOf(cs.getPropertyValue('--signal') || cs.getPropertyValue('--accent'), INK);
  }

  /* ================= 线框渲染器 ================= */
  function Renderer(NU, NV, rowStep, colStep) {
    const W = NU + 1, H = NV + 1, N = W * H;
    const sx = new Float32Array(N), sy = new Float32Array(N), sz = new Float32Array(N);
    const pa = { x: 0, y: 0, z: 0 }, pb = { x: 0, y: 0, z: 0 }, pc = { x: 0, y: 0, z: 0 };
    const bins = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];

    function sample(state, u, v, t, out) {
      const { fa, fb, fw, to, m } = state;
      if (m >= 1) { SHAPE_FNS[to](u, v, t, out); return; }
      SHAPE_FNS[fa](u, v, t, out);
      if (fw > 0 && fb !== fa) {
        SHAPE_FNS[fb](u, v, t, pb);
        out.x = lerp(out.x, pb.x, fw); out.y = lerp(out.y, pb.y, fw); out.z = lerp(out.z, pb.z, fw);
      }
      if (m < 1 && to !== fa) {
        SHAPE_FNS[to](u, v, t, pc);
        const e = easeIO(m);
        out.x = lerp(out.x, pc.x, e); out.y = lerp(out.y, pc.y, e); out.z = lerp(out.z, pc.z, e);
      }
    }

    /* view: {cx, cy, R, yaw, pitch, alpha, lw, push:{x,y,s,rad}} */
    return function draw(ctx, state, t, view) {
      const cy0 = Math.cos(view.yaw), sy0 = Math.sin(view.yaw);
      const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
      const F = 3.4, push = view.push;
      for (let j = 0; j < H; j++) {
        const v = j / NV;
        for (let i = 0; i < W; i++) {
          sample(state, i / NU, v, t, pa);
          const x1 = pa.x * cy0 + pa.z * sy0;
          const z1 = -pa.x * sy0 + pa.z * cy0;
          const y2 = pa.y * cp - z1 * sp;
          const z2 = pa.y * sp + z1 * cp;
          const k = F / (F - z2);
          let X = view.cx + x1 * view.R * k, Y = view.cy - y2 * view.R * k;
          if (push && push.s > .01) {
            const dx = X - push.x, dy = Y - push.y, d = Math.hypot(dx, dy);
            if (d < push.rad && d > .001) {
              const f = Math.pow(1 - d / push.rad, 2) * push.s;
              X += dx / d * f; Y += dy / d * f;
            }
          }
          const n = j * W + i;
          sx[n] = X; sy[n] = Y; sz[n] = z2;
        }
      }
      for (let b = 0; b < 4; b++) bins[b] = new Path2D();
      const hot = push && push.s > 4 ? push.rad * .62 : 0;
      const seg = (a, c) => {
        const z = (sz[a] + sz[c]) * .5;
        let b = z < -.3 ? 0 : z < .3 ? 1 : 2;
        if (hot && Math.hypot((sx[a] + sx[c]) * .5 - push.x, (sy[a] + sy[c]) * .5 - push.y) < hot) b = 3;
        bins[b].moveTo(sx[a], sy[a]);
        bins[b].lineTo(sx[c], sy[c]);
      };
      for (let j = 0; j <= NV; j += rowStep) {
        const o = j * W;
        for (let i = 0; i < NU; i++) seg(o + i, o + i + 1);
      }
      for (let i = 0; i < NU; i += colStep) {
        for (let j = 0; j < NV; j++) seg(j * W + i, (j + 1) * W + i);
      }
      const A = [.16, .42, .92];
      ctx.lineWidth = view.lw;
      ctx.lineCap = 'round';
      for (let b = 0; b < 3; b++) {
        ctx.strokeStyle = `rgba(${INK[0]},${INK[1]},${INK[2]},${(A[b] * view.alpha).toFixed(3)})`;
        ctx.stroke(bins[b]);
      }
      if (hot) {
        ctx.strokeStyle = `rgba(${SIG[0]},${SIG[1]},${SIG[2]},${Math.min(1, .95 * view.alpha / .5).toFixed(3)})`;
        ctx.stroke(bins[3]);
      }
    };
  }

  /* ================= 主程序 ================= */
  function initWireframe() {
    const hero = document.querySelector('.evidence-hero');
    const heroCopy = document.querySelector('.evidence-hero-copy');
    if (!hero || !heroCopy) return;

    const stage = document.createElement('canvas');
    stage.className = 'wf-stage';
    stage.setAttribute('aria-hidden', 'true');
    document.body.prepend(stage);
    const sctx = stage.getContext('2d');

    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'wf-badge';
    badge.setAttribute('aria-label', '回到顶部');
    badge.innerHTML =
      '<canvas aria-hidden="true"></canvas>' +
      '<svg class="wf-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="wf-ring-track" cx="50" cy="50" r="49.3"/>' +
      '<circle class="wf-ring-bar" cx="50" cy="50" r="49.3" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>' +
      '<span class="wf-label" aria-hidden="true"><b>00</b>ORIGIN</span>';
    document.body.appendChild(badge);
    const bcan = badge.querySelector('canvas');
    const bctx = bcan.getContext('2d');
    const ringBar = badge.querySelector('.wf-ring-bar');
    const label = badge.querySelector('.wf-label');

    const heroR = Renderer(110, 56, 2, 3);
    const badgeR = Renderer(64, 32, 2, 3);

    const chapters = CHAPTERS.map((c) => ({ ...c, el: c.sel ? document.querySelector(c.sel) : null, id: SHAPE_ID[c.shape] }));
    const morph = { fa: 0, fb: 0, fw: 0, to: 0, m: 1 };
    let chapterIdx = 0;

    function retarget(id) {
      if (id === morph.to) return;
      if (still) { morph.fa = morph.fb = morph.to = id; morph.fw = 0; morph.m = 1; return; }
      if (morph.m >= 1) { morph.fa = morph.fb = morph.to; morph.fw = 0; }
      else if (morph.fw === 0 || morph.fa === morph.fb) { morph.fb = morph.to; morph.fw = easeIO(morph.m); }
      else { const e = easeIO(morph.m); morph.fa = morph.fb = e > .5 ? morph.to : (morph.fw > .5 ? morph.fb : morph.fa); morph.fw = 0; }
      morph.to = id; morph.m = 0;
    }

    /* ---- 布局 ---- */
    let DPR = 1, VW = 0, VH = 0, BS = 124;
    let heroDoc = { cx: 0, cy: 0, R: 200, end: 600 };
    let bold = false;
    const stageK = { k1: 0, k2: 0, k3: 0, cx: 0, cy: 0, R: 0 };
    function layout() {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      VW = document.documentElement.clientWidth; VH = window.innerHeight;
      stage.width = Math.round(VW * DPR); stage.height = Math.round(VH * DPR);
      stage.style.width = VW + 'px'; stage.style.height = VH + 'px';
      BS = badge.getBoundingClientRect().width || (VW <= 760 ? 88 : 124);
      bcan.width = Math.round(BS * DPR); bcan.height = Math.round(BS * DPR);
      const sy = window.scrollY;
      const hr = hero.getBoundingClientRect(), cr = heroCopy.getBoundingClientRect();
      const narrow = VW <= 900;
      if (narrow) {
        heroDoc.cx = cr.left + cr.width * .74;
        heroDoc.cy = cr.top + sy + Math.min(cr.height * .32, 240);
        heroDoc.R = Math.min(VW * .36, 210);
      } else {
        heroDoc.cx = cr.left + cr.width * .8;
        heroDoc.cy = hr.top + sy + hr.height * .47;
        heroDoc.R = Math.min(hr.height * .42, cr.width * .36, 280);
      }
      heroDoc.end = Math.max(360, hr.bottom + sy - VH * .12);
      /* 大胆模式：线框体先停在屏幕右侧陪读开场三句，到作品区才缩成徽章 */
      const pro = document.querySelector('.mx-prologue'), works = document.getElementById('works');
      bold = document.documentElement.dataset.bold === 'on' && !!pro && pro.offsetHeight > 0 && !!works;
      if (bold) {
        const proTop = pro.getBoundingClientRect().top + sy, worksTop = works.getBoundingClientRect().top + sy;
        stageK.k1 = Math.max(heroDoc.end * .6, proTop - VH * .35);
        stageK.k3 = Math.max(stageK.k1 + 200, worksTop - VH * .2);
        stageK.k2 = Math.max(stageK.k1 + 100, stageK.k3 - VH * .6);
        stageK.cx = narrow ? VW * .62 : VW * .73;
        stageK.cy = VH * .5;
        stageK.R = narrow ? Math.min(VW * .4, 220) : Math.min(VH * .34, VW * .24, 300);
      }
      onScroll();
    }

    /* ---- 滚动：进度、章节、阅读进度环、滚动能量 ---- */
    let p = 0, lastY = window.scrollY, energy = 0;
    function onScroll() {
      const y = window.scrollY;
      energy = Math.min(2.2, energy + Math.abs(y - lastY) * .004);
      lastY = y;
      if (bold) p = y < stageK.k2 ? .4 * clamp(y / stageK.k2, 0, 1) : .4 + .6 * clamp((y - stageK.k2) / (stageK.k3 - stageK.k2), 0, 1);
      else p = clamp(y / heroDoc.end, 0, 1);
      badge.classList.toggle('is-on', p > .9);
      const max = document.documentElement.scrollHeight - VH;
      ringBar.style.strokeDashoffset = String(1 - clamp(max > 0 ? y / max : 0, 0, 1));
      const line = VH * .42;
      let idx = 0;
      chapters.forEach((c, i) => { if (c.el && c.el.getBoundingClientRect().top < line) idx = i; });
      if (idx !== chapterIdx) {
        chapterIdx = idx;
        retarget(chapters[idx].id);
        label.innerHTML = `<b>${chapters[idx].no}</b>${chapters[idx].name}`;
        if (p > .9 && !still) {
          label.classList.add('is-flash');
          clearTimeout(label._t);
          label._t = setTimeout(() => label.classList.remove('is-flash'), 1800);
        }
      }
      if (still) requestDraw();
    }

    /* ---- 指针：首屏倾斜与推开线条 ---- */
    const ptr = { x: -9999, y: -9999, act: 0, tx: 0, ty: 0 };
    let fine = matchMedia('(pointer: fine)').matches;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.act = 1;
      ptr.tx = (e.clientX / VW - .5); ptr.ty = (e.clientY / VH - .5);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { ptr.act = 0; });
    hero.addEventListener('click', (e) => {
      if (e.target.closest('a, button, [data-hover-card]')) return;
      energy = Math.min(2.6, energy + 1.6);
    });

    /* ---- 徽章：拖动旋转，点击回顶部 ---- */
    let spin = 0, drag = null, dragged = false;
    badge.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now() };
      dragged = false;
      badge.setPointerCapture(e.pointerId);
    });
    badge.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
      if (!dragged && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) { dragged = true; badge.classList.add('is-dragging'); }
      if (dragged) {
        rot.yaw += dx * .018; rot.pitchOff = clamp(rot.pitchOff + dy * .012, -.9, .9);
        spin = dx * .9;
        if (still) requestDraw();
      }
      drag.lx = e.clientX; drag.ly = e.clientY;
    });
    const endDrag = () => { drag = null; badge.classList.remove('is-dragging'); };
    badge.addEventListener('pointerup', endDrag);
    badge.addEventListener('pointercancel', endDrag);
    badge.addEventListener('click', (e) => {
      if (dragged) { e.preventDefault(); dragged = false; return; }
      window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
    });

    /* ---- 旋转状态（首屏和徽章共用，过渡时形状连续） ---- */
    const rot = { yaw: .4, pitch: .42, pitchOff: 0, tiltX: 0, tiltY: 0 };
    let push = { x: 0, y: 0, s: 0, rad: 150 };

    /* ---- 每帧 ---- */
    let T = 0, last = performance.now(), raf = 0;
    function frame(now) {
      raf = 0;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      energy *= Math.pow(.25, dt);
      T += dt * (1 + energy * 1.4);
      if (morph.m < 1) morph.m = Math.min(1, morph.m + dt / 1.5);
      spin *= Math.pow(.08, dt);
      rot.yaw += dt * (.16 + energy * .35) + spin * dt;
      rot.pitchOff *= Math.pow(.5, dt);
      const heroOn = p < .6 && fine;
      rot.tiltX = lerp(rot.tiltX, heroOn && ptr.act ? ptr.tx * .7 : 0, 1 - Math.pow(.02, dt));
      rot.tiltY = lerp(rot.tiltY, heroOn && ptr.act ? ptr.ty * .5 : 0, 1 - Math.pow(.02, dt));
      render();
      schedule();
    }
    function schedule() {
      if (!raf && !document.hidden && !still) raf = requestAnimationFrame(frame);
    }

    let drawQueued = false;
    function requestDraw() {
      if (drawQueued) return;
      drawQueued = true;
      requestAnimationFrame(() => { drawQueued = false; render(); });
    }

    function render() {
      const e = smooth(p);
      const y = window.scrollY;
      const bx = VW - (VW <= 760 ? 14 : 22) - BS / 2, by = VH - (VW <= 760 ? 14 : 22) - BS / 2;
      const yaw = rot.yaw + rot.tiltX;
      const pitch = rot.pitch + rot.pitchOff + rot.tiltY;

      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, stage.width, stage.height);
      if (p < 1) {
        const hx = heroDoc.cx, hy = heroDoc.cy - y;
        let cx = lerp(hx, bx, e), cy = lerp(hy, by, e);
        let R = lerp(heroDoc.R, BS * .34, e);
        let alpha = (VW <= 760 ? .36 : .5) * (1 - smooth((p - .62) / .33));
        if (bold) {
          const K = stageK;
          if (y <= K.k1) {
            const t = smooth(y / K.k1);
            cx = lerp(hx, K.cx, t); cy = lerp(hy, K.cy, t); R = lerp(heroDoc.R, K.R, t);
          } else if (y <= K.k2) {
            cx = K.cx; cy = K.cy; R = K.R;
          } else {
            const t = smooth((y - K.k2) / (K.k3 - K.k2));
            cx = lerp(K.cx, bx, t); cy = lerp(K.cy, by, t); R = lerp(K.R, BS * .34, t);
          }
          alpha = (VW <= 760 ? .42 : .58) * (1 - smooth((p - .82) / .16));
        }
        const near = ptr.act && p < .5 ? 1 : 0;
        push.s = lerp(push.s, near * 30, .12);
        push.x = ptr.x; push.y = ptr.y; push.rad = 160;
        if (alpha > .005) {
          sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          heroR(sctx, morph, T, { cx, cy, R, yaw, pitch, alpha, lw: .8, push });
        }
      }
      if (p > .86) {
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        bctx.clearRect(0, 0, bcan.width, bcan.height);
        bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        badgeR(bctx, morph, T, { cx: BS / 2, cy: BS / 2, R: BS * .34, yaw, pitch, alpha: 1, lw: .75, push: null });
      }
    }

    readTheme();
    layout();
    window.addEventListener('scroll', onScroll, { passive: true });
    let rz = 0;
    window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); });
    document.addEventListener('visibilitychange', () => { last = performance.now(); schedule(); });
    window.addEventListener('load', layout);
    RM.addEventListener('change', () => { still = RM.matches; morph.m = 1; if (still) requestDraw(); else { last = performance.now(); schedule(); } });
    matchMedia('(pointer: fine)').addEventListener('change', (m) => { fine = m.matches; });
    new MutationObserver(() => { readTheme(); if (still) requestDraw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-palette'] });
    if (still) requestDraw(); else schedule();
  }

  /* ================= 标题逐字浮现 ================= */
  function splitTitle() {
    const h1 = document.querySelector('.evidence-hero h1');
    if (!h1 || still) return null;
    h1.setAttribute('aria-label', h1.textContent.trim());
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...n.textContent].forEach((ch) => {
            const s = document.createElement('span');
            s.setAttribute('aria-hidden', 'true');
            if (ch === ' ') { s.className = 'mx-sp'; s.textContent = ' '; }
            else { s.className = 'mx-ch'; s.style.setProperty('--i', i++); s.textContent = ch; }
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(h1);
    h1.classList.add('mx-split');
    return h1;
  }

  /* ================= 首屏依次进入 ================= */
  function heroRise() {
    if (still) return;
    const list = [
      ['.hero-eyebrow', 0], ['.evidence-hero-intro', 520], ['.hero-actions', 620],
      ['.hero-result-panel', 300], ['.hero-mini-panel', 420, 90], ['.hero-proof-strip > *', 720, 80]
    ];
    const els = [];
    list.forEach(([sel, d, step = 0]) => document.querySelectorAll(sel).forEach((el, k) => {
      el.classList.add('mx-rise'); el.style.setProperty('--d', d + k * step + 'ms'); els.push(el);
    }));
    /* 进入动画结束后去掉类名，把 transition 还给站点自己的悬停效果 */
    setTimeout(() => els.forEach((el) => { el.classList.remove('mx-rise'); el.style.removeProperty('--d'); }), 2200);
  }

  /* ================= 数字计数 ================= */
  function countUp() {
    if (still) return;
    const targets = [...document.querySelectorAll('.hero-result-value strong, .hero-proof-strip strong, .academic-numbers strong')]
      .filter((el) => /^\d+(\.\d+)?$/.test(el.textContent.trim()));
    const run = (el, delay) => {
      const txt = el.textContent.trim(), to = parseFloat(txt), dec = (txt.split('.')[1] || '').length;
      el.classList.add('mx-count');
      el.textContent = (0).toFixed(dec);
      setTimeout(() => {
        const t0 = performance.now(), dur = 1400;
        const step = (now) => {
          const k = easeOutExpo(Math.min(1, (now - t0) / dur));
          el.textContent = (to * k).toFixed(dec);
          if (k < 1) requestAnimationFrame(step); else el.textContent = txt;
        };
        requestAnimationFrame(step);
      }, delay);
    };
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      run(en.target, en.target.closest('.evidence-hero') ? 650 : 120);
    }), { threshold: .6 });
    targets.forEach((el) => io.observe(el));
  }

  /* ================= 深色卡柔光 + 按钮磁吸 ================= */
  function pointerFx() {
    if (still || !matchMedia('(pointer: fine)').matches) return;
    const panel = document.querySelector('.hero-result-panel');
    if (panel) {
      panel.classList.add('mx-glow');
      panel.addEventListener('pointermove', (e) => {
        const r = panel.getBoundingClientRect();
        panel.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        panel.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    }
    const mags = [...document.querySelectorAll('.hero-button')];
    mags.forEach((b) => b.classList.add('mx-magnet'));
    window.addEventListener('pointermove', (e) => {
      mags.forEach((b) => {
        const r = b.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const near = Math.abs(dx) < r.width / 2 + 40 && Math.abs(dy) < r.height / 2 + 30;
        b.classList.toggle('is-near', near);
        b.style.translate = near ? `${(dx * .18).toFixed(1)}px ${(dy * .28).toFixed(1)}px` : '';
      });
    }, { passive: true });
  }

  function boot() {
    const h1 = splitTitle();
    heroRise();
    initWireframe();
    countUp();
    pointerFx();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.classList.add('mx-ready');
      h1 && h1.classList.add('is-in');
    }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
