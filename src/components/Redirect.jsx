import { useEffect } from "react";

import { navigate } from "../navigation";

export function Redirect({ to }) {
  useEffect(() => {
    navigate(to);
  }, [to]);

  return null;
}
