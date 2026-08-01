import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock3, Send } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../features/auth/use-auth";
import { getSurveyRequest, getSurveyResultsRequest } from "../features/surveys/surveys.api";
import { surveyKeys } from "../features/surveys/surveys.keys";
import { pageTw } from "../lib/page-tailwind";

export const SurveyResponsesPage = () => {
  const { surveyId = "" } = useParams();
  const auth = useAuth();
  const token = auth.accessToken ?? "";

  const surveyQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getSurveyRequest(token, surveyId),
    queryKey: surveyKeys.detail(surveyId)
  });

  const resultsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getSurveyResultsRequest(token, surveyId),
    queryKey: surveyKeys.responses(surveyId)
  });

  if (surveyQuery.isLoading || resultsQuery.isLoading || !surveyQuery.data || !resultsQuery.data) {
    return (
      <div className={pageTw.page}>
        <section className={pageTw.hero}>
          <h1 className={pageTw.heroTitle}>Loading responses...</h1>
          <p className={pageTw.muted}>The response summary is loading.</p>
        </section>
      </div>
    );
  }

  return (
    <div className={pageTw.page}>
      <section className={`${pageTw.hero} ${pageTw.heroSplit}`}>
        <div>
          <h1>{surveyQuery.data.slug}</h1>
          <p>Response summary for this survey. Full respondent records stay outside the builder.</p>
        </div>
        <Button asChild variant="secondary">
          <Link to={`/app/surveys/${surveyId}/builder`}>Open builder</Link>
        </Button>
      </section>

      <section className={pageTw.gridThree}>
        <Card className={pageTw.metricCard}>
          <div className={pageTw.metricIcon}>
            <Send size={18} />
          </div>
          <div>
            <h2>{resultsQuery.data.submittedCount}</h2>
            <p>Submitted responses</p>
          </div>
        </Card>
        <Card className={pageTw.metricCard}>
          <div className={pageTw.metricIcon}>
            <Clock3 size={18} />
          </div>
          <div>
            <h2>{resultsQuery.data.inProgressCount}</h2>
            <p>In progress responses</p>
          </div>
        </Card>
        <Card className={pageTw.metricCard}>
          <div className={pageTw.metricIcon}>
            <BarChart3 size={18} />
          </div>
          <div>
            <h2>{resultsQuery.data.submittedCount + resultsQuery.data.inProgressCount}</h2>
            <p>Total tracked sessions</p>
          </div>
        </Card>
      </section>

      <Card className={pageTw.empty}>
        <div>
          <h2>Responses stay on a separate route</h2>
          <p>
            The surveys list does not fetch this data, and the builder does not load it until you open the responses page.
          </p>
        </div>
      </Card>
    </div>
  );
};
