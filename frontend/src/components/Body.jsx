import { useEffect, useState } from "react";
import NavBar from "./NavBar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useDispatch, useSelector } from "react-redux";
import { addUser } from "../utils/userSlice";
import Footer from "./Footer";

const RETRY_EVERY_MS = 5000;
const MAX_ATTEMPTS = 24;

const Body = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const userData = useSelector((store) => store.user);
  // "loading" -> first check, "waking" -> server is asleep and we are retrying, "ready" -> server answered
  const [status, setStatus] = useState(userData ? "ready" : "loading");

  useEffect(() => {
    if (userData) return;

    let cancelled = false;
    let timer;

    const fetchUser = async (attempt) => {
      try {
        const res = await axios.get(BASE_URL + "/profile/view", {
          withCredentials: true,
        });
        if (cancelled) return;
        dispatch(addUser(res.data));
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 401) {
          setStatus("ready");
          return;
        }
        // No answer or a 5xx usually means the free backend is still waking up, so keep trying for a while
        if (attempt < MAX_ATTEMPTS) {
          setStatus("waking");
          timer = setTimeout(() => fetchUser(attempt + 1), RETRY_EVERY_MS);
        } else {
          setStatus("error");
        }
      }
    };

    fetchUser(1);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Runs once on page load; after that, Login and Logout update the store themselves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Every page except /login needs a logged-in user
    if (status === "ready" && !userData && location.pathname !== "/login") {
      navigate("/login");
    }
  }, [status, userData, location.pathname, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1">
        {status === "ready" && <Outlet />}

        {(status === "loading" || status === "waking") && (
          <div className="flex flex-col items-center gap-4 my-20 px-4 text-center">
            <span className="loading loading-spinner loading-lg"></span>
            {status === "waking" && (
              <p className="max-w-md opacity-80">
                Waking up the server... Free hosting sleeps when nobody is using
                it, so the first load can take up to a minute.
              </p>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 my-20 px-4 text-center">
            <p>Can't reach the server right now.</p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Body;
