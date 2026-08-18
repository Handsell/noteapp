import { useState, useRef, useEffect } from "react";
import { useSwipeable } from "react-swipeable";

import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

import { DndContext, closestCenter } from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { GripVertical, ArrowLeft, Plus } from "lucide-react";

/* =========================================================
   PLANS
========================================================= */

function Plans({ roomId }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);

  const [selectedPlan, setSelectedPlan] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newPlan, setNewPlan] = useState("");

  /* =======================================================
     LOAD PLANS
  ======================================================= */

  useEffect(() => {
    const plansRef = collection(db, "rooms", roomId, "plans");

    const q = query(plansRef, orderBy("order", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setPlans(data);
        setLoading(false);
      },
      (error) => {
        console.error("Lỗi tải plans:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [roomId]);

  /* =======================================================
     TẠO PLAN
  ======================================================= */

  const createPlan = async () => {
    const title = newPlan.trim();

    if (!title) return;

    if (!startDate || !endDate) {
      alert("Vui lòng chọn thời gian cho kế hoạch");
      return;
    }

    try {
      const plansRef = collection(db, "rooms", roomId, "plans");

      await addDoc(plansRef, {
        title,

        startDate,
        endDate,

        createdAt: serverTimestamp(),
        order: Date.now(),
      });

      setNewPlan("");
      setStartDate("");
      setEndDate("");
      setShowCreate(false);
    } catch (error) {
      console.error("Lỗi tạo plan:", error);
    }
  };

  /* =======================================================
     XÓA PLAN
     
     Lưu ý:
     Firestore không tự xóa schedules bên trong.
     Hàm này sẽ xóa Plan.
  ======================================================= */

  const deletePlan = async (plan) => {
    try {
      await deleteDoc(doc(db, "rooms", roomId, "plans", plan.id));

      if (selectedPlan && selectedPlan.id === plan.id) {
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error("Lỗi xóa plan:", error);
    }
  };

  /* =======================================================
     DRAG PLAN
  ======================================================= */

  const handlePlanDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = plans.findIndex((item) => item.id === active.id);

    const newIndex = plans.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newPlans = arrayMove(plans, oldIndex, newIndex);

    // Cập nhật UI ngay
    setPlans(newPlans);

    try {
      await Promise.all(
        newPlans.map((item, index) =>
          updateDoc(doc(db, "rooms", roomId, "plans", item.id), {
            order: index,
          }),
        ),
      );
    } catch (error) {
      console.error("Lỗi sắp xếp plan:", error);
    }
  };

  /* =======================================================
     CHI TIẾT PLAN
  ======================================================= */

  if (selectedPlan) {
    return (
      <PlanDetail
        roomId={roomId}
        plan={selectedPlan}
        onBack={() => setSelectedPlan(null)}
      />
    );
  }

  if (editingPlan) {
    return (
      <EditPlan
        roomId={roomId}
        plan={editingPlan}
        onBack={() => setEditingPlan(null)}
        onSaved={() => setEditingPlan(null)}
      />
    );
  }
  /* =======================================================
     UI
  ======================================================= */

  return (
    <div
      className="
        w-full
        max-w-[700px]
        mx-auto
        px-4
        pt-4
        pb-10
      "
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        className="
          flex
          items-center
          justify-between
          mb-4
        "
      >
        <div>
          <h1
            className="
              text-2xl
              font-bold
              text-gray-700
            "
          >
            Dự định
          </h1>

          <p
            className="
              text-sm
              text-gray-400
              mt-1
            "
          >
            Những kế hoạch của hai đứa ❤️
          </p>
        </div>

        {/* NÚT TẠO PLAN */}

        <button
          onClick={() => setShowCreate(true)}
          className="
            w-11
            h-11
            rounded-full
            bg-pink-500
            text-white
            flex
            items-center
            justify-center
            shadow-md
            active:scale-90
            transition
          "
        >
          <Plus size={23} />
        </button>
      </div>

      {/* =================================================
          FORM TẠO PLAN
      ================================================= */}

      {showCreate && (
        <div
          className="
      bg-white
      p-4
      rounded-2xl
      shadow
      mb-4
    "
        >
          {/* TÊN PLAN */}

          <input
            autoFocus
            value={newPlan}
            onChange={(e) => setNewPlan(e.target.value)}
            placeholder="Nhập tên kế hoạch..."
            className="
        border
        border-gray-200
        p-3
        rounded-xl
        w-full
        outline-none
        focus:ring-2
        focus:ring-pink-300
        mb-3
      "
          />

          {/* THỜI GIAN */}

          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* NGÀY BẮT ĐẦU */}

            <div>
              <label
                className="
            block
            text-xs
            text-gray-400
            mb-1
          "
              >
                Từ ngày
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="
            border
            border-gray-200
            p-3
            rounded-xl
            w-full
            outline-none
            focus:ring-2
            focus:ring-pink-300
            text-sm
          "
              />
            </div>

            {/* NGÀY KẾT THÚC */}

            <div>
              <label
                className="
            block
            text-xs
            text-gray-400
            mb-1
          "
              >
                Đến ngày
              </label>

              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="
            border
            border-gray-200
            p-3
            rounded-xl
            w-full
            outline-none
            focus:ring-2
            focus:ring-pink-300
            text-sm
          "
              />
            </div>
          </div>

          {/* BUTTON */}

          <div className="flex gap-2">
            <button
              onClick={createPlan}
              className="
          bg-pink-500
          text-white
          px-4
          py-3
          rounded-xl
          flex-1
          font-semibold
          active:scale-95
          transition
        "
            >
              Tạo kế hoạch
            </button>

            <button
              onClick={() => {
                setShowCreate(false);
                setNewPlan("");
                setStartDate("");
                setEndDate("");
              }}
              className="
          bg-gray-100
          text-gray-500
          px-5
          rounded-xl
          active:scale-95
        "
            >
              Huỷ
            </button>
          </div>
        </div>
      )}
      {/* =================================================
          LOADING
      ================================================= */}

      {loading ? (
        <div className="space-y-3">
          <PlanSkeleton />

          <PlanSkeleton />
        </div>
      ) : (
        <>
          {/* =================================================
              EMPTY
          ================================================= */}

          {plans.length === 0 && !showCreate && (
            <div
              className="
                bg-white
                p-8
                rounded-2xl
                shadow
                text-center
              "
            >
              <div className="text-4xl mb-3">💕</div>

              <p className="text-gray-400">Chưa có kế hoạch nào</p>

              <button
                onClick={() => setShowCreate(true)}
                className="
                  mt-3
                  text-pink-500
                  font-semibold
                "
              >
                + Tạo kế hoạch
              </button>
            </div>
          )}

          {/* =================================================
              LIST PLAN
          ================================================= */}

          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handlePlanDragEnd}
          >
            <SortableContext
              items={plans.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {plans.map((plan) => (
                <SortablePlan
                  key={plan.id}
                  plan={plan}
                  onClick={() => {
                    setSelectedPlan(plan);
                  }}
                  onDelete={() => {
                    deletePlan(plan);
                  }}
                  onUpdate={() => {
                    setEditingPlan(plan);
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}
function EditPlan({ roomId, plan, onBack, onSaved }) {
  const [title, setTitle] = useState(plan.title || "");

  const [startDate, setStartDate] = useState(plan.startDate || "");

  const [endDate, setEndDate] = useState(plan.endDate || "");

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Vui lòng nhập tên kế hoạch");
      return;
    }

    if (!startDate || !endDate) {
      alert("Vui lòng chọn thời gian");
      return;
    }

    if (endDate < startDate) {
      alert("Ngày kết thúc không được trước ngày bắt đầu");
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, "rooms", roomId, "plans", plan.id), {
        title: title.trim(),
        startDate,
        endDate,
      });

      onSaved();
    } catch (error) {
      console.error("Lỗi sửa plan:", error);

      alert("Không thể lưu thay đổi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="
        w-full
        max-w-[700px]
        mx-auto
        px-4
        pt-4
        pb-10
      "
    >
      {/* HEADER */}

      <div
        className="
          flex
          items-center
          gap-3
          mb-5
        "
      >
        <button
          onClick={onBack}
          className="
            w-10
            h-10
            rounded-full
            bg-white
            shadow
            flex
            items-center
            justify-center
            text-gray-500
            active:scale-90
            transition
          "
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <h1
            className="
              text-xl
              font-bold
              text-gray-700
            "
          >
            Sửa kế hoạch
          </h1>

          <p
            className="
              text-sm
              text-gray-400
            "
          >
            Chỉnh sửa thông tin kế hoạch
          </p>
        </div>
      </div>

      {/* FORM */}

      <div
        className="
          bg-white
          p-4
          rounded-2xl
          shadow
        "
      >
        {/* TÊN */}

        <label
          className="
            block
            text-sm
            font-medium
            text-gray-600
            mb-1
          "
        >
          Tên kế hoạch
        </label>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="
            border
            border-gray-200
            p-3
            rounded-xl
            w-full
            outline-none
            focus:ring-2
            focus:ring-pink-300
            mb-4
          "
        />

        {/* NGÀY */}

        <div
          className="
            grid
            grid-cols-2
            gap-3
          "
        >
          {/* START */}

          <div>
            <label
              className="
                block
                text-xs
                text-gray-400
                mb-1
              "
            >
              Từ ngày
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="
                border
                border-gray-200
                p-3
                rounded-xl
                w-full
                outline-none
                focus:ring-2
                focus:ring-pink-300
                text-sm
              "
            />
          </div>

          {/* END */}

          <div>
            <label
              className="
                block
                text-xs
                text-gray-400
                mb-1
              "
            >
              Đến ngày
            </label>

            <input
              type="date"
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="
                border
                border-gray-200
                p-3
                rounded-xl
                w-full
                outline-none
                focus:ring-2
                focus:ring-pink-300
                text-sm
              "
            />
          </div>
        </div>

        {/* BUTTON */}

        <div
          className="
            flex
            gap-2
            mt-5
          "
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className="
              bg-pink-500
              text-white
              px-4
              py-3
              rounded-xl
              flex-1
              font-semibold
              active:scale-95
              transition
              disabled:opacity-50
            "
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>

          <button
            onClick={onBack}
            disabled={saving}
            className="
              bg-gray-100
              text-gray-500
              px-5
              rounded-xl
              active:scale-95
              disabled:opacity-50
            "
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
}
/* =========================================================
   PLAN SKELETON
========================================================= */

function PlanSkeleton() {
  return (
    <div
      className="
        bg-white
        rounded-2xl
        p-4
        shadow-sm
        animate-pulse
      "
    >
      <div
        className="
          flex
          items-center
          gap-3
        "
      >
        <div
          className="
            w-7
            h-7
            rounded
            bg-gray-200
          "
        />

        <div className="flex-1">
          <div
            className="
              h-5
              w-40
              bg-gray-200
              rounded
              mb-2
            "
          />

          <div
            className="
              h-3
              w-28
              bg-gray-100
              rounded
            "
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SORTABLE PLAN
========================================================= */
function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-");

  return `${day}/${month}/${year}`;
}

function SortablePlan({ plan, onClick, onDelete, onUpdate }) {
  const [swiped, setSwiped] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: plan.id,
    });

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

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    touchAction: "pan-y",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="
        relative
        overflow-hidden
        shadow-md
        mb-3
        rounded-2xl
      "
    >
      {/* ================= NỀN XOÁ ================= */}

      <div
        className="
          absolute
          inset-0
          bg-red-100
          flex
          justify-end
          items-center
          pr-4
          rounded-2xl
        "
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            setSwiped(false);
          }}
          className="
            text-red-500
            font-semibold
            px-3
            py-2
          "
        >
          Xoá
        </button>
      </div>

      {/* ================= CARD ================= */}

      <div
        {...handlers}
        className={`
          relative
          bg-white
          rounded-2xl
          pl-1
          pr-3
          py-4
          shadow-sm
          transition-transform
          duration-200
          ease-out

          ${swiped ? "-translate-x-24" : "translate-x-0"}
        `}
      >
        <div
          className="
            flex
            items-center
            gap-3
          "
        >
          {/* ================= DRAG ================= */}

          <div
            {...listeners}
            {...attributes}
            className="
              cursor-grab
              text-gray-400
              active:scale-95
              pr-2
              pl-1
              py-2
              shrink-0
            "
          >
            <GripVertical size={28} />
          </div>

          {/* ================= CONTENT ================= */}

          <button
            onClick={() => {
              if (swiped) {
                setSwiped(false);
                return;
              }

              onClick();
            }}
            className="
              flex-1
              min-w-0
              text-left
            "
          >
            {/* TÊN */}

            <p
              className="
                text-gray-700
                font-semibold
                break-words
              "
            >
              {plan.title}
            </p>

            {/* THỜI GIAN */}

            {plan.startDate && plan.endDate && (
              <p
                className="
                    text-xs
                    text-pink-400
                    mt-1
                    flex
                    items-center
                    gap-1
                    flex-wrap
                  "
              >
                <span>📅</span>

                <span>
                  {formatDate(plan.startDate)}
                  {" → "}
                  {formatDate(plan.endDate)}
                </span>
              </p>
            )}

            {/* SUB TEXT */}

            <p
              className="
                text-xs
                text-gray-400
                mt-1
              "
            >
              Nhấn để xem lịch trình
            </p>
          </button>

          {/* ================= SỬA ================= */}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate();
            }}
            className="
              text-blue-400
              text-xs
              font-medium
              whitespace-nowrap
              px-2
              py-2
              shrink-0
              active:scale-90
              transition
            "
          >
            Sửa
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PLAN DETAIL
========================================================= */

function PlanDetail({ roomId, plan, onBack }) {
  const [schedules, setSchedules] = useState([]);

  const [loading, setLoading] = useState(true);

  const [newSchedule, setNewSchedule] = useState("");

  const textareaRef = useRef(null);

  /* =======================================================
     LOAD SCHEDULE
  ======================================================= */

  useEffect(() => {
    const schedulesRef = collection(
      db,
      "rooms",
      roomId,
      "plans",
      plan.id,
      "schedules",
    );

    const q = query(schedulesRef, orderBy("order", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setSchedules(data);
        setLoading(false);
      },
      (error) => {
        console.error("Lỗi tải lịch trình:", error);

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [roomId, plan.id]);

  /* =======================================================
     AUTO RESIZE
  ======================================================= */

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";

      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [newSchedule]);

  /* =======================================================
     ADD SCHEDULE
  ======================================================= */

  const addSchedule = async () => {
    if (!newSchedule.trim()) return;

    try {
      const schedulesRef = collection(
        db,
        "rooms",
        roomId,
        "plans",
        plan.id,
        "schedules",
      );

      await addDoc(schedulesRef, {
        text: newSchedule.trim(),

        done: false,

        createdAt: serverTimestamp(),

        order: Date.now(),
      });

      setNewSchedule("");
    } catch (error) {
      console.error("Lỗi thêm lịch trình:", error);
    }
  };

  /* =======================================================
     DELETE SCHEDULE
  ======================================================= */

  const deleteSchedule = async (item) => {
    try {
      await deleteDoc(
        doc(db, "rooms", roomId, "plans", plan.id, "schedules", item.id),
      );
    } catch (error) {
      console.error("Lỗi xóa lịch trình:", error);
    }
  };

  /* =======================================================
     TOGGLE SCHEDULE
  ======================================================= */

  const toggleSchedule = async (item) => {
    try {
      await updateDoc(
        doc(db, "rooms", roomId, "plans", plan.id, "schedules", item.id),
        {
          done: !item.done,
        },
      );
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
    }
  };

  /* =======================================================
     DRAG SCHEDULE
  ======================================================= */

  const handleScheduleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = schedules.findIndex((item) => item.id === active.id);

    const newIndex = schedules.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newSchedules = arrayMove(schedules, oldIndex, newIndex);

    setSchedules(newSchedules);

    try {
      await Promise.all(
        newSchedules.map((item, index) =>
          updateDoc(
            doc(db, "rooms", roomId, "plans", plan.id, "schedules", item.id),
            {
              order: index,
            },
          ),
        ),
      );
    } catch (error) {
      console.error("Lỗi sắp xếp:", error);
    }
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div
      className="
        w-full
        max-w-[700px]
        mx-auto
        px-4
        pt-4
        pb-10
      "
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        className="
          flex
          items-center
          gap-3
          mb-4
        "
      >
        <button
          onClick={onBack}
          className="
            w-10
            h-10
            rounded-full
            bg-white
            shadow
            flex
            items-center
            justify-center
            text-gray-500
            active:scale-90
            transition
            shrink-0
          "
        >
          <ArrowLeft size={20} />
        </button>

        <div className="min-w-0">
          <h1
            className="
              text-xl
              font-bold
              text-gray-700
              break-words
            "
          >
            {plan.title}
          </h1>

          <p
            className="
              text-sm
              text-gray-400
            "
          >
            Lịch trình
          </p>
        </div>
      </div>

      {/* =================================================
          INPUT
      ================================================= */}

      <div
        className="
          bg-white
          p-4
          rounded-2xl
          shadow
          mb-4
        "
      >
        <textarea
          ref={textareaRef}
          value={newSchedule}
          onChange={(e) => setNewSchedule(e.target.value)}
          placeholder="Nhập lịch trình..."
          className="
            border
            border-gray-200
            p-3
            rounded-xl
            w-full
            mb-2
            resize-none
            overflow-hidden
            outline-none
            focus:ring-2
            focus:ring-pink-300
          "
        />

        <button
          onClick={addSchedule}
          className="
            bg-pink-500
            text-white
            px-4
            py-3
            rounded-xl
            w-full
            font-semibold
            active:scale-95
            transition
          "
        >
          Thêm
        </button>
      </div>

      {/* =================================================
          LIST
      ================================================= */}

      <div
        className="
          bg-white
          p-4
          rounded-2xl
          shadow
        "
      >
        <h2 className="font-bold mb-2">Lịch trình</h2>

        {/* LOADING */}

        {loading ? (
          <div className="space-y-3">
            <div
              className="
                h-16
                bg-gray-100
                rounded-2xl
                animate-pulse
              "
            />

            <div
              className="
                h-16
                bg-gray-100
                rounded-2xl
                animate-pulse
              "
            />
          </div>
        ) : (
          <>
            {/* EMPTY */}

            {schedules.length === 0 && (
              <div
                className="
                  py-8
                  text-center
                  text-gray-400
                "
              >
                Chưa có lịch trình nào
              </div>
            )}

            {/* LIST */}

            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleScheduleDragEnd}
            >
              <SortableContext
                items={schedules.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {schedules.map((item) => (
                  <SortableSchedule
                    key={item.id}
                    item={item}
                    toggleSchedule={toggleSchedule}
                    deleteSchedule={deleteSchedule}
                    roomId={roomId}
                    planId={plan.id}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   SORTABLE SCHEDULE
========================================================= */

function SortableSchedule({
  item,
  toggleSchedule,
  deleteSchedule,
  roomId,
  planId,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: item.id,
    });

  const style = {
    transform: transform
      ? `translate3d(
          ${transform.x}px,
          ${transform.y}px,
          0
        )`
      : undefined,

    transition,

    touchAction: "pan-y",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PlanItem
        item={item}
        toggleSchedule={toggleSchedule}
        deleteSchedule={deleteSchedule}
        roomId={roomId}
        planId={planId}
        dragHandle={{
          attributes,
          listeners,
        }}
      />
    </div>
  );
}

/* =========================================================
   PLAN ITEM
   GIỮ GIAO DIỆN CŨ
========================================================= */

function PlanItem({
  item,
  toggleSchedule,
  deleteSchedule,
  roomId,
  planId,
  dragHandle,
}) {
  const [swiped, setSwiped] = useState(false);

  const [editing, setEditing] = useState(false);

  const [editText, setEditText] = useState(item.text);

  const textareaRef = useRef(null);

  /* =======================================================
     AUTO RESIZE
  ======================================================= */

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.style.height = "auto";

      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [editing]);

  /* =======================================================
     SWIPE
  ======================================================= */

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

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave = async () => {
    if (!editText.trim()) return;

    try {
      await updateDoc(
        doc(db, "rooms", roomId, "plans", planId, "schedules", item.id),
        {
          text: editText,
        },
      );

      setEditing(false);
    } catch (error) {
      console.error("Lỗi lưu:", error);
    }
  };

  return (
    <div
      className="
        relative
        overflow-hidden
        shadow-md
        mb-3
        rounded-2xl
      "
    >
      {/* =================================================
          NỀN XOÁ
      ================================================= */}

      <div
        className="
          absolute
          inset-0
          bg-red-100
          flex
          justify-end
          items-center
          pr-4
          rounded-2xl
        "
      >
        <button
          onClick={() => deleteSchedule(item)}
          className="
            text-red-500
            font-semibold
            px-3
            py-2
          "
        >
          Xoá
        </button>
      </div>

      {/* =================================================
          CARD
      ================================================= */}

      <div
        {...handlers}
        className={`
          bg-white
          rounded-2xl
          pl-1
          pr-4
          py-4
          shadow-sm
          transition-transform
          duration-200
          ease-out

          ${swiped ? "-translate-x-24" : "translate-x-0"}
        `}
      >
        <div
          className="
            flex
            items-start
            gap-3
          "
        >
          {/* DRAG HANDLE */}

          <div
            {...dragHandle.listeners}
            {...dragHandle.attributes}
            className="
              cursor-grab
              text-gray-400
              active:scale-95
              pr-2
              pl-1
              py-2
              mt-1
              self-center
              shrink-0
            "
          >
            <GripVertical size={28} />
          </div>

          {/* CONTENT */}

          <div
            className="
              flex-1
              min-w-0
            "
          >
            {/* STATUS */}

            <div
              className="
                flex
                items-center
                gap-2
                mb-2
              "
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleSchedule(item)}
                className="
                  w-5
                  h-5
                  accent-pink-500
                "
              />

              <p
                className="
                  text-sm
                  text-gray-400
                "
              >
                {item.done ? "Đã xong" : "Chưa xong"}
              </p>
            </div>

            {/* TEXT */}

            {editing ? (
              <textarea
                ref={textareaRef}
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="
                  border
                  rounded-lg
                  px-3
                  py-2
                  w-full
                  resize-none
                  overflow-hidden
                  outline-none
                  focus:ring-2
                  focus:ring-pink-300
                "
              />
            ) : (
              <p
                className={`
                  text-gray-700
                  break-words

                  ${item.done ? "line-through text-gray-400" : ""}
                `}
              >
                {item.text}
              </p>
            )}
          </div>

          {/* ACTION */}

          <button
            onClick={editing ? handleSave : () => setEditing(true)}
            className="
              text-blue-400
              text-xs
              whitespace-nowrap
              mt-1
              shrink-0
            "
          >
            {editing ? "Lưu" : "Sửa"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Plans;
