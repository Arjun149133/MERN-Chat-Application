import { useContext } from "react";
import { UserContext } from "./UserContext";
import RegisterAndLoginForm from "./RegisterAndLogin";
import Chat from "./Chat";

const Routes = () => {
  const { username, id } = useContext(UserContext);

  if (username && id) {
    return (
      <>
        <Chat />
      </>
    );
  }

  return (
    <>
      <RegisterAndLoginForm />
    </>
  );
};

export default Routes;
