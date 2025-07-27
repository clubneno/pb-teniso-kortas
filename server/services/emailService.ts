import { Resend } from 'resend';
import mailchimp from '@mailchimp/mailchimp_transactional';
import type { User, ReservationWithDetails } from '@shared/schema';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const mailchimpClient = process.env.MAILCHIMP_API_KEY ? mailchimp(process.env.MAILCHIMP_API_KEY) : null;

class EmailService {
  private fromEmail = process.env.FROM_EMAIL || 'TennisReserve <noreply@tennisreserve.lt>';
  private fromEmailAddress = process.env.FROM_EMAIL?.split('<')[1]?.replace('>', '') || 'noreply@tennisreserve.lt';

  private async sendViaMailchimp(to: string, subject: string, html: string, text?: string) {
    if (!mailchimpClient) return null;
    
    try {
      const message = {
        to: [{ email: to }],
        from_email: this.fromEmailAddress,
        from_name: 'TennisReserve',
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
        track_opens: true,
        track_clicks: true,
        tags: ['transactional', 'tennis-reservation']
      };

      const response = await mailchimpClient.messages.send({ message });
      
      if (response && response[0] && response[0].status === 'sent') {
        console.log(`✓ Email sent via Mailchimp to ${to} (ID: ${response[0]._id})`);
        return response[0];
      } else {
        console.warn(`Mailchimp email failed for ${to}:`, response[0]?.status, response[0]?.reject_reason);
        return null;
      }
    } catch (error) {
      console.error('Mailchimp email error:', error);
      return null;
    }
  }

  private async sendViaResend(to: string, subject: string, html: string) {
    if (!resend) return null;
    
    try {
      const response = await resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject: subject,
        html: html
      });
      
      console.log(`✓ Email sent via Resend to ${to} (ID: ${response.data?.id})`);
      return response;
    } catch (error) {
      console.error('Resend email error:', error);
      return null;
    }
  }

  private async sendEmail(to: string, subject: string, html: string, text?: string) {
    // Try Mailchimp first (if available), then fall back to Resend
    let result = null;
    
    if (mailchimpClient) {
      result = await this.sendViaMailchimp(to, subject, html, text);
      if (result) return result;
    }
    
    if (resend) {
      result = await this.sendViaResend(to, subject, html);
      if (result) return result;
    }
    
    console.warn(`Failed to send email to ${to} - no email service available or all failed`);
    return null;
  }

  async sendReservationConfirmation(user: User, reservation: ReservationWithDetails) {
    if (!user.email) return;

    const formattedDate = this.formatDate(reservation.date);
    const timeRange = `${reservation.startTime}-${reservation.endTime}`;

    const subject = 'Teniso korto rezervacija patvirtinta - TennisReserve';
    const html = `
      <h2>Rezervacija patvirtinta!</h2>
      <p>Sveiki, ${user.firstName || ''}!</p>
      <p>Jūsų teniso korto rezervacija sėkmingai patvirtinta:</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Rezervacijos duomenys:</strong><br>
        📅 Data: ${formattedDate}<br>
        ⏰ Laikas: ${timeRange}<br>
        🎾 Kortas: ${reservation.court.name}<br>
        💰 Kaina: ${reservation.totalPrice}€
      </div>
      
      <p>Jei turite klausimų, susisiekite su mumis.</p>
      
      <p>Sportiškai,<br>TennisReserve komanda</p>
    `;
    
    await this.sendEmail(user.email, subject, html);
  }

  async sendReservationUpdate(user: User, reservation: ReservationWithDetails) {
    if (!user.email) return;

    const formattedDate = this.formatDate(reservation.date);
    const timeRange = `${reservation.startTime}-${reservation.endTime}`;

    const subject = 'Rezervacija pakeista - TennisReserve';
    const html = `
      <h2>Rezervacija pakeista</h2>
      <p>Sveiki, ${user.firstName || ''}!</p>
      <p>Jūsų teniso korto rezervacija buvo pakeista:</p>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Atnaujinti rezervacijos duomenys:</strong><br>
        📅 Data: ${formattedDate}<br>
        ⏰ Laikas: ${timeRange}<br>
        🎾 Kortas: ${reservation.court.name}<br>
        💰 Kaina: ${reservation.totalPrice}€
      </div>
      
      <p>Jei šie pakeitimai nebuvo jūsų inicijuoti, nedelsiant susisiekite su mumis.</p>
      
      <p>Sportiškai,<br>TennisReserve komanda</p>
    `;
    
    await this.sendEmail(user.email, subject, html);
  }

  async sendReservationCancellation(params: { 
    email: string; 
    firstName: string; 
    courtName: string; 
    date: string; 
    startTime: string; 
    endTime: string; 
    reason?: string; 
  }) {
    if (!params.email) return;

    const formattedDate = this.formatDate(params.date);
    const timeRange = `${params.startTime}-${params.endTime}`;
    const reason = params.reason || 'Administratorių sprendimu';

    const subject = 'Rezervacija atšaukta - PB teniso kortas';
    const html = `
      <h2>Rezervacija atšaukta</h2>
      <p>Sveiki, ${params.firstName || ''}!</p>
      <p>Informuojame, kad jūsų teniso korto rezervacija buvo atšaukta dėl: <strong>${reason}</strong></p>
      
      <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Atšauktos rezervacijos duomenys:</strong><br>
        📅 Data: ${formattedDate}<br>
        ⏰ Laikas: ${timeRange}<br>
        🎾 Kortas: ${params.courtName}
      </div>
      
      <p>Atsiprašome už nepatogumus. Galite susisiekti su mumis, jei turite klausimų.</p>
      
      <p>Sportiškai,<br>PB teniso kortas</p>
    `;
    
    await this.sendEmail(params.email, subject, html);
  }

  async sendPasswordReset(user: User, resetToken: string) {
    if (!user.email) return;

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const subject = 'Slaptažodžio atkūrimas - TennisReserve';
    const html = `
      <h2>Slaptažodžio atkūrimas</h2>
      <p>Sveiki, ${user.firstName || ''}!</p>
      <p>Gavome užklausą atkurti jūsų slaptažodį.</p>
      
      <p>Jei tai buvo jūs, spauskite šią nuorodą:</p>
      <a href="${resetUrl}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Atkurti slaptažodį</a>
      
      <p>Ši nuoroda galioja 1 valandą.</p>
      <p>Jei slaptažodžio atkūrimo neprašėte, ignoruokite šį laišką.</p>
      
      <p>Sportiškai,<br>TennisReserve komanda</p>
    `;
    
    await this.sendEmail(user.email, subject, html);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }
}

export const emailService = new EmailService();
