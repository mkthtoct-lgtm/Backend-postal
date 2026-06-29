import { createContext, useContext } from "react";

export const ToastDispatchContext = createContext(null);

export function useToast() {
  const dispatch = useContext(ToastDispatchContext);
  return {
    success: (message, title) => dispatch?.({ type: "success", message, title }),
    error:   (message, title) => dispatch?.({ type: "error",   message, title, duration: 5000 }),
    warning: (message, title) => dispatch?.({ type: "warning", message, title }),
    info:    (message, title) => dispatch?.({ type: "info",    message, title }),
  };
}
