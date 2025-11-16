export default function Contact() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      
      {/* CONTACT DETAILS */}
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
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-amber-700">Ωράριο</h1>
          
          <p className="text-slate-700">Δευτέρα - Τετάρτη: 10:00 - 15:30</p>
          <p className="text-slate-700">Τρίτη - Πέμπτη - Παρασκευή: 10:00 - 21:00</p>
          <p className="text-slate-700">Σάββατο: 10:00 - 16:00</p>
        </div>

      </div>

      {/* MAP SECTION */}
      <div className="w-full h-[350px] rounded-xl overflow-hidden shadow-md border border-amber-100">
        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d763.4158573143749!2d23.801148411021263!3d38.0204585125155!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14a198f84cee2adf%3A0xf95a9aadbc427e1c!2sLook%20Optica!5e0!3m2!1sen!2sgr!4v1763312193434!5m2!1sen!2sgr"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
      {/* CONTACT FORM */}
    <div className="max-w-4xl mx-auto mt-12 p-6 bg-white/80 rounded-2xl shadow-lg border border-amber-100">
    <h2 className="font-zen text-3xl text-amber-800 mb-6 text-center">
        Φόρμα Επικοινωνίας
    </h2>

    <form
        onSubmit={(e) => {
        e.preventDefault();
        alert("Ευχαριστούμε! Θα σας απαντήσουμε το συντομότερο.");
        }}
        className="space-y-4"
    >
        {/* Name */}
        <div>
        <label className="block text-amber-800 mb-1 font-semibold">Όνομα</label>
        <input
            type="text"
            required
            className="w-full px-4 py-3 rounded-xl border border-amber-200 
                    focus:outline-none focus:border-amber-500 text-slate-700
                    shadow-sm bg-white"
            placeholder="Το όνομά σας"
        />
        </div>

        {/* Email */}
        <div>
        <label className="block text-amber-800 mb-1 font-semibold">Email</label>
        <input
            type="email"
            required
            className="w-full px-4 py-3 rounded-xl border border-amber-200 
                    focus:outline-none focus:border-amber-500 text-slate-700
                    shadow-sm bg-white"
            placeholder="example@mail.com"
        />
        </div>

        {/* Subject */}
        <div>
        <label className="block text-amber-800 mb-1 font-semibold">Θέμα</label>
        <input
            type="text"
            required
            className="w-full px-4 py-3 rounded-xl border border-amber-200 
                    focus:outline-none focus:border-amber-500 text-slate-700
                    shadow-sm bg-white"
            placeholder="Πώς μπορούμε να βοηθήσουμε;"
        />
        </div>

        {/* Message */}
        <div>
        <label className="block text-amber-800 mb-1 font-semibold">Μήνυμα</label>
        <textarea
            rows="5"
            required
            className="w-full px-4 py-3 rounded-xl border border-amber-200 
                    focus:outline-none focus:border-amber-500 text-slate-700
                    shadow-sm bg-white resize-none"
            placeholder="Γράψτε εδώ το μήνυμά σας…"
        ></textarea>
        </div>

        {/* Submit */}
        <button
        type="submit"
        className="w-full md:w-auto px-8 py-3 rounded-xl 
                    bg-amber-700 hover:bg-red-700 
                    text-white font-semibold shadow-lg 
                    transition mx-auto block"
        >
        Αποστολή
        </button>
    </form>
    </div>

    </div>
  );
}
