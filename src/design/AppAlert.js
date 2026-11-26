// 웹 안내창: 웹에서는 Alert.alert가 아무것도 띄우지 않아서, 아이폰 안내창 모양으로 기기 화면 안에 직접 그린다.
// 휴대폰은 각 기기 기본 안내창(iOS는 iOS 창, 안드로이드는 안드로이드 창)을 그대로 쓴다.
import React from 'react';
import { Alert, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { FONT } from './fonts';

const queue = []; const listeners = new Set();
const emit = () => listeners.forEach(fn => fn([...queue]));
if (Platform.OS === 'web') Alert.alert = (title, message, buttons) => { queue.push({ title, message, buttons: buttons || [] }); emit(); };

export function AlertHost() {
  if (Platform.OS !== 'web') return null;
  return <WebAlert />;
}
function WebAlert() {
  const [items, setItems] = React.useState([]);
  const a = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => { listeners.add(setItems); return () => { listeners.delete(setItems); }; }, []);
  const current = items[0];
  React.useEffect(() => { if (current) { a.setValue(0); Animated.timing(a, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); } }, [current]);
  if (!current) return null;
  const list = current.buttons.length ? current.buttons : [{ text: '확인' }];
  const cancel = list.find(b => b.style === 'cancel');
  // 아이폰 규칙: 버튼 2개면 취소를 왼쪽에, 3개 이상이면 세로로 쌓고 취소를 맨 아래에 둔다.
  const ordered = list.length === 2 ? (cancel ? [cancel, ...list.filter(b => b !== cancel)] : list) : (cancel ? [...list.filter(b => b !== cancel), cancel] : list);
  const row = ordered.length === 2;
  const press = b => Animated.timing(a, { toValue: 0, duration: 150, useNativeDriver: false }).start(() => { queue.shift(); emit(); b?.onPress?.(); });
  return <Animated.View style={[st.back, { opacity: a }]}>
    <Animated.View style={[st.box, { transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1] }) }] }]}>
      <View style={st.body}>{current.title ? <Text style={st.title} lineBreakStrategyIOS="hangul-word">{current.title}</Text> : null}{current.message ? <Text style={st.message} lineBreakStrategyIOS="hangul-word">{current.message}</Text> : null}</View>
      <View style={row ? st.rowButtons : null}>{ordered.map((b, i) => <Pressable key={i} accessibilityRole="button" onPress={() => press(b)} style={({ pressed }) => [st.button, row && st.rowButton, row && i > 0 && st.rowDivider, pressed && st.pressed]}><Text style={[st.buttonText, b.style === 'cancel' && st.cancelText, b.style === 'destructive' && st.destructiveText]}>{b.text}</Text></Pressable>)}</View>
    </Animated.View>
  </Animated.View>;
}

const st = StyleSheet.create({
  back: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 2500 },
  box: { width: 270, borderRadius: 14, backgroundColor: 'rgba(242,242,247,0.98)', overflow: 'hidden' },
  body: { paddingTop: 19, paddingBottom: 17, paddingHorizontal: 16, gap: 4 },
  title: { fontSize: 17, fontFamily: FONT.medium, color: '#000', textAlign: 'center', lineHeight: 22, letterSpacing: -0.41, wordBreak: 'keep-all' },
  message: { fontSize: 13, fontFamily: FONT.regular, color: '#000', textAlign: 'center', lineHeight: 18, letterSpacing: -0.08, wordBreak: 'keep-all' },
  rowButtons: { flexDirection: 'row' },
  button: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(60,60,67,0.29)', paddingHorizontal: 8 },
  rowButton: { flex: 1 },
  rowDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(60,60,67,0.29)' },
  pressed: { backgroundColor: 'rgba(0,0,0,0.06)' },
  buttonText: { fontSize: 17, fontFamily: FONT.regular, lineHeight: 22, color: '#007AFF', textAlign: 'center', letterSpacing: -0.41 },
  cancelText: { fontFamily: FONT.medium },
  destructiveText: { color: '#FF3B30' },
});
