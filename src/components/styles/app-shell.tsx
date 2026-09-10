"use client";

import styled, { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  :root {
    --background: #f7f5ef;
    --surface: #ffffff;
    --surface-subtle: #eeece5;
    --ink: #16231f;
    --muted: #5b6863;
    --border: #d7d9d2;
    --primary: #0f6253;
    --primary-hover: #0a4c40;
    --focus: #1769aa;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html { color-scheme: light; scroll-behavior: smooth; }
  body { margin: 0; background: var(--background); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", sans-serif; font-size: 16px; line-height: 1.55; }
  button, input, textarea, select { font: inherit; }
  :focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; } }
`;

export const PlannerPage = styled.main`
  width: min(100% - 32px, 1440px);
  min-height: calc(100vh - 180px);
  margin-inline: auto;
  padding-block: 32px 72px;
`;

export const PlannerPageContent = styled.div`
  width: min(100%, 1400px);
  margin-inline: auto;
`;
