const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  auth: {
    user: 'nikkibrowm297@gmail.com',
    pass: 'jbzjqieokndmljwp',
  },
});

exports.sendEmail = async (to, subject, body) => {
  try {
    const info = await transporter.sendMail({
      from: 'nikkibrowm297@gmail.com',
      to,
      subject,
      html: body,
    });
    console.log(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
  }
};
