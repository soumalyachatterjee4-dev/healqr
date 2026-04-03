/**
 * TranslatedConfirmModal — Replaces native confirm()/alert() dialogs
 * Works with TranslationProvider for automatic translation.
 * 
 * Usage:
 *   const { showConfirm, showAlert, ConfirmModalComponent } = useTranslatedConfirm();
 *   // In JSX: <ConfirmModalComponent />
 *   // To use: const ok = await showConfirm('Are you sure?');
 *   //         await showAlert('Operation completed!');
 */

import { useState, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface ModalState {
  open: boolean;
  message: string;
  title?: string;
  type: 'confirm' | 'alert';
  variant: 'warning' | 'success' | 'info';
}

type ResolverFn = (value: boolean) => void;

export function useTranslatedConfirm() {
  const [state, setState] = useState<ModalState>({
    open: false,
    message: '',
    type: 'confirm',
    variant: 'warning',
  });
  const resolverRef = useRef<ResolverFn | null>(null);

  const showConfirm = useCallback((message: string, title?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, message, title, type: 'confirm', variant: 'warning' });
    });
  }, []);

  const showAlert = useCallback((message: string, title?: string, variant: 'success' | 'info' | 'warning' = 'info'): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, message, title, type: 'alert', variant });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    setState((s) => ({ ...s, open: false }));
  }, []);

  const handleCancel = useCallback(() => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setState((s) => ({ ...s, open: false }));
  }, []);

  const ConfirmModalComponent = useCallback(() => {
    if (!state.open) return null;

    const iconMap = {
      warning: <AlertTriangle className="w-6 h-6 text-amber-500" />,
      success: <CheckCircle className="w-6 h-6 text-emerald-500" />,
      info: <Info className="w-6 h-6 text-blue-500" />,
    };

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            {iconMap[state.variant]}
            <h3 className="text-lg font-semibold text-white">
              {state.title || (state.type === 'confirm' ? 'Confirm Action' : 'Notice')}
            </h3>
            <button
              onClick={handleCancel}
              className="ml-auto text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message */}
          <p className="text-zinc-300 text-sm leading-relaxed mb-6">
            {state.message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            {state.type === 'confirm' && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                state.variant === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : state.variant === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {state.type === 'confirm' ? 'Yes, Continue' : 'OK'}
            </button>
          </div>
        </div>
      </div>
    );
  }, [state, handleConfirm, handleCancel]);

  return { showConfirm, showAlert, ConfirmModalComponent };
}
