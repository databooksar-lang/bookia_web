import { useEffect, useState } from "react";

import { stripBasePath, withBasePath } from "./routing";

export function navigate(path) {
  window.history.pushState({}, "", withBasePath(path));
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function AppLink({ href, className, children, onClick, ...props }) {
  return (
    <a
      href={withBasePath(href)}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        event.preventDefault();
        navigate(href);
      }}
      {...props}
    >
      {children}
    </a>
  );
}

export function useLocationState() {
  const [locationState, setLocationState] = useState(() => ({
    pathname: stripBasePath(window.location.pathname),
    search: window.location.search,
  }));

  useEffect(() => {
    const onChange = () => {
      setLocationState({
        pathname: stripBasePath(window.location.pathname),
        search: window.location.search,
      });
    };

    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);

  return locationState;
}
