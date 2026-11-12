import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, EquipmentImage, ScanSheet, Screen, Section, Sheet, Title, Text, useToast } from '../design/components';
import { colors as c } from '../design/tokens';
import { FONT } from '../design/fonts';
import { useApp } from '../state/AppProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ScanScreen({ navigation, route }) {
  const { state } = useApp();
  const [query, setQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);
  const insets = useSafeAreaInsets();
  const { toast, show } = useToast({ top: insets.top + 12 }); // 탭 화면은 머리 막대가 없어서 상태 표시줄 아래에 띄운다
  useEffect(() => { if (route?.params?.scan) setScanning(true); }, [route?.params?.scan]);
  const shoot = async from => { setPhotoSheet(false); await new Promise(r => setTimeout(r, 350)); try { if (from === 'camera' && Platform.OS === 'web') { Alert.alert('카메라를 열 수 없습니다', '카메라는 휴대폰 앱에서 사용할 수 있습니다. 웹에서는 갤러리에서 사진을 선택해 주세요.'); return; } if (from === 'camera') { const perm = await ImagePicker.requestCameraPermissionsAsync(); if (!perm.granted) { Alert.alert('카메라 권한이 필요합니다', '설정에서 카메라 사용을 허용해 주세요.'); return; } } const opts = { mediaTypes: ['images'], quality: 0.7 }; const res = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts); if (!res.canceled && res.assets?.[0]?.uri) { const uri = res.assets[0].uri; if (photoMatches(state.models, uri).length) navigation.navigate('PhotoResult', { uri }); else show('사진과 맞는 기자재를 찾지 못했습니다. 기자재가 화면 가운데에 크게 나오도록 다시 찍어 주세요.'); } } catch (e) { Alert.alert(from === 'camera' ? '카메라를 열 수 없습니다' : '사진을 불러올 수 없습니다', from === 'camera' ? '이 기기에서는 카메라를 쓸 수 없습니다. 앨범에서 골라 주세요.' : String(e?.message || e)); } };
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const usable = state.models.filter(m => !m.archived);
    const byName = usable.filter(m => m.name.toLowerCase().includes(q));
    const byCategory = usable.filter(m => !byName.includes(m) && m.category.toLowerCase().includes(q));
    return [...byName, ...byCategory];
  }, [state.models, query]);
  const open = model => { setQuery(''); navigation.navigate('Detail', { modelId: model.id }); };
  const fromCode = value => {
    const v = String(value).trim().toLowerCase();
    const model = state.models.find(m => !m.archived && m.units.some(u => u.id.toLowerCase() === v)) || state.models.find(m => !m.archived && (m.id.toLowerCase() === v || m.name.toLowerCase() === v));
    setScanning(false);
    if (model) open(model); else Alert.alert('기자재를 찾을 수 없습니다', '읽은 코드와 일치하는 기자재가 없습니다.');
  };
  return <View style={s.fill}><Screen scroll={false}>
    <Title subtitle="기자재를 찍거나 이름으로 찾아 어떤 기자재인지 확인하세요.">기자재 스캔</Title>
    <ScanSheet visible={scanning} onClose={() => setScanning(false)} onScanned={fromCode} title="기자재 스캔" />
    <Sheet visible={photoSheet} onClose={() => setPhotoSheet(false)} title="사진으로 찾기"><Button title="카메라로 찍기" icon="camera-outline" kind="secondary" onPress={() => shoot('camera')} /><Button title="앨범에서 고르기" icon="images-outline" kind="secondary" onPress={() => shoot('library')} /></Sheet>
    <Section title="찍어서 찾기">
      <View style={s.modeRow}>
        <Card style={s.mode} accessibilityLabel="사진으로 찾기" onPress={() => setPhotoSheet(true)}>
          <View style={s.modeIcon}><Ionicons name="camera-outline" size={26} color={c.primary} /></View>
          <Text style={s.modeTitle}>사진으로 찾기</Text>
          <Text style={s.modeText}>기자재 자체를 비추면 어떤 모델인지 알려 드립니다.</Text>
        </Card>
        <Card style={s.mode} accessibilityLabel="QR·바코드로 찾기" onPress={() => setScanning(true)}>
          <View style={s.modeIcon}><Ionicons name="qr-code-outline" size={26} color={c.primary} /></View>
          <Text style={s.modeTitle}>QR·바코드로 찾기</Text>
          <Text style={s.modeText}>기기에 붙은 QR이나 바코드를 비춰 주세요.</Text>
        </Card>
      </View>
    </Section>
    <Section title="이름으로 찾기">
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color={c.muted} />
          <TextInput accessibilityLabel="기자재 이름 검색" placeholder="기자재 이름이나 분류" placeholderTextColor="#94A3B8" value={query} onChangeText={setQuery} autoCorrect={false} style={s.searchInput} />
          {query ? <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => setQuery('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={c.muted} /></Pressable> : null}
        </View>
        {query.trim() ? <View style={s.dropdown}>
          {matches.length
            ? <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={s.dropdownScroll}>
                {matches.map(m => <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`${m.name} 상세 보기`} onPress={() => open(m)} android_ripple={{ color: c.softPress }} style={({ pressed }) => [s.row, pressed && s.rowPressed]}>
                  <EquipmentImage model={m} style={s.rowImage} />
                  <View style={s.rowText}>
                    <Text style={s.rowCategory}>{m.category}</Text>
                    <Text style={s.rowName} numberOfLines={1}>{m.name}</Text>
                    <Text style={s.rowMeta} numberOfLines={1}>{m.manufacturer}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.muted} />
                </Pressable>)}
              </ScrollView>
            : <View style={s.none}><Text style={s.noneText}>일치하는 기자재가 없습니다</Text></View>}
        </View> : null}
      </View>
    </Section>
  </Screen>{toast}</View>;
}
// 사진으로 찾기(시연용): 사진마다 정해진 값으로 비슷한 기자재를 고른다. 실제 서비스에서는 서버의 이미지 분석 결과가 들어온다.
// 알아보지 못했거나 맞는 기자재가 없으면 빈 목록을 돌려준다(시연에서는 사진 네 장 중 한 장꼴).
function photoMatches(models, uri) {
  const pool = models.filter(m => !m.archived && m.imageId);
  let h = 0; for (const ch of String(uri || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  if (!uri || h % 4 === 0) return [];
  const out = []; const cats = new Set();
  for (let k = 0; out.length < 3 && k < pool.length * 2; k++) { const m = pool[(h + k * 7) % pool.length]; if (!out.includes(m) && (!cats.has(m.category) || k >= pool.length)) { out.push(m); cats.add(m.category); } }
  return out;
}
export function PhotoResultScreen({ navigation, route }) {
  const { state } = useApp();
  const uri = route?.params?.uri;
  const picks = useMemo(() => photoMatches(state.models, uri), [state.models, uri]);
  return <Screen>
    {uri ? <Image source={{ uri }} style={s.shot} resizeMode="cover" accessibilityLabel="찍은 사진" /> : null}
    <Section title="비슷한 기자재">
      <Card style={s.resultCard}>{picks.map((m, i) => <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`${m.name} 상세 보기`} onPress={() => navigation.navigate('Detail', { modelId: m.id })} android_ripple={{ color: c.softPress }} style={({ pressed }) => [s.row, i === picks.length - 1 && s.rowLast, pressed && s.rowPressed]}>
        <EquipmentImage model={m} style={s.resultImage} />
        <View style={s.rowText}><Text style={s.rowCategory}>{m.category}</Text><Text style={s.rowName} numberOfLines={2}>{m.name}</Text><Text style={s.rowMeta} numberOfLines={1}>{m.manufacturer}</Text></View>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </Pressable>)}</Card>
    </Section>
    <View style={s.fallback}><Text style={s.fallbackText}>찾는 기자재가 없나요?</Text><Button title="QR·바코드로 찾기" icon="qr-code-outline" kind="secondary" onPress={() => navigation.navigate('Main', { screen: 'Scan', params: { scan: Date.now() } })} /></View>
  </Screen>;
}
const s = StyleSheet.create({ fill: { flex: 1 },
  shot: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: c.surfacePress },
  resultCard: { padding: 0, overflow: 'hidden' },
  rowLast: { borderBottomWidth: 0 },
  resultImage: { width: 56, height: 56 },
  fallback: { gap: 8 },
  fallbackText: { fontSize: 14, color: c.muted, textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 12 },
  mode: { flex: 1, alignItems: 'center', paddingVertical: 20, gap: 8 },
  modeIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' },
  modeTitle: { fontSize: 15, fontWeight: '700', color: c.ink, textAlign: 'center' },
  modeText: { fontSize: 12, lineHeight: 18, color: c.muted, textAlign: 'center' },
  searchWrap: { position: 'relative', zIndex: 10 },
  searchBox: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 16 },
  searchInput: { fontFamily: FONT.regular, flex: 1, fontSize: 15, color: c.ink },
  dropdown: { position: 'absolute', top: 60, left: 0, right: 0, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, overflow: 'hidden', shadowColor: c.primary, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  dropdownScroll: { maxHeight: 340 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  rowPressed: { backgroundColor: c.softPress },
  rowImage: { width: 48, height: 48 },
  rowText: { flex: 1 },
  rowCategory: { fontSize: 12, fontWeight: '700', color: c.primary },
  rowName: { fontSize: 14, fontWeight: '700', color: c.ink, marginTop: 2 },
  rowMeta: { fontSize: 12, color: c.muted, marginTop: 2 },
  none: { paddingVertical: 20, alignItems: 'center' },
  noneText: { fontSize: 13, color: c.muted },
});
