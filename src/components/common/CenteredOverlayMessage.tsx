import React from 'react';
import { Button } from '@/components/ui/button';

interface CenteredOverlayMessageProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function CenteredOverlayMessage({
  open,
  title,
  description,
  confirmLabel = 'OK',
  onConfirm,
}: CenteredOverlayMessageProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      // Não propaga cliques para \"fora\"; nada fecha este overlay
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-gray-700">{description}</p>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

