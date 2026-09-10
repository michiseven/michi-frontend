"use client";

import Link from "next/link";
import styled from "styled-components";

export const SkipLink = styled.a`
  position: fixed;
  z-index: 100;
  top: 8px;
  left: 16px;
  padding: 10px 14px;
  transform: translateY(-160%);
  background: var(--ink);
  color: white;
  &:focus { transform: translateY(0); }
`;

export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid color-mix(in srgb, var(--border), transparent 20%);
  background: color-mix(in srgb, var(--background), transparent 7%);
  backdrop-filter: blur(12px);
`;

export const HeaderInner = styled.div`
  display: flex;
  min-height: 64px;
  width: min(100% - 32px, 1440px);
  align-items: center;
  justify-content: space-between;
  margin-inline: auto;
  @media (max-width: 520px) { width: min(100% - 24px, 1120px); }
`;

export const Brand = styled(Link)`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  font-size: 20px;
  font-weight: 800;
  text-decoration: none;
`;

export const BrandMark = styled.span`
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 7px;
  background: var(--primary);
  color: white;
  font-family: Georgia, serif;
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const CityLabel = styled.span`
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
`;

export const Footer = styled.footer`
  width: min(100% - 32px, 1440px);
  margin-inline: auto;
  padding-block: 24px 40px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
  p { margin: 0; }
  @media (max-width: 520px) { width: min(100% - 24px, 1120px); }
`;
