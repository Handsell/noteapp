import bg from "../assets/background.jpg";
import boy from "../assets/boy.jpg";
import girl from "../assets/girl.jpg";

function Home({ days }) {
  return (
    <div className="min-h-screen bg-[#f8c8d8] flex flex-col">
      {/* ===== TOP IMAGE ===== */}
      <div
        className="relative h-[62vh] bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: `url(${bg})` }}
      >
        {/* ❌ TẮT overlay để test chuẩn */}
        {/* <div className="absolute inset-0 bg-black/20" /> */}

        {/* 🔥 VÒNG TRÒN CHUẨN */}
        <div className="relative w-60 h-60 flex items-center justify-center">
          {/* viền gradient */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400 to-purple-400"></div>

          {/* cắt rỗng bên trong */}
          <div className="absolute inset-[6px] rounded-full bg-transparent"></div>

          {/* nội dung */}
          <div className="relative text-center text-white">
            <p className="text-sm opacity-80">Đang yêu</p>
            <h1 className="text-5xl font-bold leading-none">{days}</h1>
            <p className="text-sm opacity-80">Ngày</p>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM PANEL ===== */}
      <div className="flex-1 bg-white rounded-t-[30px] -mt-12 pt-8 px-6 shadow-2xl">
        {/* heart nhỏ */}
        <div className="flex justify-center -mt-10 mb-4">
          <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center shadow">
            ❤️
          </div>
        </div>

        {/* avatars */}
        <div className="flex justify-between items-center mb-4">
          {/* person 1 */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-r from-pink-400 to-purple-400">
              <img
                src={boy}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <p className="mt-2 font-medium">Bảo Bảo</p>
            <p className="text-xs text-gray-500">🎂 26 ♎ Thiên Bình</p>
          </div>

          {/* heart */}
          <div className="text-2xl text-pink-500">❤️</div>

          {/* person 2 */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-r from-pink-400 to-purple-400">
              <img
                src={girl}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <p className="mt-2 font-medium">Lin Lin</p>
            <p className="text-xs text-gray-500">🎂 26 ♐ Nhân Mã</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
