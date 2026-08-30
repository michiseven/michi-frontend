"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { BookmarkIcon, LogoutIcon, UserIcon } from "./icons";
import { AuthModal } from "./auth-modal";

export function UserMenu() {
  const { t } = useI18n();
  const user = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await logoutUser();
  }

  function openAuth(mode: "login" | "register") {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }

  if (!user) {
    return (
      <div className="user-nav-container">
        <button
          type="button"
          className="button button-ghost button-sm user-login-btn"
          onClick={() => openAuth("login")}
        >
          <UserIcon />
          {t.authLogin}
        </button>
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    );
  }

  const initials = user.displayName.slice(0, 2).toUpperCase();

  return (
    <div className="user-menu-wrapper" ref={menuRef}>
      <button
        type="button"
        className="user-avatar-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`${user.displayName}のユーザーメニュー`}
      >
        <span className="user-avatar-badge" aria-hidden="true">
          {initials}
        </span>
        <span className="user-display-name">{user.displayName}</span>
      </button>

      {menuOpen && (
        <div className="user-dropdown-menu" role="menu">
          <div className="user-dropdown-header">
            <p className="user-dropdown-name">{user.displayName}</p>
            <p className="user-dropdown-email">{user.email}</p>
          </div>
          <hr className="dropdown-divider" />
          <Link
            href="/saved-trips"
            className="dropdown-item"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            <BookmarkIcon />
            {t.authMySavedTrips}
          </Link>
          <Link
            href="/profile"
            className="dropdown-item"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            <UserIcon />
            {t.authProfile}
          </Link>
          <hr className="dropdown-divider" />
          <button
            type="button"
            className="dropdown-item logout-item"
            role="menuitem"
            onClick={handleLogout}
          >
            <LogoutIcon />
            {t.authLogout}
          </button>
        </div>
      )}
    </div>
  );
}
