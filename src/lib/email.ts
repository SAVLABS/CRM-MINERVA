import 'server-only';

/**
 * Transporte de correo.
 *
 * En desarrollo (NODE_ENV=development) imprime el mensaje en la consola, así se
 * prueba el flujo de recuperación de contraseña (RF-012) sin configurar SMTP.
 * En producción exige SMTP_* configurados y falla ruidosamente si faltan: es
 * preferible que el deploy se caiga a que se trague los correos en silencio.
 */

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function consoleTransport(mail: Mail) {
  const divider = '='.repeat(72);
  console.log(
    [
      '',
      divider,
      `[correo:consola] ${mail.subject}`,
      divider,
      `Para: ${mail.to}`,
      '',
      mail.text,
      divider,
    ].join('\n'),
  );
}

async function smtpTransport(mail: Mail) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM ?? 'CRM Minerva <no-reply@minerva.example>';

  const missing = Object.entries({ SMTP_HOST: host, SMTP_USER: user, SMTP_PASSWORD: pass })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(
      `SMTP no configurado en producción. Faltan: ${missing.join(', ')}. ` +
        'Si es la primera puesta en producción, revisá el archivo .env.example.',
    );
  }

  // nodemailer se carga solo en producción para no engordar el bundle de dev.
  const { createTransport } = await import('nodemailer');
  const transport = createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transport.sendMail({ from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
}

export async function sendMail(mail: Mail): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    await smtpTransport(mail);
    return;
  }
  consoleTransport(mail);
}
