import React from "react";

const Avatar = ({ online, id, username }) => {
  const colors = [
    "bg-purple-200",
    "bg-blue-200",
    "bg-teal-200",
    "bg-yellow-200",
    "bg-red-200",
    "bg-green-200",
    "bg-pink-200",
    "bg-indigo-200",
    "bg-gray-200",
    "bg-orange-200",
  ];
  const userIdBase10 = parseInt(id, 16);
  const colorIndex = userIdBase10 % colors.length;
  const color = colors[colorIndex];
  return (
    <div
      className={` ${color} w-8 h-8 rounded-full flex items-center relative`}
    >
      <div className=" text-center w-full opacity-70">{username[0]}</div>
      {online && (
        <div className=" absolute w-3 h-3 bg-green-400 bottom-0 right-0 rounded-full border border-white"></div>
      )}
      {!online && (
        <div className=" absolute w-3 h-3 bg-gray-400 bottom-0 right-0 rounded-full border border-white"></div>
      )}
    </div>
  );
};

export default Avatar;
