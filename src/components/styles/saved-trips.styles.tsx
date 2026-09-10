"use client";

import Link from "next/link";
import styled from "styled-components";

export const SavedTripsList = styled.div`
  display: grid;
  gap: 16px;
`;

export const SavedTripCard = styled.article`
  padding: clamp(18px, 3vw, 24px);
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
`;

export const SavedTripHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const SavedTripTitle = styled.h2`
  margin: 0 0 8px;
  color: var(--ink);
  font-size: 18px;
`;

export const SavedTripMeta = styled.p`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin: 0;
  color: var(--muted);
  font-size: 13px;

  span {
    display: inline-flex;
    align-items: center;
  }
  svg {
    margin-right: 4px;
  }
`;

export const SavedTripActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ActionBase = `
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
`;

export const SecondaryAction = styled(Link)`
  ${ActionBase}
  border: 1px solid var(--border-strong, var(--border));
  background: var(--surface);
  color: var(--ink);
  &:hover {
    border-color: var(--primary);
    color: var(--primary-hover);
  }
`;

export const DeleteAction = styled.button`
  ${ActionBase}
  border: 1px solid transparent;
  background: transparent;
  color: #a43b27;
  &:hover {
    background: var(--danger-soft);
  }
`;

export const MemoSection = styled.section`
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
`;

export const MemoDisplay = styled.div`
  display: flex;
  min-height: 44px;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-subtle);
  cursor: pointer;
  font-size: 13px;
  transition:
    background 150ms ease,
    border-color 150ms ease;

  &:hover,
  &:focus-visible {
    border-color: var(--primary);
    background: var(--primary-soft);
    outline: 0;
  }
`;

export const MemoLabel = styled.span`
  display: inline-flex;
  align-items: center;
  flex: none;
  margin-right: 6px;
  color: var(--ink);
  font-weight: 700;
  svg {
    margin-right: 4px;
  }
`;

export const EmptyMemo = styled.span`
  color: var(--muted);
  font-style: italic;
`;

export const MemoEditor = styled.div`
  display: grid;
  gap: 8px;
`;

export const MemoTextarea = styled.textarea`
  width: 100%;
  min-height: 76px;
  resize: vertical;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  &:focus {
    border-color: var(--primary);
    outline: 0;
    box-shadow: 0 0 0 3px rgb(15 98 83 / 16%);
  }
`;

export const MemoEditorActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const PrimaryAction = styled.button`
  ${ActionBase}
  border: 1px solid var(--primary);
  background: var(--primary);
  color: white;
  &:hover:not(:disabled) {
    background: var(--primary-hover);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const GhostAction = styled.button`
  ${ActionBase}
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink);
  &:hover:not(:disabled) {
    background: var(--surface-subtle);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const EmptyState = styled.section`
  padding: 40px 20px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
  text-align: center;
  p {
    margin: 0 0 16px;
    font-size: 17px;
  }
`;

export const EmptyStateLink = styled(Link)`
  ${ActionBase}
  border: 1px solid var(--primary);
  background: var(--primary);
  color: white;
  &:hover {
    background: var(--primary-hover);
  }
`;

export const LoadingState = styled.div`
  display: grid;
  gap: 12px;
`;

export const LoadingCard = styled.div`
  height: 120px;
  border-radius: 14px;
  background: linear-gradient(
    90deg,
    var(--surface-subtle),
    var(--surface),
    var(--surface-subtle)
  );
  background-size: 200% 100%;
  animation: savedTripPulse 1.4s ease-in-out infinite;
  @keyframes savedTripPulse {
    to {
      background-position: -200% 0;
    }
  }
`;
