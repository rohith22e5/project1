import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

const sendEmail = async (options) => {
  // 1. Create a transporter using environment variables
  // You need to set these variables in your .env file
  // e.g., for Mailtrap or SendGrid
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2. Define the email options
  const mailOptions = {
    from: 'Agri Store <rohith22241a05e5@grietcollege.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // You can also provide an HTML version
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
