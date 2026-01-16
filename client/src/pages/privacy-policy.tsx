export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 9, 2026</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Introduction</h2>
            <p>
              Bole Fitness Tracker ("we", "our", or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, and safeguard your information when
              you use our mobile application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account Information:</strong> Username and password when you create an account.
              </li>
              <li>
                <strong>Fitness Data:</strong> Pushup counts, walking distance, and dates you log workouts.
              </li>
              <li>
                <strong>Health Data:</strong> If you enable Apple Health integration, we may write workout
                data (calories burned from pushups, walking distance) to Apple Health. We do not read
                data from Apple Health.
              </li>
              <li>
                <strong>Video Data:</strong> If you use the Form Check feature, videos are temporarily
                processed to analyze exercise form. Videos are not stored permanently.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use Your Information</h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain the app's functionality</li>
              <li>Track and display your fitness progress</li>
              <li>Sync workout data to Apple Health (when enabled by you)</li>
              <li>Analyze exercise form when you submit videos</li>
              <li>Improve our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Apple Health Integration</h2>
            <p>
              Bole Fitness Tracker integrates with Apple Health to sync your workout data. This integration
              is optional and requires your explicit permission. When enabled:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Pushup workouts are logged as active calories burned</li>
              <li>Walking distance is logged to Apple Health</li>
              <li>We only write data to Apple Health; we do not read your existing health data</li>
              <li>You can disable this integration at any time in the app settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Storage and Security</h2>
            <p>
              Your fitness data is stored securely on our servers. We implement appropriate technical
              and organizational measures to protect your personal information against unauthorized
              access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Sharing</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties.
              Your fitness data is only accessible to you through your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Disable Apple Health integration at any time</li>
              <li>Opt out of any optional features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Children's Privacy</h2>
            <p>
              Our app is not intended for children under 13 years of age. We do not knowingly collect
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Email:</strong> support@bolefitness.com
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            © 2026 Bole Fitness Tracker. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
