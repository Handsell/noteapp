import { useState } from "react";
import Home from "./pages/Home";
import Plans from "./pages/Plans";
import Memories from "./pages/Memories";
import { FaHome, FaList, FaHeart } from "react-icons/fa";

function App() {
  const startDate = new Date("2025-11-25");
  const today = new Date();

  const diffTime = today - startDate;
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // =====================================================
  // ROOM CỐ ĐỊNH
  // Không còn cho người dùng nhập room
  // =====================================================

  const [tab, setTab] = useState("home");

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-pink-50 pb-24 overflow-x-hidden">
      {/* =================================================
          HOME
      ================================================= */}
      {tab === "home" && <Home days={days} />}

      {/* =================================================
          PLANS
      ================================================= */}
      {tab === "plans" && <Plans roomId="love123" />}
      {/* =================================================
          MEMORIES
      ================================================= */}
      {tab === "memories" && <Memories />}

      {/* =================================================
          BOTTOM TAB BAR
      ================================================= */}
      <div
        className="
          fixed
          bottom-0
          left-0
          right-0

          z-[999]

          h-20

          bg-white/90
          backdrop-blur-md

          shadow-[0_-4px_20px_rgba(0,0,0,0.08)]

          rounded-t-2xl

          flex
          justify-around
          items-center

          pb-[env(safe-area-inset-bottom)]
        "
      >
        {/* HOME */}
        <button
          onClick={() => setTab("home")}
          className={`
            flex
            flex-col
            items-center
            justify-center

            gap-1

            text-xs

            active:scale-90
            transition

            ${tab === "home" ? "text-pink-500" : "text-gray-400"}
          `}
        >
          <FaHome size={18} />
          <span>Home</span>
        </button>

        {/* PLANS */}
        <button
          onClick={() => setTab("plans")}
          className={`
            flex
            flex-col
            items-center
            justify-center

            gap-1

            text-xs

            active:scale-90
            transition

            ${tab === "plans" ? "text-pink-500" : "text-gray-400"}
          `}
        >
          <FaList size={18} />
          <span>Plans</span>
        </button>

        {/* MEMORIES */}
        <button
          onClick={() => setTab("memories")}
          className={`
            flex
            flex-col
            items-center
            justify-center

            gap-1

            text-xs

            active:scale-90
            transition

            ${tab === "memories" ? "text-pink-500" : "text-gray-400"}
          `}
        >
          <FaHeart size={18} />
          <span>Memories</span>
        </button>
      </div>
    </div>
  );
}

export default App;
