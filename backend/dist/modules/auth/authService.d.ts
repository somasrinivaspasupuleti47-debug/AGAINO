interface RegisterInput {
    email: string;
    displayName: string;
    password: string;
}
export declare function registerUser(input: RegisterInput): Promise<any>;
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
export declare function generateTokens(userId: string, email: string, role: string): Promise<TokenPair>;
interface LoginInput {
    email: string;
    password: string;
}
export interface LoginResult extends TokenPair {
    user: {
        id: string;
        email: string;
        displayName: string;
        role: string;
    };
}
export declare function loginUser(input: LoginInput): Promise<LoginResult>;
interface RefreshInput {
    token: string;
}
export declare function refreshTokens(input: RefreshInput): Promise<TokenPair>;
interface LogoutInput {
    userId: string;
}
export declare function logoutUser(input: LogoutInput): Promise<void>;
interface VerifyOtpInput {
    email: string;
    otp: string;
}
export interface VerifyOtpResult extends TokenPair {
    user: {
        id: string;
        email: string;
        displayName: string;
        role: string;
    };
}
export declare function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult>;
interface ForgotPasswordInput {
    email: string;
}
export declare function forgotPassword(input: ForgotPasswordInput): Promise<void>;
interface ResetPasswordInput {
    token: string;
    password: string;
}
export declare function resetPassword(input: ResetPasswordInput): Promise<void>;
export {};
//# sourceMappingURL=authService.d.ts.map