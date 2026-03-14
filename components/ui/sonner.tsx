"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        style: {
          background: 'rgb(17 24 39)',
          border: '1px solid rgb(55 65 81)',
          color: 'rgb(243 244 246)',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

