import { useState } from "react";
import UserCard from "./UserCard";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useDispatch } from "react-redux";
import { addUser } from "../utils/userSlice";
import { getErrorMessage } from "../utils/errors";

// The backend stores skills as a list, but a text box is easier to type in
const toSkillList = (text) =>
  text
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

const EditProfile = ({ user }) => {
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || "");
  const [age, setAge] = useState(user.age ?? "");
  const [gender, setGender] = useState(user.gender || "");
  const [about, setAbout] = useState(user.about || "");
  const [skills, setSkills] = useState(
    Array.isArray(user.skills) ? user.skills.join(", ") : ""
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const dispatch = useDispatch();
  const [showToast, setShowToast] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      // The backend route is PATCH; the old PUT call never reached it
      const res = await axios.patch(
        BASE_URL + "/profile/edit",
        {
          firstName,
          lastName,
          photoUrl,
          age,
          gender,
          about,
          skills: toSkillList(skills),
        },
        {
          withCredentials: true,
        }
      );
      dispatch(addUser(res?.data?.data));
      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
      }, 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-10 my-10 px-4">
        <div className="card bg-base-300 w-full max-w-sm shadow-sm">
          <form className="card-body" onSubmit={saveProfile}>
            <h2 className="card-title justify-center">Edit Profile</h2>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">First Name</legend>
              <input
                type="text"
                value={firstName}
                className="input w-full"
                onChange={(e) => setFirstName(e.target.value)}
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Last Name</legend>
              <input
                type="text"
                value={lastName}
                className="input w-full"
                onChange={(e) => setLastName(e.target.value)}
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Photo Url</legend>
              <input
                type="url"
                value={photoUrl}
                className="input w-full"
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
            </fieldset>

            <div className="flex gap-2">
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Age</legend>
                <input
                  type="number"
                  min="18"
                  value={age}
                  className="input w-full"
                  onChange={(e) => setAge(e.target.value)}
                />
              </fieldset>
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Gender</legend>
                {/* A dropdown, because the backend only accepts these three values */}
                <select
                  value={gender}
                  className="select w-full"
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="male">male</option>
                  <option value="female">female</option>
                  <option value="other">other</option>
                </select>
              </fieldset>
            </div>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">About</legend>
              <textarea
                value={about}
                className="textarea w-full"
                rows={3}
                onChange={(e) => setAbout(e.target.value)}
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Skills</legend>
              <input
                type="text"
                value={skills}
                placeholder="React, Node.js, C++"
                className="input w-full"
                onChange={(e) => setSkills(e.target.value)}
              />
              <p className="label">Separate skills with commas</p>
            </fieldset>

            <p className="text-error">{error}</p>
            <div className="card-actions justify-center">
              <button
                type="submit"
                className="btn btn-primary m-2"
                disabled={saving}
              >
                {saving && <span className="loading loading-spinner"></span>}
                Save Profile
              </button>
            </div>
          </form>
        </div>

        <UserCard
          user={{
            firstName,
            lastName,
            photoUrl,
            age,
            gender,
            about,
            skills: toSkillList(skills),
          }}
          showActions={false}
        />
      </div>

      {showToast && (
        <div className="toast toast-top toast-center z-20">
          <div className="alert alert-success">
            <span>Profile saved successfully.</span>
          </div>
        </div>
      )}
    </>
  );
};

export default EditProfile;
