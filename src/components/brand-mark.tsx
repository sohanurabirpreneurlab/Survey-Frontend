import { BarChart3 } from "lucide-react";

import { env } from "../lib/env";

export const BrandMark = () => (
  <div className="brand-mark">
    <div className="brand-mark-icon">
      <BarChart3 size={18} />
    </div>
    <div>
      <p className="brand-mark-title">{env.appName}</p>
      <p className="brand-mark-subtitle">Business survey workspace</p>
    </div>
  </div>
);
