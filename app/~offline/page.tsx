import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 rounded-full bg-muted p-6">
        <WifiOff className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="mb-2 text-2xl font-bold">You are offline</h1>
      <p className="max-w-[400px] text-muted-foreground">
        It looks like you've lost your internet connection. Please check your
        network and try again.
      </p>
    </div>
  );
}
