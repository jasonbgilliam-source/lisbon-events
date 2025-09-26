export default function PrivacyPage() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Privacy & Cookie Policy</h1>
      <p className="mb-4">
        We value your privacy and comply with the EU General Data Protection Regulation (GDPR) and the ePrivacy Directive (Cookie Law).
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">What Data We Collect</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Essential cookies: required for core site functionality.</li>
        <li>Optional analytics cookies (only if you accept): used to understand site usage.</li>
        <li>Third-party media embeds (YouTube/Spotify): these providers may set cookies.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">How We Use Data</h2>
      <p className="mb-4">
        We use data to operate the site, improve the experience, analyze traffic, and display embedded media when you consent.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Legal Bases</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Performance of a contract and legitimate interests for essential features.</li>
        <li>Consent for analytics and third-party embeds.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">Your Rights</h2>
      <p className="mb-4">
        You may request access, correction, deletion, and portability of your personal data, or object to/limit processing.
        To exercise these rights, email us at <a href="mailto:jason.b.gilliam@gmail.com" className="underline">jason.b.gilliam@gmail.com</a>.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Cookies & Consent</h2>
      <p className="mb-2">
        Optional cookies are used only after you click “Accept”. You can withdraw consent at any time via
        <em> Manage Cookies</em> in the footer.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Third-Party Providers</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>YouTube (Google Ireland Ltd.)</li>
        <li>Spotify AB</li>
        <li>Google Analytics (only if consented)</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">Contact</h2>
      <p>
        If you have questions, please contact: <a href="mailto:jason.b.gilliam@gmail.com" className="underline">jason.b.gilliam@gmail.com</a>.
      </p>
    </main>
  );
}
