import React from 'react';
import { Animated, Easing, View, Pressable, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../design/components';
import { FONT } from '../design/fonts';
import { colors as c } from '../design/tokens';
import { useApp } from '../state/AppProvider';
import HomeScreen from '../screens/HomeScreen';
import ListScreen from '../screens/ListScreen';
import DetailScreen from '../screens/DetailScreen';
import ReserveScreen from '../screens/ReserveScreen';
import MyPageScreen from '../screens/MyPageScreen';
import ScanScreen, { PhotoResultScreen } from '../screens/ScanScreen';
import AssistantScreen from '../screens/AssistantScreen';
import { LoginScreen, SignupScreen, PasswordScreen, ResubmitScreen } from '../screens/AuthScreens';
import { RentalsScreen, RentalDetailScreen } from '../screens/RentalScreens';
import { InquiryScreen, PurchaseScreen, NotificationsScreen, NotificationSettingsScreen, WarningsScreen, ProfileScreen, EmailChangeScreen } from '../screens/SupportScreens';
import {AdminDashboard,AdminRentalsScreen,AdminHandoffScreen,AdminWalkIn,AdminCorrectionScreen,AdminStudentsScreen,AdminStudentDetail,AdminEquipmentScreen,AdminModelEdit,AdminNoticesScreen,AdminNoticeEdit,AdminStatsScreen,AdminRequestsScreen,AdminOperationsScreen,AdminModelHours,AdminAuditScreen,AdminReturnLookup,AdminReturnCorrection} from '../screens/AdminScreens';

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();
const navRef = createNavigationContainerRef();

// 하단 탭에 들어가는 화면 (좌우로 밀어서 이동)
const studentTabs = [['Home','홈','home-outline',HomeScreen],['List','기자재','cube-outline',ListScreen],['Scan','스캔','scan-outline',ScanScreen],['Rentals','대여','calendar-outline',RentalsScreen],['My','마이','person-outline',MyPageScreen]];
const adminTabs = [['AdminHome','홈','grid-outline',AdminDashboard],['AdminRentals','대여','calendar-outline',AdminRentalsScreen],['AdminEquipment','기자재','cube-outline',AdminEquipmentScreen],['AdminStudents','학생','people-outline',AdminStudentsScreen],['My','마이','person-outline',MyPageScreen]];

// 탭 위에 쌓이는 화면 (오른쪽에서 밀려 들어옴)
const stackScreens = { PhotoResult:PhotoResultScreen, Detail:DetailScreen, Reserve:ReserveScreen, Assistant:AssistantScreen, RentalDetail:RentalDetailScreen, Resubmit:ResubmitScreen, Password:PasswordScreen, Inquiry:InquiryScreen, Purchase:PurchaseScreen, Notifications:NotificationsScreen, NotificationSettings:NotificationSettingsScreen, Warnings:WarningsScreen, Profile:ProfileScreen, EmailChange:EmailChangeScreen, AdminHandoff:AdminHandoffScreen, AdminWalkIn:AdminWalkIn, AdminCorrection:AdminCorrectionScreen, AdminStudentDetail:AdminStudentDetail, AdminModelEdit:AdminModelEdit, AdminNotices:AdminNoticesScreen, AdminNoticeEdit:AdminNoticeEdit, AdminStats:AdminStatsScreen, AdminRequests:AdminRequestsScreen, AdminOperations:AdminOperationsScreen, AdminModelHours:AdminModelHours, AdminAudit:AdminAuditScreen, AdminReturnLookup:AdminReturnLookup, AdminReturnCorrection:AdminReturnCorrection };
const stackTitles = { PhotoResult:'분석 결과', Detail:'기자재 상세', Reserve:'대여 신청', Assistant:'기자재 찾기 도우미', RentalDetail:'대여 상세', Resubmit:'학생증 재제출', Password:'비밀번호 변경', Inquiry:'문의하기', Purchase:'구매 요청', Notifications:'알림함', NotificationSettings:'알림 설정', Warnings:'경고 내역', Profile:'내 정보', EmailChange:'학교 이메일 변경', AdminHandoff:'수령 처리', AdminWalkIn:'현장 대여 처리', AdminCorrection:'미수령 정정', AdminStudentDetail:'학생 상세', AdminModelEdit:'모델 관리', AdminNotices:'알림 관리', AdminNoticeEdit:'새 알림', AdminStats:'이용 통계', AdminRequests:'문의 · 구매 요청', AdminOperations:'운영일·시간 변경', AdminModelHours:'운영 시간 변경', AdminAudit:'관리 기록', AdminReturnLookup:'기기 고유 번호로 반납', AdminReturnCorrection:'반납 시간 정정' };
const adminOnly = ['AdminHandoff','AdminWalkIn','AdminModelHours','AdminCorrection','AdminStudentDetail','AdminModelEdit','AdminNotices','AdminNoticeEdit','AdminStats','AdminRequests','AdminOperations','AdminAudit','AdminReturnLookup','AdminReturnCorrection'];
const studentOnly = ['Reserve','Assistant','Resubmit'];

// 하단 탭 전환: 손가락으로 밀면 화면이 손가락을 따라 옆 탭으로 넘어간다.
// 탭을 누르면(먼 탭 포함) 중간 화면을 지나가지 않고 바로 바뀌면서 0.15초 동안 부드럽게 나타난다.
const tabMotion = { last: 0, swiping: false, swipeEndAt: 0 };
const fadeCache = new Map();
function withFade(Component, index) {
  const key = `${index}:${Component.name}`;
  if (fadeCache.has(key)) return fadeCache.get(key);
  function FadeScene(props) {
    const o = React.useRef(new Animated.Value(1)).current;
    useFocusEffect(React.useCallback(() => {
      const moved = index !== tabMotion.last; tabMotion.last = index;
      // 손가락(마우스)으로 넘긴 경우는 화면이 이미 밀려 들어왔으니 페이드를 하지 않는다.
      const swiped = tabMotion.swiping || Date.now() - tabMotion.swipeEndAt < 1500;
      if (!moved || swiped) { tabMotion.swiping = false; tabMotion.swipeEndAt = 0; return; }
      o.setValue(0);
      Animated.timing(o, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, []));
    return <Animated.View style={{ flex: 1, opacity: o }}><Component {...props} /></Animated.View>;
  }
  fadeCache.set(key, FadeScene);
  return FadeScene;
}
function TabBar({ state, descriptors, navigation, position }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.tabbar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
    {state.routes.map((route, index) => {
      const { options } = descriptors[route.key];
      const focused = state.index === index;
      // 넘기는 도중에도 끄는 만큼 이전 탭은 흐려지고 다음 탭은 진해진다.
      const on = position ? position.interpolate({ inputRange: [index - 1, index, index + 1], outputRange: [0, 1, 0], extrapolate: 'clamp' }) : (focused ? 1 : 0);
      const onPress = () => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
      };
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={options.title} accessibilityState={{ selected: focused }} onPress={onPress} android_ripple={{ color: c.softPress, borderless: true }} style={({ pressed }) => [s.tab, pressed && { opacity: 0.6 }]}>
        <View style={s.tabFace}><Ionicons name={options.tabBarIconName} size={22} color={c.muted} /><Text style={s.tabLabel}>{options.title}</Text></View>
        <Animated.View pointerEvents="none" style={[s.tabFace, s.tabFaceOn, { opacity: on }]}><Ionicons name={options.tabBarIconName} size={22} color={c.primary} /><Text style={[s.tabLabel, s.active]}>{options.title}</Text></Animated.View>
      </Pressable>;
    })}
  </View>;
}

function MainTabs() {
  const { currentUser } = useApp();
  const tabs = currentUser?.role === 'admin' ? adminTabs : studentTabs;
  React.useState(() => { tabMotion.last = 0; tabMotion.swiping = false; });
  return <Tab.Navigator tabBarPosition="bottom" tabBar={props => <TabBar {...props} />} screenListeners={{ swipeStart: () => { tabMotion.swiping = true; }, swipeEnd: () => { tabMotion.swiping = false; tabMotion.swipeEndAt = Date.now(); } }} screenOptions={{ swipeEnabled: true, animationEnabled: false, lazy: true, sceneStyle: { backgroundColor: c.bg } }}>
    {tabs.map(([name, title, icon, component], i) => <Tab.Screen key={name} name={name} component={withFade(component, i)} options={{ title, tabBarIconName: icon }} />)}
  </Tab.Navigator>;
}

export default function AppNavigator() {
  const { state, currentUser } = useApp();
  if (!state) return <View style={s.loading}><Text style={s.loadingText}>SmartRent</Text></View>;
  const role = currentUser?.role;
  const visible = Object.entries(stackScreens).filter(([name]) => role === 'admin' ? !studentOnly.includes(name) : !adminOnly.includes(name));
  return <NavigationContainer key={`${currentUser?.id || 'guest'}-${role || 'guest'}`} ref={navRef}>
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: c.bg }, headerTintColor: c.ink, headerTitleStyle: { fontFamily: FONT.bold }, headerBackButtonDisplayMode: 'minimal', headerBackTitle: '', contentStyle: { backgroundColor: c.bg }, headerShadowVisible: false }}>
      {currentUser
        ? <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            {visible.map(([name, component]) => <Stack.Screen key={name} name={name} component={component} options={{ title: stackTitles[name] }} />)}
          </>
        : <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ title: '학생 회원가입' }} />
            <Stack.Screen name="Password" component={PasswordScreen} options={{ title: '비밀번호' }} />
          </>}
    </Stack.Navigator>
  </NavigationContainer>;
}

const s = StyleSheet.create({
  tabbar: { flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, tabFace: { alignItems: 'center', justifyContent: 'center' }, tabFaceOn: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  tabLabel: { fontSize: 12, color: c.muted, marginTop: 4, fontWeight: '600' },
  active: { color: c.primary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg },
  loadingText: { color: c.primary, fontSize: 22, fontWeight: '800' },
});
