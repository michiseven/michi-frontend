"use client";

import React, {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Language = "ja" | "ko";

export interface QuickPrompt {
  id: string;
  title: string;
  area: string;
  prompt: string;
  budget?: number;
}

export const QUICK_PROMPTS: Record<Language, QuickPrompt[]> = {
  ja: [
    {
      id: "seongsu",
      title: "聖水 カフェ＆セレクトショップ",
      area: "聖水",
      prompt:
        "聖水で一人で過ごしたい。静かなカフェとセレクトショップが好きで、夜は美味しいお肉を食べたい。",
      budget: 80000,
    },
    {
      id: "gongdeok",
      title: "麻浦・孔徳 ローカルグルメ巡り",
      area: "孔徳",
      prompt:
        "孔徳・麻浦エリアでローカルな美味しい韓国料理とカフェ巡りをしたい。混雑を避けてゆっくり楽しみたい。",
      budget: 70000,
    },
    {
      id: "jongno",
      title: "鐘路 古宮＆韓屋さんぽ",
      area: "鐘路",
      prompt:
        "鐘路で伝統的な韓屋カフェや歴史的なスポットを巡りたい。落ち着いた散策と伝統茶を楽しみたい。",
      budget: 60000,
    },
    {
      id: "hannam",
      title: "漢南・梨泰院 アート＆カルチャー",
      area: "漢南",
      prompt:
        "漢南洞でおしゃれなギャラリーとベーカリーカフェに行きたい。洗練された雰囲気の街歩きが希望。",
      budget: 90000,
    },
  ],
  ko: [
    {
      id: "seongsu",
      title: "성수 감성 카페 & 편집숍",
      area: "성수",
      prompt:
        "성수동에서 혼자 여유롭게 시간을 보내고 싶어요. 조용한 카페와 디자이너 편집숍을 둘러보고 저녁엔 맛있는 고기를 먹고 싶습니다.",
      budget: 80000,
    },
    {
      id: "gongdeok",
      title: "마포·공덕 로컬 미식 탐방",
      area: "공덕",
      prompt:
        "공덕과 마포 일대에서 로컬 맛집과 분위기 좋은 카페를 탐방하고 싶어요. 과밀한 곳을 피해 여유로운 동선을 원합니다.",
      budget: 70000,
    },
    {
      id: "jongno",
      title: "종로 고궁 & 한옥 골목 산책",
      area: "종로",
      prompt:
        "종로에서 고즈넉한 한옥 전통찻집과 역사적인 산책길을 걷고 싶어요. 차분하게 서울의 정취를 느끼고 싶습니다.",
      budget: 60000,
    },
    {
      id: "hannam",
      title: "한남·이태원 아트 & 라이프스타일",
      area: "한남",
      prompt:
        "한남동에서 감각적인 갤러리와 베이커리 카페를 방문하고 싶어요. 세련된 분위기의 로컬 거리를 둘러보는 일정.",
      budget: 90000,
    },
  ],
};

export const DICTIONARY = {
  ja: {
    // Header & Footer
    brandTitle: "Michi",
    brandSubtitle: "ソウル旅プランナー",
    cityLabel: "SEOUL ONLY",
    skipLink: "本文へ移動",
    footerText: "実在する場所データと条件にもとづく、説明できる旅程。",
    langSwitchJa: "日本語",
    langSwitchKo: "한국어",

    // Home
    homeEyebrow: "AI ITINERARY PLANNER",
    homeTitle: "あなたらしいソウルの道を。",
    homeLede:
      "好みと時間を言葉で伝えると、実在する場所の候補から理由のわかる旅程を組み立てます。",
    mapPreviewBtn: "地図の表示を確認",
    quickPromptHeading: "人気のテーマから選ぶ",
    tripGenerating: "旅程を作成中",
    tripGeneratingDesc: "場所候補の確認とルート計算をしています…",
    tripGenerateError: "旅程を作成できませんでした。",

    // Planner Form
    formRequestLabel: "どんな一日にしたいですか？",
    formRequestPlaceholder:
      "例：明日、聖水で一人で過ごしたい。静かなカフェとセレクトショップが好きで、夜は焼肉を食べたい。",
    formRequestHint:
      "好きなこと、避けたいこと、食事、ペースまで自由に書けます。",
    formDateLabel: "日付",
    formStartDateLabel: "開始日",
    formEndDateLabel: "終了日",
    formStartAreaLabel: "出発エリア",
    formStartAreaPlaceholder: "例：聖水、弘大、孔徳",
    formStartTimeLabel: "開始時刻",
    formEndTimeLabel: "終了時刻",
    formBudgetLabel: "予算（KRW）",
    formBudgetHint:
      "1,000ウォン単位の目安。外部データに価格がない場所は推測しません。",
    formAirportLabel: "✈️ 利用空港（任意）",
    formAirportNone: "指定なし（ソウル市内出発）",
    formAirportIncheon: "仁川国際空港 (ICN)",
    formAirportGimpo: "金浦国際空港 (GMP)",
    formHotelLabel: "🏨 宿泊先・拠点ホテル（任意）",
    formHotelPlaceholder: "例：ロッテシティホテル麻浦、明洞のホテル、弘大L7",
    formHotelSearchBtn: "🔍 検索",
    formHotelClearBtn: "解除",
    hotelSearchModalTitle: "宿泊先・ホテル検索",
    hotelSearchModalSubtitle:
      "NAVER地域検索の登録情報から宿泊施設を検索します。",
    hotelSearchInputPlaceholder:
      "ホテル名やエリアを入力（例：ロッテ、新羅、明洞）",
    hotelSearchBtn: "検索",
    hotelSearchCloseBtn: "閉じる",
    hotelSearchNoResults:
      "該当するホテルが見つかりませんでした。別の名称でお試しください。",
    hotelSearchSearching: "NAVER Mapでホテルを検索中...",
    hotelSearchSelectBtn: "選択",
    hotelSearchRoadBadge: "道路名",
    hotelSearchJibunBadge: "地番",
    formSubmitBtn: "旅程を作る",
    formSubmittingBtn: "旅程を作成中",
    formErrTextRequired: "希望を10文字以上で入力してください。",
    formErrDateWindow: "終了日は開始日以降にしてください。",
    formErrTimeWindow: "終了時刻は開始時刻より後にしてください。",
    formErrBudget: "予算は0以上のウォン単位で入力してください。",

    // Trip View
    tripRouteEyebrow: "YOUR SEOUL ROUTE",
    tripDefaultTitle: "ソウルで過ごす一日",
    tripMetaDateUnspecified: "日付未指定",
    tripMetaAreaSeoul: "ソウル",
    tripMetaBudgetUnspecified: "予算未指定",
    tripMetaDispersion: (rate: number | null) =>
      `分散適合 ${rate != null ? `${rate}%` : "—"}`,
    tripMetaLocalShare: (rate: number | null) =>
      `ローカル比率 ${rate != null ? `${rate}%` : "—"}`,
    tripMetaStopsCount: (count: number) => `${count}か所`,
    tripMetaCost: (cost: string) => `約${cost}ウォン`,
    tripBadgeDispersion: (rate: number) => `📊 観光分散効果 ${rate}%（推計値）`,
    tripBadgeLocalShare: (
      localCount: number,
      totalCount: number,
      rate: number,
    ) => `🛍️ ローカル発見 ${localCount}/${totalCount}件 (${rate}%)`,
    tripDayTabAll: "全日程",
    tripDayTabLabel: (day: number, date?: string | null, count?: number) =>
      `Day ${day}${date ? ` (${date.slice(5)})` : ""}${count != null ? ` (${count}件)` : ""}`,
    timelineLegWalk: (mins: number, dist: string) =>
      `直線距離推計 約${mins}分 (${dist})`,
    timelineLegMeasuredCar: (mins: number, dist: string) =>
      `NAVER実測・車 約${mins}分 (${dist})`,
    timelineLegSubway: (
      mins: number,
      dist: string,
      from: string,
      to: string,
      transfers: number,
      fare?: number | null,
    ) =>
      `🚇 地下鉄 ${from}駅 → ${to}駅 約${mins}分 (${dist}${transfers > 0 ? `・乗換${transfers}回` : ""}${fare != null ? `・${fare}ウォン` : ""})`,
    timelineLegBus: (mins: number, dist: string) =>
      `🚌 バス推計 約${mins}分 (${dist})`,
    timelineLegSubwayWalkNote: (access: number, egress: number) =>
      `駅までのアクセス・離脱徒歩は直線距離推計（出発〜乗車${access}分 / 下車〜到着${egress}分）です。`,
    timelineLegBusNote:
      "公式P2Pバス経路API終了のため、直線距離に基づく参考値です。",
    evidenceMixedBadge: "実測+推計",
    evidenceMeasuredBadge: "公式実測",
    evidenceEstimatedBadge: "推計値",
    timelineAccessibilityRisk: "傾斜・階段リスクを検出",
    timelineAccessibilityClear: "GIS回廊内に傾斜・階段リスク未検出",
    stopTypeFixedAppt: "予約",
    stopTypeMustVisit: "必須訪問",
    stopTypeMeal: "食事",
    stopTypeAirport: "空港",
    stopTypeBasecamp: "拠点",
    stopTypeRainFallback: "雨天代替",
    placeRainFallbackHeading: "雨天時の代替候補",
    placeRainFallbackDesc: (name: string, cat?: string | null) =>
      `雨天時は室内施設「${name}」(${cat || "室内"})をおすすめします。`,
    tripDetailLink: "詳細・編集へ",
    tripBtnShare: "旅程を共有",
    tripShareSuccess: "旅程のリンクをコピーしました！",
    tripShareTitle: (title: string) => `Michi - ${title}`,
    tripShareText: (title: string) =>
      `Michiで作成したソウル旅行プラン「${title}」`,
    tripMapToggle: "地図の表示切替",
    tripMapHide: "地図を閉じる",
    tripMapShow: "地図を表示",
    tripTimelineSummary: "移動の概要",
    tripTotalDuration: (hours: number, mins: number) =>
      hours > 0 ? `約${hours}時間${mins}分` : `約${mins}分`,
    tripTotalDistance: (km: number) => `総移動 約${km.toFixed(1)}km`,
    tripStopsCount: (count: number) => `${count}スポット`,
    tripBtnRecalculate: "旅程を再計算",
    tripBtnStartRoute: "ルートを開始",
    tripBtnCompleteRoute: "ルートを完了",
    tripStatusCompleted: "ルートを完了しました。",
    tripBtnNewTrip: "新しい旅程を作る",
    tripBtnBackToPlanner: "プランナーへ戻る",
    tripEmptyTitle: "立ち寄り先がありません",
    tripEmptyDesc: "条件を変えて再計算するか、新しい旅程を作ってください。",
    tripMapNote: "ピン番号は旅程の順番です。座標はWGS84です。",
    tripTimelineLabel: "旅程タイムライン",
    tripSummaryHeading: "旅程の概要",
    tripSummaryBadgeFallback: "ルール準拠の説明",

    // Place Card
    placeCategoryFallback: "カテゴリ未提供",
    placeTagLocal: "路地裏ローカル店舗",
    placeTagAnchor: "固定目的地",
    placeReasonHeading: "おすすめの理由",
    placeShortDescriptionHeading: "スポット紹介",
    placeVerifiedDescriptionHeading: "出典付きスポット紹介",
    placeDescriptionSourceLink: "出典を確認",
    placePrevStopFitHeading: "前のスポットから",
    placeNextStopFitHeading: "次のスポットへ",
    placeOverallTripFitHeading: "旅程全体との相性",
    placeTourismEvidenceTitle: "観光データによる補足",
    placeTourismConcentration: "観光集中度",
    placeTourismLocalDiscovery: "ローカル発見",
    placeTourismScopeArea: (areaName?: string | null) =>
      `（エリア単位${areaName ? `・${areaName}` : ""}）`,
    placeTourismScopePlace: "（場所単位）",
    placeTourismRefPeriod: (period: string) => `参照期間：${period}`,
    placeTourismNote:
      "観光集中度は参照期間内の相対的な傾向で、現在の店内混雑を示すものではありません。",
    placeFactStay: "滞在",
    placeFactStayUnit: (mins: number) => `${mins}分`,
    placeFactCost: "予想費用",
    placeFactCostNoData: "現地・詳細確認",
    placeFactCostFree: "無料",
    placeFactCostValue: (cost: string) => `${cost}ウォン`,
    placeFactCostRange: (min: string, max: string) => `${min}〜${max}ウォン`,
    placePriceEvidenceMenu: (menu: string) => `確認済み価格情報: ${menu}`,
    placePriceEvidenceBenchmark: (disclaimer: string) => disclaimer,
    placePriceEvidenceSourceLink: "根拠を確認",
    placePriceEvidenceRefPeriod: (period: string) => `（基準: ${period}）`,
    totalBudgetMaxNote: "（最大予想費用基準で安全に合算）",
    placeFactLeave: "出発",
    placeFactScore: "総合スコア",
    placeCrowdNoteHeading: "混雑：",
    placeCrowdNoData: "データなし",
    placeCrowdScopeArea: "エリア単位",
    placeCrowdScopeSuffix: (scope: string, area?: string | null) =>
      `（${scope}${area ? `・${area}` : ""}）`,
    placeCrowdNotInsideShop: "特定店舗の店内混雑度ではありません。",
    placeCrowdDistanceRef: (area: string, meters: string) =>
      `${area}から約${meters}m離れた観測エリアの参考値です。`,
    placeDetailKakao: "カカオマップで詳細を見る",
    placeDetailKakaoAria: (placeName: string) =>
      `${placeName}の営業時間と詳細をカカオマップで確認`,
    placeDetailExternalNote:
      "営業時間・価格などの最新情報は外部ページで確認してください。",
    placeScoreToggle: "なぜここがおすすめ？ スコア内訳",
    placeActionMovePrev: "前へ",
    placeActionMoveNext: "後へ",
    placeActionRemove: "削除",
    placeActionAlternatives: "別の候補を見る",
    placeActionAlternativesHide: "候補を閉じる",
    placeAlternativesTitle: "🔄 おすすめ代替候補",
    placeAlternativesLoading: "代替候補を検索中...",
    placeAlternativesEmpty: "現在、利用可能な代替候補がありません。",
    placeAlternativesSwapBtn: "この場所に変更",
    placeAlternativesSwapping: "変更中...",

    // Score breakdown labels
    scores: {
      total: "総合",
      preference: "好み",
      crowd: "混雑相性",
      distance: "距離",
      time: "時間",
      budget: "予算",
      diversity: "多様性",
      area: "エリア",
      tourismDispersion: "観光分散との相性",
      localImpact: "ローカル発見",
      alternativeSimilarity: "代替候補との相性",
      tourismFlow: "観光動線との相性",
    },

    // Levels
    levels: {
      low: "比較的低い",
      medium: "中程度",
      high: "高い",
      unavailable: "データなし",
    },

    // Environment & Provider
    envBannerMockTitle: "MOCK / 検証モードで動作中",
    envBannerMockDesc:
      "一部の外部APIまたは観光データがモックデータです。実際のサービス運用時にはLIVEモードで接続されます。",

    // Auth & Member
    authLogin: "ログイン",
    authRegister: "会員登録",
    authRedirectLoading: "Michiを準備しています…",
    authStartEyebrow: "AI SEOUL ITINERARY",
    authStartTitle: "好みからつくる、ソウルの一日",
    authStartLede: "行きたいことと過ごせる時間をもとに、ソウルでの一日の過ごし方を整理します。",
    authStartBadgeFree: "無料で始める",
    authStartBadgeMinute: "入力は約1分",
    authStartBadgeSaveEdit: "保存・編集できる",
    authStartPreviewLabel: "Michiの旅程作成画面",
    authStartChatCaptureLabel: "AIと相談してつくる",
    authStartChatCaptureAlt: "希望を会話で伝えるMichiのAI旅程プランナー画面",
    authStartResultCaptureLabel: "一日の流れを確認",
    authStartResultCaptureAlt: "おすすめの場所と移動順を確認するMichiの旅程画面",
    authStartExamplesTitle: "こんな一日から始められます",
    authStartExampleOneTitle: "聖水でカフェとゆっくり夕食",
    authStartExampleOneDesc: "静かなカフェ、散歩、夕食を一日にまとめたいとき",
    authStartExampleTwoTitle: "ご両親と歩くソウルの一日",
    authStartExampleTwoDesc: "無理のないペースで、見どころと食事を選びたいとき",
    authStartExampleThreeTitle: "雨の日の室内デート",
    authStartExampleThreeDesc: "天気を気にせず、屋内中心で過ごしたいとき",
    authStartStepsTitle: "始め方",
    authStartStepOneTitle: "過ごしたい一日を伝える",
    authStartStepOneDesc: "エリア、時間、好みを入力します。",
    authStartStepTwoTitle: "候補と順番を受け取る",
    authStartStepTwoDesc: "一日の流れを確認します。",
    authStartStepThreeTitle: "保存して、あとから編集する",
    authStartStepThreeDesc: "予定が変わっても調整できます。",
    authStartRegisterCta: "無料で旅程をつくる",
    authStartLoginPrompt: "すでにアカウントをお持ちですか？",
    authStartLoginCta: "ログイン",
    authBackToStart: "最初の画面に戻る",
    authLoginTitle: "もう一度、ソウル旅行を続けましょう",
    authLoginLede: "保存した旅程を確認して、続きから編集できます。",
    authLoginSubmit: "ログインして旅程を見る",
    authRegisterTitle: "旅程を保存するアカウントをつくりましょう",
    authRegisterLede: "作った旅程を保存して、次回も続きから見直せます。",
    authRegisterSubmit: "会員登録して旅程をつくる",
    authPageTitle: "自分だけのソウル旅程をつくる",
    authLoginValue: "ログインすると、ソウルの旅程を作成できます。作った旅程は保存して、あとから編集できます。",
    authRegisterValue: "無料登録で、ソウルの旅程を作成・保存・編集できます。次の旅行でも、保存した旅程を見返せます。",
    authBenefitsTitle: "できること",
    authBenefitCreate: "好みと予定からソウル旅程をつくる",
    authBenefitSaveEdit: "旅程を保存して、あとから変更する",
    authBenefitReview: "保存した旅程をいつでも見返す",
    authEmailReason: "メールアドレスは、作成した旅程をあなたのアカウントに安全に保存し、次回も編集できるようにするために使います。",
    authLogout: "ログアウト",
    authEmail: "メールアドレス",
    authPassword: "パスワード",
    authDisplayName: "ニックネーム",
    authPasswordHint: "8文字以上で入力してください",
    authLoginPrompt: "すでにアカウントをお持ちですか？",
    authRegisterPrompt: "アカウントをお持ちでないですか？",
    authLoginSuccess: "ログインしました",
    authRegisterSuccess: "登録が完了しました",
    authLogoutSuccess: "ログアウトしました",
    authProfile: "マイページ",
    authMySavedTrips: "保存した旅程",
    authSaveTripBtn: "旅程を保存",
    authTripSaved: "旅程を保存しました",
    authSaveFailed: "保存に失敗しました",
    authNoSavedTrips: "保存された旅程がまだありません。",
    authMemo: "旅程メモ",
    authMemoPlaceholder: "持ち物や気になるお店のメモを残せます",
    authSaveMemo: "メモを保存",
    authDeleteSavedTrip: "削除",
    authDeleteConfirm: "この保存旅程を削除しますか？",
    authLoginRequiredToSave: "旅程を保存するにはログインが必要です",
    authChangePassword: "パスワード変更",
    authCurrentPassword: "現在のパスワード",
    authNewPassword: "新しいパスワード",
    authProfileUpdated: "プロフィールを更新しました",
    authPasswordChanged: "パスワードを変更しました",
  },

  ko: {
    // Header & Footer
    brandTitle: "Michi",
    brandSubtitle: "서울 여행 플래너",
    cityLabel: "SEOUL ONLY",
    skipLink: "본문으로 이동",
    footerText: "실제 장소 데이터와 관광 지표에 근거한 설명 가능한 여행 동선.",
    langSwitchJa: "日本語",
    langSwitchKo: "한국어",

    // Home
    homeEyebrow: "AI ITINERARY PLANNER",
    homeTitle: "나만의 서울 여행길을 찾아서.",
    homeLede:
      "원하는 취향과 시간을 자유롭게 입력하면, 실존하는 장소 후보 중 이유가 명확한 하루 여행 동선을 설계합니다.",
    mapPreviewBtn: "지도 화면 확인",
    quickPromptHeading: "추천 여행 테마로 시작하기",
    tripGenerating: "여행 일정을 생성하고 있습니다",
    tripGeneratingDesc:
      "적합한 장소 후보를 검증하고 최적의 동선을 계산하는 중입니다…",
    tripGenerateError: "여행 일정을 생성하지 못했습니다.",

    // Planner Form
    formRequestLabel: "어떤 하루를 보내고 싶으신가요?",
    formRequestPlaceholder:
      "예: 내일 성수동에서 혼자 여유롭게 보내고 싶어. 조용한 카페와 편집숍을 둘러보고 저녁엔 맛있는 고기를 먹고 싶어.",
    formRequestHint:
      "선호하는 분위기, 피하고 싶은 곳, 식사, 이동 페이스까지 자유롭게 적어주세요.",
    formDateLabel: "여행 날짜",
    formStartDateLabel: "시작 날짜",
    formEndDateLabel: "종료 날짜",
    formStartAreaLabel: "출발 지역",
    formStartAreaPlaceholder: "예: 성수, 홍대, 공덕",
    formStartTimeLabel: "시작 시각",
    formEndTimeLabel: "종료 시각",
    formBudgetLabel: "예산 (KRW)",
    formBudgetHint:
      "1,000원 단위 기준. 공식 데이터에 가격 정보가 없는 장소는 임의로 추론하지 않습니다.",
    formAirportLabel: "✈️ 이용 공항 (선택)",
    formAirportNone: "지정 안 함 (서울 시내 출발)",
    formAirportIncheon: "인천공항 (ICN)",
    formAirportGimpo: "김포공항 (GMP)",
    formHotelLabel: "🏨 숙소 / 호텔 (선택)",
    formHotelPlaceholder: "예: 롯데시티호텔 마포, 명동 호텔, 홍대 L7",
    formHotelSearchBtn: "🔍 검색",
    formHotelClearBtn: "삭제",
    hotelSearchModalTitle: "숙소 / 호텔 검색",
    hotelSearchModalSubtitle:
      "네이버 지역 검색 등록정보에서 숙소를 검색합니다.",
    hotelSearchInputPlaceholder:
      "호텔명 또는 지역명을 입력하세요 (예: 롯데, 신라, 명동)",
    hotelSearchBtn: "검색",
    hotelSearchCloseBtn: "닫기",
    hotelSearchNoResults:
      "검색 결과가 없습니다. 다른 호텔명이나 지역명으로 검색해 보세요.",
    hotelSearchSearching: "네이버 지도에서 호텔을 검색하는 중...",
    hotelSearchSelectBtn: "선택",
    hotelSearchRoadBadge: "도로명",
    hotelSearchJibunBadge: "지번",
    formSubmitBtn: "일정 만들기",
    formSubmittingBtn: "일정 생성 중",
    formErrTextRequired: "희망 사항을 10자 이상 입력해 주세요.",
    formErrDateWindow: "종료 날짜는 시작 날짜보다 빠를 수 없습니다.",
    formErrTimeWindow: "종료 시각은 시작 시각보다 늦어야 합니다.",
    formErrBudget: "예산은 0 이상의 정수(원 단위)로 입력해 주세요.",

    // Trip View
    tripRouteEyebrow: "YOUR SEOUL ROUTE",
    tripDefaultTitle: "서울에서 보내는 하루",
    tripMetaDateUnspecified: "날짜 미지정",
    tripMetaAreaSeoul: "서울",
    tripMetaBudgetUnspecified: "예산 미지정",
    tripMetaDispersion: (rate: number | null) =>
      `분산 적합 ${rate != null ? `${rate}%` : "—"}`,
    tripMetaLocalShare: (rate: number | null) =>
      `로컬 비중 ${rate != null ? `${rate}%` : "—"}`,
    tripMetaStopsCount: (count: number) => `${count}곳`,
    tripMetaCost: (cost: string) => `약 ${cost}원`,
    tripBadgeDispersion: (rate: number) =>
      `📊 관광 분산 예상 효과 ${rate}% (모델 추정치)`,
    tripBadgeLocalShare: (
      localCount: number,
      totalCount: number,
      rate: number,
    ) => `🛍️ 로컬 발견 ${localCount}/${totalCount}곳 (${rate}%)`,
    tripDayTabAll: "전체 일정",
    tripDayTabLabel: (day: number, date?: string | null, count?: number) =>
      `Day ${day}${date ? ` (${date.slice(5)})` : ""}${count != null ? ` (${count}곳)` : ""}`,
    timelineLegWalk: (mins: number, dist: string) =>
      `직선거리 기반 이동 추정 약 ${mins}분 (${dist})`,
    timelineLegMeasuredCar: (mins: number, dist: string) =>
      `NAVER 실측·자동차 약 ${mins}분 (${dist})`,
    timelineLegSubway: (
      mins: number,
      dist: string,
      from: string,
      to: string,
      transfers: number,
      fare?: number | null,
    ) =>
      `🚇 지하철 ${from}역 → ${to}역 약 ${mins}분 (${dist}${transfers > 0 ? ` · 환승 ${transfers}회` : ""}${fare != null ? ` · ${fare}원` : ""})`,
    timelineLegBus: (mins: number, dist: string) =>
      `🚌 버스 추정 약 ${mins}분 (${dist})`,
    timelineLegSubwayWalkNote: (access: number, egress: number) =>
      `역까지의 접근·이탈 도보는 직선거리 기반 추정치(출발~승차 ${access}분 / 하차~도착 ${egress}분)입니다.`,
    timelineLegBusNote:
      "공식 P2P 버스 경로 API 종료로 인해 직선거리 기반 참고치입니다.",
    evidenceMixedBadge: "실측+추정",
    evidenceMeasuredBadge: "공식 실측",
    evidenceEstimatedBadge: "추정치",
    timelineAccessibilityRisk: "경사·계단 위험 감지",
    timelineAccessibilityClear: "GIS 회랑 내 경사·계단 위험 미감지",
    stopTypeFixedAppt: "고정 예약",
    stopTypeMustVisit: "필수 방문",
    stopTypeMeal: "식사",
    stopTypeAirport: "공항",
    stopTypeBasecamp: "숙소/거점",
    stopTypeRainFallback: "우천 대안",
    placeRainFallbackHeading: "비가 올 때의 실내 대체 장소",
    placeRainFallbackDesc: (name: string, cat?: string | null) =>
      `우천 시 실내 시설인 '${name}'(${cat || "실내"})을(를) 추천합니다.`,
    tripDetailLink: "상세 및 편집",
    tripBtnShare: "일정 공유",
    tripShareSuccess: "일정 링크를 복사했습니다!",
    tripShareTitle: (title: string) => `Michi - ${title}`,
    tripShareText: (title: string) =>
      `Michi에서 만든 서울 여행 일정 '${title}'`,
    tripMapToggle: "지도 표시 전환",
    tripMapHide: "지도 접기",
    tripMapShow: "지도 보기",
    tripTimelineSummary: "동선 요약",
    tripTotalDuration: (hours: number, mins: number) =>
      hours > 0 ? `약 ${hours}시간 ${mins}분` : `약 ${mins}분`,
    tripTotalDistance: (km: number) => `총 이동 약 ${km.toFixed(1)}km`,
    tripStopsCount: (count: number) => `${count}곳`,
    tripBtnRecalculate: "일정 재계산",
    tripBtnStartRoute: "여행 시작",
    tripBtnCompleteRoute: "여행 완료",
    tripStatusCompleted: "여행 경로를 완료했습니다.",
    tripBtnNewTrip: "새 일정 만들기",
    tripBtnBackToPlanner: "플래너로 돌아가기",
    tripEmptyTitle: "방문 장소가 없습니다",
    tripEmptyDesc: "조건을 변경하여 재계산하거나 새로운 일정을 만들어 보세요.",
    tripMapNote: "핀 번호는 일정 방문 순서이며 좌표는 WGS84 기준입니다.",
    tripTimelineLabel: "여행 일정 타임라인",
    tripSummaryHeading: "일정 요약",
    tripSummaryBadgeFallback: "규칙 기반 설명",

    // Place Card
    placeCategoryFallback: "카테고리 정보 없음",
    placeTagLocal: "골목 상권 로컬 매장",
    placeTagAnchor: "고정 목적지",
    placeReasonHeading: "추천 이유",
    placeShortDescriptionHeading: "장소 소개",
    placeVerifiedDescriptionHeading: "출처 기반 장소 소개",
    placeDescriptionSourceLink: "출처 확인",
    placePrevStopFitHeading: "이전 장소와의 연결",
    placeNextStopFitHeading: "다음 장소와의 연결",
    placeOverallTripFitHeading: "전체 일정과의 적합성",
    placeTourismEvidenceTitle: "관광 데이터 기반 보완 설명",
    placeTourismConcentration: "관광 집중도",
    placeTourismLocalDiscovery: "로컬 발견",
    placeTourismScopeArea: (areaName?: string | null) =>
      `(지역 단위${areaName ? ` · ${areaName}` : ""})`,
    placeTourismScopePlace: "(장소 단위)",
    placeTourismRefPeriod: (period: string) => `참조 기간: ${period}`,
    placeTourismNote:
      "관광 집중도는 참조 기간 내의 상대적 경향성 데이터이며, 실시간 매장 내부 혼잡도를 의미하지 않습니다.",
    placeFactStay: "체류",
    placeFactStayUnit: (mins: number) => `${mins}분`,
    placeFactCost: "예상 비용",
    placeFactCostNoData: "현장/상세 확인",
    placeFactCostFree: "무료",
    placeFactCostValue: (cost: string) => `${cost}원`,
    placeFactCostRange: (min: string, max: string) => `${min} ~ ${max}원`,
    placePriceEvidenceMenu: (menu: string) => `확인된 가격 정보: ${menu}`,
    placePriceEvidenceBenchmark: (disclaimer: string) => disclaimer,
    placePriceEvidenceSourceLink: "근거 확인",
    placePriceEvidenceRefPeriod: (period: string) => `(기준: ${period})`,
    totalBudgetMaxNote: "（최대 예상 비용 기준 안전 합산）",
    placeFactLeave: "출발",
    placeFactScore: "종합 적합도",
    placeCrowdNoteHeading: "혼잡도:",
    placeCrowdNoData: "데이터 없음",
    placeCrowdScopeArea: "지역 단위",
    placeCrowdScopeSuffix: (scope: string, area?: string | null) =>
      `(${scope}${area ? ` · ${area}` : ""})`,
    placeCrowdNotInsideShop: "특정 매장 내부의 혼잡도가 아닙니다.",
    placeCrowdDistanceRef: (area: string, meters: string) =>
      `${area}에서 약 ${meters}m 떨어진 관측 지역의 참고값입니다.`,
    placeDetailKakao: "카카오맵에서 상세정보 확인",
    placeDetailKakaoAria: (placeName: string) =>
      `${placeName}의 영업시간과 상세정보를 카카오맵에서 확인`,
    placeDetailExternalNote:
      "영업시간·가격 등의 최신 정보는 외부 페이지에서 확인해 주세요.",
    placeScoreToggle: "왜 여기가 추천되었나요? 스코어 내역",
    placeActionMovePrev: "앞으로",
    placeActionMoveNext: "뒤로",
    placeActionRemove: "삭제",
    placeActionAlternatives: "다른 후보 보기",
    placeActionAlternativesHide: "후보 닫기",
    placeAlternativesTitle: "🔄 추천 대안 장소",
    placeAlternativesLoading: "대안 후보를 검색 중...",
    placeAlternativesEmpty: "현재 대체 가능한 후보가 없습니다.",
    placeAlternativesSwapBtn: "이 장소로 교체",
    placeAlternativesSwapping: "교체 중...",

    // Score breakdown labels
    scores: {
      total: "종합",
      preference: "취향",
      crowd: "혼잡도 적합성",
      distance: "거리",
      time: "시간",
      budget: "예산",
      diversity: "다양성",
      area: "지역",
      tourismDispersion: "관광 분산 적합성",
      localImpact: "로컬 상권 발견",
      alternativeSimilarity: "대체지 유사성",
      tourismFlow: "관광 동선 적합성",
    },

    // Levels
    levels: {
      low: "상대적으로 낮음",
      medium: "보통",
      high: "높음",
      unavailable: "데이터 없음",
    },

    // Environment & Provider
    envBannerMockTitle: "MOCK / 검증 모드로 동작 중",
    envBannerMockDesc:
      "일부 외부 API 또는 관광 데이터가 모의 데이터입니다. 실서비스 운영 시 LIVE 모드로 연결됩니다.",

    // Auth & Member
    authLogin: "로그인",
    authRegister: "회원가입",
    authRedirectLoading: "Michi를 준비하고 있어요…",
    authStartEyebrow: "AI SEOUL ITINERARY",
    authStartTitle: "내 취향으로 만드는 서울 하루",
    authStartLede: "원하는 분위기와 시간에 맞춰 서울에서 보낼 하루의 동선을 정리해요.",
    authStartBadgeFree: "무료로 시작",
    authStartBadgeMinute: "입력 약 1분",
    authStartBadgeSaveEdit: "저장·수정 가능",
    authStartPreviewLabel: "Michi 일정 생성 화면",
    authStartChatCaptureLabel: "AI와 대화하며 만들기",
    authStartChatCaptureAlt: "원하는 하루를 대화로 말하는 Michi AI 일정 플래너 화면",
    authStartResultCaptureLabel: "하루 동선 확인",
    authStartResultCaptureAlt: "추천 장소와 이동 순서를 확인하는 Michi 일정 화면",
    authStartExamplesTitle: "이런 하루부터 시작할 수 있어요",
    authStartExampleOneTitle: "성수 카페와 여유로운 저녁",
    authStartExampleOneDesc: "조용한 카페, 산책, 저녁 식사를 하루에 담고 싶을 때",
    authStartExampleTwoTitle: "부모님과 걷는 서울 하루",
    authStartExampleTwoDesc: "무리 없는 속도로 볼거리와 식사를 고르고 싶을 때",
    authStartExampleThreeTitle: "비 오는 날 실내 데이트",
    authStartExampleThreeDesc: "날씨를 신경 쓰지 않고 실내 중심으로 보내고 싶을 때",
    authStartStepsTitle: "시작하는 방법",
    authStartStepOneTitle: "원하는 하루를 말해요",
    authStartStepOneDesc: "지역, 시간, 취향을 입력해요.",
    authStartStepTwoTitle: "장소 후보와 순서를 받아요",
    authStartStepTwoDesc: "하루의 흐름을 확인해요.",
    authStartStepThreeTitle: "저장한 뒤 나중에 수정해요",
    authStartStepThreeDesc: "일정이 바뀌어도 다시 조정할 수 있어요.",
    authStartRegisterCta: "무료로 일정 만들기",
    authStartLoginPrompt: "이미 계정이 있으신가요?",
    authStartLoginCta: "로그인",
    authBackToStart: "처음 화면으로 돌아가기",
    authLoginTitle: "다시, 서울 여행을 이어가요",
    authLoginLede: "저장한 일정을 확인하고, 계속 수정할 수 있어요.",
    authLoginSubmit: "로그인하고 일정 보기",
    authRegisterTitle: "일정을 저장할 계정을 만들어요",
    authRegisterLede: "만든 일정을 저장하고, 다음에도 이어서 확인할 수 있어요.",
    authRegisterSubmit: "회원가입하고 일정 만들기",
    authPageTitle: "나만의 서울 일정 만들기",
    authLoginValue: "로그인하면 서울 일정을 만들 수 있고, 만든 일정은 저장한 뒤 나중에 수정할 수 있습니다.",
    authRegisterValue: "무료 가입으로 서울 일정을 생성·저장·수정할 수 있습니다. 저장한 일정은 다음 여행 때도 다시 볼 수 있습니다.",
    authBenefitsTitle: "로그인하면 할 수 있는 일",
    authBenefitCreate: "취향과 일정에 맞는 서울 여행 일정 만들기",
    authBenefitSaveEdit: "일정을 저장하고 나중에 수정하기",
    authBenefitReview: "저장한 일정을 언제든 다시 보기",
    authEmailReason: "이메일은 만든 일정을 내 계정에 안전하게 저장하고, 다음에도 다시 수정할 수 있도록 사용하는 정보입니다.",
    authLogout: "로그아웃",
    authEmail: "이메일",
    authPassword: "비밀번호",
    authDisplayName: "닉네임",
    authPasswordHint: "8자 이상 입력해주세요",
    authLoginPrompt: "이미 계정이 있으신가요?",
    authRegisterPrompt: "계정이 없으신가요?",
    authLoginSuccess: "로그인되었습니다",
    authRegisterSuccess: "회원가입이 완료되었습니다",
    authLogoutSuccess: "로그아웃되었습니다",
    authProfile: "마이페이지",
    authMySavedTrips: "저장한 일정",
    authSaveTripBtn: "일정 저장하기",
    authTripSaved: "일정이 저장되었습니다",
    authSaveFailed: "저장에 실패했습니다",
    authNoSavedTrips: "저장된 일정이 아직 없습니다.",
    authMemo: "일정 메모",
    authMemoPlaceholder: "준비물이나 가보고 싶은 곳의 메모를 남길 수 있습니다",
    authSaveMemo: "메모 저장",
    authDeleteSavedTrip: "삭제",
    authDeleteConfirm: "이 저장된 일정을 삭제하시겠습니까?",
    authLoginRequiredToSave: "일정을 저장하려면 로그인이 필요합니다",
    authChangePassword: "비밀번호 변경",
    authCurrentPassword: "현재 비밀번호",
    authNewPassword: "새 비밀번호",
    authProfileUpdated: "프로필을 수정했습니다",
    authPasswordChanged: "비밀번호를 변경했습니다",
  },
};

export type Translations = (typeof DICTIONARY)["ja"];

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
  quickPrompts: QuickPrompt[];
}

