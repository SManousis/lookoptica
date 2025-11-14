import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";

const API = import.meta.env.VITE_API_BASE || "";

const HERO_IMAGES = ["/hero1.jpg", "/hero2.jpg", "/hero3.jpg", "/hero4.jpg"]; // 👈 change to your actual files

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [slideIndex, setSlideIndex] = useState(0);

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

  const currentHero = HERO_IMAGES[slideIndex] || "/placeholder.png";

  return (
    <div className="space-y-10">
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
          <div className="text-xs md:text-sm font-semibold text-red-800 uppercase tracking-[0.2em]">
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
              className="px-5 py-2.5 rounded-full bg-red-800 text-white text-sm font-medium hover:bg-red-700 transition"
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

      {/* TEXT BLOCK UNDER HERO (what used to be left card) */}
      <section className="space-y-3">
        <h2 className="text-2xl md:text-3xl font-semibold">
          Vision you <span className="text-teal-700">deserve every day.</span>
        </h2>
        <p className="text-sm md:text-base text-slate-600 max-w-2xl">
          Γυαλιά ηλίου &amp; οράσεως από επιλεγμένα brands, με εξατομικευμένη
          συμβουλή από οπτικό. Βρες τώρα το look που σου ταιριάζει, είτε
          χρειάζεσαι καθημερινή χρήση, γραφείο, οδήγηση ή προστασία από την
          οθόνη.
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span>✔ Γνήσια προϊόντα από επίσημες αντιπροσωπείες</span>
          <span>✔ Εφαρμογή &amp; ρυθμίσεις στο κατάστημα Look Optica</span>
          <span>✔ Συμβουλή για φακούς &amp; coatings ανάλογα με τις ανάγκες σου</span>
        </div>
      </section>

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
                className="w-full h-32 md:h-40 lg:h-100 object-cover transition-transform duration-500 group-hover:scale-105"
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
                className="w-full h-32 md:h-40 lg:h-100 object-cover transition-transform duration-500 group-hover:scale-105"
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
                className="w-full h-32 md:h-40 lg:h-100 object-cover transition-transform duration-500 group-hover:scale-105"
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
                className="w-full h-32 md:h-40 lg:h-100 object-cover transition-transform duration-500 group-hover:scale-105"
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
     </section>


      {/* FEATURED PRODUCTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Προτεινόμενα / Νέες αφίξεις</h2>
          <Link to="/shop" className="text-xs text-teal-700 hover:underline">
            Δες όλα τα προϊόντα &rarr;
          </Link>
        </div>

        {state === "loading" && (
          <div className="text-sm text-slate-500">Φόρτωση προϊόντων…</div>
        )}
        {state === "error" && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
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
    </div>
  );
}
