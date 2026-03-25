"use client";

import { createContext, useContext, useState } from "react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: "",
    description: "",
    resolve: null,
  });

  function confirm({ title, description }) {
    return new Promise((resolve) => {
      setState({
        open: true,
        title,
        description,
        resolve,
      });
    });
  }

  function handleClose(result) {
    if (state.resolve) {
      state.resolve(result);
    }

    setState({
      open: false,
      title: "",
      description: "",
      resolve: null,
    });
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {state.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-2">
              {state.title}
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              {state.description}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>

              <button
                onClick={() => handleClose(true)}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm must be used inside ConfirmProvider");
  }

  return context.confirm;
}