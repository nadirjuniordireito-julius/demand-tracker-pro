import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { ToastProvider } from "@/components/ui/toast";
import App from "./App.tsx";
import "./index.css";
import i18n from "./i18n";
import faviconUrl from "./assets/icon-main-julius.ico?url";

document.querySelectorAll('link[rel="icon"]').forEach((el) => el.remove());
const link = document.createElement("link");
link.rel = "icon";
link.href = faviconUrl;
document.head.appendChild(link);

createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}>
    <ToastProvider duration={2000}>
      <App />
    </ToastProvider>
  </I18nextProvider>
);
