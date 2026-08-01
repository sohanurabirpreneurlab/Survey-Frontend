import { Outlet } from "react-router-dom";

import { BrandMark } from "../brand-mark";

export const AuthLayout = () => (
  <div className="grid min-h-screen grid-cols-[1.05fr_0.95fr] max-app-wide:grid-cols-1">
    <section className="flex flex-col justify-between border-r border-[rgba(193,210,234,0.7)] [border-style:solid] bg-app-auth-panel p-12 max-app-wide:min-h-[280px] max-app-mobile:p-[22px]">
      <BrandMark />
      <div className="max-w-[560px]">
        <p className="mt-0 mb-3 text-[0.82rem] font-bold tracking-[0.08em] text-app-primary uppercase">Survey operations</p>
        <h1 className="mt-0 mb-[18px] text-[clamp(2rem,3vw,3.4rem)] leading-[1.05]">
          Launch, review, and manage business surveys from one calm workspace.
        </h1>
        <p className="m-0 max-w-[44rem] text-[1.03rem] text-app-text-soft">
          Secure authentication, approval-aware access control, and a dashboard
          foundation designed for the survey platform you are building next.
        </p>
      </div>
    </section>
    <section className="flex items-center justify-center p-12 max-app-mobile:p-[22px]">
      <Outlet />
    </section>
  </div>
);
