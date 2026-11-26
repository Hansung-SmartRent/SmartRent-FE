// 학생증 맞추기: 고른 사진을 학생이 직접 옮기고 확대·축소해서 카드 틀에 맞춘 뒤 틀 안만 잘라 낸다.
// 실물 학생증과 헤이영 캡처 모두 같은 틀(가로 16:10)로 잘라서 업로드 칸·관리자 화면에 같은 크기로 보인다.
import React from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { AppModal } from './Portal';
import { colors as c } from './tokens';

export const ID_RATIO = 16 / 10; // 틀 비율. 업로드 칸(16:10)과 같다
const MIN_OUT_WIDTH = 600; // 잘린 결과가 이보다 좁아지면 글자가 흐려져서 더 확대하지 못하게 한다
const MAX_OUT_WIDTH = 1000;

function clamp(v, lo, hi) { 'worklet'; return Math.min(Math.max(v, lo), hi); }

export function StudentIdCropper({ asset, onCancel, onDone, Text }) {
  const inset = useSafeAreaInsets();
  const [stage, setStage] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const iw = asset?.width || 1, ih = asset?.height || 1;
  const F = Math.max(0, stage - 48), H = F / ID_RATIO; // 틀 너비·높이
  const base = Math.max(F / iw, H / ih); // 확대 1배 = 사진이 틀을 꽉 채우는 크기
  const zMin = Math.min(F / iw, H / ih) / base; // 사진 전체가 틀 안에 들어오는 크기까지 줄일 수 있다(헤이영처럼 세로로 긴 캡처)
  const zMax = Math.max(1, Math.min(4, F / (base * MIN_OUT_WIDTH)));
  const tall = ih / iw > H / F; // 세로로 긴 사진은 위쪽(이름·학번·얼굴)부터 보여 준다
  const z = useSharedValue(1), tx = useSharedValue(0), ty = useSharedValue(0);
  const sz = useSharedValue(1), stx = useSharedValue(0), sty = useSharedValue(0);
  // 틀보다 작아진 방향은 가운데에 고정한다(남는 칸은 흰색으로 보이고, 결과도 같은 모습으로 보인다)
  const limitX = s => { 'worklet'; return Math.max(0, (iw * base * s - F) / 2); };
  const limitY = s => { 'worklet'; return Math.max(0, (ih * base * s - H) / 2); };
  React.useEffect(() => { z.value = 1; tx.value = 0; ty.value = tall ? limitY(1) : 0; }, [asset?.uri, stage]);
  const pan = Gesture.Pan().onStart(() => { stx.value = tx.value; sty.value = ty.value; }).onUpdate(e => {
    tx.value = clamp(stx.value + e.translationX, -limitX(z.value), limitX(z.value));
    ty.value = clamp(sty.value + e.translationY, -limitY(z.value), limitY(z.value));
  });
  const pinch = Gesture.Pinch().onStart(() => { sz.value = z.value; }).onUpdate(e => {
    z.value = clamp(sz.value * e.scale, zMin, zMax);
    tx.value = clamp(tx.value, -limitX(z.value), limitX(z.value));
    ty.value = clamp(ty.value, -limitY(z.value), limitY(z.value));
  });
  const gesture = Gesture.Simultaneous(pan, pinch);
  const imageStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: z.value }] }));
  // 손가락 확대가 어려운 경우(웹 마우스, 접근성)를 위해 버튼으로도 확대·축소
  const zoomBy = k => { const next = clamp(z.value * k, zMin, zMax); z.value = withTiming(next, { duration: 180 }); tx.value = withTiming(clamp(tx.value, -limitX(next), limitX(next)), { duration: 180 }); ty.value = withTiming(clamp(ty.value, -limitY(next), limitY(next)), { duration: 180 }); };
  if (!asset) return null;
  const done = async () => {
    if (busy || !F) return;
    setBusy(true);
    try {
      // 틀 안에 보이는 부분 중 사진이 있는 곳만 자른다
      const S = base * z.value;
      const width = Math.min(iw, F / S), height = Math.min(ih, H / S);
      const originX = clamp(iw / 2 - (tx.value + F / 2) / S, 0, iw - width), originY = clamp(ih / 2 - (ty.value + H / 2) / S, 0, ih - height);
      const ctx = ImageManipulator.manipulate(asset.uri).crop({ originX: Math.round(originX), originY: Math.round(originY), width: Math.round(width), height: Math.round(height) });
      if (width > MAX_OUT_WIDTH) ctx.resize({ width: MAX_OUT_WIDTH });
      const image = await ctx.renderAsync();
      const web = Platform.OS === 'web';
      const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: web });
      onDone(web && out.base64 ? `data:image/jpeg;base64,${out.base64}` : out.uri); // 웹의 blob 주소는 새로고침하면 사라져서 사진 자체를 담아 둔다
    } catch (e) {
      Alert.alert('사진을 자르지 못했습니다', '다른 사진을 골라 주세요.');
    } finally { setBusy(false); }
  };
  return <AppModal visible={!!asset} animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.bar}>
        <Text style={styles.title}>학생증 맞추기</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" hitSlop={12} onPress={onCancel} style={({ pressed }) => pressed && { opacity: 0.6 }}><Ionicons name="close" size={26} color="#fff" /></Pressable>
      </View>
      <View style={styles.examples}>
        <Example Text={Text} kind="card" label="실물 학생증" note="카드 전체가 들어오게" />
        <Example Text={Text} kind="heyoung" label="헤이영 전자학생증" note="이름·학번·얼굴 부분만" />
      </View>
      <View style={styles.stage} onLayout={e => setStage(e.nativeEvent.layout.width)}>
        {F ? <GestureDetector gesture={gesture}>
          <View style={[styles.stageInner, { height: H + 120 }]}>
            <View style={[styles.paper, { width: F, height: H, left: 24, top: 60 }]} />
            <Animated.View style={[{ width: iw * base, height: ih * base }, imageStyle]}>
              <Image source={{ uri: asset.uri }} style={styles.fill} resizeMode="cover" accessibilityLabel="고른 사진" />
            </Animated.View>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={[styles.mask, { height: 60 }]} />
              <View style={{ flexDirection: 'row', height: H }}>
                <View style={[styles.mask, { width: 24 }]} />
                <View style={[styles.frame, { width: F, height: H }]} />
                <View style={[styles.mask, { width: 24 }]} />
              </View>
              <View style={[styles.mask, { flex: 1 }]} />
            </View>
          </View>
        </GestureDetector> : null}
      </View>
      <View style={styles.guide}>
        <Text style={styles.guideTitle}>학생증이 틀 안에 들어오게 맞춰 주세요</Text>
        <Text style={styles.guideMeta}>끌어서 옮기고 두 손가락이나 아래 버튼으로 확대·축소합니다</Text>
        <View style={styles.zoomRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="축소" onPress={() => zoomBy(1 / 1.25)} style={({ pressed }) => [styles.zoomBtn, pressed && { opacity: 0.6 }]}><Ionicons name="remove" size={22} color="#fff" /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="확대" onPress={() => zoomBy(1.25)} style={({ pressed }) => [styles.zoomBtn, pressed && { opacity: 0.6 }]}><Ionicons name="add" size={22} color="#fff" /></Pressable>
        </View>
      </View>
      <View style={[styles.foot, { paddingBottom: Math.max(24, inset.bottom + 8) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="다른 사진 고르기" onPress={onCancel} style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && { opacity: 0.7 }]}><Text style={styles.btnGhostText}>취소</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="이대로 자르기" accessibilityState={{ disabled: busy }} disabled={busy} onPress={done} style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && { backgroundColor: c.primaryPress }]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>완료</Text>}</Pressable>
      </View>
    </GestureHandlerRootView>
  </AppModal>;
}

