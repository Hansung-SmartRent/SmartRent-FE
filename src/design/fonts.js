// 앱 글꼴: 피그마와 같은 Noto Sans KR. 아이폰·안드로이드·웹 모두 같은 모양으로 보인다.
// 피그마에는 Regular·Medium·Bold 세 굵기만 있어 앱 굵기를 이렇게 맞춘다(400 이하 Regular, 500·600 Medium, 700 이상 Bold).
import { NotoSansKR_400Regular, NotoSansKR_500Medium, NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr';

export const FONT = { regular: 'NotoSansKR_400Regular', medium: 'NotoSansKR_500Medium', bold: 'NotoSansKR_700Bold' };
export const fontAssets = { [FONT.regular]: NotoSansKR_400Regular, [FONT.medium]: NotoSansKR_500Medium, [FONT.bold]: NotoSansKR_700Bold };

export function fontFor(weight) {
  const w = weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : Number(weight);
  return w >= 700 ? FONT.bold : w >= 500 ? FONT.medium : FONT.regular;
}

// 글꼴 파일마다 굵기가 정해져 있어 fontWeight는 기본값으로 둔다(안드로이드에서 가짜 굵게가 생기지 않게)
export function withFont(flat) {
  return { fontFamily: fontFor(flat && flat.fontWeight), fontWeight: 'normal' };
}
