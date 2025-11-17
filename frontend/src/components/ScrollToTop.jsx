import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // instant jump to top
    window.scrollTo(0, 0);

    // if you prefer smooth:
    // window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
}
