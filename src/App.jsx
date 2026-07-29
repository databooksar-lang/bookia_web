import { useEffect, useState } from "react";

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
  else if (pathname === "/login") page = <LoginPage onLogin={refreshMe} me={me} sessionExpired={new URLSearchParams(search).get("reason") === "session-expired"} />;
  else if (pathname === "/register") page = <RegisterPage onRegister={refreshMe} me={me} locationSearch={search} />;
  else if (pathname === "/forgot-password") page = <ForgotPasswordPage />;
  else if (pathname === "/reset-password") page = <ResetPasswordPage locationSearch={search} />;
  else if (pathname === "/dashboard") page = <DashboardPage me={me} refreshMe={refreshMe} locationSearch={search} />;
  else if (pathname === "/profile") page = <ReaderProfilePage me={me} refreshMe={refreshMe} locationSearch={search} />;
  else if (pathname.startsWith("/bookstores/")) page = <BookstorePage slug={pathname.replace("/bookstores/", "")} me={me} />;
  else if (pathname.startsWith("/readers/")) page = <ReaderPage slug={pathname.replace("/readers/", "")} />;

  return (
    <div className="app-shell">
      <SiteHeader pathname={pathname} me={me} />
      <main>{page}</main>
      <SiteFooter />
    </div>
  );
}
