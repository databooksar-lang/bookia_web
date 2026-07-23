import { useEffect, useState } from "react";

import { apiFetch, subscribeToSessionExpiry } from "./api";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";
import { navigate, useLocationState } from "./navigation";
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from "./pages/AuthPages";
import { DashboardPage } from "./pages/DashboardPage";
import { AboutPage, BookstorePage, HomePage, PlansPage } from "./pages/PublicPages";
import { PrivacyPage } from "./pages/PrivacyPage";

export default function App() {
  const { pathname, search } = useLocationState();
  const [me, setMe] = useState(undefined);

  function refreshMe({ preserveOnError = false } = {}) {
    return apiFetch("/me")
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


  let page = <HomePage />;
  if (pathname === "/plans") page = <PlansPage />;
  else if (pathname === "/about") page = <AboutPage />;
  else if (pathname === "/privacy") page = <PrivacyPage />;
  else if (pathname === "/login") page = <LoginPage onLogin={refreshMe} me={me} sessionExpired={new URLSearchParams(search).get("reason") === "session-expired"} />;
  else if (pathname === "/register") page = <RegisterPage onRegister={refreshMe} me={me} />;
  else if (pathname === "/forgot-password") page = <ForgotPasswordPage />;
  else if (pathname === "/reset-password") page = <ResetPasswordPage locationSearch={search} />;
  else if (pathname === "/dashboard") page = <DashboardPage me={me} refreshMe={refreshMe} locationSearch={search} />;
  else if (pathname.startsWith("/bookstores/")) page = <BookstorePage slug={pathname.replace("/bookstores/", "")} />;

  return (
    <div className="app-shell">
      <SiteHeader pathname={pathname} me={me} />
      <main>{page}</main>
      <SiteFooter />
    </div>
  );
}
