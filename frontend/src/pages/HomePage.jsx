import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ProductCard from "../components/ProductCard";
import { usePageSEO } from "../hooks/usePageSEO";


const API = import.meta.env.VITE_API_BASE || "";

const HERO_IMAGES = [
  { src: "/hero1.jpg", srcSet: "/hero1-768.webp 768w, /hero1-1440.webp 1440w", width: 1920, height: 1359 },
  { src: "/hero2.jpg", width: 1920, height: 1281 },
  { src: "/hero3.jpg", srcSet: "/hero3-768.webp 768w, /hero3-1000.webp 1000w", width: 1000, height: 666 },
  { src: "/hero4.jpg", width: 600, height: 500 },
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

  const [featured, setFeatured] = useState([]);
  const [offers, setOffers] = useState([]);
  const [offersState, setOffersState] = useState("loading");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterState, setNewsletterState] = useState("idle"); // idle | loading | ok | error
  const [state, setState] = useState("loading"); // loading | ok | error
  const [slideIndex, setSlideIndex] = useState(0);
  const [heroAnnouncement, setHeroAnnouncement] = useState({ id: 0, message: "" });
  const [heroPaused, setHeroPaused] = useState(false);
  const [heroInteracting, setHeroInteracting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [loadedHeroImages, setLoadedHeroImages] = useState(() =>
    HERO_IMAGES.map(() => false)
  );
  const swipeStart = useRef(null);
  const brandTrackRef = useRef(null);

  const loadFeatured = useCallback(() => {
    setState("loading");
    fetch(`${API}/shop-products/featured?limit=8`)
      .then(parseJsonResponse)
      .catch(() => fetch(`${API}/products?limit=8`).then(parseJsonResponse))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setFeatured(list.slice(0, 8));
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    loadFeatured();
  }, [loadFeatured]);

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
      HERO_IMAGES.length <= 1 ||
      heroPaused ||
      heroInteracting ||
      prefersReducedMotion ||
      !loadedHeroImages.every(Boolean)
    ) return undefined;
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(id);
  }, [heroInteracting, heroPaused, loadedHeroImages, prefersReducedMotion]);

  const heroMotionStopped = heroPaused || prefersReducedMotion;

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
    const nextIndex = (slideIndex + direction + HERO_IMAGES.length) % HERO_IMAGES.length;
    if (!loadedHeroImages[nextIndex]) return;
    setSlideIndex(nextIndex);
    if (announce) announceHeroStatus(`Εικόνα ${nextIndex + 1} από ${HERO_IMAGES.length}`);
  };

  const selectHero = (index, announce = false) => {
    if (!loadedHeroImages[index]) return;
    setSlideIndex(index);
    if (announce) announceHeroStatus(`Εικόνα ${index + 1} από ${HERO_IMAGES.length}`);
  };

  const toggleHeroPlayback = () => {
    const nextPaused = !heroPaused;
    setHeroPaused(nextPaused);
    announceHeroStatus(nextPaused ? "Η αυτόματη προβολή τέθηκε σε παύση" : "Η αυτόματη προβολή συνεχίζεται");
  };

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
    if (!touch || !start || HERO_IMAGES.length <= 1) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const threshold = 40;

    if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < threshold) return;

    changeHero(dx < 0 ? 1 : -1, true);
  };

  return (
    <div className="space-y-10 px-4 py-6 sm:px-6">
      <section
        className="relative -mx-4 min-h-[32rem] overflow-hidden rounded-2xl sm:-mx-6 sm:min-h-[36rem] sm:rounded-3xl lg:min-h-[42rem]"
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
        {HERO_IMAGES.map((hero, index) => (
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
        <div className="absolute inset-0 bg-gradient-to-r from-overlay-dark/75 via-overlay-dark/45 to-overlay-dark/15" />

        <div className="relative z-[1] flex min-h-[32rem] items-center px-6 py-16 sm:min-h-[36rem] sm:px-10 lg:min-h-[42rem] lg:px-16">
          <div className="max-w-3xl text-left text-on-media">
            <h1 className="font-zen text-4xl leading-[1.12] text-balance sm:text-5xl lg:text-6xl">
              Γυαλιά που ταιριάζουν σε εσάς και στην τιμή που θέλετε
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-on-media-muted sm:text-lg">
              Αγοράστε online από όλη την Ελλάδα, με προσεγμένες επιλογές και
              εξειδικευμένη οπτική καθοδήγηση όταν τη χρειάζεστε.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/shop"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-on-media shadow-lg transition hover:bg-brand-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-on-media"
              >
                Αγορά online
              </Link>
              <Link
                to="/contact"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-on-media/80 bg-overlay-dark/15 px-6 py-3 text-sm font-semibold text-on-media transition hover:bg-surface-raised hover:text-brand-deep focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-on-media"
              >
                Μιλήστε με ειδικό
              </Link>
            </div>

            <p className="mt-6 text-sm font-medium text-on-media-warm">
              Αποστολές σε όλη την Ελλάδα · Φυσικό κατάστημα στο Χαλάνδρι
            </p>
          </div>
        </div>

        {HERO_IMAGES.length > 1 && (
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
              aria-label={`Εικόνα ${slideIndex + 1} από ${HERO_IMAGES.length}`}
            >
              {slideIndex + 1} / {HERO_IMAGES.length}
            </span>
            <div className="hidden items-center gap-1 rounded-full bg-overlay-dark/40 p-1 sm:flex" aria-label={`Εικόνα ${slideIndex + 1} από ${HERO_IMAGES.length}`}>
              {HERO_IMAGES.map((_, idx) => (
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

      <section aria-label="Γιατί να επιλέξετε το Look Optica" className="-mt-4 border-y border-border-brand bg-surface-raised/80 py-5">
        <ul className="grid gap-4 text-sm text-ink-primary sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border-brand">
          <li className="px-4"><strong className="block text-brand-strong">Πανελλαδική εξυπηρέτηση</strong> Αποστολές σε όλη την Ελλάδα.</li>
          <li className="px-4"><strong className="block text-brand-strong">Οπτική καθοδήγηση</strong> Βοήθεια για να επιλέξετε με σιγουριά.</li>
          <li className="px-4"><strong className="block text-brand-strong">Εγγυημένη προέλευση</strong> Προϊόντα επίσημης αντιπροσωπείας.</li>
          <li className="px-4"><strong className="block text-brand-strong">Ασφαλείς πληρωμές</strong> Viva Wallet, PayPal και τραπεζική κατάθεση.</li>
        </ul>
        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium">
          <Link to="/terms" className="text-brand-strong underline decoration-border-brand-highlight underline-offset-4 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-focus-ring">Αποστολές & πληρωμές</Link>
          <Link to="/contact" className="text-brand-strong underline decoration-border-brand-highlight underline-offset-4 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-focus-ring">Χρειάζεστε βοήθεια επιλογής;</Link>
        </div>
      </section>

      {BRAND_ITEMS.length > 0 && (
        <section className="-mx-4 rounded-2xl border border-border-warm-subtle bg-surface-warm/60 p-4 shadow-sm sm:-mx-6 sm:rounded-3xl sm:p-6" aria-labelledby="brands-heading">
          <div className="flex items-center justify-between gap-4">
            <h2 id="brands-heading" className="font-zen text-2xl text-brand-deep">Επιλεγμένες μάρκες</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => scrollBrands(-1)} className="grid size-11 place-items-center rounded-full border border-border-brand bg-surface-raised text-brand-strong hover:border-border-brand-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" aria-label="Προηγούμενες μάρκες"><ChevronLeftIcon /></button>
              <button type="button" onClick={() => scrollBrands(1)} className="grid size-11 place-items-center rounded-full border border-border-brand bg-surface-raised text-brand-strong hover:border-border-brand-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" aria-label="Επόμενες μάρκες"><ChevronRightIcon /></button>
            </div>
          </div>
          <div
            ref={brandTrackRef}
            className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6"
          >
              {BRAND_ITEMS.map((item) => (
                  <Link
                    key={item.brand || item.alt || item.src}
                    to={getBrandHref(item)}
                    className="flex h-24 w-40 shrink-0 snap-start items-center justify-center rounded-xl bg-surface-raised/60 px-4 py-2 transition hover:bg-surface-raised focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    aria-label={`Προϊόντα ${item.alt || item.brand || "μάρκας"}`}
                  >
                    <img
                      src={item.webp}
                      alt={item.alt || "Brand logo"}
                      width="320"
                      height="160"
                      loading="lazy"
                      decoding="async"
                      className="h-20 w-full object-contain opacity-80 transition hover:opacity-100"
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

      <section aria-labelledby="categories-heading" className="space-y-5">
        <h2 id="categories-heading" className="font-zen text-3xl text-brand-deep">Ανακαλύψτε τη συλλογή</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-8">
          {CATEGORY_CARDS.map((category) => (
            <Link key={category.to} to={category.to} className="group relative min-h-56 overflow-hidden rounded-2xl focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring sm:min-h-64 lg:min-h-[28rem]">
              <img
                src={category.image}
                srcSet={category.srcSet}
                sizes="(min-width: 640px) 50vw, 100vw"
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
              <span className="absolute inset-x-4 bottom-4 rounded-xl bg-surface-raised/90 px-4 py-3 text-center font-zen text-xl leading-tight text-brand-deep shadow-lg transition group-hover:bg-brand-primary group-hover:text-on-media sm:text-2xl">
                {category.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {(offers.length > 0 || offersState === "error") && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-zen text-3xl text-brand-deep">Προσφορές</h2>
          </div>
          {offersState === "error" ? (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border-brand bg-surface-warm p-4 text-sm text-brand-deep sm:flex-row sm:items-center sm:justify-between">
              <span>Δεν μπορέσαμε να φορτώσουμε τις προσφορές.</span>
              <button type="button" onClick={loadOffers} className="min-h-11 rounded-lg border border-border-brand-highlight bg-surface-raised px-4 py-2 font-semibold hover:bg-surface-warm-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">Δοκιμάστε ξανά</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {offers.map((p) => <ProductCard key={p.slug} p={p} />)}
            </div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-zen text-3xl text-brand-deep">Εξειδικευμένη φροντίδα</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/low-vision"
            className="group rounded-2xl border border-border-warm-subtle bg-surface-raised/80 p-6 shadow-sm transition hover:border-border-brand-highlight hover:shadow-md focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
          >
            <VisibilityOutlinedIcon className="mb-3 text-brand-primary" fontSize="large" aria-hidden="true" />
            <h3 className="font-zen text-xl text-brand-strong mb-2">
              Βοηθήματα Χαμηλής Όρασης
            </h3>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Εξειδικευμένες υπηρεσίες και βοηθήματα χαμηλής όρασης, κατόπιν
              ραντεβού, με χρόνια εμπειρία στον τομέα.
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-brand-primary group-hover:underline">
              Μάθε περισσότερα &rarr;
            </span>
          </Link>

          <Link
            to="/look-at-home"
            className="group rounded-2xl border border-border-warm-subtle bg-surface-raised/80 p-6 shadow-sm transition hover:border-border-brand-highlight hover:shadow-md focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
          >
            <HomeOutlinedIcon className="mb-3 text-brand-primary" fontSize="large" aria-hidden="true" />
            <h3 className="font-zen text-xl text-brand-strong mb-2">
              Οπτικά στο Σπίτι
            </h3>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Επιλέξτε γυαλιά στον χώρο σας με προσωπική εξυπηρέτηση. Η
              υπηρεσία διατίθεται αποκλειστικά εντός Αττικής.
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-brand-primary group-hover:underline">
              Μάθε περισσότερα &rarr;
            </span>
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-zen text-3xl text-brand-deep">Επιλογές από τη συλλογή μας</h2>
          <Link
            to="/shop"
            className="inline-flex min-h-11 items-center rounded-full border border-border-brand bg-surface-raised px-4 py-2 text-sm font-semibold text-brand-strong transition hover:border-border-brand-strong hover:bg-surface-warm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            Δες όλα τα προϊόντα &rarr;
          </Link>
        </div>

        {state === "loading" && (
          <div className="text-sm text-ink-muted">Φόρτωση προϊόντων…</div>
        )}
        {state === "error" && (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border-brand bg-surface-warm p-4 text-sm text-brand-deep sm:flex-row sm:items-center sm:justify-between">
            <span>Δεν μπορέσαμε να φορτώσουμε τα προϊόντα.</span>
            <button type="button" onClick={loadFeatured} className="min-h-11 rounded-lg border border-border-brand-highlight bg-surface-raised px-4 py-2 font-semibold hover:bg-surface-warm-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">Δοκιμάστε ξανά</button>
          </div>
        )}
        {state === "ok" && featured.length === 0 && (
          <div className="text-sm text-ink-secondary">
            Δεν υπάρχουν ακόμη προϊόντα για προβολή.
          </div>
        )}
        {state === "ok" && featured.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        )}
      </section>
      <section className="relative -mx-4 mb-10 rounded-2xl border border-border-warm-subtle bg-surface-warm/60 py-10 shadow-sm sm:-mx-6 sm:rounded-3xl">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-zen text-3xl text-brand-strong mb-3 md:text-4xl">
            Νέα από το Look Optica
          </h2>
          <p className="text-brand-primary mb-6 text-sm md:text-base">
            Λάβετε ενημερώσεις για νέες συλλογές και προσφορές, μόνο όταν
            έχουμε κάτι χρήσιμο να μοιραστούμε.
          </p>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {newsletterState === "loading" && "Η εγγραφή σας αποστέλλεται."}
            {newsletterState === "ok" && "Η εγγραφή σας ολοκληρώθηκε επιτυχώς."}
          </p>

          {newsletterState === "ok" ? (
            <p className="text-brand-strong font-semibold">
              Ευχαριστούμε! Η εγγραφή σας ολοκληρώθηκε.
            </p>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const email = newsletterEmail.trim();
                if (!email) return;
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
              aria-busy={newsletterState === "loading"}
              className="mx-auto grid max-w-2xl gap-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="newsletter-email" className="sr-only">Email για το newsletter</label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Το email σας…"
                  aria-describedby="newsletter-consent"
                  className="min-h-12 w-full rounded-xl border border-border-brand bg-surface-raised px-4 py-3 text-brand-deep shadow-sm placeholder:text-brand-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:flex-1"
                />
                <button
                  type="submit"
                  disabled={newsletterState === "loading" || !newsletterConsent}
                  className="min-h-12 rounded-xl bg-brand-primary px-6 py-3 font-semibold text-on-media shadow-lg transition hover:bg-brand-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {newsletterState === "loading" ? "Γίνεται εγγραφή…" : "Εγγραφή"}
                </button>
              </div>
              <label id="newsletter-consent" className="flex items-start gap-3 text-left text-sm leading-relaxed text-brand-deep">
                <input type="checkbox" required checked={newsletterConsent} onChange={(event) => setNewsletterConsent(event.target.checked)} className="mt-1 size-4 accent-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" />
                <span>Συμφωνώ να λαμβάνω ενημερωτικά email. Μπορώ να διαγραφώ οποτεδήποτε. Δείτε τους <Link to="/terms" className="font-semibold underline decoration-border-brand-strong underline-offset-4">όρους και την ενημέρωση προσωπικών δεδομένων</Link>.</span>
              </label>
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
