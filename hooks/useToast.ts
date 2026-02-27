import { useState, useCallback } from "react";
import type { ToastType } from "@/components/Toast";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      setToast({ visible: true, message, type });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const showError = useCallback(
    (msg: string) => showToast(msg, "error"),
    [showToast],
  );
  const showSuccess = useCallback(
    (msg: string) => showToast(msg, "success"),
    [showToast],
  );
  const showWarning = useCallback(
    (msg: string) => showToast(msg, "warning"),
    [showToast],
  );
  const showInfo = useCallback(
    (msg: string) => showToast(msg, "info"),
    [showToast],
  );

  return {
    toast,
    showToast,
    hideToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
};
