export default function Footer() {
  return (
    <footer className="bg-[#f0e5d4] py-8 mt-12 border-t border-gray-300">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-center md:text-left">
        <div>
          <h3 className="font-bold mb-2 text-lg text-[#40210f]">Lisbon Events</h3>
          <p className="text-sm text-[#40210f]/80">
            Curated happenings across the city. Filter by category, city, and date.
          </p>
        </div>
        <div>
          <h3 className="font-bold mb-2 text-lg text-[#40210f]">Explore</h3>
          <ul className="space-y-1 text-sm text-[#40210f]/80">
            <li><a href="/calendar" className="hover:underline">Calendar</a></li>
            <li><a href="/events" className="hover:underline">Events</a></li>
            <li><a href="/categories" className="hover:underline">Categories</a></li>
            <li><a href="/submit" className="hover:underline">Submit an event</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-2 text-lg text-[#40210f]">Made in Lisbon</h3>
          <p className="text-sm text-[#40210f]/80">
            Inspired by azulejos, tram 28, and pastel de nata energy.
          </p>
        </div>
      </div>
    </footer>
  );
}
