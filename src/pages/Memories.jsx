import { useEffect, useMemo, useState } from "react";

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

import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  Utensils,
  Hotel,
  Car,
  Ticket,
  ShoppingBag,
  MoreHorizontal,
  X,
  CalendarDays,
  Receipt,
  Check,
} from "lucide-react";

/* =========================================================
   MEMORIES / EXPENSES

   Firestore:

   rooms/{roomId}/plans/{planId}/expenses

   Plan:

   rooms/{roomId}/plans/{planId}/schedules
========================================================= */

function Memories({ roomId }) {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const [selectedPlan, setSelectedPlan] = useState(null);

  /* =======================================================
     LOAD PLANS
  ======================================================= */

  useEffect(() => {
    // Không setState trực tiếp ở đây khi chưa có roomId.
    // Tránh warning của React:
    // "Calling setState synchronously within an effect..."
    if (!roomId) {
      return;
    }

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
        setLoadingPlans(false);
      },
      (error) => {
        console.error("Lỗi tải plans:", error);
        setLoadingPlans(false);
      },
    );

    return () => unsubscribe();
  }, [roomId]);

  /* =======================================================
     CHI TIẾT CHI PHÍ
  ======================================================= */

  if (selectedPlan) {
    return (
      <ExpenseDetail
        roomId={roomId}
        plan={selectedPlan}
        onBack={() => setSelectedPlan(null)}
      />
    );
  }

  /* =======================================================
     UI DANH SÁCH PLAN
  ======================================================= */

  return (
    <div
      className="
        w-full
        max-w-[700px]
        mx-auto
        px-3
        sm:px-4
        pt-4
        pb-10
        overflow-x-hidden
      "
    >
      {/* HEADER */}

      <div className="mb-5">
        <h1
          className="
            text-2xl
            font-bold
            text-gray-700
          "
        >
          Chi phí 💰
        </h1>

        <p
          className="
            text-sm
            text-gray-400
            mt-1
          "
        >
          Theo dõi chi phí cho từng kế hoạch ❤️
        </p>
      </div>

      {/* LOADING */}

      {loadingPlans ? (
        <div className="space-y-3">
          <PlanExpenseSkeleton />
          <PlanExpenseSkeleton />
        </div>
      ) : plans.length === 0 ? (
        <div
          className="
            bg-white
            rounded-2xl
            shadow-sm
            p-8
            text-center
          "
        >
          <div className="text-4xl mb-3">💕</div>

          <p className="text-gray-400">Chưa có kế hoạch nào</p>

          <p
            className="
              text-xs
              text-gray-300
              mt-2
            "
          >
            Hãy tạo một kế hoạch trước nhé
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanExpenseCard
              key={plan.id}
              plan={plan}
              roomId={roomId}
              onClick={() => setSelectedPlan(plan)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PLAN EXPENSE CARD
========================================================= */

function PlanExpenseCard({ plan, roomId, onClick }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !plan?.id) {
      return;
    }

    const expensesRef = collection(
      db,
      "rooms",
      roomId,
      "plans",
      plan.id,
      "expenses",
    );

    const q = query(expensesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setExpenses(data);
        setLoading(false);
      },
      (error) => {
        console.error("Lỗi tải chi phí:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [roomId, plan?.id]);

  const total = useMemo(() => {
    return expenses.reduce((sum, item) => {
      return sum + Number(item.amount || 0);
    }, 0);
  }, [expenses]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        w-full
        text-left
        bg-white
        rounded-2xl
        shadow-md
        p-4
        active:scale-[0.98]
        transition
        overflow-hidden
      "
    >
      <div className="flex items-start gap-3 min-w-0">
        {/* ICON */}

        <div
          className="
            w-12
            h-12
            rounded-2xl
            bg-pink-50
            flex
            items-center
            justify-center
            text-pink-500
            shrink-0
          "
        >
          <Wallet size={23} />
        </div>

        {/* CONTENT */}

        <div className="flex-1 min-w-0 overflow-hidden">
          <p
            className="
              font-bold
              text-gray-700
              break-words
              whitespace-normal
            "
          >
            {plan.title}
          </p>

          {/* NGÀY - KHÔNG CHO TRÀN KHUNG */}

          {plan.startDate && plan.endDate && (
            <div
              className="
                flex
                items-start
                gap-1
                text-xs
                text-gray-400
                mt-1
                min-w-0
              "
            >
              <span className="shrink-0">📅</span>

              <span
                className="
                  min-w-0
                  break-words
                  whitespace-normal
                "
              >
                {formatDate(plan.startDate)} → {formatDate(plan.endDate)}
              </span>
            </div>
          )}

          {/* TOTAL */}

          <div
            className="
              flex
              items-center
              justify-between
              gap-3
              mt-3
              min-w-0
            "
          >
            <span
              className="
                text-xs
                text-gray-400
                min-w-0
                break-words
              "
            >
              {loading ? "Đang tải..." : `${expenses.length} khoản chi`}
            </span>

            <span
              className="
                font-bold
                text-pink-500
                whitespace-nowrap
                shrink-0
              "
            >
              {loading ? "..." : formatMoney(total)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* =========================================================
   EXPENSE DETAIL
========================================================= */

function ExpenseDetail({ roomId, plan, onBack }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  /* =======================================================
     LOAD EXPENSES
  ======================================================= */

  useEffect(() => {
    if (!roomId || !plan?.id) {
      return;
    }

    const expensesRef = collection(
      db,
      "rooms",
      roomId,
      "plans",
      plan.id,
      "expenses",
    );

    const q = query(expensesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setExpenses(data);
        setLoading(false);
      },
      (error) => {
        console.error("Lỗi tải expenses:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [roomId, plan?.id]);

  /* =======================================================
     TOTAL
  ======================================================= */

  const total = useMemo(() => {
    return expenses.reduce((sum, item) => {
      return sum + Number(item.amount || 0);
    }, 0);
  }, [expenses]);

  /* =======================================================
     BẠN ĐÃ TRẢ
  ======================================================= */

  const youPaid = useMemo(() => {
    return expenses
      .filter((item) => item.paidBy === "you")
      .reduce((sum, item) => {
        return sum + Number(item.amount || 0);
      }, 0);
  }, [expenses]);

  /* =======================================================
     NGƯỜI YÊU ĐÃ TRẢ
  ======================================================= */

  const partnerPaid = useMemo(() => {
    return expenses
      .filter((item) => item.paidBy === "partner")
      .reduce((sum, item) => {
        return sum + Number(item.amount || 0);
      }, 0);
  }, [expenses]);

  /* =======================================================
     CHIA ĐÔI
  ======================================================= */

  const splitExpenses = useMemo(() => {
    return expenses.filter((item) => item.paidBy === "split");
  }, [expenses]);

  const splitTotal = useMemo(() => {
    return splitExpenses.reduce((sum, item) => {
      return sum + Number(item.amount || 0);
    }, 0);
  }, [splitExpenses]);

  const youActualPaid = youPaid + splitTotal / 2;

  const partnerActualPaid = partnerPaid + splitTotal / 2;

  /* =======================================================
     XÓA
  ======================================================= */

  const deleteExpense = async (expense) => {
    const confirmed = window.confirm(`Xóa khoản "${expense.title}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, "rooms", roomId, "plans", plan.id, "expenses", expense.id),
      );
    } catch (error) {
      console.error("Lỗi xóa khoản chi:", error);
      alert("Không thể xóa khoản chi");
    }
  };

  /* =======================================================
     BALANCE
  ======================================================= */

  const balance = youActualPaid - partnerActualPaid;

  let balanceText = "Hai đứa chia đều ❤️";

  if (balance > 0) {
    balanceText = `Người yêu cần trả bạn ${formatMoney(balance / 2)}`;
  }

  if (balance < 0) {
    balanceText = `Bạn cần trả người yêu ${formatMoney(Math.abs(balance) / 2)}`;
  }

  return (
    <div
      className="
        w-full
        max-w-[700px]
        mx-auto
        px-3
        sm:px-4
        pt-4
        pb-10
        overflow-x-hidden
      "
    >
      {/* HEADER */}

      <div
        className="
          flex
          items-center
          gap-3
          mb-5
          min-w-0
        "
      >
        <button
          type="button"
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

        <div className="min-w-0 flex-1">
          <h1
            className="
              text-xl
              font-bold
              text-gray-700
              break-words
              whitespace-normal
            "
          >
            {plan.title}
          </h1>

          {/* NGÀY PLAN */}

          {plan.startDate && plan.endDate && (
            <div
              className="
                flex
                items-start
                gap-1
                text-xs
                text-gray-400
                mt-1
                min-w-0
              "
            >
              <span className="shrink-0">📅</span>

              <span
                className="
                  min-w-0
                  break-words
                  whitespace-normal
                "
              >
                {formatDate(plan.startDate)} → {formatDate(plan.endDate)}
              </span>
            </div>
          )}

          <p className="text-sm text-gray-400 mt-1">Chi phí</p>
        </div>
      </div>

      {/* SUMMARY */}

      <div
        className="
          bg-white
          rounded-2xl
          shadow-md
          p-4
          sm:p-5
          mb-4
          overflow-hidden
        "
      >
        <p className="text-sm text-gray-400">Tổng chi phí</p>

        <p
          className="
            text-3xl
            font-bold
            text-pink-500
            mt-1
            break-words
          "
        >
          {formatMoney(total)}
        </p>

        <div
          className="
            grid
            grid-cols-2
            gap-3
            mt-5
          "
        >
          <div
            className="
              bg-pink-50
              rounded-xl
              p-3
              min-w-0
              overflow-hidden
            "
          >
            <p className="text-xs text-gray-400">Bạn đã trả</p>

            <p className="font-bold text-gray-700 mt-1 break-words">
              {formatMoney(youActualPaid)}
            </p>
          </div>

          <div
            className="
              bg-blue-50
              rounded-xl
              p-3
              min-w-0
              overflow-hidden
            "
          >
            <p className="text-xs text-gray-400">Người yêu đã trả</p>

            <p className="font-bold text-gray-700 mt-1 break-words">
              {formatMoney(partnerActualPaid)}
            </p>
          </div>
        </div>

        <div
          className="
            mt-4
            bg-gray-50
            rounded-xl
            p-3
            text-center
            overflow-hidden
          "
        >
          <p
            className="
              text-sm
              text-gray-500
              break-words
              whitespace-normal
            "
          >
            {balanceText}
          </p>
        </div>
      </div>

      {/* ADD BUTTON */}

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="
          w-full
          bg-pink-500
          text-white
          py-3
          rounded-xl
          font-semibold
          flex
          items-center
          justify-center
          gap-2
          shadow-md
          active:scale-[0.98]
          transition
          mb-4
        "
      >
        <Plus size={20} />
        Thêm khoản chi
      </button>

      {/* CREATE */}

      {showCreate && (
        <ExpenseForm
          roomId={roomId}
          planId={plan.id}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* EDIT */}

      {editingExpense && (
        <ExpenseForm
          roomId={roomId}
          planId={plan.id}
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}

      {/* LIST */}

      <div
        className="
          bg-white
          rounded-2xl
          shadow
          p-3
          sm:p-4
          overflow-hidden
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            mb-3
          "
        >
          <h2 className="font-bold text-gray-700">Các khoản chi</h2>

          <span className="text-xs text-gray-400 whitespace-nowrap">
            {expenses.length} khoản
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <ExpenseSkeleton />
            <ExpenseSkeleton />
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-4xl mb-3">💸</div>

            <p className="text-gray-400 text-sm">Chưa có khoản chi nào</p>

            <p className="text-xs text-gray-300 mt-1">
              Thêm chi phí đầu tiên cho chuyến đi
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                onEdit={() => setEditingExpense(expense)}
                onDelete={() => deleteExpense(expense)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   EXPENSE FORM
========================================================= */

function ExpenseForm({ roomId, planId, expense, onClose }) {
  const [title, setTitle] = useState(expense?.title || "");

  const [amount, setAmount] = useState(
    expense?.amount ? String(expense.amount) : "",
  );

  const [category, setCategory] = useState(expense?.category || "other");

  const [paidBy, setPaidBy] = useState(expense?.paidBy || "you");

  const [note, setNote] = useState(expense?.note || "");

  const [date, setDate] = useState(expense?.date || getToday());

  /* =======================================================
     LỊCH TRÌNH
  ======================================================= */

  const [schedules, setSchedules] = useState([]);

  const [loadingSchedules, setLoadingSchedules] = useState(true);

  const [selectedScheduleId, setSelectedScheduleId] = useState(
    expense?.scheduleId || "",
  );

  const [saving, setSaving] = useState(false);

  /* =======================================================
     LOAD SCHEDULES
  ======================================================= */

  useEffect(() => {
    if (!roomId || !planId) {
      return;
    }

    const schedulesRef = collection(
      db,
      "rooms",
      roomId,
      "plans",
      planId,
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
        setLoadingSchedules(false);
      },
      (error) => {
        console.error("Lỗi tải lịch trình:", error);

        setLoadingSchedules(false);
      },
    );

    return () => unsubscribe();
  }, [roomId, planId]);

  /* =======================================================
     LỊCH TRÌNH ĐANG CHỌN
  ======================================================= */

  const selectedSchedule = useMemo(() => {
    return schedules.find((item) => item.id === selectedScheduleId);
  }, [schedules, selectedScheduleId]);

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave = async () => {
    const cleanTitle = title.trim();

    const cleanAmount = Number(String(amount).replace(/\D/g, ""));

    if (!cleanTitle) {
      alert("Vui lòng nhập tên khoản chi");
      return;
    }

    if (!cleanAmount || cleanAmount <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    try {
      setSaving(true);

      const selectedScheduleText = selectedSchedule?.text || "";

      const data = {
        title: cleanTitle,

        amount: cleanAmount,

        category,

        paidBy,

        note: note.trim(),

        date,

        scheduleId: selectedScheduleId || null,

        scheduleText: selectedScheduleText || "",

        updatedAt: serverTimestamp(),
      };

      if (expense) {
        await updateDoc(
          doc(db, "rooms", roomId, "plans", planId, "expenses", expense.id),
          data,
        );
      } else {
        await addDoc(
          collection(db, "rooms", roomId, "plans", planId, "expenses"),
          {
            ...data,
            createdAt: serverTimestamp(),
          },
        );
      }

      onClose();
    } catch (error) {
      console.error("Lỗi lưu khoản chi:", error);

      alert("Không thể lưu khoản chi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="
        bg-white
        rounded-2xl
        shadow-md
        p-3
        sm:p-4
        mb-4
        border
        border-pink-100
        overflow-hidden
      "
    >
      {/* HEADER */}

      <div
        className="
          flex
          items-center
          justify-between
          gap-3
          mb-4
        "
      >
        <h2 className="font-bold text-gray-700">
          {expense ? "Sửa khoản chi" : "Thêm khoản chi"}
        </h2>

        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="
            w-8
            h-8
            rounded-full
            bg-gray-100
            text-gray-500
            flex
            items-center
            justify-center
            disabled:opacity-50
            shrink-0
          "
        >
          <X size={17} />
        </button>
      </div>

      {/* ===================================================
          TITLE
      =================================================== */}

      <label
        className="
          block
          text-xs
          text-gray-400
          mb-1
        "
      >
        Khoản chi
      </label>

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ví dụ: Ăn tối..."
        disabled={saving}
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
          disabled:bg-gray-50
        "
      />

      {/* ===================================================
          AMOUNT
      =================================================== */}

      <label
        className="
          block
          text-xs
          text-gray-400
          mb-1
        "
      >
        Số tiền
      </label>

      <div className="relative mb-3">
        <input
          type="text"
          inputMode="numeric"
          value={
            amount
              ? Number(String(amount).replace(/\D/g, "")).toLocaleString(
                  "vi-VN",
                )
              : ""
          }
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");

            setAmount(value);
          }}
          placeholder="0"
          disabled={saving}
          className="
            border
            border-gray-200
            p-3
            pr-14
            rounded-xl
            w-full
            outline-none
            focus:ring-2
            focus:ring-pink-300
            disabled:bg-gray-50
          "
        />

        <span
          className="
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            text-sm
            text-gray-400
          "
        >
          VNĐ
        </span>
      </div>

      {/* ===================================================
          LỊCH TRÌNH
      =================================================== */}

      <label
        className="
          block
          text-xs
          text-gray-400
          mb-1
        "
      >
        Lịch trình
      </label>

      {loadingSchedules ? (
        <div
          className="
            border
            border-gray-200
            rounded-xl
            p-3
            text-sm
            text-gray-400
            mb-3
          "
        >
          Đang tải lịch trình...
        </div>
      ) : schedules.length === 0 ? (
        <div
          className="
            border
            border-dashed
            border-gray-200
            rounded-xl
            p-4
            text-center
            mb-3
          "
        >
          <CalendarDays
            size={22}
            className="
              mx-auto
              text-gray-300
              mb-2
            "
          />

          <p className="text-sm text-gray-400">Plan này chưa có lịch trình</p>

          <p className="text-xs text-gray-300 mt-1">
            Hãy thêm lịch trình bên tab Plan
          </p>
        </div>
      ) : (
        <div
          className="
            space-y-2
            mb-3
            max-h-56
            overflow-y-auto
            pr-1
          "
        >
          {schedules.map((schedule, index) => {
            const active = selectedScheduleId === schedule.id;

            return (
              <button
                key={schedule.id}
                type="button"
                disabled={saving}
                onClick={() => setSelectedScheduleId(schedule.id)}
                className={`
                  w-full
                  text-left
                  border
                  rounded-xl
                  p-3
                  flex
                  items-center
                  gap-3
                  transition
                  disabled:opacity-50
                  overflow-hidden
                  ${
                    active
                      ? "bg-pink-50 border-pink-300"
                      : "bg-white border-gray-200"
                  }
                `}
              >
                <div
                  className={`
                    w-8
                    h-8
                    rounded-lg
                    flex
                    items-center
                    justify-center
                    text-xs
                    font-bold
                    shrink-0
                    ${
                      active
                        ? "bg-pink-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }
                  `}
                >
                  {active ? <Check size={16} /> : index + 1}
                </div>

                <div className="flex-1 min-w-0 overflow-hidden">
                  <p
                    className={`
                      text-sm
                      break-words
                      whitespace-normal
                      ${
                        active ? "font-semibold text-pink-600" : "text-gray-600"
                      }
                    `}
                  >
                    {schedule.text || "Lịch trình"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* LỊCH TRÌNH ĐANG CHỌN */}

      {selectedSchedule && (
        <div
          className="
            flex
            items-start
            gap-2
            bg-pink-50
            border
            border-pink-100
            rounded-xl
            px-3
            py-2
            mb-3
            min-w-0
          "
        >
          <Receipt size={16} className="text-pink-500 shrink-0 mt-0.5" />

          <p
            className="
              text-xs
              text-pink-600
              break-words
              whitespace-normal
              min-w-0
            "
          >
            Chi phí thuộc:{" "}
            <span className="font-semibold">{selectedSchedule.text}</span>
          </p>
        </div>
      )}

      {/* ===================================================
          CATEGORY
      =================================================== */}

      <label
        className="
          block
          text-xs
          text-gray-400
          mb-1
        "
      >
        Danh mục
      </label>

      <div
        className="
          grid
          grid-cols-3
          gap-2
          mb-3
        "
      >
        <CategoryButton
          value="food"
          current={category}
          onClick={setCategory}
          icon={<Utensils size={17} />}
          label="Ăn uống"
        />

        <CategoryButton
          value="hotel"
          current={category}
          onClick={setCategory}
          icon={<Hotel size={17} />}
          label="Lưu trú"
        />

        <CategoryButton
          value="transport"
          current={category}
          onClick={setCategory}
          icon={<Car size={17} />}
          label="Di chuyển"
        />

        <CategoryButton
          value="entertainment"
          current={category}
          onClick={setCategory}
          icon={<Ticket size={17} />}
          label="Vui chơi"
        />

        <CategoryButton
          value="shopping"
          current={category}
          onClick={setCategory}
          icon={<ShoppingBag size={17} />}
          label="Mua sắm"
        />

        <CategoryButton
          value="other"
          current={category}
          onClick={setCategory}
          icon={<MoreHorizontal size={17} />}
          label="Khác"
        />
      </div>

      {/* ===================================================
          PAID BY
      =================================================== */}

      <label
        className="
          block
          text-xs
          text-gray-400
          mb-1
        "
      >
        Ai trả?
      </label>

      <div
        className="
          grid
          grid-cols-3
          gap-2
          mb-3
        "
      >
        <button
          type="button"
          disabled={saving}
          onClick={() => setPaidBy("you")}
          className={`
            py-2.5
            rounded-xl
            text-sm
            font-medium
            border
            transition
            disabled:opacity-50
            ${
              paidBy === "you"
                ? "bg-pink-50 border-pink-300 text-pink-500"
                : "bg-white border-gray-200 text-gray-500"
            }
          `}
        >
          👨 Bạn
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => setPaidBy("partner")}
          className={`
            py-2.5
            rounded-xl
            text-sm
            font-medium
            border
            transition
            disabled:opacity-50
            ${
              paidBy === "partner"
                ? "bg-blue-50 border-blue-300 text-blue-500"
                : "bg-white border-gray-200 text-gray-500"
            }
          `}
        >
          👩 Người yêu
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => setPaidBy("split")}
          className={`
            py-2.5
            rounded-xl
            text-sm
            font-medium
            border
            transition
            disabled:opacity-50
            ${
              paidBy === "split"
                ? "bg-purple-50 border-purple-300 text-purple-500"
                : "bg-white border-gray-200 text-gray-500"
            }
          `}
        >
          💕 Chia đôi
        </button>
      </div>

      {/* ===================================================
          DATE
      =================================================== */}

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

      <div className="relative mb-3">
        <CalendarDays
          size={17}
          className="
            absolute
            left-3
            top-1/2
            -translate-y-1/2
            text-gray-400
            pointer-events-none
          "
        />

        <input
          type="date"
          value={date}
          disabled={saving}
          onChange={(e) => setDate(e.target.value)}
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
            disabled:bg-gray-50
            min-w-0
          "
        />
      </div>

      {/* ===================================================
          NOTE
      =================================================== */}

      <label
        className="
          block
          text-xs
          text-gray-400
          mb-1
        "
      >
        Ghi chú
      </label>

      <textarea
        value={note}
        disabled={saving}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ghi chú thêm..."
        rows={3}
        className="
          border
          border-gray-200
          p-3
          rounded-xl
          w-full
          resize-none
          outline-none
          focus:ring-2
          focus:ring-pink-300
          mb-4
          disabled:bg-gray-50
        "
      />

      {/* ===================================================
          BUTTON
      =================================================== */}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="
            bg-pink-500
            text-white
            py-3
            rounded-xl
            flex-1
            font-semibold
            active:scale-95
            transition
            disabled:opacity-50
            min-w-0
          "
        >
          {saving ? "Đang lưu..." : expense ? "Lưu thay đổi" : "Thêm khoản chi"}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="
            bg-gray-100
            text-gray-500
            px-5
            rounded-xl
            active:scale-95
            disabled:opacity-50
            shrink-0
          "
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   CATEGORY BUTTON
========================================================= */

function CategoryButton({ value, current, onClick, icon, label }) {
  const active = value === current;

  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`
        flex
        flex-col
        items-center
        justify-center
        gap-1
        py-2
        rounded-xl
        border
        text-xs
        transition
        ${
          active
            ? "bg-pink-50 border-pink-300 text-pink-500"
            : "bg-white border-gray-200 text-gray-500"
        }
      `}
    >
      {icon}

      <span className="text-center break-words">{label}</span>
    </button>
  );
}

/* =========================================================
   EXPENSE ITEM
========================================================= */

function ExpenseItem({ expense, onEdit, onDelete }) {
  const category = getCategory(expense.category);

  return (
    <div
      className="
        border
        border-gray-100
        rounded-2xl
        p-3
        overflow-hidden
      "
    >
      <div
        className="
          flex
          items-start
          gap-3
          min-w-0
        "
      >
        {/* CATEGORY ICON */}

        <div
          className="
            w-10
            h-10
            rounded-xl
            bg-gray-50
            flex
            items-center
            justify-center
            shrink-0
          "
        >
          {category.icon}
        </div>

        {/* CONTENT */}

        <div
          className="
            flex-1
            min-w-0
            overflow-hidden
          "
        >
          <div
            className="
              flex
              items-start
              justify-between
              gap-2
              min-w-0
            "
          >
            <p
              className="
                font-semibold
                text-gray-700
                break-words
                whitespace-normal
                min-w-0
              "
            >
              {expense.title}
            </p>

            <p
              className="
                font-bold
                text-gray-700
                whitespace-nowrap
                shrink-0
              "
            >
              {formatMoney(expense.amount)}
            </p>
          </div>

          {/* LỊCH TRÌNH */}

          {expense.scheduleText && (
            <div
              className="
                flex
                items-start
                gap-1
                mt-2
                px-2
                py-1
                rounded-lg
                bg-pink-50
                text-pink-500
                text-xs
                max-w-full
                w-fit
              "
            >
              <CalendarDays size={13} className="shrink-0 mt-0.5" />

              <span
                className="
                  break-words
                  whitespace-normal
                  min-w-0
                "
              >
                {expense.scheduleText}
              </span>
            </div>
          )}

          {/* CATEGORY */}

          <p
            className="
              text-xs
              text-gray-400
              mt-2
            "
          >
            {category.label}
          </p>

          {/* PAID BY */}

          <p
            className="
              text-xs
              text-gray-400
              mt-1
            "
          >
            {getPaidByText(expense.paidBy)}
          </p>

          {/* DATE */}

          {expense.date && (
            <div
              className="
                flex
                items-start
                gap-1
                text-xs
                text-gray-400
                mt-1
                min-w-0
              "
            >
              <span className="shrink-0">📅</span>

              <span
                className="
                  break-words
                  whitespace-normal
                  min-w-0
                "
              >
                {formatDate(expense.date)}
              </span>
            </div>
          )}

          {/* NOTE */}

          {expense.note && (
            <p
              className="
                text-sm
                text-gray-500
                mt-2
                break-words
                whitespace-pre-wrap
              "
            >
              {expense.note}
            </p>
          )}

          {/* ACTION */}

          <div
            className="
              flex
              items-center
              gap-3
              mt-3
            "
          >
            <button
              type="button"
              onClick={onEdit}
              className="
                text-xs
                text-blue-400
                flex
                items-center
                gap-1
                active:scale-95
              "
            >
              <Pencil size={14} />
              Sửa
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="
                text-xs
                text-red-400
                flex
                items-center
                gap-1
                active:scale-95
              "
            >
              <Trash2 size={14} />
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SKELETON
========================================================= */

function PlanExpenseSkeleton() {
  return (
    <div
      className="
        bg-white
        rounded-2xl
        shadow-sm
        p-4
        animate-pulse
      "
    >
      <div className="flex gap-3">
        <div
          className="
            w-12
            h-12
            rounded-2xl
            bg-gray-200
            shrink-0
          "
        />

        <div className="flex-1 min-w-0">
          <div
            className="
              h-5
              w-40
              max-w-full
              bg-gray-200
              rounded
              mb-2
            "
          />

          <div
            className="
              h-3
              w-32
              max-w-full
              bg-gray-100
              rounded
            "
          />
        </div>
      </div>
    </div>
  );
}

function ExpenseSkeleton() {
  return (
    <div
      className="
        h-20
        bg-gray-100
        rounded-2xl
        animate-pulse
      "
    />
  );
}

/* =========================================================
   CATEGORY
========================================================= */

function getCategory(category) {
  switch (category) {
    case "food":
      return {
        label: "Ăn uống",
        icon: <Utensils size={19} />,
      };

    case "hotel":
      return {
        label: "Lưu trú",
        icon: <Hotel size={19} />,
      };

    case "transport":
      return {
        label: "Di chuyển",
        icon: <Car size={19} />,
      };

    case "entertainment":
      return {
        label: "Vui chơi",
        icon: <Ticket size={19} />,
      };

    case "shopping":
      return {
        label: "Mua sắm",
        icon: <ShoppingBag size={19} />,
      };

    default:
      return {
        label: "Khác",
        icon: <MoreHorizontal size={19} />,
      };
  }
}

/* =========================================================
   PAID BY TEXT
========================================================= */

function getPaidByText(paidBy) {
  switch (paidBy) {
    case "you":
      return "👨 Bạn trả";

    case "partner":
      return "👩 Người yêu trả";

    case "split":
      return "💕 Hai đứa chia đôi";

    default:
      return "";
  }
}

/* =========================================================
   FORMAT MONEY
========================================================= */

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  const [year, month, day] = dateString.split("-");

  if (!year || !month || !day) {
    return dateString;
  }

  return `${day}/${month}/${year}`;
}

/* =========================================================
   TODAY
========================================================= */

function getToday() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================================================
   EXPORT
========================================================= */

export default Memories;
