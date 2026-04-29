import { useState, useRef, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function PlanItem({ plan, togglePlan, deletePlan, roomId, dragListeners }) {
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
    onSwipedLeft: () => setSwiped(true),
    onSwipedRight: () => setSwiped(false),
    preventScrollOnSwipe: true,
    trackTouch: true,
    // preventDefaultTouchmoveEvent: true,
    delta: 10,
  });

  const handleSave = async () => {
    if (!editText.trim()) return;

    await updateDoc(doc(db, "rooms", roomId, "plans", plan.id), {
      text: editText,
    });

    setEditing(false);
  };

  return (
    <div className="relative overflow-hidden mb-3">
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
        className={`bg-white rounded-2xl p-4 shadow-sm transition-transform duration-200 ease-out ${
          swiped ? "-translate-x-24" : "translate-x-0"
        }`}
      >
        {/* header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* 🔥 drag handle */}
            <div
              {...dragListeners}
              className="cursor-grab text-gray-400 active:scale-95"
            >
              ☰
            </div>

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

          <button
            onClick={editing ? handleSave : () => setEditing(true)}
            className="text-blue-400 text-xs"
          >
            {editing ? "Lưu" : "Sửa"}
          </button>
        </div>

        {/* content */}
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
    </div>
  );
}

////////////////////////////////////////////////////

function SortableItem({ plan, togglePlan, deletePlan, roomId }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: plan.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none", // 🔥 fix mobile mượt
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <PlanItem
        plan={plan}
        togglePlan={togglePlan}
        deletePlan={deletePlan}
        roomId={roomId}
        dragListeners={listeners} // 🔥 truyền xuống
      />
    </div>
  );
}

export default Plans;
