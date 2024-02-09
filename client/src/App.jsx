import axios from "axios";
import { UserContextProvider } from "./UserContext";
import Routes from "./Routes";

const App = () => {
  axios.defaults.baseURL = process.evn.REACT_APP_API_URL;
  axios.defaults.withCredentials = true;
  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
  )
};

export default App;
