import { describe, expect, it } from "vitest";
import { createNaverWalkingRouteUrl } from "./naver-map-app";

describe("createNaverWalkingRouteUrl", () => {
  it("creates an official NAVER walking route scheme with ordered waypoints", () => {
    const url = createNaverWalkingRouteUrl([
      { placeName: "성수역", latitude: 37.5445, longitude: 127.0557 },
      { placeName: "서울숲", latitude: 37.5444, longitude: 127.0374 },
      { placeName: "뚝섬역", latitude: 37.5472, longitude: 127.0474 },
    ], "https://michi.example");

    expect(url).toContain("nmap://route/walk?");
    expect(url).toContain("sname=%EC%84%B1%EC%88%98%EC%97%AD");
    expect(url).toContain("v1name=%EC%84%9C%EC%9A%B8%EC%88%B2");
    expect(url).toContain("dname=%EB%9A%9D%EC%84%AC%EC%97%AD");
  });

  it("does not silently omit stops beyond NAVER's waypoint limit", () => {
    expect(createNaverWalkingRouteUrl(Array.from({ length: 8 }, (_, index) => ({ placeName: `장소 ${index}`, latitude: 37.5, longitude: 127 })), "https://michi.example")).toBeNull();
  });
});
