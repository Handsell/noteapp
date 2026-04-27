import { useState, useEffect } from "react";
import Home from "./pages/Home";
import Plans from "./pages/Plans";
import Memories from "./pages/Memories";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

function App() {
  const startDate = new Date("2025-11-25");
  const today = new Date();
  const diffTime = today - startDate;
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // 🔐 room
  const [roomId, setRoomId] = useState(localStorage.getItem("roomId") || "");
  const [inputRoom, setInputRoom] = useState("");

  const [plans, setPlans] = useState([]);

  const [tab, setTab] = useState("home");

  // 🔥 chỉ tạo ref khi có roomId
  const plansRef = roomId ? collection(db, "rooms", roomId, "plans") : null;

  // realtime
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = onSnapshot(plansRef, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlans(data);
    });

    return () => unsubscribe();
  }, [roomId]);

  // thêm
  const addPlan = async (text) => {
    if (!plansRef) return;
    await addDoc(plansRef, {
      text,
      done: false,
    });
  };

  // xoá (FIX BUG: path sai trước đó)
  const deletePlan = async (plan) => {
    const ref = doc(db, "rooms", roomId, "plans", plan.id);
    await deleteDoc(ref);
  };

  // toggle (FIX BUG)
  const togglePlan = async (plan) => {
    const ref = doc(db, "rooms", roomId, "plans", plan.id);
    await updateDoc(ref, {
      done: !plan.done,
    });
  };

  // 🔐 join room
  const joinRoom = () => {
    if (!inputRoom.trim()) return;
    localStorage.setItem("roomId", inputRoom);
    setRoomId(inputRoom);
  };

  //logout
  const logout = () => {
    localStorage.removeItem("roomId");
    setRoomId("");
    setPlans([]);
  };

  // 🚪 nếu chưa có room → show màn nhập
  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-100 p-4">
        <div className="bg-white p-6 rounded-2xl shadow w-full max-w-sm">
          <h2 className="text-xl font-bold mb-4 text-center">
            Nhập mã phòng ❤️
          </h2>

          <input
            value={inputRoom}
            onChange={(e) => setInputRoom(e.target.value)}
            placeholder="Ví dụ: love123"
            className="border p-2 rounded w-full mb-3"
          />

          <button
            onClick={joinRoom}
            className="bg-pink-500 text-white w-full py-2 rounded"
          >
            Vào phòng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-100 p-4 pb-16">
      <div className="flex justify-end mb-2">
        <button onClick={logout} className="text-sm text-red-500">
          Đổi phòng
        </button>
      </div>
      {/* Home */}
      {tab === "home" && <Home days={days} />}

      {/* Plans */}
      {tab === "plans" && (
        <Plans
          plans={plans}
          addPlan={addPlan}
          togglePlan={togglePlan}
          deletePlan={deletePlan}
        />
      )}

      {/* Memories */}
      {tab === "memories" && <Memories />}

      {/* taskbar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow flex justify-around p-2">
        <button
          onClick={() => setTab("home")}
          className={
            tab === "home" ? "text-pink-500 font-bold" : "text-gray-500"
          }
        >
          Home
        </button>

        <button
          onClick={() => setTab("plans")}
          className={
            tab === "plans" ? "text-pink-500 font-bold" : "text-gray-500"
          }
        >
          Plans
        </button>

        <button
          onClick={() => setTab("memories")}
          className={
            tab === "memories" ? "text-pink-500 font-bold" : "text-gray-500"
          }
        >
          Memories
        </button>
      </div>
    </div>
  );
}

export default App;
