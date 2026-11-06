import Link from 'next/link';
import { LogoutButton } from './Actions';
import Logo from './Logo';

export default function Header({ name, email }: { name: string; email?: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#e9e9e7] bg-white px-4">
      <Link href="/dashboard" aria-label="Collabspace home" className="rounded-md px-1 py-1 hover:bg-[#f7f6f3]"><Logo /></Link>
      <div className="flex items-center gap-3 text-sm">
        <span title={email} className="hidden text-gray-700 sm:inline">{name}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
