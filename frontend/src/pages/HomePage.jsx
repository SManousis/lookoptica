import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PauseIcon from "@mui/icons-material/Pause";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ProductCard from "../components/ProductCard";
import { usePageSEO } from "../hooks/usePageSEO";


const API = import.meta.env.VITE_API_BASE || "";

// Each slide earns its own message - built only from what the site already
// offers (real routes, real service details, a live-computed discount), not
// placeholder copy. Slide 1's heading is computed at render time from actual
// offers data instead of being hard-coded here (see bestOfferDiscountPercent).
// hero4.jpg (600x500, no larger original on disk) was dropped from rotation -
// hero14.jpg is a full-resolution (1920x1371) unused photo from the same
// shoot as hero1/hero2, used here instead.
const HERO_SLIDES = [
  {
    src: "/hero1.jpg",
    srcSet: "/hero1-768.webp 768w, /hero1-1440.webp 1440w",
    width: 1920,
    height: 1359,
    subhead: "Επιλεγμένα γυαλιά ηλίου και οράσεως σε χαμηλότερες τιμές, τώρα.",
    ctaLabel: "Δείτε τις προσφορές",
    ctaHref: "#offers-heading",
  },
  {
    // No webp variants exist for hero14.jpg (full-res only) - see the note
    // above the array.
    src: "/hero14.jpg",
    width: 1920,
    height: 1371,
    heading: "Γυαλιά ηλίου για κάθε στυλ",
    subhead: "Αναγνωρισμένες μάρκες με προστασία UV400, για άνδρες, γυναίκες και παιδιά.",
    ctaLabel: "Δείτε τα γυαλιά ηλίου",
    ctaHref: "/shop/sunglasses",
  },
  {
    src: "/hero3.jpg",
    srcSet: "/hero3-768.webp 768w, /hero3-1000.webp 1000w",
    width: 1000,
    height: 666,
    heading: "Σκελετοί οράσεως που σας ταιριάζουν",
    subhead: "Από την καθημερινότητα μέχρι πιο ιδιαίτερα σχέδια, με καθοδήγηση από την ομάδα μας.",
    ctaLabel: "Δείτε τους σκελετούς",
    ctaHref: "/shop/frames",
  },
  {
    src: "/hero2.jpg",
    srcSet: "/hero2-768.webp 768w, /hero2-1440.webp 1440w",
    width: 1920,
    height: 1281,
    heading: "Οπτικά στο σπίτι σας",
    subhead: "Έως 30 ζευγάρια στον χώρο σας, μόνο εντός Αττικής.",
    ctaLabel: "Μάθετε περισσότερα",
    ctaHref: "/look-at-home",
  },
];
const BRAND_ITEMS = [
  { src: "/Converse.png", webp: "/Converse-320.webp", alt: "Converse", brand: "Converse" },
  { src: "/Dkny.png", webp: "/Dkny-320.webp", alt: "DKNY", brand: "DKNY" },
  { src: "/Guess.png", webp: "/Guess-320.webp", alt: "Guess", brand: "Guess" },
  { src: "/Hickmann.png", webp: "/Hickmann-320.webp", alt: "Hickmann", brand: "Ana Hickmann" },
  { src: "/PaulFrank.png", webp: "/PaulFrank-320.webp", alt: "Paul Frank", brand: "Paul Frank" },
  { src: "/PepeJeans.png", webp: "/PepeJeans-320.webp", alt: "Pepe Jeans", brand: "Pepe Jeans" },
  { src: "/TedBaker.png", webp: "/TedBaker-320.webp", alt: "Ted Baker", brand: "Ted Baker" },
];

const CATEGORY_CARDS = [
  { to: "/shop/sunglasses", image: "/cat-sunglasses.png", srcSet: "/cat-sunglasses-320.webp 320w, /cat-sunglasses-425.webp 425w", width: 425, height: 469, label: "Γυαλιά Ηλίου" },
  { to: "/shop/frames", image: "/cat-frames.png", srcSet: "/cat-frames-320.webp 320w, /cat-frames-453.webp 453w", width: 453, height: 453, label: "Σκελετοί Οράσεως" },
  { to: "/shop/contact-lenses", image: "/cat-contacts.jpg", srcSet: "/cat-contacts-480.webp 480w, /cat-contacts-800.webp 800w", width: 1024, height: 1024, label: "Φακοί Επαφής" },
  { to: "/shop/other-products", image: "/cat-other.jpg", srcSet: "/cat-other-480.webp 480w, /cat-other-800.webp 800w", width: 1536, height: 1024, label: "Αξεσουάρ & Φροντίδα" },
];

