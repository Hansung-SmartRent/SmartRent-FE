/* Pure local demo rules. All dates are local ISO timestamps with an explicit offset supplied by Date. */
const MS_MIN = 60000;
const ACTIVE = ['RESERVED', 'WAITING', 'RENTING'];
const HELD = ['RENTING'];
const SCHOOL_DOMAINS = ['hansung.ac.kr', 'hansung.kr', 'hansung.edu'];
const clone = value => JSON.parse(JSON.stringify(value));
const stamp = value => typeof value === 'number' ? value : new Date(value).getTime();
const iso = value => new Date(value).toISOString();
const day = value => { const d = new Date(value); d.setHours(0, 0, 0, 0); return d; };
const dateKey = value => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const addDays = (value, n) => { const d = new Date(value); d.setDate(d.getDate() + n); return d; };
const closeAt = (value, h = 20, m = 0) => { const d = day(value); d.setHours(h, m, 0, 0); return d; };
const friday = (value, weeksAhead = 1) => { const d = day(value); const mondayOffset = (d.getDay() + 6) % 7; d.setDate(d.getDate() - mondayOffset + 4 + weeksAhead * 7); return d; };
const nextFriday = value => friday(value, 1);
const followingFriday = value => friday(value, 2);
function addCalendarMonths(value, months) {
  const d = new Date(value); const original = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(original, last)); return d;
}
const overlaps = (a, b, c, d) => stamp(a) < stamp(d) && stamp(c) < stamp(b);
const fail = message => { throw new Error(message); };
// 알림에 쓰는 예약 시간: "9월 29일 19:00~20:00" (여러 날이면 종료일도 붙인다)
const whenText = b => { const d = new Date(b.start), e = new Date(b.end), p = n => String(n).padStart(2, '0'), md = x => `${x.getMonth() + 1}월 ${x.getDate()}일`; return `${md(d)} ${p(d.getHours())}:${p(d.getMinutes())}~${dateKey(d) === dateKey(e) ? '' : md(e) + ' '}${p(e.getHours())}:${p(e.getMinutes())}`; };
const findModel = (state, id) => state.models.find(x => x.id === id) || fail('기자재를 찾을 수 없습니다.');
const findBooking = (state, id) => state.bookings.find(x => x.id === id) || fail('대여 기록을 찾을 수 없습니다.');
const findUser = (state, id) => state.users.find(x => x.id === id) || fail('계정을 찾을 수 없습니다.');
const id = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
function validSchoolEmail(email){const normalized=String(email||'').trim().toLowerCase();const parts=normalized.split('@');return parts.length===2&&!!parts[0]&&SCHOOL_DOMAINS.includes(parts[1]);}
function validDemoOtp(issued,email,code,now=Date.now()){ return !demoOtpError(issued,email,code,now); }
// 인증 코드가 맞지 않으면 이유를 돌려준다. 번호가 맞아도 5분이 지났으면 만료로 구분한다.
function demoOtpError(issued,email,code,now=Date.now()){
  if(!issued||!validSchoolEmail(email)||issued.email!==String(email).trim().toLowerCase()||!/^\d{6}$/.test(String(code))||issued.code!==String(code))return '인증 코드가 올바르지 않습니다.';
  if(now-issued.at<0||now-issued.at>5*MS_MIN)return '인증 코드가 만료되었습니다. 코드를 다시 받아 주세요.';
  return null;
}
function withdraw(state,userId,now=new Date()){
  const next=clone(state),user=findUser(next,userId);
  if(user.role!=='student')fail('학생 계정만 탈퇴할 수 있습니다.');
  if(next.bookings.some(b=>b.userId===userId&&HELD.includes(b.status)))fail('보유 중인 기기를 먼저 반납해 주세요.');
  for(const b of next.bookings)if(b.userId===userId&&['RESERVED','WAITING'].includes(b.status)){b.status='CANCELLED';b.cancelReason='회원 탈퇴';}
  next.retainedWarnings=[...(next.retainedWarnings||[]),...next.warnings.filter(w=>w.userId===userId).map(w=>({...w,studentNumber:user.studentNumber,retainUntil:iso(addCalendarMonths(now,6)),expiresAt:w.expiresAt||(user.suspendedUntil||null),originalSuspendedUntil:user.suspendedUntil||null}))];
  next.warnings=next.warnings.filter(w=>w.userId!==userId);next.bookings=next.bookings.filter(b=>b.userId!==userId);next.notifications=next.notifications.filter(n=>n.userId!==userId);next.inquiries=next.inquiries?.filter(x=>x.userId!==userId)||[];next.purchases=next.purchases?.filter(x=>x.userId!==userId)||[];
  delete next.settings[userId];delete next.searches?.[userId];if(next.loginFailures)delete next.loginFailures[String(user.email).toLowerCase()];delete next.recommendations?.[userId];
  const kept=next.retainedWarnings.some(w=>w.studentNumber===user.studentNumber&&user.studentNumber);
  next.users=next.users.filter(u=>u.id!==userId);next.session=null;audit(next,'WITHDRAW',kept?user.studentNumber:'탈퇴 회원',userId);if(kept)next.audit[0].retainUntil=iso(addCalendarMonths(now,6)); // 경고가 없으면 학번을 남기지 않고, 있으면 경고와 함께 6개월 뒤 지운다
  return next;
}
function restoreRetainedWarnings(state,user,now=new Date()){
  const next=clone(state);const found=(next.retainedWarnings||[]).filter(w=>w.studentNumber===user.studentNumber&&stamp(w.retainUntil)>stamp(now));
  if(!found.length)return next;
  next.retainedWarnings=next.retainedWarnings.filter(w=>!found.some(x=>x.id===w.id));
  next.warnings.push(...found.map(w=>({...w,userId:user.id})));
  const target=findUser(next,user.id);const original=found.map(w=>w.originalSuspendedUntil).filter(Boolean).sort().at(-1);if(original&&stamp(original)>stamp(now))target.suspendedUntil=original;
  return next;
}
function archiveModel(state,modelId,actorId,now=new Date()){
  const next=clone(state),model=findModel(next,modelId);if(findUser(next,actorId).role!=='admin')fail('관리자만 모델을 종료할 수 있습니다.');
  if(next.bookings.some(b=>b.modelId===modelId&&HELD.includes(b.status)))fail('대여 중인 기자재는 삭제할 수 없습니다.');
  model.archived=true;for(const b of next.bookings)if(b.modelId===modelId&&['RESERVED','WAITING'].includes(b.status)&&stamp(b.start)>stamp(now)){b.status='CANCELLED';b.cancelReason='모델 운영 종료';notify(next,b.userId,'예약 취소',b.cancelReason,'CANCEL',b.id);}
  audit(next,'MODEL_ARCHIVE',modelId,actorId);return next;
}
function activeWarnings(state, userId, now = new Date()) {
  return state.warnings.filter(w => w.userId === userId && !w.revokedAt && (!w.expiresAt || stamp(w.expiresAt) > stamp(now)));
}
function suspended(state, userId, now = new Date()) {
  const u = findUser(state, userId);
  return !!u.suspendedUntilReturn || (!!u.suspendedUntil && stamp(u.suspendedUntil) > stamp(now));
}
function isHoliday(state, date) { return state.holidays.some(x => x.date === dateKey(date)); }
// 쉬는 날: 토·일요일과 공휴일(관리자가 지정한 휴무일 포함)
function closedDay(state, date) { return [0, 6].includes(new Date(date).getDay()) || isHoliday(state, date); }
function hoursFor(state, model, date) {
  const override = state.hours.find(x => x.modelId === model.id && x.date === dateKey(date)) || state.hours.find(x => x.modelId === model.id && !x.date);
  const raw = override ? `${override.start}~${override.end}` : model.operatingTime;
  const [start, end] = raw.split('~'); return { start, end };
}
// 그날 이 기자재의 운영 시작·종료 시각
function openFor(state, model, date) { const [h, m] = hoursFor(state, model, date).start.split(':').map(Number); return closeAt(date, h, m); }
function closeFor(state, model, date) { const [h, m] = hoursFor(state, model, date).end.split(':').map(Number); return closeAt(date, h, m); }
// 장기 대여 반납 기한: 수령일로부터 6개월 뒤 운영 종료 시각. 그날이 쉬는 날이면 그 전 운영일로 당긴다.
function longTermEnd(state, model, start) { let d = addCalendarMonths(start, 6); for (let i = 0; i < 14 && closedDay(state, d); i++) d = addDays(d, -1); return closeFor(state, model, d); }
function slotsFor(state, model, date, now = new Date()) {
  if (closedDay(state, date)) return [];
  const { start, end } = hoursFor(state, model, date); if (!start || !end) return [];
  const [sh, sm] = start.split(':').map(Number), [eh, em] = end.split(':').map(Number);
  const begin = day(date); begin.setHours(sh, sm || 0); const finish = day(date); finish.setHours(eh, em || 0);
  const out = []; const step = model.intervalMinutes * MS_MIN;
  for (let t = stamp(begin); t + step <= stamp(finish); t += step) {
    if (t + step > stamp(now)) out.push({ start: iso(t), end: iso(t + step), free: availableCount(state, model, t, t + step) });
  }
  return out;
}
// 예약에서는 이미 시작한 칸을 고를 수 없다. 노쇼 기준을 예약 시작 시각 하나로 맞추기 위해서다
function reservableSlots(state, model, date, now = new Date()) {
  return slotsFor(state, model, date, now).filter(x => stamp(x.start) > stamp(now));
}
function availableCount(state, model, start, end, ignoreIds = []) {
  const usableUnits = model.units.filter(u => u.condition === 'NORMAL');
  const gap = model.carryOut ? 60 * MS_MIN : 0;
  const events = [];
  for (const b of state.bookings) {
    if (b.modelId !== model.id || !ACTIVE.includes(b.status) || ignoreIds.includes(b.id)) continue;
    if (b.unitId && !usableUnits.some(u => u.id === b.unitId)) continue; // physical unit already removed from capacity
    const from = HELD.includes(b.status) ? Math.min(stamp(b.pickedAt || b.start), stamp(b.start)) : stamp(b.start);
    const to = HELD.includes(b.status) && !b.returnedAt && Date.now() >= stamp(b.end) ? Infinity : stamp(b.end);
    const left = from - gap, right = to + gap;
    if (overlaps(left, right, start, end)) { events.push([Math.max(stamp(start), left), 1], [Math.min(stamp(end), right), -1]); }
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let active = 0, peak = 0; for (const [, delta] of events) { active += delta; peak = Math.max(peak, active); }
  return Math.max(0, usableUnits.length - peak);
}
function groupSlots(slots) {
  const sorted = [...slots].sort((a, b) => stamp(a.start) - stamp(b.start)); const segments = [];
  for (const x of sorted) {
    const last = segments[segments.length - 1];
    if (last && stamp(last.end) === stamp(x.start)) last.end = x.end;
    else segments.push({ start: x.start, end: x.end });
  }
  return segments;
}
function notify(state, userId, title, body, kind = 'GENERAL', relatedId = null) {
  state.notifications.unshift({ id: id('n'), userId, title, body, kind, relatedId, read: false, createdAt: iso(Date.now()) });
}
function notifyAdmins(state, title, body, kind = 'GENERAL', relatedId = null) {
  for (const u of state.users.filter(x => x.role === 'admin')) notify(state, u.id, title, body, kind, relatedId);
}
function audit(state, action, detail, actorId) { state.audit.unshift({ id: id('a'), action, detail, actorId, at: iso(Date.now()) }); }
function capacityAfter(state, model, segments, ignoreIds = []) {
  return segments.every(s => availableCount(state, model, s.start, s.end, ignoreIds) > 0);
}
function reserve(state, userId, modelId, segments, now = new Date()) {
  const next = clone(state), user = findUser(next, userId), model = findModel(next, modelId);
  if (user.role !== 'student' || user.approval !== 'approved') fail('승인된 학생 계정에서 예약할 수 있습니다.');
  if (suspended(next, userId, now)) fail('이용 정지 중입니다.');
  if (next.bookings.some(b => b.userId === userId && HELD.includes(b.status) && stamp(b.end) <= stamp(now))) fail('연체 중인 기자재를 먼저 반납해 주세요.');
  if (next.bookings.some(b => b.userId === userId && (b.modelId === modelId || findModel(next, b.modelId).name === model.name) && ACTIVE.includes(b.status))) fail('같은 모델의 진행 중인 신청은 하나만 가능합니다.');
  if (model.archived) fail('운영이 종료된 모델입니다.');
  if (!segments?.length) fail('대여 시간을 선택해 주세요.');
  const cap = model.rentalType === '장기' ? addDays(now, 365) : closeAt(nextFriday(now));
  const normalized = segments.map(x => ({ start: stamp(x.start), end: stamp(x.end) }));
  if (normalized.some(x => !Number.isFinite(x.start) || !Number.isFinite(x.end) || x.start >= x.end)) fail('시작과 종료 시간을 확인해 주세요.');
  const sorted = [...normalized].sort((a,b) => a.start-b.start); if (sorted.some((x,i) => i && x.start < sorted[i-1].end)) fail('예약 구간이 서로 겹칩니다.');
  for (const s of segments) {
    if (stamp(s.end) <= stamp(now) || stamp(s.start) > stamp(cap)) fail('예약 가능 기간을 확인해 주세요.');
    if (model.rentalType === '장기') {
      if (segments.length !== 1 || stamp(s.end) !== stamp(longTermEnd(next, model, s.start))) fail('장기 대여는 6개월 뒤 운영일까지입니다.');
      if (closedDay(next, s.start) || stamp(s.start) !== stamp(openFor(next, model, s.start))) fail('운영일을 선택해 주세요.'); // 장기 대여는 날짜만 고르고 그날 운영 시간 안에 받으면 된다
    } else if (model.multiDay) {
      if (stamp(s.end) > stamp(closeAt(nextFriday(now)))) fail('종료일은 다음 주 금요일 이내여야 합니다.');
      if(!reservableSlots(next,model,s.start,now).some(x=>stamp(x.start)===stamp(s.start)))fail('운영 가능한 시작 시간을 선택해 주세요.');
      if (closedDay(next, s.end)) fail('반납일이 휴무일입니다. 다른 날을 선택해 주세요.');
      const endHours=hoursFor(next,model,s.end).end;const[eh,em]=endHours.split(':').map(Number);if(stamp(s.end)>stamp(closeAt(s.end,eh,em)))fail('종료일 운영 종료 시간을 확인해 주세요.');
    } else {
      if (day(s.start).getTime() !== day(stamp(s.end) - 1).getTime()) fail('이 모델은 당일 대여만 가능합니다.');
      const valid = reservableSlots(next, model, s.start, now).some(x => stamp(x.start) === stamp(s.start) && stamp(x.end) === stamp(s.end));
      if (!valid && !groupSlots(reservableSlots(next, model, s.start, now).filter(x => stamp(x.start) >= stamp(s.start) && stamp(x.end) <= stamp(s.end))).some(x => stamp(x.start) === stamp(s.start) && stamp(x.end) === stamp(s.end))) fail('운영 시간 또는 휴무일을 확인해 주세요.');
    }

  }
  if (!capacityAfter(next, model, segments)) fail('선택한 시간의 남은 수량이 없습니다.');
  const applicationId = id('app');
  for (const s of segments) next.bookings.unshift({ id: id('b'), applicationId, userId, modelId, start: iso(s.start), end: iso(s.end), status: 'RESERVED', unitId: null, createdAt: iso(now), extended: false, brokenReported: false, source: 'demo' });
  notify(next, userId, '예약 신청 완료', `${model.name} 예약이 등록되었습니다.`, 'BOOKING', applicationId);
  return next;
}
function cancelBooking(state, bookingId, actorId, now = new Date(), reason = '사용자 취소') {
  const next = clone(state), b = findBooking(next, bookingId);
  if (!(b.status === 'RESERVED' && stamp(b.start) > stamp(now)) && b.status !== 'WAITING') fail('시작 전 예약이나 앞 사용자 반납을 기다리는 예약만 취소할 수 있습니다.'); // 앞사람이 반납하지 않아 기기를 기다리는 중이면 시간이 지났어도 경고 없이 취소할 수 있다
  if (actorId !== b.userId && findUser(next, actorId).role !== 'admin') fail('권한이 없습니다.');
  b.status = 'CANCELLED'; b.cancelReason = reason; notify(next, b.userId, '예약 취소', reason, 'CANCEL', b.id); return next;
}
function pickup(state, bookingId, unitId, actorId, now = new Date(), professorMailSeen = false, correcting = false) {
  const next = clone(state), admin = findUser(next, actorId), b = findBooking(next, bookingId), model = findModel(next, b.modelId);
  if (admin.role !== 'admin') fail('관리자만 대여 처리할 수 있습니다.');
  if (!['RESERVED', 'WAITING'].includes(b.status)) fail('대여 가능한 예약 상태가 아닙니다.');
  if (findUser(next,b.userId).approval !== 'approved' || suspended(next,b.userId,now)) fail('승인 상태 또는 이용 정지를 확인해 주세요.');
  if (model.rentalType === '장기' && !professorMailSeen) fail('지도교수 승인 메일을 현장에서 확인해 주세요.');
  if (!correcting && (closedDay(next, now) || stamp(now) < stamp(openFor(next, model, now)) || stamp(now) > stamp(closeFor(next, model, now)))) fail('운영 시간에만 수령 처리할 수 있습니다.');
  const unit = model.units.find(u => u.id === unitId);
  if (!unit || unit.condition !== 'NORMAL') fail('정상 상태의 동일 모델 기기 번호를 확인해 주세요.');
  if (next.bookings.some(x => x.id !== b.id && x.unitId === unitId && x.modelId === model.id && HELD.includes(x.status))) fail('이미 대여 중인 기기입니다.');
  if (stamp(now) < stamp(b.start) && availableCount(next, model, now, b.start, [b.id]) < 1) fail('조기 수령 가능한 수량이 없습니다.');
  if (stamp(now) >= stamp(b.end)) fail('예약 시간이 종료되었습니다.');
  b.status = 'RENTING'; b.unitId = unitId; b.pickedAt = iso(now); b.waitingAt = null;
  notify(next, b.userId, '대여 시작', `${model.name} 기기 ${unitId} 대여가 시작되었습니다.`, 'PICKUP', b.id);
  audit(next, 'PICKUP', `${b.id} / ${unitId}`, actorId); return next;
}
// 현장 대여: 예약 없이 창구에서 바로 빌려준다. 반납 기한 선택지는 그 기자재의 예약 규칙과 같다.
function walkInEndOptions(state, model, now = new Date()) {
  const n = stamp(now), out = [];
  const fits = end => availableCount(state, model, n, stamp(end)) > 0;
  const closed = d => closedDay(state, d);
  if (model.archived || !slotsFor(state, model, now, now).length) return out; // 쉬는 날이거나 오늘 운영 시간이 끝났으면 창구가 닫혀 있다
  const [oh, om] = hoursFor(state, model, now).start.split(':').map(Number); if (n < stamp(closeAt(now, oh, om || 0))) return out; // 운영 시작 전
  if (model.rentalType === '장기') { const end = longTermEnd(state, model, now); if (fits(end)) out.push({ end: iso(end) }); return out; }
  if (model.multiDay) {
    for (let i = 0; i <= 14; i++) {
      const d = addDays(now, i); if (stamp(day(d)) > stamp(day(nextFriday(now)))) break; if (closed(d)) continue;
      const { end } = hoursFor(state, model, d); if (!end) continue; const [eh, em] = end.split(':').map(Number); const e = closeAt(d, eh, em);
      if (stamp(e) <= n) continue; if (!fits(e)) break; out.push({ end: iso(e) });
    }
    return out;
  }
  for (const slot of slotsFor(state, model, now, now)) { if (stamp(slot.end) <= n) continue; if (!fits(slot.end)) break; out.push({ end: slot.end }); }
  return out;
}
function walkIn(state, userId, modelId, unitId, end, actorId, now = new Date(), professorMailSeen = false) {
  const next = clone(state), admin = findUser(next, actorId), user = findUser(next, userId), model = findModel(next, modelId);
  if (admin?.role !== 'admin') fail('관리자만 현장 대여를 처리할 수 있습니다.');
  if (!user || user.role !== 'student' || user.approval !== 'approved') fail('승인된 학생만 빌릴 수 있습니다.');
  if (suspended(next, userId, now)) fail('이용 정지 중인 학생입니다.');
  if (next.bookings.some(b => b.userId === userId && HELD.includes(b.status) && stamp(b.end) <= stamp(now))) fail('연체 중인 기자재를 먼저 반납해야 합니다.');
  if (next.bookings.some(b => b.userId === userId && (b.modelId === modelId || findModel(next, b.modelId).name === model.name) && ACTIVE.includes(b.status))) fail('같은 종류를 이미 빌렸거나 예약해 두었습니다. 예약이 있으면 예약자 대여로 처리해 주세요.');
  if (model.rentalType === '장기' && !professorMailSeen) fail('지도교수 승인 메일을 현장에서 확인해 주세요.');
  const unit = model.units.find(u => u.id === unitId);
  if (!unit || unit.condition !== 'NORMAL') fail('정상 상태의 같은 모델 기기인지 확인해 주세요.');
  if (next.bookings.some(x => x.unitId === unitId && x.modelId === model.id && HELD.includes(x.status))) fail('이미 대여 중인 기기입니다.');
  if (!walkInEndOptions(next, model, now).some(o => stamp(o.end) === stamp(end))) fail('이 반납 기한으로는 빌려줄 수 없습니다. 예약이나 운영 시간을 확인해 주세요.');
  const b = { id: id('b'), applicationId: id('app'), userId, modelId, start: iso(now), end: iso(end), status: 'RENTING', unitId, createdAt: iso(now), pickedAt: iso(now), extended: false, brokenReported: false, source: 'walkin' };
  next.bookings.unshift(b);
  notify(next, userId, '대여 시작', `${model.name} 기기 ${unitId} 현장 대여가 시작되었습니다.`, 'PICKUP', b.id);
  audit(next, 'WALK_IN', `${b.id} / ${unitId}`, actorId); return next;
}
function discoverDamage(state,bookingId,actorId,note,now=new Date()){
  const next=clone(state),b=findBooking(next,bookingId);
  if(findUser(next,actorId).role!=='admin'||b.status!=='RETURNED')fail('반납 완료 건만 사후 점검할 수 있습니다.');
  const unit=findModel(next,b.modelId).units.find(u=>u.id===b.unitId);if(!unit)fail('반납 기기를 찾을 수 없습니다.');
  b.damageDiscoveredAt=iso(now);b.damageNote=String(note||'반납 후 파손 확인').trim();b.returnCondition='DAMAGED';unit.condition='DAMAGED';
  if(!b.brokenReported)addWarning(next,b.userId,'DAMAGE',b.id,now);
  notify(next,b.userId,'반납 후 기기 점검',b.brokenReported?'사전 신고한 기기 이상을 확인했습니다.':'반납 후 기기 파손이 확인되었습니다.','DAMAGE',b.id);
  audit(next,'DAMAGE_DISCOVERY',`${b.id} / ${b.damageNote}`,actorId);return next;
}
function reportBroken(state, bookingId, userId, note) {
  const next = clone(state), b = findBooking(next, bookingId);
  if (b.userId !== userId || !HELD.includes(b.status)) fail('대여 중인 기기만 신고할 수 있습니다.');
  b.brokenReported = true; b.brokenNote = note?.trim() || '기기 이상 신고'; const unit = findModel(next, b.modelId).units.find(u => u.id === b.unitId); if (unit) unit.condition = 'INSPECTION'; notify(next, userId, '기기 이상 신고 접수', '관리자가 확인할 때까지 반납 상태는 유지됩니다.', 'DAMAGE', b.id); notifyAdmins(next, '파손 신고', `${findUser(next, userId).name} · ${findModel(next, b.modelId).name}: ${b.brokenNote}`, 'DAMAGE_REPORT', b.id); return next;
}
// 미수령 경고 문구: 어떤 상황에서 받지 않았는지에 따라 나눈다
function noShowText(b) {
  const why = b?.cancelReason === '기기 반납 후 30분 내 미수령' ? '기기 반납 후 30분 안에' : b?.cancelReason === '예약한 날 운영 시간 내 미수령' ? '예약한 날 운영 시간 안에' : '예약 시간 10분 안에';
  return `${why} 수령하지 않아 경고 1회가 부여되었습니다.`;
}
function addWarning(next, userId, kind, bookingId, now) {
  if (next.warnings.some(w => w.bookingId === bookingId && w.kind === kind)) return;
  next.warnings.unshift({ id: id('w'), userId, kind, bookingId, createdAt: iso(now), revokedAt: null, expiresAt: null });
  notify(next, userId, '경고 부여', kind === 'NO_SHOW' ? noShowText(next.bookings.find(b => b.id === bookingId)) : kind === 'DAMAGE' ? '기기 훼손으로 경고 1회가 부여되었습니다.' : '연체 반납으로 경고 1회가 부여되었습니다.', 'WARNING', bookingId);
  applySuspension(next, userId, now);
}
// 유효 경고가 3회 이상이면 이용 정지: 대여 중인 기기가 있으면 반납할 때까지, 없으면 6개월. 이미 정지 중이면 그대로 둔다.
function applySuspension(next, userId, now) {
  if (activeWarnings(next, userId, now).length >= 3 && !suspended(next, userId, now)) {
    const u = findUser(next, userId); u.suspendedUntilReturn = next.bookings.some(b => b.userId === userId && HELD.includes(b.status));
    if (!u.suspendedUntilReturn) u.suspendedUntil = iso(addCalendarMonths(now, 6));
    for (const b of next.bookings) if (b.userId === userId && ['RESERVED', 'WAITING'].includes(b.status)) { b.status = 'CANCELLED'; b.cancelReason = '경고 3회 이용 정지'; }
    for (const b of next.bookings) if(b.userId===userId&&HELD.includes(b.status)&&!b.returnRequired){b.returnRequired=true;notify(next,userId,'즉시 반납 필요','이용 정지로 보유 중인 기기를 반납해 주세요.','RETURN_REQUIRED',b.id);}
    notify(next, userId, '이용 정지', '경고 3회로 미수령 예약이 취소되었습니다. 대여 중인 기기는 반납해야 합니다.', 'SUSPEND');
  }
}
function returnUnit(state, bookingId, unitId, condition, actorId, now = new Date()) {
  const next = clone(state), admin = findUser(next, actorId), b = findBooking(next, bookingId), model = findModel(next, b.modelId);
  if (admin.role !== 'admin' || !HELD.includes(b.status) || b.unitId !== unitId) fail('관리자와 실제 대여 기기 번호를 확인해 주세요.');
  const unit = model.units.find(u => u.id === unitId); if (!unit) fail('기기 번호가 없습니다.');
  if (!['NORMAL', 'DAMAGED'].includes(condition)) fail('기기 상태를 선택해 주세요.');
  b.status = 'RETURNED'; b.returnedAt = iso(now); b.returnCondition = condition; unit.condition = condition;
  if (stamp(now) > stamp(b.end)) addWarning(next, b.userId, 'OVERDUE', b.id, now);
  if (condition === 'DAMAGED' && !b.brokenReported) addWarning(next, b.userId, 'DAMAGE', b.id, now);
  const u = findUser(next, b.userId);
  if (u.suspendedUntilReturn && !next.bookings.some(x => x.userId === u.id && HELD.includes(x.status))) { u.suspendedUntilReturn = false; u.suspendedUntil = iso(addCalendarMonths(now, 6)); u.suspendedByReturn = true; }
  notify(next, b.userId, '반납 완료', `${model.name} 반납 확인이 완료되었습니다.`, 'RETURN', b.id);
  audit(next, 'RETURN', `${b.id} / ${unitId} / ${condition}`, actorId); return next;
}
function extend(state, bookingId, newEnd, userId, now = new Date()) {
  const next = clone(state), b = findBooking(next, bookingId), model = findModel(next, b.modelId);
  if (b.userId !== userId || b.status !== 'RENTING' || b.extended || stamp(now) >= stamp(b.end) || suspended(next, userId, now)) fail('현재 연장할 수 없습니다.');
  if (model.rentalType === '장기') fail('연장은 가능하나 직접 방문하여 교수님 승인 메일 인증이 필요합니다');
  if (stamp(newEnd) <= stamp(b.end)) fail('종료 시간을 더 늦게 선택해 주세요.');
  if (model.multiDay && (closedDay(next, newEnd) || stamp(day(newEnd)) > stamp(nextFriday(now)))) fail('연장 가능 기한을 초과했거나 휴무일입니다.');
  const limit = model.multiDay ? closeAt(newEnd, ...hoursFor(next, model, newEnd).end.split(':').map(Number)) : closeAt(b.start, Number(hoursFor(next, model, b.start).end.split(':')[0]), Number(hoursFor(next, model, b.start).end.split(':')[1]));
  if (stamp(newEnd) > stamp(limit)) fail('연장 가능 기한을 초과했습니다.');
  if (availableCount(next, model, b.end, newEnd, [b.id]) < 1) fail('연장 시간에 남은 수량이 없습니다.');
  b.end = iso(newEnd); b.extended = true; b.dueNotified = false; notify(next, userId, '연장 완료', `${model.name} 대여 종료 시간이 변경되었습니다.`, 'BOOKING', b.id); return next;
}
function reconcile(state, now = new Date()) {
  const next = clone(state); let changed = false; if(next.retainedWarnings){const before=next.retainedWarnings.length;next.retainedWarnings=next.retainedWarnings.filter(w=>stamp(w.retainUntil)>stamp(now));if(next.retainedWarnings.length!==before)changed=true;}
  const noShow = (b, reason) => { b.status = 'NO_SHOW'; b.cancelReason = reason; if (!next.warnings.some(w => w.kind === 'NO_SHOW' && next.bookings.some(x => x.id === w.bookingId && x.applicationId === b.applicationId && x.id !== b.id))) addWarning(next, b.userId, 'NO_SHOW', b.id, now); for (const x of next.bookings) if (x.applicationId === b.applicationId && x.id !== b.id && ['RESERVED', 'WAITING'].includes(x.status)) { x.status = 'CANCELLED'; x.cancelReason = '연결 신청 미수령'; } changed = true; };
  for (const b of next.bookings) {
    const model = ['RESERVED', 'WAITING'].includes(b.status) ? findModel(next, b.modelId) : null;
    const slotEnd = model && model.rentalType === '장기' ? closeFor(next, model, b.start) : model ? new Date(b.end) : null; // 장기 대여는 수령일 운영 종료까지가 받으러 올 수 있는 시간
    if (b.status === 'RESERVED' && model.rentalType === '장기' && stamp(now) >= stamp(b.start) && stamp(now) < stamp(slotEnd) && availableCount(next, model, now, b.end, [b.id]) < 1) { b.status = 'WAITING'; b.waitingAt = iso(now); b.availableAt = null; changed = true; }
    else if (b.status === 'RESERVED' && model.rentalType === '장기') {
      if (stamp(now) >= stamp(slotEnd)) {
        // 운영 종료 30분 전에도 내줄 기기가 없었으면 학생 잘못이 아니므로 경고 없이 취소한다. 그 뒤 반납된 기기는 그때까지 대여 중이던 것으로 본다
        const at = new Date(Math.max(stamp(b.start), stamp(slotEnd) - 30 * MS_MIN));
        const then = { ...next, bookings: next.bookings.map(x => x.status === 'RETURNED' && x.returnedAt && stamp(x.returnedAt) > stamp(at) && stamp(x.pickedAt || x.start) <= stamp(at) ? { ...x, status: 'RENTING', end: stamp(x.returnedAt) > stamp(x.end) ? x.returnedAt : x.end } : x) };
        if (availableCount(then, model, at, new Date(stamp(at) + MS_MIN), [b.id]) < 1) { b.status = 'CANCELLED'; b.cancelReason = '대여 가능한 기기가 반납되지 않아 취소'; notify(next, b.userId, '예약 취소', `${model.name} ${whenText(b)} 예약이 대여 가능한 기기가 반납되지 않아 취소되었습니다. 경고는 붙지 않습니다.`, 'CANCEL', b.id); changed = true; }
        else noShow(b, '예약한 날 운영 시간 내 미수령');
      }
    } else if (b.status === 'RESERVED' && stamp(now) >= stamp(b.start)) {
      // 예약 시각이 됐는데 앞사람이 반납하지 않아 내줄 기기가 없으면 학생 잘못이 아니므로 앞 사용자 반납 대기로 두고 10분을 세지 않는다
      if (availableCount(next, model, now, b.end, [b.id]) < 1) { b.status = 'WAITING'; b.waitingAt = iso(now); b.availableAt = null; changed = true; }
      else if (stamp(now) >= Math.max(stamp(b.createdAt), stamp(b.start)) + 10 * MS_MIN) noShow(b, '예약 시간 10분 내 미수령');
    } else if (b.status === 'WAITING') {
      const free = availableCount(next, model, now, b.end, [b.id]) > 0;
      if (b.availableAt && stamp(now) >= stamp(b.availableAt) + 30 * MS_MIN && stamp(b.availableAt) + 30 * MS_MIN <= stamp(slotEnd)) noShow(b, '기기 반납 후 30분 내 미수령');
      else if (stamp(now) >= stamp(slotEnd)) { b.status = 'CANCELLED'; b.cancelReason = '대여 가능한 기기가 반납되지 않아 취소'; notify(next, b.userId, '예약 취소', `${model.name} ${whenText(b)} 예약이 대여 가능한 기기가 반납되지 않아 취소되었습니다. 경고는 붙지 않습니다.`, 'CANCEL', b.id); changed = true; }
      else if (free && !b.availableAt) { b.availableAt = iso(now); const due = new Date(Math.min(stamp(now) + 30 * MS_MIN, stamp(slotEnd))); notify(next, b.userId, '기기 수령 가능', `${model.name} 기기가 반납되었습니다. ${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}까지 창구에서 받아 가 주세요.`, 'WAITING', b.id); changed = true; }
      else if (!free && b.availableAt) { b.availableAt = null; changed = true; }
    }
  }
  for (const a of next.audit || []) if (a.action === 'WITHDRAW' && a.retainUntil && stamp(a.retainUntil) <= stamp(now)) { a.detail = '탈퇴 회원'; delete a.retainUntil; changed = true; }
  for (const u of next.users) if (u.suspendedUntil && stamp(u.suspendedUntil) <= stamp(now)) { u.suspendedUntil = null; for (const w of next.warnings) if (w.userId === u.id && !w.revokedAt) w.expiresAt = iso(now); changed = true; }
  for (const b of next.bookings) if (HELD.includes(b.status) && stamp(b.end) <= stamp(now) && !b.overdueWarned) { addWarning(next, b.userId, 'OVERDUE', b.id, now); b.overdueWarned = true; changed = true; }
  for (const u of next.users) if (u.suspendedUntilReturn) for (const b of next.bookings) if (b.userId === u.id && HELD.includes(b.status) && !b.returnRequired) { b.returnRequired = true; changed = true; notify(next, u.id, '즉시 반납 필요', '이용 정지로 대여 중인 기기를 반납해 주세요.', 'RETURN_REQUIRED', b.id); }
  for (const b of next.bookings) if (HELD.includes(b.status) && !b.dueNotified && stamp(b.end) > stamp(now) && stamp(b.end) - stamp(now) <= (findModel(next, b.modelId).rentalType === '장기' ? 7 * 24 * 60 : findModel(next, b.modelId).multiDay ? 24 * 60 : 15) * MS_MIN) {
    const settings = next.settings[b.userId] || {}; if (settings.due !== false) notify(next, b.userId, '반납 예정', `${findModel(next, b.modelId).name} 반납 시간이 다가옵니다.`, 'DUE', b.id); b.dueNotified = true; changed = true;
  }
  return changed ? next : state;
}
function bookingWithinHours(state, model, booking) {
  const hours = hoursFor(state,model,booking.start); const begin=day(booking.start); const finish=day(booking.start);
  const [sh,sm]=hours.start.split(':').map(Number),[eh,em]=hours.end.split(':').map(Number);
  begin.setHours(sh,sm); finish.setHours(eh,em);
  if(model.multiDay||model.rentalType==='장기'){const endHours=hoursFor(state,model,booking.end);const [eh2,em2]=endHours.end.split(':').map(Number),[osh,osm]=endHours.start.split(':').map(Number);const endClose=day(booking.end),endOpen=day(booking.end);endClose.setHours(eh2,em2);endOpen.setHours(osh,osm);return stamp(booking.start)>=stamp(begin)&&stamp(booking.start)<stamp(finish)&&stamp(booking.end)>=stamp(endOpen)&&stamp(booking.end)<=stamp(endClose);}
  return stamp(booking.start)>=stamp(begin)&&stamp(booking.end)<=stamp(finish);
}
function correctNoShow(state, bookingId, unitId, actorId, actualAt, professorMailSeen=false) {
  if (!Number.isFinite(stamp(actualAt))) fail('실제 수령 시간을 입력해 주세요.');
  const next=clone(state),b=findBooking(next,bookingId);
  if (findUser(next,actorId).role!=='admin'||b.status!=='NO_SHOW') fail('미수령 기록만 정정할 수 있습니다.');
  if (stamp(actualAt)>=stamp(b.end)) fail('예약 종료 전 실제 수령 시간이어야 합니다.');
  if (stamp(actualAt)>Date.now()) fail('실제 수령 시각은 지금 이전이어야 합니다.');
  b.status='RESERVED';
  for (const w of next.warnings) if(w.bookingId===bookingId&&w.kind==='NO_SHOW'&&!w.revokedAt)w.revokedAt=iso(Date.now());
  const before=findUser(next,b.userId); if(activeWarnings(next,b.userId).length<3){before.suspendedUntilReturn=false;before.suspendedUntil=null;for(const x of next.bookings)if(x.userId===b.userId)x.returnRequired=false;}
  const result=pickup(next,bookingId,unitId,actorId,actualAt,professorMailSeen,true);
  audit(result,'NO_SHOW_CORRECTION',`${bookingId} / 실제 수령 ${iso(actualAt)}`,actorId);
  return result;
}
function correctReturn(state, bookingId, actorId, actualAt) {
  if(!Number.isFinite(stamp(actualAt)))fail('실제 반납 시간을 입력해 주세요.');
  const next=clone(state),b=findBooking(next,bookingId);if(findUser(next,actorId).role!=='admin'||b.status!=='RETURNED')fail('완료된 반납만 정정할 수 있습니다.');
  if(stamp(actualAt)<stamp(b.pickedAt||b.start))fail('수령 이후 시각이어야 합니다.');
  b.returnedAt=iso(actualAt);for(const w of next.warnings)if(w.bookingId===b.id&&w.kind==='OVERDUE'&&!w.revokedAt&&stamp(actualAt)<=stamp(b.end)){w.revokedAt=iso(Date.now());w.revokeReason='실제 반납 시간 정정';}
  if(stamp(actualAt)>stamp(b.end)){const existing=next.warnings.find(w=>w.bookingId===b.id&&w.kind==='OVERDUE');if(existing&&existing.revokedAt&&existing.revokeReason==='실제 반납 시간 정정'){existing.revokedAt=null;existing.revokeReason=null;}else addWarning(next,b.userId,'OVERDUE',b.id,new Date(actualAt));}
  const u=findUser(next,b.userId);if(activeWarnings(next,u.id).length<3){u.suspendedUntilReturn=false;u.suspendedUntil=null;for(const x of next.bookings)if(x.userId===u.id)x.returnRequired=false;}else applySuspension(next,u.id,new Date());
  if(u.suspendedByReturn&&u.suspendedUntil&&!next.bookings.some(x=>x.userId===u.id&&HELD.includes(x.status))){const last=Math.max(...next.bookings.filter(x=>x.userId===u.id&&x.status==='RETURNED'&&x.returnedAt).map(x=>stamp(x.returnedAt)));if(Number.isFinite(last))u.suspendedUntil=iso(addCalendarMonths(last,6));} // 반납 뒤 6개월 정지는 실제로 마지막 기기를 반납한 때부터 다시 센다
  audit(next,'RETURN_CORRECTION',`${bookingId} / 실제 반납 ${iso(actualAt)}`,actorId);return next;
}
function revokeWarning(state, warningId, actorId, reason) {
  const next=clone(state);if(findUser(next,actorId).role!=='admin')fail('관리자만 경고를 철회할 수 있습니다.');
  const w=next.warnings.find(x=>x.id===warningId);if(!w||w.revokedAt)fail('유효한 경고를 찾을 수 없습니다.');
  w.revokedAt=iso(Date.now());w.revokeReason=reason||'관리자 정정';const u=findUser(next,w.userId);
  if(activeWarnings(next,u.id).length<3){u.suspendedUntilReturn=false;u.suspendedUntil=null;for(const b of next.bookings)if(b.userId===u.id)b.returnRequired=false;}
  notify(next,u.id,'경고 철회',w.revokeReason,'WARNING',w.id);audit(next,'WARNING_REVOKE',`${w.id} / ${w.revokeReason}`,actorId);return next;
}
function invalidateBookings(state, modelId, date, reason, actorId) {
  const next = clone(state); for (const b of next.bookings) if (['RESERVED', 'WAITING'].includes(b.status) && stamp(b.end) > Date.now() && (!modelId || b.modelId === modelId) && (dateKey(b.start)===dateKey(date)||dateKey(b.end)===dateKey(date)) && (next.holidays.some(h=>h.date===dateKey(date)) || !bookingWithinHours(next,findModel(next,b.modelId),b))) {
    b.status = 'CANCELLED'; b.cancelReason = reason; if (reason === '운영 시간 변경') notify(next, b.userId, '운영 시간 변경으로 예약 취소', `${findModel(next, b.modelId).name} ${whenText(b)} 예약이 운영 시간 변경으로 취소되었습니다. 다른 시간으로 다시 예약해 주세요.`, 'CANCEL', b.id); else notify(next, b.userId, '운영 변경으로 예약 취소', reason, 'CANCEL', b.id);
  }
  // 대여 중이고 반납일까지 7일 이내인데 그 반납일이 새로 휴무가 되면, 그날 뒤 첫 운영일의 운영 종료 시각까지 기한을 늘리고 알린다
  if (next.holidays.some(h => h.date === dateKey(date))) for (const b of next.bookings) if (HELD.includes(b.status) && (!modelId || b.modelId === modelId) && dateKey(b.end) === dateKey(date) && stamp(b.end) > Date.now() && stamp(b.end) - Date.now() <= 7 * 24 * 60 * MS_MIN) {
    const model = findModel(next, b.modelId); let d = addDays(date, 1); for (let i = 0; i < 30 && closedDay(next, d); i++) d = addDays(d, 1);
    const end = closeFor(next, model, d); b.end = iso(end); b.dueNotified = false;
    notify(next, b.userId, '반납 기한 변경', `${model.name} 반납일 ${new Date(date).getMonth() + 1}월 ${new Date(date).getDate()}일이 휴무일로 지정되어 반납 기한이 ${end.getMonth() + 1}월 ${end.getDate()}일 ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}까지로 늘어났습니다.`, 'BOOKING', b.id);
  }
  audit(next, 'OPERATIONS', reason, actorId); return next;
}
function reduceCapacity(state, modelId, actorId) {
  const next = clone(state), model = findModel(next, modelId);
  const future = next.bookings.filter(b => b.modelId === modelId && b.status === 'RESERVED' && stamp(b.start) > Date.now()).sort((a, b) => stamp(b.createdAt) - stamp(a.createdAt));
  for (const b of future) if (availableCount(next, model, b.start, b.end, [b.id]) < 1) { b.status = 'CANCELLED'; b.cancelReason = '기기 수량 변경'; notify(next, b.userId, '기기 수량 변경으로 예약 취소', '운영 가능 기기 수량이 감소했습니다.', 'CANCEL', b.id); }
  audit(next, 'CAPACITY', model.name, actorId); return next;
}
module.exports = { reservableSlots, whenText, noShowText, closedDay, openFor, closeFor, longTermEnd, demoOtpError, applySuspension, SCHOOL_DOMAINS, ACTIVE, HELD, validSchoolEmail, validDemoOtp, withdraw, restoreRetainedWarnings, archiveModel, dateKey, clone, stamp, iso, day, addDays, closeAt, nextFriday, followingFriday, addCalendarMonths, overlaps, hoursFor, slotsFor, availableCount, groupSlots, activeWarnings, suspended, reserve, cancelBooking, pickup, walkIn, walkInEndOptions, discoverDamage, reportBroken, returnUnit, extend, reconcile, invalidateBookings, reduceCapacity, correctNoShow, correctReturn, revokeWarning, notify, notifyAdmins, audit, findModel, findBooking, findUser, id };
