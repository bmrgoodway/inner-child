// 내면 아이 진단 프로그램 · GOODWAY APPS
// 로그인 없이 바로 쓰는 진단 앱. 응답·메모는 이 브라우저(localStorage)에만 저장합니다.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './style.css';
import { local } from './store.js';
import {
  AREAS, TOTAL_QUESTIONS, HOWTO, GROUP_RULES, BAND_LABELS, SOURCE,
  bandIndex, bandRange,
} from './data.js';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

/* ---------------------------------------------------------------- 상태 */

const EMPTY = () => ({ v: 1, answers: {}, memos: {}, updatedAt: null });
let state = loadState();

function loadState() {
  const raw = local.get('state', null);
  if (!raw || typeof raw !== 'object') return EMPTY();
  const s = EMPTY();
  if (raw.answers && typeof raw.answers === 'object') {
    for (const [k, v] of Object.entries(raw.answers)) {
      if (!v || typeof v !== 'object') continue;
      s.answers[k] = { ...v };
    }
  }
  if (raw.memos && typeof raw.memos === 'object') {
    for (const [k, v] of Object.entries(raw.memos)) {
      if (!v || typeof v !== 'object') continue;
      s.memos[k] = { ...v };
    }
  }
  s.updatedAt = raw.updatedAt || null;
  return s;
}

function save() {
  state.updatedAt = new Date().toISOString();
  local.set('state', state);
  paintSaveNote();
}

