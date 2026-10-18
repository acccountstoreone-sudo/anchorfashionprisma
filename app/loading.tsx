import { AnchorFashionLogo } from "@/components/shared/logo";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center py-20">
      <div className="w-[180px] animate-pulse sm:w-[220px]">
        <AnchorFashionLogo />
      </div>
    </div>
  );
}
