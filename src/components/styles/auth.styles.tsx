"use client";

import styled from "styled-components";

export const AuthPageShell = styled.main`
  width: min(100% - 32px, 1440px);
  min-height: calc(100vh - 180px);
  margin-inline: auto;
  padding-block: 52px 72px;
  @media (max-width: 520px) { width: min(100% - 24px, 1120px); padding-top: 24px; }
`;

export const AuthNarrow = styled.div`
  width: min(100%, 760px);
  margin-inline: auto;
`;

export const AuthCard = styled.section`
  padding: clamp(20px, 4vw, 36px);
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow);
`;

export const AuthHeading = styled.div`
  margin-bottom: 24px;
  text-align: center;
  h1 { margin: 0; }
  p { margin-bottom: 0; }
`;

export const AuthTabList = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 20px;
  padding: 4px;
  border-radius: 10px;
  background: var(--surface-subtle);
`;

export const AuthTab = styled.button<{ $active: boolean }>`
  min-height: 44px;
  border: 0;
  border-radius: 7px;
  background: ${({ $active }) => ($active ? "var(--surface)" : "transparent")};
  color: ${({ $active }) => ($active ? "var(--ink)" : "var(--muted)")};
  box-shadow: ${({ $active }) => ($active ? "0 1px 3px rgb(22 35 31 / 12%)" : "none")};
  font-weight: 750;
  cursor: pointer;
`;

export const AuthForm = styled.form`
  display: grid;
  gap: 16px;
`;

export const AuthField = styled.div`
  display: grid;
  gap: 7px;
  label { color: var(--ink); font-size: 14px; font-weight: 700; }
  input { min-height: 44px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--ink); }
  input:focus { border-color: var(--primary); outline: 0; box-shadow: 0 0 0 3px rgb(15 98 83 / 16%); }
`;

export const AuthSubmit = styled.button`
  display: inline-flex;
  min-height: 44px;
  width: 100%;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: white;
  font-weight: 750;
  cursor: pointer;
  &:hover:not(:disabled) { background: var(--primary-hover); }
  &:disabled { cursor: not-allowed; opacity: 0.55; }
`;

export const AuthFooter = styled.div`
  margin-top: 20px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 14px;
  text-align: center;
  p { margin: 18px 0 0; }
`;
