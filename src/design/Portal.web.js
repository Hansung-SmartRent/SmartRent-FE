// 웹 전용: 시트와 스캐너를 브라우저 전체가 아니라 휴대폰 화면 상자 안에 띄우고,
// 안내창은 AppAlert.js가 휴대폰·웹 공통으로 그린다.
import React from 'react';
import { createPortal } from 'react-dom';
import { Modal, View } from 'react-native';

export const MODAL_HOST_ID = 'phone-screen-modal';

export function AppModal({ visible, children, onRequestClose, ...rest }) {
  const host = typeof document !== 'undefined' ? document.getElementById(MODAL_HOST_ID) : null;
  if (!host) return <Modal visible={visible} onRequestClose={onRequestClose} {...rest}>{children}</Modal>;
  if (!visible) return null;
  return createPortal(<View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>{children}</View>, host);
}

if (typeof window !== 'undefined') {
  // 마우스로 화면을 잡고 끌어도 휴대폰처럼 스크롤되게 한다(세로 목록, 가로 카드 줄 모두).
  if (!window.__dragScroll) {
    window.__dragScroll = true;
    const scrollable = (el, axis) => {
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        const st = getComputedStyle(n);
        if (axis === 'y' && /(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 1) return n;
        if (axis === 'x' && /(auto|scroll)/.test(st.overflowX) && n.scrollWidth > n.clientWidth + 1) return n;
      }
      return null;
    };
    const maxOf = (el, axis) => axis === 'y' ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
    const dimOf = (el, axis) => axis === 'y' ? el.clientHeight : el.clientWidth;
    const getPos = (el, axis) => axis === 'y' ? el.scrollTop : el.scrollLeft;
    const setPos = (el, axis, v) => { if (axis === 'y') el.scrollTop = v; else el.scrollLeft = v; };
    // 끝을 넘어 끌면 내용이 고무줄처럼 덜 따라오게 한다(iOS와 같은 공식).
    const rubber = (over, dim) => Math.sign(over) * (1 - 1 / (Math.abs(over) * 0.55 / dim + 1)) * dim;
    const shift = (el, axis, px, ms, ease) => {
      const inner = el.firstElementChild; if (!inner) return;
      inner.style.transition = ms ? `transform ${ms}ms ${ease || 'cubic-bezier(0.25, 1, 0.5, 1)'}` : 'none';
      inner.style.transform = px ? (axis === 'y' ? `translateY(${px}px)` : `translateX(${px}px)`) : '';
    };
    const springBack = (el, axis) => shift(el, axis, 0, 450);
    // 미끄러지다 끝에 부딪히면 남은 속도만큼 살짝 더 나갔다가 돌아온다.
    const bounce = (el, axis, v) => {
      const px = Math.sign(v) * Math.min(Math.abs(v) * 60, dimOf(el, axis) * 0.12);
      shift(el, axis, px, 140, 'cubic-bezier(0.2, 0.8, 0.4, 1)');
      setTimeout(() => springBack(el, axis), 140);
    };
    let drag = null, glide = 0;
    const stopGlide = () => { if (glide) cancelAnimationFrame(glide); glide = 0; };
    // 손을 뗀 뒤 끌던 속도로 미끄러지다 서서히 멈춘다.
    const startGlide = (el, axis, v) => {
      let last = performance.now();
      const step = now => {
        const dt = now - last; last = now; v *= Math.pow(0.996, dt);
        if (Math.abs(v) < 0.02) { glide = 0; return; }
        const next = getPos(el, axis) - v * dt, max = maxOf(el, axis);
        if (next <= 0 || next >= max) { setPos(el, axis, next <= 0 ? 0 : max); glide = 0; bounce(el, axis, v); return; }
        setPos(el, axis, next);
        glide = requestAnimationFrame(step);
      };
      glide = requestAnimationFrame(step);
    };
    // 휠·트랙패드로 끝에서 더 밀면 살짝 끌려갔다가 돌아온다.
    let wheelEl = null, wheelOver = 0, wheelTimer = 0;
    window.addEventListener('wheel', e => {
      stopGlide();
      const axis = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? 'y' : 'x', d = axis === 'y' ? e.deltaY : e.deltaX;
      const el = scrollable(e.target, axis); if (!el) return;
      const pos = getPos(el, axis), max = maxOf(el, axis);
      if ((pos <= 0 && d < 0) || (pos >= max - 1 && d > 0)) {
        if (wheelEl !== el) { wheelEl = el; wheelOver = 0; }
        // 트랙패드 관성으로 휠 값이 계속 들어와도 조금(최대 화면의 6%)만 밀리고 바로 돌아오게 한다
        wheelOver += -d; const cap = dimOf(el, axis) * 0.06;
        shift(el, axis, Math.max(-cap, Math.min(cap, rubber(wheelOver, dimOf(el, axis)) * 0.25)), 0);
        clearTimeout(wheelTimer); wheelTimer = setTimeout(() => { springBack(el, axis); wheelOver = 0; wheelEl = null; }, 60);
      }
    }, true);
    window.addEventListener('mousedown', e => {
      stopGlide();
      if (e.button !== 0 || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { drag = null; return; }
      drag = { x: e.clientX, y: e.clientY, target: e.target, axis: null, el: null, moved: false, samples: [], over: 0 };
    }, true);
    window.addEventListener('mousemove', e => {
      if (!drag) return;
      // 프레임 밖에서 손을 떼 mouseup을 못 받았으면 여기서 끝냄
      if (!(e.buttons & 1)) { endDrag(false); return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
        drag.axis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x';
        drag.el = scrollable(drag.target, drag.axis);
        if (drag.el) drag.start = getPos(drag.el, drag.axis);
      }
      // 스크롤 영역이 없으면(예: 탭 좌우 넘기기) 탭 부품이 직접 처리하게 두고, 손 뗄 때 클릭만 막는다.
      if (!drag.el) { drag.moved = true; return; }
      const want = drag.start - (drag.axis === 'y' ? dy : dx), max = maxOf(drag.el, drag.axis);
      const clamped = Math.min(Math.max(want, 0), max);
      setPos(drag.el, drag.axis, clamped);
      drag.over = want - clamped;
      // 끝을 넘어 끌어도 화면의 12%까지만 밀림
      const cap = dimOf(drag.el, drag.axis) * 0.12;
      shift(drag.el, drag.axis, drag.over ? -Math.max(-cap, Math.min(cap, rubber(drag.over, dimOf(drag.el, drag.axis)) * 0.4)) : 0, 0);
      drag.samples.push({ t: performance.now(), p: drag.axis === 'y' ? e.clientY : e.clientX }); if (drag.samples.length > 8) drag.samples.shift();
      drag.moved = true; e.preventDefault(); e.stopPropagation();
    }, true);
    const endDrag = (blockClick) => {
      if (drag?.moved) {
        if (drag.el && drag.over) springBack(drag.el, drag.axis);
        else if (drag.el) {
          const now = performance.now(), recent = drag.samples.filter(x => now - x.t < 100);
          if (recent.length > 1) { const a = recent[0], b = recent[recent.length - 1]; const v = (b.p - a.p) / Math.max(1, b.t - a.t); if (Math.abs(v) > 0.1) startGlide(drag.el, drag.axis, v); }
        }
        if (blockClick) {
          const block = ev => { ev.stopPropagation(); ev.preventDefault(); window.removeEventListener('click', block, true); };
          window.addEventListener('click', block, true);
          setTimeout(() => window.removeEventListener('click', block, true), 50);
        }
      }
      drag = null;
    };
    window.addEventListener('mouseup', () => endDrag(true), true);
    // 끌다가 마우스가 화면(프레임) 밖으로 나가거나 창이 포커스를 잃으면 바로 제자리로
    document.documentElement.addEventListener('mouseleave', () => endDrag(false));
    window.addEventListener('blur', () => endDrag(false));
  }
  if (!document.getElementById('phone-frame-style')) {
    const style = document.createElement('style');
    style.id = 'phone-frame-style';
    style.textContent = '*::-webkit-scrollbar{display:none} *{scrollbar-width:none} body{user-select:none;-webkit-user-select:none;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale} input,textarea{user-select:text;-webkit-user-select:text;outline:none} *:focus:not(:focus-visible){outline:none}';
    document.head.appendChild(style);
  }
}
