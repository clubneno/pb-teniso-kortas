import { Resend } from 'resend';
import type { User, ReservationWithDetails } from '@shared/schema';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

class EmailService {
  private fromEmail = process.env.FROM_EMAIL || 'PB teniso kortas <noreply@pbtenisokortas.lt>';

  // Professional email template with proper styling
  private getEmailTemplate(content: string, title: string) {
    return `
      <!DOCTYPE html>
      <html lang="lt">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8f9fa;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 8px; 
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #2e6b4a 0%, #3a7a57 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 600; 
          }
          .header .subtitle { 
            margin: 8px 0 0 0; 
            opacity: 0.9; 
            font-size: 16px; 
          }
          .content { 
            padding: 30px; 
          }
          .greeting { 
            font-size: 18px; 
            font-weight: 500; 
            margin-bottom: 20px; 
          }
          .details-card { 
            background: #f8f9fa; 
            border: 1px solid #e9ecef; 
            border-radius: 6px; 
            padding: 20px; 
            margin: 20px 0; 
          }
          .details-card.success { 
            background: #d4edda; 
            border-color: #c3e6cb; 
          }
          .details-card.warning { 
            background: #fff3cd; 
            border-color: #ffeaa7; 
          }
          .details-card.danger { 
            background: #f8d7da; 
            border-color: #f5c6cb; 
          }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 8px; 
            padding: 4px 0; 
          }
          .detail-row:last-child { 
            margin-bottom: 0; 
          }
          .detail-label { 
            font-weight: 500; 
            color: #495057; 
          }
          .detail-value { 
            font-weight: 600; 
            color: #212529; 
          }
          .footer { 
            background: #f8f9fa; 
            padding: 20px 30px; 
            border-top: 1px solid #e9ecef; 
            text-align: center; 
            color: #6c757d; 
            font-size: 14px; 
          }
          .btn { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #2e6b4a; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 500; 
            margin: 10px 0; 
          }
          .tennis-icon { 
            font-size: 20px; 
            margin-right: 8px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎾 PB Teniso Kortas</h1>
            <div class="subtitle">Profesionalūs teniso kortai</div>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Su pagarba,<br><strong>PB Teniso Kortas</strong></p>
            <p>Jei turite klausimų, susisiekite su mumis.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendReservationConfirmation(user: User, reservation: ReservationWithDetails) {
    if (!user.email || !resend) return;

    const formattedDate = this.formatDate(reservation.date);
    const timeRange = `${reservation.startTime}-${reservation.endTime}`;

    const content = `
      <div class="greeting">Sveiki, ${user.firstName || 'Gerbiamas kliente'}!</div>
      <p>Jūsų teniso korto rezervacija sėkmingai patvirtinta ir laukiame jūsų atvykimo!</p>
      
      <div class="details-card success">
        <h3 style="margin-top: 0; color: #155724;">✅ Rezervacijos duomenys</h3>
        <div class="detail-row">
          <span class="detail-label">📅 Data:</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">⏰ Laikas:</span>
          <span class="detail-value">${timeRange}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🎾 Kortas:</span>
          <span class="detail-value">${reservation.court.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">💰 Kaina:</span>
          <span class="detail-value">${reservation.totalPrice}€</span>
        </div>
      </div>
      
      <p><strong>Svarbūs priminimai:</strong></p>
      <ul>
        <li>Atvykite 5-10 minučių anksčiau registracijai</li>
        <li>Turėkite teniso raketę ir kamuoliukus (galima nuomotis vietoje)</li>
        <li>Dėvėkite tinkamą sportinę aprangą ir batus</li>
        <li>Parkavimas nemokamas šalia korto</li>
      </ul>
      
      <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin-top: 20px;">
        <p style="margin: 0; color: #2e6b4a;"><strong>💡 Patarimas:</strong> Geriausi žaidimo rezultatai pasiekiami saulėtos dienos metu!</p>
      </div>
    `;

    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: [user.email],
        subject: '✅ Rezervacija patvirtinta - PB Teniso Kortas',
        html: this.getEmailTemplate(content, 'Rezervacija patvirtinta'),
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

    const content = `
      <div class="greeting">Sveiki, ${user.firstName || 'Gerbiamas kliente'}!</div>
      <p>Informuojame, kad jūsų teniso korto rezervacija buvo pakeista:</p>
      
      <div class="details-card warning">
        <h3 style="margin-top: 0; color: #856404;">⚠️ Atnaujinti rezervacijos duomenys</h3>
        <div class="detail-row">
          <span class="detail-label">📅 Data:</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">⏰ Laikas:</span>
          <span class="detail-value">${timeRange}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🎾 Kortas:</span>
          <span class="detail-value">${reservation.court.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">💰 Kaina:</span>
          <span class="detail-value">${reservation.totalPrice}€</span>
        </div>
      </div>
      
      <p><strong>Svarbu:</strong> Jei šie pakeitimai nebuvo jūsų inicijuoti, nedelsiant susisiekite su mumis.</p>
    `;

    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: [user.email],
        subject: '⚠️ Rezervacija pakeista - PB Teniso Kortas',
        html: this.getEmailTemplate(content, 'Rezervacija pakeista'),
      });
    } catch (error) {
      console.error('Failed to send update email:', error);
      throw error;
    }
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
    if (!params.email || !resend) return;

    const formattedDate = this.formatDate(params.date);
    const timeRange = `${params.startTime}-${params.endTime}`;
    const reason = params.reason || 'Administratorių sprendimu';

    const content = `
      <div class="greeting">Sveiki, ${params.firstName || 'Gerbiamas kliente'}!</div>
      <p>Deja, turime pranešti, kad jūsų teniso korto rezervacija buvo atšaukta.</p>
      
      <div class="details-card danger">
        <h3 style="margin-top: 0; color: #721c24;">❌ Atšauktos rezervacijos duomenys</h3>
        <div class="detail-row">
          <span class="detail-label">📅 Data:</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">⏰ Laikas:</span>
          <span class="detail-value">${timeRange}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🎾 Kortas:</span>
          <span class="detail-value">${params.courtName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📝 Priežastis:</span>
          <span class="detail-value">${reason}</span>
        </div>
      </div>
      
      <p><strong>Atsiprašome už nepatogumus!</strong> Jei turite klausimų arba norite rezervuoti kitą laiką, susisiekite su mumis.</p>
      
      <p>Laukiame jūsų ateityje!</p>
    `;

    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: [params.email],
        subject: '❌ Rezervacija atšaukta - PB Teniso Kortas',
        html: this.getEmailTemplate(content, 'Rezervacija atšaukta'),
      });
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
      throw error;
    }
  }

  async sendPasswordReset(user: User, resetToken: string) {
    if (!user.email || !resend) return;

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const content = `
      <div class="greeting">Sveiki, ${user.firstName || 'Gerbiamas kliente'}!</div>
      <p>Gavome užklausą atkurti jūsų slaptažodį.</p>
      
      <div class="details-card warning">
        <h3 style="margin-top: 0; color: #856404;">🔑 Slaptažodžio atkūrimas</h3>
        <p>Jei tai buvo jūs, spauskite žemiau esantį mygtuką:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}" class="btn">Atkurti slaptažodį</a>
        </div>
        <p style="margin-bottom: 0;"><strong>Svarbu:</strong> Ši nuoroda galioja 1 valandą.</p>
      </div>
      
      <p><strong>Saugumo sumetimai:</strong></p>
      <ul>
        <li>Jei slaptažodžio atkūrimo neprašėte, ignoruokite šį laišką</li>
        <li>Niekada nedelskite šios nuorodos kitiems</li>
        <li>Sukurkite stiprų, unikalų slaptažodį</li>
      </ul>
    `;

    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: [user.email],
        subject: '🔑 Slaptažodžio atkūrimas - PB Teniso Kortas',
        html: this.getEmailTemplate(content, 'Slaptažodžio atkūrimas'),
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  // New method for maintenance notifications
  async sendMaintenanceNotification(params: {
    email: string;
    firstName: string;
    courtName: string;
    date: string;
    startTime: string;
    endTime: string;
    description: string;
  }) {
    if (!params.email || !resend) return;

    const formattedDate = this.formatDate(params.date);
    const timeRange = `${params.startTime}-${params.endTime}`;

    const content = `
      <div class="greeting">Sveiki, ${params.firstName || 'Gerbiamas kliente'}!</div>
      <p>Informuojame apie planuojamus tvarkymo darbus, kurie paveiks jūsų rezervaciją.</p>
      
      <div class="details-card warning">
        <h3 style="margin-top: 0; color: #856404;">🔧 Tvarkymo darbai</h3>
        <div class="detail-row">
          <span class="detail-label">📅 Data:</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">⏰ Laikas:</span>
          <span class="detail-value">${timeRange}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🎾 Kortas:</span>
          <span class="detail-value">${params.courtName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📝 Darbų aprašymas:</span>
          <span class="detail-value">${params.description}</span>
        </div>
      </div>
      
      <p><strong>Ką tai reiškia:</strong></p>
      <ul>
        <li>Jūsų rezervacija šiuo laiku automatiškai atšaukta</li>
        <li>Mokestis bus grąžintas arba galėsite pernešti rezervaciją</li>
        <li>Kortas bus nedostupnas nurodytu laiku</li>
      </ul>
      
      <p>Atsiprašome už nepatogumus. Tvarkymo darbai padės užtikrinti aukščiausią kortų kokybę!</p>
    `;

    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: [params.email],
        subject: '🔧 Tvarkymo darbai - PB Teniso Kortas',
        html: this.getEmailTemplate(content, 'Tvarkymo darbai'),
      });
    } catch (error) {
      console.error('Failed to send maintenance notification:', error);
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
