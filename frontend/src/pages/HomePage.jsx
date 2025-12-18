import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";


const API = import.meta.env.VITE_API_BASE || "";

const HERO_IMAGES = ["/hero1.jpg", "/hero2.jpg", "/hero3.jpg", "/hero4.jpg"]; // TODO: change to your actual files
const BRAND_ITEMS = [
  { src: "/Converse.png", alt: "Converse", brand: "Converse" },
  { src: "/Dkny.png", alt: "DKNY", brand: "DKNY" },
  { src: "/Guess.png", alt: "Guess", brand: "Guess" },
  { src: "/Hickmann.png", alt: "Hickmann", brand: "Hickmann" },
  { src: "/PaulFrank.png", alt: "Paul Frank", brand: "Paul Frank" },
  { src: "/PepeJeans.png", alt: "Pepe Jeans", brand: "Pepe Jeans" },
  { src: "/TedBaker.png", alt: "Ted Baker", brand: "Ted Baker" },
];
const BRAND_SLIDE_WIDTH = 180;
const BRAND_SLIDE_INTERVAL = 3000;
const BRAND_TRANSITION_MS = 600;

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [slideIndex, setSlideIndex] = useState(0);
  const [brandsIndex, setBrandsIndex] = useState(0);
  const [isBrandJumping, setIsBrandJumping] = useState(false);
  const swipeStart = useRef(null);

  useEffect(() => {
    fetch(`${API}/products`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setFeatured(list.slice(0, 8));
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);

  // Hero slider: change image every 5 seconds
  useEffect(() => {
    if (HERO_IMAGES.length <= 1) return;
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Brands carousel infinite slider
  useEffect(() => {
    if (BRAND_ITEMS.length <= 1) return;
    const id = setInterval(() => {
      setBrandsIndex((i) => i + 1);
    }, BRAND_SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (BRAND_ITEMS.length <= 1 || brandsIndex !== BRAND_ITEMS.length) return;
    const timeout = setTimeout(() => {
      setIsBrandJumping(true);
      setBrandsIndex(0);
      requestAnimationFrame(() => setIsBrandJumping(false));
    }, BRAND_TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [brandsIndex]);

  // Hero image
  const currentHero = HERO_IMAGES[slideIndex] || "/placeholder.png";
  const brandSlides =
    BRAND_ITEMS.length > 1 ? [...BRAND_ITEMS, ...BRAND_ITEMS] : BRAND_ITEMS;
  const brandTrackStyle = {
    transform: `translateX(-${brandsIndex * BRAND_SLIDE_WIDTH}px)`,
    transition: isBrandJumping ? "none" : `transform ${BRAND_TRANSITION_MS}ms ease`,
  };

  const getBrandHref = (item) => {
    if (item.href) return item.href;
    const basePath = item.categorySlug ? `/shop/${item.categorySlug}` : "/shop";
    const params = new URLSearchParams();
    if (item.brand) params.set("brand", item.brand);
    if (item.view) params.set("view", item.view);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
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

    if (dx < 0) {
      setSlideIndex((i) => (i + 1) % HERO_IMAGES.length);
    } else {
      setSlideIndex((i) => (i - 1 + HERO_IMAGES.length) % HERO_IMAGES.length);
    }
  };

  return (
    <div className="space-y-10 px-4 py-6 sm:px-6">
      {/* BIG HERO SLIDER */}
      <section
        className="relative -mx-4 h-[70vh] overflow-hidden rounded-2xl sm:-mx-6 sm:h-[80vh] sm:rounded-3xl md:h-[90vh]"
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        {/* Hero image */}
        <img
          src={currentHero}
          alt="Look Optica – συλλογή γυαλιών"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.png";
          }}
        />

        {/* dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20" />

        {/* text overlay (centered-ish) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="text-xs md:text-sm font-semibold text-amber-800 uppercase tracking-[0.2em]">
            Premium Eyewear
          </div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold text-white leading-tight">
            Νέες συλλογές γυαλιών
            <br />
            Ηλίου &amp; Οράσεως
          </h2>
          <p className="mt-4 max-w-xl text-sm md:text-base text-slate-100">
            Ελάτε σήμερα στο κατάστημα μας και διάλεξτε άπο μια πλούσια συλλογή γυαλιών ηλίου και οράσεως.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link
              to="/shop/sunglasses"
              className="px-5 py-2.5 rounded-full bg-amber-800 text-white text-sm font-medium hover:bg-amber-700 transition"
            >
              Γυαλιά Ηλίου
            </Link>
            <Link
              to="/shop/frames"
              className="px-5 py-2.5 rounded-full border border-white/70 text-white text-sm font-medium hover:bg-white/10 transition"
            >
              Σκελετοί Οράσεως
            </Link>
          </div>
        </div>
        {/* slider dots */}
        {HERO_IMAGES.length > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
            {HERO_IMAGES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSlideIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full border border-white/70 transition ${
                  idx === slideIndex ? "bg-white" : "bg-white/20"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* BRANDS MARQUEE */}
      {BRAND_ITEMS.length > 0 && (
        <section className="relative -mx-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm sm:-mx-6 sm:rounded-3xl sm:p-6">
          <div className="relative mt-2 overflow-hidden sm:mt-6">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent" />
            <div className="flex" style={brandTrackStyle}>
              {brandSlides.map((item, idx) => (
                <div
                  key={`${item.brand || item.alt || item.src}-${idx}`}
                  className="flex shrink-0 items-center justify-center px-4 py-2"
                  style={{ width: `${BRAND_SLIDE_WIDTH}px` }}
                >
                  <Link
                    to={getBrandHref(item)}
                    className="block rounded-xl px-2 py-1 transition hover:bg-white/70"
                    aria-label={`Browse ${item.alt || item.brand || "brand"} products`}
                  >
                    <img
                      src={item.src}
                      alt={item.alt || "Brand logo"}
                      className="h-20 w-100 object-contain opacity-80 transition hover:opacity-100"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.png";
                      }}
                    />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CATEGORY IMAGES ROW */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-8">
            {/* Γυαλιά Ηλίου */}
            <Link
            to="/shop/sunglasses"
            className="relative group rounded-2xl overflow-hidden"
            >
            <img
                src="/cat-sunglasses.png"
                alt="Γυαλιά Ηλίου"
                className="w-full h-32 md:h-40 lg:h-140 object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                e.currentTarget.src = "/placeholder.png";
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2
                                    px-4 py-2
                                    rounded-full
                                    bg-white/70 backdrop-blur-sm
                                    shadow-lg
                                    font-zen
                                    text-[24px] md:text-[28px]
                                    font-bold
                                    text-amber-700
                                    whitespace-nowrap
                                    hover:text-white
                                    hover:bg-amber-700
                                    transition">
                Γυαλιά Ηλίου
            </div>
            </Link>

            {/* Σκελετοί Οράσεως */}
            <Link
            to="/shop/frames"
            className="relative group rounded-2xl overflow-hidden"
            >
            <img
                src="/cat-frames.png"
                alt="Σκελετοί Οράσεως"
                className="w-full h-32 md:h-40 lg:h-140 object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                e.currentTarget.src = "/placeholder.png";
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2
                            px-4 py-2
                            rounded-full
                            bg-white/70 backdrop-blur-sm
                            shadow-lg
                            font-zen
                            text-[24px] md:text-[28px]
                            font-bold
                            text-amber-700
                            whitespace-nowrap 
                            hover:text-white
                            hover:bg-amber-700
                            transition">
                Σκελετοί Οράσεως
            </div>

            </Link>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-2 mt-8 gap-4 md:gap-8">     
            {/* Φακοί Επαφής */}
            <Link   
            to="/shop/contact-lenses"
            className="relative group rounded-2xl overflow-hidden"
            >
            <img
                src="/cat-contacts.png"
                alt="Φακοί Επαφής"
                className="w-full h-32 md:h-40 lg:h-140 object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                e.currentTarget.src = "/placeholder.png";
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2
                            px-4 py-2
                            rounded-full
                            bg-white/70 backdrop-blur-sm
                            shadow-lg
                            font-zen
                            text-[24px] md:text-[28px]
                            font-bold
                            text-amber-700
                            whitespace-nowrap 
                            hover:text-white
                            hover:bg-amber-700
                            transition">
                Φακοί Επαφής
            </div>
            </Link>

            {/* Άλλα προϊόντα */}
            <Link
            to="/shop/other-products"
            className="relative group rounded-2xl overflow-hidden"
            >
            <img
                src="/cat-other.png"
                alt="Άλλα προϊόντα"
                className="w-full h-32 md:h-40 lg:h-140 object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                e.currentTarget.src = "/placeholder.png";
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2
                            px-4 py-2
                            rounded-full
                            bg-white/70 backdrop-blur-sm
                            shadow-lg
                            font-zen
                            text-[24px] md:text-[28px]
                            font-bold
                            text-amber-700
                            whitespace-nowrap 
                            hover:text-white
                            hover:bg-amber-700
                            transition">
                Άλλα προϊόντα
            </div>
            </Link>
        </div>
     </section >
      {/* VARIOUS INFOS */}
      <section className="py-12 space-y-4">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-white/80 p-4 shadow-sm">
            <img src=" /Shipping.png" alt="Shipping" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
            <p className="text-sm leading-relaxed text-amber-800">Δωρεάν αποστολή για αγορές άνω των 40€ με Box Now και 80€ με Ελτα courier</p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-white/80 p-4 shadow-sm">
            <img src=" /Star.png" alt="Star" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
            <p className="text-sm leading-relaxed text-amber-800">Ολα τα προϊόντα είναι από την επίσημη αντιπροσωπεία</p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-white/80 p-4 shadow-sm">
            <img src=" /Safety.png" alt="Safety" className="w-12 h-12 md:w-14 md:h-14 object-contain" />
            <p className="text-sm leading-relaxed text-amber-800">Ασφαλείς συναλλαγές μέσω VivaWallet, PayPal και τραπεζικής κατάθεσης</p>
          </div>
        </div>
        
       </section>

      {/* FEATURED PRODUCTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-amber-700 font-semibold">Προτεινόμενα / Νέες αφίξεις</h2>
          <Link to="/shop" className="text-xs text-amber-700 hover:underline">
            Δες όλα τα προϊόντα &rarr;
          </Link>
        </div>

        {state === "loading" && (
          <div className="text-sm text-slate-500">Φόρτωση προϊόντων…</div>
        )}
        {state === "error" && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Δεν ήταν δυνατή η φόρτωση των προϊόντων.
          </div>
        )}
        {state === "ok" && featured.length === 0 && (
          <div className="text-sm text-slate-600">
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
      {/* NEWSLETTER SECTION */}
      <section className="relative -mx-4 mb-10 rounded-2xl border border-amber-100 bg-amber-50/60 py-10 shadow-sm sm:-mx-6 sm:rounded-3xl">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-zen text-3xl text-amber-800 mb-3 md:text-4xl">
            Εγγραφή στο Newsletter
          </h2>
          <p className="text-amber-700 mb-6 text-sm md:text-base">
            Μάθε πρώτος για νέες συλλογές, προσφορές και αποκλειστικά events στο Look Optica.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Ευχαριστούμε! Θα ενημερώνεστε για όλα τα νέα μας.");
            }}
            className="flex flex-col items-center justify-center gap-3 md:flex-row"
          >
            <input
              type="email"
              required
              placeholder="Το email σας…"
              className="w-full md:w-80 px-4 py-3 rounded-xl border border-amber-200
                        focus:outline-none focus:border-amber-500
                        shadow-sm text-amber-800 placeholder-amber-500"
            />

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-amber-700 hover:bg-amber-600
                        text-white font-semibold shadow-lg transition"
            >
              Εγγραφή
            </button>
          </form>
        </div>
      </section>

    </div>
  );
}
