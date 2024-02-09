import { useContext, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import _, { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";

const Chat = () => {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const { username, id, setId, setUsername } = useContext(UserContext);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const divUnderMessages = useRef(null);
  useEffect(() => {
    connectWS();
  }, []);

  function connectWS() {
    const ws = new WebSocket("ws://localhost:3000");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => {
      setTimeout(() => {
        console.log("reconnecting");
        connectWS();
      }, 1000);
    });
  }

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach((person) => {
      people[person.userId] = person.username;
    });
    setOnlinePeople(people);
  }

  function logout() {
    axios.post("/logout").then(() => {
      window.location.reload();
      setWs(null);
      setId(null);
      setUsername(null);
    });
  }

  function handleMessage(e) {
    const messageData = JSON.parse(e.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      if (messageData.sender === selectedUserId) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
      console.log(messageData);
    }
  }

  function sendMessage(e) {
    e.preventDefault();
    console.log("sent");
    ws.send(
      JSON.stringify({
        sender: id,
        recepient: selectedUserId,
        text: newMessageText,
      })
    );
    setNewMessageText("");
    setMessages((prev) => [
      ...prev,
      {
        text: newMessageText,
        sender: id,
        recepient: selectedUserId,
        _id: Date.now(),
      },
    ]);
  }

  function sendFile(e) {
    const file = e.target.files[0];
  }

  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      axios.get(`/messages/${selectedUserId}`).then((res) => {
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  useEffect(() => {
    axios.get("/people").then((res) => {
      const offlinePeopleArr = res.data
        .filter((p) => p._id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach((person) => {
        offlinePeople[person._id] = person.username;
      });
      setOfflinePeople(offlinePeople);
    });
  }, [onlinePeople]);

  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];

  const messagesWithoutDup = _.uniqBy(messages, "_id");

  return (
    <div className=" flex h-screen">
      <div className=" bg-white w-1/4 flex flex-col">
        <div className=" flex-grow">
          <Logo />
          {Object.keys(onlinePeopleExclOurUser).map((userId) => {
            return (
              <Contact
                key={userId}
                id={userId}
                online={true}
                username={onlinePeopleExclOurUser[userId]}
                onClick={() => setSelectedUserId(userId)}
                selected={selectedUserId === userId}
              />
            );
          })}
          {Object.keys(offlinePeople).map((userId) => {
            return (
              <Contact
                key={userId}
                id={userId}
                online={false}
                username={offlinePeople[userId]}
                onClick={() => setSelectedUserId(userId)}
                selected={selectedUserId === userId}
              />
            );
          })}
        </div>
        <div className=" text-center p-2 flex items-center justify-center">
          <span className=" mr-2 text-md text-gray-600 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                clipRule="evenodd"
              />
            </svg>
            {username}
          </span>
          <button
            onClick={logout}
            className=" text-md text-gray-700 py-1 px-2 bg-blue-200 rounded-sm hover:bg-blue-300"
          >
            Logout
          </button>
        </div>
      </div>
      <div className=" flex flex-col bg-blue-50 w-3/4 p-2 h-screen">
        <div className=" flex-grow">
          {!selectedUserId && (
            <div className=" flex items-center h-full justify-center">
              <div className=" text-gray-400 capitalize">
                &larr; select a person from the sidebar
              </div>
            </div>
          )}
          {!!selectedUserId && (
            <div className=" relative h-full">
              <div className=" absolute overflow-y-scroll inset-0">
                {messagesWithoutDup.map((message, index) => {
                  return (
                    <div
                      key={message._id || index}
                      className={` flex ${
                        message.sender === id
                          ? " justify-end"
                          : " justify-start"
                      }`}
                    >
                      <div
                        className={` text-left inline-block p-2 rounded-md my-2 text-sm ${
                          message.sender === id
                            ? " bg-blue-500 text-white"
                            : " bg-white text-gray-800"
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>
        {!!selectedUserId && (
          <form onSubmit={sendMessage} className=" flex mx-2 ">
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Type a message..."
              className=" flex-grow bg-white border p-2 mx-2 rounded-sm"
            />
            <label className="bg-blue-200 p-2 text-gray-500 border border-blue-300 rounded-sm mr-1 cursor-pointer">
              <input onChange={sendFile} type="file" className=" hidden" />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                />
              </svg>
            </label>
            <button
              type="submit"
              className=" bg-blue-500 p-2 text-white rounded-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Chat;
