import { useState } from "react";

function App() {
  const startDate = new Date("2024-01-01");
  const today = new Date();
  const diffTime = today - startDate;
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const [plans, setPlans] = useState([
    "Đi xem phim",
    "Ăn lẩu",
  ]);

  const [newPlan, setNewPlan] = useState("");

  const addPlan = () => {
    if (newPlan.trim() === "") return;
    setPlans([...plans, newPlan]);
    setNewPlan("");
  };

  return (
    <div className="min-h-screen bg-pink-100 p-4">
      {/* Days */}
      <div className="bg-white p-6 rounded-2xl shadow text-center mb-4">
        <p className="text-gray-500">Đã yêu nhau</p>
        <h1 className="text-3xl font-bold text-pink-500">
          {days} ngày ❤️
        </h1>
      </div>

      {/* Add plan */}
      <div className="bg-white p-4 rounded-2xl shadow mb-4">
        <input
          value={newPlan}
          onChange={(e) => setNewPlan(e.target.value)}
          placeholder="Nhập dự định..."
          className="border p-2 rounded w-full mb-2"
        />
        <button
          onClick={addPlan}
          className="bg-pink-500 text-white px-4 py-2 rounded w-full"
        >
          Thêm
        </button>
      </div>

      {/* List */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="font-bold mb-2">Dự định</h2>
        {plans.map((plan, index) => (
          <p key={index} className="border-b py-1">
            {plan}
          </p>
        ))}
      </div>
    </div>
  );
}

export default App;