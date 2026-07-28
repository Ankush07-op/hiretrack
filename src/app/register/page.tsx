export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md border rounded-lg p-6 shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Create Account
        </h1>

        <form className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full border rounded p-2"
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full border rounded p-2"
          />

          <input
            type="tel"
            placeholder="Mobile Number"
            className="w-full border rounded p-2"
          />

          <select className="w-full border rounded p-2">
            <option value="">Select Role</option>
            <option value="CANDIDATE">Candidate</option>
            <option value="RECRUITER">Recruiter</option>
          </select>

          <input
            type="password"
            placeholder="Password"
            className="w-full border rounded p-2"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full border rounded p-2"
          />

          <button
            type="submit"
            className="w-full bg-black text-white rounded p-2"
          >
            Create Account
          </button>
        </form>
      </div>
    </main>
  );
}