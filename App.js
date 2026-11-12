import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaFrameContext, SafeAreaInsetsContext, SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/state/AppProvider';
import AppNavigator from './src/navigation/AppNavigator';
import { AlertHost } from './src/design/AppAlert';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { fontAssets } from './src/design/fonts';
import { Asset } from 'expo-asset';
import { equipmentImages } from './src/data/images';

// 웹은 그림을 화면에 들어갈 때 받아서 늦게 뜬다. 켜질 때 AI 화면 그림부터 기자재 사진까지 미리 받아 둔다(휴대폰은 앱 안에 들어 있어 필요 없음)
const PRELOAD_IMAGES = [require('./src/assets/brand/assistant-upper.png'), ...Object.values(equipmentImages)];
function usePreloadImagesOnWeb() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    PRELOAD_IMAGES.forEach(mod => { const uri = Asset.fromModule(mod).uri; if (uri) { const img = new window.Image(); img.src = uri; } });
  }, []);
}

// 글꼴(Noto Sans KR)을 다 읽기 전에는 시작 화면을 그대로 둔다
SplashScreen.preventAutoHideAsync().catch(() => {});

// 웹으로 열면 아이폰 17 Pro(402×874) 모양 안에 그린다. 휴대폰에서는 영향 없음.
const SCREEN = { width: 402, height: 874 };
const INSETS = { top: 62, bottom: 34, left: 0, right: 0 };
const BEZEL = 12;

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(t); }, []);
  return <Text style={s.time}>{now.getHours()}:{String(now.getMinutes()).padStart(2, '0')}</Text>;
}

function PhoneFrame({ children }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web' || width <= 500) return <SafeAreaProvider>{children}<AlertHost /></SafeAreaProvider>;
  const outerW = SCREEN.width + BEZEL * 2, outerH = SCREEN.height + BEZEL * 2;
  const scale = Math.min(1, (height - 40) / outerH, (width - 40) / outerW);
  return <View style={s.page}>
    <View style={[s.device, { width: outerW, height: outerH, transform: [{ scale }] }]}>
      <View style={s.screen}>
        <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, ...SCREEN }}>
          <SafeAreaInsetsContext.Provider value={INSETS}>{children}</SafeAreaInsetsContext.Provider>
        </SafeAreaFrameContext.Provider>
        <View pointerEvents="none" style={s.statusBar}>
          <Clock />
          <View style={s.statusIcons}><Ionicons name="cellular" size={16} color="#111" /><Ionicons name="wifi" size={17} color="#111" /><Ionicons name="battery-full" size={24} color="#111" /></View>
        </View>
        <View pointerEvents="none" style={s.island} />
        <View nativeID="phone-screen-modal" pointerEvents="box-none" style={s.modalHost} />
        <AlertHost />
        <View pointerEvents="none" style={s.homeBar} />
      </View>
    </View>
  </View>;
}

export default function App(){const[loaded,error]=useFonts(fontAssets);usePreloadImagesOnWeb();useEffect(()=>{if(loaded||error)SplashScreen.hideAsync().catch(()=>{})},[loaded,error]);if(!loaded&&!error)return null;return <PhoneFrame><AppProvider><StatusBar style="dark"/><AppNavigator/></AppProvider></PhoneFrame>}

const s = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' },
  device: { padding: BEZEL, borderRadius: 67, backgroundColor: '#0B0B0F', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: 12 } },
  screen: { width: SCREEN.width, height: SCREEN.height, borderRadius: 55, overflow: 'hidden', backgroundColor: '#F8FAFC' },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, height: INSETS.top, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 34, paddingBottom: 3, zIndex: 2000 },
  time: { fontSize: 17, fontWeight: '600', color: '#111', width: 60, textAlign: 'center' },
  statusIcons: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  island: { position: 'absolute', top: 12, left: (SCREEN.width - 126) / 2, width: 126, height: 37, borderRadius: 19, backgroundColor: '#000', zIndex: 3001 },
  modalHost: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1500 },
  homeBar: { position: 'absolute', bottom: 8, left: (SCREEN.width - 134) / 2, width: 134, height: 5, borderRadius: 3, backgroundColor: '#111', zIndex: 2000 },
});
