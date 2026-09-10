"use client";

import styled, { css } from "styled-components";

export const PlannerContainer = styled.section`
  width: 100%;
`;

export const PlannerLayout = styled.div<{ $hasTrip: boolean }>`
  width: 100%;
  margin-inline: auto;
  transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1);

  ${({ $hasTrip }) =>
    $hasTrip
      ? css`
          display: grid;
          grid-template-columns: minmax(360px, 420px) minmax(0, 1fr);
          gap: 24px;
          align-items: start;
          animation: planner-fade-in 220ms ease-out;
        `
      : css`
          max-width: 680px;
        `}

  @keyframes planner-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 900px) {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const ChatColumn = styled.section`
  display: flex;
  flex-direction: column;
  height: 760px;
  overflow: hidden;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  background: var(--surface);
  box-shadow: 0 10px 30px rgb(0 0 0 / 5%);

  @media (max-width: 640px) {
    height: min(760px, calc(100dvh - 132px));
    border-radius: 14px;
  }
`;

export const PlannerToolbar = styled.div`
  display: grid;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.82rem;
`;

export const MessageList = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  padding: 18px;
  background: #f8fafc;
`;

export const Composer = styled.form`
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-top: 1px solid #e2e8f0;
  background: var(--surface);
`;

export const ItineraryPanel = styled.aside`
  height: 760px;
  overflow: hidden;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  background: var(--surface);
  box-shadow: 0 10px 30px rgb(0 0 0 / 5%);
  animation: planner-fade-in 220ms ease-out;

  @media (max-width: 640px) { height: auto; min-height: 600px; border-radius: 14px; }
`;

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgb(15 23 42 / 42%);
`;

export const ScheduleDialog = styled.div`
  width: min(100%, 430px);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 24px;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 24px 56px rgb(15 23 42 / 24%);
`;
