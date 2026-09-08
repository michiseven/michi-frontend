import { notFound } from "next/navigation";

export default function MapPreviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (process.env.NODE_ENV !== "development") notFound();
  return children;
}
