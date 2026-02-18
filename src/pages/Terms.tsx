import { Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Terms = () => (
  <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-3 flex items-center justify-between">
      <Link to="/auth" className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        <span className="text-base font-bold text-primary">SurveyForever</span>
      </Link>
      <Link to="/auth">
        <Button size="sm" variant="outline">Back to Login</Button>
      </Link>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <h1 className="text-3xl font-bold">Terms of Service & Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: February 2026</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          By accessing and using SurveyForever ("the Platform"), you agree to be bound by these Terms of Service. 
          If you do not agree with any part of these terms, you must not use the Platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Account Registration</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You must provide accurate information during registration. You are responsible for maintaining the confidentiality 
          of your account credentials. Multiple accounts per user are not allowed and may result in account suspension.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Earning & Rewards</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Points and cash rewards are earned by completing surveys, offers, and other activities on the Platform. 
          We reserve the right to modify reward amounts, suspend accounts for fraudulent activity, 
          and withhold payments if terms are violated.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Withdrawals</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Withdrawals are subject to minimum thresholds and processing times. We reserve the right to review 
          and verify withdrawal requests before processing.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Prohibited Activities</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Users must not engage in fraud, use VPNs/proxies to manipulate location, create multiple accounts, 
          use bots or automated tools, or engage in any activity that violates applicable laws.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Privacy Policy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We collect personal information (email, name, IP address) to provide our services. 
          Your data is stored securely and is not sold to third parties. We may share anonymized 
          data with survey and offer partners to facilitate service delivery.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Communication</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          By creating an account, you agree to receive email notifications related to your account, 
          earnings, and platform updates. You can manage your notification preferences from your account settings.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Contact Us</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          For any questions or concerns, contact us at{" "}
          <a href="mailto:admin@surveyforever.com" className="text-primary hover:underline font-medium">
            admin@surveyforever.com
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">9. Changes to Terms</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We reserve the right to update these terms at any time. Continued use of the Platform 
          constitutes acceptance of the updated terms.
        </p>
      </section>
    </main>
  </div>
);

export default Terms;
