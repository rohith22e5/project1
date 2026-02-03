import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

const sendEmail = async (options) => {
  // 1. Create a transporter using Gmail service for better reliability
  const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, 
  port: 587,
  secure: false, // Must be false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // This prevents the connection from dropping if there are 
    // certificate name mismatches on the host
    rejectUnauthorized: false 
  },
  // Give the connection more time to breathe on slow networks
  connectionTimeout: 10000, 
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

  // Verify connection configuration
  try {
    await transporter.verify();
    logger.info("Nodemailer transporter is verified and ready to send emails.");
  } catch (error) {
    logger.error(`Nodemailer transporter verification failed: ${error.stack}`);
    throw new Error('Email server not ready. Please check configuration.');
  }

  // 2. Define the email options
  const mailOptions = {
    from: `Agri Store <${process.env.EMAIL_USER}>`, // Use the same email as auth
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: options.html,
  };

  // 3. Send the email
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${options.email}`);
  } catch (error) {
    logger.error(`Error sending email: ${error.stack}`);
    // We throw the error so the calling function knows the email failed to send.
    throw new Error('There was an error sending the email. Please try again later.');
  }
};

export default sendEmail;
