import { NextResponse } from "next/server";
import { createChatThread, sendChatMessage, resumeChatThread } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const threadSecret =
      body.threadSecret || req.headers.get("x-thread-secret") || undefined;
    const editToken =
      body.editToken || req.headers.get("x-trip-edit-token") || undefined;

    // If resume request
    if (body.threadId && body.action === "resume") {
      if (body.decision !== "approve" && body.decision !== "reject") {
        return NextResponse.json(
          {
            status: "failed",
            responseMessage: "승인 또는 거절 여부를 명시해 주세요.",
            errorCode: "INVALID_RESUME_DECISION",
          },
          { status: 400 },
        );
      }
      const result = await resumeChatThread(body.threadId, {
        decision: body.decision,
        chosenPlaceId: body.chosenPlaceId,
        threadSecret,
        editToken,
      });
      return NextResponse.json(result);
    }

    // Standard send message
    let threadId = body.threadId;
    let createdSecret = threadSecret;
    if (!threadId) {
      const threadRes = await createChatThread(
        body.locale,
        body.currentTripId || body.currentTrip?.id,
      );
      threadId = threadRes.threadId;
      createdSecret = threadRes.threadSecret;
    }

    const lastMsg = Array.isArray(body.messages)
      ? body.messages[body.messages.length - 1]?.content || ""
      : body.message || "";

    const result = await sendChatMessage(threadId, {
      message: lastMsg,
      locale: body.locale,
      currentTripId: body.currentTripId || body.currentTrip?.id,
      profile: body.profile,
      threadSecret: createdSecret,
      editToken,
    });

    if (createdSecret && !result.threadSecret) {
      result.threadSecret = createdSecret;
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[BFF /api/chat error]", error);
    return NextResponse.json(
      {
        status: "failed",
        responseMessage: "일시적인 통신 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        errorCode: "BFF_CHAT_ERROR",
      },
      { status: 500 },
    );
  }
}
