
import { useState } from "react";
import { useTurnstile } from "../hooks/useTurnstile";

const API = import.meta.env.VITE_API_BASE || "";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState(null); // "success" | "error" | null
  const [isSending, setIsSending] = useState(false);
  const { isEnabled: hasTurnstile, turnstileToken, resetTurnstile, containerRef: turnstileRef } =
    useTurnstile();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSending(true);
    setStatus(null);

    if (hasTurnstile && !turnstileToken) {
      setStatus("turnstile");
      setIsSending(false);
      return;
    }

    try {
      const res = await fetch(`${API}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
          turnstileToken: turnstileToken || "",
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
      if (hasTurnstile) {
        resetTurnstile();
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
      {/* CONTACT DETAILS + HOURS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left side */}
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-amber-700">Επικοινωνία</h1>

          <div>
            <h2 className="font-semibold text-amber-800">Τηλέφωνο</h2>
            <p className="text-slate-700">210 6898658</p>
          </div>

          <div>
            <h2 className="font-semibold text-amber-800">Email</h2>
            <p className="text-slate-700">info@lookoptica.gr</p>
          </div>

          <div>
            <h2 className="font-semibold text-amber-800">Διεύθυνση</h2>
            <p className="text-slate-700">
              Αγίας Παρασκευής 30, Χαλάνδρι 15232
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-amber-700">Ωράριο</h1>
          <p className="text-slate-700">Δευτέρα - Τετάρτη: 10:00 - 15:30</p>
          <p className="text-slate-700">
            Τρίτη - Πέμπτη - Παρασκευή: 10:00 - 21:00
          </p>
          <p className="text-slate-700">Σάββατο: 10:00 - 16:00</p>
        </div>
      </div>

      {/* MAP */}
      <div className="w-full h-[350px] rounded-xl overflow-hidden shadow-md border border-amber-100">
        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d763.4158573143749!2d23.801148411021263!3d38.0204585125155!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14a198f84cee2adf%3A0xf95a9aadbc427e1c!2sLook%20Optica!5e0!3m2!1sen!2sgr!4v1763312193434!5m2!1sen!2sgr"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Look Optica Map"
        ></iframe>
      </div>

      {/* CONTACT FORM (backend-powered) */}
      <div className="max-w-4xl mx-auto p-6 bg-white/80 rounded-2xl shadow-lg border border-amber-100">
        <h2 className="font-zen text-3xl text-amber-800 mb-6 text-center">
          Φόρμα Επικοινωνίας
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-amber-800 mb-1 font-semibold">
              Όνομα
            </label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-amber-200 
                         focus:outline-none focus:border-amber-500 text-slate-700
                         shadow-sm bg-white"
              placeholder="Το όνομά σας"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-amber-800 mb-1 font-semibold">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-amber-200 
                         focus:outline-none focus:border-amber-500 text-slate-700
                         shadow-sm bg-white"
              placeholder="example@mail.com"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-amber-800 mb-1 font-semibold">
              Θέμα
            </label>
            <input
              type="text"
              name="subject"
              required
              value={form.subject}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-amber-200 
                         focus:outline-none focus:border-amber-500 text-slate-700
                         shadow-sm bg-white"
              placeholder="Πώς μπορούμε να βοηθήσουμε;"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-amber-800 mb-1 font-semibold">
              Μήνυμα
            </label>
            <textarea
              rows="5"
              name="message"
              required
              value={form.message}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-amber-200 
                         focus:outline-none focus:border-amber-500 text-slate-700
                         shadow-sm bg-white resize-none"
              placeholder="Γράψτε εδώ το μήνυμά σας…"
            ></textarea>
          </div>

          {/* Status messages */}
          {status === "success" && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Το μήνυμά σας στάλθηκε με επιτυχία! Θα σας απαντήσουμε σύντομα.
            </div>
          )}
          {status === "error" && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Κάτι πήγε στραβά. Παρακαλούμε δοκιμάστε ξανά ή επικοινωνήστε
              τηλεφωνικά.
            </div>
          )}
          {status === "turnstile" && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Παρακαλούμε ολοκληρώστε την επαλήθευση Turnstile πριν στείλετε τη φόρμα.
            </div>
          )}

          {hasTurnstile && (
            <div className="flex justify-center">
              <div ref={turnstileRef} className="my-2" />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSending || (hasTurnstile && !turnstileToken)}
            className="w-full md:w-auto px-8 py-3 rounded-xl 
                       bg-amber-700 hover:bg-red-700 
                       text-white font-semibold shadow-lg 
                       transition mx-auto block disabled:opacity-60"
          >
            {isSending ? "Αποστολή..." : "Αποστολή"}
          </button>
        </form>
      </div>
    </div>
  );
}
