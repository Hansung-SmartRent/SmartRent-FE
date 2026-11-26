import React from 'react';
import { Alert, Animated, Easing, Image, KeyboardAvoidingView, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Switch, Text as RNText, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppModal } from './Portal';
import { StudentIdCropper } from './StudentIdCropper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { equipmentImages } from '../data/images';
import { colors as c } from './tokens';
import { FONT, withFont } from './fonts';
import { useApp } from '../state/AppProvider';

// 한국어를 어절 단위로 줄바꿈한다(iOS). 안드로이드는 줄 길이를 고르게 맞춘다. 앱의 모든 글자는 이 Text를 쓴다.
// 글꼴은 피그마와 같은 Noto Sans KR(fonts.js)이고 굵기에 맞는 글꼴 파일을 고른다.
// 줄바꿈 규칙: 단어 중간(얼/굴)에서는 끊지 않는다. 웹 브라우저는 기본으로 글자마다 끊어서 keep-all을 준다.
const WEB_KEEP_WORDS = { wordBreak: 'keep-all' };
export const Text = React.forwardRef(function Text(props, ref) { return <RNText ref={ref} lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" {...props} style={[props.style, withFont(StyleSheet.flatten(props.style)), Platform.OS === 'web' && WEB_KEEP_WORDS]} />; });
export function Screen({ children, scroll = true, style }) {
  const inset = useSafeAreaInsets();
  let header = 0; try { header = useHeaderHeight(); } catch (e) { header = 0; }
  const top = header > 0 ? 16 : inset.top + 12;
  const body = scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.screenContent, { paddingTop: top, paddingBottom: Math.max(inset.bottom + 20, 28) }, style]}>{children}</ScrollView> : <View style={[styles.screenContent, { flex: 1, paddingTop: top, paddingBottom: inset.bottom + 12 }, style]}>{children}</View>;
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{body}</KeyboardAvoidingView>;
}
export function Title({ children, subtitle, right }) { return <View style={styles.titleRow}><View style={styles.flex}><Text style={styles.title}>{children}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>{right}</View>; }
export function Lead({ children }) { return <Text style={styles.lead}>{children}</Text>; }
export function BellButton({ onPress }) {
  const { state, currentUser } = useApp();
  const unread = state && currentUser ? state.notifications.filter(n => n.userId === currentUser.id && !n.read).length : 0;
  return <Pressable accessibilityRole="button" accessibilityLabel={unread ? `알림 ${unread}건 읽지 않음` : '알림'} onPress={onPress} hitSlop={6} android_ripple={{ color: c.softPress, borderless: true }} style={({ pressed }) => [styles.bell, pressed && styles.softPressed]}>
    <Ionicons name="notifications-outline" size={24} color={c.ink} />
    {unread ? <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>{unread > 99 ? '99+' : unread}</Text></View> : null}
  </Pressable>;
}
export function Section({ title, action, children }) { return <View style={styles.section}><View style={styles.sectionRow}><Text style={styles.sectionTitle}>{title}</Text>{action}</View>{children}</View>; }
export function Card({ children, style, onPress, accessibilityLabel }) { if (!onPress) return <View style={[styles.card, style]}>{children}</View>; return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} android_ripple={{ color: c.softPress, borderless: false }} style={({pressed}) => [styles.card, style, pressed && styles.cardPressed]}>{children}</Pressable>; }
export function Button({ title, onPress, kind = 'primary', icon, disabled, compact, style }) { return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} android_ripple={{ color: kind === 'primary' || kind === 'danger' ? 'rgba(255,255,255,0.24)' : c.softPress }} style={({pressed}) => [styles.button, compact && styles.compactButton, kind === 'secondary' && styles.secondaryButton, kind === 'danger' && styles.dangerButton, kind === 'quiet' && styles.quietButton, disabled && styles.disabledButton, pressed && !disabled && (kind === 'primary' ? styles.primaryPressed : kind === 'danger' ? styles.dangerPressed : styles.softPressed), style]}>{icon ? <Ionicons name={icon} size={19} color={disabled ? '#64748B' : kind === 'primary' || kind === 'danger' ? '#fff' : c.primary} style={styles.buttonIcon} /> : null}<Text style={[styles.buttonText, kind !== 'primary' && kind !== 'danger' && styles.secondaryButtonText, disabled && styles.disabledText]}>{title}</Text></Pressable>; }
export function Segmented({ options, value, onChange, accessibilityLabel }) {
  const [width, setWidth] = React.useState(0);
  const slide = React.useRef(new Animated.Value(0)).current;
  const placed = React.useRef(false);
  const index = Math.max(0, options.findIndex(o => (o.value ?? o) === value));
  const unit = width > 0 ? (width - 8) / options.length : 0;
  React.useEffect(() => {
    if (!unit) return;
    if (!placed.current) { placed.current = true; slide.setValue(index * unit); return; }
    Animated.timing(slide, { toValue: index * unit, duration: 220, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }).start();
  }, [index, unit]);
  return <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={styles.segmented} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    {unit > 0 ? <Animated.View pointerEvents="none" style={[styles.segmentThumb, { width: unit, transform: [{ translateX: slide }] }]} /> : null}
    {options.map(option => {
      const v = option.value ?? option, label = option.label ?? option, on = v === value;
      return <Pressable key={v} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={() => onChange(v)} android_ripple={{ color: c.softPress, borderless: true }} style={({pressed}) => [styles.segment, pressed && styles.segmentPressed]}>
        <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}
export function Chip({ label, selected, onPress }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!selected }} onPress={onPress} hitSlop={{ top: 5, bottom: 5 }} android_ripple={{ color: c.softPress }} style={({pressed}) => [styles.chip, selected && styles.chipOn, pressed && styles.chipPressed]}><Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text></Pressable>; }
export function List({ children, style }) { const items = React.Children.toArray(children).filter(Boolean); return <View style={[styles.listCard, style]}>{items.map((child, i) => <React.Fragment key={i}>{i && !child.props?.noDivider ? <View style={styles.listLine} /> : null}{child}</React.Fragment>)}</View>; }
// 접었다 펼치는 영역: 안쪽 높이를 재서 0 ↔ 전체 높이로 부드럽게 늘고 줄어든다(휴대폰·웹 공통).
export function Collapse({ open, children }) {
  const [h, setH] = React.useState(0);
  const a = React.useRef(new Animated.Value(open ? 1 : 0)).current;
  React.useEffect(() => { Animated.timing(a, { toValue: open ? 1 : 0, duration: 280, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(); }, [open]);
  return <Animated.View style={{ overflow: 'hidden', opacity: a, height: h ? a.interpolate({ inputRange: [0, 1], outputRange: [0, h] }) : (open ? undefined : 0) }}>
    <View style={styles.collapseInner} onLayout={e => setH(e.nativeEvent.layout.height)}>{children}</View>
  </Animated.View>;
}
export function ListLine() { return <View style={styles.listLine} />; }
// "나머지 N건 보기 / 접기" 글자 버튼. 화살표는 펼치면 위로 돈다.
export function MoreToggle({ open, count, onPress }) { return <Pressable accessibilityRole="button" accessibilityLabel={open ? '접기' : `나머지 ${count}건 보기`} onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.moreToggle, pressed && { opacity: 0.6 }]}><Text style={styles.moreText}>{open ? '접기' : `나머지 ${count}건 보기`}</Text><TurnIcon name="chevron-down" open={open} /></Pressable>; }

export function animateLayout() { LayoutAnimation.configureNext({ duration: 250, create: { type: 'easeInEaseOut', property: 'opacity' }, update: { type: 'easeInEaseOut' }, delete: { type: 'easeInEaseOut', property: 'opacity' } }); }
function TurnIcon({ name, open }) { const r = React.useRef(new Animated.Value(open ? 1 : 0)).current; React.useEffect(() => { Animated.timing(r, { toValue: open ? 1 : 0, duration: 250, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(); }, [open]); return <Animated.View style={{ transform: [{ rotate: r.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}><Ionicons name={name} size={20} color={c.muted} /></Animated.View>; }
// 켜고 끄는 줄: 휴대폰은 각 기기 기본 토글(아이폰·갤럭시 모양). 웹은 기본 토글이 안드로이드 모양이라 아이폰 토글(51×31)을 직접 그림
function WebSwitch({ value, onValueChange, label }) {
  const x = React.useRef(new Animated.Value(value ? 1 : 0)).current;
  React.useEffect(() => { Animated.timing(x, { toValue: value ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [value]);
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} onPress={() => onValueChange(!value)} hitSlop={8}>
    <Animated.View style={[styles.switchTrack, { backgroundColor: x.interpolate({ inputRange: [0, 1], outputRange: ['#E5E7EB', c.primary] }) }]}>
      <Animated.View style={[styles.switchThumb, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />
    </Animated.View>
  </Pressable>;
}
export function SwitchRow({ title, subtitle, value, onValueChange }) { return <View style={[styles.linkRow, styles.switchRow]}><View style={styles.flex}><Text numberOfLines={2} style={styles.linkTitle}>{title}</Text>{subtitle ? <Text numberOfLines={2} ellipsizeMode="tail" style={styles.linkSubtitle}>{subtitle}</Text> : null}</View>{Platform.OS === 'web' ? <WebSwitch value={value} onValueChange={onValueChange} label={title} /> : <Switch accessibilityLabel={title} value={value} onValueChange={onValueChange} trackColor={{ false: '#E5E7EB', true: c.primary }} thumbColor="#FFFFFF" ios_backgroundColor="#E5E7EB" />}</View>; }
export function LinkRow({ title, subtitle, icon = 'chevron-forward-outline', onPress, tone, open }) { return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} android_ripple={{ color: c.softPress }} style={({pressed}) => [styles.linkRow, pressed && styles.softPressed]}><View style={styles.flex}><Text numberOfLines={2} style={[styles.linkTitle, tone === 'danger' && { color: c.danger }]}>{title}</Text>{subtitle ? <Text numberOfLines={2} ellipsizeMode="tail" style={styles.linkSubtitle}>{subtitle}</Text> : null}</View>{open === undefined ? <Ionicons name={icon} size={20} color={c.muted} /> : <TurnIcon name={icon} open={open} />}</Pressable>; }
export function Field({ label, note, value, onChangeText, placeholder, multiline, keyboardType, secureTextEntry, maxLength, autoCapitalize = 'none', disabled }) { return <View style={styles.fieldWrap}><Text style={styles.fieldLabel}>{label}{note ? <Text style={styles.fieldNote}>{'   '}{note}</Text> : null}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#94A3B8" editable={!disabled} accessibilityState={{ disabled: !!disabled }} style={[styles.field, multiline && styles.multiline, disabled && styles.fieldDisabled]} multiline={multiline} keyboardType={keyboardType} secureTextEntry={secureTextEntry} maxLength={maxLength} autoCapitalize={autoCapitalize} textAlignVertical={multiline ? 'top' : 'center'} /></View>; }
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
export function TimeRangeField({ label, value, onChange, placeholder }) {
  const [open, setOpen] = React.useState(false);
  const [from, to] = String(value || '').split('~');
  const [draft, setDraft] = React.useState({ start: from || '09:00', end: to || '18:00' });
  const show = () => { setDraft({ start: from || '09:00', end: to || '18:00' }); setOpen(true); };
  const valid = draft.start < draft.end;
  return <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 선택`} onPress={show} android_ripple={{ color: c.softPress }} style={({ pressed }) => [styles.field, styles.timeField, pressed && styles.softPressed]}>
      <Text style={[styles.timeValue, !value && styles.timeHint]}>{value ? `${from} ~ ${to}` : (placeholder || '시간을 선택하세요')}</Text>
      <Ionicons name="time-outline" size={18} color={c.muted} />
    </Pressable>
    <SlideSheet visible={open} onClose={() => setOpen(false)}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <View style={styles.sheetCols}>
            {[['start', '시작'], ['end', '종료']].map(([k, title]) => <View key={k} style={styles.sheetCol}>
              <Text style={styles.sheetColLabel}>{title}</Text>
              <ScrollView style={styles.sheetScroll} contentOffset={{ x: 0, y: Math.max(0, TIMES.indexOf(draft[k]) * 44 - 88) }}>
                {TIMES.map(t => { const on = draft[k] === t; return <Pressable key={t} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setDraft(d => ({ ...d, [k]: t }))} android_ripple={{ color: c.softPress }} style={({ pressed }) => [styles.timeRow, on && styles.timeRowOn, pressed && !on && styles.softPressed]}><Text style={[styles.timeRowText, on && styles.timeRowTextOn]}>{t}</Text></Pressable>; })}
              </ScrollView>
            </View>)}
          </View>
          <Text style={[styles.sheetNote, !valid && styles.sheetWarn]}>{valid ? `${draft.start} ~ ${draft.end}` : '종료 시각은 시작 시각보다 늦어야 합니다.'}</Text>
          <View style={styles.sheetActions}>
            <Button title="취소" kind="secondary" style={styles.flex} onPress={() => setOpen(false)} />
            <Button title="확인" style={styles.flex} disabled={!valid} onPress={() => { onChange(`${draft.start}~${draft.end}`); setOpen(false); }} />
          </View>
    </SlideSheet>
  </View>;
}
// 날짜 하나 고르기: 칸을 누르면 달력 시트가 올라온다. min·max 밖이나 blocked(날짜)가 참인 날은 흐리게 보이고 누를 수 없다.
export function DateField({ label, value, onChange, min, max, blocked, placeholder }) {
  const [open, setOpen] = React.useState(false);
  const lo = new Date(min); lo.setHours(0, 0, 0, 0); const hi = new Date(max); hi.setHours(0, 0, 0, 0);
  const start = value ? new Date(value) : hi;
  const [month, setMonth] = React.useState(new Date(start.getFullYear(), start.getMonth(), 1));
  const show = () => { const d = value ? new Date(value) : hi; setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setOpen(true); };
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1));
  const canPrev = new Date(month.getFullYear(), month.getMonth(), 0) >= lo, canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= hi;
  const same = (a, b) => a && b && new Date(a).toDateString() === new Date(b).toDateString();
  return <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 선택`} onPress={show} android_ripple={{ color: c.softPress }} style={({ pressed }) => [styles.field, styles.timeField, pressed && styles.softPressed]}>
      <Text style={[styles.timeValue, !value && styles.timeHint]}>{value ? formatDay(value) : (placeholder || '날짜를 선택하세요')}</Text>
      <Ionicons name="calendar-outline" size={18} color={c.muted} />
    </Pressable>
    <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
      <View style={styles.dateHead}>
        <Pressable accessibilityRole="button" accessibilityLabel="이전 달" disabled={!canPrev} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} hitSlop={8} style={({ pressed }) => [styles.dateArrow, pressed && styles.softPressed, !canPrev && styles.timeRowOff]}><Ionicons name="chevron-back" size={20} color={c.ink} /></Pressable>
        <Text style={styles.sheetTitle}>{month.getFullYear()}년 {month.getMonth() + 1}월</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="다음 달" disabled={!canNext} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} hitSlop={8} style={({ pressed }) => [styles.dateArrow, pressed && styles.softPressed, !canNext && styles.timeRowOff]}><Ionicons name="chevron-forward" size={20} color={c.ink} /></Pressable>
      </View>
      <View style={styles.dateGrid}>
        {['일', '월', '화', '수', '목', '금', '토'].map(w => <Text key={w} style={styles.dateWeek}>{w}</Text>)}
        {Array.from({ length: month.getDay() }, (_, i) => <View key={'b' + i} style={styles.dateCell} />)}
        {days.map(d => { const off = d < lo || d > hi || (blocked && blocked(d)), on = same(d, value); return <Pressable key={d.getDate()} accessibilityRole="button" accessibilityLabel={`${d.getMonth() + 1}월 ${d.getDate()}일`} accessibilityState={{ selected: on, disabled: off }} disabled={off} onPress={() => { onChange(d); setOpen(false); }} style={styles.dateCell}>{({ pressed }) => <View style={[styles.dateDay, on && styles.dateDayOn, pressed && !on && styles.softPressed]}><Text style={[styles.dateText, off && styles.dateTextOff, on && styles.dateTextOn]}>{d.getDate()}</Text></View>}</Pressable>; })}
      </View>
    </Sheet>
  </View>;
}
// 잠깐 떴다 사라지는 안내(토스트): 화면 위에 겹쳐 떠서 아래 내용을 밀지 않는다. 화면 맨 바깥에 {toast}를 두고 show(문구)로 띄운다.
export function useToast({ top = 12 } = {}) {
  const [text, setText] = React.useState('');
  const a = React.useRef(new Animated.Value(0)).current; const timer = React.useRef(null);
  const native = Platform.OS !== 'web';
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const show = (message, ms = 2200) => {
    clearTimeout(timer.current); setText(message);
    Animated.timing(a, { toValue: 1, duration: 180, useNativeDriver: native }).start();
    timer.current = setTimeout(() => Animated.timing(a, { toValue: 0, duration: 220, useNativeDriver: native }).start(() => setText('')), ms);
  };
  const toast = text ? <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.toastWrap, { top, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}><View style={styles.toast}><Text style={styles.toastText}>{text}</Text></View></Animated.View> : null;
  return { toast, show };
}
// 시각 하나 고르기: 알람 설정처럼 시와 분(5분 단위)을 따로 고른다. min·max 밖의 시각은 고를 수 없다.
export function ClockField({ label, value, onChange, min, max, placeholder, disabled }) {
  const [open, setOpen] = React.useState(false);
  const lo = new Date(min), hi = new Date(max);
  const pad = n => String(n).padStart(2, '0');
  const at = (h, m) => { const d = new Date(lo); d.setHours(h, m, 0, 0); return d; };
  const first = { h: lo.getHours(), m: Math.ceil(lo.getMinutes() / 5) * 5 };
  const [draft, setDraft] = React.useState(first);
  const show = () => { const v = value ? new Date(value) : null; setDraft(v ? { h: v.getHours(), m: v.getMinutes() } : first); setOpen(true); };
  const hours = []; for (let h = lo.getHours(); h <= hi.getHours(); h++) hours.push(h);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  const ok = (h, m) => { const t = at(h, m).getTime(); return t >= lo.getTime() && t <= hi.getTime(); };
  const valid = ok(draft.h, draft.m);
  const pickHour = h => setDraft(d => ok(h, d.m) ? { h, m: d.m } : { h, m: minutes.find(m => ok(h, m)) ?? d.m });
  const col = (title, items, key, fmt, can, pick) => <View style={styles.sheetCol}>
    <Text style={styles.sheetColLabel}>{title}</Text>
    <ScrollView style={styles.sheetScroll} contentOffset={{ x: 0, y: Math.max(0, items.indexOf(draft[key]) * 44 - 88) }}>
      {items.map(x => { const on = draft[key] === x, off = !can(x); return <Pressable key={x} accessibilityRole="button" accessibilityState={{ selected: on, disabled: off }} disabled={off} onPress={() => pick(x)} android_ripple={{ color: c.softPress }} style={({ pressed }) => [styles.timeRow, on && styles.timeRowOn, off && styles.timeRowOff, pressed && !on && styles.softPressed]}><Text style={[styles.timeRowText, on && styles.timeRowTextOn]}>{fmt(x)}</Text></Pressable>; })}
    </ScrollView>
  </View>;
  return <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 선택`} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={show} android_ripple={{ color: c.softPress }} style={({ pressed }) => [styles.field, styles.timeField, disabled && styles.fieldDisabled, pressed && styles.softPressed]}>
      <Text style={[styles.timeValue, !value && styles.timeHint]}>{value ? `${pad(new Date(value).getHours())}:${pad(new Date(value).getMinutes())}` : (placeholder || '시각을 선택하세요')}</Text>
      <Ionicons name="time-outline" size={18} color={c.muted} />
    </Pressable>
    <SlideSheet visible={open} onClose={() => setOpen(false)}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <View style={styles.sheetCols}>
            {col('시', hours, 'h', h => `${pad(h)}시`, h => minutes.some(m => ok(h, m)), pickHour)}
            {col('분', minutes, 'm', m => `${pad(m)}분`, m => ok(draft.h, m), m => setDraft(d => ({ ...d, m })))}
          </View>
          <Text style={[styles.sheetNote, !valid && styles.sheetWarn]}>{valid ? `${pad(draft.h)}:${pad(draft.m)}` : `${pad(lo.getHours())}:${pad(lo.getMinutes())} ~ ${pad(hi.getHours())}:${pad(hi.getMinutes())} 사이로 골라 주세요.`}</Text>
          <View style={styles.sheetActions}>
            <Button title="취소" kind="secondary" style={styles.flex} onPress={() => setOpen(false)} />
            <Button title="확인" style={styles.flex} disabled={!valid} onPress={() => { onChange(at(draft.h, draft.m).toISOString()); setOpen(false); }} />
          </View>
    </SlideSheet>
  </View>;
}
// 아래에서 올라오는 시트 공통 틀: 배경은 서서히 어두워지고 시트는 아래에서 미끄러져 올라온다. 닫을 때는 반대로 내려간다.
function SlideSheet({ visible, onClose, children, keyboard }) {
  const inset = useSafeAreaInsets(); // 아이폰 홈 바와 안드로이드 내비게이션 바 위로 버튼을 올린다
  const [mounted, setMounted] = React.useState(visible);
  const [height, setHeight] = React.useState(900);
  const a = React.useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';
  React.useEffect(() => {
    if (visible) { setMounted(true); a.setValue(0); Animated.timing(a, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start(); }
    else if (mounted) Animated.timing(a, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: native }).start(({ finished }) => { if (finished) setMounted(false); });
  }, [visible]);
  const Wrap = keyboard ? KeyboardAvoidingView : View;
  return <AppModal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
    <Wrap style={styles.sheetWrap} {...(keyboard ? { behavior: Platform.OS === 'ios' ? 'padding' : undefined } : {})}>
      <Animated.View style={[styles.sheetBack, { opacity: a }]}><Pressable accessibilityLabel="닫기" style={styles.flex} onPress={onClose} /></Animated.View>
      <Animated.View onLayout={e => setHeight(e.nativeEvent.layout.height)} style={[styles.sheet, { paddingBottom: inset.bottom + 16, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }]}>{children}</Animated.View>
    </Wrap>
  </AppModal>;
}
export function Sheet({ visible, onClose, title, children }) {
  return <SlideSheet visible={visible} onClose={onClose} keyboard>{title ? <Text style={styles.sheetTitle}>{title}</Text> : null}{children}</SlideSheet>;
}
// 동그라미 체크: 확인 전은 빈 흰 동그라미, 확인 뒤는 초록 원에 흰 체크
export function CheckRow({ label, checked, onPress }) { return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!checked }} accessibilityLabel={label} onPress={onPress} android_ripple={{ color: c.softPress }} style={({ pressed }) => [styles.checkRow, pressed && styles.softPressed]}><View style={[styles.checkCircle, checked && styles.checkCircleOn]}>{checked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}</View><Text style={styles.checkText}>{label}</Text></Pressable>; }
export function SelectField({ label, value, options, onChange, placeholder = '선택하세요', unknown, disabled }) {
  const [open, setOpen] = React.useState(false);
  const chosen = options.find(o => o.value === value);
  const shown = chosen ? chosen.label : value ? (unknown ? unknown(value) : String(value)) : placeholder;
  return <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 선택`} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={() => setOpen(true)} android_ripple={{ color: c.softPress }} style={({ pressed }) => [styles.field, styles.timeField, disabled && styles.fieldDisabled, pressed && styles.softPressed]}>
      <Text style={[styles.timeValue, !chosen && !value && styles.timeHint]} numberOfLines={1}>{shown}</Text>
      <Ionicons name="chevron-down" size={18} color={c.muted} />
    </Pressable>
    <SlideSheet visible={open} onClose={() => setOpen(false)}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <ScrollView style={styles.selectScroll}>
            {options.map((o, i) => { const on = o.value === value; return <Pressable key={o.value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { onChange(o.value); setOpen(false); }} android_ripple={{ color: c.softPress }} style={({ pressed }) => [styles.selectRow, o.title && styles.selectRowLg, i === options.length - 1 && styles.selectRowLast, on && styles.selectRowOn, pressed && !on && styles.softPressed]}>
              {o.title ? <View style={styles.selectMain}>{o.model ? <EquipmentImage model={o.model} style={styles.selectThumbLg} /> : null}<View style={styles.flex}>{o.sub ? <Text style={styles.rowCategory}>{o.sub}</Text> : null}<Text style={[styles.selectTitle, on && styles.selectTextOn]} numberOfLines={2}>{o.title}</Text>{o.meta ? <Text style={styles.rowMeta}>{o.meta}</Text> : null}</View></View> : <View style={styles.selectMain}>{o.model ? <EquipmentImage model={o.model} style={styles.selectThumb} /> : null}<Text style={[styles.selectText, on && styles.selectTextOn, styles.flexShrink]}>{o.label}</Text></View>}
              {on ? <Ionicons name="checkmark" size={20} color={c.primary} /> : null}
            </Pressable>; })}
          </ScrollView>
          <Button title="닫기" kind="secondary" onPress={() => setOpen(false)} />
    </SlideSheet>
  </View>;
}
const SCAN_MODES = {
  barcode: { label: '바코드', types: ['ean13', 'ean8', 'code128', 'code39', 'code93', 'codabar', 'itf14', 'upc_a', 'upc_e'], hint: '바코드를 가로로 눕혀 긴 사각형 안에 맞춰 주세요.' },
  qr: { label: 'QR', types: ['qr', 'datamatrix'], hint: 'QR 코드를 정사각형 안에 맞춰 주세요.' },
};
export function ScanSheet({ visible, onClose, onScanned, title = 'QR·바코드 스캔', initialMode = 'barcode' }) {
  const [permission, requestPermission] = useCameraPermissions();
  const inset = useSafeAreaInsets(); // 안드로이드 내비게이션 바(3버튼 약 48)에 전환 버튼이 가리지 않게
  const [mode, setMode] = React.useState(initialMode);
  const done = React.useRef(false);
  React.useEffect(() => { if (visible) { done.current = false; setMode(initialMode); } }, [visible, initialMode]);
  const read = ({ data }) => { if (done.current || !data) return; done.current = true; onScanned(String(data).trim()); };
  const current = SCAN_MODES[mode];
  return <AppModal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.scanRoot}>
      <View style={styles.scanBar}>
        <Text style={styles.scanTitle}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" hitSlop={12} onPress={onClose} style={({ pressed }) => pressed && { opacity: 0.6 }}><Ionicons name="close" size={26} color="#fff" /></Pressable>
      </View>
      {permission?.granted
        ? <View style={styles.flex}>
            <CameraView key={mode} style={styles.flex} facing="back" barcodeScannerSettings={{ barcodeTypes: current.types }} onBarcodeScanned={read} />
            <View pointerEvents="none" style={styles.scanFrameWrap}><View style={[styles.scanFrame, mode === 'qr' ? styles.scanFrameQr : styles.scanFrameBar]} /></View>
          </View>
        : <View style={styles.scanAsk}>
            <Ionicons name="camera-outline" size={40} color="#fff" />
            <Text style={styles.scanAskText}>{permission ? '카메라 사용을 허용해야 코드를 읽을 수 있습니다.' : '카메라를 준비하고 있습니다.'}</Text>
            {permission && !permission.granted ? <Button title="카메라 허용" onPress={requestPermission} /> : null}
          </View>}
      <View style={[styles.scanFoot, { paddingBottom: Math.max(40, inset.bottom + 6) }]}>
        <View accessibilityRole="tablist" style={styles.scanModes}>
          {Object.entries(SCAN_MODES).map(([key, m]) => { const on = key === mode; return <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${m.label} 스캔`} onPress={() => setMode(key)} style={({ pressed }) => [styles.scanMode, on && styles.scanModeOn, pressed && !on && { opacity: 0.6 }]}><Ionicons name={key === 'qr' ? 'qr-code-outline' : 'barcode-outline'} size={18} color={on ? c.ink : '#fff'} /><Text style={[styles.scanModeText, on && styles.scanModeTextOn]}>{m.label}</Text></Pressable>; })}
        </View>
        <Text style={styles.scanHintText}>{current.hint}</Text>
      </View>
    </View>
  </AppModal>;
}
// 학생증 제출: 앨범에서 고른 사진을 학생이 직접 카드 틀에 맞춰 자른다(StudentIdCropper). 카메라 촬영은 두지 않는다
export function StudentIdPicker({ value, onChange }) {
  const [asset, setAsset] = React.useState(null);
  const pick = async () => { try { const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 }); const a = res.canceled ? null : res.assets?.[0]; if (a?.uri) { await new Promise(r => setTimeout(r, Platform.OS === 'ios' ? 300 : 0)); setAsset(a); } } catch (e) { Alert.alert('사진을 불러올 수 없습니다', String(e?.message || e)); } };
  return <View style={styles.idPickWrap}><Text style={styles.fieldLabel}>학생증 제출</Text><Pressable accessibilityRole="button" accessibilityLabel={value ? '학생증 사진 다시 고르기' : '학생증 사진 고르기'} onPress={pick} style={({ pressed }) => [styles.idPick, !value && styles.idPickEmpty, pressed && { opacity: 0.8 }]}>{value ? <><Image source={{ uri: value }} style={styles.idPickImage} resizeMode="contain" accessibilityLabel="제출할 학생증 사진" /><View style={styles.idPickRetake}><Ionicons name="images-outline" size={14} color="#fff" /><Text style={styles.idPickRetakeText}>다시 고르기</Text></View></> : <><Ionicons name="card-outline" size={32} color={c.primary} /><Text style={styles.idPickTitle}>{'실물 학생증 사진이나 헤이영 전자학생증의\nQR 화면 캡처를 올려 주세요'}</Text><Text style={styles.idPickMeta}>얼굴·이름·학번이 선명하게 보여야 합니다</Text><Text style={styles.idPickMeta}>실물 학생증은 사진을 먼저 찍은 뒤 골라 주세요</Text></>}</Pressable>
    <StudentIdCropper Text={Text} asset={asset} onCancel={() => setAsset(null)} onDone={uri => { setAsset(null); onChange(uri); }} /></View>;
}
export function Avatar({ user, size = 48 }) {
  const box = { width: size, height: size, borderRadius: size / 2, backgroundColor: c.soft };
  if (user?.avatarUri) return <Image source={{ uri: user.avatarUri }} style={box} accessibilityLabel={`${user.name} 프로필 사진`} />;
  return <View style={[box, { alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: Math.round(size * 0.42), fontWeight: '800', color: c.primary }}>{user?.name?.slice(0, 1) || '?'}</Text></View>;
}
export function Pill({ text, tone = 'neutral' }) { const color = tone === 'good' ? c.success : tone === 'warn' ? c.warning : tone === 'danger' ? c.danger : tone === 'orange' ? c.orange : tone === 'muted' ? c.muted : c.primary; const bg = tone === 'good' ? c.successSoft : tone === 'warn' ? c.warningSoft : tone === 'danger' ? c.dangerSoft : tone === 'orange' ? c.orangeSoft : tone === 'muted' ? c.surfacePress : c.soft; return <View style={[styles.pill, { backgroundColor: bg }]}><Text style={[styles.pillText, { color }]}>{text}</Text></View>; }
export function Banner({ text, tone = 'info' }) { return <View style={[styles.banner, { backgroundColor: tone === 'danger' ? c.dangerSoft : tone === 'warn' ? c.warningSoft : c.soft }]}><Ionicons name={tone === 'danger' ? 'alert-circle-outline' : 'information-circle-outline'} size={18} color={tone === 'danger' ? c.danger : tone === 'warn' ? c.warning : c.primary} /><Text style={styles.bannerText}>{text}</Text></View>; }
export function ErrorBanner() { const { error, clearError } = useApp(); if (!error) return null; return <Pressable onPress={clearError} accessibilityRole="button" accessibilityLabel="오류 닫기"><Banner text={error} tone="danger" /></Pressable>; }
export function Empty({ title, body, icon = 'file-tray-outline' }) { return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={icon} size={28} color={c.primary} /></View><Text style={styles.emptyTitle}>{title}</Text>{body ? <Text style={styles.emptyText}>{body}</Text> : null}</View>; }
export function EquipmentImage({ model, style }) { const source = equipmentImages[model?.imageId]; return <View style={[styles.imageBox, style]}>{source ? <Image source={source} resizeMode="contain" style={styles.image} accessibilityLabel={`${model.name} 사진`} /> : <View style={styles.imageMissing}><Ionicons name="cube-outline" size={28} color={c.muted} /><Text numberOfLines={1} style={styles.imageMissingText}>모델 사진 없음</Text></View>}</View>; }
export function EquipmentRow({ model, onPress }) { return <Card onPress={onPress} accessibilityLabel={`${model.name} 상세 보기`} style={styles.equipmentRow}><EquipmentImage model={model} style={styles.rowImage} /><View style={styles.flex}><View style={styles.rowTop}><Text style={styles.rowCategory}>{model.category}</Text>{model.source === 'demo' ? <Pill text="예시" /> : null}</View><Text style={styles.equipmentName} numberOfLines={2}>{model.name}</Text><Text style={styles.rowMeta}>{model.rentalType === '장기' ? '6개월 장기 대여' : model.multiDay ? '여러 날 대여' : '당일 대여'} · {model.units.filter(x => x.condition === 'NORMAL').length}대 운영</Text></View><Ionicons name="chevron-forward" size={18} color={c.muted} /></Card>; }
const WEEKDAY = ['일','월','화','수','목','금','토'];
export function formatDay(value) { if (!value) return '-'; const d = new Date(value); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}(${WEEKDAY[d.getDay()]})`; }
export function formatTime(value) { if (!value) return '-'; const d = new Date(value); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
export function formatDate(value) { if (!value) return '-'; return `${formatDay(value)} ${formatTime(value)}`; }
// 장기 대여(한 달 넘는 기간)는 끝나는 시각이 방학·학기마다 달라 날짜만 보여 준다
export const isLongSpan = (start, end) => new Date(end) - new Date(start) > 30 * 86400000;
export function formatWhen(b, key) { return isLongSpan(b.start, b.end) ? formatDay(b[key]) : formatDate(b[key]); }
export function formatRange(start, end) { if (!start || !end) return '-'; if (isLongSpan(start, end)) return `${formatDay(start)} ~ ${formatDay(end)}`; const sameDay = new Date(start).toDateString() === new Date(end).toDateString(); return sameDay ? `${formatDay(start)} ${formatTime(start)} ~ ${formatTime(end)}` : `${formatDate(start)} ~ ${formatDate(end)}`; }
export function confirm(title, message, onConfirm) { Alert.alert(title, message, [{ text: '닫기', style: 'cancel' }, { text: '확인', onPress: onConfirm }]); }
export const statusLabel = { RESERVED: '예약', WAITING: '앞 사용자 반납 대기', RENTING: '대여 중', RETURNED: '반납 완료', CANCELLED: '취소', NO_SHOW: '미수령' };
export const statusTone = { RESERVED: 'neutral', WAITING: 'warn', RENTING: 'good', RETURNED: 'good', CANCELLED: 'muted', NO_SHOW: 'danger' };
// 대여 중인데 반납 시각이 지났으면 연체로 보여 준다
export const bookingStatus = b => b.status === 'RENTING' && new Date(b.end) <= new Date() ? { label: '연체', tone: 'danger' } : { label: statusLabel[b.status], tone: statusTone[b.status] };
const styles = StyleSheet.create({
  flex: { flex: 1 }, screenContent: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 16, backgroundColor: c.bg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' }, title: { fontSize: 28, fontWeight: '800', color: c.ink, letterSpacing: -0.6 }, subtitle: { fontSize: 14, color: c.muted, marginTop: 8, lineHeight: 20 },
  lead: { fontSize: 14, color: c.muted, lineHeight: 20 }, bell: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }, bellBadge: { position: 'absolute', top: -4, right: -6, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, backgroundColor: c.badge, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.bg }, bellBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' }, section: { gap: 12 }, sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { fontSize: 18, fontWeight: '700', color: c.ink },
  card: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12, shadowColor: c.primary, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  pressed: { opacity: 0.72 }, cardPressed: { backgroundColor: c.surfacePress, transform: [{ scale: 0.99 }] }, primaryPressed: { backgroundColor: c.primaryPress }, dangerPressed: { backgroundColor: c.dangerButtonPress }, softPressed: { backgroundColor: c.softPress }, button: { minHeight: 52, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: c.primary }, compactButton: { minHeight: 44, paddingVertical: 8 }, secondaryButton: { backgroundColor: c.soft }, dangerButton: { backgroundColor: c.dangerButton }, checkRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }, checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, checkCircleOn: { backgroundColor: c.success, borderColor: c.success }, checkText: { flex: 1, fontSize: 15, fontWeight: '600', color: c.ink }, quietButton: { backgroundColor: 'transparent' }, disabledButton: { backgroundColor: '#E2E8F0', borderColor: '#E2E8F0' }, buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 }, secondaryButtonText: { color: c.primary }, disabledText: { color: '#64748B' }, buttonIcon: { marginRight: 8 },
  segmented: { flexDirection: 'row', backgroundColor: c.soft, borderRadius: 12, padding: 4 }, segmentThumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 9, backgroundColor: c.surface, shadowColor: c.primary, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9 }, segmentPressed: { backgroundColor: c.tintPress }, segmentText: { fontSize: 14, fontWeight: '700', color: c.muted }, segmentTextOn: { color: c.primary },
  collapseInner: { position: 'absolute', top: 0, left: 0, right: 0 },
  moreToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  moreText: { fontSize: 14, fontWeight: '600', color: c.muted },
  idPickWrap: { gap: 8 },
  idPick: { width: '100%', aspectRatio: 16 / 10, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.surface },
  idPickEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.primary, backgroundColor: c.soft },
  idPickImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  idPickTitle: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: c.ink, textAlign: 'center' },
  idPickMeta: { fontSize: 13, color: c.muted, textAlign: 'center' },
  idPickRetake: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: 'rgba(15,23,42,0.7)' },
  idPickRetakeText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  chip: { height: 34, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 17, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }, chipOn: { backgroundColor: c.primary, borderColor: c.primary }, chipPressed: { opacity: 0.8 }, chipText: { fontSize: 14, fontWeight: '500', color: c.ink }, chipTextOn: { color: c.surface, fontWeight: '600' },
  listCard: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: 'hidden', shadowColor: c.primary, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, listLine: { height: 1, backgroundColor: c.border, marginHorizontal: 16 },
  switchRow: { gap: 12 },
  switchTrack: { width: 51, height: 31, borderRadius: 15.5, padding: 2 },
  switchThumb: { width: 27, height: 27, borderRadius: 13.5, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  linkRow: { minHeight: 56, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }, linkTitle: { color: c.ink, fontSize: 15, fontWeight: '600' }, linkSubtitle: { color: c.muted, fontSize: 12, marginTop: 4 },
  fieldWrap: { gap: 8 }, fieldLabel: { fontSize: 13, fontWeight: '700', color: c.ink }, fieldNote: { fontSize: 13, fontWeight: '700', color: c.warning }, field: { fontFamily: FONT.regular, minHeight: 52, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.surface, paddingHorizontal: 14, fontSize: 15, color: c.ink }, multiline: { minHeight: 112, paddingTop: 14 },
  timeField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, timeValue: { fontSize: 15, color: c.ink }, timeHint: { color: '#94A3B8' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' }, sheetBack: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, gap: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: c.ink }, sheetCols: { flexDirection: 'row', gap: 12 }, sheetCol: { flex: 1, gap: 8 },
  sheetColLabel: { fontSize: 13, fontWeight: '700', color: c.muted }, sheetScroll: { height: 220, borderWidth: 1, borderColor: c.border, borderRadius: 12 },
  timeRow: { height: 44, alignItems: 'center', justifyContent: 'center' }, timeRowOn: { backgroundColor: c.soft }, timeRowText: { fontSize: 15, color: c.ink }, timeRowTextOn: { color: c.primary, fontWeight: '700' }, timeRowOff: { opacity: 0.3 }, dateHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, dateArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, dateGrid: { flexDirection: 'row', flexWrap: 'wrap' }, dateWeek: { width: '14.285%', textAlign: 'center', color: c.muted, fontSize: 12, marginBottom: 8 }, dateCell: { width: '14.285%', height: 44, alignItems: 'center', justifyContent: 'center' }, dateDay: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, dateDayOn: { backgroundColor: c.primary }, dateText: { fontSize: 13, color: c.ink }, dateTextOff: { color: '#CBD5E1' }, dateTextOn: { color: '#fff', fontWeight: '700' }, toastWrap: { position: 'absolute', top: 12, left: 16, right: 16, alignItems: 'center', zIndex: 1000 }, toast: { backgroundColor: 'rgba(15,23,42,0.92)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, maxWidth: 360 }, toastText: { color: '#fff', fontSize: 14, lineHeight: 20, textAlign: 'left', fontWeight: '600' },
  fieldDisabled: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', color: '#94A3B8' },
  selectScroll: { maxHeight: 269, borderWidth: 1, borderColor: c.border, borderRadius: 12 }, selectRow: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 6, gap: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: c.border }, selectRowOn: { backgroundColor: c.soft }, selectText: { fontSize: 15, color: c.ink }, selectMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }, selectThumb: { width: 40, height: 40, borderRadius: 8 }, selectThumbLg: { width: 64, height: 64, borderRadius: 12 }, selectRowLg: { paddingVertical: 12 }, selectRowLast: { borderBottomWidth: 0 }, selectTitle: { fontSize: 16, fontWeight: '700', color: c.ink, marginTop: 2 }, flexShrink: { flexShrink: 1 }, selectTextOn: { color: c.primary, fontWeight: '700' },
  sheetNote: { fontSize: 14, color: c.muted, textAlign: 'center' }, sheetWarn: { color: c.danger }, sheetActions: { flexDirection: 'row', gap: 12 },
  scanRoot: { flex: 1, backgroundColor: '#0F172A' }, scanBar: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scanTitle: { color: '#fff', fontSize: 17, fontWeight: '700' }, scanFrameWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' }, scanFrameQr: { width: 240, height: 240, borderRadius: 20 }, scanFrameBar: { width: 310, height: 120, borderRadius: 14 },
  scanAsk: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 }, scanAskText: { color: '#fff', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  scanFoot: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, gap: 16, alignItems: 'center' }, scanModes: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, padding: 4 }, scanMode: { minHeight: 44, minWidth: 110, paddingHorizontal: 16, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, scanModeOn: { backgroundColor: '#fff' }, scanModeText: { color: '#fff', fontSize: 15, fontWeight: '700' }, scanModeTextOn: { color: c.ink }, scanHintText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' }, pillText: { fontSize: 13, fontWeight: '700' }, banner: { padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'flex-start' }, bannerText: { color: c.ink, lineHeight: 20, marginLeft: 8, flex: 1, fontSize: 13 },
  empty: { paddingVertical: 32, alignItems: 'center' }, emptyIcon: { width: 56, height: 56, backgroundColor: c.soft, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, emptyTitle: { fontSize: 16, fontWeight: '700', color: c.ink }, emptyText: { fontSize: 13, color: c.muted, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  imageBox: { backgroundColor: '#F1F5F9', borderRadius: 12, overflow: 'hidden' }, image: { width: '100%', height: '100%' }, imageMissing: { flex: 1, alignItems: 'center', justifyContent: 'center' }, imageMissingText: { color: c.muted, fontSize: 12, marginTop: 4, paddingHorizontal: 4 },
  equipmentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }, rowImage: { width: 72, height: 72 }, rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, rowCategory: { fontSize: 12, color: c.primary, fontWeight: '700' }, equipmentName: { fontSize: 15, color: c.ink, fontWeight: '700', marginTop: 4 }, rowMeta: { fontSize: 12, color: c.muted, marginTop: 4 },
});
