import { Outlet } from "react-router-dom";

import { BrandMark } from "../brand-mark";

export const AuthLayout = () => (
  <div className="auth-layout">
    <section className="auth-panel auth-panel-brand">
      <BrandMark />
      <div className="auth-hero-copy">
        <p className="eyebrow">Survey operations</p>
        <h1>Launch, review, and manage business surveys from one calm workspace.</h1>
        <p>
          Secure authentication, approval-aware access control, and a dashboard
          foundation designed for the survey platform you are building next.
        </p>
      </div>
    </section>
    <section className="auth-panel auth-panel-form">
      <Outlet />
    </section>
  </div>
);