// 어느 부분을 틀에 넣는지 보여 주는 작은 예시 그림
function Example({ kind, label, note, Text }) {
  return <View style={styles.example} accessible accessibilityLabel={`${label} 예시: ${note}`}>
    <View style={styles.exampleArt}>
      {kind === 'card'
        ? <View style={styles.miniCard}><View style={styles.miniPhoto} /><View style={styles.miniLines}><View style={[styles.miniLine, { width: 30 }]} /><View style={[styles.miniLine, { width: 22 }]} /><View style={[styles.miniLine, { width: 26 }]} /></View></View>
        : <View>
            {/* 헤이영 화면: 파란 윗부분(이름·학번), 얼굴, 아래 QR. 틀은 윗부분(이름·학번·얼굴)에만 */}
            <View style={styles.miniPhone}>
              <View style={styles.miniHead}><View style={styles.miniName} /></View>
              <View style={styles.miniAvatar} />
              <View style={styles.miniQr} />
            </View>
            <View style={styles.miniPick} />
          </View>}
    </View>
    <Text style={styles.exampleLabel}>{label}</Text>
    <Text style={styles.exampleNote}>{note}</Text>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  bar: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  examples: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 8 },
  example: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  exampleArt: { height: 74, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  exampleLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  exampleNote: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  miniCard: { width: 72, height: 45, borderRadius: 5, backgroundColor: '#F8FAFC', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 7, borderWidth: 2, borderColor: '#A5B4FC' },
  miniPhoto: { width: 20, height: 26, borderRadius: 3, backgroundColor: '#CBD5E1' },
  miniLines: { gap: 4 },
  miniLine: { height: 4, borderRadius: 2, backgroundColor: '#94A3B8' },
  miniPhone: { width: 40, height: 70, borderRadius: 7, backgroundColor: '#F4F5FB', overflow: 'hidden', alignItems: 'center' },
  miniHead: { alignSelf: 'stretch', height: 25, backgroundColor: '#2F5FD0', alignItems: 'center', paddingTop: 8 },
  miniName: { width: 22, height: 3, borderRadius: 2, backgroundColor: '#fff' },
  miniAvatar: { position: 'absolute', top: 18, width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: '#fff', backgroundColor: '#D1D5DB' },
  miniQr: { marginTop: 17, width: 15, height: 15, borderRadius: 2, backgroundColor: '#CBD2DA' },
  miniPick: { position: 'absolute', top: -3, left: -4, right: -4, height: 38, borderRadius: 5, borderWidth: 2, borderColor: '#A5B4FC' },
  stage: { width: '100%' },
  stageInner: { width: '100%', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
  paper: { position: 'absolute', backgroundColor: '#fff', borderRadius: 12 },
  mask: { backgroundColor: 'rgba(15,23,42,0.72)' },
  frame: { borderWidth: 2, borderColor: '#fff', borderRadius: 12 },
  guide: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, gap: 6 },
  guideTitle: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  guideMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  zoomRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  zoomBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  foot: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  btn: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.14)' },
  btnGhostText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnPrimary: { backgroundColor: c.primary },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
