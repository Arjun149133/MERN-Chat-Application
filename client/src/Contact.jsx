import Avatar from "./Avatar";

const Contact = ({ id, username, onClick, selected, online }) => {
  return (
    <div
      onClick={() => onClick(id)}
      key={id}
      className={` border-b border-gray-100 flex items-center gap-2 ${
        selected ? " bg-blue-100" : ""
      } hover:cursor-pointer `}
    >
      {selected && <div className=" w-1 bg-blue-500 h-12 rounded-r-md"></div>}
      <div className=" flex gap-2 pl-4 py-2 items-center">
        <Avatar online={online} id={id} username={username} />
        <span className=" text-gray-800 capitalize">{username}</span>
      </div>
    </div>
  );
};

export default Contact;
