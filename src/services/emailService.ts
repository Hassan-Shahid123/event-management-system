import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('[Email] Skipping email - credentials not configured');
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Event Management System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`[Email] Sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('[Email] Failed to send:', error);
  }
}

export function formatEventReminderEmail(eventTitle: string, eventDate: string, timeText: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Event Reminder</h2>
      <p>This is a reminder about your upcoming event:</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #0066cc;">${eventTitle}</h3>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDate}</p>
        <p style="margin: 5px 0;"><strong>Time Until Event:</strong> ${timeText}</p>
      </div>
      <p>Don't forget to attend!</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This is an automated reminder from the Event Management System.
      </p>
    </div>
  `;
}
