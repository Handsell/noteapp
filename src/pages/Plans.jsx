import { useState, useRef, useEffect, useMemo } from "react";
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

import {
  GripVertical,
  ArrowLeft,
  Plus,
  MapPin,
  Map,
  CalendarDays,
} from "lucide-react";

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-");

  if (!year || !month || !day) {
    return dateString;
  }

  return `${day}/${month}/${year}`;
}

/* =========================================================
   FORMAT DATE LONG
   Ví dụ:
   2026-08-20 -> Thứ năm, 20/08/2026
========================================================= */

function formatDateLong(dateString) {
  if (!dateString) return "Chưa có ngày";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return formatDate(dateString);
  }

  const weekdays = [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy",
  ];

  return `${weekdays[date.getDay()]}, ${formatDate(dateString)}`;
}

/* =========================================================
   TIME
========================================================= */

function isValidTime(time) {
  if (!time) return true;

  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  return !!match;
}

/* =========================================================
   FORMAT TIME INPUT
========================================================= */

function formatTimeInput(value) {
  let numbers = value.replace(/\D/g, "");

  numbers = numbers.slice(0, 4);

  if (numbers.length >= 3) {
    numbers = numbers.slice(0, 2) + ":" + numbers.slice(2);
  }

  return numbers;
}

/* =========================================================
   TIME TO MINUTES
========================================================= */

