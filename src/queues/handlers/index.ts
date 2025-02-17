import { ENVIRONMENT } from '@/common/config';
import { EmailJobData } from '@/common/interfaces/emailQueue';
import { logger } from '@/common/utils';
import { Resend } from 'resend';
import { resetPassword, welcomeEmail } from '../templates';
import { forgotPassword } from '../templates/forgotPassword';

const resend = new Resend(ENVIRONMENT.EMAIL.API_KEY);

const TEMPLATES = {
	resetPassword: {
		subject: 'Password Reset Successful',
		from: 'AbegHelp Customer Support <donotreply@abeghelp.me>',
		template: resetPassword,
	},
	forgotPassword: {
		subject: 'Reset Your Password',
		from: 'AbegHelp Customer Support <donotreply@abeghelp.me>',
		template: forgotPassword,
	},
	welcomeEmail: {
		subject: 'Welcome to AbegHelp',
		from: 'AbegHelp Customer Support <donotreply@abeghelp.me>',
		template: welcomeEmail,
	},
};

export const sendEmail = async (job: EmailJobData) => {
	const { data, type } = job as EmailJobData;
	const options = TEMPLATES[type];

	console.log('job send email', job);
	console.log('options', options);
	try {
		const dispatch = await resend.emails.send({
			from: options.from,
			to: data.to,
			subject: options.subject,
			html: options.template(data),
		});
		console.log(dispatch);
		logger.info(`Resend api successfully delivered ${type} email to ${data.to}`);
	} catch (error) {
		console.error(error);
		logger.error(`Resend api failed to deliver ${type} email to ${data.to}` + error);
	}
};
