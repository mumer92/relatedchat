import LoadingScreen from 'components/LoadingScreen';
import { auth } from 'lib/firebase';
import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

export default function Logout() {
  useEffect(() => {
    (async () => {
      await auth.signOut();
      window.location.replace('/authentication/login');
    })();
  }, []);

  return (
    <>
      <Helmet>
        <title>Logout</title>
      </Helmet>
      <LoadingScreen />
    </>
  );
}
