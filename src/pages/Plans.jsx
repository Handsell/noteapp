import { useState, useRef, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

function Plans({ plans, addPlan, togglePlan, deletePlan, roomId }) {
  const [newPlan, setNewPlan] = useState("");

  return (
    <>
      <div className="bg-white p-4 rounded-2xl shadow mb-4">
        <input
          value={newPlan}
          onChange={(e) => setNewPlan(e.target.value)}
          placeholder="Nhập dự định..."
          className="border border-gray-200 p-3 rounded-xl w-full mb-2 outline-none focus:ring-2 focus:ring-pink-300"
        />

        <button
          onClick={() => {
            if (!newPlan.trim()) return;
            addPlan(newPlan);
            setNewPlan("");
          }}
          className="bg-pink-500 text-white px-4 py-3 rounded-xl w-full font-semibold active:scale-95 transition"
        >
          Thêm
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="font-bold mb-2">Dự định</h2>

        {plans.map((plan) => (
          <PlanItem
            key={plan.id}
            plan={plan}
            togglePlan={togglePlan}
            deletePlan={deletePlan}
            roomId={roomId}
          />
        ))}
      </div>
    </>
  );
}

// 🔥 component swipe + edit
function PlanItem({ plan, togglePlan, deletePlan, roomId }) {
  const [swiped, setSwiped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(plan.text);

  const textareaRef = useRef(null);

  // 🔥 FIX: resize ngay khi mở edit
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [editing]);

  const handlers = useSwipeable({
    onSwipedLeft: () => setSwiped(true),
    onSwipedRight: () => setSwiped(false),
    trackMouse: true,
  });

  const handleSave = async () => {
    if (!editText.trim()) return;

    await updateDoc(doc(db, "rooms", roomId, "plans", plan.id), {
      text: editText,
    });

    setEditing(false);
  };

  return (
    <div className="relative overflow-hidden mb-2">
      {/* nền đỏ */}
      <div className="absolute inset-0 bg-red-100 flex justify-end items-center pr-4">
        <button
          onClick={() => deletePlan(plan)}
          className="text-red-500 font-bold"
        >
          Xoá
        </button>
      </div>

      {/* nội dung */}
      <div
        {...handlers}
        className={`bg-white rounded-xl px-3 py-2 shadow-sm flex justify-between transition transform ${
          swiped ? "-translate-x-20" : "translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2 w-full min-w-0">
          <input
            type="checkbox"
            checked={plan.done}
            onChange={() => togglePlan(plan)}
            className="w-4 h-4 accent-pink-500 mt-1"
          />

          {/* text / edit */}
          {editing ? (
            <textarea
              ref={textareaRef}
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              className="border rounded px-2 py-1 w-full resize-none overflow-hidden outline-none focus:ring-2 focus:ring-pink-300"
            />
          ) : (
            <span
              className={`break-words flex-1 min-w-0 ${
                plan.done ? "line-through text-gray-400" : ""
              }`}
            >
              {plan.text}
            </span>
          )}
        </div>

        {/* nút sửa / lưu */}
        <button
          onClick={editing ? handleSave : () => setEditing(true)}
          className="text-blue-400 text-xs ml-2 whitespace-nowrap"
        >
          {editing ? "Lưu" : "Sửa"}
        </button>
      </div>
    </div>
  );
}

export default Plans;
