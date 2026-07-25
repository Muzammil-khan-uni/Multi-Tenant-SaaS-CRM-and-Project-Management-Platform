import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'SaaS CRM'}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Email sending failed:', error);
      // Don't throw - email failures shouldn't break the application
      return null;
    }
  }

  async sendVerificationEmail(user, verificationToken) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Verify Your Email</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hello ${user.firstName},</p>
          <p style="font-size: 16px; color: #374151;">
            Thank you for registering! Please verify your email address by clicking the button below.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #3b82f6; color: white; padding: 14px 30px; 
                      text-decoration: none; border-radius: 8px; font-size: 16px;
                      display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            This link will expire in 24 hours. If you did not create an account, please ignore this email.
          </p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 14px; color: #9ca3af;">
            Or copy and paste this URL in your browser:<br/>
            <a href="${verificationUrl}" style="color: #3b82f6;">${verificationUrl}</a>
          </p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email Address',
      html,
    });
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset Request</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hello ${user.firstName},</p>
          <p style="font-size: 16px; color: #374151;">
            We received a request to reset your password. Click the button below to reset it.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #f59e0b; color: white; padding: 14px 30px; 
                      text-decoration: none; border-radius: 8px; font-size: 16px;
                      display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            This link will expire in 1 hour. If you did not request this, please ignore this email.
          </p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 14px; color: #9ca3af;">
            Or copy and paste this URL in your browser:<br/>
            <a href="${resetUrl}" style="color: #3b82f6;">${resetUrl}</a>
          </p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html,
    });
  }

  async sendAccountLockedEmail(user) {
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: #ef4444; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Account Temporarily Locked</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hello ${user.firstName},</p>
          <p style="font-size: 16px; color: #374151;">
            Your account has been temporarily locked due to multiple failed login attempts.
          </p>
          <p style="font-size: 16px; color: #374151;">
            You can try again in 30 minutes, or reset your password if you've forgotten it.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/forgot-password" 
               style="background: #3b82f6; color: white; padding: 14px 30px; 
                      text-decoration: none; border-radius: 8px; font-size: 16px;
                      display: inline-block;">
              Reset Password
            </a>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Account Temporarily Locked',
      html,
    });
  }

  async sendWelcomeEmail(user) {
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to SaaS CRM!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hello ${user.firstName},</p>
          <p style="font-size: 16px; color: #374151;">
            Welcome aboard! Your workspace has been created successfully.
          </p>
          <p style="font-size: 16px; color: #374151;">
            Get started by adding your team members and creating your first project.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/login" 
               style="background: #10b981; color: white; padding: 14px 30px; 
                      text-decoration: none; border-radius: 8px; font-size: 16px;
                      display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to SaaS CRM Platform!',
      html,
    });
  }

async sendTeamInvitation(email, workspaceName, invitationUrl, role) {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">You're Invited!</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <p style="font-size: 16px; color: #374151;">
          You've been invited to join <strong>${workspaceName}</strong> as a <strong>${role}</strong>.
        </p>
        <p style="font-size: 16px; color: #374151;">
          Click the button below to accept the invitation and set up your account.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" 
             style="background: #3b82f6; color: white; padding: 14px 30px; 
                    text-decoration: none; border-radius: 8px; font-size: 16px;
                    display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">
          This invitation will expire in 7 days.
        </p>
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 14px; color: #9ca3af;">
          Or copy this link: <a href="${invitationUrl}" style="color: #3b82f6;">${invitationUrl}</a>
        </p>
      </div>
    </div>
  `;

  return this.sendEmail({
    to: email,
    subject: `You're invited to join ${workspaceName}`,
    html,
  });
}


