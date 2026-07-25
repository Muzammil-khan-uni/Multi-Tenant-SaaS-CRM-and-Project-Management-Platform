import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useSelector } from 'react-redux';
import axios from '../../api/axios';
import { authAPI } from '../../api/auth.api';
import { useEmailVerification } from '../../hooks/useEmailVerification';

const CheckInboxScreen = ({ email }) => {
  const [resendStatus, setResendStatus] = useState('idle'); // idle | loading | sent | error
  const [resendMessage, setResendMessage] = useState('');

  const handleResend = async () => {
    if (!email) {
      setResendStatus('error');
      setResendMessage(
        'No email address found. Please go back and register again.'
      );
      return;
    }
    setResendStatus('loading');
    try {
      const { data } = await authAPI.resendVerification(email);
      setResendStatus('sent');
      setResendMessage(
        data.message || 'Verification email sent! Please check your inbox.'
      );
    } catch (err) {
      setResendStatus('error');
      setResendMessage(
        err.response?.data?.message || 'Failed to resend. Please try again.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
          <Mail className="w-10 h-10 text-primary-600 dark:text-primary-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Check your inbox
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          We've sent a verification link to{' '}
          {email ? (
            <span className="font-semibold text-gray-900 dark:text-white">
              {email}
            </span>
          ) : (
            'your email address'
          )}
          . Click the link in that email to verify your account.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
        <p className="font-medium mb-1">Didn't receive the email?</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
          <li>Check your spam or junk folder</li>
          <li>Make sure you entered the correct email address</li>
          <li>The link expires in 24 hours</li>
        </ul>
      </div>

      {resendStatus === 'sent' && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {resendMessage}
        </div>
      )}

      {resendStatus === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <XCircle className="w-4 h-4 shrink-0" />
          {resendMessage}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          onClick={handleResend}
          loading={resendStatus === 'loading'}
          disabled={resendStatus === 'loading' || resendStatus === 'sent'}
          className="w-full flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {resendStatus === 'sent'
            ? 'Email sent!'
            : 'Resend verification email'}
        </Button>

        <Link to="/login" className="w-full">
          <Button variant="ghost" className="w-full">
            Back to Login
          </Button>
        </Link>
      </div>
    </div>
  );
};

const TokenVerifyScreen = ({ token }) => {
  const verifyFn = useCallback(async () => {
    const { data } = await axios.get(`/auth/verify-email/${token}`);
    return data;
  }, [token]);

  const { status, message } = useEmailVerification(verifyFn);

  return (
    <div className="space-y-4">
      {status === 'loading' && (
        <>
          <div className="flex justify-center">
            <Loader2 className="w-16 h-16 text-primary-500 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Verifying Your Email
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we verify your email address…
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="flex justify-center">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Email Verified!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
          <Link to="/login">
            <Button className="mt-2 w-full">Continue to Login</Button>
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="flex justify-center">
            <XCircle className="w-16 h-16 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Verification Failed
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
          <div className="flex flex-col gap-3 mt-2">
            <Link to="/verify-email">
              <Button className="w-full">Request a New Link</Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

const VerifyEmail = () => {
  const { token } = useParams();
  const pendingVerificationEmail = useSelector(
    (state) => state.auth.pendingVerificationEmail
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-8 px-6">
          {token ? (
            <TokenVerifyScreen token={token} />
          ) : (
            <CheckInboxScreen email={pendingVerificationEmail} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
