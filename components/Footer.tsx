export default function Footer() {
  return (
    <footer
      className="relative border-t border-orange-200 py-10 text-[#40210f]"
      style={{
        backgroundImage: "url('/images/tile-lisbon.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundBlendMode: "multiply",
        backgroundColor: "#f4e6cf", // warm tan overlay for integration
      }}
    >
      <div className="py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left px-6 bg-[#fff8f2]/60 rounded-2xl backdrop-blur-[2px]">
          <div>
            <h3 className="font-bold text-lg mb-2">Lisbon Events</h3>
            <p className="text-sm opacity-90">
              Curated happenings across the city. Filter by category, city, and
              date.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-2">Explore</h3>
            <ul className="space-y-1 text-sm opacity-90">
              <li>
                <a href="/calendar" className="hover:underline">
                  Calendar
                </a>
              </li>

