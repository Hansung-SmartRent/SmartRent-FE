import catalog from './equipment.json';
import policy from '../state/policy';
import { PUBLIC_HOLIDAYS } from './holidays';

// seed 내용을 고치면 이 숫자를 1 올린다. 앱이 다음 실행 때 새 데이터로 바꾼다(로그인 상태는 유지).
export const SEED_VERSION = 18;

export function createSeed(now = new Date()) {
  // 예시 대여 시각은 정시(시간 칸)에 맞춘다
  const hour0 = new Date(now); hour0.setMinutes(0, 0, 0);
  const start = new Date(hour0.getTime() - 60 * 60000), end = new Date(hour0.getTime() + 3 * 60 * 60000);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + (tomorrow.getDay() === 5 ? 3 : tomorrow.getDay() === 6 ? 2 : 1)); tomorrow.setHours(10, 0, 0, 0);
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  while ([0, 6].includes(tomorrow.getDay()) || PUBLIC_HOLIDAYS.some(([h]) => h === ymd(tomorrow))) tomorrow.setDate(tomorrow.getDate() + 1); // 예시 예약은 운영하는 날로
  const reserveEnd = new Date(tomorrow.getTime() + 60 * 60000);
  const secondStart = new Date(hour0.getTime() - 2 * 60 * 60000), secondEnd = new Date(hour0.getTime() + 5 * 60 * 60000);
  const models = policy.clone(catalog);
  const today = now.toISOString();
  const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const plusDays = n => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };
  const minusDays = n => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };
  const offDay = d => [0, 6].includes(d.getDay()) || PUBLIC_HOLIDAYS.some(([h]) => h === key(d));
  // 지난 예시 대여일: n일 전에서 가장 가까운 앞쪽 운영일(주말·공휴일 제외)
  const prevWorkday = n => { const d = minusDays(n); while (offDay(d)) d.setDate(d.getDate() - 1); return d; };
  // n일 뒤부터 가장 가까운 평일(공휴일 제외)
  const workday = n => { const d = plusDays(n); while ([0, 6].includes(d.getDay()) || PUBLIC_HOLIDAYS.some(([h]) => h === key(d))) d.setDate(d.getDate() + 1); return d; };
  const at = (d, h) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x; };
  const plusMonths = n => { const d = new Date(now); d.setMonth(d.getMonth() + n); return d; };
  return {
    version: 3, seedVersion: SEED_VERSION, models, session: 'student-demo',
    users: [
      { id: 'student-demo', role: 'student', name: '김하늘', studentNumber: '2499001', email: 'demo@hansung.ac.kr', password: 'demo1234', approval: 'approved', studentIdPhoto: null },
      { id: 'student-pending', role: 'student', name: '이새봄', studentNumber: '2499002', email: 'pending@hansung.ac.kr', password: 'demo1234', approval: 'pending', studentIdPhoto: '학생증 제출됨' },
      { id: 'student-pending-2', role: 'student', name: '박도윤', studentNumber: '2499003', email: 'pending2@hansung.ac.kr', password: 'demo1234', approval: 'pending', studentIdPhoto: '학생증 제출됨' },
      { id: 'student-pending-3', role: 'student', name: '최유진', studentNumber: '2499004', email: 'pending3@hansung.ac.kr', password: 'demo1234', approval: 'pending', studentIdPhoto: '학생증 제출됨' },
      { id: 'student-2', role: 'student', name: '정민준', studentNumber: '2499005', email: 'minjun@hansung.ac.kr', password: 'demo1234', approval: 'approved', studentIdPhoto: null },
      { id: 'student-3', role: 'student', name: '한서연', studentNumber: '2499006', email: 'seoyeon@hansung.ac.kr', password: 'demo1234', approval: 'approved', studentIdPhoto: null },
      { id: 'student-4', role: 'student', name: '오지후', studentNumber: '2499007', email: 'jihu@hansung.ac.kr', password: 'demo1234', approval: 'approved', studentIdPhoto: null },
      { id: 'student-5', role: 'student', name: '윤태오', studentNumber: '2499008', email: 'taeo@hansung.ac.kr', password: 'demo1234', approval: 'approved', studentIdPhoto: null, suspendedUntil: plusMonths(5).toISOString(), suspendedUntilReturn: false },
      { id: 'student-6', role: 'student', name: '강예린', studentNumber: '2499009', email: 'yerin@hansung.ac.kr', password: 'demo1234', approval: 'rejected', rejectReason: '제출한 사진으로 학생증을 확인할 수 없습니다. 얼굴·이름·학번이 잘 보이는 사진으로 다시 제출해 주세요.', studentIdPhoto: null },
      { id: 'admin-demo', role: 'admin', name: '대여 관리자', email: 'admin@hansung.ac.kr', password: 'demo1234', approval: 'approved' },
    ],
    bookings: [
      { id: 'fixture-past', applicationId: 'fixture-past', userId: 'student-demo', modelId: '15', start: at(prevWorkday(2), 10).toISOString(), end: at(prevWorkday(2), 12).toISOString(), status: 'RETURNED', unitId: models.find(m => m.id === '15').units[1].id, createdAt: minusDays(3).toISOString(), pickedAt: at(prevWorkday(2), 10).toISOString(), returnedAt: at(prevWorkday(2), 12).toISOString(), returnCondition: 'NORMAL', extended: false, brokenReported: false, source: 'demo' },
      { id: 'fixture-renting', applicationId: 'fixture-renting', userId: 'student-demo', modelId: '15', start: start.toISOString(), end: end.toISOString(), status: 'RENTING', unitId: models.find(m => m.id === '15').units[0].id, createdAt: today, pickedAt: today, extended: false, brokenReported: false, source: 'demo' },
      { id: 'fixture-renting-2', applicationId: 'fixture-renting-2', userId: 'student-demo', modelId: '13', start: secondStart.toISOString(), end: secondEnd.toISOString(), status: 'RENTING', unitId: models.find(m => m.id === '13').units[0].id, createdAt: today, pickedAt: today, extended: false, brokenReported: true, brokenNote: '렌즈 앞쪽에 금이 가 있습니다. 받을 때부터 있었는지는 확인하지 못했습니다.', source: 'demo' },
      { id: 'fixture-renting-multi', applicationId: 'fixture-renting-multi', userId: 'student-demo', modelId: 'demo-lg', start: at(new Date(), 9).toISOString(), end: at(workday(1), 20).toISOString(), status: 'RENTING', unitId: models.find(m => m.id === 'demo-lg').units[0].id, createdAt: today, pickedAt: today, extended: false, brokenReported: false, source: 'demo' },
      { id: 'fixture-reserved', applicationId: 'fixture-reserved', userId: 'student-demo', modelId: '24', start: tomorrow.toISOString(), end: reserveEnd.toISOString(), status: 'RESERVED', unitId: null, createdAt: today, extended: false, brokenReported: false, source: 'demo' },
      { id: 'fixture-reserved-2', applicationId: 'fixture-reserved-2', userId: 'student-3', modelId: '7', start: at(workday(2), 14).toISOString(), end: at(workday(2), 16).toISOString(), status: 'RESERVED', unitId: null, createdAt: minusDays(1).toISOString(), extended: false, brokenReported: false, source: 'demo' },
      { id: 'fixture-renting-3', applicationId: 'fixture-renting-3', userId: 'student-4', modelId: '28', start: new Date(hour0.getTime() - 60 * 60000).toISOString(), end: new Date(hour0.getTime() + 4 * 60 * 60000).toISOString(), status: 'RENTING', unitId: models.find(m => m.id === '28').units[0].id, createdAt: today, pickedAt: today, extended: false, brokenReported: false, source: 'demo' },
      { id: 'fixture-waiting', applicationId: 'fixture-waiting', userId: 'student-2', modelId: '28', start: hour0.toISOString(), end: new Date(hour0.getTime() + 2 * 60 * 60000).toISOString(), status: 'WAITING', unitId: null, createdAt: minusDays(1).toISOString(), arrivedAt: new Date(now.getTime() - 20 * 60000).toISOString(), waitingAt: new Date(now.getTime() - 20 * 60000).toISOString(), availableAt: null, extended: false, brokenReported: false, source: 'demo' },
      { id: 'fixture-noshow', applicationId: 'fixture-noshow', userId: 'student-3', modelId: '8', start: at(prevWorkday(4), 10).toISOString(), end: at(prevWorkday(4), 12).toISOString(), status: 'NO_SHOW', unitId: null, createdAt: minusDays(6).toISOString(), cancelReason: '예약 시간 10분 내 미수령', extended: false, brokenReported: false, source: 'demo' },
      { id: 'fixture-returned-2', applicationId: 'fixture-returned-2', userId: 'student-2', modelId: '24', start: at(prevWorkday(3), 13).toISOString(), end: at(prevWorkday(3), 17).toISOString(), status: 'RETURNED', unitId: models.find(m => m.id === '24').units[2].id, createdAt: minusDays(4).toISOString(), pickedAt: at(prevWorkday(3), 13).toISOString(), returnedAt: at(prevWorkday(3), 16).toISOString(), returnCondition: 'NORMAL', extended: false, brokenReported: false, source: 'demo' },
      { id: 'fixture-cancelled', applicationId: 'fixture-cancelled', userId: 'student-4', modelId: '19', start: at(prevWorkday(2), 11).toISOString(), end: at(prevWorkday(2), 15).toISOString(), status: 'CANCELLED', unitId: null, createdAt: minusDays(5).toISOString(), cancelReason: '학생이 직접 취소', extended: false, brokenReported: false, source: 'demo' },
      { id: 'fixture-noshow-2', applicationId: 'fixture-noshow-2', userId: 'student-demo', modelId: '25', start: at(prevWorkday(9), 14).toISOString(), end: at(prevWorkday(9), 16).toISOString(), status: 'NO_SHOW', unitId: null, createdAt: minusDays(11).toISOString(), cancelReason: '예약 시간 10분 내 미수령', extended: false, brokenReported: false, source: 'demo' },
      { id: 'fixture-cancelled-2', applicationId: 'fixture-cancelled-2', userId: 'student-demo', modelId: '9', start: at(prevWorkday(6), 10).toISOString(), end: at(prevWorkday(6), 12).toISOString(), status: 'CANCELLED', unitId: null, createdAt: minusDays(8).toISOString(), cancelReason: '학생이 직접 취소', extended: false, brokenReported: false, source: 'demo' },
    ],
    warnings: [{ id: 'w-demo', userId: 'student-demo', kind: 'LATE', bookingId: null, createdAt: minusDays(12).toISOString(), revokedAt: null, expiresAt: plusMonths(6).toISOString() }, { id: 'w-demo-3', userId: 'student-5', kind: 'NO_SHOW', bookingId: null, createdAt: minusDays(40).toISOString(), revokedAt: null, expiresAt: null }, { id: 'w-demo-4', userId: 'student-5', kind: 'LATE', bookingId: null, createdAt: minusDays(25).toISOString(), revokedAt: null, expiresAt: null }, { id: 'w-demo-5', userId: 'student-5', kind: 'DAMAGE', bookingId: null, createdAt: minusDays(30).toISOString(), revokedAt: null, expiresAt: null }, { id: 'w-demo-6', userId: 'student-pending-2', kind: 'LATE', bookingId: null, createdAt: minusDays(20).toISOString(), revokedAt: null, expiresAt: plusMonths(4).toISOString() }, { id: 'w-demo-7', userId: 'student-demo', kind: 'NO_SHOW', bookingId: 'fixture-noshow-2', createdAt: minusDays(9).toISOString(), revokedAt: null, expiresAt: plusMonths(6).toISOString() }, { id: 'w-demo-2', userId: 'student-3', kind: 'NO_SHOW', bookingId: 'fixture-noshow', createdAt: minusDays(4).toISOString(), revokedAt: null, expiresAt: plusMonths(6).toISOString() }], notifications: [{ id: 'seed-note', userId: 'student-demo', title: 'SmartRent에 오신 것을 환영합니다', body: '기자재를 검색하고 대여 일정을 관리해 보세요.', kind: 'GENERAL', relatedId: null, read: false, createdAt: today }, { id: 'seed-admin-damage', userId: 'admin-demo', title: '파손 신고', body: '김하늘 · ICLE-6400 카메라: 렌즈 앞쪽에 금이 가 있습니다. 받을 때부터 있었는지는 확인하지 못했습니다.', kind: 'DAMAGE_REPORT', relatedId: 'fixture-renting-2', read: false, createdAt: today }, { id: 'seed-admin-inquiry', userId: 'admin-demo', title: '문의 접수', body: '김하늘: 반납 시간을 놓치면 어떻게 되나요', kind: 'REQUEST', relatedId: 'inq-demo-2', read: false, createdAt: today }],
    notices: [{ id: 'notice-demo', title: '기자재 대여 이용 안내', body: '예약 후 운영 장소에서 학생증과 신분증을 지참해 주세요.', createdAt: today, updatedAt: today }],
    inquiries: [{ id: 'inq-demo', userId: 'student-demo', title: '대여 중인 노트북을 하루 더 쓸 수 있나요', body: '내일 발표가 있어서 하루만 더 사용하고 싶습니다. 연장 신청은 어디서 하나요?', response: '대여 상세 화면에서 연장 버튼을 눌러 주세요. 연장은 1회만 가능하며, 종료 시각 전에만 신청할 수 있습니다.', createdAt: today, respondedAt: today }, { id: 'inq-demo-2', userId: 'student-demo', title: '반납 시간을 놓치면 어떻게 되나요', body: '수업이 늦게 끝나서 운영 시간 안에 반납하지 못할 것 같습니다. 이런 경우에도 연체로 처리되나요?', response: '', createdAt: today }], purchases: [{ id: 'buy-demo', userId: 'student-demo', title: '삼각대 추가 구입 요청', body: '촬영 수업 인원에 비해 삼각대가 부족합니다. 2대만 더 들여놓을 수 있을까요?', response: '', createdAt: today }], holidays: [...PUBLIC_HOLIDAYS.map(([date, reason]) => ({ date, reason, kind: 'public' })), { date: key(workday(9)), reason: '기자재실 정기 점검', kind: 'temp' }, { date: key(workday(23)), reason: '센터 내부 교육', kind: 'temp' }],
    hours: [{ modelId: '15', date: key(plusDays(4)), start: '13:00', end: '17:00' }],
    audit: [
      { id: 'a-demo-1', action: 'RETURN', detail: 'fixture-past / 15-002 / NORMAL', actorId: 'admin-demo', at: at(prevWorkday(2), 12).toISOString() },
      { id: 'a-demo-2', action: 'PICKUP', detail: 'fixture-renting / 15-001', actorId: 'admin-demo', at: minusDays(1).toISOString() },
      { id: 'a-demo-3', action: 'UNIT_CONDITION', detail: '13 / 13-003 / 점검 중', actorId: 'admin-demo', at: minusDays(3).toISOString() },
      { id: 'a-demo-4', action: 'OPERATIONS', detail: '기자재실 정기 점검', actorId: 'admin-demo', at: minusDays(5).toISOString() },
      { id: 'a-demo-5', action: 'MODEL_EDIT', detail: '24', actorId: 'admin-demo', at: minusDays(8).toISOString() },
    ], settings: { 'student-demo': { due: true } }, searches: { 'student-demo': [] }, recommendations: {},
  };
}