async sendTaskAssignedEmail(user, task, assignedBy, projectName) {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">New Task Assigned</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <p style="font-size: 16px; color: #374151;">Hello ${user.firstName},</p>
        <p style="font-size: 16px; color: #374151;">
          <strong>${assignedBy.firstName} ${assignedBy.lastName}</strong> has assigned you a new task:
        </p>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 0;">${task.title}</p>
          ${projectName ? `<p style="color: #6b7280; margin: 8px 0 0;">Project: ${projectName}</p>` : ''}
          ${task.dueDate ? `<p style="color: #6b7280; margin: 4px 0 0;">Due: ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/tasks/${task._id}" 
             style="background: #3b82f6; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 8px; font-size: 16px;">
            View Task
          </a>
        </div>
      </div>
    </div>
  `;

  return this.sendEmail({
    to: user.email,
    subject: `New Task: ${task.title}`,
    html,
  });
}

async sendProjectUpdateEmail(users, project, updateType, updatedBy) {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Project Update</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <p style="font-size: 16px; color: #374151;">
          Project <strong>${project.name}</strong> has been updated.
        </p>
        <p style="font-size: 16px; color: #374151;">
          <strong>${updatedBy.firstName} ${updatedBy.lastName}</strong> ${updateType}
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/projects/${project._id}" 
             style="background: #059669; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 8px; font-size: 16px;">
            View Project
          </a>
        </div>
      </div>
    </div>
  `;

  const sendPromises = users.map(user => 
    this.sendEmail({
      to: user.email,
      subject: `Project Update: ${project.name}`,
      html,
    })
  );

  return Promise.all(sendPromises);
}

async sendMentionEmail(user, mentionedBy, context, link) {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">You Were Mentioned</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <p style="font-size: 16px; color: #374151;">Hello ${user.firstName},</p>
        <p style="font-size: 16px; color: #374151;">
          <strong>${mentionedBy.firstName} ${mentionedBy.lastName}</strong> mentioned you in ${context}.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" 
             style="background: #8b5cf6; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 8px; font-size: 16px;">
            View Message
          </a>
        </div>
      </div>
    </div>
  `;

  return this.sendEmail({
    to: user.email,
    subject: `${mentionedBy.firstName} mentioned you`,
    html,
  });
}
  
async sendEmployeeWelcomeEmail(user, workspace, plainPassword, employee) {
  const loginUrl = `${process.env.CLIENT_URL}/login`;

  const detailRow = (label, value) =>
    value
      ? `<tr>
           <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 40%;">${label}</td>
           <td style="padding: 6px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${value}</td>
         </tr>`
      : '';

  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Welcome to ${workspace.name}!</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <p style="font-size: 16px; color: #374151;">Hello ${user.firstName},</p>
        <p style="font-size: 16px; color: #374151;">
          An account has been created for you in <strong>${workspace.name}</strong> as
          <strong>${employee.role || 'a team member'}</strong>. Here are your login details:
        </p>

        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 40%;">Email</td>
              <td style="padding: 6px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${user.email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Temporary Password</td>
              <td style="padding: 6px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${plainPassword}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Workspace</td>
              <td style="padding: 6px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${workspace.name}</td>
            </tr>
            ${detailRow('Employee ID', employee.employeeId)}
            ${detailRow('Job Title', employee.position?.title)}
            ${detailRow('Department', employee.department?.name)}
            ${detailRow('Employment Type', employee.employmentType)}
            ${detailRow('Start Date', employee.workInfo?.hireDate ? new Date(employee.workInfo.hireDate).toLocaleDateString() : null)}
          </table>
        </div>

        <p style="font-size: 14px; color: #6b7280;">
          For security, please log in and change your password as soon as possible.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}"
             style="background: #3b82f6; color: white; padding: 14px 30px;
                    text-decoration: none; border-radius: 8px; font-size: 16px;
                    display: inline-block;">
            Log In Now
          </a>
        </div>

        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 14px; color: #9ca3af;">
          Or copy this link: <a href="${loginUrl}" style="color: #3b82f6;">${loginUrl}</a>
        </p>
        <p style="font-size: 12px; color: #9ca3af;">
          If you weren't expecting this account, please contact your administrator.
        </p>
      </div>
    </div>
  `;

  return this.sendEmail({
    to: user.email,
    subject: `Your account for ${workspace.name} is ready`,
    html,
  });
}



}

const emailService = new EmailService();
export default emailService;