function paintSaveNote() {
  const el = document.querySelector('[data-save-note]');
  if (!el) return;
  const t = state.updatedAt ? new Date(state.updatedAt) : null;
  el.textContent = t
    ? `이 브라우저에 자동 저장됨 · ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
    : '이 브라우저에만 저장됩니다';
}

function ansOf(area, qi) {
  const a = state.answers[area.no];
  return a ? a[qi] : undefined;
}

function isAnswered(area, qi) {
  const v = ansOf(area, qi);
  return v === 0 || v === 1;
}

function yesCount(area) {
  const a = state.answers[area.no] || {};
  return area.questions.reduce((n, _, i) => n + (a[i] === 1 ? 1 : 0), 0);
}

function answeredCount(area) {
  const a = state.answers[area.no] || {};
  return area.questions.reduce((n, _, i) => n + (a[i] === 0 || a[i] === 1 ? 1 : 0), 0);
}

function isDone(area) {
  return answeredCount(area) === area.questions.length;
}

function doneAreas() {
  return AREAS.filter(isDone);
}

function overallAnswered() {
  return AREAS.reduce((n, a) => n + answeredCount(a), 0);
}

function memoOf(area) {
  const m = state.memos[area.no] || {};
  return { memory: m.memory || '', when: m.when || '', reaction: m.reaction || '', predict: m.predict || '' };
}

/* ---------------------------------------------------------------- 도우미 */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const toneClass = (area) => `t-${area.tone}`;

function paintWidths() {
  document.querySelectorAll('[data-w]').forEach((el) => { el.style.width = `${el.dataset.w}%`; });
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toastEl.hidden = true; }, 2400);
}

function fmtDate(d = new Date()) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function bandInfo(area, yes) {
  const i = bandIndex(area, yes);
  return { i, label: BAND_LABELS[i], range: bandRange(area, i) };
}

function progressHTML(done, total, extraClass = '') {
  return `<div class="progress ${extraClass}" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i data-w="${pct(done, total)}"></i></div>`;
}

/* ---------------------------------------------------------------- 화면 */

function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const m = hash.match(/^\/area\/(\d+)/);
  let view = 'home';
  if (m) {
    const no = Number(m[1]);
    if (AREAS.some((a) => a.no === no)) view = `area:${no}`;
    else { location.hash = '#/'; return; }
  } else if (/^\/result/.test(hash)) {
    view = 'result';
  }

  document.querySelectorAll('.nav-item').forEach((el) => {
    const k = el.dataset.nav;
    el.classList.toggle('on', (view === 'result' && k === 'result') || (view !== 'result' && k === 'home'));
    if (el.classList.contains('on')) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  });

  app.classList.toggle('narrow', view.startsWith('area:'));

  if (view === 'home') renderHome();
  else if (view === 'result') renderResult();
  else renderArea(Number(view.split(':')[1]));

  window.scrollTo(0, 0);
  paintWidths();
  paintSaveNote();
}

/* ---------------------------------------------------------------- 홈 */

function renderHome() {
  const done = overallAnswered();
  const doneList = doneAreas().length;
  const total = TOTAL_QUESTIONS;
  const resumed = AREAS.find((a) => answeredCount(a) > 0 && !isDone(a)) || AREAS.find((a) => !isDone(a));

  app.innerHTML = `
    <div class="stack">
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">INNER CHILD WORKBOOK</span>
          <h1>내면 아이 진단 프로그램<span>8가지 내면아이를 만나 봅니다</span></h1>
          <p class="lead">칭찬과 인정이 인색했던 양육, 강압, 유약, 과보호, 병약, 방치, 거절, 학대… 어린 시절의 경험이 만든 내면아이를 체크리스트로 진단하고, 마지막에 <b>내면아이 종합 정리</b>로 한 번에 봅니다.</p>
          <p class="lead fs-135"><b>로그인 없이</b> 바로 시작합니다. 응답과 메모는 서버로 보내지 않고 <b>이 브라우저에만</b> 저장되어 새로고침해도 그대로 남습니다.</p>
          <div class="btn-row">
            <a class="btn primary lg" href="#/area/${resumed ? resumed.no : 1}" data-act="start">${done > 0 ? '이어서 진단하기' : '진단 시작하기'}</a>
            <a class="btn lg" href="#/result">종합 정리 보기</a>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          ${AREAS.map((a, i) => `<div class="g${i + 1}"><span><b>${a.no}</b><small>${esc(a.name)}</small></span></div>`).join('')}
        </div>
      </section>

      <div class="statbar">
        <div class="stat"><b>${done} / ${total}</b><small>전체 문항 응답</small></div>
        <div class="stat"><b>${doneList} / 8</b><small>완료한 영역</small></div>
        <div class="stat"><b>${AREAS.reduce((n, a) => n + (isDone(a) ? yesCount(a) : 0), 0)}</b><small>완료 영역의 ‘예’ 합계</small></div>
        <div class="stat"><b data-save-state>${state.updatedAt ? '저장됨' : '아직 없음'}</b><small data-save-note>이 브라우저에만 저장됩니다</small></div>
      </div>

      ${progressHTML(done, total)}

      <section class="howto">
        <h3><span aria-hidden="true">✳</span> 내면 진단 방법</h3>
        <p class="fw-850 mb6">${esc(HOWTO.head)}</p>
        <ul>
          ${HOWTO.lines.map((l) => `<li>${esc(l).replace(/‘예’/g, '<span class="em">‘예’</span>')}</li>`).join('')}
        </ul>
        <p class="muted fs-125 mt8">문항은 모두 ${total}개입니다. 영역마다 다 답하면 그 자리에서 점수와 특징을 볼 수 있습니다.</p>
      </section>

      <section>
        <div class="section-head">
          <h2>8가지 내면아이</h2>
          <p>번호를 누르면 그 영역으로 바로 갑니다. 완료한 영역은 점수가 보입니다.</p>
        </div>
        <div class="areas">
          ${AREAS.map(areaCardHTML).join('')}
        </div>
      </section>

      <div class="btn-row between">
        <a class="btn dark" href="#/area/1">처음부터 순서대로 진단하기 →</a>
        <a class="btn" href="#/result">내면 아이 종합 정리 보기</a>
      </div>

      <details class="fold">
        <summary>모둠으로 나눌 때 지킬 약속 (PDF 6쪽)</summary>
        <div class="fold-body">
          <ol class="clean-list">
            ${GROUP_RULES.map((r) => `<li class="fs-135">${esc(r)}</li>`).join('')}
          </ol>
        </div>
      </details>

      <details class="fold">
        <summary>이 프로그램의 출처와 쓰임</summary>
        <div class="fold-body">
          <p class="fs-135">${esc(SOURCE.title)} — ${esc(SOURCE.author)} (${SOURCE.pages}쪽). ${esc(SOURCE.note)}</p>
          <p class="fs-135 mt6">이 앱은 그 워크북의 8가지 체크리스트와 ‘내면아이 종합 정리표’를 옮겨 만든 것입니다. 문항과 점수 구간은 원문 그대로이고, 원문 표의 ‘성향(예측)’ 칸은 참가자가 직접 적는 빈칸이라 앱에서는 구간 이름(거의 없음 ~ 매우 강함)만 붙였습니다.</p>
        </div>
      </details>
    </div>
  `;
}

function areaCardHTML(area) {
  const n = answeredCount(area);
  const all = area.questions.length;
  const done = n === all;
  const yes = yesCount(area);
  const band = done ? bandInfo(area, yes) : null;
  return `
    <a class="area-card ${done ? 'done' : ''}" href="#/area/${area.no}">
      <span class="num ${toneClass(area)}">${area.no}</span>
      <h3>${esc(area.name)}</h3>
      <p class="sub">${esc(area.sub)}</p>
      <div class="meta">
        <span>${done ? `완료 · ${all}문항` : `응답 ${n}/${all}`}</span>
        <span class="go">${done ? '다시 보기 →' : n ? '이어서 →' : '시작 →'}</span>
      </div>
      ${progressHTML(n, all)}
      ${done ? `<p class="scoreline">‘예’ <b>${yes}</b> / ${all} · ${esc(band.label)}</p>` : `<p class="scoreline muted fs-125">${all - n}문항 남음</p>`}
    </a>`;
}

/* ---------------------------------------------------------------- 영역 */

let cursor = -1; // -1 = 아직 안 한 문항부터 자동
let reviewMode = false;

function renderArea(no) {
  const area = AREAS.find((a) => a.no === no);
  const all = area.questions.length;
  const n = answeredCount(area);

  if (n === all && !reviewMode) return renderAreaResult(area);
  if (reviewMode) return renderAreaReview(area);

  const firstUnanswered = area.questions.findIndex((_, i) => !isAnswered(area, i));
  let qi = cursor;
  if (qi < 0 || qi >= all) qi = firstUnanswered === -1 ? 0 : firstUnanswered;
  const q = area.questions[qi];
  const v = ansOf(area, qi);

  app.innerHTML = `
    <div class="stack">
      ${areaHeadHTML(area, n, all, false)}
      <section class="quiz" aria-labelledby="qtext">
        <div class="quiz-top">
          <span class="qcount">문항 ${qi + 1} / ${all}</span>
          <span class="tag ${toneClass(area)}">${esc(area.name)} · ${esc(area.sub)}</span>
        </div>
        <div class="quiz-body">
          <p class="qtext" id="qtext">${esc(q)}</p>
          <p class="qhint">문항을 읽고 잠시 느껴지는 감정을 만져 보세요. 어느 쪽인지 잘 모를 정도로 애매하면 ‘예’로 답합니다.</p>
          <div class="answers">
            <button type="button" class="ans yes" data-act="answer" data-area="${area.no}" data-q="${qi}" data-val="1" aria-pressed="${v === 1}">예</button>
            <button type="button" class="ans no" data-act="answer" data-area="${area.no}" data-q="${qi}" data-val="0" aria-pressed="${v === 0}">아니오</button>
          </div>
        </div>
        <div class="quiz-foot">
          <div class="dots" aria-label="문항 바로 가기">
            ${area.questions.map((_, i) => {
              const val = ansOf(area, i);
              const cls = val === 1 ? 'y' : val === 0 ? 'n' : '';
              return `<button type="button" class="dot ${cls} ${i === qi ? 'now' : ''}" data-act="goto" data-area="${area.no}" data-q="${i}" aria-label="${i + 1}번 문항" ${i === qi ? 'aria-current="true"' : ''}>${i + 1}</button>`;
            }).join('')}
          </div>
          <div class="btn-row gap6">
            <button type="button" class="btn sm ghost" data-act="prev" ${qi === 0 ? 'disabled' : ''}>← 이전</button>
            <button type="button" class="btn sm ghost" data-act="next" ${qi === all - 1 ? 'disabled' : ''}>다음 →</button>
          </div>
        </div>
      </section>
      <div class="btn-row between">
        <a class="btn ghost sm" href="#/">← 8가지 내면아이</a>
        <a class="btn ghost sm" href="#/result">종합 정리 보기 →</a>
      </div>
      <p class="muted fs-12" data-save-note>이 브라우저에만 저장됩니다</p>
    </div>`;
}

function areaHeadHTML(area, n, all, done) {
  return `
    <div class="area-head">
      <div class="crumb"><a href="#/">8가지 내면아이</a> <span aria-hidden="true">/</span> <span>${area.no}. ${esc(area.name)}</span></div>
      <div class="split">
        <div>
          <h1 class="page-h1">${area.no}. ${esc(area.name)}</h1>
          <p class="muted fw-750 fs-14">${esc(area.sub)}</p>
        </div>
        <span class="tag ${done ? 't-green' : toneClass(area)}">${done ? `완료 · ‘예’ ${yesCount(area)}/${all}` : `${n}/${all} 응답`}</span>
      </div>
      ${progressHTML(n, all)}
      <nav class="tabs" aria-label="영역 이동">
        ${AREAS.map((a) => `
          <a class="tab ${a.no === area.no ? 'on' : ''} ${isDone(a) ? 'done' : ''}" href="#/area/${a.no}" ${a.no === area.no ? 'aria-current="page"' : ''}>
            <i aria-hidden="true"></i><span>${a.no}. ${esc(a.name)}</span>
            <span class="p">${isDone(a) ? `예 ${yesCount(a)}/${a.questions.length}` : `${answeredCount(a)}/${a.questions.length}`}</span>
          </a>`).join('')}
      </nav>
    </div>`;
}

function renderAreaReview(area) {
  const all = area.questions.length;
  const yes = yesCount(area);
  const band = bandInfo(area, yes);
  app.innerHTML = `
    <div class="stack">
      ${areaHeadHTML(area, all, all, true)}
      <div class="btn-row no-print">
        <button type="button" class="btn sm" data-act="quiz" data-area="${area.no}">한 문항씩 보기</button>
        <a class="btn sm primary" href="#/result">종합 정리 보기 →</a>
      </div>
      <section class="card">
        <div class="card-pad pad-head">
          <div><span class="eyebrow muted">‘예’ 개수</span><p class="fs-28">${yes} <small class="fs-14 fw-800">/ ${all}</small></p></div>
          <div class="ml-auto"><span class="tag t-green">${esc(band.label)}</span> <span class="muted fs-125">${esc(band.range)} 구간</span></div>
        </div>
        <ol class="review-list flat">
          ${area.questions.map((q, i) => {
            const v = ansOf(area, i);
            return `<li>
              <span class="qn">${i + 1}</span>
              <span class="qt">${esc(q)}</span>
              <span class="mini-ans">
                <button type="button" class="y" data-act="answer" data-area="${area.no}" data-q="${i}" data-val="1" aria-pressed="${v === 1}">예</button>
                <button type="button" class="n" data-act="answer" data-area="${area.no}" data-q="${i}" data-val="0" aria-pressed="${v === 0}">아니오</button>
              </span>
            </li>`;
          }).join('')}
        </ol>
      </section>
      <p class="muted fs-12" data-save-note>이 브라우저에만 저장됩니다</p>
    </div>`;
}

function defHTML(cls, title, items) {
  if (!items || !items.length) return '';
  return `<div class="def ${cls}"><h4>${esc(title)}</h4><ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
}

