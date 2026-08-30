import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as auth from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { UserMenu } from "./user-menu";

describe("UserMenu", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should show login button when user is not logged in", () => {
    vi.spyOn(auth, "useAuth").mockReturnValue(null);

    render(
      <I18nProvider>
        <UserMenu />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("should show user avatar badge and toggle dropdown menu when logged in", async () => {
    const user = userEvent.setup();
    vi.spyOn(auth, "useAuth").mockReturnValue({
      id: "u-1",
      displayName: "田中太郎",
      email: "tanaka@test.com",
      locale: "ja",
      createdAt: "2026-08-27T00:00:00.000Z",
    });

    render(
      <I18nProvider>
        <UserMenu />
      </I18nProvider>,
    );

    const avatarBtn = screen.getByRole("button", { name: /田中太郎のユーザーメニュー/ });
    expect(avatarBtn).toBeInTheDocument();
    expect(screen.getByText("田中太郎")).toBeInTheDocument();

    // Click to open menu
    await user.click(avatarBtn);

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("保存した旅程")).toBeInTheDocument();
    expect(screen.getByText("マイページ")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /ログアウト/ })).toBeInTheDocument();
  });
});
