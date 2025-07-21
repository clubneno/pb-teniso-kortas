import { Resend } from 'resend';
import type { User, ReservationWithDetails } from '@shared/schema';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

class EmailService {
  private fromEmail = process.env.FROM_EMAIL || 'TennisReserve <noreply@tennisreserve.lt>';

  async sendReservationConfirmation(user: User, reservation: ReservationWithDetails) {
    if (!user.email || !resend) return;

    const formattedDate = this.formatDate(reservation.date);
    const timeRange = `${reservation.startTime}-${reservation.endTime}`;

    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: [user.email],
        subject: 'Teniso korto rezervacija patvirtinta - TennisReserve',
        html: `
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
        `,
      });
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      throw error;
    }
  }

  async sendReservationUpdate(user: User, reservation: ReservationWithDetails) {
    if (!user.email || !resend) return;

    const formattedDate = this.formatDate(reservation.date);
    const timeRange = `${reservation.startTime}-${reservation.endTime}`;

    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: [user.email],
        subject: 'Rezervacija pakeista - TennisReserve',
        html: `
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
        `,
      });
    } catch (error) {
      console.error('Failed to send update email:', error);
      throw error;
    }
  }

  async sendReservationCancellation(user: User, reservation: ReservationWithDetails) {
    if (!user.email || !resend) return;

    const formattedDate = this.formatDate(reservation.date);
    const timeRange = `${reservation.startTime}-${reservation.endTime}`;

    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: [user.email],
        subject: 'Rezervacija atšaukta - TennisReserve',
        html: `
          <h2>Rezervacija atšaukta</h2>
          <p>Sveiki, ${user.firstName || ''}!</p>
          <p>Jūsų teniso korto rezervacija buvo atšaukta:</p>
          
          <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Atšauktos rezervacijos duomenys:</strong><br>
            📅 Data: ${formattedDate}<br>
            ⏰ Laikas: ${timeRange}<br>
            🎾 Kortas: ${reservation.court.name}<br>
            💰 Suma: ${reservation.totalPrice}€
          </div>
          
          <p>Pinigai bus grąžinti per 3-5 darbo dienas.</p>
          <p>Ačiū, kad rinkotės TennisReserve!</p>
          
          <p>Sportiškai,<br>TennisReserve komanda</p>
        `,
      });
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
      throw error;
    }
  }

  async sendPasswordReset(user: User, resetToken: string) {
    if (!user.email || !resend) return;

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: [user.email],
        subject: 'Slaptažodžio atkūrimas - TennisReserve',
        html: `
          <h2>Slaptažodžio atkūrimas</h2>
          <p>Sveiki, ${user.firstName || ''}!</p>
          <p>Gavome užklausą atkurti jūsų slaptažodį.</p>
          
          <p>Jei tai buvo jūs, spauskite šią nuorodą:</p>
          <a href="${resetUrl}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Atkurti slaptažodį</a>
          
          <p>Ši nuoroda galioja 1 valandą.</p>
          <p>Jei slaptažodžio atkūrimo neprašėte, ignoruokite šį laišką.</p>
          
          <p>Sportiškai,<br>TennisReserve komanda</p>
        `,
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
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
