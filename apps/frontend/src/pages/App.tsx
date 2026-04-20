import { FormEvent, useState } from "react";

import { AppointmentsWorkspace } from "../components/AppointmentsWorkspace";
import { useAuth } from "../providers/AuthProvider";
import { authService } from "../services/auth-service";
import { LoginPayload, RegistrationPayload, UserRole } from "../types/auth";

type AuthMode = "login" | "register";

const initialLoginForm: LoginPayload = {
  email: "",
  password: "",
};

const initialRegistrationForm: RegistrationPayload = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  STAFF: "Staff",
};

const testLoginAccounts: Array<LoginPayload & { role: UserRole; name: string }> = [
  {
    role: "ADMIN",
    name: "Morgan Reed",
    email: "admin@medrecord.test",
    password: "Admin@12345",
  },
  {
    role: "DOCTOR",
    name: "Avery Cole",
    email: "doctor@medrecord.test",
    password: "Doctor@12345",
  },
  {
    role: "NURSE",
    name: "Priya Menon",
    email: "nurse@medrecord.test",
    password: "Nurse@12345",
  },
  {
    role: "STAFF",
    name: "Jordan Kim",
    email: "staff@medrecord.test",
    password: "Staff@12345",
  },
];

const validateEmail = (email: string): boolean => /\S+@\S+\.\S+/.test(email);

const validateLoginForm = (form: LoginPayload): string | null => {
  if (!form.email || !form.password) {
    return "Enter both your email and password to continue.";
  }

  if (!validateEmail(form.email)) {
    return "Use a valid email address.";
  }

  return null;
};

const validateRegistrationForm = (form: RegistrationPayload): string | null => {
  if (!form.firstName || !form.lastName || !form.email || !form.password) {
    return "Complete all registration fields before submitting.";
  }

  if (!validateEmail(form.email)) {
    return "Use a valid work email address.";
  }

  if (form.password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  return null;
};

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100";

export const App = (): JSX.Element => {
  const { session, isAuthenticated, login, logout } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginForm, setLoginForm] = useState<LoginPayload>(initialLoginForm);
  const [registrationForm, setRegistrationForm] = useState<RegistrationPayload>(initialRegistrationForm);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoginError(null);
    setRegistrationSuccess(null);

    const validationError = validateLoginForm(loginForm);

    if (validationError) {
      setLoginError(validationError);
      return;
    }

    setIsSubmittingLogin(true);

    try {
      const nextSession = await authService.login(loginForm);
      login(nextSession);
      setLoginForm(initialLoginForm);
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "We could not sign you in. Please try again or verify the API base URL.",
      );
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleRegistrationSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setRegistrationError(null);
    setRegistrationSuccess(null);

    const validationError = validateRegistrationForm(registrationForm);

    if (validationError) {
      setRegistrationError(validationError);
      return;
    }

    setIsSubmittingRegistration(true);

    try {
      const result = await authService.register(registrationForm);
      if (result.session) {
        login(result.session);
      } else {
        setRegistrationSuccess(result.message);
        setMode("login");
      }
      setRegistrationForm(initialRegistrationForm);
    } catch (error) {
      setRegistrationError(
        error instanceof Error
          ? error.message
          : "Registration failed. Please verify the backend endpoint and try again.",
      );
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  if (isAuthenticated && session) {
    return <AppointmentsWorkspace onLogout={logout} session={session} />;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(8,145,178,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.14),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_48%,#f8fafc_100%)] p-6 text-slate-900">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[36px] bg-slate-950 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
          <p className="text-sm font-semibold uppercase tracking-[0.36em] text-cyan-300">
            MedRecord EHR
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight md:text-5xl">
            Secure clinical access for teams who need patient data to move fast.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
            Sign in to continue care delivery, or create an account that an admin can
            assign to the right clinical or operations role.
          </p>

          <div className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Test logins
              </h2>
              <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950">
                Local QA
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {testLoginAccounts.map((account) => (
                <div
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  key={account.role}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{roleLabels[account.role]}</p>
                      <p className="mt-1 text-xs text-slate-300">{account.name}</p>
                    </div>
                    <button
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-100 focus:outline-none focus:ring-4 focus:ring-cyan-300/30"
                      onClick={() => {
                        setLoginForm({
                          email: account.email,
                          password: account.password,
                        });
                        setMode("login");
                        setLoginError(null);
                        setRegistrationError(null);
                      }}
                      type="button"
                    >
                      Use
                    </button>
                  </div>
                  <dl className="mt-3 space-y-1 text-xs text-slate-300">
                    <div>
                      <dt className="sr-only">Email</dt>
                      <dd className="break-all">{account.email}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Password</dt>
                      <dd>{account.password}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[36px] border border-white/70 bg-white/90 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur md:p-8">
          <div className="flex rounded-full bg-slate-100 p-1">
            <button
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                mode === "register" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
              onClick={() => setMode("register")}
              type="button"
            >
              Registration
            </button>
          </div>

          {registrationSuccess ? (
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {registrationSuccess}
            </div>
          ) : null}

          {mode === "login" ? (
            <form className="mt-8 space-y-5" onSubmit={handleLoginSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="login-email">
                  Work email
                </label>
                <input
                  className={inputClassName}
                  id="login-email"
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="doctor@medrecord.health"
                  type="email"
                  value={loginForm.email}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="login-password">
                  Password
                </label>
                <input
                  className={inputClassName}
                  id="login-password"
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Enter your password"
                  type="password"
                  value={loginForm.password}
                />
              </div>

              {loginError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {loginError}
                </div>
              ) : null}

              <button
                className="w-full rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
                disabled={isSubmittingLogin}
                type="submit"
              >
                {isSubmittingLogin ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={handleRegistrationSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="first-name">
                    First name
                  </label>
                  <input
                    className={inputClassName}
                    id="first-name"
                    onChange={(event) =>
                      setRegistrationForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    placeholder="Jane"
                    value={registrationForm.firstName}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="last-name">
                    Last name
                  </label>
                  <input
                    className={inputClassName}
                    id="last-name"
                    onChange={(event) =>
                      setRegistrationForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    placeholder="Doe"
                    value={registrationForm.lastName}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="register-email">
                  Work email
                </label>
                <input
                  className={inputClassName}
                  id="register-email"
                  onChange={(event) =>
                    setRegistrationForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="jane.doe@medrecord.health"
                  type="email"
                  value={registrationForm.email}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="register-password">
                  Password
                </label>
                <input
                  className={inputClassName}
                  id="register-password"
                  onChange={(event) =>
                    setRegistrationForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Minimum 8 characters"
                  type="password"
                  value={registrationForm.password}
                />
              </div>

              {registrationError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {registrationError}
                </div>
              ) : null}

              <button
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isSubmittingRegistration}
                type="submit"
              >
                {isSubmittingRegistration ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Configure the backend host with <code>VITE_API_BASE_URL</code>. Default:
            <code className="ml-1">http://localhost:4100/api/v1</code>
          </div>
        </div>
      </section>
    </main>
  );
};
