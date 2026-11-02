const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, {
    textContent: '', innerHTML: '', disabled: false, open: false,
    showModal() { this.open = true; }, close() { this.open = false; },
    focus() {}, querySelector() { return element(id + '-label'); },
  });
  return elements.get(id);
};
let click;
const sandbox = vm.createContext({
  document: {
    getElementById: element,
    querySelector: () => null,
    addEventListener: (name, handler) => { if (name === 'click') click = handler; },
  },
  window: { scrollTo() {} },
});
const html = fs.readFileSync(process.argv[2] || __dirname + '/index.html', 'utf8');
for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  vm.runInContext(script[1], sandbox);
}
const run = code => vm.runInContext(code, sandbox);
const step = () => { element('explanationDialog').close(); run('advance()'); };
const choose = (attribute, value) => click({ target: {
  closest: selector => selector === `[data-${attribute}]` ? {
    dataset: { [attribute]: value },
  } : null,
} });
// Intro, free navigation and the empty-choice path.
assert.equal(run('scene'), -1);
assert.ok(element('stage').innerHTML.includes('allowance-graphic'));
assert.ok(!element('stage').innerHTML.includes('모션 다시 보기'));
step();
assert.equal(run('scene'), 0);
assert.equal((element('stage').innerHTML.match(/data-choice=/g)||[]).length, 2);
assert.equal((element('stage').innerHTML.match(/class="crowd-fan"/g)||[]).length, 18);
assert.equal(run('action().disabled'), true);
for (const target of [1, 2, 3]) {
  run(`move(${target})`);
  assert.equal(run('scene'), target);
  assert.equal(run('action().disabled'), true);
  assert.ok(element('stage').innerHTML.includes('data-scene="0"'));
  assert.ok(!element('stage').innerHTML.includes('undefined'));
  assert.ok(!element('stage').innerHTML.includes('20,000원'));
}
run('move(2)');
assert.equal((element('stage').innerHTML.match(/data-time=/g)||[]).length, 6);
assert.equal((element('stage').innerHTML.match(/\sdisabled\s/g)||[]).length, 6);
choose('time', 'reading');
assert.equal(run('choice'), null);
assert.equal(run('inspectedTime'), null);
run('showExplanation()');
assert.equal(element('explanationDialog').open, false);
run('move(0);move(-2);move(4);move(NaN)');
assert.equal(run('scene'), 0);
sandbox.document.querySelector = () => ({focus() {}, scrollIntoView() {}});

