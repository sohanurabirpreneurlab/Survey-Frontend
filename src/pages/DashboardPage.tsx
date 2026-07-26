import { ChartNoAxesColumn, ListChecks, Sparkles } from "lucide-react";

import { Card } from "../components/ui/card";
import { useAuth } from "../features/auth/use-auth";

const placeholderCards = [
  {
    description: "Create your first survey, structure sections, and publish when it is ready.",
    icon: ListChecks,
    title: "Draft surveys"
  },
  {
    description: "Invitation delivery, respondent progress, and result analysis can slot into this shell next.",
    icon: ChartNoAxesColumn,
    title: "Response pipeline"
  },
  {
    description: "The auth and access foundation is now in place for future organization and billing features.",
    icon: Sparkles,
    title: "Platform foundation"
  }
];

export const DashboardPage = () => {
  const auth = useAuth();

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Approved workspace</p>
          <h1>Hello, {auth.user?.fullName?.split(" ")[0] ?? "there"}.</h1>
          <p>
            Your account is approved and ready. This dashboard shell is set up for survey
            management while keeping the next product layers easy to add.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        {placeholderCards.map((item) => (
          <Card key={item.title} className="dashboard-card">
            <div className="dashboard-card-icon">
              <item.icon size={18} />
            </div>
            <div>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </div>
          </Card>
        ))}
      </section>

      <Card className="dashboard-empty-state">
        <div>
          <p className="eyebrow">Next milestone</p>
          <h2>No surveys yet</h2>
          <p>
            Connect your survey creation flows here next. The layout, route protection, and auth restoration are already in place for that work.
          </p>
        </div>
      </Card>
    </div>
  );
};
