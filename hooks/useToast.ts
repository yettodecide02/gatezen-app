import { useState, useCallback } from "react";

interface ToastState {
  visible: boolean;
  message: string;
  type: "error" | "success";
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  const showToast = useCallback(
    (message: string, type: "error" | "success" = "success") => {
      setToast({
        visible: true,
        message,
        type,
      });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const showError = useCallback(
    (message: string) => {
      showToast(message, "error");
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string) => {
      showToast(message, "success");
    },
    [showToast]
  );

  return {
    toast, 
    showToast,
    hideToast,
    showError,
    showSuccess,
  };
};

