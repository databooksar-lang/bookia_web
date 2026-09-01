import { useCallback, useEffect, useState } from "react";

import { apiFetch, subscribeToSessionExpiry } from "./api";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";
import { Redirect } from "./components/Redirect";
import { navigate, useLocationState } from "./navigation";
import { ForgotPasswordPage, LoginPage, ResetPasswordPage } from "./pages/AuthPages";
import { RegisterPage } from "./pages/RegisterPage";
import { isPlansRegistrationContext } from "./registerState";
import { DashboardPage } from "./pages/DashboardPage";
import { AboutPage, BookstorePage, BookstoresPage, HomePage, PlansPage, ReaderPage } from "./pages/PublicPages";
import { CookiePolicyPage } from "./pages/CookiePolicyPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { ReaderProfilePage } from "./pages/ReaderProfilePage";
import { BillingReturnPage } from "./pages/BillingReturnPage";
import { getAccountDestination } from "./accountDestination";
import { applyPendingReaderAction, completePendingReaderAuthentication, isAutoAppliedPendingReaderAction, readPendingReaderAction } from "./pendingReaderAction";
import { pushNotificationsController } from "./mobile/pushNotifications";

export default function App() {
  const { pathname, search } = useLocationState();
  const [me, setMe] = useState(undefined);
  const [readerActionFeedback, setReaderActionFeedback] = useState(null);
  const pendingReaderAction = readPendingReaderAction();

  const refreshMe = useCallback(function refreshMe({ preserveOnError = false } = {}) {
    return apiFetch("/me", { suppressSessionExpiry: true })
      .then((data) => {
        setMe(data);
        return data;
      })
      .catch(() => {
        if (!preserveOnError) {
          setMe(null);
        }
        return null;
      });
  }, []);

  const completeReaderAuthentication = useCallback(async (sessionData, { registered = false } = {}) => {
    const result = await completePendingReaderAuthentication({ sessionData, registered, fallbackPath: getAccountDestination(sessionData), navigateTo: navigate });
    if (result.status === "wrong_account") {
      setReaderActionFeedback({ kind: "error", message: "Esta acción necesita un perfil lector y no se aplicó a esta cuenta." });
      return result;
    }
    if (result.status === "applied") {
      setReaderActionFeedback({ kind: "success", message: result.message });
    }
    if (result.status === "error") setReaderActionFeedback({ kind: "error", message: `Tu cuenta está lista, pero no pudimos completar la acción. ${result.error.message}` });
    return result;
  }, []);

  function retryPendingReaderAction() {
    if (!me?.reader_profile) return;
    setReaderActionFeedback({ kind: "pending", message: "Reintentando..." });
    applyPendingReaderAction()
      .then((result) => {
        if (result.status === "applied") {
          setReaderActionFeedback({ kind: "success", message: result.message });
          navigate(result.returnPath);
        }
      })
      .catch((error) => setReaderActionFeedback({ kind: "error", message: `No pudimos completar la acción. ${error.message}` }));
  }

  useEffect(() => {
    refreshMe();
  }, []);
  useEffect(() => {
    return subscribeToSessionExpiry(() => {
      setMe(null);
      navigate("/login?reason=session-expired");
    });
  }, []);
  useEffect(() => {
    pushNotificationsController.listen().catch(() => {});
  }, []);


  let page = <HomePage me={me} />;
  if (pathname === "/plans") {
    if (isPlansRegistrationContext(search)) page = <PlansPage isRegistrationFlow />;
    else page = <Redirect to="/register" />;
  }
  else if (pathname === "/about") page = <AboutPage />;
  else if (pathname === "/para-librerias") page = <BookstoresPage />;
  else if (pathname === "/privacy") page = <PrivacyPage />;
  else if (pathname === "/terms") page = <TermsPage />;
  else if (pathname === "/cookies") page = <CookiePolicyPage />;
  else if (pathname === "/login") page = <LoginPage onLogin={refreshMe} onAuthenticated={completeReaderAuthentication} pendingAction={pendingReaderAction} me={me} sessionExpired={new URLSearchParams(search).get("reason") === "session-expired"} />;
  else if (pathname === "/register") page = <RegisterPage onRegister={refreshMe} onAuthenticated={completeReaderAuthentication} pendingAction={pendingReaderAction} me={me} locationSearch={search} />;
  else if (pathname === "/forgot-password") page = <ForgotPasswordPage />;
  else if (pathname === "/reset-password") page = <ResetPasswordPage locationSearch={search} />;
  else if (pathname === "/dashboard") page = <DashboardPage me={me} refreshMe={refreshMe} locationSearch={search} />;
  else if (pathname === "/billing/return") page = <BillingReturnPage locationSearch={search} refreshMe={refreshMe} />;
  else if (pathname === "/profile") page = <ReaderProfilePage me={me} refreshMe={refreshMe} locationSearch={search} />;
  else if (pathname.startsWith("/bookstores/")) page = <BookstorePage slug={pathname.replace("/bookstores/", "")} me={me} refreshSession={refreshMe} />;
  else if (pathname.startsWith("/readers/")) page = <ReaderPage slug={pathname.replace("/readers/", "")} search={search} me={me} />;

  return (
    <div className="app-shell">
      <SiteHeader pathname={pathname} me={me} refreshMe={refreshMe} />
      <main>
        {readerActionFeedback ? <div className={`reader-action-feedback feedback ${readerActionFeedback.kind === "error" ? "error" : "success"}`} role={readerActionFeedback.kind === "error" ? "alert" : "status"}><span>{readerActionFeedback.message}</span>{readerActionFeedback.kind === "error" && isAutoAppliedPendingReaderAction(pendingReaderAction) && me?.reader_profile ? <button type="button" className="text-link" onClick={retryPendingReaderAction}>Reintentar</button> : null}<button type="button" className="reader-action-feedback-close" aria-label="Cerrar mensaje" onClick={() => setReaderActionFeedback(null)}>×</button></div> : null}
        {page}
      </main>
      <SiteFooter />
    </div>
  );
}
