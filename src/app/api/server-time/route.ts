import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // URL 유효성 검사 (프로토콜 자동 추가)
    let targetUrl: URL;
    try {
      let normalizedUrl = url.trim();
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      targetUrl = new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // 외부 사이트에 HEAD 요청 (가벼움)
    const startTime = Date.now();
    const response = await fetch(targetUrl.toString(), {
      method: "HEAD",
      cache: "no-store",
    });
    const endTime = Date.now();

    // Date 헤더에서 서버 시간 추출
    const serverDateHeader = response.headers.get("date");

    if (!serverDateHeader) {
      return NextResponse.json(
        { error: "Server did not return a Date header" },
        { status: 400 }
      );
    }

    const serverTime = new Date(serverDateHeader).getTime();
    const latency = endTime - startTime;

    // 네트워크 지연을 고려한 보정 (왕복 시간의 절반)
    const adjustedServerTime = serverTime + Math.floor(latency / 2);

    return NextResponse.json({
      serverTime: adjustedServerTime,
      serverTimeISO: new Date(adjustedServerTime).toISOString(),
      latency,
      url: targetUrl.origin,
    });
  } catch (error) {
    console.error("Error fetching server time:", error);
    return NextResponse.json(
      { error: "Failed to fetch server time" },
      { status: 500 }
    );
  }
}
