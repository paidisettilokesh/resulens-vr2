import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
    let transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
        // Use provided SMTP credentials
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    } else {
        // Fallback to Ethereal Email for development/testing
        console.warn('⚠️ No SMTP configuration found. Using Ethereal Email for testing.');
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });
    }

    const message = {
        from: `${process.env.FROM_NAME || 'ResuLens'} <${process.env.FROM_EMAIL || 'noreply@resulens.ai'}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
    };

    const info = await transporter.sendMail(message);

    if (!process.env.SMTP_USER) {
        console.log(`📩 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
};
