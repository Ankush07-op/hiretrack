"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    console.log(result);

    if (result?.error) {
      alert("Invalid email or password.");
      return;
    }

    if (result?.ok) {
      router.push("/dashboard");
    }
  };
  return (
    <div 
      style={{
        maxWidth: "400px",
        margin: "50px auto",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
      }}>

      <form onSubmit={handleSubmit}>
        <h1>Login</h1>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">
          Login
        </button>
      </form>
    </div>
  );
}