import React, { useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { getMightyLoginUrl } from '../firebaseConfig';
import { clearIframeAutoLoginAttempt } from '../utils/mightyEmbed';

const AuthPage = ({ auth, authError: bridgeAuthError, isMightyIframe = false }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [error, setError] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const [mightyRedirecting, setMightyRedirecting] = useState(false);

    const handleMightyLogin = () => {
        setError('');
        setMightyRedirecting(true);
        // Allow a fresh auto-login attempt next time if this manual path is used
        clearIframeAutoLoginAttempt();
        // Full-page (or iframe) redirect to central Mighty ↔ Firebase bridge
        window.location.href = getMightyLoginUrl();
    };

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setError('');
        setInfoMessage('');
        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            let userFriendlyError = err.message;

            if (
                err.code === 'auth/user-not-found' ||
                err.code === 'auth/invalid-credential' ||
                err.code === 'auth/wrong-password'
            ) {
                if (!isSignUp) {
                    userFriendlyError =
                        "We couldn't find an account with that email and password. Are you trying to create a new account? Click 'Sign Up' below.";
                } else {
                    userFriendlyError =
                        'Invalid email or weak password. Please check your details.';
                }
            } else if (err.code === 'auth/email-already-in-use') {
                userFriendlyError =
                    "An account with this email already exists. Click 'Sign In' below to access your account.";
            } else if (err.code === 'auth/weak-password') {
                userFriendlyError = 'Password should be at least 6 characters long.';
            }

            setError(userFriendlyError);
        }
    };

    const handlePasswordReset = async () => {
        if (!email) {
            setError('Please enter your email address to reset your password.');
            return;
        }
        setError('');
        setInfoMessage('');
        try {
            await sendPasswordResetEmail(auth, email);
            setInfoMessage('Password reset email sent! Check your inbox.');
        } catch (err) {
            setError('Failed to send reset email: ' + err.message);
        }
    };

    const displayError = error || bridgeAuthError;

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold text-gray-800">Activity Tracker</h2>
                    <p className="text-sm text-gray-500">Team NuVision</p>
                </div>

                {isMightyIframe && (
                    <p className="text-xs text-center text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                        Opened inside Team NuVision. If you weren&apos;t signed in automatically,
                        tap the button below (one-time if sign-in was cancelled).
                    </p>
                )}

                {/* Primary: Mighty bridge login */}
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={handleMightyLogin}
                        disabled={mightyRedirecting || !auth}
                        className="w-full py-3 px-4 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors"
                    >
                        {mightyRedirecting
                            ? 'Redirecting to Team NuVision…'
                            : 'Continue with Team NuVision'}
                    </button>
                    <p className="text-xs text-center text-gray-500">
                        Sign in with your Mighty Networks membership. Your plan (Free / Pro /
                        Platinum) unlocks the right tools automatically.
                    </p>
                </div>

                {displayError && (
                    <p className="text-sm text-red-600 text-center bg-red-50 rounded-md px-3 py-2">
                        {displayError}
                    </p>
                )}

                {/* Secondary: email/password (legacy / admin) */}
                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-2 text-gray-400">or</span>
                    </div>
                </div>

                {!showEmailForm ? (
                    <button
                        type="button"
                        onClick={() => setShowEmailForm(true)}
                        className="w-full py-2 px-4 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        Sign in with email instead
                    </button>
                ) : (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-center text-gray-700">
                            {isSignUp ? 'Create an Account' : 'Email Sign In'}
                        </h3>
                        <form onSubmit={handleAuthAction} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            {infoMessage && (
                                <p className="text-sm text-green-600 font-medium">{infoMessage}</p>
                            )}

                            <button
                                type="submit"
                                className="w-full py-2 px-4 font-semibold text-white bg-gray-800 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700"
                            >
                                {isSignUp ? 'Sign Up' : 'Sign In'}
                            </button>
                        </form>

                        {!isSignUp && (
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={handlePasswordReset}
                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        <p className="text-sm text-center text-gray-600">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                            <button
                                type="button"
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="ml-1 font-semibold text-indigo-600 hover:underline"
                            >
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthPage;
