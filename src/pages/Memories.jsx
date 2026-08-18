import { useEffect, useMemo, useRef, useState } from "react";

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
  Camera,
  ScanLine,
  Loader2,
  Receipt,
  Check,
} from "lucide-react";

import Tesseract from "tesseract.js";

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
    if (!roomId) return;

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
        px-4
        pt-4
        pb-10
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
    if (!roomId || !plan?.id) return;

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
    return expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  return (
    <button
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
      "
    >
      <div className="flex items-start gap-3">
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

        <div className="flex-1 min-w-0">
          <p
            className="
              font-bold
              text-gray-700
              break-words
            "
          >
            {plan.title}
          </p>

          {plan.startDate && plan.endDate && (
            <p
              className="
                  text-xs
                  text-gray-400
                  mt-1
                "
            >
              📅 {formatDate(plan.startDate)} → {formatDate(plan.endDate)}
            </p>
          )}

          <div
            className="
              flex
              items-center
              justify-between
              mt-3
            "
          >
            <span className="text-xs text-gray-400">
              {loading ? "Đang tải..." : `${expenses.length} khoản chi`}
            </span>

            <span className="font-bold text-pink-500">
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
    return expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  /* =======================================================
     BẠN ĐÃ TRẢ
  ======================================================= */

  const youPaid = useMemo(() => {
    return expenses
      .filter((item) => item.paidBy === "you")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  /* =======================================================
     NGƯỜI YÊU ĐÃ TRẢ
  ======================================================= */

  const partnerPaid = useMemo(() => {
    return expenses
      .filter((item) => item.paidBy === "partner")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  /* =======================================================
     CHIA ĐÔI
  ======================================================= */

  const splitExpenses = useMemo(
    () => expenses.filter((item) => item.paidBy === "split"),
    [expenses],
  );

  const splitTotal = useMemo(
    () =>
      splitExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [splitExpenses],
  );

  const youActualPaid = youPaid + splitTotal / 2;

  const partnerActualPaid = partnerPaid + splitTotal / 2;

  /* =======================================================
     XÓA
  ======================================================= */

  const deleteExpense = async (expense) => {
    const confirmed = window.confirm(`Xóa khoản "${expense.title}"?`);

    if (!confirmed) return;

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

          <p className="text-sm text-gray-400">Chi phí</p>
        </div>
      </div>

      {/* SUMMARY */}

      <div
        className="
          bg-white
          rounded-2xl
          shadow-md
          p-5
          mb-4
        "
      >
        <p className="text-sm text-gray-400">Tổng chi phí</p>

        <p
          className="
            text-3xl
            font-bold
            text-pink-500
            mt-1
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
            "
          >
            <p className="text-xs text-gray-400">Bạn đã trả</p>

            <p className="font-bold text-gray-700 mt-1">
              {formatMoney(youActualPaid)}
            </p>
          </div>

          <div
            className="
              bg-blue-50
              rounded-xl
              p-3
            "
          >
            <p className="text-xs text-gray-400">Người yêu đã trả</p>

            <p className="font-bold text-gray-700 mt-1">
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
          "
        >
          <p className="text-sm text-gray-500">{balanceText}</p>
        </div>
      </div>

      {/* ADD BUTTON */}

      <button
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
          p-4
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
          <h2 className="font-bold text-gray-700">Các khoản chi</h2>

          <span className="text-xs text-gray-400">{expenses.length} khoản</span>
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

  /* =======================================================
     OCR
  ======================================================= */

  const [ocrLoading, setOcrLoading] = useState(false);

  const [ocrProgress, setOcrProgress] = useState(0);

  const [ocrText, setOcrText] = useState(expense?.ocrText || "");

  const fileInputRef = useRef(null);

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
     OCR - CHỌN ẢNH
  ======================================================= */

  const handleChooseReceipt = () => {
    fileInputRef.current?.click();
  };

  /* =======================================================
     OCR - XỬ LÝ HÓA ĐƠN
  ======================================================= */

  const handleReceiptChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setOcrLoading(true);
      setOcrProgress(0);
      setOcrText("");

      console.log("📷 Ảnh OCR:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      /* =================================================
           BƯỚC 1:
           XỬ LÝ ẢNH
        ================================================= */

      setOcrProgress(5);

      const imageVariants = await preprocessImageForOCR(file);

      console.log("✅ Đã tạo", imageVariants.length, "phiên bản ảnh OCR");

      /* =================================================
           BƯỚC 2:
           OCR
        ================================================= */

      const ocrResults = [];

      for (let i = 0; i < imageVariants.length; i++) {
        const variant = imageVariants[i];

        const baseProgress = 10 + Math.round((i / imageVariants.length) * 75);

        setOcrProgress(baseProgress);

        console.log(`🔎 OCR phiên bản ${i + 1}/${imageVariants.length}`);

        try {
          const result = await Tesseract.recognize(variant, "vie+eng", {
            logger: (message) => {
              if (message.status === "recognizing text") {
                const localProgress = Math.round((message.progress || 0) * 20);

                const totalProgress = Math.min(
                  95,
                  baseProgress + localProgress,
                );

                setOcrProgress(totalProgress);
              }
            },

            /*
             * PSM 6:
             * giả định một block text.
             */
            tessedit_pageseg_mode: "6",
          });

          const text = result?.data?.text || "";

          const confidence = Number(result?.data?.confidence || 0);

          console.log(`📄 OCR ${i + 1} confidence:`, confidence);

          console.log(text);

          if (text.trim()) {
            ocrResults.push({
              text,
              confidence,
              index: i,
            });
          }
        } catch (ocrError) {
          console.error(`❌ OCR variant ${i + 1} lỗi:`, ocrError);
        }
      }

      if (!ocrResults.length) {
        throw new Error("Tesseract không nhận diện được nội dung hóa đơn.");
      }

      /* =================================================
           BƯỚC 3:
           CHỌN OCR TỐT NHẤT
        ================================================= */

      const bestOCR = chooseBestOCRResult(ocrResults);

      const text = bestOCR?.text || "";

      console.log("========== BEST OCR RESULT ==========");

      console.log(text);

      console.log("=====================================");

      setOcrText(text);

      /* =================================================
           BƯỚC 4:
           PHÂN TÍCH
        ================================================= */

      const parsed = parseReceiptText(text);

      console.log("📦 Parsed receipt:", parsed);

      if (parsed.title) {
        setTitle(parsed.title);
      }

      if (parsed.amount) {
        setAmount(String(parsed.amount));
      }

      if (parsed.date) {
        setDate(parsed.date);
      }

      /* =================================================
           BƯỚC 5:
           GHI CHÚ OCR
        ================================================= */

      if (text.trim()) {
        setNote((previous) => {
          const ocrNote = `OCR hóa đơn:\n${text.trim()}`;

          if (!previous.trim()) {
            return ocrNote;
          }

          return `${previous.trim()}\n\n${ocrNote}`;
        });
      }

      setOcrProgress(100);

      const found = [];

      if (parsed.title) {
        found.push("tên");
      }

      if (parsed.amount) {
        found.push("số tiền");
      }

      if (parsed.date) {
        found.push("ngày");
      }

      if (found.length) {
        alert(
          `Đã quét hóa đơn ❤️\n\nĐã nhận diện: ${found.join(
            ", ",
          )}.\n\nM kiểm tra lại thông tin trước khi lưu nhé.`,
        );
      } else {
        alert(
          "Đã đọc được hóa đơn nhưng chưa xác định được thông tin chính.\n\nM kiểm tra lại các ô Tên / Số tiền / Ngày nhé.",
        );
      }
    } catch (error) {
      console.error("❌ Lỗi OCR hóa đơn:", error);

      alert(`Không thể đọc hóa đơn.\n\n${error?.message || error}`);
    } finally {
      setOcrLoading(false);
      setOcrProgress(0);

      event.target.value = "";
    }
  };

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave = async () => {
    const cleanTitle = title.trim();

    const cleanAmount = parseMoneyNumber(amount);

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

        ocrText: ocrText || expense?.ocrText || "",

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
        p-4
        mb-4
        border
        border-pink-100
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
        <h2 className="font-bold text-gray-700">
          {expense ? "Sửa khoản chi" : "Thêm khoản chi"}
        </h2>

        <button
          onClick={onClose}
          disabled={saving || ocrLoading}
          className="
            w-8
            h-8
            rounded-full
            bg-gray-100
            text-gray-500
            flex
            items-center
            justify-center
          "
        >
          <X size={17} />
        </button>
      </div>

      {/* OCR */}

      <div
        className="
          bg-gradient-to-r
          from-pink-50
          to-purple-50
          border
          border-pink-100
          rounded-2xl
          p-4
          mb-4
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
            mb-3
          "
        >
          <div
            className="
              w-10
              h-10
              rounded-xl
              bg-white
              flex
              items-center
              justify-center
              text-pink-500
              shadow-sm
            "
          >
            <ScanLine size={21} />
          </div>

          <div className="flex-1">
            <p className="font-semibold text-gray-700">Quét hóa đơn bằng OCR</p>

            <p className="text-xs text-gray-400 mt-0.5">
              Chụp hoặc chọn ảnh hóa đơn
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleReceiptChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={handleChooseReceipt}
          disabled={ocrLoading}
          className="
            w-full
            bg-white
            border
            border-pink-200
            text-pink-500
            py-3
            rounded-xl
            font-semibold
            flex
            items-center
            justify-center
            gap-2
            active:scale-[0.98]
            transition
            disabled:opacity-50
          "
        >
          {ocrLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Đang quét {ocrProgress}%
            </>
          ) : (
            <>
              <Camera size={18} />
              Chụp / chọn hóa đơn
            </>
          )}
        </button>

        {ocrLoading && (
          <div
            className="
              mt-3
              h-2
              bg-white
              rounded-full
              overflow-hidden
            "
          >
            <div
              className="
                h-full
                bg-pink-400
                transition-all
              "
              style={{
                width: `${ocrProgress}%`,
              }}
            />
          </div>
        )}

        {ocrText && !ocrLoading && (
          <div
            className="
                mt-3
                bg-white
                rounded-xl
                p-3
                border
                border-gray-100
              "
          >
            <div
              className="
                  flex
                  items-center
                  gap-2
                  text-xs
                  text-green-500
                  font-semibold
                  mb-2
                "
            >
              <Check size={14} />
              Đã nhận diện hóa đơn
            </div>

            <p
              className="
                  text-xs
                  text-gray-500
                  whitespace-pre-wrap
                  max-h-28
                  overflow-auto
                "
            >
              {ocrText}
            </p>
          </div>
        )}
      </div>

      {/* TITLE */}

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
        autoFocus={!ocrLoading}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ví dụ: Ăn tối..."
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

      {/* AMOUNT */}

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

      {/* LỊCH TRÌNH */}

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

                <div className="flex-1 min-w-0">
                  <p
                    className={`
                        text-sm
                        break-words
                        ${
                          active
                            ? "font-semibold text-pink-600"
                            : "text-gray-600"
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
            items-center
            gap-2
            bg-pink-50
            border
            border-pink-100
            rounded-xl
            px-3
            py-2
            mb-3
          "
        >
          <Receipt size={16} className="text-pink-500 shrink-0" />

          <p
            className="
              text-xs
              text-pink-600
              break-words
            "
          >
            Chi phí thuộc:{" "}
            <span className="font-semibold">{selectedSchedule.text}</span>
          </p>
        </div>
      )}

      {/* CATEGORY */}

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

      {/* PAID BY */}

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
          onClick={() => setPaidBy("you")}
          className={`
            py-2.5
            rounded-xl
            text-sm
            font-medium
            border
            transition
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
          onClick={() => setPaidBy("partner")}
          className={`
            py-2.5
            rounded-xl
            text-sm
            font-medium
            border
            transition
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
          onClick={() => setPaidBy("split")}
          className={`
            py-2.5
            rounded-xl
            text-sm
            font-medium
            border
            transition
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

      {/* DATE */}

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
          "
        />

        <input
          type="date"
          value={date}
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
          "
        />
      </div>

      {/* NOTE */}

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
        "
      />

      {/* BUTTON */}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || ocrLoading}
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
          "
        >
          {saving ? "Đang lưu..." : expense ? "Lưu thay đổi" : "Thêm khoản chi"}
        </button>

        <button
          onClick={onClose}
          disabled={saving || ocrLoading}
          className="
            bg-gray-100
            text-gray-500
            px-5
            rounded-xl
            active:scale-95
          "
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   OCR IMAGE PREPROCESSING
========================================================= */

async function preprocessImageForOCR(file) {
  const image = await loadImage(file);

  const maxWidth = 2400;
  const maxHeight = 3200;

  let width = image.naturalWidth || image.width;

  let height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error("Không xác định được kích thước ảnh.");
  }

  /*
   * Resize ảnh lớn để tránh
   * quá tải RAM
   */

  const scale = Math.min(1, maxWidth / width, maxHeight / height);

  width = Math.max(1, Math.round(width * scale));

  height = Math.max(1, Math.round(height * scale));

  /*
   * Nếu ảnh quá nhỏ:
   * upscale nhẹ
   */

  if (width < 1400) {
    const upscale = Math.min(2, 1400 / width);

    width = Math.round(width * upscale);

    height = Math.round(height * upscale);
  }

  return [
    createCanvasImage(image, width, height, "original"),

    createCanvasImage(image, width, height, "enhanced"),

    createCanvasImage(image, width, height, "threshold"),
  ];
}

/* =========================================================
   LOAD IMAGE
========================================================= */

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);

      reject(new Error("Không thể đọc ảnh hóa đơn."));
    };

    image.src = objectUrl;
  });
}

