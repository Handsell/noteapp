function Home({ days }) {
  return (
    // <div className="bg-white p-6 rounded-2xl shadow text-center mb-4">
    //   <p className="text-gray-500">Đã yêu nhau</p>
    //   <h1 className="text-3xl font-bold text-pink-500">{days} ngày ❤️</h1>
    // </div>
    <div className="bg-white p-6 rounded-3xl shadow-md text-center mb-4">
      <p className="text-gray-400 text-sm">Đã yêu nhau</p>

      <h1 className="text-4xl font-extrabold text-pink-500 my-2">{days}</h1>

      <p className="text-gray-500">ngày ❤️</p>
    </div>
  );
}

export default Home;
