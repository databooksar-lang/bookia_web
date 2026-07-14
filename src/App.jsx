import { useEffect, useState } from "react";

import { apiFetch } from "./api";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";
import { useLocationState } from "./navigation";
import { ForgotPasswordPage, LoginPage, ResetPasswordPage } from "./pages/AuthPages";
import { DashboardPage } from "./pages/DashboardPage";
import { AboutPage, BookstorePage, HomePage, PlansPage } from "./pages/PublicPages";

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

  let page = <HomePage />;
  if (pathname === "/plans") page = <PlansPage />;
  else if (pathname === "/about") page = <AboutPage />;
  else if (pathname === "/login") page = <LoginPage onLogin={refreshMe} me={me} />;
  else if (pathname === "/forgot-password") page = <ForgotPasswordPage />;
  else if (pathname === "/reset-password") page = <ResetPasswordPage locationSearch={search} />;
  else if (pathname === "/dashboard") page = <DashboardPage me={me} refreshMe={refreshMe} />;
  else if (pathname.startsWith("/bookstores/")) page = <BookstorePage slug={pathname.replace("/bookstores/", "")} />;

  return (
    <div className="app-shell">
      <SiteHeader pathname={pathname} me={me} />
      <main>{page}</main>
      <SiteFooter />
    </div>
  );
}
