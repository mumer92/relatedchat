import Spinner from 'components/Spinner';
import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <Spinner className="h-6 w-6 th-color-for" />
    </div>
  );
}
