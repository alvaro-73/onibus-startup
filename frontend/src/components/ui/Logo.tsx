import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`logo-fluxbus text-2xl ${className}`}>
      fluxbus
    </Link>
  );
}