function timeToMinutes(time) {
  if (!time || !isValidTime(time)) {
    return 9999;
  }

  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

/* =========================================================
   GET LOCATION NAME
========================================================= */

function getLocationName(location) {
  if (!location) return "";

  if (typeof location === "object") {
    return location.name || "";
  }

  return location;
}

/* =========================================================
   GOOGLE MAP URL
========================================================= */

function createGoogleMapsUrl(location) {
  const locationName = getLocationName(location);

  if (!locationName.trim()) {
    return "";
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    locationName.trim(),
  )}`;
}

/* =========================================================
   NORMALIZE LOCATION
========================================================= */

function normalizeLocation(location) {
  const locationName = getLocationName(location);

  if (!locationName.trim()) {
    return null;
  }

  return {
    name: locationName.trim(),
    mapUrl: createGoogleMapsUrl(locationName),
  };
}

/* =========================================================
   NORMALIZE DATE
   Hỗ trợ dữ liệu cũ nếu có.
========================================================= */

function normalizeScheduleDate(item) {
  if (!item) return "";

  if (item.date) {
    return item.date;
  }

  /*
   * Một số dữ liệu cũ có thể chưa có date.
   * Cho xuống cuối danh sách.
   */
  return "";
}

/* =========================================================
   SORT SCHEDULES
=========================================================

   Quy tắc:

   1. Chưa hoàn thành trước
   2. Đã hoàn thành xuống cuối
   3. Trong nhóm chưa hoàn thành:
      - ngày gần nhất trước
      - cùng ngày thì giờ gần nhất trước
   4. Trong nhóm đã hoàn thành:
      - ngày gần nhất trước
      - cùng ngày thì giờ gần nhất trước

========================================================= */

function sortSchedules(items) {
  return [...items].sort((a, b) => {
    const aDone = !!a.done;
    const bDone = !!b.done;

    /* Chưa xong luôn nằm trên */
    if (aDone !== bDone) {
      return aDone ? 1 : -1;
    }

    const aDate = normalizeScheduleDate(a);
    const bDate = normalizeScheduleDate(b);

    /*
     * Dữ liệu không có ngày đưa xuống cuối
     */
    if (!aDate && bDate) return 1;
    if (aDate && !bDate) return -1;

    /*
     * So ngày
     */
    if (aDate && bDate && aDate !== bDate) {
      return aDate.localeCompare(bDate);
    }

    /*
     * So giờ
     */
    const aTime = timeToMinutes(a.time);
    const bTime = timeToMinutes(b.time);

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    /*
     * Cuối cùng dùng createdAt/order/id
     */
    const aOrder = Number(a.order || 0);
    const bOrder = Number(b.order || 0);

    return aOrder - bOrder;
  });
}

/* =========================================================
   GROUP BY DATE
========================================================= */

function groupSchedulesByDate(items) {
  const groups = [];

  items.forEach((item) => {
    const date = normalizeScheduleDate(item);

    let group = groups.find((item) => item.date === date);

    if (!group) {
      group = {
        date,
        items: [],
      };

      groups.push(group);
    }

    group.items.push(item);
  });

  return groups;
}

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

    if (!title) {
      alert("Vui lòng nhập tên kế hoạch");
      return;
    }

    if (!startDate || !endDate) {
      alert("Vui lòng chọn thời gian cho kế hoạch");
      return;
    }

    if (endDate < startDate) {
      alert("Ngày kết thúc không được trước ngày bắt đầu");
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

      alert("Không thể tạo kế hoạch");
    }
  };

  /* =======================================================
     XÓA PLAN
  ======================================================= */

  const deletePlan = async (plan) => {
    try {
      await deleteDoc(doc(db, "rooms", roomId, "plans", plan.id));

      if (selectedPlan && selectedPlan.id === plan.id) {
        setSelectedPlan(null);
      }

      if (editingPlan && editingPlan.id === plan.id) {
        setEditingPlan(null);
      }
    } catch (error) {
      console.error("Lỗi xóa plan:", error);

      alert("Không thể xóa kế hoạch");
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
     PLAN DETAIL
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

  /* =======================================================
     EDIT PLAN
  ======================================================= */

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
      {/* HEADER */}

      <div
        className="
          flex
          items-center
          justify-between
          mb-4
        "
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-700">Dự định</h1>

          <p className="text-sm text-gray-400 mt-1">
            Những kế hoạch của hai đứa ❤️
          </p>
        </div>

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

      {/* FORM TẠO PLAN */}

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

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
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

            <div>
              <label className="block text-xs text-gray-400 mb-1">
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

      {/* LOADING */}

      {loading ? (
        <div className="space-y-3">
          <PlanSkeleton />
          <PlanSkeleton />
        </div>
      ) : (
        <>
          {/* EMPTY */}

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

          {/* LIST PLAN */}

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
                  onClick={() => setSelectedPlan(plan)}
                  onDelete={() => deletePlan(plan)}
                  onUpdate={() => setEditingPlan(plan)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}

/* =========================================================
   EDIT PLAN
========================================================= */

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
          <h1 className="text-xl font-bold text-gray-700">Sửa kế hoạch</h1>

          <p className="text-sm text-gray-400">Chỉnh sửa thông tin kế hoạch</p>
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
        <label className="block text-sm font-medium text-gray-600 mb-1">
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Từ ngày</label>

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

          <div>
            <label className="block text-xs text-gray-400 mb-1">Đến ngày</label>

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

        <div className="flex gap-2 mt-5">
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
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded bg-gray-200" />

        <div className="flex-1">
          <div className="h-5 w-40 bg-gray-200 rounded mb-2" />

          <div className="h-3 w-28 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SORTABLE PLAN
========================================================= */

function SortablePlan({ plan, onClick, onDelete, onUpdate }) {
  const [swiped, setSwiped] = useState(false);

  /* =======================================================
     DND KIT
  ======================================================= */

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: plan.id,
    });

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

    /*
     * Không chặn scroll / drag dọc.
     * Nếu để true sẽ dễ xung đột với dnd-kit.
     */
    preventScrollOnSwipe: false,

    /*
     * Chỉ nhận swipe khi gesture đủ rõ theo chiều ngang.
     */
    trackMouse: true,
  });

  /* =======================================================
     STYLE
  ======================================================= */

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,

    transition,

    /*
     * Cho phép scroll bình thường trên card.
     * Riêng drag handle bên dưới sẽ có touch-none.
     */
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
      {/* ===================================================
          NỀN XOÁ
      =================================================== */}

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

      {/* ===================================================
          CARD
      =================================================== */}

      <div
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
        <div className="flex items-center gap-3">
          {/* =================================================
              DRAG HANDLE

              CHỈ VÙNG NÀY DÙNG CHO DND-KIT
          ================================================= */}

          <div
            {...listeners}
            {...attributes}
            className="
              cursor-grab
              text-gray-400
              active:cursor-grabbing
              active:scale-95
              pr-2
              pl-1
              py-2
              shrink-0
              touch-none
              select-none
            "
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <GripVertical size={28} />
          </div>

          {/* =================================================
              CONTENT

              SWIPE CHỈ HOẠT ĐỘNG Ở KHU VỰC NÀY
          ================================================= */}

          <button
            {...handlers}
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
              select-none
            "
          >
            {/* TÊN PLAN */}

            <p
              className="
                text-gray-700
                font-semibold
                break-words
              "
            >
              {plan.title}
            </p>

            {/* NGÀY */}

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

            {/* DESCRIPTION */}

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

          {/* =================================================
              SỬA
          ================================================= */}

          <button
            onClick={(e) => {
              e.stopPropagation();

              /*
               * Nếu đang mở swipe thì đóng trước.
               */
              if (swiped) {
                setSwiped(false);
                return;
              }

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
  const [newScheduleDate, setNewScheduleDate] = useState(plan.startDate || "");
  const [newScheduleTime, setNewScheduleTime] = useState("");
  const [newScheduleLocation, setNewScheduleLocation] = useState("");

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

        /*
         * Tự động sort bằng ngày + giờ + done
         */
        setSchedules(sortSchedules(data));

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
    if (!newSchedule.trim()) {
      alert("Vui lòng nhập nội dung lịch trình");
      return;
    }

    if (!newScheduleDate) {
      alert("Vui lòng chọn ngày");
      return;
    }

    if (newScheduleTime && !isValidTime(newScheduleTime)) {
      alert("Giờ không hợp lệ. Vui lòng nhập dạng 24h, ví dụ 08:30 hoặc 21:45");

      return;
    }

    /*
     * Kiểm tra ngày lịch trình nằm trong khoảng của plan
     */

    if (plan.startDate && newScheduleDate < plan.startDate) {
      alert(`Ngày lịch trình không được trước ${formatDate(plan.startDate)}`);

      return;
    }

    if (plan.endDate && newScheduleDate > plan.endDate) {
      alert(`Ngày lịch trình không được sau ${formatDate(plan.endDate)}`);

      return;
    }

    try {
      const schedulesRef = collection(
        db,
        "rooms",
        roomId,
        "plans",
        plan.id,
        "schedules",
      );

      const locationData = normalizeLocation(newScheduleLocation);

      await addDoc(schedulesRef, {
        text: newSchedule.trim(),

        date: newScheduleDate,

        time: newScheduleTime || "",

        location: locationData,

        done: false,

        createdAt: serverTimestamp(),

        order: Date.now(),
      });

      setNewSchedule("");
      setNewScheduleDate(plan.startDate || "");
      setNewScheduleTime("");
      setNewScheduleLocation("");
    } catch (error) {
      console.error("Lỗi thêm lịch trình:", error);

      alert("Không thể thêm lịch trình");
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

      alert("Không thể xóa lịch trình");
    }
  };

  /* =======================================================
     TOGGLE SCHEDULE
  ======================================================= */

  const toggleSchedule = async (item) => {
    try {
      const newDone = !item.done;

      /*
       * Cập nhật local trước để UI phản hồi ngay.
       * onSnapshot sau đó sẽ đồng bộ lại Firebase.
       */

      setSchedules((current) =>
        sortSchedules(
          current.map((schedule) =>
            schedule.id === item.id
              ? {
                  ...schedule,
                  done: newDone,
                }
              : schedule,
          ),
        ),
      );

      await updateDoc(
        doc(db, "rooms", roomId, "plans", plan.id, "schedules", item.id),
        {
          done: newDone,
        },
      );
    } catch (error) {
      console.error("Lỗi cập nhật:", error);

      alert("Không thể cập nhật trạng thái");
    }
  };

  /* =======================================================
     GROUP SCHEDULE
  ======================================================= */

  const scheduleGroups = useMemo(() => {
    return groupSchedulesByDate(schedules);
  }, [schedules]);

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
      {/* HEADER */}

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

          {plan.startDate && plan.endDate && (
            <p
              className="
                text-xs
                text-pink-400
                mt-1
              "
            >
              📅 {formatDate(plan.startDate)}
              {" → "}
              {formatDate(plan.endDate)}
            </p>
          )}

          <p className="text-sm text-gray-400">Lịch trình</p>
        </div>
      </div>

      {/* INPUT THÊM LỊCH TRÌNH */}

      <div
        className="
          bg-white
          p-4
          rounded-2xl
          shadow
          mb-4
        "
      >
        {/* NỘI DUNG */}

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
            mb-3
            resize-none
            overflow-hidden
            outline-none
            focus:ring-2
            focus:ring-pink-300
          "
        />

        {/* NGÀY */}

        <div className="mb-3">
          <label
            className="
              block
              text-xs
              text-gray-400
              mb-1
            "
          >
            Ngày
          </label>

          <div className="relative">
            <CalendarDays
              size={17}
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-pink-400
                pointer-events-none
              "
            />

            <input
              type="date"
              value={newScheduleDate}
              min={plan.startDate || undefined}
              max={plan.endDate || undefined}
              onChange={(e) => setNewScheduleDate(e.target.value)}
              className="
                border
                border-gray-200
                p-3
                pl-10
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

        {/* THỜI GIAN */}

        <div className="mb-3">
          <label
            className="
              block
              text-xs
              text-gray-400
              mb-1
            "
          >
            Thời gian
          </label>

          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={newScheduleTime}
            onChange={(e) => {
              setNewScheduleTime(formatTimeInput(e.target.value));
            }}
            placeholder="HH:mm"
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

        {/* ĐỊA ĐIỂM */}

        <div className="mb-3">
          <label
            className="
              block
              text-xs
              text-gray-400
              mb-1
            "
          >
            Địa điểm
          </label>

          <input
            type="text"
            value={newScheduleLocation}
            onChange={(e) => setNewScheduleLocation(e.target.value)}
            placeholder="Ví dụ: Thôn 13, Đà Lạt..."
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

        {/* BUTTON */}

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

      {/* LIST */}

      <div
        className="
          bg-white
          p-4
          rounded-2xl
          shadow
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            mb-3
          "
        >
          <h2 className="font-bold">Lịch trình</h2>

          {schedules.length > 0 && (
            <span className="text-xs text-gray-400">
              {schedules.filter((item) => !item.done).length} chưa xong
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <div
              className="
                h-24
                bg-gray-100
                rounded-2xl
                animate-pulse
              "
            />

            <div
              className="
                h-24
                bg-gray-100
                rounded-2xl
                animate-pulse
              "
            />
          </div>
        ) : (
          <>
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

            {scheduleGroups.map((group) => (
              <div key={group.date || "no-date"} className="mb-5 last:mb-0">
                {/* DATE HEADER */}

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    mb-2
                    px-1
                  "
                >
                  <CalendarDays size={16} className="text-pink-400" />

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-gray-600
                    "
                  >
                    {group.date ? formatDateLong(group.date) : "Chưa có ngày"}
                  </p>
                </div>

                {/* SCHEDULES */}

                <div>
                  {group.items.map((item) => (
                    <PlanItem
                      key={item.id}
                      item={item}
                      toggleSchedule={toggleSchedule}
                      deleteSchedule={deleteSchedule}
                      roomId={roomId}
                      planId={plan.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   PLAN ITEM
========================================================= */

function PlanItem({ item, toggleSchedule, deleteSchedule, roomId, planId }) {
  const [swiped, setSwiped] = useState(false);

  const [editing, setEditing] = useState(false);

  const [editText, setEditText] = useState(item.text || "");

  const [editDate, setEditDate] = useState(normalizeScheduleDate(item));

  const [editTime, setEditTime] = useState(item.time || "");

  const [editLocation, setEditLocation] = useState(
    getLocationName(item.location),
  );

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
  }, [editing, editText]);

  /* =======================================================
     LOAD CURRENT DATA WHEN ITEM CHANGES
  ======================================================= */

  // useEffect(() => {
  //   if (!editing) {
  //     setEditText(item.text || "");
  //     setEditDate(normalizeScheduleDate(item));
  //     setEditTime(item.time || "");
  //     setEditLocation(getLocationName(item.location));
  //   }
  // }, [item.text, item.time, item.date, item.location, editing]);

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

    // Không khóa scroll dọc
    preventScrollOnSwipe: false,

    trackMouse: true,
  });
  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave = async () => {
    if (!editText.trim()) {
      alert("Vui lòng nhập nội dung lịch trình");
      return;
    }

    if (!editDate) {
      alert("Vui lòng chọn ngày");
      return;
    }

    if (editTime && !isValidTime(editTime)) {
      alert("Giờ không hợp lệ. Vui lòng nhập dạng 24h, ví dụ 08:30 hoặc 21:45");

      return;
    }

    try {
      const locationData = normalizeLocation(editLocation);

      await updateDoc(
        doc(db, "rooms", roomId, "plans", planId, "schedules", item.id),
        {
          text: editText.trim(),

          date: editDate,

          time: editTime || "",

          location: locationData,
        },
      );

      setEditing(false);
      setSwiped(false);
    } catch (error) {
      console.error("Lỗi lưu:", error);

      alert("Không thể lưu thay đổi");
    }
  };

  /* =======================================================
     LOCATION
  ======================================================= */

  const locationName = getLocationName(item.location);

  const mapUrl =
    typeof item.location === "object"
      ? item.location?.mapUrl || createGoogleMapsUrl(locationName)
      : createGoogleMapsUrl(locationName);

  /* =======================================================
     DONE
  ======================================================= */

  const isDone = !!item.done;

  return (
    <div
      className={`
        relative
        overflow-hidden
        shadow-md
        mb-3
        rounded-2xl

        ${isDone ? "opacity-55" : ""}
      `}
    >
      {/* NỀN XOÁ */}

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
          onClick={() => {
            deleteSchedule(item);
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

      {/* CARD */}

      <div
        {...handlers}
        style={{
          touchAction: "pan-y",
        }}
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
          {/* LEFT */}

          <div
            className="
              flex
              items-start
              gap-2
              shrink-0
              pt-1
            "
          >
            {/* CHECKBOX */}

            <input
              type="checkbox"
              checked={isDone}
              onChange={() => toggleSchedule(item)}
              className="
                w-5
                h-5
                accent-pink-500
                cursor-pointer
              "
            />
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
              <p
                className={`
                  text-xs

                  ${isDone ? "text-gray-400" : "text-pink-400"}
                `}
              >
                {isDone ? "Đã xong" : "Chưa xong"}
              </p>
            </div>

            {/* EDIT MODE */}

            {editing ? (
              <>
                {/* TEXT */}

                <textarea
                  ref={textareaRef}
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="
                    border
                    border-gray-200
                    rounded-lg
                    px-3
                    py-2
                    w-full
                    resize-none
                    overflow-hidden
                    outline-none
                    focus:ring-2
                    focus:ring-pink-300
                    mb-2
                  "
                />

                {/* DATE */}

                <div className="mb-2">
                  <label
                    className="
                      block
                      text-xs
                      text-gray-400
                      mb-1
                    "
                  >
                    Ngày
                  </label>

                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="
                      border
                      border-gray-200
                      rounded-lg
                      px-3
                      py-2
                      w-full
                      text-sm
                      outline-none
                      focus:ring-2
                      focus:ring-pink-300
                    "
                  />
                </div>

                {/* TIME */}

                <div className="mb-2">
                  <label
                    className="
                      block
                      text-xs
                      text-gray-400
                      mb-1
                    "
                  >
                    Thời gian
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={editTime}
                    onChange={(e) => {
                      setEditTime(formatTimeInput(e.target.value));
                    }}
                    placeholder="HH:mm"
                    className="
                      border
                      border-gray-200
                      rounded-lg
                      px-3
                      py-2
                      w-full
                      text-sm
                      outline-none
                      focus:ring-2
                      focus:ring-pink-300
                    "
                  />
                </div>

                {/* LOCATION */}

                <div className="relative">
                  <MapPin
                    size={16}
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-pink-400
                    "
                  />

                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Địa điểm..."
                    className="
                      border
                      border-gray-200
                      rounded-lg
                      px-3
                      py-2
                      pl-9
                      w-full
                      text-sm
                      outline-none
                      focus:ring-2
                      focus:ring-pink-300
                    "
                  />
                </div>
              </>
            ) : (
              <>
                {/* TEXT */}

                <p
                  className={`
                    text-gray-700
                    break-words

                    ${isDone ? "line-through text-gray-400" : ""}
                  `}
                >
                  {item.text}
                </p>

                {/* NGÀY */}

                {normalizeScheduleDate(item) && (
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      mt-2
                    "
                  >
                    <CalendarDays size={15} className="text-pink-400" />

                    <span
                      className="
                        text-sm
                        text-pink-400
                      "
                    >
                      {formatDate(normalizeScheduleDate(item))}
                    </span>
                  </div>
                )}

                {/* THỜI GIAN */}

                {item.time && (
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      mt-1
                    "
                  >
                    <span className="text-sm">🕐</span>

                    <span
                      className="
                        text-sm
                        text-pink-400
                      "
                    >
                      {item.time}
                    </span>
                  </div>
                )}

                {/* ĐỊA ĐIỂM */}

                {locationName && (
                  <div
                    className="
                      mt-2
                      flex
                      items-start
                      gap-2
                    "
                  >
                    <MapPin
                      size={17}
                      className="
                        text-blue-400
                        shrink-0
                        mt-0.5
                      "
                    />

                    <div className="min-w-0">
                      <p
                        className="
                          text-sm
                          text-blue-400
                          break-words
                        "
                      >
                        {locationName}
                      </p>

                      {mapUrl && (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="
                            inline-flex
                            items-center
                            gap-1
                            mt-1
                            text-xs
                            text-blue-400
                            font-medium
                          "
                        >
                          <Map size={14} />
                          Xem trên bản đồ
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ACTION */}

          <button
            onClick={
              editing
                ? handleSave
                : () => {
                    /*
                     * Load dữ liệu hiện tại
                     */

                    setEditText(item.text || "");

                    setEditDate(normalizeScheduleDate(item));

                    setEditTime(item.time || "");

                    setEditLocation(getLocationName(item.location));

                    setEditing(true);
                    setSwiped(false);
                  }
            }
            className="
              text-blue-400
              text-xs
              whitespace-nowrap
              mt-1
              shrink-0
              px-2
              py-1
              active:scale-90
              transition
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
