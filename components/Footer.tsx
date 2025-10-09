export default function Footer() {
  return (
    <footer
      className="bg-[#fff8f2] border-t border-orange-200 py-10"
      style={{
        backgroundImage:
          "url('https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Azulejos_Lisboa.jpg/1600px-Azulejos_Lisboa.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="bg-white/80 backdrop-blur-sm py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left px-6">
          <div>
            <h3 className="font-bold text-lg mb-2">Lisbon Events</h3>
            <p className="text-sm text-gray-700">
              Curated happenings across the city. Filter by category, city, and
              date.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-2">Explore</h3>
            <ul className="space-y-1 text-sm text-gray-700">
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
            <h3 className="font-bold text-lg mb-2">Made in Lisbon</h3>
            <p className="text-sm text-gray-700">
              Inspired by azulejos, tram 28, and pastel de nata energy.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
