import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "@/components/language-switcher";
import { I18nProvider, resetLanguage } from "@/lib/i18n";
import HomePage from "./page";

const authMock = vi.hoisted(() => ({ useAuth: vi.fn() }));
const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("@/lib/auth", () => authMock);
vi.mock("next/navigation", () => ({ useRouter: () => routerMock }));
vi.mock("@/components/generative-chat-planner", () => ({
  GenerativeChatPlanner: () => <section aria-label="AI chat planner">AI chat planner</section>,
}));

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider>
      <header>
        <LanguageSwitcher />
      </header>
      {ui}
    </I18nProvider>,
  );
}

describe("chat-only planner entry", () => {
  beforeEach(() => {
    authMock.useAuth.mockReturnValue({ id: "user-1", displayName: "Michi", email: "michi@example.com" });
    routerMock.replace.mockReset();
    resetLanguage("ja");
  });

  it("redirects a guest to the login page before exposing the planner", async () => {
    authMock.useAuth.mockReturnValue(null);
    renderWithI18n(<HomePage />);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/auth"));
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "AI chat planner" })).not.toBeInTheDocument();
  });

  it("links to the NAVER Maps preview page", () => {
    renderWithI18n(<HomePage />);

    expect(screen.getByRole("link", { name: "地図の表示を確認" })).toHaveAttribute("href", "/map-preview");
  });

  it("shows only the AI conversation planner for an authenticated user", () => {
    renderWithI18n(<HomePage />);

    expect(screen.getByRole("region", { name: "AI chat planner" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /フォームで直接入力|폼으로 직접 입력/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/どんな一日にしたいですか|어떤 하루를 보내고 싶으신가요/)).not.toBeInTheDocument();
  });
});
