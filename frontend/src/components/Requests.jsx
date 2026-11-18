import axios from "axios";
import { useEffect } from "react";
import { BASE_URL } from "../utils/constants";
import { DEFAULT_PHOTO, handleImageError } from "../utils/images";
import { useDispatch, useSelector } from "react-redux";
import { addRequests, removeRequest } from "../utils/requestSlice";

const Requests = () => {
  const requests = useSelector((store) => store.requests);
  const dispatch = useDispatch();

  const reviewRequest = async (status, _id) => {
    try {
      // Wait for the server first, so a failed call doesn't make the request vanish from the list
      await axios.post(
        BASE_URL + "/request/review/" + status + "/" + _id,
        {},
        { withCredentials: true }
      );
      dispatch(removeRequest(_id));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const res = await axios.get(BASE_URL + "/user/requests/received", {
          withCredentials: true,
        });
        dispatch(addRequests(res?.data?.data));
      } catch (err) {
        console.error(err);
      }
    };

    fetchRequest();
  }, [dispatch]);

  if (!requests) {
    return (
      <div className="flex justify-center my-20">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  if (requests.length === 0)
    return <h1 className="flex justify-center my-10">No Requests Found.</h1>;

  return (
    <div className="text-center my-10 px-4">
      <h1 className="font-bold text-2xl">Requests</h1>

      {requests.map((request) => {
        const { firstName, lastName, photoUrl, age, gender, about } =
          request.fromUserId;

        return (
          <div
            key={request._id}
            className="flex flex-col sm:flex-row items-center m-4 p-4 rounded-lg bg-base-300 w-full max-w-2xl mx-auto gap-4"
          >
            <img
              className="w-20 h-20 rounded-full object-cover shrink-0"
              src={photoUrl || DEFAULT_PHOTO}
              alt="photo"
              onError={handleImageError}
            />
            <div className="text-left flex-1">
              <h2 className="font-bold text-xl">
                {firstName + " " + (lastName || "")}
              </h2>
              {age && gender && <p>{age + ", " + gender}</p>}
              <p>{about}</p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                onClick={() => reviewRequest("rejected", request._id)}
              >
                Reject
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => reviewRequest("accepted", request._id)}
              >
                Accept
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Requests;
