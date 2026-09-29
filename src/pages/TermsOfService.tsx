const EFFECTIVE_DATE = "September 30, 2026";

export function TermsOfService() {
  return (
    <main className="min-h-screen bg-[#F2F3F5] px-4 py-10 text-foreground">
      <article className="mx-auto max-w-[720px] rounded-xl border border-border/70 bg-surface p-8 leading-6">
        <h1 className="text-2xl font-semibold text-[#111318]">Terms of Service</h1>
        <p className="mt-2 text-sm text-[#5D6675]">Effective date: {EFFECTIVE_DATE}</p>

        <p className="mt-6 text-sm text-[#5D6675]">
          These Terms of Service ("Terms") govern your access to and use of ReplyOS (the "Service"), operated by
          [COMPANY LEGAL NAME] ("we," "us," "our"). By creating an account or using the Service, you agree to these
          Terms.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">1. Using the Service</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          You must provide accurate account information and are responsible for activity under your account. You
          agree to use the Service only for lawful purposes and in compliance with applicable messaging, marketing,
          and data protection laws (e.g., CAN-SPAM, GDPR, TCPA where applicable) for any leads or contacts you
          upload or message through the Service.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">2. AI-Generated Content</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          The Service uses AI models to draft and send messages and to schedule meetings on your behalf, based on
          settings you configure. You are responsible for reviewing agent configurations and the content sent to
          your leads or prospects.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">3. Calendar Integration</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          If you connect Google Calendar, you authorize the Service to check your availability and create calendar
          events on your behalf to book meetings. You can disconnect this integration at any time from the Service.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">4. Subscription and Payment</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          [Describe pricing plans, billing cycle, renewal, and cancellation terms here.]
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">5. Acceptable Use</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#5D6675]">
          <li>No unlawful, deceptive, or abusive use of the Service, including sending unsolicited spam.</li>
          <li>No attempting to disrupt, reverse engineer, or gain unauthorized access to the Service.</li>
          <li>No uploading data you do not have the right to use.</li>
        </ul>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">6. Intellectual Property</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          The Service, including its software and branding, is owned by [COMPANY LEGAL NAME]. You retain ownership
          of the data you upload; you grant us a license to process it solely to provide the Service.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">7. Termination</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          You may stop using the Service and request account deletion at any time. We may suspend or terminate
          access for violation of these Terms.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">8. Disclaimers and Limitation of Liability</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law,
          [COMPANY LEGAL NAME] is not liable for indirect, incidental, or consequential damages arising from your
          use of the Service.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">9. Changes to These Terms</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          We may update these Terms from time to time. Continued use of the Service after changes take effect
          constitutes acceptance of the updated Terms.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">10. Contact Us</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          Questions about these Terms? Contact us at [CONTACT EMAIL], [COMPANY ADDRESS].
        </p>
      </article>
    </main>
  );
}
