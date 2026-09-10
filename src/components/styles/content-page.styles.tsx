"use client";

import Link from "next/link";
import styled from "styled-components";

export const ContentPage = styled.main`
  width: min(100% - 32px, 1440px);
  min-height: calc(100vh - 180px);
  margin-inline: auto;
  padding-block: 32px 72px;
  @media (max-width: 520px) {
    width: min(100% - 24px, 1440px);
    padding-top: 20px;
  }
`;

export const ContentNarrow = styled.div`
  width: min(100%, 960px);
  margin-inline: auto;
`;

export const BackLink = styled(Link)`
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: 1px solid var(--border-strong, var(--border));
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  &:hover {
    border-color: var(--primary);
    color: var(--primary-hover);
  }
`;

export const ErrorState = styled.section`
  margin-top: 24px;
  padding: clamp(20px, 4vw, 32px);
  border: 1px solid #e0aaa3;
  border-radius: 14px;
  background: var(--danger-soft);
  color: #7e2020;
  h2,
  p {
    margin-top: 0;
  }
  p {
    margin-bottom: 0;
  }
`;

export const InlineLoading = styled.section`
  display: grid;
  gap: 12px;
  margin-top: 24px;
  color: var(--muted);
`;

export const LoadingTitle = styled.div`
  width: min(46%, 280px);
  height: 26px;
  border-radius: 7px;
  background: var(--surface-subtle);
`;

export const LoadingCard = styled.div`
  height: 130px;
  border-radius: 14px;
  background: var(--surface-subtle);
`;

export const MapPreviewSection = styled.section`
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
`;

export const MapPreviewHeading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: clamp(20px, 4vw, 30px);

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 8px;
    font-size: 20px;
  }
  h2 svg {
    color: var(--primary);
  }
  p {
    margin: 0;
    color: var(--muted);
  }
  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const MapPreviewNote = styled.p`
  margin: 0;
  padding: 16px clamp(20px, 4vw, 30px) 20px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 14px;
`;
