/**
 * Notification channel abstraction.
 * Channels: email (implemented), whatsapp (stub, wait for provider).
 */

export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  ok: boolean;
  channel: string;
  messageId?: string;
  error?: string;
}

export interface NotificationChannel {
  readonly name: "email" | "whatsapp";
  isEnabled(): boolean;
  send(payload: NotificationPayload): Promise<NotificationResult>;
}

export class EmailChannel implements NotificationChannel {
  readonly name = "email" as const;

  isEnabled(): boolean {
    return !!process.env.RESEND_API_KEY;
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    if (!this.isEnabled()) {
      return { ok: false, channel: "email", error: "RESEND_API_KEY not configured" };
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "Finmate <noreply@finmate.app>",
          to: payload.to,
          subject: payload.subject,
          html: payload.body,
        }),
      });
      if (!res.ok) throw new Error(`Resend error ${res.status}`);
      const data = await res.json();
      return { ok: true, channel: "email", messageId: data.id };
    } catch (err) {
      return { ok: false, channel: "email", error: String(err) };
    }
  }
}

export class WhatsAppChannel implements NotificationChannel {
  readonly name = "whatsapp" as const;

  isEnabled(): boolean {
    return process.env.WHATSAPP_ENABLED === "true";
  }

  async send(): Promise<NotificationResult> {
    return {
      ok: false,
      channel: "whatsapp",
      error: "WhatsApp provider not yet integrated. See roadmap P5.",
    };
  }
}

export const channels: NotificationChannel[] = [new EmailChannel(), new WhatsAppChannel()];
