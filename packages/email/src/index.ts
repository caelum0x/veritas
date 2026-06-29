// Public surface re-export for @veritas/email

export type { EmailAttachment, EmailMessage, SentEmail } from "./email.js";
export type { EmailTransport, EmailTransportOptions } from "./transport.js";
export type { EmailTemplate } from "./template.js";
export {
  EmailError,
  emailSendFailed,
  emailInvalidAddress,
  emailTemplateNotFound,
  emailRenderFailed,
  emailTransportUnavailable,
  type EmailErrorCode,
} from "./errors.js";
export { EmailSender, type SendTemplateOptions } from "./sender.js";
export {
  verificationCompleteTemplate,
  type VerificationCompleteData,
} from "./templates/verification-complete.js";