// A first choice drives the payment, timetable, forgone set and overview.
for (const first of ['baseball', 'concert']) {
  const alternative = first === 'baseball' ? 'concert' : 'baseball';
  const name = first === 'baseball' ? '야구 관람' : '콘서트 관람';
  const price = first === 'baseball' ? '20,000원' : '50,000원';
  const notes = first === 'baseball' ? 2 : 5;
  run('move(0)');
  choose('choice', first);
  assert.equal(run('choice'), first);
  assert.equal(run('animatedChoice'), first);
  step();
  assert.equal(run('scene'), 1);
  assert.equal(element('question').textContent, `${name}에 실제로 쓴 돈`);
  assert.ok(element('stage').innerHTML.includes(price));
  assert.equal((element('stage').innerHTML.match(/class="outgoing-bill"/g)||[]).length, notes);
  assert.ok(!element('stage').innerHTML.includes('모션 다시 보기'));
  step();
  assert.equal(element('explanationDialog').open, true);
  assert.equal(element('explanationTitle').textContent, '명시적 비용');
  assert.ok(element('explanationBody').innerHTML.includes(price));
  assert.ok(element('explanationBody').innerHTML.includes('실제로 지출한 돈'));
  element('closeExplanation').onclick();
  assert.equal(run('scene'), 2);
  assert.equal(run('choice'), first);
  assert.equal(run('action().disabled'), false);
  assert.ok(element('question').textContent.includes('무엇을 할 수 없을까요?'));
  assert.equal((element('stage').innerHTML.match(/data-time=/g)||[]).length, 6);
  assert.equal((element('stage').innerHTML.match(/is-forgone/g)||[]).length, 5);
  assert.equal((element('stage').innerHTML.match(/aria-pressed="true"/g)||[]).length, 1);
  assert.ok(element('stage').innerHTML.includes(`${first}GraphicTitleSlot`));
  assert.ok(element('stage').innerHTML.includes('관람 선택 바꾸기'));
  assert.equal(run('forgoneTime().length'), 5);
  assert.equal(run(`forgoneTime().some(([key])=>key==='${first}')`), false);
  for (const key of ['baseball', 'concert', 'rest', 'reading', 'gaming', 'friends']) {
    choose('time', key);
    assert.equal(run('choice'), first);
    assert.equal(run('inspectedTime'), key === first ? null : key);
    assert.ok(element('stage').innerHTML.includes(`${first}GraphicTitleSlot`));
    assert.equal(run('forgoneChoice'), null);
    if (key !== first) {
      const gain = run(`timeActivities['${key}'].gain`);
      assert.ok(element('stage').innerHTML.includes('이 활동을 했다면?'));
      assert.ok(element('stage').innerHTML.includes(gain));
    }
  }
  choose('time', 'unknown');
  assert.equal(run('inspectedTime'), 'friends');
  choose('time', first);
  assert.equal(run('inspectedTime'), null);
  for (const key of ['rest','reading','gaming','friends']) {
    assert.ok(run(`timeGraphic('${key}','Test')`).includes('<svg'));
    assert.ok(!run(`timeGraphic('${key}','Test')`).includes('undefined'));
  }
  step();
  assert.equal(run('timeOpen'), true);
  assert.equal(element('explanationDialog').open, true);
  assert.ok(element('explanationBody').innerHTML.includes(`${first}GraphicTitleModalChoice`));
  assert.equal((element('explanationBody').innerHTML.match(/<li>/g)||[]).length, 5);
  assert.ok(!element('explanationBody').innerHTML.includes(`${first}GraphicTitleForgone`));
  assert.ok(element('explanationBody').innerHTML.includes('가장 가치가 큰 대안 하나'));
  element('closeExplanationTop').onclick();
  choose('time', 'reading');
  assert.equal(run('timeOpen'), true); // Inspecting does not rewind a lesson or change the decision.
  step();
  assert.equal(run('scene'), 3);
  assert.equal(run('action().disabled'), true);
  assert.equal((element('stage').innerHTML.match(/data-forgone=/g)||[]).length, 5);
  assert.ok(!element('stage').innerHTML.includes(`data-forgone="${first}"`));
  choose('forgone', first);
  choose('forgone', 'unknown');
  assert.equal(run('forgoneChoice'), null);
  choose('forgone', alternative);
  assert.equal(run('forgoneChoice'), alternative);
  assert.ok(element('stage').innerHTML.includes(`${alternative}GraphicTitleImplicit`));
  step();
  assert.equal(run('summaryOpen'), true);
  assert.ok(element('stage').innerHTML.includes('opportunity-total'));
  run('move(2)');
  choose('time', 'gaming');
  assert.equal(run('choice'), first);
  assert.equal(run('forgoneChoice'), alternative);
  assert.equal(run('timeOpen'), true);
  assert.equal(run('summaryOpen'), true);
  run('move(3)');
  step();
  assert.equal(run('overviewOpen'), true);
  assert.equal(element('question').textContent, '비용과 편익을 고려한 합리적 선택');
  assert.ok(element('stage').innerHTML.includes('선택과 기회비용 정리'));
  for (const concept of ['자원의 희소성','선택의 문제','명시적 비용','암묵적 비용']) {
    assert.ok(element('stage').innerHTML.includes(`<h2>${concept}</h2>`));
  }
  assert.equal((element('stage').innerHTML.match(/class="recap-choice"/g)||[]).length,2);
  assert.ok(element('stage').innerHTML.includes('처음 고른 관람'));
  assert.ok(element('stage').innerHTML.includes('시간표에 넣은 활동'));
  assert.ok(element('stage').innerHTML.includes(`${first}GraphicTitleRecapChoice`));
  assert.ok(element('stage').innerHTML.includes(`${first}GraphicTitleRecapTime`));
  assert.ok(element('stage').innerHTML.includes(`${alternative}GraphicTitleRecapForgone`));
  assert.ok(element('stage').innerHTML.includes('class="recap-plus"'));
  assert.ok(!element('stage').innerHTML.includes('의사 결정 과정'));
  assert.ok(!element('stage').innerHTML.includes('<details'));
  assert.ok(!element('stage').innerHTML.includes('기본 개념 참고:'));
  assert.ok(element('stage').innerHTML.includes('기회비용 = 명시적 비용 + 암묵적 비용'));
  assert.ok(element('stage').innerHTML.includes('<h2>명시적 비용</h2>'));
  assert.ok(element('stage').innerHTML.includes(`${name} 입장료로 실제 지출한 돈`));
  assert.ok(element('stage').innerHTML.includes('<h2>암묵적 비용</h2>'));
  assert.ok(element('stage').innerHTML.includes('포기한 활동 중 가장 가치가 큰 하나'));
  assert.ok(element('stage').innerHTML.includes('선택할 때는 얻는 것과 함께 포기하는 가치도 살펴봐요.'));
  assert.ok(!element('stage').innerHTML.includes('class="concept-costs"'));
  assert.ok(!element('stage').innerHTML.includes('class="textbook-rational"'));
  assert.ok(element('stage').innerHTML.includes(run(`timeActivities['${alternative}'].gain`)));
  assert.ok(element('stage').innerHTML.includes(run(`activities['${first}'].gain`)));
  assert.ok(!element('stage').innerHTML.includes('OverviewTime'));
  assert.ok(element('stage').innerHTML.includes(price));
  element('back').onclick();
  assert.equal(run('overviewOpen'), false);
  assert.equal(run('summaryOpen'), true);
  assert.equal(run('scene'), 3);
  choose('reset-forgone','');
  assert.equal(run('forgoneChoice'), null);
  assert.equal(run('summaryOpen'), false);
  choose('forgone','reading');
  step();step();step();
  assert.equal(run('scene'), 0);
  assert.equal(run('choice'), first);
  assert.equal(run('forgoneChoice'), 'reading');
  choose('choice', first);
  assert.equal(run('summaryOpen'), true); // Replaying the same card preserves progress.
  assert.equal(run('forgoneChoice'), 'reading');
  choose('choice', alternative);
  assert.equal(run('choice'), alternative);
  assert.equal(run('inspectedTime'), null);
  assert.equal(run('forgoneChoice'), null);
  assert.equal(run('moneyOpen'), false);
  assert.equal(run('timeOpen'), false);
  assert.equal(run('summaryOpen'), false);
  assert.equal(run('overviewOpen'), false);
  run('move(2)');
  assert.ok(element('stage').innerHTML.includes(`${alternative}GraphicTitleSlot`));
  choose('scene', '0');
  assert.equal(run('scene'), 0);
  choose('choice', 'unknown');
  assert.equal(run('choice'), alternative);
}
assert.ok(!html.includes('timeChoice'));
assert.ok(!html.includes('replayIntro'));
assert.ok(!html.includes('data-replay-payment'));
assert.ok(!html.includes('emoji:'));
assert.ok(!html.includes('처음부터 다시 하기'));
console.log('PASS: one choice drives money, timetable, five alternatives and overview; inspecting all six cards preserves selection and progress; changing the real choice resets dependent state; no-choice paths, modals, art and navigation.');