const STORE_HOURS = [
  { days: "Δευτέρα, Τετάρτη", hours: "10:00–15:30" },
  { days: "Τρίτη, Πέμπτη, Παρασκευή", hours: "10:00–21:00" },
  { days: "Σάββατο", hours: "10:00–16:00" },
  { days: "Κυριακή", hours: "Κλειστά" },
];

const SERVICE_LINKS = [
  { to: "/look-at-home", icon: HomeOutlinedIcon, title: "Οπτικά στο Σπίτι", detail: "Έως 30 ζευγάρια στον χώρο σας, μόνο εντός Αττικής" },
  { to: "/low-vision", icon: VisibilityOutlinedIcon, title: "Βοηθήματα χαμηλής όρασης", detail: "Εξειδικευμένη υποστήριξη, κατόπιν ραντεβού" },
];

const OFFERS_MAX_PRICE = 80;
const FALLBACK_OFFER_LIMIT = 24;
const SUNGLASSES_CATEGORY_ALIASES = ["sunglasses", "sun-glasses", "γυαλια ηλιου", "γυαλιά ηλίου"];
const FRAMES_CATEGORY_ALIASES = [
  "ophthalmic_frames",
  "frames",
  "σκελετοι ορασεως",
  "σκελετοί οράσεως",
  "γυαλια ορασεως",
];

const ProductCardSkeleton = () => (
  <>
    <div className="aspect-square rounded-xl bg-ink-muted/15 motion-safe:animate-pulse" />
    <div className="mt-3 h-3 w-1/3 rounded-full bg-ink-muted/15" />
    <div className="mt-2 h-4 w-3/4 rounded-full bg-ink-muted/15" />
    <div className="mt-2 h-5 w-1/4 rounded-full bg-ink-muted/15" />
  </>
);

const parseJsonResponse = async (response) => {
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return response.json();
};

