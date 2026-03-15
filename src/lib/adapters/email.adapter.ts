import { Resend } from "resend";

let _resend: Resend | undefined;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string }> {
  const { data, error } = await getResend().emails.send({
    from: params.from ?? "HireFlow <noreply@hireflow.app>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }

  return { id: data!.id };
}

export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "");
}
