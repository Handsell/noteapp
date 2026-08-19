import { useState } from "react";

import Home from "./pages/Home";
import Plans from "./pages/Plans";
import Memories from "./pages/Memories";

import { FaHome, FaList, FaMoneyBill } from "react-icons/fa";

function App() {
  // =====================================================
  // NGÀY YÊU
  // =====================================================

  const startDate = new Date("2025-11-25");

  const today = new Date();

  const diffTime = today - startDate;

  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // =====================================================
  // ROOM
  // =====================================================

  const roomId = "love123";

  // =====================================================
  // TAB
  // =====================================================

  const [tab, setTab] = useState("home");

  return (
    <div className="w-full h-[100dvh] bg-gradient-to-b from-pink-100 to-pink-50 overflow-hidden">
      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="w-full h-[calc(100dvh-80px)] overflow-hidden">
        {/* ================= HOME ================= */}

        <div className={tab === "home" ? "block w-full h-full" : "hidden"}>
          <Home days={days} />
        </div>

        {/* ================= PLANS ================= */}

        <div
          className={
            tab === "plans" ? "block w-full h-full overflow-y-auto" : "hidden"
          }
        >
          <Plans roomId={roomId} />
        </div>

        {/* ================= MEMORIES ================= */}

        <div
          className={
            tab === "memories"
              ? "block w-full h-full overflow-y-auto"
              : "hidden"
          }
        >
          <Memories roomId={roomId} />
        </div>
      </div>

      {/* =================================================
          TASKBAR
      ================================================= */}

      <div
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-50

          h-20

          bg-white/90
          backdrop-blur-md
          shadow-lg

          flex
          justify-around
          items-center

          rounded-t-2xl
        "
      >
        {/* ================= HOME ================= */}

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

        {/* ================= PLANS ================= */}

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

        {/* ================= MEMORIES ================= */}

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
          <FaMoneyBill size={18} />

          <span>TripExpenses</span>
        </button>
      </div>
    </div>
  );
}

export default App;
