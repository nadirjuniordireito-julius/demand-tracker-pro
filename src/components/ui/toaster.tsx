import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type ToastPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "bottom-center";

const positionClasses: Record<ToastPosition, string> = {
  "top-right": "top-0 right-0",
  "top-left": "top-0 left-0",
  "bottom-right": "bottom-0 right-0",
  "bottom-left": "bottom-0 left-0",
  "top-center": "top-0 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-0 left-1/2 -translate-x-1/2",
};

export function Toaster() {
  const { toasts } = useToast();

  type ToastItem = (typeof toasts)[number] & { position?: ToastPosition };

  // Agrupar por posição
  const groupedToasts = toasts.reduce<
    Record<ToastPosition, typeof toasts>
  >(
    (acc, toast) => {
      const pos: ToastPosition = (toast as ToastItem).position || "bottom-right";
      acc[pos].push(toast);
      return acc;
    },
    {
      "top-right": [],
      "top-left": [],
      "bottom-right": [],
      "bottom-left": [],
      "top-center": [],
      "bottom-center": [],
    }
  );

  return (
    <ToastProvider>
      {(Object.keys(groupedToasts) as ToastPosition[]).map((position) => {
        const toastsAtPosition = groupedToasts[position];

        if (!toastsAtPosition.length) return null;

        return (
          <div key={position}>
            {toastsAtPosition.map(
              ({ id, title, description, action, ...props }) => (
                <Toast key={id} {...props}>
                  <div className="grid gap-1">
                    {title && <ToastTitle>{title}</ToastTitle>}
                    {description && (
                      <ToastDescription>{description}</ToastDescription>
                    )}
                  </div>
                  {action}
                  <ToastClose />
                </Toast>
              )
            )}

            <ToastViewport
              className={cn(
                "fixed z-50 flex flex-col gap-2 p-4",
                positionClasses[position]
              )}
            />
          </div>
        );
      })}
    </ToastProvider>
  );
}
