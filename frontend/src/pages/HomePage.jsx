import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";


const API = import.meta.env.VITE_API_BASE || "";

const HERO_IMAGES = ["/hero1.jpg", "/hero2.jpg", "/hero3.jpg", "/hero4.jpg"]; // 👈 change to your actual files
const BRANDS_IMAGES = ["/Converse.png", "/Dkny.png", "/Guess.png", "/Hickmann.png", "/PaulFrank.png", "/PepeJeans.png", "/TedBaker.png"]; 
const BRAND_SLIDE_WIDTH = 180;
const BRAND_SLIDE_INTERVAL = 3000;
const BRAND_TRANSITION_MS = 600;

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [slideIndex, setSlideIndex] = useState(0);
  const [brandsIndex, setBrandsIndex] = useState(0);
  const [isBrandJumping, setIsBrandJumping] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/products`)
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
    if (BRANDS_IMAGES.length <= 1) return;
    const id = setInterval(() => {
      setBrandsIndex((i) => i + 1);
    }, BRAND_SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (BRANDS_IMAGES.length <= 1 || brandsIndex !== BRANDS_IMAGES.length) return;
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
    BRANDS_IMAGES.length > 1 ? [...BRANDS_IMAGES, ...BRANDS_IMAGES] : BRANDS_IMAGES;
  const brandTrackStyle = {
    transform: `translateX(-${brandsIndex * BRAND_SLIDE_WIDTH}px)`,
    transition: isBrandJumping ? "none" : `transform ${BRAND_TRANSITION_MS}ms ease`,
  };

  return (
    <div className="p-6 space-y-10">
      {/* BIG HERO SLIDER */}
      <section className="relative left-1/2 w-screen -translate-x-1/2 h-[75vh] md:h-[90vh] rounded-3xl overflow-hidden">
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
      {BRANDS_IMAGES.length > 0 && (
        <section className="relative left-1/2 w-screen -translate-x-1/2 rounded-3xl bg-amber-50/60 border border-amber-100 p-6 shadow-sm">
          <div className="relative mt-6 overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent" />
            <div className="flex" style={brandTrackStyle}>
              {brandSlides.map((src, idx) => (
                <div
                  key={`${src}-${idx}`}
                  className="flex shrink-0 items-center justify-center px-4 py-2"
                  style={{ width: `${BRAND_SLIDE_WIDTH}px` }}
                >
                  <img
                    src={src}
                    alt="Brand logo"
                    className="h-20 w-100 object-contain opacity-80 transition hover:opacity-100"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.png";
                    }}
                  />
                  
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
        <div className="flex items-center justify-between">
          <img src=" /Shipping.png" alt="Shipping" className="w-24 h-18" />
          <div className="flex items-center w-[25%]">
            <p>Δωρεάν αποστολή για αγορές άνω των 40€ με Box Now και 80€ με Ελτα courier</p>
          </div>
          <img src=" /Star.png" alt="Star" className="w-12 h-18" />
          <div className="flex items-center w-[25%]">
            <p>Ολα τα προϊόντα είναι από την επίσημη αντιπροσωπεία</p>
          </div>
          <img src=" /Safety.png" alt="Safety" className="w-16 h-18" />
          <div className="flex items-center w-[25%]">
            <p>Ασφαλείς συναλλαγές μέσω VivaWallet, PayPal και τραπεζικής κατάθεσης</p>
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
      <section className="relative left-1/2 w-screen -translate-x-1/2 bg-amber-50/60 rounded-2xl py-10 mb-10 border border-amber-100 shadow-sm">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-zen text-3xl md:text-4xl text-amber-800 mb-3">
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
            className="flex flex-col md:flex-row items-center gap-3 justify-center"
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
