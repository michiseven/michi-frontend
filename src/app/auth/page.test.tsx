import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, resetLanguage } from "@/lib/i18n";
import AuthPage from "./page";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));
const authMock = vi.hoisted(() => ({
  isAuthenticated: vi.fn(),
  setAuthSession: vi.fn(),
}));
const apiMock = vi.hoisted(() => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => routerMock }));
vi.mock("@/lib/auth", () => authMock);
vi.mock("@/lib/api", () => apiMock);

const authResponse = {
  accessToken: "access-token",
  expiresIn: 3600,
  user: {
    id: "user-1",
    displayName: "Michi",
    email: "michi@example.com",
    locale: "ja" as const,
    createdAt: "2026-09-03T00:00:00.000Z",
  },
};

function renderPage() {
  return render(
    <I18nProvider>
      <AuthPage />
    </I18nProvider>,
  );
}

describe("AuthPage", () => {
  beforeEach(() => {
    resetLanguage("ja");
    routerMock.replace.mockReset();
    authMock.isAuthenticated.mockReturnValue(false);
    authMock.setAuthSession.mockReset();
    apiMock.loginUser.mockReset();
    apiMock.registerUser.mockReset();
  });

  it("renders a start screen before exposing an auth form", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "好みからつくる、ソウルの一日" })).toBeInTheDocument();
    expect(screen.getByText("聖水でカフェとゆっくり夕食")).toBeInTheDocument();
    expect(screen.getByText("ご両親と歩くソウルの一日")).toBeInTheDocument();
    expect(screen.getByText("雨の日の室内デート")).toBeInTheDocument();
    expect(screen.getByText("過ごしたい一日を伝える")).toBeInTheDocument();
    expect(screen.getByText("候補と順番を受け取る")).toBeInTheDocument();
    expect(screen.getByText("保存して、あとから編集する")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "希望を会話で伝えるMichiのAI旅程プランナー画面" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "おすすめの場所と移動順を確認するMichiの旅程画面" })).toBeInTheDocument();
    expect(screen.queryByLabelText("メールアドレス")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("パスワード")).not.toBeInTheDocument();
  });

  it("renders the Korean start copy", () => {
    resetLanguage("ko");
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "내 취향으로 만드는 서울 하루" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "무료로 일정 만들기" })).toBeInTheDocument();
    expect(screen.getByText("성수 카페와 여유로운 저녁")).toBeInTheDocument();
    expect(screen.getByText("부모님과 걷는 서울 하루")).toBeInTheDocument();
    expect(screen.getByText("비 오는 날 실내 데이트")).toBeInTheDocument();
  });

  it("opens registration from the primary CTA and explains email use only there", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByText(/メールアドレスは、作成した旅程/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "無料で旅程をつくる" }));
    expect(screen.getByRole("heading", { level: 1, name: "旅程を保存するアカウントをつくりましょう" })).toBeInTheDocument();
    expect(screen.getByText(/メールアドレスは、作成した旅程/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "最初の画面に戻る" })).toBeInTheDocument();
  });

  it("opens login from the existing-user action and keeps accessible tab switching", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "ログイン" }));
    expect(screen.getByRole("heading", { level: 1, name: "もう一度、ソウル旅行を続けましょう" })).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "ログイン" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "会員登録" }));
    expect(screen.getByRole("heading", { level: 1, name: "旅程を保存するアカウントをつくりましょう" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "会員登録" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("button", { name: "最初の画面に戻る" }));
    expect(screen.getByRole("heading", { level: 1, name: "好みからつくる、ソウルの一日" })).toBeInTheDocument();
  });

  it("redirects an already authenticated user to the planner", async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    renderPage();

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/"));
    expect(screen.getByRole("status")).toHaveTextContent("Michiを準備しています…");
    expect(screen.queryByRole("heading", { level: 1, name: "好みからつくる、ソウルの一日" })).not.toBeInTheDocument();
  });

  it("replaces the auth page with the planner after login", async () => {
    apiMock.loginUser.mockResolvedValue(authResponse);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "ログイン" }));
    await user.type(screen.getByLabelText("メールアドレス"), "michi@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログインして旅程を見る" }));

    await waitFor(() => expect(apiMock.loginUser).toHaveBeenCalledWith({ email: "michi@example.com", password: "password123" }));
    expect(authMock.setAuthSession).toHaveBeenCalledWith(authResponse);
    expect(routerMock.replace).toHaveBeenCalledWith("/");
  });

  it("replaces the auth page with the planner after registration", async () => {
    apiMock.registerUser.mockResolvedValue(authResponse);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "無料で旅程をつくる" }));
    await user.type(screen.getByLabelText("ニックネーム"), "田中");
    await user.type(screen.getByLabelText("メールアドレス"), "michi@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "会員登録して旅程をつくる" }));

    await waitFor(() => expect(apiMock.registerUser).toHaveBeenCalledWith({
      displayName: "田中",
      email: "michi@example.com",
      password: "password123",
      locale: "ja",
    }));
    expect(authMock.setAuthSession).toHaveBeenCalledWith(authResponse);
    expect(routerMock.replace).toHaveBeenCalledWith("/");
  });
});
