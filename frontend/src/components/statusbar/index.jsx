const StatusBar = (props) => {
  return (
    <div className="mx-auto my-5 w-4/5 rounded-[20px] bg-[#f1f1f1] p-5 shadow-[2px_2px_5px_#868686]">
      <div className="flex items-center justify-between">
        <div className="block">
          <a href={props.href} target="_blank" rel="noreferrer" className="text-[1.1em] font-semibold text-black no-underline">
            {props.title}
          </a>
          <div className="text-[0.7em] text-[#adadad]">{props.url}</div>
        </div>
        <div className="block">
          <div className="flex items-center justify-between">
            <div>{props.statusMsg}</div>
            <div
              className="ml-4 h-4 w-4 rounded-full"
              style={{ backgroundColor: props.statusColor }}
            />
          </div>
          <div className="text-[0.7em] text-[#adadad]">{props.responseTime}</div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
