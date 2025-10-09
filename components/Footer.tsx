export default function Footer() {
  return (
    <footer
      className="border-t border-orange-200 py-10"
      style={{
        backgroundColor: "#f7efe3",
        backgroundImage:
          "url('/images/azulejo-tan.jpg')", // ← your muted tan tile stored in /public/images/
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="bg-[#fff8f2]/85 backdrop-blur-sm py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left px-6">
          <div>
            <h3 className="font-bold text-lg mb-2 text-[#40210f]">
              Lisbon Events
            </h3>
            <p className="text-sm text-[#40210f]/80">
              Curated happenings across the city. Filter by category, city, and
              date.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-2 text-[#40210f]">Explore</h3>
            <ul className="space-y-1 text-sm text-[#40210f]/80">
              <li>
                <a href="/calendar" className="hover:underline">
                  Calendar
                </a>
              </li>
              <li>
                <a href="/events" className="hover:underline">
                  Events
                </a>
              </li>
              <li>
                <a href="/categories" className="hover:underline">
                  Categories
                </a>
              </li>
              <li>
                <a href="/submit" className="hover:underline">
                  Submit an event
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-2 text-[#40210f]">
              Made in Lisbon
            </h3>
            <p className="text-sm text-[#40210f]/80">
              Inspired by azulejos, tram 28, and pastel de nata energy.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
