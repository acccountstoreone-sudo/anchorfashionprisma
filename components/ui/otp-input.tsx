import * as React from "react";
import { Input } from "@/components/ui/input";

export function OTPInput({
  length = 6,
  value,
  onChange,
}: {
  length?: number;
  value: string;
  onChange: (val: string) => void;
}) {
  // Basic implementation, a production one would use specialized otp input library or refs array
  return (
    <Input
      type="text"
      maxLength={length}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
      className="text-center font-mono text-lg tracking-[1em]"
    />
  );
}
