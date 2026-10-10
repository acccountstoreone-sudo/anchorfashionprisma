import { ReactNode } from "react";

export default function OperationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="h-full w-full">{children}</div>;
}
