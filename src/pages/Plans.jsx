import { useState } from "react";

function Plans({ plans, addPlan, togglePlan, deletePlan }) {
  const [newPlan, setNewPlan] = useState("");

  return (
    <>
      <div className="bg-white p-4 rounded-2xl shadow mb-4">
        <input
          value={newPlan}
          onChange={(e) => setNewPlan(e.target.value)}
          placeholder="Nhập dự định..."
          className="border p-2 rounded w-full mb-2"
        />

        <button
          onClick={() => {
            if (!newPlan.trim()) return;
            addPlan(newPlan);
            setNewPlan("");
          }}
          className="bg-pink-500 text-white w-full px-4 py-2 rounded"
        >
          Thêm
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="font-bold mb-2">Dự định</h2>

        {plans.map((plan) => (
          <div
            key={plan.id}
            className="flex items-center justify-between border-b py-2"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={plan.done}
                onChange={() => togglePlan(plan)}
              />

              <span className={plan.done ? "line-through text-gray-400" : ""}>
                {plan.text}
              </span>
            </div>

            <button
              onClick={() => deletePlan(plan)}
              className="text-red-500 text-sm"
            >
              Xoá
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export default Plans;
