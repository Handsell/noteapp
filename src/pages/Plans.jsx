import { useState, useRef, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

function Plans({ plans, addPlan, togglePlan, deletePlan, roomId }) {
  const [newPlan, setNewPlan] = useState("");
  const textareaRef = useRef(null);

  // auto resize input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [newPlan]);

  // 🔥 drag end FIX async
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = plans.findIndex((p) => p.id === active.id);
    const newIndex = plans.findIndex((p) => p.id === over.id);

    const newPlans = arrayMove(plans, oldIndex, newIndex);

    await Promise.all(
      newPlans.map((item, index) =>
        updateDoc(doc(db, "rooms", roomId, "plans", item.id), {
          order: index,
        }),
      ),
    );
  };

  return (
    <>
      {/* input */}
      <div className="bg-white p-4 rounded-2xl shadow mb-4">
        <textarea
          ref={textareaRef}
          value={newPlan}
          onChange={(e) => setNewPlan(e.target.value)}
          placeholder="Nhập dự định..."
          className="border border-gray-200 p-3 rounded-xl w-full mb-2 resize-none overflow-hidden outline-none focus:ring-2 focus:ring-pink-300"
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

      {/* list */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="font-bold mb-2">Dự định</h2>

        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={plans.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {plans.map((plan) => (
              <SortableItem
                key={plan.id}
                plan={plan}
                togglePlan={togglePlan}
                deletePlan={deletePlan}
                roomId={roomId}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}

////////////////////////////////////////////////////

function PlanItem({ plan, togglePlan, deletePlan, roomId, dragHandle }) {
  const [swiped, setSwiped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(plan.text);

  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [editing]);

  const handlers = useSwipeable({
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setSwiped(true);
      }
    },
    onSwipedRight: (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setSwiped(false);
      }
    },

    delta: 20,
    preventScrollOnSwipe: true,
  });

  const handleSave = async () => {
    if (!editText.trim()) return;

    await updateDoc(doc(db, "rooms", roomId, "plans", plan.id), {
      text: editText,
    });

    setEditing(false);
  };

  return (
    <div className="relative overflow-hidden shadow-md mb-3 rounded-2xl">
      {/* nền xoá */}
      <div className="absolute inset-0 bg-red-100 flex justify-end items-center pr-4 rounded-2xl">
        <button
          onClick={() => deletePlan(plan)}
          className="text-red-500 font-semibold"
        >
          Xoá
        </button>
      </div>

      {/* card */}
      <div
        {...handlers}
        className={`bg-white rounded-2xl pl-1 pr-4 py-4 shadow-sm transition-transform duration-200 ease-out ${
          swiped ? "-translate-x-24" : "translate-x-0"
        }`}
      >
        {/* 🔥 layout 3 cột */}
        <div className="flex items-start gap-3">
          {/* ===== DRAG HANDLE ===== */}
          <div
            {...dragHandle.listeners}
            {...dragHandle.attributes}
            className="cursor-grab text-gray-400 active:scale-95 pr-2 pl-1 py-2 mt-1 self-center"
          >
            <GripVertical size={28} />

            {/* 🔥 tăng size */}
          </div>

          {/* ===== CONTENT ===== */}
          <div className="flex-1 min-w-0">
            {/* status */}
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={plan.done}
                onChange={() => togglePlan(plan)}
                className="w-5 h-5 accent-pink-500"
              />

              <p className="text-sm text-gray-400">
                {plan.done ? "Đã xong" : "Chưa xong"}
              </p>
            </div>

            {/* text */}
            {editing ? (
              <textarea
                ref={textareaRef}
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full resize-none overflow-hidden outline-none focus:ring-2 focus:ring-pink-300"
              />
            ) : (
              <p
                className={`text-gray-700 break-words ${
                  plan.done ? "line-through text-gray-400" : ""
                }`}
              >
                {plan.text}
              </p>
            )}
          </div>

          {/* ===== ACTION ===== */}
          <button
            onClick={editing ? handleSave : () => setEditing(true)}
            className="text-blue-400 text-xs whitespace-nowrap mt-1"
          >
            {editing ? "Lưu" : "Sửa"}
          </button>
        </div>
      </div>
    </div>
  );
}

////////////////////////////////////////////////////

function SortableItem({ plan, togglePlan, deletePlan, roomId }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: plan.id });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)` // ❌ bỏ scale
      : undefined,
    transition,
    touchAction: "pan-y",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PlanItem
        plan={plan}
        togglePlan={togglePlan}
        deletePlan={deletePlan}
        roomId={roomId}
        dragHandle={{ attributes, listeners }}
      />
    </div>
  );
}

export default Plans;
