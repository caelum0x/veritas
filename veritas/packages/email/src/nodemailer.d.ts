// Ambient declaration for nodemailer — avoids requiring @types/nodemailer
// while still allowing the dynamic import in smtp-transport.ts to type-check.
declare module "nodemailer" {
  interface SendMailResult {
    messageId: string;
    accepted: string[];
    rejected: string[];
  }

  interface Transporter {
    sendMail(options: unknown): Promise<SendMailResult>;
    verify(): Promise<boolean>;
    close(): void;
  }

  function createTransport(options: unknown): Transporter;
}
