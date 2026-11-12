import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner, Button, Card, Empty, EquipmentImage, ErrorBanner, Screen, Section, Title, Pill, Text } from '../design/components';
import { colors as c } from '../design/tokens';
import { useApp } from '../state/AppProvider';

// 학교 사이트 안내문(" / "로 이어진 한 줄)을 제목과 항목으로 나눈다. 링크 이름, 표 머리, 작성 당시 날짜 예시는 뺀다.
const SKIP = ['제품명', '참고 링크', '사용법', '이용 안내 사항 필독'];
// 사이트 문구 중 반말·명사형으로 끝나는 문장을 존댓말로 맞춘다.
const POLITE = [
  [/물을\s?수 있다\.$/, '물을 수 있습니다.'],
  [/작업 소재에 따라 이용 가능 여부 안내 예정$/, '작업 소재에 따라 이용 가능 여부를 안내해 드립니다.'],
  [/장비 대여는 문의\(삼각대, 렌즈 등\)$/, '장비(삼각대, 렌즈 등) 대여는 문의해 주세요.'],
  [/신용카드\/모바일 학생증 불가능$/, '신용카드와 모바일 학생증은 받지 않습니다.'],
  [/숫자로만 표시 바랍니다 "1"$/, '숫자로만 적어 주세요(예: "1").'],
  [/사용이 원칙$/, '사용이 원칙입니다.'],
  [/^필라멘트 사용량 (\d+g) 제한$/, '필라멘트는 $1까지 사용할 수 있습니다.'],
  [/^개인필라멘트 사용 문의 필수$/, '개인 필라멘트를 쓰려면 먼저 문의해 주세요.'],
  [/^1인당 1회 1대 24시간 이내, 180g이하 사용 \(개인 필라멘트 지참 시 중량 제한 없음\)$/, '1인당 1회 1대, 24시간 이내로 180g 이하 사용합니다(개인 필라멘트를 지참하면 중량 제한이 없습니다).'],
  [/^예약일 기준 차주 금요일까지 예약 가능$/, '예약일 기준 다음 주 금요일까지 예약할 수 있습니다.'],
  [/^방문 시 신분증을 필참 \(주민등록증, 학생증, 운전면허증 외 불가\)$/, '방문 시 신분증을 꼭 지참해 주세요(주민등록증, 학생증, 운전면허증만 가능합니다).'],
  [/\(예약 취소될 경우 재예약 필수\)$/, '(취소되면 다시 예약해야 합니다)'],
  [/^방문 시 stl파일 지참$/, '방문 시 stl 파일을 지참해 주세요.'],
  [/^분 단위는 올림, 시간으로 입력.*$/, '분 단위는 올려서 시간으로 입력해 주세요(예: 3시간 10분 → 4시간). 예상 사용 시간은 숫자로만 입력해 주세요(예: 1시간 → 1). "1시간"처럼 글자로 입력하면 예약할 수 없습니다.'],
  [/\(ex\. 3시간 10분일 경우, 4시간으로 입력 (→|->) 입력 시 '?4'?로 숫자(만|로만) (입력|기재)\)$/, '(예: 3시간 10분이면 4를 입력합니다)'],
  [/멀티컬러 출력 가능\. \(이용 방법 문의\)$/, '멀티컬러로 출력할 수 있습니다(이용 방법은 문의해 주세요).'],
];
const polite = s => POLITE.reduce((x, [re, to]) => x.replace(re, to), s);
function guideSections(raw) {
  const parts = String(raw || '').split(' / ').map(x => x.replace(/\(\d{4}-\d{2}-\d{2}\s*기준[^)]*\)/g, '').trim()).filter(Boolean);
  const sections = [{ title: null, items: [] }]; let table = null;
  const cur = () => sections[sections.length - 1];
  for (const p of parts) {
    if (SKIP.includes(p) || /제원$|영상|사용방법$|^<.*>$/.test(p)) continue;
    if (p === '보조 장비') { sections.push({ title: '보조 장비', items: [] }); table = []; continue; }
    const marker = /^[-*]/.test(p) || /^※/.test(p);
    if (table && !marker) { table.push(p); if (table.length === 2) { cur().items.push(`${table[0]}: ${table[1]}`); table = []; } continue; }
    if (table) { table = null; sections.push({ title: null, items: [] }); }
    if (/^※/.test(p) && p.length <= 20) { sections.push({ title: p.replace(/^※\s*/, ''), items: [] }); continue; }
    const text = p.replace(/^[-*※]\s*/, '');
    if (marker || !cur().items.length) cur().items.push(text); else cur().items[cur().items.length - 1] += ' ' + text;
  }
  return sections.filter(x => x.items.length).map(x => ({ ...x, items: x.items.map(polite) }));
}
export default function DetailScreen({ navigation, route }) {
  const { state, currentUser } = useApp(); const model=state.models.find(m=>m.id===route.params?.modelId);
  if(!model)return <Screen><Empty title="기자재를 찾을 수 없습니다"/></Screen>;
  const free=model.units.filter(u=>u.condition==='NORMAL').length;
  return <Screen><Title subtitle={`${model.category} · ${model.manufacturer}`}>{model.name}</Title><ErrorBanner/><EquipmentImage model={model} style={s.hero}/>{model.source==='demo'?<Banner text="예시 추가 모델입니다. 실제 학교 보유 기자재나 위치 정보가 아닙니다."/>:null}
    <View style={s.badges}><Pill text={model.rentalType==='장기'?'장기 대여':model.multiDay?'여러 날 대여':'당일 대여'}/><Pill text={model.carryOut?'반출 가능':'현장 이용'} tone="good"/></View>
    <Section title="이 기자재로 할 수 있는 일"><Card><Text style={s.body}>{model.purpose||'등록된 활용 안내가 없습니다.'}</Text></Card></Section>
    <Section title="대여 정보"><Card>{[['운영 수량',`${free}대 정상 / 전체 ${model.quantity}대`],['운영 시간',(()=>{const h=state.hours.find(x=>x.modelId===model.id&&!x.date);return h?`${h.start}~${h.end}`:model.operatingTime})()],['대여 장소',model.location],['연락처',model.contact],['구입 연도',model.purchaseYear]].filter(([,v])=>!!v).map(([label,value])=><View key={label} style={s.info}><Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text></View>)}</Card></Section>
    {currentUser.role!=='student'?<Section title="개별 기기"><Card>{model.units.map(u=><View key={u.id} style={s.unit}><Text style={s.unitName}>{u.name}</Text><Text style={s.unitState}>{u.id} · {u.condition==='NORMAL'?'정상':u.condition==='INSPECTION'?'점검 중':'수리 필요'}</Text></View>)}</Card></Section>:null}
    {model.rentalType==='장기'?<Banner text="연장은 가능하나 직접 방문하여 교수님 승인 메일 인증이 필요합니다" tone="warn"/>:null}
    {model.guide?<Section title="이용 안내"><Card style={s.guide}>{guideSections(model.guide).map((sec,k)=><View key={k} style={s.guideGroup}>{sec.title?<Text style={s.guideTitle}>{sec.title}</Text>:null}{sec.items.map((x,i)=><View key={i} style={s.guideRow}><View style={s.guideDot}/><Text style={s.guideText}>{x}</Text></View>)}</View>)}</Card></Section>:null}
    {currentUser.role==='student'?<Button title={model.rentalType==='장기'?'대여일 선택':'대여 시간 선택'} icon="calendar-outline" onPress={()=>navigation.navigate('Reserve',{modelId:model.id})} disabled={currentUser.approval!=='approved'}/>:null}
  </Screen>;
}
const s=StyleSheet.create({guide:{gap:16},guideGroup:{gap:8},guideTitle:{fontSize:15,fontWeight:'700',color:c.ink},guideRow:{flexDirection:'row',gap:8},guideDot:{width:4,height:4,borderRadius:2,backgroundColor:c.muted,marginTop:9},guideText:{flex:1,fontSize:14,lineHeight:21,color:c.ink},hero:{height:230},badges:{flexDirection:'row',gap: 8},body:{fontSize:14,lineHeight:22,color:c.ink},info:{flexDirection:'row',paddingVertical: 12,borderBottomWidth:1,borderBottomColor:c.border,gap: 12},label:{width:84,fontSize:13,color:c.muted},value:{flex:1,fontSize:13,color:c.ink,fontWeight:'600'},unit:{paddingVertical: 8,borderBottomWidth:1,borderBottomColor:c.border},unitName:{fontSize:13,color:c.ink,fontWeight:'600'},unitState:{fontSize:12,color:c.muted,marginTop: 4}});
