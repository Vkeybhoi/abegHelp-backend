import { ENVIRONMENT } from '@/common/config';
import { Gender, IDType, Role } from '@/common/constants';
import { IUser, UserMethods } from '@/common/interfaces';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import mongoose, { HydratedDocument, Model } from 'mongoose';

type UserModel = Model<IUser, unknown, UserMethods>;

const userSchema = new mongoose.Schema<IUser, unknown, UserMethods>(
	{
		firstName: {
			type: String,
			min: [2, 'First name must be at least 2 characters long'],
			max: [50, 'First name must not be more than 50 characters long'],
			required: [true, 'First name is required'],
		},
		lastName: {
			type: String,
			min: [2, 'Last name must be at least 2 characters long'],
			max: [50, 'Last name must not be more than 50 characters long'],
			required: [true, 'Last name is required'],
		},
		email: {
			type: String,
			required: [true, 'Email field is required'],
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			min: [8, 'Password must be at least 8 characters long'],
			required: [true, 'Password field is required'],
			select: false,
		},
		refreshToken: {
			type: String,
			select: false,
		},
		phoneNumber: {
			type: String,
			unique: true,
			required: [true, 'Phone number is required'],
		},
		photo: {
			type: String,
		},
		role: {
			type: String,
			enum: Object.values(Role),
			default: Role.User,
		},
		isProfileComplete: {
			type: Boolean,
			default: false,
		},
		providers: {
			type: [String], /// refactor later
			select: false,
		},
		passwordResetToken: {
			type: String,
			select: false,
		},
		passwordResetExpires: {
			type: Date,
			select: false,
		},
		passwordResetRetries: {
			type: Number,
			default: 0,
			select: false,
		},
		passwordChangedAt: {
			type: Date,
			select: false,
		},
		ipAddress: {
			type: String,
			select: false,
		},
		loginRetries: {
			type: Number,
			default: 0,
			select: false,
		},
		gender: {
			type: String,
			enum: Object.values(Gender),
			required: [true, 'Gender is required'],
		},
		verificationMethod: {
			type: String,
			enum: Object.values(IDType),
		},
		isIdVerified: {
			type: Boolean,
			default: false,
		},
		isSuspended: {
			type: Boolean,
			default: false,
		},
		isEmailVerified: {
			type: Boolean,
			default: false,
		},
		isMobileVerified: {
			type: Boolean,
			default: false,
		},
		isDeleted: {
			type: Boolean,
			default: false,
			select: false,
		},
		lastLogin: {
			type: Date,
			select: false,
			default: Date.now(),
		},
		verificationToken: {
			type: String,
			select: false,
		},
	},
	{
		timestamps: true,
	}
);

// only pick users that are not deleted or suspended
userSchema.pre(/^find/, function (this: Model<IUser>, next) {
	this.find({ isDeleted: { $ne: true }, isSuspended: { $ne: true } });
	next();
});

// Hash password before saving to the database
userSchema.pre('save', async function (next) {
	if (!this.isProfileComplete) {
		const profiles = [
			this.firstName,
			this.lastName,
			this.email,
			this.phoneNumber,
			this.photo,
			//this.address.length,
			this.gender,
			this.isIdVerified,
			this.isMobileVerified,
			this.isEmailVerified,
		];
		this.isProfileComplete = profiles.every((profile) => Boolean(profile));
	}

	next();
});

// Verify user password
userSchema.method('verifyPassword', async function (this: HydratedDocument<IUser>, enteredPassword: string) {
	if (!this.password) {
		return false;
	}
	const isValid = await bcrypt.compare(enteredPassword, this.password);
	return isValid;
});

userSchema.method('toJSON', function (this: HydratedDocument<IUser>, fields?: Array<keyof IUser>) {
	const user = this.toObject();
	if (fields && fields.length === 0) {
		return user;
	}

	if (fields && fields.length > 0) {
		for (const field of fields) {
			if (field in user) {
				delete user[field];
			}
		}
		return user;
	}

	const { _id, firstName, lastName, email, photo } = user;
	return { _id, firstName, lastName, email, photo };
});

userSchema.method('generateAccessToken', function (this: HydratedDocument<IUser>, options: SignOptions = {}) {
	const accessToken = jwt.sign({ id: this._id }, ENVIRONMENT.JWT.ACCESS_KEY, {
		...options,
		expiresIn: ENVIRONMENT.JWT_EXPIRES_IN.ACCESS,
	});
	return accessToken;
});

userSchema.method('generateRefreshToken', async function (this: HydratedDocument<IUser>, options: SignOptions = {}) {
	const refreshToken = jwt.sign({ id: this._id }, ENVIRONMENT.JWT.REFRESH_KEY, {
		...options,
		expiresIn: ENVIRONMENT.JWT_EXPIRES_IN.REFRESH,
	});
	this.refreshToken = refreshToken;
	// to enable refresh token is saved in the database
	await this.save();
	return refreshToken;
});

const UserModel = mongoose.model<IUser, UserModel>('User', userSchema);
export { UserModel };
