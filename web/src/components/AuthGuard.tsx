import { UserContext } from 'lib/context';
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import LoadingScreen from 'components/LoadingScreen';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useContext(UserContext);

  if (user === undefined) return <LoadingScreen />;

  if (user === null) return <Navigate to="/authentication/login" />;

  return <>{children}</>;
}
