"use client";

import styled from "styled-components";

export const ProfileCard = styled.section`
  padding: clamp(20px, 4vw, 30px);
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
  & + & { margin-top: 24px; }
  h2 { margin: 0 0 20px; font-size: 20px; }
`;

export const StatusBanner = styled.div<{ $tone: "success" | "error" }>`
  margin-bottom: 16px;
  padding: 10px 12px;
  border: 1px solid ${({ $tone }) => ($tone === "success" ? "#9bcab8" : "#e0aaa3")};
  border-radius: 8px;
  background: ${({ $tone }) => ($tone === "success" ? "var(--primary-soft)" : "var(--danger-soft)")};
  color: ${({ $tone }) => ($tone === "success" ? "var(--primary-hover)" : "#7e2020")};
  font-size: 14px;
`;

export const ProfileActions = styled.div`
  margin-top: 32px;
  text-align: center;
`;
