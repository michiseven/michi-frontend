import { describe, expect, it } from "vitest";
import { localizeCategory, localizePlaceName, localizePlaceText } from "./place-localization";

describe("place localization", () => {
  it("한국어 화면에서 Mock 장소명을 번역하되 Mock 표시는 유지한다", () => {
    expect(localizePlaceName("[MOCK] 焼肉店", "ko")).toBe("[MOCK] 고깃집");
  });

  it("KTO 일문 장소명에 공식 한글 별칭이 있으면 그 별칭을 사용한다", () => {
    expect(localizePlaceName("オンギンダル（옹근달）", "ko")).toBe("옹근달");
  });

  it("알 수 없는 원문 이름은 추측해서 번역하지 않는다", () => {
    expect(localizePlaceName("未知の場所", "ko")).toBe("未知の場所");
  });

  it("기존 설명 안의 알려진 Mock 명칭과 상태 코드를 한국어로 표시한다", () => {
    expect(localizePlaceText("[MOCK] 焼肉店의 혼잡도는 MOCK_NORMAL입니다.", "ko")).toBe(
      "[MOCK] 고깃집의 혼잡도는 보통(모의 데이터)입니다.",
    );
  });

  it("카테고리를 선택 언어로 표시한다", () => {
    expect(localizeCategory("restaurant", "ko")).toBe("음식점");
    expect(localizeCategory("restaurant", "ja")).toBe("飲食店");
  });
});