let memoryLang: Language = "ja";
const listeners = new Set<() => void>();

function initClientLang(): Language {
  if (typeof window === "undefined") return "ja";
  try {
    const saved = localStorage.getItem("michi_locale") as Language | null;
    if (saved === "ja" || saved === "ko") return saved;
  } catch {
    // Ignored
  }
  return "ja";
}

if (typeof window !== "undefined") {
  memoryLang = initClientLang();
}

export function resetLanguage(lang: Language = "ja") {
  memoryLang = lang;
  try {
    localStorage.setItem("michi_locale", lang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  } catch {
    // Ignored
  }
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

function getSnapshot(): Language {
  return memoryLang;
}

function getServerSnapshot(): Language {
  return "ja";
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLang = (nextLang: Language) => {
    memoryLang = nextLang;
    try {
      localStorage.setItem("michi_locale", nextLang);
      document.documentElement.lang = nextLang;
    } catch {
      // Ignored
    }
    listeners.forEach((listener) => listener());
  };

  const value: I18nContextType = {
    lang,
    setLang,
    t: DICTIONARY[lang],
    quickPrompts: QUICK_PROMPTS[lang],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      lang: "ja",
      setLang: () => {},
      t: DICTIONARY.ja,
      quickPrompts: QUICK_PROMPTS.ja,
    };
  }
  return context;
}
