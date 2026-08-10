import SUMUNG_CUT from '../../assets/sumung_cut.png';

const Navbar = () => {
  return (
    <div className="flex h-12.5 w-full items-center justify-center bg-[#0E207F]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SUMUNG_CUT.src} alt="상명대학교 마스코트" className="aspect-square h-full object-contain" />
      <div className="ml-2 text-[1.2em] font-semibold text-white">상명대학교 서버상태</div>
    </div>
  );
}

export default Navbar;
