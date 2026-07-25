import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { authAPI } from '../../api/auth.api';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-center">
            {sent ? (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 mb-4">
                <Mail className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
            )}
            <CardTitle>
              {sent ? 'Check Your Email' : 'Forgot Password?'}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {sent
                ? `If an account exists for ${email}, a password reset link has been sent.`
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Didn't receive the email?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure the email address is correct</li>
                  <li>The link expires in 1 hour</li>
                </ul>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setSent(false);
                  setError('');
                }}
              >
                Try a different email
              </Button>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                icon={Mail}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Send Reset Link
              </Button>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
