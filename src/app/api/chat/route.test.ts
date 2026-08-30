import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";
import * as api from "@/lib/api";

describe("/api/chat route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("safely proxies chat messages to sendChatMessage with threadSecret", async () => {
    vi.spyOn(api, "createChatThread").mockResolvedValue({
      threadId: "thread-test-1",
      threadSecret: "secret-test-1",
    });
    vi.spyOn(api, "sendChatMessage").mockResolvedValue({
      threadId: "thread-test-1",
      threadSecret: "secret-test-1",
      status: "completed",
      responseMessage: "Michi는 서울 도심 및 로컬 상권 여행 전문 서비스입니다.",
    });

    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "DMZ 투어랑 판문점 일정 짜줘" }],
        locale: "ko",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.responseMessage).toContain("Michi는 서울 도심 및 로컬 상권 여행 전문 서비스입니다");
    expect(data.status).toBe("completed");
    expect(data.threadSecret).toBe("secret-test-1");
  });

  it("returns clarifying action chips for vague prompts", async () => {
    vi.spyOn(api, "createChatThread").mockResolvedValue({
      threadId: "thread-test-2",
      threadSecret: "secret-test-2",
    });
    vi.spyOn(api, "sendChatMessage").mockResolvedValue({
      threadId: "thread-test-2",
      status: "completed",
      responseMessage: "어떤 분위기의 서울 여행을 원하시나요?",
      actionChips: [
        { label: "☕ 성수: 감성 카페", query: "성수동 카페", type: "clarify" },
      ],
    });

    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "추천해줘" }],
        locale: "ko",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.actionChips).toBeDefined();
    expect(data.actionChips.length).toBeGreaterThan(0);
  });

  it("proxies resume commands to resumeChatThread with editToken and threadSecret", async () => {
    vi.spyOn(api, "resumeChatThread").mockResolvedValue({
      threadId: "thread-test-3",
      status: "completed",
      responseMessage: "일정이 성공적으로 수정되었습니다.",
      resultTripId: "trip-123",
    });

    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "x-thread-secret": "secret-test-3",
        "x-trip-edit-token": "edit-token-123",
      },
      body: JSON.stringify({
        threadId: "thread-test-3",
        action: "resume",
        decision: "approve",
        chosenPlaceId: "p-alt-1",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.responseMessage).toContain("일정이 성공적으로 수정되었습니다");
    expect(data.resultTripId).toBe("trip-123");
    expect(api.resumeChatThread).toHaveBeenCalledWith("thread-test-3", {
      decision: "approve",
      chosenPlaceId: "p-alt-1",
      threadSecret: "secret-test-3",
      editToken: "edit-token-123",
    });
  });

  it("rejects a resume request without an explicit decision", async () => {
    const resumeSpy = vi.spyOn(api, "resumeChatThread");
    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        threadId: "thread-test-4",
        action: "resume",
        chosenPlaceId: "p-alt-1",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorCode).toBe("INVALID_RESUME_DECISION");
    expect(resumeSpy).not.toHaveBeenCalled();
  });
});
