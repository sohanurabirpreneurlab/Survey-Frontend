import { BrandMark } from "./brand-mark";
import { Spinner } from "./ui/spinner";

export const RestoreScreen = ({ message }: { message: string }) => (
  <div className="flex min-h-screen items-center justify-center p-6">
    <div className="w-full max-w-[560px] rounded-app-lg border border-[rgba(216,225,239,0.9)] [border-style:solid] bg-white/[0.92] p-9 shadow-app max-app-mobile:p-[22px]">
      <BrandMark />
      <div className="mt-6 flex items-center gap-3">
        <Spinner />
        <p>{message}</p>
      </div>
    </div>
  </div>
);
