export type FollowupOptions = {
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  profileName: string;
  cardUrl: string;
};

export function buildFollowupEmail(options: FollowupOptions) {
  const name = options.leadName || "there";
  const subject = `Great connecting with you, ${name}!`;
  const body = `Hi ${name},\n\nIt was great connecting with you! Here is my digital business card for quick reference:\n${options.cardUrl}\n\nLooking forward to staying in touch.\n\nBest regards,\n${options.profileName}`;

  const mailtoUrl = options.leadEmail
    ? `mailto:${options.leadEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { subject, body, mailtoUrl };
}

export function buildFollowupWhatsAppUrl(options: FollowupOptions): string {
  const name = options.leadName ? ` ${options.leadName}` : "";
  const text = `Hi${name}! Great connecting with you today. Here is my digital business card: ${options.cardUrl}`;
  const cleanPhone = options.leadPhone ? options.leadPhone.replace(/[^0-9]/g, "") : "";

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildFollowupSmsUrl(options: FollowupOptions): string {
  const name = options.leadName ? ` ${options.leadName}` : "";
  const body = `Hi${name}! Great connecting with you today. Here is my digital business card: ${options.cardUrl}`;
  const cleanPhone = options.leadPhone ? options.leadPhone.replace(/[^0-9+]/g, "") : "";

  if (cleanPhone) {
    return `sms:${cleanPhone}?body=${encodeURIComponent(body)}`;
  }
  return `sms:?body=${encodeURIComponent(body)}`;
}
