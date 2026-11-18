import { useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { addUser } from "../utils/userSlice";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/constants";
import { getErrorMessage } from "../utils/errors";

const Login = () => {
  const [emailId, setEmailId] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoginForm, setIsLoginForm] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async () => {
    const res = await axios.post(
      BASE_URL + "/login",
      { emailId, password },
      { withCredentials: true }
    );
    dispatch(addUser(res.data));
    navigate("/");
  };

  const handleSignUp = async () => {
    const res = await axios.post(
      BASE_URL + "/signup",
      { firstName, lastName, emailId, password },
      { withCredentials: true }
    );
    dispatch(addUser(res?.data?.data));
    navigate("/profile");
  };

  const handleSubmit = async (e) => {
    // A real <form> lets the Enter key submit, but the browser must not reload the page
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isLoginForm) {
        await handleLogin();
      } else {
        await handleSignUp();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center my-10 px-4">
      <div className="card bg-base-300 w-full max-w-sm shadow-sm">
        <form className="card-body" onSubmit={handleSubmit}>
          <h2 className="card-title justify-center">
            {isLoginForm ? "Login" : "Sign Up"}
          </h2>

          {!isLoginForm && (
            <>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">First Name</legend>
                <input
                  type="text"
                  value={firstName}
                  className="input w-full"
                  autoComplete="given-name"
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Last Name</legend>
                <input
                  type="text"
                  value={lastName}
                  className="input w-full"
                  autoComplete="family-name"
                  onChange={(e) => setLastName(e.target.value)}
                />
              </fieldset>
            </>
          )}

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Email ID</legend>
            <input
              type="email"
              value={emailId}
              className="input w-full"
              autoComplete="email"
              onChange={(e) => setEmailId(e.target.value)}
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Password</legend>
            <input
              type="password"
              value={password}
              className="input w-full"
              autoComplete={isLoginForm ? "current-password" : "new-password"}
              onChange={(e) => setPassword(e.target.value)}
            />
            {!isLoginForm && (
              <p className="label whitespace-normal">
                At least 8 characters with an uppercase letter, a lowercase
                letter, a number and a symbol.
              </p>
            )}
          </fieldset>

          <p className="text-error">{error}</p>
          <div className="card-actions justify-center">
            <button
              type="submit"
              className="btn btn-primary m-2"
              disabled={submitting}
            >
              {submitting && <span className="loading loading-spinner"></span>}
              {isLoginForm ? "Login" : "Sign Up"}
            </button>
          </div>

          <button
            type="button"
            className="link link-hover m-auto py-2"
            onClick={() => {
              setIsLoginForm((value) => !value);
              setError("");
            }}
          >
            {isLoginForm
              ? "New User? Signup Here"
              : "Existing User? Login Here"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
