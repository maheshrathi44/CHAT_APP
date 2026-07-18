export const buildOtpEmail = (otp: string, purpose: string) => {
    const subject = `${otp} is your ChatApp verification code`;

    const text = `Your ChatApp verification code is ${otp}. Use it to ${purpose}. This code expires in 5 minutes. If you didn't request this, you can ignore this email.`;

    const html = `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial, Helvetica, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="background-color:#2563eb;padding:24px 32px;">
                    <span style="color:#ffffff;font-size:20px;font-weight:bold;">ChatApp</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="color:#e2e8f0;font-size:16px;margin:0 0 24px;">Hi,</p>
                    <p style="color:#e2e8f0;font-size:16px;margin:0 0 24px;">Use the code below to ${purpose}:</p>
                    <div style="background-color:#0f172a;border:1px dashed #3b82f6;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
                      <span style="color:#60a5fa;font-size:36px;font-weight:bold;letter-spacing:10px;">${otp}</span>
                    </div>
                    <p style="color:#94a3b8;font-size:14px;margin:0 0 8px;">This code expires in 5 minutes.</p>
                    <p style="color:#64748b;font-size:13px;margin:24px 0 0;">If you didn't request this, you can safely ignore this email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px;background-color:#0f172a;text-align:center;">
                    <span style="color:#475569;font-size:12px;">&copy; ChatApp</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    `;

    return { subject, text, html };
};
