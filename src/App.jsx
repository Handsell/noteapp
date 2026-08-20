import { useEffect, useState } from "react";

import Home from "./pages/Home";
import Plans from "./pages/Plans";
import Memories from "./pages/Memories";

import { FaHome, FaList, FaMoneyBill, FaSignOutAlt } from "react-icons/fa";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "./firebase";

function App() {
  // =====================================================
  // AUTH
  // =====================================================

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // =====================================================
  // KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP
  // =====================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // =====================================================
  // ĐĂNG NHẬP
  // =====================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoginError("");

    if (!email.trim() || !password) {
      setLoginError("Vui lòng nhập email và mật khẩu.");
      return;
    }

    try {
      setLoginLoading(true);

      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      console.error("Login error:", error);

      switch (error.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          setLoginError("Email hoặc mật khẩu không đúng.");
          break;

        case "auth/invalid-email":
          setLoginError("Email không hợp lệ.");
          break;

        case "auth/too-many-requests":
          setLoginError("Đăng nhập quá nhiều lần. Vui lòng thử lại sau.");
          break;

        default:
          setLoginError("Không thể đăng nhập. Vui lòng thử lại.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // =====================================================
  // ĐĂNG XUẤT
  // =====================================================

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

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

  // =====================================================
  // LOADING AUTH
  // =====================================================

  if (authLoading) {
    return (
      <div
        className="
          w-full
          min-h-[100dvh]
          bg-gradient-to-b
          from-pink-100
          to-pink-50
          flex
          items-center
          justify-center
        "
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="
              w-10
              h-10
              rounded-full
              border-4
              border-pink-200
              border-t-pink-500
              animate-spin
            "
          />

          <p className="text-sm text-pink-500 font-medium">
            Đang kiểm tra đăng nhập...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // CHƯA ĐĂNG NHẬP
  // =====================================================

  if (!user) {
    return (
      <div
        className="
          w-full
          min-h-[100dvh]
          bg-gradient-to-b
          from-pink-100
          to-pink-50
          flex
          items-center
          justify-center
          px-5
          overflow-y-auto
        "
      >
        <div
          className="
            w-full
            max-w-sm
            bg-white/90
            backdrop-blur-md
            rounded-3xl
            shadow-xl
            p-6
            my-6
          "
        >
          {/* ================= LOGO ================= */}

          <div className="text-center mb-7">
            <div
              className="
                mx-auto
                w-16
                h-16
                rounded-full
                bg-pink-100
                flex
                items-center
                justify-center
                text-3xl
                mb-3
              "
            >
              ❤️
            </div>

            <h1 className="text-xl font-bold text-gray-800">
              Góc nhỏ của hai đứa
            </h1>

            <p className="text-sm text-gray-400 mt-1">Đăng nhập để tiếp tục</p>
          </div>

          {/* ================= FORM ================= */}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* EMAIL */}

            <div>
              <label
                className="
                  block
                  text-sm
                  font-medium
                  text-gray-600
                  mb-1.5
                "
              >
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email"
                autoComplete="email"
                className="
                  w-full
                  px-4
                  py-3
                  rounded-2xl
                  border
                  border-gray-200
                  bg-white
                  outline-none
                  focus:border-pink-400
                  focus:ring-2
                  focus:ring-pink-100
                  transition
                "
              />
            </div>

            {/* PASSWORD */}

            <div>
              <label
                className="
                  block
                  text-sm
                  font-medium
                  text-gray-600
                  mb-1.5
                "
              >
                Mật khẩu
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                className="
                  w-full
                  px-4
                  py-3
                  rounded-2xl
                  border
                  border-gray-200
                  bg-white
                  outline-none
                  focus:border-pink-400
                  focus:ring-2
                  focus:ring-pink-100
                  transition
                "
              />
            </div>

            {/* ERROR */}

            {loginError && (
              <div
                className="
                  bg-red-50
                  border
                  border-red-100
                  text-red-500
                  text-sm
                  rounded-2xl
                  px-4
                  py-3
                "
              >
                {loginError}
              </div>
            )}

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={loginLoading}
              className="
                w-full
                py-3
                rounded-2xl
                bg-pink-500
                hover:bg-pink-600
                active:scale-[0.98]
                text-white
                font-semibold
                transition
                disabled:opacity-60
                disabled:cursor-not-allowed
              "
            >
              {loginLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =====================================================
  // ĐÃ ĐĂNG NHẬP
  // =====================================================

  return (
    <div
      className="
        fixed
        inset-0
        w-full
        overflow-hidden
        bg-gradient-to-b
        from-pink-100
        to-pink-50
      "
    >
      {/* =================================================
          APP CONTENT
      ================================================= */}

      <div
        className="
          absolute
          inset-0
          bottom-20
          w-full
          overflow-hidden
        "
      >
        {/* ================= HOME ================= */}

        <div
          className={
            tab === "home" ? "block w-full h-full overflow-hidden" : "hidden"
          }
        >
          <Home days={days} />
        </div>

        {/* ================= PLANS ================= */}

        <div
          className={
            tab === "plans"
              ? `
                block
                w-full
                h-full
                overflow-y-auto
                overflow-x-hidden
                overscroll-contain
                pb-6
              `
              : "hidden"
          }
        >
          <Plans roomId={roomId} />
        </div>

        {/* ================= MEMORIES ================= */}

        <div
          className={
            tab === "memories"
              ? `
                block
                w-full
                h-full
                overflow-y-auto
                overflow-x-hidden
                overscroll-contain
                pb-6
              `
              : "hidden"
          }
        >
          <Memories roomId={roomId} />
        </div>
      </div>

      {/* =================================================
          LOGOUT
      ================================================= */}

      {tab === "home" && (
        <button
          type="button"
          onClick={handleLogout}
          title="Đăng xuất"
          className="
            fixed
            top-4
            right-4
            z-[60]

            w-10
            h-10

            rounded-full

            bg-white/80
            backdrop-blur-md
            shadow-md

            flex
            items-center
            justify-center

            text-gray-400
            hover:text-pink-500

            active:scale-90
            transition
          "
        >
          <FaSignOutAlt size={16} />
        </button>
      )}

      {/* =================================================
          BOTTOM TAB BAR
      ================================================= */}

      <nav
        className="
          fixed
          left-0
          right-0
          bottom-0
          z-[50]

          h-20

          bg-white/95
          backdrop-blur-md
          shadow-[0_-4px_20px_rgba(0,0,0,0.08)]

          flex
          items-center
          justify-around

          rounded-t-2xl

          shrink-0

          pb-[env(safe-area-inset-bottom)]
        "
      >
        {/* ================= HOME ================= */}

        <button
          type="button"
          onClick={() => setTab("home")}
          className={`
            h-full
            min-w-[80px]

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
          type="button"
          onClick={() => setTab("plans")}
          className={`
            h-full
            min-w-[80px]

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
          type="button"
          onClick={() => setTab("memories")}
          className={`
            h-full
            min-w-[80px]

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
      </nav>
    </div>
  );
}

export default App;
