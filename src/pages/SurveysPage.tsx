import { FilePlus2, ListChecks, Sparkles } from "lucide-react";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

export const SurveysPage = () => (
  <div className="dashboard-page">
    <section className="dashboard-hero">
      <div>
        <p className="eyebrow">Survey workspace</p>
        <h1>Surveys</h1>
        <p>
          This section is now a real page in the app shell, ready for survey creation and
          lifecycle management work.
        </p>
      </div>
    </section>

    <section className="dashboard-grid">
      <Card className="dashboard-card">
        <div className="dashboard-card-icon">
          <FilePlus2 size={18} />
        </div>
        <div>
          <h2>Create surveys</h2>
          <p>Wire your draft creation, sections, questions, and publish flows into this area next.</p>
        </div>
      </Card>
      <Card className="dashboard-card">
        <div className="dashboard-card-icon">
          <ListChecks size={18} />
        </div>
        <div>
          <h2>Track survey states</h2>
          <p>Published, draft, and closed surveys can all live in this workspace without changing navigation again.</p>
        </div>
      </Card>
      <Card className="dashboard-card">
        <div className="dashboard-card-icon">
          <Sparkles size={18} />
        </div>
        <div>
          <h2>Ready for expansion</h2>
          <p>This page now replaces the placeholder nav badge with a real route and empty-state surface.</p>
        </div>
      </Card>
    </section>

    <Card className="dashboard-empty-state">
      <div className="settings-row">
        <div>
          <p className="eyebrow">Current state</p>
          <h2>No surveys created yet</h2>
          <p>Your account is approved and the survey workspace is active. Hook the backend survey endpoints into this page next.</p>
        </div>
        <Button type="button">Create first survey</Button>
      </div>
    </Card>
  </div>
);