function renderAreaResult(area) {
  const all = area.questions.length;
  const yes = yesCount(area);
  const band = bandInfo(area, yes);
  const memo = memoOf(area);
  const next = AREAS.find((a) => a.no === area.no + 1);

  app.innerHTML = `
    <div class="stack">
      ${areaHeadHTML(area, all, all, true)}

      <section class="result-card">
        <div class="result-top">
          <div class="score-ring"><b>${yes}</b><span>‘예’ / ${all}</span></div>
          <div>
            <span class="eyebrow muted">${esc(area.name)} 성향(예측) 구간</span>
            <div class="band-line">
              ${area.bands.map((_, i) => `<span class="band-chip ${i === band.i ? 'on' : ''}">${esc(BAND_LABELS[i])} <small class="fw-750 dim">${esc(bandRange(area, i))}</small></span>`).join('')}
            </div>
            <div class="band-meter" aria-hidden="true">${area.bands.map((_, i) => `<i class="${i === band.i ? 'on' : ''}"></i>`).join('')}</div>
            <p class="muted fs-12 mt8">원문 표의 ‘성향(예측)’ 칸은 직접 적는 빈칸입니다. 구간 이름(거의 없음 ~ 매우 강함)은 읽기 쉽도록 앱에서 붙였습니다.</p>
          </div>
        </div>

        <div class="result-body">
          <div>
            <h2 class="fs-18 mb6">${esc(area.name)} — ${esc(area.sub)}</h2>
            <p class="fs-14 muted">${esc(area.intro)}</p>
          </div>

          ${area.subTypes ? `<div class="subtypes">${area.subTypes.map((s) => `<div class="st"><b>${esc(s.name)}</b><p>${esc(s.desc)}</p></div>`).join('')}</div>` : ''}

          <div class="defs">
            ${defHTML('parent', '양육 태도', area.care.양육태도)}
            ${defHTML('ip', '내면 부모 (Inner Parent)', area.care.내면부모)}
            ${defHTML('ic', '내면아이의 특징 (Inner Child)' + (area.icHighlight ? ` — ${area.icHighlight}` : ''), area.care.내면아이)}
            ${defHTML('marriage', '결혼생활', area.care.결혼생활)}
            ${defHTML('heal', '치유 · 돌봄 포인트', area.care.치유.slice(0, 5))}
          </div>

          <section class="memo">
            <h4>기억 / 메모 남기기</h4>
            <p class="muted fs-125">읽는 중에 떠오른 장면은 아주 소중한 내용입니다. 감추고 싶은 이야기라도 숨기지 말고 적어 보세요. 이 기기에만 저장됩니다.</p>
            <div class="field">
              <label for="m-memory">나의 가장 큰 상처의 기억은 무엇인가?</label>
              <textarea id="m-memory" data-memo="memory" data-area="${area.no}" placeholder="떠오른 장면을 그대로 적어 보세요.">${esc(memo.memory)}</textarea>
            </div>
            <div class="field">
              <label for="m-when">언제, 어떻게 해서 생겼는가?</label>
              <textarea id="m-when" data-memo="when" data-area="${area.no}" placeholder="시기, 장소, 그때의 상황">${esc(memo.when)}</textarea>
            </div>
            <div class="field">
              <label for="m-reaction">그때 어떻게 대응했는가? 그때의 슬픔을 표현해 보기</label>
              <textarea id="m-reaction" data-memo="reaction" data-area="${area.no}" placeholder="그때의 감정과 대응">${esc(memo.reaction)}</textarea>
            </div>
            <div class="field">
              <label for="m-predict">성향 예측 — 이 영역에서 내가 내린 예측(선택)</label>
              <input id="m-predict" type="text" data-memo="predict" data-area="${area.no}" value="${esc(memo.predict)}" placeholder="예: 인정 욕구가 크고 쉬지 못한다">
            </div>
            <p class="muted fs-12" data-save-note>이 브라우저에만 저장됩니다</p>
          </section>

          <div class="btn-row no-print">
            <button type="button" class="btn sm ghost" data-act="review" data-area="${area.no}">응답 다시 보기</button>
            <a class="btn sm ghost" href="#/">8가지 내면아이</a>
            ${next ? `<a class="btn primary" href="#/area/${next.no}">다음 영역 — ${next.no}. ${esc(next.name)} →</a>` : `<a class="btn primary" href="#/result">종합 정리 보기 →</a>`}
          </div>
        </div>
      </section>
    </div>`;
}

