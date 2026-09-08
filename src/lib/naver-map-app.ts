export interface NaverRouteStop {
  placeName: string;
  latitude: number;
  longitude: number;
}

/**
 * NAVER 지도 앱은 출발지·도착지 사이에 경유지 다섯 곳까지 허용한다.
 * 앱이 실제 보행 네트워크를 계산하므로 Michi는 경로를 추정하거나 그리지 않는다.
 */
export function createNaverWalkingRouteUrl(
  stops: NaverRouteStop[],
  appName: string,
): string | null {
  if (stops.length < 2 || stops.length > 7) return null;
  const origin = stops[0];
  const destination = stops.at(-1);
  if (!origin || !destination) return null;

  const params = new URLSearchParams({
    slat: String(origin.latitude),
    slng: String(origin.longitude),
    sname: origin.placeName,
    dlat: String(destination.latitude),
    dlng: String(destination.longitude),
    dname: destination.placeName,
    appname: appName,
  });
  stops.slice(1, -1).forEach((stop, index) => {
    const waypoint = index + 1;
    params.set(`v${waypoint}lat`, String(stop.latitude));
    params.set(`v${waypoint}lng`, String(stop.longitude));
    params.set(`v${waypoint}name`, stop.placeName);
  });
  return `nmap://route/walk?${params.toString()}`;
}
