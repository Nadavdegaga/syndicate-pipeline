// Admin gating. In v1 we hardcode the admin email(s) since the team is 3 people.
// Once the team grows we'll add a `roles` table or use auth.users.user_metadata.role.

const ADMIN_EMAILS = [
  "nadav@luminarix-media.com",
  "nadavdeg@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
