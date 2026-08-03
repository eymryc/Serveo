import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <SignUp />
    </div>
  );
}
