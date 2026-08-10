const MainBg = ({ children }) => {
  return (
    <div className="absolute h-[calc(100vh-100px)] w-full bg-[#D9D9D9]">
      {children}
    </div>
  );
};

export default MainBg;
