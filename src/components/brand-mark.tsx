import { BarChart3 } from "lucide-react";

import { env } from "../lib/env";

export const BrandMark = () => (
  <div className="inline-flex items-center gap-3.5">
    <div className="inline-flex size-[42px] items-center justify-center rounded-[14px] bg-app-brand text-white">
      <BarChart3 size={18} />
    </div>
    <div>
      <p className="m-0 text-base font-bold">{env.appName}</p>
      <p className="m-0 text-[0.92rem] text-app-text-faint">Business survey workspace</p>
    </div>
  </div>
);
