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
// The opening motion has no replay button and can be skipped using the main action.
assert.equal(run('scene'), -1);
assert.equal(run('action().disabled'), false);
assert.ok(element('stage').innerHTML.includes('allowance-graphic'));
assert.ok(!element('stage').innerHTML.includes('id="replayIntro"'));
assert.ok(!element('stage').innerHTML.includes('모션 다시 보기'));
assert.equal(run('scene'), -1);
assert.equal(run('choice'), null);
run('advance()');
assert.equal(run('scene'), 0);
assert.ok(element('stage').innerHTML.includes('activity-choices'));
assert.ok(element('stage').innerHTML.includes('bat-swing'));
assert.equal((element('stage').innerHTML.match(/class="crowd-fan"/g)||[]).length, 18);
assert.ok(element('stage').innerHTML.includes('관중들이 뛰며 응원봉을 흔드는 장면'));
assert.ok(element('stage').innerHTML.includes('dancer-groove'));
assert.equal((element('stage').innerHTML.match(/data-choice=/g)||[]).length, 2);
assert.ok(element('stage').innerHTML.includes('baseballGraphicTitle'));
assert.ok(element('stage').innerHTML.includes('concertGraphicTitle'));
assert.ok(element('stage').innerHTML.includes('20,000원'));
assert.ok(element('stage').innerHTML.includes('50,000원'));
assert.equal(run('animatedChoice'), null);
assert.ok(!element('stage').innerHTML.includes('is-playing'));
assert.ok(!element('stage').innerHTML.includes('id="replayIntro"'));
assert.equal(run('scene'), 0);
assert.equal(run('choice'), null);
element('back').onclick();
assert.equal(run('scene'), -1);
run('move(0)');
// The choice screen needs a selection; navigation is always available.
assert.equal(run('action().disabled'), true);
assert.equal(run('other()'), 'concert');
step();
assert.equal(run('scene'), 0);
assert.ok(!elements.get('steps').innerHTML.includes('disabled'));
for (const target of [3, 1, 2, 0, 2, 3, 0]) {
  run(`move(${target})`);
  assert.equal(run('scene'), target);
  assert.ok(!elements.get('stage').innerHTML.includes('null'));
  assert.ok(!elements.get('stage').innerHTML.includes('예시'));
  if (target === 2) assert.ok(elements.get('stage').innerHTML.includes('콘서트 관람'));
}
run('move(-2); move(4); move(NaN)');
assert.equal(run('scene'), 0);
sandbox.document.querySelector = () => ({ focus() {}, scrollIntoView() {} });
choose('choice', 'baseball');
assert.equal(run('animatedChoice'), 'baseball');
assert.equal((element('stage').innerHTML.match(/is-playing/g)||[]).length, 1);
step();
assert.equal(run('scene'), 1);
assert.ok(element('stage').innerHTML.includes('20,000원'));
assert.ok(element('stage').innerHTML.includes('spent-money'));
assert.equal((element('stage').innerHTML.match(/class="outgoing-bill"/g)||[]).length, 2);
assert.ok(element('stage').innerHTML.includes('−20,000원'));
assert.ok(!element('stage').innerHTML.includes('data-replay-payment'));
assert.ok(!element('stage').innerHTML.includes('모션 다시 보기'));
assert.ok(!element('stage').innerHTML.includes('data-money'));
assert.ok(!element('stage').innerHTML.includes('money-scale'));
assert.equal(element('question').textContent, '야구 관람에 실제로 쓴 돈');
assert.equal(run('action().disabled'), false);
step();
assert.equal(run('moneyOpen'), true);
assert.equal(run('scene'), 1);
assert.equal(element('explanationDialog').open, true);
assert.equal(element('explanationTitle').textContent, '명시적 비용');
assert.ok(element('explanationBody').innerHTML.includes('실제로 지출한 돈'));
assert.ok(element('explanationBody').innerHTML.includes('야구 관람'));
assert.ok(element('explanationBody').innerHTML.includes('포기한 것이 이게 전부일까요?'));
assert.equal(element('closeExplanation').textContent, '시간 살펴보기 →');
assert.ok(element('explanationBody').innerHTML.includes('20,000원'));
assert.ok(!element('explanationBody').innerHTML.includes('spending-graphic'));
assert.ok(!element('explanationBody').innerHTML.includes('data-replay-payment'));
assert.ok(!element('stage').innerHTML.includes('class="reveal"'));
element('closeExplanationTop').onclick();
assert.equal(element('explanationDialog').open, false);
assert.equal(run('scene'), 1);
element('explanationBody').scrollTop = 120;
choose('explanation', '');
assert.equal(element('explanationDialog').open, true);
assert.equal(element('explanationBody').scrollTop, 0);
element('closeExplanationTop').onclick();
assert.equal(element('explanationDialog').open, false);
choose('explanation', '');
element('closeExplanation').onclick();
assert.equal(element('explanationDialog').open, false);
assert.equal(run('scene'), 2);
assert.equal(run('timeChoice'), null);
assert.equal(run('action().disabled'), true);
assert.equal((element('stage').innerHTML.match(/data-time=/g)||[]).length, 6);
assert.ok(element('stage').innerHTML.includes('data-time="baseball"'));
assert.ok(!element('stage').innerHTML.includes('is-forgone'));
choose('time', 'baseball');
assert.equal(run('timeChoice'), 'baseball'); // The first activity is available again.
choose('time', 'concert');
assert.equal(run('timeChoice'), 'concert');
assert.equal((element('stage').innerHTML.match(/is-forgone/g)||[]).length, 5);
assert.equal((element('stage').innerHTML.match(/aria-pressed="true"/g)||[]).length, 1);
assert.ok(element('stage').innerHTML.includes('timetable-slot is-filled'));
assert.ok(element('stage').innerHTML.includes('<strong>콘서트 관람</strong>'));
choose('time', 'rest');
assert.equal(run('timeChoice'), 'rest');
assert.ok(element('stage').innerHTML.includes('<strong>뒹굴거리기</strong>'));
choose('time', 'unknown');
assert.equal(run('timeChoice'), 'rest');
choose('time', 'baseball');
assert.equal(run('timeChoice'), 'baseball');
step();
assert.equal(run('scene'), 2);
assert.equal(run('timeOpen'), true);
assert.equal(element('explanationDialog').open, true);
assert.ok(element('explanationBody').innerHTML.includes('암묵적 비용'));
assert.ok(element('explanationBody').innerHTML.includes('좋아하는 음악'));
assert.equal(run('other()'), 'concert');
step();
assert.equal(run('scene'), 3);
assert.equal(run('action().disabled'), true);
step();
assert.equal(run('summaryOpen'), false);
choose('forgone', 'baseball');
assert.equal(run('forgoneChoice'), null); // The time activity is not a forgone alternative.
choose('forgone', 'unknown');
assert.equal(run('forgoneChoice'), null);
choose('forgone', 'concert');
assert.equal(run('forgoneChoice'), 'concert');
assert.ok(element('stage').innerHTML.includes('<h2 id="implicitTitle">암묵적 비용</h2>'));
assert.ok(element('stage').innerHTML.includes('좋아하는 음악을 현장에서 듣는 즐거움'));
assert.ok(!element('stage').innerHTML.includes('opportunity-total'));
assert.equal(run('summaryOpen'), false);
assert.equal(run('action().disabled'), false);
step();
assert.equal(run('summaryOpen'), true);
assert.equal(element('explanationDialog').open, false);
assert.ok(element('stage').innerHTML.includes('기회비용 = 명시적 비용 + 암묵적 비용'));
assert.ok(element('stage').innerHTML.includes('opportunity-total'));
assert.equal(run('action().label'), '활동 한눈에 보기');
step();
assert.equal(run('overviewOpen'), true);
assert.equal(run('scene'), 3);
assert.ok(element('stage').innerHTML.includes('활동 종합 정리'));
assert.ok(element('stage').innerHTML.includes('baseballGraphicTitleOverviewChoice'));
assert.ok(element('stage').innerHTML.includes('baseballGraphicTitleOverviewTime'));
assert.ok(element('stage').innerHTML.includes('concertGraphicTitleOverviewForgone'));
assert.ok(element('stage').innerHTML.includes('20,000원'));
assert.equal(run('choice'), 'baseball');
assert.equal(run('timeChoice'), 'baseball');
assert.equal(run('forgoneChoice'), 'concert');
assert.equal(element('back').textContent, '← 비용 정리');
element('back').onclick();
assert.equal(run('overviewOpen'), false);
assert.equal(run('summaryOpen'), true);
assert.equal(run('scene'), 3);
assert.ok(element('stage').innerHTML.includes('opportunity-total'));
choose('reset-forgone', '');
assert.equal(run('forgoneChoice'), null);
assert.equal(run('summaryOpen'), false);
choose('forgone', 'reading');
assert.equal(run('forgoneChoice'), 'reading');
step();
assert.equal(run('scene'), 3);
// Revisiting retains the choice; changing it invalidates dependent scenes.
run('move(0)');
assert.equal(run('animatedChoice'), null);
choose('choice', 'baseball');
assert.equal(run('animatedChoice'), 'baseball');
choose('choice', 'concert');
assert.equal(run('animatedChoice'), 'concert');
assert.equal((element('stage').innerHTML.match(/is-playing/g)||[]).length, 1);
run('move(3)');
assert.equal(run('scene'), 3);
assert.ok(elements.get('stage').innerHTML.includes('콘서트 관람 입장료'));
assert.ok(elements.get('stage').innerHTML.includes('시간표로 가기'));
assert.ok(elements.get('stage').innerHTML.includes('50,000원'));
run('move(0)');
assert.equal(run('summaryOpen'), false);
assert.equal(run('forgoneChoice'), null);
assert.equal(run('other()'), 'baseball');
step();
assert.ok(element('stage').innerHTML.includes('50,000원'));
assert.equal((element('stage').innerHTML.match(/class="outgoing-bill"/g)||[]).length, 5);