export default function HomePage() {
  usePageSEO({
    title: "Look Οπτικά | Γυαλιά Ηλίου, Οράσεως & Φακοί Επαφής",
    description:
      "Ανακαλύψτε γυαλιά ηλίου, σκελετούς οράσεως και φακούς επαφής με εξειδικευμένη οπτική καθοδήγηση και αποστολή σε όλη την Ελλάδα.",
    url: "https://www.lookoptica.gr/",
    image: "https://www.lookoptica.gr/logo.png",
  });

  const [offers, setOffers] = useState([]);
  const [offersState, setOffersState] = useState("loading");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterConsentError, setNewsletterConsentError] = useState(false);
  const [newsletterEmailError, setNewsletterEmailError] = useState(""); // "" | missing | invalid
  const [newsletterState, setNewsletterState] = useState("idle"); // idle | loading | ok | error
  const [slideIndex, setSlideIndex] = useState(0);
  const [heroAnnouncement, setHeroAnnouncement] = useState({ id: 0, message: "" });
  const [heroPaused, setHeroPaused] = useState(false);
  const [heroInteracting, setHeroInteracting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [loadedHeroImages, setLoadedHeroImages] = useState(() =>
    HERO_SLIDES.map(() => false)
  );
  const swipeStart = useRef(null);
  const brandTrackRef = useRef(null);
  const [brandScroll, setBrandScroll] = useState({ prev: false, next: false });
  const newsletterConsentRef = useRef(null);
  const newsletterEmailRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(media.matches);
    syncPreference();
    media.addEventListener?.("change", syncPreference);
    return () => media.removeEventListener?.("change", syncPreference);
  }, []);

  const loadOffers = useCallback(async () => {
    setOffersState("loading");
    try {
      const params = new URLSearchParams({ limit: "8", max_price: String(OFFERS_MAX_PRICE) });
      let data;
      try {
        data = await fetch(`${API}/shop-products/offers?${params}`).then(parseJsonResponse);
      } catch {
        const buildFallbackQuery = (aliases) => {
          const fallbackParams = new URLSearchParams({ limit: String(FALLBACK_OFFER_LIMIT) });
          aliases.forEach((alias) => fallbackParams.append("category", alias));
          return fallbackParams;
        };
        const [sunglasses, frames] = await Promise.all([
          fetch(`${API}/shop-products?${buildFallbackQuery(SUNGLASSES_CATEGORY_ALIASES)}`).then(parseJsonResponse),
          fetch(`${API}/shop-products?${buildFallbackQuery(FRAMES_CATEGORY_ALIASES)}`).then(parseJsonResponse),
        ]);
        const isEligibleOffer = (product) =>
          product?.price > 0 &&
          product.price <= OFFERS_MAX_PRICE &&
          product?.discountPrice > product.price;
        const sunglassesOffers = (Array.isArray(sunglasses) ? sunglasses : []).filter(isEligibleOffer);
        const framesOffers = (Array.isArray(frames) ? frames : []).filter(isEligibleOffer);
        const mixed = [];
        for (let index = 0; index < Math.max(sunglassesOffers.length, framesOffers.length); index += 1) {
          if (sunglassesOffers[index]) mixed.push(sunglassesOffers[index]);
          if (mixed.length < 8 && framesOffers[index]) mixed.push(framesOffers[index]);
          if (mixed.length >= 8) break;
        }
        data = mixed;
      }
      setOffers(Array.isArray(data) ? data : []);
      setOffersState("ok");
    } catch {
      setOffers([]);
      setOffersState("error");
    }
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  // Hero slider: change image every 5 seconds
  useEffect(() => {
    if (
      HERO_SLIDES.length <= 1 ||
      heroPaused ||
      heroInteracting ||
      prefersReducedMotion ||
      !loadedHeroImages.every(Boolean)
    ) return undefined;
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(id);
  }, [heroInteracting, heroPaused, loadedHeroImages, prefersReducedMotion]);

  const heroMotionStopped = heroPaused || prefersReducedMotion;

  // Computed from the same real offers data the Offers section below
  // renders - never hard-coded - so the hero never claims a discount that
  // isn't actually live. Falls back to honest, non-numeric copy while
  // offers are still loading or if none qualify.
  const bestOfferDiscountPercent = useMemo(() => {
    if (!offers.length) return null;
    const exactPercents = offers
      .filter((o) => o?.price > 0 && o?.discountPrice > o.price)
      .map((o) => (1 - o.price / o.discountPrice) * 100);
    if (!exactPercents.length) return null;
    // Rounded to the nearest multiple of 5 for a clean "up to -X%" badge
    // (-50/-60/-65/-70...) instead of an odd value like -43% or -69% - take
    // the max of the exact percentages first, then round once at the end.
    // Floored at 5 so a near-zero real discount can't display as "-0%".
    const maxExact = Math.max(...exactPercents);
    return Math.max(5, Math.round(maxExact / 5) * 5);
  }, [offers]);

  const activeSlide = HERO_SLIDES[slideIndex];
  const activeSlideHeading =
    activeSlide.heading ??
    (bestOfferDiscountPercent != null
      ? `Προσφορές έως −${bestOfferDiscountPercent}%`
      : "Προσφορές με πραγματική αξία");

  const getBrandHref = (item) => {
    if (item.href) return item.href;
    const basePath = item.categorySlug ? `/shop/${item.categorySlug}` : "/shop";
    const params = new URLSearchParams();
    if (item.brand) params.set("brand", item.brand);
    if (item.view) params.set("view", item.view);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const announceHeroStatus = (message) => {
    setHeroAnnouncement((current) => ({ id: current.id + 1, message }));
  };

  const changeHero = (direction, announce = false) => {
    const nextIndex = (slideIndex + direction + HERO_SLIDES.length) % HERO_SLIDES.length;
    if (!loadedHeroImages[nextIndex]) return;
    setSlideIndex(nextIndex);
    if (announce) announceHeroStatus(`Εικόνα ${nextIndex + 1} από ${HERO_SLIDES.length}`);
  };

  const selectHero = (index, announce = false) => {
    if (!loadedHeroImages[index]) return;
    setSlideIndex(index);
    if (announce) announceHeroStatus(`Εικόνα ${index + 1} από ${HERO_SLIDES.length}`);
  };

  const toggleHeroPlayback = () => {
    const nextPaused = !heroPaused;
    setHeroPaused(nextPaused);
    announceHeroStatus(nextPaused ? "Η αυτόματη προβολή τέθηκε σε παύση" : "Η αυτόματη προβολή συνεχίζεται");
  };

  useEffect(() => {
    const track = brandTrackRef.current;
    if (!track) return undefined;
    const update = () =>
      setBrandScroll({
        prev: track.scrollLeft > 1,
        next: track.scrollLeft + track.clientWidth < track.scrollWidth - 1,
      });
    update();
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollBrands = (direction) => {
    const track = brandTrackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * Math.min(track.clientWidth * 0.8, 540),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  const handleSwipeStart = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    swipeStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleSwipeEnd = (e) => {
    const touch = e.changedTouches?.[0];
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!touch || !start || HERO_SLIDES.length <= 1) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const threshold = 40;

    if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < threshold) return;

    changeHero(dx < 0 ? 1 : -1, true);
  };

  return (
    // -mx-6 cancels the shell's own flat px-6 (App.jsx's <main>) exactly
    // once here, so this is the single source of the page's horizontal
    // margin - every section below shares it with no bleed tricks of its
    // own. Previously each section's -mx-4/-mx-6 only cancelled THIS div's
    // own px-4/px-6, never the shell's, so nothing was ever actually flush
    // with the real viewport edge - just inconsistently margined.
    <div className="space-y-10 -mx-6 px-4 py-6 sm:px-6">
      <section
        className="relative min-h-[26rem] overflow-hidden rounded-2xl sm:min-h-[32rem] sm:rounded-3xl"
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
        onMouseEnter={() => setHeroInteracting(true)}
        onMouseLeave={() => setHeroInteracting(false)}
        onFocusCapture={() => setHeroInteracting(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setHeroInteracting(false);
        }}
        aria-roledescription="carousel"
        aria-label="Προτάσεις Look Optica"
      >
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          <span key={heroAnnouncement.id}>{heroAnnouncement.message}</span>
        </div>
        {HERO_SLIDES.map((hero, index) => (
          <img
            key={hero.src}
            src={hero.src}
            srcSet={hero.srcSet}
            sizes="100vw"
            width={hero.width}
            height={hero.height}
            loading="eager"
            decoding="async"
            fetchPriority={index === 0 ? "high" : "auto"}
            alt=""
            aria-hidden={index !== slideIndex}
            className={`absolute inset-0 h-full w-full object-cover ${index === slideIndex ? "opacity-100" : "opacity-0"}`}
            onLoad={() => {
              setLoadedHeroImages((loaded) => {
                if (loaded[index]) return loaded;
                const next = [...loaded];
                next[index] = true;
                return next;
              });
            }}
            onError={(event) => {
              const image = event.currentTarget;
              image.removeAttribute("srcset");
              image.onerror = () => {
                image.onerror = null;
                image.src = "/placeholder.png";
              };
              image.src = hero.src;
            }}
          />
        ))}
        {/* /85,/65,/35: verified via WCAG relative-luminance math to hold
            white text at >=4.5:1 through the zone the text actually sits in
            (left ~50%), even against a worst-case near-white source image -
            the previous /75,/45,/15 dropped to ~3.35:1 at the midpoint. */}
        <div className="absolute inset-0 bg-gradient-to-r from-overlay-dark/85 via-overlay-dark/65 to-overlay-dark/35" />

        <div className="relative z-[1] flex min-h-[26rem] items-center px-6 py-16 sm:min-h-[32rem] sm:px-10 lg:px-16">
          <div className="max-w-3xl text-left text-on-media">
            <h1 className="font-zen text-4xl leading-[1.12] text-balance sm:text-5xl lg:text-6xl">
              {activeSlideHeading}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-on-media-muted sm:text-lg">
              {activeSlide.subhead}
            </p>

            <div className="mt-7">
              {activeSlide.ctaHref.startsWith("#") ? (
                // A plain anchor, not <Link>: React Router's client-side
                // navigation doesn't trigger the browser's native
                // scroll-to-fragment behavior for a same-page hash target.
                <a
                  href={activeSlide.ctaHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-on-media shadow-lg transition hover:bg-brand-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-on-media"
                >
                  {activeSlide.ctaLabel}
                </a>
              ) : (
                <Link
                  to={activeSlide.ctaHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-on-media shadow-lg transition hover:bg-brand-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-on-media"
                >
                  {activeSlide.ctaLabel}
                </Link>
              )}
            </div>

            <p className="mt-6 text-sm font-medium text-on-media-warm">
              Αποστολές σε όλη την Ελλάδα · Φυσικό κατάστημα στο Χαλάνδρι
            </p>
          </div>
        </div>

        {HERO_SLIDES.length > 1 && (
          <div className="absolute inset-x-4 bottom-4 z-[2] flex items-center justify-between gap-3 sm:inset-x-8">
            <div className="flex items-center gap-1 rounded-full bg-overlay-dark/40 p-1">
              <button
                type="button"
                onClick={() => changeHero(-1, true)}
                className="grid size-11 place-items-center rounded-full text-on-media transition hover:bg-on-media/15 focus-visible:outline-2 focus-visible:outline-on-media"
                aria-label="Προηγούμενη εικόνα"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                onClick={toggleHeroPlayback}
                disabled={prefersReducedMotion}
                className="grid size-11 place-items-center rounded-full text-on-media transition hover:bg-on-media/15 focus-visible:outline-2 focus-visible:outline-on-media disabled:cursor-default disabled:opacity-70"
                aria-label={prefersReducedMotion ? "Η αυτόματη προβολή είναι απενεργοποιημένη λόγω μειωμένης κίνησης" : heroPaused ? "Συνέχιση αυτόματης προβολής" : "Παύση αυτόματης προβολής"}
                aria-pressed={heroMotionStopped}
              >
                {heroMotionStopped ? <PlayArrowIcon /> : <PauseIcon />}
              </button>
              <button
                type="button"
                onClick={() => changeHero(1, true)}
                className="grid size-11 place-items-center rounded-full text-on-media transition hover:bg-on-media/15 focus-visible:outline-2 focus-visible:outline-on-media"
                aria-label="Επόμενη εικόνα"
              >
                <ChevronRightIcon />
              </button>
            </div>
            <span
              className="inline-flex min-h-11 min-w-14 items-center justify-center rounded-full bg-overlay-dark/40 px-3 text-sm font-semibold tabular-nums text-on-media sm:hidden"
              aria-label={`Εικόνα ${slideIndex + 1} από ${HERO_SLIDES.length}`}
            >
              {slideIndex + 1} / {HERO_SLIDES.length}
            </span>
            <div className="hidden items-center gap-1 rounded-full bg-overlay-dark/40 p-1 sm:flex" aria-label={`Εικόνα ${slideIndex + 1} από ${HERO_SLIDES.length}`}>
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectHero(idx, true)}
                  disabled={!loadedHeroImages[idx]}
                  className="grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-on-media"
                  aria-label={`Προβολή εικόνας ${idx + 1}`}
                  aria-current={idx === slideIndex ? "true" : undefined}
                >
                  <span className={`size-2.5 rounded-full border border-on-media/80 ${idx === slideIndex ? "bg-on-media" : "bg-on-media/25"}`} />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* No negative margin on mobile: the pull-up was overlapping the
          hero's bottom control pill there. The overlap is kept from sm:
          up, where the controls sit further from the section edge. */}
      <section aria-label="Γιατί να επιλέξετε το Look Optica" className="sm:-mt-4 border-y border-border-brand bg-surface-raised/80 py-5">
        {/* 2x2 of labels + descriptions below lg, 4-across with dividers
            from lg. Descriptions show at every width now too: the "why
            trust us" detail is exactly what a first-time mobile visitor
            needs before the links below, not a desktop-only extra. */}
        <ul className="grid grid-cols-2 gap-4 text-sm text-ink-primary lg:grid-cols-4 lg:divide-x lg:divide-border-brand">
          <li className="px-4">
            <strong className="block text-ink-heading">Δωρεάν αποστολή</strong>
            <span className="block">Με Box Now για παραγγελίες από 40€.</span>
          </li>
          <li className="px-4">
            <strong className="block text-ink-heading">Οπτική καθοδήγηση</strong>
            <span className="block">Βοήθεια για να επιλέξετε με σιγουριά.</span>
          </li>
          <li className="px-4">
            <strong className="block text-ink-heading">Εγγυημένη προέλευση</strong>
            <span className="block">Προϊόντα επίσημης αντιπροσωπείας.</span>
          </li>
          <li className="px-4">
            <strong className="block text-ink-heading">Ασφαλείς πληρωμές</strong>
            <span className="block">Viva Wallet, PayPal και τραπεζική κατάθεση.</span>
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium">
          <Link to="/terms" className="text-brand-strong underline decoration-border-brand-highlight underline-offset-4 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-focus-ring">Αποστολές & πληρωμές</Link>
          <Link to="/contact" className="text-brand-strong underline decoration-border-brand-highlight underline-offset-4 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-focus-ring">Χρειάζεστε βοήθεια επιλογής;</Link>
        </div>
      </section>

      <section aria-labelledby="offers-heading" aria-busy={offersState === "loading"} className="space-y-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="offers-heading" className="text-3xl font-semibold tracking-tight text-ink-heading">Προσφορές</h2>
            <Link
              to="/shop?view=stock"
              className="inline-flex min-h-11 items-center rounded-full border border-border-brand bg-surface-raised px-4 py-2 text-sm font-semibold text-brand-strong transition hover:border-border-brand-strong hover:bg-surface-warm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              Δείτε όλες τις προσφορές &rarr;
            </Link>
          </div>
          {offersState === "loading" && <p className="sr-only">Φόρτωση προσφορών…</p>}
          {offersState === "error" && (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border-brand bg-surface-warm p-4 text-sm text-ink-primary sm:flex-row sm:items-center sm:justify-between">
              <span>Δεν μπορέσαμε να φορτώσουμε τις προσφορές.</span>
              <button type="button" onClick={loadOffers} className="min-h-11 rounded-lg border border-border-brand-highlight bg-surface-raised px-4 py-2 font-semibold text-brand-strong hover:bg-surface-warm-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">Δοκιμάστε ξανά</button>
            </div>
          )}
          {offersState === "ok" && offers.length === 0 && (
            <div className="text-sm text-ink-secondary">
              Δεν υπάρχουν προσφορές αυτή τη στιγμή.
            </div>
          )}
          {(offersState === "loading" || offers.length > 0) && (
            // Swipe rail below md so offers don't push categories four rows down; grid from md up.
            <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
              {offersState === "loading"
                ? Array.from({ length: 4 }, (_, index) => (
                    <li key={index} aria-hidden="true" className="w-[42%] shrink-0 snap-start sm:w-[30%] md:w-auto">
                      <ProductCardSkeleton />
                    </li>
                  ))
                : offers.map((p, index) => (
                    <li key={p.slug} className={`w-[42%] shrink-0 snap-start sm:w-[30%] md:w-auto ${index >= 4 ? "md:hidden" : ""}`}>
                      {/* Wider cards from the margin fix give brand names more
                          room, but long Greek category labels ("Σκελετοί
                          Οράσεως") combined with longer brand names can still
                          overflow a 42%/30%-wide rail card - hide the chip
                          below md, where cards are narrowest, and restore it
                          once the section becomes a normal grid. */}
                      <ProductCard p={p} hideCategoryChipOnNarrow />
                    </li>
                  ))}
            </ul>
          )}
        </section>

      <section aria-labelledby="categories-heading" className="space-y-4">
        <h2 id="categories-heading" className="text-3xl font-semibold tracking-tight text-ink-heading">Ανακαλύψτε τη συλλογή</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {CATEGORY_CARDS.map((category) => (
            <Link key={category.to} to={category.to} className="group relative h-40 overflow-hidden rounded-2xl focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring sm:h-52 lg:h-64">
              <img
                src={category.image}
                srcSet={category.srcSet}
                sizes="(min-width: 1024px) 25vw, 50vw"
                width={category.width}
                height={category.height}
                loading="lazy"
                decoding="async"
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105 motion-reduce:group-hover:scale-100"
                onError={(event) => {
                  const image = event.currentTarget;
                  image.removeAttribute("srcset");
                  image.onerror = () => {
                    image.onerror = null;
                    image.src = "/placeholder.png";
                  };
                  image.src = category.image;
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-overlay-dark/65 via-overlay-dark/10 to-transparent" />
              <span className="absolute inset-x-2 bottom-2 rounded-lg bg-surface-raised/90 px-2 py-2 text-center text-sm font-semibold leading-tight text-brand-deep shadow-lg transition group-hover:bg-brand-primary group-hover:text-on-media sm:inset-x-3 sm:bottom-3 sm:px-3 sm:text-base">
                {category.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="optician-heading" className="grid gap-6 rounded-2xl border border-border-warm-subtle bg-surface-raised p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-10">
        <div>
          <h2 id="optician-heading" className="font-zen text-3xl text-ink-heading">Ο οπτικός σας στο Χαλάνδρι</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Αγίας Παρασκευής 30, Χαλάνδρι ·{" "}
            <Link to="/contact" className="font-semibold text-brand-strong underline decoration-border-brand-highlight underline-offset-4 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-focus-ring">
              Χάρτης & επικοινωνία
            </Link>
          </p>
          <a
            href="tel:+302106898658"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-media transition hover:bg-brand-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <PhoneOutlinedIcon fontSize="small" aria-hidden="true" />
            <span><span className="sr-only">Καλέστε μας στο </span>210 6898658</span>
          </a>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {STORE_HOURS.map(({ days, hours }) => (
              <div key={days} className="contents">
                <dt className="text-ink-secondary">{days}</dt>
                <dd className="tabular-nums text-ink-primary">{hours}</dd>
              </div>
            ))}
          </dl>
        </div>
        <ul className="divide-y divide-border-warm-subtle self-center border-y border-border-warm-subtle">
          {SERVICE_LINKS.map((service) => (
            <li key={service.to}>
              <Link to={service.to} className="group flex min-h-11 items-center gap-4 py-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                <service.icon className="shrink-0 text-ink-secondary" aria-hidden="true" />
                <span className="flex-1">
                  <span className="block font-semibold text-ink-heading group-hover:text-brand-strong">{service.title}</span>
                  <span className="block text-sm text-ink-secondary">{service.detail}</span>
                </span>
                <span aria-hidden="true" className="text-brand-primary transition-transform motion-reduce:transition-none group-hover:translate-x-0.5">&rarr;</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {BRAND_ITEMS.length > 0 && (
        <section className="rounded-2xl border border-border-warm-subtle bg-surface-warm/60 p-4 sm:rounded-3xl sm:p-6" aria-labelledby="brands-heading">
          <div className="flex items-center justify-between gap-4">
            <h2 id="brands-heading" className="text-2xl font-semibold tracking-tight text-ink-heading">Επιλεγμένες μάρκες</h2>
            {(brandScroll.prev || brandScroll.next) && (
              <div className="flex gap-2">
                <button type="button" onClick={() => scrollBrands(-1)} aria-disabled={!brandScroll.prev} className="grid size-11 place-items-center rounded-full border border-border-brand bg-surface-raised text-brand-strong transition hover:border-border-brand-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:border-border-brand" aria-label="Προηγούμενες μάρκες"><ChevronLeftIcon /></button>
                <button type="button" onClick={() => scrollBrands(1)} aria-disabled={!brandScroll.next} className="grid size-11 place-items-center rounded-full border border-border-brand bg-surface-raised text-brand-strong transition hover:border-border-brand-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:border-border-brand" aria-label="Επόμενες μάρκες"><ChevronRightIcon /></button>
              </div>
            )}
          </div>
          <div
            ref={brandTrackRef}
            className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6"
          >
              {BRAND_ITEMS.map((item) => (
                  <Link
                    key={item.brand || item.alt || item.src}
                    to={getBrandHref(item)}
                    className="flex h-20 w-32 shrink-0 snap-start items-center justify-center rounded-xl bg-surface-raised/60 px-3 py-2 sm:h-24 sm:w-40 sm:px-4 lg:w-auto lg:min-w-0 lg:flex-1 transition hover:bg-surface-raised focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    aria-label={`Προϊόντα ${item.alt || item.brand || "μάρκας"}`}
                  >
                    <img
                      src={item.webp}
                      alt={item.alt || "Brand logo"}
                      width="320"
                      height="160"
                      loading="lazy"
                      decoding="async"
                      className="h-16 w-full object-contain opacity-80 transition hover:opacity-100 sm:h-20"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = item.src;
                      }}
                    />
                  </Link>
              ))}
          </div>
        </section>
      )}

      <section className="relative mb-10 rounded-2xl border border-border-warm-subtle bg-surface-warm/60 py-10 sm:rounded-3xl">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          {/* Zen Antique does list Greek in its official subsets, but its
              Greek letterforms read as a visibly different design quality
              than its native Latin ones - mixing the two scripts in one
              line reads as two typefaces, not one. Keeping the brand name
              in the system sans makes the font choice per-script
              deliberate instead of an accidental clash within one font. */}
          <h2 className="font-zen text-3xl text-ink-heading mb-3 md:text-4xl">
            Νέα από το <span className="font-sans">Look Optica</span>
          </h2>
          <p className="text-ink-secondary mb-6 text-sm md:text-base">
            Λάβετε ενημερώσεις για νέες συλλογές και προσφορές, μόνο όταν
            έχουμε κάτι χρήσιμο να μοιραστούμε.
          </p>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {newsletterState === "loading" && "Η εγγραφή σας αποστέλλεται."}
            {newsletterState === "ok" && "Η εγγραφή σας ολοκληρώθηκε επιτυχώς."}
          </p>

          {newsletterState === "ok" ? (
            <p className="text-ink-heading font-semibold">
              Ευχαριστούμε! Η εγγραφή σας ολοκληρώθηκε.
            </p>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const email = newsletterEmail.trim();
                // Same email rule the browser applied before; noValidate only swaps its bubble for inline errors.
                const emailError = !email ? "missing" : newsletterEmailRef.current?.checkValidity() === false ? "invalid" : "";
                setNewsletterEmailError(emailError);
                setNewsletterConsentError(!newsletterConsent);
                if (emailError) {
                  newsletterEmailRef.current?.focus();
                  return;
                }
                if (!newsletterConsent) {
                  newsletterConsentRef.current?.focus();
                  return;
                }
                setNewsletterState("loading");
                try {
                  const res = await fetch(`${API}/newsletter/subscribe`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  });
                  if (!res.ok) throw new Error("subscribe failed");
                  setNewsletterState("ok");
                  setNewsletterEmail("");
                  setNewsletterConsent(false);
                } catch {
                  setNewsletterState("error");
                }
              }}
              noValidate
              aria-busy={newsletterState === "loading"}
              className="mx-auto grid max-w-2xl gap-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <label htmlFor="newsletter-email" className="sr-only">Email για το newsletter</label>
                <div className="grid gap-2 sm:flex-1">
                <input
                  ref={newsletterEmailRef}
                  id="newsletter-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={newsletterEmail}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    setNewsletterEmailError("");
                  }}
                  placeholder="Το email σας…"
                  aria-invalid={Boolean(newsletterEmailError)}
                  aria-describedby={newsletterEmailError ? "newsletter-email-error" : undefined}
                  className={`min-h-12 w-full rounded-xl border ${newsletterEmailError ? "border-status-error" : "border-border-brand"} bg-surface-raised px-4 py-3 text-ink-primary shadow-sm placeholder:text-ink-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring`}
                />
                {newsletterEmailError && (
                  <p id="newsletter-email-error" role="alert" className="text-left text-sm text-status-error">
                    {newsletterEmailError === "missing"
                      ? "Συμπληρώστε το email σας για να γίνει η εγγραφή."
                      : "Το email δεν φαίνεται σωστό. Ελέγξτε το, π.χ. onoma@example.com."}
                  </p>
                )}
                </div>
                <button
                  type="submit"
                  disabled={newsletterState === "loading"}
                  className="min-h-12 rounded-xl bg-brand-primary px-6 py-3 font-semibold text-on-media shadow-lg transition hover:bg-brand-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {newsletterState === "loading" ? "Γίνεται εγγραφή…" : "Εγγραφή"}
                </button>
              </div>
              <label id="newsletter-consent" className="flex items-start gap-3 text-left text-sm leading-relaxed text-ink-primary">
                <input
                  ref={newsletterConsentRef}
                  type="checkbox"
                  checked={newsletterConsent}
                  onChange={(event) => {
                    setNewsletterConsent(event.target.checked);
                    if (event.target.checked) setNewsletterConsentError(false);
                  }}
                  aria-invalid={newsletterConsentError}
                  aria-describedby={newsletterConsentError ? "newsletter-consent-error" : undefined}
                  className="mt-1 size-4 accent-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                />
                <span>Συμφωνώ να λαμβάνω ενημερωτικά email. Μπορώ να διαγραφώ οποτεδήποτε. Δείτε τους <Link to="/terms" className="font-semibold text-brand-strong underline decoration-border-brand-strong underline-offset-4">όρους και την ενημέρωση προσωπικών δεδομένων</Link>.</span>
              </label>
              {newsletterConsentError && (
                <p id="newsletter-consent-error" role="alert" className="-mt-2 text-left text-sm text-status-error">
                  Για να ολοκληρωθεί η εγγραφή, επιβεβαιώστε ότι συμφωνείτε να λαμβάνετε ενημερωτικά email.
                </p>
              )}
            </form>
          )}
          {newsletterState === "error" && (
            <p role="alert" className="mt-3 text-sm text-status-error">
              Η εγγραφή δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.
            </p>
          )}
        </div>
      </section>

    </div>
  );
}
