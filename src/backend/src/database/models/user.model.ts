/**
 * @fileoverview MongoDB user model implementation with Mongoose
 * Implements IUser interface with secure password handling and progress tracking
 * @version 1.0.0
 */

import mongoose, { Schema, Model, Document } from 'mongoose'; // ^7.0.0
import bcrypt from 'bcrypt'; // ^5.1.0
import { IUser, IUserPreferences, IUserProgress } from '../../core/interfaces/user.interface';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../../constants/languages';
import { ID, Timestamp } from '../../core/types/common.types';

/**
 * Extended interface for User document with Mongoose methods
 */
interface IUserDocument extends IUser, Document {
    validatePassword(password: string): Promise<boolean>;
    updateProgress(progressUpdate: Partial<IUserProgress>): Promise<void>;
}

/**
 * Extended interface for User model with static methods
 */
interface IUserModel extends Model<IUserDocument> {
    findByUsername(username: string): Promise<IUserDocument | null>;
}

/**
 * Mongoose schema for user preferences
 */
const userPreferencesSchema = new Schema<IUserPreferences>({
    language: {
        type: String,
        enum: Object.values(SUPPORTED_LANGUAGES),
        default: DEFAULT_LANGUAGE,
        required: true
    },
    defaultWordLength: {
        type: Number,
        min: 2,
        max: 15,
        default: 5,
        required: true
    },
    showDefinitions: {
        type: Boolean,
        default: true,
        required: true
    },
    advancedMode: {
        type: Boolean,
        default: false,
        required: true
    }
}, { _id: false });

/**
 * Mongoose schema for user progress
 */
const userProgressSchema = new Schema<IUserProgress>({
    wordsFound: {
        type: Number,
        default: 0,
        min: 0,
        required: true
    },
    successRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
        required: true
    },
    level: {
        type: Number,
        default: 1,
        min: 1,
        required: true
    },
    achievements: [{
        type: String,
        required: true
    }],
    favoriteWords: [{
        type: String,
        required: true
    }],
    lastActive: {
        type: Date,
        default: Date.now,
        required: true
    }
}, { _id: false });

/**
 * Main user schema implementation
 */
const userSchema = new Schema<IUserDocument>({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    preferences: {
        type: userPreferencesSchema,
        required: true,
        default: () => ({})
    },
    progress: {
        type: userProgressSchema,
        required: true,
        default: () => ({})
    }
}, {
    timestamps: true,
    versionKey: true,
    strict: true
});

// Indexes for optimization
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'progress.lastActive': -1 });

/**
 * Password hashing middleware
 */
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error as Error);
    }
});

/**
 * Progress update validation middleware
 */
userSchema.pre('save', async function(next) {
    if (this.isModified('progress')) {
        // Ensure progress metrics are within valid ranges
        if (this.progress.successRate < 0 || this.progress.successRate > 100) {
            next(new Error('Invalid success rate value'));
        }
        if (this.progress.level < 1) {
            next(new Error('Invalid level value'));
        }
        // Update lastActive timestamp
        this.progress.lastActive = new Date();
    }
    next();
});

/**
 * Password validation method
 */
userSchema.methods.validatePassword = async function(password: string): Promise<boolean> {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        throw new Error('Password validation failed');
    }
};

/**
 * Progress update method with validation
 */
userSchema.methods.updateProgress = async function(
    progressUpdate: Partial<IUserProgress>
): Promise<void> {
    try {
        // Merge existing progress with updates
        const updatedProgress = {
            ...this.progress,
            ...progressUpdate,
            lastActive: new Date()
        };

        // Validate progress data
        if (updatedProgress.successRate < 0 || updatedProgress.successRate > 100) {
            throw new Error('Invalid success rate value');
        }

        // Update progress with optimistic concurrency
        const result = await this.model('User').findOneAndUpdate(
            {
                _id: this._id,
                __v: this.__v
            },
            {
                $set: { progress: updatedProgress },
                $inc: { __v: 1 }
            },
            { new: true }
        );

        if (!result) {
            throw new Error('Concurrent progress update detected');
        }

        // Update local document
        this.progress = updatedProgress;
        this.__v = this.__v + 1;
    } catch (error) {
        throw new Error(`Progress update failed: ${(error as Error).message}`);
    }
};

/**
 * Static method to find user by username
 */
userSchema.statics.findByUsername = async function(
    username: string
): Promise<IUserDocument | null> {
    return this.findOne({ username });
};

// Create and export the User model
export const UserModel = mongoose.model<IUserDocument, IUserModel>('User', userSchema);