step();
assert.equal(element('explanationTitle').textContent, '명시적 비용');
assert.ok(element('explanationBody').innerHTML.includes('50,000원'));
assert.ok(element('explanationBody').innerHTML.includes('콘서트 관람'));
assert.ok(!element('explanationBody').innerHTML.includes('야구 관람'));
assert.ok(!element('explanationBody').innerHTML.includes('20,000원'));
step();
choose('time', 'gaming');
step(); step();
choose('forgone', 'reading');
step(); step();
assert.equal(run('scene'), 3);
assert.equal(run('overviewOpen'), true);
assert.ok(element('stage').innerHTML.includes('concertGraphicTitleOverviewChoice'));
assert.ok(element('stage').innerHTML.includes('gamingGraphicTitleOverviewTime'));
assert.ok(element('stage').innerHTML.includes('readingGraphicTitleOverviewForgone'));
assert.ok(element('stage').innerHTML.includes('50,000원'));
step();
assert.equal(run('scene'), 0);
assert.equal(run('overviewOpen'), false);
assert.equal(run('choice'), 'concert');
assert.equal(run('timeChoice'), 'gaming');
assert.equal(run('forgoneChoice'), 'reading');
run('move(2)');
assert.equal(run('scene'), 2);
run('move(-1)');
assert.ok(element('stage').innerHTML.includes('allowance-graphic'));
// The timetable only offers activity selection, with no picture-editing controls.
run('move(2)');
assert.equal(element('question').textContent, '그 시간, 다른 데에 쓴다면?');
for (const activity of ['baseball', 'concert', 'rest', 'reading', 'gaming', 'friends']) {
  choose('time', activity);
  assert.equal(run('timeChoice'), activity);
  assert.equal((element('stage').innerHTML.match(/is-forgone/g)||[]).length, 5);
  assert.ok(!element('stage').innerHTML.includes('그림 바꾸기'));
  assert.ok(!element('stage').innerHTML.includes('data-picture'));
}
assert.ok(!html.includes('activityPictureInput'));
choose('time', 'rest');
step();
assert.ok(element('explanationBody').innerHTML.includes('뒹굴거리기'));
assert.equal((element('explanationBody').innerHTML.match(/<li>/g)||[]).length, 5);
assert.ok(element('explanationBody').innerHTML.includes('가장 가치가 큰 대안 하나'));
assert.ok(element('explanationBody').innerHTML.includes('baseballGraphicTitleForgone'));
assert.ok(element('explanationBody').innerHTML.includes('concertGraphicTitleForgone'));
element('closeExplanation').onclick();
choose('time', 'friends');
assert.equal(run('timeOpen'), false);
assert.equal(run('summaryOpen'), false);
run('move(3)');
assert.ok(element('stage').innerHTML.includes('토요일 오후 · 친구 만나기 선택'));
const summaryList = element('stage').innerHTML.match(/<ul class="summary-alternatives"[\s\S]*?<\/ul>/)[0];
assert.equal((summaryList.match(/<li>/g)||[]).length, 5);
assert.ok(!summaryList.includes('<strong>친구 만나기</strong>'));
assert.ok(summaryList.includes('baseballGraphicTitleSummary'));
assert.ok(summaryList.includes('concertGraphicTitleSummary'));
assert.equal((summaryList.match(/data-forgone=/g)||[]).length, 5);
assert.ok(!element('stage').innerHTML.includes('하지 못하는 활동 ·'));
choose('forgone', 'rest');
run('move(1); move(3)');
assert.equal(run('forgoneChoice'), 'rest');
run('move(2)');
choose('time', 'rest');
assert.equal(run('forgoneChoice'), null);
assert.equal(run('summaryOpen'), false);
run('move(3)');
assert.equal(run('action().disabled'), true);
// Both first choices remain available in the timetable, modal and summary.
for (const first of ['baseball', 'concert']) {
  run('move(0)');
  choose('choice', first);
  run('move(2)');
  assert.equal((element('stage').innerHTML.match(/data-time=/g)||[]).length, 6);
  assert.ok(element('stage').innerHTML.includes(`data-time="${first}"`));
  const alternative = first === 'baseball' ? 'concert' : 'baseball';
  assert.ok(element('stage').innerHTML.includes(`data-time="${alternative}"`));
  for (const key of ['rest', 'reading', 'gaming', 'friends']) {
    assert.ok(element('stage').innerHTML.includes(`${key}GraphicTitleOption`));
    assert.ok(!run(`timeGraphic('${key}','Check')`).includes('undefined'));
    assert.ok(run(`timeGraphic('${key}','Check')`).includes('<svg'));
  }
  choose('time', first);
  assert.equal(run('timeChoice'), first);
  choose('time', 'reading');
  assert.equal((element('stage').innerHTML.match(/is-forgone/g)||[]).length, 5);
  assert.ok(element('announcement').textContent.includes('나머지 5개'));
  step();
  assert.equal((element('explanationBody').innerHTML.match(/<li>/g)||[]).length, 5);
  assert.ok(element('explanationBody').innerHTML.includes(`${first}GraphicTitleForgone`));
  assert.ok(element('explanationBody').innerHTML.includes('readingGraphicTitleModalChoice'));
  step();
  assert.equal((element('stage').innerHTML.match(/data-forgone=/g)||[]).length, 5);
  choose('forgone', first);
  assert.equal(run('forgoneChoice'), first);
  choose('forgone', 'friends');
  assert.equal(run('forgoneChoice'), 'friends');
  assert.ok(element('stage').innerHTML.includes('friendsGraphicTitleImplicit'));
  step();
  assert.equal(run('summaryOpen'), true);
}
assert.ok(!html.includes('emoji:'));
assert.ok(!html.includes('data-replay-payment'));
assert.ok(!html.includes('처음부터 다시 하기'));
console.log('PASS: activity overview combines both choices and costs without resetting; return navigation preserves choices; six time choices, five alternatives, SVG art, modals and opportunity cost.');