/* ---------------------------------------------------------------- 종합 정리 */

function rowsData() {
  return AREAS.map((a) => {
    const total = a.questions.length;
    const yes = yesCount(a);
    const ans = answeredCount(a);
    const done = ans === total;
    return { area: a, total, yes, ans, done, ratio: done ? yes / total : 0, band: done ? bandInfo(a, yes) : null };
  });
}

function topRows(rows) {
  return rows.filter((r) => r.done)
    .sort((x, y) => (y.ratio - x.ratio) || (y.yes - x.yes) || (x.area.no - y.area.no));
}

function renderResult() {
  const rows = rowsData();
  const finished = rows.filter((r) => r.done);
  const top = topRows(rows);
  const totalYes = finished.reduce((n, r) => n + r.yes, 0);
  const totalQ = finished.reduce((n, r) => n + r.total, 0);

  if (!finished.length) {
    app.innerHTML = `
      <div class="stack">
        <div class="crumb"><a href="#/">진단</a> <span aria-hidden="true">/</span> <span>종합 정리</span></div>
        <section class="card card-pad stack">
          <h1 class="page-h1 sm">내면 아이 종합 정리</h1>
          <p class="muted">아직 마친 영역이 없습니다. 한 영역(문항 전체)을 다 답하면 그때부터 점수와 종합 정리가 채워집니다.</p>
          <div class="btn-row"><a class="btn primary" href="#/area/1">1. 완벽주의부터 시작하기 →</a></div>
        </section>
        <div class="empty">8가지 내면아이를 하나씩 만나 보세요. 응답은 이 브라우저에 자동 저장됩니다.</div>
      </div>`;
    return;
  }

  const allDone = finished.length === AREAS.length;

  app.innerHTML = `
    <div class="stack">
      <div class="crumb"><a href="#/">진단</a> <span aria-hidden="true">/</span> <span>내면 아이 종합 정리</span></div>

      <section class="report-head">
        <h1>내면 아이 종합 정리</h1>
        <div class="report-meta">
          <span>${fmtDate()} 작성</span><span>·</span>
          <span>${finished.length}/8 영역 완료</span><span>·</span>
          <span>‘예’ ${totalYes}개 / ${totalQ}문항</span>
          <span class="tag t-green">${allDone ? '전체 완료' : '일부 영역 기준'}</span>
        </div>
        ${allDone ? '' : `<p class="notice-strong fs-13">아직 ${AREAS.length - finished.length}개 영역이 남아 있습니다. 지금 정리는 <b>완료한 영역만</b> 반영합니다. <a href="#/area/${(AREAS.find((a) => !isDone(a)) || AREAS[0]).no}">이어서 진단하기 →</a></p>`}
        <div class="btn-row no-print">
          <button type="button" class="btn primary" data-act="print">인쇄 / PDF 저장</button>
          <button type="button" class="btn" data-act="copy">요약 텍스트 복사</button>
          <a class="btn ghost" href="#/">진단으로 돌아가기</a>
        </div>
      </section>

      <section class="charts">
        <div class="chart-box">
          <h3>영역별 ‘예’ 비율 <small>0~100%</small></h3>
          <div class="radar">${radarSVG(rows)}</div>
        </div>
        <div class="chart-box">
          <h3>점수 막대 <small>예 / 문항</small></h3>
          <div class="bars">
            ${rows.map((r) => `
              <div class="bar-row ${top[0] && r.area.no === top[0].area.no ? 'is-top' : ''}">
                <span class="nm" title="${esc(r.area.name)}">${r.area.no}. ${esc(r.area.name)}</span>
                <span class="bar-track" aria-hidden="true"><i data-w="${r.done ? Math.max(2, pct(r.yes, r.total)) : 0}"></i></span>
                <span class="val">${r.done ? `${r.yes}/${r.total}` : `${r.ans}/${r.total}`}</span>
              </div>`).join('')}
          </div>
          <p class="muted fs-115 mt8">★ 가장 두드러진 영역. 영역마다 문항 수가 달라 비율로 비교했습니다.</p>
        </div>
      </section>

      <section>
        <div class="section-head"><h2>가장 두드러진 내면아이</h2><p>완료한 영역을 ‘예’ 비율 순으로 봅니다.</p></div>
        <div class="top-list">
          ${top.slice(0, 3).map((r, i) => topCardHTML(r, i + 1)).join('')}
        </div>
      </section>

      <section class="no-print">
        <div class="section-head"><h2>한눈에 비교하는 종합 정리표</h2><p>PDF의 종합 정리표(양육태도 · 내면부모 · 내면아이의 특징 · 결혼생활 · 치유)를 표로 비교합니다.</p></div>
        <div class="table-wrap no-print">
          <table class="summary">
            <colgroup>
              <col class="c-name"><col class="c-score"><col><col><col><col><col>
            </colgroup>
            <thead>
              <tr>
                <th scope="col">구분</th><th scope="col">‘예’ / 문항</th><th scope="col">양육태도</th><th scope="col">내면부모</th><th scope="col">내면아이의 특징</th><th scope="col">결혼생활</th><th scope="col">치유</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r) => `
                <tr class="${top.slice(0, 3).some((t) => t.area.no === r.area.no) ? 'is-top' : ''}">
                  <th scope="row"><b>${r.area.no}. ${esc(r.area.name)}</b><span>${esc(r.area.sub)}</span></th>
                  <td class="sc">${r.done ? `${r.yes}/${r.total}<br><small>${esc(r.band.label)}</small>` : `${r.ans}/${r.total}<br><small class="muted">진행 중</small>`}</td>
                  ${summaryCell(r.area.care.양육태도)}
                  ${summaryCell(r.area.care.내면부모)}
                  ${summaryCell(r.area.care.내면아이)}
                  ${summaryCell(r.area.care.결혼생활)}
                  ${summaryCell(r.area.care.치유)}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div class="section-head"><h2>내면아이 종합 정리표</h2><p>영역별로 점수 · 양육태도 · 내면부모 · 내면아이의 특징 · 결혼생활 · 치유 · 남긴 메모를 펼쳐 봅니다.</p></div>
        <div class="acc">
          ${rows.map((r) => accItemHTML(r)).join('')}
        </div>
      </section>

      <section>
        <div class="section-head"><h2>내가 남긴 기억과 메모</h2><p>${memoCount() ? `${memoCount()}개 영역에 기록했습니다.` : '아직 남긴 메모가 없습니다.'}</p></div>
        ${memoListHTML()}
      </section>

      <section class="card card-pad stack-sm no-print">
        <h3>이 기기에 저장된 기록</h3>
        <p class="muted fs-13">응답과 메모는 서버로 보내지 않고 이 브라우저에만 저장됩니다. 새로 시작하면 지금 기록이 지워집니다.</p>
        <div class="btn-row">
          <button type="button" class="btn" data-act="reset">초기화 / 새로 시작</button>
          <button type="button" class="btn" data-act="print">인쇄 / PDF 저장</button>
        </div>
      </section>
    </div>`;
}

function summaryCell(items) {
  if (!items || !items.length) return `<td class="muted fs-115">원문에 별도 정리 없음</td>`;
  return `<td><ul>${items.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></td>`;
}

function topCardHTML(r, rank) {
  const a = r.area;
  return `
    <article class="top-card">
      <header>
        <span class="rank">${rank}</span>
        <b>${a.no}. ${esc(a.name)} — ${esc(a.sub)}</b>
        <span class="sc">‘예’ ${r.yes}/${r.total} (${pct(r.yes, r.total)}%) · ${esc(r.band.label)}</span>
      </header>
      <div class="body">
        <p class="fs-135 muted">${esc(a.intro)}</p>
        <div class="defs">
          ${defHTML('ic', '내면아이의 특징', a.care.내면아이.slice(0, 6))}
          ${defHTML('ip', '내면 부모', a.care.내면부모.slice(0, 4))}
          ${defHTML('heal', '치유 · 돌봄 포인트', a.care.치유.slice(0, 4))}
        </div>
      </div>
    </article>`;
}

function accItemHTML(r) {
  const a = r.area;
  const memo = memoOf(a);
  const hasMemo = memo.memory || memo.when || memo.reaction || memo.predict;
  return `
    <details class="acc-item">
      <summary>
        <span class="no tone-soft">${a.no}</span>
        <span class="t"><b>${esc(a.name)} <small class="fw-750 muted">${esc(a.sub)}</small></b>
          <small>${r.done ? `‘예’ ${r.yes}/${r.total} · ${esc(r.band.label)}` : `응답 ${r.ans}/${r.total} — 아직 진행 중`}${hasMemo ? ' · 메모 있음' : ''}</small></span>
        <span class="r"><a href="#/area/${a.no}" data-act="go" data-href="#/area/${a.no}">${r.done ? '다시 보기' : '이어서'} →</a></span>
      </summary>
      <div class="acc-body">
        <div class="def parent wide"><h4>양육 태도</h4><ul>${a.care.양육태도.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="def ip"><h4>내면 부모 (Inner Parent)</h4><ul>${a.care.내면부모.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="def ic"><h4>내면아이의 특징 (Inner Child)</h4><ul>${a.care.내면아이.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        ${a.care.결혼생활.length ? `<div class="def marriage wide"><h4>결혼생활</h4><ul>${a.care.결혼생활.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        <div class="def heal wide"><h4>치유 · 돌봄 포인트</h4><ul>${a.care.치유.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        ${hasMemo ? `<div class="memo wide">
          <h4>내가 남긴 기억</h4>
          ${memo.memory ? `<div class="field"><span class="muted fs-12 fw-850">가장 큰 상처의 기억</span><p class="pre">${esc(memo.memory)}</p></div>` : ''}
          ${memo.when ? `<div class="field"><span class="muted fs-12 fw-850">언제, 어떻게</span><p class="pre">${esc(memo.when)}</p></div>` : ''}
          ${memo.reaction ? `<div class="field"><span class="muted fs-12 fw-850">그때의 대응과 감정</span><p class="pre">${esc(memo.reaction)}</p></div>` : ''}
          ${memo.predict ? `<div class="field"><span class="muted fs-12 fw-850">성향 예측</span><p class="pre">${esc(memo.predict)}</p></div>` : ''}
        </div>` : ''}
      </div>
    </details>`;
}

function memoCount() {
  return AREAS.filter((a) => { const m = memoOf(a); return m.memory || m.when || m.reaction || m.predict; }).length;
}

function memoListHTML() {
  const items = AREAS.map((a) => ({ a, m: memoOf(a) })).filter(({ m }) => m.memory || m.when || m.reaction || m.predict);
  if (!items.length) return `<div class="empty">아직 남긴 메모가 없습니다. 각 영역을 마치면 그 자리에서 기억을 적을 수 있습니다.</div>`;
  return `<div class="memo-list">
    ${items.map(({ a, m }) => `
      <article class="memo-card">
        <h4>${a.no}. ${esc(a.name)} <small class="muted fw-750">${esc(a.sub)}</small></h4>
        <dl>
          ${m.memory ? `<dt>가장 큰 상처의 기억</dt><dd>${esc(m.memory)}</dd>` : ''}
          ${m.when ? `<dt>언제, 어떻게</dt><dd>${esc(m.when)}</dd>` : ''}
          ${m.reaction ? `<dt>그때의 대응과 감정</dt><dd>${esc(m.reaction)}</dd>` : ''}
          ${m.predict ? `<dt>성향 예측</dt><dd>${esc(m.predict)}</dd>` : ''}
        </dl>
      </article>`).join('')}
  </div>`;
}

/* ---------------------------------------------------------------- 차트 */

function radarSVG(rows) {
  const S = 480, cx = 240, cy = 230, R = 132;
  const n = rows.length;
  const rings = [0.25, 0.5, 0.75, 1];
  const pt = (i, v) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(ang) * R * v, cy + Math.sin(ang) * R * v];
  };
  const ringPath = (v) => rows.map((_, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ');

  const poly = rows.map((r, i) => pt(i, Math.max(r.done ? 0.02 : 0, r.ratio)).map((x) => x.toFixed(1)).join(',')).join(' ');

  return `
  <svg viewBox="0 0 ${S} ${S}" role="img" aria-label="영역별 ‘예’ 비율 레이더 차트">
    <g fill="none" stroke="var(--line-soft)" stroke-width="1.5">
      ${rings.map((v) => `<polygon points="${ringPath(v)}"/>`).join('')}
    </g>
    <g stroke="var(--line-soft)" stroke-width="1.2">
      ${rows.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('')}
    </g>
    <polygon points="${poly}" fill="rgba(255,212,0,.45)" stroke="var(--green)" stroke-width="2.5"/>
    ${rows.map((r, i) => {
      const [x, y] = pt(i, Math.max(r.done ? 0.02 : 0, r.ratio));
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${r.done ? 'var(--yellow)' : 'var(--paper)'}" stroke="var(--ink)" stroke-width="1.6"/>`;
    }).join('')}
    ${rows.map((r, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const lx = cx + Math.cos(ang) * (R + 28);
      const ly = cy + Math.sin(ang) * (R + 28);
      const anchor = Math.abs(Math.cos(ang)) < 0.2 ? 'middle' : Math.cos(ang) > 0 ? 'start' : 'end';
      return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="12" font-weight="800" fill="${r.done ? 'var(--ink)' : 'var(--soft)'}" font-family="inherit">${r.area.no}. ${esc(r.area.name)}</text>
              <text x="${lx.toFixed(1)}" y="${(ly + 14).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="10.5" font-weight="700" fill="var(--soft)" font-family="inherit">${r.done ? pct(r.yes, r.total) + '%' : '미완료'}</text>`;
    }).join('')}
  </svg>`;
}

/* ---------------------------------------------------------------- 동작 */

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'answer') {
    const no = Number(el.dataset.area);
    const qi = Number(el.dataset.q);
    const val = Number(el.dataset.val);
    const area = AREAS.find((a) => a.no === no);
    if (!area) return;
    const current = ansOf(area, qi);
    state.answers[no] = state.answers[no] || {};
    if (current === val) delete state.answers[no][qi];
    else state.answers[no][qi] = val;
    save();

    // 답한 뒤: 목록으로 보던 중이면 그대로, 아니면 아직 안 한 문항으로
    if (reviewMode) { renderAreaReview(area); paintWidths(); return; }
    const firstUnanswered = area.questions.findIndex((_, i) => !isAnswered(area, i));
    cursor = firstUnanswered === -1 ? -1 : firstUnanswered;
    renderArea(no);
    paintWidths();
    return;
  }

  if (act === 'goto') {
    cursor = Number(el.dataset.q);
    reviewMode = false;
    renderArea(Number(el.dataset.area));
    paintWidths();
    return;
  }
  if (act === 'prev' || act === 'next') {
    const no = Number(location.hash.match(/\/area\/(\d+)/)?.[1] || 1);
    cursor = Math.max(0, cursor + (act === 'prev' ? -1 : 1));
    renderArea(no);
    paintWidths();
    return;
  }
  if (act === 'review') { reviewMode = true; renderArea(Number(el.dataset.area)); return; }
  if (act === 'quiz') { reviewMode = false; cursor = -1; renderArea(Number(el.dataset.area)); return; }
  if (act === 'go') { e.preventDefault(); location.hash = el.dataset.href; return; }
  if (act === 'print') { openAllDetails(); window.print(); return; }
  if (act === 'copy') { copySummary(); return; }
  if (act === 'reset') { resetAll(); return; }
});

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-memo]');
  if (!el) return;
  const no = Number(el.dataset.area);
  const key = el.dataset.memo;
  state.memos[no] = state.memos[no] || {};
  state.memos[no][key] = el.value;
  save();
});

document.getElementById('theme').addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  applyTheme(cur === 'dark' ? 'light' : 'dark', true);
});

document.getElementById('reset-top').addEventListener('click', resetAll);

window.addEventListener('hashchange', () => {
  cursor = -1;
  reviewMode = false;
  route();
});

window.addEventListener('beforeprint', openAllDetails);

function openAllDetails() {
  document.querySelectorAll('details').forEach((d) => {
    if (!d.open) { d.dataset.wasClosed = '1'; d.open = true; }
  });
}
window.addEventListener('afterprint', () => {
  document.querySelectorAll('details[data-was-closed]').forEach((d) => {
    d.open = false;
    delete d.dataset.wasClosed;
  });
});

function resetAll() {
  const has = overallAnswered() > 0 || Object.keys(state.memos).length > 0;
  if (has && !confirm('지금까지의 응답과 메모를 모두 지우고 처음부터 시작할까요?\n(되돌릴 수 없습니다)')) return;
  const theme = local.get('theme', null);
  local.clear();
  if (theme) local.set('theme', theme);
  state = EMPTY();
  cursor = 0;
  reviewMode = false;
  if (location.hash && location.hash !== '#/') location.hash = '#/';
  else route();
  toast('기록을 지우고 새로 시작합니다.');
}

function copySummary() {
  const rows = rowsData();
  const finished = rows.filter((r) => r.done);
  const top = topRows(rows);
  const lines = [];
  lines.push(`내면 아이 종합 정리 · ${fmtDate()}`);
  lines.push(`완료 ${finished.length}/8 영역 · ‘예’ ${finished.reduce((n, r) => n + r.yes, 0)}개 / ${finished.reduce((n, r) => n + r.total, 0)}문항`);
  lines.push('');
  lines.push('[영역별 점수]');
  for (const r of rows) {
    lines.push(`${r.area.no}. ${r.area.name} (${r.area.sub}) — ${r.done ? `‘예’ ${r.yes}/${r.total} · ${r.band.label}(${r.band.range})` : `응답 ${r.ans}/${r.total} · 진행 중`}`);
  }
  if (top.length) {
    lines.push('');
    lines.push('[가장 두드러진 내면아이]');
    top.slice(0, 3).forEach((r, i) => {
      lines.push(`${i + 1}) ${r.area.no}. ${r.area.name} — ‘예’ ${r.yes}/${r.total} (${pct(r.yes, r.total)}%) · ${r.band.label}`);
      lines.push(`   · 내면아이: ${r.area.care.내면아이.slice(0, 2).join(' / ')}`);
      lines.push(`   · 치유 포인트: ${r.area.care.치유.slice(0, 2).join(' / ')}`);
    });
  }
  const memos = AREAS.map((a) => ({ a, m: memoOf(a) })).filter(({ m }) => m.memory || m.when || m.reaction || m.predict);
  if (memos.length) {
    lines.push('');
    lines.push('[내가 남긴 기억과 메모]');
    for (const { a, m } of memos) {
      lines.push(`${a.no}. ${a.name}`);
      if (m.memory) lines.push(`   · 기억: ${m.memory}`);
      if (m.when) lines.push(`   · 언제·어떻게: ${m.when}`);
      if (m.reaction) lines.push(`   · 대응·감정: ${m.reaction}`);
      if (m.predict) lines.push(`   · 성향 예측: ${m.predict}`);
    }
  }
  lines.push('');
  lines.push('출처: 좋은 관계를 만들기 위한 내면아이(INNER CHILD) · 이슬비 사랑');
  const text = lines.join('\n');

  const done = () => toast('요약 텍스트를 복사했습니다.');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch { toast('복사하지 못했습니다. 인쇄/PDF 저장을 이용해 주세요.'); }
  ta.remove();
}

/* ---------------------------------------------------------------- 테마 */

function applyTheme(theme, persist) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('theme');
  const dark = theme === 'dark';
  btn.setAttribute('aria-pressed', String(dark));
  btn.setAttribute('aria-label', dark ? '밝은 화면으로 바꾸기' : '어두운 화면으로 바꾸기');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e110e' : '#f7f4ec');
  if (persist) local.set('theme', theme);
}

(function initTheme() {
  const saved = local.get('theme', null);
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  applyTheme(saved === 'dark' || saved === 'light' ? saved : prefersDark ? 'dark' : 'light', false);
})();

/* ---------------------------------------------------------------- 시작 */

route();
