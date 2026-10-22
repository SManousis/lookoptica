import { useNavigate, useLocation } from "react-router-dom";
import { useCustomerAuth } from "../context/customerAuthShared";
import { useWishlist } from "../context/wishlistShared";

export default function WishlistButton({ slug, className = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useCustomerAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();

  if (!slug) return null;

  const active = isLoggedIn && isWishlisted(slug);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      navigate("/account/login", { state: { from: location.pathname } });
      return;
    }

    toggleWishlist(slug);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? "Αφαίρεση από τη λίστα επιθυμιών" : "Προσθήκη στη λίστα επιθυμιών"}
      aria-pressed={active}
      className={className}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        className={active ? "text-status-error" : "text-ink-muted"}
        width="20"
        height="20"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 20.25c-.3 0-.6-.09-.86-.27C6.6 16.86 2.75 13.6 2.75 9.5 2.75 6.84 4.84 4.75 7.5 4.75c1.54 0 2.98.73 3.9 1.94a.75.75 0 0 0 1.2 0 4.86 4.86 0 0 1 3.9-1.94c2.66 0 4.75 2.09 4.75 4.75 0 4.1-3.85 7.36-8.39 10.48-.26.18-.56.27-.86.27Z"
        />
      </svg>
    </button>
  );
}
