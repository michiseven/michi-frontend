"use client";

import { MapPinIcon } from "@/components/icons";
import { NaverMap } from "@/components/naver-map";
import {
  AuthHeading,
  AuthNarrow,
  AuthPageShell,
} from "@/components/styles/auth.styles";
import {
  BackLink,
  MapPreviewHeading,
  MapPreviewNote,
  MapPreviewSection,
} from "@/components/styles/content-page.styles";
import { useI18n } from "@/lib/i18n";

export default function MapPreviewPage() {
  const { lang } = useI18n();
  const previewLocations = [
    {
      id: "map-preview-seoul",
      placeName:
        lang === "ko" ? "서울 중심부 테스트 위치" : "ソウル中心部テスト地点",
      latitude: 37.5665,
      longitude: 126.978,
    },
  ];

  return (
    <AuthPageShell id="main-content">
      <AuthNarrow>
        <AuthHeading>
          <p className="eyebrow">NAVER MAPS CHECK</p>
          <h1>
            {lang === "ko" ? "네이버 지도 연동 확인" : "地図の表示を確認"}
          </h1>
          <p className="lede">
            {lang === "ko"
              ? "NAVER Maps API 클라이언트 ID와 Web 서비스 연동이 올바르게 동작하는지 확인하는 페이지입니다."
              : "NAVER MapsのクライアントIDとWebサービスURLが正しく設定されているか確認するためのページです。"}
          </p>
        </AuthHeading>

        <MapPreviewSection aria-labelledby="map-preview-title">
          <MapPreviewHeading>
            <div>
              <h2 id="map-preview-title">
                <MapPinIcon aria-hidden="true" />
                {lang === "ko"
                  ? "서울 중심부 테스트 지도"
                  : "ソウルのテスト地図"}
              </h2>
              <p>
                {lang === "ko"
                  ? "지도와 1번 마커가 정상적으로 표시되면 브라우저용 지도 인증이 완료된 상태입니다."
                  : "地図と「1」のマーカーが表示されれば、ブラウザ用の地図認証は正常です。"}
              </p>
            </div>
            <BackLink href="/">
              {lang === "ko" ? "플래너로 돌아가기" : "プランナーへ戻る"}
            </BackLink>
          </MapPreviewHeading>
          <NaverMap stops={previewLocations} />
          <MapPreviewNote>
            {lang === "ko"
              ? "이 좌표는 지도 연동 확인 전용이며, 실제 여행 추천 후보나 혼잡 데이터에는 영향을 주지 않습니다."
              : "この座標は地図表示確認専用で、旅行の推薦候補や実際の混雑データには使用しません。"}
          </MapPreviewNote>
        </MapPreviewSection>
      </AuthNarrow>
    </AuthPageShell>
  );
}
