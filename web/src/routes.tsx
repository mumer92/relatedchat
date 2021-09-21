import React, { lazy, Suspense } from 'react';
import Login from 'pages/authentication/Login';
import NotFound from 'pages/NotFound';
import PasswordReset from 'pages/authentication/PasswordReset';
import Signup from 'pages/authentication/Signup';
import AuthGuard from 'components/AuthGuard';
import GuestGuard from 'components/GuestGuard';
import LoadingScreen from 'components/LoadingScreen';
import Logout from 'pages/dashboard/Logout';
import NewWorkspace from 'pages/dashboard/NewWorkspace';

const Loadable = (Component: any) => (props: any) =>
  (
    <Suspense fallback={<LoadingScreen />}>
      {/* eslint-disable-next-line */}
      <Component {...props} />
    </Suspense>
  );

const Dashboard = Loadable(lazy(() => import('pages/dashboard/Dashboard')));

const routes = [
  {
    path: 'authentication',
    children: [
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Signup />,
      },
      {
        path: 'reset_password',
        element: <PasswordReset />,
      },
    ],
  },
  {
    path: 'dashboard',
    children: [
      {
        path: '/',
        element: (
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        ),
      },
      {
        path: '/new_workspace',
        element: (
          <AuthGuard>
            <NewWorkspace />
          </AuthGuard>
        ),
      },
      {
        path: 'workspaces/:workspaceId',
        children: [
          {
            path: '/',
            element: (
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            ),
          },
          {
            path: 'channels/:channelId*',
            element: (
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            ),
          },
          {
            path: 'dm/:dmId*',
            element: (
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            ),
          },
        ],
      },
      {
        path: 'logout',
        element: <Logout />,
      },
    ],
  },
  {
    path: '*',
    children: [
      {
        path: '/',
        element: (
          <GuestGuard>
            <Login />
          </GuestGuard>
        ),
      },
      {
        path: '404',
        element: <NotFound />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
];

export default routes;
