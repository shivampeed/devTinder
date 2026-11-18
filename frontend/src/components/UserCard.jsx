import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useDispatch } from "react-redux";
import { removeUserFromFeed } from "../utils/feedSlice";
import { DEFAULT_PHOTO, handleImageError } from "../utils/images";


// showActions is off for the live preview on the Edit Profile page,
// where the buttons would try to send a request to yourself
const UserCard = ({ user, showActions = true }) => {
  const { _id, firstName, lastName, photoUrl, age, gender, about, skills } =
    user;
  const dispatch = useDispatch();

  const handleSendRequest = async (status, userId) => {
    try {
      await axios.post(
        BASE_URL + "/request/send/" + status + "/" + userId,
        {},
        { withCredentials: true }
      );
      dispatch(removeUserFromFeed(userId));
    } catch (err) {
      console.error(err);
    }
  };

  const skillList = Array.isArray(skills) ? skills : [];

  return (
    <div className="card bg-base-300 w-full max-w-sm shadow-sm">
      <figure className="bg-base-200">
        <img
          className="h-80 w-full object-cover"
          src={photoUrl || DEFAULT_PHOTO}
          alt="photo"
          onError={handleImageError}
        />
      </figure>
      <div className="card-body">
        <h2 className="card-title">{firstName + " " + (lastName || "")}</h2>
        {age && gender && <p>{age + ", " + gender}</p>}
        <p>{about}</p>
        {skillList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skillList.map((skill) => (
              <span key={skill} className="badge badge-outline">
                {skill}
              </span>
            ))}
          </div>
        )}
        {showActions && (
          <div className="card-actions justify-center mt-2">
            <button
              className="btn btn-primary"
              onClick={() => handleSendRequest("ignored", _id)}
            >
              Ignore
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleSendRequest("interested", _id)}
            >
              Interested
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCard;
