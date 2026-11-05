import { Global, Injectable, Module } from '@nestjs/common';
import type { Locale } from '@carely/shared';
import { PrismaService } from '../common/prisma.service';
import { env, primaryOrigin } from '../config/env';
import { log } from '../common/logger';
import { AppError } from '../common/app-error';

type Template = 'password_reset' | 'welcome';

/** Email templates in all three languages. The recipient's preferred locale decides; Armenian is the default. */
const TEMPLATES: Record<Template, Record<Locale, (p: Record<string, string>) => { subject: string; text: string }>> = {
  password_reset: {
    hy: (p) => ({
      subject: 'Carely — գաղտնաբառի վերականգնում',
      text: `Բարև, ${p.name}։\n\nԳաղտնաբառը վերականգնելու համար բացեք հետևյալ հղումը (գործում է ${p.minutes} րոպե և կարող է օգտագործվել միայն մեկ անգամ).\n\n${p.link}\n\nԵթե դուք չեք պահանջել վերականգնում, պարզապես անտեսեք այս նամակը։\n\nCarely`,
    }),
    ru: (p) => ({
      subject: 'Carely — восстановление пароля',
      text: `Здравствуйте, ${p.name}!\n\nЧтобы задать новый пароль, откройте ссылку (действует ${p.minutes} минут, только один раз):\n\n${p.link}\n\nЕсли вы не запрашивали восстановление, просто проигнорируйте это письмо.\n\nCarely`,
    }),
    en: (p) => ({
      subject: 'Carely — password reset',
      text: `Hello ${p.name},\n\nTo set a new password, open this link (valid for ${p.minutes} minutes, single use):\n\n${p.link}\n\nIf you did not request a reset, you can ignore this email.\n\nCarely`,
    }),
  },
  welcome: {
    hy: (p) => ({ subject: 'Բարի գալուստ Carely', text: `Բարև, ${p.name}։\n\nՁեր հաշիվը ստեղծված է։ Մուտք՝ ${primaryOrigin}/hy/auth/login\n\nCarely` }),
    ru: (p) => ({ subject: 'Добро пожаловать в Carely', text: `Здравствуйте, ${p.name}!\n\nВаш аккаунт создан. Вход: ${primaryOrigin}/ru/auth/login\n\nCarely` }),
    en: (p) => ({ subject: 'Welcome to Carely', text: `Hello ${p.name},\n\nYour account has been created. Sign in: ${primaryOrigin}/en/auth/login\n\nCarely` }),
  },
};

@Injectable()
export class MailService {
  private transporter: any = null;
  constructor(private readonly prisma: PrismaService) {}

  async send(to: string, locale: Locale, template: Template, params: Record<string, string>): Promise<void> {
    const { subject, text } = (TEMPLATES[template][locale] ?? TEMPLATES[template].hy)(params);
    switch (env.MAIL_DRIVER) {
      case 'database':
        await this.prisma.devMail.create({ data: { to, subject, text } });
        log('info', 'mail_stored_locally', { template });
        return;
      case 'console':
        // Development only: prints the message (including links) to stdout.
        process.stdout.write(`\n──── MAIL to ${to} ────\n${subject}\n\n${text}\n────────────\n`);
        return;
      case 'smtp': {
        if (!env.SMTP_HOST) throw new AppError('MAIL_NOT_CONFIGURED');
        if (!this.transporter) {
          const nodemailer = await import('nodemailer');
          this.transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
          });
        }
        await this.transporter.sendMail({ from: env.MAIL_FROM, to, subject, text });
        log('info', 'mail_sent', { template });
        return;
      }
    }
  }
}

@Global()
@Module({ providers: [MailService], exports: [MailService] })
export class MailModule {}
