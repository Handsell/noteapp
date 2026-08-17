import bg from "../assets/background.jpg";
import boy from "../assets/boy.jpg";
import girl from "../assets/girl.jpg";

function Home({ days }) {
  return (
    <div className="min-h-screen w-full bg-white overflow-x-hidden pb-20">
      {/* APP CONTAINER */}
      <main className="relative mx-auto w-full max-w-[768px] bg-white">
        {/* =====================================================
            BACKGROUND / HERO
        ===================================================== */}
        <section
          className="
            relative
            w-full
            h-[500px]
            sm:h-[560px]
            md:h-[620px]
            overflow-hidden
          "
        >
          {/* Background image */}
          <img
            src={bg}
            alt="Background"
            className="
              absolute
              inset-0
              w-full
              h-full
              object-cover
              object-center
            "
          />

          {/* Overlay nhẹ */}
          <div className="absolute inset-0 bg-black/[0.03]" />

          {/* =================================================
              LOVE DAYS CIRCLE
          ================================================= */}
          <div
            className="
              absolute
              left-1/2
              top-[45%]

              -translate-x-1/2
              -translate-y-1/2

              w-[68vw]
              max-w-[315px]
              min-w-[245px]
              aspect-square

              rounded-full
              bg-white/50

              border-[3px]
              border-pink-300

              shadow-sm

              flex
              items-center
              justify-center

              z-10
            "
          >
            <div className="flex flex-col items-center justify-center text-center">
              {/* Đang yêu */}
              <p
                className="
                  text-pink-400
                  font-bold
                  leading-none
                  text-[clamp(17px,5vw,25px)]
                  mb-4
                "
              >
                Đang yêu
              </p>

              {/* Days */}
              <h1
                className="
                
                 text-pink-500  
                  font-bold
                  leading-none
                  text-[clamp(55px,15vw,82px)]
                "
              >
                {days}
              </h1>

              {/* Ngày */}
              <p
                className="
                  text-pink-400
                  font-bold
                  leading-none
                  text-[clamp(20px,5.5vw,30px)]
                  mt-4
                "
              >
                ngày
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            WHITE INFORMATION PANEL
        ===================================================== */}
        <section
          className="
            relative
            -mt-[28px]
            w-full
            min-h-[300px]
            bg-white
            rounded-t-[32px]
            px-4
            sm:px-6
            md:px-10
          "
        >
          {/* ===================================================
              PEOPLE
          =================================================== */}
          <div
            className="
              relative
              -translate-y-[58px]
              w-full
              max-w-[700px]
              mx-auto
              flex
              items-start
              justify-between
            "
          >
            {/* =================================================
                BOY
            ================================================= */}
            <div
              className="
                w-[42%]
                flex
                flex-col
                items-center
                text-center
                min-w-0
              "
            >
              {/* Avatar */}
              <div
                className="
                  w-[clamp(105px,27vw,165px)]
                  h-[clamp(105px,27vw,165px)]
                  aspect-square
                  rounded-full
                  p-[3px]
                  bg-gradient-to-br
                  from-pink-200
                  to-purple-300
                  shadow-md
                  shrink-0
                "
              >
                <img
                  src={boy}
                  alt="Bảo Bảo"
                  className="
                    w-full
                    h-full
                    rounded-full
                    object-cover
                  "
                />
              </div>

              {/* Name */}
              <p
                className="
                  mt-4
                  text-gray-600
                  font-normal
                  leading-none
                  text-[clamp(20px,5.5vw,31px)]
                  whitespace-nowrap
                "
              >
                Bảo Bảo
              </p>

              {/* Info badges */}
              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  justify-center
                  gap-1.5
                  mt-3
                "
              >
                <span
                  className="
                    inline-flex
                    items-center
                    justify-center
                    px-3
                    py-1
                    rounded-full
                    bg-cyan-100
                    text-cyan-500
                    text-[clamp(10px,2.8vw,15px)]
                    leading-none
                    whitespace-nowrap
                  "
                >
                  ♂ 25
                </span>

                <span
                  className="
    inline-flex
    items-center
    justify-center

    px-[clamp(7px,2vw,12px)]
    py-[clamp(4px,1vw,6px)]

    rounded-full

    bg-purple-300
    text-white

    text-[clamp(9px,2.4vw,14px)]

    leading-tight
    whitespace-nowrap

    max-w-full
    shrink
  "
                >
                  ♎ Thiên Bình
                </span>
              </div>
            </div>

            {/* =================================================
                CENTER HEART
            ================================================= */}
            <div
              className="
                absolute
                left-1/2
                top-[125px]
                -translate-x-1/2
                z-30
                flex
                items-center
                justify-center
                text-[clamp(42px,11vw,65px)]
                leading-none
                select-none
              "
            >
              ❤️
            </div>

            {/* =================================================
                GIRL
            ================================================= */}
            <div
              className="
                w-[42%]
                flex
                flex-col
                items-center
                text-center
                min-w-0
              "
            >
              {/* Avatar */}
              <div
                className="
                  w-[clamp(105px,27vw,165px)]
                  h-[clamp(105px,27vw,165px)]
                  aspect-square
                  rounded-full
                  p-[3px]
                  bg-gradient-to-br
                  from-pink-200
                  to-purple-300
                  shadow-md
                  shrink-0
                "
              >
                <img
                  src={girl}
                  alt="Lin Lin"
                  className="
                    w-full
                    h-full
                    rounded-full
                    object-cover
                  "
                />
              </div>

              {/* Name */}
              <p
                className="
                  mt-4
                  text-gray-600
                  font-normal
                  leading-none
                  text-[clamp(20px,5.5vw,31px)]
                  whitespace-nowrap
                "
              >
                Lin Lin
              </p>

              {/* Info badges */}
              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  justify-center
                  gap-1.5
                  mt-3
                "
              >
                <span
                  className="
                    inline-flex
                    items-center
                    justify-center
                    px-3
                    py-1
                    rounded-full
                    bg-orange-100
                    text-orange-400
                    text-[clamp(10px,2.8vw,15px)]
                    leading-none
                    whitespace-nowrap
                  "
                >
                  ♀ 25
                </span>

                <span
                  className="
    inline-flex
    items-center
    justify-center

    px-[clamp(7px,2vw,12px)]
    py-[clamp(4px,1vw,6px)]

    rounded-full

    bg-purple-300
    text-white

    text-[clamp(9px,2.4vw,14px)]

    leading-tight
    whitespace-nowrap

    max-w-full
    shrink
  "
                >
                  ♐ Nhân Mã
                </span>
              </div>
            </div>
          </div>

          {/* Bottom spacing */}
          <div className="h-14 sm:h-20" />
        </section>
      </main>
    </div>
  );
}

export default Home;
