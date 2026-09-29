const EFFECTIVE_DATE = "September 30, 2026";

export function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#F2F3F5] px-4 py-10 text-foreground">
      <article className="mx-auto max-w-[720px] rounded-xl border border-border/70 bg-surface p-8 leading-6">
        <h1 className="text-2xl font-semibold text-[#111318]">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#5D6675]">Effective date: {EFFECTIVE_DATE}</p>

        <p className="mt-6 text-sm text-[#5D6675]">
          [COMPANY LEGAL NAME] ("we," "us," "our") operates ReplyOS (the "Service"). This Privacy Policy explains
          what information we collect, how we use it, and the choices you have. By using the Service, you agree to
          the collection and use of information described here.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">1. Information We Collect</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#5D6675]">
          <li>Account information: name, email address, and password (stored as a salted hash) when you register.</li>
          <li>
            Lead and messaging data: contact details and message content you import, receive, or send through the
            Service, including conversations processed or drafted by our AI agents.
          </li>
          <li>
            Calendar data: when you connect Google Calendar, we access calendar availability and create events on
            your behalf to book meetings requested through the Service. We store an encrypted OAuth token to
            maintain this connection; we do not store your Google password.
          </li>
          <li>Usage data: log data, device/browser information, and analytics about how you interact with the Service.</li>
        </ul>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">2. How We Use Information</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#5D6675]">
          <li>To provide, operate, and maintain the Service, including AI-generated responses and meeting scheduling.</li>
          <li>To communicate with you about your account or the Service.</li>
          <li>To monitor and improve reliability, security, and performance.</li>
          <li>To comply with legal obligations.</li>
        </ul>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">3. Google User Data</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          Our use and transfer of information received from Google APIs adheres to the{" "}
          <a
            className="text-accent underline"
            href="https://developers.google.com/terms/api-services-user-data-policy"
            rel="noreferrer"
            target="_blank"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We only request the Google Calendar scopes necessary to check
          availability and create events on your behalf, and we do not use this data for advertising.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">4. Sharing of Information</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          We do not sell your personal information. We may share information with service providers who process it
          on our behalf (e.g., hosting, email delivery, AI model providers used to generate responses), subject to
          confidentiality obligations, or when required by law.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">5. Data Retention</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          We retain account, lead, and messaging data for as long as your account is active or as needed to provide
          the Service. You may request deletion of your data by contacting us at [CONTACT EMAIL]. Disconnecting
          Google Calendar revokes our access and removes the stored token.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">6. Security</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          We use industry-standard measures, including encryption of stored OAuth tokens, to protect your
          information. No method of transmission or storage is 100% secure.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">7. Your Rights</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          Depending on your location, you may have rights to access, correct, or delete your personal information.
          Contact us at [CONTACT EMAIL] to exercise these rights.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">8. Changes to This Policy</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          We may update this policy from time to time. We will post the updated version on this page with a revised
          effective date.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-[#111318]">9. Contact Us</h2>
        <p className="mt-2 text-sm text-[#5D6675]">
          Questions about this policy? Contact us at [CONTACT EMAIL], [COMPANY ADDRESS].
        </p>
      </article>
    </main>
  );
}
