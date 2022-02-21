import { createTransport, SentMessageInfo } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { from, Observable } from "rxjs";

export class MailService {
  static send(text: string): Observable<SentMessageInfo> {
    let transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secureConnection: false,
      tls: { ciphers: "SSLv3" },
      auth: {
        user: process.env.SMTP_AUTH_USER,
        pass: process.env.SMTP_AUTH_PASS,
      },
    } as SMTPTransport.Options);

    return from(
      transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_TO,
        html: text,
      })
    );
  }
}
