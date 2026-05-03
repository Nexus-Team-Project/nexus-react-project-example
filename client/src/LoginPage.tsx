/** This file renders the Nexus demo login form for partner and user roles. */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Store, UserRound } from "lucide-react";
import { toast } from "sonner";
import { login } from "./api";
import type { AccountRole, Session } from "./types";

/** Renders role-aware login controls with typed demo credentials. */
export function LoginPage(props: { onLogin: (session: Session) => void }): JSX.Element {
  const [role, setRole] = useState<AccountRole>("USER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useMutation({
    mutationFn: () => login({ role, email, password }),
    onSuccess: (session) => {
      toast.success(`Logged in successfully!`);
      props.onLogin(session);
    },
  });
  const canSubmit = email.trim().length > 0 && password.length > 0 && !loginMutation.isPending;

  return (
    <main className="login-shell">
      <div className="login-hero">
        <div className="hero-content">
          <div className="brand-mark hero-brand">
            <KeyRound aria-hidden="true" />
            <span>Nexus Demo</span>
          </div>
          <h2 className="hero-title">Unlock the future of digital benefits.</h2>
          <p className="hero-subtitle">
            Seamlessly integrate, manage, and scale your digital vouchers, coupons, and gift cards with the Nexus platform.
          </p>
        </div>
      </div>
      <section className="login-panel-wrapper">
        <div className="login-panel">
          <div className="brand-mark mobile-brand">
            <KeyRound aria-hidden="true" />
            <span>Nexus Demo</span>
          </div>
          <h1 id="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in to your account to continue</p>
          
          <div className="role-grid" role="radiogroup" aria-label="Demo login role">
            <button className={role === "PARTNER" ? "role-card active" : "role-card"} onClick={() => setRole("PARTNER")} type="button">
              <Store aria-hidden="true" />
              <span>Partner</span>
              <small>Business access</small>
            </button>
            <button className={role === "USER" ? "role-card active" : "role-card"} onClick={() => setRole("USER")} type="button">
              <UserRound aria-hidden="true" />
              <span>User</span>
              <small>Buyer access</small>
            </button>
          </div>
          
          <form className="login-form" onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) {
              loginMutation.mutate();
            }
          }}>
            <label>
              <span>Email Address</span>
              <input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" type="email" value={email} />
            </label>
            <label>
              <span>Password</span>
              <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" type="password" value={password} />
            </label>
            <button className="primary-action" disabled={!canSubmit} type="submit">
              {loginMutation.isPending ? "Signing in..." : `Sign in as ${role.toLowerCase()}`}
            </button>
          </form>
          {loginMutation.error ? <p className="error-text">{loginMutation.error.message}</p> : null}
        </div>
      </section>
    </main>
  );
}
