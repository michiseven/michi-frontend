import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import { I18nProvider } from "@/lib/i18n";
import { AuthModal } from "./auth-modal";

describe("AuthModal", () => {
  it("should not render when isOpen is false", () => {
    render(
      <I18nProvider>
        <AuthModal isOpen={false} onClose={vi.fn()} />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("should render login mode and allow switching to register", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <AuthModal isOpen={true} onClose={vi.fn()} />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("ログイン")[0]).toBeInTheDocument();

    // Click register tab
    const registerTab = screen.getByRole("tab", { name: "会員登録" });
    await user.click(registerTab);

    expect(screen.getByLabelText("ニックネーム")).toBeInTheDocument();
  });

  it("should submit login and call onSuccess", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    vi.spyOn(api, "loginUser").mockResolvedValueOnce({
      user: {
        id: "u-1",
        displayName: "田中太郎",
        email: "tanaka@test.com",
        locale: "ja",
        createdAt: "2026-08-27T00:00:00.000Z",
      },
      accessToken: "access-token",
      expiresIn: 3600,
    });

    render(
      <I18nProvider>
        <AuthModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />
      </I18nProvider>,
    );

    await user.type(screen.getByLabelText("メールアドレス"), "tanaka@test.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(api.loginUser).toHaveBeenCalledWith({
      email: "tanaka@test.com",
      password: "password123",
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
