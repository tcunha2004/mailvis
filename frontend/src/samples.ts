import type { EmailInput } from "./api";

export const SAMPLES: { label: string; email: EmailInput }[] = [
  {
    label: "Colleague question",
    email: {
      author: "Alice Smith <alice.smith@company.com>",
      to: "John Doe <john.doe@company.com>",
      subject: "Quick question about API documentation",
      body: `Hi John,

I was reviewing the API documentation for the new authentication service and noticed a few endpoints seem to be missing from the specs. Could you help clarify if this was intentional or if we should update the docs?

Specifically, I'm looking at:
- /auth/refresh
- /auth/validate

Thanks!
Alice`,
    },
  },
  {
    label: "Promotion",
    email: {
      author: "Marketing Team <marketing@amazingdeals.com>",
      to: "John Doe <john.doe@company.com>",
      subject: "EXCLUSIVE OFFER: Limited Time Discount on Developer Tools!",
      body: `Dear Valued Developer,

Don't miss out on this INCREDIBLE opportunity! For a LIMITED TIME ONLY, get 80% OFF on our Premium Developer Suite.

Regular price: $999/month. Your special price: just $199/month!
Hurry, this offer expires in 24 hours.

Click here to claim your discount: https://amazingdeals.com/special-offer

To unsubscribe, click here.`,
    },
  },
  {
    label: "Meeting request",
    email: {
      author: "Priya Patel <priya@acme-client.com>",
      to: "John Doe <john.doe@company.com>",
      subject: "Can we move Thursday's review to Friday 10am?",
      body: `Hi John,

Something came up on our side. Could we move the Q3 integration review from Thursday to Friday at 10am? Our CTO, Mark, would also like to join this time.

Let me know if that works and I'll update the invite.

Best,
Priya — Head of Engineering, Acme`,
    },
  },
  {
    label: "Security alert",
    email: {
      author: "GitHub <noreply@github.com>",
      to: "john.doe@company.com",
      subject: "[GitHub] A new SSH key was added to your account",
      body: `Hey johndoe!

A new public SSH key was added to your account from an unrecognized device in São Paulo, Brazil.

If you did not add this key, remove it immediately and review your security log: https://github.com/settings/keys

Thanks,
The GitHub Team`,
    },
  },
  {
    label: "Newsletter",
    email: {
      author: "The Weekly Byte <hello@weeklybyte.dev>",
      to: "john.doe@company.com",
      subject: "Issue #212: 10 VS Code extensions you missed",
      body: `This week in The Weekly Byte:

• 10 VS Code extensions you missed
• Is Rust taking over the backend?
• Our sponsor: try CloudBox free for 30 days

You are receiving this because you subscribed at weeklybyte.dev. Unsubscribe anytime.`,
    },
  },
];