/* =========================================================
   CREATE OCR CANVAS
========================================================= */

function createCanvasImage(image, width, height, mode = "original") {
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!ctx) {
    throw new Error("Không thể tạo Canvas OCR.");
  }

  /*
   * Nền trắng
   */

  ctx.fillStyle = "#ffffff";

  ctx.fillRect(0, 0, width, height);

  /*
   * Draw ảnh
   */

  ctx.drawImage(image, 0, 0, width, height);

  /*
   * Ảnh gốc
   */

  if (mode === "original") {
    return canvas.toDataURL("image/jpeg", 0.95);
  }

  const imageData = ctx.getImageData(0, 0, width, height);

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    /*
     * Grayscale
     */

    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    /*
     * Enhanced
     */

    if (mode === "enhanced") {
      gray = 128 + 1.45 * (gray - 128);

      gray = Math.max(0, Math.min(255, gray));
    }

    /*
     * Threshold
     */

    if (mode === "threshold") {
      gray = gray < 185 ? 0 : 255;
    }

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/jpeg", 0.95);
}

/* =========================================================
   CHỌN OCR TỐT NHẤT
========================================================= */

function chooseBestOCRResult(results) {
  if (!results?.length) {
    return {
      text: "",
      confidence: 0,
      score: 0,
    };
  }

  const scored = results.map((result) => {
    const text = result?.text || "";

    const normalized = normalizeForSearch(text);

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let score = Number(result?.confidence || 0);

    /*
     * Có nhiều dòng
     */

    score += Math.min(lines.length, 30) * 0.5;

    /*
     * Có số tiền
     */

    if (extractMoneyCandidates(text).length) {
      score += 12;
    }

    /*
     * Có ngày
     */

    if (findDateInText(text)) {
      score += 10;
    }

    /*
     * Keyword hóa đơn
     */

    const invoiceKeywords = [
      "total",
      "tong",
      "thanh tien",
      "thanh toan",
      "phai tra",
      "amount",
      "payment",
      "invoice",
      "receipt",
      "vat",
    ];

    for (const keyword of invoiceKeywords) {
      if (normalized.includes(normalizeForSearch(keyword))) {
        score += 4;
      }
    }

    /*
     * Có chữ
     */

    const letterCount = text.match(/[A-Za-zÀ-ỹ]/g)?.length || 0;

    if (letterCount >= 10) {
      score += 5;
    }

    return {
      ...result,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored[0];
}

/* =========================================================
   OCR PARSER
========================================================= */

function parseReceiptText(text) {
  if (!text) {
    return {
      title: "",
      amount: "",
      date: "",
    };
  }

  const normalized = normalizeOCRText(text);

  const lines = normalized
    .split("\n")
    .map((line) => cleanOCRLine(line))
    .filter(Boolean);

  const amount = extractReceiptAmount(lines, normalized);

  const date = extractReceiptDate(lines, normalized);

  const title = extractReceiptTitle(lines, amount);

  return {
    title,
    amount,
    date,
  };
}

/* =========================================================
   NORMALIZE OCR
========================================================= */

function normalizeOCRText(text) {
  return String(text)
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[|]/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/* =========================================================
   CLEAN OCR LINE
========================================================= */

function cleanOCRLine(line) {
  return String(line || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/^[|:;,.]+/, "")
    .replace(/[|]+$/g, "")
    .trim();
}

/* =========================================================
   EXTRACT RECEIPT AMOUNT
========================================================= */

function extractReceiptAmount(lines, fullText) {
  const strongKeywords = [
    "tổng cộng",
    "tong cong",
    "tổng tiền",
    "tong tien",
    "thành tiền",
    "thanh tien",
    "tiền thanh toán",
    "tien thanh toan",
    "số tiền thanh toán",
    "so tien thanh toan",
    "phải trả",
    "phai tra",
    "phải thanh toán",
    "phai thanh toan",
    "cần thanh toán",
    "can thanh toan",
    "grand total",
    "total amount",
    "amount due",
    "amount payable",
    "total",
    "payment",
  ];

  const mediumKeywords = [
    "subtotal",
    "sub total",
    "tạm tính",
    "tam tinh",
    "tiền hàng",
    "tien hang",
    "net amount",
    "net total",
  ];

  /*
   * PASS 1
   *
   * Keyword mạnh
   */

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const lower = normalizeForSearch(line);

    const strong = strongKeywords.some((keyword) =>
      lower.includes(normalizeForSearch(keyword)),
    );

    if (!strong) {
      continue;
    }

    /*
     * Cùng dòng
     */

    const sameLineValues = extractMoneyCandidates(line);

    if (sameLineValues.length) {
      return chooseBestAmountCandidate(sameLineValues, {
        strongContext: true,
      });
    }

    /*
     * Dòng kế tiếp
     */

    for (let offset = 1; offset <= 2; offset++) {
      const nextLine = lines[i + offset];

      if (!nextLine) {
        continue;
      }

      const candidates = extractMoneyCandidates(nextLine);

      if (candidates.length) {
        return chooseBestAmountCandidate(candidates, {
          strongContext: true,
        });
      }
    }
  }

  /*
   * PASS 2
   *
   * Keyword vừa
   */

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const lower = normalizeForSearch(line);

    const medium = mediumKeywords.some((keyword) =>
      lower.includes(normalizeForSearch(keyword)),
    );

    if (!medium) {
      continue;
    }

    const candidates = extractMoneyCandidates(line);

    if (candidates.length) {
      return chooseBestAmountCandidate(candidates, {
        strongContext: false,
      });
    }
  }

  /*
   * PASS 3
   *
   * Có đơn vị tiền
   */

  const currencyCandidates = extractCurrencyCandidates(fullText);

  if (currencyCandidates.length) {
    return chooseBestAmountCandidate(currencyCandidates, {
      currencyContext: true,
    });
  }

  /*
   * PASS 4
   *
   * Fallback
   *
   * Không lấy số lớn nhất
   * một cách mù quáng.
   */

  const fallbackCandidates = [];

  for (const line of lines) {
    if (isLikelyNonMoneyLine(line)) {
      continue;
    }

    const candidates = extractMoneyCandidates(line);

    fallbackCandidates.push(...candidates);
  }

  if (fallbackCandidates.length) {
    return chooseBestAmountCandidate(fallbackCandidates, {
      fallback: true,
    });
  }

  return "";
}

/* =========================================================
   MONEY CANDIDATES
========================================================= */

function extractMoneyCandidates(text) {
  if (!text) {
    return [];
  }

  /*
   * Hỗ trợ:
   *
   * 125000
   * 125.000
   * 125,000
   * 1.250.000
   * 1,250,000
   * 1 250 000
   */

  const matches = String(text).match(/\d{1,3}(?:[.,\s]\d{3})+|\d{4,}/g) || [];

  return matches
    .map((value) => parseMoneyNumber(value))
    .filter((value) => isLikelyReceiptAmount(value));
}

/* =========================================================
   CURRENCY CANDIDATES
========================================================= */

function extractCurrencyCandidates(text) {
  if (!text) {
    return [];
  }

  const candidates = [];

  const patterns = [
    /*
     * 120.000đ
     * 120.000 đ
     * 120.000 VND
     */

    /([\d][\d.,\s]{2,})\s*(?:₫|đ|vnd|vnđ|dong)\b/gi,

    /*
     * ₫120000
     * đ120000
     * VND 120000
     */

    /(?:₫|đ|vnd|vnđ|dong)\s*([\d][\d.,\s]{2,})/gi,
  ];

  for (const pattern of patterns) {
    let match;

    while ((match = pattern.exec(text))) {
      const raw = match[1] || "";

      const value = parseMoneyNumber(raw);

      if (isLikelyReceiptAmount(value)) {
        candidates.push(value);
      }
    }
  }

  return [...new Set(candidates)];
}

/* =========================================================
   PARSE MONEY NUMBER
========================================================= */

function parseMoneyNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  let clean = String(value).trim();

  /*
   * OCR thường nhầm:
   *
   * O -> 0
   * o -> 0
   * I -> 1
   * l -> 1
   * | -> 1
   */

  clean = clean.replace(/[Oo]/g, "0").replace(/[Il|]/g, "1");

  /*
   * Bỏ đơn vị tiền
   */

  clean = clean.replace(/(?:vnd|vnđ|đ|dong)/gi, "");

  /*
   * Chỉ giữ số và separator
   */

  clean = clean.replace(/[^\d.,\s]/g, "");

  if (!clean) {
    return 0;
  }

  /*
   * 1.250.000
   * 1,250,000
   * 1 250 000
   */

  if (/^\d{1,3}(?:[.,\s]\d{3})+$/.test(clean)) {
    const number = Number(clean.replace(/[.,\s]/g, ""));

    return Number.isFinite(number) ? number : 0;
  }

  /*
   * 125.000
   * 125,000
   */

  if (/^\d+[.,]\d{3}$/.test(clean)) {
    const number = Number(clean.replace(/[.,]/g, ""));

    return Number.isFinite(number) ? number : 0;
  }

  /*
   * Số nguyên
   */

  const number = Number(clean.replace(/[.,\s]/g, ""));

  return Number.isFinite(number) ? number : 0;
}

/* =========================================================
   CHECK MONEY
========================================================= */

function isLikelyReceiptAmount(value) {
  if (!Number.isFinite(value)) {
    return false;
  }

  /*
   * Tránh các số quá nhỏ
   */

  if (value < 1000) {
    return false;
  }

  /*
   * Tránh số quá dài:
   * mã hóa đơn,
   * mã giao dịch,
   * timestamp...
   */

  const digitCount = String(Math.round(value)).length;

  if (digitCount > 10) {
    return false;
  }

  return true;
}

/* =========================================================
   CHỌN AMOUNT
========================================================= */

function chooseBestAmountCandidate(candidates, context = {}) {
  const unique = [...new Set(candidates)].filter(isLikelyReceiptAmount);

  if (!unique.length) {
    return "";
  }

  return chooseReceiptAmountByHeuristic(unique, context);
}

/* =========================================================
   AMOUNT HEURISTIC
========================================================= */

function chooseReceiptAmountByHeuristic(candidates, context = {}) {
  if (!candidates.length) {
    return "";
  }

  const scored = candidates.map((value) => {
    const stringValue = String(Math.round(value));

    let score = 0;

    /*
     * Giá trị tiền hợp lý
     */

    if (value >= 5000) {
      score += 10;
    }

    if (value >= 10000) {
      score += 5;
    }

    if (value >= 100000) {
      score += 3;
    }

    /*
     * Không thích số quá dài
     */

    if (stringValue.length >= 10) {
      score -= 30;
    }

    if (stringValue.length === 9) {
      score -= 15;
    }

    /*
     * Tiền Việt thường
     * kết thúc 000
     */

    if (value % 1000 === 0) {
      score += 8;
    }

    if (value % 500 === 0) {
      score += 2;
    }

    /*
     * Nếu fallback thì ưu tiên
     * số lớn hơn nhưng vẫn hợp lý
     */

    if (context.fallback) {
      score += Math.min(value / 100000, 5);
    }

    return {
      value,
      score,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return b.value - a.value;
  });

  return scored[0]?.value || "";
}

/* =========================================================
   EXTRACT DATE
========================================================= */

function extractReceiptDate(lines, fullText) {
  const dateKeywords = [
    "ngày",
    "ngay",
    "date",
    "invoice date",
    "issued",
    "time",
  ];

  /*
   * Ưu tiên dòng có keyword
   */

  for (let i = 0; i < lines.length; i++) {
    const lower = normalizeForSearch(lines[i]);

    const hasKeyword = dateKeywords.some((keyword) =>
      lower.includes(normalizeForSearch(keyword)),
    );

    if (!hasKeyword) {
      continue;
    }

    const date = findDateInText(lines[i]);

    if (date) {
      return date;
    }
  }

  /*
   * Fallback toàn bộ text
   */

  return findDateInText(fullText) || "";
}

/* =========================================================
   FIND DATE
========================================================= */

function findDateInText(text) {
  if (!text) {
    return "";
  }

  /*
   * DD/MM/YYYY
   * DD-MM-YYYY
   * DD.MM.YYYY
   */

  const patterns = [
    /(\d{1,2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{4})/,

    /(\d{4})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{1,2})/,

    /(\d{1,2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = String(text).match(pattern);

    if (!match) {
      continue;
    }

    /*
     * YYYY-MM-DD
     */

    if (match[1].length === 4) {
      const year = Number(match[1]);

      const month = Number(match[2]);

      const day = Number(match[3]);

      if (isValidDateParts(year, month, day)) {
        return `${year}-${String(month).padStart(2, "0")}-${String(
          day,
        ).padStart(2, "0")}`;
      }
    }

    /*
     * DD-MM-YYYY
     */

    const day = Number(match[1]);

    const month = Number(match[2]);

    let year = Number(match[3]);

    if (year < 100) {
      year += 2000;
    }

    if (isValidDateParts(year, month, day)) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  }

  /*
   * 18 AUG 2026
   */

  const englishMonth = String(text).match(
    /\b(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*(\d{4})\b/i,
  );

  if (englishMonth) {
    const day = Number(englishMonth[1]);

    const monthMap = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12,
    };

    const month = monthMap[englishMonth[2].slice(0, 3).toLowerCase()];

    const year = Number(englishMonth[3]);

    if (month && isValidDateParts(year, month, day)) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  }

  /*
   * 18 tháng 08 năm 2026
   */

  const vietnamese = String(text).match(
    /(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i,
  );

  if (vietnamese) {
    const day = Number(vietnamese[1]);

    const month = Number(vietnamese[2]);

    const year = Number(vietnamese[3]);

    if (isValidDateParts(year, month, day)) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  }

  return "";
}

/* =========================================================
   DATE VALIDATION
========================================================= */

function isValidDateParts(year, month, day) {
  if (year < 2000 || year > 2100) {
    return false;
  }

  if (month < 1 || month > 12) {
    return false;
  }

  if (day < 1 || day > 31) {
    return false;
  }

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/* =========================================================
   EXTRACT TITLE / STORE
========================================================= */

function extractReceiptTitle(lines, amount) {
  if (!lines.length) {
    return "";
  }

  /*
   * Các cửa hàng phổ biến.
   * Đây chỉ là keyword hỗ trợ,
   * không bắt buộc.
   */

  const storeKeywords = [
    "bách hóa xanh",
    "bach hoa xanh",
    "thế giới di động",
    "the gioi di dong",
    "thegioididong",
    "điện máy xanh",
    "dien may xanh",
    "winmart",
    "winmart+",
    "circle k",
    "coopmart",
    "co.opmart",
    "co opmart",
    "lotte mart",
    "lotte",
    "aeon",
    "go!",
    "go ",
    "guardian",
    "pharmacity",
    "long châu",
    "long chau",
    "fahasa",
    "highlands",
    "phúc long",
    "phuc long",
    "starbucks",
    "kfc",
    "mcdonald",
    "jollibee",
    "pizza hut",
    "domino",
    "the coffee house",
    "trung nguyên",
    "grab",
    "be",
    "shopee",
    "lazada",
    "tiki",
    "bach hoa",
  ];

  /*
   * Tên cửa hàng thường ở
   * 15 dòng đầu.
   */

  const firstLines = lines.slice(0, 15);

  const scored = firstLines.map((line, index) => {
    const lower = normalizeForSearch(line);

    let score = 0;

    /*
     * Càng gần đầu càng tốt
     */

    score += Math.max(0, 20 - index * 2);

    /*
     * Có nhiều chữ
     */

    const letters = line.match(/[A-Za-zÀ-ỹ]/g) || [];

    if (letters.length >= 5) {
      score += 8;
    }

    if (letters.length >= 10) {
      score += 4;
    }

    /*
     * Không quá dài
     */

    if (line.length > 80) {
      score -= 10;
    }

    /*
     * Store keyword
     */

    if (
      storeKeywords.some((keyword) =>
        lower.includes(normalizeForSearch(keyword)),
      )
    ) {
      score += 40;
    }

    /*
     * Quá nhiều số
     */

    const digits = line.match(/\d/g)?.length || 0;

    if (digits > 4) {
      score -= 20;
    }

    /*
     * Địa chỉ
     */

    if (
      /(đường|duong|phường|phuong|quận|quan|tp\.?|thành phố|thanh pho|hcm|hà nội|ha noi)/i.test(
        line,
      )
    ) {
      score -= 25;
    }

    /*
     * Dòng không phải title
     */

    if (isIgnoredTitleLine(line, amount)) {
      score -= 50;
    }

    return {
      line,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  if (best && best.score >= 5 && best.line.length >= 2) {
    return cleanupTitle(best.line);
  }

  /*
   * Fallback:
   * tìm dòng đầu tiên có chữ
   */

  for (const line of firstLines) {
    if (hasEnoughLetters(line) && !isIgnoredTitleLine(line, amount)) {
      return cleanupTitle(line);
    }
  }

  return "";
}

/* =========================================================
   TITLE FILTER
========================================================= */

function isIgnoredTitleLine(line, amount) {
  const lower = normalizeForSearch(line);

  const ignoredWords = [
    "total",
    "subtotal",
    "sub total",
    "grand total",
    "amount",
    "amount due",
    "payment",
    "tax",
    "vat",
    "invoice",
    "invoice no",
    "invoice number",
    "receipt",
    "bill",
    "date",
    "time",
    "cash",
    "change",
    "tổng",
    "tong",
    "tiền",
    "tien",
    "thành tiền",
    "thanh tien",
    "thanh toán",
    "thanh toan",
    "phải trả",
    "phai tra",
    "mã hóa đơn",
    "ma hoa don",
    "số hóa đơn",
    "so hoa don",
    "địa chỉ",
    "dia chi",
    "điện thoại",
    "dien thoai",
    "hotline",
    "website",
    "www",
  ];

  if (ignoredWords.some((word) => lower.includes(normalizeForSearch(word)))) {
    return true;
  }

  /*
   * Dòng gần như toàn số
   */

  const digits = line.match(/\d/g)?.length || 0;

  const letters = line.match(/[A-Za-zÀ-ỹ]/g)?.length || 0;

  if (digits >= 6 && digits > letters * 2) {
    return true;
  }

  /*
   * Dòng chứa đúng amount
   */

  if (
    amount &&
    extractMoneyCandidates(line).some(
      (value) => Number(value) === Number(amount),
    )
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   TITLE HELPERS
========================================================= */

function hasEnoughLetters(text) {
  const letters = String(text).match(/[A-Za-zÀ-ỹ]/g) || [];

  return letters.length >= 3;
}

function cleanupTitle(title) {
  return String(title)
    .replace(/^[^A-Za-zÀ-ỹ0-9]+/, "")
    .replace(/[^A-Za-zÀ-ỹ0-9)]+$/, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/* =========================================================
   NORMALIZE SEARCH
========================================================= */

function normalizeForSearch(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s+!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   NON MONEY LINE
========================================================= */

function isLikelyNonMoneyLine(line) {
  const lower = normalizeForSearch(line);

  /*
   * Mã hóa đơn / mã giao dịch
   */

  if (
    /(invoice no|invoice number|ma hoa don|so hoa don|transaction|ma giao dich|transaction id|order id|order no)/i.test(
      lower,
    )
  ) {
    return true;
  }

  /*
   * Số điện thoại
   */

  if (/(?:\+?84|0)\d{8,10}/.test(line)) {
    return true;
  }

  /*
   * Ngày tháng
   */

  if (findDateInText(line)) {
    const numbers = extractMoneyCandidates(line);

    if (numbers.length <= 1) {
      return true;
    }
  }

  return false;
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

      {label}
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
      "
    >
      <div
        className="
          flex
          items-start
          gap-3
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

        <div className="flex-1 min-w-0">
          <div
            className="
              flex
              items-start
              justify-between
              gap-2
            "
          >
            <p
              className="
                font-semibold
                text-gray-700
                break-words
              "
            >
              {expense.title}
            </p>

            <p
              className="
                font-bold
                text-gray-700
                whitespace-nowrap
              "
            >
              {formatMoney(expense.amount)}
            </p>
          </div>

          {/* LỊCH TRÌNH */}

          {expense.scheduleText && (
            <div
              className="
                inline-flex
                items-center
                gap-1
                mt-2
                px-2
                py-1
                rounded-lg
                bg-pink-50
                text-pink-500
                text-xs
                max-w-full
              "
            >
              <CalendarDays size={13} />

              <span className="break-words">{expense.scheduleText}</span>
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
            <p
              className="
                text-xs
                text-gray-400
                mt-1
              "
            >
              📅 {formatDate(expense.date)}
            </p>
          )}

          {/* OCR */}

          {expense.ocrText && (
            <div
              className="
                flex
                items-center
                gap-1
                text-xs
                text-green-500
                mt-2
              "
            >
              <ScanLine size={13} />
              Đã quét OCR
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
              w-32
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
