import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Keyboard, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, EquipmentImage, ErrorBanner, Text } from '../design/components';
import { colors as c } from '../design/tokens';
import { FONT } from '../design/fonts';
import { useApp } from '../state/AppProvider';

// 아바타는 가운데 로봇 그림을 동그라미 안에 얼굴이 보이게 넣은 것(날아간 로봇이 도착한 모습과 같다).
const AVATAR = 32; const CROP = { width: 44, height: 37, left: -6, top: 1 };
const heroImage = require('../assets/brand/assistant-upper.png');
const keywords = [['노트북','노트북'],['영상','카메라'],['촬영','카메라'],['사진','카메라'],['3d','3D 프린터'],['출력','3D 프린터'],['모델링','3D 프린터'],['가공','레이저 커팅기'],['절단','레이저 커팅기'],['vr','VR/AR/기타'],['가상','VR/AR/기타'],['모니터','모니터'],['발표','모니터'],['스캔','3D 스캐너']];
const EXAMPLES = ['졸업 작품 영상을 찍고 싶어요', '3D로 시제품을 뽑아야 해요', '발표용 보조 화면이 필요해요'];

function Appear({ children, delay = 0, style }) {
  const value = useRef(new Animated.Value(0)).current;
  const first = useRef(delay).current;
  useEffect(() => { Animated.timing(value, { toValue: 1, duration: 260, delay: first, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [value, first]);
  return <Animated.View style={[style, { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>{children}</Animated.View>;
}

function TypingBubble() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const loops = dots.map((d, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 140),
      Animated.timing(d, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(d, { toValue: 0.3, duration: 320, useNativeDriver: true }),
      Animated.delay((2 - i) * 140),
    ])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return <View style={s.typing}>{dots.map((d, i) => <Animated.View key={i} style={[s.dot, { opacity: d }]} />)}</View>;
}

export default function AssistantScreen({ navigation }) {
  const { state } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scroller = useRef(null); const field = useRef(null);
  // 첫 질문을 보내면 가운데 로봇이 작아지면서 첫 답변 아바타 자리로 날아간다.
  const rootRef = useRef(null); const heroRef = useRef(null); const avatarRef = useRef(null);
  const [fly, setFly] = useState(null);
  const flyP = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  // 입력칸을 누르는 순간 바로 밀어 올리고, 키보드 높이를 알게 되면 그 값으로 맞춘다.
  const shift = useRef(new Animated.Value(0)).current;
  const lastHeight = useRef(336);
  const KEYBOARD_GAP = 0; // 키보드에 딱 붙인다
  const [keyboardUp, setKeyboardUp] = useState(false);
  const move = (to, duration) => Animated.timing(shift, { toValue: to, duration: duration || 250, easing: Easing.bezier(0.38, 0.7, 0.125, 1), useNativeDriver: true }).start();
  const liftNow = () => { if (Platform.OS !== 'ios') return; setKeyboardUp(true); move(-(lastHeight.current + KEYBOARD_GAP), 250); };
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    // 한글 키보드는 추천 단어 줄이 나중에 붙어서 높이가 한 번 더 커진다. 바뀔 때마다 다시 맞춘다.
    const apply = e => {
      const height = e.endCoordinates?.height || 0;
      if (height <= 0) return;
      lastHeight.current = height;
      setKeyboardUp(true);
      move(-(height + KEYBOARD_GAP), e.duration);
    };
    const show = Keyboard.addListener('keyboardWillShow', e => { apply(e); setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), e.duration || 250); });
    const change = Keyboard.addListener('keyboardWillChangeFrame', e => { if (Keyboard.isVisible?.() !== false) apply(e); });
    const did = Keyboard.addListener('keyboardDidShow', e => apply({ ...e, duration: 120 }));
    const hide = Keyboard.addListener('keyboardWillHide', e => { setKeyboardUp(false); move(0, e.duration); });
    return () => { show.remove(); change.remove(); did.remove(); hide.remove(); };
  }, [insets.bottom, shift]);

  const ask = () => {
    const question = input.trim();
    if (!question) return;
    if (messages.length === 0 && heroRef.current && rootRef.current) {
      rootRef.current.measureInWindow((rx, ry, rw) => heroRef.current?.measureInWindow((x, y, w, h) => { flyP.setValue(0); setFly({ ...toLocal(rx, ry, rw, x, y, w, h), to: null }); send(question); }));
      return;
    }
    send(question);
  };
  // 화면에서 잰 위치를 이 화면 안 좌표로 바꾼다. 웹에서 폰 틀이 확대·축소돼 있으면 잰 값이 그 배율만큼 달라서 나눠 준다(휴대폰은 배율 1)
  const rootWidth = useRef(0);
  const toLocal = (rx, ry, rw, x, y, w, h) => { const r = rootWidth.current && rw ? rw / rootWidth.current : 1; return { x: (x - rx) / r, y: (y - ry) / r, w: w / r, h: h / r }; };
  const landAvatar = () => {
    if (!fly || fly.to || !avatarRef.current || !rootRef.current) return;
    rootRef.current.measureInWindow((rx, ry, rw) => avatarRef.current?.measureInWindow((x, y, w, h) => {
      setFly(f => f && { ...f, to: toLocal(rx, ry, rw, x, y, w, h) });
      Animated.timing(flyP, { toValue: 1, duration: 520, easing: Easing.bezier(0.33, 0, 0.2, 1), useNativeDriver: false }).start(() => setFly(null));
    }));
  };
  const send = (question) => {
    const q = question.toLowerCase();
    const matched = keywords.filter(([k]) => q.includes(k)).map(([, v]) => v);
    const ranked = state.models.filter(m => !m.archived && matched.some(word => `${m.category} ${m.name} ${m.purpose}`.includes(word))).slice(0, 3);
    const picked = ranked.length ? ranked : state.models.filter(m => !m.archived).slice(13, 16);
    const answer = ranked.length
      ? `“${matched[0]}” 쪽으로 보고 ${picked.length}가지를 골랐습니다.\n눌러서 자세히 볼 수 있습니다.`
      : '말씀하신 내용과 딱 맞는 기자재를 찾지 못해서,\n많이 찾는 기자재를 보여 드릴게요.';
    setMessages(prev => [...prev, { role: 'me', text: question, models: [] }]);
    setInput('');
    setTyping(true);
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { role: 'bot', text: answer, models: picked }]);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    }, 700);
  };

  // 날아가는 로봇: 위치·크기·동그라미·배경색이 함께 바뀌고, 도착한 모습이 아바타와 똑같아서 그대로 붙는다.
  const flyParts = fly && (() => { const to = fly.to || fly, p = (a, b) => flyP.interpolate({ inputRange: [0, 1], outputRange: [a, b] }), end = !!fly.to;
    return { box: { left: p(fly.x, to.x), top: p(fly.y, to.y), width: p(fly.w, end ? AVATAR : fly.w), height: p(fly.h, end ? AVATAR : fly.h), borderRadius: p(0, end ? AVATAR / 2 : 0), backgroundColor: flyP.interpolate({ inputRange: [0, 1], outputRange: ['rgba(238,242,255,0)', end ? c.soft : 'rgba(238,242,255,0)'] }) },
      img: { width: p(fly.w, end ? CROP.width : fly.w), height: p(fly.h, end ? CROP.height : fly.h), left: p(0, end ? CROP.left : 0), top: p(0, end ? CROP.top : 0) } }; })();
  return <Animated.View ref={rootRef} collapsable={false} onLayout={e => { rootWidth.current = e.nativeEvent.layout.width; }} style={[s.root, { transform: [{ translateY: shift }] }]}>
    <ErrorBanner />
    <ScrollView ref={scroller} style={s.flex} contentContainerStyle={[s.thread, messages.length === 0 ? s.threadEmpty : s.threadChat]} keyboardShouldPersistTaps="handled">
      {messages.length === 0
        ? <View style={s.intro}>
            <Image ref={heroRef} source={heroImage} style={s.hero} resizeMode="contain" accessible={false} />
            <Text style={s.introTitle}>어떤 작업에 쓸 기자재를 찾으시나요?</Text>
            <Text style={s.introBody}>하시려는 일을 적어 주시면 맞는 기자재를 골라 드릴게요.</Text>
            <View style={s.chips}>{EXAMPLES.map(x => <Pressable key={x} accessibilityRole="button" onPress={() => setInput(x)} android_ripple={{ color: c.softPress }} style={({ pressed }) => [s.chip, pressed && { backgroundColor: c.softPress }]}><Text style={s.chipText}>{x}</Text></Pressable>)}</View>
          </View>
        : messages.map((m, i) => {
            const mine = m.role === 'me';
            const firstOfRun = !mine && (i === 0 || messages[i - 1].role !== 'bot');
            const Wrap = mine ? Appear : View;
            return <Wrap key={i} style={[s.turn, mine && s.turnMine]}>
              <View style={[s.line, mine && s.lineMine]}>
                {!mine ? (firstOfRun
                  ? <Animated.View ref={i === 1 ? avatarRef : undefined} style={[s.avatar, i === 1 && fly && { opacity: 0 }]}><Image source={heroImage} style={s.avatarImage} resizeMode="contain" accessible={false} /></Animated.View>
                  : <View style={s.avatarGap} />) : null}
                <Appear style={s.bubbleWrap}><View style={[s.bubble, mine ? s.bubbleMine : s.bubbleBot]}><Text lineBreakStrategyIOS={mine ? 'none' : 'hangul-word'} textBreakStrategy={mine ? 'simple' : 'balanced'} style={[s.bubbleText, mine && s.bubbleTextMine]}>{m.text}</Text></View></Appear>
              </View>
              {m.models.map((model, mi) => <Appear key={model.id} delay={120 + mi * 90} style={s.pickWrap}><Card style={s.pick} onPress={() => navigation.navigate('Detail', { modelId: model.id })} accessibilityLabel={`${model.name} 상세 보기`}>
                <EquipmentImage model={model} style={s.pickImage} />
                <View style={s.flex}><Text style={s.pickCategory}>{model.category}</Text><Text style={s.pickName} numberOfLines={2}>{model.name}</Text><Text style={s.pickMeta} numberOfLines={2}>{model.purpose}</Text></View>
                <Ionicons name="chevron-forward" size={18} color={c.muted} />
              </Card></Appear>)}
            </Wrap>;
          })}
      {typing ? <View style={s.turn}><View style={s.line}>{messages.some(m => m.role === 'bot') ? <View style={s.avatar}><Image source={heroImage} style={s.avatarImage} resizeMode="contain" accessible={false} /></View> : <Animated.View ref={avatarRef} onLayout={() => setTimeout(landAvatar, 0)} style={[s.avatar, fly && { opacity: 0 }]}><Image source={heroImage} style={s.avatarImage} resizeMode="contain" accessible={false} /></Animated.View>}<Appear style={s.bubbleWrap} delay={fly ? 260 : 0}><View style={[s.bubble, s.bubbleBot]}><TypingBubble /></View></Appear></View></View> : null}
    </ScrollView>
    <View style={[s.composer, { paddingBottom: keyboardUp ? 6 : Math.max(insets.bottom - 8, 8) }]}>
      <View style={s.inputRow}>
        <Pressable style={s.inputBox} accessibilityRole="none" onPress={() => field.current?.focus()}><TextInput ref={field} style={s.input} value={input} onChangeText={setInput} onFocus={() => { liftNow(); setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 120); }} placeholder="하시려는 작업을 적어 주세요" placeholderTextColor={c.muted} maxLength={200} multiline {...(Platform.OS === 'web' ? { rows: 1 } : {})} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="질문 보내기" onPress={() => ask()} android_ripple={{ color: 'rgba(255,255,255,0.24)', borderless: true }} style={({ pressed }) => [s.send, pressed && { backgroundColor: c.primaryPress }]}><Ionicons name="arrow-up" size={20} color="#fff" /></Pressable>
      </View>
      <Text style={s.left}>{input.length}/200자</Text>
    </View>
    {fly ? <Animated.View pointerEvents="none" style={[s.flyer, flyParts.box]}><Animated.Image source={heroImage} resizeMode="contain" accessible={false} style={[s.flyerImg, flyParts.img]} /></Animated.View> : null}
  </Animated.View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, overflow: 'hidden' }, flex: { flex: 1 },
  thread: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 12 },
  threadEmpty: { justifyContent: 'center' },
  // 대화가 시작되면 위에서부터 쌓는다. 답변이 길어져도 아래로만 늘어나서 아바타 자리가 움직이지 않는다.
  threadChat: { justifyContent: 'flex-start' },
  intro: { alignItems: 'center' },
  hero: { width: 210, height: 176 },
  flyer: { position: 'absolute', overflow: 'hidden' },
  flyerImg: { position: 'absolute' },
  introTitle: { fontSize: 18, fontWeight: '800', color: c.ink, marginTop: 8, textAlign: 'center' },
  introBody: { fontSize: 13, color: c.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  chips: { marginTop: 20, gap: 8, alignSelf: 'stretch' },
  chip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 16 },
  chipText: { fontSize: 13, color: c.ink },
  turn: { alignSelf: 'stretch', alignItems: 'flex-start' }, turnMine: { alignItems: 'flex-end' },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, alignSelf: 'stretch' },
  lineMine: { justifyContent: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { position: 'absolute', ...CROP },
  avatarGap: { width: 32 },
  bubbleWrap: { flexShrink: 1, maxWidth: '84%' },
  bubble: { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16 },
  bubbleBot: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderTopLeftRadius: 4 },
  bubbleMine: { backgroundColor: c.primary, borderTopRightRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 21, color: c.ink }, bubbleTextMine: { color: '#fff' },
  pickWrap: { alignSelf: 'stretch' },
  typing: { flexDirection: 'row', gap: 5, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.muted },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, marginTop: 8, marginLeft: 40, alignSelf: 'stretch' },
  pickImage: { width: 58, height: 58 },
  pickCategory: { fontSize: 12, color: c.primary, fontWeight: '700' },
  pickName: { fontSize: 15, fontWeight: '700', color: c.ink, marginTop: 2 },
  pickMeta: { fontSize: 12, color: c.muted, marginTop: 4 },
  composer: { borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, paddingHorizontal: 20, paddingTop: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputBox: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 14, backgroundColor: c.bg, paddingHorizontal: 12, paddingVertical: 8 },
  input: { fontFamily: FONT.regular, fontSize: 14, lineHeight: 20, color: c.ink, maxHeight: 110, paddingTop: 0, paddingBottom: 0 },
  left: { fontSize: 12, color: c.muted, marginTop: 8 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
});
