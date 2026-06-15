import Link from "next/link";

export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <Link href="/" className="logo-fluxbus" style={{ fontSize: size }}>
      fluxbus
    </Link>
  );
}
