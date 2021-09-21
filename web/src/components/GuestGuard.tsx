import React from 'react';
import { useUserData } from 'lib/hooks';
import { Navigate } from 'react-router-dom';
import LoadingScreen from 'components/LoadingScreen';

const GuestGuard = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUserData();

  if (user === undefined) return <LoadingScreen />;

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

export default GuestGuard;
