import axios from "axios";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { BASE_URL } from "../utils/constants";
import { DEFAULT_PHOTO, handleImageError } from "../utils/images";
import { useDispatch, useSelector } from "react-redux";
import { addConnections } from "../utils/connectionsSlice";

const Connections = () => {
  const connections = useSelector((store) => store.connections);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await axios.get(BASE_URL + "/user/connections", {
          withCredentials: true,
        });
        dispatch(addConnections(res?.data?.data));
      } catch (err) {
        console.error(err);
      }
    };

    fetchConnections();
  }, [dispatch]);

  if (!connections) {
    return (
      <div className="flex justify-center my-20">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  if (connections.length === 0)
    return <h1 className="flex justify-center my-10">No Connections Found.</h1>;

  return (
    <div className="text-center my-10 px-4">
      <h1 className="font-bold text-2xl">Connections</h1>

      {connections.map((connection) => {
        const { _id, firstName, lastName, photoUrl, age, gender, about } =
          connection;

        return (
          <div
            key={_id}
            className="flex items-center m-4 p-4 rounded-lg bg-base-300 w-full max-w-2xl mx-auto"
          >
            <img
              className="w-20 h-20 rounded-full object-cover shrink-0"
              src={photoUrl || DEFAULT_PHOTO}
              alt="photo"
              onError={handleImageError}
            />
            <div className="text-left mx-4 flex-1">
              <h2 className="font-bold text-xl">
                {firstName + " " + (lastName || "")}
              </h2>
              {age && gender && <p>{age + ", " + gender}</p>}
              <p>{about}</p>
            </div>
            <Link to={"/chat/" + _id} className="btn btn-primary">
              Chat
            </Link>
          </div>
        );
      })}
    </div>
  );
};

export default Connections;
