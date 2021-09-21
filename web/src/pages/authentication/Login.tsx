import AuthButton from 'components/authentication/AuthButton';
import TextField from 'components/TextField';
import { FAKE_EMAIL } from 'config';
import { Formik } from 'formik';
import { UserContext } from 'lib/context';
import { auth } from 'lib/firebase';
import React, { useContext, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

function Header() {
  return (
    <header className="w-full py-8 grid grid-cols-3">
      <div />
      <div className="flex items-center justify-center">
        <img
          src={`${process.env.PUBLIC_URL}/logo.png`}
          alt="logo"
          className="h-16 w-auto rounded-md"
        />
      </div>
      <div className="flex text-sm flex-col justify-center items-end mr-6">
        <div className="th-color-for">Don&apos;t have an account yet?</div>
        <Link
          to="/authentication/register"
          className="font-semibold th-color-blue"
        >
          Create an account
        </Link>
      </div>
    </header>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  useEffect(() => {
    if (user) navigate('/dashboard');
  }, []);

  return (
    <>
      <Helmet>
        <title>Login</title>
      </Helmet>
      <Header />
      <div className="max-w-2xl flex flex-col items-center mx-auto h-full">
        <h1 className="font-extrabold text-5xl mb-2 th-color-for">Sign In</h1>
        <Formik
          initialValues={{
            email: '',
            password: '',
          }}
          onSubmit={async ({ email, password }, { setSubmitting }) => {
            setSubmitting(true);
            try {
              let emailPayload = email;
              let passwordPayload = password;
              if (FAKE_EMAIL && !email.includes('@') && !password) {
                emailPayload = `${email}@${email}.com`;
                passwordPayload = `${email}111`;
              }
              await auth.signInWithEmailAndPassword(
                emailPayload,
                passwordPayload
              );
              navigate('/dashboard');
            } catch (err: any) {
              toast.error(err.message);
            }
            setSubmitting(false);
          }}
        >
          {({ values, handleChange, isSubmitting, handleSubmit }) => (
            <form className="max-w-md w-full mt-10" onSubmit={handleSubmit}>
              <div className="w-full space-y-5">
                <TextField
                  value={values.email}
                  handleChange={handleChange}
                  type={FAKE_EMAIL ? 'text' : 'email'}
                  required
                  label="Email address"
                  name="email"
                  autoComplete="email"
                  placeholder="name@email.com"
                />
                <TextField
                  value={values.password}
                  handleChange={handleChange}
                  type="password"
                  label="Password"
                  name="password"
                  required={!FAKE_EMAIL}
                  autoComplete="current-password"
                  placeholder="Your password"
                />
                <div className="pt-4">
                  <AuthButton text="Sign in" isSubmitting={isSubmitting} />
                </div>

                {/* <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-400 rounded"
                    />
                    <label
                      htmlFor="remember-me"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Remember me on this device
                    </label>
                  </div>
                </div> */}

                <div className="flex items-center">
                  <h5 className="block text-sm th-color-for">
                    Forgot your password?{' '}
                    <Link
                      className="font-semibold hover:underline th-color-blue"
                      to="/authentication/reset_password"
                    >
                      Get help signing in
                    </Link>
                  </h5>
                </div>
              </div>
            </form>
          )}
        </Formik>
      </div>
    </>
  );
}
