import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

const AuthPage = ({ auth }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(true);
    const [error, setError] = useState('');
    const [infoMessage, setInfoMessage] = useState('');

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

            // Handle Firebase Auth error codes 
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                if (!isSignUp) {
                    userFriendlyError = "We couldn't find an account with that email and password. Are you trying to create a new account? Click 'Sign Up' below.";
                } else {
                    userFriendlyError = "Invalid email or weak password. Please check your details.";
                }
            } else if (err.code === 'auth/email-already-in-use') {
                userFriendlyError = "An account with this email already exists. Click 'Sign In' below to access your account.";
            } else if (err.code === 'auth/weak-password') {
                userFriendlyError = "Password should be at least 6 characters long.";
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

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800">
                    {isSignUp ? 'Create an Account' : 'Sign In'}
                </h2>
                <form onSubmit={handleAuthAction} className="space-y-6">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" required />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" required />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {infoMessage && <p className="text-sm text-green-600 font-medium">{infoMessage}</p>}

                    <button type="submit" className="w-full py-2 px-4 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>

                {!isSignUp && (
                    <div className="text-center">
                        <button
                            onClick={handlePasswordReset}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                        >
                            Forgot Password?
                        </button>
                    </div>
                )}

                <p className="text-sm text-center text-gray-600">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button onClick={() => setIsSignUp(!isSignUp)} className="ml-1 font-semibold text-indigo-600 hover:underline">
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
